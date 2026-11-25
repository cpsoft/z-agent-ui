import type { AxisConfig, AxisKind, SeriesModel, StackMode, Tick } from "../types.js";
import { makeDateFormatter, makeFormatter } from "../format/format.js";
import { niceTicks, timeTicks } from "../scale/ticks.js";
import { stackExtent } from "../data/stack.js";

export interface Domains {
  xKind: AxisKind;
  xLabels: string[];
  xDomain: [number, number];
  leftDomain: [number, number];
  rightDomain: [number, number];
  hasLeft: boolean;
  hasRight: boolean;
  /**
   * 横向布局（`direction=horizontal`）：分类在左轴、值在底轴。
   *
   * [WHY 不把语义也掉个个儿（xDomain 存值、leftDomain 存分类下标）] 值域是**数据语义**，
   * 分类是**呈现语义**。一旦把值域塞进 xDomain，`yValuesOfSide` / 百分比堆积 / markline
   * 并入值域这些逻辑全都要认两套字段名，而它们关心的是「指标值在哪」。所以只加一个方向位，
   * 让**几何层**做坐标交换，值域仍住 `leftDomain`。
   */
  horizontal?: boolean;
  /**
   * 左值轴是对数轴（`z-chart-axis scale=log`）。
   *
   * [WHY 只给左轴] 右轴在本仓的用途是「笔数」这种小数量级，与左轴「金额」量级差
   * 1-2 个数量级 —— 那正是双轴要解决的问题，不需要再叠一层对数。
   * 左右各自对数（`logLeft` / `logRight`）会让几何层每个映射点都要多看一位标志，
   * 而业务上没人这么用。真要加，这里已经是一个字段的事。
   *
   * 对数域**必须全正**：`log(0)` 是 -∞，负值无定义。所以 `computeDomains` 会把下限
   * clamp 到「最小正值的一半」，几何层再对非正值静默跳过（见 build.ts 的 logPos）。
   */
  logLeft?: boolean;
}

export interface AxisSlots {
  x?: AxisConfig;
  left?: AxisConfig;
  right?: AxisConfig;
}

/** `computeDomains` 的可选项。 */
export interface DomainOptions {
  /** 横向：分类轴从左移到下、值轴从下移到左（见 `Domains.horizontal`）。 */
  horizontal?: boolean;
  /**
   * 强制 x 轴种类。
   *
   * [WHY 需要] 自动判定是「有点带 label 就按分类轴」—— 这对折线/柱是对的（每个分类一个点），
   * 但散点图的 label 只是 tooltip 文案，真正的坐标是 `p.x` 的数值。不强制的话散点会被
   * 判成分类轴，所有点等距排在一条线上，看着像「数据只有一个维度」。
   */
  xKind?: AxisKind;
}

