// [WHY] 纯函数日期工具：甘特图全部日期运算的唯一入口。
// 时区关键点："YYYY-MM-DD" 直接 new Date(str) 按 UTC 解析，东八区倒退一天
//（参考仓库 date.ts 以追加 "T00:00:00" 规避）；这里改为正则取 y/m/d 构造本地
// 零点，语义等价且不依赖字符串解析分支。
// See: wiki/requirements/REQ-018-gantt.md
import type { ZGanttViewMode } from "./types.js";

const MS_PER_DAY = 86400000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const da = Number(m[3]);
  if (mo < 0 || mo > 11 || da < 1 || da > 31) return null;
  const d = new Date(y, mo, da);
  // [WHY] 回读校验拦截 2/30 等自然溢出（new Date 会静默滚到下月）
  if (d.getFullYear() !== y || d.getMonth() !== mo || d.getDate() !== da) return null;
  return d;
}

/** 手动拼 "YYYY-MM-DD"，不用 toISOString（会走 UTC 偏移一天） */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

/** b - a 的整天数；Math.round 抵消 DST 的 ±1h（23/25h 天） */
export function diffDays(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / MS_PER_DAY);
}

export function isWeekend(d: Date): boolean {
  const w = d.getDay();
  return w === 0 || w === 6;
}

/** [WHY] 拖拽落点吸附：周末顺延到周一（隐藏周末模式下保持工作日语义） */
export function snapToWorkingDay(d: Date): Date {
  const w = d.getDay();
  if (w === 6) return addDays(d, 2);
  if (w === 0) return addDays(d, 1);
  return d;
}

/** 周一为一周起点 */
export function startOfWeek(d: Date): Date {
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function startOfQuarter(d: Date): Date {
  return new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1);
}

/** 加 n 个月，钳到目标月末日（1/31 + 1月 → 2/28） */
export function addMonths(d: Date, n: number): Date {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const target = new Date(y, m, 1);
  const dim = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), dim));
}

export function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

export function clampDate(d: Date, min: Date, max: Date): Date {
  const t = startOfDay(d).getTime();
  const lo = startOfDay(min).getTime();
  const hi = startOfDay(max).getTime();
  const clamped = Math.min(Math.max(t, lo), hi);
  return new Date(clamped);
}

export function todayStart(): Date {
  return startOfDay(new Date());
}

/** 视图周期对齐起点（week 视图对齐周一，可能早于 rangeStart） */
export function periodStart(d: Date, mode: ZGanttViewMode): Date {
  switch (mode) {
    case "week":
      return startOfWeek(d);
    case "month":
      return startOfMonth(d);
    case "quarter":
      return startOfQuarter(d);
    default:
      return startOfDay(d);
  }
}

/** 周期序列推进一格（月/季度落到下一周期首日） */
export function nextPeriod(d: Date, mode: ZGanttViewMode): Date {
  switch (mode) {
    case "week":
      return addDays(d, 7);
    case "month":
      return new Date(d.getFullYear(), d.getMonth() + 1, 1);
    case "quarter":
      return new Date(d.getFullYear(), d.getMonth() + 3, 1);
    default:
      return addDays(d, 1);
  }
}
