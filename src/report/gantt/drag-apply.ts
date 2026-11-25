// [WHY] 拖拽预览直写 + 提交落模型（纯函数，可脱离 DOM 单测）：preview 阶段
// 零 requestUpdate 只写 style/path.d；commit 阶段一次落模型（浅拷贝替换槽位，
// 不原地改用户对象）。宿主经 DragApplyHost 结构化接口注入（ZGantt cast 满足），
// 避免与组件类循环依赖。
// See: wiki/requirements/REQ-018-gantt.md
import type { DragCommit, DragPreview } from "./drag-controller.js";
import { BAR_HEIGHT, REAL_HEIGHT } from "./layout.js";
import { cascadeSchedule } from "./schedule.js";
import type { TaskLayout, ZGanttData, ZGanttTask } from "./types.js";

/** 计划条/里程碑外接框几何（chart 坐标 px；里程碑给不旋转的外接框） */
export function barGeom(l: TaskLayout, rowHeight: number): { x: number; w: number; centerY: number } {
  if (l.isMilestone) {
    return { x: l.x - 7, w: 14, centerY: l.y + rowHeight / 2 };
  }
  return { x: l.x, w: l.width, centerY: l.y + (rowHeight - BAR_HEIGHT) / 2 + BAR_HEIGHT / 2 };
}

/** 实际条几何（chart 坐标 px） */
export function realGeom(l: TaskLayout): { x: number; w: number; centerY: number } {
  return { x: l.realX, w: l.realWidth, centerY: l.realY + REAL_HEIGHT / 2 };
}

/** 拖拽期直写样式的元素引用（innerHTML 重建即失效，由宿主收尾置空） */
export interface DragPreviewEls {
  bar: HTMLElement | null;
  progress: HTMLElement | null;
  tempLine: SVGPathElement | null;
}

export function applyPreview(p: DragPreview, els: DragPreviewEls): void {
  if (p.mode === "connect") {
    const el = els.tempLine;
    if (el && p.line) {
      el.style.display = "";
      el.setAttribute("d", `M ${p.line.x1} ${p.line.y1} L ${p.line.x2} ${p.line.y2}`);
    }
    return;
  }
  if (p.mode === "progress") {
    if (p.progressPercent != null && els.progress) {
      els.progress.style.width = `${p.progressPercent}%`;
    }
    return;
  }
  if (els.bar) {
    els.bar.style.left = `${p.left}px`;
    els.bar.style.width = `${p.width}px`;
  }
}

/**
 * drag-apply 宿主最小接口：ZGantt 结构化满足（cast 注入）。
 * [WHY] liveData 必须返回活模型 —— getData 会拷贝 dependencies 数组，
 * connect push 写进副本会丢失。
 */
export interface DragApplyHost {
  autoSchedule: boolean;
  readonly: boolean;
  selectedId: string | null;
  liveData(): ZGanttData;
  requestUpdate(): void;
  emit(name: string, detail?: unknown): void;
  dispatchEvent(evt: Event): boolean;
}

/** 拖拽提交落模型：connect 走可取消事件 + 去重，其余浅拷贝替换槽位 */
export function applyCommit(c: DragCommit, host: DragApplyHost): void {
  const d = host.liveData();
  const task = d.tasks.find((t) => t && t.id === c.taskId);
  if (!task) {
    host.requestUpdate();
    return;
  }

  if (c.mode === "connect") {
    const detail = {
      predecessor_id: c.predecessorId!,
      successor_id: c.successorId!,
      type: c.connectType!,
    };
    // [WHY] emit 不返回事件对象，cancelable 需自行 dispatch 检测 defaultPrevented
    const ev = new CustomEvent("z-gantt-connect", {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    host.dispatchEvent(ev);
    const deps = (d.dependencies ??= []);
    // 同 predecessor+successor 已存在则忽略，防重复连线
    const dup = deps.some(
      (dep) => dep.predecessor_id === detail.predecessor_id && dep.successor_id === detail.successor_id,
    );
    if (ev.defaultPrevented || dup) {
      host.requestUpdate();
      return;
    }
    deps.push({ predecessor_id: detail.predecessor_id, successor_id: detail.successor_id, type: detail.type });
    afterModelChange([detail.successor_id], host);
    return;
  }

  // [WHY] 浅拷贝替换槽位：保留原对象业务字段，不原地改用户对象
  const idx = d.tasks.indexOf(task);
  const copy: ZGanttTask = { ...task };
  if (c.mode === "progress") {
    copy.progress = c.progress;
  } else if (c.isReal) {
    // 实际条手势提交 real_*_date；里程碑只有起点
    if (c.startDate) copy.real_start_date = c.startDate;
    if (c.endDate) copy.real_end_date = c.endDate;
  } else if (c.mode === "move" && c.startDate && !c.endDate) {
    copy.start_date = c.startDate;
  } else {
    if (c.startDate) copy.start_date = c.startDate;
    if (c.endDate) copy.end_date = c.endDate;
  }
  d.tasks[idx] = copy;
  afterModelChange([copy.id], host);
}

/** 模型变更统一收口：auto-schedule 顺延在此处级联后再触发重建与 change */
export function afterModelChange(changed: string[], host: DragApplyHost): void {
  let ids = changed;
  if (host.autoSchedule && !host.readonly) {
    const d0 = host.liveData();
    // cascade 就地替换 tasks 槽位；被顺延的 id 并入 changed
    const cascaded = cascadeSchedule(d0.tasks, d0.dependencies ?? []);
    if (cascaded.length) ids = [...new Set([...ids, ...cascaded])];
  }
  host.requestUpdate();
  const d = host.liveData();
  host.emit("z-gantt-change", { tasks: d.tasks, dependencies: d.dependencies ?? [], changed: ids });
}
