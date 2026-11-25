// [WHY] 四视图双层刻度生成（day/week/month/quarter）：纯函数，today 以参数注入
// 保证测试确定性（参考仓库内部 new Date() 不可测，此处规避）。
// 布局由 dayWidth（px/天）单一驱动：列宽 = 列内天数 × dayWidth，月/季度列
// 宽随自然天数浮动（28-31 天），条形几何与刻度列天然对齐。
// See: wiki/requirements/REQ-018-gantt.md
import type { TimelineHeaderData, TimelineTick, ZGanttViewMode } from "./types.js";
import {
  diffDays,
  isWeekend,
  nextPeriod,
  periodStart,
  startOfDay,
} from "./date.js";

/** 每视图默认 px/天：day 32（日列 32px）/ week 12（周列 84px）/ month 4 / quarter 2 */
export const DEFAULT_DAY_WIDTH: Record<ZGanttViewMode, number> = {
  day: 32,
  week: 12,
  month: 4,
  quarter: 2,
};

function bottomLabel(d: Date, mode: ZGanttViewMode): string {
  switch (mode) {
    case "day":
      return String(d.getDate());
    case "week":
      return `${d.getMonth() + 1}/${d.getDate()}`;
    case "month":
      return String(d.getMonth() + 1);
    case "quarter":
      return `Q${Math.floor(d.getMonth() / 3) + 1}`;
  }
}

function topLabel(d: Date, mode: ZGanttViewMode): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  // day/week 视图外层按月分组；month/quarter 按年
  return mode === "day" || mode === "week" ? `${y}-${m}` : String(y);
}

function topGroupKey(d: Date, mode: ZGanttViewMode): string {
  return mode === "day" || mode === "week"
    ? `${d.getFullYear()}-${d.getMonth()}`
    : String(d.getFullYear());
}

/**
 * 生成双层刻度。rangeStart/rangeEnd 为数据范围（未对齐），内部对齐到周期起点，
 * 因此首列 left 可能为负（刻度向左越过时间轴原点），属预期。
 */
export function generateTimelineHeaderData(
  rangeStart: Date,
  rangeEnd: Date,
  viewMode: ZGanttViewMode,
  dayWidth: number,
  today: Date,
): TimelineHeaderData {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const empty: TimelineHeaderData = {
    top: [],
    bottom: [],
    totalWidth: 0,
    rangeStart: start,
    rangeEnd: end,
  };
  if (end.getTime() < start.getTime() || dayWidth <= 0) return empty;

  const todayT = startOfDay(today).getTime();
  const bottom: TimelineTick[] = [];
  let cur = periodStart(start, viewMode);
  let guard = 0;
  // [WHY] guard 防御非法输入导致的死循环（如 dayWidth 异常 / 区间超大）
  while (cur.getTime() <= end.getTime() && guard < 100000) {
    const next = nextPeriod(cur, viewMode);
    bottom.push({
      date: cur,
      label: bottomLabel(cur, viewMode),
      left: diffDays(start, cur) * dayWidth,
      width: diffDays(cur, next) * dayWidth,
      isWeekend: viewMode === "day" ? isWeekend(cur) : undefined,
      isToday: todayT >= cur.getTime() && todayT < next.getTime() ? true : undefined,
    });
    cur = next;
    guard++;
  }
  if (!bottom.length) return empty;

  // 外层刻度：相邻 bottom 列按 groupKey 聚合（left 取首列，width 求和）
  const top: TimelineTick[] = [];
  for (const tick of bottom) {
    const key = topGroupKey(tick.date, viewMode);
    const last = top[top.length - 1];
    if (last && topGroupKey(last.date, viewMode) === key) {
      last.width += tick.width;
    } else {
      top.push({ date: tick.date, label: topLabel(tick.date, viewMode), left: tick.left, width: tick.width });
    }
  }

  return {
    top,
    bottom,
    totalWidth: bottom.reduce((s, t) => s + t.width, 0),
    rangeStart: start,
    rangeEnd: end,
  };
}
