// Test: z-time-picker 时分秒滚动列（24/12 小时/秒列/键盘/事件）
// Related: [[2026-08-11-W15-date]]
// Wiki: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/time-picker/TimePicker.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createPicker(props: Record<string, string | number | boolean> = {}): any {
  const el = document.createElement("z-time-picker") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  el.innerHTML = '<button slot="trigger">Time</button>';
  document.body.appendChild(el);
  return el;
}

function getPanel(): HTMLElement | null {
  // [WHY] 排除关闭动画残留（--hiding 200ms 后才移除），避免跨用例误取
  const all = document.querySelectorAll(".z-time-picker__panel:not(.z-time-picker__panel--hiding)");
  return all.length ? (all[all.length - 1] as HTMLElement) : null;
}

async function openPanel(el: any): Promise<HTMLElement> {
  // [WHY] 先等 shadow 首帧渲染（微任务），否则 trigger 元素未建
  await flush();
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();
  return getPanel()!;
}

function col(panel: HTMLElement, name: string): HTMLElement {
  return panel.querySelector(`[data-col="${name}"]`) as HTMLElement;
}

function item(panel: HTMLElement, colName: string, index: number): HTMLElement {
  return col(panel, colName).querySelectorAll(".z-time-picker__item")[index] as HTMLElement;
}

function selected(panel: HTMLElement, colName: string): number {
  const items = col(panel, colName).querySelectorAll(".z-time-picker__item");
  for (let i = 0; i < items.length; i++) {
    if (items[i].classList.contains("z-time-picker__item--selected")) return i;
  }
  return -1;
}

describe("z-time-picker", () => {
  it("opens panel with hour and minute columns", async () => {
    const el = createPicker({ value: "14:30", locale: "en-US" });
    const panel = await openPanel(el);
    expect(col(panel, "hour").querySelectorAll(".z-time-picker__item").length).toBe(24);
    expect(col(panel, "minute").querySelectorAll(".z-time-picker__item").length).toBe(60);
    expect(panel.querySelector('[data-col="second"]')).toBeNull();
    expect(selected(panel, "hour")).toBe(14);
    expect(selected(panel, "minute")).toBe(30);
    document.body.removeChild(el);
  });

  it("second=true adds second column and formats value with seconds", async () => {
    const el = createPicker({ value: "14:30:45", second: true });
    const panel = await openPanel(el);
    expect(col(panel, "second").querySelectorAll(".z-time-picker__item").length).toBe(60);
    expect(selected(panel, "second")).toBe(45);
    document.body.removeChild(el);
  });

  it("format=12 shows 1-12 hours and AM/PM column", async () => {
    const el = createPicker({ value: "14:30", format: "12" });
    const panel = await openPanel(el);
    expect(col(panel, "hour").querySelectorAll(".z-time-picker__item").length).toBe(12);
    expect(selected(panel, "hour")).toBe(1); // 14 → 下午 2
    expect(selected(panel, "ampm")).toBe(1); // PM
    // 午夜 0 点 → 上午 12
    const el2 = createPicker({ value: "00:05", format: "12" });
    const panel2 = await openPanel(el2);
    expect(selected(panel2, "hour")).toBe(11); // 12 AM
    expect(selected(panel2, "ampm")).toBe(0);
    document.body.removeChild(el);
    document.body.removeChild(el2);
  });

  it("click hour item updates value and emits z-change", async () => {
    const el = createPicker({ value: "14:30" });
    const panel = await openPanel(el);
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    item(panel, "hour", 9).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.value).toBe("09:30");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: "09:30" });
    expect(selected(panel, "hour")).toBe(9);
    document.body.removeChild(el);
  });

  it("AM/PM click converts 24h value", async () => {
    const el = createPicker({ value: "14:30", format: "12" });
    const panel = await openPanel(el);
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    item(panel, "ampm", 0).dispatchEvent(new MouseEvent("click", { bubbles: true })); // → AM
    expect(el.value).toBe("02:30");
    expect(handler.mock.calls[0][0].detail.value).toBe("02:30");
    // 12h 内点击小时 12 → 12 AM 语义（0 点）
    item(panel, "hour", 11).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.value).toBe("00:30");
    document.body.removeChild(el);
  });

  it("step=5 minute column has 12 items", async () => {
    const el = createPicker({ value: "14:13", step: 5 });
    const panel = await openPanel(el);
    expect(col(panel, "minute").querySelectorAll(".z-time-picker__item").length).toBe(12);
    // 13 → 最近的 5 的倍数 15
    expect(selected(panel, "minute")).toBe(3);
    document.body.removeChild(el);
  });

  it("scroll column updates selection", async () => {
    const el = createPicker({ value: "14:30" });
    const panel = await openPanel(el);
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const hcol = col(panel, "hour");
    hcol.scrollTop = 5 * 28; // 第 5 项
    hcol.dispatchEvent(new Event("scroll"));
    expect(el.value).toBe("05:30");
    expect(selected(panel, "hour")).toBe(5);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("ArrowUp/ArrowDown adjust focused column", async () => {
    const el = createPicker({ value: "14:30" });
    const panel = await openPanel(el);
    const mcol = col(panel, "minute");
    mcol.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(el.value).toBe("14:29");
    mcol.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    mcol.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(el.value).toBe("14:31");
    document.body.removeChild(el);
  });

  it("Enter closes panel", async () => {
    const el = createPicker({ value: "14:30" });
    const panel = await openPanel(el);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("Escape closes panel", async () => {
    const el = createPicker({ value: "14:30" });
    const panel = await openPanel(el);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("click outside closes panel", async () => {
    const el = createPicker({ value: "14:30" });
    await openPanel(el);
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("disabled blocks open", async () => {
    const el = createPicker({ value: "14:30", disabled: true });
    await flush();
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    expect(getPanel()).toBeNull();
    document.body.removeChild(el);
  });

  it("invalid value defaults to 00:00", async () => {
    const el = createPicker({ value: "99:99" });
    const panel = await openPanel(el);
    expect(selected(panel, "hour")).toBe(0);
    expect(selected(panel, "minute")).toBe(0);
    document.body.removeChild(el);
  });
});
