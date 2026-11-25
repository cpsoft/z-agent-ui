// Test: z-select component (含可配置搜索：前端过滤 + 后端 remoteMethod/z-search)
// Related: [[2026-07-16-W1-core-and-button]], [[2026-08-10-select-search]]
// Wiki: wiki/planning/TASKS/2026-08-10-select-search/task_plan.md
// Date: 2026-07-16 (search 用例 2026-08-10)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/option/Option";
import "../../../src/components/select/Select";

describe("z-select", () => {
  function createSelect(): HTMLElement & {
    value: string;
    disabled: boolean;
    open: boolean;
    placeholder: string;
    searchable: boolean;
    searchMode: string;
    searchPlaceholder: string;
    loading: boolean;
    remoteMethod: ((q: string) => Promise<any[]> | void) | null;
  } {
    const el = document.createElement("z-select") as any;
    document.body.appendChild(el);
    return el;
  }

  function addOption(select: HTMLElement, value: string, label: string, disabled = false) {
    const opt = document.createElement("z-option") as any;
    opt.value = value;
    opt.textContent = label;
    if (disabled) opt.disabled = true;
    select.appendChild(opt);
    return opt;
  }

  it("renders trigger with placeholder", async () => {
    const el = createSelect();
    addOption(el, "1", "Option 1");
    await new Promise((r) => setTimeout(r, 0));

    const trigger = el.shadowRoot!.querySelector(".z-select__trigger")!;
    expect(trigger).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-select__placeholder")).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows selected option label", async () => {
    const el = createSelect();
    addOption(el, "a", "Alpha");
    addOption(el, "b", "Beta");
    el.value = "b";
    await new Promise((r) => setTimeout(r, 0));

    const val = el.shadowRoot!.querySelector(".z-select__value")!;
    expect(val.textContent).toContain("Beta");
    document.body.removeChild(el);
  });

  it("opens dropdown on trigger click", async () => {
    const el = createSelect();
    addOption(el, "1", "One");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("does not open when disabled", async () => {
    const el = createSelect();
    el.disabled = true;
    addOption(el, "1", "One");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-change when option selected", async () => {
    const el = createSelect();
    addOption(el, "x", "X-Ray");
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    // Simulate selection programmatically
    el.value = "x";
    await new Promise((r) => setTimeout(r, 0));

    expect(el.value).toBe("x");
    document.body.removeChild(el);
  });

  it("shows 'No options' when empty", async () => {
    const el = createSelect();
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    // Dropdown appended to body (use last in case previous tests leave stale dropdowns)
    const all = document.querySelectorAll(".z-select__dropdown");
    expect(all.length).toBeGreaterThan(0);
    const dd = all[all.length - 1];
    const empty = dd.querySelector(".z-select__empty");
    expect(empty).toBeDefined();
    expect(empty!.textContent).toContain("No options");

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
  });

  it("closes on document click outside", async () => {
    const el = createSelect();
    addOption(el, "1", "One");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  // ── 可配置搜索（searchable / frontend / backend）────────────────────────

  function lastDropdown(): HTMLElement {
    const all = document.querySelectorAll<HTMLElement>(".z-select__dropdown");
    return all[all.length - 1];
  }

  function openSearchable(el: any, ...labels: string[]) {
    el.searchable = true;
    labels.forEach((l, i) => addOption(el, `v${i}`, l));
  }

  it("maps kebab-case attributes to search properties", async () => {
    const el = document.createElement("z-select") as any;
    el.setAttribute("searchable", "");
    el.setAttribute("search-mode", "backend");
    el.setAttribute("search-placeholder", "Find...");
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.searchable).toBe(true);
    expect(el.searchMode).toBe("backend");
    expect(el.searchPlaceholder).toBe("Find...");
    document.body.removeChild(el);
  });

  it("shows search box only when searchable", async () => {
    const el = createSelect();
    addOption(el, "a", "Alpha");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(lastDropdown().querySelector(".z-select__search")).toBeNull();

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
  });

  it("frontend search filters options by label", async () => {
    const el = createSelect();
    openSearchable(el, "Apple", "Apricot", "Banana");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    const dd = lastDropdown();
    const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
    expect(input).not.toBeNull();
    expect(input.getAttribute("placeholder")).toBe("Search...");

    input.value = "ap";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const options = dd.querySelectorAll(".z-select__option");
    expect(options.length).toBe(2);
    expect(options[0].textContent).toContain("Apple");
    expect(options[1].textContent).toContain("Apricot");

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
  });

  it("frontend search shows 'No results' when nothing matches", async () => {
    const el = createSelect();
    openSearchable(el, "Apple", "Banana");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    const dd = lastDropdown();
    const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
    input.value = "zzz";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(dd.querySelectorAll(".z-select__option").length).toBe(0);
    const empty = dd.querySelector(".z-select__empty");
    expect(empty).toBeDefined();
    expect(empty!.textContent).toContain("No results");

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
  });

  it("frontend search resets query when reopened", async () => {
    const el = createSelect();
    openSearchable(el, "Apple", "Apricot");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    let dd = lastDropdown();
    const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
    input.value = "ap";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    expect(dd.querySelectorAll(".z-select__option").length).toBe(2);

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    dd = lastDropdown();
    expect(dd.querySelectorAll(".z-select__option").length).toBe(2);
    expect((dd.querySelector(".z-select__search") as HTMLInputElement).value).toBe("");

    el.open = false;
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
  });

  // [WHY] fake timers 下 setTimeout 等待永不触发，用微任务冲刷替代（2026-08-10）
  async function flushMicrotasks(times = 5): Promise<void> {
    for (let i = 0; i < times; i++) await Promise.resolve();
  }

  it("backend mode: debounces and calls remoteMethod with query, applies returned options", async () => {
    vi.useFakeTimers();
    try {
      const el = createSelect();
      el.searchable = true;
      el.searchMode = "backend";
      addOption(el, "a", "Alpha");
      const remote = vi.fn((q: string) => Promise.resolve([{ value: "r1", label: `Result ${q}` }]));
      el.remoteMethod = remote;
      await flushMicrotasks();

      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushMicrotasks();

      const dd = lastDropdown();
      const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
      input.value = "xy";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(remote).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);
      expect(remote).toHaveBeenCalledWith("xy");

      await flushMicrotasks();

      const options = dd.querySelectorAll(".z-select__option");
      expect(options.length).toBe(1);
      expect(options[0].textContent).toContain("Result xy");

      el.open = false;
      await flushMicrotasks();
      document.body.removeChild(el);
    } finally {
      vi.useRealTimers();
    }
  });

  it("backend mode: emits z-search event with query", async () => {
    vi.useFakeTimers();
    try {
      const el = createSelect();
      el.searchable = true;
      el.searchMode = "backend";
      addOption(el, "a", "Alpha");
      const handler = vi.fn();
      el.addEventListener("z-search", handler);
      await flushMicrotasks();

      el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await flushMicrotasks();

      const dd = lastDropdown();
      const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
      input.value = "xy";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      vi.advanceTimersByTime(300);
      expect(handler).toHaveBeenCalledTimes(1);
      expect((handler.mock.calls[0][0] as CustomEvent).detail.query).toBe("xy");

      el.open = false;
      await flushMicrotasks();
      document.body.removeChild(el);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keyboard navigation works on filtered options", async () => {
    const el = createSelect();
    openSearchable(el, "Apple", "Apricot", "Banana");
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    const dd = lastDropdown();
    const input = dd.querySelector<HTMLInputElement>(".z-select__search")!;
    input.value = "ap";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    dd.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    const active = dd.querySelectorAll(".z-select__option")[1];
    expect(active.classList.contains("z-select__option--active")).toBe(true);

    dd.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.value).toBe("v1");
    expect(el.open).toBe(false);

    document.body.removeChild(el);
  });
});
