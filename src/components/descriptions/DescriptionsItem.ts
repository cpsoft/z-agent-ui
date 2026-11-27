// 只读键值展示的单元：一个 label + 一段内容。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import itemCSS from "./descriptions-item.css?raw";

export class ZDescriptionsItem extends BaseElement {
  static styles = itemCSS;

  @property({ type: String }) label = "";
  /** 占几列（默认 1）。跨列常用于「备注」这种长文本字段。 */
  @property({ type: Number }) span = 1;

  protected willUpdate(): void {
    const s = this.style;
    const n = Math.floor(Number(this.span));
    s.setProperty("--_span", String(Number.isFinite(n) && n > 1 ? n : 1));

    // 带边框时 label 与 value 横排（表格观感），否则上下排（卡片观感）。
    // —— CSS 读不到父组件的属性，只能在这里问一次。
    const parent = this.closest("z-descriptions") as { bordered?: boolean } | null;
    const bordered = Boolean(parent?.bordered);
    s.setProperty("--_dir", bordered ? "row" : "column");
    s.setProperty("--_align", bordered ? "center" : "flex-start");
    s.setProperty("--_label-flex", bordered ? "0 0 96px" : "0 0 auto");
  }

  render(): string {
    return html`
      <span class="z-descriptions-item__label" part="label">${escapeAttr(this.label)}</span>
      <span class="z-descriptions-item__value" part="value"><slot></slot></span>
    `;
  }
}

defineElement("z-descriptions-item", ZDescriptionsItem);
