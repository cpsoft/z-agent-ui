// Test: 甘特图虚拟滚动（行窗口化渲染）与触摸长按菜单
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../../../src/report/gantt/Gantt";
import type { ZGantt } from "../../../src/report/gantt/Gantt";
import { closeContextMenu } from "../../../src/report/gantt/context-menu";
import type { ZGanttTask } from "../../../src/report/gantt/types";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

const ROWS = 60;
const RH = 48; // 默认 row-height

function makeTasks(): ZGanttTask[] {
  return Array.from({ length: ROWS }, (_, i) => ({
    id: `r${i}`,
    name: `Task ${i}`,
    start_date: "2026-09-01",
    end_date: "2026-09-03",
  }));
}

describe("z-gantt virtual scroll", () => {
  let gantt: ZGantt;

  beforeEach(async () => {
    gantt = document.createElement("z-gantt") as ZGantt;
    gantt.today = "2026-09-15";
    gantt.data = { tasks: makeTasks(), dependencies: [] };
    document.body.appendChild(gantt);
    await wait();
  });

  afterEach(() => {
    document.body.removeChild(gantt);
    closeContextMenu();
    document.querySelectorAll('[part="menu"]').forEach((el) => el.remove());
  });

  /** happy-dom 无布局：scrollTop/scrollLeft 赋值会被钳到 0，用存取器桩替代 */
  function stubBody(): HTMLElement {
    const body = gantt.shadowRoot!.querySelector(".z-gantt__body") as HTMLElement;
    let top = 0;
    Object.defineProperty(body, "scrollTop", { configurable: true, get: () => top, set: (v) => (top = v) });
    Object.defineProperty(body, "clientHeight", { configurable: true, value: 480 });
    return body;
  }

  it("renders full rows without layout, windows once measurable", async () => {
    const s = gantt.shadowRoot!;
    // 无布局环境（clientHeight=0）回退全量渲染
    expect(s.querySelectorAll(".z-gantt__row")).toHaveLength(ROWS);
    const body = stubBody();
    body.dispatchEvent(new Event("scroll"));
    // 视口 10 行 + 上下 overscan 5 → 15 行；左右列表行数一致
    expect(s.querySelectorAll(".z-gantt__row")).toHaveLength(15);
    expect(s.querySelectorAll(".z-gantt__tr")).toHaveLength(15);
    // grid 高度保持全量 spacer，滚动条长度不变
    const grid = s.querySelector(".z-gantt__grid") as HTMLElement;
    expect(grid.style.height).toBe(`${ROWS * RH}px`);
    // [[bug-20260927-gantt-row-anchor]] 左列表 spacer 与右 grid 等高：
    // 两侧滚动范围一致，scrollTop 同步才不会提前钳死
    const space = s.querySelector(".z-gantt__list-space") as HTMLElement;
    expect(space.style.height).toBe(`${ROWS * RH}px`);
  });

  it("scroll rewrites the window with overscan on both sides", async () => {
    const s = gantt.shadowRoot!;
    const body = stubBody();
    body.scrollTop = 30 * RH;
    body.dispatchEvent(new Event("scroll"));
    // 行 30 居首 → 窗口 [25, 45)，切片首行为 r25
    const firstRow = s.querySelector(".z-gantt__rows-slice .z-gantt__row") as HTMLElement;
    expect(firstRow.getAttribute("data-task-id")).toBe("r25");
    expect(s.querySelectorAll(".z-gantt__row")).toHaveLength(20);
    // 左列表切片同步平移，首行同为 r25
    const listSlice = s.querySelector(".z-gantt__list-slice") as HTMLElement;
    expect(listSlice.style.transform).toBe(`translateY(${25 * RH}px)`);
    const firstTr = s.querySelector(".z-gantt__list-slice .z-gantt__tr") as HTMLElement;
    expect(firstTr.getAttribute("data-task-id")).toBe("r25");
  });

  it("clamps the window at the bottom", async () => {
    const s = gantt.shadowRoot!;
    const body = stubBody();
    body.scrollTop = 59 * RH; // 最后一行居首
    body.dispatchEvent(new Event("scroll"));
    // 底部钳制：切片整体内移为 50..60 共 10 行，避免空窗
    const rows = s.querySelectorAll(".z-gantt__row");
    expect(rows).toHaveLength(10);
    expect((rows[0] as HTMLElement).getAttribute("data-task-id")).toBe("r50");
  });

  it("re-render restores captured scrollTop on the new body", async () => {
    const s = gantt.shadowRoot!;
    const body = stubBody();
    body.scrollTop = 30 * RH;
    body.dispatchEvent(new Event("scroll"));
    // [WHY] 原型级 scrollTop 桩：instance 桩随 innerHTML 重建丢失，用原型桩
    // 追踪新 body 是否真被写入恢复位置
    const proto = HTMLElement.prototype as unknown as Record<string, PropertyDescriptor | undefined>;
    const desc = Object.getOwnPropertyDescriptor(proto, "scrollTop")!
      ?? Object.getOwnPropertyDescriptor(Element.prototype, "scrollTop")!;
    const stored = new WeakMap<HTMLElement, number>();
    Object.defineProperty(HTMLElement.prototype, "scrollTop", {
      configurable: true,
      get(this: HTMLElement) {
        return stored.get(this) ?? 0;
      },
      set(this: HTMLElement, v: number) {
        stored.set(this, v);
      },
    });
    try {
      gantt.selectedId = "r30"; // 触发全量重建
      await wait();
      await wait();
      const newBody = s.querySelector(".z-gantt__body") as HTMLElement;
      expect(newBody).toBeTruthy();
      expect(newBody).not.toBe(body);
      // updated() 把 render 前捕获的纵向位置写回新 body
      expect(newBody.scrollTop).toBe(30 * RH);
    } finally {
      Object.defineProperty(HTMLElement.prototype, "scrollTop", desc);
    }
  });
});

