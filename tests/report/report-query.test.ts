// 取数语义的边界测试。
//
// [为什么每条期望值都是手写字面量] 若用被测实现算期望（例如拿 resolveRelativeDate
// 的结果去断 resolveFilter），实现整体坏掉时两侧一起坏、断言恒绿。日期计算尤其容易
// 这样「自洽地错」—— 测试全过、报表窗口永远差一天。

import { describe, expect, it, vi } from "vitest";
import {
  aggregateRequestOf,
  dateStr,
  detailFields,
  detailRequestOf,
  isRelativeDateKey,
  queryChartData,
  orderByOfSort,
  orderableFields,
  relativeDateLabel,
  resolveFilter,
  resolveFilters,
  resolveRelativeDate,
  validOrderBy,
} from "../../src/report/core/report-query.js";
import type { AggregateRequest, ReportDataSource } from "../../src/report/core/data-source.js";
import type { ReportChart } from "../../src/report/core/types.js";

/** now 用本地时间构造（数字入参），不写 ISO 字符串 —— 后者在无时区后缀时按本地解析、
 *  带 Z 时按 UTC，跨时区 CI 会稳定地错一天。 */
const at = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h, 0, 0);

function mkChart(p: Partial<ReportChart> = {}): ReportChart {
  return {
    id: "chart-1",
    title: "卡",
    datasetId: 7,
    rows: [],
    measures: [],
    filters: [],
    chartType: "bar",
    limit: 1000,
    ...p,
  };
}

describe("resolveRelativeDate — 每个标记的窗口", () => {
  const now = at(2026, 3, 10); // 2026-03-10（非闰年）

  it("@today 覆盖当天全天（end 带 23:59:59，否则查不到当天数据）", () => {
    expect(resolveRelativeDate("@today", now)).toEqual({
      start: "2026-03-10",
      end: "2026-03-10 23:59:59",
    });
  });

  it("@yesterday 退一天", () => {
    expect(resolveRelativeDate("@yesterday", now)).toEqual({
      start: "2026-03-09",
      end: "2026-03-09 23:59:59",
    });
  });

  it("@last7d 是含今天共 7 天（不是 8 天）", () => {
    expect(resolveRelativeDate("@last7d", now)).toEqual({
      start: "2026-03-04",
      end: "2026-03-10 23:59:59",
    });
  });

  it("@last30d 跨月正确", () => {
    expect(resolveRelativeDate("@last30d", now)).toEqual({
      start: "2026-02-09",
      end: "2026-03-10 23:59:59",
    });
  });

  it("@thisMonth 从 1 号起", () => {
    expect(resolveRelativeDate("@thisMonth", now)).toEqual({
      start: "2026-03-01",
      end: "2026-03-10 23:59:59",
    });
  });

  it("@lastMonth 的末日按真实月长（2 月 28 天）", () => {
    expect(resolveRelativeDate("@lastMonth", now)).toEqual({
      start: "2026-02-01",
      end: "2026-02-28 23:59:59",
    });
  });

  it("@thisYear 从 1 月 1 日起", () => {
    expect(resolveRelativeDate("@thisYear", now)).toEqual({
      start: "2026-01-01",
      end: "2026-03-10 23:59:59",
    });
  });

  it("未知标记返回 null（调用方据此原样透传）", () => {
    expect(resolveRelativeDate("@nonsense", now)).toBeNull();
    expect(resolveRelativeDate("2026-03-01", now)).toBeNull();
  });
});

describe("resolveRelativeDate — 跨年与闰年边界", () => {
  it("1 月初的 @lastMonth 落到上一年 12 月", () => {
    expect(resolveRelativeDate("@lastMonth", at(2026, 1, 5))).toEqual({
      start: "2025-12-01",
      end: "2025-12-31 23:59:59",
    });
  });

  it("1 月初的 @last7d 跨年", () => {
    expect(resolveRelativeDate("@last7d", at(2026, 1, 5))).toEqual({
      start: "2025-12-30",
      end: "2026-01-05 23:59:59",
    });
  });

  it("闰年 3 月的 @lastMonth 是 2 月 29 日", () => {
    expect(resolveRelativeDate("@lastMonth", at(2024, 3, 31))).toEqual({
      start: "2024-02-01",
      end: "2024-02-29 23:59:59",
    });
  });

  it("3 月 31 日的 @last30d 不溢到 3 月 1 日之前", () => {
    expect(resolveRelativeDate("@last30d", at(2026, 3, 31))?.start).toBe("2026-03-02");
  });
});

