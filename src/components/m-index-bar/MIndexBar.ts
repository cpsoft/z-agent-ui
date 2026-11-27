// <m-index-bar> A-Z 快速定位：右侧索引条，点按或滑动跳到 [data-index] 对应的分组。
//
// [WHY 需要它] 门店/联系人列表动辄上百行，没有索引条就只能一屏屏翻。它看着像个装饰，
// 实际是**长列表唯一的随机访问入口** —— 而随机访问恰好是键盘与读屏用户最缺的能力
// （他们不能像手指那样甩一下滚过去）。
//
// [WHY 索引从子元素的 data-index 收集，而不是让作者再写一遍] 分组本身就是 `[data-index]`
// 的载体，卷标再写一份就是两处真相：改了一处忘了另一处，索引条上会出现「点了没反应」
// 的字母。收不到任何分组时不渲染索引条 —— 空索引条比没有索引条更让人困惑。
//
// 滚动方向与高亮是**双向**的：点索引条滚动内容，滚动内容也反过来更新索引条高亮。
// 只做单向的话，用户手动滚到 C 分组，索引条还停在 A 上。
import { BaseElement, COPY, html, property, defineElement } from "../../core/index.js";
import indexCSS from "./m-index-bar.css?raw";

/** 点在索引条上时，y 坐标落在第几个字母。`rect` 是索引条自身的矩形。 */
function indexAtY(rect: { top: number; height: number }, y: number, count: number): number {
  if (count <= 0 || rect.height <= 0) return -1;
  const each = rect.height / count;
  const n = Math.floor((y - rect.top) / each);
  return Math.max(0, Math.min(count - 1, n));
}

export class ZMIndexBar extends BaseElement {
  static styles = indexCSS;

  /**
   * 显式指定索引，逗号分隔（如 `"A,B,C,热点"`）。
   *
   * 不写时从子元素的 `data-index` 自动收集 —— 一般不需要写；只有在「分组还没渲染出来、
   * 但索引条要先占位」这种异步场景才用得上。
   */
  @property({ type: String }) indexes = "";

  /** 当前高亮的分组。滚动时会自动更新；写它则主动跳转（与点击索引条等价）。 */
  @property({ type: String }) active = "";

  /** 不显示滑动时的大号气泡（有些设计只要索引条本身）。 */
  @property({ type: Boolean }) hideBubble = false;

  /**
   * 索引条的可访问名称。
   *
   * [WHY 做成属性而不是写死常量] 它进的是读屏的「地标列表」：英文站里出现「快速定位」
   * 与整页其它文案语言不一致。同 `z-select` 的 `searchPlaceholder` 一类，文案归宿主。
   */
  @property({ type: String }) railLabel = COPY.quickJump;

  private _scrollTarget: HTMLElement | Window | null = null;

