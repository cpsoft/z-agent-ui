// Test: 内容槽节点池的回收站 —— 滚出去 / 被筛掉的行回来时还拿得回同一个元素实例
// Related: src/report/core/cell-mount.ts（`CellPool` / `IDLE_LIMIT`）
// Date: 2026-11-23
//
// [WHY 这条要有] 上一版是「本轮没用上就丢」，代价写在注释里：格内有输入框或展开态时，
// **把行滚出去看一眼再滚回来就丢了**。改成回收站之后有两个必须钉住的性质：
//   ① 回来还能命中（否则等于没改）；
//   ② 回收站封顶（否则一千条任务 = 一千个常驻元素，它们还各自攥着自己的 row 对象）。
// 只测 ① 会得到一个「池无限大」的实现 —— 那是另一个方向的 bug，且更难发现。
import { describe, it, expect } from "vitest";
import { createTable, rendered } from "./components/report-table-helpers.js";
import { cellPoolSize, resetCellTagWarnings } from "../../src/report/table/table-cell-mount.js";
import { BaseCell } from "../../src/report/cell/index.js";
import { html } from "../../src/core/index.js";

class ZPoolTestCell extends BaseCell {
  render(): string {
    return html`<i>${String(this.value)}</i>`;
  }
}
if (!customElements.get("z-pool-test-cell")) customElements.define("z-pool-test-cell", ZPoolTestCell);

function tableOf(rows: number[]): any {
  const el = createTable();
  el.rowKey = "name";
  el.columns = [{ key: "name", title: "Name", width: "120px", cellTag: "z-pool-test-cell" }];
  el.data = rows.map((i) => ({ name: `R${i}` }));
  return el;
}

const cellsOf = (el: any) =>
  [...el.shadowRoot.querySelectorAll("td[data-cell-tag] z-pool-test-cell")] as HTMLElement[];

describe("内容槽节点池：回收站", () => {
  it("行被筛掉再放开，同一行拿回的是同一个元素实例", async () => {
    resetCellTagWarnings();
    const el = tableOf([0, 1, 2]);
    await rendered(el);

    const before = cellsOf(el);
    expect(before.length).toBe(3);

    // 筛成只剩一行：另外两行的 key 本轮没用上 → 进回收站
    el.data = [{ name: "R1" }];
    await rendered(el);
    expect(cellsOf(el).length).toBe(1);
    expect(cellPoolSize(el.shadowRoot).idle).toBe(2);

    // 放开筛选：R0 / R2 回来，必须是原来那两个实例（池命中，不是新建）
    el.data = [{ name: "R0" }, { name: "R1" }, { name: "R2" }];
    await rendered(el);
    const after = cellsOf(el);
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    expect(after[2]).toBe(before[2]);
    // 命中的条目从回收站搬回 active，回收站应清空
    expect(cellPoolSize(el.shadowRoot)).toEqual({ active: 3, idle: 0 });
  });

  it("回收站封顶：超出的最老条目被丢弃，最近的仍能命中", async () => {
    resetCellTagWarnings();
    const N = 200;
    const el = tableOf(Array.from({ length: N }, (_, i) => i));
    await rendered(el);

    const before = cellsOf(el);
    expect(before.length).toBe(N);

    // 全部筛掉 → 200 个 key 进回收站，但只留 IDLE_LIMIT(120) 个
    el.data = [{ name: "R0" }];
    await rendered(el);
    const idle = cellPoolSize(el.shadowRoot).idle;
    expect(idle, "回收站不能无上限，否则千行表就是千个常驻元素").toBe(120);

    // 放回来：最后 120 行（队尾）还能命中，最早的已被丢弃（新建）
    el.data = Array.from({ length: N }, (_, i) => ({ name: `R${i}` }));
    await rendered(el);
    const after = cellsOf(el);
    // 上限内的队尾留得住；被挤出去的最老那批（R1 起的前 79 个）应已丢弃。
    // 注意 R0 一直挂在屏上（active），不会被挤 —— 所以拿 R10 验丢弃，不是 R0。
    expect(after[N - 1], "最近滚出去的那行必须还拿得回原实例").toBe(before[N - 1]);
    expect(after[10], "超过上限的最老条目应被丢弃").not.toBe(before[10]);
  });
});
