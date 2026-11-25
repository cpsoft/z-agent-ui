// Test: 甘特图 M4 算法 —— 依赖箭头几何 / 自动排程级联 / 关键路径
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { computeArrowPaths, type BarGeometry } from "../../../src/report/gantt/arrows";
import { cascadeSchedule } from "../../../src/report/gantt/schedule";
import { computeCriticalPath } from "../../../src/report/gantt/critical-path";
import { closeContextMenu } from "../../../src/report/gantt/context-menu";
import type { ZGanttDependency, ZGanttTask } from "../../../src/report/gantt/types";

// ── arrows ──────────────────────────────────────────────

const geom = (x: number, w: number, cy: number): BarGeometry => ({ x, width: w, centerY: cy });

describe("computeArrowPaths", () => {
  const geoms = new Map<string, BarGeometry>([
    ["a", geom(64, 160, 24)],
    ["b", geom(288, 160, 72)],
  ]);
  const geomOf = (id: string) => geoms.get(id) ?? null;

  it("FS exits from source right edge and enters target left edge", () => {
    const [p] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "FS" }], geomOf);
    // M 起点 = a 右缘 (224, 24)，终点 = b 左缘 (288, 72)
    expect(p!.d.startsWith("M 224 24")).toBe(true);
    expect(p!.d.endsWith("288 72")).toBe(true);
  });

  it("SS/SF exit from source left edge", () => {
    const [ss] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "SS" }], geomOf);
    expect(ss!.d.startsWith("M 64 24")).toBe(true);
    const [sf] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "SF" }], geomOf);
    expect(sf!.d.startsWith("M 64 24")).toBe(true);
  });

  it("missing endpoints are skipped", () => {
    const out = computeArrowPaths(
      [
        { predecessor_id: "a", successor_id: "ghost", type: "FS" },
        { predecessor_id: "ghost", successor_id: "b", type: "FS" },
      ],
      geomOf,
    );
    expect(out).toHaveLength(0);
  });

  it("parallel edges on the same pair are offset vertically", () => {
    const deps: ZGanttDependency[] = [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "a", successor_id: "b", type: "SS" },
      { predecessor_id: "a", successor_id: "b", type: "FF" },
    ];
    const out = computeArrowPaths(deps, geomOf);
    expect(out).toHaveLength(3);
    // 同类型（source 锚相同）的 FS/FF 起点应错开 ±6
    const yOf = (d: string) => Number(d.split(" ")[2]);
    const [p1, , p3] = out;
    expect(yOf(p1!.d)).toBe(24 - 6);
    expect(yOf(p3!.d)).toBe(24 + 6);
  });

  it("bezier control offset at least MIN_BEND", () => {
    // dist = 64 → bend = max(64*0.35, 28) = 28；C 段第一控制点 x = 224+28
    const [p] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "FS" }], geomOf);
    expect(p!.d).toContain("C 252 24");
  });

  it("backward edges (succ left of pred): FS still exits right, enters succ left edge", () => {
    const rev = new Map<string, BarGeometry>([["a", geom(288, 160, 24)], ["b", geom(64, 160, 24)]]);
    const [p] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "FS" }], (id) => rev.get(id) ?? null);
    // 对齐参考实现：出口方向按类型固定（FS 恒右出），cp2 恒在 tx 左侧
    // sx=448, dx=384 → bend=134.4：cp1=448+134.4=582.4（右伸回绕），cp2=64-134.4=-70.4
    expect(p!.d.startsWith("M 448 24")).toBe(true);
    expect(p!.d).toContain("C 582.4 24");
    expect(p!.d.endsWith("-70.4 24, 64 24")).toBe(true);
  });

  it("SS/SF exit leftward even when succ is right of pred (no crossing through bar)", () => {
    // sx=64, tx=288, dx=224, dy=48 → dist=max(224, 28.8)=224 → bend=78.4
    // 出口向左（cp1=64-78.4=-14.4），若向右弯曲线会穿过 pred 条形本体
    const [ss] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "SS" }], geomOf);
    expect(ss!.d).toContain("C -14.4 24");
    const [sf] = computeArrowPaths([{ predecessor_id: "a", successor_id: "b", type: "SF" }], geomOf);
    expect(sf!.d).toContain("C -14.4 24");
  });

  it("returns empty for empty deps", () => {
    expect(computeArrowPaths([], geomOf)).toEqual([]);
  });
});

// ── cascadeSchedule ─────────────────────────────────────

