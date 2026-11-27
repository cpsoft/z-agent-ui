import { afterEach, describe, expect, it } from "vitest";
import "../../../src/report/table/index.js";
import {
  getTableCellRenderer,
  listTableCellRenderers,
  registerTableCellRenderer,
  unregisterTableCellRenderer,
} from "../../../src/report/table/index.js";

describe("ReportTable Cell Renderer Registry", () => {
  afterEach(() => {
    unregisterTableCellRenderer("status-pill");
    document.body.innerHTML = "";
  });

  it("支持注册、查询、列举与注销命名单元格渲染器，并在 <z-report-table> 中生效", async () => {
    registerTableCellRenderer("status-pill", (val) => `<span class="pill">${String(val).toUpperCase()}</span>`);
    expect(getTableCellRenderer("status-pill")).toBeTypeOf("function");
    expect(listTableCellRenderers()).toContain("status-pill");

    const table = document.createElement("z-report-table") as any;
    table.columns = [
      { key: "name", title: "Name" },
      { key: "status", title: "Status", cellRenderer: "status-pill" },
    ];
    table.data = [{ name: "Order-1", status: "paid" }];
    document.body.appendChild(table);
    await Promise.resolve();

    const pill = table.shadowRoot?.querySelector(".pill");
    expect(pill?.textContent).toBe("PAID");

    expect(unregisterTableCellRenderer("status-pill")).toBe(true);
    expect(getTableCellRenderer("status-pill")).toBeUndefined();
  });

  it("列定义显式传 render 时优先于 cellRenderer，未注册的 cellRenderer 退回转义文本", async () => {
    registerTableCellRenderer("status-pill", () => `<span class="pill">FROM_REG</span>`);

    const table = document.createElement("z-report-table") as any;
    table.columns = [
      { key: "a", title: "A", cellRenderer: "status-pill", render: () => `<b class="custom">INLINE</b>` },
      { key: "b", title: "B", cellRenderer: "not-registered" },
    ];
    table.data = [{ a: "1", b: "<script>" }];
    document.body.appendChild(table);
    await Promise.resolve();

    expect(table.shadowRoot?.querySelector(".custom")?.textContent).toBe("INLINE");
    expect(table.shadowRoot?.querySelector(".pill")).toBeNull();
    expect(table.shadowRoot?.textContent).toContain("<script>");
  });
});
