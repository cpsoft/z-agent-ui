// Test: chart 刻度纯函数 — niceTicks / timeTicks
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI
//
// [WHY 只测 ticks] 原文件同时测 scale/scales.ts 的 linear/band/time scale，
// 但该文件自建立起从未被任何源码 import（chart 的坐标换算在 layout/ 内直接完成，
// 由 svg.ts / canvas.ts 消费 frame 里的像素值），标度为死代码，已于 2026-10-25 删除。
// 保留的 ticks 是**活代码**：chart/layout/layout.ts 依赖它算刻度。

import { describe, it, expect } from "vitest";
import { niceTicks, timeTicks } from "../../../src/report/chart/scale/ticks";

describe("niceTicks", () => {
  it("produces ascending ticks within domain", () => {
    const ticks = niceTicks(0, 100, 6);
    expect(ticks[0]).toBeLessThanOrEqual(100);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(100);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
    expect(ticks.length).toBeGreaterThan(1);
  });

  it("includes 0 for symmetric-friendly domains", () => {
    expect(niceTicks(0, 10, 6)).toContain(0);
    expect(niceTicks(0, 10, 6)).toContain(10);
  });

  it("handles negative domains", () => {
    const ticks = niceTicks(-50, 50, 6);
    for (const t of ticks) {
      expect(t).toBeGreaterThanOrEqual(-50);
      expect(t).toBeLessThanOrEqual(50);
    }
    expect(ticks).toContain(0);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });

  it("handles empty and degenerate domains", () => {
    expect(niceTicks(Number.NaN, 10, 6)).toEqual([]);
    expect(niceTicks(3, 3, 6)).toEqual([3]);
  });
});

describe("timeTicks", () => {
  it("produces ascending ticks within domain", () => {
    const t0 = Date.UTC(2026, 0, 1);
    const t1 = Date.UTC(2026, 0, 2);
    const ticks = timeTicks(t0, t1, 6);
    expect(ticks[0]).toBeGreaterThanOrEqual(t0);
    expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(t1);
    expect([...ticks].sort((a, b) => a - b)).toEqual(ticks);
  });

  it("uses aligned steps (no fractional ms)", () => {
    const t0 = Date.UTC(2026, 0, 1);
    const t1 = Date.UTC(2026, 0, 2);
    const ticks = timeTicks(t0, t1, 6);
    for (const t of ticks) expect(t % 1000).toBe(0);
  });

  it("handles degenerate domains", () => {
    expect(timeTicks(1000, 1000, 6)).toEqual([1000]);
    expect(timeTicks(Number.NaN, 1000, 6)).toEqual([]);
  });
});
