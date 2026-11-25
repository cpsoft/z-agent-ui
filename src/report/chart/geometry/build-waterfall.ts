// 瀑布图：累计量柱 + 增量的悬空表达。
import type { GeometryModel, Mark, ResolvedTheme, SeriesModel, TooltipTarget } from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { makeFormatter } from "../format/format.js";
import { staggered } from "./shared.js";
import { seriesLegend } from "./build-axes.js";

// 典型读法：营业额 → 券面优惠（−）→ 平台优惠（−）→ … → 实收。
//
// [WHY 值域在 layout 侧算（computeWaterfallDomains）] 柱子悬空，左轴要覆盖的是
// **累计量的极值**而不是增量本身的极值 —— 按增量定域的话，中途累计冲高时柱子
// 会顶出画布。几何这里只消费 domains.leftDomain，两边共用一套刻度。
export function buildWaterfallGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: BuildContext,
): GeometryModel {
  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  if (!domains) {
    return { marks, gridLines: [], axes: [], legend: seriesLegend(series), tooltipTargets, noData: true };
  }
  const s = series.find((x) => x.visible) ?? series[0];
  const data = s?.data ?? [];
  const { plot } = frame;
  const n = Math.max(1, data.length);
  const slotW = Math.min(48, (plot.width / n) * 0.6);
  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const yDomain = domains.leftDomain;
  const yFor = (v: number) => {
    const span = yDomain[1] - yDomain[0] || 1;
    return plot.y + plot.height - ((v - yDomain[0]) / span) * plot.height;
  };
  const xFor = (i: number) => plot.x + (plot.width / n) * i + plot.width / n / 2;

  let acc = 0;
  data.forEach((p, i) => {
    const from = acc;
    acc += Number.isFinite(p.value) ? p.value : 0;
    const to = acc;
    const local = staggered(progress, i);
    const bx = xFor(i) - slotW / 2;
    const y0 = yFor(from);
    const y1 = yFor(to);
    const top = Math.min(y0, y1);
    const fullH = Math.abs(y1 - y0);
    // 动画从「起点端」长出来：正增量从下往上，负增量从上往下
    const h = fullH * local;
    const y = to >= from ? y0 - h : y0;
    const positive = p.value >= 0;
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: i,
      x: bx, y, width: slotW, height: Math.max(h, 0),
      // 负增量用同色低透明度：减项在视觉上「虚」，加项/起始「实」，
      // 不引入第二个色相就不会跟主题色板打架。
      color: s.color, fillOpacity: positive ? 0.9 : 0.4, strokeWidth: 1, visible: true,
    });
    // 与上一根柱的衔接虚线：高度在同一水平线上，读得出「从哪落下来」
    if (i > 0) {
      const prevX = xFor(i - 1) + slotW / 2;
      const linkY = yFor(from);
      marks.push({
        kind: "path", seriesIndex: s.index, dataIndex: i,
        d: `M ${prevX} ${linkY} L ${bx} ${linkY}`,
        color: theme.textSecondary, strokeWidth: 1, dash: true, opacity: progress, visible: true,
      });
    }
    // 增量值标注：正数在柱顶上方、负数在柱底下方 —— 与柱子的生长方向一致
    if (progress >= 1 && fullH >= 0) {
      const label = `${positive ? "+" : ""}${fmt(p.value)}`;
      marks.push({
        kind: "text", seriesIndex: s.index, dataIndex: i,
        cx: xFor(i), cy: positive ? top - 5 : top + fullH + 12,
        color: theme.text, label, textAnchor: "middle", fontSize: 10, opacity: 1, visible: true,
      });
    }
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: i,
      label: p.label ?? `步骤 ${i + 1}`,
      values: [
        { name: s.name, value: p.value, formatted: `${positive ? "+" : ""}${fmt(p.value)}`, color: s.color },
        { name: "累计", value: to, formatted: fmt(to), color: theme.textSecondary },
      ],
      x: bx, y: top, w: slotW, h: Math.max(fullH, 1),
    });
  });

  return {
    marks,
    gridLines: [],
    axes: [],
    legend: seriesLegend(series),
    tooltipTargets,
    noData: data.length === 0,
  };
}
