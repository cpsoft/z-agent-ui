// `<z-report-card>` 元素测试 · 卡壳：按钮禁用 / 状态条 / 导出 / 放大
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
  settle,
  resetMounted,
} from "./report-card-helpers.js";

afterEach(resetMounted);

describe("<z-report-card> 卡壳按钮", () => {
  const btns = (el: ZReportCard) =>
    [...el.shadowRoot!.querySelectorAll("[data-act]")].map((b) => b.getAttribute("data-act"));

  it("默认只给元素自己能完成的三件，不含 detail/edit", async () => {
    const el = mount();
    el.dataSource = mkSource();
    el.chart = mkChart({ chartType: "table" });
    await settle();
    // detail/edit 需要宿主监听才有意义；默认给出来就是死按钮
    expect(btns(el)).toEqual(["export", "expand", "refresh"]);
  });

  it("宿主加 detail/edit 后才出现，点击只发事件、不自己做", async () => {
    const el = mount();
    el.dataSource = mkSource();
    el.actions = ["export", "expand", "refresh", "detail", "edit"];
    el.chart = mkChart({ chartType: "table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));

    const seen: { action?: string; chartId?: string }[] = [];
    el.addEventListener("z-card-action", (e) => seen.push((e as CustomEvent).detail));

    (el.shadowRoot!.querySelector('[data-act="detail"]') as HTMLElement).click();
    (el.shadowRoot!.querySelector('[data-act="edit"]') as HTMLElement).click();
    expect(seen).toEqual([
      { chartId: "chart-1", action: "detail" },
      { chartId: "chart-1", action: "edit" },
    ]);
  });

  it("文本卡没有数据动作：只剩放大，且不显示状态条/数据集标签", async () => {
    const el = mount();
    el.datasetName = "订单数据集";
    el.chart = mkChart({ kind: "text", chartType: "text", text: { content: "口径说明" } });
    await settle();
    expect(btns(el)).toEqual(["expand"]);
    expect(el.shadowRoot!.querySelector(".status")).toBeNull();
    // 数据集标签在文本卡上会让人以为「这张卡也查数据」
    expect(el.shadowRoot!.querySelector(".hd__tag")).toBeNull();
  });

  it("明细卡也保留「查看明细」—— 与 React 版 ChartCard 一致", async () => {
    // 探索器多了加条件/分页/独立导出，不是重复入口。迁移期最忌两种渲染器行为不同
    const el = mount();
    el.dataSource = mkSource();
    el.actions = ["detail", "expand"];
    el.chart = mkChart({ kind: "detail", chartType: "detail-table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));
    expect(btns(el)).toEqual(["detail", "expand"]);
  });

  it("数据集标签按 datasetName 显示", async () => {
    const el = mount();
    el.dataSource = mkSource();
    el.datasetName = "订单数据集";
    el.chart = mkChart({ chartType: "table" });
    await settle();
    expect(el.shadowRoot!.querySelector(".hd__tag")?.textContent).toBe("订单数据集");
  });
});

describe("<z-report-card> 状态条", () => {
  it("无数据→等待配置；成功后→查询完成 HH:MM:SS；刷新中→正在更新…", async () => {
    let release: (v: AggregateResult) => void = () => {};
    const aggregateDataset = vi
      .fn()
      .mockImplementationOnce(() => new Promise<AggregateResult>((r) => (release = r)));
    const el = mount();
    const src = mkSource({ aggregateDataset });
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });
    await settle();
    // 还没给 dataSource：既没配置也没在查
    expect(el.shadowRoot!.querySelector(".status")?.textContent).toBe("等待配置");

    el.dataSource = src;
    await until(() => el.shadowRoot!.querySelector(".status")?.textContent === "正在更新…");

    release(agg([{ store: "甲店", sum_amount: 1200 }]));
    await until(() => /^查询完成 \d{2}:\d{2}:\d{2}$/.test(el.shadowRoot!.querySelector(".status")!.textContent!));
  });

  it("刷新失败时保留上次结果，状态条说明是上一次的", async () => {
    const aggregateDataset = vi
      .fn()
      .mockResolvedValueOnce(agg([{ store: "甲店", sum_amount: 1200 }]))
      .mockRejectedValueOnce(new Error("后端 500"));
    const el = mount();
    el.dataSource = mkSource({ aggregateDataset });
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });

    await until(() => el.shadowRoot!.querySelector(".kpi__value")?.textContent === "1,200");
    el.reload();
    await until(() => !!el.shadowRoot!.querySelector(".err"));

    // [关键] 卡面还是上一次的数字。清掉的话用户读作「数据没了」
    expect(el.shadowRoot!.querySelector(".kpi__value")?.textContent).toBe("1,200");
    expect(el.shadowRoot!.querySelector(".status")?.textContent).toBe("更新失败，以下保留上次结果");
    expect(el.shadowRoot!.querySelector(".err")?.textContent).toContain("后端 500");
  });

  it("首次查询失败：卡体是错误占位（带重试），不是一条窄条加空白", async () => {
    const aggregateDataset = vi.fn().mockRejectedValue(new Error("后端 500"));
    const el = mount();
    el.dataSource = mkSource({ aggregateDataset });
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });

    await until(() => !!el.shadowRoot!.querySelector(".state--error"));
    expect(el.shadowRoot!.querySelector(".err")).toBeNull();

    (el.shadowRoot!.querySelector('.state--error [data-act="retry"]') as HTMLElement).click();
    await until(() => aggregateDataset.mock.calls.length === 2);
  });
});

