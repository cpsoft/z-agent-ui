// <m-card> 移动端卡片：clickable 才可点，点击与长按分别发 z-click / z-longpress。
// [WHY] 移动端卡片：把「点击 / 长按」两种手势收成两个事件，宿主不用自己算计时器。
// 判据是本组件最核心的部分 —— 手指在卡片上滑动（列表滚动、横向切换）**不能**当成点击，
// 否则用户每滚一次列表就会误进详情页。
import { BaseElement, html, property } from "../../core/index.js";
import { LongPressController } from "../../primitives/index.js";
import mCardCSS from "./m-card.css?raw";

/** 超过这个位移（px）就不再算点击：手指滚动时的抖动一般 3~8px，10px 留余量。 */
const MOVE_TOLERANCE = 10;
/**
 * 长按判定时长（ms），比原语缺省（500）长。
 *
 * [WHY 这里不跟随缺省] 卡片上的长按会**抢先于滚动与点击**：用户「按住准备滚列表」时
 * 手指经常停 500ms 以上，跟着系统值会把每次这样的按住都变成一次 z-longpress。
 * 统一的是判定语义（欧氏距离 / pointercancel / 吃掉原生右键菜单），不是这一个数字 ——
 * 见 `primitives/long-press` 的 `LongPressOptions.delayMs`。
 */
const LONG_PRESS_MS = 800;

export class MCard extends BaseElement {
  static styles = mCardCSS;

  @property({ type: Boolean }) clickable: boolean = false;
  @property({ type: String }) padding: "sm" | "md" = "md";

  /** 长按判定（计时 / pointercancel / 移动取消 / 吃掉原生右键菜单）全在 L0 原语里。 */
  private _lp = new LongPressController({
    delayMs: LONG_PRESS_MS,
    moveTolerance: MOVE_TOLERANCE,
    onLongPress: () => this.emit("z-longpress"),
  });
  /** 本次手势是否已判定为拖动；决定 pointerup 要不要派发 z-click。 */
  private _moved = false;
  private _startX = 0;
  private _startY = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("pointerdown", this._onPointerDown);
    this.addEventListener("pointerup", this._onPointerUp);
    this.addEventListener("pointerleave", this._onPointerCancel);
    // [WHY] pointercancel 必须监听：触摸滚动时浏览器发的是 cancel 而不是 leave，
    // 漏了它长按计时器会继续跑到 800ms，在滚动途中派发 z-longpress。
    this.addEventListener("pointercancel", this._onPointerCancel);
    this.addEventListener("pointermove", this._onPointerMove);
  }

  disconnectedCallback(): void {
    // destroy 而不是 cancel：元素卸载时连「刚触发过」也要清掉，否则重连后第一次
    // pointerup 会以为「这一轮已长按过」而不派发 z-click
    this._lp.destroy();
    this.removeEventListener("pointerdown", this._onPointerDown);
    this.removeEventListener("pointerup", this._onPointerUp);
    this.removeEventListener("pointerleave", this._onPointerCancel);
    this.removeEventListener("pointercancel", this._onPointerCancel);
    this.removeEventListener("pointermove", this._onPointerMove);
    super.disconnectedCallback();
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (!this.clickable) return;
    this._startX = e.clientX;
    this._startY = e.clientY;
    this._moved = false;
    this._lp.arm(e.clientX, e.clientY);
  };

  private _onPointerUp = (): void => {
    if (!this.clickable) return;
    // [WHY 先读 fired 再 cancel] 原语的 `cancel()` 刻意不重置 fired（见它的注释）；
    // 若这里反过来写，每次长按之后仍会派发 z-click —— 用户看到「长按弹了菜单，又进了详情页」
    const fired = this._lp.fired;
    this._lp.cancel();
    const wasMoved = this._moved;
    // [WHY] 手势结束即复位，避免状态残留影响下一次判断
    this._moved = false;
    if (!fired && !wasMoved) {
      this.emit("z-click");
    }
  };

  private _onPointerCancel = (): void => {
    this._lp.cancel();
    this._moved = true;
  };

  private _onPointerMove = (e: PointerEvent): void => {
    if (!this.clickable) return;
    const dx = e.clientX - this._startX;
    const dy = e.clientY - this._startY;
    // 欧氏距离，与长按原语同一判据：矩形判据（|dx|>t || |dy|>t）在 45° 方向上
    // 位移已到 t√2 才取消，比横着挪宽松一截
    if (dx * dx + dy * dy > MOVE_TOLERANCE * MOVE_TOLERANCE) {
      // [WHY] 标记「已拖动」而不是只清计时器：只清计时器时 pointerup 仍会派发 z-click，
      // 表现就是「滑一下列表就进了详情页」。
      this._moved = true;
      this._lp.cancel();
    }
  };

  render(): string {
    const cls = [
      "m-card",
      `m-card--${this.padding}`,
      this.clickable ? "m-card--clickable" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`<div class="${cls}" part="root"><slot></slot></div>`;
  }
}

customElements.define("m-card", MCard);
