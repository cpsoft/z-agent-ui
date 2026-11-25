// Test: chart geometry builders — 各类型 mark 数量/位置/progress/错开/donut 孔/双轴/visible
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import { buildGeometry } from "../../../src/report/chart/geometry/build";
import { computeDomains, computeFrame, insetFrame } from "../../../src/report/chart/layout/layout";
import type { SeriesModel, MapRegion, ResolvedTheme } from "../../../src/report/chart/types";

const theme: ResolvedTheme = {
  text: "#111827",
  textSecondary: "#6b7280",
  grid: "#e5e7eb",
  bg: "#ffffff",
  dark: false,
  fontFamily: "sans-serif",
  labelFontSize: "12px",
  titleFontSize: "16px",
};

function series(overrides: Partial<SeriesModel> = {}): SeriesModel {
  return {
    name: "S", kind: "bar", data: [], color: "#3b82f6", yAxis: "left",
    format: "auto", visible: true, index: 0, ...overrides,
  };
}

function cartesianFrame(data: Array<[number, number]>, extras: SeriesModel[] = []) {
  const s = series({ data: data.map(([x, value]) => ({ x, value })) });
  const dom = computeDomains([s, ...extras], {});
  return { dom, frame: computeFrame(400, 300, dom, {}, "en-US", 12) };
}

const ctx = {
  showGrid: true,
  regions: [] as MapRegion[],
  values: null,
  mapIdKey: "id",
  mapNameKey: "name",
  projection: "auto" as const,
  locale: "en-US",
};

describe("bar geometry", () => {
  it("emits one rect per data point with ascending x", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 20], [2, 30]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: 10 }, { x: 1, value: 20 }, { x: 2, value: 30 }] })], frame, dom, theme, 1, ctx);
    const rects = g.marks.filter((m) => m.kind === "rect");
    expect(rects).toHaveLength(3);
    expect(rects[0].x!).toBeLessThan(rects[1].x!);
    expect(rects[1].x!).toBeLessThan(rects[2].x!);
    expect(rects[0].color).toBe("#3b82f6");
  });

  it("scales bar height to value", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 30]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: 10 }, { x: 1, value: 30 }] })], frame, dom, theme, 1, ctx);
    const rects = g.marks.filter((m) => m.kind === "rect");
    expect(rects[1].height!).toBeGreaterThan(rects[0].height!);
  });

  it("grows bars with progress (0 → flat, 1 → full)", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 20]]);
    const data = [{ x: 0, value: 10 }, { x: 1, value: 20 }];
    const g0 = buildGeometry("bar", [series({ data })], frame, dom, theme, 0, ctx);
    const g1 = buildGeometry("bar", [series({ data })], frame, dom, theme, 1, ctx);
    const h0 = g0.marks.filter((m) => m.kind === "rect").map((m) => m.height);
    const h1 = g1.marks.filter((m) => m.kind === "rect").map((m) => m.height);
    expect(h0.every((h) => h === 0)).toBe(true);
    expect(h1.every((h) => h! > 0)).toBe(true);
  });

  it("stagger bars per index at mid progress", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 10], [2, 10]]);
    const data = [{ x: 0, value: 10 }, { x: 1, value: 10 }, { x: 2, value: 10 }];
    const g = buildGeometry("bar", [series({ data })], frame, dom, theme, 0.5, ctx);
    const heights = g.marks.filter((m) => m.kind === "rect").map((m) => m.height!);
    expect(heights[0]).toBeGreaterThan(heights[1]);
    expect(heights[1]).toBeGreaterThan(heights[2]);
  });

  it("draws negative bars downward from baseline", () => {
    const { dom, frame } = cartesianFrame([[0, -10], [1, 10]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: -10 }, { x: 1, value: 10 }] })], frame, dom, theme, 1, ctx);
    const [neg, pos] = g.marks.filter((m) => m.kind === "rect") as Array<{ y?: number }>;
    expect(neg.y!).toBeGreaterThan(pos.y!);
  });

  it("groups multiple bar series side by side", () => {
    const { dom, frame } = cartesianFrame([[0, 10]], [series({ index: 1, color: "#22c55e", data: [{ x: 0, value: 5 }] })]);
    const g = buildGeometry("bar", [
      series({ data: [{ x: 0, value: 10 }] }),
      series({ index: 1, color: "#22c55e", data: [{ x: 0, value: 5 }] }),
    ], frame, dom, theme, 1, ctx);
    const rects = g.marks.filter((m) => m.kind === "rect");
    expect(rects).toHaveLength(2);
    expect(rects[0].x).not.toBe(rects[1].x);
  });

  it("excludes hidden series from marks but keeps domain stable", () => {
    const visible = series({ data: [{ x: 0, value: 10 }] });
    const hidden = series({ index: 1, data: [{ x: 0, value: 100 }], visible: false });
    const dom = computeDomains([visible, hidden], {});
    const frame = computeFrame(400, 300, dom, {}, "en-US", 12);
    const g = buildGeometry("bar", [visible, hidden], frame, dom, theme, 1, ctx);
    expect(g.marks.filter((m) => m.kind === "rect")).toHaveLength(1);
    expect(dom.leftDomain[1]).toBe(105);
  });
});