describe("<z-report-card> 导出", () => {
  it("列头与卡面同源（别名 + 聚合后缀），值按列格式输出", async () => {
    const src = mkSource({
      getDatasetMeta: vi.fn().mockResolvedValue([
        { name: "store", alias: "门店" },
        { name: "amount", alias: "金额" },
      ]),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      chartType: "table",
      colFormats: { sum_amount: { decimalPlaces: 2 } },
    });
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
    expect(ev).toEqual([{ chartId: "chart-1", rows: 1 }]);
    expect(cr).toHaveBeenCalledTimes(1);

    const text = await blobs[0].text();
    // 表头用的是屏幕上那张表的列名，不是 store/sum_amount
    expect(text.replace(/^\uFEFF/, "").split("\n")[0]).toBe("门店,金额（求和）");
    // 配了两位小数就必须体现在导出里，否则「导出 1200、页面 1,200.00」没人对得上
    expect(text.split("\n")[1]).toBe("甲店,1200.00");
    click.mockRestore();
    cr.mockRestore();
  });

  it("无数据时导出按钮禁用，exportNow 返回 false 且不发事件", async () => {
    const el = mount();
    el.dataSource = mkSource({ aggregateDataset: vi.fn().mockResolvedValue(agg([])) });
    el.chart = mkChart({ chartType: "table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));

    let fired = 0;
    el.addEventListener("z-card-export", () => (fired += 1));
    expect((el.shadowRoot!.querySelector('[data-act="export"]') as HTMLButtonElement).disabled).toBe(true);
    expect(el.exportNow()).toBe(false);
    expect(fired).toBe(0);
  });
});

describe("<z-report-card> 放大", () => {
  it("toggle 加 card--expanded，ESC 收起并留住焦点", async () => {
    const el = mount();
    el.dataSource = mkSource();
    el.chart = mkChart({ chartType: "table" });
    await until(() => !!el.shadowRoot!.querySelector("z-report-table"));

    const expanded: boolean[] = [];
    el.addEventListener("z-card-expand", (e) => expanded.push((e as CustomEvent).detail.expanded));

    (el.shadowRoot!.querySelector('[data-act="expand"]') as HTMLElement).click();
    await settle();
    expect(el.shadowRoot!.querySelector(".card--expanded")).not.toBeNull();
    // 按钮文案跟着变，否则「放大」在放大态里点了没反馈
    expect(el.shadowRoot!.querySelector('[data-act="expand"]')!.textContent).toBe("收起");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(el.shadowRoot!.querySelector(".card--expanded")).toBeNull();
    expect(expanded).toEqual([true, false]);
    // 收起后焦点回到展开按钮（否则键盘用户掉到 body）
    expect(el.shadowRoot!.activeElement?.getAttribute("data-act")).toBe("expand");
  });
});
