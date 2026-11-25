// 表格列的「展示口径」：标题、对齐、单元格格式化。
//
// [WHY 在 core 而不是渲染层] 这是**同一张表的同一个列头**在两种渲染下的唯一写法。
// React 版（zEtl 的 reports.tsx）与 Web Component 版（<z-report-card>）各写一份，
// 症状不是报错，而是「同一个报表在两种渲染器下列名叫法不同」—— 2026-10-25 实测过一次：
// 元素版把 `d` / `city_name` 原样印成表头，而 React 版是「日期 / 城市」。
//
// 口径（与 [[plan-20261023]] §6.3 一致）：别名 > 源表注释 > 物理名；datefmt 维度额外带粒度。
import { columnLabel } from "./column-label.js";
import { parseDateDim } from "./report-date.js";
import type {
  Column,
  ReportChart,
  ReportColFormat,
  ReportComputedField,
  ReportDateGranularity,
  ReportMeasure,
} from "./types.js";

/** 聚合方式的展示名。**唯一定义**：字段面板下拉与表格列头后缀都从这里取。
 *  两处各写一份的症状是「下单选的是『去重计数』，列头印成 countDistinct」。 */
export const AGG_OPTIONS: { value: ReportMeasure["agg"]; label: string }[] = [
  { value: "sum", label: "求和" },
  { value: "avg", label: "平均" },
  { value: "min", label: "最小" },
  { value: "max", label: "最大" },
  { value: "count", label: "计数" },
  { value: "countDistinct", label: "去重计数" },
];

export function aggLabelOf(agg: ReportMeasure["agg"] | string | undefined): string {
  return AGG_OPTIONS.find((o) => o.value === agg)?.label ?? String(agg ?? "");
}

/** 指标列基名：计算字段用它的命名；否则列别名 > 注释 > 物理名。 */
export function measureLabelOf(m: ReportMeasure, chart: ReportChart, cols: Column[]): string {
  if (m.computed) {
    const cf = (chart.computedFields ?? []).find((x) => x.key === m.field);
    if (cf) return cf.name;
  }
  return columnLabel(cols.find((c) => c.name === m.field)) || m.field;
}

/** 指标列完整标题：「基名（聚合标签）」。
 *  聚合计算字段度量（agg 空 = 表达式里已经含聚合）不加后缀，否则会出现「（ ）」。 */
export function measureTitleOf(m: ReportMeasure, chart: ReportChart, cols: Column[]): string {
  const base = measureLabelOf(m, chart, cols);
  return m.computed && !m.agg ? base : `${base}（${aggLabelOf(m.agg)}）`;
}

/** 计算字段是否**独立成列**：仅 legacy 四则（表达式不含 `[`）恒显示（存量兼容）。
 *  函数式 cf 被 measures/rows 引用时由指标/维度列渲染（避免重复列），未引用则不显示。 */
export function cfStandaloneColumn(cf: ReportComputedField): boolean {
  return !cf.expr.includes("[");
}

/** 时间层级维度的中文名。编码形态见 report-date 的 datefmt 约定，与后端逐字对齐。 */
export const GRANULARITIES: { value: ReportDateGranularity | ""; label: string }[] = [
  { value: "", label: "原样" },
  { value: "year", label: "年" },
  { value: "quarter", label: "季度" },
  { value: "month", label: "月" },
  { value: "week", label: "周" },
  { value: "dayofweek", label: "星期" },
  { value: "day", label: "日" },
  { value: "hour", label: "时" },
  { value: "minute", label: "分" },
  { value: "second", label: "秒" },
];

/** 维度列展示名：datefmt 维度 → 「字段（月）」；普通列 → 别名 || 注释 || 物理名。 */
export function dimLabel(dim: string, cols: Column[]): string {
  const p = parseDateDim(dim);
  if (!p) return columnLabel(cols.find((c) => c.name === dim)) || dim;
  const base = columnLabel(cols.find((c) => c.name === p.field)) || p.field;
  const g = GRANULARITIES.find((x) => x.value === p.gran)?.label ?? p.gran;
  return `${base}（${g}）`;
}

/** 单元格文本。
 *
 *  [为什么缺省放开小数位] Intl 默认最多 3 位（percent 更是 0 位），存储值 24.681818
 *  会被压成 24.682 / 2468% —— 看着像算错了。只有用户显式配了小数位才收窄。 */
export function formatCellValue(value: unknown, fmt?: ReportColFormat): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(num)) return String(value);
  // [WHY 这里**不**做浮点噪声清理] 呈现层无法区分「真精度」与「累加尾巴」：
  // 24.681818181818183 是数据本身的精度，131.80000000000004 是 sum 产生的噪声，
  // 两者形态一样。在此处按位数截断会**丢掉真精度**（既有测试专门守着这条）。
  // 噪声在产生地清理 —— 见 `page/dataset.aggregateRows` 与 `report-group` 的累加，
  // 那是本仓唯一做浮点加法的地方（issue IKQM8I）。
  const opts: Intl.NumberFormatOptions = {
    useGrouping: !!fmt?.thousands,
    maximumFractionDigits: 20,
  };
  if (fmt?.decimalPlaces !== undefined) {
    opts.minimumFractionDigits = fmt.decimalPlaces;
    opts.maximumFractionDigits = fmt.decimalPlaces;
  } else if (fmt?.maxDecimalPlaces !== undefined) {
    // [WHY 需要「只设上限」] 数量类字段要的是「最多两位、整数不补零」（1,234 而不是 1,234.00），
    // 而 decimalPlaces 是固定位数、会把整数写成 1,234.00。用 Intl 的默认 maximumFractionDigits
    // （20 位）又会把 24.681818 原样吐出，看起来像算错。两种都不是业务要的。
    opts.maximumFractionDigits = fmt.maxDecimalPlaces;
  }
  // 百分数（Excel 语义）：存储值视为比率，Intl 自动 ×100 并加 %（0.93628 → 93.63%）
  if (fmt?.formatType === "percent") {
    return new Intl.NumberFormat("zh-CN", { ...opts, style: "percent" }).format(num);
  }
  return new Intl.NumberFormat("zh-CN", opts).format(num);
}

/** 列标题：colFormats 里的别名优先，否则用传入的默认名。 */
export function colTitle(key: string, fallback: string, formats?: Record<string, ReportColFormat>): string {
  const a = formats?.[key]?.alias;
  return a && a.trim() !== "" ? a.trim() : fallback;
}

/** 列对齐：colFormats 覆盖默认（指标 right / 维度 left）。 */
export function colAlign(
  key: string,
  def: "left" | "right" | "center" | undefined,
  formats?: Record<string, ReportColFormat>,
): "left" | "right" | "center" | undefined {
  return formats?.[key]?.align ?? def;
}

/** 列宽：colFormats 覆盖默认宽度（空串=用默认）。 */
export function colWidthOf(
  key: string,
  def: string | undefined,
  formats?: Record<string, ReportColFormat>,
): string | undefined {
  const w = formats?.[key]?.width;
  return w && w.trim() !== "" ? w.trim() : def;
}
