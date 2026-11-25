// `<z-report-card>` 元素测试的共用夹具（mount 注册表 / 聚合结果构造 / 数据源 mock）。
//
// [WHY] 2026-10-25 系统审计：原 report-card-element.test.ts 单文件 895 行，超 600 行上限。
// 按「基础态 / 取数 / 卡壳 / 交互」拆成 4 个文件，夹具集中到这里。
// 注意：afterEach 清理**不放在这里**——由各测试文件显式 `afterEach(resetMounted)`，
// 避免「引了夹具就隐式注册钩子」这种看不见的行为。

import { vi } from "vitest";
import { ZReportCard } from "../../src/report/elements/report-card.js";
import type { ReportDataSource } from "../../src/report/core/data-source.js";
import type { AggregateResult, ReportChart } from "../../src/report/core/types.js";

import type { AggregateResult, ReportChart } from "../../src/report/core/types.js";

/**
 * 轮询直到条件成立。等的东西必须就是断言的那个事实（不要等 A 断 B）。
 *
 * [WHY 预算 10s 而不是 3s] 2026-11-15 整仓并行回归实测：这三条用例在单跑时
 * 分别耗时 896ms / 480ms，但整仓跑时 worker 被其它 300+ 文件抢 CPU，
 * 3 秒预算会先于条件成立而耗尽 —— 报错是 `until() 超时`，看起来像「卡片没渲染」，
 * 其实是**假红**。预算放宽不削弱判据（条件不成立照样超时失败），只是把
 * 「机器忙」与「逻辑坏」分开。
 */
export async function until(fn: () => boolean, timeout = 10_000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw new Error("until() 超时");
}

let mounted: ZReportCard[] = [];

export function mount(): ZReportCard {
  const el = new ZReportCard();
  document.body.appendChild(el);
  mounted.push(el);
  return el;
}

/** 卸载本文件挂载过的全部卡片并清空 body。各测试文件在 afterEach 里显式调用。 */
export function resetMounted(): void {
  for (const el of mounted) el.remove();
  mounted = [];
  document.body.innerHTML = "";
}

export function mkChart(p: Partial<ReportChart> = {}): ReportChart {
  return {
    id: "chart-1",
    title: "销售额",
    datasetId: 7,
    rows: ["store"],
    measures: [{ field: "amount", agg: "sum" }],
    filters: [],
    chartType: "bar",
    limit: 1000,
    ...p,
  };
}

/** 一行两列的聚合结果：维度 store + 指标 sum_amount */
export function agg(rows: Record<string, unknown>[]): AggregateResult {
  return {
    columns: [
      { name: "store", kind: "dimension" },
      { name: "sum_amount", kind: "measure", agg: "sum", field: "amount" },
    ],
    rows,
    total: rows.length,
  };
}

export type MockSource = ReportDataSource & {
  aggregateDataset: ReturnType<typeof vi.fn>;
  fetchDatasetDetail: ReturnType<typeof vi.fn>;
};

export function mkSource(overrides: Partial<ReportDataSource> = {}): MockSource {
  return {
    getDatasetMeta: vi.fn().mockResolvedValue([]),
    aggregateDataset: vi.fn().mockResolvedValue(agg([{ store: "甲店", sum_amount: 1200 }])),
    fetchDatasetDetail: vi.fn().mockResolvedValue({ rows: [{ store: "甲店" }], total: 1 }),
    searchDatasetValues: vi.fn().mockResolvedValue({ field: "f", q: "", values: [] }),
    ...overrides,
  } as unknown as MockSource;
}

/** 等一轮渲染。BaseElement 的 requestUpdate 走 queueMicrotask，同步读数必然是空的 ——
 *  这不是被测缺陷，而是「同步断言这件事本身错了」。 */
export async function settle(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}
