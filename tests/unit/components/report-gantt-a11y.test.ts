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
