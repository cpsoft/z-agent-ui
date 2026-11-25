// <z-menu-item> 菜单项：value 标识自己、disabled 置灰，点击交给所属的 z-menu 处理。
// danger 供右键菜单的破坏性动作（删除/移除）使用，颜色语义只在这里定义一次。
import { BaseElement, html, property, ariaBool } from "../../core/index.js";
import menuItemCSS from "./menu-item.css?raw";

export class ZMenuItem extends BaseElement {
  static styles = menuItemCSS;

  @property({ type: String }) value = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) danger = false;

  render(): string {
    const cls = [
      "z-menu-item",
      this.disabled ? "z-menu-item--disabled" : "",
      this.danger ? "z-menu-item--danger" : "",
    ].filter(Boolean).join(" ");

    return html`
      <div class="${cls}" part="item" role="menuitem" aria-disabled="${ariaBool(this.disabled)}">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("z-menu-item", ZMenuItem);
