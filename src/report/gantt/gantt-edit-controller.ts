import { COPY, type ReactiveController } from "../../core/index.js";
import { applyCommit, type DragApplyHost } from "./drag-apply.js";
import { dateCommitFor } from "./drag-controller.js";
import { GANTT_STATUS_ID } from "./gantt-view.js";
import type { ZGanttData, ZGanttTask } from "./types.js";

function fillCopy(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
}

export interface GanttEditHost {
  readonly shadowRoot: ShadowRoot | null;
  readonly readonly: boolean;
  readonly selectedId: string | null;
  readonly showWeekends: boolean;
  getTaskById(id: string): ZGanttTask | null;
  liveData(): ZGanttData;
  dragHost(): DragApplyHost;
  requestUpdate(): void;
}

/**
 * `<z-gantt>` 键盘编辑、两段式连线与无障碍播报控制器（ReactiveController）。
 *
 * 托管 `nudge` / `nudgeProgress` / `toggleLink` / `commitLink` / `cancelLink`
 * 以及延迟到 `hostUpdated()` 写入的 ARIA live region 播报。
 */
export class GanttEditController implements ReactiveController {
  private readonly _host: GanttEditHost;
  private _linkSource: string | null = null;
  private _announceMsg: string | null = null;

  constructor(host: GanttEditHost) {
    this._host = host;
  }

  hostUpdate(): void {
    if (this._host.readonly && this._linkSource) {
      this._linkSource = null;
    }
  }

  hostUpdated(): void {
    if (this._announceMsg != null) {
      const live = this._host.shadowRoot?.querySelector<HTMLElement>(`#${GANTT_STATUS_ID}`);
      if (live) live.textContent = this._announceMsg;
      this._announceMsg = null;
    }
  }

  nudge(mode: "move" | "resize-start" | "resize-end", days: number): boolean {
    if (this._host.readonly || !days) return false;
    const id = this._host.selectedId;
    const task = id ? this._host.getTaskById(id) : null;
    if (!task) return false;
    const commit = dateCommitFor(
      {
        mode,
        taskId: task.id,
        startDate: task.start_date != null ? String(task.start_date) : null,
        endDate: task.end_date != null ? String(task.end_date) : null,
        isMilestone: task.is_milestone === true,
        isReal: false,
        snapWeekends: !this._host.showWeekends,
      },
      days,
    );
    if (!commit) return false;
    applyCommit(commit, this._host.dragHost());
    return true;
  }

  nudgeProgress(delta: number): boolean {
    if (this._host.readonly || !delta) return false;
    const id = this._host.selectedId;
    const task = id ? this._host.getTaskById(id) : null;
    if (!task) return false;
    const cur = Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0;
    const next = Math.min(100, Math.max(0, Math.round(cur + delta)));
    if (next === cur) return false;
    applyCommit({ mode: "progress", taskId: task.id, progress: next }, this._host.dragHost());
    return true;
  }

  toggleLink(): void {
    if (this._host.readonly) return;
    const id = this._host.selectedId;
    if (!id) {
      this._announce(COPY.ganttLinkNoSelection);
      return;
    }
    if (this._linkSource === id) {
      this.cancelLink();
      return;
    }
    this._linkSource = id;
    this._announce(fillCopy(COPY.ganttLinkArmed, { task: this._taskName(id) }));
  }

  commitLink(): boolean {
    const from = this._linkSource;
    if (!from) return false;
    const to = this._host.selectedId;
    if (!to) {
      this._announce(COPY.ganttLinkNoSelection);
      return true;
    }
    if (to === from) {
      this._announce(COPY.ganttLinkRejectedSelf);
      return true;
    }
    if (!this._host.getTaskById(from)) {
      this._linkSource = null;
      this._announce(COPY.ganttLinkCancelled);
      return true;
    }
    const deps = this._host.liveData().dependencies ?? [];
    if (deps.some((d) => d.predecessor_id === from && d.successor_id === to)) {
      this._linkSource = null;
      this._announce(COPY.ganttLinkRejectedDuplicate);
      return true;
    }

    const names = { from: this._taskName(from), to: this._taskName(to) };
    this._linkSource = null;
    applyCommit(
      { mode: "connect", taskId: from, predecessorId: from, successorId: to, connectType: "FS" },
      this._host.dragHost(),
    );
    this._announce(fillCopy(COPY.ganttLinkDone, names));
    return true;
  }

  cancelLink(): boolean {
    if (!this._linkSource) return false;
    this._linkSource = null;
    this._announce(COPY.ganttLinkCancelled);
    return true;
  }

  private _announce(msg: string): void {
    this._announceMsg = msg;
    this._host.requestUpdate();
  }

  private _taskName(id: string): string {
    const t = this._host.getTaskById(id);
    const name = String(t?.name ?? "").trim();
    return name || id;
  }
}