function padDomain(min: number, max: number, explicitMin?: number, explicitMax?: number): [number, number] {
  if (explicitMin !== undefined || explicitMax !== undefined) {
    return [explicitMin ?? min, explicitMax ?? max];
  }
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

function yDomain(values: number[], explicitMin?: number, explicitMax?: number): [number, number] {
  if (values.length === 0) return [0, 1];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (explicitMin !== undefined || explicitMax !== undefined) {
    return [explicitMin ?? min, explicitMax ?? max];
  }
  if (min >= 0) return [0, max === 0 ? 1 : max * 1.05];
  if (max <= 0) return [min * 1.05, 0];
  const pad = (max - min) * 0.05;
  return [min - pad, max + pad];
}

function collectXValues(series: SeriesModel[], ySide: "left" | "right"): number[] {
  const values: number[] = [];
  for (const s of series) {
    if (s.yAxis !== ySide || s.kind === "pie") continue;
    for (const p of s.data) {
      if (p.x !== undefined) values.push(p.x);
    }
  }
  return values;
}

function collectYValues(series: SeriesModel[], ySide: "left" | "right"): number[] {
  const values: number[] = [];
  for (const s of series) {
    if (s.yAxis !== ySide || s.kind === "pie") continue;
    for (const p of s.data) values.push(p.value);
  }
  return values;
}

/** 某一侧参与 y 值域计算的数值。
 *
 *  [为什么堆积要换成「合计段」而不是继续用原始值] 堆起来之后，占高的是**同一分类上
 *  各系列之和**，不是任何一个单值。继续按原始最大值定域，最高的那根柱子会顶出画布
 *  （而且不报错——只是被裁掉一截，看起来像数据变小了）。
 *
 *  [为什么只有一个 bar 系列时不走堆积分支] 单系列的「堆积」与「并排」在几何上完全等价，
 *  而 percent 模式下单系列会变成每根柱子都 100%（一堆等高条），那是错图。
 *  与其画错，不如按未堆积处理。 */
function yValuesOfSide(series: SeriesModel[], ySide: "left" | "right", stack: StackMode): number[] {
  const bars = series.filter((s) => s.kind === "bar" && s.yAxis === ySide);
  const others = collectYValues(
    series.filter((s) => s.kind !== "bar"),
    ySide,
  );
  const values = [...others];
  if (stack !== "none" && bars.length >= 2) {
    const [min, max] = stackExtent(bars, stack);
    values.push(min, max);
  } else {
    for (const s of bars) for (const p of s.data) values.push(p.value);
  }
  return values;
}

export function computeDomains(
  series: SeriesModel[],
  axes: AxisSlots,
  stack: StackMode = "none",
  /** 参考线值（markline）：参与左轴值域，否则目标线高出数据时整条线被裁在画布外。 */
  refLine?: number,
  opts?: DomainOptions,
): Domains {
  const hasLeft = series.some((s) => s.kind !== "pie" && s.yAxis === "left");
  const hasRight = series.some((s) => s.kind !== "pie" && s.yAxis === "right");

  let xKind: AxisKind = axes.x?.type === "category" || axes.x?.type === "value" || axes.x?.type === "time"
    ? axes.x.type
    : "value";
  // 强制种类优先于自动判定：散点必须 value（见 DomainOptions.xKind 的注释）。
  if (!opts?.xKind && xKind === "value") {
    const hasLabels = series.some((s) => s.data.some((p) => p.label !== undefined));
    if (hasLabels) xKind = "category";
  } else if (opts?.xKind) {
    xKind = opts.xKind;
  }

  let xLabels: string[] = [];
  let xDomain: [number, number] = [0, 0];
  if (xKind === "category") {
    for (const s of series) {
      if (s.kind === "pie") continue;
      for (const p of s.data) {
        if (p.label !== undefined && !xLabels.includes(p.label)) xLabels.push(p.label);
      }
    }
    xDomain = [0, Math.max(0, xLabels.length - 1)];
  } else {
    const xs = collectXValues(series, "left").concat(collectXValues(series, "right"));
    if (xs.length === 0) {
      xDomain = [0, 1];
    } else {
      const min = Math.min(...xs);
      const max = Math.max(...xs);
      xDomain = padDomain(min, max, axes.x?.min, axes.x?.max);
    }
  }

  // 百分比堆积的值域固定 0–100：交给 yDomain 的「explicit」分支，而不是让它按
  // min>=0 加 5% 内边距（那会让整摞柱子只填满 95% 高度，顶端永远空一条）。
  const pctLeft = stack === "percent" && series.filter((s) => s.kind === "bar" && s.yAxis === "left").length >= 2;
  const pctRight = stack === "percent" && series.filter((s) => s.kind === "bar" && s.yAxis === "right").length >= 2;
  // [WHY 参考线并进 left 值域而不是改 axes.left.max] 显式 max 会让值域上限**钉死**在线值上
  //（yDomain 的 explicit 分支直接采用），高出目标线的数据点会被裁出画布 —— 恰好把
  //「超目标」这个读者最该看到的事实藏掉。并进值数组则照常加 5% 内边距。
  const leftValues = yValuesOfSide(series, "left", stack);
  if (refLine !== undefined && Number.isFinite(refLine)) leftValues.push(refLine);
  const leftDomain = yDomain(
    leftValues,
    axes.left?.min ?? (pctLeft ? 0 : undefined),
    axes.left?.max ?? (pctLeft ? 100 : undefined),
  );
  const rightDomain = yDomain(
    yValuesOfSide(series, "right", stack),
    axes.right?.min ?? (pctRight ? 0 : undefined),
    axes.right?.max ?? (pctRight ? 100 : undefined),
  );

  // ── 对数轴：把左值域压到全正区间（2026-11-17）──
  //
  // [WHY 下限取「最小正值的一半」而不是 0 或 1] 0 会让 log 变成 -∞；固定取 1 则
  // 数据全在 0.01~0.1 这种量级时所有点挤在域顶端（等于没画）。取最小正值的一半，
  // 保证最矮的那个点仍有一档高度，也不会把跨 3 个数量级的数据压扁。
  const logLeft = axes.left?.scale === "log";
  if (logLeft) {
    const positives = leftValues.filter((v) => Number.isFinite(v) && v > 0);
    const lo = positives.length ? Math.min(...positives) : 1;
    const explicitMin = axes.left?.min;
    const min = explicitMin !== undefined && explicitMin > 0 ? explicitMin : lo / 2;
    // 上限保持 yDomain 的结果（含 5% 内边距），但不允许 <= min
    const max = Math.max(leftDomain[1], min * 10);
    if (leftDomain[0] !== min || leftDomain[1] !== max) {
      leftDomain[0] = min;
      leftDomain[1] = max;
    }
  }

  return {
    xKind,
    xLabels,
    xDomain,
    leftDomain,
    rightDomain,
    hasLeft,
    hasRight,
    ...(logLeft ? { logLeft: true } : {}),
    // [WHY 非分类轴时回落竖向] 横向的语义是「分类占一行」。x 是数值时（没有 label 的
    // 纯数值点）横过来等于把数值轴当分类用，画出来是 n 根等长横条 —— 比不生效更糟。
    // 回落竖向而不是报错：作者改 direction 时不该因为数据恰好没 label 就看到空白图。
    horizontal: opts?.horizontal === true && xKind === "category",
  };
}

/**
 * 瀑布图（IKTJVS）的值域：x 轴 = 行标签（分类），左轴 = **累计量的极值**。
 *
 * [WHY 不走 computeDomains] 通用值域按「系列原始值」收集，而瀑布图的柱子悬在
 * 累计位置上 —— 增量都很小、累计冲得很高时，按增量定域会让柱子顶出画布。
 * 这里把每根柱的 from/to 都收进值域，再留 8% 内边距。
 */
export function computeWaterfallDomains(series: SeriesModel[]): Domains {
  const s = series.find((x) => x.visible) ?? series[0];
  const data = s?.data ?? [];
  const xLabels: string[] = [];
  for (const p of data) {
    if (p.label !== undefined) xLabels.push(p.label);
  }
  let acc = 0;
  let min = 0;
  let max = 0;
  for (const p of data) {
    if (!Number.isFinite(p.value)) continue;
    const from = acc;
    acc += p.value;
    min = Math.min(min, from, acc);
    max = Math.max(max, from, acc);
  }
  const pad = (max - min) * 0.08 || 1;
  return {
    xKind: "category",
    xLabels,
    xDomain: [0, Math.max(0, xLabels.length - 1)],
    leftDomain: [min - pad, max + pad],
    rightDomain: [0, 1],
    hasLeft: data.length > 0,
    hasRight: false,
  };
}

export function estimateTextWidth(text: string, fontSize: number): number {
  let w = 0;
  for (const ch of text) {
    w += ch.codePointAt(0)! > 0x2e80 ? fontSize : fontSize * 0.6;
  }
  return w;
}

/** 类别轴标签抽稀：标签比槽宽长时，按整数步长跳着画（只画第 0、step、2*step… 个）。
 *
 *  [为什么必须有这一步] 类别轴原本**无条件**给每个分类都生成一个刻度。分类一多就必然
 *  压字：17 个 `2026-10-16` 挤在 450px 里，每个标签要 5×7.2≈66px 宽、槽宽只有 26px，
 *  相邻标签叠在一起，读出来是「2026-10-162026-10-17…」一团。这是**渲染层的确定性缺陷**，
 *  不是数据问题 —— 任何用户只要维度基数大就会遇到，所以修在布局层而不是让调用方
 *  自己去截短标签（截短还会撞上「跨年同日合并成一个分类」的更严重问题）。
 *
 *  [为什么按「最宽标签」而不是逐对比较] 逐对比较（画一个、看下一个放不放得下）会得到
 *  不均匀的间距，视觉上像缺数据；按固定步长跳是各类图表库的通行做法，且**位置仍然对齐
 *  真实分类**（positionXTicks 用 tick.value，不是数组下标）。
 *
 *  [为什么留 8px] 估算宽度没有算字形间距与抗锯齿，实际渲染比 estimateTextWidth 略宽；
 *  8px 是让相邻标签之间至少留一口气，避免「刚好相等」时仍然贴字。 */
export function thinCategoryTicks<T extends { label: string }>(
  raw: T[],
  slotWidth: number,
  labelFontSize: number,
): T[] {
  if (raw.length <= 1) return raw;
  const widest = Math.max(...raw.map((t) => estimateTextWidth(t.label, labelFontSize)));
  // step 倍数的槽宽必须 ≥ 标签宽 + 留白；slotWidth<=0（画布被挤到没宽度）时按「全跳」保守处理
  const step = Math.max(1, Math.ceil((widest + 8) / Math.max(slotWidth, 1)));
  if (step === 1) return raw;
  const out: T[] = [];
  for (let i = 0; i < raw.length; i += step) out.push(raw[i]);
  return out;
}

export interface ComputedFrame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
  xTicks: Tick[];
  yTicks: { left: Tick[]; right: Tick[] };
  titles: { x?: string; left?: string; right?: string };
}

