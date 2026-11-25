// `<z-report-card>` 元素测试 · 取数：图表卡 / 表格卡的取数时机与筛选生效
//
// [WHY] 2026-10-25 系统审计：从 report-card-element.test.ts（895 行）按行为域拆出，
// 夹具见 ./report-card-helpers.ts。

import { afterEach, describe, expect, it, vi } from "vitest";
import { ZReportCard } from "../../src/report/elements/report-card.js";
import {
  until,
  mount,
  mkChart,
  agg,
  mkSource,
  resetMounted,
} from "./report-card-helpers.js";

afterEach(resetMounted);

describe("<z-report-card> 图表卡 / 表格卡", () => {
  it("图表卡：挂出 z-chart，series 数量 = 指标数", async () => {
    const src = mkSource({
      aggregateDataset: vi.fn().mockResolvedValue({
        columns: [
          { name: "store", kind: "dimension" },
          { name: "sum_amount", kind: "measure" },
          { name: "avg_amount", kind: "measure" },
        ],
        rows: [
          { store: "甲", sum_amount: 100, avg_amount: 50 },
          { store: "乙", sum_amount: 200, avg_amount: 100 },
        ],
        total: 2,
      }),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      chartType: "bar",
      rows: ["store"],
      measures: [
        { field: "amount", agg: "sum" },
        { field: "amount", agg: "avg" },
      ],
    });

    await until(() => !!el.shadowRoot!.querySelector("z-chart"));
    const chartEl = el.shadowRoot!.querySelector("z-chart")!;
    expect(chartEl.getAttribute("type")).toBe("bar");
    expect(chartEl.querySelectorAll("z-chart-series")).toHaveLength(2);
    // series 数据点 = 行数，且值取的是各自的指标 key（取错 key 会全是 0）
    const first = chartEl.querySelectorAll("z-chart-series")[0] as HTMLElement & {
      data?: { label?: string; value: number }[];
    };
    expect(first.data).toEqual([
      { label: "甲", value: 100 },
      { label: "乙", value: 200 },
    ]);
  });

  it("表格卡：columns 由后端列元数据驱动（维度 + 指标）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ chartType: "table" });

    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const table = el.shadowRoot!.querySelector("z-report-table") as HTMLElement & {
      columns: { key: string; numeric?: boolean }[];
      data: unknown[];
    };
    expect(table.columns.map((c) => c.key)).toEqual(["store", "sum_amount"]);
    expect(table.columns[1].numeric).toBe(true);
    expect(table.data).toHaveLength(1);
  });

  it("明细卡：走 detail 接口，列按配置推（datefmt 退化成物理列）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      kind: "detail",
      chartType: "detail-table",
      rows: ["datefmt:pay_time:month", "store"],
      measures: [{ field: "amount", agg: "sum" }],
    });

    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    expect(src.fetchDatasetDetail).toHaveBeenCalledTimes(1);
    expect(src.aggregateDataset).not.toHaveBeenCalled();
    const table = el.shadowRoot!.querySelector("z-report-table") as HTMLElement & {
      columns: { key: string }[];
    };
    expect(table.columns.map((c) => c.key)).toEqual(["pay_time", "store", "amount"]);
  });
});

describe("<z-report-card> 取数控制", () => {
  it("同配置重复 set 不重复取数（JSON 指纹挡住 updated 里的再判定）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    const chart = mkChart({ kind: "kpi", chartType: "kpi" });
    el.chart = chart;
    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));

    // 同内容、不同对象引用（React 每次 render 都造新对象）
    el.chart = { ...chart };
    await new Promise((r) => setTimeout(r, 20));
    expect(src.aggregateDataset).toHaveBeenCalledTimes(1);
  });

  it("改筛选会重新取数（新窗口必须重新查）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });
    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));
    expect(src.aggregateDataset).toHaveBeenCalledTimes(1);

    el.filters = [{ field: "store", op: "=", value: "甲店" }];
    await until(() => src.aggregateDataset.mock.calls.length === 2);
    expect(src.aggregateDataset).toHaveBeenCalledTimes(2);
  });

  it("竞态：快改两次筛选，只有最后一次的结果落地", async () => {
    let resolveFirst: ((v: AggregateResult) => void) | null = null;
    const aggregateDataset = vi
      .fn()
      .mockImplementationOnce(() => new Promise<AggregateResult>((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(agg([{ store: "乙", sum_amount: 999 }]));
    const src = mkSource({ aggregateDataset });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });
    await new Promise((r) => setTimeout(r, 10));
    expect(resolveFirst).not.toBeNull();

    // 第二次筛选先返回
    el.filters = [{ field: "store", op: "=", value: "乙" }];
    await until(() => el.shadowRoot!.querySelector(".kpi__value")?.textContent === "999");

    // 第一次请求这时才返回旧数据 —— 不能覆盖
    (resolveFirst as unknown as (v: AggregateResult) => void)(agg([{ store: "甲", sum_amount: 111 }]));
    await new Promise((r) => setTimeout(r, 30));
    expect(el.shadowRoot!.querySelector(".kpi__value")!.textContent).toBe("999");
  });

  it("查询失败：显示错误文案并发 z-card-error", async () => {
    const src = mkSource({
      aggregateDataset: vi
        .fn()
        .mockRejectedValue(Object.assign(new Error("后端 500"), { status: 500 })),
    });
    const el = mount();
    const seen: unknown[] = [];
    el.addEventListener("z-card-error", (e) => seen.push((e as CustomEvent).detail));
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });

    await until(() => !!el.shadowRoot!.querySelector(".state--error"));
    expect(el.shadowRoot!.textContent).toContain("后端 500");
    expect(seen).toHaveLength(1);
    // detail 形状是 { chartId, error }，status 在 error 上（宿主错误原样透出）
    expect((seen[0] as { error?: { status?: number } }).error?.status).toBe(500);
  });

  it("reload() 强制重新取数", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });
    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));
    el.reload();
    await until(() => src.aggregateDataset.mock.calls.length === 2);
    expect(src.aggregateDataset).toHaveBeenCalledTimes(2);
  });
  it("表格卡：列头用数据集别名/注释，不是物理列名（2026-10-25 zEtl 实测发现）", async () => {
    // 当时的症状：React 版表头是「日期 / 城市」，元素版印的是 d / city_name。
    // 只断言「columns 存在」抓不到它，必须断言**标题字符串**。
    const src = mkSource({
      getDatasetMeta: vi.fn().mockResolvedValue([
        { name: "store", alias: "门店" },
        { name: "amount", alias: "金额" },
      ]),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ chartType: "table" });

    await until(() => {
      const t = el.shadowRoot!.querySelector("z-report-table") as HTMLElement & {
        columns?: { title?: string }[];
      } | null;
      return !!t?.columns?.length;
    });
    const table = el.shadowRoot!.querySelector("z-report-table") as HTMLElement & {
      columns: { key: string; title: string }[];
    };
    expect(table.columns.map((c) => c.title)).toEqual(["门店", "金额（求和）"]);
    // 元数据只取一次：改筛选不该反复拉字段表
    expect((src.getDatasetMeta as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
  });
});

// ==================== 卡壳（2026-10-25） ====================
//
// 这一组测的全是「有没有真的接上」：按钮在不在、点了有没有做事、状态文案说的是不是
// 当前事实。判据只有一条 —— **把实现改坏，这条断言会红吗**。
