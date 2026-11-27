// 整图级几何入口：funnel / heatmap / gauge / treemap / sankey / boxplot。
// 具体图形族已按类别拆至 extra-radial-grid.ts 与 extra-flow-dist.ts。
import type { ChartType, GeometryModel, ResolvedTheme, SeriesModel } from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import type { ExtraContext, ExtraLabels } from "./extra-shared.js";
import { buildFunnelGeometry, buildGaugeGeometry, buildHeatmapGeometry } from "./extra-radial-grid.js";
import { buildBoxplotGeometry, buildSankeyGeometry, buildTreemapGeometry } from "./extra-flow-dist.js";

export type { ExtraContext } from "./extra-shared.js";

const EXTRA_LABELS: ExtraLabels = {
  value: "值",
  share: "占比",
  flow: "流量",
  sourceShare: "占来源",
  max: "最大",
  median: "中位",
  min: "最小",
};

export const EXTRA_TYPES: readonly ChartType[] = [
  "funnel",
  "heatmap",
  "gauge",
  "treemap",
  "sankey",
  "boxplot",
];

export function buildExtraGeometry(
  type: ChartType,
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel | null {
  switch (type) {
    case "funnel":
      return buildFunnelGeometry(series, frame, theme, progress, ctx, EXTRA_LABELS);
    case "heatmap":
      return buildHeatmapGeometry(series, frame, theme, progress, ctx, EXTRA_LABELS);
    case "gauge":
      return buildGaugeGeometry(series, frame, theme, progress, ctx, EXTRA_LABELS);
    case "treemap":
      return buildTreemapGeometry(series, frame, theme, progress, ctx, EXTRA_LABELS);
    case "sankey":
      return buildSankeyGeometry(series, frame, theme, progress, ctx, EXTRA_LABELS);
    case "boxplot":
      return buildBoxplotGeometry(series, frame, domains, theme, progress, ctx, EXTRA_LABELS);
    default:
      return null;
  }
}

export function isExtraType(type: ChartType): boolean {
  return EXTRA_TYPES.includes(type);
}

export function needsDomains(type: ChartType): boolean {
  return type === "boxplot";
}
