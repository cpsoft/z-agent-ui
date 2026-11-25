// Test: 列字段筛选的顺序调整 + 本机记忆（persist-key）
//
// 三条契约：
//   1. 列选择器里的拖拽手柄只在宿主实现了 reorderColumns 时出现（能力探测）；
//   2. 调整顺序走宿主公开方法，顺序来源是「松手后的完整 key 列表」，不是 from/to 索引；
//   3. persist-key 打开时，顺序与显隐写入 localStorage，下次打开同一张表自动恢复。
//
// 为什么不测拖拽的 pointer 序列：happy-dom 里所有元素的 rect 都是 0×0，"拖到第几行"
// 没有可判定的落点。键盘路径（Alt+↑↓）走的是同一个提交口，断言它等于断言顺序变更本身。

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTable, rendered, colSel, inColSel } from "./report-table-helpers.js";

const KEY = "z-rpt-test-order";

function keysOf(el: any): string[] {
  return el.columns.map((c: any) => c.key);
}

function openSelector(el: any): void {
  colSel(el).open = true;
}

beforeEach(() => {
  localStorage.clear();
});

describe("列选择器 · 调整顺序", () => {
  it("宿主支持重排时，每行都有拖拽手柄（不支持的宿主不画）", async () => {
    const el = createTable();
    await rendered(el);
    openSelector(el);
    await rendered(el);
    expect(inColSel(el, ".z-colsel__grip")).toBeTruthy();
    expect(inColSel(el, ".z-colsel__grip")!.getAttribute("title")).toBe("拖动调整顺序");
    document.body.removeChild(el);
  });

  it("Alt+↓ 把当前列下移一格，并派发 z-column-order-change", async () => {
    const el = createTable();
    await rendered(el);
    openSelector(el);
    await rendered(el);

    const spy = vi.fn();
    document.addEventListener("z-column-order-change", spy as EventListener);

    const cb = inColSel(el, '.z-colsel__checkbox[data-key="name"]') as HTMLInputElement;
    cb.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, composed: true }));
    await rendered(el);

    expect(keysOf(el)).toEqual(["amount", "name", "note"]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as CustomEvent).detail.keys).toEqual(["amount", "name", "note"]);
    document.removeEventListener("z-column-order-change", spy as EventListener);
    document.body.removeChild(el);
  });

  it("表头与表体的列顺序同步（不是只改了 columns 数组）", async () => {
    const el = createTable();
    await rendered(el);
    el.reorderColumns(["note", "amount", "name"]);
    await rendered(el);
    const ths = Array.from(el.shadowRoot.querySelectorAll("thead th[data-key]")).map(
      (th: any) => th.dataset.key,
    );
    expect(ths).toEqual(["note", "amount", "name"]);
    document.body.removeChild(el);
  });

  it("reorderColumns 忽略未知 key，未列出的列按原顺序追加在后面", async () => {
    const el = createTable();
    await rendered(el);
    el.reorderColumns(["note", "ghost"]);
    await rendered(el);
    expect(keysOf(el)).toEqual(["note", "name", "amount"]);
    document.body.removeChild(el);
  });

  it("顺序没变时不发事件（宿主常在事件里重新取数）", async () => {
    const el = createTable();
    await rendered(el);
    const spy = vi.fn();
    el.addEventListener("z-config-change", spy);
    el.reorderColumns(["name", "amount", "note"]);
    await rendered(el);
    expect(spy).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });
});

describe("本机记忆 persist-key", () => {
  it("调整顺序和隐藏列后立即写入 localStorage", async () => {
    const el = createTable();
    el.persistKey = KEY;
    await rendered(el);

    el.reorderColumns(["note", "name", "amount"]);
    el.hideColumn("amount");
    await rendered(el);

    const saved = JSON.parse(localStorage.getItem(KEY)!);
    expect(saved.order).toEqual(["note", "name", "amount"]);
    expect(saved.hidden).toEqual(["amount"]);
    document.body.removeChild(el);
  });

  it("同一 persist-key 的新表格恢复顺序与显隐", async () => {
    const first = createTable();
    first.persistKey = KEY;
    await rendered(first);
    first.reorderColumns(["note", "name", "amount"]);
    first.hideColumn("amount");
    await rendered(first);
    document.body.removeChild(first);

    const second = createTable();
    second.persistKey = KEY;
    await rendered(second);

    expect(keysOf(second)).toEqual(["note", "name", "amount"]);
    expect(second.columns.find((c: any) => c.key === "amount").hidden).toBe(true);
    // 隐藏列不画表头
    const ths = Array.from(second.shadowRoot.querySelectorAll("thead th[data-key]")).map(
      (th: any) => th.dataset.key,
    );
    expect(ths).not.toContain("amount");
    document.body.removeChild(second);
  });

  it("没写 persist-key 时绝不碰 localStorage", async () => {
    const el = createTable();
    await rendered(el);
    el.reorderColumns(["note", "name", "amount"]);
    el.toggleColumn("note");
    await rendered(el);
    expect(localStorage.length).toBe(0);
    document.body.removeChild(el);
  });

  it("存的值坏掉时回到默认，不抛错", async () => {
    localStorage.setItem(KEY, "{ not json");
    const el = createTable();
    el.persistKey = KEY;
    await rendered(el);
    expect(keysOf(el)).toEqual(["name", "amount", "note"]);
    document.body.removeChild(el);

    localStorage.setItem(KEY, JSON.stringify({ v: 1, order: "nope" }));
    const el2 = createTable();
    el2.persistKey = KEY;
    await rendered(el2);
    expect(keysOf(el2)).toEqual(["name", "amount", "note"]);
    document.body.removeChild(el2);
  });

  it("存储里有新表格不认识的列时忽略它们，新列按声明默认排在最后", async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ v: 1, order: ["note", "removed", "name", "amount"], hidden: ["removed"] }),
    );
    const el = createTable();
    el.persistKey = KEY;
    await rendered(el);
    expect(keysOf(el)).toEqual(["note", "name", "amount"]);
    document.body.removeChild(el);
  });
});
