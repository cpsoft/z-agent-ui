// Test: report 域（图表 / 甘特 / 数据列表 / 列选择器）的无障碍实测契约
// Date: 2026-11-16
//
// [WHY 单独一份] 本轮的四条缺陷全属于同一类：**DOM 里有属性，无障碍树上什么都没有**。
// 单看代码看不出来（`role="grid"` 写着、`aria-label` 也写着），只有把「读屏到底
// 拿到什么」当成被测对象才能发现。所以这里的判据一律对着**可访问名 / 可访问描述 /
// live 区文本 / 焦点落点 / IDREF 能否解析**写，不数 DOM 上有几条属性。
//
// 真机实测记录（Chrome 141，2026-11-16）：
//   z-chart  宿主 role=generic 却带名字；方向键只移动焦点环，shadow 内 [role=status] 0 个
//   z-gantt  role=grid，而 [role=row] 0 个、[role=gridcell] 0 个，选中变化零播报
//   z-column-selector  触发器声称 haspopup=menu，弹出的是 role=group 的复选框；Escape 后焦点落到 body
//   z-data-list  7 个筛选控件内层 aria-label/aria-labelledby 全为 null，只有一个 placeholder

import { describe, it, expect } from "vitest";
import "../../../src/report/chart";
import "../../../src/report/gantt";
import "../../../src/report/data-list/DataList";
import "../../../src/report/table/ReportTable";
import "../../../src/report/column-selector/ColumnSelector";
import { composedContains } from "../../../src/core/a11y";

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const settle = async (n = 3): Promise<void> => {
  for (let i = 0; i < n; i++) await tick();
};

const key = (el: Element, k: string): void => {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true, cancelable: true }));
};

/** 内层可聚焦件（控件的名字最终要落在这个节点上）。 */
function fieldOf(control: Element): HTMLElement | null {
  return (
    control.shadowRoot?.querySelector<HTMLElement>('[part~="field"],[part~="native"],[part~="trigger"]') ?? null
  );
}

