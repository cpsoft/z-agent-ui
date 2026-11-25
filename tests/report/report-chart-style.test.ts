import { describe, expect, it } from "vitest";
import {
  effectiveOverlay,
  effectiveStack,
  seriesTypeAt,
  stackCapable,
  styleSummary,
  styleWarning,
  withOverlay,
  withStack,
} from "../../src/report/core/report-chart-style.js";
import type { ReportChart, ReportMeasure } from "../../src/report/core/types.js";

const M = (field: string): ReportMeasure => ({ field, agg: "sum" });
const ch = (over: Partial<ReportChart> = {}): ReportChart => ({
  id: "c1",
  title: "图表1",
  datasetId: 1,
  rows: ["region"],
  measures: [M("a"), M("b")],
  filters: [],
  chartType: "bar",
  limit: 1000,
  ...over,
});

describe("堆积/叠加的前提判定", () => {
  it("柱图 + 2 指标 → 可堆", () => {
    expect(stackCapable(ch())).toBe(true);
  });

  it("柱图 + 1 指标 → 不可堆（单系列堆积与并排等价，percent 更会变成一堆等高条）", () => {
    expect(stackCapable(ch({ measures: [M("a")] }))).toBe(false);
  });

  it("折线图 + 2 指标 → 不可堆（横向/堆积只对 bar 有意义）", () => {
    expect(stackCapable(ch({ chartType: "line" }))).toBe(false);
  });

  it("表格 + 2 指标 → 不可堆", () => {
    expect(stackCapable(ch({ chartType: "table" }))).toBe(false);
  });

  it("显式 kind=table 的柱图（kind 优先于 chartType）→ 不可堆", () => {
    expect(stackCapable(ch({ kind: "table" }))).toBe(false);
  });
});

describe("有效值：存储值不合法 / 前提不满足时一律回落 none", () => {
  it("合法值原样返回", () => {
    expect(effectiveStack(ch({ stack: "stacked" }))).toBe("stacked");
    expect(effectiveStack(ch({ stack: "percent" }))).toBe("percent");
    expect(effectiveOverlay(ch({ overlay: "line" }))).toBe("line");
    expect(effectiveOverlay(ch({ overlay: "area" }))).toBe("area");
  });

  it("非法字符串 → none（属性值可能来自手改 JSON）", () => {
    expect(effectiveStack(ch({ stack: "STACK" as never }))).toBe("none");
    expect(effectiveOverlay(ch({ overlay: "bar" as never }))).toBe("none");
  });

  it("缺省 → none", () => {
    expect(effectiveStack(ch())).toBe("none");
    expect(effectiveOverlay(ch())).toBe("none");
  });

  it("前提不满足时即使存了也回落 none（与底层 bar 系列数 < 2 的回落口径一致）", () => {
    expect(effectiveStack(ch({ measures: [M("a")], stack: "percent" }))).toBe("none");
    expect(effectiveOverlay(ch({ measures: [M("a")], overlay: "line" }))).toBe("none");
  });
});

describe("叠加：第 2 个指标起才换画法", () => {
  it("index 0 永远跟随主类型（否则整张图没有柱子）", () => {
    expect(seriesTypeAt(ch({ overlay: "line" }), 0)).toBe(undefined);
  });

  it("index ≥ 1 用叠加画法", () => {
    const c = ch({ overlay: "line", measures: [M("a"), M("b"), M("c")] });
    expect(seriesTypeAt(c, 1)).toBe("line");
    expect(seriesTypeAt(c, 2)).toBe("line");
  });

  it("未开叠加 → 全部 undefined（交给底层 auto）", () => {
    expect(seriesTypeAt(ch(), 1)).toBe(undefined);
    expect(seriesTypeAt(ch({ overlay: "none" }), 1)).toBe(undefined);
  });

  it("面积叠加返回 area", () => {
    expect(seriesTypeAt(ch({ overlay: "area" }), 1)).toBe("area");
  });
});

describe("堆积与叠加互斥", () => {
  it("设堆积会清掉叠加", () => {
    const got = withStack("stacked");
    expect(got.stack).toBe("stacked");
    expect("overlay" in got).toBe(true);
    expect(got.overlay).toBe(undefined);
  });

  it("设叠加会清掉堆积", () => {
    const got = withOverlay("line");
    expect(got.overlay).toBe("line");
    expect(got.stack).toBe(undefined);
  });

  it("清成 none 也照样清掉另一半（避免「两个都开着」的残留状态）", () => {
    expect(withStack("none").overlay).toBe(undefined);
    expect(withOverlay("none").stack).toBe(undefined);
  });
});

describe("配了但不生效时要说出来（防静默失效）", () => {
  it("正常情况无提示", () => {
    expect(styleWarning(ch({ stack: "stacked" }))).toBe("");
    expect(styleWarning(ch())).toBe("");
  });

  it("删掉一个指标后提示堆积不生效", () => {
    expect(styleWarning(ch({ measures: [M("a")], stack: "stacked" }))).toContain("不生效");
  });

  it("切成折线后提示当前不是柱状图", () => {
    expect(styleWarning(ch({ chartType: "line", overlay: "line" }))).toContain("不是柱状图");
  });

  it("百分比堆积的提示也带「堆积」字样", () => {
    expect(styleWarning(ch({ measures: [M("a")], stack: "percent" }))).toContain("堆积");
  });
});

describe("形态摘要", () => {
  it("各形态给出一句话", () => {
    expect(styleSummary(ch({ stack: "stacked" }))).toBe("堆积");
    expect(styleSummary(ch({ stack: "percent" }))).toBe("百分比堆积");
    expect(styleSummary(ch({ overlay: "line" }))).toBe("柱线组合");
    expect(styleSummary(ch({ overlay: "area" }))).toBe("柱 + 面积");
    expect(styleSummary(ch())).toBe("");
  });

  it("不生效时摘要为空（界面不能显示「堆积」而图上是并排）", () => {
    expect(styleSummary(ch({ measures: [M("a")], stack: "stacked" }))).toBe("");
  });
});
