// <m-swiper> 图片轮播：banner 与商品图集共用。手势拖动、自动播放、圆点指示器。
//
// 只吃图片地址（`items="a.jpg|b.jpg|c.jpg"`）：分隔符是 `|` 而不是逗号 —— CDN 裁剪参数
// 常带逗号（`?x-oss-process=image/resize,w_750`），按逗号切会把一条地址切成两半，
// 表现得像「图片全挂了」。
//
// `loop` 只是**索引回绕**（最后一张再往右回到第一张），不做首尾克隆的无缝轮播：
// 无缝做法需要 3 份副本 + 位置纠偏，出问题时表现为「拖到某一张就白屏」，而回绕
// 唯一的问题是接缝处会露一下底色。
import { BaseElement, COPY, ariaBool, escapeAttr, html, property, t, defineElement } from "../../core/index.js";
import mSwiperCSS from "./m-swiper.css?raw";

/** 方向锁定的最小位移（px）：小于它不判方向，避免纵向滚动起步被当成横滑。 */
const DIRECTION_LOCK_PX = 6;

/** 翻页阈值：视口宽度的比例。低于 0.15 会「一碰就翻」，高于 0.35 则「怎么拖都回弹」。 */
const SWIPE_RATIO = 0.2;

function parseList(raw: string | string[]): string[] {
  const arr = Array.isArray(raw) ? raw : String(raw).split("|");
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

export class MSwiper extends BaseElement {
  static styles = mSwiperCSS;

  /** 图片地址，`|` 分隔。 */
  // reflect: false：允许直接赋数组；开着反射会被 String() 成 `a,b` 写回 attribute
  @property({ type: String, attribute: "items", reflect: false }) items: string | string[] = "";
  /** 每张图的替代文本，`|` 分隔（可省；省了按装饰图处理）。 */
  @property({ type: String, attribute: "alt", reflect: false }) alt: string | string[] = "";
  /** 当前页（0 起）。可写：宿主用它做「点了第 3 张」的回显。 */
  @property({ type: Number }) current = 0;
  /** 自动播放间隔（ms）。0 = 不自动。系统开了「减少动态效果」时始终不自动。 */
  @property({ type: Number }) autoplay = 0;
  /** 到边界回绕。关掉则第一张不能再往前、最后一张不能再往后。 */
  @property({ type: Boolean }) loop = true;
  /** dots：圆点；number：`1 / 4` 胶囊；none：不画。 */
  @property({ type: String }) indicator: "dots" | "number" | "none" = "dots";
  /** 固定高度（如 `180px`）。不写则按 4:3 撑开。 */
  @property({ type: String }) height = "";
  /** 无障碍名称（读屏念「<名字>，轮播」）。 */
  @property({ type: String }) label = COPY.imageCarousel;

  /** 上一次渲染时的页号。`-1` = 还没画过，首帧不播动画。 */
  private _prevIndex = -1;
  private _timer: number | undefined;
  private _dragging = false;
  /** 刚放开手指：此时轨道停在拖动位置上，直接滑向目标即可，不能先回摆到上一张。 */
  private _fromDrag = false;
  private _axis: "none" | "x" = "none";
  private _startX = 0;
  private _startY = 0;
  private _deltaX = 0;

  private get _list(): string[] {
    return parseList(this.items);
  }

  private get _alts(): string[] {
    return parseList(this.alt);
  }

  private get _index(): number {
    const n = this._list.length;
    if (n === 0) return 0;
    return Math.min(n - 1, Math.max(0, Math.trunc(this.current) || 0));
  }

  /** 视口宽度（拖动与位移都以它为单位，不用百分比：轨道宽度是 n 份，百分比会算错）。 */
  private get _vw(): number {
    return this.shadowRoot?.querySelector<HTMLElement>(".m-swiper__viewport")?.offsetWidth ?? 0;
  }

  render(): string {
    const list = this._list;
    const alts = this._alts;
    const idx = this._index;
    const slides = list
      .map(
        (src, i) => html`<div class="m-swiper__slide" part="slide" aria-hidden="${ariaBool(i !== idx)}">
          <img class="m-swiper__img" src="${escapeAttr(src)}" alt="${escapeAttr(alts[i] ?? "")}"
            loading="${i === 0 ? "eager" : "lazy"}" decoding="async" draggable="false" />
        </div>`,
      )
      .join("");

    const dots =
      this.indicator === "dots" && list.length > 1
        ? `<div class="m-swiper__dots" part="indicator">${list
            .map(
              (_, i) =>
                `<button type="button" class="m-swiper__dot${i === idx ? " is-active" : ""}" data-goto="${i}"
                  aria-label="${escapeAttr(t("slideNumber", { index: i + 1 }))}" aria-current="${ariaBool(i === idx)}" part="dot"></button>`,
            )
            .join("")}</div>`
        : "";

    const number =
      this.indicator === "number" && list.length > 1
        ? `<div class="m-swiper__count" part="indicator">${idx + 1} / ${list.length}</div>`
        : "";

    const cls = [
      "m-swiper",
      this.height ? "m-swiper--fixed" : "",
      this._dragging ? "is-dragging" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class="${cls}" part="root" role="group" aria-roledescription="${escapeAttr(t("carouselRole"))}"
        aria-label="${escapeAttr(this.label)}"
        ${this.height ? `style="--m-swiper-h:${escapeAttr(this.height)}"` : ""}>
        <div class="m-swiper__viewport" part="viewport">
          <div class="m-swiper__track">${slides}</div>
        </div>
        ${dots}${number}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    const root = this.shadowRoot!;
    root.addEventListener("touchstart", this._onTouchStart, { passive: true });
    // 横滑要 preventDefault，必须 passive: false（否则浏览器忽略它，页面跟着横移）
    root.addEventListener("touchmove", this._onTouchMove, { passive: false });
    root.addEventListener("touchend", this._onTouchEnd);
    root.addEventListener("touchcancel", this._onTouchEnd);
    root.addEventListener("click", this._onClick);
    root.addEventListener("keydown", this._onKey);
    window.addEventListener("resize", this._snap);
    this._restartAuto();
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot!;
    root.removeEventListener("touchstart", this._onTouchStart);
    root.removeEventListener("touchmove", this._onTouchMove);
    root.removeEventListener("touchend", this._onTouchEnd);
    root.removeEventListener("touchcancel", this._onTouchEnd);
    root.removeEventListener("click", this._onClick);
    root.removeEventListener("keydown", this._onKey);
    window.removeEventListener("resize", this._snap);
    this._stopAuto();
    super.disconnectedCallback();
  }

  updated(): void {
    const track = this.shadowRoot!.querySelector<HTMLElement>(".m-swiper__track");
    if (!track) return;
    const idx = this._index;
    if (this._fromDrag) {
      this._fromDrag = false;
      this._prevIndex = idx;
      this._translate(track, -idx * this._vw, true);
      return;
    }
    if (this._prevIndex === idx || this._prevIndex < 0) {
      // 首帧 / 只换了图（items 变了）：直接摆到位，不播动画
      this._translate(track, -idx * this._vw, false);
      this._prevIndex = idx;
      return;
    }
    // 重渲染换掉了轨道节点，它的 transform 从 none 开始。先摆到**上一张**的位置，
    // 再滑到目标，动画才有起点；否则无论翻到哪一张都是从第 1 张滑过来。
    this._translate(track, -this._prevIndex * this._vw, false);
    this._prevIndex = idx;
    void track.offsetWidth;
    this._translate(track, -idx * this._vw, true);
  }

  /** 翻到第 `index` 张（越界按 `loop` 决定回绕还是停在边界）。 */
  goTo(index: number, opts: { silent?: boolean } = {}): void {
    const n = this._list.length;
    if (n < 2) return;
    let next = index;
    if (next < 0 || next >= n) {
      if (!this.loop) return;
      next = (next + n) % n;
    }
    if (next === this._index) return;
    this.current = next;
    if (!opts.silent) this.emit("z-change", { index: next });
    this._restartAuto();
  }

  next(): void {
    this.goTo(this._index + 1);
  }

  prev(): void {
    this.goTo(this._index - 1);
  }

  private _translate(track: HTMLElement, x: number, animate: boolean): void {
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  /** 按当前页号重新摆位（拖动中断、窗口尺寸变化都走它）。 */
  private _snap = (): void => {
    const track = this.shadowRoot?.querySelector<HTMLElement>(".m-swiper__track");
    if (track) this._translate(track, -this._index * this._vw, true);
  };

  private _onTouchStart = (ev: Event): void => {
    if (this._list.length < 2) return;
    const t = (ev as TouchEvent).touches[0];
    if (!t) return;
    this._dragging = true;
    this._axis = "none";
    this._startX = t.clientX;
    this._startY = t.clientY;
    this._deltaX = 0;
    this._stopAuto();
  };

  private _onTouchMove = (ev: Event): void => {
    if (!this._dragging) return;
    const e = ev as TouchEvent;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - this._startX;
    const dy = t.clientY - this._startY;
    if (this._axis === "none") {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
      // 纵向意图更明确就整场放弃：让页面自己滚，别抢
      if (Math.abs(dy) >= Math.abs(dx)) {
        this._dragging = false;
        this._restartAuto();
        return;
      }
      this._axis = "x";
      this.shadowRoot!.querySelector(".m-swiper")?.classList.add("is-dragging");
    }
    e.preventDefault();
    let move = dx;
    const idx = this._index;
    // 边界阻尼：没有下一张时只跟手三分之一，用户能感觉到「到头了」
    if (!this.loop && ((idx === 0 && dx > 0) || (idx === this._list.length - 1 && dx < 0))) {
      move = dx / 3;
    }
    this._deltaX = move;
    const track = this.shadowRoot!.querySelector<HTMLElement>(".m-swiper__track");
    if (track) this._translate(track, -idx * this._vw + move, false);
  };

  private _onTouchEnd = (): void => {
    if (!this._dragging) return;
    this._dragging = false;
    this.shadowRoot!.querySelector(".m-swiper")?.classList.remove("is-dragging");
    const dx = this._deltaX;
    const threshold = this._vw * SWIPE_RATIO;
    const from = this._index;
    this._fromDrag = Math.abs(dx) >= threshold;
    if (dx <= -threshold) this.goTo(from + 1);
    else if (dx >= threshold) this.goTo(from - 1);
    // 没翻页（或翻不动）时 goTo 不改 current、也就不会重渲染 —— 得自己回弹
    if (this._index === from) {
      this._fromDrag = false;
      this._snap();
    }
    this._restartAuto();
  };

  private _onClick = (e: Event): void => {
    const dot = (e.target as HTMLElement).closest("[data-goto]") as HTMLElement | null;
    if (dot) {
      this.goTo(Number(dot.dataset.goto));
      return;
    }
    if (this._dragging) return;
    // 拖动结束时浏览器也会补一个 click，位移过就不当点击（否则每次滑动都跳详情）
    if (Math.abs(this._deltaX) > DIRECTION_LOCK_PX) {
      this._deltaX = 0;
      return;
    }
    this.emit("z-click", { index: this._index });
  };

  private _onKey = (e: Event): void => {
    const key = (e as KeyboardEvent).key;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;
    e.preventDefault();
    if (key === "ArrowRight") this.next();
    else this.prev();
  };

  private _restartAuto(): void {
    this._stopAuto();
    if (!this.autoplay || this._list.length < 2) return;
    // 系统开了「减少动态效果」就不自动播：这是前庭功能的硬约束，不是审美偏好
    if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    this._timer = window.setInterval(() => {
      if (this._dragging) return;
      this.goTo(this._index + 1, { silent: false });
    }, Math.max(1000, this.autoplay));
  }

  private _stopAuto(): void {
    if (this._timer !== undefined) {
      window.clearInterval(this._timer);
      this._timer = undefined;
    }
  }
}

defineElement("m-swiper", MSwiper);
