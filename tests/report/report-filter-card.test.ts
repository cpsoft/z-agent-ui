// Test: 看板筛选器卡（M7）—— 独立结构与「按卡片绑定」的判据
//
// [这批测试要防的具体故障] 筛选器卡最典型的三类失败都是静默的：
//  ① 值填了，但作用到 0 张卡（绑定写错 / 数据集不对）→ 看板数字不随筛选变化，无报错；
//  ② 作用到 2 张卡，但作者只想筛 1 张 → 另一张的数字莫名「错了」；
//  ③ 页头与筛选器卡同时筛同一字段 → 两个值都被 AND，结果恒空，两张控件各自看起来都正常。
// 所以下面的断言都盯着「某张特定的卡是否被筛」，而不是「有没有产生一条筛选条件」。
//
// [为什么不用「投影前后互比」] 那是假绿的常见形态：两侧走同一个投影函数，
// 函数整体坏掉时两侧一起坏、断言恒真。这里所有期望值都是手写字面量。
import { describe, expect, it } from "vitest";
import {
  appliesTo,
  bindableCharts,
  conflictingCards,
  coveredFieldsForChart,
  effectiveValue,
  filterCardTitle,
  filterValueActive,
  filterValueText,
  filtersForChart,
  headFiltersForChart,
  targetState,
  targetSummary,
  toFilter,
  toggleTarget,
} from "../../src/report/core/report-filter-card.js";
import type { ReportChart, ReportFilterCard, ReportWidgetFilter } from "../../src/report/core/types.js";

const chart = (p: Partial<ReportChart> = {}): ReportChart => ({
  id: "c1",
  title: "图",
  datasetId: 6,
  rows: [],
  measures: [],
  filters: [],
  chartType: "bar",
  limit: 100,
  ...p,
});

const card = (p: Partial<ReportFilterCard> = {}): ReportFilterCard => ({
  id: "fc-1",
  datasetId: 6,
  field: "store",
  op: "=",
  targets: [],
  ...p,
});

describe("filterValueActive：四种边界各有一个确定的答案", () => {
  it("isNull / isNotNull 恒生效（它们本来就没有值）", () => {
    expect(filterValueActive("isNull", undefined)).toBe(true);
    expect(filterValueActive("isNotNull", "")).toBe(true);
  });

  it("空字符串不生效（否则会拼出 field = ''，整张卡变空）", () => {
    expect(filterValueActive("=", "")).toBe(false);
    expect(filterValueActive("=", "   ")).toBe(false);
    expect(filterValueActive("=", "甲店")).toBe(true);
  });

  it("between：任一端点有值就生效，两端都空才不生效", () => {
    expect(filterValueActive("between", ["", ""])).toBe(false);
    expect(filterValueActive("between", ["2026-01-01", ""])).toBe(true);
    expect(filterValueActive("between", [undefined, null])).toBe(false);
  });

  it("in / notIn：空数组不生效（空 IN 在 SQL 里恒假，会把卡查空）", () => {
    expect(filterValueActive("in", [])).toBe(false);
    expect(filterValueActive("in", ["甲店"])).toBe(true);
  });

  it("0 是有效值，不能被当成空", () => {
    expect(filterValueActive(">", 0)).toBe(true);
    expect(filterValueActive(">", null)).toBe(false);
  });
});

describe("filterValueText：展示文本", () => {
  it("数组逗号连接；isNull 无值", () => {
    expect(filterValueText("in", ["甲店", "乙店"])).toBe("甲店, 乙店");
    expect(filterValueText("isNull", undefined)).toBe("");
    expect(filterValueText("=", 0)).toBe("0");
  });
});

describe("appliesTo：作用对象的判据", () => {
  it("targets 为空 = 同数据集下全部卡（含以后新增）", () => {
    const c1 = chart({ id: "c1" });
    const c2 = chart({ id: "c2", chartType: "table" });
    const fc = card({ targets: [] });
    expect(appliesTo(fc, c1)).toBe(true);
    expect(appliesTo(fc, c2)).toBe(true);
  });

  it("targets 非空 = 只作用于列出的卡", () => {
    const fc = card({ targets: ["c1"] });
    expect(appliesTo(fc, chart({ id: "c1" }))).toBe(true);
    expect(appliesTo(fc, chart({ id: "c2" }))).toBe(false);
  });

  it("跨数据集不作用（后端字段白名单会拒绝该查询，宁可先不产生）", () => {
    const fc = card({ targets: [] });
    expect(appliesTo(fc, chart({ id: "x", datasetId: 99 }))).toBe(false);
  });

  it("文本 / 图片卡不作用 —— 即便 targets 里写了它", () => {
    const fc = card({ targets: ["t1", "i1"] });
    expect(appliesTo(fc, chart({ id: "t1", chartType: "text", datasetId: 6 }))).toBe(false);
    expect(appliesTo(fc, chart({ id: "i1", chartType: "image", datasetId: 6 }))).toBe(false);
  });

  it("没选字段 = 还没配完，谁都不作用", () => {
    expect(appliesTo(card({ field: "", targets: [] }), chart({ id: "c1" }))).toBe(false);
  });

  it("kpi / detail 也属于可筛选的卡（它们真的会查数据）", () => {
    const fc = card({ targets: [] });
    expect(appliesTo(fc, chart({ id: "k", chartType: "kpi" }))).toBe(true);
    expect(appliesTo(fc, chart({ id: "d", chartType: "detail-table" }))).toBe(true);
  });
});

