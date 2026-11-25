// Test: z-statistic 统计数字
// Related: [[2026-08-11-W17-data]]
// Wiki: wiki/planning/TASKS/2026-08-11-W17-data/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/statistic/Statistic.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createStat(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-statistic") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  return el;
}

function valueText(el: any): string {
  return el.shadowRoot!.querySelector(".z-statistic__value")?.textContent ?? "";
}

describe("z-statistic", () => {
  it("renders value", async () => {
    const el = createStat({ value: 42 });
    await flush();
    expect(valueText(el)).toBe("42");
    document.body.removeChild(el);
  });

  it("separator adds thousands grouping", async () => {
    const el = createStat({ value: 1234567, separator: true });
    await flush();
    expect(valueText(el)).toBe("1,234,567");
    document.body.removeChild(el);
  });

  it("no separator by default", async () => {
    const el = createStat({ value: 1234567 });
    await flush();
    expect(valueText(el)).toBe("1234567");
    document.body.removeChild(el);
  });

  it("precision pads decimals", async () => {
    const el = createStat({ value: 3.5, precision: 2 });
    await flush();
    expect(valueText(el)).toBe("3.50");
    document.body.removeChild(el);
  });

  it("prefix and suffix render", async () => {
    const el = createStat({ value: 99, prefix: "¥", suffix: "元" });
    await flush();
    const text = el.shadowRoot!.textContent;
    expect(text).toContain("¥");
    expect(text).toContain("元");
    document.body.removeChild(el);
  });

  it("count-up animates to value and emits z-change", async () => {
    const el = createStat({ value: 100, "count-up": true, duration: 50 });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    await new Promise((r) => setTimeout(r, 150));
    expect(valueText(el)).toBe("100");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: 100 });
    document.body.removeChild(el);
  });

  it("count-up starts from 0", async () => {
    const el = createStat({ value: 100, "count-up": true, duration: 100 });
    await flush();
    await new Promise((r) => setTimeout(r, 30));
    const mid = Number(valueText(el).replace(/,/g, ""));
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(100);
    document.body.removeChild(el);
  });

  it("value change mid-animation restarts from current", async () => {
    const el = createStat({ value: 100, "count-up": true, duration: 200 });
    await flush();
    await new Promise((r) => setTimeout(r, 60));
    el.value = 200;
    await new Promise((r) => setTimeout(r, 300));
    expect(valueText(el)).toBe("200");
    document.body.removeChild(el);
  });

  it("no count-up when value is 0", async () => {
    const el = createStat({ value: 0, countUp: true });
    await flush();
    expect(valueText(el)).toBe("0");
    document.body.removeChild(el);
  });

  it("negative value renders minus sign", async () => {
    const el = createStat({ value: -5 });
    await flush();
    expect(valueText(el)).toBe("-5");
    document.body.removeChild(el);
  });
});
