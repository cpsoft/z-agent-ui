// [WHY] 拖拽手势纯状态机（非 Element 类，可脱离 DOM 单测）：平移/起止缩放/
// 进度/连线四手势。拖拽期零 requestUpdate —— update() 只返回 px 级预览由
// Gantt 直写 style/path.d；end() 一次提交日期/进度/依赖字段，Gantt 落模型。
// See: wiki/requirements/REQ-018-gantt.md
import { addDays, diffDays, formatDate, parseDate, snapToWorkingDay } from "./date.js";
import type { ZGanttDependencyType, ZGanttDragMode } from "./types.js";

/** 最小条形宽度 = 1 天 */
const MIN_BAR_PX_FACTOR = 1;

export interface DragGeometry {
  rangeStart: Date;
  dayWidth: number;
  rowHeight: number;
  /** body 视口左缘相对 host 的 x（换算 pointer → 时间轴 px 用） */
  chartLeft: number;
  /** 网格顶缘相对 host 的 y（行定位/连线坐标用） */
  gridTop: number;
  scrollLeft: number;
}

export interface DragTarget {
  mode: ZGanttDragMode;
  taskId: string;
  /** 被拖条形几何（chart 坐标 px） */
  barX: number;
  barWidth: number;
  /** 条形中心 y（grid 坐标，连线锚点用） */
  barCenterY: number;
  startDate: string | null;
  endDate: string | null;
  progress: number;
  isMilestone: boolean;
  /** true = 拖的是实际条（提交 real_*_date 字段） */
  isReal: boolean;
  /** show-weekends=false 时落点吸附工作日 */
  snapWeekends: boolean;
  /** 连线落点解析：grid y → 目标行几何；null = 空白 */
  rowAt: (gridY: number) => { id: string; barX: number; barWidth: number } | null;
}

/** host 坐标 pointer */
export interface DragPointer {
  x: number;
  y: number;
}

export interface DragPreview {
  mode: ZGanttDragMode;
  taskId: string;
  /** 条形渲染覆盖（chart 坐标 px；progress 模式返回原值） */
  left: number;
  width: number;
  /** progress 模式内条宽度 %，其余 null */
  progressPercent: number | null;
  /** 连线临时线（grid 坐标） */
  line: { x1: number; y1: number; x2: number; y2: number } | null;
  moved: boolean;
}

export interface DragCommit {
  mode: ZGanttDragMode;
  taskId: string;
  /** YYYY-MM-DD；isReal=true 时 Gantt 写 real_start_date/real_end_date */
  startDate?: string;
  endDate?: string;
  progress?: number;
  /** 目标条为实际条（平移实际日期） */
  isReal?: boolean;
  predecessorId?: string;
  successorId?: string;
  connectType?: ZGanttDependencyType;
}

/**
 * 日期类手势（平移 / 改起点 / 改终点）需要的全部输入。
 *
 * [WHY 单独一个窄接口] `DragTarget` 还带着条形几何、连线落点等只有指针才有的字段。
 * 键盘微调只需要「这条任务现在是什么样」—— 用一个只包含这些字段的结构，
 * 拖拽与键盘两条路才能共用同一份换算函数（下面那个），而不是各写一遍日期算法。
 */
export interface DateGestureTarget {
  mode: "move" | "resize-start" | "resize-end";
  taskId: string;
  startDate: string | null;
  endDate: string | null;
  isMilestone: boolean;
  isReal: boolean;
  snapWeekends: boolean;
}

/**
 * 给定「偏移几天」，算出提交载荷。
 *
 * [WHY 从 `_commit()` 里提出来] 拖拽把像素差换算成天数，键盘直接给天数 —— 但**天数
 * 之后的一切**（周末吸附、平移时按原工期重推终点、起点/终点不允许交叉、里程碑/实际条
 * 拒绝缩放）必须只有一份定义。复制一遍的话，两处会随时间漂移，而漂移的症状是
 * 「鼠标拖出来 3 天、键盘敲出来 2 天」这种极难归因的差一。
 *
 * @returns null = 这个手势在目标上不成立（无日期、里程碑缩放、0 天位移…）
 */
