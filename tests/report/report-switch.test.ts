// Test: 卡种切换的迁移层（M5）
//
// [这类测试最容易写成假绿] 如果断言写成「迁移后的 measures 与迁移前比」，
// 而两侧都经过同一个 reflow，函数整体坏掉时两侧一起坏、断言恒真。
// 所以下面所有关键断言都写**手写字面量**（"amount" / ["city","region"] / 2），
// 并额外做一次「总量守恒」检查：切换只允许把项从可见槽移到暂存槽，不允许凭空少。
// 守恒式检查不是互比式假绿 —— 它的两侧一边是输入 chart（测试自己构造的），
// 一边是函数输出；函数吞掉一项时总和必然变小，断言立刻红。
import { describe, expect, it } from "vitest";
import { pushDim, pushMeasure, restoreStash, stashNotice, switchType } from "../../src/report/core/report-switch.js";
import type { ReportChart, ReportChartType } from "../../src/report/core/types.js";

const chart = (p: Partial<ReportChart> = {}): ReportChart => ({
  id: "c1",
  title: "图",
  datasetId: 1,
  rows: [],
  measures: [],
  filters: [],
  chartType: "bar",
  limit: 100,
  ...p,
});

// 语义化的最小指标：field 就是断言里要看的字面量
const M = (field: string) => ({ field, agg: "sum" as const });

describe("图表族内部换形态（chart → chart）", () => {
  const two = chart({ chartType: "line", rows: ["store"], measures: [M("amount"), M("qty")] });

  it("2 指标折线 → 饼图：只留第 1 个，第 2 个进暂存（不是删除）", () => {
    const out = switchType(two, "pie");
    expect(out.chartType).toBe("pie");
    expect(out.measures?.length).toBe(1);
    expect(out.measures?.[0].field).toBe("amount"); // 字面量
    expect(out.stashedMeasures?.length).toBe(1);
    expect(out.stashedMeasures?.[0].field).toBe("qty"); // 字面量
    expect(out.rows).toEqual(["store"]);
  });

  it("饼图 → 折线：暂存指标自动并回，顺序与原始数组一致", () => {
    const pie = chart({ ...two, chartType: "pie", measures: [M("amount")], stashedMeasures: [M("qty")] });
    const out = switchType(pie, "line");
    expect(out.measures?.map((m) => m.field)).toEqual(["amount", "qty"]); // 硬编码顺序
    expect(out.stashedMeasures).toBeUndefined(); // 并回后不留空数组
  });

  it("柱图 → 折线（容量相同）：一个字段都不动", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount"), M("qty")] });
    const out = switchType(bar, "line");
    expect(out.chartType).toBe("line");
    expect(out.measures?.length).toBe(2);
    expect(out.stashedMeasures).toBeUndefined();
    expect(out.rows).toEqual(["store"]);
  });

  it("折线 → 柱图 → 折线：往返后配置与原始完全一致", () => {
    const back = { ...two, ...switchType({ ...two, ...switchType(two, "pie") }, "line") };
    expect(back.measures.map((m) => m.field)).toEqual(["amount", "qty"]); // 硬编码
    expect(back.rows).toEqual(["store"]);
  });
});

describe("表格 ↔ 图表（维度容量 1）", () => {
  const three = chart({
    chartType: "group-table",
    rows: ["region", "city", "store"],
    measures: [M("amount")],
  });

  it("3 维度分组表 → 柱图：只留第 1 维，第 2、3 维进暂存", () => {
    const out = switchType(three, "bar");
    expect(out.rows).toEqual(["region"]); // 字面量
    expect(out.rowsStash).toEqual(["city", "store"]); // 字面量，顺序保持
    expect(out.measures?.length).toBe(1);
    expect(out.chartType).toBe("bar");
  });

  it("柱图 → 分组表：暂存维度并回，层级顺序不变", () => {
    const bar = chart({ chartType: "bar", rows: ["region"], rowsStash: ["city", "store"], measures: [M("amount")] });
    const out = switchType(bar, "group-table");
    expect(out.rows).toEqual(["region", "city", "store"]); // 字面量
    expect(out.rowsStash).toBeUndefined();
  });

  it("表格 → 饼图：维度与指标同时受容量约束", () => {
    const out = switchType(chart({ ...three, measures: [M("amount"), M("qty")] }), "pie");
    expect(out.rows).toEqual(["region"]);
    expect(out.rowsStash).toEqual(["city", "store"]);
    expect(out.measures?.map((m) => m.field)).toEqual(["amount"]);
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["qty"]);
  });
});