function t(id: string, start: string, end?: string, over: Partial<ZGanttTask> = {}): ZGanttTask {
  return { id, name: id, start_date: start, ...(end ? { end_date: end } : {}), ...over };
}

describe("cascadeSchedule", () => {
  it("FS pushes successor to pred.end + 1 keeping duration", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-02", "2026-09-04")];
    const changed = cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "b", type: "FS" }]);
    expect(changed).toEqual(["b"]);
    expect(tasks[1].start_date).toBe("2026-09-06");
    expect(tasks[1].end_date).toBe("2026-09-08"); // 3 天工期保持
  });

  it("SS aligns start with lag", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-10", "2026-09-12")];
    cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "b", type: "SS", lag_days: 2 }]);
    expect(tasks[1].start_date).toBe("2026-09-03");
    expect(tasks[1].end_date).toBe("2026-09-05");
  });

  it("FF aligns end (start recomputed to keep duration)", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-10", "2026-09-14")];
    cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "b", type: "FF", lag_days: 1 }]);
    expect(tasks[1].end_date).toBe("2026-09-06");
    expect(tasks[1].start_date).toBe("2026-09-02"); // 5 天工期
  });

  it("SF: succ ends when pred starts", () => {
    const tasks = [t("a", "2026-09-10", "2026-09-12"), t("b", "2026-09-01", "2026-09-03")];
    cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "b", type: "SF" }]);
    expect(tasks[1].end_date).toBe("2026-09-10");
    expect(tasks[1].start_date).toBe("2026-09-08");
  });

  it("milestone follows FS with start only", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("m", "2026-09-01", undefined, { is_milestone: true })];
    cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "m", type: "FS" }]);
    expect(tasks[1].start_date).toBe("2026-09-06");
    expect(tasks[1].end_date).toBeUndefined();
  });

  it("milestone ignores FF/SF", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("m", "2026-09-20", undefined, { is_milestone: true })];
    const changed = cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "m", type: "FF" }]);
    expect(changed).toEqual([]);
    expect(tasks[1].start_date).toBe("2026-09-20");
  });

  it("propagates transitively through chains (Kahn order)", () => {
    const tasks = [
      t("a", "2026-09-01", "2026-09-02"),
      t("b", "2026-09-01", "2026-09-02"),
      t("c", "2026-09-01", "2026-09-02"),
    ];
    cascadeSchedule(tasks, [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "b", successor_id: "c", type: "FS" },
    ]);
    expect(tasks[1].start_date).toBe("2026-09-03");
    expect(tasks[2].start_date).toBe("2026-09-05");
  });

  it("cycles are safe: cyclic tasks keep dates", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-02"), t("b", "2026-09-10", "2026-09-11")];
    const changed = cascadeSchedule(tasks, [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "b", successor_id: "a", type: "FS" },
    ]);
    // a/b 互为前驱 → 双双入度 1，Kahn 无起点 → 环整体不传播
    expect(tasks[0].start_date).toBe("2026-09-01");
    expect(tasks[1].start_date).toBe("2026-09-10");
    expect(changed).toEqual([]);
  });

  it("is idempotent on second run", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-02", "2026-09-04")];
    const deps: ZGanttDependency[] = [{ predecessor_id: "a", successor_id: "b", type: "FS" }];
    cascadeSchedule(tasks, deps);
    const second = cascadeSchedule(tasks, deps);
    expect(second).toEqual([]);
    expect(tasks[1].start_date).toBe("2026-09-06");
  });

  it("skips deps with missing dates or unknown ids", () => {
    const tasks = [{ id: "nodate", name: "n" }, t("x", "2026-09-01", "2026-09-02")];
    const changed = cascadeSchedule(tasks, [
      { predecessor_id: "nodate", successor_id: "x", type: "FS" },
      { predecessor_id: "ghost", successor_id: "x", type: "FS" },
    ]);
    expect(changed).toEqual([]);
    expect(tasks[1].start_date).toBe("2026-09-01");
  });

  it("untouched slots keep original references (constraint already satisfied)", () => {
    const a = t("a", "2026-09-01", "2026-09-05");
    const b = t("b", "2026-09-06", "2026-09-08");
    const tasks = [a, b];
    cascadeSchedule(tasks, [{ predecessor_id: "a", successor_id: "b", type: "FS" }]);
    // b.start 已满足 FS 约束 → 不改动、不替换槽位
    expect(tasks[0]).toBe(a);
    expect(tasks[1]).toBe(b);
  });
});

// ── computeCriticalPath（全量 CPM：ES/EF/LS/LF + 近关键） ──

