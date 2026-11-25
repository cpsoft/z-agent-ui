import type { ChartType, DataPoint, SeriesKind, SeriesModel } from "../types.js";

export interface RawSeries {
  name: string;
  type: string;
  data: unknown;
  color: string;
  yAxis: "left" | "right";
  format: string;
  visible: boolean;
  index: number;
  /** 气泡第三维的标题（`data[].r` 存在时由调用方给，见 SeriesModel.sizeTitle）。 */
  sizeTitle?: string;
}

function toPoints(raw: unknown, markgap: boolean): DataPoint[] {
  if (!Array.isArray(raw)) return [];
  const points: DataPoint[] = [];
  for (const item of raw) {
    if (typeof item === "number") {
      points.push({ x: points.length, label: String(points.length + 1), value: item });
    } else if (item && typeof item === "object") {
      const rec = item as Record<string, unknown>;
      const rawValue = rec.value ?? rec.y;
      // [WHY 缺数判在 Number 之前] Number(null) === 0、Number("") === 0 —— 先 Number
      // 再判 NaN 的话，null/空串会**静默变成 0**，缺数日画成塌陷到零的 V 形，
      // 与「真的是 0」无法区分（issue IKTM1J 的外卖 GMV 场景）。markgap 开启时
      // 三种空形态都产出 gap 点；关闭时维持历史行为（空 → 0），存量图表一字不变。
      if (markgap && (rawValue === null || rawValue === undefined || rawValue === "")) {
        const gapPoint: DataPoint = { value: NaN, gap: true };
        // 同下面正常点的注释：label 与 x 各自独立，不是二选一
        if (rec.label !== undefined) gapPoint.label = String(rec.label);
        if (rec.date !== undefined) {
          const t = typeof rec.date === "number" ? rec.date : Date.parse(String(rec.date));
          if (!Number.isNaN(t)) gapPoint.x = t;
        } else if (rec.x !== undefined) {
          const x = Number(rec.x);
          if (!Number.isNaN(x)) gapPoint.x = x;
        }
        if (gapPoint.x === undefined && gapPoint.label === undefined) gapPoint.x = points.length;
        points.push(gapPoint);
        continue;
      }
      const value = Number(rawValue);
      if (Number.isNaN(value)) continue;
      // [WHY label 与 x 不是互斥的] 这里早先是 if / else if 链：`有 label 就不再看 x`。
      // 柱/折线（只有 label）与散点（只有 x）都看不出问题，但**两者都有**的形态会静默
      // 丢掉 x —— 散点恰好是那种形态：x 定横轴位置、label 只当 tooltip 文案。
      // 丢了之后的链路是：collectXValues 拿到空 → xDomain 退回 [0,1] → 所有点挤在
      // 一条竖线上，而界面、类型、单测全绿（真机截图才发现，2026-11-17）。
      const point: DataPoint = { value };
      if (rec.label !== undefined) point.label = String(rec.label);
      if (rec.date !== undefined) {
        const t = typeof rec.date === "number" ? rec.date : Date.parse(String(rec.date));
        if (!Number.isNaN(t)) point.x = t;
      } else if (rec.x !== undefined) {
        const x = Number(rec.x);
        if (!Number.isNaN(x)) point.x = x;
      }
      // 两个来源都没有才是「按顺序排」：补下标与序号（存量纯数值数组的形态）
      if (point.x === undefined && point.label === undefined) {
        point.x = points.length;
        point.label = String(points.length + 1);
      }
      // 气泡第三维：只有正数有意义（半径不能为负或 0，0 半径等于不画）。
      // [WHY 静默丢弃非法值而不是折成 0] 折成 0 会得到一个「看不见的点」与正常的点
      // 混在一起 —— 数据缺了但图上只是少一个圆，读者不会知道。丢掉之后该点退回固定
      // 半径 4px，仍能被看到，只是不参与大小表达。
      if (rec.r !== undefined) {
        const r = Number(rec.r);
        if (Number.isFinite(r) && r > 0) point.r = r;
      }
      points.push(point);
    }
  }
  return points;
}

export function detectXKind(series: DataPoint[][], forced: string): "category" | "value" | "time" {
  if (forced === "category" || forced === "value" || forced === "time") return forced;
  for (const points of series) {
    if (points.some((p) => p.label !== undefined)) return "category";
  }
  return "value";
}

function resolveKind(rawType: string, chartType: ChartType): SeriesKind {
  switch (rawType) {
    case "bar":
    case "line":
    case "area":
    case "pie":
    case "sparkline":
    case "radar":
    case "waterfall":
    case "scatter":
      return rawType;
  }
  // "auto": inherit from chart, with donut collapsing to pie geometry
  switch (chartType) {
    case "donut":
      return "pie";
    case "pie":
    case "sparkline":
    case "radar":
    case "waterfall":
    case "bar":
    case "line":
    case "area":
    case "scatter":
      return chartType;
    // funnel / gauge / treemap / sankey / heatmap / boxplot 是**整图级**几何，
    // 系列 kind 不参与分派（见 `SeriesKind` 的注释）。落 `bar` 而不是新增 6 个
    // 永不分支的 kind：它们不进笛卡尔分支，`kind === "bar"` 的判断永远碰不到。
    default:
      return "bar";
  }
}

export function normalizeSeries(
  rawSeries: RawSeries[],
  chartType: ChartType,
  opts?: { markgap?: boolean },
): SeriesModel[] {
  // [WHY 缺数点只给折线] markgap 的语义是「线在这里断开」。柱图缺一根画空槽即可
  //（值按 0 处理本来就不画多高），面积图的填充遇到缺口要处理基线闭合，是另一套几何。
  // 先收口在 line 系列，bar/area/sparkline 保持历史行为（空 → 0）。
  const gapOn = opts?.markgap === true;
  return rawSeries.map((raw) => ({
    name: raw.name || `Series ${raw.index + 1}`,
    kind: resolveKind(raw.type, chartType),
    data: toPoints(raw.data, gapOn && resolveKind(raw.type, chartType) === "line"),
    color: raw.color,
    yAxis: raw.yAxis === "right" ? "right" : "left",
    format: raw.format,
    visible: raw.visible,
    index: raw.index,
    ...(raw.sizeTitle ? { sizeTitle: raw.sizeTitle } : {}),
  }));
}