describe("指标卡（无维度、单指标）", () => {
  it("柱图 → 指标卡：维度全清、只留 1 指标、其余进暂存", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount"), M("qty"), M("cost")] });
    const out = switchType(bar, "kpi");
    expect(out.rows).toEqual([]); // 字面量：空数组不是 undefined
    expect(out.rowsStash).toEqual(["store"]);
    expect(out.measures?.map((m) => m.field)).toEqual(["amount"]);
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["qty", "cost"]); // 顺序保持
  });

  it("指标卡 → 柱图：维度与指标都并回（否则图表没有分类轴 = 空白卡）", () => {
    const kpi = chart({
      chartType: "kpi",
      rows: [],
      rowsStash: ["store"],
      measures: [M("amount")],
      stashedMeasures: [M("qty")],
    });
    const out = switchType(kpi, "bar");
    expect(out.rows).toEqual(["store"]);
    expect(out.measures?.map((m) => m.field)).toEqual(["amount", "qty"]);
    expect(out.rowsStash).toBeUndefined();
    expect(out.stashedMeasures).toBeUndefined();
  });

  it("指标卡 → 表格：多维度多指标都能装下", () => {
    const kpi = chart({
      chartType: "kpi",
      rows: [],
      rowsStash: ["store", "city"],
      measures: [M("amount")],
      stashedMeasures: [M("qty")],
    });
    const out = switchType(kpi, "table");
    expect(out.rows).toEqual(["store", "city"]);
    expect(out.measures?.length).toBe(2);
    expect(out.rowsStash).toBeUndefined();
    expect(out.stashedMeasures).toBeUndefined();
  });
});

describe("明细表（rows = 展示列，无指标槽）", () => {
  it("图表 → 明细表：指标进暂存，datefmt 维度退化成物理列", () => {
    const line = chart({ chartType: "line", rows: ["datefmt:order_date:month"], measures: [M("amount")] });
    const out = switchType(line, "detail-table");
    expect(out.rows).toEqual(["order_date"]); // 字面量：datefmt:order_date:month → order_date
    expect(out.measures).toEqual([]);
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["amount"]);
  });

  it("明细表 → 柱图：指标从暂存并回", () => {
    const detail = chart({ chartType: "detail-table", rows: ["order_date"], measures: [], stashedMeasures: [M("amount")] });
    const out = switchType(detail, "bar");
    expect(out.rows).toEqual(["order_date"]);
    expect(out.measures?.map((m) => m.field)).toEqual(["amount"]);
  });
});

