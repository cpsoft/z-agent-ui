// Test: z-calendar 独立月历面板（42 格网格/键盘导航/禁用/事件）
// Related: [[2026-08-11-W15-date]]
// Wiki: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/calendar/Calendar.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createCalendar(props: Record<string, string | boolean> = {}): any {
  const el = document.createElement("z-calendar") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, v);
    }
  }
  document.body.appendChild(el);
  return el;
}

function cell(el: any, iso: string): HTMLElement | null {
  return el.shadowRoot.querySelector(`[data-iso="${iso}"]`);
}

function key(el: any, key: string, opts: { shiftKey?: boolean } = {}): void {
  el.shadowRoot
    .querySelector(".z-calendar__cell--focus")
    .dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...opts }));
}

describe("z-calendar", () => {
  it("renders 42 cells with month label from value", async () => {
    const el = createCalendar({ value: "2026-08-15", locale: "en-US" });
    await flush();
    expect(el.shadowRoot.querySelectorAll("[data-iso]").length).toBe(42);
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("August");
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("2026");
    document.body.removeChild(el);
  });

  it("selects value cell with aria-selected", async () => {
    const el = createCalendar({ value: "2026-08-15", locale: "en-US" });
    await flush();
    const c = cell(el, "2026-08-15");
    expect(c.classList.contains("z-calendar__cell--selected")).toBe(true);
    expect(c.getAttribute("aria-selected")).toBe("true");
    expect(c.getAttribute("tabindex")).toBe("0");
    document.body.removeChild(el);
  });

  it("min/max disable out-of-range cells", async () => {
    const el = createCalendar({ value: "2026-08-15", min: "2026-08-10", max: "2026-08-20" });
    await flush();
    expect(cell(el, "2026-08-09").getAttribute("aria-disabled")).toBe("true");
    expect(cell(el, "2026-08-21").getAttribute("aria-disabled")).toBe("true");
    expect(cell(el, "2026-08-15").getAttribute("aria-disabled")).toBe("false");
    document.body.removeChild(el);
  });

  it("show-outside=false hides out-month cells, true dims them", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    await flush();
    // 2026-08-01 为周六 → 网格起点 2026-07-26（周日）
    expect(cell(el, "2026-07-26").classList.contains("z-calendar__cell--hidden")).toBe(true);
    expect(cell(el, "2026-09-05").classList.contains("z-calendar__cell--hidden")).toBe(true);
    document.body.removeChild(el);

    const el2 = createCalendar({ value: "2026-08-15", "show-outside": true });
    await flush();
    expect(cell(el2, "2026-07-26").classList.contains("z-calendar__cell--out")).toBe(true);
    expect(cell(el2, "2026-07-26").classList.contains("z-calendar__cell--hidden")).toBe(false);
    document.body.removeChild(el2);
  });

  it("disabled-dates array disables matching cells", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    el.disabledDates = ["2026-08-13", "2026-08-17"];
    await flush();
    expect(cell(el, "2026-08-13").getAttribute("aria-disabled")).toBe("true");
    expect(cell(el, "2026-08-14").getAttribute("aria-disabled")).toBe("false");
    document.body.removeChild(el);
  });

  it("click selectable cell selects and emits z-change", async () => {
    const el = createCalendar({ value: "2026-08-15", locale: "en-US" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    cell(el, "2026-08-12").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.value).toBe("2026-08-12");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: "2026-08-12" });
    expect(cell(el, "2026-08-12").classList.contains("z-calendar__cell--selected")).toBe(true);
    document.body.removeChild(el);
  });

  it("click disabled cell does not emit z-change", async () => {
    const el = createCalendar({ value: "2026-08-15", min: "2026-08-10" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    cell(el, "2026-08-05").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    expect(el.value).toBe("2026-08-15");
    document.body.removeChild(el);
  });

  it("click out-month cell does not select", async () => {
    const el = createCalendar({ value: "2026-08-15", "show-outside": true });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    cell(el, "2026-07-26").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("nav next changes view and emits z-month-change", async () => {
    const el = createCalendar({ value: "2026-08-15", locale: "en-US" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-month-change", handler);
    el.shadowRoot
      .querySelector('[data-nav="next"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("September");
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { year: 2026, month: 8 } }));
    document.body.removeChild(el);
  });

  it("nav prev crosses year boundary", async () => {
    const el = createCalendar({ value: "2026-01-15", locale: "en-US" });
    await flush();
    el.shadowRoot
      .querySelector('[data-nav="prev"]')
      .dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("December");
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("2025");
    document.body.removeChild(el);
  });

  it("ArrowRight moves focus to next day", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    await flush();
    key(el, "ArrowRight");
    const focused = el.shadowRoot.querySelector(".z-calendar__cell--focus");
    expect(focused.dataset.iso).toBe("2026-08-16");
    document.body.removeChild(el);
  });

  it("ArrowRight crosses month boundary and updates view", async () => {
    const el = createCalendar({ value: "2026-08-31", locale: "en-US" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-month-change", handler);
    key(el, "ArrowRight");
    expect(el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso).toBe("2026-09-01");
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("September");
    expect(handler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("Enter selects focused cell", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    key(el, "ArrowRight"); // 焦点 08-16
    key(el, "Enter");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ value: "2026-08-16" });
    expect(el.value).toBe("2026-08-16");
    document.body.removeChild(el);
  });

  it("PageDown moves to next month keeping focus", async () => {
    const el = createCalendar({ value: "2026-08-15", locale: "en-US" });
    await flush();
    key(el, "PageDown");
    expect(el.shadowRoot.querySelector(".z-calendar__label").textContent).toContain("September");
    // 焦点保留在 15 号
    expect(el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso).toBe("2026-09-15");
    document.body.removeChild(el);
  });

  // ── 禁用日期与焦点移动 ────────────────────────────────────────────────────
  //
  // [2026-11-16 改判] 这一组原来只有一条：`Arrow blocked by disabled cell stays put`
  // —— 它把缺陷当成了规格。实际后果是**按了没反应**：用户落在禁用日期上按 →，
  // 焦点一动不动、也没有任何提示，他无法区分「键盘坏了」与「这天不可选」。
  //
  // 判断依据是 ARIA APG 网格模式：不可选的单元格要**可聚焦**并标 `aria-disabled`，
  // 只是不能激活 —— 与本库既有的原则一致（`aria-disabled` 而非原生 `disabled`：
  // 可达可念、不可激活，`z-app-switcher` 那轮定过）。
  // 现在：焦点移动只要求日期有效；可选性只在「选中」（Enter / 点击）时判。

  it("★ 箭头走进禁用日期：焦点移动，但 Enter 不选中", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    el.disabledDates = ["2026-08-16"];
    await flush();
    const onChange = vi.fn();
    el.addEventListener("z-change", onChange);

    key(el, "ArrowRight");
    expect(
      el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso,
      "按 → 落在禁用日期上必须移动（停住 = 按了没反应）",
    ).toBe("2026-08-16");
    expect(cell(el, "2026-08-16").getAttribute("aria-disabled")).toBe("true");
    expect(cell(el, "2026-08-16").getAttribute("tabindex"), "焦点格必须是唯一 Tab 停靠点").toBe("0");

    key(el, "Enter");
    expect(onChange, "禁用日期不能被选中").not.toHaveBeenCalled();
    expect(el.value).toBe("2026-08-15");
    document.body.removeChild(el);
  });

  it("★ min 边界同理：到边界后仍能移动焦点，只是选不中", async () => {
    const el = createCalendar({ value: "2026-08-15", min: "2026-08-15" });
    await flush();

    key(el, "ArrowLeft");
    expect(
      el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso,
      "min 当天按 ← 原本完全不动 —— 与「键盘坏了」在界面上无法区分",
    ).toBe("2026-08-14");

    key(el, "Enter");
    expect(el.value).toBe("2026-08-15");
    document.body.removeChild(el);
  });

  it("★ 连续禁用几天时，焦点逐格穿过（不是卡在第一格）", async () => {
    const el = createCalendar({ value: "2026-08-15" });
    el.disabledDates = ["2026-08-16", "2026-08-17", "2026-08-18"];
    await flush();

    key(el, "ArrowRight");
    key(el, "ArrowRight");
    key(el, "ArrowRight");
    expect(el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso).toBe("2026-08-18");

    key(el, "ArrowRight");
    expect(el.shadowRoot.querySelector(".z-calendar__cell--focus").dataset.iso).toBe("2026-08-19");
    document.body.removeChild(el);
  });

  it("★ 焦点格始终只有一个 tabindex=0（禁用日期也不例外）", async () => {
    // roving 的核心不变式：整张网格一个停靠点。禁用格被跳过时若没搬 tabindex，
    // Tab 进来会停在**上一个**日期上 —— 而焦点环画在别处。
    const el = createCalendar({ value: "2026-08-15" });
    el.disabledDates = ["2026-08-16"];
    await flush();
    key(el, "ArrowRight");

    const stops = [...el.shadowRoot.querySelectorAll<HTMLElement>("[data-iso]")].filter(
      (c) => c.getAttribute("tabindex") === "0",
    );
    expect(stops).toHaveLength(1);
    expect(stops[0].dataset.iso).toBe("2026-08-16");
    document.body.removeChild(el);
  });
});