// ─────────────────────────────────────────────────────────────
describe("R0 扫描面是活的（夹具拿不到节点时，下面几条会全变哑巴）", () => {
  it("图表夹具能建出数据点、甘特夹具能建出任务行", async () => {
    const chart = document.createElement("z-chart") as any;
    chart.animation = false;
    chart.setAttribute("type", "bar");
    const s = document.createElement("z-chart-series") as any;
    s.name = "营收";
    s.data = [
      { label: "一月", value: 120 },
      { label: "二月", value: 150 },
      { label: "三月", value: 90 },
    ];
    chart.appendChild(s);
    document.body.appendChild(chart);
    await settle(6);
    expect((chart as any)._model?.tooltipTargets.length, "图表没有数据点 ⇒ 后面的键盘断言没意义").toBe(3);

    const gantt = document.createElement("z-gantt") as any;
    gantt.data = {
      tasks: [
        { id: "a", name: "调研", start_date: "2026-01-01", end_date: "2026-01-03" },
        { id: "b", name: "设计", start_date: "2026-01-04", end_date: "2026-01-08" },
      ],
    };
    document.body.appendChild(gantt);
    await settle(6);
    expect(gantt.shadowRoot.querySelectorAll(".z-gantt__row").length, "甘特没有任务行").toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────
describe("R1 z-chart 的键盘播报", () => {
  async function build(): Promise<any> {
    const chart = document.createElement("z-chart") as any;
    chart.animation = false;
    chart.id = "c1";
    chart.setAttribute("type", "bar");
    chart.setAttribute("title", "月度营收");
    const s = document.createElement("z-chart-series") as any;
    s.name = "营收";
    s.data = [
      { label: "一月", value: 120 },
      { label: "二月", value: 150 },
      { label: "三月", value: 90 },
    ];
    chart.appendChild(s);
    document.body.appendChild(chart);
    await settle(6);
    return chart;
  }

  it("宿主的角色是可命名的（generic 带名字等于没有名字）", async () => {
    const chart = await build();
    const role = chart.getAttribute("role");
    expect(role, "宿主必须有一个允许命名的 role，否则 aria-label 无意义").toBe("group");
    expect(chart.getAttribute("aria-label")).toBe("月度营收");
  });

  it("方向键把当前数据点写进 live region（不是只挪焦点环）", async () => {
    const chart = await build();
    const live = chart.shadowRoot.querySelector('[role="status"]') as HTMLElement;
    expect(live, "没有 role=status 的播报节点").toBeTruthy();
    expect(live.getAttribute("aria-live") ?? "polite").toBeTruthy();

    key(chart, "ArrowRight");
    await settle(2);
    const first = live.textContent ?? "";
    expect(first, "按了方向键，读屏一个字都没拿到").toContain("一月");
    expect(first, "播报里没有数值").toContain("120");

    key(chart, "ArrowRight");
    await settle(2);
    expect(live.textContent, "第二个数据点没播报").toContain("二月");
  });

  it("Home / End 跳到首尾", async () => {
    const chart = await build();
    const live = chart.shadowRoot.querySelector('[role="status"]') as HTMLElement;
    key(chart, "ArrowRight");
    await settle(2);

    key(chart, "End");
    await settle(2);
    expect(live.textContent, "End 没跳到最后一个点").toContain("三月");

    key(chart, "Home");
    await settle(2);
    expect(live.textContent, "Home 没回到第一个点").toContain("一月");
  });

  it("Escape 关掉提示后播报清空（否则再次回到同一点会被读屏判为「内容没变」）", async () => {
    const chart = await build();
    const live = chart.shadowRoot.querySelector('[role="status"]') as HTMLElement;
    key(chart, "ArrowRight");
    await settle(2);
    expect(live.textContent).not.toBe("");

    key(chart, "Escape");
    await settle(2);
    expect(live.textContent).toBe("");
  });

  it("键盘提示挂在同 shadow 的节点上，且 IDREF 真的解析得出来", async () => {
    const chart = await build();
    const plot = chart.shadowRoot.querySelector(".z-chart__plot") as HTMLElement;
    const id = plot.getAttribute("aria-describedby");
    expect(id, "plot 没有 aria-describedby").toBeTruthy();
    const hint = chart.shadowRoot.getElementById(id!);
    expect(hint, `aria-describedby="${id}" 在同 shadow 内解析不到（跨边界的 IDREF 恒为无效）`).toBeTruthy();
    expect(hint!.textContent ?? "").toContain("方向键");
  });
});

// ─────────────────────────────────────────────────────────────
describe("R2 z-gantt 的网格/列表语义与选中播报", () => {
  async function build(): Promise<any> {
    const gantt = document.createElement("z-gantt") as any;
    gantt.id = "g1";
    gantt.data = {
      tasks: [
        { id: "a", name: "调研", start_date: "2026-01-01", end_date: "2026-01-03" },
        { id: "b", name: "设计", start_date: "2026-01-04", end_date: "2026-01-08" },
        { id: "c", name: "开发", start_date: "2026-01-09", end_date: "2026-01-20" },
      ],
    };
    document.body.appendChild(gantt);
    await settle(6);
    return gantt;
  }

  // [WHY 这一组整体重写] 上一版把角色挂在宿主上、行挂在右侧时间轴。2026-11-16
  // Chrome 141 实测：宿主引用不到自己影子树里的 id（`aria-activedescendant` 属性在
  // 无障碍树里根本不出现）。旧断言只查了 `shadowRoot.getElementById(...)` —— 那只
  // 证明「id 在那个树里存在」，证明不了「浏览器认这个引用」，是典型的假绿。
  it("角色在与 treeitem 同树的列表体上，且右侧时间轴是纯可视化", async () => {
    const gantt = await build();
    expect(gantt.getAttribute("role"), "宿主不能再自称任何角色：它的 IDREF 到不了影子树").toBeNull();

    const tree = gantt.shadowRoot.querySelector(".z-gantt__list-body") as HTMLElement;
    expect(tree.getAttribute("role")).toBe("tree");
    expect(tree.tabIndex, "唯一 Tab 站必须是这个 tree").toBe(0);

    const items = Array.from(tree.querySelectorAll(".z-gantt__tr")) as HTMLElement[];
    expect(items.length).toBe(3);
    for (const it of items) expect(it.getAttribute("role"), `行 ${it.dataset.taskId} 不是 treeitem`).toBe("treeitem");

    const chart = gantt.shadowRoot.querySelector(".z-gantt__chart") as HTMLElement;
    expect(chart.getAttribute("aria-hidden"), "两侧同一批任务，都进树会被念两遍").toBe("true");
    expect(chart.querySelectorAll("[role]").length, "右侧不该再有自己的角色").toBe(0);
  });

  it("treeitem 带层级与位置，名字来自可见单元格（不是空）", async () => {
    const gantt = await build();
    const items = Array.from(gantt.shadowRoot.querySelectorAll(".z-gantt__tr")) as HTMLElement[];
    for (const it of items) {
      expect(it.getAttribute("aria-level")).toBe("1");
      expect(it.getAttribute("aria-setsize")).toBe("3");
      expect((it.textContent ?? "").trim(), `行 ${it.dataset.taskId} 没有任何文字`).not.toBe("");
    }
    expect(items[0].getAttribute("aria-posinset")).toBe("1");
    expect(items[2].getAttribute("aria-posinset")).toBe("3");
    expect(items[0].textContent).toContain("调研");
    expect(items[0].textContent).toContain("2026-01-01");
  });

  it("上下键选中后，aria-activedescendant 写在 tree 上并指向当前项，selected 只有一个", async () => {
    const gantt = await build();
    // [WHY 每次都要重新取] BaseElement 每次重渲染整块替换 shadow.innerHTML ——
    // 提前抓下来的 tree/行都是**上一帧的节点**，读它们等于读历史。上一版断言
    // 在这里踩过一次：拿到的是脱离了文档的旧节点，于是「没生效」其实是「读错了」。
    const treeOf = (): HTMLElement => gantt.shadowRoot.querySelector(".z-gantt__list-body") as HTMLElement;
    key(gantt, "ArrowDown");
    await settle(6);

    const active = treeOf().getAttribute("aria-activedescendant");
    expect(active, "选中变化后 tree 上没有指向 ⇒ 读屏收不到任何通知").toBeTruthy();
    const activeEl = treeOf().querySelector(`#${active}`);
    expect(activeEl, `aria-activedescendant="${active}" 在 tree 里解析不到`).toBeTruthy();
    expect(activeEl!.getAttribute("aria-selected")).toBe("true");
    expect(treeOf().querySelectorAll('[role="treeitem"][aria-selected="true"]').length).toBe(1);

    key(gantt, "ArrowDown");
    await settle(6);
    expect(treeOf().getAttribute("aria-activedescendant")).not.toBe(active);
  });

  it("Home / End 跳到首尾", async () => {
    const gantt = await build();
    const treeOf = (): HTMLElement => gantt.shadowRoot.querySelector(".z-gantt__list-body") as HTMLElement;
    const activeId = (): string | null => {
      const id = treeOf().getAttribute("aria-activedescendant");
      return id ? (treeOf().querySelector(`#${id}`) as HTMLElement).dataset.taskId ?? null : null;
    };

    key(gantt, "End");
    await settle(6);
    expect(gantt.selectedId).toBe("c");
    expect(activeId(), "End 之后 activedescendant 没跟上选中项").toBe("c");

    key(gantt, "Home");
    await settle(6);
    expect(gantt.selectedId).toBe("a");
    expect(activeId()).toBe("a");
  });

  it("键盘能展开 / 收起（此前只有 pointerdown 命中三角，键盘完全做不到）", async () => {
    const gantt = document.createElement("z-gantt") as any;
    gantt.data = {
      tasks: [
        { id: "p", name: "阶段", start_date: "2026-01-01", end_date: "2026-01-20", is_expanded: false },
        { id: "k1", name: "子任务", start_date: "2026-01-02", end_date: "2026-01-05", parent_id: "p" },
      ],
    };
    document.body.appendChild(gantt);
    await settle(6);

    const treeOf = (): HTMLElement => gantt.shadowRoot.querySelector(".z-gantt__list-body") as HTMLElement;
    const rowOf = (id: string): HTMLElement =>
      treeOf().querySelector(`.z-gantt__tr[data-task-id="${id}"]`) as HTMLElement;

    expect(rowOf("p"), "父任务行没渲染出来").toBeTruthy();
    expect(rowOf("p").getAttribute("aria-expanded"), "父任务必须暴露展开状态").toBe("false");
    expect(treeOf().querySelectorAll(".z-gantt__tr").length, "收起时不应有子行").toBe(1);

    key(gantt, "ArrowDown");
    await settle(6);
    expect(gantt.selectedId).toBe("p");

    key(gantt, "ArrowRight");
    await settle(6);
    expect(rowOf("p").getAttribute("aria-expanded"), "→ 没展开").toBe("true");
    expect(rowOf("k1"), "展开后子任务行没出现").toBeTruthy();
    expect(rowOf("k1").getAttribute("aria-level")).toBe("2");

    key(gantt, "ArrowLeft");
    await settle(6);
    expect(rowOf("p").getAttribute("aria-expanded"), "← 没收起").toBe("false");
    expect(rowOf("k1"), "收起后子任务行还在").toBeFalsy();
  });

  it("按方向键重渲染后焦点还在 tree 上（tree 没 id 时焦点每次掉回 body）", async () => {
    const gantt = await build();
    gantt.focus();
    await settle(2);
    expect(gantt.shadowRoot!.activeElement?.getAttribute("role"), "focus() 没落到 tree 上").toBe("tree");

    key(gantt, "ArrowDown");
    await settle(6);
    // [WHY 这条必须有] 重渲染整块换 innerHTML，焦点节点被换掉；BaseElement 靠
    // `focusKeyOf()`（data-focus-key → data-field → id → name）找回来，tree 没有
    // 这三样时就不恢复 —— 症状是「按一下方向键，焦点掉到 body，得重新 Tab」。
    expect(gantt.shadowRoot!.activeElement?.getAttribute("role"), "一次方向键就把焦点丢了").toBe("tree");
  });

  it("tree 是唯一 Tab 站，右侧时间轴里没有可聚焦件", async () => {
    const gantt = await build();
    const stops = Array.from(gantt.shadowRoot.querySelectorAll<HTMLElement>('[tabindex="0"]'));
    expect(stops.length, `shadow 里有 ${stops.length} 个 Tab 站，应该只有 tree 一个`).toBe(1);
    expect(stops[0].getAttribute("role")).toBe("tree");

    const chart = gantt.shadowRoot.querySelector(".z-gantt__chart") as HTMLElement;
    const focusables = chart.querySelectorAll(
      'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])',
    );
    expect(focusables.length, "aria-hidden 的右栏里藏着可聚焦件 = 键盘用户掉进黑洞").toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
describe("R3 z-data-list 筛选栏的字段名", () => {
  async function build(): Promise<any> {
    const el = document.createElement("z-data-list") as any;
    el.fields = [
      { key: "name", label: "姓名", type: "text" },
      { key: "age", label: "年龄", type: "number" },
      { key: "role", label: "角色", type: "select", options: [{ value: "a", label: "A" }] },
      { key: "createdAt", label: "创建时间", type: "date" },
    ];
    el.items = [{ name: "张三", age: 30, role: "a", createdAt: "2026-01-02" }];
    el.minPlaceholder = "最小";
    el.maxPlaceholder = "最大";
    document.body.appendChild(el);
    await settle(6);
    return el;
  }

  it("每个筛选控件内层都有名字（不是只有 placeholder）", async () => {
    const dl = await build();
    const controls = Array.from(dl.shadowRoot.querySelectorAll(".z-dl__filter-item z-input,.z-dl__filter-item z-select,.z-dl__filter-item z-datepicker")) as Element[];
    expect(controls.length, "筛选控件没建出来").toBe(5);
    for (const c of controls) {
      const f = fieldOf(c);
      expect(f, `${c.tagName.toLowerCase()} 的影子树里找不到字段节点`).toBeTruthy();
      const name = f!.getAttribute("aria-label") ?? f!.getAttribute("aria-labelledby") ?? "";
      expect(name, `${c.tagName.toLowerCase()} 没有可访问名`).not.toBe("");
    }
  });

  it("数字区间的两个框名字不同（否则两个都念「最小值」）", async () => {
    const dl = await build();
    const inputs = Array.from(
      dl.shadowRoot.querySelectorAll('.z-dl__filter-item[data-key="age"] z-input'),
    ) as Element[];
    expect(inputs.length).toBe(2);
    const a = fieldOf(inputs[0])!.getAttribute("aria-label");
    const b = fieldOf(inputs[1])!.getAttribute("aria-label");
    expect(a).toBe("年龄最小");
    expect(b).toBe("年龄最大");
  });

  it("控件重渲染后名字还在（绑定器要跟着影子树重建回填）", async () => {
    const dl = await build();
    const sel = dl.shadowRoot.querySelector('.z-dl__filter-item[data-key="role"] z-select') as any;
    expect(fieldOf(sel)!.getAttribute("aria-label")).toBe("角色");

    sel.value = "a";
    await settle(3);
    expect(fieldOf(sel)!.getAttribute("aria-label"), "选完值名字就没了").toBe("角色");
  });
});

// ─────────────────────────────────────────────────────────────
describe("R4 z-column-selector 的弹出语义与焦点回位", () => {
  async function build(): Promise<any> {
    const table = document.createElement("z-report-table") as any;
    table.id = "src";
    table.columns = [
      { key: "name", title: "名称" },
      { key: "amount", title: "金额", required: true },
    ];
    table.data = [{ name: "a", amount: 1 }];
    document.body.appendChild(table);

    const sel = document.createElement("z-column-selector") as any;
    document.body.appendChild(sel);
    await settle(2);
    sel.for = "src";
    await settle(4);
    return sel;
  }

  it("触发器不再声称会弹菜单，aria-controls 指向真实存在的下拉", async () => {
    const sel = await build();
    const trigger = (): HTMLElement => sel.shadowRoot.querySelector(".z-colsel__trigger") as HTMLElement;
    expect(trigger().getAttribute("aria-haspopup"), "haspopup=true 的意思是「弹出菜单」，弹出来的却是复选框组").toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    trigger().click();
    await settle(2);
    // [WHY 每次都重新取] 重渲染会换掉整个 shadow innerHTML —— 拿着旧节点读属性，
    // 读到的是「上一次的画面」，Escape 那条焦点断言同理。
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const id = trigger().getAttribute("aria-controls");
    expect(id, "没有 aria-controls，读屏不知道按钮控制的是谁").toBeTruthy();
    expect(sel.shadowRoot.getElementById(id!), "aria-controls 解析不到目标").toBeTruthy();
  });

  it("焦点在面板里按 Escape：面板关闭且焦点回到触发器（不是掉到 body）", async () => {
    const sel = await build();
    const trigger = (): HTMLElement => sel.shadowRoot.querySelector(".z-colsel__trigger") as HTMLElement;
    trigger().click();
    await settle(2);
    const cb = sel.shadowRoot.querySelector(".z-colsel__checkbox") as HTMLElement;
    cb.focus();
    expect(sel.shadowRoot.activeElement).toBe(cb);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(3);

    expect(sel.open).toBe(false);
    expect(sel.shadowRoot.activeElement, "焦点丢了：Escape 之后键盘用户被扔回页首").toBe(trigger());
  });

  it("焦点不在它里面时，Escape 不许抢焦点", async () => {
    const sel = await build();
    const trigger = (): HTMLElement => sel.shadowRoot.querySelector(".z-colsel__trigger") as HTMLElement;
    trigger().click();
    await settle(2);

    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await settle(3);
    expect(sel.shadowRoot.activeElement, "焦点本来在外面，却被拽进了组件").not.toBe(trigger());
  });
});

// ─────────────────────────────────────────────────────────────
describe("R5 composedContains：宿主包不包住自己影子树里的节点", () => {
  it("宿主对自身 shadow 内的节点为 true（原生 contains 为 false，这是本轮踩到的坑）", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const sr = host.attachShadow({ mode: "open" });
    const inner = document.createElement("input");
    sr.appendChild(inner);

    // 先钉死「原生方法在这里是假的」，否则下面那条断言可能在测一个恒真的东西
    expect(host.contains(inner), "Chrome 141 实测：宿主 contains 自己的影子子节点是 false").toBe(false);
    expect(composedContains(host, inner)).toBe(true);
    expect(composedContains(inner, host)).toBe(false);
    expect(composedContains(host, document.body)).toBe(false);
  });
});
