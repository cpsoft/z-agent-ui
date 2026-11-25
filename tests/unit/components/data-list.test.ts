// Test: z-data-list 通用字段驱动列表(分页/列显隐联动/按类型筛选/双路径渲染/事件卫生)
// Related: [[2026-08-13-data-list]]
// Wiki: wiki/planning/TASKS/2026-08-13-data-list/task_plan.md
// Date: 2026-08-13
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/report/data-list/DataList";

const FIELDS = [
  { key: "name", label: "Name", type: "text" },
  { key: "age", label: "Age", type: "number" },
  {
    key: "role",
    label: "Role",
    type: "select",
    options: [
      { value: "admin", label: "Admin" },
      { value: "user", label: "User" },
      { value: "guest", label: "Guest" },
    ],
  },
  { key: "active", label: "Active", type: "boolean" },
  { key: "createdAt", label: "Created", type: "date" },
];

const NAMES = ["Alice", "Bob", "Carol", "Dana", "Eve"];

// 80 条确定性 mock: name 每 5 条循环(Alice x16)、age 20..59(各 2 条)、
// role admin/user/guest 循环(admin 27)、active 交替(各 40)、createdAt 01-01..01-28
function makeItems(n = 80): Record<string, unknown>[] {
  const roles = ["admin", "user", "guest"];
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: NAMES[i % 5],
    age: 20 + (i % 40),
    role: roles[i % 3],
    active: i % 2 === 0,
    createdAt: new Date(2026, 0, 1 + (i % 28)).toISOString(),
  }));
}

