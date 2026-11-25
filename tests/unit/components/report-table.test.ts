// Test: z-report-table 的视图行（分组/小计/总计/树状折叠）与分页。
// Related: IKQGVX / IKQGR4（多种表格组件整合、分页）
// Date: 2026-10-26
//
// [WHY 这个文件是新建的] 组件原先**零单测**：`tests/report/` 测的是 DSL 与
// `<z-report-group-table>`，而 page 卡挂的 `z-report-table` 没有任何护栏。
// 本轮要往它的核心渲染路径里插一层「视图行」，没有护栏等于蒙着眼改。
// 期望值一律手写字面量 —— 拿被测实现（buildGroupRowsBySpec / measureKeyOf）
// 生成期望值，等于两边一起变、断言永远绿。

import { describe, it, expect } from "vitest";
import "../../../src/report/table/ReportTable";

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

/** 属性必须在 appendChild 之后赋：BaseElement 的连接前赋值有先例被静默丢弃。 */
async function mount(init: (el: any) => void): Promise<any> {
  const el = document.createElement("z-report-table") as any;
  document.body.appendChild(el);
  init(el);
  await tick();
  await tick();
  return el;
}

const COLS = [
  { key: "shop", title: "门店" },
  { key: "category", title: "品类" },
  { key: "amount", title: "销售额", numeric: true, align: "right" },
];

/** 4 条明细：西湖店 2 条（250）、拱墅店 2 条（70）。 */
const ROWS = [
  { shop: "西湖店", category: "奶茶", amount: 150 },
  { shop: "西湖店", category: "果茶", amount: 100 },
  { shop: "拱墅店", category: "奶茶", amount: 40 },
  { shop: "拱墅店", category: "果茶", amount: 30 },
];

const rowsOf = (el: any): HTMLElement[] =>
  Array.from(el.shadowRoot.querySelectorAll(".z-rpt__body .z-rpt__row")) as HTMLElement[];
/** 单元格文本。折叠按钮的 ▾ / ▸ 也在 td 里，比对数值前先剥掉 —— 否则「西湖店」永远对不上。 */
const textOf = (tr: HTMLElement): string[] =>
  Array.from(tr.querySelectorAll(".z-rpt__td")).map((td) => (td.textContent ?? "").replace(/[▾▸]/g, "").trim());

describe("z-report-table 平表（原行为，不能被本轮改动带偏）", () => {
  it("一条数据一个 tr，data-index 与行序一致", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
    });
    const trs = rowsOf(el);
    expect(trs).toHaveLength(4);
    expect(trs.map((tr) => tr.dataset.index)).toEqual(["0", "1", "2", "3"]);
    // 平表每行都标 data：宿主靠 row-kind 区分「这行是小计」，所以平表也得有值
    expect(trs.map((tr) => tr.dataset.rowKind)).toEqual(["data", "data", "data", "data"]);
    expect(trs[0].classList.contains("z-rpt__row--group")).toBe(false);
  });

  it("没有 group 就不渲染分页条（pageSize 缺省 0）", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
    });
    expect(el.shadowRoot.querySelector(".z-rpt__pager")).toBeNull();
  });
});

describe("z-report-table 分组：小计 / 总计 / 缩进", () => {
  // [WHY dims 必须是「全维度」] 分组树按 dims 逐级下钻，叶子 = 该路径上的**唯一**一行。
  // 只写 [`shop`] 而数据里有两条西湖店，后一条会覆盖前一条（西湖店 250 变成 100）——
  // 这不是分组算错，是契约：传进来的行必须在 dims 上已聚合（page 卡由 aggregateRows 保证）。
  const withGroup = async (extra: (e: any) => void = () => undefined): Promise<any> =>
    mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.group = { dims: ["shop", "category"], measures: [{ key: "amount", agg: "sum" }] };
      extra(e);
    });

  it("组行在前、叶子在后，总计行收尾", async () => {
    const el = await withGroup();
    const trs = rowsOf(el);
    // 1 个组行 + 2 条叶子 + 1 个总计 = 4 …… 拱墅店也是一组 ⇒ 2 组 + 4 叶子 + 1 总计
    expect(trs).toHaveLength(7);
    expect(trs.map((tr) => tr.dataset.rowKind)).toEqual([
      "group",
      "data",
      "data",
      "group",
      "data",
      "data",
      "total",
    ]);
  });

  it("小计与总计是算出来的数，且第一维度列带缩进", async () => {
    const el = await withGroup();
    const trs = rowsOf(el);
    const west = textOf(trs[0]);
    expect(west[0]).toBe("西湖店");
    // 西湖店小计 = 150 + 100（手写字面量）
    expect(west[2]).toBe("250");
    // 总计行：第一维度列写「总计」，金额 320
    const total = textOf(trs[6]);
    expect(total[0]).toBe("总计");
    expect(total[2]).toBe("320");
    // 缩进只作用于第一个维度列（10px 起）
    const firstTd = trs[0].querySelector(".z-rpt__td") as HTMLElement;
    expect(firstTd.getAttribute("style") ?? "").toContain("padding-left:10px");
  });

  it("行点击仍指向**数据行**，不会把小计行当数据", async () => {
    const el = await withGroup();
    const trs = rowsOf(el);
    const seen: Array<{ index: number; row: any }> = [];
    el.addEventListener("z-row-click", (ev: CustomEvent) => seen.push(ev.detail));

    // 第 2 条 tr 是叶子（西湖店/奶茶）
    (trs[1].querySelector(".z-rpt__td") as HTMLElement).click();
    (trs[0].querySelector(".z-rpt__td") as HTMLElement).click(); // 小计行
    await tick();

    expect(seen).toHaveLength(1);
    expect(seen[0].index).toBe(0);
    expect(seen[0].row).toEqual({ shop: "西湖店", category: "奶茶", amount: 150 });
  });

  it("折叠组后子行消失，组行保留，并上报 z-group-toggle", async () => {
    const el = await withGroup();
    const events: Array<{ groupKey: string; collapsed: boolean }> = [];
    el.addEventListener("z-group-toggle", (ev: CustomEvent) => events.push(ev.detail));

    const btn = el.shadowRoot.querySelector(".z-rpt__toggle") as HTMLElement;
    expect(btn).not.toBeNull();
    btn.click();
    await tick();
    await tick();

    const trs = rowsOf(el);
    // 折了西湖店：它的组行留下、两条明细收起来；拱墅店整组仍在
    expect(trs.map((tr) => tr.dataset.rowKind)).toEqual(["group", "group", "data", "data", "total"]);
    expect(events).toEqual([{ groupKey: "西湖店", collapsed: true }]);
  });

  it("不开小计（showSubtotal:false）只剩叶子与总计", async () => {
    const el = await withGroup((e) => {
      e.group = { ...e.group, showSubtotal: false };
    });
    const kinds = rowsOf(el).map((tr) => tr.dataset.rowKind);
    expect(kinds).toEqual(["data", "data", "data", "data", "total"]);
  });
});