// 无轴图表（pie/sparkline/map）使用统一内边距的 frame
export function insetFrame(width: number, height: number, inset: number): ComputedFrame {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);
  return {
    width: w,
    height: h,
    plot: { x: inset, y: inset, width: Math.max(w - inset * 2, 1), height: Math.max(h - inset * 2, 1) },
    margins: { top: inset, right: inset, bottom: inset, left: inset },
    xTicks: [],
    yTicks: { left: [], right: [] },
    titles: {},
  };
}

/**
 * 对数刻度：10 的整数次幂。
 *
 * [WHY 不用 niceTicks 再变换] `niceTicks` 产出的是「等距的好看数字」（0/2000/4000…），
 * 在对数轴上它们会挤在顶端、底部几乎空着 —— 刻度本身就错了。对数轴的刻度天然是
 * 数量级：1/10/100/1000。
 *
 * 跨度过大（> 8 个数量级）时每 2 个取 1，否则十几根刻度挤在一起。
 */
function logTicks(min: number, max: number): number[] {
  const lo = Math.max(min, 1e-9);
  const hi = Math.max(max, lo * 10);
  const e0 = Math.floor(Math.log10(lo));
  const e1 = Math.ceil(Math.log10(hi));
  const out: number[] = [];
  for (let e = e0; e <= e1; e++) {
    const v = Math.pow(10, e);
    if (v >= lo * 0.999 && v <= hi * 1.001) out.push(v);
  }
  if (!out.length) return [lo, hi];
  const skip = Math.max(1, Math.ceil(out.length / 6));
  return skip > 1 ? out.filter((_, i) => i % skip === 0) : out;
}

