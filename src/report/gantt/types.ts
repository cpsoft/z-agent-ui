// [WHY] z-gantt 全部类型定义集中于此：数据模型对齐参考仓库 z-gantt（E:\Temp\z-gantt-ref），
// 布局/渲染/手势类型供 layout/chart-render/arrows/drag-controller 共享。
// See: wiki/requirements/REQ-018-gantt.md
import type { CellSpec } from "../core/cell-spec.js";

/** 任务数据：未知字段经索引签名透传，修改时浅拷贝保留原引用（不丢业务字段） */
export interface ZGanttTask {
  id: string;
  parent_id?: string;
  name: string;
  /** "YYYY-MM-DD"，本地时区语义 */
  start_date?: string;
  /** 含尾日：duration = diffDays(start, end) + 1 */
  end_date?: string;
  real_start_date?: string;
  real_end_date?: string;
  /** 0-100 */
  progress?: number;
  is_milestone?: boolean;
  is_summary?: boolean;
  /** undefined 视为展开 */
  is_expanded?: boolean;
  sort_order?: number;
  color?: string;
  /**
   * 条内内容槽：自定义元素标签名，替换条上的默认标签（名字 + 天数徽标）。
   *
   * [WHY 挂在任务上而不是元素属性] 条内要画什么常常随任务性质变（风险条挂告警图标、
   * 里程碑挂负责人头像），按任务声明才不需要「先按类型分组再逐条覆盖」。
   * 与 `color` 同一个位置 —— 它也是逐任务的。
   *
   * 只放**展示型**内容：右侧时间轴整体是 `aria-hidden`，放进去的按钮键盘不可达；
   * 条上的拖拽/改期手势归容器，内容不要自己拦 pointerdown。
   */
  barTag?: string;
  [key: string]: unknown;
}

export type ZGanttDependencyType = "FS" | "SS" | "FF" | "SF";

export interface ZGanttDependency {
  predecessor_id: string;
  successor_id: string;
  type: ZGanttDependencyType;
  lag_days?: number;
}

export interface ZGanttData {
  tasks: ZGanttTask[];
  dependencies?: ZGanttDependency[];
}

export type ZGanttViewMode = "day" | "week" | "month" | "quarter";

/**
 * 左列表列定义 = 公共契约 `CellSpec`。
 *
 * [WHY 2026-11-23 L2-P1 合并] 原来是与表格平行的第二套定义（key/title/width/align）。
 * 两套定义的代价不是多几行：加字段、改默认宽都要改两处，漏一处不报错。
 * 现成的漂移例子 —— 表格有 format 体系，甘特没有，所以 `progress` 列只能自己拼 `%` 字符串。
 * 合并后甘特左列与表格列共用同一份契约，P3/P6 的内容槽（cellTag）只加一遍。
 */
export type GanttListColumn = CellSpec;

// ── 事件 detail ─────────────────────────────────────────

export interface ZGanttChangeDetail {
  tasks: ZGanttTask[];
  dependencies: ZGanttDependency[];
  /** 本次提交发生变更的任务 id */
  changed: string[];
}

export interface ZGanttSelectDetail {
  id: string;
  task: ZGanttTask;
}

export interface ZGanttMenuDetail {
  id: string;
  task: ZGanttTask;
}

export interface ZGanttViewChangeDetail {
  mode: ZGanttViewMode;
}

export interface ZGanttExpandDetail {
  id: string;
  expanded: boolean;
}

export interface ZGanttConnectDetail {
  predecessor_id: string;
  successor_id: string;
  type: ZGanttDependencyType;
}

// ── 时间轴刻度 ─────────────────────────────────────────

export interface TimelineTick {
  /** 刻度起点（本地零点） */
  date: Date;
  label: string;
  /** 相对时间轴原点的 px */
  left: number;
  width: number;
  /** 仅 day 视图周末列 */
  isWeekend?: boolean;
  /** 刻度区间包含 today */
  isToday?: boolean;
}

export interface TimelineHeaderData {
  /** 外层刻度（day/week → 月；month/quarter → 年） */
  top: TimelineTick[];
  /** 内层刻度（day/week/month/quarter 各自粒度） */
  bottom: TimelineTick[];
  totalWidth: number;
  rangeStart: Date;
  rangeEnd: Date;
}

// ── 布局 ───────────────────────────────────────────────

/** 展平后的可见行（depth-first，祖先全展开才可见） */
export interface FlatRow {
  task: ZGanttTask;
  depth: number;
}

/** 任务条形几何（含计划/实际双条），x/width 均为 px */
export interface TaskLayout {
  task: ZGanttTask;
  depth: number;
  /** 行号（可见序） */
  index: number;
  /** 计划条 */
  x: number;
  width: number;
  /** 行顶部 y = index * rowHeight */
  y: number;
  /** 实际条（无实际日期时 width=0） */
  realX: number;
  realWidth: number;
  realY: number;
  realHeight: number;
  /** clamp 后的进度 0-100 */
  progress: number;
  start: Date | null;
  end: Date | null;
  realStart: Date | null;
  realEnd: Date | null;
  isSummary: boolean;
  isMilestone: boolean;
}

/** 树结构缓存：buildTree 产物，供布局/箭头/手势复用 */
export interface GanttTree {
  rows: FlatRow[];
  byId: Map<string, ZGanttTask>;
  childrenOf: Map<string, ZGanttTask[]>;
  /** summary 任务 → 子叶聚合日期（无子叶日期时为 null） */
  summaryRanges: Map<string, { start: Date; end: Date } | null>;
}

// ── 手势（M3） ─────────────────────────────────────────

export type ZGanttDragMode = "move" | "resize-start" | "resize-end" | "progress" | "connect";
