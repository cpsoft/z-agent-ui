// 表格列展示口径的测试（2026-10-25）。
//
// [为什么单独一个文件] 这是 React 渲染与 <z-report-card> 元素渲染**共用**的一份口径。
// 期望值全部手写，不从被测函数反推：一个把 `title` 直接等于物理列名的实现，
// 只要断言也写成 `c.title === c.key` 就会永远绿 —— 而线上症状恰恰是「表头印着 city_name」。
import { describe, expect, it } from "vitest";
import {
  AGG_OPTIONS,
  aggLabelOf,
  colAlign,
  colTitle,
  colWidthOf,
  dimLabel,
  formatCellValue,
  measureLabelOf,
  measureTitleOf,
  GRANULARITIES,
} from "../../src/report/core/report-columns.js";
import type { Column, ReportChart, ReportMeasure } from "../../src/report/core/types.js";

const COLS: Column[] = [
  { name: "d", alias: "日期", comment: "业务日期", dataType: "date" } as Column,
  { name: "city_name", comment: "城市", dataType: "varchar" } as Column,
  { name: "amount", dataType: "decimal" } as Column,
];

const chart = (p: Partial<ReportChart> = {}): ReportChart =>
  ({
    id: "c1",
    title: "t",
    datasetId: 1,
    rows: ["d"],
    measures: [{ field: "amount", agg: "sum" }],
    filters: [],
    chartType: "table",
    limit: 100,
    ...p,
  }) as ReportChart;

describe("dimLabel：别名 > 注释 > 物理名", () => {
  it("有别名用别名", () => {
    expect(dimLabel("d", COLS)).toBe("日期");
  });
  it("无别名用注释", () => {
    expect(dimLabel("city_name", COLS)).toBe("城市");
  });
  it("都没有才用物理名", () => {
    expect(dimLabel("amount", COLS)).toBe("amount");
  });
  it("元数据缺失时回落物理名（不能变成空串）", () => {
    expect(dimLabel("city_name", [])).toBe("city_name");
  });
  it("datefmt 维度带粒度：字段名（月）", () => {
    expect(dimLabel("datefmt:d:month", COLS)).toBe("日期（月）");
  });
  it("datefmt 的字段本身没有元数据时用物理名（月）", () => {
    expect(dimLabel("datefmt:pay_time:day", COLS)).toBe("pay_time（日）");
  });
});

describe("formatCellValue：小数位 / 千分位 / 百分数", () => {
  it("未配置格式 → 保留原始精度（不丢 24.681818 的小数）", () => {
    expect(formatCellValue(24.681818181818183)).toBe("24.681818181818183");
  });
  it("小数位 2 → 四舍五入到两位", () => {
    expect(formatCellValue(24.6818, { decimalPlaces: 2 })).toBe("24.68");
  });
  it("千分位", () => {
    expect(formatCellValue(1234567, { thousands: true })).toBe("1,234,567");
  });
  it("百分数：存储值是比率，0.93628 → 93.63%（不是 0.94%）", () => {
    expect(formatCellValue(0.93628, { formatType: "percent", decimalPlaces: 2 })).toBe("93.63%");
  });
  it("NULL / 空串 → 空（不是 0）", () => {
    expect(formatCellValue(null)).toBe("");
    expect(formatCellValue("")).toBe("");
  });
  it("非数字原样返回（不能被数字格式化吞掉）", () => {
    expect(formatCellValue("甲店")).toBe("甲店");
  });
  it("maxDecimalPlaces：只设上限 —— 整数不补零、超出部分四舍五入", () => {
    expect(formatCellValue(1234, { thousands: true, maxDecimalPlaces: 2 })).toBe("1,234");
    expect(formatCellValue(1234.5, { thousands: true, maxDecimalPlaces: 2 })).toBe("1,234.5");
    expect(formatCellValue(1234.5678, { thousands: true, maxDecimalPlaces: 2 })).toBe("1,234.57");
  });
  it("maxDecimalPlaces 与 decimalPlaces 同时给 → decimalPlaces（固定位数）优先", () => {
    expect(formatCellValue(1234, { decimalPlaces: 2, maxDecimalPlaces: 0 })).toBe("1234.00");
  });
});

describe("列覆盖：colTitle / colAlign / colWidthOf", () => {
  it("别名非空才覆盖（空白字符串不算）", () => {
    expect(colTitle("d", "日期", { d: { alias: "营业日" } })).toBe("营业日");
    expect(colTitle("d", "日期", { d: { alias: "   " } })).toBe("日期");
    expect(colTitle("d", "日期", {})).toBe("日期");
  });
  it("对齐与列宽覆盖", () => {
    expect(colAlign("d", "left", { d: { align: "center" } })).toBe("center");
    expect(colAlign("d", "left", {})).toBe("left");
    expect(colWidthOf("d", "140px", { d: { width: "200px" } })).toBe("200px");
    expect(colWidthOf("d", "140px", { d: { width: " " } })).toBe("140px");
  });
});

describe("指标标题：基名（聚合标签）", () => {
  const m = (p: Partial<ReportMeasure> = {}): ReportMeasure => ({ field: "amount", agg: "sum", ...p }) as ReportMeasure;

  it("基名取列别名", () => {
    expect(measureLabelOf(m(), chart(), [{ name: "amount", alias: "金额" } as Column])).toBe("金额");
  });
  it("带聚合标签", () => {
    expect(measureTitleOf(m(), chart(), COLS)).toBe("amount（求和）");
  });
  it("去重计数有中文名（不能印 countDistinct）", () => {
    expect(measureTitleOf(m({ agg: "countDistinct" }), chart(), COLS)).toBe("amount（去重计数）");
  });
  it("计算字段度量用它的命名，不加聚合后缀", () => {
    const c = chart({
      computedFields: [{ key: "cf1", name: "毛利", expr: "a-b" }],
    } as Partial<ReportChart>);
    expect(measureTitleOf(m({ field: "cf1", agg: "", computed: true }), c, COLS)).toBe("毛利");
  });
});

describe("常量表自身", () => {
  it("AGG_OPTIONS 覆盖全部后端聚合值（少一个会让列头印英文）", () => {
    expect(AGG_OPTIONS.map((o) => o.value)).toEqual(["sum", "avg", "min", "max", "count", "countDistinct"]);
    expect(aggLabelOf("sum")).toBe("求和");
    expect(aggLabelOf("unknown")).toBe("unknown");
  });
  it("GRANULARITIES 含空值（原样）与后端支持的粒度", () => {
    expect(GRANULARITIES[0]).toEqual({ value: "", label: "原样" });
    expect(GRANULARITIES.map((g) => g.value)).toContain("month");
  });
});
