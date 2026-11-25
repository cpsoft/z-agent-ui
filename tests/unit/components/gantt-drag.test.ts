// Test: z-gantt 拖拽状态机（move/resize/progress/connect）+ 组件手势接线 + 右键菜单
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  GanttDragController,
  type DragGeometry,
  type DragTarget,
} from "../../../src/report/gantt/drag-controller";
import { closeContextMenu } from "../../../src/report/gantt/context-menu";
import "../../../src/report/gantt/Gantt";
import type { ZGantt } from "../../../src/report/gantt/Gantt";
import type { ZGanttTask } from "../../../src/report/gantt/types";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

// ── GanttDragController 纯状态机 ─────────────────────────
// 基准几何：rangeStart 2026-09-01(周二)，32px/天；条形 9/3..9/5 @ x=64 w=96

function geo(over: Partial<DragGeometry> = {}): DragGeometry {
  return {
    rangeStart: new Date(2026, 8, 1),
    dayWidth: 32,
    rowHeight: 48,
    chartLeft: 0,
    gridTop: 0,
    scrollLeft: 0,
    ...over,
  };
}

function target(over: Partial<DragTarget> = {}): DragTarget {
  return {
    mode: "move",
    taskId: "t1",
    barX: 64,
    barWidth: 96,
    barCenterY: 24,
    startDate: "2026-09-03",
    endDate: "2026-09-05",
    progress: 50,
    isMilestone: false,
    isReal: false,
    snapWeekends: false,
    rowAt: () => null,
    ...over,
  };
}

/** begin 于 beginAt，依次 update，end 返回提交载荷（connect 的锚边在 begin 时判定） */
function run(
  t: Partial<DragTarget>,
  moves: Array<[number, number]>,
  beginAt: [number, number] = [0, 0],
): ReturnType<GanttDragController["end"]> {
  const c = new GanttDragController();
  c.begin(geo(), target(t), { x: beginAt[0], y: beginAt[1] });
  for (const [x, y] of moves) c.update({ x, y });
  return c.end();
}

describe("GanttDragController", () => {
  it("move: shifts start/end by whole days", () => {
    const c = run({ mode: "move" }, [[96, 0]]);
    expect(c).toMatchObject({ mode: "move", taskId: "t1", startDate: "2026-09-06", endDate: "2026-09-08", isReal: false });
  });

  it("move below threshold is a click (no commit)", () => {
    expect(run({ mode: "move" }, [[2, 0]])).toBeNull();
  });

  it("move under half a day resolves to 0 days (no commit)", () => {
    expect(run({ mode: "move" }, [[8, 0]])).toBeNull();
  });

  it("move milestone commits only startDate", () => {
    const c = run({ mode: "move", isMilestone: true, barX: 0, barWidth: 14, startDate: "2026-09-20", endDate: null }, [[64, 0]]);
    expect(c).toMatchObject({ mode: "move", startDate: "2026-09-22" });
    expect(c!.endDate).toBeUndefined();
  });

  it("move real bar flags isReal for real_*_date mapping", () => {
    const c = run({ mode: "move", isReal: true }, [[96, 0]]);
    expect(c!.isReal).toBe(true);
  });

  it("move with snapWeekends keeps duration after snapping start off the weekend", () => {
    // 9/3(四)+2 = 9/5(六) 吸附到 9/7(一)；按原工期 2 天重推 end = 9/9（防压扁）
    const c = run({ mode: "move", snapWeekends: true }, [[64, 0]]);
    expect(c).toMatchObject({ startDate: "2026-09-07", endDate: "2026-09-09" });
  });

  it("resize-end extends end by days", () => {
    const c = run({ mode: "resize-end" }, [[96, 0]]);
    expect(c).toMatchObject({ mode: "resize-end", startDate: "2026-09-03", endDate: "2026-09-08" });
  });

  it("resize-end clamps to start on large negative drag", () => {
    const c = run({ mode: "resize-end" }, [[-200, 0]]);
    expect(c).toMatchObject({ startDate: "2026-09-03", endDate: "2026-09-03" });
  });

  it("resize-start rejects milestone and real bars", () => {
    expect(run({ mode: "resize-start", isMilestone: true, endDate: null }, [[96, 0]])).toBeNull();
    expect(run({ mode: "resize-start", isReal: true }, [[96, 0]])).toBeNull();
  });

  it("progress maps pointer to percent with clamping", () => {
    expect(run({ mode: "progress" }, [[112, 0]])!.progress).toBe(50);
    expect(run({ mode: "progress" }, [[-50, 0]])!.progress).toBe(0);
    expect(run({ mode: "progress" }, [[9999, 0]])!.progress).toBe(100);
  });

  it("connect: end-anchor source to start-half target yields FS", () => {
    const rowAt = (gridY: number) => (gridY >= 48 && gridY < 96 ? { id: "t2", barX: 192, barWidth: 64 } : null);
    // begin 于 x=160（条形右半 → end 锚），落点 (220,72) 在目标条左半
    const c = run({ mode: "connect", rowAt }, [[160, 0], [220, 72]], [160, 0]);
    expect(c).toMatchObject({ mode: "connect", predecessorId: "t1", successorId: "t2", connectType: "FS" });
  });

  it("connect: start-anchor yields SS/FF by target half", () => {
    const rowAt = (gridY: number) => (gridY >= 48 && gridY < 96 ? { id: "t2", barX: 192, barWidth: 64 } : null);
    const ss = run({ mode: "connect", rowAt }, [[100, 0], [220, 72]], [100, 0]);
    expect(ss!.connectType).toBe("SS");
  });

  it("connect: end-anchor to end-half target yields FF", () => {
    const rowAt = (gridY: number) => (gridY >= 48 && gridY < 96 ? { id: "t2", barX: 192, barWidth: 64 } : null);
    const ff = run({ mode: "connect", rowAt }, [[160, 0], [260, 72]], [160, 0]);
    expect(ff!.connectType).toBe("FF");
  });

  it("connect: start-anchor to end-half target yields SF", () => {
    const rowAt = (gridY: number) => (gridY >= 48 && gridY < 96 ? { id: "t2", barX: 192, barWidth: 64 } : null);
    const sf = run({ mode: "connect", rowAt }, [[100, 0], [260, 72]], [100, 0]);
    expect(sf!.connectType).toBe("SF");
  });

  it("connect to same task or blank space is rejected", () => {
    const self = run({ mode: "connect", rowAt: () => ({ id: "t1", barX: 192, barWidth: 64 }) }, [[160, 0], [220, 72]]);
    expect(self).toBeNull();
    const blank = run({ mode: "connect", rowAt: () => null }, [[160, 0], [220, 72]]);
    expect(blank).toBeNull();
  });

  it("cancel resets state without commit", () => {
    const c = new GanttDragController();
    c.begin(geo(), target(), { x: 0, y: 0 });
    c.update({ x: 96, y: 0 });
    c.cancel();
    expect(c.active).toBe(false);
    expect(c.update({ x: 200, y: 0 })).toBeNull();
    expect(c.end()).toBeNull();
  });
});

