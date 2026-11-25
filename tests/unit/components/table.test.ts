// Test: z-table component
// Related: [[REQ-001]] (i18n 文案可配置)
// Wiki: wiki/requirements/REQ-001-core-requirements.md
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/table/Table";

describe("z-table", () => {
  function createTable(): any {
    const el = document.createElement("z-table") as any;
    el.columns = [
      { key: "name", header: "Name" },
      { key: "age", header: "Age", sortable: true },
    ];
    el.data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    document.body.appendChild(el);
    return el;
  }

  it("renders headers from columns", async () => {
    const el = createTable();
    await new Promise((r) => setTimeout(r, 0));
    const ths = el.shadowRoot!.querySelectorAll("th");
    expect(ths.length).toBe(2);
    expect(ths[0].textContent).toContain("Name");
    document.body.removeChild(el);
  });

  it("renders data rows", async () => {
    const el = createTable();
    await new Promise((r) => setTimeout(r, 0));
    const rows = el.shadowRoot!.querySelectorAll(".z-table__row");
    expect(rows.length).toBe(2);
    document.body.removeChild(el);
  });

  it("renders empty state", async () => {
    const el = createTable();
    el.data = [];
    el.emptyText = "Nothing here";
    await new Promise((r) => setTimeout(r, 0));
    const empty = el.shadowRoot!.querySelector(".z-table__empty-cell")!;
    expect(empty.textContent).toContain("Nothing here");
    document.body.removeChild(el);
  });

  it("renders loading state", async () => {
    const el = createTable();
    el.loading = true;
    await new Promise((r) => setTimeout(r, 0));
    const loading = el.shadowRoot!.querySelector(".z-table__loading-cell")!;
    expect(loading).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows custom loading-text via attribute", async () => {
    const el = createTable();
    el.loading = true;
    el.setAttribute("loadingtext", "加载中...");
    await new Promise((r) => setTimeout(r, 0));
    const loading = el.shadowRoot!.querySelector(".z-table__loading-cell")!;
    expect(loading.textContent).toContain("加载中...");
    document.body.removeChild(el);
  });

  it("striped classes are toggled", async () => {
    const el = createTable();
    el.striped = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-table--striped")).toBeDefined();
    document.body.removeChild(el);
  });

  it("bordered classes are toggled", async () => {
    const el = createTable();
    el.bordered = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-table--bordered")).toBeDefined();
    document.body.removeChild(el);
  });

  it("clicking sortable header emits z-sort", async () => {
    const el = createTable();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-sort", handler);

    const th = el.shadowRoot!.querySelector('[data-key="age"]') as HTMLElement;
    th.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.key).toBe("age");
    document.body.removeChild(el);
  });

  it("toggles sort direction on same column", async () => {
    const el = createTable();
    el.sortKey = "age";
    el.sortDir = "asc";
    await new Promise((r) => setTimeout(r, 0));

    const th = el.shadowRoot!.querySelector('[data-key="age"]') as HTMLElement;
    th.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.sortDir).toBe("desc");
    document.body.removeChild(el);
  });

  it("renders custom HTML via render without escaping", async () => {
    const el = createTable();
    el.columns = [
      { key: "name", header: "Name" },
      { key: "ops", header: "Ops", render: () => '<z-badge variant="success">Active</z-badge>' },
    ];
    await new Promise((r) => setTimeout(r, 0));
    const badge = el.shadowRoot!.querySelector("z-badge");
    expect(badge).toBeTruthy();
    expect(el.shadowRoot!.querySelectorAll(".z-table__td")[1]!.textContent).toContain("Active");
    document.body.removeChild(el);
  });

  it("passes value, row and index to render", async () => {
    const el = createTable();
    const renderSpy = vi.fn((v: unknown) => String(v));
    el.columns = [
      { key: "name", header: "Name" },
      { key: "age", header: "Age", render: renderSpy },
    ];
    el.data = [{ name: "Alice", age: 30 }];
    await new Promise((r) => setTimeout(r, 0));
    expect(renderSpy).toHaveBeenCalledWith(30, { name: "Alice", age: 30 }, 0);
    document.body.removeChild(el);
  });

  it("bubbles z-button z-click out of shadow DOM to the consumer", async () => {
    await import("../../../src/components/button/Button");
    const el = createTable();
    el.columns = [
      { key: "name", header: "Name" },
      {
        key: "ops", header: "Ops", align: "center",
        render: (_v: unknown, row: any) =>
          `<span class="z-table__btn-group"><z-button size="sm" data-action="edit" data-id="${row.id}">Edit</z-button></span>`,
      },
    ];
    el.data = [{ name: "Alice", id: "a1" }];
    await new Promise((r) => setTimeout(r, 0));

    const clickSpy = vi.fn();
    el.addEventListener("z-click", clickSpy);

    const zBtn = el.shadowRoot!.querySelector("z-button[data-action='edit']") as any;
    expect(zBtn).toBeTruthy();
    // 真实链路: shadow 内原生 button 点击 → z-button emit z-click(composed) → 穿透 z-table shadow
    zBtn.shadowRoot!.querySelector("button")!.click();
    await new Promise((r) => setTimeout(r, 0));

    expect(clickSpy).toHaveBeenCalledTimes(1);
    const detail = clickSpy.mock.calls[0][0];
    expect(detail.target.getAttribute("data-action")).toBe("edit");
    expect(detail.target.getAttribute("data-id")).toBe("a1");
    document.body.removeChild(el);
  });
});

