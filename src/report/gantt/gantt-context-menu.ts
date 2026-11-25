// [WHY] 2026-10-25 系统审计：从 Gantt.ts（675 行）按职责拆出
// 职责：右键菜单（命中解析、z-gantt-menu 派发、内置增删任务）与长按坐标合成。

import { closeContextMenu, openContextMenu, type GanttMenuAction } from "./context-menu.js";
import { addDays, formatDate } from "./date.js";
import { afterModelChange, type DragApplyHost } from "./drag-apply.js";
import type { ZGanttData, ZGanttMenuDetail, ZGanttTask } from "./types.js";

/** 菜单需要宿主提供的全部信息（值 + 回调，元素侧从自身状态实时取）。 */
export interface MenuPort {
  chain(e: Event): Element[];
  taskById(id: string): ZGanttTask | null;
  menuActions(): GanttMenuAction[] | null;
  /** 活模型（写回后由 afterModelChange 触发重排） */
  liveData(): ZGanttData;
  today(): Date;
  /** drag-apply 宿主（增删任务后按影响集重排） */
  dragHost(): DragApplyHost;
  emit(type: string, detail: unknown): void;
  /** 派发事件，返回 !defaultPrevented */
  dispatch(ev: Event): boolean;
  /** 被删的正是当前选中项时清空选中（不发 select 事件） */
  clearSelectionOf(id: string): void;
}

export class GanttContextMenu {
  constructor(private readonly p: MenuPort) {}

  open(e: MouseEvent): void {
    const chain = this.p.chain(e);
    const hit = chain.find((el) => el.hasAttribute?.("data-task-id"));
    // 空白处不拦截浏览器默认菜单
    if (!hit) return;
    e.preventDefault();
    const id = hit.getAttribute("data-task-id")!;
    const task = this.p.taskById(id);
    if (!task) return;
    const detail: ZGanttMenuDetail = { id, task };
    const ev = new CustomEvent("z-gantt-menu", { detail, bubbles: true, composed: true, cancelable: true });
    const notPrevented = this.p.dispatch(ev);
    // 消费方 preventDefault 表示自行绘制菜单
    if (!notPrevented) return;
    const actions = this.p.menuActions() ?? [
      { key: "add-task", label: "Add task" },
      { key: "delete-task", label: "Delete task", danger: true },
    ];
    openContextMenu({ x: e.clientX, y: e.clientY, actions, onPick: (key) => this._pick(key, id) });
  }

  close(): void {
    closeContextMenu();
  }

  private _pick(key: string, id: string): void {
    const d = this.p.liveData();
    const task = d.tasks.find((t) => t && t.id === id);
    if (!task) return;
    if (key === "add-task") {
      // 默认新增：today 起 3 天工期（含尾日 end = start+2）
      const today = this.p.today();
      const nt: ZGanttTask = {
        id: `task-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
        name: "New Task",
        start_date: formatDate(today),
        end_date: formatDate(addDays(today, 2)),
        progress: 0,
      };
      d.tasks.push(nt);
      afterModelChange([nt.id], this.p.dragHost());
      return;
    }
    if (key === "delete-task") {
      const idx = d.tasks.findIndex((t) => t && t.id === id);
      if (idx === -1) return;
      d.tasks.splice(idx, 1);
      if (d.dependencies?.length) {
        d.dependencies = d.dependencies.filter(
          (dep) => dep.predecessor_id !== id && dep.successor_id !== id,
        );
      }
      this.p.clearSelectionOf(id);
      afterModelChange([id], this.p.dragHost());
      return;
    }
    this.p.emit("z-gantt-menu-pick", { key, id, task });
  }
}

/** 长按回调：向屏幕坐标处的 shadow 内最深元素合成 contextmenu（bubbles 上浮进主链路） */
export function fireContextMenuAt(root: ShadowRoot | null, x: number, y: number): void {
  const el = root && typeof root.elementFromPoint === "function" ? root.elementFromPoint(x, y) : null;
  if (!el) return;
  el.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      composed: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}
