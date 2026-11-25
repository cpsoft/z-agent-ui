// Test: z-gantt 布局（树构建/展平折叠/含尾日几何/summary 汇总/双条形/范围裁剪）
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import {
  BAR_HEIGHT,
  REAL_HEIGHT,
  buildTree,
  computeTaskLayouts,
  dateToPixels,
  getVisibleRange,
  pixelsToDate,
} from "../../../src/report/gantt/layout";
import { parseDate } from "../../../src/report/gantt/date";
import type { ZGanttTask } from "../../../src/report/gantt/types";

const RS = parseDate("2026-09-01")!;
const OPTS = { rangeStart: RS, dayWidth: 32, rowHeight: 48 };

function task(over: Partial<ZGanttTask> & { id: string }): ZGanttTask {
  return { name: over.id, ...over } as ZGanttTask;
}

describe("gantt buildTree / flatVisibleTasks", () => {
  it("flattens depth-first with depth and keeps parent before children", () => {
    const { rows } = buildTree([
      task({ id: "p", is_summary: true }),
      task({ id: "a", parent_id: "p" }),
      task({ id: "b", parent_id: "p" }),
      task({ id: "c" }),
    ]);
    expect(rows.map((r) => r.task.id)).toEqual(["p", "a", "b", "c"]);
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 1, 0]);
  });

  it("hides children of collapsed summary (is_expanded=false)", () => {
    const { rows } = buildTree([
      task({ id: "p", is_summary: true, is_expanded: false }),
      task({ id: "a", parent_id: "p" }),
    ]);
    expect(rows.map((r) => r.task.id)).toEqual(["p"]);
  });

  it("treats undefined is_expanded as expanded", () => {
    const { rows } = buildTree([
      task({ id: "p", is_summary: true }),
      task({ id: "a", parent_id: "p" }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("sorts children by sort_order (missing goes last, stable)", () => {
    const { rows } = buildTree([
      task({ id: "p", is_summary: true }),
      task({ id: "b", parent_id: "p", sort_order: 2 }),
      task({ id: "a", parent_id: "p", sort_order: 1 }),
      task({ id: "c", parent_id: "p" }),
    ]);
    expect(rows.map((r) => r.task.id)).toEqual(["p", "a", "b", "c"]);
  });

  it("treats orphan parent_id as root and skips duplicate ids (first wins)", () => {
    const { rows, byId } = buildTree([
      task({ id: "x", name: "first" }),
      task({ id: "x", name: "second" }),
      task({ id: "y", parent_id: "missing" }),
    ]);
    expect(rows).toHaveLength(2);
    expect(byId.get("x")?.name).toBe("first");
  });
});

describe("gantt bar geometry", () => {
  it("single-day task spans one dayWidth", () => {
    const { rows } = computeTaskLayouts([task({ id: "t", start_date: "2026-09-03", end_date: "2026-09-03" })], OPTS);
    expect(rows[0].x).toBe(2 * 32);
    expect(rows[0].width).toBe(32);
  });

  it("duration is inclusive of end date (diffDays + 1)", () => {
    const { rows } = computeTaskLayouts([task({ id: "t", start_date: "2026-09-01", end_date: "2026-09-05" })], OPTS);
    expect(rows[0].width).toBe(5 * 32);
  });

  it("row y follows index * rowHeight", () => {
    const { rows } = computeTaskLayouts([
      task({ id: "a", start_date: "2026-09-01", end_date: "2026-09-02" }),
      task({ id: "b", start_date: "2026-09-01", end_date: "2026-09-02" }),
    ], OPTS);
    expect(rows[0].y).toBe(0);
    expect(rows[1].y).toBe(48);
  });

  it("milestone has zero width and end = start", () => {
    const { rows } = computeTaskLayouts([task({ id: "m", is_milestone: true, start_date: "2026-09-04" })], OPTS);
    expect(rows[0].width).toBe(0);
    expect(rows[0].end!.getTime()).toBe(rows[0].start!.getTime());
    expect(rows[0].x).toBe(3 * 32);
  });

  it("task without dates keeps a row with no bar", () => {
    const { rows } = computeTaskLayouts([task({ id: "t" }), task({ id: "u", start_date: "2026-09-01", end_date: "2026-09-01" })], OPTS);
    expect(rows[0].x).toBe(0);
    expect(rows[0].width).toBe(0);
    expect(rows[0].start).toBeNull();
    expect(rows).toHaveLength(2);
  });
});

describe("gantt summary rollup", () => {
  it("aggregates leaf descendant dates (min start / max end)", () => {
    const { rows, tree } = computeTaskLayouts([
      task({ id: "p", is_summary: true }),
      task({ id: "a", parent_id: "p", start_date: "2026-09-03", end_date: "2026-09-05" }),
      task({ id: "b", parent_id: "p", start_date: "2026-09-10", end_date: "2026-09-12" }),
    ], OPTS);
    expect(rows[0].x).toBe(2 * 32);
    expect(rows[0].width).toBe(10 * 32);
    expect(tree.summaryRanges.get("p")).toEqual({
      start: parseDate("2026-09-03")!,
      end: parseDate("2026-09-12")!,
    });
  });

  it("collapsible state does not affect summary rollup (collapsed subtree)", () => {
    const { tree } = computeTaskLayouts([
      task({ id: "p", is_summary: true, is_expanded: false }),
      task({ id: "a", parent_id: "p", start_date: "2026-09-06", end_date: "2026-09-08" }),
    ], OPTS);
    expect(tree.summaryRanges.get("p")?.end.getDate()).toBe(8);
  });

  it("nested summary rolls up through levels", () => {
    const { rows } = computeTaskLayouts([
      task({ id: "top", is_summary: true }),
      task({ id: "mid", is_summary: true, parent_id: "top" }),
      task({ id: "leaf", parent_id: "mid", start_date: "2026-09-07", end_date: "2026-09-09" }),
    ], OPTS);
    expect(rows[0].width).toBe(3 * 32);
    expect(rows[1].width).toBe(3 * 32);
  });
});

describe("gantt real bars / progress", () => {
  it("real bar geometry offsets below planned bar", () => {
    const { rows } = computeTaskLayouts([
      task({ id: "t", start_date: "2026-09-01", end_date: "2026-09-05", real_start_date: "2026-09-02", real_end_date: "2026-09-04" }),
    ], OPTS);
    expect(rows[0].realX).toBe(1 * 32);
    expect(rows[0].realWidth).toBe(3 * 32);
    const plannedTop = rows[0].y + (48 - BAR_HEIGHT) / 2;
    expect(rows[0].realY).toBe(plannedTop + BAR_HEIGHT - REAL_HEIGHT + 2);
  });

  it("no real bar without real dates", () => {
    const { rows } = computeTaskLayouts([task({ id: "t", start_date: "2026-09-01", end_date: "2026-09-02" })], OPTS);
    expect(rows[0].realWidth).toBe(0);
    expect(rows[0].realStart).toBeNull();
  });

  it("progress clamps to [0, 100] and defaults to 0", () => {
    const { rows } = computeTaskLayouts([
      task({ id: "a", start_date: "2026-09-01", progress: -5 }),
      task({ id: "b", start_date: "2026-09-01", progress: 150 }),
      task({ id: "c", start_date: "2026-09-01" }),
    ], OPTS);
    expect(rows.map((r) => r.progress)).toEqual([0, 100, 0]);
  });
});

describe("gantt pixel conversion / range", () => {
  it("dateToPixels/pixelsToDate round trip", () => {
    const d = parseDate("2026-09-04")!;
    const px = dateToPixels(d, RS, 32);
    expect(px).toBe(3 * 32);
    const back = pixelsToDate(px, RS, 32);
    expect(back.getTime()).toBe(d.getTime());
  });

  it("pixelsToDate rounds fractional px to nearest day", () => {
    expect(pixelsToDate(40, RS, 32).getDate()).toBe(2); // 1.25 天 → 9/2
    expect(pixelsToDate(-32, RS, 32).getDate()).toBe(31); // 8/31
  });

  it("getVisibleRange unions own + real dates with padding", () => {
    const r = getVisibleRange([
      task({ id: "a", start_date: "2026-09-03", end_date: "2026-09-08" }),
      task({ id: "b", start_date: "2026-09-20", end_date: "2026-09-21", real_start_date: "2026-09-15" }),
    ], null, 2);
    expect(r.start.getDate()).toBe(1); // 9/3 - 2
    expect(r.end.getDate()).toBe(23); // 9/21 + 2
  });

  it("getVisibleRange includes injected today", () => {
    const r = getVisibleRange(
      [task({ id: "a", start_date: "2026-09-03", end_date: "2026-09-05" })],
      parseDate("2026-10-01")!,
      2,
    );
    expect(r.end.getDate()).toBe(3); // 10/1 + 2
  });

  it("getVisibleRange falls back to today-9 .. today+32 without dates", () => {
    const today = parseDate("2026-09-15")!;
    const r = getVisibleRange([], today, 2);
    expect(r.start.getDate()).toBe(6); // 9/15 - 7 - 2
    expect(r.end.getDate()).toBe(17); // 9/15 + 30 + 2
  });
});
