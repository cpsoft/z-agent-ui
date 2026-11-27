// <z-gantt> 甘特图：data 给任务、columns 定左列，viewMode 切日 / 周 / 月，选择与菜单各发事件。
// [WHY] 甘特图主类：attrs/状态编排/公开 API/手势分派。渲染纯函数在
// gantt-view.ts、滚动编排在 scroll-controller.ts、触摸长按在 L0 的 long-press 原语、
// 拖拽预览/提交在 drag-apply.ts、手势状态机在 drag-controller.ts、
// 拖拽管线与命中/导航计算在 gantt-interaction.ts、右键菜单在 gantt-context-menu.ts。
// 监听器只挂 host（shadow innerHTML 每次重建，内部监听器失效，
// 见 [[REQ-013-node-flow-editor]] 陷阱②）；scroll 例外由 scroll-controller
// 直绑新 body 并按元素身份守卫重绑。
// 重排/重算合并用 setTimeout/queueMicrotask 而非 rAF（happy-dom 挂起）。
// See: wiki/requirements/REQ-018-gantt.md
import { BaseElement, COPY, property, defineElement } from "../../core/index.js";
import type { GanttMenuAction } from "./context-menu.js";
import type { ChartRenderOptions } from "./chart-render.js";
import { applyCommit, type DragApplyHost } from "./drag-apply.js";
import { dateCommitFor } from "./drag-controller.js";
import { GANTT_STATUS_ID, renderGanttView } from "./gantt-view.js";
import { LongPressController } from "../../primitives/index.js";
import { GanttScrollController } from "./scroll-controller.js";
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

/**
 * 把词表里的 `{name}` 占位符换成实际值。
 *
 * [WHY 整句进词表而不是在代码里拼两段] 中文语序固定（「已把「X」设为前置任务」），
 * 拆成前段 + 名字 + 后段再拼，改措辞时两段会各自漂移，而漂移只在特定状态才看得见。
 */
function fillCopy(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_m, k: string) => vars[k] ?? "");
}

export class ZGantt extends BaseElement {
  static styles = ganttCSS;

  // ── 数据（attribute:false：decorator toAttribute 对 Object 反射写 String(value)） ──
  @property({ type: Object, attribute: false })
  data: ZGanttData | null = null;
  @property({ type: Array, attribute: false })
  columns: GanttListColumn[] = [];
  @property({ type: String, attribute: false })
  selectedId: string | null = null;

  // ── 视图 ──
  @property({ type: String, attribute: "view-mode" })
  viewMode: ZGanttViewMode = "day";
  @property({ type: Boolean, attribute: "column-width" })
  columnWidth = 0;
  @property({ type: Number, attribute: "row-height" })
  rowHeight = 48;
  @property({ type: Number, attribute: "header-height" })
  headerHeight = 60;
  /** today 注入（"YYYY-MM-DD"），空串取当天；测试确定性入口 */
  @property({ type: String })
  today = "";
  @property({ type: Boolean, attribute: "show-weekends" })
  showWeekends = true;
  @property({ type: Boolean, attribute: "show-today" })
  showToday = true;
  @property({ type: Boolean, attribute: "show-critical-path" })
  showCriticalPath = false;
  @property({ type: Boolean, attribute: "auto-schedule" })
  autoSchedule = false;
  @property({ type: Boolean })
  readonly = false;

  /** 右键菜单项覆盖（null = 内置 add-task/delete-task） */
  @property({ type: Array, attribute: false })
  menuActions: GanttMenuAction[] | null = null;

  /** 声明式入口：JSON 字符串（{tasks, dependencies}），willUpdate 手动 parse */
  @property({ type: String })
  value = "";

