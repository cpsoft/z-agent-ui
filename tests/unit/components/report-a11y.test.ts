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
describe("R2b z-gantt 键盘改期（此前只有拖拽一条路）", () => {
  async function build(over: Record<string, unknown> = {}): Promise<any> {
    const gantt = document.createElement("z-gantt") as any;
    gantt.id = "gk";
    gantt.data = {
      tasks: [
        // 2026-01-01 是周四；工期 3 天（01-01 ~ 01-03）
        { id: "a", name: "调研", start_date: "2026-01-01", end_date: "2026-01-03", progress: 40 },
        // 周四起 3 天，跨周末 → 用来验「吸附工作日 + 保持工期」
        { id: "b", name: "设计", start_date: "2026-01-02", end_date: "2026-01-04", progress: 0 },
      ],
    };
    Object.assign(gantt, over);
    document.body.appendChild(gantt);
    await settle(6);
    return gantt;
  }

  const alt = (gantt: Element, key: string, shift = false): void => {
    gantt.dispatchEvent(
      new KeyboardEvent("keydown", { key, altKey: true, shiftKey: shift, bubbles: true, composed: true, cancelable: true }),
    );
  };

  async function selectFirst(gantt: any): Promise<void> {
    gantt.selectedId = "a";
    await settle(4);
  }

  it("Alt+→ 整体平移一天，工期不变", async () => {
    const gantt = await build();
    await selectFirst(gantt);
    alt(gantt, "ArrowRight");
    await settle(6);

    const t = gantt.getTaskById("a");
    expect(t.start_date).toBe("2026-01-02");
    expect(t.end_date, "平移必须保持 3 天工期（按原时长重推终点）").toBe("2026-01-04");
    expect(t.name, "业务字段不能被丢").toBe("调研");
  });

  // [WHY 这条要单独用「跨周末」的任务] 上面那条在不吸附周末时，两种算法
  // （保持工期 vs 起止各自平移）结果恰好一样，抓不住回归。这里让平移后的落点
  // 撞上周末：保持工期 ⇒ start 吸附到周一、end = 周一 + 原时长；各自平移 ⇒
  // end 自己也被吸附，工期被压扁成 0 天。
  it("跨周末平移：起点吸附后按原工期重推终点（不压扁工期）", async () => {
    const gantt = await build({ showWeekends: false });
    gantt.selectedId = "b"; // 2026-01-02(五) ~ 2026-01-04(日)，工期 2 天
    await settle(4);
    alt(gantt, "ArrowRight");
    await settle(8);

    const t = gantt.getTaskById("b");
    expect(t.start_date, "01-03 是周六，应吸附到 01-05（周一）").toBe("2026-01-05");
    expect(t.end_date, "终点要按原工期（2 天）从吸附后的起点重推").toBe("2026-01-07");
  });

  it("Alt+← 往回平移一天", async () => {
    const gantt = await build();
    await selectFirst(gantt);
    alt(gantt, "ArrowLeft");
    await settle(6);
    const t = gantt.getTaskById("a");
    expect(t.start_date).toBe("2025-12-31");
    expect(t.end_date).toBe("2026-01-02");
  });

  it("Alt+Shift+→ 只改结束日期（等于拖右柄）", async () => {
    const gantt = await build();
    await selectFirst(gantt);
    alt(gantt, "ArrowRight", true);
    await settle(6);
    const t = gantt.getTaskById("a");
    expect(t.start_date, "改工期不该动起点").toBe("2026-01-01");
    expect(t.end_date).toBe("2026-01-04");
  });

  it("Alt+↑/↓ 改进度，钳在 0~100", async () => {
    const gantt = await build();
    await selectFirst(gantt);
    alt(gantt, "ArrowUp");
    await settle(6);
    expect(gantt.getTaskById("a").progress).toBe(45);

    for (let i = 0; i < 12; i++) {
      alt(gantt, "ArrowUp");
      await settle(2);
    }
    expect(gantt.getTaskById("a").progress, "进度必须有上界").toBe(100);
  });

  it("只读时一律不动（键位照吞，但数据不变）", async () => {
    const gantt = await build({ readonly: true });
    await selectFirst(gantt);
    alt(gantt, "ArrowRight");
    await settle(6);
    expect(gantt.getTaskById("a").start_date).toBe("2026-01-01");
    expect(gantt.nudge("move", 1), "readonly 下 nudge 应直接拒绝").toBe(false);
  });

  it("show-weekends=false 时落点吸附工作日", async () => {
    const gantt = await build({ showWeekends: false });
    await selectFirst(gantt);
    // 01-03 是周六 → 往后挪一天落到 01-04（周日），吸附后应是 01-05（周一）
    alt(gantt, "ArrowRight");
    alt(gantt, "ArrowRight");
    await settle(8);
    const t = gantt.getTaskById("a");
    const start = new Date(`${t.start_date}T00:00:00`);
    expect([1, 2, 3, 4, 5].includes(start.getDay()), `落到了周末：${t.start_date}`).toBe(true);
  });

  it("走的是拖拽同一条落地路径（z-gantt-change 一样会发）", async () => {
    const gantt = await build();
    await selectFirst(gantt);
    let changed: string[] | null = null;
    gantt.addEventListener("z-gantt-change", (e: CustomEvent) => {
      changed = e.detail?.changed ?? null;
    });
    alt(gantt, "ArrowRight");
    await settle(6);
    expect(changed, "键盘改期没有发 z-gantt-change —— 说明它绕开了 applyCommit").toContain("a");
  });
});

