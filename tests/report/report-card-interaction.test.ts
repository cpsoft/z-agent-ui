// `<z-report-card>` 元素测试 · 交互：表头排序 / 图元点击联动 / 分组表
//
// [WHY] 2026-10-25 系统审计：从 report-card-element.test.ts（895 行）按行为域拆出，
// 夹具见 ./report-card-helpers.ts。

import { afterEach, describe, expect, it, vi } from "vitest";
import { ZReportCard } from "../../src/report/elements/report-card.js";
import type { ReportChart } from "../../src/report/core/types.js";
import {
  until,
  mount,
  mkChart,
  agg,
  MockSource,
  mkSource,
  resetMounted,
} from "./report-card-helpers.js";

afterEach(resetMounted);

describe("<z-report-card> 交互排序", () => {
  it("表格列头排序 → 用 orderBy 重新聚合（server 模式，不靠组件本地排）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ chartType: "table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    expect(src.aggregateDataset).toHaveBeenCalledTimes(1);

    const table = el.shadowRoot!.querySelector("z-report-table") as HTMLElement;
    // server 模式是硬要求：client 模式排的是本页 20 行，用户点第二次才发现序不对
    expect((table as unknown as { sortMode: string }).sortMode).toBe("server");

    table.dispatchEvent(
      new CustomEvent("z-sort", {
        detail: { sortState: [{ key: "sum_amount", dir: "desc" }] },
        bubbles: true,
        composed: true,
      }),
    );
    await until(() => src.aggregateDataset.mock.calls.length === 2);
    const body = src.aggregateDataset.mock.calls[1][1] as { orderBy?: unknown };
    expect(body.orderBy).toEqual([{ field: "sum_amount", dir: "desc" }]);
  });

  it("取消排序（空 sortState）时真的清空，不回落到配置 orderBy", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      chartType: "table",
      orderBy: [{ field: "sum_amount", dir: "desc" }],
    });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    // 初始就带配置排序
    expect((src.aggregateDataset.mock.calls[0][1] as { orderBy?: unknown }).orderBy).toEqual([
      { field: "sum_amount", dir: "desc" },
    ]);

    const table = el.shadowRoot!.querySelector("z-report-table") as HTMLElement;
    table.dispatchEvent(
      new CustomEvent("z-sort", { detail: { sortState: [] }, bubbles: true, composed: true }),
    );
    await until(() => src.aggregateDataset.mock.calls.length === 2);
    // 空数组 ≠ 没点过：用户点第三次就是要取消排序，回到自然序
    expect((src.aggregateDataset.mock.calls[1][1] as { orderBy?: unknown }).orderBy).toEqual([]);
  });
});

describe("<z-report-card> 图元点击联动", () => {
  it("点数据点 → 用该行的维度值产出 z-point-select", async () => {
    const src = mkSource({
      getDatasetMeta: vi.fn().mockResolvedValue([{ name: "store", alias: "门店" }, { name: "amount" }]),
      aggregateDataset: vi.fn().mockResolvedValue(
        agg([
          { store: "甲店", sum_amount: 10 },
          { store: "乙店", sum_amount: 20 },
        ]),
      ),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ chartType: "bar" });
    await until(() => !!el.shadowRoot!.querySelector("z-chart"));

    const seen: { label?: string; filters?: unknown; datasetId?: number }[] = [];
    el.addEventListener("z-point-select", (e) => seen.push((e as CustomEvent).detail));

    const chart = el.shadowRoot!.querySelector("z-chart") as HTMLElement;
    // dataIndex=1 就是第二行（乙店）。用索引错位当「联动到错的分类」，看不出任何报错
    chart.dispatchEvent(
      new CustomEvent("z-marker-click", { detail: { dataIndex: 1, seriesIndex: 0 }, bubbles: true }),
    );
    expect(seen).toEqual([
      {
        sourceId: "chart-1",
        datasetId: 7,
        label: "门店：乙店",
        filters: [{ field: "store", op: "=", value: "乙店" }],
      },
    ]);
  });
});

// ==================== 分组表 / 树状表格（2026-10-25） ====================
//
// 元素版此前把分组表当普通表格画：小计行与总计行**整段消失**，卡配置看着完全正常。
// 这一组钉住「真的挂上了分组表元素，且小计行进了导出」。

/** 两层层级的分组结果：城市 → 门店 */
function groupAgg(): AggregateResult {
  return {
    columns: [
      { name: "city", kind: "dimension" },
      { name: "store", kind: "dimension" },
      { name: "sum_amount", kind: "measure", agg: "sum", field: "amount" },
    ],
    rows: [
      { city: "杭州", store: "甲店", sum_amount: 10 },
      { city: "杭州", store: "乙店", sum_amount: 20 },
      { city: "上海", store: "丙店", sum_amount: 5 },
    ],
    total: 3,
  };
}

function mkGroupSource(): MockSource {
  return mkSource({
    getDatasetMeta: vi.fn().mockResolvedValue([
      { name: "city", alias: "城市" },
      { name: "store", alias: "门店" },
      { name: "amount", alias: "金额" },
    ]),
    aggregateDataset: vi.fn().mockResolvedValue(groupAgg()),
  });
}

const GROUP_CHART = (p: Partial<ReportChart> = {}) =>
  mkChart({ chartType: "group-table", rows: ["city", "store"], ...p });