describe("headFiltersForChart：页头筛选按卡屏蔽", () => {
  const head: ReportWidgetFilter[] = [
    { id: "w1", datasetId: 6, field: "store", op: "=", value: "甲店" },
    { id: "w2", datasetId: 6, field: "region", op: "=", value: "华东" },
    { id: "w3", datasetId: 99, field: "store", op: "=", value: "别的数据集" },
  ];

  it("被筛选器卡覆盖的字段，页头那条对该卡不再生效（否则两值 AND，结果恒空）", () => {
    const fc = card({ field: "store", targets: [] });
    const out = headFiltersForChart(head, chart({ id: "c1" }), [fc]);
    expect(out.map((w) => w.id)).toEqual(["w2", "w3"]);
  });

  it("只屏蔽绑定到这张卡的：同一数据集的另一张卡保留页头筛选", () => {
    const fc = card({ field: "store", targets: ["c1"] });
    expect(headFiltersForChart(head, chart({ id: "c1" }), [fc]).map((w) => w.id)).toEqual(["w2", "w3"]);
    // c2 没被绑定 → 页头三条全保留（这是「按卡屏蔽」与「全局剔字段」的分水岭）
    expect(headFiltersForChart(head, chart({ id: "c2" }), [fc]).map((w) => w.id)).toEqual(["w1", "w2", "w3"]);
  });

  it("不同数据集的同名字段不受影响（字段名相同不代表是同一列）", () => {
    const fc = card({ field: "store", datasetId: 6, targets: [] });
    const other = chart({ id: "c9", datasetId: 99 });
    expect(headFiltersForChart(head, other, [fc]).map((w) => w.id)).toEqual(["w1", "w2", "w3"]);
  });

  it("coveredFieldsForChart 只统计真的作用到这张卡的字段", () => {
    const a = card({ id: "a", field: "store", targets: ["c1"] });
    const b = card({ id: "b", field: "city", targets: ["c2"] });
    expect([...coveredFieldsForChart(chart({ id: "c1" }), [a, b])]).toEqual(["store"]);
  });
});

describe("effectiveValue / toFilter：值的优先级", () => {
  it("无 override 时用作者默认值", () => {
    const fc = card({ value: "甲店" });
    expect(effectiveValue(fc, null)).toBe("甲店");
  });

  it("override 的 op 与配置一致 → 采纳（读者改的值）", () => {
    const fc = card({ op: "=", value: "甲店" });
    expect(effectiveValue(fc, { "fc-1": { op: "=", value: "乙店" } })).toBe("乙店");
  });

  it("override 的 op 与配置不一致 → 丢弃（新运算符配旧值没有正确解释）", () => {
    const fc = card({ op: "between", value: ["2026-01-01", "2026-01-31"] });
    expect(effectiveValue(fc, { "fc-1": { op: "=", value: "甲店" } })).toEqual(["2026-01-01", "2026-01-31"]);
  });

  it("值未填 → 不产生筛选条件（不能拼出 field = ''）", () => {
    expect(toFilter(card({ value: "" }))).toBeNull();
    expect(toFilter(card({ value: undefined }))).toBeNull();
  });

  it("值有效 → 只带 field / op / value（不带 datasetId / targets，那是配置不是条件）", () => {
    expect(toFilter(card({ op: "in", value: ["甲店"], targets: ["c1"] }))).toEqual({
      field: "store",
      op: "in",
      value: ["甲店"],
    });
  });
});

describe("filtersForChart：只拼接真正作用于这张卡的条件", () => {
  const cards = [
    card({ id: "a", field: "store", op: "=", value: "甲店", targets: ["c1"] }),
    card({ id: "b", field: "city", op: "=", value: "杭州", targets: ["c2"] }),
    card({ id: "c", field: "region", op: "=", value: "", targets: [] }),
  ];

  it("c1 只吃到 a（c 没值、b 绑的是 c2）", () => {
    expect(filtersForChart(chart({ id: "c1" }), cards)).toEqual([{ field: "store", op: "=", value: "甲店" }]);
  });

  it("读者改值后跟着变", () => {
    const out = filtersForChart(chart({ id: "c1" }), cards, { a: { op: "=", value: "乙店" } });
    expect(out).toEqual([{ field: "store", op: "=", value: "乙店" }]);
  });
});