// ─────────────────────────────────────────────────────────────
// [WHY 单开一块] 建依赖原先只有拖拽一条路：`data-mode="connect"` 的热区画在条形两端，
// 只有指针能碰到它。键盘用户看到别人能连线，自己按什么键都没反应 —— 而**删**依赖
// 同样只有右键菜单（菜单本身是鼠标唤起的），所以连错一次就再也回不去。
describe("R2c z-gantt 键盘建依赖（此前只有拖拽连线）", () => {
  async function build(over: Record<string, unknown> = {}): Promise<any> {
    const gantt = document.createElement("z-gantt") as any;
    gantt.data = {
      tasks: [
        { id: "a", name: "调研", start_date: "2026-01-01", end_date: "2026-01-03" },
        { id: "b", name: "设计", start_date: "2026-01-04", end_date: "2026-01-08" },
        { id: "c", name: "开发", start_date: "2026-01-09", end_date: "2026-01-20" },
      ],
      dependencies: [],
    };
    Object.assign(gantt, over);
    document.body.appendChild(gantt);
    await settle(6);
    return gantt;
  }

  const press = (el: Element, k: string, mods: Record<string, boolean> = {}): boolean =>
    el.dispatchEvent(
      new KeyboardEvent("keydown", { key: k, ...mods, bubbles: true, composed: true, cancelable: true }),
    );

  /** live region 的当前文本（读屏会念出来的那份）。 */
  const said = (g: any): string =>
    (g.shadowRoot.getElementById("z-gantt-status")?.textContent ?? "").trim();

  const deps = (g: any): Array<Record<string, unknown>> => g.liveData().dependencies ?? [];

  async function select(g: any, id: string): Promise<void> {
    g.selectedId = id;
    await settle(5);
  }

  it("播报节点是 role=status，且在 tree 之外（tree 的直接拥有者只能是选项）", async () => {
    const g = await build();
    const live = g.shadowRoot.getElementById("z-gantt-status");
    expect(live, "没有 live region：连线状态一个字都念不出来").toBeTruthy();
    expect(live!.getAttribute("role")).toBe("status");
    expect(
      live!.closest('[role="tree"]'),
      "status 节点挂在 tree 里 —— 无障碍树会多出一个非选项子节点",
    ).toBeNull();

    const tree = g.shadowRoot.querySelector(".z-gantt__list-body") as HTMLElement;
    // [WHY 只看直接子节点的 role] 上一版写成「不含 treeitem 的才算裸 div」—— 那恰好
    // 把要抓的两层包裹（里面有 treeitem）排除在外，断言永远绿。
    const stray = Array.from(tree.children).filter(
      (el) => !["presentation", "treeitem", "group"].includes(el.getAttribute("role") ?? ""),
    );
    expect(
      stray.map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
      "tree 的直接子节点只能是 presentation 包裹或 treeitem",
    ).toEqual([]);
  });

  it("Alt+Enter 记住起点并立刻播报（此时界面上没有任何变化）", async () => {
    const g = await build();
    await select(g, "a");
    expect(said(g), "初始不该有播报").toBe("");

    press(g, "Enter", { altKey: true });
    await settle(6);

    expect(said(g), "按了 Alt+Enter 却没有任何播报 —— 用户不知道自己进了连线模式").toContain("调研");
    expect(said(g)).toContain("前置");
  });

  it("移到目标任务按回车：建出一条 FS 依赖，并走可取消事件", async () => {
    const g = await build();
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);

    let connectDetail: any = null;
    let changed: string[] | null = null;
    g.addEventListener("z-gantt-connect", (e: CustomEvent) => (connectDetail = e.detail));
    g.addEventListener("z-gantt-change", (e: CustomEvent) => (changed = e.detail?.changed ?? null));

    press(g, "ArrowDown");
    await settle(6);
    expect(g.selectedId).toBe("b");

    press(g, "Enter");
    await settle(6);

    expect(deps(g), "回车没有建出依赖").toEqual([
      { predecessor_id: "a", successor_id: "b", type: "FS" },
    ]);
    expect(connectDetail, "没有发 z-gantt-connect —— 宿主失去拦截机会").toEqual({
      predecessor_id: "a",
      successor_id: "b",
      type: "FS",
    });
    expect(changed, "没有发 z-gantt-change").toContain("b");
    expect(said(g), "建成了却不播报，用户不知道成功了").toContain("设计");
  });

  it("连到自己：拒绝并念出原因，不落进模型", async () => {
    const g = await build();
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);

    press(g, "Enter");
    await settle(6);

    expect(deps(g)).toEqual([]);
    expect(said(g), "自连被静默吞掉").toContain("自己");
  });

  it("同向重复连线：不叠第二条，并说明已有依赖", async () => {
    const g = await build();
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);
    await select(g, "b");
    press(g, "Enter");
    await settle(6);
    expect(deps(g).length).toBe(1);

    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);
    await select(g, "b");
    press(g, "Enter");
    await settle(6);

    expect(deps(g).length, "重复连线叠出了第二条 —— 图上会出现两条重合的箭头").toBe(1);
    expect(said(g)).toContain("已经有依赖");
  });

  it("Esc 退出连线模式，但不顺手清掉选中（那是罚两遍）", async () => {
    const g = await build();
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);
    await select(g, "c");

    press(g, "Escape");
    await settle(6);

    expect(g.selectedId, "Esc 把选中也清了 —— 用户得重新找回这条任务").toBe("c");
    expect(said(g)).toContain("取消");
    expect(deps(g)).toEqual([]);
  });

  it("不在连线模式时，回车不被吞（宿主还能用这个键）", async () => {
    const g = await build();
    await select(g, "a");
    const notPrevented = press(g, "Enter");
    await settle(3);
    expect(notPrevented, "没在连线模式却 preventDefault 了回车").toBe(true);
    expect(deps(g)).toEqual([]);
  });

  it("只读：进不了连线模式，回车也建不出东西", async () => {
    const g = await build({ readonly: true });
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);
    // [WHY 必须紧跟着 arm 就读播报] 上一版这行放在「选另一条 + 回车」之后：
    // 中间那次重渲染会把 status 节点换成空的，于是「应该没播报」永远成立 ——
    // 删掉 readonly 守卫它照样绿（变异验证实锤）。断言读的必须是这一步的输出，
    // 不能是几步之后剩下的残留。
    expect(said(g), "只读下还念了「已设为前置任务」= 骗人").toBe("");

    await select(g, "b");
    press(g, "Enter");
    await settle(6);
    expect(deps(g)).toEqual([]);
  });

  it("起点任务被删掉后回车：不建指向幽灵任务的边", async () => {
    const g = await build();
    await select(g, "a");
    press(g, "Enter", { altKey: true });
    await settle(6);

    g.data = { tasks: [{ id: "c", name: "开发", start_date: "2026-01-09", end_date: "2026-01-20" }], dependencies: [] };
    await settle(6);
    await select(g, "c");
    press(g, "Enter");
    await settle(6);

    expect(deps(g), "起点已不存在，却还是写了一条边").toEqual([]);
    expect(said(g), "起点都没了还念「已建立依赖」—— 用户以为连上了").toContain("取消");
  });
});

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