describe("排序条件（后端白名单硬校验，必须剔除无效键）", () => {
  it("表格按第 3 个维度排序 → 柱图：该排序进暂存，orderBy 不留无效键", () => {
    const g = chart({
      chartType: "group-table",
      rows: ["region", "city", "store"],
      measures: [M("amount")],
      orderBy: [{ field: "store", dir: "asc" }],
    });
    const out = switchType(g, "bar");
    // 若这里保留 store，后端会直接报「排序字段 "store" 不在可用字段中」→ 整张卡查询失败
    expect(out.orderBy).toBeUndefined();
    expect(out.orderByStash).toEqual([{ field: "store", dir: "asc" }]); // 字面量
  });

  it("柱图 → 分组表：维度与排序一起并回", () => {
    // 排序键 store 之所以进暂存，是因为它当时作为维度也被暂存了 —— 两者必然成对出现。
    const bar = chart({
      chartType: "bar",
      rows: ["region"],
      rowsStash: ["store"],
      measures: [M("amount")],
      orderByStash: [{ field: "store", dir: "asc" }],
    });
    const out = switchType(bar, "group-table");
    expect(out.rows).toEqual(["region", "store"]);
    expect(out.orderBy).toEqual([{ field: "store", dir: "asc" }]);
    expect(out.orderByStash).toBeUndefined();
  });

  it("维度没并回时排序也不会并回（不留无效排序键）", () => {
    // 反例保护：只有排序在暂存、维度不在 —— 此时 store 仍不是可用排序键，必须继续暂存。
    // 若实现只看「暂存里有这条排序」就并回，后端会报「排序字段 "store" 不在可用字段中」。
    const bar = chart({
      chartType: "bar",
      rows: ["region"],
      measures: [M("amount")],
      orderByStash: [{ field: "store", dir: "asc" }],
    });
    const out = switchType(bar, "group-table");
    expect(out.rows).toEqual(["region"]);
    expect(out.orderBy).toBeUndefined();
    expect(out.orderByStash).toEqual([{ field: "store", dir: "asc" }]);
  });

  it("按指标排序 → 指标卡：指标别名仍可用，排序保留", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount")], orderBy: [{ field: "sum_amount", dir: "desc" }] });
    const out = switchType(bar, "kpi");
    expect(out.orderBy).toEqual([{ field: "sum_amount", dir: "desc" }]);
  });

  it("按被暂存的指标排序 → 指标卡：排序随之进暂存", () => {
    const bar = chart({
      chartType: "bar",
      rows: ["store"],
      measures: [M("amount"), M("qty")],
      orderBy: [{ field: "sum_qty", dir: "desc" }],
    });
    const out = switchType(bar, "kpi");
    expect(out.orderBy).toBeUndefined();
    expect(out.orderByStash).toEqual([{ field: "sum_qty", dir: "desc" }]);
  });

  it("切明细表时 datefmt 排序键退化成物理列（沿用旧行为，不整条丢掉）", () => {
    const t = chart({
      chartType: "table",
      rows: ["datefmt:order_date:month"],
      measures: [M("amount")],
      orderBy: [{ field: "datefmt:order_date:month", dir: "asc" }],
    });
    const out = switchType(t, "detail-table");
    expect(out.orderBy).toEqual([{ field: "order_date", dir: "asc" }]); // 字面量
    expect(out.orderByStash).toBeUndefined();
  });
});

describe("跨种类：显式 kind 必须同步改写", () => {
  it("kind=chart + chartType=bar 切到指标卡后 kind 变成 kpi", () => {
    // 显式 kind 优先级高于 chartType 派生；不改写就会「点了指标卡，面板还显示图表」
    const bar = chart({ chartType: "bar", kind: "chart", rows: ["store"], measures: [M("amount")] });
    const out = switchType(bar, "kpi");
    expect(out.kind).toBe("kpi");
    expect(out.chartType).toBe("kpi");
  });

  it("没有显式 kind 时不写入（存量报表不因一次切换多出字段）", () => {
    const out = switchType(chart({ chartType: "bar" }), "table");
    expect(out.kind).toBeUndefined();
  });
});

