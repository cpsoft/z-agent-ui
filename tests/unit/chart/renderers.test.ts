// Test: chart renderers — SVG 字符串形状、canvas mock ctx 调用对等、resolveRenderer
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect, vi, afterEach } from "vitest";
import { resolveRenderer } from "../../../src/report/chart/renderer/renderer";
import { renderSvg, buildOverlaySvg } from "../../../src/report/chart/renderer/svg";
import { drawCanvas } from "../../../src/report/chart/renderer/canvas";
import { buildGeometry } from "../../../src/report/chart/geometry/build";
import { computeDomains, computeFrame, insetFrame } from "../../../src/report/chart/layout/layout";
import type { ResolvedTheme, SeriesModel } from "../../../src/report/chart/types";

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

function series(data: number[]): SeriesModel {
  return {
    name: "S", kind: "bar",
    data: data.map((v, i) => ({ x: i, value: v })),
    color: "#3b82f6", yAxis: "left", format: "auto", visible: true, index: 0,
  };
}

const ctx = {
  showGrid: true,
  regions: [],
  values: null,
  mapIdKey: "id",
  mapNameKey: "name",
  projection: "auto" as const,
  locale: "en-US",
};

function barModel() {
  const s = series([10, 20, 30]);
  const dom = computeDomains([s], {});
  const frame = computeFrame(400, 300, dom, {}, "en-US", 12);
  const model = buildGeometry("bar", [s], frame, dom, theme, 1, ctx);
  return { model, frame };
}

function recordCtx(): CanvasRenderingContext2D & { calls: Record<string, unknown[][]> } {
  const calls: Record<string, unknown[][]> = {};
  const target: Record<string, unknown> = {
    get canvas() { return undefined; },
  };
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop in t) return (t as any)[prop];
      if (typeof prop === "string" && !calls[prop]) calls[prop] = [];
      return (...args: unknown[]) => {
        (calls as any)[prop].push(args);
      };
    },
    set(t, prop, value) {
      (t as any)[prop] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { calls: Record<string, unknown[][]> };
  proxy.calls = calls;
  return proxy;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveRenderer", () => {
  it("defaults to svg", () => {
    expect(resolveRenderer("bar", "svg")).toBe("svg");
  });

  it("accepts canvas for cartesian and map", () => {
    expect(resolveRenderer("bar", "canvas")).toBe("canvas");
    expect(resolveRenderer("map", "canvas")).toBe("canvas");
  });

  it("falls back to svg for pie/donut/sparkline with a warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(resolveRenderer("pie", "canvas")).toBe("svg");
    expect(resolveRenderer("donut", "canvas")).toBe("svg");
    expect(resolveRenderer("sparkline", "canvas")).toBe("svg");
    expect(warn).toHaveBeenCalledTimes(3);
  });
});

describe("renderSvg", () => {
  it("emits one rect per bar mark", () => {
    const { model, frame } = barModel();
    const svg = renderSvg(model, frame, theme);
    expect(svg.match(/<rect /g)).toHaveLength(3);
  });

  it("emits grid lines and axis tick labels", () => {
    const { model, frame } = barModel();
    const svg = renderSvg(model, frame, theme);
    expect(svg.match(/<line /g)!.length).toBeGreaterThan(0);
    expect(svg.match(/<text /g)!.length).toBeGreaterThan(0);
  });

  it("renders pie slices as filled paths", () => {
    const frame = insetFrame(300, 300, 8);
    const model = buildGeometry("pie", [series([1, 2, 3])], frame, null, theme, 1, ctx);
    const svg = renderSvg(model, frame, theme);
    expect(svg.match(/<path /g)).toHaveLength(3);
    // [WHY] 色板首色对齐参考页 chart 色板（REQ-010）：#3b82f6 → #2563eb
    expect(svg).toContain('fill="#2563eb"');
  });

  it("escapes axis labels", () => {
    const s = {
      name: "S", kind: "bar" as const,
      data: [{ label: "<b>&", value: 1 }],
      color: "#000", yAxis: "left" as const, format: "auto", visible: true, index: 0,
    };
    const dom = computeDomains([s], {});
    const frame = computeFrame(400, 300, dom, {}, "en-US", 12);
    const model = buildGeometry("bar", [s], frame, dom, theme, 1, ctx);
    const svg = renderSvg(model, frame, theme);
    expect(svg).toContain("&lt;b&gt;&amp;");
    expect(svg).not.toContain("<b>&");
  });

  it("hides marks flagged invisible", () => {
    const { model, frame } = barModel();
    model.marks[0].visible = false;
    const svg = renderSvg(model, frame, theme);
    expect(svg.match(/<rect /g)).toHaveLength(2);
  });
});

describe("buildOverlaySvg", () => {
  it("emits one padded ghost rect per tooltip target", () => {
    const { model } = barModel();
    const overlay = buildOverlaySvg(model);
    expect(overlay.match(/data-m="/g)).toHaveLength(3);
    expect(overlay).toContain('fill="transparent"');
  });
});

describe("drawCanvas", () => {
  it("draws rect per bar mark via fillRect", () => {
    vi.stubGlobal("Path2D", class {});
    const { model, frame } = barModel();
    const c = recordCtx();
    drawCanvas(c, model, frame, theme);
    expect(c.calls.fillRect).toHaveLength(3);
  });

  it("draws grid lines and axis text", () => {
    vi.stubGlobal("Path2D", class {});
    const { model, frame } = barModel();
    const c = recordCtx();
    drawCanvas(c, model, frame, theme);
    expect(c.calls.moveTo.length).toBeGreaterThan(0);
    expect(c.calls.fillText.length).toBeGreaterThan(0);
  });

  it("fills path marks via Path2D", () => {
    const paths: string[] = [];
    vi.stubGlobal("Path2D", class { constructor(d: string) { paths.push(d); } });
    const frame = insetFrame(300, 300, 8);
    const model = buildGeometry("pie", [series([1, 2, 3])], frame, null, theme, 1, ctx);
    const c = recordCtx();
    drawCanvas(c, model, frame, theme);
    // 每片 fill + stroke 各构造一个 Path2D
    expect(paths.length).toBeGreaterThanOrEqual(3);
    expect(c.calls.fill).toHaveLength(3);
  });

  it("skips path drawing without Path2D without throwing", () => {
    vi.stubGlobal("Path2D", undefined);
    const frame = insetFrame(300, 300, 8);
    const model = buildGeometry("pie", [series([1, 2, 3])], frame, null, theme, 1, ctx);
    const c = recordCtx();
    expect(() => drawCanvas(c, model, frame, theme)).not.toThrow();
    expect(c.calls.fill ?? []).toHaveLength(0);
  });

  it("canvas rect count matches svg rect count (parity)", () => {
    vi.stubGlobal("Path2D", class {});
    const { model, frame } = barModel();
    const c = recordCtx();
    drawCanvas(c, model, frame, theme);
    const svg = renderSvg(model, frame, theme);
    expect(c.calls.fillRect).toHaveLength(svg.match(/<rect /g)!.length);
  });
});