describe("z-report-table 分页", () => {
  it("只有一页时不画分页条（共用一行高度，零可执行动作）", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS.slice(0, 2);
      e.pageSize = 20;
    });
    expect(el.shadowRoot.querySelector(".z-rpt__pager")).toBeNull();
  });

  it("pageSize 切页，页脚显示条数与页码", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.pageSize = 2;
    });
    expect(rowsOf(el)).toHaveLength(2);
    const info = (el.shadowRoot.querySelector(".z-rpt__pager-info") as HTMLElement).textContent ?? "";
    expect(info).toContain("共 4 条");
    expect(info).toContain("第 1 / 2 页");
    expect(el.pageCount).toBe(2);
  });

  it("点下一页：换页 + 发 z-page-change", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.pageSize = 2;
    });
    const events: Array<{ page: number; pageSize: number }> = [];
    el.addEventListener("z-page-change", (ev: CustomEvent) => events.push(ev.detail));

    (el.shadowRoot.querySelector('[data-page-go="next"]') as HTMLElement).click();
    await tick();
    await tick();

    expect(events).toEqual([{ page: 2, pageSize: 2 }]);
    expect(textOf(rowsOf(el)[0])[0]).toBe("拱墅店");
    // 末页「下一页」不可点
    expect((el.shadowRoot.querySelector('[data-page-go="next"]') as HTMLButtonElement).disabled).toBe(true);
  });

  it("page 越界被 clamp（换筛选后总页数缩小是常态）", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS; // 4 条 / 每页 2 ⇒ 2 页，而 page 停在 99
      e.pageSize = 2;
      e.page = 99;
    });
    // 不 clamp 的话就是「显示第 99 页、一行没有」，而且没有任何报错
    expect(rowsOf(el)).toHaveLength(2);
    expect(textOf(rowsOf(el)[0])[0]).toBe("拱墅店"); // 落在最后一页
    const info = (el.shadowRoot.querySelector(".z-rpt__pager-info") as HTMLElement).textContent ?? "";
    expect(info).toContain("第 2 / 2 页");
  });

  it("总计行不参与分页：翻到第二页仍在表尾", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.group = { dims: ["shop", "category"], measures: [{ key: "amount", agg: "sum" }] };
      e.pageSize = 3;
    });
    (el.shadowRoot.querySelector('[data-page-go="next"]') as HTMLElement).click();
    await tick();
    await tick();
    const trs = rowsOf(el);
    expect(trs[trs.length - 1].dataset.rowKind).toBe("total");
    expect(textOf(trs[trs.length - 1])[2]).toBe("320");
  });
});

describe("z-report-table 分组分页：组块不跨页", () => {
  it("一级组的小计行与它的明细留在同一页", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.group = { dims: ["shop", "category"], measures: [{ key: "amount", agg: "sum" }] };
      // 每页 3 行：一个一级组块正好 3 行（组行 + 2 叶子）⇒ 一页一个组，
      // 不会出现「本页第一行是西湖店小计、它的明细在上一页」
      e.pageSize = 3;
    });
    const first = rowsOf(el).map((tr) => tr.dataset.rowKind);
    // 本页 = 西湖店的 3 行块 + 固定在表尾的总计行
    expect(first).toEqual(["group", "data", "data", "total"]);
    expect(textOf(rowsOf(el)[0])[0]).toBe("西湖店");
  });

  it("单块比一页还大时独占一页（不拆块、不死循环）", async () => {
    const el = await mount((e) => {
      e.columns = COLS;
      e.data = ROWS;
      e.group = { dims: ["shop", "category"], measures: [{ key: "amount", agg: "sum" }] };
      // 组块 3 行 > pageSize 2 ⇒ 独占一页（有意的取舍：硬拆开就对不上小计）
      e.pageSize = 2;
    });
    // 块 3 行 + 表尾总计 1 行（总计不参与分页）
    expect(rowsOf(el)).toHaveLength(4);
    expect(el.pageCount).toBe(2);
  });
});
