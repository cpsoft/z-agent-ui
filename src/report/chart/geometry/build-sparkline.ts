// 迷你折线：无轴、无网格，只出一条折线。
import type { GeometryModel, Mark, SeriesModel, TooltipTarget } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { makeFormatter } from "../format/format.js";

export function buildSparklineGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const data = s?.data ?? [];
  const { plot } = frame;
  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  if (data.length === 0) {
    return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: true };
  }
  const values = data.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spanV = max - min || 1;
  const stepX = plot.width / Math.max(1, data.length - 1);
  const pts = data.map((p, i) => [
    plot.x + stepX * i,
    plot.y + plot.height - ((p.value - min) / spanV) * plot.height,
  ] as [number, number]);
  const drawN = Math.max(1, Math.ceil(pts.length * progress));
  const visiblePts = pts.slice(0, drawN);
  let d = `M ${visiblePts[0][0]} ${visiblePts[0][1]}`;
  for (let k = 1; k < visiblePts.length; k++) {
    d += ` L ${visiblePts[k][0]} ${visiblePts[k][1]}`;
  }
  const last = visiblePts[visiblePts.length - 1];
  const base = plot.y + plot.height;
  d += ` L ${last[0]} ${base} L ${visiblePts[0][0]} ${base} Z`;
  marks.push({
    kind: "path", seriesIndex: s.index, dataIndex: 0, d,
    color: s.color, fillOpacity: 0.2, strokeWidth: 2, opacity: progress, visible: true,
  });
  const fmt = makeFormatter(s.format, ctx.locale);
  data.forEach((p, i) => {
    const [cx, cy] = pts[i];
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: i,
      label: String(i + 1),
      values: [{ name: s.name, value: p.value, formatted: fmt(p.value), color: s.color }],
      x: cx - 4, y: cy - 4, w: 8, h: 8,
    });
  });
  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}