// ── 组件手势接线 ─────────────────────────────────────────
// happy-dom 无布局（rect 全 0）+ WheelEvent/PointerEvent 构造参数被忽略，
// clientX/clientY 用 defineProperty 桩；条形几何来自 layout 缓存不依赖 DOM rect。

const TODAY = "2026-09-15";

function sampleTasks(): ZGanttTask[] {
  return [
    { id: "p", name: "Phase", is_summary: true, start_date: "2026-09-01", end_date: "2026-09-20" },
    { id: "a", name: "Alpha", parent_id: "p", start_date: "2026-09-01", end_date: "2026-09-05", progress: 50 },
    { id: "b", name: "Beta", parent_id: "p", start_date: "2026-09-08", end_date: "2026-09-12" },
    { id: "m", name: "Gate", is_milestone: true, start_date: "2026-09-20" },
  ];
}

function pe(type: string, x = 0, y = 0): PointerEvent {
  const e = new PointerEvent(type, { bubbles: true, composed: true });
  Object.defineProperty(e, "clientX", { value: x });
  Object.defineProperty(e, "clientY", { value: y });
  return e;
}

let gantt: ZGantt;
let tasks: ZGanttTask[];

beforeEach(() => {
  tasks = sampleTasks();
  gantt = document.createElement("z-gantt") as ZGantt;
  gantt.today = TODAY;
  gantt.data = { tasks, dependencies: [] };
  document.body.appendChild(gantt);
});

afterEach(() => {
  closeContextMenu();
  // 退场动画在 happy-dom 里不派 animationend，面板会留 200ms 才摘除；
  // 测试之间必须清干净，否则后一条「不该有菜单」会读到上一条的残影。
  document.querySelectorAll('[part="menu"]').forEach((el) => el.remove());
  document.body.removeChild(gantt);
});

async function ready(): Promise<void> {
  await wait();
  await wait();
}

function barOf(id: string): HTMLElement {
  return gantt.shadowRoot!.querySelector(`.z-gantt__bar[data-task-id='${id}']`) as HTMLElement;
}

