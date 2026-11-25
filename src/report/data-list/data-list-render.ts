// [WHY] 2026-10-25 系统审计：从 DataList.ts（602 行）按职责拆出
// 职责：筛选栏 / 表格容器 / 分页器的 HTML 生成（纯函数）与转义工具。

import { escapeAttr, html } from "../../core/index.js";
import type {
  DataListDateFilter,
  DataListField,
  DataListFilters,
  DataListNumberFilter,
} from "./data-list-filter.js";

/** 筛选栏/分页器上全部可覆盖文案。 */
export interface DataListTexts {
  resetText: string;
  allText: string;
  yesText: string;
  noText: string;
  minPlaceholder: string;
  maxPlaceholder: string;
}

export interface FilterbarCtx {
  fields: DataListField[];
  /** 路径 B 的筛选 store（不是 prop） */
  filters: DataListFilters;
  locale: string;
  texts: DataListTexts;
}

export interface PagerCtx {
  showInfo: boolean;
  showPageSize: boolean;
}

export function renderFilterbar(ctx: FilterbarCtx): string {
  const fields = ctx.fields.filter((f) => f.filterable !== false);
  if (!fields.length) return "";
  const items = fields.map((f) => renderFilterItem(ctx, f)).join("");
  return html`
      <div class="z-dl__filterbar" part="filterbar">
        ${items}
        <button type="button" class="z-dl__reset" part="reset">${escapeAttr(ctx.texts.resetText)}</button>
      </div>`;
}

export function renderFilterItem(ctx: FilterbarCtx, f: DataListField): string {
  const hiddenCls = f.hidden ? " z-dl__filter-item--hidden" : "";
  const keyAttr = `data-key="${escAttr(f.key)}"`;
  const label = `<span class="z-dl__filter-label">${escapeAttr(f.label)}</span>`;
  const filter = ctx.filters[f.key];
  switch (f.type) {
    case "number": {
      // [WHY] 不用 z-number-input: value=0 默认/空输入 commit 成 0/无 clearable,
      // 无法表达"空"; 用 z-input type=number clearable, store 存原始字符串
      const range = (filter as DataListNumberFilter) ?? { min: "", max: "" };
      return html`
          <div class="z-dl__filter-item z-dl__filter-item--number${hiddenCls}" ${keyAttr}>
            ${label}
            <z-input type="number" clearable value="${escAttr(range.min)}" placeholder="${escAttr(ctx.texts.minPlaceholder)}" ${keyAttr} data-bound="min"></z-input>
            <z-input type="number" clearable value="${escAttr(range.max)}" placeholder="${escAttr(ctx.texts.maxPlaceholder)}" ${keyAttr} data-bound="max"></z-input>
          </div>`;
    }
    case "select": {
      const options = (f.options ?? [])
        .map((o) => `<z-option value="${escAttr(o.value)}">${escapeAttr(o.label)}</z-option>`)
        .join("");
      return html`
          <div class="z-dl__filter-item${hiddenCls}" ${keyAttr}>
            ${label}
            <z-select value="${escAttr((filter as string) ?? "")}" ${keyAttr} data-bound="">
              <z-option value="">${escapeAttr(ctx.texts.allText)}</z-option>
              ${options}
            </z-select>
          </div>`;
    }
    case "boolean": {
      return html`
          <div class="z-dl__filter-item${hiddenCls}" ${keyAttr}>
            ${label}
            <z-select value="${escAttr((filter as string) ?? "")}" ${keyAttr} data-bound="">
              <z-option value="">${escapeAttr(ctx.texts.allText)}</z-option>
              <z-option value="true">${escapeAttr(ctx.texts.yesText)}</z-option>
              <z-option value="false">${escapeAttr(ctx.texts.noText)}</z-option>
            </z-select>
          </div>`;
    }
    case "date": {
      const range = (filter as DataListDateFilter) ?? { start: "", end: "" };
      return html`
          <div class="z-dl__filter-item${hiddenCls}" ${keyAttr}>
            ${label}
            <z-datepicker mode="range" start="${escAttr(range.start)}" end="${escAttr(range.end)}" ${ctx.locale ? `locale="${escAttr(ctx.locale)}"` : ""} ${keyAttr} data-bound=""></z-datepicker>
          </div>`;
    }
    default: {
      return html`
          <div class="z-dl__filter-item${hiddenCls}" ${keyAttr}>
            ${label}
            <z-input clearable value="${escAttr((filter as string) ?? "")}" placeholder="${escAttr(f.label)}" ${keyAttr} data-bound=""></z-input>
          </div>`;
    }
  }
}

export function renderTable(): string {
  return html`
      <div class="z-dl__body" part="body">
        <z-report-table editable></z-report-table>
      </div>`;
}

export function renderPager(ctx: PagerCtx): string {
  const showInfo = ctx.showInfo ? "show-info" : "";
  const showPageSize = ctx.showPageSize ? "show-page-size" : "";
  return html`
      <div class="z-dl__footer" part="footer">
        <z-pagination ${showInfo} ${showPageSize}></z-pagination>
      </div>`;
}

// ── 转义 (html`...` 不转义, 见 [[lesson-web-components-render-pitfalls]]) ──

export { escapeAttr as esc };

export function escAttr(s: unknown): string {
  return escapeAttr(s).replace(/"/g, "&quot;");
}