describe("dateStr / isRelativeDateKey / relativeDateLabel", () => {
  it("dateStr 用本地日历日，不退成 UTC 前一天", () => {
    // 本地 00:30 —— 若实现用 toISOString()，东八区会输出前一天
    expect(dateStr(new Date(2026, 2, 10, 0, 30))).toBe("2026-03-10");
  });

  it("isRelativeDateKey 只认内置标记", () => {
    expect(isRelativeDateKey("@last7d")).toBe(true);
    expect(isRelativeDateKey("@last8d")).toBe(false);
    expect(isRelativeDateKey(undefined)).toBe(false);
    expect(isRelativeDateKey(7)).toBe(false);
  });

  it("relativeDateLabel 可被宿主覆盖", () => {
    expect(relativeDateLabel("@today")).toBe("今天");
    expect(relativeDateLabel("@today", { "@today": "Today" })).toBe("Today");
    expect(relativeDateLabel("raw")).toBe("raw");
  });
});

describe("resolveFilter — 一条筛选可能展开成两条", () => {
  const now = at(2026, 3, 10);

  it("相对日期展开为 >= / <= 两条", () => {
    expect(resolveFilter({ field: "d", op: "=", value: "@today" }, now)).toEqual([
      { field: "d", op: ">=", value: "2026-03-10" },
      { field: "d", op: "<=", value: "2026-03-10 23:59:59" },
    ]);
  });

  it("between 的起止各自按端点解析（起点取 start、终点取 end）", () => {
    expect(
      resolveFilter({ field: "d", op: "between", value: ["@thisMonth", "@today"] }, now),
    ).toEqual([
      // 起点取 start（本月 1 日），终点取 end（今天 23:59:59）—— 不能都把 start 塞进去
      { field: "d", op: "between", value: ["2026-03-01", "2026-03-10 23:59:59"] },
    ]);
  });

  it("between 混普通值时普通侧原样保留", () => {
    expect(
      resolveFilter({ field: "d", op: "between", value: ["2026-01-01", "@today"] }, now),
    ).toEqual([{ field: "d", op: "between", value: ["2026-01-01", "2026-03-10 23:59:59"] }]);
  });

  it("非相对条件原样返回（同一个对象，不改写）", () => {
    const f = { field: "store", op: "in" as const, value: ["a", "b"] };
    expect(resolveFilter(f, now)).toEqual([f]);
  });

  it("resolveFilters 用 flatMap 展开（两条相对日期 → 四条条件）", () => {
    const out = resolveFilters(
      [
        { field: "d1", op: "=", value: "@today" },
        { field: "d2", op: "=", value: "@yesterday" },
      ],
      now,
    );
    expect(out).toHaveLength(4);
    expect(out.map((f) => `${f.field}${f.op}`)).toEqual(["d1>=", "d1<=", "d2>=", "d2<="]);
  });
});

describe("detailFields — 明细表展示列", () => {
  it("datefmt 维度退化成物理列，且与指标列去重保序", () => {
    const chart = mkChart({
      rows: ["datefmt:pay_time:month", "store", "amount"],
      measures: [{ field: "amount", agg: "sum" }, { field: "qty", agg: "sum" }],
    });
    expect(detailFields(chart)).toEqual(["pay_time", "store", "amount", "qty"]);
  });

  it("空字段被跳过（不下发空列名）", () => {
    expect(detailFields(mkChart({ rows: ["", "a"], measures: [] }))).toEqual(["a"]);
  });
});

