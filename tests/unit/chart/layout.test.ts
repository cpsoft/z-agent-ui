// Test: chart layout — estimateTextWidth、computeDomains、computeFrame
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import { estimateTextWidth, computeDomains, computeFrame } from "../../../src/report/chart/layout/layout";
import type { SeriesModel, AxisConfig } from "../../../src/report/chart/types";

function series(overrides: Partial<SeriesModel> = {}): SeriesModel {
  return {
    name: "S", kind: "bar", data: [{ value: 1 }], color: "#000", yAxis: "left",
    format: "auto", visible: true, index: 0, ...overrides,
  };
}

const axis = (partial: Partial<AxisConfig> = {}): AxisConfig => ({
  position: "bottom", type: "auto", title: "", format: "", tickCount: 0, ...partial,
});

describe("estimateTextWidth", () => {
  it("measures ASCII at 0.6em and CJK at 1em", () => {
    expect(estimateTextWidth("abc", 10)).toBe(18);
    expect(estimateTextWidth("中", 10)).toBe(10);
    expect(estimateTextWidth("", 10)).toBe(0);
  });
});

describe("computeDomains", () => {
  it("uses zero baseline for non-negative values", () => {
    const d = computeDomains([series({ data: [{ value: 2 }, { value: 10 }] })], {});
    expect(d.leftDomain).toEqual([0, 10.5]);
  });

  it("pads mixed-sign domains", () => {
    const d = computeDomains([series({ data: [{ value: -10 }, { value: 10 }] })], {});
    expect(d.leftDomain[0]).toBe(-11);
    expect(d.leftDomain[1]).toBe(11);
  });

  it("splits left/right domains by series yAxis", () => {
    const s = [series({ data: [{ value: 1 }, { value: 5 }] }), series({ index: 1, yAxis: "right", data: [{ value: 100 }, { value: 200 }] })];
    const d = computeDomains(s, {});
    expect(d.leftDomain[1]).toBe(5.25);
    expect(d.rightDomain[1]).toBe(210);
    expect(d.hasLeft).toBe(true);
    expect(d.hasRight).toBe(true);
  });

  it("detects category axis from labels", () => {
    const d = computeDomains([series({ data: [{ label: "A", value: 1 }, { label: "B", value: 2 }] })], {});
    expect(d.xKind).toBe("category");
    expect(d.xLabels).toEqual(["A", "B"]);
  });

  it("applies explicit min/max", () => {
    const d = computeDomains([series({ data: [{ value: 2 }, { value: 10 }] })], {
      left: axis({ position: "left", type: "value", min: 0, max: 50 }),
    });
    expect(d.leftDomain).toEqual([0, 50]);
  });
});

describe("computeFrame", () => {
  const domains = computeDomains([series({ data: [{ value: 1 }, { value: 10 }] })], {});

  it("positions plot inside margins", () => {
    const f = computeFrame(400, 300, domains, {}, "en-US", 12);
    expect(f.width).toBe(400);
    expect(f.height).toBe(300);
    expect(f.plot.width).toBeGreaterThan(0);
    expect(f.plot.height).toBeGreaterThan(0);
    expect(f.plot.x).toBe(f.margins.left);
    expect(f.plot.y).toBe(f.margins.top);
  });

  it("keeps y ticks inside plot vertically", () => {
    const f = computeFrame(400, 300, domains, {}, "en-US", 12);
    for (const t of f.yTicks.left) {
      expect(t.y).toBeGreaterThanOrEqual(f.plot.y);
      expect(t.y).toBeLessThanOrEqual(f.plot.y + f.plot.height);
    }
  });

  it("adds margin for axis titles", () => {
    const withTitle = computeFrame(400, 300, domains, { left: axis({ position: "left", type: "value", title: "USD" }) }, "en-US", 12);
    const plain = computeFrame(400, 300, domains, {}, "en-US", 12);
    expect(withTitle.margins.left).toBeGreaterThan(plain.margins.left);
  });

  it("centers category ticks in bands", () => {
    const cat = computeDomains([series({ data: [{ label: "A", value: 1 }, { label: "B", value: 2 }] })], {});
    const f = computeFrame(200, 200, cat, {}, "en-US", 12);
    expect(f.xTicks).toHaveLength(2);
    expect(f.xTicks[0].x).toBeLessThan(f.xTicks[1].x);
  });
});
