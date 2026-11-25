// Test: z-gantt 四视图双层刻度（day/week/month/quarter 对齐、today/weekend 标记）
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import { DEFAULT_DAY_WIDTH, generateTimelineHeaderData } from "../../../src/report/gantt/timeline";
import { parseDate } from "../../../src/report/gantt/date";

const TODAY = parseDate("2026-09-15")!;

describe("gantt timeline day view", () => {
  it("produces one bottom tick per day with dayWidth geometry", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-07")!, "day", 32, TODAY);
    expect(h.bottom).toHaveLength(7);
    expect(h.totalWidth).toBe(7 * 32);
    expect(h.bottom[0].left).toBe(0);
    expect(h.bottom[1].left).toBe(32);
    expect(h.bottom[0].width).toBe(32);
  });

  it("labels bottom ticks with day numbers", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-03")!, "day", 32, TODAY);
    expect(h.bottom.map((t) => t.label)).toEqual(["1", "2", "3"]);
  });

  it("flags weekend columns in day view (2026-09-05 Sat / 09-06 Sun)", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-07")!, "day", 32, TODAY);
    expect(h.bottom[4].isWeekend).toBe(true);
    expect(h.bottom[5].isWeekend).toBe(true);
    expect(h.bottom[0].isWeekend).toBe(false);
  });

  it("groups top ticks by month with aggregated width", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-07")!, "day", 32, TODAY);
    expect(h.top).toHaveLength(1);
    expect(h.top[0].label).toBe("2026-09");
    expect(h.top[0].width).toBe(7 * 32);
  });

  it("flags the bottom tick containing today", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-10")!, parseDate("2026-09-20")!, "day", 32, TODAY);
    const todayTick = h.bottom.find((t) => t.isToday);
    expect(todayTick?.label).toBe("15");
  });

  it("aligns first column to period start (left can be negative)", () => {
    // 2026-09-01 是周二，day 视图起点即当天 → left 0；换周视图验证负 left
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-02")!, "day", 32, TODAY);
    expect(h.bottom[0].left).toBe(0);
  });
});

describe("gantt timeline week view", () => {
  it("aligns bottom ticks to Monday and spans 7 days", () => {
    // 2026-09-01 周二 → 首列 2026-08-31（周一），left = -1*12
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-13")!, "week", 12, TODAY);
    expect(h.bottom).toHaveLength(2);
    expect(h.bottom[0].width).toBe(7 * 12);
    expect(h.bottom[0].left).toBe(-12);
    expect(h.bottom[1].label).toBe("9/7");
  });

  it("groups top ticks by the month of each week start", () => {
    const h = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-13")!, "week", 12, TODAY);
    expect(h.top.map((t) => t.label)).toEqual(["2026-08", "2026-09"]);
    expect(h.top[0].width).toBe(84);
    expect(h.top[1].width).toBe(84);
  });
});

describe("gantt timeline month view", () => {
  it("produces month columns with natural-day widths", () => {
    const h = generateTimelineHeaderData(parseDate("2026-08-20")!, parseDate("2026-10-10")!, "month", 4, TODAY);
    expect(h.bottom.map((t) => t.label)).toEqual(["8", "9", "10"]);
    expect(h.bottom[0].width).toBe(31 * 4); // Aug
    expect(h.bottom[1].width).toBe(30 * 4); // Sep
    expect(h.bottom[2].width).toBe(31 * 4); // Oct
  });

  it("groups top ticks by year", () => {
    const h = generateTimelineHeaderData(parseDate("2026-08-20")!, parseDate("2026-10-10")!, "month", 4, TODAY);
    expect(h.top).toHaveLength(1);
    expect(h.top[0].label).toBe("2026");
    expect(h.top[0].width).toBe(h.totalWidth);
  });

  it("no weekend flags in month view", () => {
    const h = generateTimelineHeaderData(parseDate("2026-08-20")!, parseDate("2026-10-10")!, "month", 4, TODAY);
    expect(h.bottom.every((t) => !t.isWeekend)).toBe(true);
  });
});

describe("gantt timeline quarter view", () => {
  it("produces quarter columns (Q1 90d / Q2 91d in 2026)", () => {
    const h = generateTimelineHeaderData(parseDate("2026-01-15")!, parseDate("2026-07-02")!, "quarter", 2, TODAY);
    expect(h.bottom.map((t) => t.label)).toEqual(["Q1", "Q2", "Q3"]);
    expect(h.bottom[0].width).toBe(90 * 2);
    expect(h.bottom[1].width).toBe(91 * 2);
  });

  it("flags today inside quarter columns", () => {
    const h = generateTimelineHeaderData(parseDate("2026-01-15")!, parseDate("2026-07-02")!, "quarter", 2, TODAY);
    const todayTick = h.bottom.find((t) => t.isToday);
    expect(todayTick?.label).toBe("Q3");
  });
});

describe("gantt timeline misc", () => {
  it("totalWidth equals sum of bottom widths", () => {
    const h = generateTimelineHeaderData(parseDate("2026-08-20")!, parseDate("2026-10-10")!, "month", 4, TODAY);
    expect(h.totalWidth).toBe(h.bottom.reduce((s, t) => s + t.width, 0));
  });

  it("returns empty header for inverted range or bad dayWidth", () => {
    const inv = generateTimelineHeaderData(parseDate("2026-09-10")!, parseDate("2026-09-01")!, "day", 32, TODAY);
    expect(inv.bottom).toHaveLength(0);
    expect(inv.totalWidth).toBe(0);
    const bad = generateTimelineHeaderData(parseDate("2026-09-01")!, parseDate("2026-09-10")!, "day", 0, TODAY);
    expect(bad.bottom).toHaveLength(0);
  });

  it("exposes per-view default day widths", () => {
    expect(DEFAULT_DAY_WIDTH).toEqual({ day: 32, week: 12, month: 4, quarter: 2 });
  });
});
