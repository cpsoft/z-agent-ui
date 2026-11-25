// Test: z-chart-axis 轴配置子元素（render null + 显式属性判定）
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import "../../../src/report/chart/ChartAxis";

const wait = () => new Promise((r) => setTimeout(r, 0));

describe("z-chart-axis", () => {
  it("renders nothing (render(): null)", async () => {
    const el = document.createElement("z-chart-axis") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.render()).toBeNull();
    expect(el.shadowRoot!.innerHTML).toBe("");
    document.body.removeChild(el);
  });

  it("reflects string attributes with defaults", async () => {
    const el = document.createElement("z-chart-axis") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.position).toBe("bottom");
    expect(el.type).toBe("auto");
    expect(el.grid).toBe(true);
    el.setAttribute("position", "left");
    el.setAttribute("title", "Revenue");
    el.setAttribute("tick-count", "5");
    expect(el.position).toBe("left");
    expect(el.title).toBe("Revenue");
    expect(el.tickCount).toBe(5);
    document.body.removeChild(el);
  });

  it("minValue/maxValue only apply when attribute is explicitly set", async () => {
    const el = document.createElement("z-chart-axis") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.minValue).toBeUndefined();
    expect(el.maxValue).toBeUndefined();
    el.setAttribute("min", "10");
    el.setAttribute("max", "100");
    expect(el.minValue).toBe(10);
    expect(el.maxValue).toBe(100);
    document.body.removeChild(el);
  });

  it("gridOverride only applies when grid attribute is explicitly set", async () => {
    const el = document.createElement("z-chart-axis") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.gridOverride).toBeUndefined();
    el.setAttribute("grid", "false");
    expect(el.gridOverride).toBe(false);
    document.body.removeChild(el);
  });
});
