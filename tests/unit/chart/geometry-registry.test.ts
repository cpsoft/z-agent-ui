import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGeometry,
  getChartGeometry,
  listChartGeometries,
  registerChartGeometry,
  unregisterChartGeometry,
} from "../../../src/report/chart/geometry/build.js";
import type { ComputedFrame } from "../../../src/report/chart/layout/layout.js";
import type { ResolvedTheme } from "../../../src/report/chart/types.js";

const mockFrame: ComputedFrame = {
  width: 400,
  height: 300,
  plot: { x: 40, y: 20, w: 340, h: 240 },
  xAxis: null,
  yAxis: null,
  y2Axis: null,
};

const mockTheme: ResolvedTheme = {
  text: "#0f172a",
  textSecondary: "#64748b",
  grid: "#e2e8f0",
  bg: "#ffffff",
  dark: false,
  fontFamily: "sans-serif",
  labelFontSize: "12px",
  titleFontSize: "16px",
};

describe("Chart Geometry Registry 插件注册表", () => {
  afterEach(() => {
    unregisterChartGeometry("custom-bullet");
  });

  it("内置非笛卡尔图形族均已通过注册表注册", () => {
    const names = listChartGeometries();
    expect(names).toEqual(expect.arrayContaining(["pie", "donut", "sparkline", "radar", "waterfall", "map"]));
    expect(getChartGeometry("pie")).toBeTypeOf("function");
  });

  it("支持注册自定义图表几何插件并经由 buildGeometry 分派", () => {
    const builder = vi.fn().mockReturnValue({
      marks: [{ kind: "rect", x: 10, y: 10, w: 80, h: 20, fill: "#2563eb" }],
      tooltipTargets: [],
      legendItems: [],
    });

    registerChartGeometry("custom-bullet", builder);
    expect(getChartGeometry("custom-bullet")).toBe(builder);

    const model = buildGeometry(
      "custom-bullet" as never,
      [],
      mockFrame,
      null,
      mockTheme,
      1,
      { format: (v) => String(v), showGrid: true },
    );

    expect(builder).toHaveBeenCalledTimes(1);
    expect(model.marks).toHaveLength(1);
    expect(unregisterChartGeometry("custom-bullet")).toBe(true);
    expect(getChartGeometry("custom-bullet")).toBeUndefined();
  });
});
