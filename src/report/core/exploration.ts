// 报表「查看/下钻」的纯计算部分。
//
// [WHY 与 UI 分离] 这部分原本和 React 的 DetailExplorer 同在一个 .tsx 里。
// 但它的本质是「把一次点击翻译成筛选条件」——日期粒度 → 半开区间、
// 系列点 → 维度筛选，全是纯函数，任何渲染层（Lit / React / Vue）都要用同一套。
// 留在组件文件里，非 React 宿主就只能重写一遍，而这类换算是「差一天就是错数据」的地方，
// 不允许有两份实现。
// See: wiki/requirements/req-20261013-bi-exploration.md (2026-10-13)
import type { Column, ReportChart, ReportFilter } from "./types.js";
import { columnLabel } from "./column-label.js";

/** 一次维度选择（点击图表某根柱子/某个扇区产生的下钻上下文）。 */
export interface ChartSelection {
  sourceId: string;
  datasetId: number;
  label: string;
  filters: ReportFilter[];
}

/**
 * 日期聚合标签转底层字段的半开区间。
 *
 * 周/星期等无法唯一对应的粒度**禁止猜测** —— 返回 null 让调用方放弃下钻，
 * 好过按错误的区间查出「看起来对」的数。
 */
export function dimensionFilter(field: string, value: unknown): ReportFilter[] | null {
  if (!field.startsWith("datefmt:")) return [{ field, op: value == null ? "isNull" : "=", value: value == null ? undefined : value }];
  const [, rawField, gran] = field.split(":");
  const text = String(value ?? "");
  const patterns: Record<string, RegExp> = {
    year: /^\d{4}$/, month: /^\d{4}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/,
    hour: /^\d{4}-\d{2}-\d{2} \d{2}:00$/, minute: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
    second: /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
  };
  const quarter = /^(\d{4})-Q([1-4])$/.exec(text);
  let start: Date;
  let end: Date;
  if (gran === "quarter" && quarter) {
    start = new Date(Date.UTC(+quarter[1], (+quarter[2] - 1) * 3, 1));
    end = new Date(start); end.setUTCMonth(end.getUTCMonth() + 3);
  } else if (patterns[gran]?.test(text)) {
    const parts = text.split(/[- :]/).map(Number);
    start = new Date(Date.UTC(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1, parts[3] ?? 0, parts[4] ?? 0, parts[5] ?? 0));
    if (start.getUTCFullYear() !== parts[0] || start.getUTCMonth() !== (parts[1] ?? 1) - 1 || start.getUTCDate() !== (parts[2] ?? 1) || start.getUTCHours() !== (parts[3] ?? 0) || start.getUTCMinutes() !== (parts[4] ?? 0) || start.getUTCSeconds() !== (parts[5] ?? 0)) return null;
    end = new Date(start);
    if (gran === "year") end.setUTCFullYear(end.getUTCFullYear() + 1);
    if (gran === "month") end.setUTCMonth(end.getUTCMonth() + 1);
    if (gran === "day") end.setUTCDate(end.getUTCDate() + 1);
    if (gran === "hour") end.setUTCHours(end.getUTCHours() + 1);
    if (gran === "minute") end.setUTCMinutes(end.getUTCMinutes() + 1);
    if (gran === "second") end.setUTCSeconds(end.getUTCSeconds() + 1);
  } else return null;
  const fmt = (d: Date) => ["year", "quarter", "month", "day"].includes(gran) ? d.toISOString().slice(0, 10) : d.toISOString().slice(0, 19).replace("T", " ");
  return [{ field: rawField, op: ">=", value: fmt(start) }, { field: rawField, op: "<", value: fmt(end) }];
}

/** 把「点击了某个系列点」翻译成选择上下文；计算列与缺失值不产生选择。 */
export function pointSelection(chart: ReportChart, row: Record<string, unknown>, columns: Column[]): ChartSelection | null {
  const dimension = chart.rows[0];
  if (!dimension) return null;
  const physical = dimension.startsWith("datefmt:") ? dimension.split(":")[1] : dimension;
  const column = columns.find((c) => c.name === physical);
  if (!column || (column as Column & { computed?: boolean }).computed || !Object.prototype.hasOwnProperty.call(row, dimension)) return null;
  const filters = dimensionFilter(dimension, row[dimension]);
  if (!filters) return null;
  return { sourceId: chart.id, datasetId: chart.datasetId, label: `${columnLabel(column)}：${row[dimension] == null ? "空值" : String(row[dimension])}`, filters };
}

/** 选择向下游图表传播的筛选；源图不被自己筛掉，保留继续选择分类的入口。 */
export function linkedFilters(chart: ReportChart, selections: ChartSelection[]): ReportFilter[] {
  return selections.filter((s) => s.datasetId === chart.datasetId && s.sourceId !== chart.id).flatMap((s) => s.filters);
}
