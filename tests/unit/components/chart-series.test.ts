// Test: z-chart-series 数据系列子元素（render null + z-series-change 通知）
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect, vi } from "vitest";
import "../../../src/report/chart/ChartSeries";

const wait = () => new Promise((r) => setTimeout(r, 0));

describe("z-chart-series", () => {
  it("renders nothing (render(): null)", async () => {
    const el = document.createElement("z-chart-series") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.render()).toBeNull();
    expect(el.shadowRoot!.innerHTML).toBe("");
    document.body.removeChild(el);
  });

  it("reflects string attributes", async () => {
    const el = document.createElement("z-chart-series") as any;
    document.body.appendChild(el);
    await wait();
    el.setAttribute("name", "Sales");
    el.setAttribute("type", "bar");
    el.setAttribute("color", "#ff0000");
    el.setAttribute("y-axis", "right");
    el.setAttribute("format", "percent");
    expect(el.name).toBe("Sales");
    expect(el.type).toBe("bar");
    expect(el.color).toBe("#ff0000");
    expect(el.yAxis).toBe("right");
    expect(el.format).toBe("percent");
    document.body.removeChild(el);
  });

  it("keeps data as DOM property (attribute:false)", () => {
    const el = document.createElement("z-chart-series") as any;
    el.data = [1, 2, 3];
    expect(el.getAttribute("data")).toBeNull();
    expect(el.data).toEqual([1, 2, 3]);
  });

  it("emits z-series-change when data changes", async () => {
    const el = document.createElement("z-chart-series") as any;
    document.body.appendChild(el);
    await wait();
    const handler = vi.fn();
    el.addEventListener("z-series-change", handler);
    el.data = [5, 6, 7];
    await wait();
    expect(handler).toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
