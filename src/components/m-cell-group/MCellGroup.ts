// <m-cell-group> 单元格分组：heading / desc 作组标题与说明，plain 去掉组外框。
// [WHY] 单元格分组：把「一组相关的行」画成一张圆角卡片，并用**自动分隔线**代替每行手写
// `divider`。手写的问题不是麻烦，而是会漏：漏一行，那一组的两个条目就挤成一个，
// 看不出是两条。分隔线由容器统一加，行自己不需要知道旁边有没有人。
import { BaseElement, escapeHtml, html, property, defineElement } from "../../core/index.js";
import mCellGroupCSS from "./m-cell-group.css?raw";

export class MCellGroup extends BaseElement {
  static styles = mCellGroupCSS;

  /** 组标题（写在卡片外面，像 iOS 设置页的分组说明） */
  @property({ type: String }) heading = "";
  /** 组标题下的补充说明 */
  @property({ type: String }) desc = "";
  /**
   * 平铺：去掉圆角与外边距（用于「卡片里再分组」，或整页无卡片风格的列表）。
   * [WHY 用 plain 而不是 inset] 布尔默认值只能是 false，`inset` 默认 true 时
   * 书写者想关掉就必须写 `inset="false"` —— 而 HTML 里任何字符串都是真值，
   * 这个属性会永远开着。语义要落在「默认什么都不写」的那一侧。
   */
  @property({ type: Boolean }) plain = false;

  render(): string {
    const head = this.heading || this.desc
      ? html`
          <div class="m-cell-group__head" part="head">
            ${this.heading ? html`<span class="m-cell-group__heading" part="heading">${escapeHtml(this.heading)}</span>` : ""}
            ${this.desc ? html`<span class="m-cell-group__desc" part="desc">${escapeHtml(this.desc)}</span>` : ""}
          </div>
        `
      : "";

    return html`
      <div class="m-cell-group" part="root">
        ${head}
        <div class="m-cell-group__body" part="body"><slot></slot></div>
      </div>
    `;
  }
}

defineElement("m-cell-group", MCellGroup);
