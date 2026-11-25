// 地图：投影 + 区域着色。
import type { GeometryModel, LegendItem, Mark, ResolvedTheme, TooltipTarget } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { quantize } from "../palette.js";
import { makeFormatter } from "../format/format.js";
import { applyTransform, detectProjection, fitToFrame, ringProjected } from "../map/projection.js";
import { SEQUENTIAL_DARK, SEQUENTIAL_LIGHT } from "../palette.js";

export function buildMapGeometry(
  ctx: BuildContext,
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
): GeometryModel {
  const regions = ctx.regions;
  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const legend: LegendItem[] = [];
  if (regions.length === 0) {
    return { marks, gridLines: [], axes: [], legend, tooltipTargets, noData: true };
  }
  const { plot } = frame;
  const mode = ctx.projection === "auto"
    ? detectProjection(regions[0].rings[0] ?? [])
    : ctx.projection;
  const proj = mode === "mercator" ? "mercator" : mode === "none" ? "none" : "equirectangular";
  const valueMap = new Map<string, number>();
  if (ctx.values) {
    for (const v of ctx.values) valueMap.set(v.id, v.value);
  }
  const allValues = regions
    .map((r) => r.value ?? valueMap.get(r.id))
    .filter((v): v is number => typeof v === "number");
  const q = quantize(allValues.length > 0 ? allValues : [0, 1], 5);
  const ramp = theme.dark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT;
  const neutral = theme.grid;
  const fmt = makeFormatter("auto", ctx.locale);

  const projected = regions.map((r) => ({
    ...r,
    rings: proj === "none"
      ? r.rings
      : r.rings.map((ring) => ringProjected(ring, proj as "equirectangular" | "mercator")),
  }));
  const t = fitToFrame(projected, plot, 0.05);

  projected.forEach((r, i) => {
    const value = r.value ?? valueMap.get(r.id);
    const color = value === undefined ? neutral : ramp[q.bucketIndex(value)];
    const ringPaths = r.rings
      .filter((ring) => ring.length >= 3)
      .map((ring) => {
        const pts = applyTransform(ring, t);
        return "M " + pts.map((p) => `${p[0]} ${p[1]}`).join(" L ") + " Z";
      });
    if (ringPaths.length === 0) return;
    marks.push({
      kind: "path", seriesIndex: 0, dataIndex: i,
      d: ringPaths.join(" "),
      color, fillOpacity: 0.85 * progress + 0.15, strokeWidth: 1, visible: true,
    });
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const ring of r.rings) {
      for (const [x, y] of applyTransform(ring, t)) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    tooltipTargets.push({
      seriesIndex: 0, dataIndex: i,
      label: r.name,
      values: value === undefined
        ? [{ name: r.name, value: Number.NaN, formatted: "—", color }]
        : [{ name: r.name, value, formatted: fmt(value), color }],
      x: minX, y: minY, w: Math.max(maxX - minX, 1), h: Math.max(maxY - minY, 1),
    });
  });

  const step = (q.max - q.min) / Math.max(1, q.bucketCount) || 1;
  for (let b = 0; b < q.bucketCount; b++) {
    const lo = q.min + step * b;
    const hi = q.min + step * (b + 1);
    legend.push({
      index: b,
      name: allValues.length > 0 ? `${fmt(lo)} – ${fmt(hi)}` : "",
      color: ramp[b],
      visible: true,
    });
  }

  return { marks, gridLines: [], axes: [], legend, tooltipTargets, noData: false };
}

// ── radar（IKTJVS）────────────────────────────────────────────
//
// 多轴雷达：每个维度一条辐条，各系列画一个多边形。
//
// [WHY 每条轴各自归一而不是全图一个值域] 雷达图的维度通常是**异量纲**的
//（营业额 ¥、实收率 %、单量 单），放一个值域里客单价会被营业额压成一条线。
// 逐轴取「本图所有系列在该轴上的最大值」做分母，读法是「这条轴上谁更靠外」，
