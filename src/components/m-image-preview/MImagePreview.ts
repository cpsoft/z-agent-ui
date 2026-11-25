// <m-image-preview> 图片查看器：整屏看大图，左右切换、双指缩放、缩放后拖动平移、下滑关闭。
//
// 与 `z-image` 的 preview 灯箱不是同一件事：那个是**单张**图的放大（点在图上就只看这一张），
// 商品详情要的是**一组**图之间来回翻 —— 五张图变成五个灯箱，用户看完第一张得先关掉再点第二张。
//
// 手势分工（冲突处只留一个，不留两套）：
//   · 单指横滑（未缩放）→ 上一张 / 下一张
//   · 单指拖动（已缩放）→ 平移画面
//   · 双指捏合 → 1~3 倍缩放；松手后不足 1.05 倍回弹到 1
//   · 单指下滑（未缩放）→ 关闭
//   · 单击 → 关闭（不做「双击缩放」：它和单击关闭抢同一个手势，只能靠 260ms 延迟区分，
//     而点了要等一下才关的手感更差；缩放交给双指，桌面用 + / - / 0）
import { BaseElement, COPY, escapeAttr, html, property } from "../../core/index.js";
import { lockScroll, pushOverlay, removeOverlay, unlockScroll } from "../../primitives/index.js";
import mImagePreviewCSS from "./m-image-preview.css?raw";

/** 方向锁定的最小位移（px）。 */
const LOCK_PX = 6;
/** 横滑翻页阈值：视口宽度的比例。 */
const SWIPE_RATIO = 0.2;
/** 下滑关闭阈值（px）。 */
const CLOSE_DY = 80;
/** 缩放上限。 */
const MAX_SCALE = 3;

function parseList(raw: string | string[]): string[] {
  const arr = Array.isArray(raw) ? raw : String(raw).split("|");
  return arr.map((s) => String(s).trim()).filter(Boolean);
}

export class MImagePreview extends BaseElement {
  static styles = mImagePreviewCSS;

  /** 图片地址，`|` 分隔（与 `m-swiper` 同一约定：CDN 裁剪参数自带逗号）。 */
  @property({ type: String, attribute: "items", reflect: false }) items: string | string[] = "";
  @property({ type: String, attribute: "alt", reflect: false }) alt: string | string[] = "";
  @property({ type: Number }) current = 0;
  @property({ type: Boolean }) visible = false;
  /** 无障碍名称（读屏念「<名字>，共 N 张」）。 */
  @property({ type: String }) label = "查看大图";
  /** 到头回绕。关掉则第一张不能再往前。 */
  @property({ type: Boolean }) loop = true;

  private _wasVisible = false;
  private _prevIndex = -1;

  /** 缩放与平移。只作用在当前这一张上，切图即复位。 */
  private _scale = 1;
  private _tx = 0;
  private _ty = 0;
  private _ox = 50;
  private _oy = 50;

  private _startX = 0;
  private _startY = 0;
  private _dx = 0;
  private _dy = 0;
  private _axis: "none" | "h" | "pan" | "v" = "none";
  private _pinchFrom = 0;
  private _pinchScale = 1;
  private _touching = false;
  private _moved = false;
  /** 最后一次拖动的时间：用来吞掉「松手后浏览器补发的那一次 click」。 */
  private _movedAt = 0;

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

  /** 当前缩放倍数（宿主与测试用；`1` = 未缩放）。 */
  get zoom(): number {
    return this._scale;
  }

  /** 由 overlayManager 的 Esc 处理器调用：返回 true 表示「Esc 归我管」。 */
  get closeOnEscape(): boolean {
    return this.visible;
  }

  render(): string {
    if (!this.visible) return html`<div style="display:none" part="hidden"></div>`;
    const list = this._list;
    const alts = this._alts;
    const idx = this._index;
    const slides = list
      .map(
        (src, i) => `<div class="mpv__slide" part="slide" data-slide="${i}">
          <img class="mpv__img" src="${escapeAttr(src)}" alt="${escapeAttr(alts[i] ?? "")}"
            draggable="false" data-img="${i}" />
        </div>`,
      )
      .join("");
    return html`
      <div class="mpv" part="root" role="dialog" aria-modal="true"
        aria-label="${escapeAttr(this.label)}">
        <div class="mpv__stage" part="stage">
          <div class="mpv__track" part="track">${slides}</div>
        </div>
        <div class="mpv__count" part="count">${idx + 1} / ${list.length}</div>
        <button type="button" class="mpv__close" part="close" aria-label="${COPY.close}">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `;
  }

