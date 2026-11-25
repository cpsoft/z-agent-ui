// [WHY] 2026-10-25 系统审计：从 report-card.ts（853 行）按职责拆出
// 职责：卡片导出 —— 导出行/列推导与 CSV 落盘、z-card-export 事件。

import { cardKind, isGroupedTable } from "../core/report-card.js";
import { kpiRaw } from "../core/report-kpi.js";
import { formatCellValue, measureTitleOf } from "../core/report-columns.js";
import { buildGroupRows } from "../core/report-group.js";
import { exportCSV } from "../core/report-export.js";
import type { ChartQueryData } from "../core/data-source.js";
import type { Column, ReportChart, ReportOrderBy } from "../core/types.js";
import { tableColumns } from "./card-submount.js";

/** 导出的行（与卡面同源）。
 *
 *  [分组表为什么要导出小计/总计行] 它们本来就画在屏幕上。只导叶子行的话，
 *  用户拿 CSV 求和会得到与最后一行的「总计」不同的数 —— 而两边都「看起来对」。
 *  导出**不按折叠状态**裁剪（折叠是看的时候的临时状态，不是数据的一部分）。 */
export function exportRows(
  chart: ReportChart,
  data: ChartQueryData | null,
): Record<string, unknown>[] {
  const kind = cardKind(chart);
  if (kind === "kpi") {
    return data ? [{ value: kpiRaw(chart, data.result ?? null) }] : [];
  }
  if (kind === "text" || kind === "image") return [];
  if (kind === "detail") return data?.detail?.rows ?? [];
  const rows = data?.result?.rows ?? [];
  if (!isGroupedTable(chart)) return rows;
  return buildGroupRows(chart, rows, {
    subtotal: chart.showSubtotal ?? true,
    grandTotal: chart.showGrandTotal ?? true,
  }).map((r) => r.values);
}

export function exportColumns(
  chart: ReportChart,
  cols: Column[],
  sort: ReportOrderBy[],
): { key: string; title: string }[] {
  const kind = cardKind(chart);
  if (kind === "kpi") {
    const m = chart.measures?.[0];
    return [{ key: "value", title: m ? measureTitleOf(m, chart, cols) : "值" }];
  }
  if (kind === "text" || kind === "image") return [];
  // 与渲染共用 tableColumns：导出的列序/列名与屏幕上那张表逐列一致
  return tableColumns(chart, cols, sort, kind === "detail")
    // 「#」列不进 CSV：行号在表格里是显示序号，导出后 Excel 自己会重排，
    // 而导出行的数据里没有 _rank，留着就是一整列空白
    .filter((c) => c.key !== "_rank")
    .map((c) => ({ key: String(c.key), title: String(c.title) }));
}

/** 立刻导出当前卡的数据。返回是否真的导出了（无数据时 false）。 */
export function runExport(o: {
  chart: ReportChart;
  data: ChartQueryData | null;
  cols: Column[];
  sort: ReportOrderBy[];
  name: string;
  emit: (type: string, detail: unknown) => void;
}): boolean {
  const chart = o.chart;
  const rows = exportRows(chart, o.data);
  if (!rows.length) return false;
  const formats = chart.colFormats;
  exportCSV(o.name || chart.title || "report", exportColumns(chart, o.cols, o.sort), rows, (key, v) =>
    formatCellValue(v, formats?.[key]),
  );
  o.emit("z-card-export", { chartId: chart.id, rows: rows.length });
  return true;
}
