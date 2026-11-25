// 分组表 / 树状表格的小计语义（core/report-group）。
//
// [为什么这些断言值得写] 小计是**算出来的**，错了不会报错：屏幕上是 4800、导出是 4300，
// 或者 avg 被「子级平均再平均」算成一个看着合理的数。每条断言都要能证明「用的是哪个值」，
// 所以期望值全部手写，不从被测实现反推。
//
// [层级契约] 最深一层永远是**叶子行**，组行只出现在 1..N-1 层。所以：
//   rows = [城市, 门店] → 城市有组行（小计），门店是叶子行；
//   rows = [城市]       → 没有组行，只有叶子行 + 总计行。
// 这不是偷懒：单维度时「每个组的子级只有一个叶子」，小计行与叶子行逐字相同。

import { describe, expect, it } from "vitest";
import {
  buildGroupRows,
  evalComputedExpr,
  evalReportCf,
  type GroupRenderRow,
} from "../../src/report/core/report-group.js";
import type { ReportChart, ReportComputedField } from "../../src/report/core/types.js";

function mkChart(p: Partial<ReportChart> = {}): ReportChart {
  return {
    id: "c1",
    title: "分组表",
    datasetId: 1,
    rows: ["city", "store"],
    measures: [{ field: "amount", agg: "sum" }],
    filters: [],
    chartType: "group-table",
    limit: 1000,
    ...p,
  };
}

const byKind = (rs: GroupRenderRow[], kind: GroupRenderRow["kind"]) => rs.filter((r) => r.kind === kind);
const shape = (rs: GroupRenderRow[]) => rs.map((r) => `${r.kind}@${r.depth}`);

describe("buildGroupRows — 两层层级", () => {
  const chart = mkChart();
  const rows = [
    { city: "杭州", store: "甲店", sum_amount: 10 },
    { city: "杭州", store: "乙店", sum_amount: 20 },
    { city: "上海", store: "丙店", sum_amount: 5 },
  ];

  it("组行只在一级、叶子在二级；顺序按首次出现（不是按值排序）", () => {
    const out = buildGroupRows(chart, rows);
    expect(shape(out)).toEqual([
      "group@1",
      "leaf@2",
      "leaf@2",
      "group@1",
      "leaf@2",
      "total@-1",
    ]);
    expect(byKind(out, "group").map((r) => r.values.city)).toEqual(["杭州", "上海"]);
  });

  it("组行小计 = 组内求和；总计 = 全部求和", () => {
    const out = buildGroupRows(chart, rows);
    expect(byKind(out, "group")[0].values.sum_amount).toBe(30);
    expect(byKind(out, "group")[1].values.sum_amount).toBe(5);
    expect(byKind(out, "total")[0].values.sum_amount).toBe(35);
  });

  it("组行的维度格填自己那一级的值；叶子行保留整行", () => {
    const out = buildGroupRows(chart, rows);
    const g = byKind(out, "group")[0];
    expect(g.values.city).toBe("杭州");
    // 组行在 store 这一级还没有值 → 空串（不是 undefined，渲染时会印 "undefined"）
    expect(g.values.store).toBe("");
    expect(byKind(out, "leaf")[0].values.store).toBe("甲店");
  });

  it("总计行首维度写「总计」，其余维度列留空", () => {
    const total = byKind(buildGroupRows(chart, rows), "total")[0];
    expect(total.values.city).toBe("总计");
    expect(total.values.store).toBe("");
  });

  it("rowKey 全局唯一（React key / 折叠 key 都靠它）", () => {
    const out = buildGroupRows(chart, rows);
    expect(new Set(out.map((r) => r.rowKey)).size).toBe(out.length);
  });

  it("hasChildren：一级组为 true，叶子恒 false", () => {
    const out = buildGroupRows(chart, rows);
    expect(byKind(out, "group")[0].hasChildren).toBe(true);
    expect(out.every((r) => r.kind !== "leaf" || r.hasChildren === false)).toBe(true);
  });
});

