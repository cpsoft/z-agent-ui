import { COPY, escapeAttr, escapeHtml, html, t } from "../../core/index.js";
import type { ZOption } from "../option/Option.js";

export interface SelectTriggerRenderState {
  open: boolean;
  disabled: boolean;
  invalid: boolean;
  multiple: boolean;
  clearable: boolean;
  maxTags: number;
  placeholder: string;
  authoredPlaceholder: string;
  emptyLabel: string;
  selectedOption: ZOption | undefined;
  selectedValues: string[];
  labelOf: (value: string) => string;
}

export interface SelectShellRenderState {
  uid: string;
  searchable: boolean;
  searchPlaceholder: string;
  staging: boolean;
  listName: string;
}

export interface SelectOptionsRenderState {
  uid: string;
  options: ZOption[];
  multiple: boolean;
  searchable: boolean;
  query: string;
  activeIndex: number;
  isSelected: (optionValue: string) => boolean;
}

/** 渲染多选标签列表（超出 maxTags 折叠为 +N）。 */
export function renderSelectTags(
  values: string[],
  maxTags: number,
  labelOf: (value: string) => string,
): string {
  const limit = maxTags > 0 ? maxTags : values.length;
  const shown = values.slice(0, limit);
  const rest = values.length - shown.length;
  const tags = shown.map((v) => {
    const text = labelOf(v);
    return (
      `<span class="z-select__tag" title="${escapeAttr(text)}">` +
      `<span class="z-select__tag-label">${escapeHtml(text)}</span>` +
      `<span class="z-select__tag-x" role="button" tabindex="-1" data-value="${escapeAttr(v)}"` +
      ` aria-label="${escapeAttr(t("removeItem", { label: text }))}">` +
      `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">` +
      `<path d="M1.6 1.6l4.8 4.8M6.4 1.6L1.6 6.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>` +
      `</span></span>`
    );
  });
  if (rest > 0) {
    const hidden = values.slice(limit).map(labelOf);
    tags.push(
      `<span class="z-select__tag z-select__tag--more" title="${escapeAttr(hidden.join("、"))}">+${rest}</span>`,
    );
  }
  return tags.join("");
}

/** 渲染 `<z-select>` 触发按钮模板。 */
export function renderSelectTrigger(s: SelectTriggerRenderState): string {
  const filled = s.multiple ? s.selectedValues.length > 0 : !!s.selectedOption;
  const clear =
    s.clearable && filled && !s.disabled && !s.multiple
      ? `<span class="z-select__clear" part="clear" role="button" tabindex="-1" aria-label="${COPY.clear}">` +
        `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">` +
        `<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>`
      : "";

  const body = s.multiple
    ? s.selectedValues.length
      ? `<span class="z-select__tags" part="value">${renderSelectTags(s.selectedValues, s.maxTags, s.labelOf)}</span>`
      : `<span class="z-select__value z-select__placeholder" part="value">${escapeHtml(
          s.authoredPlaceholder || s.emptyLabel || s.placeholder,
        )}</span>`
    : `<span class="z-select__value${s.selectedOption ? "" : " z-select__placeholder"}" part="value">${escapeHtml(
        String(s.selectedOption ? s.selectedOption.label : s.placeholder),
      )}</span>`;

  const titleAttr =
    !s.multiple && s.selectedOption ? ` title="${escapeAttr(String(s.selectedOption.label))}"` : "";

  return html`
    <button
      type="button"
      class="z-select__trigger ${s.open ? "z-select__trigger--open" : ""}${s.multiple ? " z-select__trigger--multi" : ""}"
      ${s.disabled ? "disabled" : ""}
      aria-expanded="${s.open ? "true" : "false"}"
      aria-haspopup="listbox"
      ${s.invalid ? 'aria-invalid="true"' : ""}
      ${titleAttr}
      part="trigger"
      data-focus-key="trigger"
    >
      ${body}${clear}
      <span class="z-select__chevron ${s.open ? "z-select__chevron--open" : ""}" part="chevron" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </span>
    </button>
  `;
}

/** 构建浮层面板外壳（搜索栏 + listbox 容器 + 可选底部确认条）。 */
export function buildSelectDropdownShell(s: SelectShellRenderState): string {
  const searchHTML = s.searchable
    ? html`<input type="text" class="z-select__search" part="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${s.uid}-listbox" placeholder="${escapeAttr(s.searchPlaceholder)}" aria-label="${escapeAttr(s.searchPlaceholder)}" autocomplete="off" />`
    : "";
  const footerHTML = s.staging
    ? `<div class="z-select__footer" part="footer">` +
      `<span class="z-select__count" part="count"></span>` +
      `<span class="z-select__footer-actions">` +
      `<button type="button" class="z-select__btn" data-act="reset">${escapeHtml(t("clearAll"))}</button>` +
      `<button type="button" class="z-select__btn z-select__btn--primary" data-act="confirm">${escapeHtml(t("confirm"))}</button>` +
      `</span></div>`
    : "";
  const listLabel = s.listName ? ` aria-label="${escapeAttr(s.listName)}"` : "";
  return `${searchHTML}<div class="z-select__options" role="listbox" id="${s.uid}-listbox" tabindex="-1"${listLabel}></div>${footerHTML}`;
}

/** 构建选项列表 HTML。 */
export function buildSelectOptionsHTML(s: SelectOptionsRenderState): string {
  if (s.options.length === 0) {
    const msg = s.searchable && s.query ? "No results" : "No options";
    return html`<div class="z-select__empty" part="empty">${msg}</div>`;
  }
  return s.options
    .map((opt, i) => {
      const on = s.isSelected(opt.value);
      const cls = [
        "z-select__option",
        on ? "z-select__option--selected" : "",
        s.multiple && on ? "z-select__option--multi" : "",
        opt.disabled ? "z-select__option--disabled" : "",
        i === s.activeIndex ? "z-select__option--active" : "",
      ]
        .filter(Boolean)
        .join(" ");

      const box = s.multiple
        ? html`<span class="z-select__box ${on ? "z-select__box--on" : ""}" part="box">${on
            ? `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
            : ""}</span>`
        : "";

      return html`<div class="${cls}" id="${s.uid}-opt-${i}" data-value="${escapeAttr(String(opt.value))}" role="option" tabindex="-1" aria-selected="${on ? "true" : "false"}" aria-disabled="${opt.disabled ? "true" : "false"}">
        ${box}
        ${escapeHtml(String(opt.label ?? ""))}
        ${!s.multiple && on ? html`<span class="z-select__check" part="check"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></span>` : ""}
      </div>`;
    })
    .join("");
}