  /**
   * 跳转锁到期时间戳（ms）。
   *
   * [WHY 需要它] 点索引条的那一刻会滚动到目标分组，而 `behavior:"smooth"` 的滚动过程
   * 会持续几百毫秒 —— 期间每一帧的 scroll 事件都会触发反向同步，把高亮改成「当前
   * 滚到哪了」。结果是：点了 W，高亮闪一下 W 又跳回中间的 H，宿主还会收到两次
   * `z-index-change`（其中一次是错的）。跳转后锁一小段时间，让滚动走完再交还给同步逻辑。
   */
  private _jumpLock = 0;
  /** 锁期内上一次观察到的滚动位置：连续两次一样说明滚动停了，可以提前交还控制权。 */
  private _lockPos = -1;
  private _onScrollBound: (() => void) | null = null;
  private _sliding = false;
  private _bubbleTimer: number | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onRailClick);
    this.shadowRoot!.addEventListener("touchstart", this._onRailTouchStart, { passive: true });
    this.shadowRoot!.addEventListener("touchmove", this._onRailTouchMove, { passive: false });
    this.shadowRoot!.addEventListener("touchend", this._onRailTouchEnd);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onRailClick);
    this.shadowRoot!.removeEventListener("touchstart", this._onRailTouchStart);
    this.shadowRoot!.removeEventListener("touchmove", this._onRailTouchMove);
    this.shadowRoot!.removeEventListener("touchend", this._onRailTouchEnd);
    this._detachScroll();
    if (this._bubbleTimer !== null) clearTimeout(this._bubbleTimer);
    super.disconnectedCallback();
  }

  /** 索引列表：显式属性优先，否则从分组收集（去重、保持文档顺序）。 */
  private _indexes(): string[] {
    const explicit = this.indexes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (explicit.length) return explicit;

    const out: string[] = [];
    for (const el of Array.from(this.querySelectorAll<HTMLElement>("[data-index]"))) {
      const v = el.dataset.index ?? "";
      if (v && !out.includes(v)) out.push(v);
    }
    return out;
  }

  /** 某个索引对应的分组元素。 */
  private _groupOf(index: string): HTMLElement | null {
    return this.querySelector<HTMLElement>(`[data-index="${index}"]`);
  }

  /**
   * 真正的滚动容器：最近的可滚动祖先，找不到就是 window。
   *
   * [WHY 不能直接 scrollIntoView 了事] `scrollIntoView` 会把它经过的**所有**可滚动祖先
   * 一起滚，包括页面本身。在「页面不滚、列表内部滚」的布局里，那会把整页顶上去。
   */
  private _scrollParent(): HTMLElement | Window {
    // [WHY 先看自己] 最常见的用法是「把 m-index-bar 设成固定高度 + overflow-y:auto」，
    // 这时滚动容器就是它自己。只从 parentElement 往上找会一路找到 window，
    // 结果是「点索引条 → 整页滚走，列表纹丝不动」。
    const self = getComputedStyle(this);
    if (/(auto|scroll)/.test(self.overflowY) && this.scrollHeight > this.clientHeight) return this;

    let el: HTMLElement | null = this.parentElement;
    while (el) {
      const style = getComputedStyle(el);
      if (/(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight) return el;
      el = el.parentElement;
    }
    return window;
  }

  /**
   * 把滚动目标收窄成「元素」或 null（null 表示滚的是 window）。
   *
   * [WHY 单独一个方法] `parent === window` **不构成 TypeScript 的类型守卫**（Window 与
   * HTMLElement 的成员有交集），直接写会得到「Window 上没有 getBoundingClientRect」。
   * 收窄放在一处，两处调用点就不用各自断言。
   */
  private _scrollEl(): HTMLElement | null {
    const t = this._scrollTarget;
    return t && t !== window ? (t as HTMLElement) : null;
  }

  private _attachScroll(): void {
    const target = this._scrollParent();
    if (this._scrollTarget === target) return;
    this._detachScroll();
    this._scrollTarget = target;
    this._onScrollBound = () => this._syncActiveFromScroll();
    target.addEventListener("scroll", this._onScrollBound, { passive: true });
  }

  private _detachScroll(): void {
    if (!this._scrollTarget || !this._onScrollBound) return;
    this._scrollTarget.removeEventListener("scroll", this._onScrollBound);
    this._scrollTarget = null;
    this._onScrollBound = null;
  }

  /** 跳到某个分组，并把高亮切过去。 */
  private _jumpTo(index: string): void {
    const group = this._groupOf(index);
    if (!group) return;

    // 锁 600ms 兜底；实际通常更早解锁（见 _syncActiveFromScroll 的静止检测）
    this._jumpLock = Date.now() + 600;
    this._lockPos = -1;
    this._attachScroll();
    // [WHY 用 `=== window` 而不是 `instanceof Window`] happy-dom 的全局 window 与
    // 测试沙箱里的 Window 构造器不是同一个引用，`instanceof` 在那里恒为 false ——
    // 于是走到元素分支，对着 window 调 `getBoundingClientRect` 直接抛。
    const parent = this._scrollEl();
    if (!parent) {
      // 页面滚动：用元素相对文档的位置，避免 offsetParent 链上的差异
      const top = group.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: "smooth" });
    } else {
      // 容器滚动：目标位置是「分组相对容器内容顶边」的偏移
      // [WHY 减 clientTop] 容器有边框时 rect.top 含边框宽度，不减掉会稳定偏移 1px
      const top =
        group.getBoundingClientRect().top - parent.getBoundingClientRect().top - parent.clientTop + parent.scrollTop;
      parent.scrollTo({ top, behavior: "smooth" });
    }

    if (index !== this.active) {
      this.active = index;
      this.emit("z-index-change", { index });
    }
  }

  /**
   * 反向同步：滚动到位后，高亮最近一个「顶边已经越过视口顶部」的分组。
   *
   * [WHY 用「最后一个越过顶部的」而不是「最靠近顶部的」] 分组大多比视口矮，容器顶部
   * 停在分组中间时，两个候选都「很近」；按「越过顶部」判，天然得到**当前正在看的那一组**。
   */
  private _syncActiveFromScroll(): void {
    // 跳转进行中：这段时间的滚动是**我们自己发起的**，不该反过来改高亮
    if (Date.now() < this._jumpLock) {
      const pos = this._scrollEl()?.scrollTop ?? window.scrollY;
      if (pos === this._lockPos) {
        // [WHY 提前解锁] 只靠时间兜底的话，用户「点完索引条立刻手动滚」会遇到高亮卡住
        // 半秒。滚动位置连续两次不变 = smooth 已经走完，可以交还控制权了。
        this._jumpLock = 0;
      } else {
        this._lockPos = pos;
        return;
      }
    }
    const indexes = this._indexes();
    if (!indexes.length) return;

    const containerTop = this._scrollEl()?.getBoundingClientRect().top ?? 0;

    let current = indexes[0];
    for (const idx of indexes) {
      const group = this._groupOf(idx);
      if (!group) continue;
      // 留 1px 容差：正好对齐时浮点误差会让「越过」判成 false
      if (group.getBoundingClientRect().top - containerTop <= 1) current = idx;
    }
    if (current !== this.active) {
      this.active = current;
      this.emit("z-index-change", { index: current });
    }
  }

  private _showBubble(index: string): void {
    if (this.hideBubble) return;
    const bubble = this.shadowRoot!.querySelector<HTMLElement>(".z-m-index-bar__bubble");
    if (!bubble) return;
    bubble.textContent = index;
    bubble.setAttribute("data-visible", "");
    if (this._bubbleTimer !== null) clearTimeout(this._bubbleTimer);
    this._bubbleTimer = window.setTimeout(() => bubble.removeAttribute("data-visible"), 600);
  }

  private _onRailClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-idx]");
    if (!btn?.dataset.idx) return;
    this._jumpTo(btn.dataset.idx);
  };

  private _onRailTouchStart = (e: Event): void => {
    const te = e as TouchEvent;
    const rail = this.shadowRoot!.querySelector<HTMLElement>(".z-m-index-bar__rail");
    if (!rail || te.touches.length !== 1) return;
    this._sliding = true;
    this._handleRailY(te.touches[0].clientY);
  };

  private _onRailTouchMove = (e: Event): void => {
    if (!this._sliding) return;
    const te = e as TouchEvent;
    if (te.touches.length !== 1) return;
    // 滑动索引条时页面不该跟着滚 —— 这是这个监听不能 passive 的唯一原因
    te.preventDefault();
    this._handleRailY(te.touches[0].clientY);
  };

  private _onRailTouchEnd = (): void => {
    this._sliding = false;
  };

  private _handleRailY(y: number): void {
    const rail = this.shadowRoot!.querySelector<HTMLElement>(".z-m-index-bar__rail");
    if (!rail) return;
    const indexes = this._indexes();
    const rect = rail.getBoundingClientRect();
    const i = indexAtY(rect, y, indexes.length);
    if (i < 0) return;
    const index = indexes[i];
    this._showBubble(index);
    this._jumpTo(index);
  }

  protected updated(): void {
    this._attachScroll();
  }

  render(): string {
    const indexes = this._indexes();
    const rail = indexes.length
      ? html`<div class="z-m-index-bar__rail" part="rail" role="navigation" aria-label="${this.railLabel}">
          ${indexes
            .map(
              (i) =>
                // [WHY aria-current 只在真时写] `aria-current="false"` 合法但冗余，
                // 而且它和「没有该属性」在不少读屏里念法不同；条件写让语义只有两个状态。
                html`<button type="button" class="z-m-index-bar__item" part="item" data-idx="${i}"${this.active === i ? ' aria-current="true"' : ""}>${i}</button>`,
            )
            .join("")}
        </div>`
      : "";
    // [WHY 气泡 aria-hidden] 它只是「手指盖住了索引条，所以我告诉你现在在哪个字母」的
    // 视觉替身；读屏在点按索引条时已经能念出按钮名，再播一次是重复。
    const bubble = this.hideBubble
      ? ""
      : html`<div class="z-m-index-bar__bubble" part="bubble" aria-hidden="true"></div>`;

    return html`
      <div class="z-m-index-bar__body" part="body"><slot></slot></div>
      ${rail}${bubble}
    `;
  }
}

defineElement("m-index-bar", ZMIndexBar);
