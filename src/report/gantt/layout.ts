// [WHY] 树构建 + 可见行展平 + 条形几何计算：布局唯一数据源。左右两栏的行数、
// 行号、行高全部由 computeTaskLayouts 的 rows 派生，展开/折叠走同一次 render，
// 杜绝行错位（计划风险 3）。
// 算法对齐参考仓库 gantt.ts computeTaskLayouts：含尾日 duration（diffDays+1）、
// summary 递归汇总子叶日期、BAR_PADDING/双条几何常量。
// See: wiki/requirements/REQ-018-gantt.md
import type { FlatRow, GanttTree, TaskLayout, ZGanttTask } from "./types.js";
import { addDays, diffDays, parseDate } from "./date.js";

/** 计划条高 px */
export const BAR_HEIGHT = 24;
/** 实际条高 px（叠在计划条下方） */
export const REAL_HEIGHT = 14;

export interface LayoutOptions {
  rangeStart: Date;
  dayWidth: number;
  rowHeight: number;
}

export interface LayoutResult {
  rows: TaskLayout[];
  tree: GanttTree;
}

function sortKey(t: ZGanttTask, orderOf: Map<ZGanttTask, number>): [number, number] {
  return [
    typeof t.sort_order === "number" ? t.sort_order : Number.POSITIVE_INFINITY,
    orderOf.get(t) ?? 0,
  ];
}

function ownDates(t: ZGanttTask): { start: Date; end: Date } | null {
  const s = parseDate(t.start_date);
  if (!s) return null;
  const e = t.is_milestone ? s : parseDate(t.end_date) ?? s;
  return { start: s, end: e };
}

/**
 * 构建 id 索引 / 父子表 / summary 汇总 / 可见行。
 * - id 重复时首个生效，后续跳过
 * - parent_id 指向不存在任务或成环时按根处理（环任务不可达即不可见）
 * - children 与 roots 均按 sort_order 升序（缺省按原顺序，稳定排序）
 */
export function buildTree(tasks: ZGanttTask[]): GanttTree {
  const byId = new Map<string, ZGanttTask>();
  for (const t of tasks) {
    if (t && t.id != null && !byId.has(t.id)) byId.set(t.id, t);
  }
  const orderOf = new Map<ZGanttTask, number>();
  tasks.forEach((t, i) => orderOf.set(t, i));
  const cmp = (a: ZGanttTask, b: ZGanttTask): number => {
    const ka = sortKey(a, orderOf);
    const kb = sortKey(b, orderOf);
    return ka[0] - kb[0] || ka[1] - kb[1];
  };

  const childrenOf = new Map<string, ZGanttTask[]>();
  const roots: ZGanttTask[] = [];
  // [WHY] id 重复时首个生效：roots 遍历同样跳过后续重复，避免同一任务渲染两行
  const seen = new Set<string>();
  for (const t of tasks) {
    if (t && t.id != null) {
      if (seen.has(t.id)) continue;
      seen.add(t.id);
    }
    const pid = t?.parent_id;
    if (pid && pid !== t.id && byId.has(pid)) {
      if (!childrenOf.has(pid)) childrenOf.set(pid, []);
      childrenOf.get(pid)!.push(t);
    } else {
      roots.push(t);
    }
  }
  for (const list of childrenOf.values()) list.sort(cmp);
  roots.sort(cmp);

  // [WHY] summary 汇总必须在展平前完成：折叠状态下 summary 条仍需覆盖全部子叶范围
  const summaryRanges = new Map<string, { start: Date; end: Date } | null>();
  const inProgress = new Set<string>();
  const aggregate = (t: ZGanttTask): { start: Date; end: Date } | null => {
    const cached = summaryRanges.get(t.id);
    if (cached !== undefined) return cached;
    if (inProgress.has(t.id)) return null;
    inProgress.add(t.id);
    let minS: Date | null = null;
    let maxE: Date | null = null;
    for (const k of childrenOf.get(t.id) ?? []) {
      const r = k.is_summary ? aggregate(k) : ownDates(k);
      if (r) {
        if (!minS || r.start < minS) minS = r.start;
        if (!maxE || r.end > maxE) maxE = r.end;
      }
    }
    inProgress.delete(t.id);
    const result = minS && maxE ? { start: minS, end: maxE } : null;
    summaryRanges.set(t.id, result);
    return result;
  };
  for (const t of tasks) {
    if (t?.is_summary) aggregate(t);
  }

  const rows: FlatRow[] = [];
  const walk = (list: ZGanttTask[], depth: number): void => {
    for (const t of list) {
      rows.push({ task: t, depth });
      const kids = childrenOf.get(t.id);
      if (kids && kids.length && t.is_expanded !== false) walk(kids, depth + 1);
    }
  };
  walk(roots, 0);

  return { rows, byId, childrenOf, summaryRanges };
}