function tickValues(domain: [number, number], count: number, kind: AxisKind, locale: string, format: string, log = false) {
  const ticks = log
    ? logTicks(domain[0], domain[1])
    : kind === "time"
      ? timeTicks(domain[0], domain[1], count)
      : niceTicks(domain[0], domain[1], count);
  const fmt = kind === "time" ? makeDateFormatter(format, locale) : makeFormatter(format, locale);
  return ticks.map((v) => ({ value: v, label: fmt(v) }));
}

/** `computeFrame` 的可选项。 */
export interface FrameOptions {
  /**
   * 额外右边距（像素）。
   *
   * [WHY 需要] 横向柱的数值标注画在**柱右端外侧**，而最长的那根柱正好顶到 plot 右边界 ——
   * 不留宽度的话 8,200 会被 SVG 裁成「8,20」。竖向没有这个问题（标注在柱顶，落在上方
   * margin 里），所以这是横向独有的账。
   */
  rightPad?: number;
  /**
   * 额外上边距（像素）：横向参考线的标签画在绘图区**上方**。
   *
   * [WHY 不能像竖向那样画在线旁] 竖向参考线在绘图区右端，标签右对齐落在最右柱之外；
   * 横向的参考线是一条竖线，标签无论贴上还是贴下都必然压在某根柱子上（值大的柱总在
   * 竖线两侧）。移到绘图区外是唯一不重叠的位置。
   */
  topPad?: number;
}

/**
 * 横向笛卡尔布局：分类在左轴、值在底轴。
 *
 * [WHY 轴配置按**语义**而不是按**位置**取值] 作者写 `position=left` 时想配的是「值轴」
 * （竖向的默认方位）。横向之后值轴跑到下面去了，若还按位置取配置，作者原来写的
 * `format=money` / `min=0` 会突然作用到分类轴上 —— 症状是「改方向后格式全乱、值域也不听了」。
 * 所以这里：值轴取 `axes.left`（画在底部），分类轴取 `axes.x`（画在左侧）。
 *
 * [WHY 右边距固定 6] 横向没有第二个值轴的位置语义（底=值、右=值 会得到两条平行刻度）。
 * 右轴在横向下不渲染，留 6px 收边。
 */
