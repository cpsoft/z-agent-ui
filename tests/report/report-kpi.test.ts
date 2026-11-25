// 指标卡纯函数测试。期望值一律硬编码字面量：
// 不调用被测函数生成期望（例如不用 formatKpi(v) 当 kpiDelta 的断言输入），
// 否则实现整体坏掉时两侧一起坏，断言恒绿。
import { describe, expect, it } from "vitest";
import {
  formatKpi,
  kpiColorMode,
  kpiDelta,
  kpiRaw,
  kpiTone,
  measureKeyOf,
  shiftPeriodFilters,
} from "../../src/report/core/report-kpi.js";
import type { AggregateResult, ReportChart } from "../../src/report/core/types.js";

const chart = (over: Partial<ReportChart> = {}): ReportChart => ({
  id: "c1",
  title: "销售额",
  datasetId: 1,
  rows: [],
  measures: [{ field: "amount", agg: "sum" }],
  filters: [],
  chartType: "kpi",
  limit: 100,
  ...over,
});

const result = (rows: Record<string, unknown>[]): AggregateResult => ({ rows, columns: [], total: rows.length });

describe("指标卡取值", () => {
  it("measureKey 三种形态：别名优先 / 普通度量 agg_field / 计算字段无 agg 用字段名", () => {
    expect(measureKeyOf({ field: "amount", agg: "sum" })).toBe("sum_amount");
    expect(measureKeyOf({ field: "amount", agg: "sum", alias: "销售额" })).toBe("销售额");
    expect(measureKeyOf({ field: "gross", agg: "", computed: true })).toBe("gross");
  });

  it("0 与 NULL 必须区分：0 是 0，NULL 是「--」", () => {
    expect(kpiRaw(chart(), result([{ sum_amount: 0 }]))).toBe(0);
    expect(kpiRaw(chart(), result([{ sum_amount: null }]))).toBeNull();
  });

  it("无数据行 / 无指标 → null（不是 0）", () => {
    expect(kpiRaw(chart(), result([]))).toBeNull();
    expect(kpiRaw(chart({ measures: [] }), result([{ sum_amount: 9 }]))).toBeNull();
    expect(kpiRaw(chart(), null)).toBeNull();
  });

  it("字符串数值可解析，非数字 → null", () => {
    expect(kpiRaw(chart(), result([{ sum_amount: "1234.5" }]))).toBe(1234.5);
    expect(kpiRaw(chart(), result([{ sum_amount: "abc" }]))).toBeNull();
    expect(kpiRaw(chart(), result([{ sum_amount: "" }]))).toBeNull();
  });
});

describe("指标卡格式化", () => {
  it("null → --，0 → 0（空数据不能显示成 0 元）", () => {
    expect(formatKpi(null)).toBe("--");
    expect(formatKpi(0)).toBe("0");
  });

  it("千分位默认开，可关", () => {
    expect(formatKpi(1234567)).toBe("1,234,567");
    expect(formatKpi(1234567, { thousands: false })).toBe("1234567");
  });

  it("小数位与单位后缀", () => {
    expect(formatKpi(12.345, { decimals: 2 })).toBe("12.35");
    expect(formatKpi(1234, { unit: "元" })).toBe("1,234元");
    expect(formatKpi(null, { unit: "元" })).toBe("--");
  });
});

describe("环比", () => {
  it("常规涨跌：100 → 125 是 +25%", () => {
    expect(kpiDelta(125, 100)).toEqual({ kind: "up", text: "+25%" });
    expect(kpiDelta(80, 100)).toEqual({ kind: "down", text: "-20%" });
    expect(kpiDelta(100, 100)).toEqual({ kind: "flat", text: "0%" });
  });

  it("上期为 0：本期非 0 显示「新增」，不是 Infinity%", () => {
    expect(kpiDelta(50, 0)).toEqual({ kind: "new", text: "新增" });
    expect(kpiDelta(0, 0)).toEqual({ kind: "flat", text: "持平" });
  });

  it("上期为负：用绝对差而不是百分比（-100 → -50 是改善，不是 -50%）", () => {
    // 绝对值 100 → 50，改善 50；百分比会算成 -50%（看着像变差）
    expect(kpiDelta(-50, -100)).toEqual({ kind: "up", text: "+50" });
    expect(kpiDelta(-150, -100)).toEqual({ kind: "down", text: "-50" });
  });

  it("任一侧 null → --（不是 0%）", () => {
    expect(kpiDelta(null, 100)).toEqual({ kind: "unknown", text: "--" });
    expect(kpiDelta(100, null)).toEqual({ kind: "unknown", text: "--" });
  });
});