describe("aggregateRequestOf — 指标卡必须收敛成单值", () => {
  it("kpi：清空维度 / 清空排序 / limit 1", () => {
    const chart = mkChart({
      kind: "kpi",
      rows: ["store", "region"], // 从柱状图切过来时维度仍在配置里
      measures: [{ field: "amount", agg: "sum" }],
      limit: 500,
    });
    const body = aggregateRequestOf(chart, [], [{ field: "sum_amount", dir: "desc" }]);
    // 三条都要断：漏任意一条都会返回多行，卡面取 rows[0] = 随机分组
    expect(body.dimensions).toEqual([]);
    expect(body.orderBy).toEqual([]);
    expect(body.limit).toBe(1);
  });

  it("kpi 由 chartType 派生也生效（不显式写 kind）", () => {
    const body = aggregateRequestOf(mkChart({ chartType: "kpi", rows: ["store"] }), []);
    expect(body.dimensions).toEqual([]);
    expect(body.limit).toBe(1);
  });

  it("非 kpi：维度 / 排序 / limit 原样带上", () => {
    const chart = mkChart({ rows: ["store"], measures: [{ field: "amount", agg: "sum" }], limit: 200 });
    const orderBy = [{ field: "sum_amount", dir: "desc" as const }];
    const body = aggregateRequestOf(chart, [], orderBy);
    expect(body.dimensions).toEqual(["store"]);
    expect(body.orderBy).toEqual(orderBy);
    expect(body.limit).toBe(200);
  });

  it("指标别名走 measureKeyOf（与渲染取值同一个 key）", () => {
    const body = aggregateRequestOf(
      mkChart({
        rows: ["store"],
        measures: [
          { field: "amount", agg: "sum" },
          { field: "amount", agg: "avg" },
          { field: "amount", agg: "sum", alias: "my_total" },
        ],
      }),
      [],
    );
    expect(body.measures.map((m) => m.alias)).toEqual(["sum_amount", "avg_amount", "my_total"]);
  });

  it("相对日期筛选在构造请求时已解析（宿主不需要自己展开）", () => {
    const body = aggregateRequestOf(
      mkChart({ rows: ["store"] }),
      [{ field: "pay_time", op: "=", value: "@today" }],
      undefined,
      at(2026, 3, 10),
    );
    expect(body.filters).toEqual([
      { field: "pay_time", op: ">=", value: "2026-03-10" },
      { field: "pay_time", op: "<=", value: "2026-03-10 23:59:59" },
    ]);
  });

  it("计算字段与 having 透传", () => {
    const body: AggregateRequest = aggregateRequestOf(
      mkChart({
        rows: ["store"],
        computedFields: [{ key: "k", name: "K", expr: "[a]*2" }],
        having: [{ expr: "sum_amount", op: ">", value: 10 }],
      }),
      [],
    );
    expect(body.computed).toEqual([{ key: "k", name: "K", expr: "[a]*2" }]);
    expect(body.having).toEqual([{ expr: "sum_amount", op: ">", value: 10 }]);
  });
});

describe("detailRequestOf", () => {
  it("带上 fields / computed / limit 与已解析筛选", () => {
    const chart = mkChart({
      kind: "detail",
      rows: ["store"],
      measures: [{ field: "amount", agg: "sum" }],
      computedFields: [{ key: "k", name: "K", expr: "[amount]*2" }],
      limit: 50,
    });
    const body = detailRequestOf(chart, [], undefined, at(2026, 3, 10));
    expect(body.fields).toEqual(["store", "amount"]);
    expect(body.computed).toEqual([{ key: "k", name: "K", expr: "[amount]*2" }]);
    expect(body.limit).toBe(50);
  });
});

