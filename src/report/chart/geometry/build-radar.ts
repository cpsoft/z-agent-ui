// 雷达图：多系列极坐标。
import type { GeometryModel, Mark, ResolvedTheme, SeriesModel, TooltipTarget } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { makeFormatter } from "../format/format.js";
import { seriesLegend } from "./build-axes.js";

// 不是「绝对值差多少」—— 这一点必须写进宿主的口径卡，组件管不了文案。
//
// ★ 由此带来的使用前提（组件不会拦，只能写在宿主文档里）：
//   · **同一根轴上的多个系列必须同量纲**（同一指标的不同主体：本店 vs 区域均值、
//     今年 vs 去年、实际 vs 目标）。把「销售额」与「订单数」当两个系列放进来，
//     分母取的是两者绝对值的较大者，小的那条直接被压到圆心附近 —— 图没坏，但没信息。
//   · 单系列没有「比谁更靠外」可言，见下面 axisMax 处的退化处理。
export function buildRadarGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  const { plot } = frame;
  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const visible = series.filter((s) => s.visible && s.data.length > 0);
  const base = visible[0] ?? series[0];
  const labels = (base?.data ?? []).map((p, i) => p.label ?? `维度 ${i + 1}`);
  const n = labels.length;
  // 少于 3 条轴的多边形退化成线段，画出来是误导 —— 按无数据处理。
  if (!base || n < 3) {
    return { marks, gridLines: [], axes: [], legend: seriesLegend(series), tooltipTargets, noData: true };
  }
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height / 2;
  const radius = Math.max(8, Math.min(plot.width, plot.height) / 2 - 14);
  const angleOf = (i: number) => -Math.PI / 2 + (Math.PI * 2 * i) / n;
  // 每条轴的分母：全系列在该轴上的最大正值（全 0 时给 1，避免除 0 画成满格）
  const perAxisMax = labels.map((_, i) => {
    let m = 0;
    for (const s of visible) {
      const v = s.data[i]?.value ?? 0;
      if (Number.isFinite(v) && v > m) m = v;
    }
    return m;
  });
  // [WHY 单系列不能用「本轴最大值」当分母] 只有一个系列时 perAxisMax[i] 恒等于它自己，
  // 每个顶点都落在圆周上 —— 画出来是个**正多边形**：有蛛网、有标签、有图例，却不编码
  // 任何一个数，看上去像图，实际零信息。这不是「少见用法」，是最容易踩的一种（
  // 面板里拖一个指标出来就是）。
  // 单系列退到「全图最大值」共用分母：读法变成轴与轴之间的高低（同量纲才说得通）。
  // 异量纲画像（营业额 ¥ 与复购率 %）只能靠双系列以上做逐轴对比 —— 那正是逐轴归一的
  // 本意，见上面 buildRadarGeometry 的头注释。
  const sharedMax = Math.max(1, ...perAxisMax);
  const axisMax = visible.length >= 2
    ? perAxisMax.map((m) => (m > 0 ? m : 1))
    : labels.map(() => sharedMax);

  const ringPath = (frac: number): string => {
    const parts: string[] = [];
    for (let i = 0; i < n; i++) {
      const a = angleOf(i);
      parts.push(`${cx + Math.cos(a) * radius * frac} ${cy + Math.sin(a) * radius * frac}`);
    }
    return "M " + parts.join(" L ") + " Z";
  };
  // 蛛网：4 圈 + 辐条，装饰线不进 tooltip 命中区
  for (const frac of [0.25, 0.5, 0.75, 1]) {
    marks.push({
      kind: "path", seriesIndex: -1, dataIndex: -1, d: ringPath(frac),
      color: theme.grid, strokeWidth: 1, opacity: progress, visible: true,
    });
  }
  for (let i = 0; i < n; i++) {
    const a = angleOf(i);
    marks.push({
      kind: "path", seriesIndex: -1, dataIndex: i,
      d: `M ${cx} ${cy} L ${cx + Math.cos(a) * radius} ${cy + Math.sin(a) * radius}`,
      color: theme.grid, strokeWidth: 1, opacity: progress, visible: true,
    });
    // 轴标签放辐条外端外侧：左右两侧用 start/end 对齐，正上/正下居中
    const lx = cx + Math.cos(a) * (radius + 10);
    const ly = cy + Math.sin(a) * (radius + 10);
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    marks.push({
      kind: "text", seriesIndex: -1, dataIndex: i,
      cx: lx, cy: ly + (sinA > 0.3 ? 10 : sinA < -0.3 ? -2 : 4),
      color: theme.textSecondary, label: labels[i],
      textAnchor: cosA > 0.3 ? "start" : cosA < -0.3 ? "end" : "middle",
      fontSize: 11, opacity: progress, visible: true,
    });
  }

  for (const s of visible) {
    const pts = s.data.slice(0, n).map((p, i) => {
      const v = Number.isFinite(p.value) ? Math.max(0, p.value) : 0;
      const r = (v / axisMax[i]) * radius * progress;
      const a = angleOf(i);
      return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number];
    });
    if (pts.length < 3) continue;
    const d = "M " + pts.map((p) => `${p[0]} ${p[1]}`).join(" L ") + " Z";
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: 0, d,
      color: s.color, fillOpacity: 0.15, strokeWidth: 2, opacity: progress, visible: true,
    });
    s.data.slice(0, n).forEach((p, i) => {
      const [px, py] = pts[i];
      marks.push({
        kind: "circle", seriesIndex: s.index, dataIndex: i,
        cx: px, cy: py, r: 3, color: s.color, opacity: progress, visible: true,
      });
      const fmt = makeFormatter(s.format, ctx.locale);
      tooltipTargets.push({
        seriesIndex: s.index, dataIndex: i,
        label: labels[i],
        values: [{ name: s.name, value: p.value, formatted: fmt(p.value), color: s.color }],
        x: px - 5, y: py - 5, w: 10, h: 10,
      });
    });
  }

  return {
    marks,
    gridLines: [],
    axes: [],
    legend: seriesLegend(series),
    tooltipTargets,
    noData: false,
  };
}

// ── waterfall（IKTJVS）────────────────────────────────────────
//
// 瀑布图：每行是**一个增量**（正负皆可），柱子浮在「到上一行为止的累计值」上。
