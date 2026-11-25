// <m-empty> 空状态：type 区分「空 / 错误 / 无权限」三种语义，三者共用一套版式。
// [WHY] 移动端空状态：三种语义（空 / 错误 / 无权限）共用一套版式，避免各页各画一个。
// 文案多来自接口错误信息，插值必须转义（html`` 不做自动转义）。
import { BaseElement, html, property, escapeHtml } from "../../core/index.js";
import mEmptyCSS from "./m-empty.css?raw";

const ICONS: Record<string, string> = {
  empty: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="20" width="56" height="44" rx="4" stroke="currentColor" stroke-width="2"/><path d="M12 32h56" stroke="currentColor" stroke-width="2"/><path d="M30 48h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  error: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M40 14l28 48H12L40 14z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M40 34v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="54" r="2" fill="currentColor"/></svg>`,
  forbidden: `<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="26" stroke="currentColor" stroke-width="2"/><path d="M22 22l36 36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
};

export class MEmpty extends BaseElement {
  static styles = mEmptyCSS;

  @property({ type: String }) type: "empty" | "error" | "forbidden" = "empty";
  /** 标题。注意这是**业务标题**，与原生 HTMLElement.title（悬停气泡）同名 ——
   *  本组件的 `title` 自定义属性会覆盖原生反射，故悬停不会出现重复气泡。 */
  @property({ type: String }) title: string = "";
  @property({ type: String }) description: string = "";

  render(): string {
    const icon = ICONS[this.type] || ICONS.empty;

    return html`
      <div class="m-empty" part="root">
        <div class="m-empty__icon" part="icon">${icon}</div>
        ${this.title ? html`<div class="m-empty__title" part="title">${escapeHtml(this.title)}</div>` : ""}
        ${this.description
          ? html`<div class="m-empty__description" part="description">${escapeHtml(this.description)}</div>`
          : ""}
        <div class="m-empty__action" part="action"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define("m-empty", MEmpty);
