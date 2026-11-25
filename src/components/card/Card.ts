// <z-card> 卡片容器：header / cover / 默认槽 / footer 四槽，bordered 与 shadow 控边框和投影，clickable 给可点反馈。
//
// [WHY clickable 不只是个 CSS 类，issue IKXHH9] 它原先只拼一个 `z-card--clickable`：鼠标悬停有反馈，
// 但**键盘到不了**、读屏也念不出它是可操作的。同库 `m-cell` 早把三件事做全了（role / tabindex /
// keydown 判 Enter·Space / 发 z-click），这里的同名属性只有一半 —— 那不是「PC 不做可点卡片」的取舍，
// 是一处没做完。声明了 `role="button"` 就必须给键盘路径：读屏会宣布它是按钮，
// 用户按回车没反应比不写 role 更糟。
//
// [已知边界] clickable 与「卡内再放交互件」互斥：整卡是按钮、里面又有收藏按钮/行内操作时，
// 键盘要跳两层、读屏念「按钮里的按钮」。这里做了兜底（点到卡内可交互元素时不发 z-click），
// 但结构上仍建议：整卡可点的卡里不要放按钮，或把按钮移到卡外。
import { BaseElement, html, property } from "../../core/index.js";
import cardCSS from "./card.css?raw";

/** 卡内这些元素自己就是可点件：点到它们时不该再冒一次「整卡被点」。 */
const INTERACTIVE = "button, a[href], input, select, textarea, z-button, [role='button'], [tabindex]";

export class ZCard extends BaseElement {
  static styles = cardCSS;

  @property({ type: Boolean }) bordered = false;
  @property({ type: Boolean }) shadow = false;
  /** 可点：决定 role / tabindex / 键盘路径 / `z-click`；不写它就是一张纯展示卡片 */
  @property({ type: Boolean }) clickable = false;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY 委托到 shadowRoot] render 每次重建子节点，绑在具体节点上的监听会随旧节点一起丢；
    // 冒泡到 shadowRoot 时新节点照样命中（与 m-cell 同一写法）。
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    if (!this.clickable) return;
    // 卡内已经有可点件 ⇒ 那一次点击是给它的，不要再冒一遍「整卡被点」
    if (this._innerInteractiveOf(e)) return;
    this.emit("z-click", {});
  };

  private _onKeyDown = (e: Event): void => {
    if (!this.clickable) return;
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    // Space 默认滚页面、Enter 在表单里会提交 —— 两种都得拦
    ke.preventDefault();
    this.emit("z-click", {});
  };

  /**
   * 事件路径上（卡片根**以内**）的第一个可交互元素；没有则 `null`。
   *
   * [WHY 走到卡片根就停] 可点时卡片根本身带 `tabindex="0"`，它也在 `INTERACTIVE` 的选择器里 ——
   * 不设这个终点，点卡身会被判成「点在卡内的可交互元素上」，整卡永远点不动。
   */
  private _innerInteractiveOf(e: Event): Element | null {
    const root = this.shadowRoot?.querySelector(".z-card");
    for (const el of e.composedPath?.() ?? []) {
      if (el === root || el === this || el === this.shadowRoot) break;
      if (el instanceof Element && el.matches?.(INTERACTIVE)) return el;
    }
    return null;
  }

  render(): string {
    const cls = [
      "z-card",
      this.bordered ? "z-card--bordered" : "",
      this.shadow ? "z-card--shadow" : "",
      this.clickable ? "z-card--clickable" : "",
    ].filter(Boolean).join(" ");

    // role/tabindex 写在卡片根上（与 m-cell 同位置）：焦点环因此落在可见的边框上
    const a11y = this.clickable ? html`role="button" tabindex="0"` : "";

    return html`
      <div class="${cls}" part="root" ${a11y}>
        <div class="z-card__cover" part="cover">
          <slot name="cover"></slot>
        </div>
        <div class="z-card__header" part="header">
          <slot name="header"></slot>
        </div>
        <div class="z-card__body" part="body">
          <slot></slot>
        </div>
        <div class="z-card__footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("z-card", ZCard);