export function dateCommitFor(t: DateGestureTarget, days: number): DragCommit | null {
  if (days === 0) return null;
  const mode = t.mode;
  const base = parseDate(t.startDate);
  const endD = parseDate(t.endDate ?? t.startDate ?? "");
  if (!base) return null;
  const snap = (d: Date): Date => (t.snapWeekends ? snapToWorkingDay(d) : d);
  const fmt = (d: Date): string => formatDate(d);

  if (mode === "move") {
    if (t.isMilestone) {
      return { mode, taskId: t.taskId, startDate: fmt(snap(addDays(base, days))), isReal: t.isReal };
    }
    if (!endD) return null;
    // [WHY] 先整体平移、start 吸附周末后按原工期重推 end：start/end 各自
    // 独立 snap 会把跨周末的工期压扁（如 9/3-9/5 平移到周六变 9/7-9/7）
    const dur = diffDays(base, endD);
    const newStart = snap(addDays(base, days));
    // 实际条平移提交 real_*_date、计划条提交 start/end，由 Gantt 按 isReal 映射
    return {
      mode,
      taskId: t.taskId,
      startDate: fmt(newStart),
      endDate: fmt(addDays(newStart, dur)),
      isReal: t.isReal,
    };
  }

  if (mode === "resize-start") {
    if (t.isMilestone || t.isReal || !endD) return null;
    // [WHY] 不用 Math.min：它对 Date 返回毫秒数而非 Date（valueOf 退化）
    const cand = addDays(base, days);
    const newStart = snap(cand < endD ? cand : endD);
    return { mode, taskId: t.taskId, startDate: fmt(newStart), endDate: fmt(endD), isReal: false };
  }

  // resize-end
  if (t.isMilestone || t.isReal) return null;
  const candEnd = addDays(endD ?? base, days);
  const newEnd = snap(candEnd > base ? candEnd : base);
  return { mode, taskId: t.taskId, startDate: fmt(base), endDate: fmt(newEnd), isReal: false };
}

/** 日期类手势（其余两种手势：connect / progress 各自单独提交）。 */
export function isDateMode(mode: ZGanttDragMode): mode is DateGestureTarget["mode"] {
  return mode === "move" || mode === "resize-start" || mode === "resize-end";
}

/** source 锚边 × target 锚边 → 依赖类型 */
function connectTypeOf(sourceSide: "start" | "end", targetSide: "start" | "end"): ZGanttDependencyType {
  if (sourceSide === "end") return targetSide === "start" ? "FS" : "FF";
  return targetSide === "start" ? "SS" : "SF";
}

export class GanttDragController {
  private _geo: DragGeometry | null = null;
  private _target: DragTarget | null = null;
  private _origin: DragPointer | null = null;
  private _last: DragPointer | null = null;
  private _moved = false;
  private _sourceSide: "start" | "end" = "end";

  get active(): boolean {
    return this._target !== null;
  }

  get mode(): ZGanttDragMode | null {
    return this._target?.mode ?? null;
  }

  /**
   * 拖拽期容器自己滚了（边缘自动滚动 / 用户滚轮）：刷新坐标换算基准。
   *
   * [WHY 需要这个方法] 几何是 `begin()` 时的快照 —— 「拖拽期窗口不动」是刻意的，
   * 省掉每帧读布局。但容器一滚，`chartLeft`（body 视口左缘）与 `gridTop`（网格顶缘）
   * 相对 host 就变了，不刷新的话预览会按旧基准画：滚一段之后任务条和指针分家。
   */
  setGeometry(patch: Partial<DragGeometry>): void {
    if (!this._geo) return;
    this._geo = { ...this._geo, ...patch };
  }

  begin(geo: DragGeometry, target: DragTarget, pointer: DragPointer): void {    this._geo = geo;
    this._target = target;
    this._origin = pointer;
    this._last = pointer;
    this._moved = false;
    // 连线锚边：从条形左半出发 → start 锚，右半 → end 锚
    if (target.mode === "connect") {
      const chartX = pointer.x - geo.chartLeft + geo.scrollLeft;
      this._sourceSide = chartX < target.barX + target.barWidth / 2 ? "start" : "end";
    }
  }