describe("阈值色", () => {
  it("越大越差：超 danger 危险、超 warn 警戒、其余正常", () => {
    const t = { warn: 80, danger: 100, direction: "higher_is_worse" as const };
    expect(kpiTone(120, t)).toBe("danger");
    expect(kpiTone(100, t)).toBe("danger");
    expect(kpiTone(90, t)).toBe("warn");
    expect(kpiTone(79.9, t)).toBe("normal");
  });

  it("越小越差：方向相反，判反会把达标染成红色", () => {
    const t = { warn: 1000, danger: 500, direction: "lower_is_worse" as const };
    expect(kpiTone(400, t)).toBe("danger");
    expect(kpiTone(800, t)).toBe("warn");
    expect(kpiTone(1200, t)).toBe("normal");
  });

  it("无配置或 null → 正常", () => {
    expect(kpiTone(999, undefined)).toBe("normal");
    expect(kpiTone(null, { warn: 1, danger: 1, direction: "higher_is_worse" })).toBe("normal");
  });
});

describe("环比与阈值互斥", () => {
  it("两者都配时环比优先（卡面只有一个颜色位置）", () => {
    const th = { warn: 1, danger: 2, direction: "higher_is_worse" as const };
    expect(kpiColorMode({ compare: { mode: "prev_period", alignBy: "length" }, thresholds: th })).toBe("compare");
    expect(kpiColorMode({ thresholds: th })).toBe("thresholds");
    expect(kpiColorMode({})).toBe("none");
    expect(kpiColorMode(undefined)).toBe("none");
  });
});

describe("上期筛选平移", () => {
  const isDate = (f: string) => f === "report_date";

  it("7 天窗口前移 7 天（含首尾：10-01~10-07 → 09-24~09-30）", () => {
    const got = shiftPeriodFilters(
      [
        { field: "report_date", op: ">=", value: "2026-10-01" },
        { field: "report_date", op: "<=", value: "2026-10-07" },
      ],
      isDate,
    );
    expect(got).toEqual([
      { field: "report_date", op: ">=", value: "2026-09-24" },
      { field: "report_date", op: "<=", value: "2026-09-30" },
    ]);
  });

  it("非日期条件原样保留（金额阈值不该被平移）", () => {
    const got = shiftPeriodFilters(
      [
        { field: "report_date", op: ">=", value: "2026-10-01" },
        { field: "report_date", op: "<=", value: "2026-10-01" },
        { field: "amount", op: ">=", value: 100 },
      ],
      isDate,
    );
    expect(got).toEqual([
      { field: "report_date", op: ">=", value: "2026-09-30" },
      { field: "report_date", op: "<=", value: "2026-09-30" },
      { field: "amount", op: ">=", value: 100 },
    ]);
  });

  it("没有日期窗口 → null（调用方必须显示 --，不能拿本期当上期）", () => {
    expect(shiftPeriodFilters([{ field: "store", op: "=", value: "甲店" }], isDate)).toBeNull();
    expect(shiftPeriodFilters([], isDate)).toBeNull();
  });

  it("between 形态同样平移，保留时间部分", () => {
    const got = shiftPeriodFilters(
      [{ field: "report_date", op: "between", value: ["2026-10-01 00:00:00", "2026-10-02 23:59:59"] }],
      isDate,
    );
    expect(got).toEqual([
      { field: "report_date", op: "between", value: ["2026-09-29 00:00:00", "2026-09-30 23:59:59"] },
    ]);
  });
});