describe("computeCriticalPath", () => {
  it("linear chain is fully critical", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-02"), t("b", "2026-09-03", "2026-09-04"), t("c", "2026-09-05", "2026-09-06")];
    const cp = computeCriticalPath(tasks, [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "b", successor_id: "c", type: "FS" },
    ]);
    expect([...cp.critical].sort()).toEqual(["a", "b", "c"]);
    expect(cp.nearCritical.size).toBe(0);
  });

  it("branch with slack is not critical and reports float days", () => {
    // a→b（紧凑短链），a→c（长链决定项目终点）
    const tasks = [
      t("a", "2026-09-01", "2026-09-02"),
      t("b", "2026-09-03", "2026-09-04"),
      t("c", "2026-09-08", "2026-09-09"),
    ];
    const cp = computeCriticalPath(tasks, [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "a", successor_id: "c", type: "FS" },
    ]);
    // 全量 CPM：c 终点=项目终点 → 关键；b 可滑到 9/8..9/9 不推迟项目 → float 5；
    // a 受 b/c 最晚开始约束（ls-1 = 9/7）→ float 5，同样非关键
    expect(cp.critical.has("c")).toBe(true);
    expect(cp.critical.has("b")).toBe(false);
    expect(cp.critical.has("a")).toBe(false);
    expect(cp.floats.get("b")).toBe(5);
    expect(cp.floats.get("a")).toBe(5);
  });

  it("near-critical: slack within threshold lands in nearCritical", () => {
    // b 相对项目终点（c 的 9/6）float = 2；a 受 b/c 的 ls-1 = 9/4 约束 → float 2
    const tasks = [
      t("a", "2026-09-01", "2026-09-02"),
      t("b", "2026-09-03", "2026-09-04"),
      t("c", "2026-09-05", "2026-09-06"),
    ];
    const deps = [
      { predecessor_id: "a", successor_id: "b", type: "FS" as const },
      { predecessor_id: "a", successor_id: "c", type: "FS" as const },
    ];
    const cp = computeCriticalPath(tasks, deps);
    expect(cp.critical.has("c")).toBe(true);
    expect(cp.nearCritical.has("b")).toBe(true);
    expect(cp.nearCritical.has("a")).toBe(true);
    expect(cp.floats.get("b")).toBe(2);
    expect(cp.floats.get("a")).toBe(2);
    // 阈值可配：1 时不计入近关键
    const strict = computeCriticalPath(tasks, deps, { nearThresholdDays: 1 });
    expect(strict.nearCritical.size).toBe(0);
  });

  it("SS constraint bounds predecessor lateness", () => {
    // a SS→b：a 最晚开始受 b 最晚开始（ls = lf - dur + 1）约束
    const tasks = [t("a", "2026-09-01", "2026-09-02"), t("b", "2026-09-09", "2026-09-10")];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "b", type: "SS" }]);
    expect(cp.critical.has("b")).toBe(true);
    expect(cp.critical.has("a")).toBe(false);
    expect(cp.floats.get("a")).toBe(8); // lf = ls_b + (dur_a - 1) = 9/10 - ef 9/2
  });

  it("FF constraint bounds predecessor by successor finish", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-10", "2026-09-12")];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "b", type: "FF", lag_days: 1 }]);
    expect(cp.critical.has("b")).toBe(true);
    expect(cp.floats.get("a")).toBe(6); // lf = 9/11 - ef 9/5
  });

  it("violating dates are normalized in forward pass (float stays >= 0)", () => {
    // b 显式开始早于 a 完结（违反 FS）：正推按约束顺延参与浮时计算
    const tasks = [t("a", "2026-09-01", "2026-09-05"), t("b", "2026-09-02", "2026-09-03")];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "b", type: "FS" }]);
    expect(cp.critical.has("a")).toBe(true);
    expect(cp.critical.has("b")).toBe(true);
    expect(cp.floats.get("b")).toBe(0);
  });

  it("isolated tasks are excluded from the critical path", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-02"), t("lonely", "2026-09-01", "2026-09-02")];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "a2", type: "FS" }]);
    // a2 不存在边无效 → 无有效边 → 空集
    expect(cp.critical.size).toBe(0);
    expect(cp.floats.size).toBe(0);
  });

  it("tasks without dates are skipped and do not block predecessors", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-02"), { id: "nodate", name: "n" }];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "nodate", type: "FS" }]);
    // nodate 无日期：不入节点 → a 无后继约束 → lf=ef → 关键；nodate 不输出
    expect(cp.critical.has("a")).toBe(true);
    expect(cp.floats.has("nodate")).toBe(false);
  });

  it("milestone participates via start date", () => {
    const tasks = [
      t("a", "2026-09-01", "2026-09-02"),
      t("m", "2026-09-03", undefined, { is_milestone: true }),
    ];
    const cp = computeCriticalPath(tasks, [{ predecessor_id: "a", successor_id: "m", type: "FS" }]);
    expect(cp.critical.has("a")).toBe(true);
    expect(cp.critical.has("m")).toBe(true);
  });

  it("cycles are excluded safely", () => {
    const tasks = [t("a", "2026-09-01", "2026-09-02"), t("b", "2026-09-10", "2026-09-11")];
    const cp = computeCriticalPath(tasks, [
      { predecessor_id: "a", successor_id: "b", type: "FS" },
      { predecessor_id: "b", successor_id: "a", type: "FS" },
    ]);
    // a/b 互为前驱 → 无拓扑起点 → 环整体排除，不崩溃
    expect(cp.critical.size).toBe(0);
    expect(cp.floats.size).toBe(0);
  });

  it("empty deps yields empty result", () => {
    const cp = computeCriticalPath([t("a", "2026-09-01", "2026-09-02")], []);
    expect(cp.critical.size).toBe(0);
    expect(cp.nearCritical.size).toBe(0);
    expect(cp.floats.size).toBe(0);
  });
});

