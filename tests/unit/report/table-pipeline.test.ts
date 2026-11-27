import { describe, expect, it } from "vitest";
import { matchesSelectedRowId, runTablePipeline } from "../../../src/report/table/table-pipeline.js";

describe("ReportTable 数据管道 (table-pipeline)", () => {
  const sample = [
    { id: 1, name: "B", score: 20 },
    { id: 2, name: "A", score: 50 },
    { id: 3, name: "C", score: 10 },
    { id: 4, name: "D", score: 40 },
    { id: 5, name: "E", score: 30 },
  ];

  it("client 模式下串联排序与分页", () => {
    const res = runTablePipeline({
      data: sample,
      sortState: [{ key: "score", dir: "desc" }],
      sortMode: "client",
      rowKey: "id",
      group: null,
      collapsed: new Set(),
      pageSize: 2,
      page: 2,
      pageMode: "client",
      totalRecords: 0,
    });

    expect(res.sortedRows.map((r) => r.score)).toEqual([50, 40, 30, 20, 10]);
    expect(res.paged.page).toBe(2);
    expect(res.paged.pageCount).toBe(3);
    expect(res.paged.rows.length).toBe(2);
    expect(res.paged.rows.map((r) => r.kind === "data" && r.values.score)).toEqual([30, 20]);
  });

  it("server 分页模式使用 totalRecords 计算总页数且不裁切当前页数据", () => {
    const res = runTablePipeline({
      data: sample.slice(0, 2),
      sortState: [],
      sortMode: "server",
      rowKey: "id",
      group: null,
      collapsed: new Set(),
      pageSize: 2,
      page: 3,
      pageMode: "server",
      totalRecords: 15,
    });

    expect(res.paged.page).toBe(3);
    expect(res.paged.pageCount).toBe(8);
    expect(res.paged.totalRows).toBe(15);
    expect(res.paged.rows.length).toBe(2);
  });

  it("matchesSelectedRowId 精准匹配多组 key:value 并忽略空值项", () => {
    expect(matchesSelectedRowId({ id: 10, code: "A" }, "id:10")).toBe(true);
    expect(matchesSelectedRowId({ id: 11, code: "A" }, "id:10, code:A")).toBe(true);
    expect(matchesSelectedRowId({ id: 11, code: "B" }, "id:10, code:A")).toBe(false);
    expect(matchesSelectedRowId({ id: "" }, "id:")).toBe(false);
    expect(matchesSelectedRowId({ id: 10 }, "")).toBe(false);
  });
});