describe("targetState：绑定状态必须能暴露失效", () => {
  it("targets 为空 → all，alive = 同数据集可筛选卡数", () => {
    const charts = [chart({ id: "c1" }), chart({ id: "c2", chartType: "table" }), chart({ id: "c3", datasetId: 9 }), chart({ id: "t", chartType: "text" })];
    const st = targetState(card({ targets: [] }), charts);
    expect(st.mode).toBe("all");
    expect(st.alive).toBe(2);
    expect(st.dangling).toEqual([]);
  });

  it("targets 指向已删除的卡 → dangling（否则「绑了 3 张」实际只影响 2 张，界面上看不出来）", () => {
    const st = targetState(card({ targets: ["c1", "gone"] }), [chart({ id: "c1" })]);
    expect(st.mode).toBe("some");
    expect(st.alive).toBe(1);
    expect(st.dangling).toEqual(["gone"]);
  });

  it("targets 指向已改成文本卡的 id → 同样算失效（原意已不可达）", () => {
    const st = targetState(card({ targets: ["t1"] }), [chart({ id: "t1", chartType: "text" })]);
    expect(st.alive).toBe(0);
    expect(st.dangling).toEqual(["t1"]);
  });

  it("targets 里有跨数据集的卡 → crossDataset（单独一类，不能混进 dangling）", () => {
    const st = targetState(card({ targets: ["c1", "other"] }), [chart({ id: "c1" }), chart({ id: "other", datasetId: 9 })]);
    expect(st.alive).toBe(1);
    expect(st.crossDataset).toEqual(["other"]);
    expect(st.dangling).toEqual([]);
  });

  it("摘要文案说清作用范围与失效数量", () => {
    expect(targetSummary({ mode: "all", alive: 3, dangling: [], crossDataset: [] })).toBe("作用于全部 3 张卡");
    expect(targetSummary({ mode: "some", alive: 2, dangling: ["x"], crossDataset: [] })).toBe("作用于 2 张卡 · 1 个绑定已失效");
  });
});

describe("conflictingCards：两张卡筛同字段会让结果恒空", () => {
  it("同一张卡被两张卡筛同一字段 → 后者报冲突", () => {
    const a = card({ id: "a", field: "store", targets: [] });
    const b = card({ id: "b", field: "store", targets: [] });
    expect(conflictingCards([a, b], [chart({ id: "c1" })])).toEqual(["b"]);
  });

  it("不同字段 / 不同卡片 → 不冲突", () => {
    const a = card({ id: "a", field: "store", targets: ["c1"] });
    const b = card({ id: "b", field: "store", targets: ["c2"] });
    const c = card({ id: "c", field: "city", targets: ["c1"] });
    expect(conflictingCards([a, b, c], [chart({ id: "c1" }), chart({ id: "c2" })])).toEqual([]);
  });
});

describe("bindableCharts / toggleTarget：可选绑定目标", () => {
  it("只列同数据集且会查数据的卡", () => {
    const charts = [chart({ id: "c1" }), chart({ id: "t", chartType: "text" }), chart({ id: "x", datasetId: 9 })];
    expect(bindableCharts({ datasetId: 6 }, charts).map((c) => c.id)).toEqual(["c1"]);
  });

  it("取消勾选后 remaining 为空 = 回到「全部」，不是「谁都不作用」", () => {
    const fc = card({ targets: ["c1"] });
    expect(toggleTarget(fc, "c1", false)).toEqual([]);
    // 这一步的语义由 appliesTo 保证：空 targets 命中全部。这里只锁数组形态。
    expect(appliesTo(card({ targets: toggleTarget(fc, "c1", false) }), chart({ id: "c2" }))).toBe(true);
  });

  it("勾选追加、不重复", () => {
    const fc = card({ targets: ["c1"] });
    expect(toggleTarget(fc, "c2", true)).toEqual(["c1", "c2"]);
    expect(toggleTarget(fc, "c1", true)).toEqual(["c1"]);
  });
});

describe("filterCardTitle：标题回落顺序", () => {
  it("作者填的 label 优先，其次字段别名，最后字段名", () => {
    expect(filterCardTitle({ label: " 门店 ", field: "store" }, "门店名称")).toBe("门店");
    expect(filterCardTitle({ label: "", field: "store" }, "门店名称")).toBe("门店名称");
    expect(filterCardTitle({ field: "store" })).toBe("store");
  });
});
