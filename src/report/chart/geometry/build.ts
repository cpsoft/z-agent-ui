// 几何构建的唯一入口：基于 Geometry Registry 的开放式分派。
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
import {
  getChartGeometry,
  listChartGeometries,
  registerChartGeometry,
  unregisterChartGeometry,
  type GeometryBuilder,
  type GeometryBuildInput,
} from "./registry.js";

export type { BuildContext } from "./shared.js";
export { clamp01, staggered } from "./shared.js";
export {
  getChartGeometry,
  listChartGeometries,
  registerChartGeometry,
  unregisterChartGeometry,
  type GeometryBuilder,
  type GeometryBuildInput,
};

// 注册内置非笛卡尔图形族
registerChartGeometry("pie", (i) =>
  buildPieGeometry(i.series, i.frame, i.theme, i.progress, false, i.ctx),
);
registerChartGeometry("donut", (i) =>
  buildPieGeometry(i.series, i.frame, i.theme, i.progress, true, i.ctx),
);
registerChartGeometry("sparkline", (i) =>
  buildSparklineGeometry(i.series, i.frame, i.progress, i.ctx),
);
registerChartGeometry("radar", (i) =>
  buildRadarGeometry(i.series, i.frame, i.theme, i.progress, i.ctx),
);
registerChartGeometry("waterfall", (i) =>
  buildWaterfallGeometry(i.series, i.frame, i.domains, i.theme, i.progress, i.ctx),
);
registerChartGeometry("map", (i) => buildMapGeometry(i.ctx, i.frame, i.theme, i.progress));

export function buildGeometry(
  type: ChartType,
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  const registered = getChartGeometry(type);
  if (registered) {
    return registered({ type, series, frame, domains, theme, progress, ctx });
  }
  const extra = buildExtraGeometry(type, series, frame, domains, theme, progress, ctx);
  if (extra) return extra;
  return buildCartesianGeometry(series, frame, domains, theme, progress, ctx);
}
