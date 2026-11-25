// Test: z-pagination component（含总记录数/信息区/页容量选择器）
// Related: [[REQ-001]] (i18n 文案可配置), [[2026-08-10-pagination-info]]
// Wiki: wiki/planning/TASKS/2026-08-10-pagination-info/task_plan.md
// Date: 2026-07-16 (info/pageSize 用例 2026-08-10)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/pagination/Pagination";

describe("z-pagination", () => {
  function createPag(): HTMLElement & {
    current: number;
    total: number;
    pageSize: number;
    totalRecords: number;
    showInfo: boolean;
    showPageSize: boolean;
    infoTemplate: string;
    pageSizes: number[];
  } {
    const el = document.createElement("z-pagination") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders page buttons", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 1;
    await new Promise((r) => setTimeout(r, 0));

    const items = el.shadowRoot!.querySelectorAll(".z-pagination__item");
    expect(items.length).toBe(5);
    document.body.removeChild(el);
  });

  it("shows active class on current page", async () => {
    const el = createPag();
    el.total = 3;
    el.current = 2;
    await new Promise((r) => setTimeout(r, 0));

    const active = el.shadowRoot!.querySelector(".z-pagination__item--active")!;
    expect(active).toBeDefined();
    expect(active.textContent).toContain("2");
    document.body.removeChild(el);
  });

  it("shows ellipsis for large page counts", async () => {
    const el = createPag();
    el.total = 20;
    el.current = 10;
    await new Promise((r) => setTimeout(r, 0));

    const ellipsis = el.shadowRoot!.querySelectorAll(".z-pagination__ellipsis");
    expect(ellipsis.length).toBeGreaterThanOrEqual(1);
    document.body.removeChild(el);
  });

  it("prev button aria-label is set on first page", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 1;
    await new Promise((r) => setTimeout(r, 0));

    const prev = el.shadowRoot!.querySelector(".z-pagination__prev")!;
    expect(prev.getAttribute("aria-label")).toBe("上一页");
    document.body.removeChild(el);
  });

  it("next button aria-label is set on last page", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 5;
    await new Promise((r) => setTimeout(r, 0));

    const next = el.shadowRoot!.querySelector(".z-pagination__next")!;
    expect(next.getAttribute("aria-label")).toBe("下一页");
    document.body.removeChild(el);
  });

  it("respects custom prev/next labels via properties", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 1;
    await new Promise((r) => setTimeout(r, 0));

    el.setAttribute("prevlabel", "上一页");
    el.setAttribute("nextlabel", "下一页");
    await new Promise((r) => setTimeout(r, 0));

    const prev = el.shadowRoot!.querySelector(".z-pagination__prev")!;
    const next = el.shadowRoot!.querySelector(".z-pagination__next")!;
    expect(prev.getAttribute("aria-label")).toBe("上一页");
    expect(next.getAttribute("aria-label")).toBe("下一页");
    document.body.removeChild(el);
  });

  it("clicking page emits z-change", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 1;
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    const page3 = el.shadowRoot!.querySelector("[data-page='3']") as HTMLElement;
    page3.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.page).toBe(3);
    document.body.removeChild(el);
  });

  it("next button click advances page", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 3;
    await new Promise((r) => setTimeout(r, 0));

    const next = el.shadowRoot!.querySelector(".z-pagination__next") as HTMLElement;
    next.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.current).toBe(4);
    document.body.removeChild(el);
  });

  it("prev button click goes back", async () => {
    const el = createPag();
    el.total = 5;
    el.current = 3;
    await new Promise((r) => setTimeout(r, 0));

    const prev = el.shadowRoot!.querySelector(".z-pagination__prev") as HTMLElement;
    prev.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.current).toBe(2);
    document.body.removeChild(el);
  });

  // ── 总记录数 / 信息区 / 页容量选择器（2026-08-10）──────────────────────

  it("derives page count from totalRecords and pageSize", async () => {
    const el = createPag();
    el.totalRecords = 100;
    el.pageSize = 10;
    await new Promise((r) => setTimeout(r, 0));

    expect(el.pageCount).toBe(10);
    const items = el.shadowRoot!.querySelectorAll("[data-page]");
    expect(Array.from(items).some(i => i.getAttribute("data-page") === "10")).toBe(true);
    document.body.removeChild(el);
  });

  it("clamps current when totalRecords shrinks", async () => {
    const el = createPag();
    el.totalRecords = 100;
    el.pageSize = 10;
    await new Promise((r) => setTimeout(r, 0));

    el.current = 8;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.current).toBe(8);

    el.totalRecords = 30; // 3 页
    await new Promise((r) => setTimeout(r, 0));
    expect(el.current).toBe(3);
    document.body.removeChild(el);
  });

  it("does not render info or size selector by default", async () => {
    const el = createPag();
    el.totalRecords = 100;
    await new Promise((r) => setTimeout(r, 0));

    expect(el.shadowRoot!.querySelector(".z-pagination__info")).toBeNull();
    expect(el.shadowRoot!.querySelector(".z-pagination__sizes")).toBeNull();
    document.body.removeChild(el);
  });

  it("shows info with total records when showInfo", async () => {
    const el = createPag();
    el.totalRecords = 100;
    el.pageSize = 10;
    el.showInfo = true;
    await new Promise((r) => setTimeout(r, 0));

    const info = el.shadowRoot!.querySelector(".z-pagination__info")!;
    expect(info.textContent).toBe("Total 100 items");
    document.body.removeChild(el);
  });

  it("replaces placeholders in infoTemplate", async () => {
    const el = createPag();
    el.totalRecords = 100;
    el.pageSize = 10;
    el.current = 3;
    el.showInfo = true;
    el.infoTemplate = "{start}-{end} of {total}";
    await new Promise((r) => setTimeout(r, 0));

    const info = el.shadowRoot!.querySelector(".z-pagination__info")!;
    expect(info.textContent).toBe("21-30 of 100");
    document.body.removeChild(el);
  });

  it("renders page size selector from pageSizes", async () => {
    const el = createPag();
    el.showPageSize = true;
    el.pageSizes = [10, 25, 50];
    await new Promise((r) => setTimeout(r, 0));

    const select = el.shadowRoot!.querySelector(".z-pagination__sizes select")!;
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect((options[1] as HTMLOptionElement).value).toBe("25");
    document.body.removeChild(el);
  });

  it("appends current pageSize when missing from pageSizes", async () => {
    const el = createPag();
    el.pageSize = 30;
    el.showPageSize = true;
    el.pageSizes = [10, 20];
    await new Promise((r) => setTimeout(r, 0));

    const select = el.shadowRoot!.querySelector(".z-pagination__sizes select")!;
    const options = select.querySelectorAll("option");
    expect(options.length).toBe(3);
    expect((options[2] as HTMLOptionElement).value).toBe("30");
    document.body.removeChild(el);
  });

  it("changing page size emits z-size-change and z-change with clamped page", async () => {
    const el = createPag();
    el.totalRecords = 100;
    el.pageSize = 10;
    el.current = 10;
    el.showPageSize = true;
    await new Promise((r) => setTimeout(r, 0));

    const sizeHandler = vi.fn();
    const changeHandler = vi.fn();
    el.addEventListener("z-size-change", sizeHandler);
    el.addEventListener("z-change", changeHandler);

    const select = el.shadowRoot!.querySelector<HTMLSelectElement>(".z-pagination__sizes select")!;
    select.value = "50";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.pageSize).toBe(50);
    expect(el.current).toBe(2); // 100/50=2 页，从第 10 页钳制
    expect(sizeHandler.mock.calls[0][0].detail.pageSize).toBe(50);
    expect(changeHandler.mock.calls[0][0].detail.page).toBe(2);
    expect(changeHandler.mock.calls[0][0].detail.totalRecords).toBe(100);
    document.body.removeChild(el);
  });
});
