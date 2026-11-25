// 整图级几何：funnel / heatmap / gauge / treemap / sankey / boxplot。
//
// [WHY 独立于 build.ts] build.ts 的笛卡尔分支（bar/line/area/scatter）共用一套坐标映射，
// 而这里的六种各有自己的布局（梯形、网格、半圆弧、矩形切分、两列流带、五数箱），
// 塞进同一文件只会让「改折线要不要动柱图」这类判断更难。两者只共享 Mark 契约。
//
// [WHY 只产出 rect/path/circle/text 四种 Mark] 渲染器（svg.ts / canvas.ts）只认这四种。
// 新增一种 Mark 要同时改两个渲染器 + 命中层 + 动画，而这六种图都能用现有四种表达。
// 代价是 rect 不带圆角与透明度（见 markSvg），需要半透明的地方一律用 path 的 fillOpacity。
import type {
  AxisModel,
  ChartType,
  GeometryModel,
  Mark,
  ResolvedTheme,
  SeriesModel,
  TooltipTarget,
} from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import { estimateTextWidth } from "../layout/layout.js";
import { quantize, SEQUENTIAL_DARK, SEQUENTIAL_LIGHT } from "../palette.js";
import { makeFormatter } from "../format/format.js";

/**
 * 本文件需要的上下文。
 *
 * [WHY 不是直接引用 build.ts 的 `BuildContext`] 那会让 build.ts 与本文件互相 import
 * （build.ts 调这里的分派，这里要 build.ts 的类型）。结构化类型下只声明用得到的字段
 * 就够，且调用方传一个更宽的对象是合法的。
 */
export interface ExtraContext {
  locale: string;
  /** 数据点级色板（funnel / treemap / sankey 每项一色）。 */
  sliceColors?: string[];
  /** 仪表盘量程；缺省 0–100。 */
  gaugeMin?: number;
  gaugeMax?: number;
  /**
   * 格内数值标注（柱图上的 labels 同名字段）。
   */
  labels?: boolean;
  /**
   * 热力色阶的固定上下限（`heatmap-clamp="100,500"`）。
   *
   * [WHY 比「可拖拽」更优先] 同一个指标做成多张热力图时（各时段一张、各区域一张），
   * 每张各自按自己的 min/max 取色会导致**深浅不可比**：A 图的浅蓝与 B 图的深蓝可能
   * 是同一个值。固定上下限才让多张图能并排看。拖拽只是它的交互外壳，先补数据面。
   *
   * 缺省（不传）时按本图数据的 min/max 自动分档，存量热力图一字不变。
   */
  clampMin?: number;
  clampMax?: number;
}

/** 本文件负责的整图类型。 */
export const EXTRA_TYPES: readonly ChartType[] = [
  "funnel",
  "heatmap",
  "gauge",
  "treemap",
  "sankey",
  "boxplot",
];

function emptyModel(noData = true): GeometryModel {
  return { marks: [], gridLines: [], axes: [], legend: [], tooltipTargets: [], noData };
}

function colorOf(ctx: ExtraContext, i: number, fallback: string): string {
  const pal = ctx.sliceColors;
  if (!pal || pal.length === 0) return fallback;
  return pal[i % pal.length];
}

/** 圆弧路径。角度按屏幕坐标（y 向下）：π = 左、3π/2 = 上、2π = 右。 */
function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

/**
 * 给定填充色，返回其上可读的文字色（深墨或白）。
 *
 * [WHY 不看主题，只看底色] 第一版按 `theme.dark` 选白字/深字，结果是：深色主题下
 * `theme.text` 本身就是 #f8fafc（近白），"深字"依然白压浅蓝，读数直接消失；
 * 浅色主题下最浅一档若配白字同样糊掉。**文字与它的底色的关系是局部的**，与全局主题无关。
 *
 * 阈值取 0.55（sRGB 加权亮度）：实测蓝-500 `#3b82f6` 为 0.48（配白字）、
 * blue-300 `#93c5fd` 为 0.74（配深字），两者都清楚。
 */
function readableOn(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return "#0f172a";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
}

// ── funnel ──────────────────────────────────────────────────────

/**
 * 漏斗：一个系列、每点一个阶段，宽度按值比例。
 *
 * 几何约定：第 i 层的**上宽**是它自己的比例，**下宽**是下一层的比例（最后一层收成矩形）。
 * 这正是 ECharts funnel 的默认形态 —— 层与层之间是斜边，一眼能看出「在哪一步掉的」。
 *
 * [WHY 文字全在图外] 图内写字要处理「填充色与文字色的对比度」，而色板是宿主可换的
 * （`--z-chart-1..5`），深色主题下还可能整体反相。把阶段名放左侧、数值放右侧，
 * 无论色板怎么换都读得清；代价是长阶段名要占宽度，所以留了 28% 的边。
 */
function buildFunnelGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const data = (s?.data ?? []).filter((p) => Number.isFinite(p.value) && p.value >= 0);
  if (data.length === 0) return emptyModel();

  const { plot } = frame;
  const labelW = Math.min(plot.width * 0.28, 120);
  const bodyW = Math.max(plot.width - labelW * 2, 20);
  const left = plot.x + labelW;
  const right = left + bodyW;
  const centerX = left + bodyW / 2;

  const maxV = Math.max(...data.map((p) => p.value), 1);
  const n = data.length;
  const gap = 2;
  const layerH = Math.max((plot.height - gap * (n - 1)) / n, 1);
  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  data.forEach((p, i) => {
    const y = plot.y + (layerH + gap) * i;
    // 动画用水位线上涨：每层从自己的顶边往下长，斜边跟着变短。
    // [WHY 不用整体 opacity] 淡入看不出「一层层收窄」这件事，而收窄正是漏斗要表达的。
    const h = layerH * Math.max(progress, 0.001);
    const wTop = (p.value / maxV) * bodyW;
    const nextV = i + 1 < n ? data[i + 1].value : p.value;
    const wBottom = (nextV / maxV) * bodyW;
    // 该层实际画到下宽的比例位置（动画期间高度不足一层时按比例插值）
    const t = layerH > 0 ? h / layerH : 1;
    const wBottomNow = wTop + (wBottom - wTop) * t;

    const d =
      `M ${centerX - wTop / 2} ${y} L ${centerX + wTop / 2} ${y}` +
      ` L ${centerX + wBottomNow / 2} ${y + h} L ${centerX - wBottomNow / 2} ${y + h} Z`;
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: i, d,
      color: colorOf(ctx, i, s.color), fillOpacity: 0.92, visible: true,
    });

    // 左：阶段名（右对齐贴住漏斗左边） 右：数值 + 占比
    const cy = y + layerH / 2 + fontSize * 0.36;
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: i,
      cx: left - 8, cy,
      color: theme.text, label: p.label ?? String(i + 1),
      textAnchor: "end", fontSize, opacity: progress, visible: true,
    });
    const pct = maxV > 0 ? (p.value / maxV) * 100 : 0;
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: i,
      cx: right + 8, cy,
      color: theme.text, label: `${fmt(p.value)}  ${pct.toFixed(0)}%`,
      textAnchor: "start", fontSize, opacity: progress, visible: true,
    });

    // 命中区按该层最宽处取，斜边两侧的空白也能悬停 —— 空白处点不中会让人以为图是死的
    const hitW = Math.max(wTop, wBottomNow);
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: i,
      label: p.label ?? String(i + 1),
      values: [
        { name: s.name || "值", value: p.value, formatted: fmt(p.value), color: colorOf(ctx, i, s.color) },
        { name: "占比", value: pct, formatted: `${pct.toFixed(1)}%`, color: colorOf(ctx, i, s.color) },
      ],
      x: centerX - hitW / 2, y, w: hitW, h: Math.max(h, 1),
    });
  });

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

// ── heatmap ─────────────────────────────────────────────────────

/**
 * 热力：行 = 系列，列 = 数据点的 label，值定颜色深浅。
 *
 * [WHY 用「系列名当行、label 当列」而不是新增二维数据结构] 数据源已经把结果压成
 * 「一列维 + 一列指标」的形状（`series.data = [{label, value}]`），热力需要两个维度，
 * 于是第二个维度只能来自系列名。这在报表侧对应「行维度 + 列维度 + 指标」，够用且不用
 * 改 `DataPoint`。真要三个维度以上，那是数据模型的事，不是绘图的。
 */
function buildHeatmapGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const rows = series.filter((x) => x.visible);
  const cols: string[] = [];
  for (const s of rows) {
    for (const p of s.data) {
      const label = p.label ?? "";
      if (label && !cols.includes(label)) cols.push(label);
    }
  }
  if (rows.length === 0 || cols.length === 0) return emptyModel();

  const fontSize = parseFloat(theme.labelFontSize) || 12;
  const fmt = makeFormatter(rows[0]?.format ?? "auto", ctx.locale);

  // 左侧行标签、底部列标签。行名可能是长门店名，所以左边界按实测宽度算 ——
  // 与横向柱图的左边距是同一个坑（见 layout.ts 的 computeHorizontalFrame）。
  const rowLabelW = Math.max(...rows.map((r) => estimateTextWidth(r.name, fontSize))) + 10;
  const bottomH = fontSize + 8;
  // 色阶图例占的竖向空间：色条 8 + 间距 4 + 两端数值一行。
  //
  // [WHY 必须显式让位而不是叠在格子区上] 热力图没有色阶就是「一张彩色表格」：
  // 深色代表大还是小、差一档是多少，全靠 tooltip 一个个点。让出的 26px 换回整张图的
  // 可读性，是这一整块唯一不能省的地方。
  const scaleH = 8 + 4 + fontSize;
  const px = frame.plot.x + rowLabelW;
  const py = frame.plot.y;
  const pw = Math.max(frame.plot.width - rowLabelW - 4, 10);
  const ph = Math.max(frame.plot.height - bottomH - scaleH, 10);

  const nRows = rows.length;
  const nCols = cols.length;
  const cw = pw / nCols;
  const ch = ph / nRows;

  const all: number[] = [];
  for (const s of rows) for (const p of s.data) if (Number.isFinite(p.value)) all.push(p.value);
  const buckets = 7;
  // 固定上下限（`heatmap-clamp`）优先于本图极值 —— 多张图共用一套色阶才能并排比较
  const q = quantize(all, buckets, { min: ctx.clampMin, max: ctx.clampMax });
  const scale = theme.dark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT;

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  rows.forEach((s, ri) => {
    cols.forEach((col, ci) => {
      const p = s.data.find((d) => (d.label ?? "") === col);
      if (!p || !Number.isFinite(p.value)) return;
      const idx = q.bucketIndex(p.value);
      const color = scale[Math.min(idx, scale.length - 1)];
      const x = px + cw * ci;
      const y = py + ch * ri;
      // 1px 缝隙：相邻同色格子会糊成一整块，读者分不出「两个格子」还是「一个大格子」
      const w = Math.max(cw - 1, 1);
      const h = Math.max(ch - 1, 1);
      marks.push({
        kind: "rect", seriesIndex: s.index, dataIndex: s.data.indexOf(p),
        x, y, width: w, height: h, color, visible: true,
      });
      // 格内数值：前景色由**这一格的底色**决定（见 readableOn 的注释）。
      // 按主题或按档位序号判断都会在某个主题/某个色板方向下失效，
      // 而且失效形态是「字还在、读不出来」，代码与类型检查全绿（[[silent-degradation]]）。
      if (cw >= 38 && ch >= 18 && ctx.labels !== false) {
        marks.push({
          kind: "text", seriesIndex: s.index, dataIndex: s.data.indexOf(p),
          cx: x + w / 2, cy: y + h / 2 + fontSize * 0.36,
          color: readableOn(color),
          label: fmt(p.value), textAnchor: "middle", fontSize: 10,
          opacity: progress, visible: true,
        });
      }
      tooltipTargets.push({
        seriesIndex: s.index, dataIndex: s.data.indexOf(p),
        label: `${s.name} · ${col}`,
        values: [{ name: s.name || "值", value: p.value, formatted: fmt(p.value), color }],
        x, y, w, h,
      });
    });
  });

  // ── 色阶图例（visualMap 的静态形态）──
  //
  // [WHY 7 段纯色块而不是 SVG linearGradient] 渐变要 `defs` + `id` 让 `fill="url(#x)"` 去引，
  // 而本仓在跨 shadow 的 IDREF 上踩过坑（[[shadow-boundary-idref]]）。何况量化本来就是
  // 离散 7 档 —— 段状图例能把「第几档」表达得比连续渐变更准，也省掉一种新 Mark。
  //
  // 装饰性标记统一用 seriesIndex = -1：命中层只认 tooltipTargets，图例不进命中；
  // 统计「数据色块」的调用方（含测试）也能靠它一眼排除。
  const scaleY = py + ph + bottomH - 2;
  const segW = pw / buckets;
  for (let i = 0; i < buckets; i++) {
    marks.push({
      kind: "rect", seriesIndex: -1, dataIndex: -1,
      x: px + segW * i, y: scaleY,
      width: Math.max(segW - 1, 1), height: 8,
      color: scale[Math.min(i, scale.length - 1)], visible: true,
    });
  }
  const scaleLabelY = scaleY + 8 + fontSize - 1;
  marks.push({
    kind: "text", seriesIndex: -1, dataIndex: -1,
    cx: px, cy: scaleLabelY,
    color: theme.textSecondary, label: fmt(q.min),
    textAnchor: "start", fontSize: fontSize - 2, opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: -1, dataIndex: -1,
    cx: px + pw, cy: scaleLabelY,
    color: theme.textSecondary, label: fmt(q.max),
    textAnchor: "end", fontSize: fontSize - 2, opacity: progress, visible: true,
  });

  // 列标签抽稀：按一个标签需要的宽度算步长，跳着写。
  //
  // [WHY 必须自己抽] 笛卡尔图的轴抽稀发生在 `computeFrame` 里（`layout.ts` 按可用宽度
  // 定 tick 间隔），而热力的列刻度是在**这里**直接生成的 —— 不经过那条路径。
  // 实测 8 个时段列挤在半宽卡片里，每列 28px 而「08-10」要 30px+，渲染出来是
  // 「08-1008-102…」连成一条，看不出到底是几列。
  const colLabelW = Math.max(...cols.map((c) => estimateTextWidth(c, fontSize)), 1) + 8;
  const colStep = Math.max(1, Math.ceil(colLabelW / Math.max(cw, 1)));
  const colTicks = cols
    .map((c, i) => ({ value: i, label: c, x: px + cw * i + cw / 2, y: py + ph }))
    .filter((_, i) => i % colStep === 0);
  // 行标签同理抽稀。
  //
  // [WHY 不能「行高装不下就一行都不画」] 那是早先的写法（`filter(() => ch >= fontSize)`），
  // 在 3 行时看不出问题；一旦行数上到 40（两个维度的矩阵形态，行高 7px），条件不成立，
  // **一个字都不写** —— 而左边距仍按最长店名留了 90px 空白。真机表现是「热力图左半边
  // 一条白」，既不知道是哪些店，又像是标签被裁了。空白的左边距比密标签更费解。
  const rowLineH = fontSize + 2;
  const rowStep = Math.max(1, Math.ceil(rowLineH / Math.max(ch, 1)));
  const rowTicks = rows
    .map((r, i) => ({ value: i, label: r.name, x: px, y: py + ch * i + ch / 2 }))
    .filter((_, i) => i % rowStep === 0);

  const axes: AxisModel[] = [
    {
      position: "bottom", kind: "category", title: "",
      ticks: colTicks,
      color: theme.textSecondary, fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
    {
      position: "left", kind: "category", title: "",
      ticks: rowTicks,
      color: theme.textSecondary, fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
  ];

  return { marks, gridLines: [], axes, legend: [], tooltipTargets, noData: false };
}

// ── gauge ───────────────────────────────────────────────────────

/**
 * 仪表盘：一个值 + 一个量程。
 *
 * [WHY 值取第一个可见系列的第一个点] 仪表盘的语义是「单一读数」，多值就该用条形图比较。
 * 取第一个点而不是求和：求和会得到「多个门店加起来 320%」这种读不出来的数。
 */
function buildGaugeGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const p = s?.data?.find((d) => Number.isFinite(d.value));
  if (!p) return emptyModel();

  const min = Number.isFinite(ctx.gaugeMin) ? ctx.gaugeMin! : 0;
  const maxIn = Number.isFinite(ctx.gaugeMax) ? ctx.gaugeMax! : undefined;
  const max = maxIn !== undefined && maxIn > min ? maxIn : Math.max(p.value * 1.25, min + 1);
  const ratio = Math.max(0, Math.min(1, (p.value - min) / (max - min || 1)));

  const { plot } = frame;
  // 半圆占满宽度时，圆心要落到「高度足够放下弧 + 数字」的位置
  const r = Math.max(Math.min(plot.width / 2 - 16, plot.height * 0.58), 12);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height * 0.66;
  const thickness = Math.max(r * 0.16, 6);
  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const marks: Mark[] = [];
  const A0 = Math.PI;
  const A1 = Math.PI * 2;

  // 底环（满量程）
  marks.push({
    kind: "path", seriesIndex: s.index, dataIndex: 0,
    d: arcPath(cx, cy, r, A0, A1),
    color: theme.grid, strokeWidth: thickness, opacity: 1, visible: true,
  });
  // 值环
  if (ratio > 0) {
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: 0,
      d: arcPath(cx, cy, r, A0, A0 + (A1 - A0) * ratio * Math.max(progress, 0.001)),
      color: s.color, strokeWidth: thickness, opacity: 1, visible: true,
    });
  }
  // 指针：从圆心指向当前读数，比在弧上点一个圆更好读（缺口位置一眼可见）
  const ang = A0 + (A1 - A0) * ratio;
  const tipR = r - thickness - 4;
  marks.push({
    kind: "path", seriesIndex: s.index, dataIndex: 0,
    d: `M ${cx} ${cy} L ${cx + tipR * Math.cos(ang)} ${cy + tipR * Math.sin(ang)}`,
    color: theme.text, strokeWidth: 2, opacity: progress, visible: true,
  });
  marks.push({
    kind: "circle", seriesIndex: s.index, dataIndex: 0,
    cx, cy, r: Math.max(thickness * 0.5, 3), color: theme.text, opacity: progress, visible: true,
  });

  // 读数与量程端点
  //
  // [WHY 下移到 2.6 行] 指针从圆心出发，1.9 行时字头正好压在圆心圆点上（截图实测
  // 「0.76」的 0 与指针根部重叠）。读数要在圆心**下方**留出指针厚度与圆点的位置。
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx, cy: cy + fontSize * 2.6,
    color: theme.text, label: fmt(p.value),
    textAnchor: "middle", fontSize: Math.max(fontSize * 1.6, 16), fontWeight: 600,
    opacity: progress, visible: true,
  });
  // 量程端点：贴弧带**外侧**（cy + 半个弧厚 + 一行），贴着弧带中心线会被色带盖住半个字
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx: cx - r, cy: cy + thickness * 0.5 + fontSize * 0.9,
    color: theme.textSecondary, label: fmt(min),
    textAnchor: "middle", fontSize, opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx: cx + r, cy: cy + thickness * 0.5 + fontSize * 0.9,
    color: theme.textSecondary, label: fmt(max),
    textAnchor: "middle", fontSize, opacity: progress, visible: true,
  });

  return {
    marks, gridLines: [], axes: [], legend: [],
    tooltipTargets: [{
      seriesIndex: s.index, dataIndex: 0,
      label: p.label ?? s.name ?? "",
      values: [{ name: s.name || "值", value: p.value, formatted: fmt(p.value), color: s.color }],
      x: cx - r, y: cy - r, w: r * 2, h: r + thickness,
    }],
    noData: false,
  };
}

