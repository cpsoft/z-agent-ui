import { describe, it, expect, afterEach } from "vitest";
import "../../../src/report/table/index";
import type { ZReportTable } from "../../../src/report/table/ReportTable";
import { computeVirtualWindow } from "../../../src/report/table/table-virtual";

const flush = () => new Promise((r) => queueMicrotask(() => r(undefined)));

describe("z-report-table 大表行虚拟滚动", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("computeVirtualWindow 正确计算顶部、中部、底部切片与占位高度", () => {
    const top = computeVirtualWindow(1000, 0, 200, 40, 4);
    expect(top).toEqual({ start: 0, end: 9, topHeight: 0, bottomHeight: 991 * 40 });

    const mid = computeVirtualWindow(1000, 4000, 200, 40, 4);
    expect(mid.start).toBe(96);
    expect(mid.end).toBe(109);
    expect(mid.topHeight).toBe(96 * 40);
    expect(mid.bottomHeight).toBe((1000 - 109) * 40);

    const end = computeVirtualWindow(1000, 39800, 200, 40, 4);
    expect(end.end).toBe(1000);
    expect(end.bottomHeight).toBe(0);
  });

  it("开启 virtual 时 1000 行仅渲染可见切片 + 占位行，滚动后切换到对应行区间", async () => {
    const el = document.createElement("z-report-table") as ZReportTable;
    el.virtual = true;
    el.rowHeight = 40;
    el.maxHeight = "200px";
    el.columns = [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
    ];
    el.data = Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Row-${i}` }));
    document.body.appendChild(el);
    await flush();

    const body = () => el.shadowRoot!.querySelector("tbody")!;
    const dataRows = () => body().querySelectorAll("tr:not(.z-rpt__vspacer)");
    const spacers = () => body().querySelectorAll("tr.z-rpt__vspacer");

    // 200px / 40px = 5 可见 + 8 overscan = 13 行，远小于 1000
    expect(dataRows().length).toBeLessThan(30);
    expect(spacers().length).toBe(1); // 顶部 0 高不渲染，只有底部占位
    expect(body().textContent).toContain("Row-0");
    expect(body().textContent).not.toContain("Row-500");

    // 模拟滚动到第 500 行位置（500 * 40 = 20000px）
    const wrapper = el.shadowRoot!.querySelector<HTMLElement>(".z-rpt__wrapper")!;
    wrapper.scrollTop = 20000;
    wrapper.dispatchEvent(new Event("scroll"));
    await flush();

    expect(dataRows().length).toBeLessThan(30);
    expect(spacers().length).toBe(2); // 上下占位行均存在
    expect(body().textContent).toContain("Row-500");
    expect(body().textContent).not.toContain("Row-0");
  });
});
