// 月历**渲染**件：本地化文案 + 6×7 表格骨架。三个控件共用（datepicker / date-range / calendar）。
//
// [WHY 2026-11-15 只留渲染，纯算术下沉到 `core/date/calendar.ts`] 这个文件原来两件事都干，
// 于是 L3 为了拿 `presetRangeOf` 必须深引 `components/datepicker/presets.js`，
// 而 `syntax/lint.ts` 这种号称「纯函数、无 DOM」的模块就被绑到了控件目录上。
// 拆开后：
//   · 纯算术（ISO 解析/格式化/加减/栅格落位）→ `core/date/calendar.ts`，零 import
//   · 文案与标记（`getMonthLabel` / `renderGridTable`）→ 留在这里，属 L1 的外观件
// 判据与 L0 的分工一致：**L0 不放带具体外观的东西**。
//
// See: wiki/requirements/REQ-004-datepicker.md
import { escapeAttr, type CalendarCell, type ISOString } from "../../core/index.js";

const monthLabelCache = new Map<string, string>();
const weekdayLabelCache = new Map<string, string[]>();

export function getMonthLabel(locale: string, year: number, month: number): string {
  const key = `${locale}|${year}|${month}`;
  const cached = monthLabelCache.get(key);
  if (cached) return cached;
  const label = new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(
    new Date(year, month, 1),
  );
  monthLabelCache.set(key, label);
  return label;
}

/** Short weekday labels in grid order starting from weekStart. */
export function getWeekdayLabels(locale: string, weekStart: number): string[] {
  const key = `${locale}|${weekStart}`;
  const cached = weekdayLabelCache.get(key);
  if (cached) return cached;
  const fmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
  // 2026-08-02 is a Sunday; iterate from weekStart to cover all 7 names
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    labels.push(fmt.format(new Date(2026, 7, 2 + weekStart + i)));
  }
  weekdayLabelCache.set(key, labels);
  return labels;
}

export interface GridTableOptions {
  /** CSS 类前缀，如 "z-datepicker"（生成 __grid/__weekday/part 名） */
  prefix: string;
  locale: string;
  weekStart: number;
  cells: CalendarCell[];
  today: ISOString;
  ariaLabel: string;
  // [WHY] 单元格语义三类组件各不相同（单选/范围/hidden-out），由调用方提供渲染而非内部合并
  cellHTML: (cell: CalendarCell, today: ISOString) => string;
}

/**
 * 渲染 6x7 月历表格骨架（thead 星期行 + tbody 网格行）。
 * [WHY] 抽取自 Datepicker/DateRange/Calendar 三处相同的双重循环 + 表格标记（2026-09-25 全项目去重）
 * See: wiki/requirements/REQ-004-datepicker.md
 */
export function renderGridTable(opts: GridTableOptions): string {
  const head = getWeekdayLabels(opts.locale, opts.weekStart)
    .map((l) => `<th scope="col" class="${opts.prefix}__weekday" part="weekday">${l}</th>`)
    .join("");
  let rows = "";
  for (let i = 0; i < 42; i += 7) {
    let row = "";
    for (let j = 0; j < 7; j++) {
      row += opts.cellHTML(opts.cells[i + j], opts.today);
    }
    rows += `<tr role="row">${row}</tr>`;
  }
  return `<table class="${opts.prefix}__grid" role="grid" aria-label="${escapeAttr(opts.ariaLabel)}">
      <thead><tr role="row">${head}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