describe("line / area geometry", () => {
  it("draws line progressively with progress", () => {
    const { dom, frame } = cartesianFrame([[0, 1], [1, 5], [2, 3]]);
    const data = [{ x: 0, value: 1 }, { x: 1, value: 5 }, { x: 2, value: 3 }];
    const g = buildGeometry("line", [series({ kind: "line", data })], frame, dom, theme, 1, ctx);
    const path = g.marks.find((m) => m.kind === "path");
    expect(path?.d).toMatch(/^M /);
    expect(g.marks.filter((m) => m.kind === "circle")).toHaveLength(3);
    expect(g.tooltipTargets).toHaveLength(3);
  });

  it("limits dots for large datasets", () => {
    const { dom, frame } = cartesianFrame([[0, 1], [1, 2]]);
    const data = Array.from({ length: 100 }, (_, i) => ({ x: i, value: i % 10 }));
    const g = buildGeometry("line", [series({ kind: "line", data })], frame, dom, theme, 1, ctx);
    expect(g.marks.filter((m) => m.kind === "circle")).toHaveLength(0);
  });

  it("area closes to baseline with fill opacity", () => {
    const { dom, frame } = cartesianFrame([[0, 1], [1, 5]]);
    const g = buildGeometry("area", [series({ kind: "area", data: [{ x: 0, value: 1 }, { x: 1, value: 5 }] })], frame, dom, theme, 1, ctx);
    const path = g.marks.find((m) => m.kind === "path")!;
    expect(path.d).toMatch(/ Z$/);
    expect(path.fillOpacity).toBe(0.15);
    expect(path.opacity).toBe(1);
  });

  it("supports mixed bar + line with dual axis domains", () => {
    const bar = series({ data: [{ x: 0, value: 10 }] });
    const line = series({ index: 1, kind: "line", yAxis: "right", data: [{ x: 0, value: 200 }] });
    const dom = computeDomains([bar, line], {});
    const frame = computeFrame(400, 300, dom, {}, "en-US", 12);
    const g = buildGeometry("bar", [bar, line], frame, dom, theme, 1, ctx);
    expect(g.marks.filter((m) => m.kind === "rect")).toHaveLength(1);
    // 2026-11-07（issue IKTM1J）：单点折线不再产退化 path（"M x y" 零长度线画不出来，
    // 只是把标记数撑虚）；线的位置由圆点表达
    expect(g.marks.filter((m) => m.kind === "path")).toHaveLength(0);
    expect(dom.rightDomain[1]).toBe(210);
    expect(g.axes.map((a) => a.position)).toEqual(["bottom", "left", "right"]);
  });
});

describe("pie / donut geometry", () => {
  const pieData = [{ x: 0, value: 1 }, { x: 1, value: 2 }, { x: 2, value: 3 }];

  it("emits one slice per value with sweep", () => {
    const frame = insetFrame(300, 300, 8);
    const g = buildGeometry("pie", [series({ kind: "pie", data: pieData })], frame, null, theme, 1, ctx);
    expect(g.marks).toHaveLength(3);
    expect(g.legend).toHaveLength(3);
    expect(g.tooltipTargets).toHaveLength(3);
    expect(g.axes).toHaveLength(0);
  });

  it("sweeps partial angles at mid progress", () => {
    const frame = insetFrame(300, 300, 8);
    const g = buildGeometry("pie", [series({ kind: "pie", data: pieData })], frame, null, theme, 0.5, ctx);
    expect(g.marks.length).toBeGreaterThanOrEqual(1);
    expect(g.marks.length).toBeLessThanOrEqual(3);
  });

  it("emits no slices at progress 0", () => {
    const frame = insetFrame(300, 300, 8);
    const g = buildGeometry("pie", [series({ kind: "pie", data: pieData })], frame, null, theme, 0, ctx);
    expect(g.marks).toHaveLength(0);
  });

  it("donut renders center total at progress 1", () => {
    const frame = insetFrame(300, 300, 8);
    const g = buildGeometry("donut", [series({ kind: "pie", data: pieData })], frame, null, theme, 1, ctx);
    const total = g.marks.find((m) => m.kind === "text");
    expect(total?.label).toBe("6");
  });

  it("noData when no values", () => {
    const frame = insetFrame(300, 300, 8);
    const g = buildGeometry("pie", [series({ kind: "pie", data: [] })], frame, null, theme, 1, ctx);
    expect(g.noData).toBe(true);
  });
});