// ── treemap ─────────────────────────────────────────────────────

/**
 * 按可用宽度截断文本，放不下就补省略号；连一个字符都放不下时返回空串。
 *
 * [WHY 需要它 2026-11-17] 矩形树的块宽差得很远（二分切分下最窄的块可能只有 40px），
 * 而块内标签原先按固定偏移画、完全不看块宽 —— 实测「8,200 (16%)」被切成了
 * 「8,200 (16%」，**看不出这是被截断的还是数据就长这样**。轴标签有抽稀、柱顶标注有
 * 密度阈值，唯独块内文字没有任何预算，属于漏掉的那一类。
 */
function fitLabel(text: string, maxWidth: number, fontSize: number): string {
  if (!text) return "";
  if (maxWidth <= 0) return "";
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
  let out = "";
  for (const ch of text) {
    if (estimateTextWidth(`${out}${ch}…`, fontSize) > maxWidth) break;
    out += ch;
  }
  return out ? `${out}…` : "";
}

interface TreeCell {
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

/**
 * 二分切分（binary split treemap）。
 *
 * [WHY 不用 squarify] squarify 的贪心「最差长宽比」实现要在循环里反复评估候选行，
 * 是最容易写错又最难测的一段（错了只表现为「有些块很扁」，不报错）。二分切分每次沿
 * 长边、按累计面积过半切开，代码 20 行、结果单调可验证，块略扁但可读性足够 ——
 * 而 treemap 在报表里主要回答「谁占比大」，不是精确的面积感知。
 */
function splitTreemap(
  items: Array<{ index: number; value: number }>,
  rect: { x: number; y: number; w: number; h: number },
  out: TreeCell[],
): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ ...rect, index: items[0].index });
    return;
  }
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let acc = 0;
  let k = 0;
  for (; k < items.length - 1; k++) {
    if (acc + items[k].value >= total / 2) break;
    acc += items[k].value;
  }
  const cut = Math.min(Math.max(k + 1, 1), items.length - 1);
  const a = items.slice(0, cut);
  const b = items.slice(cut);
  const aSum = a.reduce((s, i) => s + i.value, 0) || 1;
  const frac = Math.max(Math.min(aSum / total, 0.95), 0.05);
  if (rect.w >= rect.h) {
    splitTreemap(a, { ...rect, w: rect.w * frac }, out);
    splitTreemap(b, { x: rect.x + rect.w * frac, y: rect.y, w: rect.w * (1 - frac), h: rect.h }, out);
  } else {
    splitTreemap(a, { ...rect, h: rect.h * frac }, out);
    splitTreemap(b, { x: rect.x, y: rect.y + rect.h * frac, w: rect.w, h: rect.h * (1 - frac) }, out);
  }
}

function buildTreemapGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const points = (s?.data ?? [])
    .map((p, index) => ({ index, value: p.value, label: p.label }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0);
  if (points.length === 0) return emptyModel();

  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;
  const cells: TreeCell[] = [];
  // 面积大的排前面：treemap 的默认读法是「左上最大」。按原顺序切会出现
  // 「右上角一小块比左下角一大块值更大」的迷惑布局。
  splitTreemap(
    [...points].sort((a, b) => b.value - a.value),
    { x: frame.plot.x, y: frame.plot.y, w: frame.plot.width, h: frame.plot.height },
    cells,
  );

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const total = points.reduce((acc, p) => acc + p.value, 0) || 1;

  for (const cell of cells) {
    const p = points.find((x) => x.index === cell.index)!;
    // 3px 内缩当缝隙；inset 后小于 2px 的块不画（画出来是一条杂线）
    const x = cell.x + 1.5;
    const y = cell.y + 1.5;
    const w = Math.max(cell.w - 3, 0);
    const h = Math.max(cell.h - 3, 0);
    if (w < 2 || h < 2) continue;
    const color = colorOf(ctx, p.index, s.color);
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: p.index,
      x, y, width: w, height: h, color, visible: true,
    });
    // 白字：色板是 500 级深色，白字在任何一档上都读得清。块太小则不写（会溢出到邻块）
    if (w >= 34 && h >= 20) {
      const nameSize = Math.min(fontSize, 12);
      // 名字与数值都按块宽做预算（见 fitLabel 的注释）：块窄时宁可写「西湖…」
      // 也不要写出去被 SVG 裁一半。
      const nameLabel = fitLabel(String(p.label ?? ""), w - 10, nameSize);
      if (nameLabel) {
        marks.push({
          kind: "text", seriesIndex: s.index, dataIndex: p.index,
          cx: x + 5, cy: y + fontSize + 3,
          color: "#ffffff", label: nameLabel,
          textAnchor: "start", fontSize: nameSize,
          opacity: progress, visible: true,
        });
      }
      if (h >= 34) {
        const pct = `${fmt(p.value)} (${((p.value / total) * 100).toFixed(0)}%)`;
        // 两档退化：完整「值 (占比)」→ 只留值 → 不写。
        // 不写比写一半好：被裁的「8,200 (16%」读起来像一个坏掉的数字。
        const valueLabel =
          estimateTextWidth(pct, 10) <= w - 10
            ? pct
            : estimateTextWidth(fmt(p.value), 10) <= w - 10
              ? fmt(p.value)
              : "";
        if (valueLabel) {
          marks.push({
            kind: "text", seriesIndex: s.index, dataIndex: p.index,
            cx: x + 5, cy: y + fontSize * 2 + 5,
            color: "#ffffff", label: valueLabel,
            textAnchor: "start", fontSize: 10, opacity: progress, visible: true,
          });
        }
      }
    }
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: p.index,
      label: String(p.label ?? p.index + 1),
      values: [
        { name: s.name || "值", value: p.value, formatted: fmt(p.value), color },
        { name: "占比", value: (p.value / total) * 100, formatted: `${((p.value / total) * 100).toFixed(1)}%`, color },
      ],
      x, y, w, h,
    });
  }

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

