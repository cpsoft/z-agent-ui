// Test: z-datepicker — single/range modes, min/max, keyboard, locale, events
// Related: [[REQ-004-datepicker]]
// Wiki: wiki/requirements/REQ-004-datepicker.md
// Date: 2026-08-06
// Author: AI

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/datepicker/Datepicker";
// [WHY 2026-11-15 拆成两个模块] 纯算术下沉到 core/date（L0，L3 也要用），
// 只剩「文案 + 表格标记」留在 L1。测试跟着拆，否则会把「下沉」这件事测回原形。
import {
  parseISO,
  formatISO,
  addDays,
  isISOInRange,
  buildGrid,
  getFirstDayOfWeek,
} from "../../../src/core/date/calendar";
import { getMonthLabel, renderGridTable } from "../../../src/components/datepicker/calendar";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

// 属性在 appendChild 之后设置（setAttribute-before-connectedCallback lesson）
function createDatepicker(): any {
  const el = document.createElement("z-datepicker") as any;
  el.innerHTML = '<button slot="trigger">Pick</button>';
  document.body.appendChild(el);
  return el;
}

function getPanel(): HTMLElement | null {
  const all = document.querySelectorAll(".z-datepicker__panel");
  return all.length ? (all[all.length - 1] as HTMLElement) : null;
}

async function openPanel(el: any): Promise<void> {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();
}

function clickCell(panel: HTMLElement, iso: string): void {
  const cell = panel.querySelector(`[data-iso="${iso}"]`) as HTMLElement;
  cell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

function focusCell(panel: HTMLElement): HTMLElement | null {
  return panel.querySelector(".z-datepicker__cell--focus");
}

describe("z-datepicker 清空", () => {
  function pressOn(el: any, key: string, target?: Element): boolean {
    const t = target ?? el.querySelector('[slot="trigger"]');
    // composed 不能省：监听挂在宿主上，触发器等在 shadow 外/内，合成事件默认不出影子边界
    return t.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true }),
    );
  }

  it("D1 Delete 清空值并发 z-change", async () => {
    const el = createDatepicker();
    el.value = "2026-08-06";
    el.clearable = true;
    await flush();
    const seen: any[] = [];
    el.addEventListener("z-change", (e: CustomEvent) => seen.push(e.detail));

    expect(pressOn(el, "Delete"), "要消费掉").toBe(false);
    expect(el.value).toBe("");
    expect(seen).toEqual([{ value: "" }]);
  });

  it("D2 没有 clearable 时不清空也不消费", async () => {
    const el = createDatepicker();
    el.value = "2026-08-06";
    await flush();
    expect(pressOn(el, "Delete")).toBe(true);
    expect(el.value).toBe("2026-08-06");
  });

  it("D3 range 模式：只要有一端就清掉两端", async () => {
    const el = createDatepicker();
    el.mode = "range";
    el.start = "2026-08-01";
    el.clearable = true;
    await flush();
    expect(pressOn(el, "Delete")).toBe(false);
    expect([el.start, el.end]).toEqual(["", ""]);
  });

  it("D4 ★ 槽里是可编辑输入框时，Delete 归它（不把能打字的框弄坏）", async () => {
    const el = document.createElement("z-datepicker") as any;
    el.innerHTML = `<input slot="trigger" />`;
    el.value = "2026-08-06";
    el.clearable = true;
    document.body.appendChild(el);
    await flush();
    const input = el.querySelector("input") as HTMLInputElement;

    expect(
      pressOn(el, "Delete", input),
      "这一下要留给输入框删字符，组件不能 preventDefault",
    ).toBe(true);
    expect(el.value).toBe("2026-08-06");
    document.body.removeChild(el);
  });

  it("D5 面板开着时 Delete 不清空", async () => {
    const el = createDatepicker();
    el.value = "2026-08-06";
    el.clearable = true;
    await flush();
    await openPanel(el);
    expect(el.open).toBe(true);
    pressOn(el, "Delete");
    expect(el.value).toBe("2026-08-06");
    document.body.removeChild(el);
  });
});
