// 表格列清单（core/report-table-columns）。
//
// [这个文件在防什么] 列 key 的来源。元素版原先按**后端回传的 result.columns** 拼列，
// React 版按**图表配置**拼列：平时看不出差别，一旦画分组表，小计行按 chart.rows 的原串
// （`datefmt:d:day`）取值，而列 key 是后端的 `d` —— 小计行的维度格整列空白，无任何报错。
// 所以这里逐条钉住「key 用配置里的原串」。

import { describe, expect, it } from "vitest";
import { buildTableColumns, withRank } from "../../src/report/core/report-table-columns.js";
import type { Column, ReportChart } from "../../src/report/core/types.js";

const COLS: Column[] = [
  { name: "d", alias: "日期", dataType: "date" },
  { name: "city_name", alias: "城市", dataType: "varchar" },
  { name: "amount", dataType: "decimal" },
  { name: "profit", dataType: "decimal" },
];

function mkChart(p: Partial<ReportChart> = {}): ReportChart {
  return {
    id: "c1",
    title: "表",
    datasetId: 1,
    rows: ["city_name"],
    measures: [{ field: "amount", agg: "sum" }],
    filters: [],
    chartType: "table",
    limit: 1000,
    ...p,
  };
}

describe("buildTableColumns — 维度列", () => {
  it("key 用 chart.rows 里的原串（datefmt 维度不被换成物理列名）", () => {
    const cols = buildTableColumns(mkChart({ rows: ["datefmt:d:day", "city_name"] }), COLS);
    // 换成 "d" 的话分组小计行的 values["datefmt:d:day"] 就永远取不到
    expect(cols.map((c) => c.key)).toEqual(["datefmt:d:day", "city_name", "sum_amount"]);
  });

  it("datefmt 维度的列头带粒度，普通维度用别名", () => {
    const cols = buildTableColumns(mkChart({ rows: ["datefmt:d:day", "city_name"] }), COLS);
    expect(cols[0].title).toBe("日期（日）");
    expect(cols[1].title).toBe("城市");
  });

  it("维度列打 isDim（分组表的缩进与折叠按钮靠它定位）", () => {
    const cols = buildTableColumns(mkChart({ rows: ["city_name"] }), COLS);
    expect(cols[0].isDim).toBe(true);
    expect(cols[1].isDim).toBeFalsy();
  });

  it("没别名的维度退回物理名", () => {
    const cols = buildTableColumns(mkChart({ rows: ["amount"] }), COLS);
    expect(cols[0].title).toBe("amount");
  });
});

describe("buildTableColumns — 指标列", () => {
  it("标题是「别名（聚合）」，key 是 measureKeyOf 的结果，右对齐", () => {
    const cols = buildTableColumns(mkChart(), COLS);
    const m = cols[1];
    expect(m.key).toBe("sum_amount");
    expect(m.title).toBe("amount（求和）");
    expect(m.align).toBe("right");
    expect(m.numeric).toBe(true);
    expect(m.width).toBe("140px");
  });

  it("聚合计算字段度量（agg 为空）不加聚合后缀", () => {
    const cols = buildTableColumns(
      mkChart({
        measures: [{ field: "cf_rate", agg: "" as never, computed: true }],
        computedFields: [{ key: "cf_rate", name: "毛利率", expr: "SUM([profit]) / SUM([amount])" }],
      }),
      COLS,
    );
    expect(cols[1].title).toBe("毛利率");
  });

  it("colFormats 的别名/宽度/对齐覆盖默认", () => {
    const cols = buildTableColumns(mkChart({ colFormats: { sum_amount: { alias: "销售额", width: "90px", align: "center" } } }), COLS);
    expect(cols[1].title).toBe("销售额");
    expect(cols[1].width).toBe("90px");
    expect(cols[1].align).toBe("center");
  });
});

describe("buildTableColumns — 排名列", () => {
  it("配了 orderBy 就有「#」列", () => {
    const cols = buildTableColumns(mkChart({ orderBy: [{ field: "sum_amount", dir: "desc" }] }), COLS);
    expect(cols[0]).toMatchObject({ key: "_rank", title: "#", align: "center" });
  });

  it("分组表即使配了 orderBy 也不加（层级里的「第 3 行」不是第 3 名）", () => {
    const cols = buildTableColumns(
      mkChart({ chartType: "group-table", orderBy: [{ field: "sum_amount", dir: "desc" }] }),
      COLS,
    );
    expect(cols.some((c) => c.key === "_rank")).toBe(false);
  });

  it("tree-table 同理", () => {
    const cols = buildTableColumns(mkChart({ chartType: "tree-table", orderBy: [{ field: "sum_amount", dir: "desc" }] }), COLS);
    expect(cols.some((c) => c.key === "_rank")).toBe(false);
  });
});

describe("buildTableColumns — 明细表", () => {
  it("展示列平铺：rows 去 datefmt 前缀 + measures 物理列，无聚合标签", () => {
    const cols = buildTableColumns(
      mkChart({ kind: "detail", chartType: "detail-table", rows: ["datefmt:d:day"], measures: [{ field: "amount", agg: "sum" }] }),
      COLS,
    );
    expect(cols.map((c) => c.key)).toEqual(["d", "amount"]);
    // 明细里没有「求和」这回事
    expect(cols[1].title).toBe("amount");
  });
});

describe("buildTableColumns — 计算字段列", () => {
  it("legacy 四则独立成列；函数式（含 [）不独立成列", () => {
    const legacy = buildTableColumns(
      mkChart({ computedFields: [{ key: "cf_a", name: "订货额", expr: "sum_amount / 100" }] }),
      COLS,
    );
    expect(legacy.map((c) => c.key)).toContain("cf_a");
    expect(legacy.find((c) => c.key === "cf_a")!.title).toBe("订货额");

    const fn = buildTableColumns(
      mkChart({ computedFields: [{ key: "cf_b", name: "毛利率", expr: "SUM([profit]) / SUM([amount])" }] }),
      COLS,
    );
    expect(fn.map((c) => c.key)).not.toContain("cf_b");
  });
});

describe("buildTableColumns — sortable 开关", () => {
  it("缺省 true；传 false 时所有可排序列都关掉（编辑态避免双入口）", () => {
    expect(buildTableColumns(mkChart(), COLS).every((c) => c.sortable !== false)).toBe(true);
    const off = buildTableColumns(mkChart(), COLS, {}, { sortable: false });
    expect(off.filter((c) => c.key !== "_rank").every((c) => c.sortable === false)).toBe(true);
  });
});

describe("withRank", () => {
  it("按展示序补 1..N，不改原数组", () => {
    const rows = [{ a: 1 }, { a: 2 }];
    const out = withRank(rows);
    expect(out.map((r) => r._rank)).toEqual([1, 2]);
    expect(rows[0]).toEqual({ a: 1 });
  });
});