describe("z-gantt gestures", () => {
  it("drag move commits shifted dates and emits z-gantt-change", async () => {
    await ready();
    const changes: Array<{ changed: string[] }> = [];
    gantt.addEventListener("z-gantt-change", (e) => changes.push((e as CustomEvent).detail));
    // rangeStart 8/30(pad2)，a 条 x=64；dx=96px=3 天 → 9/4..9/8
    barOf("a").dispatchEvent(pe("pointerdown", 0, 0));
    window.dispatchEvent(pe("pointermove", 96, 0));
    window.dispatchEvent(pe("pointerup", 96, 0));
    await ready();
    expect(tasks[1].start_date).toBe("2026-09-04");
    expect(tasks[1].end_date).toBe("2026-09-08");
    expect(changes).toHaveLength(1);
    expect(changes[0].changed).toEqual(["a"]);
  });

  it("readonly blocks dragging", async () => {
    gantt.readonly = true;
    await ready();
    barOf("a").dispatchEvent(pe("pointerdown", 0, 0));
    window.dispatchEvent(pe("pointermove", 96, 0));
    window.dispatchEvent(pe("pointerup", 96, 0));
    await ready();
    expect(tasks[1].start_date).toBe("2026-09-01");
  });

  it("summary bars are not draggable (dates stay aggregated)", async () => {
    await ready();
    barOf("p").dispatchEvent(pe("pointerdown", 0, 0));
    window.dispatchEvent(pe("pointermove", 96, 0));
    window.dispatchEvent(pe("pointerup", 96, 0));
    await ready();
    expect(tasks[0].start_date).toBe("2026-09-01");
  });

  it("progress drag commits percent", async () => {
    await ready();
    const fill = barOf("a").querySelector(".z-gantt__bar-progress") as HTMLElement;
    // a 条 9/1..9/5 含尾日 5 天：x=64 w=160，pointer 到 chartX=224 → 100%
    fill.dispatchEvent(pe("pointerdown", 0, 0));
    window.dispatchEvent(pe("pointermove", 224, 0));
    window.dispatchEvent(pe("pointerup", 224, 0));
    await ready();
    expect(tasks[1].progress).toBe(100);
  });

  it("connect gesture appends dependency and can be canceled", async () => {
    await ready();
    const connects: unknown[] = [];
    gantt.addEventListener("z-gantt-connect", (e) => {
      connects.push((e as CustomEvent).detail);
      (e as Event).preventDefault(); // 取消 → 不落模型
    });
    // 端口圆点挂行（[[bug-20260927-gantt-row-anchor]]），不再从 bar 内查询
    const dot = gantt.shadowRoot!.querySelector(".z-gantt__row[data-task-id='a'] > .z-gantt__connect--end") as HTMLElement;
    // a 条右缘 chartX=160（end 锚）；b 条 x=288 w=160，落 (300,120) 左半 → FS
    dot.dispatchEvent(pe("pointerdown", 160, 0));
    window.dispatchEvent(pe("pointermove", 300, 120));
    window.dispatchEvent(pe("pointerup", 300, 120));
    await ready();
    expect(connects).toHaveLength(1);
    expect(gantt.data!.dependencies ?? []).toHaveLength(0);
  });

  it("connect gesture commits dependency when not prevented", async () => {
    await ready();
    const dot = gantt.shadowRoot!.querySelector(".z-gantt__row[data-task-id='a'] > .z-gantt__connect--end") as HTMLElement;
    dot.dispatchEvent(pe("pointerdown", 160, 0));
    window.dispatchEvent(pe("pointermove", 300, 120));
    window.dispatchEvent(pe("pointerup", 300, 120));
    await ready();
    expect(gantt.data!.dependencies).toEqual([
      { predecessor_id: "a", successor_id: "b", type: "FS" },
    ]);
  });
});

describe("z-gantt context menu", () => {
  it("contextmenu on a bar opens built-in menu and delete-task removes task + deps", async () => {
    await ready();
    gantt.data = {
      tasks,
      dependencies: [{ predecessor_id: "a", successor_id: "b", type: "FS" }],
    };
    await ready();
    barOf("a").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true }));
    const menu = document.body.querySelector('[part="menu"]');
    expect(menu).toBeTruthy();
    const del = document.body.querySelector('[part="menu"] [data-value="delete-task"]') as HTMLElement;
    del.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await ready();
    expect(tasks.find((t) => t.id === "a")).toBeUndefined();
    expect(gantt.data!.dependencies).toHaveLength(0);
  });

  it("z-gantt-menu preventDefault suppresses built-in menu", async () => {
    await ready();
    gantt.addEventListener("z-gantt-menu", (e) => e.preventDefault());
    barOf("a").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true }));
    expect(document.body.querySelector('[part="menu"]')).toBeNull();
  });

  it("menuActions overrides items; unknown keys emit z-gantt-menu-pick", async () => {
    await ready();
    const picks: string[] = [];
    gantt.addEventListener("z-gantt-menu-pick", (e) => picks.push((e as CustomEvent).detail.key));
    gantt.menuActions = [{ key: "export", label: "Export" }];
    await ready();
    barOf("a").dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true }));
    const items = [...document.body.querySelectorAll('[part="menu"] .z-menu__item')];
    expect(items).toHaveLength(1);
    (items[0] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await ready();
    expect(picks).toEqual(["export"]);
  });

  it("contextmenu on blank space keeps default menu (no custom menu)", async () => {
    await ready();
    gantt.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, cancelable: true }));
    expect(document.body.querySelector('[part="menu"]')).toBeNull();
  });
});
