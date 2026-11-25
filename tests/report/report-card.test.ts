// Test: 卡片种类契约（kind 派生 / 渲染类型收敛 / 槽位能力）
// [NOTE] 断言一律写字面量期望值，不做「两侧互比」——卡种派生函数坏掉时，
// 互比式断言会两侧一起坏、恒绿（见 2026-10-08 实例登记入库的教训）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { CHART_RENDERABLE, cardKind, cardSlots, chartRenderType, KIND_OF, needsFieldPanel } from "../../src/report/core/report-card.js";
import type { ReportChartType } from "../../src/report/core/types.js";

describe("cardKind 派生", () => {
  const cases: [ReportChartType, string][] = [
    ["bar", "chart"],
    ["line", "chart"],
    ["pie", "chart"],
    ["radar", "chart"],
    ["waterfall", "chart"],
    ["table", "table"],
    ["group-table", "table"],
    ["tree-table", "table"],
    ["detail-table", "detail"],
    ["kpi", "kpi"],
    ["text", "text"],
    ["image", "image"],
  ];

  it("12 种 chartType 逐个映射到硬编码的种类", () => {
    for (const [chartType, expected] of cases) {
      expect(cardKind({ chartType })).toBe(expected);
    }
  });

  it("KIND_OF 与 cardKind 的派生结果一致且穷举", () => {
    expect(Object.keys(KIND_OF).sort()).toEqual(
      [
        "bar",
        "detail-table",
        "group-table",
        "image",
        "kpi",
        "line",
        "pie",
        "radar",
        "waterfall",
        "table",
        "text",
        "tree-table",
      ].sort(),
    );
  });

  it("显式 kind 优先于 chartType 派生", () => {
    // 场景：组件从 chart 切成 kpi 但保留了 bar 的 chartType 历史值
    expect(cardKind({ chartType: "bar", kind: "kpi" })).toBe("kpi");
    expect(cardKind({ chartType: "kpi", kind: "table" })).toBe("table");
  });

  it("kind 为 undefined 时走派生（存量报表）", () => {
    expect(cardKind({ chartType: "tree-table", kind: undefined })).toBe("table");
  });

  it("脏 chartType 回落 table，不抛错", () => {
    // 后端不校验 chartType（report_store.go:229 只补空值），历史数据可能存在任意串
    expect(cardKind({ chartType: "PIVOT" as ReportChartType })).toBe("table");
  });
});

describe("chartRenderType 收敛", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("可渲染类型原样返回", () => {
    expect(chartRenderType({ chartType: "bar" })).toBe("bar");
    expect(chartRenderType({ chartType: "line" })).toBe("line");
    expect(chartRenderType({ chartType: "pie" })).toBe("pie");
  });

  it("表格/明细/指标卡回落 bar 并打错误日志", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const chartType of ["table", "group-table", "tree-table", "detail-table", "kpi"] as ReportChartType[]) {
      expect(chartRenderType({ chartType })).toBe("bar");
    }
    // 五次调用 = 五条日志（不能静默，否则空白卡无法归因）
    expect(spy).toHaveBeenCalledTimes(5);
    expect(spy.mock.calls[0][0]).toContain("[report-card]");
    expect(spy.mock.calls[0][0]).toContain("table");
  });

  it("文本/图片卡同样回落 bar 并打日志（它们不是画图分支）", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(chartRenderType({ chartType: "text" })).toBe("bar");
    expect(chartRenderType({ chartType: "image" })).toBe("bar");
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("CHART_RENDERABLE 不含表格与指标卡（vendor 不支持）", () => {
    const list = [...CHART_RENDERABLE];
    expect(list).toContain("bar");
    expect(list).toContain("sparkline");
    expect(list).not.toContain("kpi");
    expect(list).not.toContain("table");
  });
});

describe("cardSlots 槽位能力", () => {
  it("chart 五槽全开", () => {
    expect(cardSlots("chart")).toEqual({ dim: true, measure: true, sort: true, filter: true, limit: true });
  });

  it("table 无行数上限（聚合结果由维度决定）", () => {
    expect(cardSlots("table")).toEqual({ dim: true, measure: true, sort: true, filter: true, limit: false });
  });

  it("detail 有维度无指标", () => {
    expect(cardSlots("detail")).toEqual({ dim: true, measure: false, sort: true, filter: true, limit: true });
  });

  it("kpi 无维度无排序", () => {
    expect(cardSlots("kpi")).toEqual({ dim: false, measure: true, sort: false, filter: true, limit: false });
  });

  it("text / image 五槽全关（不查数据）", () => {
    expect(cardSlots("text")).toEqual({ dim: false, measure: false, sort: false, filter: false, limit: false });
    expect(cardSlots("image")).toEqual({ dim: false, measure: false, sort: false, filter: false, limit: false });
  });
});

describe("needsFieldPanel（左池是否折叠）", () => {
  it("数据卡需要字段面板", () => {
    for (const k of ["chart", "table", "detail", "kpi"] as const) {
      expect(needsFieldPanel(k)).toBe(true);
    }
  });

  it("文本 / 图片卡不需要（折叠成窄条）", () => {
    expect(needsFieldPanel("text")).toBe(false);
    expect(needsFieldPanel("image")).toBe(false);
  });
});
