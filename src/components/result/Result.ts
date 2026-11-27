// [WHY] 结果页 [[2026-08-11-W17-data]] [2026-08-11] night-hawk:
// 四状态图标/颜色（success|error|info|warning）+ title/subtitle + slots。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import resultCSS from "./result.css?raw";


const STATUS_ICON: Record<string, string> = {
  success: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M14 25l7 7 13-14"/></svg>',
  error: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M17 17l14 14M31 17L17 31"/></svg>',
  info: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M24 22v10M24 16v.5"/></svg>',
  warning: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l20 36H4z" opacity=".2"/><path d="M24 20v10M24 34v.5"/></svg>',
};

export class ZResult extends BaseElement {
  static styles = resultCSS;

  @property({ type: String }) status: "success" | "error" | "info" | "warning" = "info";
  @property({ type: String }) title = "";
  @property({ type: String }) subtitle = "";

  render(): string {
    const title = this.title ? `<div class="z-result__title" part="title">${escapeAttr(this.title)}</div>` : "";
    const subtitle = this.subtitle ? `<div class="z-result__subtitle" part="subtitle">${escapeAttr(this.subtitle)}</div>` : "";
    return html`
      <div class="z-result z-result--${this.status}" part="root">
        <div class="z-result__icon" part="icon">
          ${STATUS_ICON[this.status]}
          <slot name="icon"></slot>
        </div>
        ${title}
        ${subtitle}
        <div class="z-result__actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

defineElement("z-result", ZResult);