// ── 触摸长按菜单 ─────────────────────────────────────────
// happy-dom PointerEvent 构造参数被忽略：pointerType/clientX/Y 用 defineProperty 桩

function touchPe(type: string, x = 10, y = 10): PointerEvent {
  const e = new PointerEvent(type, { bubbles: true, composed: true });
  Object.defineProperty(e, "pointerType", { value: "touch" });
  Object.defineProperty(e, "clientX", { value: x });
  Object.defineProperty(e, "clientY", { value: y });
  return e;
}

describe("z-gantt touch long-press", () => {
  let gantt: ZGantt;

  beforeEach(async () => {
    gantt = document.createElement("z-gantt") as ZGantt;
    gantt.today = "2026-09-15";
    gantt.data = {
      tasks: [
        { id: "a", name: "Alpha", start_date: "2026-09-01", end_date: "2026-09-03" },
        { id: "b", name: "Beta", start_date: "2026-09-04", end_date: "2026-09-06" },
      ],
      dependencies: [],
    };
    document.body.appendChild(gantt);
    await wait();
    // [WHY] happy-dom 无布局：elementFromPoint 无从命中，桩返回指定行
    (gantt.shadowRoot as unknown as Record<string, unknown>).elementFromPoint = () =>
      gantt.shadowRoot!.querySelector(".z-gantt__tr[data-task-id='a']");
  });

  afterEach(() => {
    document.body.removeChild(gantt);
    closeContextMenu();
    document.querySelectorAll('[part="menu"]').forEach((el) => el.remove());
  });

  it("long-press on a row opens the built-in context menu", async () => {
    gantt.dispatchEvent(touchPe("pointerdown"));
    await new Promise((r) => setTimeout(r, 560));
    const menu = document.querySelector('[part="menu"]');
    expect(menu).toBeTruthy();
    expect(menu!.querySelector('[data-value="delete-task"]')).toBeTruthy();
  });

  it("pointer move beyond threshold cancels long-press", async () => {
    gantt.dispatchEvent(touchPe("pointerdown"));
    window.dispatchEvent(touchPe("pointermove", 100, 100));
    await new Promise((r) => setTimeout(r, 560));
    expect(document.querySelector('[part="menu"]')).toBeFalsy();
  });

  it("long-press on a drag hotspot (bar) is suppressed by drag", async () => {
    // 条形起手即进入拖拽手势，不应弹出长按菜单
    (gantt.shadowRoot as unknown as Record<string, unknown>).elementFromPoint = () =>
      gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='a']");
    const bar = gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='a']") as HTMLElement;
    bar.dispatchEvent(touchPe("pointerdown"));
    await new Promise((r) => setTimeout(r, 560));
    expect(document.querySelector('[part="menu"]')).toBeFalsy();
  });
});
