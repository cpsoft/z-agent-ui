// <z-gantt> 甘特图：data 给任务、columns 定左列，viewMode 切日 / 周 / 月，选择与菜单各发事件。
// [组合架构] 视图投影在 gantt-view.ts、滚动编排在 scroll-controller.ts、键盘编辑/连线/播报
// 托管给 GanttEditController、触摸长按与拖拽托管给 LongPressController / GanttDragSession。
import { BaseElement, property, defineElement } from "../../core/index.js";
import type { GanttMenuAction } from "./context-menu.js";
import type { ChartRenderOptions } from "./chart-render.js";
import type { DragApplyHost } from "./drag-apply.js";
import { renderGanttView } from "./gantt-view.js";
import { LongPressController } from "../../primitives/index.js";
import { GanttScrollController } from "./scroll-controller.js";
import { GanttEditController } from "./gantt-edit-controller.js";
import {
  GanttDragSession,
  MIN_DAY_WIDTH,
  ZOOM_STEP,
  clampDayWidth,
  eventChain,
  handleNavKey,
  nextRowIndex,
  resolvePointerHit,
  wheelZoomStep,
  zoomScrollLeft,
} from "./gantt-interaction.js";
import { GanttContextMenu, fireContextMenuAt } from "./gantt-context-menu.js";
import { diffDays, parseDate, todayStart } from "./date.js";
import { dateToPixels, getVisibleRange } from "./layout.js";
import { DEFAULT_COLUMNS, listTotalWidth } from "./left-list.js";
import { DEFAULT_DAY_WIDTH } from "./timeline.js";
import type {
  GanttListColumn,
  GanttTree,
  TaskLayout,
  ZGanttData,
  ZGanttTask,
  ZGanttViewMode,
} from "./types.js";
import ganttCSS from "./gantt.css?raw";

const VIEW_MODES: ZGanttViewMode[] = ["day", "week", "month", "quarter"];

export class ZGantt extends BaseElement {
  static styles = ganttCSS;