// ── sankey ──────────────────────────────────────────────────────

/** 流带标签的分隔符，按优先级尝试。中文场景常用 `→`，数据表里常写 `->` 或 `>`。 */
const SANKEY_SEPS = ["→", "->", ">", "|"];

/**
 * 桑基：两列（来源 → 去向），流量定带宽。
 *
 * [WHY 只支持两列] 多层桑基要算「每一层的节点坐标 + 跨层避让」，几何复杂度是本实现
 * 的三倍以上，而报表里 90% 的问题是「从哪来到哪去」这一跳。数据形状上也是两列最自然：
 * 一个点 = 一条边（`label="A→B"`、`value=流量`）。要三层就拆成两张图或换工具。
 */
function buildSankeyGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const links: Array<{ from: string; to: string; value: number; index: number }> = [];
  (s?.data ?? []).forEach((p, i) => {
    if (!Number.isFinite(p.value) || p.value <= 0) return;
    const raw = String(p.label ?? "");
    const sep = SANKEY_SEPS.find((x) => raw.includes(x));
    if (!sep) return;
    const parts = raw.split(sep);
    const from = (parts[0] ?? "").trim();
    const to = (parts[1] ?? "").trim();
    if (!from || !to) return;
    links.push({ from, to, value: p.value, index: i });
  });
  if (links.length === 0) return emptyModel();

  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const leftNames: string[] = [];
  const rightNames: string[] = [];
  for (const l of links) {
    if (!leftNames.includes(l.from)) leftNames.push(l.from);
    if (!rightNames.includes(l.to)) rightNames.push(l.to);
  }
  const leftSum = links.reduce((acc, l) => acc + l.value, 0) || 1;
  const rightSum = leftSum;

  // 左右各留 78px 放节点名（门店/渠道名通常 4-6 字）
  const labelW = Math.min(78, frame.plot.width * 0.22);
  const px = frame.plot.x + labelW;
  const pw = Math.max(frame.plot.width - labelW * 2, 20);
  const nodeW = 10;
  const gap = 4;
  const leftTotalH = frame.plot.height - gap * Math.max(leftNames.length - 1, 0);
  const rightTotalH = frame.plot.height - gap * Math.max(rightNames.length - 1, 0);

  // 节点高度按「该节点承担的总流量」占全量的比例
  const sumOf = (name: string, side: "from" | "to") =>
    links.filter((l) => (side === "from" ? l.from : l.to) === name).reduce((acc, l) => acc + l.value, 0);

  const leftH = new Map<string, number>();
  const rightH = new Map<string, number>();
  for (const n of leftNames) leftH.set(n, Math.max((sumOf(n, "from") / leftSum) * leftTotalH, 1));
  for (const n of rightNames) rightH.set(n, Math.max((sumOf(n, "to") / rightSum) * rightTotalH, 1));

  // 节点纵向位置（自上而下堆叠）
  const leftY = new Map<string, number>();
  let cursor = frame.plot.y;
  for (const n of leftNames) {
    leftY.set(n, cursor);
    cursor += leftH.get(n)! + gap;
  }
  const rightY = new Map<string, number>();
  cursor = frame.plot.y;
  for (const n of rightNames) {
    rightY.set(n, cursor);
    cursor += rightH.get(n)! + gap;
  }

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  // 节点矩形
  for (const n of leftNames) {
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: -1,
      x: px, y: leftY.get(n)!, width: nodeW, height: leftH.get(n)!,
      color: colorOf(ctx, leftNames.indexOf(n), s.color), visible: true,
    });
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: -1,
      cx: px - 6, cy: leftY.get(n)! + leftH.get(n)! / 2 + fontSize * 0.36,
      color: theme.text, label: n, textAnchor: "end", fontSize,
      opacity: progress, visible: true,
    });
  }
  for (const n of rightNames) {
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: -1,
      x: px + pw - nodeW, y: rightY.get(n)!, width: nodeW, height: rightH.get(n)!,
      color: colorOf(ctx, rightNames.indexOf(n), s.color), visible: true,
    });
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: -1,
      cx: px + pw + 6, cy: rightY.get(n)! + rightH.get(n)! / 2 + fontSize * 0.36,
      color: theme.text, label: n, textAnchor: "start", fontSize,
      opacity: progress, visible: true,
    });
  }

  // 流带：每个节点维护一个游标，按数据顺序从节点顶部往下分配带宽
  const leftCur = new Map<string, number>();
  const rightCur = new Map<string, number>();
  for (const n of leftNames) leftCur.set(n, leftY.get(n)!);
  for (const n of rightNames) rightCur.set(n, rightY.get(n)!);

  for (const l of links) {
    const lh = (l.value / leftSum) * leftTotalH;
    const rh = (l.value / rightSum) * rightTotalH;
    const y0 = leftCur.get(l.from)!;
    const y1 = rightCur.get(l.to)!;
    leftCur.set(l.from, y0 + lh);
    rightCur.set(l.to, y1 + rh);

    const x0 = px + nodeW;
    const x1 = px + pw - nodeW;
    const xm = (x0 + x1) / 2;
    const d =
      `M ${x0} ${y0} C ${xm} ${y0}, ${xm} ${y1}, ${x1} ${y1}` +
      ` L ${x1} ${y1 + rh} C ${xm} ${y1 + rh}, ${xm} ${y0 + lh}, ${x0} ${y0 + lh} Z`;
    const color = colorOf(ctx, links.indexOf(l), s.color);
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: l.index, d,
      color, fillOpacity: 0.32 * Math.max(progress, 0.001), visible: true,
    });
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: l.index,
      label: `${l.from} → ${l.to}`,
      values: [
        { name: "流量", value: l.value, formatted: fmt(l.value), color },
        { name: "占来源", value: l.value, formatted: `${((l.value / (sumOf(l.from, "from") || 1)) * 100).toFixed(1)}%`, color },
      ],
      x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.max(Math.abs(y1 - y0) + lh, 1),
    });
  }

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

