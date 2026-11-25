// Test: z-gantt 组件主体（双栏渲染/value 声明式入口/选择/折叠/缩放/滚动同步/键盘/开关）
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../../../src/report/gantt/Gantt";
import type { ZGantt } from "../../../src/report/gantt/Gantt";
import type { ZGanttTask } from "../../../src/report/gantt/types";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

const TODAY = "2026-09-15";

function sampleTasks(): ZGanttTask[] {
  return [
    { id: "p", name: "Phase", is_summary: true, start_date: "2026-09-01", end_date: "2026-09-20" },
    { id: "a", name: "Alpha", parent_id: "p", start_date: "2026-09-01", end_date: "2026-09-05", progress: 50 },
    { id: "b", name: "Beta", parent_id: "p", start_date: "2026-09-08", end_date: "2026-09-12", real_start_date: "2026-09-09", real_end_date: "2026-09-11" },
    { id: "m", name: "Gate", is_milestone: true, start_date: "2026-09-20" },
  ];
}

function createGantt(tasks: ZGanttTask[] = sampleTasks()): ZGantt {
  const el = document.createElement("z-gantt") as ZGantt;
  el.today = TODAY;
  el.data = { tasks, dependencies: [] };
  document.body.appendChild(el);
  return el;
}

function pointer(el: EventTarget, type = "pointerdown"): void {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true }));
}

function key(el: EventTarget, k: string): void {
  el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
}

let gantt: ZGantt;

beforeEach(() => {
  gantt = createGantt();
});

afterEach(() => {
  document.body.removeChild(gantt);
});