describe("<z-report-card> 分组表", () => {
  // [WHY 断言变了] 分组表不再是独立元素：`<z-report-table>` 的 `group` 属性吃下分组能力。
  // 但「挂的组件对不对」这件事仍然要断言 —— 分组卡若挂成不带 group 的普通表，
  // 小计/总计整段消失，而页面看起来只是「行数少了」。
  it("分组卡挂 z-report-table，且带上按 dim 顺序的分组定义", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART();
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const tbl = el.shadowRoot!.querySelector("z-report-table") as unknown as {
      group: { dims: string[]; measures: Array<{ key: string }> } | null;
      tree: boolean | null;
    };
    expect(tbl.group?.dims).toEqual(["city", "store"]);
    expect(tbl.tree).toBe(false);
    // 不再有第二个分组表元素（能力只有一份实现）
    expect(el.shadowRoot!.querySelector("z-report-group-table")).toBeNull();
  });

  it("普通表格仍然挂 z-report-table（回归）", async () => {
    const el = mount();
    el.dataSource = mkSource();
    el.chart = mkChart({ chartType: "table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    expect(el.shadowRoot!.querySelector("z-report-group-table")).toBeNull();
  });

  it("树状表格带折叠按钮（tree 由 chartType 派生，不靠宿主传）", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART({ chartType: "tree-table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    // 折叠按钮在表格元素自己的 shadow root 里，卡片这层查不到 —— 必须穿进去
    const gt = el.shadowRoot!.querySelector("z-report-table")!;
    expect(gt.shadowRoot!.querySelector("[data-toggle]")).not.toBeNull();
  });

  it("分组表上小计行真的画出来了（城市合计 30，不是某一行叶子值）", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART();
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const gt = el.shadowRoot!.querySelector("z-report-table")!;
    // 折叠按钮的 ▾ 也在单元格里，比对数值前剥掉
    const rows = [...gt.shadowRoot!.querySelectorAll(".z-rpt__row")].map((tr) =>
      [...tr.querySelectorAll(".z-rpt__td")].map((td) => (td.textContent ?? "").replace(/[▾▸]/g, "").trim()),
    );
    expect(rows[0]).toEqual(["杭州", "", "30"]);
    expect(rows.at(-1)).toEqual(["总计", "", "35"]);
  });

  it("分组表的列不带排序（层级 + 小计语义下「按金额排」没有意义）", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART();
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const gt = el.shadowRoot!.querySelector("z-report-table") as unknown as {
      columns: { key: string; sortable?: boolean }[];
    };
    expect(gt.columns.length).toBeGreaterThan(0);
    expect(gt.columns.every((c) => c.sortable === false)).toBe(true);
  });

  it("配了排序时前置「#」列，且导出的表头不含它（CSV 里那是一整列空白）", async () => {
    const el = mount();
    el.dataSource = mkSource({
      getDatasetMeta: vi.fn().mockResolvedValue([
        { name: "store", alias: "门店" },
        { name: "amount", alias: "金额" },
      ]),
    });
    el.chart = mkChart({ chartType: "table", orderBy: [{ field: "sum_amount", dir: "desc" }] });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const table = el.shadowRoot!.querySelector("z-report-table") as unknown as {
      columns: { key: string; title: string }[];
      data: Record<string, unknown>[];
    };
    expect(table.columns[0]).toMatchObject({ key: "_rank", title: "#" });
    // 表里有 # 列就必须有值：只加列不补行号 = 整列空白，看着像渲染坏了
    expect(table.data[0]._rank).toBe(1);

    const blobs: Blob[] = [];
    const cr = vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      blobs.push(b as Blob);
      return "blob:test";
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    expect(el.exportNow()).toBe(true);
    expect((await blobs[0].text()).replace(/^\uFEFF/, "").split("\n")[0]).toBe("门店,金额（求和）");
    click.mockRestore();
    cr.mockRestore();
  });

  it("showSubtotal=false 时元素不再画组行（配置只有一份，不在卡片里抄一遍）", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART({ showSubtotal: false });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    const gt = el.shadowRoot!.querySelector("z-report-table")!;
    const kinds = [...gt.shadowRoot!.querySelectorAll(".z-rpt__row")].map(
      (tr) => (tr as HTMLElement).dataset.rowKind,
    );
    expect(kinds).toEqual(["data", "data", "data", "total"]);
  });

  it("导出含小计/总计行（屏幕上有几行，CSV 就有几行）", async () => {
    const el = mount();
    el.dataSource = mkGroupSource();
    el.chart = GROUP_CHART();
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));

    const blobs: Blob[] = [];
    const cr = vi.spyOn(URL, "createObjectURL").mockImplementation((b) => {
      blobs.push(b as Blob);
      return "blob:test";
    });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const ev: { rows?: number }[] = [];
    el.addEventListener("z-card-export", (e) => ev.push((e as CustomEvent).detail));

    expect(el.exportNow()).toBe(true);
    // 3 条叶子 + 2 个城市小计 + 1 行总计
    expect(ev).toEqual([{ chartId: "chart-1", rows: 6 }]);

    const text = (await blobs[0].text()).replace(/^\uFEFF/, "");
    const lines = text.split("\n");
    expect(lines[0]).toBe("城市,门店,金额（求和）");
    expect(lines[1]).toBe("杭州,,30");
    expect(lines[2]).toBe("杭州,甲店,10");
    expect(lines[4]).toBe("上海,,5");
    expect(lines[6]).toBe("总计,,35");
    click.mockRestore();
    cr.mockRestore();
  });
});