describe("queryChartData — 走哪个接口由卡片种类决定", () => {
  function mkSource() {
    const aggregateDataset = vi.fn().mockResolvedValue({ columns: [], rows: [{ v: 1 }], total: 1 });
    const fetchDatasetDetail = vi.fn().mockResolvedValue({ rows: [{ a: 1 }], total: 1 });
    const source: ReportDataSource = {
      getDatasetMeta: vi.fn().mockResolvedValue([]),
      aggregateDataset,
      fetchDatasetDetail,
      searchDatasetValues: vi.fn().mockResolvedValue({ field: "f", q: "", values: [] }),
    };
    return { source, aggregateDataset, fetchDatasetDetail };
  }

  it("明细卡走 fetchDatasetDetail，且不调 aggregate", async () => {
    const { source, aggregateDataset, fetchDatasetDetail } = mkSource();
    const out = await queryChartData(source, mkChart({ kind: "detail", rows: ["a"] }), []);
    expect(fetchDatasetDetail).toHaveBeenCalledTimes(1);
    expect(aggregateDataset).not.toHaveBeenCalled();
    expect(out.result).toBeNull();
    expect(out.detail).toEqual({ rows: [{ a: 1 }], total: 1 });
  });

  it("图表卡走 aggregateDataset，且不调 detail", async () => {
    const { source, aggregateDataset, fetchDatasetDetail } = mkSource();
    const out = await queryChartData(source, mkChart({ chartType: "bar", rows: ["a"] }), []);
    expect(aggregateDataset).toHaveBeenCalledTimes(1);
    expect(fetchDatasetDetail).not.toHaveBeenCalled();
    expect(out.detail).toBeNull();
    expect(out.result?.total).toBe(1);
  });

  it("把解析后的筛选真正传进请求（不是原样透传 @ 标记）", async () => {
    const { source, aggregateDataset } = mkSource();
    await queryChartData(
      source,
      mkChart({ chartType: "bar", rows: ["a"] }),
      [{ field: "d", op: "=", value: "@today" }],
      undefined,
      at(2026, 3, 10),
    );
    const body = aggregateDataset.mock.calls[0][1] as AggregateRequest;
    expect(body.filters).toEqual([
      { field: "d", op: ">=", value: "2026-03-10" },
      { field: "d", op: "<=", value: "2026-03-10 23:59:59" },
    ]);
  });
});

describe("validOrderBy / orderableFields — 残留排序项必须滤掉", () => {
  it("聚合卡：维度 + 指标别名 + 计算字段合法，别的一律滤掉", () => {
    const chart = mkChart({
      rows: ["store"],
      measures: [{ field: "amount", agg: "sum" }],
      computedFields: [{ key: "cf_margin", name: "毛利" }] as ReportChart["computedFields"],
      orderBy: [
        { field: "store", dir: "asc" },
        { field: "sum_amount", dir: "desc" },
        { field: "cf_margin", dir: "desc" },
        // 换字段后残留：后端会按不存在的列排序 → 1054 / 静默乱序
        { field: "sum_qty", dir: "desc" },
      ],
    });
    expect(validOrderBy(chart)).toEqual([
      { field: "store", dir: "asc" },
      { field: "sum_amount", dir: "desc" },
      { field: "cf_margin", dir: "desc" },
    ]);
  });

  it("明细卡：只能按展示列排（聚合别名在明细里不存在）", () => {
    const chart = mkChart({
      kind: "detail",
      chartType: "detail-table",
      rows: ["datefmt:d:day"],
      measures: [{ field: "amount", agg: "sum" }],
      orderBy: [
        { field: "d", dir: "desc" },
        { field: "sum_amount", dir: "desc" },
      ],
    });
    // datefmt 维度落库是物理列 d
    expect(validOrderBy(chart)).toEqual([{ field: "d", dir: "desc" }]);
    expect([...orderableFields(chart)]).toEqual(["d", "amount"]);
  });

  it("没配 orderBy：返回空数组而不是 undefined", () => {
    expect(validOrderBy(mkChart())).toEqual([]);
  });
});

describe("orderByOfSort — 表格 sortState → 聚合 orderBy", () => {
  it("key→field、dir 原样，顺序保持", () => {
    expect(
      orderByOfSort([
        { key: "store", dir: "asc" },
        { key: "sum_amount", dir: "desc" },
      ]),
    ).toEqual([
      { field: "store", dir: "asc" },
      { field: "sum_amount", dir: "desc" },
    ]);
  });

  it("空 sortState（用户点了第三次取消排序）→ 空数组", () => {
    expect(orderByOfSort([])).toEqual([]);
  });
});
