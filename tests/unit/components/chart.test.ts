// Test: z-chart 容器组件（双引擎渲染、图例、tooltip、键盘、map、事件）
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect, vi } from "vitest";
import "../../../src/report/chart";

const wait = () => new Promise((r) => setTimeout(r, 0));

interface SeriesSpec {
  name?: string;
  type?: string;
  data?: unknown[];
  color?: string;
  yAxis?: string;
  format?: string;
}

function createChart(opts: {
  type?: string;
  attrs?: Record<string, string>;
  props?: Record<string, unknown>;
  series?: SeriesSpec[];
  axes?: Array<Record<string, string>>;
}): any {
  const el = document.createElement("z-chart") as any;
  el.animation = false;
  if (opts.type) el.setAttribute("type", opts.type);
  for (const [k, v] of Object.entries(opts.attrs ?? {})) el.setAttribute(k, v);
  for (const [k, v] of Object.entries(opts.props ?? {})) el[k] = v;
  for (const s of opts.series ?? []) {
    const se = document.createElement("z-chart-series") as any;
    if (s.name !== undefined) se.name = s.name;
    if (s.type !== undefined) se.type = s.type;
    if (s.data !== undefined) se.data = s.data;
    if (s.color !== undefined) se.color = s.color;
    if (s.yAxis !== undefined) se.yAxis = s.yAxis;
    if (s.format !== undefined) se.format = s.format;
    el.appendChild(se);
  }
  for (const a of opts.axes ?? []) {
    const ae = document.createElement("z-chart-axis") as any;
    for (const [k, v] of Object.entries(a)) ae.setAttribute(k, v);
    el.appendChild(ae);
  }
  document.body.appendChild(el);
  return el;
}

