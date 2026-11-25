// [WHY] 滚动编排控制器（纯类，非 Element）：表头横向跟随 / 左列表纵向跟随 /
// 虚拟滚动行窗口化 / render 前捕获 scrollTop（innerHTML 全量重建会复位）。
// 依赖经 deps() getter 惰性注入（每次求值取宿主当前渲染产物），控制器不持有
// 宿主引用。scroll 不冒泡且 shadow innerHTML 每次重建，只能直绑新 body 并按
// 元素身份守卫重绑（flow「只挂 host」惯例的例外）。
// See: wiki/requirements/REQ-018-gantt.md
import { renderChartRows, type ChartRenderOptions } from "./chart-render.js";
import { DEFAULT_COLUMNS, renderLeftListRows } from "./left-list.js";
import { mountGanttBars, mountGanttCells } from "./left-cell-mount.js";
import type { GanttListColumn, TaskLayout, ZGanttTask } from "./types.js";

/** 虚拟滚动上下 overscan 行数 */
export const VIRTUAL_OVERSCAN = 5;

/** 宿主渲染产物快照（deps() 每次求值取当前值；columns 已由宿主解析缺省） */
export interface GanttScrollDeps {
  rowHeight: number;
  rows: TaskLayout[];
  columns: GanttListColumn[];
  childrenOf: Map<string, ZGanttTask[]>;
  chartOpts: ChartRenderOptions | null;
  selectedId: string | null;
}

export class GanttScrollController {
  /** 当前滚动容器 / 表头内层（innerHTML 重建后由 attach 重查） */
  bodyEl: HTMLElement | null = null;
  headerInnerEl: HTMLElement | null = null;
  private _listBodyEl: HTMLElement | null = null;
  private _rowsSliceEl: HTMLElement | null = null;
  private _listSliceEl: HTMLElement | null = null;
  private _boundBody: HTMLElement | null = null;
  /** render 期捕获的滚动位置（attach 恢复；scrollLeft 供缩放/命令式定位排队） */
  private _pendingScrollLeft: number | null = null;
  private _pendingScrollTop: number | null = null;
  /** 当前渲染窗口 [start, end)，全量渲染时为 [0, rows.length) */
  private _winStart = 0;
  private _winEnd = 0;

  constructor(private readonly deps: () => GanttScrollDeps) {}

  get winStart(): number {
    return this._winStart;
  }

  get winEnd(): number {
    return this._winEnd;
  }

  get pendingScrollTop(): number | null {
    return this._pendingScrollTop;
  }

  /** render 前调用：捕获旧 body 纵向位置，attach 时恢复 */
  captureScroll(): void {
    this._pendingScrollTop = this.bodyEl?.scrollTop ?? null;
  }

  /** 缩放锚点/命令式定位排队 scrollLeft，attach 时应用 */
  queueScrollLeft(v: number): void {
    this._pendingScrollLeft = v;
  }

  /** render 期登记窗口（attach 按恢复后的 scrollTop 经 _rewindow 校准） */
  setWindow(start: number, end: number): void {
    this._winStart = start;
    this._winEnd = end;
  }

  /**
   * updated() 钩子调用：重查元素（innerHTML 每次重建）、按元素身份守卫重绑
   * scroll、恢复 render 前捕获的滚动位置、同步表头/左列表并校准窗口
   */
  attach(root: ShadowRoot): void {
    this.bodyEl = root.querySelector(".z-gantt__body");
    this.headerInnerEl = root.querySelector(".z-gantt__header-inner");
    this._listBodyEl = root.querySelector(".z-gantt__list-body");
    if (this.bodyEl !== this._boundBody) {
      this._boundBody?.removeEventListener("scroll", this._onBodyScroll);
      this.bodyEl?.addEventListener("scroll", this._onBodyScroll);
      this._boundBody = this.bodyEl;
    }
    if (this._pendingScrollLeft != null && this.bodyEl) {
      this.bodyEl.scrollLeft = this._pendingScrollLeft;
      this._pendingScrollLeft = null;
    }
    // [WHY] 恢复 render 前捕获的纵向位置：innerHTML 重建会把 scrollTop 复位到 0
    if (this._pendingScrollTop != null && this.bodyEl) {
      this.bodyEl.scrollTop = this._pendingScrollTop;
      this._pendingScrollTop = null;
    }
    this._rowsSliceEl = root.querySelector(".z-gantt__rows-slice");
    this._listSliceEl = root.querySelector(".z-gantt__list-slice");
    // 整树重建的左列由模板渲染（`gantt-view`），挂载在这里补；
    // 虚拟滚动换窗口时 `_rewindow` 会再挂一次（只覆盖新切片）
    this._mountCells(root, this.deps().rows);
    this._mountBars(root, this.deps().rows);
    this._syncScroll();
    this._rewindow();
  }

