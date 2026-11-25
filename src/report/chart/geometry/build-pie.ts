// 饼图 / 环图：扇区弧路径与标签。
import type { GeometryModel, LegendItem, Mark, ResolvedTheme, SeriesModel, TooltipTarget } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";
import type { BuildContext } from "./shared.js";
import { makeFormatter } from "../format/format.js";
import { CATEGORICAL } from "../palette.js";

export function buildPieGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  donut: boolean,
  ctx: BuildContext,
): GeometryModel {
  // 多环（2026-11-17）：一个可见系列 = 一环，**series[0] 在最内**，依次向外。
  //
  // [WHY 内环是 series[0]] 数据的自然顺序是「先汇总、后细分」：卡片层把「按一级维度
  // 聚合」放第一个系列、「按二级维度聚合」放第二个。图例顺序、颜色顺序也都跟着它走。
  //
  // [WHY 多环时中心不挖空] 单环 `donut` 的中心空洞是装饰；多环时内环本身已经是汇总层，
  // 再挖空只会让最内环变薄一圈、可读面积变小。想要空心就用单环。
  //
  // [已知取舍] 外环颜色没有继承父级色系（外环第 k 项与内环第 k 项同色，但它们未必
  // 有父子关系）。做父色继承需要 `DataPoint.parent`，那是数据形状的改动，本轮没做。
  const rings = series.filter((x) => x.visible && x.data.length > 0);
  if (!rings.length) return { marks: [], gridLines: [], axes: [], legend: [], tooltipTargets: [], noData: true };

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const legend: LegendItem[] = [];
  const cx = frame.plot.x + frame.plot.width / 2;
  const cy = frame.plot.y + frame.plot.height / 2;
  const R = (Math.min(frame.plot.width, frame.plot.height) / 2) * 0.9;
  const n = rings.length;
  const thickness = R / n;
  /** 环间缝隙：多环时留 3px，否则相邻环同色会糊成一圈 */
  const gap = n > 1 ? 3 : 0;
  // 中心空洞：单环沿用原来的 0.6R；多环时给内环挖一个小洞。
  //
  // [WHY 多环也要挖] 内环从圆心开始画时整张图看起来像「靶心」而不是「环」，
  // 而且内环半径本来就小、再从 0 起画，扇区面积差异被压得更难读。
  // 挖 0.35 层厚之后两环视觉重量接近，也保住了 `donut` 这个类型的形状语言。
  const hole = donut ? (n === 1 ? R * 0.6 : thickness * 0.35) : 0;
  // 颜色游标：跨环累计，避免「外环第 1 段」与「内环第 1 段」同色 ——
  // 那会让读者误以为两者相等（配色表的长度 12 足够两环各用各的）
  let colorCursor = 0;

  rings.forEach((s, k) => {
    const data = s.data;
    const total = data.reduce((acc, p) => acc + Math.max(0, p.value), 0);
    // 单环沿用原来的内外径；多环按「第 k 层」切片
    const inner = k === 0 ? hole : k * thickness + gap / 2;
    const outer = n === 1 ? R : (k + 1) * thickness - (k === n - 1 ? 0 : gap / 2);
    const fmt = makeFormatter(s.format ?? "auto", ctx.locale);

    let angle = -Math.PI / 2;
    data.forEach((p, i) => {
      const frac = total > 0 ? Math.max(0, p.value) / total : 0;
      const a0 = angle;
      const a1 = angle + frac * Math.PI * 2 * progress;
      angle = angle + frac * Math.PI * 2;
      const color =
        ctx.sliceColors?.[(colorCursor + i) % ctx.sliceColors.length] ??
        CATEGORICAL[(colorCursor + i) % CATEGORICAL.length];
      if (a1 - a0 < 1e-6) return;
      const d = arcPath(cx, cy, outer, inner, a0, a1);
      marks.push({
        kind: "path", seriesIndex: s.index, dataIndex: i, d,
        color, fillOpacity: 1, strokeWidth: 1, visible: true,
      });
      const mid = (a0 + a1) / 2;
      const rr = (outer + inner) / 2;
      const tcx = cx + Math.cos(mid) * rr;
      const tcy = cy + Math.sin(mid) * rr;
      // 多环时图例要能区分是哪一环：单环保持原名，多环加环名前缀
      legend.push({
        index: legend.length,
        name: n === 1 ? (p.label ?? `Slice ${i + 1}`) : `${s.name} · ${p.label ?? `Slice ${i + 1}`}`,
        color,
        visible: true,
      });
      tooltipTargets.push({
        seriesIndex: s.index, dataIndex: i,
        label: p.label ?? `Slice ${i + 1}`,
        values: [{ name: s.name, value: p.value, formatted: fmt(p.value), color }],
        x: tcx - 10, y: tcy - 10, w: 20, h: 20,
      });
    });

    // 下一环从这一段之后取色（见 colorCursor 的注释）
    colorCursor += data.length;

    // 中心总计只对单环 donut 有意义：多环时中心属于内环，写总计会与内环标签打架
    if (n === 1 && donut && total > 0 && progress >= 1) {
      marks.push({
        kind: "text", seriesIndex: s.index, dataIndex: -1,
        cx, cy, color: theme.text, label: fmt(total),
        textAnchor: "middle", fontSize: 16, fontWeight: 600, visible: true,
      });
    }
  });

  return { marks, gridLines: [], axes: [], legend, tooltipTargets, noData: false };
}

function arcPath(cx: number, cy: number, outer: number, inner: number, a0: number, a1: number): string {
  const o0 = [cx + Math.cos(a0) * outer, cy + Math.sin(a0) * outer];
  const o1 = [cx + Math.cos(a1) * outer, cy + Math.sin(a1) * outer];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (inner <= 0) {
    return `M ${cx} ${cy} L ${o0[0]} ${o0[1]} A ${outer} ${outer} 0 ${large} 1 ${o1[0]} ${o1[1]} Z`;
  }
  const i0 = [cx + Math.cos(a1) * inner, cy + Math.sin(a1) * inner];
  const i1 = [cx + Math.cos(a0) * inner, cy + Math.sin(a0) * inner];
  return `M ${o0[0]} ${o0[1]} A ${outer} ${outer} 0 ${large} 1 ${o1[0]} ${o1[1]} L ${i0[0]} ${i0[1]} A ${inner} ${inner} 0 ${large} 0 ${i1[0]} ${i1[1]} Z`;
}