describe("z-gantt structure", () => {
  it("renders two panes with header/body parts", async () => {
    await wait();
    const s = gantt.shadowRoot!;
    expect(s.querySelector(".z-gantt__list")).toBeTruthy();
    expect(s.querySelector(".z-gantt__chart")).toBeTruthy();
    expect(s.querySelector(".z-gantt__list-header")).toBeTruthy();
    expect(s.querySelector(".z-gantt__header-inner")).toBeTruthy();
    expect(s.querySelector(".z-gantt__body .z-gantt__grid")).toBeTruthy();
  });

  it("renders default columns when none provided", async () => {
    await wait();
    const titles = [...gantt.shadowRoot!.querySelectorAll(".z-gantt__th")].map((th) => th.textContent);
    expect(titles).toEqual(["Task", "Start", "End", "%"]);
  });

  it("renders custom columns", async () => {
    gantt.columns = [{ key: "name", title: "N", width: 120 }, { key: "progress", title: "P", width: 50 }];
    await wait();
    const titles = [...gantt.shadowRoot!.querySelectorAll(".z-gantt__th")].map((th) => th.textContent);
    expect(titles).toEqual(["N", "P"]);
  });

  it("renders one row per visible task with bars/milestone/summary/real", async () => {
    await wait();
    const s = gantt.shadowRoot!;
    expect(s.querySelectorAll(".z-gantt__tr")).toHaveLength(4);
    expect(s.querySelectorAll(".z-gantt__row")).toHaveLength(4);
    expect(s.querySelector(".z-gantt__bar[data-task-id='a']")).toBeTruthy();
    expect(s.querySelector(".z-gantt__bar--summary[data-task-id='p']")).toBeTruthy();
    expect(s.querySelector(".z-gantt__milestone[data-task-id='m']")).toBeTruthy();
    expect(s.querySelector(".z-gantt__bar--real[data-task-id='b']")).toBeTruthy();
  });

  it("anchors bars row-relative and renders connects outside the bar clipping", async () => {
    // Related: [[bug-20260927-gantt-row-anchor]] 条形 top 必须行相对（此前误写
    // l.y 绝对坐标造成双重偏移）；端口圆点不得是 .z-gantt__bar 子元素
    //（overflow:hidden 会裁掉越出条缘的半颗圆点）
    await wait();
    const s = gantt.shadowRoot!;
    const RH = 48; // 默认 row-height
    const barA = s.querySelector(".z-gantt__bar[data-task-id='a']") as HTMLElement;
    const barB = s.querySelector(".z-gantt__bar[data-task-id='b']") as HTMLElement;
    const realB = s.querySelector(".z-gantt__bar--real[data-task-id='b']") as HTMLElement;
    const summaryP = s.querySelector(".z-gantt__bar--summary[data-task-id='p']") as HTMLElement;
    const anchorM = s.querySelector(".z-gantt__milestone-anchor[data-task-id='m']") as HTMLElement;
    // 计划条/summary 条/里程碑 anchor 行内 top = (rowHeight - 自高) / 2
    expect(barA.style.top).toBe(`${(RH - 24) / 2}px`);
    expect(barB.style.top).toBe(`${(RH - 24) / 2}px`);
    expect(summaryP.style.top).toBe(`${(RH - 10) / 2}px`);
    expect(anchorM.style.top).toBe(`${(RH - 14) / 2}px`);
    // 实际条 top = realY - 行顶 y（计划条正下方叠 14px 高实际条）
    expect(realB.style.top).toBe("24px");
    // 连线端口是行的直接子元素而非条形子元素（免被 overflow:hidden 裁剪），
    // left 用条缘 chart 坐标（day 视图 32px/天；a 条 x=64，含尾日 5 天 w=160）
    const rowA = s.querySelector(".z-gantt__row[data-task-id='a']") as HTMLElement;
    const connects = [...rowA.children].filter((c) => c.classList.contains("z-gantt__connect"));
    expect(connects).toHaveLength(2);
    expect(connects[0].classList.contains("z-gantt__connect--start")).toBe(true);
    expect(connects[1].classList.contains("z-gantt__connect--end")).toBe(true);
    expect((connects[0] as HTMLElement).style.left).toBe("60px");
    expect((connects[1] as HTMLElement).style.left).toBe("220px");
    expect(rowA.querySelector(".z-gantt__bar .z-gantt__connect")).toBeNull();
  });

  it("renders progress fill width and progress drag mode when editable", async () => {
    await wait();
    const fill = gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='a'] .z-gantt__bar-progress") as HTMLElement;
    expect(fill).toBeTruthy();
    expect(fill.style.width).toBe("50%");
    expect(fill.getAttribute("data-mode")).toBe("progress");
  });

  it("readonly hides handles and progress drag mode", async () => {
    gantt.readonly = true;
    await wait();
    const s = gantt.shadowRoot!;
    expect(s.querySelector(".z-gantt__handle")).toBeNull();
    const fill = s.querySelector(".z-gantt__bar[data-task-id='a'] .z-gantt__bar-progress") as HTMLElement;
    expect(fill.getAttribute("data-mode")).toBeNull();
  });

  it("renders weekend overlay and today line by default, removable via flags", async () => {
    await wait();
    const s = gantt.shadowRoot!;
    expect(s.querySelector(".z-gantt__weekend")).toBeTruthy();
    expect(s.querySelector(".z-gantt__today")).toBeTruthy();
    gantt.showWeekends = false;
    gantt.showToday = false;
    await wait();
    expect(s.querySelector(".z-gantt__weekend")).toBeNull();
    expect(s.querySelector(".z-gantt__today")).toBeNull();
  });
});

