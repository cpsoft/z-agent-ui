// Test: 对数轴（`z-chart-axis scale=log`）—— 域下限、刻度、像素等距
// Date: 2026-11-17
//
// 对数轴的价值全在「跨数量级的量放在一起能同时看清」：营业额 1 万和 100 万同图时，
// 线性轴上小的那批全挤在贴底的一像素里。所以核心判据只有一条 ——
// **每个数量级占同样的像素高度**。域下限与刻度都是从这条推出来的。
//
// 期望值全部手写字面量。

import { describe, expect, it } from "vitest";
import { computeDomains, computeFrame, type AxisSlots, type Domains } from "../../../src/report/chart/layout/layout.js";
import { buildGeometry } from "../../../src/report/chart/geometry/build.js";
import type { Mark, ResolvedTheme, SeriesModel } from "../../../src/report/chart/types.js";

const theme: ResolvedTheme = {
  text: "#0f172a",
  textSecondary: "#64748b",
  grid: "#e2e8f0",
  background: "#ffffff",
  fontFamily: "system-ui",
  labelFontSize: "12",
  dark: false,
};

const logAxes: AxisSlots = { left: { position: "left", type: "value", title: "", format: "auto", tickCount: 6, scale: "log" } };
const linAxes: AxisSlots = { left: { position: "left", type: "value", title: "", format: "auto", tickCount: 6 } };

function seriesOf(values: number[]): SeriesModel[] {
  return [{
    name: "营业额",
    kind: "bar",
    color: "#2563eb",
    yAxis: "left",
    format: "auto",
    visible: true,
    index: 0,
    data: values.map((v, i) => ({ label: `c${i}`, value: v })),
  }];
}

/** 画一遍柱图，返回每根柱顶的 y 像素。 */
function barTops(values: number[], axes: AxisSlots): { tops: number[]; domains: Domains; frameH: number } {
  const s = seriesOf(values);
  const domains = computeDomains(s, axes, "none");
  const frame = computeFrame(400, 300, domains, axes, "zh-CN", 12);
  const model = buildGeometry("bar", s, frame, domains, theme, 1, {
    labels: false, locale: "zh-CN", markpoint: "", marklineLabel: "", markgap: false,
  } as never);
  const rects = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex === 0);
  return { tops: rects.map((r) => r.y!), domains, frameH: frame.plot.height };
}

describe("对数轴：域下限", () => {
  it("下限被压到「最小正值的一半」，不是 0", () => {
    const { domains } = barTops([1, 10, 100], logAxes);
    // [变异判据] 不做 logLeft 的 clamp 时 yDomain 会给 min - pad，这里会是 <= 0
    expect(domains.logLeft).toBe(true);
    expect(domains.leftDomain[0]).toBeCloseTo(0.5, 6);
  });

  it("数据全在 0.01~0.1 这种小量级时下限也跟着走（不是固定 1）", () => {
    const { domains } = barTops([0.01, 0.05, 0.1], logAxes);
    expect(domains.leftDomain[0]).toBeCloseTo(0.005, 6);
  });

  it("线性轴不受影响（下限仍是 0 附近）", () => {
    const { domains } = barTops([1, 10, 100], linAxes);
    expect(domains.logLeft).toBeUndefined();
    expect(domains.leftDomain[0]).toBeLessThanOrEqual(1);
  });
});

describe("对数轴：刻度是 10 的幂", () => {
  it("值域 [0.5, 105] 出 1 / 10 / 100 三档", () => {
    const s = seriesOf([1, 10, 100]);
    const domains = computeDomains(s, logAxes, "none");
    const frame = computeFrame(400, 300, domains, logAxes, "zh-CN", 12);
    const values = frame.yTicks.left.map((t) => t.value);
    // [变异判据] 走 niceTicks 时这里是 0/20/40/…/100 那种等距整数，一个 10 的幂都没有
    expect(values).toEqual([1, 10, 100]);
  });
});

describe("对数轴：刻度位置与柱子对齐", () => {
  it("刻度也按对数摆（1 / 10 / 100 三档等距）", () => {
    const s = seriesOf([1, 10, 100]);
    const domains = computeDomains(s, logAxes, "none");
    const frame = computeFrame(400, 300, domains, logAxes, "zh-CN", 12);
    const ys = frame.yTicks.left.map((t) => t.y!);
    const d1 = Math.abs(ys[0] - ys[1]);
    const d2 = Math.abs(ys[1] - ys[2]);
    // [变异判据] 刻度定位仍走线性公式时（2026-11-17 真踩过），d2 会是 d1 的十倍左右
    expect(Math.abs(d1 - d2)).toBeLessThan(1.5);
  });

  it("值为 100 的柱顶与刻度「100」在同一条水平线上", () => {
    const s = seriesOf([1, 10, 100]);
    const domains = computeDomains(s, logAxes, "none");
    const frame = computeFrame(400, 300, domains, logAxes, "zh-CN", 12);
    const model = buildGeometry("bar", s, frame, domains, theme, 1, {
      labels: false, locale: "zh-CN", markpoint: "", marklineLabel: "", markgap: false,
    } as never);
    const rects = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex === 0);
    const tick100 = frame.yTicks.left.find((t) => t.value === 100)!;
    // 柱顶 = rect.y（柱从底部长上来）
    expect(Math.abs(rects[2].y! - tick100.y!)).toBeLessThan(1);
  });
});

describe("对数轴：每个数量级占同样的像素", () => {
  it("1→10 与 10→100 的柱高差相等", () => {
    const { tops } = barTops([1, 10, 100], logAxes);
    const d1 = tops[1] - tops[0]; // 1 → 10（y 变小）
    const d2 = tops[2] - tops[1]; // 10 → 100
    // 像素取整误差容忍 1.5px
    expect(Math.abs(Math.abs(d1) - Math.abs(d2))).toBeLessThan(1.5);
  });

  it("线性轴上同样三根柱的间距不相等（对照，证明上一条测的是 log 而不是巧合）", () => {
    const { tops } = barTops([1, 10, 100], linAxes);
    const d1 = Math.abs(tops[1] - tops[0]);
    const d2 = Math.abs(tops[2] - tops[1]);
    // 线性轴：1→10 只占 9%，10→100 占 90%
    expect(d2 / Math.max(d1, 0.001)).toBeGreaterThan(5);
  });

  it("0 与负数在 log 轴上不画（而不是贴底画一根）", () => {
    const s = seriesOf([0, -5, 100]);
    const domains = computeDomains(s, logAxes, "none");
    const frame = computeFrame(400, 300, domains, logAxes, "zh-CN", 12);
    const model = buildGeometry("bar", s, frame, domains, theme, 1, {
      labels: false, locale: "zh-CN", markpoint: "", marklineLabel: "", markgap: false,
    } as never);
    const rects = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex === 0);
    // [变异判据] 不跳过非正值时这里是 3 —— 前两根会被 clamp 到域下限，画成两根贴底的柱，
    // 而「贴底」在 log 轴上意味着「极小」，那是错的结论。
    expect(rects).toHaveLength(1);
  });
});
