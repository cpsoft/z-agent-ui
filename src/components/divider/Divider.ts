// <z-divider> 分隔线：orientation 切横竖，默认槽可放居中文字。
import { BaseElement, html, property } from "../../core/index.js";
import dividerCSS from "./divider.css?raw";

export class ZDivider extends BaseElement {
  static styles = dividerCSS;

  @property({ type: String }) orientation: "horizontal" | "vertical" = "horizontal";

  render(): string {
    const cls = [
      "z-divider",
      `z-divider--${this.orientation}`,
    ].join(" ");

    return html`
      <div class="${cls}" part="root" role="separator" aria-orientation="${this.orientation}">
        <span class="z-divider__label" part="label"><slot></slot></span>
      </div>
    `;
  }
}

customElements.define("z-divider", ZDivider);
