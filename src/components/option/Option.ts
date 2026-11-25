// <z-option> 下拉选项：value / disabled / selected，只在下拉类容器里使用，不单独渲染。
import { BaseElement, property } from "../../core/index.js";

export class ZOption extends BaseElement {
  @property({ type: String }) value = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean, attribute: false }) selected = false;

  get label(): string {
    return this.textContent?.trim() || this.value;
  }

  render(): null {
    return null;
  }
}

customElements.define("z-option", ZOption);