  @property({ type: Object, attribute: false }) data: ZGanttData | null = null;
  @property({ type: Array, attribute: false }) columns: GanttListColumn[] = [];
  @property({ type: String, attribute: false }) selectedId: string | null = null;
  @property({ type: String, attribute: "view-mode" }) viewMode: ZGanttViewMode = "day";
  @property({ type: Boolean, attribute: "column-width" }) columnWidth = 0;
  @property({ type: Number, attribute: "row-height" }) rowHeight = 48;
  @property({ type: Number, attribute: "header-height" }) headerHeight = 60;
  @property({ type: String }) today = "";
  @property({ type: Boolean, attribute: "show-weekends" }) showWeekends = true;
  @property({ type: Boolean, attribute: "show-today" }) showToday = true;
  @property({ type: Boolean, attribute: "show-critical-path" }) showCriticalPath = false;
  @property({ type: Boolean, attribute: "auto-schedule" }) autoSchedule = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Array, attribute: false }) menuActions: GanttMenuAction[] | null = null;
  @property({ type: String }) value = "";

  private _lastValueRaw: string | null = null;
  private _lastViewMode: ZGanttViewMode | null = null;
  private _viewChangePending = false;
  private _dayWidth: number | null = null;
  private _rowsCache: TaskLayout[] = [];
  private _treeCache: GanttTree | null = null;
  private _rangeCache: { start: Date; end: Date } | null = null;
  private _chartOpts: ChartRenderOptions | null = null;

  private readonly _edit: GanttEditController;
  private readonly _scroll = new GanttScrollController(() => ({
    rowHeight: this.rowHeight,
    rows: this._rowsCache,
    columns: this._resolvedColumns(),
    childrenOf: this._treeCache?.childrenOf ?? new Map<string, ZGanttTask[]>(),
    chartOpts: this._chartOpts,
    selectedId: this.selectedId,
  }));
  private readonly _menu = new GanttContextMenu({
    chain: (e) => eventChain(e, this),
    taskById: (id) => this.getTaskById(id),
    menuActions: () => this.menuActions,
    liveData: () => this._data(),
    today: () => this._today(),
    dragHost: () => this._host,
    emit: (type, detail) => this.emit(type, detail),
    dispatch: (ev) => this.dispatchEvent(ev),
    clearSelectionOf: (id) => {
      if (this.selectedId === id) this.selectedId = null;
    },
  });
  private readonly _lp = new LongPressController({
    onLongPress: (x, y) => fireContextMenuAt(this.shadowRoot, x, y),
  });
  private readonly _dragSession = new GanttDragSession({
    body: () => this._scroll.bodyEl,
    rows: () => this._rowsCache,
    range: () => this._rangeCache,
    rowHeight: () => this.rowHeight,
    dayWidth: () => this._resolveDayWidth(),
    showWeekends: () => this.showWeekends,
    root: () => this.shadowRoot,
    rect: () => this.getBoundingClientRect(),
    chain: (e) => eventChain(e, this),
    host: () => this._host,
    requestUpdate: () => this.requestUpdate(),
  });

  constructor() {
    super();
    const self = this;
    this._edit = this.addController(
      new GanttEditController({
        get shadowRoot() {
          return self.shadowRoot;
        },
        get readonly() {
          return self.readonly;
        },
        get selectedId() {
          return self.selectedId;
        },
        get showWeekends() {
          return self.showWeekends;
        },
        getTaskById: (id) => self.getTaskById(id),
        liveData: () => self.liveData(),
        dragHost: () => self._host,
        requestUpdate: () => self.requestUpdate(),
      }),
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.listen(this, "pointerdown", this._onPointerDown as EventListener);
    this.listen(this, "keydown", this._onKeyDown as EventListener);
    this.listen(this, "wheel", this._onWheel as EventListener, { passive: false });
    this.listen(this, "contextmenu", this._onContextMenu as EventListener);
  }

  focus(options?: FocusOptions): void {
    const tree = this.shadowRoot?.querySelector<HTMLElement>(".z-gantt__list-body");
    if (tree) tree.focus(options);
    else super.focus(options);
  }

  disconnectedCallback(): void {
    this._scroll.detach();
    this._lp.cancel();
    this._dragSession.abort();
    this._menu.close();
    super.disconnectedCallback();
  }

  willUpdate(): void {
    const raw = this.value;
    if (raw !== this._lastValueRaw) {
      this._lastValueRaw = raw;
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ZGanttData;
          if (parsed && Array.isArray(parsed.tasks)) {
            (this as unknown as Record<string, unknown>).__zui_prop_data = parsed;
          }
        } catch {
          // 非法 JSON：保持原 data 不变
        }
      }
    }
    if (this._lastViewMode !== this.viewMode) {
      this._lastViewMode = this.viewMode;
      this._dayWidth = null;
      this._emitViewChange();
    }
  }

  updated(): void {
    this._scroll.attach(this.shadowRoot!);
    this._syncActiveDescendant();
  }

  private _syncActiveDescendant(): void {
    const id = this.selectedId;
    const tree = this.shadowRoot?.querySelector<HTMLElement>(".z-gantt__list-body");
    if (!tree) return;
    const item = id
      ? Array.from(tree.querySelectorAll<HTMLElement>(".z-gantt__tr")).find((r) => r.dataset.taskId === id)
      : null;
    if (item && item.id) tree.setAttribute("aria-activedescendant", item.id);
    else tree.removeAttribute("aria-activedescendant");
  }

  render(): string {
    this._scroll.captureScroll();
    const out = renderGanttView({
      data: this._data(),
      columns: this._resolvedColumns(),
      today: this._today(),
      viewMode: this.viewMode,
      dayWidth: this._resolveDayWidth(),
      rowHeight: this.rowHeight,
      headerHeight: this.headerHeight,
      showWeekends: this.showWeekends,
      showToday: this.showToday,
      showCriticalPath: this.showCriticalPath,
      selectedId: this.selectedId,
      editable: !this.readonly,
      pendingScrollTop: this._scroll.pendingScrollTop ?? 0,
      bodyClientHeight: this._scroll.bodyEl?.clientHeight ?? 0,
      windowFor: (top, h, total) => this._scroll.windowFor(top, h, total),
    });
    this._rowsCache = out.rows;
    this._treeCache = out.tree;
    this._rangeCache = out.range;
    this._chartOpts = out.chartOpts;
    this._scroll.setWindow(out.winStart, out.winEnd);
    return out.html;
  }

  get dayWidth(): number {
    return this._resolveDayWidth();
  }

  zoomIn(): void {
    this._scaleDayWidth(ZOOM_STEP, null);
  }

  zoomOut(): void {
    this._scaleDayWidth(1 / ZOOM_STEP, null);
  }

  fit(): void {
    const tasks = this._data().tasks;
    if (!tasks.length) {
      this._dayWidth = null;
      this.requestUpdate();
      return;
    }
    const range = getVisibleRange(tasks, this.showToday ? this._today() : null, 2);
    const days = Math.max(diffDays(range.start, range.end), 1);
    const chartW = this.clientWidth - this._listWidth();
    this._dayWidth =
      chartW <= 0
        ? clampDayWidth(MIN_DAY_WIDTH)
        : clampDayWidth(Math.floor((chartW - 20) / days));
    this.requestUpdate();
  }

  getTaskById(id: string): ZGanttTask | null {
    return this._data().tasks.find((t) => t && t.id === id) ?? null;
  }

  toggleExpand(id: string): void {
    const t = this.getTaskById(id);
    if (!t) return;
    const expanded = t.is_expanded === false;
    t.is_expanded = expanded;
    this.requestUpdate();
    this.emit("z-gantt-expand", { id, expanded });
  }

  expandAll(v: boolean): void {
    const tree = this._treeCache;
    for (const t of this._data().tasks) {
      if (!t) continue;
      const kids = tree?.childrenOf.get(t.id);
      if (kids && kids.length) t.is_expanded = v;
    }
    this.requestUpdate();
  }

  scrollToTask(id: string): void {
    const row = this._rowsCache.find((r) => r.task.id === id);
    const body = this._scroll.bodyEl;
    if (!row || !body) return;
    body.scrollTop = Math.max(0, row.index * this.rowHeight - body.clientHeight / 2);
    const cx = row.isMilestone ? row.x : row.x + row.width / 2;
    body.scrollLeft = Math.max(0, cx - body.clientWidth / 2);
  }

  scrollToToday(): void {
    const body = this._scroll.bodyEl;
    const range = this._rangeCache;
    if (!body || !range) return;
    const x = dateToPixels(this._today(), range.start, this._resolveDayWidth());
    body.scrollLeft = Math.max(0, x - body.clientWidth / 2);
  }

  getData(): ZGanttData {
    const d = this._data();
    return { tasks: d.tasks, dependencies: d.dependencies ? [...d.dependencies] : [] };
  }

  setData(data: ZGanttData): void {
    this.value = "";
    this._lastValueRaw = "";
    this.data = { tasks: data.tasks, dependencies: data.dependencies ?? [] };
  }

  refresh(): void {
    this.requestUpdate();
  }

  liveData(): ZGanttData {
    return this._data();
  }

  nudge(mode: "move" | "resize-start" | "resize-end", days: number): boolean {
    return this._edit.nudge(mode, days);
  }

  nudgeProgress(delta: number): boolean {
    return this._edit.nudgeProgress(delta);
  }

  toggleLink(): void {
    this._edit.toggleLink();
  }

  commitLink(): boolean {
    return this._edit.commitLink();
  }

  cancelLink(): boolean {
    return this._edit.cancelLink();
  }

  private _data(): ZGanttData {
    const d = this.data;
    if (d && Array.isArray(d.tasks)) return d;
    return { tasks: [], dependencies: [] };
  }

  private _today(): Date {
    return parseDate(this.today) ?? todayStart();
  }

  private _resolvedColumns(): GanttListColumn[] {
    return this.columns.length ? this.columns : DEFAULT_COLUMNS;
  }

  private _listWidth(): number {
    return listTotalWidth(this._resolvedColumns());
  }

  private _resolveDayWidth(): number {
    const mode = VIEW_MODES.includes(this.viewMode) ? this.viewMode : "day";
    if (this._dayWidth != null) return this._dayWidth;
    if (this.columnWidth > 0) {
      if (mode === "day") return this.columnWidth;
      if (mode === "week") return this.columnWidth / 7;
    }
    return DEFAULT_DAY_WIDTH[mode];
  }

  private get _host(): DragApplyHost {
    return this as unknown as DragApplyHost;
  }

  private _onWheel = (e: WheelEvent): void => {
    const step = wheelZoomStep(e);
    if (step === null) return;
    e.preventDefault();
    this._scaleDayWidth(step, e.clientX - this.getBoundingClientRect().left);
  };

  private _scaleDayWidth(factor: number, anchorX: number | null): void {
    const cur = this._resolveDayWidth();
    const next = clampDayWidth(cur * factor);
    if (next === cur) return;
    const body = this._scroll.bodyEl;
    if (body) {
      const localX = anchorX != null ? anchorX - this._listWidth() : body.clientWidth / 2;
      this._scroll.queueScrollLeft(zoomScrollLeft(localX, body.scrollLeft, cur, next));
    }
    this._dayWidth = next;
    this.requestUpdate();
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (e.pointerType === "touch") this._lp.arm(e.clientX, e.clientY);
    else this._lp.cancel();
    const hit = resolvePointerHit(eventChain(e, this));
    if (hit.expandId) {
      this.toggleExpand(hit.expandId);
      return;
    }
    if (hit.modeEl && hit.mode && !this.readonly) {
      if (hit.dragTaskId && this._dragSession.begin(e, hit.modeEl, hit.mode, hit.dragTaskId)) {
        this._lp.cancel();
        this._select(hit.dragTaskId);
        return;
      }
    }
    this._select(hit.selectId);
  };

  private _select(id: string | null): void {
    if (this.selectedId === id) return;
    this.selectedId = id;
    if (id != null) {
      const task = this.getTaskById(id);
      if (task) this.emit("z-gantt-select", { id, task });
    }
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    handleNavKey(e, {
      select: (id) => this._select(id),
      move: (delta) => this._moveSelection(delta),
      scrollBy: (delta) => this._scroll.nudgeScrollLeft(delta),
      jump: (edge) => this._jumpSelection(edge),
      toggle: (open) => this._toggleCurrent(open),
      nudge: (mode, days) => this.nudge(mode, days),
      nudgeProgress: (delta) => this.nudgeProgress(delta),
      toggleLink: () => this.toggleLink(),
      commitLink: () => this.commitLink(),
      cancelLink: () => this.cancelLink(),
    });
  };

  private _toggleCurrent(open: boolean): boolean {
    const id = this.selectedId;
    if (id == null) return false;
    const kids = this._treeCache?.childrenOf.get(id) ?? [];
    if (!kids.length) return false;
    const task = this.getTaskById(id);
    const expanded = task?.is_expanded !== false;
    if (expanded !== open) this.toggleExpand(id);
    return true;
  }

  private _jumpSelection(edge: "first" | "last"): void {
    const rows = this._rowsCache;
    if (!rows.length) return;
    const index = edge === "first" ? 0 : rows.length - 1;
    if (rows[index].task.id === this.selectedId) return;
    this._select(rows[index].task.id);
    this._scroll.ensureRowVisible(index);
  }

  private _moveSelection(delta: number): void {
    const next = nextRowIndex(this._rowsCache, this.selectedId, delta);
    if (next === -1) return;
    this._select(this._rowsCache[next].task.id);
    this._scroll.ensureRowVisible(next);
  }

  private _emitViewChange(): void {
    if (this._viewChangePending) return;
    this._viewChangePending = true;
    queueMicrotask(() => {
      this._viewChangePending = false;
      if (this.isConnected) this.emit("z-gantt-view-change", { mode: this.viewMode });
    });
  }

  private _onContextMenu = (e: MouseEvent): void => {
    this._menu.open(e);
  };
}

defineElement("z-gantt", ZGantt);