function computeHorizontalFrame(
  width: number,
  height: number,
  domains: Domains,
  axes: AxisSlots,
  locale: string,
  labelFontSize: number,
  opts?: FrameOptions,
): ComputedFrame {
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);

  const valueTicksRaw = tickValues(
    domains.leftDomain,
    axes.left?.tickCount || 6,
    "value",
    locale,
    axes.left?.format ?? "auto",
    domains.logLeft === true,
  );
  const xTitleH = axes.left?.title ? labelFontSize + 8 : 0;
  const leftTitleW = axes.x?.title ? labelFontSize + 6 : 0;

  // 左边距按**分类标签**宽度算 —— 这是横向最容易漏的一处：漏了就是「图能画出来、
  // 门店名被裁掉一半」，而且不报错。竖向下这里算的是值刻度宽度（几个数字）。
  const leftW = domains.xLabels.length > 0
    ? Math.max(...domains.xLabels.map((l) => estimateTextWidth(l, labelFontSize))) + 12 + leftTitleW
    : 6;
  const bottomH = labelFontSize + 8 + xTitleH;
  // topPad 给横向参考线的标签腾位置（它画在绘图区上方，见 FrameOptions.topPad）
  const top = 6 + (opts?.topPad ?? 0);
  // rightPad 给柱右端的数值标注腾位置（见 FrameOptions.rightPad）
  const rightW = 6 + (opts?.rightPad ?? 0);

  const margins = { top, right: rightW, bottom: bottomH, left: leftW };
  const plot = {
    x: margins.left,
    y: margins.top,
    width: Math.max(w - margins.left - margins.right, 1),
    height: Math.max(h - margins.top - margins.bottom, 1),
  };

  // 分类抽稀按**高度**：分类多到一行放不下时跳着画。竖向下按宽度抽稀（标签横着排），
  // 横向正好反过来 —— 每一行占 labelFontSize+6 的高度。
  const lineH = labelFontSize + 6;
  const slotH = plot.height / Math.max(1, domains.xLabels.length);
  const step = slotH >= lineH ? 1 : Math.max(1, Math.ceil(lineH / Math.max(slotH, 1)));
  const kept: number[] = [];
  for (let i = 0; i < domains.xLabels.length; i += step) kept.push(i);

  const xTicks: Tick[] = valueTicksRaw.map((t) => ({
    value: t.value,
    label: t.label,
    x: plot.x + valueToT(t.value, domains.leftDomain, domains.logLeft === true) * plot.width,
    y: plot.y + plot.height,
  }));
  const yTicksLeft: Tick[] = kept.map((i) => ({
    value: i,
    label: domains.xLabels[i],
    x: plot.x,
    y: plot.y + slotH * i + slotH / 2,
  }));

  return {
    width: w,
    height: h,
    plot,
    margins,
    xTicks,
    yTicks: { left: yTicksLeft, right: [] },
    titles: { x: axes.left?.title, left: axes.x?.title },
  };
}