describe("z-data-list", () => {
  function createList(overrides: Record<string, unknown> = {}): any {
    const el = document.createElement("z-data-list") as any;
    el.fields = (overrides.fields as any[]) ?? FIELDS;
    el.items = (overrides.items as any[]) ?? makeItems();
    el.pageSize = 10;
    if (overrides.page !== undefined) el.page = overrides.page;
    if (overrides.mode) el.mode = overrides.mode;
    if (overrides.totalRecords !== undefined) el.totalRecords = overrides.totalRecords;
    if (overrides.showPageSize) el.showPageSize = true;
    if (overrides.selectable) el.selectable = true;
    if (overrides.rowKey) el.rowKey = overrides.rowKey;
    document.body.appendChild(el);
    return el;
  }

  function tick(): Promise<void> {
    return new Promise((r) => setTimeout(r, 0));
  }

  async function rendered(el: any, times = 2): Promise<void> {
    for (let i = 0; i < times; i++) await tick();
  }

  function shadowOf(el: any): HTMLElement {
    return el.shadowRoot as unknown as HTMLElement;
  }

  // [WHY] .z-rpt__* 位于内层 z-report-table 的 shadow root, 须穿透一层
  function tableOf(el: any): any {
    return shadowOf(el).querySelector("z-report-table");
  }

  // [WHY] 列选择器抽为独立 z-column-selector 内嵌于表格工具栏([[REQ-015-column-selector]]),
  // .z-colsel__* 位于其自身 shadow, 须再穿透一层
  function colSelOf(el: any): any {
    return tableOf(el).shadowRoot.querySelector("z-column-selector");
  }

  function inputOf(el: any, key: string, bound = ""): HTMLInputElement {
    return shadowOf(el).querySelector<HTMLInputElement>(
      `z-input[data-key="${key}"][data-bound="${bound}"]`,
    )!.shadowRoot!.querySelector("input")!;
  }

  async function typeInto(el: any, key: string, text: string, bound = ""): Promise<void> {
    const field = inputOf(el, key, bound);
    field.value = text;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    await rendered(el);
  }

  function rowsOf(el: any): NodeListOf<Element> {
    return tableOf(el).shadowRoot.querySelectorAll(".z-rpt__row");
  }

  function selectControl(el: any, key: string): any {
    return shadowOf(el).querySelector(`z-select[data-key="${key}"]`);
  }

  async function pickSelectOption(el: any, key: string, value: string): Promise<void> {
    const select = selectControl(el, key);
    select.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await rendered(el);
    const all = document.querySelectorAll<HTMLElement>(".z-select__dropdown");
    const dd = all[all.length - 1];
    const opt = dd.querySelector<HTMLElement>(`.z-select__option[data-value="${value}"]`)!;
    opt.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    select.open = false;
    await rendered(el);
  }

  function clickPage(el: any, page: number): void {
    const pager = shadowOf(el).querySelector("z-pagination")!;
    const btn = pager.shadowRoot.querySelector(`.z-pagination__item[data-page="${page}"]`)!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  describe("渲染", () => {
    it("三段结构: filterbar + report-table + pagination", async () => {
      const el = createList();
      await rendered(el);
      const shadow = shadowOf(el);
      expect(shadow.querySelector(".z-dl__filterbar")).toBeTruthy();
      expect(shadow.querySelector("z-report-table")).toBeTruthy();
      expect(shadow.querySelector("z-pagination")).toBeTruthy();
      document.body.removeChild(el);
    });

    it("控件按字段类型映射: text/number 双输入/select 注入 All/boolean 三态/date range", async () => {
      const el = createList();
      await rendered(el);
      const shadow = shadowOf(el);
      expect(shadow.querySelector('z-input[data-key="name"]')).toBeTruthy();
      const min = shadow.querySelector('z-input[data-key="age"][data-bound="min"]');
      const max = shadow.querySelector('z-input[data-key="age"][data-bound="max"]');
      expect(min?.getAttribute("type")).toBe("number");
      expect(max?.getAttribute("type")).toBe("number");
      const roleSel = shadow.querySelector('z-select[data-key="role"]');
      expect(roleSel).toBeTruthy();
      const roleOptions = roleSel!.querySelectorAll("z-option");
      expect(roleOptions.length).toBe(4); // All + 3
      expect((roleOptions[0] as any).value).toBe("");
      expect((roleOptions[0] as any).textContent).toBe("全部");
      const activeSel = shadow.querySelector('z-select[data-key="active"]');
      expect(activeSel!.querySelectorAll("z-option").length).toBe(3);
      const date = shadow.querySelector('z-datepicker[data-key="createdAt"]');
      expect(date?.getAttribute("mode")).toBe("range");
      document.body.removeChild(el);
    });

    it("filterable:false 字段不渲染控件", async () => {
      const fields = [...FIELDS];
      fields[0] = { ...fields[0], filterable: false };
      const el = createList({ fields });
      await rendered(el);
      expect(shadowOf(el).querySelector('z-input[data-key="name"]')).toBeNull();
      document.body.removeChild(el);
    });

    it("hidden 字段的 filter-item 初始带 --hidden class", async () => {
      const fields = [...FIELDS];
      fields[2] = { ...fields[2], hidden: true };
      const el = createList({ fields });
      await rendered(el);
      const item = shadowOf(el).querySelector('.z-dl__filter-item[data-key="role"]')!;
      expect(item.classList.contains("z-dl__filter-item--hidden")).toBe(true);
      document.body.removeChild(el);
    });
  });

  describe("client 过滤", () => {
    it("text 实时过滤: 行数 + totalRecords + z-filter-change, 元素身份不变(双路径保焦点)", async () => {
      const el = createList();
      await rendered(el);
      const input = inputOf(el, "name");
      const before = input;
      const filterSpy = vi.fn();
      el.addEventListener("z-filter-change", filterSpy);
      await typeInto(el, "name", "Alice");
      expect(rowsOf(el).length).toBe(10); // 16 命中分页 10
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(16);
      expect(filterSpy).toHaveBeenCalledTimes(1);
      expect((filterSpy.mock.calls[0][0] as CustomEvent).detail.filters).toEqual({ name: "Alice" });
      expect(inputOf(el, "name")).toBe(before); // 未重渲染
      document.body.removeChild(el);
    });

    it("text 过滤大小写不敏感", async () => {
      const el = createList();
      await rendered(el);
      await typeInto(el, "name", "alice");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(16);
      document.body.removeChild(el);
    });

    it("同值重复上报(z-input 实时 + z-change commit)只发一次 z-filter-change", async () => {
      const el = createList();
      await rendered(el);
      const input = inputOf(el, "name");
      const filterSpy = vi.fn();
      el.addEventListener("z-filter-change", filterSpy);
      input.value = "Alice";
      input.dispatchEvent(new Event("input", { bubbles: true })); // z-input 实时
      await rendered(el);
      input.dispatchEvent(new Event("change", { bubbles: true })); // commit 同值
      await rendered(el);
      expect(filterSpy).toHaveBeenCalledTimes(1);
      document.body.removeChild(el);
    });

    it("过滤重置 page=1 并补发 z-page-change", async () => {
      const el = createList({ page: 3 });
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      await typeInto(el, "name", "Alice");
      expect(el.page).toBe(1);
      const pageDetail = (pageSpy.mock.calls[0][0] as CustomEvent).detail;
      expect(pageDetail).toMatchObject({ page: 1, pageSize: 10, totalRecords: 16 });
      // 切片回到第 1 页: 首行 Alice
      const first = rowsOf(el)[0]!.querySelectorAll("td")[0];
      expect(first!.textContent).toBe("Alice");
      document.body.removeChild(el);
    });

    it("number 区间: 仅 min / 仅 max / 双界", async () => {
      const el = createList();
      await rendered(el);
      await typeInto(el, "age", "30", "min");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(60);
      await typeInto(el, "age", "39", "max");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(20);
      document.body.removeChild(el);
    });

    it("select 过滤走下拉选择, All 选项还原", async () => {
      const el = createList();
      await rendered(el);
      await pickSelectOption(el, "role", "admin");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(27);
      expect(selectControl(el, "role").value).toBe("admin");
      await pickSelectOption(el, "role", "");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(80);
      document.body.removeChild(el);
    });

    it("boolean 三态过滤", async () => {
      const el = createList();
      await rendered(el);
      await pickSelectOption(el, "active", "true");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(40);
      document.body.removeChild(el);
    });

    it("date range 谓词(程序化 filters 路径 A)", async () => {
      const el = createList();
      await rendered(el);
      el.filters = { createdAt: { start: "2026-01-10", end: "2026-01-15" } };
      await rendered(el);
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(18);
      const dp = shadowOf(el).querySelector('z-datepicker[data-key="createdAt"]');
      expect(dp.start).toBe("2026-01-10");
      expect(dp.end).toBe("2026-01-15");
      document.body.removeChild(el);
    });

    it("items 收窄后页码静默钳制(路径 A, 不发事件)", async () => {
      const el = createList({ page: 8 });
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      el.items = makeItems(20);
      await rendered(el);
      expect(el.page).toBe(2);
      expect(pageSpy).not.toHaveBeenCalled();
      expect(shadowOf(el).querySelector("z-pagination")!.current).toBe(2);
      document.body.removeChild(el);
    });

    it("Reset 清空全部筛选并恢复", async () => {
      const el = createList();
      await rendered(el);
      await typeInto(el, "name", "Alice");
      await typeInto(el, "age", "30", "min");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(12);
      const reset = shadowOf(el).querySelector<HTMLElement>(".z-dl__reset")!;
      reset.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(80);
      expect(inputOf(el, "name").value).toBe("");
      expect(inputOf(el, "age", "min").value).toBe("");
      document.body.removeChild(el);
    });
  });

  describe("分页", () => {
    it("翻页切片正确 + z-page-change detail", async () => {
      const el = createList();
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      clickPage(el, 2);
      await rendered(el);
      expect(pageSpy).toHaveBeenCalledTimes(1);
      expect((pageSpy.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        page: 2,
        pageSize: 10,
        totalRecords: 80,
      });
      const rows = rowsOf(el);
      expect(rows.length).toBe(10);
      expect(rows[0]!.querySelectorAll("td")[0]!.textContent).toBe("Alice"); // id 11 → name Alice
      document.body.removeChild(el);
    });

    it("pageSize 切换(show-page-size)重切片并转发 z-page-change", async () => {
      const el = createList({ showPageSize: true });
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      const sizeSel = shadowOf(el).querySelector("z-pagination")!.shadowRoot!.querySelector("select")!;
      sizeSel.value = "20";
      sizeSel.dispatchEvent(new Event("change", { bubbles: true }));
      await rendered(el);
      expect(el.pageSize).toBe(20);
      expect(rowsOf(el).length).toBe(20);
      expect((pageSpy.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ page: 1, pageSize: 20 });
      document.body.removeChild(el);
    });
  });

  describe("client 排序接管", () => {
    it("点表头按全量过滤集排序后切片(非页内序), 重置 page=1", async () => {
      const el = createList({ page: 3 });
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      const th = tableOf(el).shadowRoot.querySelector<HTMLElement>('.z-rpt__th--sortable[data-key="name"]')!;
      th.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      expect(el.page).toBe(1);
      expect(pageSpy).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.objectContaining({ page: 1 }) }));
      // 全量集按 name 升序: 前 10 全为 Alice
      const rows = rowsOf(el);
      expect(rows.length).toBe(10);
      rows.forEach((r) => expect(r.querySelectorAll("td")[0]!.textContent).toBe("Alice"));
      document.body.removeChild(el);
    });

    it("再点表头降序", async () => {
      const el = createList();
      await rendered(el);
      // [WHY] 排序后 table 重渲染, th 节点重建, 必须每次重新查询
      const clickNameTh = async (): Promise<void> => {
        const th = tableOf(el).shadowRoot.querySelector<HTMLElement>('.z-rpt__th--sortable[data-key="name"]')!;
        th.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        await rendered(el);
      };
      await clickNameTh();
      await clickNameTh();
      const rows = rowsOf(el);
      rows.forEach((r) => expect(r.querySelectorAll("td")[0]!.textContent).toBe("Eve"));
      document.body.removeChild(el);
    });

    it("Shift 多列排序同样接管", async () => {
      const el = createList();
      await rendered(el);
      const nameTh = tableOf(el).shadowRoot.querySelector<HTMLElement>('.z-rpt__th--sortable[data-key="name"]')!;
      const roleTh = tableOf(el).shadowRoot.querySelector<HTMLElement>('.z-rpt__th--sortable[data-key="role"]')!;
      roleTh.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      nameTh.dispatchEvent(new MouseEvent("click", { shiftKey: true, bubbles: true }));
      await rendered(el);
      const rows = rowsOf(el);
      rows.forEach((r) => {
        const cells = r.querySelectorAll("td");
        expect(cells[2]!.textContent).toBe("admin");
      });
      document.body.removeChild(el);
    });
  });

  describe("server 模式", () => {
    it("items/totalRecords 直通不切片不过滤, 只转发事件", async () => {
      const el = createList({ mode: "server", totalRecords: 80 });
      el.items = makeItems(10); // 应用提供第 1 页切片
      await rendered(el);
      expect(rowsOf(el).length).toBe(10);
      const pager = shadowOf(el).querySelector("z-pagination")!;
      expect(pager.totalRecords).toBe(80);
      expect(pager.total).toBe(8);
      const filterSpy = vi.fn();
      el.addEventListener("z-filter-change", filterSpy);
      await typeInto(el, "name", "Alice");
      expect(filterSpy).toHaveBeenCalledTimes(1);
      expect((filterSpy.mock.calls[0][0] as CustomEvent).detail.filters).toEqual({ name: "Alice" });
      expect(rowsOf(el).length).toBe(10); // 数据不动
      document.body.removeChild(el);
    });

    it("分页点击只转发 z-page-change, 数据由应用接管", async () => {
      const el = createList({ mode: "server", totalRecords: 80 });
      el.items = makeItems(10);
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      clickPage(el, 2);
      await rendered(el);
      expect(el.page).toBe(2);
      expect((pageSpy.mock.calls[0][0] as CustomEvent).detail).toMatchObject({
        page: 2,
        pageSize: 10,
        totalRecords: 80,
      });
      expect(rowsOf(el).length).toBe(10);
      document.body.removeChild(el);
    });

    it("server 模式筛选重置 page=1", async () => {
      const el = createList({ mode: "server", totalRecords: 80, page: 3 });
      el.items = makeItems(10);
      await rendered(el);
      const pageSpy = vi.fn();
      el.addEventListener("z-page-change", pageSpy);
      await typeInto(el, "name", "Alice");
      expect(el.page).toBe(1);
      expect((pageSpy.mock.calls[0][0] as CustomEvent).detail.page).toBe(1);
      document.body.removeChild(el);
    });
  });

  describe("事件卫生与透传", () => {
    it("内层 z-change 不穿透 host(仅 z-page-change/z-filter-change 对外)", async () => {
      const el = createList();
      await rendered(el);
      const changeSpy = vi.fn();
      el.addEventListener("z-change", changeSpy);
      clickPage(el, 2);
      await rendered(el);
      await typeInto(el, "name", "Alice");
      expect(changeSpy).not.toHaveBeenCalled();
      document.body.removeChild(el);
    });

    it("z-column-visibility-change 不透传, 但 z-config-change 透传", async () => {
      const el = createList();
      await rendered(el);
      const visSpy = vi.fn();
      const cfgSpy = vi.fn();
      el.addEventListener("z-column-visibility-change", visSpy);
      el.addEventListener("z-config-change", cfgSpy);
      // 打开列选择器, 取消勾选 role
      const trigger = colSelOf(el).shadowRoot.querySelector<HTMLElement>(".z-colsel__trigger")!;
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      const cb = colSelOf(el).shadowRoot.querySelector<HTMLInputElement>('.z-colsel__checkbox[data-key="role"]')!;
      cb.click();
      await rendered(el);
      expect(visSpy).not.toHaveBeenCalled();
      expect(cfgSpy).toHaveBeenCalledTimes(1);
      const cfg = (cfgSpy.mock.calls[0][0] as CustomEvent).detail.config;
      expect(cfg.columns.find((c: any) => c.key === "role").hidden).toBe(true);
      document.body.removeChild(el);
    });

    it("z-sort / z-selection-change 透传 detail 正确", async () => {
      const el = createList({ selectable: true, rowKey: "id" });
      await rendered(el);
      const sortSpy = vi.fn();
      const selSpy = vi.fn();
      el.addEventListener("z-sort", sortSpy);
      el.addEventListener("z-selection-change", selSpy);
      const th = tableOf(el).shadowRoot.querySelector<HTMLElement>('.z-rpt__th--sortable[data-key="name"]')!;
      th.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      expect(sortSpy).toHaveBeenCalledTimes(1);
      expect((sortSpy.mock.calls[0][0] as CustomEvent).detail.sortState).toEqual([
        { key: "name", dir: "asc" },
      ]);
      const cb = tableOf(el).shadowRoot.querySelector<HTMLInputElement>(".z-rpt__row-checkbox")!;
      cb.click();
      await rendered(el);
      expect(selSpy).toHaveBeenCalledTimes(1);
      const keys = (selSpy.mock.calls[0][0] as CustomEvent).detail.selectedKeys;
      expect(keys).toContain("1");
      document.body.removeChild(el);
    });
  });

  describe("列显隐联动与快照", () => {
    it("列选择器勾选 → filter-item --hidden class 直切, 控件元素身份不变", async () => {
      const el = createList();
      await rendered(el);
      const roleSelect = selectControl(el, "role");
      const trigger = colSelOf(el).shadowRoot.querySelector<HTMLElement>(".z-colsel__trigger")!;
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      const cb = colSelOf(el).shadowRoot.querySelector<HTMLInputElement>('.z-colsel__checkbox[data-key="role"]')!;
      cb.click();
      await rendered(el);
      const item = shadowOf(el).querySelector('.z-dl__filter-item[data-key="role"]')!;
      expect(item.classList.contains("z-dl__filter-item--hidden")).toBe(true);
      expect(selectControl(el, "role")).toBe(roleSelect); // 无重渲染
      document.body.removeChild(el);
    });

    it("重渲染后快照恢复: 列显隐 + filter-item class 与表格一致", async () => {
      const el = createList();
      await rendered(el);
      const trigger = colSelOf(el).shadowRoot.querySelector<HTMLElement>(".z-colsel__trigger")!;
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      colSelOf(el).shadowRoot
        .querySelector<HTMLInputElement>('.z-colsel__checkbox[data-key="role"]')!
        .click();
      await rendered(el);
      // 触发路径 A 重渲染
      el.items = [...el.items];
      await rendered(el);
      const table = shadowOf(el).querySelector("z-report-table")!;
      expect(table.columns.find((c: any) => c.key === "role").hidden).toBe(true);
      const item = shadowOf(el).querySelector('.z-dl__filter-item[data-key="role"]')!;
      expect(item.classList.contains("z-dl__filter-item--hidden")).toBe(true);
      document.body.removeChild(el);
    });

    it("getConfig/applyConfig 往返", async () => {
      const el = createList();
      await rendered(el);
      const trigger = colSelOf(el).shadowRoot.querySelector<HTMLElement>(".z-colsel__trigger")!;
      trigger.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await rendered(el);
      colSelOf(el).shadowRoot
        .querySelector<HTMLInputElement>('.z-colsel__checkbox[data-key="age"]')!
        .click();
      await rendered(el);
      const cfg = el.getConfig()!;
      expect(cfg.columns.find((c: any) => c.key === "age").hidden).toBe(true);
      // applyConfig 恢复
      const el2 = createList();
      await rendered(el2);
      el2.applyConfig(cfg);
      await rendered(el2);
      expect(shadowOf(el2).querySelector("z-report-table")!.columns.find((c: any) => c.key === "age").hidden).toBe(true);
      document.body.removeChild(el2);
    });
  });

  describe("路径 A 状态保持", () => {
    it("fields 二次赋值后控件值与筛选从 store 恢复(双路径不交叉)", async () => {
      const el = createList();
      await rendered(el);
      await typeInto(el, "name", "Alice");
      el.fields = [...FIELDS];
      await rendered(el);
      expect(inputOf(el, "name").value).toBe("Alice");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(16);
      document.body.removeChild(el);
    });

    it("程序化 filters 赋值覆盖 store(路径 A 语义)", async () => {
      const el = createList();
      await rendered(el);
      await typeInto(el, "name", "Alice");
      el.filters = { name: "Bob" };
      await rendered(el);
      expect(inputOf(el, "name").value).toBe("Bob");
      expect(shadowOf(el).querySelector("z-pagination")!.totalRecords).toBe(16);
      document.body.removeChild(el);
    });
  });
});
