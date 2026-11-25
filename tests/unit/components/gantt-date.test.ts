// Test: z-gantt 日期纯函数（时区/含尾日/周期对齐/周末）
// Related: [[REQ-018-gantt]]
// Wiki: wiki/requirements/REQ-018-gantt.md
// Date: 2026-09-26
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import {
  addDays,
  addMonths,
  clampDate,
  diffDays,
  formatDate,
  isWeekend,
  nextPeriod,
  parseDate,
  snapToWorkingDay,
  startOfWeek,
} from "../../../src/report/gantt/date";

describe("gantt date parseDate/formatDate", () => {
  it("parses YYYY-MM-DD to local midnight", () => {
    const d = parseDate("2026-09-15")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(0);
  });

  it("does not shift a day across timezones (UTC-parse pitfall)", () => {
    // [WHY] new Date("2026-09-15") 按 UTC 解析，东八区倒退一天；正则方案规避
    const d = parseDate("2026-01-01")!;
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(0);
  });

  it("returns null for empty/invalid input", () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate("")).toBeNull();
    expect(parseDate("not-a-date")).toBeNull();
    expect(parseDate("2026-13-40")).toBeNull();
  });

  it("formats with zero padding", () => {
    expect(formatDate(new Date(2026, 8, 5))).toBe("2026-09-05");
    expect(formatDate(new Date(2026, 11, 31))).toBe("2026-12-31");
  });
});

describe("gantt date arithmetic", () => {
  it("addDays crosses month and year", () => {
    expect(formatDate(addDays(new Date(2026, 8, 30), 1))).toBe("2026-10-01");
    expect(formatDate(addDays(new Date(2025, 11, 31), 1))).toBe("2026-01-01");
  });

  it("diffDays is 0 for same day and inclusive-friendly", () => {
    expect(diffDays(new Date(2026, 8, 10), new Date(2026, 8, 10))).toBe(0);
    expect(diffDays(new Date(2026, 8, 10), new Date(2026, 8, 12))).toBe(2);
    expect(diffDays(new Date(2026, 8, 12), new Date(2026, 8, 10))).toBe(-2);
  });

  it("isWeekend flags sat/sun only", () => {
    expect(isWeekend(new Date(2026, 8, 12))).toBe(true); // Sat
    expect(isWeekend(new Date(2026, 8, 13))).toBe(true); // Sun
    expect(isWeekend(new Date(2026, 8, 9))).toBe(false); // Wed
  });

  it("snapToWorkingDay moves weekend forward to Monday", () => {
    expect(formatDate(snapToWorkingDay(new Date(2026, 8, 12)))).toBe("2026-09-14");
    expect(formatDate(snapToWorkingDay(new Date(2026, 8, 13)))).toBe("2026-09-14");
    expect(formatDate(snapToWorkingDay(new Date(2026, 8, 9)))).toBe("2026-09-09");
  });

  it("startOfWeek aligns to Monday (Sunday rolls back)", () => {
    // 2026-09-13 是周日 → 周一 2026-09-07
    expect(formatDate(startOfWeek(new Date(2026, 8, 13)))).toBe("2026-09-07");
    // 2026-09-09 是周三 → 同周周一
    expect(formatDate(startOfWeek(new Date(2026, 8, 9)))).toBe("2026-09-07");
  });

  it("addMonths clamps overflow day (Jan 31 + 1 → Feb 28)", () => {
    const d = addMonths(new Date(2026, 0, 31), 1);
    expect(d.getMonth()).toBe(1);
    expect(d.getDate()).toBe(28);
  });

  it("clampDate restricts to [min, max]", () => {
    const min = new Date(2026, 0, 10);
    const max = new Date(2026, 0, 20);
    expect(formatDate(clampDate(new Date(2026, 0, 5), min, max))).toBe("2026-01-10");
    expect(formatDate(clampDate(new Date(2026, 0, 25), min, max))).toBe("2026-01-20");
    expect(formatDate(clampDate(new Date(2026, 0, 15), min, max))).toBe("2026-01-15");
  });
});

describe("gantt period alignment", () => {
  it("nextPeriod advances day/week/month/quarter", () => {
    expect(formatDate(nextPeriod(new Date(2026, 8, 9), "day"))).toBe("2026-09-10");
    expect(formatDate(nextPeriod(new Date(2026, 8, 7), "week"))).toBe("2026-09-14");
    expect(formatDate(nextPeriod(new Date(2026, 8, 9), "month"))).toBe("2026-10-01");
    expect(formatDate(nextPeriod(new Date(2026, 8, 9), "quarter"))).toBe("2026-12-01");
  });
});
