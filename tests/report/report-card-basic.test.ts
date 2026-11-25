// `<z-report-card>` 元素测试 · 基础态：空占位 / 文本卡 / 图片卡 / 指标卡
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

describe("<z-report-card> 基础态", () => {
  it("没绑图表时显示占位文案", async () => {
    const el = mount();
    await settle();
    expect(el.shadowRoot!.textContent).toContain("未绑定图表");
  });

  it("标题按 showTitle 显隐", async () => {
    const el = mount();
    el.chart = mkChart({ kind: "text", chartType: "text", text: { content: "x" } });
    await settle();
    expect(el.shadowRoot!.querySelector(".hd__title")?.textContent).toBe("销售额");

    el.showTitle = false;
    await settle();
    expect(el.shadowRoot!.querySelector(".hd__title")).toBeNull();
  });
});

describe("<z-report-card> 文本卡 / 图片卡不查数据", () => {
  it("文本卡：不调任何取数接口", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "text", chartType: "text", text: { content: "口径说明" } });
    await settle();
    expect(el.shadowRoot!.textContent).toContain("口径说明");
    expect(src.aggregateDataset).not.toHaveBeenCalled();
    expect(src.fetchDatasetDetail).not.toHaveBeenCalled();
  });

  it("文本卡：行内标记渲染成标签，且 HTML 被当文本", async () => {
    const el = mount();
    el.chart = mkChart({
      kind: "text",
      chartType: "text",
      text: { content: "**粗** 与 `<b>x</b>` 与 <script>alert(1)</script>" },
    });
    await settle();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector("strong")?.textContent).toBe("粗");
    expect(shadow.querySelector("code")?.textContent).toBe("<b>x</b>");
    // 越权 HTML 必须是可见文本，不能成为元素
    expect(shadow.querySelector("script")).toBeNull();
    expect(shadow.textContent).toContain("<script>alert(1)</script>");
  });

  it("文本卡：空内容显示空态", async () => {
    const el = mount();
    el.chart = mkChart({ kind: "text", chartType: "text", text: { content: "" } });
    await settle();
    expect(el.shadowRoot!.textContent).toContain("暂无数据");
  });

  it("图片卡：地址无效显示「为什么没有图」，不渲染 img", async () => {
    const el = mount();
    el.chart = mkChart({ kind: "image", chartType: "image", image: { url: "javascript:alert(1)" } });
    await settle();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector("img")).toBeNull();
    // 区分「没配」与「配了不能用」——用户要做的事不同
    expect(shadow.textContent).toContain("地址无效");
  });

  it("图片卡：未配地址与地址无效文案不同", async () => {
    const el = mount();
    el.chart = mkChart({ kind: "image", chartType: "image", image: { url: "" } });
    await settle();
    expect(el.shadowRoot!.textContent).toContain("未设置图片地址");
  });

  it("图片卡：合法地址渲染 img，alt 缺省回落 caption", async () => {
    const el = mount();
    el.chart = mkChart({
      kind: "image",
      chartType: "image",
      image: { url: "/static/a.png", caption: "门店照片", fit: "contain" },
    });
    await settle();
    const img = el.shadowRoot!.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("/static/a.png");
    expect(img.getAttribute("alt")).toBe("门店照片");
    expect(img.getAttribute("style")).toContain("object-fit:contain");
  });
});

describe("<z-report-card> 指标卡", () => {
  it("取数后显示格式化值（不是 --）", async () => {
    const src = mkSource();
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi", rows: ["store"] });

    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));
    expect(el.shadowRoot!.querySelector(".kpi__value")!.textContent).toBe("1,200");
  });

  it("无数据行 → 显示 --（不能显示 0）", async () => {
    const src = mkSource({ aggregateDataset: vi.fn().mockResolvedValue(agg([])) });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({ kind: "kpi", chartType: "kpi" });
    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));
    expect(el.shadowRoot!.querySelector(".kpi__value")!.textContent).toBe("--");
  });

  it("阈值色：higher_is_worse 超 danger 上 danger 类", async () => {
    const src = mkSource({
      aggregateDataset: vi.fn().mockResolvedValue(agg([{ store: "甲", sum_amount: 500 }])),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      kind: "kpi",
      chartType: "kpi",
      kpi: { thresholds: { warn: 100, danger: 300, direction: "higher_is_worse" } },
    });
    await until(() => !!el.shadowRoot!.querySelector(".kpi"));
    expect(el.shadowRoot!.querySelector(".kpi")!.classList.contains("kpi--danger")).toBe(true);
  });

  it("阈值色：lower_is_worse 低值才 danger（方向判反会把超额完成染红）", async () => {
    const src = mkSource({
      aggregateDataset: vi.fn().mockResolvedValue(agg([{ store: "甲", sum_amount: 500 }])),
    });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      kind: "kpi",
      chartType: "kpi",
      kpi: { thresholds: { warn: 800, danger: 400, direction: "lower_is_worse" } },
    });
    await until(() => !!el.shadowRoot!.querySelector(".kpi"));
    // 500 >= 400 ⇒ 不危险
    expect(el.shadowRoot!.querySelector(".kpi")!.classList.contains("kpi--danger")).toBe(false);
  });

  it("环比：查上期，delta 文本进卡面", async () => {
    const aggregateDataset = vi
      .fn()
      // 第 1 次：本期 1200；第 2 次：上期 1000
      .mockResolvedValueOnce(agg([{ store: "甲", sum_amount: 1200 }]))
      .mockResolvedValueOnce(agg([{ store: "甲", sum_amount: 1000 }]));
    const src = mkSource({ aggregateDataset });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      kind: "kpi",
      chartType: "kpi",
      kpi: { compare: { mode: "prev_period", alignBy: "length" } },
      filters: [{ field: "pay_time", op: "between", value: ["2026-03-01", "2026-03-10"] }],
    });

    await until(() => !!el.shadowRoot!.querySelector(".kpi__delta"));
    // (1200-1000)/1000 = 20%
    expect(el.shadowRoot!.querySelector(".kpi__delta")!.textContent).toBe("+20%");
    expect(el.shadowRoot!.querySelector(".kpi__delta")!.classList.contains("kpi__delta--up")).toBe(
      true,
    );
    expect(aggregateDataset).toHaveBeenCalledTimes(2);
  });

  it("环比查询失败不影响主值（附加信息不该让整卡变错误态）", async () => {
    const aggregateDataset = vi
      .fn()
      .mockResolvedValueOnce(agg([{ store: "甲", sum_amount: 1200 }]))
      .mockRejectedValueOnce(new Error("上期查询挂了"));
    const src = mkSource({ aggregateDataset });
    const el = mount();
    el.dataSource = src;
    el.chart = mkChart({
      kind: "kpi",
      chartType: "kpi",
      kpi: { compare: { mode: "prev_period", alignBy: "length" } },
      filters: [{ field: "pay_time", op: "between", value: ["2026-03-01", "2026-03-10"] }],
    });

    await until(() => !!el.shadowRoot!.querySelector(".kpi__value"));
    expect(el.shadowRoot!.querySelector(".kpi__value")!.textContent).toBe("1,200");
    expect(el.shadowRoot!.querySelector(".state--error")).toBeNull();
    expect(el.shadowRoot!.querySelector(".kpi__delta")!.textContent).toBe("--");
  });
});
