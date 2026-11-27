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

describe("z-datepicker", () => {
  describe("registration and render", () => {
    it("defines custom element and renders trigger wrapper", async () => {
      const el = createDatepicker();
      await flush();

      expect(customElements.get("z-datepicker")).toBeDefined();
      const trigger = el.shadowRoot.querySelector(".z-datepicker__trigger");
      expect(trigger).toBeDefined();
      // [WHY 断言的是按钮而不是容器] 这两个属性是**触发器**的语义，必须落在槽里那个
      // 可聚焦件上。写在 `<span part="trigger">` 上无障碍树不承认（2026-11-16 CDP 实测）。
      const button = el.querySelector('button[slot="trigger"]') as HTMLElement;
      expect(button.getAttribute("aria-haspopup")).toBe("dialog");
      // 原注释写「html() 中 false 渲染为空字符串」——那是在描述缺陷而不是规格：
      // `aria-expanded=""` 对读屏是「未知状态」，等于没说。现在是 "false"。
      expect(button.getAttribute("aria-expanded")).toBe("false");
      expect(trigger.getAttribute("aria-haspopup"), "容器上不该再有这一份").toBeNull();
      document.body.removeChild(el);
    });

    it("has default property values", async () => {
      const el = createDatepicker();
      await flush();

      expect(el.open).toBe(false);
      expect(el.mode).toBe("single");
      expect(el.value).toBe("");
      expect(el.start).toBe("");
      expect(el.end).toBe("");
      document.body.removeChild(el);
    });

    it("preserves slotted trigger element", async () => {
      const el = createDatepicker();
      await flush();

      const trigger = el.querySelector('button[slot="trigger"]');
      expect(trigger).not.toBeNull();
      expect(trigger!.textContent).toBe("Pick");
      document.body.removeChild(el);
    });
  });

  describe("single mode", () => {
    it("opens panel and emits z-datepicker-open on trigger click", async () => {
      const el = createDatepicker();
      await flush();

      const openHandler = vi.fn();
      el.addEventListener("z-datepicker-open", openHandler);
      await openPanel(el);

      expect(el.open).toBe(true);
      const panel = getPanel();
      expect(panel).not.toBeNull();
      expect(panel!.getAttribute("role")).toBe("dialog");
      expect(openHandler).toHaveBeenCalledTimes(1);
      document.body.removeChild(el);
    });

    it("renders a fixed 42-cell grid for the seeded month", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      const panel = getPanel()!;
      expect(panel.querySelectorAll('[role="gridcell"]').length).toBe(42);
      // August 2026 has 31 in-month cells; all carry 2026-08-xx ISO
      expect(panel.querySelectorAll('[data-iso^="2026-08-"]').length).toBe(31);
      document.body.removeChild(el);
    });

    it("selects a day, emits z-change, closes panel and emits z-datepicker-close", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      const changeHandler = vi.fn();
      const closeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);
      el.addEventListener("z-datepicker-close", closeHandler);

      clickCell(getPanel()!, "2026-08-15");
      await flush();

      expect(el.value).toBe("2026-08-15");
      expect(changeHandler.mock.calls[0][0].detail).toEqual({ value: "2026-08-15" });
      expect(el.open).toBe(false);
      expect(closeHandler).toHaveBeenCalledTimes(1);
      document.body.removeChild(el);
    });

    it("closes on document mousedown outside", async () => {
      const el = createDatepicker();
      await flush();
      await openPanel(el);
      expect(el.open).toBe(true);

      document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      await flush();
      expect(el.open).toBe(false);
      document.body.removeChild(el);
    });

    it("reflects value to the attribute", async () => {
      const el = createDatepicker();
      await flush();
      el.value = "2026-08-06";
      await flush();

      expect(el.getAttribute("value")).toBe("2026-08-06");
      document.body.removeChild(el);
    });
  });

  describe("range mode state machine", () => {
    it("first click sets start without emitting z-change", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份: 无 value/start/end 时月份取系统今天, 硬编码 2026-08 的网格
      // 在 2026-09-01 后自然失效(8 月格子不存在); value 仅作月份种子, 不影响 range 状态机
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      const changeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);

      clickCell(getPanel()!, "2026-08-06");
      await flush();

      expect(el.start).toBe("2026-08-06");
      expect(el.end).toBe("");
      expect(changeHandler).not.toHaveBeenCalled();
      expect(el.open).toBe(true);
      document.body.removeChild(el);
    });

    it("second click after start completes the range and emits z-change", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份: 无 value/start/end 时月份取系统今天, 硬编码 2026-08 的网格
      // 在 2026-09-01 后自然失效(8 月格子不存在); value 仅作月份种子, 不影响 range 状态机
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      const changeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);

      clickCell(getPanel()!, "2026-08-06");
      await flush();
      clickCell(getPanel()!, "2026-08-12");
      await flush();

      expect(el.end).toBe("2026-08-12");
      expect(changeHandler).toHaveBeenCalledTimes(1);
      expect(changeHandler.mock.calls[0][0].detail).toEqual({
        start: "2026-08-06",
        end: "2026-08-12",
      });
      expect(el.open).toBe(true);
      document.body.removeChild(el);
    });

    // Related: Gitee IKRAOS —— range 模式在 z-change 里同步 close() 不应抛错
    it("closing synchronously inside z-change does not throw", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份，理由同上一条
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      // [WHY] "选完区间立刻收起" 是最常见的宿主写法。close() 会同步把
      // floatingPanel._panel 置 null（floatingPanel.ts:110），而 _selectISO 在 emit 之后
      // 还要重渲染面板 —— 实现若仍用 `panel!`，这里就是 null.innerHTML。
      // 变异判据：把 _repaintPanel() 换回 _renderPanelTo(this._floating.panel!) 本用例必红
      // （happy-dom 会把监听器里的异常抛回 dispatchEvent 调用点，已实测）。
      el.addEventListener("z-change", () => el.close());

      clickCell(getPanel()!, "2026-08-06");
      await flush();
      expect(() => clickCell(getPanel()!, "2026-08-12")).not.toThrow();
      await flush();

      expect(el.start).toBe("2026-08-06");
      expect(el.end).toBe("2026-08-12");
      expect(el.open).toBe(false);
      document.body.removeChild(el);
    });

    it("second click before start resets start", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份: 无 value/start/end 时月份取系统今天, 硬编码 2026-08 的网格
      // 在 2026-09-01 后自然失效(8 月格子不存在); value 仅作月份种子, 不影响 range 状态机
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      const changeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);

      clickCell(getPanel()!, "2026-08-06");
      await flush();
      clickCell(getPanel()!, "2026-08-01");
      await flush();

      expect(el.start).toBe("2026-08-01");
      expect(el.end).toBe("");
      expect(changeHandler).not.toHaveBeenCalled();
      document.body.removeChild(el);
    });

    it("clicking after a completed range starts a fresh pending selection", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份: 无 value/start/end 时月份取系统今天, 硬编码 2026-08 的网格
      // 在 2026-09-01 后自然失效(8 月格子不存在); value 仅作月份种子, 不影响 range 状态机
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      clickCell(getPanel()!, "2026-08-06");
      await flush();
      clickCell(getPanel()!, "2026-08-12");
      await flush();

      clickCell(getPanel()!, "2026-08-20");
      await flush();

      expect(el.start).toBe("2026-08-20");
      expect(el.end).toBe("");
      document.body.removeChild(el);
    });

    it("shows hover preview band and clears it on mouseleave", async () => {
      const el = createDatepicker();
      el.mode = "range";
      // [WHY] 固定面板月份: 无 value/start/end 时月份取系统今天, 硬编码 2026-08 的网格
      // 在 2026-09-01 后自然失效(8 月格子不存在); value 仅作月份种子, 不影响 range 状态机
      el.value = "2026-08-01";
      await flush();
      await openPanel(el);

      clickCell(getPanel()!, "2026-08-06");
      await flush();

      const panel = getPanel()!;
      const hover = panel.querySelector('[data-iso="2026-08-12"]') as HTMLElement;
      hover.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));

      const preview = getPanel()!;
      expect(preview.querySelector('[data-iso="2026-08-07"]')!.classList.contains("z-datepicker__cell--range-in")).toBe(true);
      expect(preview.querySelector('[data-iso="2026-08-11"]')!.classList.contains("z-datepicker__cell--range-in")).toBe(true);
      // [WHY] 预览必须含终点：鼠标停住的那一格若不带 --range-in，就会退回默认 :hover 灰底，
      // 看起来像「选区的终点是个缺口」（2026-10-25 截图复现）。区间外仍不得染色。
      expect(preview.querySelector('[data-iso="2026-08-12"]')!.classList.contains("z-datepicker__cell--range-in")).toBe(true);
      expect(preview.querySelector('[data-iso="2026-08-13"]')!.classList.contains("z-datepicker__cell--range-in")).toBe(false);

      preview.dispatchEvent(new MouseEvent("mouseleave", { bubbles: true }));
      const cleared = getPanel()!;
      expect(cleared.querySelector('[data-iso="2026-08-07"]')!.classList.contains("z-datepicker__cell--range-in")).toBe(false);
      document.body.removeChild(el);
    });
  });

  describe("min/max constraints", () => {
    it("disables dates before min and ignores clicks on them", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      el.min = "2026-08-10";
      await flush();
      await openPanel(el);

      const panel = getPanel()!;
      const before = panel.querySelector('[data-iso="2026-08-09"]') as HTMLElement;
      expect(before.getAttribute("aria-disabled")).toBe("true");
      expect(before.classList.contains("z-datepicker__cell--disabled")).toBe(true);

      const changeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);
      clickCell(panel, "2026-08-09");
      await flush();

      expect(el.value).toBe("2026-08-06");
      expect(changeHandler).not.toHaveBeenCalled();
      expect(el.open).toBe(true);
      document.body.removeChild(el);
    });

    it("disables dates after max", async () => {
      const el = createDatepicker();
      el.value = "2026-08-20";
      el.max = "2026-08-10";
      await flush();
      await openPanel(el);

      const after = getPanel()!.querySelector('[data-iso="2026-08-11"]') as HTMLElement;
      expect(after.getAttribute("aria-disabled")).toBe("true");
      document.body.removeChild(el);
    });

    it("re-renders the open panel when min/max change at runtime", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      el.min = "2026-08-10";
      await flush();
      await openPanel(el);

      const panel = getPanel()!;
      expect(panel.querySelector('[data-iso="2026-08-11"]')!.classList.contains("z-datepicker__cell--disabled")).toBe(false);

      el.min = "2026-08-12";
      await flush();

      const updated = getPanel()!;
      expect(updated.querySelector('[data-iso="2026-08-11"]')!.classList.contains("z-datepicker__cell--disabled")).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe("mode switching", () => {
    it("keeps value/start/end independent when mode changes", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      expect(el.start).toBe("");
      expect(el.end).toBe("");

      el.mode = "range";
      await flush();
      // no value migration; properties stay independent
      expect(el.value).toBe("2026-08-06");
      expect(el.start).toBe("");
      expect(el.end).toBe("");
      document.body.removeChild(el);
    });
  });

  describe("locale", () => {
    it("renders localized month label and weekday headers for zh-CN", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      el.locale = "zh-CN";
      await flush();
      await openPanel(el);

      const panel = getPanel()!;
      expect(panel.querySelector(".z-datepicker__label")!.textContent).toBe("2026年8月");
      const weekdays = Array.from(panel.querySelectorAll(".z-datepicker__weekday")).map(
        (n) => n.textContent,
      );
      expect(weekdays).toContain("周一");
      document.body.removeChild(el);
    });

    it("falls back to navigator.language when locale is empty", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      const label = getPanel()!.querySelector(".z-datepicker__label")!.textContent;
      expect(label).toBe("August 2026");
      document.body.removeChild(el);
    });
  });

  describe("keyboard navigation", () => {
    it("moves focus one day with ArrowRight", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      expect(focusCell(getPanel()!)!.dataset.iso).toBe("2026-08-07");
      document.body.removeChild(el);
    });

    it("selects the focused cell with Enter", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      const changeHandler = vi.fn();
      el.addEventListener("z-change", changeHandler);

      // Move focus to 08-07 first, then Enter selects it
      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await flush();

      expect(el.value).toBe("2026-08-07");
      expect(changeHandler).toHaveBeenCalledTimes(1);
      expect(changeHandler.mock.calls[0][0].detail).toEqual({ value: "2026-08-07" });
      expect(el.open).toBe(false);
      document.body.removeChild(el);
    });

    it("navigates months with PageDown/PageUp", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06";
      await flush();
      await openPanel(el);

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
      expect(getPanel()!.querySelector(".z-datepicker__label")!.textContent).toBe("September 2026");

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
      expect(getPanel()!.querySelector(".z-datepicker__label")!.textContent).toBe("August 2026");
      document.body.removeChild(el);
    });

    it("moves focus to week boundaries with Home/End", async () => {
      const el = createDatepicker();
      el.value = "2026-08-06"; // Thursday
      await flush();
      await openPanel(el);

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
      expect(focusCell(getPanel()!)!.dataset.iso).toBe("2026-08-02"); // Sunday (en-US week start)

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
      expect(focusCell(getPanel()!)!.dataset.iso).toBe("2026-08-08");
      document.body.removeChild(el);
    });

    it("★ 到 min 边界仍能移动焦点（原先按 ← 完全不动）", async () => {
      // [WHY 这条是新判据] 2026-11-16 之前 `_moveFocus` 用 `_isSelectable` 拦，
      // 于是「落在 min 当天按 ←」或「落在 disabled-dates 上按 →」的焦点一动不动
      // —— 用户无法区分「键盘坏了」与「这天不可选」，界面上两者完全相同。
      // APG 网格模式：不可选单元格要**可聚焦**（`aria-disabled`），只是不能激活。
      const el = createDatepicker();
      el.value = "2026-08-10";
      el.min = "2026-08-10";
      await flush();
      await openPanel(el);

      const panel = getPanel()!;
      // 先确认 08-09 确实被标成禁用（否则这条断言测的不是边界行为）
      expect(panel.querySelector('[data-iso="2026-08-09"]')!.getAttribute("aria-disabled")).toBe("true");

      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(focusCell(panel)!.dataset.iso, "min 当天按 ← 必须移动焦点").toBe("2026-08-09");

      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await flush();
      expect(el.value, "越界日期不能被选中").toBe("2026-08-10");
      expect(el.open, "不可选时不该关面板（用户还得能继续挪）").toBe(true);
      document.body.removeChild(el);
    });

    it("closes on Escape and emits z-datepicker-close", async () => {
      const el = createDatepicker();
      await flush();
      await openPanel(el);

      const closeHandler = vi.fn();
      el.addEventListener("z-datepicker-close", closeHandler);

      getPanel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(el.open).toBe(false);
      expect(closeHandler).toHaveBeenCalledTimes(1);
      document.body.removeChild(el);
    });
  });

  describe("calendar.ts pure helpers", () => {
    it("roundtrips parseISO/formatISO and rejects malformed input", () => {
      const d = new Date(2026, 7, 6);
      expect(formatISO(d)).toBe("2026-08-06");
      expect(parseISO("2026-08-06")).toEqual(d);
      expect(formatISO(parseISO("2026-08-06")!)).toBe("2026-08-06");
      expect(parseISO("2026-13-01")).toBeNull();
      expect(parseISO("2026-02-30")).toBeNull();
      expect(parseISO("garbage")).toBeNull();
    });

    it("builds a fixed 42-cell grid from the week boundary", () => {
      const sun = buildGrid(2026, 7, 0);
      expect(sun.length).toBe(42);
      expect(sun[0].iso).toBe("2026-07-26"); // Sunday 2026-08-01 offset 6
      const mon = buildGrid(2026, 7, 1);
      expect(mon[0].iso).toBe("2026-07-27");
      expect(mon[0].inMonth).toBe(false);
      expect(mon[30].iso).toBe("2026-08-26");
      expect(mon[30].inMonth).toBe(true);
    });

    it("checks ISO range boundaries inclusively", () => {
      expect(isISOInRange("2026-08-15", "2026-08-10", "2026-08-20")).toBe(true);
      expect(isISOInRange("2026-08-10", "2026-08-10", "2026-08-20")).toBe(true);
      expect(isISOInRange("2026-08-09", "2026-08-10", "2026-08-20")).toBe(false);
      expect(isISOInRange("2026-08-01", "", "2026-08-20")).toBe(true);
      expect(isISOInRange("2026-08-25", "2026-08-10", "")).toBe(true);
    });

    // [WHY] renderGridTable 为三组件（Datepicker/DateRange/Calendar）共用骨架（2026-09-25 去重抽取）
    it("renders the shared grid table skeleton with prefix-scoped classes", () => {
      const cells = buildGrid(2026, 7, 0);
      const out = renderGridTable({
        prefix: "z-datepicker",
        locale: "en-US",
        weekStart: 0,
        cells,
        today: "2026-08-06",
        ariaLabel: "August 2026",
        cellHTML: (cell, today) =>
          `<td data-iso="${cell.iso}" class="${cell.iso === today ? "today" : ""}">${cell.day}</td>`,
      });
      expect(out).toContain('class="z-datepicker__grid"');
      expect(out).toContain('aria-label="August 2026"');
      expect(out).toContain('class="z-datepicker__weekday"');
      expect(out).toContain('role="grid"');
      // 42 格全部渲染
      expect(out.match(/<td /g)!.length).toBe(42);
      // today 回调参数透传
      expect(out).toContain('class="today">6</td>');
    });

    it("adds days across month boundaries", () => {
      expect(formatISO(addDays(new Date(2026, 7, 31), 1))).toBe("2026-09-01");
      expect(formatISO(addDays(new Date(2026, 7, 1), -1))).toBe("2026-07-31");
    });

    it("falls back to Sunday for unknown locales", () => {
      expect(getFirstDayOfWeek("en-US")).toBe(0);
      expect(getMonthLabel("en-US", 2026, 7)).toBe("August 2026");
    });
  });
});

// ── 清空的键盘路径 ────────────────────────────────────────────────────────
//
// [为什么需要] 清除钮是 `tabindex="-1"` 的：触发器本身已经是 Tab 停靠点，
// 再塞一个进去，表单里每多一个日期字段就多一次 Tab。代价是**键盘用户没有清空路径** ——
// 日期不是能「全选 + 删除」的文本。补 `Delete`（原生多选 select 与各类选择控件里
// 「删掉这个值」就是它），并保证不抢槽里可编辑输入框的 Delete。