export function computeFrame(
  width: number,
  height: number,
  domains: Domains,
  axes: AxisSlots,
  locale: string,
  labelFontSize: number,
  opts?: FrameOptions,
): ComputedFrame {
  if (domains.horizontal) {
    return computeHorizontalFrame(width, height, domains, axes, locale, labelFontSize, opts);
  }
  const w = Math.max(width, 1);
  const h = Math.max(height, 1);

  const xTicksRaw = domains.xKind === "category"
    ? domains.xLabels.map((label, i) => ({ value: i, label }))
    : tickValues(domains.xDomain, axes.x?.tickCount || 6, domains.xKind, locale, axes.x?.format ?? "auto");
  const leftRaw = tickValues(domains.leftDomain, axes.left?.tickCount || 6, "value", locale, axes.left?.format ?? "auto", domains.logLeft === true);
  const rightRaw = tickValues(domains.rightDomain, axes.right?.tickCount || 6, "value", locale, axes.right?.format ?? "auto");

  const xTitleH = axes.x?.title ? labelFontSize + 8 : 0;
  const leftTitleW = axes.left?.title ? labelFontSize + 6 : 0;
  const rightTitleW = axes.right?.title ? labelFontSize + 6 : 0;

  const leftW = domains.hasLeft
    ? Math.max(...leftRaw.map((t) => estimateTextWidth(t.label, labelFontSize))) + 12 + leftTitleW
    : 6;
  const rightW = domains.hasRight
    ? Math.max(...rightRaw.map((t) => estimateTextWidth(t.label, labelFontSize))) + 12 + rightTitleW
    : 6;
  const bottomH = domains.xKind === "category" || xTicksRaw.length > 0
    ? labelFontSize + 8 + xTitleH
    : xTitleH;
  const top = 6;

  const margins = { top, right: rightW, bottom: bottomH, left: leftW };
  const plot = {
    x: margins.left,
    y: margins.top,
    width: w - margins.left - margins.right,
    height: h - margins.top - margins.bottom,
  };

  // 类别轴抽稀：槽宽 = 画布可用宽 / 分类数。标签比槽宽长时按整数步长跳着画。
  // [为什么不在 positionXTicks 里算] 那里只有 plot，拿不到字号；而字号只在这里有。
  const xTicksShaped = domains.xKind === "category"
    ? thinCategoryTicks(xTicksRaw, plot.width / Math.max(1, domains.xLabels.length), labelFontSize)
    : xTicksRaw;
  const xTicks = positionXTicks(xTicksShaped, domains, plot);
  const yTicks = {
    left: positionYTicks(leftRaw, domains.leftDomain, plot, "left", domains.logLeft === true),
    right: positionYTicks(rightRaw, domains.rightDomain, plot, "right"),
  };

  return {
    width: w,
    height: h,
    plot,
    margins,
    xTicks,
    yTicks,
    titles: { x: axes.x?.title, left: axes.left?.title, right: axes.right?.title },
  };
}

function positionXTicks(raw: Array<{ value: number; label: string }>, domains: Domains, plot: { x: number; y: number; width: number; height: number }): Tick[] {
  const bottom = plot.y + plot.height;
  if (domains.xKind === "category") {
    const n = Math.max(1, domains.xLabels.length);
    const step = plot.width / n;
    // 用 tick.value（= 分类的原始下标）定位，**不能用 raw 的数组下标**：
    // 抽稀之后 raw 少了一截，按下标排会把第 4 个分类画到第 2 个的位置上。
    return raw.map((t) => ({
      value: t.value,
      label: t.label,
      x: plot.x + step * t.value + step / 2,
      y: bottom,
    }));
  }
  const [d0, d1] = domains.xDomain;
  const span = d1 - d0 || 1;
  return raw.map((t) => ({
    value: t.value,
    label: t.label,
    x: plot.x + ((t.value - d0) / span) * plot.width,
    y: bottom,
  }));
}

/**
 * 值 → 归一化位置（0..1，0 = 域下限）。
 *
 * [WHY 抽成唯一实现] 这个公式要在**四处**同时成立：左值轴刻度、右值轴刻度、横向图的
 * 底部值刻度、几何层的柱/线/点映射。各写一遍必然漏一处 —— 2026-11-17 加对数轴时
 * 就漏了刻度定位，结果是「柱子按对数长、刻度按线性摆」：柱子与刻度完全错位，
 * 1,000 和 10,000 两档刻度挤在底边上，而**每一步都不报错**。
 */
export function valueToT(v: number, domain: [number, number], log: boolean): number {
  if (!log) {
    const span = domain[1] - domain[0] || 1;
    return (v - domain[0]) / span;
  }
  // 非正值在对数轴上没有位置：clamp 到域下限（调用方应先跳过它们，这里只是兜底，
  // 保证不产出 NaN —— NaN 会让整条 path 失效，那是整张图空白）
  const lo = Math.max(domain[0], 1e-9);
  const hi = Math.max(domain[1], lo * 10);
  const llo = Math.log10(lo);
  const lhi = Math.log10(hi);
  const t = (Math.log10(Math.max(v, lo)) - llo) / (lhi - llo || 1);
  return Math.max(0, Math.min(1, t));
}

function positionYTicks(
  raw: Array<{ value: number; label: string }>,
  domain: [number, number],
  plot: { x: number; y: number; width: number; height: number },
  side: "left" | "right",
  log = false,
): Tick[] {
  const x = side === "left" ? plot.x : plot.x + plot.width;
  return raw.map((t) => ({
    value: t.value,
    label: t.label,
    x,
    y: plot.y + plot.height - valueToT(t.value, domain, log) * plot.height,
  }));
}
