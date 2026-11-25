// Test: 内容槽默认基类 BaseCell —— 继承它，四个注入字段就自带「赋值即重绘」
// Related: src/report/cell/base-cell.ts / architecture/l2-decompose-plan.html §7
// Date: 2026-11-23
//
// [WHY 这条要有] BaseCell 的全部价值是「少写 12 行样板而不改变契约」。而样板写错的
// 代价是**静默**的：把 `value` 写成普通字段照样能显示第一屏内容，只是值变了不重绘。
// 所以这里不能只断言「挂上去有字」，必须断言**改 `.value` 之后元素自己重画**
// —— 那正是它与裸 HTMLElement 的唯一区别。变异验证：把基类的 4 个
// `@property({ attribute: false })` 改成普通字段，第二条断言必须转红。
import { describe, it, expect } from "vitest";
import { createTable, rendered, tick } from "./components/report-table-helpers.js";
import { resetCellTagWarnings } from "../../src/report/table/table-cell-mount.js";
import { BaseCell } from "../../src/report/cell/index.js";
import { html } from "../../src/core/index.js";

class ZBaseTestCell extends BaseCell {
  render(): string {
    return html`<b>${String(this.value)}@${this.index}${this.selected ? "*" : ""}</b>`;
  }
}
/** 只读元素内容：shadow 里还躺着样式节点，`textContent` 会把 CSS 一起带上。 */
const body = (cell: HTMLElement) => cell.shadowRoot!.querySelector("b")?.textContent?.trim() ?? "";
if (!customElements.get("z-base-test-cell")) customElements.define("z-base-test-cell", ZBaseTestCell);

function tableWithBaseCell(): any {
  resetCellTagWarnings();
  const el = createTable();
  el.columns = [
    { key: "name", title: "Name", width: "120px", cellTag: "z-base-test-cell" },
    { key: "amount", title: "Amount", width: "100px" },
    { key: "note", title: "Note", width: "200px" },
  ];
  return el;
}

describe("BaseCell", () => {
  it("四个注入字段由基类提供，子类只写 render()", async () => {
    const el = tableWithBaseCell();
    await rendered(el);

    const cells = el.shadowRoot.querySelectorAll("td[data-cell-tag] z-base-test-cell");
    expect(cells.length).toBe(3);
    // 行对象与下标都到位：只声明了 value 的基类拿不到 index
    expect(body(cells[0])).toBe("Alpha@0");
    expect(body(cells[2])).toBe("Gamma@2");
    expect((cells[0] as any).row.name).toBe("Alpha");
  });

  it("改 .value 元素自己重绘（那就是它与裸 HTMLElement 的唯一区别）", async () => {
    const el = tableWithBaseCell();
    await rendered(el);

    const cell = el.shadowRoot.querySelector("td[data-cell-tag] z-base-test-cell") as any;
    cell.value = "改过的";
    await tick();
    expect(body(cell)).toBe("改过的@0");
  });

  it("选中态也走同一条注入路径", async () => {
    const el = tableWithBaseCell();
    // 选中态走 `selected-row-id`（表里那份唯一的行标识声明），不是复选框那套 keys
    el.selectable = true;
    el.selectedRowId = "name:Alpha";
    await rendered(el);

    const cell = el.shadowRoot.querySelector("td[data-cell-tag] z-base-test-cell") as any;
    expect(cell.selected).toBe(true);
    expect(body(cell)).toBe("Alpha@0*");
  });
});

// [WHY 这条单测钉的是「默认盒」] 它不是视觉偏好：`.z-gantt__td` 是 flex 容器，
// 没有 `width:100%` 的自定义元素会退成 shrink-to-fit，进度条轨道被压到 0 ——
// 表格里显示正常、到甘特里只剩一个百分比数字。真机实测过，单测抓不到布局，
// 所以这里只钉「默认盒还在」与「子类加样式别把它覆盖掉」。
describe("BaseCell 默认盒", () => {
  class ZStyledCell extends BaseCell {
    static styles = [BaseCell.styles, ":host{color:red}"];
    render(): string {
      return html`<i>x</i>`;
    }
  }
  if (!customElements.get("z-styled-test-cell")) customElements.define("z-styled-test-cell", ZStyledCell);

  const css = (cell: HTMLElement) => cell.shadowRoot!.querySelector("style")?.textContent ?? "";

  it("子类不写样式时继承「撑满格子」", async () => {
    const el = document.createElement("z-base-test-cell") as HTMLElement;
    document.body.appendChild(el);
    await tick();
    expect(css(el)).toContain("width: 100%");
  });

  it("子类加样式走数组拼接，默认盒不会被覆盖掉", async () => {
    const el = document.createElement("z-styled-test-cell") as HTMLElement;
    document.body.appendChild(el);
    await tick();
    expect(css(el)).toContain("width: 100%");
    expect(css(el)).toContain("color:red");
  });
});
