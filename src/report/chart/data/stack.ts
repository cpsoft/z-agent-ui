import type { SeriesModel, StackMode } from "../types.js";

/** 一段堆积占用：y 轴数值域上的 [from, to]。from 是基线侧，to 是这一段的顶。 */
export interface StackSpan {
  from: number;
  to: number;
}

export interface StackLayout {
  /** series.index → dataIndex → 该段占据的数值区间 */
  spans: Map<number, Map<number, StackSpan>>;
  /** 全部堆积段覆盖到的数值范围（含 0） */
  min: number;
  max: number;
}

/** 堆积柱的几何与值域计算（本地补丁 2026-10-22）。
 *
 *  [为什么正负分开累积] 同一分类下「收入 +800 / 支出 -300」堆在一起时，若只累加
 *  代数和，第二根柱子会从 +800 起画到 +500 —— 看上去像被截断的柱子，而用户想表达的
 *  是「收入往上长、支出往下长」。所以正负各一个累加器，各自从 0 往两侧长。
 *
 *  [为什么 percent 要先按分类归一] 百分比堆积的语义是「每个分类内各系列占比 100%」，
 *  归一必须以**同一 dataIndex 上的全部系列**为单位，不能按系列各自除以自身总和
 *  （那样每根柱子都是 100%，图变成一堆等高条）。这里一次算出所有系列的份额，
 *  再交给几何层当普通数值画。
 *
 *  [为什么返回 Map 而不是改写 SeriesModel.data] 值域计算（computeDomains）与几何绘制
 *  （buildCartesianGeometry）都要用同一份结果，而 SeriesModel 还会被 tooltip 用来显示
 *  原始值 —— 改写 data 会让 tooltip 在百分比模式下显示 "42%" 而不是原始金额。
 *  原始值必须留给 tooltip，显示值只活在几何层。
 *
 *  @param bars 同侧（同一 y 轴）的 bar 系列；调用方负责过滤与排序
 */
export function stackBars(bars: SeriesModel[], mode: StackMode): StackLayout {
  const spans: StackLayout["spans"] = new Map();
  let min = 0;
  let max = 0;
  if (mode === "none" || bars.length === 0) return { spans, min, max };

  let maxLen = 0;
  for (const s of bars) maxLen = Math.max(maxLen, s.data.length);

  // ① percent：先算每个分类的正/负合计，得到归一化除数
  const posTotal: number[] = new Array(maxLen).fill(0);
  const negTotal: number[] = new Array(maxLen).fill(0);
  if (mode === "percent") {
    for (const s of bars) {
      for (let i = 0; i < maxLen; i++) {
        const v = s.data[i]?.value ?? 0;
        if (!Number.isFinite(v)) continue;
        if (v >= 0) posTotal[i] += v;
        else negTotal[i] += -v;
      }
    }
  }
  const share = (i: number, v: number): number => {
    if (mode !== "percent") return v;
    if (v >= 0) return posTotal[i] > 0 ? (v / posTotal[i]) * 100 : 0;
    return negTotal[i] > 0 ? (v / negTotal[i]) * 100 : 0;
  };

  // ② 逐系列累积。**累积器必须跨系列共享**（同一 dataIndex 上「已经堆到多高」是
  //    所有系列共用的状态）；放到系列循环里会让每个系列都从 0 开始，画出来是
  //    一堆互相重叠的柱子 —— 外观上像「没堆积」，值域也顶不上去。
  const accPos: number[] = new Array(maxLen).fill(0);
  const accNeg: number[] = new Array(maxLen).fill(0);
  for (const s of bars) {
    const per = new Map<number, StackSpan>();
    for (let i = 0; i < s.data.length; i++) {
      const raw = s.data[i]?.value ?? 0;
      const v = Number.isFinite(raw) ? share(i, raw) : 0;
      const from = v >= 0 ? accPos[i] : accNeg[i];
      const to = from + v;
      if (v >= 0) accPos[i] = to;
      else accNeg[i] = to;
      per.set(i, { from, to });
      if (to < min) min = to;
      if (to > max) max = to;
      if (from < min) min = from;
      if (from > max) max = from;
    }
    spans.set(s.index, per);
  }
  return { spans, min, max };
}

/** 同一分类上的最大跨度：used 给 y 轴值域用，保证被堆到最高的那根柱子不出界。 */
export function stackExtent(bars: SeriesModel[], mode: StackMode): [number, number] {
  const { min, max } = stackBars(bars, mode);
  if (mode === "percent") return [-Math.abs(min), Math.max(max, 100)];
  return [min, max];
}
