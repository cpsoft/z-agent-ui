// <z-tab-panel> 标签页内容面板：label 作页签标题、disabled 置灰，只与 z-tabs 配合使用。
import { BaseElement, html, property } from "../../core/index.js";
import tabPanelCSS from "./tab-panel.css?raw";

export class ZTabPanel extends BaseElement {
  static styles = tabPanelCSS;

  @property({ type: String }) label = "";
  @property({ type: Boolean }) disabled = false;

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-tab-panel", ZTabPanel);