describe("z-gantt data entry", () => {
  it("parses value attr JSON as declarative entry", async () => {
    const el = document.createElement("z-gantt") as ZGantt;
    el.today = TODAY;
    el.setAttribute(
      "value",
      JSON.stringify({ tasks: [{ id: "x", name: "X", start_date: "2026-09-02", end_date: "2026-09-03" }] }),
    );
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot!.querySelector(".z-gantt__tr[data-task-id='x']")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("ignores invalid value JSON without breaking render", async () => {
    const el = document.createElement("z-gantt") as ZGantt;
    el.setAttribute("value", "{not-json");
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot!.querySelector(".z-gantt")).toBeTruthy();
    expect(el.shadowRoot!.querySelectorAll(".z-gantt__tr")).toHaveLength(0);
    document.body.removeChild(el);
  });

  it("setData replaces tasks and clears value entry; getData returns snapshot", async () => {
    gantt.setData({ tasks: [{ id: "z", name: "Z" }], dependencies: [] });
    await wait();
    expect(gantt.shadowRoot!.querySelector(".z-gantt__tr[data-task-id='z']")).toBeTruthy();
    expect(gantt.getData().tasks.map((t) => t.id)).toEqual(["z"]);
  });

  it("getTaskById finds tasks", async () => {
    expect(gantt.getTaskById("a")?.name).toBe("Alpha");
    expect(gantt.getTaskById("nope")).toBeNull();
  });
});

describe("z-gantt selection / expand", () => {
  it("pointerdown on row selects and emits z-gantt-select", async () => {
    await wait();
    let detail: any = null;
    gantt.addEventListener("z-gantt-select", (e: any) => (detail = e.detail));
    const row = gantt.shadowRoot!.querySelector(".z-gantt__tr[data-task-id='a']")!;
    pointer(row);
    expect(gantt.selectedId).toBe("a");
    expect(detail?.task?.name).toBe("Alpha");
    // 选中态同步渲染到左右两栏
    await wait();
    expect(gantt.shadowRoot!.querySelector(".z-gantt__tr--selected[data-task-id='a']")).toBeTruthy();
    expect(gantt.shadowRoot!.querySelector(".z-gantt__row--selected[data-task-id='a']")).toBeTruthy();
  });

  it("expander click collapses children and emits z-gantt-expand", async () => {
    await wait();
    let detail: any = null;
    gantt.addEventListener("z-gantt-expand", (e: any) => (detail = e.detail));
    const expander = gantt.shadowRoot!.querySelector(".z-gantt__expander[data-task-id='p']")!;
    pointer(expander);
    expect(detail).toEqual({ id: "p", expanded: false });
    await wait();
    expect(gantt.shadowRoot!.querySelectorAll(".z-gantt__tr")).toHaveLength(2);
    pointer(gantt.shadowRoot!.querySelector(".z-gantt__expander[data-task-id='p']")!);
    await wait();
    expect(gantt.shadowRoot!.querySelectorAll(".z-gantt__tr")).toHaveLength(4);
  });

  it("expandAll toggles all parents", async () => {
    await wait();
    gantt.expandAll(false);
    await wait();
    expect(gantt.shadowRoot!.querySelectorAll(".z-gantt__tr")).toHaveLength(2);
    gantt.expandAll(true);
    await wait();
    expect(gantt.shadowRoot!.querySelectorAll(".z-gantt__tr")).toHaveLength(4);
  });

  it("Escape clears selection", async () => {
    await wait();
    pointer(gantt.shadowRoot!.querySelector(".z-gantt__tr[data-task-id='a']")!);
    expect(gantt.selectedId).toBe("a");
    key(gantt, "Escape");
    expect(gantt.selectedId).toBeNull();
  });

  it("ArrowDown/ArrowUp move selection across visible rows", async () => {
    await wait();
    key(gantt, "ArrowDown");
    expect(gantt.selectedId).toBe("p");
    key(gantt, "ArrowDown");
    expect(gantt.selectedId).toBe("a");
    key(gantt, "ArrowUp");
    expect(gantt.selectedId).toBe("p");
  });
});

describe("z-gantt zoom", () => {
  it("ctrl+wheel zooms around cursor, plain wheel does not", async () => {
    await wait();
    const before = gantt.dayWidth;
    // [WHY] happy-dom WheelEvent 忽略构造参数（clientX/ctrlKey），需 defineProperty 补
    const wheel = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    Object.defineProperty(wheel, "clientX", { value: 600 });
    Object.defineProperty(wheel, "ctrlKey", { value: true });
    gantt.dispatchEvent(wheel);
    await wait();
    expect(gantt.dayWidth).toBeCloseTo(before * 1.15, 5);
    const plain = new WheelEvent("wheel", { deltaY: -100, bubbles: true, cancelable: true });
    gantt.dispatchEvent(plain);
    await wait();
    expect(gantt.dayWidth).toBeCloseTo(before * 1.15, 5);
    // 光看 dayWidth 不变是不够的：真实现若先 preventDefault 再因夹取而不改日宽，
    // 页面照样滚不动。这条断言守的是「放行」本身。
    expect(plain.defaultPrevented).toBe(false);
  });

  it("zoomIn/zoomOut clamp to [1, 120] px per day", async () => {
    await wait();
    for (let i = 0; i < 30; i++) gantt.zoomIn();
    expect(gantt.dayWidth).toBe(120);
    for (let i = 0; i < 40; i++) gantt.zoomOut();
    expect(gantt.dayWidth).toBe(1);
  });

  it("view-mode change resets zoom and emits z-gantt-view-change", async () => {
    await wait();
    gantt.zoomIn();
    expect(gantt.dayWidth).not.toBe(32);
    let mode = "";
    gantt.addEventListener("z-gantt-view-change", (e: any) => (mode = e.detail.mode));
    gantt.viewMode = "week";
    await wait();
    expect(gantt.dayWidth).toBe(12);
    expect(mode).toBe("week");
  });

  it("fit() scales dayWidth to make tasks visible (stubbed width)", async () => {
    await wait();
    Object.defineProperty(gantt, "clientWidth", { configurable: true, value: 1000 });
    gantt.fit();
    await wait();
    // range 8/30..9/22（里程碑 9/20 撑大范围）= 23 天，(1000-440-20)/23 = 23
    expect(gantt.dayWidth).toBe(23);
  });
});

describe("z-gantt scroll sync", () => {
  it("body scroll drives list scrollTop and header transform", async () => {
    await wait();
    const s = gantt.shadowRoot!;
    const body = s.querySelector(".z-gantt__body") as HTMLElement;
    const headerInner = s.querySelector(".z-gantt__header-inner") as HTMLElement;
    const listBody = s.querySelector(".z-gantt__list-body") as HTMLElement;
    // [WHY] happy-dom 无布局：scrollTop/scrollLeft 赋值会被钳到 0，用存取器桩替代
    let bodyTop = 0;
    let bodyLeft = 0;
    let listTop = -1;
    Object.defineProperty(body, "scrollTop", { configurable: true, get: () => bodyTop, set: (v) => (bodyTop = v) });
    Object.defineProperty(body, "scrollLeft", { configurable: true, get: () => bodyLeft, set: (v) => (bodyLeft = v) });
    Object.defineProperty(listBody, "scrollTop", { configurable: true, get: () => listTop, set: (v) => (listTop = v) });
    body.scrollTop = 30;
    body.scrollLeft = 50;
    body.dispatchEvent(new Event("scroll"));
    expect(listTop).toBe(30);
    expect(headerInner.style.transform).toBe("translateX(-50px)");
  });
});

describe("z-gantt imperative scroll", () => {
  it("scrollToTask centers the row and scrollToToday scrolls to today column", async () => {
    await wait();
    Object.defineProperty(gantt, "clientHeight", { configurable: true, value: 200 });
    const body = gantt.shadowRoot!.querySelector(".z-gantt__body") as HTMLElement;
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 200 });
    Object.defineProperty(body, "clientWidth", { configurable: true, value: 800 });
    let bodyTop = 0;
    let bodyLeft = 0;
    Object.defineProperty(body, "scrollTop", { configurable: true, get: () => bodyTop, set: (v) => (bodyTop = v) });
    Object.defineProperty(body, "scrollLeft", { configurable: true, get: () => bodyLeft, set: (v) => (bodyLeft = v) });
    gantt.scrollToTask("b");
    // 行 b index 2 → top 96，居中 96-100 = -4 → 0；cx = 9*32 + 80 = 368 < 400 → 0
    expect(bodyTop).toBe(0);
    expect(bodyLeft).toBe(0);
    gantt.scrollToToday();
    // today 9/15：range 8/30 起，16 天 × 32 = 512 → 512-400 = 112
    expect(bodyLeft).toBe(112);
  });
});