  /**
   * 推进手势，返回预览；没在拖动时返回 null。
   *
   * `moved` 由调用方从 `primitives/pointer-drag` 传入 —— 「位移多大算拖动」是
   * 全库统一的一条判据，不该在甘特这里再有第二份（这里原来是 3px 分轴、
   * 流程图是 2px 曼哈顿、图表是 4px）。
   * 缺省 `true`：本方法本来就是「拖拽中收到了一次移动」，只有接原语的那条路径
   * 需要区分「按住还没拖」。
   */
  update(pointer: DragPointer, moved = true): DragPreview | null {
    const t = this._target;
    const g = this._geo;
    if (!t || !g || !this._origin) return null;
    this._last = pointer;
    if (moved) this._moved = true;
    const dx = pointer.x - this._origin.x;
    const chartX = pointer.x - g.chartLeft + g.scrollLeft;
    const gridY = pointer.y - g.gridTop;
    const minBarPx = Math.max(g.dayWidth * MIN_BAR_PX_FACTOR, 1);

    switch (t.mode) {
      case "move": {
        const left = t.barX + dx;
        return { mode: t.mode, taskId: t.taskId, left, width: t.barWidth, progressPercent: null, line: null, moved: this._moved };
      }
      case "resize-start": {
        const left = Math.min(t.barX + dx, t.barX + t.barWidth - minBarPx);
        return { mode: t.mode, taskId: t.taskId, left, width: t.barX + t.barWidth - left, progressPercent: null, line: null, moved: this._moved };
      }
      case "resize-end": {
        return { mode: t.mode, taskId: t.taskId, left: t.barX, width: Math.max(t.barWidth + dx, minBarPx), progressPercent: null, line: null, moved: this._moved };
      }
      case "progress": {
        const pct = t.barWidth > 0 ? ((chartX - t.barX) / t.barWidth) * 100 : 0;
        return {
          mode: t.mode,
          taskId: t.taskId,
          left: t.barX,
          width: t.barWidth,
          progressPercent: Math.min(100, Math.max(0, pct)),
          line: null,
          moved: this._moved,
        };
      }
      case "connect": {
        const x1 = this._sourceSide === "start" ? t.barX : t.barX + t.barWidth;
        return {
          mode: t.mode,
          taskId: t.taskId,
          left: t.barX,
          width: t.barWidth,
          progressPercent: null,
          line: { x1, y1: t.barCenterY, x2: chartX, y2: gridY },
          moved: this._moved,
        };
      }
    }
  }

  /**
   * 结束手势：返回提交载荷；未移动（点击）或连线落点无效时返回 null。
   * 调用后状态复位。
   */
  end(): DragCommit | null {
    const commit = this._commit();
    this.reset();
    return commit;
  }

  /** 中止手势（pointercancel/失焦）：复位且不提交 */
  cancel(): void {
    this.reset();
  }

  private _commit(): DragCommit | null {
    const t = this._target;
    const g = this._geo;
    const o = this._origin;
    const l = this._last;
    if (!t || !g || !o || !l || !this._moved) return null;

    if (t.mode === "connect") {
      const gridY = l.y - g.gridTop;
      const hit = t.rowAt(gridY);
      if (!hit || hit.id === t.taskId) return null;
      const targetSide = l.x - g.chartLeft + g.scrollLeft < hit.barX + hit.barWidth / 2 ? "start" : "end";
      return {
        mode: "connect",
        taskId: t.taskId,
        predecessorId: t.taskId,
        successorId: hit.id,
        connectType: connectTypeOf(this._sourceSide, targetSide),
      };
    }

    const chartX = l.x - g.chartLeft + g.scrollLeft;
    const dayPx = g.dayWidth;

    if (t.mode === "progress") {
      const pct = t.barWidth > 0 ? ((chartX - t.barX) / t.barWidth) * 100 : 0;
      return { mode: "progress", taskId: t.taskId, progress: Math.round(Math.min(100, Math.max(0, pct))) };
    }

    // 日期类手势：move / resize-start / resize-end —— 换算与键盘微调共用
    // `dateCommitFor`，这里只负责把像素位移换成天数
    const days = Math.round((l.x - o.x) / dayPx);
    // connect / progress 上面已经各自返回；这里把类型收窄到日期类三手势
    if (!isDateMode(t.mode)) return null;
    return dateCommitFor({ ...t, mode: t.mode }, days);
  }

  private reset(): void {
    this._geo = null;
    this._target = null;
    this._origin = null;
    this._last = null;
    this._moved = false;
  }
}