describe("sparkline geometry", () => {
  it("renders filled path with tooltip targets", () => {
    const frame = insetFrame(120, 48, 4);
    const g = buildGeometry("sparkline", [series({ kind: "sparkline", data: [{ x: 0, value: 1 }, { x: 1, value: 5 }, { x: 2, value: 3 }] })], frame, null, theme, 1, ctx);
    expect(g.marks).toHaveLength(1);
    expect(g.marks[0].kind).toBe("path");
    expect(g.tooltipTargets).toHaveLength(3);
    expect(g.axes).toHaveLength(0);
    expect(g.noData).toBe(false);
  });

  it("noData for empty data", () => {
    const frame = insetFrame(120, 48, 4);
    const g = buildGeometry("sparkline", [series({ kind: "sparkline", data: [] })], frame, null, theme, 1, ctx);
    expect(g.noData).toBe(true);
  });
});

describe("map geometry", () => {
  function region(id: string, name: string): MapRegion {
    return { id, name, rings: [[[0, 0], [10, 0], [10, 10], [0, 10]]] };
  }

  it("renders region paths with quantized fills", () => {
    const frame = insetFrame(400, 300, 8);
    const g = buildGeometry("map", [], frame, null, theme, 1, {
      ...ctx,
      regions: [region("a", "A"), region("b", "B")],
      values: [{ id: "a", value: 10 }, { id: "b", value: 50 }],
    });
    expect(g.marks).toHaveLength(2);
    expect(g.marks[0].d).toMatch(/^M /);
    expect(g.marks[0].color).not.toBe(g.marks[1].color);
    expect(g.legend).toHaveLength(5);
  });

  it("uses neutral fill and dash for missing values", () => {
    const frame = insetFrame(400, 300, 8);
    const g = buildGeometry("map", [], frame, null, theme, 1, {
      ...ctx,
      regions: [region("a", "A")],
      values: null,
    });
    expect(g.marks[0].color).toBe(theme.grid);
    expect(g.tooltipTargets[0].values[0].formatted).toBe("—");
  });

  it("uses dark sequential ramp when theme is dark", () => {
    const frame = insetFrame(400, 300, 8);
    const darkTheme = { ...theme, dark: true };
    const g = buildGeometry("map", [], frame, null, darkTheme, 1, {
      ...ctx,
      regions: [region("a", "A")],
      values: [{ id: "a", value: 10 }],
    });
    expect(g.legend.map((l) => l.color)).toEqual(g.legend.map((l) => l.color));
    expect(g.marks[0].color).not.toBe("#e5e7eb");
  });

  it("noData for no regions", () => {
    const frame = insetFrame(400, 300, 8);
    const g = buildGeometry("map", [], frame, null, theme, 1, ctx);
    expect(g.noData).toBe(true);
  });
});

describe("grid lines and axes", () => {
  it("emits grid lines when showGrid", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 20]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: 10 }, { x: 1, value: 20 }] })], frame, dom, theme, 1, ctx);
    expect(g.gridLines.length).toBeGreaterThan(0);
    expect(g.axes.length).toBeGreaterThan(0);
  });

  it("omits grid lines when showGrid false", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 20]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: 10 }, { x: 1, value: 20 }] })], frame, dom, theme, 1, { ...ctx, showGrid: false });
    expect(g.gridLines).toHaveLength(0);
  });

  it("axes carry theme colors and ticks", () => {
    const { dom, frame } = cartesianFrame([[0, 10], [1, 20]]);
    const g = buildGeometry("bar", [series({ data: [{ x: 0, value: 10 }, { x: 1, value: 20 }] })], frame, dom, theme, 1, ctx);
    const xAxis = g.axes.find((a) => a.position === "bottom")!;
    expect(xAxis.ticks.length).toBeGreaterThan(0);
    expect(xAxis.color).toBe(theme.textSecondary);
  });

  it("marks noData for empty cartesian", () => {
    const { dom, frame } = cartesianFrame([[0, 10]]);
    const g = buildGeometry("bar", [series({ data: [] })], frame, dom, theme, 1, ctx);
    expect(g.noData).toBe(true);
  });
});