describe("z-chart rendering", () => {
  it("renders svg plot for bar chart", async () => {
    const el = createChart({ series: [{ name: "A", data: [10, 20, 30] }] });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__svg")).toBeTruthy();
    expect(el.shadowRoot.querySelectorAll("rect").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("renders title and sets aria-label", async () => {
    const el = createChart({ attrs: { title: "Quarterly" }, series: [{ data: [1, 2, 3] }] });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__title")!.textContent).toBe("Quarterly");
    expect(el.getAttribute("aria-label")).toBe("Quarterly");
    document.body.removeChild(el);
  });

  it("renders legend items per series", async () => {
    const el = createChart({ series: [{ name: "A", data: [1] }, { name: "B", data: [2] }] });
    await wait();
    expect(el.shadowRoot.querySelectorAll(".z-chart__legend-item").length).toBe(2);
    document.body.removeChild(el);
  });

  it("legend=false omits legend container", async () => {
    const el = createChart({ props: { legend: false }, series: [{ data: [1, 2] }] });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__legend")).toBeNull();
    document.body.removeChild(el);
  });

  it("applies explicit width/height to svg", async () => {
    const el = createChart({ attrs: { width: "300", height: "200" }, series: [{ data: [1, 2] }] });
    await wait();
    const svg = el.shadowRoot.querySelector(".z-chart__svg")!;
    expect(svg.getAttribute("width")).toBe("300");
    expect(svg.getAttribute("height")).toBe("200");
    document.body.removeChild(el);
  });

  it("empty chart renders svg without throwing", async () => {
    const el = createChart({});
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__svg")).toBeTruthy();
    document.body.removeChild(el);
  });
});

describe("z-chart types (svg engine)", () => {
  it("line renders a path", async () => {
    const el = createChart({ type: "line", series: [{ data: [1, 2, 3] }] });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("area renders a filled path", async () => {
    const el = createChart({ type: "area", series: [{ data: [1, 2, 3] }] });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("pie renders path slices", async () => {
    const el = createChart({ type: "pie", series: [{ data: [10, 20, 30] }] });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBe(3);
    document.body.removeChild(el);
  });

  it("donut renders center total", async () => {
    const el = createChart({ type: "donut", series: [{ data: [10, 20] }] });
    await wait();
    const texts = el.shadowRoot.querySelectorAll("text");
    const total = Array.from(texts).some((t) => t.textContent === "30");
    expect(total).toBe(true);
    document.body.removeChild(el);
  });

  it("sparkline renders a path without axes", async () => {
    const el = createChart({ type: "sparkline", series: [{ data: [1, 5, 2, 8] }] });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBeGreaterThan(0);
    expect(el.shadowRoot.querySelectorAll(".z-chart__legend-item").length).toBe(0);
    document.body.removeChild(el);
  });

  it("mixed bar+line renders rect and path", async () => {
    const el = createChart({
      type: "bar",
      series: [
        { name: "Bars", type: "bar", data: [3, 1, 4] },
        { name: "Trend", type: "line", data: [2, 2, 3] },
      ],
    });
    await wait();
    expect(el.shadowRoot.querySelectorAll("rect").length).toBeGreaterThan(0);
    expect(el.shadowRoot.querySelectorAll("path").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("dual y-axis renders left and right axis labels", async () => {
    const el = createChart({
      series: [
        { name: "A", data: [1, 2, 3] },
        { name: "B", yAxis: "right", data: [100, 200, 300] },
      ],
      axes: [
        { position: "left" },
        { position: "right" },
      ],
    });
    await wait();
    const labels = Array.from(el.shadowRoot.querySelectorAll("text")).map((t) => t.textContent);
    expect(labels.some((l) => l === "100")).toBe(true);
    document.body.removeChild(el);
  });

  it("series type=auto inherits chart type", async () => {
    const el = createChart({ type: "line", series: [{ name: "A", data: [1, 2, 3] }] });
    await wait();
    // overlay ghost rect 恒存在，仅几何 path 属于渲染结果
    expect(el.shadowRoot.querySelectorAll("path").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("axis title renders in svg", async () => {
    const el = createChart({
      series: [{ data: [1, 2] }],
      axes: [{ position: "bottom", title: "Time" }],
    });
    await wait();
    const labels = Array.from(el.shadowRoot.querySelectorAll("text")).map((t) => t.textContent);
    expect(labels).toContain("Time");
    document.body.removeChild(el);
  });

  it("axis min/max extends domain without throwing", async () => {
    const el = createChart({
      series: [{ data: [50] }],
      axes: [{ position: "left", min: "0", max: "100" }],
    });
    await wait();
    const rects = el.shadowRoot.querySelectorAll("rect");
    expect(rects.length).toBeGreaterThan(0);
    expect(parseFloat(rects[0].getAttribute("height")!)).toBeGreaterThan(0);
    document.body.removeChild(el);
  });
});

describe("z-chart canvas engine", () => {
  it("bar+canvas renders canvas element without throwing", async () => {
    const el = createChart({ attrs: { renderer: "canvas" }, series: [{ data: [1, 2, 3] }] });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__canvas")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-chart__svg")).toBeNull();
    document.body.removeChild(el);
  });

  it.each(["pie", "donut", "sparkline"])("%s+canvas falls back to svg with warning", async (type) => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = createChart({ attrs: { type, renderer: "canvas" }, series: [{ data: [1, 2, 3] }] });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__svg")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-chart__canvas")).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    document.body.removeChild(el);
  });
});

describe("z-chart map", () => {
  const geo = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { id: "a", name: "Alpha" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]] } },
      { type: "Feature", properties: { id: "b", name: "Beta" }, geometry: { type: "Polygon", coordinates: [[[20, 0], [20, 10], [30, 10], [30, 0], [20, 0]]] } },
    ],
  };

  it("renders region paths from geojson", async () => {
    const el = createChart({
      type: "map",
      props: { geojson: geo, values: { a: 5, b: 50 } },
    });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBe(2);
    expect(el.shadowRoot.querySelectorAll(".z-chart__legend-item").length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("missing values render with neutral color without throwing", async () => {
    const el = createChart({ type: "map", props: { geojson: geo } });
    await wait();
    expect(el.shadowRoot.querySelectorAll("path").length).toBe(2);
    document.body.removeChild(el);
  });

  it("empty geojson renders no regions without throwing", async () => {
    const el = createChart({ type: "map", props: { geojson: null, values: null } });
    await wait();
    expect(el.shadowRoot.querySelector(".z-chart__svg")).toBeTruthy();
    document.body.removeChild(el);
  });
});

describe("z-chart interaction", () => {
  it("pointermove on ghost shows tooltip and emits z-tooltip-change", async () => {
    const el = createChart({ series: [{ name: "A", data: [10, 20, 30] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-tooltip-change", handler);
    const ghost = el.shadowRoot.querySelector("[data-m]");
    ghost.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    await wait();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ visible: true }) }));
    document.body.removeChild(el);
  });

  it("pointerleave hides tooltip", async () => {
    const el = createChart({ series: [{ name: "A", data: [10, 20, 30] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-tooltip-change", handler);
    el.dispatchEvent(new PointerEvent("pointerleave", { bubbles: true }));
    await wait();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ visible: false }) }));
    document.body.removeChild(el);
  });

  it("keyboard ArrowRight navigates targets and emits z-tooltip-change", async () => {
    const el = createChart({ series: [{ data: [10, 20, 30] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-tooltip-change", handler);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await wait();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ visible: true }) }));
    document.body.removeChild(el);
  });

  it("Escape hides tooltip", async () => {
    const el = createChart({ series: [{ data: [10, 20, 30] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-tooltip-change", handler);
    el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await wait();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ visible: false }) }));
    document.body.removeChild(el);
  });

  it("click on ghost emits z-marker-click", async () => {
    const el = createChart({ series: [{ name: "A", data: [10, 20, 30] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-marker-click", handler);
    const ghost = el.shadowRoot.querySelector("[data-m]");
    ghost.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await wait();
    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.dataIndex).toBeGreaterThanOrEqual(0);
    document.body.removeChild(el);
  });

  it("legend click toggles series visible", async () => {
    const el = createChart({ series: [{ name: "A", data: [1, 2] }, { name: "B", data: [3, 4] }] });
    await wait();
    const items = el.shadowRoot.querySelectorAll(".z-chart__legend-item");
    items[1].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await wait();
    expect(el.querySelectorAll("z-chart-series")[1].visible).toBe(false);
    expect(el.shadowRoot.querySelector(".z-chart__legend-item--hidden")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("legend toggle emits z-series-toggle with original indices in hidden", async () => {
    const el = createChart({ series: [{ name: "A", data: [1] }, { name: "B", data: [2] }, { name: "C", data: [3] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-series-toggle", handler);
    let items = el.shadowRoot.querySelectorAll(".z-chart__legend-item");
    items[0].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await wait();
    // legend 重绘后重新查询（旧 NodeList 引用已失效）
    items = el.shadowRoot.querySelectorAll(".z-chart__legend-item");
    items[2].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await wait();
    const last = handler.mock.calls[handler.mock.calls.length - 1][0].detail;
    expect(last.hidden).toEqual([0, 2]);
    document.body.removeChild(el);
  });
});

describe("z-chart events and data", () => {
  it("emits z-ready once with type and size", async () => {
    const handler = vi.fn();
    const el = createChart({ series: [{ data: [1, 2] }] });
    el.addEventListener("z-ready", handler);
    await wait();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ type: "bar" });
    expect(handler.mock.calls[0][0].detail.width).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it("emits z-resize when explicit size changes", async () => {
    const el = createChart({ attrs: { width: "300", height: "200" }, series: [{ data: [1, 2] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-resize", handler);
    el.setAttribute("width", "500");
    await wait();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toMatchObject({ width: 500, height: 200 });
    document.body.removeChild(el);
  });

  it("series data change triggers redraw", async () => {
    const el = createChart({ series: [{ name: "A", data: [1, 2, 3] }] });
    await wait();
    const before = el.shadowRoot.querySelectorAll("rect").length;
    const series = el.querySelector("z-chart-series");
    series.data = [1, 2, 3, 4, 5];
    await wait();
    expect(el.shadowRoot.querySelectorAll("rect").length).toBeGreaterThan(before);
    document.body.removeChild(el);
  });

  it("format=percent formats tooltip values", async () => {
    const el = createChart({ series: [{ name: "A", format: "percent", data: [0.25] }] });
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-tooltip-change", handler);
    const ghost = el.shadowRoot.querySelector("[data-m]");
    ghost.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, composed: true }));
    await wait();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.values[0].formatted).toContain("%");
    document.body.removeChild(el);
  });
});
