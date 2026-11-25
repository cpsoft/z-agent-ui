// `<z-report-group-table>` 的行为测试：小计行、层级缩进、折叠、不可重算的聚合。
//
// [为什么不用快照] 这个元素的全部风险在「哪一行是算出来的、算的是哪个数」：
// 小计行少一行、缩进错一级、avg 被显示成 0 —— 页面上都「看起来像张表」。
// 所以断言全部落在「某一行第 N 个格子的文本」上。

import { afterEach, describe, expect, it } from "vitest";
import { ZReportGroupTable } from "../../src/report/elements/report-group-table.js";
import { buildTableColumns } from "../../src/report/core/report-table-columns.js";
import type { Column, ReportChart } from "../../src/report/core/types.js";

let mounted: ZReportGroupTable[] = [];

function settle(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

async function mount(chart: ReportChart, rows: Record<string, unknown>[], cols?: Column[]): Promise<ZReportGroupTable> {
  const el = new ZReportGroupTable();
  el.chart = chart;
  el.columns = buildTableColumns(chart, cols ?? COLS);
  el.rows = rows;
  document.body.appendChild(el);
  mounted.push(el);
  await settle();
  return el;
}

afterEach(() => {
  for (const el of mounted) el.remove();
  mounted = [];
  document.body.innerHTML = "";
});

const COLS: Column[] = [
  { name: "city", alias: "城市", dataType: "varchar" },
  { name: "store", alias: "门店", dataType: "varchar" },
  { name: "amount", alias: "金额", dataType: "decimal" },
  { name: "temp", alias: "气温", dataType: "decimal" },
];

function mkChart(p: Partial<ReportChart> = {}): ReportChart {
  return {
    id: "c1",
    title: "分组表",
    datasetId: 1,
    rows: ["city", "store"],
    measures: [{ field: "amount", agg: "sum" }],
    filters: [],
    chartType: "group-table",
    limit: 1000,
    ...p,
  };
}

const ROWS = [
  { city: "杭州", store: "甲店", sum_amount: 10 },
  { city: "杭州", store: "乙店", sum_amount: 20 },
  { city: "上海", store: "丙店", sum_amount: 5 },
];

/** 每行的 { cls, cells } —— cells 是各格文本。 */
function rowsOf(el: ZReportGroupTable): { cls: string; cells: string[] }[] {
  return [...el.shadowRoot!.querySelectorAll("tbody tr")].map((tr) => ({
    cls: tr.getAttribute("class") ?? "",
    cells: [...tr.querySelectorAll("td")].map((td) => td.textContent?.trim() ?? ""),
  }));
}

describe("<z-report-group-table> 小计行", () => {
  it("组行是算出来的：城市行显示组内合计，不是某一行叶子值", async () => {
    const el = await mount(mkChart(), ROWS);
    const rs = rowsOf(el);
    // 组行（杭州）= 10 + 20；叶子行本身是 10 / 20
    expect(rs[0]).toEqual({ cls: "group", cells: ["杭州", "", "30"] });
    expect(rs[1].cells).toEqual(["杭州", "甲店", "10"]);
    expect(rs[2].cells).toEqual(["杭州", "乙店", "20"]);
    expect(rs[3]).toEqual({ cls: "group", cells: ["上海", "", "5"] });
  });

  it("总计行：首维度写「总计」，其余维度格留空", async () => {
    const el = await mount(mkChart(), ROWS);
    const total = rowsOf(el).at(-1)!;
    expect(total.cls).toBe("total");
    expect(total.cells).toEqual(["总计", "", "35"]);
  });

  it("表头用别名 + 聚合标签（与屏幕外那张表同源）", async () => {
    const el = await mount(mkChart(), ROWS);
    expect([...el.shadowRoot!.querySelectorAll("thead th")].map((th) => th.textContent)).toEqual([
      "城市",
      "门店",
      "金额（求和）",
    ]);
  });

  it("数字列右对齐、维度列标 dim（缩进只作用于第一个维度列）", async () => {
    const el = await mount(mkChart(), ROWS);
    const head = [...el.shadowRoot!.querySelectorAll("thead th")].map((th) => th.getAttribute("class"));
    expect(head).toEqual(["", "", "num"]);
    const firstRowCells = [...el.shadowRoot!.querySelectorAll("tbody tr")[0].querySelectorAll("td")];
    expect(firstRowCells[0].className).toBe("dim");
    expect(firstRowCells[1].className).toBe("dim");
  });
});

describe("<z-report-group-table> 层级缩进", () => {
  it("一级组 10px，叶子 26px（父级与子级不是同一级缩进）", async () => {
    const el = await mount(mkChart(), ROWS);
    const pad = (i: number) =>
      [...el.shadowRoot!.querySelectorAll("tbody tr")[i].querySelectorAll("td")][0].getAttribute("style");
    expect(pad(0)).toBe("padding-left:10px"); // 组
    expect(pad(1)).toBe("padding-left:26px"); // 叶子
  });

  it("总计行不缩进（它不属于任何层级）", async () => {
    const el = await mount(mkChart(), ROWS);
    const trs = [...el.shadowRoot!.querySelectorAll("tbody tr")];
    const last = [...trs.at(-1)!.querySelectorAll("td")][0];
    expect(last.getAttribute("style")).toBeNull();
  });

  it("三层层级：每深一级多 16px", async () => {
    const chart = mkChart({ rows: ["region", "city", "store"] });
    const el = await mount(chart, [
      { region: "华东", city: "杭州", store: "甲店", sum_amount: 1 },
      { region: "华东", city: "上海", store: "丙店", sum_amount: 2 },
    ]);
    const pad = (i: number) =>
      [...el.shadowRoot!.querySelectorAll("tbody tr")[i].querySelectorAll("td")][0].getAttribute("style");
    expect([pad(0), pad(1), pad(2)]).toEqual([
      "padding-left:10px", // region（depth 1）
      "padding-left:26px", // city（depth 2）
      "padding-left:42px", // 叶子（depth 3）
    ]);
  });
});

describe("<z-report-group-table> 折叠（树状表格）", () => {
  it("非树状模式没有折叠按钮（分组表就是全展开）", async () => {
    const el = await mount(mkChart(), ROWS);
    expect(el.shadowRoot!.querySelector("[data-toggle]")).toBeNull();
  });

  it("树状模式：点折叠 → 后代消失、组行保留、箭头与 aria 一起变", async () => {
    const el = await mount(mkChart({ chartType: "tree-table" }), ROWS);
    const btn = el.shadowRoot!.querySelector("[data-toggle]") as HTMLElement;
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(btn.textContent).toBe("▾");

    const seen: { groupKey?: string; collapsed?: boolean }[] = [];
    el.addEventListener("z-group-toggle", (e) => seen.push((e as CustomEvent).detail));

    btn.click();
    await settle();

    const rs = rowsOf(el);
    // 杭州的两个门店没了；上海组与它的叶子还在（折叠是按组的）
    expect(rs.map((r) => r.cells[1])).toEqual(["", "", "丙店", ""]);
    // 小计值折叠后仍在（展开时不能变成错的数）
    expect(rs[0].cells[2]).toBe("30");

    const btn2 = el.shadowRoot!.querySelector("[data-toggle]") as HTMLElement;
    expect(btn2.getAttribute("aria-expanded")).toBe("false");
    expect(btn2.textContent).toBe("▸");
    expect(seen).toEqual([{ groupKey: "杭州", collapsed: true }]);
  });

  it("再点一次展开回来", async () => {
    const el = await mount(mkChart({ chartType: "tree-table" }), ROWS);
    (el.shadowRoot!.querySelector("[data-toggle]") as HTMLElement).click();
    await settle();
    (el.shadowRoot!.querySelector("[data-toggle]") as HTMLElement).click();
    await settle();
    expect(rowsOf(el)).toHaveLength(6);
    expect(el.collapsedGroups).toEqual([]);
  });

  it("三层层级：二级组的折叠按钮画在二级维度那一列（画在「华东」旁边没人看得懂折的是谁）", async () => {
    const chart = mkChart({ rows: ["region", "city", "store"], chartType: "tree-table" });
    const el = await mount(chart, [
      { region: "华东", city: "杭州", store: "甲店", sum_amount: 1 },
      { region: "华东", city: "上海", store: "丙店", sum_amount: 2 },
    ]);
    const trs = [...el.shadowRoot!.querySelectorAll("tbody tr")];
    // 行序：region 组 / city 组(杭州) / 叶子 / city 组(上海) / 叶子 / 总计
    const cellOf = (row: number, col: number) => trs[row].querySelectorAll("td")[col];
    expect(cellOf(0, 0).querySelector("[data-toggle]")).not.toBeNull();
    expect(cellOf(0, 1).querySelector("[data-toggle]")).toBeNull();
    // 二级组（杭州）的按钮在第 1 列，第 0 列只是祖先值
    expect(cellOf(1, 0).querySelector("[data-toggle]")).toBeNull();
    expect(cellOf(1, 1).querySelector("[data-toggle]")).not.toBeNull();
  });

  it("折叠状态可以按组 key 外部设置（宿主记住用户偏好时用）", async () => {
    const el = await mount(mkChart({ chartType: "tree-table" }), ROWS);
    el.setCollapsed("上海", true);
    await settle();
    // 杭州组 + 甲店 + 乙店 + 上海组 + 总计
    expect(rowsOf(el)).toHaveLength(5);
    const sh = rowsOf(el)[3];
    expect(sh.cls).toBe("group");
    // 折叠按钮在维度格里，所以文本带箭头 → 用包含判断，值仍要逐个核
    expect(sh.cells[0]).toContain("上海");
    expect(sh.cells[2]).toBe("5");
  });
});

describe("<z-report-group-table> 开关", () => {
  it("subtotal=false：没有组行，但总计还在", async () => {
    const el = await mount(mkChart({ showSubtotal: false }), ROWS);
    const rs = rowsOf(el);
    expect(rs.filter((r) => r.cls === "group")).toHaveLength(0);
    expect(rs.at(-1)!.cls).toBe("total");
  });

  it("grandTotal=false：没有总计行", async () => {
    const el = await mount(mkChart({ showGrandTotal: false }), ROWS);
    expect(rowsOf(el).some((r) => r.cls === "total")).toBe(false);
  });

  it("两个都关 = 退化成普通表格（行数与叶子数一致）", async () => {
    const el = await mount(mkChart({ showSubtotal: false, showGrandTotal: false }), ROWS);
    expect(rowsOf(el)).toHaveLength(3);
  });
});

describe("<z-report-group-table> 占位与安全", () => {
  it("无数据 / 无列时显示 emptyText", async () => {
    const el = await mount(mkChart(), []);
    expect(el.shadowRoot!.querySelector(".state")?.textContent).toBe("暂无数据");

    const el2 = new ZReportGroupTable();
    document.body.appendChild(el2);
    mounted.push(el2);
    await settle();
    expect(el2.shadowRoot!.querySelector(".state")).not.toBeNull();
  });

  it("维度值与列名都转义（列名来自用户输入，可能是 <img onerror>）", async () => {
    const chart = mkChart({ rows: ["city"], measures: [] });
    const el = await mount(chart, [{ city: '<img src=x onerror="alert(1)">' }], [
      { name: "city", alias: '<b>城市</b>', dataType: "varchar" },
    ]);
    expect(el.shadowRoot!.querySelector("img")).toBeNull();
    expect(el.shadowRoot!.querySelector("b")).toBeNull();
    expect(el.shadowRoot!.querySelector("tbody td")!.textContent).toBe('<img src=x onerror="alert(1)">');
  });

  it("不可重算的小计显示「—」（诚实占位），叶子行仍是空", async () => {
    const chart = mkChart({ rows: ["city", "store"], measures: [{ field: "temp", agg: "avg" }] });
    const el = await mount(chart, [
      { city: "杭州", store: "甲店", avg_temp: 10 },
      { city: "杭州", store: "乙店", avg_temp: 20 },
    ]);
    const rs = rowsOf(el);
    expect(rs[0].cells[2]).toBe("—"); // 组行 avg 无法重算
    expect(rs[1].cells[2]).toBe("10"); // 叶子行是后端算好的真值
  });
});
