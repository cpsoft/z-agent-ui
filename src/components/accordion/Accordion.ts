// <z-accordion> 折叠面板容器：装若干 z-accordion-item，multiple 允许多个同时展开，展开变化由容器统一转出 z-change。
import { BaseElement, html, property } from "../../core/index.js";
import accordionCSS from "./accordion.css?raw";
import type { ZAccordionItem } from "../accordion-item/AccordionItem.js";

export class ZAccordion extends BaseElement {
  static styles = accordionCSS;

  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean }) bordered = false;

  render(): string {
    const cls = `z-accordion ${this.bordered ? "z-accordion--bordered" : ""}`;
    return html`<div class="${cls}" part="root"><slot></slot></div>`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-toggle", this._onItemToggle);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-toggle", this._onItemToggle);
    super.disconnectedCallback();
  }

  private _onItemToggle = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { open: boolean; index: number };
    if (!this.multiple && detail.open) {
      const items = this._getItems();
      items.forEach((item, i) => {
        if (i !== detail.index) {
          item.open = false;
        }
      });
    }
    this.emit("z-change", { openItems: this._getOpenIndices() });
  };

  private _getItems(): ZAccordionItem[] {
    return Array.from(this.querySelectorAll<ZAccordionItem>("z-accordion-item"));
  }

  private _getOpenIndices(): number[] {
    return this._getItems()
      .map((item, i) => (item.open ? i : -1))
      .filter((i) => i >= 0);
  }
}

customElements.define("z-accordion", ZAccordion);