describe("buildGroupRows — 三层层级（中间层也要有组行）", () => {
  const chart = mkChart({ rows: ["region", "city", "store"] });
  const rows = [
    { region: "华东", city: "杭州", store: "甲店", sum_amount: 10 },
    { region: "华东", city: "杭州", store: "乙店", sum_amount: 20 },
    { region: "华东", city: "上海", store: "丙店", sum_amount: 5 },
  ];

  it("层级顺序：region 组 → city 组 → 叶子；祖先值沿链回填", () => {
    const out = buildGroupRows(chart, rows);
    expect(shape(out)).toEqual([
      "group@1",
      "group@2",
      "leaf@3",
      "leaf@3",
      "group@2",
      "leaf@3",
      "total@-1",
    ]);
    const city = out.find((r) => r.kind === "group" && r.values.city === "上海")!;
    expect(city.values.region).toBe("华东");
    expect(city.values.sum_amount).toBe(5);
  });

  it("最外层小计是中间层小计之和", () => {
    const out = buildGroupRows(chart, rows);
    expect(out.find((r) => r.kind === "group" && r.values.region === "华东")!.values.sum_amount).toBe(35);
  });
});

describe("buildGroupRows — 单维度（没有组行，与 React 版一致）", () => {
  const chart = mkChart({ rows: ["city"] });
  const rows = [
    { city: "杭州", sum_amount: 100 },
    { city: "上海", sum_amount: 30 },
  ];

  it("只有叶子行 + 总计行", () => {
    const out = buildGroupRows(chart, rows);
    expect(shape(out)).toEqual(["leaf@1", "leaf@1", "total@-1"]);
    expect(byKind(out, "total")[0].values.sum_amount).toBe(130);
  });
});

describe("buildGroupRows — 不可重算的聚合显示 null", () => {
  it("avg / countDistinct 小计为 null（子级平均再平均是错的数）", () => {
    const chart = mkChart({
      measures: [
        { field: "temp", agg: "avg" },
        { field: "sku", agg: "countDistinct" },
      ],
    });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", avg_temp: 10, countDistinct_sku: 3 },
      { city: "杭州", store: "乙店", avg_temp: 20, countDistinct_sku: 5 },
    ]);
    for (const g of byKind(out, "group")) {
      expect(g.values.avg_temp).toBeNull();
      expect(g.values.countDistinct_sku).toBeNull();
    }
    expect(byKind(out, "total")[0].values.avg_temp).toBeNull();
  });

  it("count 走累加（它是可重算的）", () => {
    const chart = mkChart({ measures: [{ field: "order", agg: "count" }] });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", count_order: 3 },
      { city: "杭州", store: "乙店", count_order: 4 },
    ]);
    expect(byKind(out, "group")[0].values.count_order).toBe(7);
  });

  it("min / max 取极值而不是求和", () => {
    const chart = mkChart({
      measures: [
        { field: "lo", agg: "min" },
        { field: "hi", agg: "max" },
      ],
    });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", min_lo: 5, max_hi: 9 },
      { city: "杭州", store: "乙店", min_lo: 2, max_hi: 30 },
    ]);
    expect(byKind(out, "group")[0].values.min_lo).toBe(2);
    expect(byKind(out, "group")[0].values.max_hi).toBe(30);
  });

  it("度量值是字符串（DECIMAL 经 JSON）也能汇总", () => {
    const out = buildGroupRows(mkChart(), [
      { city: "杭州", store: "甲店", sum_amount: "100.50" },
      { city: "杭州", store: "乙店", sum_amount: "0.50" },
    ]);
    expect(byKind(out, "group")[0].values.sum_amount).toBe(101);
  });
});

describe("buildGroupRows — 小计/总计开关与折叠", () => {
  const chart = mkChart();
  const rows = [
    { city: "杭州", store: "甲店", sum_amount: 10 },
    { city: "杭州", store: "乙店", sum_amount: 20 },
  ];

  it("subtotal:false 去掉组行，但**总计仍在**（总计来自根节点）", () => {
    const out = buildGroupRows(chart, rows, { subtotal: false });
    expect(byKind(out, "group")).toHaveLength(0);
    expect(byKind(out, "total")[0].values.sum_amount).toBe(30);
  });

  it("grandTotal:false 去掉总计行", () => {
    const out = buildGroupRows(chart, rows, { grandTotal: false });
    expect(byKind(out, "total")).toHaveLength(0);
    expect(byKind(out, "group")).toHaveLength(1);
  });

  it("chart 上的 showSubtotal / showGrandTotal 是缺省值", () => {
    const off = mkChart({ showSubtotal: false, showGrandTotal: false });
    const out = buildGroupRows(off, rows);
    expect(out.map((r) => r.kind)).toEqual(["leaf", "leaf"]);
  });

  it("折叠组：组行留着、后代全部不出现", () => {
    const all = buildGroupRows(chart, rows);
    const hz = byKind(all, "group")[0];
    const out = buildGroupRows(chart, rows, { collapsed: new Set([hz.groupKey]) });
    expect(shape(out)).toEqual(["group@1", "total@-1"]);
  });

  it("折叠不影响小计值本身（折了也要算对，否则展开时看到的是错的）", () => {
    const all = buildGroupRows(chart, rows);
    const hz = byKind(all, "group")[0];
    const out = buildGroupRows(chart, rows, { collapsed: new Set([hz.groupKey]) });
    expect(byKind(out, "group")[0].values.sum_amount).toBe(30);
  });
});