  /** 条内内容槽（`task.barTag`）：与左列分开挂，因为两边的行元素不同。 */
  private _mountBars(root: ParentNode, rows: ReadonlyArray<{ task: ZGanttTask }>): void {
    const byId = new Map(rows.map((r) => [r.task.id, r.task]));
    mountGanttBars(root, (id) => byId.get(id) ?? null, this.deps().selectedId);
  }

  /** 在某个渲染根里挂左列内容槽；行对象从这一批行里建小表（一屏而已）。 */
  private _mountCells(root: ParentNode, rows: ReadonlyArray<{ task: ZGanttTask }>): void {
    const d = this.deps();
    const byId = new Map(rows.map((r) => [r.task.id, r.task]));
    mountGanttCells(root, d.columns ?? DEFAULT_COLUMNS, (id) => byId.get(id) ?? null, d.selectedId);
  }

  detach(): void {
    this._boundBody?.removeEventListener("scroll", this._onBodyScroll);
    this._boundBody = null;
    this.bodyEl = null;
    this.headerInnerEl = null;
    this._listBodyEl = null;
    this._rowsSliceEl = null;
    this._listSliceEl = null;
  }

  /** 键盘左右横移视口 */
  nudgeScrollLeft(dx: number): void {
    if (this.bodyEl) this.bodyEl.scrollLeft += dx;
  }

  /** 键盘上下选行时保证目标行可见 */
  ensureRowVisible(index: number): void {
    const body = this.bodyEl;
    if (!body) return;
    const rh = this.deps().rowHeight || 1;
    const top = index * rh;
    if (top < body.scrollTop) body.scrollTop = top;
    else if (top + rh > body.scrollTop + body.clientHeight) {
      body.scrollTop = top + rh - body.clientHeight;
    }
  }

  /** 由滚动位置求行窗口 [start, end)；无布局（clientHeight<=0）回退全量 */
  windowFor(scrollTop: number, viewH: number, total: number): [number, number] {
    if (viewH <= 0) return [0, total];
    const rh = this.deps().rowHeight || 1;
    const first = Math.floor(scrollTop / rh);
    const viewRows = Math.max(1, Math.ceil(viewH / rh));
    let start = Math.max(0, first - VIRTUAL_OVERSCAN);
    let end = Math.min(total, first + viewRows + VIRTUAL_OVERSCAN);
    // [WHY] 底部钳制：scrollTop 超界（含 overscan 挤压）时切片整体内移，避免空窗
    if (end - start < viewRows) start = Math.max(0, end - viewRows);
    if (start > end) start = end;
    return [start, end];
  }

  private readonly _onBodyScroll = (): void => {
    this._syncScroll();
    // [WHY] 窗口变化只直写切片 innerHTML，不走 requestUpdate（重渲染会重建
    // 滚动容器复位 scrollTop，VirtualList 同式）
    this._rewindow();
  };

  private _syncScroll(): void {
    const body = this.bodyEl;
    if (!body) return;
    // 表头横向跟随（transform 优于 scrollLeft：header 自身 overflow hidden）
    if (this.headerInnerEl) {
      this.headerInnerEl.style.transform = `translateX(${-body.scrollLeft}px)`;
    }
    // 左列表纵向跟随；overflow:hidden 容器 scrollTop 可编程滚动
    const list = this._listBodyEl;
    if (list && list.scrollTop !== body.scrollTop) {
      list.scrollTop = body.scrollTop;
    }
  }

  /** 滚动后按需重写行/列表切片（窗口未变化时零开销） */
  private _rewindow(): void {
    const body = this.bodyEl;
    const d = this.deps();
    const opts = d.chartOpts;
    if (!body || !opts) return;
    const rows = d.rows;
    const [start, end] = this.windowFor(body.scrollTop, body.clientHeight, rows.length);
    if (start === this._winStart && end === this._winEnd) return;
    this._winStart = start;
    this._winEnd = end;
    const slice = rows.slice(start, end);
    const shift = `translateY(${start * d.rowHeight}px)`;
    if (this._rowsSliceEl) {
      this._rowsSliceEl.style.transform = shift;
      this._rowsSliceEl.innerHTML = renderChartRows(slice, opts);
      this._mountBars(this._rowsSliceEl, slice);
    }
    if (this._listSliceEl) {
      this._listSliceEl.style.transform = shift;
      this._listSliceEl.innerHTML = renderLeftListRows(slice, d.columns ?? DEFAULT_COLUMNS, {
        rowHeight: d.rowHeight,
        selectedId: d.selectedId,
        childrenOf: d.childrenOf,
      });
      // 内容槽：字符串里造不出组件实例，切片换完再挂。虚拟滚动每次换窗口都会走这里，
      // 漏了这一步就是「滚一下格子里变回纯文本」—— 不报错，只是变朴素。
      this._mountCells(this._listSliceEl, slice);
    }
  }
}