describe("迁移表无死角：4×4 组合 + 总量守恒", () => {
  const kindTypes: Record<string, ReportChartType> = {
    chart: "bar",
    table: "table",
    detail: "detail-table",
    kpi: "kpi",
  };
  const kinds = ["chart", "table", "detail", "kpi"];

  it("16 个 from→to 组合都产出合法配置，且不丢任何一项", () => {
    for (const from of kinds) {
      for (const to of kinds) {
        const src = chart({
          chartType: kindTypes[from],
          rows: ["region", "datefmt:order_date:month"],
          measures: [M("amount"), M("qty")],
          orderBy: [{ field: "region", dir: "asc" }],
        });
        const out = switchType(src, kindTypes[to]);
        // 只看「切换实际发生了」的组合（同类型直接返回空补丁）
        if (from === to) continue;
        const dims = (out.rows?.length ?? 0) + (out.rowsStash?.length ?? 0);
        const mes = (out.measures?.length ?? 0) + (out.stashedMeasures?.length ?? 0);
        expect(`${from}->${to} dims=${dims}`).toBe(`${from}->${to} dims=2`);
        expect(`${from}->${to} measures=${mes}`).toBe(`${from}->${to} measures=2`);
        if (to === "kpi") expect(out.rows).toEqual([]);
        if (to !== "kpi") expect(out.rowsStash?.length ?? 0).toBeLessThanOrEqual(2);
      }
    }
  });

  it("同类型切换返回空补丁（不制造无意义的状态变更）", () => {
    expect(switchType(chart({ chartType: "bar" }), "bar")).toEqual({});
  });
});

describe("手动投放（与切换共用同一份容量表）", () => {
  it("指标卡上再拖一个指标：新指标生效，旧指标进暂存（不是塞进看不见的 measures[1]）", () => {
    const kpi = chart({ chartType: "kpi", rows: [], measures: [M("amount")] });
    const out = pushMeasure(kpi, M("qty"));
    expect(out.measures?.map((m) => m.field)).toEqual(["qty"]); // 字面量：新投放的赢
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["amount"]);
  });

  it("柱图上拖第 2 个维度：新维度成为分类轴，旧维度进暂存", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount")] });
    const out = pushDim(bar, "city");
    expect(out.rows).toEqual(["city"]);
    expect(out.rowsStash).toEqual(["store"]);
  });

  it("表格容量无限：拖任何维度都只追加，不产生暂存", () => {
    const t = chart({ chartType: "table", rows: ["region"], measures: [M("amount")] });
    const out = pushDim(t, "city");
    expect(out.rows).toEqual(["region", "city"]);
    expect(out.rowsStash).toBeUndefined();
  });

  it("已存在的字段重复投放是空操作（不制造重复项）", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount")] });
    expect(pushDim(bar, "store")).toEqual({});
    expect(pushMeasure(bar, M("amount"))).toEqual({});
  });

  it("投放把作为排序键的维度挤走时，排序一并进暂存（否则整卡查询报错）", () => {
    // 柱图按 store 排序 → 再拖 city 进来，store 被挤进暂存。
    // 若 orderBy 还留着 store，后端会报「排序字段 "store" 不在可用字段中」。
    const bar = chart({
      chartType: "bar",
      rows: ["store"],
      measures: [M("amount")],
      orderBy: [{ field: "store", dir: "asc" }],
    });
    const out = pushDim(bar, "city");
    expect(out.rows).toEqual(["city"]);
    expect(out.orderBy).toBeUndefined();
    expect(out.orderByStash).toEqual([{ field: "store", dir: "asc" }]);
  });
});