// ── 键盘：单元格网格与表头 roving（2026-11-16）──────────────────────────
//
// [WHY 这一组以前不存在] `z-table` 的单元格方向键导航上一轮就写了，却只有
// 一个真机冒烟在验它 —— 没有单测兜底，任何一次重构都可能把它悄悄弄没，
// 而坏掉的表现是「按了没反应」，肉眼完全看不出来。
// 本轮同时把「按键 → 意图 → 坐标」搬进 L0 的 primitives/roving，这组用例
// 就是那次迁移的安全网：行为一个都不能变。
/** 事件必须 composed：单元格在 shadow 里，监听挂在 shadowRoot / body 上。 */
function key(el: Element, k: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true, cancelable: true, ...init });
  el.dispatchEvent(ev);
  return ev;
}

describe("z-table 键盘", () => {
  function makeTable(): any {
    const el = document.createElement("z-table") as any;
    el.columns = [
      { key: "name", header: "Name", sortable: true },
      { key: "age", header: "Age", sortable: true },
      { key: "city", header: "City", sortable: true },
    ];
    el.data = [
      { name: "A", age: 1, city: "杭州" },
      { name: "B", age: 2, city: "上海" },
    ];
    document.body.appendChild(el);
    return el;
  }

  const cellAt = (el: any, r: number, c: number): HTMLElement =>
    el.shadowRoot!.querySelector(`.z-table__td[data-row="${r}"][data-col="${c}"]`);

  it("K1 整表只有一个 Tab 停靠点（首行首列），其余是 -1", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    const cells = [...el.shadowRoot!.querySelectorAll(".z-table__td")];
    const stops = cells.filter((c) => c.getAttribute("tabindex") === "0");
    expect(stops.length, "每个单元格都 tabindex=0 的话，越过这张表要按 6 下 Tab").toBe(1);
    expect(stops[0]).toBe(cellAt(el, 0, 0));
    document.body.removeChild(el);
  });

  it("K2 方向键走格：↓ 同列下一行、→ 同行下一列，到边停住", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    const start = cellAt(el, 0, 0);
    start.focus();

    key(start, "ArrowDown");
    expect(el.shadowRoot!.activeElement, "↓ 应当到第 2 行同一列").toBe(cellAt(el, 1, 0));

    key(el.shadowRoot!.activeElement!, "ArrowRight");
    expect(el.shadowRoot!.activeElement).toBe(cellAt(el, 1, 1));

    // 已到最后一行，再按 ↓ 应当**停住**（不环绕）
    key(el.shadowRoot!.activeElement!, "ArrowDown");
    expect(el.shadowRoot!.activeElement, "表格到边不环绕，否则用户以为自己漏看了一屏").toBe(cellAt(el, 1, 1));
    document.body.removeChild(el);
  });

  it("K3 Home/End 走行首行尾，Ctrl+End 走全表末格", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    cellAt(el, 1, 1).focus();

    key(el.shadowRoot!.activeElement!, "Home");
    expect(el.shadowRoot!.activeElement).toBe(cellAt(el, 1, 0));

    key(el.shadowRoot!.activeElement!, "End");
    expect(el.shadowRoot!.activeElement).toBe(cellAt(el, 1, 2));

    key(el.shadowRoot!.activeElement!, "End", { ctrlKey: true });
    expect(el.shadowRoot!.activeElement, "Ctrl+End 应当跨到全表末格").toBe(cellAt(el, 1, 2));

    key(cellAt(el, 0, 1), "End", { ctrlKey: true });
    expect(el.shadowRoot!.activeElement).toBe(cellAt(el, 1, 2));
    document.body.removeChild(el);
  });

  it("K4 焦点跟着走：roving 停靠点从旧格搬到新格（Tab 回来不从头）", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    cellAt(el, 0, 1).focus();
    key(el.shadowRoot!.activeElement!, "ArrowDown");

    const stops = [...el.shadowRoot!.querySelectorAll('.z-table__td[tabindex="0"]')];
    expect(stops.length).toBe(1);
    expect(stops[0], "停靠点没跟着焦点走 ⇒ 下次 Tab 进来又从首格开始").toBe(cellAt(el, 1, 1));
    document.body.removeChild(el);
  });

  it("K5 表头也只有一个停靠点，方向键在可排序列间移动", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    const heads = [...el.shadowRoot!.querySelectorAll<HTMLElement>(".z-table__th--sortable")];
    expect(heads.length).toBe(3);

    const stops = heads.filter((h) => h.getAttribute("tabindex") === "0");
    expect(stops.length, "8 个可排序列 = 8 个 Tab 停靠点，与单元格那套口径矛盾").toBe(1);
    expect(stops[0]).toBe(heads[0]);

    heads[0].focus();
    key(heads[0], "ArrowRight");
    expect(el.shadowRoot!.activeElement).toBe(heads[1]);
    key(heads[1], "End");
    expect(el.shadowRoot!.activeElement).toBe(heads[2]);
    key(heads[2], "ArrowRight");
    expect(el.shadowRoot!.activeElement, "末列再往右应当停住").toBe(heads[2]);
    document.body.removeChild(el);
  });

  it("K6 排序后焦点回到同一列表头（重渲染不吞焦点）", async () => {
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));
    const ageHead = el.shadowRoot!.querySelector<HTMLElement>('.z-table__th[data-key="age"]')!;
    ageHead.focus();
    key(ageHead, "Enter");
    await new Promise((r) => setTimeout(r, 0));

    // [WHY 断言「同一个 key」而不是「同一个节点」] 排序会整体重渲染，节点必然换新；
    // 断言节点相等永远红，断言「焦点不是 body」又太松（可能在别处）。
    const active = el.shadowRoot!.activeElement as HTMLElement | null;
    expect(active?.dataset.key, "按一次 Enter 排序，焦点就掉到 body 了").toBe("age");
    expect(active, "恢复的必须是重新渲染出来的那个节点").toBe(
      el.shadowRoot!.querySelector('.z-table__th[data-key="age"]'),
    );
    document.body.removeChild(el);
  });

  it("K7 ★ 到边时按键仍被消费（否则整个页面跟着滚 / 横向滑动）", async () => {
    // [WHY 单独立一条] K2 与 K5 都断言了「停住」，但没断言「这一键被 preventDefault」。
    // 两者的差别在真机上才看得见：焦点不动、页面却在滚 —— 用户会以为「表格在抖」。
    // 变异验证记录：把 `resolveIndex` 的到边分支从「返回当前项」改成「返回 -1」，
    // K2/K5 全绿，只有这一条会红。
    const el = makeTable();
    await new Promise((r) => setTimeout(r, 0));

    const lastCell = cellAt(el, 1, 2);
    lastCell.focus();
    expect(key(lastCell, "ArrowRight").defaultPrevented, "末格 →").toBe(true);
    expect(key(lastCell, "ArrowDown").defaultPrevented, "末行 ↓").toBe(true);

    const heads = [...el.shadowRoot!.querySelectorAll<HTMLElement>(".z-table__th--sortable")];
    heads[2].focus();
    expect(key(heads[2], "ArrowRight").defaultPrevented, "末列表头 →").toBe(true);

    // 反向自检：不该被消费的键要保持连通，否则方向键之外的键会被表格吞掉
    expect(key(heads[0], "a").defaultPrevented, "普通字母键不该被消费").toBe(false);
    document.body.removeChild(el);
  });
});
