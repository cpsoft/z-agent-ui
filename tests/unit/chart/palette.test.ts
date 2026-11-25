// Test: chart palette — categorical 色板、quantize 分桶、颜色覆盖
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import {
  CATEGORICAL,
  SEQUENTIAL_LIGHT,
  SEQUENTIAL_DARK,
  resolveSeriesColors,
  quantize,
} from "../../../src/report/chart/palette";

describe("palette constants", () => {
  it("categorical has 12 valid hex colors", () => {
    expect(CATEGORICAL).toHaveLength(12);
    for (const c of CATEGORICAL) expect(c).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("sequential ramps are valid hex and same length", () => {
    expect(SEQUENTIAL_LIGHT).toHaveLength(7);
    expect(SEQUENTIAL_DARK).toHaveLength(SEQUENTIAL_LIGHT.length);
    for (const c of [...SEQUENTIAL_LIGHT, ...SEQUENTIAL_DARK]) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("resolveSeriesColors", () => {
  it("cycles categorical palette by index", () => {
    const colors = resolveSeriesColors(14, null);
    expect(colors[0]).toBe(CATEGORICAL[0]);
    expect(colors[12]).toBe(CATEGORICAL[0]);
    expect(colors[13]).toBe(CATEGORICAL[1]);
  });

  it("honors override palette, cycling if shorter", () => {
    const colors = resolveSeriesColors(3, ["#111111", "#222222"]);
    expect(colors).toEqual(["#111111", "#222222", "#111111"]);
  });
});

describe("quantize", () => {
  it("buckets values evenly across domain", () => {
    const q = quantize([0, 10, 20, 30, 40, 50], 5);
    expect(q.min).toBe(0);
    expect(q.max).toBe(50);
    expect(q.bucketIndex(0)).toBe(0);
    expect(q.bucketIndex(50)).toBe(4);
    expect(q.bucketIndex(20)).toBe(2);
  });

  it("clamps out-of-range values to edge buckets", () => {
    const q = quantize([0, 10], 3);
    expect(q.bucketIndex(-100)).toBe(0);
    expect(q.bucketIndex(1000)).toBe(2);
  });

  it("handles empty and flat domains", () => {
    expect(quantize([], 3).bucketCount).toBe(3);
    // 空域退化为 [0,1]，越界值钳制到末桶
    expect(quantize([], 3).bucketIndex(5)).toBe(2);
    const flat = quantize([7, 7, 7], 3);
    expect(flat.bucketIndex(7)).toBe(0);
  });
});

// ── 固定色阶上下限（2026-11-17）────────────────────────────────
//
// 同一指标做成多张热力图时，各自按自己的极值取色会让深浅**不可比**：
// A 图的浅蓝与 B 图的深蓝可能是同一个值。固定上下限才让并排的几张图能直接对照。
describe("quantize: 固定上下限", () => {
  it("不给 clamp 时仍按本批数据的极值（存量行为）", () => {
    const q = quantize([10, 20, 30], 7);
    expect(q.min).toBe(10);
    expect(q.max).toBe(30);
  });

  it("给了 clamp 就按它分档，两批数据里同一个值落同一档", () => {
    // [变异判据] 忽略 clamp 时 q1.max 会是 30、q2.max 会是 100 —— 20 在两图里深浅不同
    const q1 = quantize([10, 20, 30], 7, { min: 0, max: 100 });
    const q2 = quantize([0, 50, 100], 7, { min: 0, max: 100 });
    expect(q1.min).toBe(0);
    expect(q1.max).toBe(100);
    expect(q1.bucketIndex(20)).toBe(q2.bucketIndex(20));
  });

  it("只给一侧时另一侧仍取数据极值", () => {
    const q = quantize([10, 20, 30], 7, { max: 100 });
    expect(q.min).toBe(10);
    expect(q.max).toBe(100);
  });

  it("上下限给反时当没给（否则全同色，看着像「数据都一样」）", () => {
    const q = quantize([10, 20, 30], 7, { min: 100, max: 0 });
    expect(q.max).toBeGreaterThan(q.min);
    // 正常分档：两端不在同一档
    expect(q.bucketIndex(10)).not.toBe(q.bucketIndex(30));
  });

  it("超出范围的格子落到首/末档，而不是算出负下标", () => {
    const q = quantize([10, 20], 7, { min: 100, max: 200 });
    expect(q.bucketIndex(10)).toBe(0);
    expect(q.bucketIndex(999)).toBe(6);
  });
});
