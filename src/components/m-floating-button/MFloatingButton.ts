// <m-floating-button> 悬浮按钮：icon 指定图标、position 定左右下角，点击发 z-click。
// [WHY] 浮动按钮：fixed 定位脱离文档流，避开被 TabBar 遮挡
// 通过 :host([position="br|bl"]) 切换左右定位
// [2026-09-15] night-hawk: 创建移动端交互组件
import { BaseElement, html, property, escapeHtml, escapeAttr } from "../../core/index.js";
import mFloatingButtonCSS from "./m-floating-button.css?raw";

export class MFloatingButton extends BaseElement {
  static styles = mFloatingButtonCSS;

  @property({ type: String }) icon = "+";
  @property({ type: String }) position: "br" | "bl" = "br";

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest(".m-floating-button");
    if (!btn) return;
    this.emit("z-click");
  };


  render(): string {
    const cls = `m-floating-button m-floating-button--${this.position}`;
    return html`
      <button type="button"
              class="${cls}"
              part="root"
              aria-label="${escapeAttr(this.icon)}">
        <span class="m-floating-button__icon" part="icon">${escapeHtml(this.icon)}</span>
      </button>
    `;
  }
}

customElements.define("m-floating-button", MFloatingButton);
