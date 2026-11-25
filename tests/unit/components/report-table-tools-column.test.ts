// Test: 列选择器落在表头末格 —— 不再独占一行，且表头/表体/合计/空态的列数恒等
// Related: [[IKQUWH]]
// Wiki: wiki/bugs/bug-20261027-ikquwh-column-selector-row.md
// Date: 2026-10-27
//
// 为什么值得测：这条改动的失败形态是**错位**，不是报错。工具列是表头多出来的一格
// `<th>`，表体每行、合计行、空态的 colspan 都必须跟着多一格 —— 任漏一处，
// 「状态」下面画的就是「操作」，而肉眼看到的很像「列顺序配错了」。
// 所以主断言是两条：**不占行**（少了 toolbar 那一层）与 **列数恒等**（四层一致）。

import { describe, it, expect } from "vitest";
import { createTable, rendered } from "./report-table-helpers.js";
import { computeFixedOffsets } from "../../../src/report/table/table-render.js";

/** 表头/表体/合计的格数，以及空态行的 colspan。 */
function shapeOf(el: any) {
  const root = el.shadowRoot!;
  return {
    headCells: root.querySelectorAll("thead th").length,
    // 只数第一行：`tbody tr .z-rpt__td` 会把三行的格子累加（3×3=9），断言看起来像「列数爆炸」
    firstRowCells: root.querySelectorAll("tbody tr:first-child .z-rpt__td").length,
    footCells: root.querySelectorAll("tfoot th").length,
    emptyColspan: Number(root.querySelector(".z-rpt__empty-cell")?.getAttribute("colspan") ?? 0),
    toolCells: root.querySelectorAll(".z-rpt__th--tools, .z-rpt__td--tools, .z-rpt__tf--tools").length,
    toolbarDiv: root.querySelectorAll(".z-rpt__toolbar").length,
  };
}

describe("z-report-table · 工具列（列选择器进表头末格）", () => {
  it("不占行：不再有独立的 toolbar 容器", async () => {
    const el = createTable();
    await rendered(el);
    expect(shapeOf(el).toolbarDiv).toBe(0);
    document.body.removeChild(el);
  });

  it("表头的末格就是工具列，里面装着 z-column-selector", async () => {
    const el = createTable();
    await rendered(el);
    const heads = el.shadowRoot!.querySelectorAll("thead th");
    const last = heads[heads.length - 1];
    expect(last.classList.contains("z-rpt__th--tools")).toBe(true);
    expect(last.querySelector("z-column-selector")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("表头格数 === 表体首行格数（含工具列）", async () => {
    const el = createTable();
    await rendered(el);
    const s = shapeOf(el);
    // 手写期望：3 个数据列 + 1 格工具列 = 4
    expect(s.headCells).toBe(4);
    expect(s.firstRowCells).toBe(4);
    document.body.removeChild(el);
  });

  it("合计行也带那一格（否则合计行整体左移一格）", async () => {
    const el = createTable();
    el.showFooter = true;
    await rendered(el);
    const s = shapeOf(el);
    expect(s.footCells).toBe(4);
    document.body.removeChild(el);
  });

  it("空态行的 colspan 盖满工具列（否则空态露一截白底）", async () => {
    const el = createTable();
    el.data = [];
    await rendered(el);
    expect(shapeOf(el).emptyColspan).toBe(4);
    document.body.removeChild(el);
  });

  it("勾选列同时存在时，四层仍然一致（+全选格 +工具格）", async () => {
    const el = createTable();
    el.selectable = true;
    el.showFooter = true;
    await rendered(el);
    const s = shapeOf(el);
    expect(s.headCells).toBe(5);
    expect(s.firstRowCells).toBe(5);
    expect(s.footCells).toBe(5);
    document.body.removeChild(el);
  });

  it("showColumnSelector=false 时不留工具格、也不留空档", async () => {
    const el = createTable();
    el.showColumnSelector = false;
    el.showFooter = true;
    await rendered(el);
    const s = shapeOf(el);
    expect(s.toolCells).toBe(0);
    expect(s.toolbarDiv).toBe(0);
    expect(s.headCells).toBe(3);
    expect(s.firstRowCells).toBe(3);
    expect(s.footCells).toBe(3);
    document.body.removeChild(el);
  });

  it("右冻结列的偏移从工具列宽度起算（两者不重叠）", () => {
    const cols = [
      { key: "a", title: "A", width: "100px" },
      { key: "b", title: "B", width: "120px", fixed: "right" as const },
    ];
    const widths = new Map<string, number>();
    // 不传 trailingWidth：右冻结贴 right:0
    expect(computeFixedOffsets(cols, false, widths).right.get("b")).toBe(0);
    // 传 32（工具列）：右冻结让开 32px，两个 right:0 的元素才不会叠住
    expect(computeFixedOffsets(cols, false, widths, 32).right.get("b")).toBe(32);
    // 左冻结不受工具列影响（它在最右，不在左侧累加链上）
    const leftCols = [{ key: "a", title: "A", width: "100px", fixed: "left" as const }];
    expect(computeFixedOffsets(leftCols, false, widths, 32).left.get("a")).toBe(0);
  });
});