// ── 组件集成（auto-schedule / 箭头渲染 / 关键路径高亮） ────
// happy-dom 无布局 + 构造参数被忽略：clientX/Y 用 defineProperty 桩

import "../../../src/report/gantt/Gantt";
import type { ZGantt } from "../../../src/report/gantt/Gantt";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function pe(type: string, x = 0, y = 0): PointerEvent {
  const e = new PointerEvent(type, { bubbles: true, composed: true });
  Object.defineProperty(e, "clientX", { value: x });
  Object.defineProperty(e, "clientY", { value: y });
  return e;
}

describe("z-gantt M4 integration", () => {
  let gantt: ZGantt;
  let tasks: ZGanttTask[];

  beforeEach(async () => {
    tasks = [
      { id: "a", name: "Alpha", start_date: "2026-09-01", end_date: "2026-09-05" },
      { id: "b", name: "Beta", start_date: "2026-09-06", end_date: "2026-09-08" },
    ];
    gantt = document.createElement("z-gantt") as ZGantt;
    gantt.today = "2026-09-15";
    gantt.data = { tasks, dependencies: [{ predecessor_id: "a", successor_id: "b", type: "FS" }] };
    document.body.appendChild(gantt);
    await wait();
  });

  afterEach(() => {
    document.body.removeChild(gantt);
    closeContextMenu();
  });

  it("renders dependency arrow paths in the overlay", async () => {
    await wait();
    const arrow = gantt.shadowRoot!.querySelector(".z-gantt__arrow") as SVGPathElement;
    expect(arrow).toBeTruthy();
    expect(arrow.getAttribute("marker-end")).toBe("url(#z-gantt-arrow-head)");
  });

  it("auto-schedule cascades successor when dragging predecessor", async () => {
    gantt.autoSchedule = true;
    await wait();
    const changes: Array<{ changed: string[] }> = [];
    gantt.addEventListener("z-gantt-change", (e) => changes.push((e as CustomEvent).detail));
    const bar = gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='a']") as HTMLElement;
    // dx=96px=3 天：a 9/1..9/5 → 9/4..9/8；b FS 顺延 9/6..9/8 → 9/9..9/11
    bar.dispatchEvent(pe("pointerdown", 0, 0));
    window.dispatchEvent(pe("pointermove", 96, 0));
    window.dispatchEvent(pe("pointerup", 96, 0));
    await wait();
    await wait();
    expect(tasks[0].start_date).toBe("2026-09-04");
    expect(tasks[1].start_date).toBe("2026-09-09");
    expect(changes[0].changed.sort()).toEqual(["a", "b"]);
  });

  it("show-critical-path highlights bars", async () => {
    gantt.showCriticalPath = true;
    await wait();
    await wait();
    // b 无后继且终点 = 项目终点 → 关键；a 受 b.start 约束 → 关键
    const barA = gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='a']");
    const barB = gantt.shadowRoot!.querySelector(".z-gantt__bar[data-task-id='b']");
    expect(barA?.classList.contains("z-gantt__bar--critical")).toBe(true);
    expect(barB?.classList.contains("z-gantt__bar--critical")).toBe(true);
  });
});
