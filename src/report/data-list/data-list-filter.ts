// [WHY] 2026-10-25 系统审计：从 DataList.ts（602 行）按职责拆出
// 职责：字段/筛选的类型定义与「过滤 + 排序」纯逻辑（不含任何 DOM）。

import type { SortEntry } from "../table/ReportTable.js";

export type DataListFieldType = "text" | "number" | "date" | "select" | "boolean";

export interface DataListField {
  key: string;
  label: string;
  type: DataListFieldType;
  /** select 字段的候选项; boolean 字段忽略(三态: All/是/否) */
  options?: { value: string; label: string }[];
  hidden?: boolean;
  required?: boolean;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  /** false 时该字段不渲染筛选控件 */
  filterable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => string;
}

export interface DataListNumberFilter {
  min: string;
  max: string;
}

export interface DataListDateFilter {
  start: string;
  end: string;
}

export type DataListFilterValue = string | DataListNumberFilter | DataListDateFilter;
export type DataListFilters = Record<string, DataListFilterValue>;
export type DataListMode = "client" | "server";

// ── 过滤谓词 (AND, 空值不过滤) ─────────────────────────

export function matchesFilters(
  fields: DataListField[],
  filters: DataListFilters,
  row: Record<string, unknown>,
): boolean {
  for (const f of fields) {
    if (f.filterable === false) continue;
    const filter = filters[f.key];
    if (filter === undefined || filter === null) continue;
    const raw = row[f.key];
    switch (f.type) {
      case "text": {
        const q = String(filter).trim();
        if (!q) continue;
        if (raw == null) return false;
        if (!String(raw).toLowerCase().includes(q.toLowerCase())) return false;
        break;
      }
      case "number": {
        const { min, max } = filter as DataListNumberFilter;
        if (!min && !max) continue;
        if (raw == null) return false;
        const n = Number(raw);
        if (Number.isNaN(n)) return false;
        if (min && n < Number(min)) return false;
        if (max && n > Number(max)) return false;
        break;
      }
      case "date": {
        // [WHY] 行值截取到日期粒度, 与 z-datepicker 的 "YYYY-MM-DD" 同粒度比较:
        // 否则 "2026-01-15T00:00:00.000Z" > "2026-01-15" 会把结束日整日排除
        const { start, end } = filter as DataListDateFilter;
        if (!start && !end) continue;
        const iso = (raw instanceof Date ? raw.toISOString() : String(raw ?? "")).slice(0, 10);
        if (!iso) return false;
        if (start && iso < start) return false;
        if (end && iso > end) return false;
        break;
      }
      case "select": {
        const v = String(filter);
        if (!v) continue;
        if (String(raw ?? "") !== v) return false;
        break;
      }
      case "boolean": {
        const v = String(filter);
        if (!v) continue;
        const b = raw === true || raw === "true" || raw === 1 || raw === "1";
        if (String(b) !== v) return false;
        break;
      }
    }
  }
  return true;
}

// [WHY] 多列比较器镜像 ReportTable._getSortedData: null 排尾, 字典序/数值序
export function compareRows(
  sortState: SortEntry[],
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): number {
  for (const { key, dir } of sortState) {
    const av = a[key];
    const bv = b[key];
    if (av == null && bv == null) continue;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
  }
  return 0;
}

/** 把一次控件上报合并进筛选 store（就地写 filters[key]）；返回是否真的有变化。 */
export function updateFilterStore(
  fields: DataListField[],
  filters: DataListFilters,
  key: string,
  bound: string,
  value: DataListFilterValue,
): boolean {
  const field = fields.find((f) => f.key === key);
  if (!field) return false;
  // [WHY] 数值区间分支仅由 min/max 控件触发, 此时 value 必为字符串;
  // 显式 typeof 收窄, 否则展开进 { min/max } 会被推成宽联合类型
  const next: DataListFilterValue =
    field.type === "number" && typeof value === "string"
      ? bound === "min"
        ? { ...((filters[key] as DataListNumberFilter) ?? { min: "", max: "" }), min: value }
        : { ...((filters[key] as DataListNumberFilter) ?? { min: "", max: "" }), max: value }
      : value;
  // [WHY] z-input 实时(z-input)与 commit(z-change)会重复上报同值, 去重避免
  // 重复 z-filter-change 造成 server 重复请求 / 客户端重复重算
  if (JSON.stringify(filters[key] ?? "") === JSON.stringify(next)) return false;
  filters[key] = next;
  return true;
}