  // ── 内部状态 ──
  private _lastValueRaw: string | null = null;
  private _lastViewMode: ZGanttViewMode | null = null;
  private _viewChangePending = false;
  /** 用户缩放覆盖值；null = 按视图默认 / column-width 推导 */
  private _dayWidth: number | null = null;
  /** render 产物缓存（scrollToTask/fit/键盘导航/拖拽 begin 复用，避免二次布局计算） */
  private _rowsCache: TaskLayout[] = [];
  private _treeCache: GanttTree | null = null;
  /**
   * 连线起点（`Alt + Enter` 记住的前置任务 id）。null = 不在连线模式。
   *
   * [WHY 两段式] 指针靠「拖一条线到目标行」一次完成；键盘没有拖拽这种连续手势，
   * 只能拆成「记住起点 → 移到目标 → 回车确认」。中间状态必须存在宿主上，否则
   * 按下回车时已经没有「起点是谁」这个信息了。
   */
  private _linkSource: string | null = null;
  /**
   * 待播报的文本。写在 `updated()` 里而不是当场写。
   *
   * [WHY 不能当场写] 每次 `requestUpdate` 都整块替换 `shadow.innerHTML`，播报节点
   * 会被换成一个新的空节点 —— 当场写进去的文本在渲染时就被丢掉了，读屏一个字都
   * 收不到（而且这个失败是静默的：DOM 上曾经有过那段文字）。
   */
  private _announceMsg: string | null = null;
  private _rangeCache: { start: Date; end: Date } | null = null;
  /** render 期缓存图表渲染参数（scroll-controller rewindow 重写切片时复用） */
  private _chartOpts: ChartRenderOptions | null = null;

  // ── 子控制器（滚动 / 长按 / 拖拽 / 菜单）──
  /** deps() 惰性注入：每次求值取宿主当前渲染产物缓存 */
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
  /** 长按菜单（500ms / 8px 用原语缺省，见 primitives/long-press）与拖拽管线（状态机在 drag-controller） */
  private readonly _lp = new LongPressController({ onLongPress: (x, y) => fireContextMenuAt(this.shadowRoot, x, y) });
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

  // ── 生命周期 ─────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY 宿主不再带 role / tabindex / 名字] 上一版把 `role="listbox"` 和
    // `aria-activedescendant` 都挂在宿主上，行在影子树里。2026-11-16 Chrome 141
    // 实测：**宿主引用不到自己影子树里的 id** —— 无障碍树里连 `activedescendant`
    // 这个属性都不出现（`getPartialAXTree` 的 properties 里没有），于是选中变化
    // 对读屏依然是零通知，界面上却一切正常。
    //
    // `aria-activedescendant` 是 IDREF，跨 shadow 边界一律无效（`aria-describedby`
    // 同理，本轮已在 z-chart 上踩过一次）。带 role 的元素必须与 treeitem 同树，
    // 所以角色和焦点都下放到 shadow 内的 `.z-gantt__list-body`（见 gantt-view.ts）。
    // 宿主这边**不能**留 `tabindex="-1"`：Chrome 实测那会让整棵子树的 Tab 序消失。

