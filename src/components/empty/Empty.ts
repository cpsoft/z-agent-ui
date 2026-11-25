// [WHY] 空状态 [[2026-08-11-W17-data]] [2026-08-11] night-hawk:
// 内置 SVG 图标集 + image/actions 槽位,零依赖。
//
// [WHY 2026-11-23 补 type/title] 移动端 `z-m-empty` 早就有「空 / 错误 / 无权限」三态
// （`type` + `title`），PC 版只有 `image` preset + description —— 同一件事两套 API，
// 页面换端就得改写法。这里补 `type` 与 `title` 对齐语义；`image` 保留且**优先**，
// 老写法（`<z-empty image="search">`）行为不变。
// See: architecture/component-gap-audit.html §03（空/错/无权限 4 处各写一遍）
import { BaseElement, html, property, escapeAttr } from "../../core/index.js";
import emptyCSS from "./empty.css?raw";


// [WHY] 内置插图: 按 preset 换图标,样式统一（描边 + 主色）,零图片资源
const ILLUST: Record<string, string> = {
  default: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h40v29H4z"/><path d="M4 16h40" opacity=".4"/><path d="M12 30h12" opacity=".4"/><circle cx="52" cy="10" r="6" opacity=".5"/></svg>',
  search: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="26" cy="18" r="10"/><path d="M34 26l10 10"/><path d="M44 8h16v29H44" opacity=".4"/></svg>',
  data: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 12h48M8 20h32M8 28h20M8 36h12" opacity=".4"/><circle cx="48" cy="30" r="7"/></svg>',
  network: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="14" r="6"/><path d="M26 26l-6 9M38 26l6 9" opacity=".5"/><path d="M12 34h40" opacity=".4"/></svg>',
  // [WHY 语义态也内建插图] 错误与无权限是「空」的两种具体成因，光换文案不换图形，
  // 用户看到的仍是「没数据」而不是「出错了 / 没权限」—— 两者的下一步动作完全不同。
  error: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="20" r="12"/><path d="M32 13v9"/><circle cx="32" cy="27" r="1.4" fill="currentColor" stroke="none"/></svg>',
  forbidden: '<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="20" y="19" width="24" height="16" rx="2"/><path d="M25 19v-4a7 7 0 0 1 14 0v4"/><circle cx="32" cy="27" r="1.6" fill="currentColor" stroke="none"/></svg>',
};

/** `type` → 默认插图。`image` 显式给了就轮不到它（老 API 优先）。 */
const TYPE_ILLUST: Record<string, string> = {
  empty: "default",
  error: "error",
  forbidden: "forbidden",
};

export class ZEmpty extends BaseElement {
  static styles = emptyCSS;

  /** 语义态：空 / 错误 / 无权限。决定默认插图与配色，不影响布局。 */
  @property({ type: String }) type = "empty";
  /**
   * 标题。
   *
   * [WHY 与原生 HTMLElement.title 同名] 与 `z-m-empty` 保持一致（两端同一套 API）。
   * 自定义属性会覆盖原生反射，所以悬停不会冒出重复气泡。需要悬停提示请用 `z-tooltip`。
   */
  @property({ type: String }) title = "";
  @property({ type: String }) description = "";
  /** 插图 preset。**显式给了就压过 `type`** —— 保证老写法零行为变化。 */
  @property({ type: String }) image = "";

  render(): string {
    const preset = this.image || TYPE_ILLUST[this.type] || "default";
    const illust = ILLUST[preset] ?? ILLUST.default;
    const title = this.title
      ? `<div class="z-empty__title" part="title">${escapeAttr(this.title)}</div>`
      : "";
    const desc = this.description
      ? `<div class="z-empty__description" part="description">${escapeAttr(this.description)}</div>`
      : "";
    return html`
      <div class="z-empty z-empty--${escapeAttr(this.type)}" part="root">
        <div class="z-empty__image" part="image" data-preset="${escapeAttr(preset)}">
          ${illust}
          <slot name="image"></slot>
        </div>
        ${title}
        ${desc}
        <div class="z-empty__actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `;
  }
}

customElements.define("z-empty", ZEmpty);