// ── boxplot ─────────────────────────────────────────────────────

/**
 * 箱线图：5 个系列 = 五数（min / Q1 / 中位 / Q3 / max），按分类对齐。
 *
 * [WHY 用「5 个系列」而不是扩 DataPoint] `DataPoint` 只有一个 `value`，扩成数组会波及
 * 归一化、堆叠、缺数判定、tooltip、所有既有几何 —— 为一种图改全局数据契约不划算。
 * 5 个系列的约定在报表侧正好对应「选 5 个指标」，且顺序即语义（第 1 个是最小值）。
 *
 * 少于 5 个系列时**不画**：用 3 个系列猜「这大概是 min/med/max」会画出一个
 * 语义不明的箱子，比空白更难查（用户以为自己选错了指标却看不出选错在哪）。
 */
function buildBoxplotGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
): GeometryModel {
  const visible = series.filter((x) => x.visible);
  if (!domains || visible.length < 5) return emptyModel();

  const [minS, q1S, medS, q3S, maxS] = visible.slice(0, 5);
  const n = minS.data.length;
  if (n === 0) return emptyModel();

  const { plot } = frame;
  const slot = (plot.width / Math.max(n, 1)) * 0.5;
  const fmt = makeFormatter(medS.format ?? "auto", ctx.locale);

  const yFor = (v: number) => {
    const span = domains.leftDomain[1] - domains.leftDomain[0] || 1;
    return plot.y + plot.height - ((v - domains.leftDomain[0]) / span) * plot.height;
  };

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  for (let i = 0; i < n; i++) {
    const vMin = minS.data[i]?.value;
    const vQ1 = q1S.data[i]?.value;
    const vMed = medS.data[i]?.value;
    const vQ3 = q3S.data[i]?.value;
    const vMax = maxS.data[i]?.value;
    if (![vMin, vQ1, vMed, vQ3, vMax].every((v) => Number.isFinite(v))) continue;

    const step = plot.width / Math.max(n, 1);
    const cx = plot.x + step * i + step / 2;
    const x0 = cx - slot / 2;
    const yMin = yFor(vMin);
    const yQ1 = yFor(vQ1);
    const yMed = yFor(vMed);
    const yQ3 = yFor(vQ3);
    const yMax = yFor(vMax);
    // 动画：所有纵向尺寸按 progress 从 0 展开（以中位线为轴），避免各段独立跳动
    const grow = (y: number) => yMed + (y - yMed) * Math.max(progress, 0.001);

    const boxTop = Math.min(grow(yQ1), grow(yQ3));
    const boxH = Math.abs(grow(yQ3) - grow(yQ1));
    const color = colorOf(ctx, 0, medS.color);

    // 箱体：半透明填充 + 实线轮廓（fillOpacity 只对 path 生效，见文件头）
    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d: `M ${x0} ${boxTop} L ${x0 + slot} ${boxTop} L ${x0 + slot} ${boxTop + boxH} L ${x0} ${boxTop + boxH} Z`,
      color, fillOpacity: 0.22, strokeWidth: 1.5, visible: true,
    });
    // 中位线
    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d: `M ${x0} ${grow(yMed)} L ${x0 + slot} ${grow(yMed)}`,
      color, strokeWidth: 2, visible: true,
    });
    // 须（上须到下须一条 path，省一次渲染；端点各一条短横线）
    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d:
        `M ${cx} ${grow(yMax)} L ${cx} ${grow(yQ3)}` +
        ` M ${cx} ${grow(yQ1)} L ${cx} ${grow(yMin)}` +
        ` M ${cx - slot / 4} ${grow(yMax)} L ${cx + slot / 4} ${grow(yMax)}` +
        ` M ${cx - slot / 4} ${grow(yMin)} L ${cx + slot / 4} ${grow(yMin)}`,
      color, strokeWidth: 1.2, visible: true,
    });

    tooltipTargets.push({
      seriesIndex: medS.index, dataIndex: i,
      label: minS.data[i]?.label ?? String(i + 1),
      values: [
        { name: "最大", value: vMax, formatted: fmt(vMax), color },
        { name: "Q3", value: vQ3, formatted: fmt(vQ3), color },
        { name: "中位", value: vMed, formatted: fmt(vMed), color },
        { name: "Q1", value: vQ1, formatted: fmt(vQ1), color },
        { name: "最小", value: vMin, formatted: fmt(vMin), color },
      ],
      x: x0, y: Math.min(grow(yMax), grow(yMin)), w: slot,
      h: Math.max(Math.abs(grow(yMin) - grow(yMax)), 1),
    });
  }

  if (marks.length === 0) return emptyModel();

  const axes: AxisModel[] = [
    {
      position: "bottom", kind: "category", title: "",
      ticks: frame.xTicks, color: theme.textSecondary,
      fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
    {
      position: "left", kind: "value", title: "",
      ticks: frame.yTicks.left, color: theme.textSecondary,
      fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
  ];

  return {
    marks,
    gridLines: frame.yTicks.left
      .filter((t) => t.y > plot.y + 0.5 && t.y < plot.y + plot.height - 0.5)
      .map((t) => ({ x1: plot.x, y1: t.y, x2: plot.x + plot.width, y2: t.y, color: theme.grid })),
    axes,
    legend: [],
    tooltipTargets,
    noData: false,
  };
}

/** 整图类型分派。返回 null 表示「不归本文件管」，调用方继续走自己的分支。 */
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
      return buildFunnelGeometry(series, frame, theme, progress, ctx);
    case "heatmap":
      return buildHeatmapGeometry(series, frame, theme, progress, ctx);
    case "gauge":
      return buildGaugeGeometry(series, frame, theme, progress, ctx);
    case "treemap":
      return buildTreemapGeometry(series, frame, theme, progress, ctx);
    case "sankey":
      return buildSankeyGeometry(series, frame, theme, progress, ctx);
    case "boxplot":
      return buildBoxplotGeometry(series, frame, domains, theme, progress, ctx);
    default:
      return null;
  }
}

/** 该类型是否由本文件渲染（供 Chart 侧判断要不要算笛卡尔值域）。 */
export function isExtraType(type: ChartType): boolean {
  return EXTRA_TYPES.includes(type);
}

/** boxplot 需要笛卡尔值域，其余整图类型不吃 domains。 */
export function needsDomains(type: ChartType): boolean {
  return type === "boxplot";
}
