// 表格列清单（表头 + 对齐 + 列宽 + 单元格格式化 + 是否维度列）。
//
// [WHY 在 core] 同一张表在 React 版（zEtl 的 reports.tsx）与 `<z-report-card>` 下必须是
// 同一套列。元素版此前是按**后端回传的 result.columns** 拼列，React 版是按**图表配置**
// （chart.rows / measures / computedFields）拼列 —— 两者平时看起来一样，一旦后端把
// datefmt 维度换成聚合别名（`datefmt:d:day` → `d`），元素版的小计行就再也对不上
// 列 key，症状是「小计行的维度格是空的」，而没有任何报错。2026-10-25 上移统一。
import { cardKind, isGroupedTable } from "./report-card.js";
import {
  cfStandaloneColumn,
  colAlign,
  colTitle,
  colWidthOf,
  dimLabel,
  formatCellValue,
  measureTitleOf,
} from "./report-columns.js";
import { parseDateDim } from "./report-date.js";
import { measureKeyOf } from "./report-kpi.js";
import { detailFields } from "./report-query.js";
import type { Column, ReportChart, ReportColFormat } from "./types.js";

/** 表格列（z-report-table 的契约：title / render / align；render 返回文本，由组件转义）。 */
export interface ReportTableColumn {
  key: string;
  title: string;
  width?: string;
  align?: "left" | "center" | "right";
  /** 数字列：编辑态表头菜单为该列显示「小数位 / 千分位」。 */
  numeric?: boolean;
  /** 可排序列：`sortMode="server"` 时点击列头触发 `z-sort`，由外部重新聚合。 */
  sortable?: boolean;
  /** 维度列：分组表/树状表格用（层级缩进 / 折叠按钮定位）。 */
  isDim?: boolean;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => string;
}

export interface TableColumnsOptions {
  /** 是否前置「# 排名」列。缺省：配了 orderBy 就有（排行语义）。分组表恒不加。 */
  rank?: boolean;
  /** 列头点击排序。缺省 true；编辑态应传 false（已有「排序」下拉，避免双入口）。 */
  sortable?: boolean;
}

/** 表格列：排名列（排序时）+ 维度列 + 指标列（带聚合标签）+ 独立计算字段列。
 *
 *  表格类型细分：分组表/树状表格不加排名列（层级 + 小计语义压过排行语义）；
 *  明细表 = 展示列平铺（不聚合、无聚合标签）。
 *
 *  `formats` 缺省取 `chart.colFormats`：列格式本来就只有一个真源（图表自己的配置）。
 *  让调用方「记得传」是没必要的失手面 —— 忘了传的症状是「别名/列宽/小数位全不生效」，
 *  而页面看起来完全正常。 */
export function buildTableColumns(
  chart: ReportChart,
  cols: Column[],
  formats: Record<string, ReportColFormat> = chart.colFormats ?? {},
  opts: TableColumnsOptions = {},
): ReportTableColumn[] {
  const rank = opts.rank ?? (chart.orderBy?.length ?? 0) > 0;
  const sortable = opts.sortable ?? true;
  const kind = cardKind(chart);
  const grouped = kind === "table" && isGroupedTable(chart);
  const out: ReportTableColumn[] = [];

  // 配置了排序 = 排行语义 → 前置「# 排名」列（行号 1..N）。分组表不加：
  // 层级里的「第 3 行」既不是第 3 名，也和任何一个指标无关。
  if (rank && !grouped) {
    out.push({ key: "_rank", title: "#", width: "64px", align: "center" });
  }

  // 明细表：展示列平铺（rows 去 datefmt 前缀 + measures 物理列），无聚合标签
  if (kind === "detail") {
    for (const f of detailFields(chart)) {
      out.push({
        key: f,
        title: colTitle(f, dimLabel(f, cols), formats),
        align: colAlign(f, undefined, formats),
        // 多列明细不能均分成十几像素；显式列宽保底，超宽交给组件内部横向滚动，
        // 用户列宽设置仍优先（colWidthOf 内部先读 colFormats）
        width: colWidthOf(f, "140px", formats),
        sortable,
        render: (v) => formatCellValue(v, formats[f]),
      });
    }
    return out;
  }

  for (const f of chart.rows) {
    // 报表级计算字段作维度时列头显示用户命名（cf.name）；datefmt 编码下不做精确匹配
    const cfDimName = parseDateDim(f) ? undefined : (chart.computedFields ?? []).find((c) => c.key === f)?.name;
    out.push({
      // [关键] key 必须是 chart.rows 里的**原串**（可能是 `datefmt:d:day`），
      // 因为分组行/联动/排序全部按这个 key 取值。换成物理列名会让小计行的维度格变空。
      key: f,
      title: colTitle(f, cfDimName || dimLabel(f, cols), formats),
      isDim: true,
      align: colAlign(f, undefined, formats),
      width: colWidthOf(f, undefined, formats),
      sortable,
      render: (v) => formatCellValue(v, formats[f]),
    });
  }

  for (const m of chart.measures) {
    const key = measureKeyOf(m);
    out.push({
      key,
      title: colTitle(key, measureTitleOf(m, chart, cols), formats),
      width: colWidthOf(key, "140px", formats),
      align: colAlign(key, "right", formats),
      numeric: true,
      sortable,
      render: (v) => formatCellValue(v, formats[key]),
    });
  }

  // 计算字段列（fx 标记，可排序/可配列格式，聚合后求值）。
  // 新建计算字段不自动放列：仅 legacy 四则恒显示（存量兼容）；函数式 cf 被
  // measures/rows 引用时由指标/维度列渲染，未引用则不显示。
  for (const cf of chart.computedFields ?? []) {
    if (!cfStandaloneColumn(cf)) continue;
    out.push({
      key: cf.key,
      title: colTitle(cf.key, cf.name, formats),
      width: colWidthOf(cf.key, "140px", formats),
      align: colAlign(cf.key, "right", formats),
      numeric: true,
      sortable,
      render: (v) => formatCellValue(v, formats[cf.key]),
    });
  }

  return out;
}

/** 追加 `_rank` 行号（与 buildTableColumns 的 `#` 列对齐）。行序即展示序，所以是 `i + 1`。 */
export function withRank(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((r, i) => ({ ...r, _rank: i + 1 }));
}