describe("切到文本 / 图片卡（不查数据）", () => {
  const table = chart({
    chartType: "table",
    rows: ["store", "city"],
    measures: [M("amount"), M("qty")],
    orderBy: [{ field: "store", dir: "asc" }],
  });

  it("表格 → 文本：维度与指标全部进暂存，一个都不丢", () => {
    const out = switchType(table, "text");
    expect(out.chartType).toBe("text");
    expect(out.rows).toEqual([]);
    expect(out.measures).toEqual([]);
    expect(out.rowsStash).toEqual(["store", "city"]); // 字面量，顺序保持
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["amount", "qty"]);
  });

  it("表格 → 文本：排序键落在被暂存的维度上，必须一起移出（否则后端白名单报错）", () => {
    const out = switchType(table, "text");
    expect(out.orderBy).toBeUndefined();
    expect(out.orderByStash).toEqual([{ field: "store", dir: "asc" }]);
  });

  it("文本 → 表格：暂存原样并回，回到切换前", () => {
    const text = chart({ ...table, ...switchType(table, "text") });
    const back = switchType(text, "table");
    expect(back.chartType).toBe("table");
    expect(back.rows).toEqual(["store", "city"]);
    expect(back.measures?.map((m) => m.field)).toEqual(["amount", "qty"]);
    expect(back.stashedMeasures).toBeUndefined();
    expect(back.rowsStash).toBeUndefined();
    expect(back.orderBy).toEqual([{ field: "store", dir: "asc" }]);
  });

  it("柱图 → 图片：维度进暂存（图片卡同样装不下任何字段）", () => {
    const bar = chart({ chartType: "bar", rows: ["store"], measures: [M("amount")] });
    const out = switchType(bar, "image");
    expect(out.chartType).toBe("image");
    expect(out.rows).toEqual([]);
    expect(out.measures).toEqual([]);
    expect(out.rowsStash).toEqual(["store"]);
  });

  it("切到文本卡后提示条说清「有 N 项暂存」，但**不显示恢复按钮**", () => {
    const text = chart({ ...table, ...switchType(table, "text") });
    const n = stashNotice(text);
    expect(n.dims).toBe(2);
    expect(n.measures).toBe(2);
    expect(n.sorts).toBe(1);
    // 文本卡自身装不下任何字段，点「恢复」不会有任何变化 —— 显示按钮会被当成坏了。
    // 与 kpi 容量满同理（见上一条 kpi 的用例）。
    expect(n.canRestore).toBe(false);
    expect(n.text).toBe("2 个维度、2 个指标、1 条排序暂存，切回其它卡种可恢复");
  });
});

describe("restoreStash 与提示条", () => {
  it("还有余量时恢复：把暂存并回，并返回 canRestore=true", () => {
    // 恢复只在「用户事后腾出了空位」时才有意义：切到 kpi 时 1 个指标进暂存，
    // 用户随后把 kpi 上的那个指标删了（measures 空），此时点恢复才能真的加回来。
    // 若用「刚切换完」的状态测，容量必然已饱和 —— 那样的断言等于要求「恢复什么都没做」。
    const kpi = chart({ chartType: "kpi", rows: [], measures: [], stashedMeasures: [M("amount")] });
    expect(restoreStash(kpi).measures?.map((m) => m.field)).toEqual(["amount"]);
    expect(stashNotice(kpi).canRestore).toBe(true);
    expect(stashNotice(kpi).measures).toBe(1);
  });

  it("容量仍满时恢复是空操作（幂等，不产生变化）", () => {
    const kpi = chart({ chartType: "kpi", rows: [], measures: [M("amount")], stashedMeasures: [M("qty")] });
    const out = restoreStash(kpi);
    expect(out.measures?.map((m) => m.field)).toEqual(["amount"]);
    expect(out.stashedMeasures?.map((m) => m.field)).toEqual(["qty"]);
  });

  it("容量已满时（指标卡）canRestore=false，文案提示切回其它卡种", () => {
    const kpi = chart({ chartType: "kpi", rows: [], measures: [M("amount")], stashedMeasures: [M("qty")] });
    const n = stashNotice(kpi);
    expect(n.canRestore).toBe(false);
    expect(n.text).toBe("1 个指标暂存，切回其它卡种可恢复"); // 字面量
  });

  it("没有暂存时不显示提示条", () => {
    expect(stashNotice(chart({ chartType: "bar" })).text).toBe("");
  });

  it("提示文案包含三类的个数", () => {
    const c = chart({
      chartType: "kpi",
      measures: [M("amount")],
      stashedMeasures: [M("qty")],
      rowsStash: ["store"],
      orderByStash: [{ field: "sum_qty", dir: "desc" }],
    });
    expect(stashNotice(c).text).toContain("1 个维度");
    expect(stashNotice(c).text).toContain("1 个指标");
    expect(stashNotice(c).text).toContain("1 条排序");
  });
});
