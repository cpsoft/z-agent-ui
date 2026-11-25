// 几何构建的唯一入口：按图形族分派。
//
// [WHY 文件边界按图形族切，不按行数均分] 各族共用 Mark / GeometryModel 契约，但坐标映射
// 与布局完全不同；塞在一个文件里时，「改折线要不要动饼图」这类判断只能靠通读。
// 拆开后每族自带完整上下文，改动面一眼可见。
//
// [WHY 入口路径一个字都不改] Chart.ts 与 7 份几何测试都从 `geometry/build.js` 引
// `buildGeometry` / `BuildContext`。拆分只改文件边界，不改导入路径与签名。
import type { ChartType, GeometryModel, ResolvedTheme, SeriesModel } from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { buildExtraGeometry } from "./extra.js";
import { buildCartesianGeometry } from "./build-cartesian.js";
import { buildPieGeometry } from "./build-pie.js";
import { buildSparklineGeometry } from "./build-sparkline.js";
import { buildRadarGeometry } from "./build-radar.js";
import { buildWaterfallGeometry } from "./build-waterfall.js";
import { buildMapGeometry } from "./build-map.js";

export type { BuildContext } from "./shared.js";
export { clamp01, staggered } from "./shared.js";

export function buildGeometry(
  type: ChartType,
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  // 整图族（funnel / heatmap / gauge / treemap / sankey / boxplot）各有自己的布局，
  // 先交给它们；返回 null 说明不归它管，继续走下面的笛卡尔/饼/雷达分派。
  const extra = buildExtraGeometry(type, series, frame, domains, theme, progress, ctx);
  if (extra) return extra;
  switch (type) {
    case "pie":
    case "donut":
      return buildPieGeometry(series, frame, theme, progress, type === "donut", ctx);
    case "sparkline":
      return buildSparklineGeometry(series, frame, progress, ctx);
    case "radar":
      return buildRadarGeometry(series, frame, theme, progress, ctx);
    case "waterfall":
      return buildWaterfallGeometry(series, frame, domains, theme, progress, ctx);
    case "map":
      return buildMapGeometry(ctx, frame, theme, progress);
    default:
      return buildCartesianGeometry(series, frame, domains, theme, progress, ctx);
  }
}