  updated(): void {
    const opened = this.visible && !this._wasVisible;
    const closed = !this.visible && this._wasVisible;
    this._wasVisible = this.visible;

    if (opened) {
      this._resetZoom();
      pushOverlay(this);
      lockScroll();
      document.addEventListener("keydown", this._onKey);
      this.emit("z-open", { index: this._index });
    } else if (closed) {
      removeOverlay(this);
      unlockScroll();
      document.removeEventListener("keydown", this._onKey);
    }
    if (!this.visible) return;

    const track = this.shadowRoot!.querySelector<HTMLElement>(".mpv__track");
    if (!track) return;
    const idx = this._index;
    if (this._prevIndex !== idx && this._prevIndex >= 0) {
      // 重渲染换掉了轨道节点：先摆到上一张，再滑过去，动画才有起点
      this._moveTrack(track, -this._prevIndex * this._vw, false);
      void track.offsetWidth;
      this._moveTrack(track, -idx * this._vw, true);
    } else {
      this._moveTrack(track, -idx * this._vw, false);
    }
    this._prevIndex = idx;
    this._applyZoom();
  }

  connectedCallback(): void {
    super.connectedCallback();
    const root = this.shadowRoot!;
    root.addEventListener("touchstart", this._onTouchStart, { passive: true });
    root.addEventListener("touchmove", this._onTouchMove, { passive: false });
    root.addEventListener("touchend", this._onTouchEnd);
    root.addEventListener("touchcancel", this._onTouchEnd);
    root.addEventListener("click", this._onClick);
    window.addEventListener("resize", this._onResize);
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot!;
    root.removeEventListener("touchstart", this._onTouchStart);
    root.removeEventListener("touchmove", this._onTouchMove);
    root.removeEventListener("touchend", this._onTouchEnd);
    root.removeEventListener("touchcancel", this._onTouchEnd);
    root.removeEventListener("click", this._onClick);
    window.removeEventListener("resize", this._onResize);
    if (this.visible) {
      removeOverlay(this);
      unlockScroll();
      document.removeEventListener("keydown", this._onKey);
    }
    super.disconnectedCallback();
  }

  open(index?: number): void {
    if (typeof index === "number") this.current = index;
    if (this.visible) return;
    this.visible = true;
  }

  close(): void {
    if (!this.visible) return;
    this.visible = false;
    this.emit("z-close", { index: this._index });
  }

  goTo(index: number): void {
    const n = this._list.length;
    if (n < 2) return;
    let next = index;
    if (next < 0 || next >= n) {
      if (!this.loop) return;
      next = (next + n) % n;
    }
    if (next === this._index) return;
    this.current = next;
    this.emit("z-change", { index: next });
  }

  next(): void {
    this.goTo(this._index + 1);
  }

  prev(): void {
    this.goTo(this._index - 1);
  }

  private get _vw(): number {
    return this.shadowRoot?.querySelector<HTMLElement>(".mpv__stage")?.offsetWidth ?? 0;
  }

  private _moveTrack(track: HTMLElement, x: number, animate: boolean): void {
    track.style.transition = animate ? "" : "none";
    track.style.transform = `translate3d(${x}px, 0, 0)`;
  }

  private _resetZoom(): void {
    this._scale = 1;
    this._tx = 0;
    this._ty = 0;
    this._ox = 50;
    this._oy = 50;
    this._axis = "none";
  }

  /** 把缩放/平移写进当前那张图。拖动期间每帧直接改，不走重渲染。 */
  private _applyZoom(): void {
    const root = this.shadowRoot;
    if (!root) return;
    const imgs = root.querySelectorAll<HTMLElement>("[data-img]");
    imgs.forEach((img, i) => {
      if (i !== this._index) {
        img.style.transform = "";
        return;
      }
      img.style.transform =
        this._scale === 1 && this._tx === 0 && this._ty === 0
          ? ""
          : `translate3d(${this._tx}px, ${this._ty}px, 0) scale(${this._scale})`;
      img.style.transformOrigin = `${this._ox}% ${this._oy}%`;
    });
  }