describe("buildGroupRows — 边界", () => {
  it("无维度 / 无数据 → 空数组（不产出孤零零的总计行）", () => {
    expect(buildGroupRows(mkChart({ rows: [] }), [{ sum_amount: 1 }])).toEqual([]);
    expect(buildGroupRows(mkChart(), [])).toEqual([]);
  });

  it("维度值为 null 的行归入同一个 null 组，而不是每行一个组", () => {
    const out = buildGroupRows(mkChart(), [
      { city: null, store: "甲店", sum_amount: 1 },
      { city: null, store: "乙店", sum_amount: 2 },
    ]);
    expect(byKind(out, "group")).toHaveLength(1);
    expect(byKind(out, "group")[0].values.sum_amount).toBe(3);
  });
});

describe("buildGroupRows — 计算字段", () => {
  const cf = (p: Partial<ReportComputedField>): ReportComputedField => ({
    key: "cf_rate",
    name: "毛利率",
    expr: "sum_profit / sum_amount * 100",
    ...p,
  });

  it("legacy 四则：在小计环境里按小计值重算（不是把子级比率求和）", () => {
    const chart = mkChart({
      measures: [
        { field: "amount", agg: "sum" },
        { field: "profit", agg: "sum" },
      ],
      computedFields: [cf({})],
    });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", sum_amount: 100, sum_profit: 10 },
      { city: "杭州", store: "乙店", sum_amount: 300, sum_profit: 90 },
    ]);
    // 子级比率是 10% 与 30%；正确的小计是 100/400 = 25%（求和会得到 40）
    expect(byKind(out, "group")[0].values.cf_rate).toBe(25);
  });

  it("函数式含聚合 SUM([x])：按聚合种类汇总子级小计", () => {
    const chart = mkChart({
      computedFields: [cf({ expr: "SUM([amount]) * 2" })],
    });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", sum_amount: 10, cf_rate: 20 },
      { city: "杭州", store: "乙店", sum_amount: 15, cf_rate: 30 },
    ]);
    expect(byKind(out, "group")[0].values.cf_rate).toBe(50);
  });

  it("函数式引用维度（不在小计环境）→ null", () => {
    expect(evalReportCf(cf({ expr: "[city] + 1" }), { sum_amount: 1 })).toBeNull();
    const chart = mkChart({ computedFields: [cf({ expr: "[city] + 1" })] });
    const out = buildGroupRows(chart, [
      { city: "杭州", store: "甲店", sum_amount: 1, cf_rate: 2 },
      { city: "杭州", store: "乙店", sum_amount: 2, cf_rate: 3 },
    ]);
    expect(byKind(out, "group")[0].values.cf_rate).toBeNull();
  });
});

describe("evalComputedExpr — 受限四则", () => {
  it("优先级与括号", () => {
    expect(evalComputedExpr("a + b * 2", { a: 1, b: 3 })).toBe(7);
    expect(evalComputedExpr("(a + b) * 2", { a: 1, b: 3 })).toBe(8);
    expect(evalComputedExpr("a - b - c", { a: 10, b: 3, c: 2 })).toBe(5);
  });

  it("除零 / 未知标识符 / 语法错 / 尾部残留 → null", () => {
    expect(evalComputedExpr("a / 0", { a: 1 })).toBeNull();
    expect(evalComputedExpr("a + missing", { a: 1 })).toBeNull();
    expect(evalComputedExpr("a +", { a: 1 })).toBeNull();
    expect(evalComputedExpr("a b", { a: 1, b: 2 })).toBeNull();
    expect(evalComputedExpr("", {})).toBeNull();
  });
});