/**
 * 计算全部可见行的条形几何，与 tree.rows 同序同长。
 * 无日期任务仍占一行（x/width=0，左列表可见、右侧无条形）。
 */
export function computeTaskLayouts(tasks: ZGanttTask[], opts: LayoutOptions): LayoutResult {
  const tree = buildTree(tasks);
  const { rangeStart, dayWidth, rowHeight } = opts;
  const rows: TaskLayout[] = tree.rows.map((r, i) => {
    const t = r.task;
    const y = i * rowHeight;
    let start: Date | null;
    let end: Date | null;
    if (t.is_summary) {
      const agg = tree.summaryRanges.get(t.id) ?? null;
      if (agg) {
        start = agg.start;
        end = agg.end;
      } else {
        const own = ownDates(t);
        start = own?.start ?? null;
        end = own?.end ?? null;
      }
    } else {
      const own = ownDates(t);
      start = own?.start ?? null;
      end = own?.end ?? null;
    }
    // milestone：end = start，宽度 0（渲染层画菱形）
    if (start && t.is_milestone) end = start;

    let x = 0;
    let width = 0;
    if (start && end) {
      x = dateToPixels(start, rangeStart, dayWidth);
      width = t.is_milestone ? 0 : Math.max(diffDays(start, end) + 1, 1) * dayWidth;
    }

    const realStart = parseDate(t.real_start_date);
    const realEnd = t.is_milestone ? realStart : parseDate(t.real_end_date) ?? realStart;
    const realX = realStart ? dateToPixels(realStart, rangeStart, dayWidth) : 0;
    const realWidth =
      realStart && realEnd ? Math.max(diffDays(realStart, realEnd) + 1, 1) * dayWidth : 0;

    const plannedTop = y + (rowHeight - BAR_HEIGHT) / 2;
    return {
      task: t,
      depth: r.depth,
      index: i,
      x,
      width,
      y,
      realX,
      realWidth,
      realY: plannedTop + BAR_HEIGHT - REAL_HEIGHT + 2,
      realHeight: REAL_HEIGHT,
      progress: clampProgress(t.progress),
      start,
      end,
      realStart,
      realEnd: realStart ? realEnd : null,
      isSummary: !!t.is_summary,
      isMilestone: !!t.is_milestone,
    };
  });
  return { rows, tree };
}

function clampProgress(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** 日期 → 相对时间轴原点 px（当天列左缘） */
export function dateToPixels(date: Date, rangeStart: Date, dayWidth: number): number {
  return diffDays(rangeStart, date) * dayWidth;
}

/** px → 日期（最近整天；拖拽落点由 drag-controller 决定是否 snapToWorkingDay） */
export function pixelsToDate(px: number, rangeStart: Date, dayWidth: number): Date {
  return addDays(rangeStart, Math.round(px / dayWidth));
}

/**
 * 数据全集的日期范围（取各任务自身日期 + 实际日期的并集，不含 summary 汇总）。
 * today 提供时并入范围（today 线始终可见）；两侧各留 padDays 呼吸空间。
 * 无任何日期时回退 today-7 .. today+30。
 */
export function getVisibleRange(
  tasks: ZGanttTask[],
  today?: Date | null,
  padDays = 2,
): { start: Date; end: Date } {
  let min: Date | null = null;
  let max: Date | null = null;
  const consider = (s: Date | null, e: Date | null): void => {
    if (s && (!min || s.getTime() < min.getTime())) min = s;
    if (e && (!max || e.getTime() > max.getTime())) max = e;
  };
  for (const t of tasks) {
    if (!t) continue;
    const own = ownDates(t);
    if (own) consider(own.start, own.end);
    const rs = parseDate(t.real_start_date);
    const re = rs ? parseDate(t.real_end_date) ?? rs : null;
    if (rs) consider(rs, re);
  }
  const todayD = today ?? null;
  // [WHY] today 仅在有真实日期时并入范围：无日期场景走居中回退（自身已含 today），
  // 否则 consider(today) 会让无日期回退分支永不可达
  if (todayD && min && max) consider(todayD, todayD);
  if (!min || !max) {
    const base = todayD ?? new Date();
    const s = addDays(base, -7);
    return { start: addDays(s, -padDays), end: addDays(base, 30 + padDays) };
  }
  return { start: addDays(min, -padDays), end: addDays(max, padDays) };
}
