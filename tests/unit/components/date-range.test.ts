// Test: z-date-range 双月并排区间选择器（hover 预览/状态机/键盘窗口）
// Related: [[2026-08-11-W15-date]]
// Wiki: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/date-range/DateRange.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createRange(props: Record<string, string> = {}): any {
  const el = document.createElement("z-date-range") as any;
  for (const [k, v] of Object.entries(props)) el.setAttribute(k, v);
  el.innerHTML = '<button slot="trigger">Range</button>';
  document.body.appendChild(el);
  return el;
}

function getPanel(): HTMLElement | null {
  const all = document.querySelectorAll(".z-date-range__panel");
  return all.length ? (all[all.length - 1] as HTMLElement) : null;
}

async function openPanel(el: any): Promise<HTMLElement> {
  // [WHY] 先等 shadow 首帧渲染（微任务），否则 trigger 元素未建（datepicker 测试同款顺序）
  await flush();
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();
  return getPanel()!;
}

function clickCell(panel: HTMLElement, iso: string): void {
  const cell = panel.querySelector(`[data-iso="${iso}"]`) as HTMLElement;
  cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function hoverCell(panel: HTMLElement, iso: string): void {
  const cell = panel.querySelector(`[data-iso="${iso}"]`) as HTMLElement;
  cell.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
}

describe("z-date-range", () => {
  it("opens panel with two month grids", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    expect(panel.querySelectorAll(".z-date-range__grid").length).toBe(2);
    expect(panel.querySelectorAll("[data-iso]").length).toBe(84);
    const label = panel.querySelector(".z-date-range__label").textContent;
    expect(label).toContain("August");
    expect(label).toContain("September");
    expect(label).toContain("2026");
    document.body.removeChild(el);
  });

  it("right grid crosses year boundary", async () => {
    const el = createRange({ start: "2026-12-10", locale: "en-US" });
    const panel = await openPanel(el);
    const label = panel.querySelector(".z-date-range__label").textContent;
    expect(label).toContain("December");
    expect(label).toContain("January");
    expect(label).toContain("2027");
    expect(panel.querySelector('[data-iso="2027-01-15"]')).toBeTruthy();
    document.body.removeChild(el);
  });

  it("click completes pending range seeded by start attribute", async () => {
    // [WHY] start 属性视为进行中区间的起点：首次点击直接完成区间
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    clickCell(panel, "2026-08-12");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ start: "2026-08-10", end: "2026-08-12" });
    expect(el.end).toBe("2026-08-12");
    document.body.removeChild(el);
  });

  it("selects start then end, emits z-change", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    el.start = ""; // 清空种子区间，从零选择（视图已定位在 8/9 月）
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    clickCell(panel, "2026-08-12");
    expect(handler).not.toHaveBeenCalled();
    expect(el.start).toBe("2026-08-12");
    clickCell(panel, "2026-08-18");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ start: "2026-08-12", end: "2026-08-18" });
    expect(el.end).toBe("2026-08-18");
    expect(panel.querySelector('[data-iso="2026-08-12"]').classList.contains("z-date-range__cell--range-start")).toBe(true);
    expect(panel.querySelector('[data-iso="2026-08-15"]').classList.contains("z-date-range__cell--range-in")).toBe(true);
    document.body.removeChild(el);
  });

  it("reverse click resets start", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    el.start = "";
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    clickCell(panel, "2026-08-20");
    expect(el.start).toBe("2026-08-20");
    expect(el.end).toBe("");
    // 点击早于 start 的日期 → 重置 start 而非完成区间
    clickCell(panel, "2026-08-05");
    expect(el.start).toBe("2026-08-05");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("hover preview highlights pending range", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    el.start = "";
    await flush();
    clickCell(panel, "2026-08-12"); // pending start
    hoverCell(panel, "2026-08-16");
    const mid = panel.querySelector('[data-iso="2026-08-14"]');
    expect(mid.classList.contains("z-date-range__cell--range-in")).toBe(true);
    // 反方向 hover：pendingStart 之前 → 不预览（重渲染后需重新查询节点）
    hoverCell(panel, "2026-08-08");
    const mid2 = panel.querySelector('[data-iso="2026-08-14"]');
    expect(mid2.classList.contains("z-date-range__cell--range-in")).toBe(false);
    document.body.removeChild(el);
  });

  it("min/max disable out-of-range cells", async () => {
    const el = createRange({ start: "2026-08-10", min: "2026-08-12", max: "2026-08-20", locale: "en-US" });
    const panel = await openPanel(el);
    expect(panel.querySelector('[data-iso="2026-08-11"]').getAttribute("aria-disabled")).toBe("true");
    expect(panel.querySelector('[data-iso="2026-08-21"]').getAttribute("aria-disabled")).toBe("true");
    expect(panel.querySelector('[data-iso="2026-08-15"]').getAttribute("aria-disabled")).toBe("false");
    document.body.removeChild(el);
  });

  it("click outside closes panel", async () => {
    const el = createRange({ start: "2026-08-10" });
    const panel = await openPanel(el);
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    // [WHY] 关闭动画 200ms 后移除（happy-dom 无 animationend，setTimeout 兜底）
    await new Promise((r) => setTimeout(r, 250));
    expect(getPanel()).toBeNull();
    document.body.removeChild(el);
  });

  it("Escape closes panel", async () => {
    const el = createRange({ start: "2026-08-10" });
    const panel = await openPanel(el);
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("keyboard ArrowRight crosses into right month and shifts view", async () => {
    const el = createRange({ start: "2026-08-31", locale: "en-US" });
    const panel = await openPanel(el);
    const focus = () => panel.querySelector(".z-date-range__cell--focus");
    // 08-31 在右月（9 月）内还有 09-01... 先移到右月边界：连续按到 09-30
    // 简化：直接测从窗口右缘跳出 → 视图平移
    const last = panel.querySelector('[data-iso="2026-09-30"]') as HTMLElement;
    // 把焦点引到 09-30（重置选择后焦点在 seed 08-31；用键盘走到 09-30 太长，
    // 直接校验窗口平移逻辑：焦点 09-30 按 ArrowRight → 窗口右移 → 09-31→10-01）
    last.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    last.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    await flush();
    // 用键盘：焦点当前在 08-31（seed），不可直接到 09-30——改用视图无关断言：
    // 焦点 08-31 按 PageDown（平移）后焦点 = 新左月 1 日（09-01），再 ArrowRight → 09-02
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    expect(focus().dataset.iso).toBe("2026-09-01");
    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(focus().dataset.iso).toBe("2026-09-02");
    // 右月内连按到 09-30（09-02 + 28 天）→ 再按跳出窗口右缘 → 视图平移
    for (let i = 0; i < 29; i++) {
      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    }
    expect(focus().dataset.iso).toBe("2026-10-01");
    const label = panel.querySelector(".z-date-range__label").textContent;
    expect(label).toContain("October");
    document.body.removeChild(el);
  });

  it("★ 到 min 边界仍能移动焦点（原先按 ← 完全不动）", async () => {
    // 与 calendar / datepicker 同源：`_moveFocus` 原来用 `_isSelectable` 拦，
    // 落在 min 当天按 ← 焦点一动不动，用户无法区分「键盘坏了」与「这天不可选」。
    // date-range 有左右两个月共 84 格，这个缺陷更容易撞上（窗口两端都是边界）。
    const el = createRange({ start: "2026-08-10", min: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    expect(
      panel.querySelector('[data-iso="2026-08-09"]')!.getAttribute("aria-disabled"),
      "先确认 08-09 确实被标禁用，否则测的不是边界",
    ).toBe("true");

    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(panel.querySelector(".z-date-range__cell--focus")!.dataset.iso).toBe("2026-08-09");
    document.body.removeChild(el);
  });

  it("nav prev/next shifts both months", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    panel
      .querySelector('[data-nav="next"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    let label = panel.querySelector(".z-date-range__label").textContent;
    expect(label).toContain("September");
    expect(label).toContain("October");
    panel
      .querySelector('[data-nav="prev"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    panel
      .querySelector('[data-nav="prev"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    label = panel.querySelector(".z-date-range__label").textContent;
    expect(label).toContain("July");
    expect(label).toContain("August");
    document.body.removeChild(el);
  });

  it("external min change re-renders open panel", async () => {
    const el = createRange({ start: "2026-08-10", locale: "en-US" });
    const panel = await openPanel(el);
    el.setAttribute("min", "2026-08-15");
    await flush();
    expect(panel.querySelector('[data-iso="2026-08-12"]').getAttribute("aria-disabled")).toBe("true");
    expect(panel.querySelector('[data-iso="2026-08-16"]').getAttribute("aria-disabled")).toBe("false");
    document.body.removeChild(el);
  });
});