    this.addEventListener("pointerdown", this._onPointerDown);
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("wheel", this._onWheel, { passive: false });
    this.addEventListener("contextmenu", this._onContextMenu);
  }

  /**
   * 焦点转发到真正带角色的那个节点（shadow 内的 tree）。
   *
   * [WHY 需要它] 宿主现在自己不可聚焦（`tabIndex` 会让 Tab 序穿透，但见上一段：
   * 宿主的 shadow 子树在被 `tabindex="-1"` 时整棵消失）。测试与宿主代码里的
   * `gantt.focus()` 仍应表示「把焦点交给这个甘特」，与 `ZRadio.focus()` 同款转发。
   */
  focus(options?: FocusOptions): void {
    const tree = this.shadowRoot?.querySelector<HTMLElement>(".z-gantt__list-body");
    if (tree) tree.focus(options);
    else super.focus(options);
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this._onPointerDown);
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("contextmenu", this._onContextMenu);
    this._scroll.detach();
    this._lp.cancel();
    this._dragSession.abort();
    this._menu.close();
    super.disconnectedCallback();
  }

  willUpdate(): void {
    // 切到只读时把连线待定清掉：否则「只读」期间按回车仍会建出一条依赖
    if (this.readonly && this._linkSource) this._linkSource = null;
    // [WHY] value attr(JSON) 声明式入口：手动 parse + 旧值比对，不走 Array/Object
    // 反射（toAttribute 对 Object 写 String(value) 垃圾）。直接写装饰器私有存储
    // 避免 setter 再排一次微任务渲染。
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
      this._dayWidth = null; // 切视图重置缩放
      this._emitViewChange();
    }
  }

  updated(): void {
    this._scroll.attach(this.shadowRoot!);
    this._syncActiveDescendant();
    // 播报必须在渲染**之后**写：节点是这一帧新建的，渲染前写等于写给一个即将被
    // 替换掉的节点。清空后再写，重复同一句时读屏也会当成一次变化。
    if (this._announceMsg != null) {
      const live = this.shadowRoot?.querySelector<HTMLElement>(`#${GANTT_STATUS_ID}`);
      if (live) live.textContent = this._announceMsg;
      this._announceMsg = null;
    }
  }

  /**
   * 把「当前项」指给读屏：`aria-activedescendant` 写在**与 treeitem 同树的**
   * `.z-gantt__list-body` 上，指向当前渲染出来的那一行。
   *
   * [WHY 必须在 updated() 里做，不能在键按下时做] 行是虚拟滚动的：`_moveSelection`
   * 先改 `selectedId`、再 `ensureRowVisible`，真正那行 DOM 要等这一次渲染才存在。
   * 按键时就写 IDREF，指向的是**还没出生的节点** —— 浏览器对解析不到的 IDREF 是
   * 静默忽略，读屏一个字都不念，而界面上高亮一切正常。
   */
  private _syncActiveDescendant(): void {
    const id = this.selectedId;
    const tree = this.shadowRoot?.querySelector<HTMLElement>(".z-gantt__list-body");
    if (!tree) return;
    // [WHY 不用 CSS.escape 拼选择器] 任务 id 是宿主给的任意字符串（可能带引号、空格），
    // happy-dom 里也没有 `CSS.escape`。直接按 dataset 比对，零转义问题。
    const item = id
      ? Array.from(tree.querySelectorAll<HTMLElement>(".z-gantt__tr")).find((r) => r.dataset.taskId === id)
      : null;
    if (item && item.id) tree.setAttribute("aria-activedescendant", item.id);
    else tree.removeAttribute("aria-activedescendant");
  }

  // ── render ───────────────────────────────────────────

  render(): string {
    // [WHY] 旧 body 仍在 DOM：先捕获滚动位置，attach() 恢复（全量重建会复位 scrollTop）
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
    // [WHY] 缓存渲染产物：scrollToTask/fit/键盘导航/拖拽 begin 不再重复计算
    this._rowsCache = out.rows;
    this._treeCache = out.tree;
    this._rangeCache = out.range;
    this._chartOpts = out.chartOpts;
    this._scroll.setWindow(out.winStart, out.winEnd);
    return out.html;
  }

  // ── Public API ───────────────────────────────────────

  /** px/天（供测试与外部读取当前解析值） */
  get dayWidth(): number {
    return this._resolveDayWidth();
  }

  zoomIn(): void {
    this._scaleDayWidth(ZOOM_STEP, null);
  }

  zoomOut(): void {
    this._scaleDayWidth(1 / ZOOM_STEP, null);
  }

  /** 缩放至全部任务恰好可见 */
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
    if (chartW <= 0) {
      this._dayWidth = clampDayWidth(chartW > 0 ? chartW / days : MIN_DAY_WIDTH);
    } else {
      this._dayWidth = clampDayWidth(Math.floor((chartW - 20) / days));
    }
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
    // [WHY] 用 childrenOf 判定：叶子上写 is_expanded 是噪声字段
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
    // [WHY] 清 value 声明式入口并同步比对基线，避免 willUpdate 用旧 JSON 回灌
    this.value = "";
    this._lastValueRaw = "";
    this.data = { tasks: data.tasks, dependencies: data.dependencies ?? [] };
  }

  refresh(): void {
    this.requestUpdate();
  }

  /** drag-apply 宿主接口：暴露活模型（getData 会拷贝 dependencies 数组，写回丢失） */
  liveData(): ZGanttData {
    return this._data();
  }

  // ── 派生 ─────────────────────────────────────────────

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
    // column-width 生效于 day/week；month/quarter 列宽随自然月长浮动，忽略
    if (this.columnWidth > 0) {
      if (mode === "day") return this.columnWidth;
      if (mode === "week") return this.columnWidth / 7;
    }
    return DEFAULT_DAY_WIDTH[mode];
  }

  /** drag-apply 宿主接口注入（ZGantt 结构化满足 DragApplyHost） */
  private get _host(): DragApplyHost {
    return this as unknown as DragApplyHost;
  }

  // ── 滚动 / 缩放 ──────────────────────────────────────

  private _onWheel = (e: WheelEvent): void => {
    const step = wheelZoomStep(e); // 普通滚轮放行给页面滚动；仅 Ctrl/⌘ 缩放
    if (step === null) return;
    e.preventDefault();
    this._scaleDayWidth(step, e.clientX - this.getBoundingClientRect().left);
  };

  /** factor 缩放；anchorX 为主元素坐标系下的光标 x（null = 以视口中心为锚） */
  private _scaleDayWidth(factor: number, anchorX: number | null): void {
    const cur = this._resolveDayWidth();
    const next = clampDayWidth(cur * factor);
    if (next === cur) return;
    const body = this._scroll.bodyEl;
    if (body) {
      // [WHY] 以光标为锚点：光标下的日期在缩放前后保持同一屏幕位置
      //（Flow 的 wheelZoomViewport 同式，时间轴仅横向）
      const localX = anchorX != null ? anchorX - this._listWidth() : body.clientWidth / 2;
      this._scroll.queueScrollLeft(zoomScrollLeft(localX, body.scrollLeft, cur, next));
    }
    this._dayWidth = next;
    this.requestUpdate();
  }

  // ── 选择 / 键盘 ──────────────────────────────────────

  private _onPointerDown = (e: PointerEvent): void => {
    // [WHY] 触摸端长按菜单：iOS Safari 长按不派发 contextmenu，touch 起手即计时；
    // 命中拖拽热区（条形/手柄/锚点）时改走拖拽，取消计时
    if (e.pointerType === "touch") this._lp.arm(e.clientX, e.clientY);
    else this._lp.cancel();
    const hit = resolvePointerHit(eventChain(e, this));
    if (hit.expandId) {
      this.toggleExpand(hit.expandId);
      return;
    }
    // 手势热区：最内层 data-mode 优先（handle/connect > progress > bar）
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

  /**
   * 键盘微调：平移 / 改结束日期（`Alt + 方向键`，见 `handleNavKey`）。
   *
   * [WHY 复用 `dateCommitFor` + `applyCommit`，不另写一套改日期的代码]
   * 拖拽那条路已经把「像素 → 天数 → 吸附工作日 → 按原工期推终点 → 落模型 →
   * 级联顺延 → 发 z-gantt-change」整条链跑顺了。键盘若自己 `task.start_date = …`
   * 再 `emit`，立刻就有第二个定义：周末吸附规则、跨周末工期、auto-schedule 级联
   * 只要有一处漏掉，鼠标和键盘做同一件事会得到不同结果 —— 而且**界面上都正常**。
   *
   * @returns false = 这条任务不能这么调（没有日期 / 里程碑不能缩放 / 已经到边界）
   */
  nudge(mode: "move" | "resize-start" | "resize-end", days: number): boolean {
    if (this.readonly || !days) return false;
    const id = this.selectedId;
    const task = id ? this.getTaskById(id) : null;
    if (!task) return false;
    const commit = dateCommitFor(
      {
        mode,
        taskId: task.id,
        startDate: task.start_date != null ? String(task.start_date) : null,
        endDate: task.end_date != null ? String(task.end_date) : null,
        isMilestone: task.is_milestone === true,
        // 键盘微调只作用于计划条；实际条（real_*）是另一组字段，键位留给后续
        isReal: false,
        snapWeekends: !this.showWeekends,
      },
      days,
    );
    if (!commit) return false;
    applyCommit(commit, this as unknown as DragApplyHost);
    return true;
  }

  /**
   * 键盘改进度（`Alt + ↑/↓`，每次 5%）。
   *
   * [WHY 同样走 applyCommit] 进度条拖拽的最后一步就是 `mode="progress"` 的
   * `DragCommit`；这里直接造同一个载荷，进度钳制与事件全部沿用。
   */
  nudgeProgress(delta: number): boolean {
    if (this.readonly || !delta) return false;
    const id = this.selectedId;
    const task = id ? this.getTaskById(id) : null;
    if (!task) return false;
    const cur = Number.isFinite(Number(task.progress)) ? Number(task.progress) : 0;
    const next = Math.min(100, Math.max(0, Math.round(cur + delta)));
    if (next === cur) return false;
    applyCommit({ mode: "progress", taskId: task.id, progress: next }, this as unknown as DragApplyHost);
    return true;
  }

  /**
   * `Alt + Enter`：把当前项设为连线起点（前置任务）。再按一次（同一项）= 取消。
   *
   * [WHY 不在这里就建依赖] 一条依赖有起点也有终点，一次按键只能确定一端。硬做成
   * 「Alt+Enter 建到上一条/下一条」等于替用户猜目标，猜错了他还得先删掉再重来 ——
   * 而删依赖同样只有鼠标路径。两段式（记住起点 → 上下键选目标 → 回车）没有猜的成分。
   */
  toggleLink(): void {
    if (this.readonly) return;
    const id = this.selectedId;
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

  /**
   * 回车：在当前选中项与连线起点之间建立依赖（默认 FS = 完成后开始）。
   *
   * [WHY 走 `applyCommit` 而不是自己 push 到 dependencies] 那条路已经有「可取消的
   * `z-gantt-connect` 事件 + 去重 + auto-schedule 级联 + `z-gantt-change`」。
   * 键盘自己 push 的话，宿主 `preventDefault()` 拦不住、重复连线会叠两条、
   * 顺延也不触发 —— 三处都只在特定数据下才看得出来。
   *
   * @returns false = 此刻不在连线模式（调用方据此不吞回车）
   */
  commitLink(): boolean {
    const from = this._linkSource;
    if (!from) return false;
    const to = this.selectedId;
    if (!to) {
      this._announce(COPY.ganttLinkNoSelection);
      return true;
    }
    if (to === from) {
      this._announce(COPY.ganttLinkRejectedSelf);
      return true;
    }
    if (!this.getTaskById(from)) {
      // 起点被删了（或数据整体换了一份）：静默退出，不要连出一条指向幽灵任务的边
      this._linkSource = null;
      this._announce(COPY.ganttLinkCancelled);
      return true;
    }
    const deps = this.liveData().dependencies ?? [];
    if (deps.some((d) => d.predecessor_id === from && d.successor_id === to)) {
      this._linkSource = null;
      this._announce(COPY.ganttLinkRejectedDuplicate);
      return true;
    }

    const names = { from: this._taskName(from), to: this._taskName(to) };
    this._linkSource = null;
    // connectType 固定 FS：键盘没有「从哪条边出发」这个信息，而 FS 是绝大多数
    // 排期工具的默认（指针那条路按左右锚边推断，这里不冒充它）。
    applyCommit(
      { mode: "connect", taskId: from, predecessorId: from, successorId: to, connectType: "FS" },
      this as unknown as DragApplyHost,
    );
    this._announce(fillCopy(COPY.ganttLinkDone, names));
    return true;
  }

  /** `Esc`：退出连线模式。`false` = 本来就没在连线（调用方据此退回「取消选中」）。 */
  cancelLink(): boolean {
    if (!this._linkSource) return false;
    this._linkSource = null;
    this._announce(COPY.ganttLinkCancelled);
    return true;
  }

  /** 排队一条播报；渲染后由 `updated()` 写进 live region。 */
  private _announce(msg: string): void {
    this._announceMsg = msg;
    this.requestUpdate();
  }

  private _taskName(id: string): string {
    const t = this.getTaskById(id);
    const name = String(t?.name ?? "").trim();
    return name || id;
  }

  /**
   * ← / → ：收起 / 展开当前项。返回 `false` 表示「当前项没有子节点」，由调用方
   * 退回横向滚动（见 `handleNavKey`）。
   *
   * [WHY 走 `toggleExpand` 而不是自己改 `is_expanded`] 那条路径已经处理了「叶子
   * 上写 is_expanded 是噪声字段」「增删行后行高/滚动位置重算」两件事，复制一份
   * 就等于留下两份会漂移的定义。
   */
  private _toggleCurrent(open: boolean): boolean {
    const id = this.selectedId;
    if (id == null) return false;
    const kids = this._treeCache?.childrenOf.get(id) ?? [];
    if (!kids.length) return false;
    const task = this.getTaskById(id);
    const expanded = task?.is_expanded !== false;
    // 已经是目标状态：也要吞掉按键（否则「已展开时按 → 」会顺手把时间轴推一下，
    // 用户以为按错了）
    if (expanded !== open) this.toggleExpand(id);
    return true;
  }

  /** Home / End：跳到首行 / 末行（`_moveSelection` 只走相对位移，跳不到）。 */
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

  // ── 事件 ─────────────────────────────────────────────

  private _emitViewChange(): void {
    if (this._viewChangePending) return;
    this._viewChangePending = true;
    queueMicrotask(() => {
      this._viewChangePending = false;
      if (this.isConnected) this.emit("z-gantt-view-change", { mode: this.viewMode });
    });
  }

  // ── 右键菜单 ─────────────────────────────────────────

  private _onContextMenu = (e: MouseEvent): void => {
    this._menu.open(e);
  };
}

defineElement("z-gantt", ZGantt);
