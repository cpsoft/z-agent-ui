// <m-pull-refresh> 下拉刷新：refreshing 控制状态，threshold 定触发距离，下拉到位发 z-refresh。
// [WHY] 下拉刷新：touch 事件序列 + translateY 变换 + 阻尼
// 关键约束：scrollTop=0 且 deltaY>0 才允许下拉；释放后回弹用 CSS transition
// 事件绑在 shadow root 的 scroller 元素上（updated 重建 DOM 需重绑）
// [2026-09-15] night-hawk: 创建移动端交互组件
import { BaseElement, escapeHtml, html, property, t, defineElement } from "../../core/index.js";
import mPullRefreshCSS from "./m-pull-refresh.css?raw";

export class MPullRefresh extends BaseElement {
  static styles = mPullRefreshCSS;

  @property({ type: Boolean }) refreshing = false;
  @property({ type: Number }) threshold = 60;

  private _startY = 0;
  private _deltaY = 0;
  private _pulling = false;
  private _pullDistance = 0;
  private _scroller: HTMLElement | null = null;
  /** 这次手势认定的滚动容器（`_onTouchMove` 每帧都要问，每次重新量布局没必要）。 */
  private _scrollRoot: HTMLElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this._bindScroller();
  }

  disconnectedCallback(): void {
    this._unbindScroller();
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] render 重建 DOM 后元素是新实例，需重新绑定
    this._bindScroller();

    // [WHY] refreshing=true 时固定在阈值位置显示刷新中状态
    // refreshing=false 且未在拉动中时回弹到 0
    if (this.refreshing) {
      this._setTranslate(this.threshold, true);
    } else if (!this._pulling) {
      this._setTranslate(0, false);
    }
  }

  private _bindScroller(): void {
    const scroller = this.shadowRoot!.querySelector<HTMLElement>(".m-pull-refresh__scroller");
    if (!scroller || scroller === this._scroller) return;
    // [WHY] 元素实例变化时先解绑旧的（render 重建场景）
    this._unbindScroller();
    this._scroller = scroller;
    // [WHY] touchmove 需 preventDefault 阻止原生滚动，必须 passive: false
    scroller.addEventListener("touchstart", this._onTouchStart, { passive: false });
    scroller.addEventListener("touchmove", this._onTouchMove, { passive: false });
    scroller.addEventListener("touchend", this._onTouchEnd);
    scroller.addEventListener("touchcancel", this._onTouchEnd);
  }

  private _unbindScroller(): void {
    if (!this._scroller) return;
    this._scroller.removeEventListener("touchstart", this._onTouchStart);
    this._scroller.removeEventListener("touchmove", this._onTouchMove);
    this._scroller.removeEventListener("touchend", this._onTouchEnd);
    this._scroller.removeEventListener("touchcancel", this._onTouchEnd);
    this._scroller = null;
  }

  private _setTranslate(y: number, refreshing: boolean): void {
    if (this._scroller) {
      this._scroller.style.transform = `translateY(${y}px)`;
    }
    const indicator = this.shadowRoot!.querySelector<HTMLElement>(".m-pull-refresh__indicator");
    if (indicator) {
      // [WHY] 指示器贴着 scroller 顶部衔接：底边 = 内容顶边（y - threshold）。
      // [2026-09-17] 修复下拉未达阈值阶段指示器盖住首张卡片（与门店卡片重叠）：
      // 原公式 Math.max(0, y - threshold) 在 y<threshold 时把指示器顶到 [0,60] 压在内容上；
      // 正确为 translateY(y - threshold)：y=0 藏于 -60 上方、y=threshold 完全可见且与内容零重叠。
      indicator.style.transform = `translateY(${y - this.threshold}px)`;
      const arrow = indicator.querySelector<HTMLElement>(".m-pull-refresh__arrow");
      const spinner = indicator.querySelector<HTMLElement>(".m-pull-refresh__spinner");
      const text = indicator.querySelector<HTMLElement>(".m-pull-refresh__text");
      if (refreshing) {
        if (arrow) arrow.style.display = "none";
        if (spinner) spinner.style.display = "inline-block";
        if (text) text.textContent = t("refreshing");
      } else {
        if (arrow) arrow.style.display = "inline-block";
        if (spinner) spinner.style.display = "none";
        if (text) {
          text.textContent = y >= this.threshold && this._pulling ? t("releaseToRefresh") : t("pullToRefresh");
        }
        if (arrow) {
          const rotate = Math.min((y / this.threshold) * 180, 180);
          arrow.style.transform = `rotate(${rotate}deg)`;
        }
      }
    }
  }

  /**
   * 找到**真正会滚**的那个元素。
   *
   * [★ 2026-11-20 修] 原来是 `this._scroller.parentElement.scrollTop` —— 那是 shadow 里那个
   * 包装 div（`overflow:hidden`、从不滚动），读出来恒 0。于是页面滚到中间再下拉：
   * `preventDefault` 把手势抢走（**页面滚不回去**），并且照样过阈值 ⇒ 莫名变成「刷新」。
   * 两个症状都不报错，只是「手机上滑不动」。
   *
   * 顺序：① 自己是滚动视口 → ② 往外找 `overflow:auto|scroll` 且内容溢出的祖先 →
   * ③ 都没有就是整页滚（页面级用法最常见的一种，宿主的 webview 滚的是文档）。
   */
  private _findScrollRoot(): HTMLElement {
    const s = this._scroller;
    if (s && s.scrollHeight > s.clientHeight + 1) return s;
    let el: HTMLElement | null = this.parentElement;
    while (el) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight + 1) return el;
      el = el.parentElement;
    }
    return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
  }

  /** 是否还在最顶部（页面级用法里「顶部」是文档/外层容器，不是自己）。 */
  private _atTop(): boolean {
    return (this._scrollRoot?.scrollTop ?? 0) <= 0;
  }

  private _onTouchStart = (e: TouchEvent): void => {
    if (this.refreshing) return;
    const touch = e.touches[0];
    this._scrollRoot = this._findScrollRoot();
    this._startY = touch.clientY;
    this._pulling = true;
    if (this._scroller) this._scroller.style.transition = "none";
  };

  private _onTouchMove = (e: TouchEvent): void => {
    if (!this._pulling || this.refreshing) return;
    const touch = e.touches[0];
    this._deltaY = touch.clientY - this._startY;
    // [WHY] 只有 scrollTop=0 且向下拉（deltaY>0）才触发下拉
    if (this._deltaY <= 0) return;
    if (!this._atTop()) return;
    e.preventDefault();
    // [WHY] 阻尼：超过阈值时阻力更大（0.5 -> 0.3）模拟橡皮筋
    const damping = this._deltaY > this.threshold ? 0.3 : 0.5;
    this._pullDistance = this._deltaY * damping;
    this._setTranslate(this._pullDistance, false);
  };

  private _onTouchEnd = (): void => {
    if (!this._pulling) return;
    this._pulling = false;
    if (this._scroller) {
      this._scroller.style.transition = "transform var(--z-transition-normal)";
    }
    if (this._pullDistance >= this.threshold) {
      // [WHY] 超过阈值释放：固定到阈值位置并触发 z-refresh 事件
      this._setTranslate(this.threshold, true);
      this.emit("z-refresh");
    } else {
      this._setTranslate(0, false);
    }
    this._pullDistance = 0;
    this._deltaY = 0;
  };

  render(): string {
    return html`
      <div class="m-pull-refresh" part="root">
        <div class="m-pull-refresh__indicator" part="indicator" aria-hidden="true">
          <span class="m-pull-refresh__spinner" aria-hidden="true"></span>
          <svg class="m-pull-refresh__arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v10M4 7l4-4 4 4"/>
          </svg>
          <span class="m-pull-refresh__text">${escapeHtml(t("pullToRefresh"))}</span>
        </div>
        <div class="m-pull-refresh__scroller" part="scroller">
          <slot></slot>
        </div>
      </div>
    `;
  }
}

defineElement("m-pull-refresh", MPullRefresh);