  /** 平移边界：放大后最多露到图像边缘，别让图被拖出屏幕。 */
  private _clampPan(x: number, y: number): { x: number; y: number } {
    const stage = this.shadowRoot?.querySelector<HTMLElement>(".mpv__stage");
    const w = stage?.offsetWidth ?? 0;
    const h = stage?.offsetHeight ?? 0;
    const maxX = (w * (this._scale - 1)) / 2;
    const maxY = (h * (this._scale - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }

  private _onTouchStart = (ev: Event): void => {
    const e = ev as TouchEvent;
    this._touching = true;
    this._moved = false;
    this._dx = 0;
    this._dy = 0;
    this._axis = "none";
    const t = e.touches[0];
    if (!t) return;
    this._startX = t.clientX;
    this._startY = t.clientY;
    if (e.touches.length >= 2) {
      // 双指：记下起始间距与起始倍数，move 里按比例算
      this._pinchFrom = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      this._pinchScale = this._scale;
    }
  };

  private _onTouchMove = (ev: Event): void => {
    const e = ev as TouchEvent;
    if (!this._touching) return;
    if (e.touches.length >= 2 && this._pinchFrom > 0) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      this._scale = Math.max(1, Math.min(MAX_SCALE, (this._pinchScale * dist) / this._pinchFrom));
      this._moved = true;
      this._movedAt = Date.now();
      this._applyZoom();
      return;
    }
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - this._startX;
    const dy = t.clientY - this._startY;
    if (this._axis === "none") {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      if (this._scale > 1) this._axis = "pan";
      else if (Math.abs(dy) > Math.abs(dx)) this._axis = "v";
      else this._axis = "h";
    }
    if (this._scale > 1) {
      // 缩放态：单指拖动是平移动画面，不切图
      e.preventDefault();
      const p = this._clampPan(this._tx + dx, this._ty + dy);
      this._tx = p.x;
      this._ty = p.y;
      this._dx = dx;
      this._dy = dy;
      this._moved = true;
      this._movedAt = Date.now();
      this._applyZoom();
      return;
    }
    if (this._axis === "h") {
      e.preventDefault();
      this._dx = dx;
      this._moved = true;
      this._movedAt = Date.now();
      const track = this.shadowRoot!.querySelector<HTMLElement>(".mpv__track");
      if (track) {
        const atEdge =
          (!this.loop && this._index === 0 && dx > 0) ||
          (!this.loop && this._index === this._list.length - 1 && dx < 0);
        this._moveTrack(track, -this._index * this._vw + (atEdge ? dx / 3 : dx), false);
      }
    } else if (this._axis === "v") {
      e.preventDefault();
      this._dy = dy;
      this._moved = true;
      const root = this.shadowRoot!.querySelector<HTMLElement>(".mpv");
      if (root) root.style.setProperty("--mpv-dy", `${dy}px`);
    }
  };

  private _onTouchEnd = (): void => {
    if (!this._touching) return;
    this._touching = false;
    const root = this.shadowRoot?.querySelector<HTMLElement>(".mpv");
    root?.style.removeProperty("--mpv-dy");

    if (this._scale > 1) {
      // 捏合到接近 1 就回弹，别停在 1.02 倍这种「看着没变但拖不动」的状态
      if (this._scale < 1.05) {
        this._resetZoom();
        this._applyZoom();
      }
      return;
    }
    if (this._axis === "v" && Math.abs(this._dy) > CLOSE_DY) {
      this.close();
      return;
    }
    if (this._axis === "h") {
      const threshold = this._vw * SWIPE_RATIO;
      const from = this._index;
      if (this._dx <= -threshold) this.goTo(from + 1);
      else if (this._dx >= threshold) this.goTo(from - 1);
      if (this._index === from) {
        const track = this.shadowRoot?.querySelector<HTMLElement>(".mpv__track");
        if (track) this._moveTrack(track, -this._index * this._vw, true);
      }
    }
    // 这里**不能**清 _moved：松手后浏览器还会补一次 click，由 _onClick 消费掉。
    // 清了的话「滑了一下」会被当成单击，查看器直接退出。
  };

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (target.closest("[part~='close']")) {
      this.close();
      return;
    }
    // 刚拖动过：吞掉这一次 click（700ms 内有效，超时说明是另一次真实点击）
    if (this._moved && Date.now() - this._movedAt < 700) {
      this._moved = false;
      return;
    }
    // 缩放态单击不关（用户正在看细节）；回到 1 倍再点才关
    if (this._scale > 1) return;
    this.close();
  };

  private _onKey = (e: KeyboardEvent): void => {
    if (!this.visible) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      this.prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      this.next();
    } else if (e.key === "+" || e.key === "=") {
      e.preventDefault();
      this._scale = Math.min(MAX_SCALE, this._scale + 0.5);
      this._applyZoom();
    } else if (e.key === "-") {
      e.preventDefault();
      this._scale = Math.max(1, this._scale - 0.5);
      if (this._scale === 1) this._resetZoom();
      this._applyZoom();
    } else if (e.key === "0") {
      this._resetZoom();
      this._applyZoom();
    }
  };

  private _onResize = (): void => {
    const track = this.shadowRoot?.querySelector<HTMLElement>(".mpv__track");
    if (track) this._moveTrack(track, -this._index * this._vw, false);
    this._applyZoom();
  };
}

customElements.define("m-image-preview", MImagePreview);
