// [WHY] 2026-10-25 系统审计：从 Gantt.ts（675 行）按职责拆出
// 职责：指针命中解析、缩放/键盘导航的纯计算，以及拖拽状态机（窗口监听 + 预览/提交）。

import { applyCommit, applyPreview, barGeom, realGeom, type DragApplyHost } from "./drag-apply.js";
import { GanttDragController, type DragGeometry } from "./drag-controller.js";
import type { TaskLayout, ZGanttDragMode } from "./types.js";
import { wheelZoomIntent, PointerDragSession, startEdgeScroll, type PointerDragDelta } from "../../primitives/index.js";

/** px/天 缩放边界 */
export const MIN_DAY_WIDTH = 1;
export const MAX_DAY_WIDTH = 120;
export const ZOOM_STEP = 1.15;

/**
 * 滚轮缩放一档的倍率；不是缩放手势时返回 null（调用方须放行，让页面照常滚动）。
 *
 * [WHY null 而非 1] 「返回 1」与「真的缩放 1 倍」在调用方看来同形，久了就没人
 * 记得要不要 preventDefault。null 把「放行」写进类型里。
 * 日宽是离散量，所以按方向走一档；Flow 的视口是连续量，按 deltaY 算因子 ——
 * 统一的是手势判定（primitives/wheel-zoom），量纲各归各。
 */
export function wheelZoomStep(e: WheelEvent): number | null {
  const intent = wheelZoomIntent(e);
  if (!intent) return null;
  return intent.direction > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
}

export function clampDayWidth(v: number): number {
  return Math.min(MAX_DAY_WIDTH, Math.max(MIN_DAY_WIDTH, v));
}

/** composedPath 优先，缺失时沿 parentElement/host 回退（flow 三级 fallback 惯例） */
export function eventChain(e: Event, host: Element): Element[] {
  const path = typeof e.composedPath === "function" ? (e.composedPath() as EventTarget[]) : [];
  if (path.length) {
    return path.filter((t): t is Element => t instanceof Element);
  }
  const out: Element[] = [];
  let el: Element | null = e.target instanceof Element ? e.target : null;
  while (el && el !== host) {
    out.push(el);
    el = el.parentElement ?? ((el.getRootNode() as ShadowRoot | null)?.host as Element | null) ?? null;
  }
  return out;
}

/** 一次 pointerdown 在事件链上命中到什么。 */
export interface PointerHit {
  /** 展开/折叠箭头所属任务 */
  expandId: string | null;
  /** 手势热区元素（最内层 data-mode） */
  modeEl: Element | null;
  mode: ZGanttDragMode | null;
  /** 拖拽目标：热区的 owner 优先，其次热区自身 */
  dragTaskId: string | null;
  /** 无拖拽时被点中的任务（选中用） */
  selectId: string | null;
}

/** 手势热区：最内层 data-mode 优先（handle/connect > progress > bar） */
export function resolvePointerHit(chain: Element[]): PointerHit {
  const expander = chain.find((el) => el.classList?.contains("z-gantt__expander"));
  const modeEl = chain.find((el) => el.hasAttribute?.("data-mode")) ?? null;
  const mode = (modeEl?.getAttribute("data-mode") ?? null) as ZGanttDragMode | null;
  const owner = chain.find((el) => el.hasAttribute?.("data-task-id"));
  const hit = chain.find((el) => el.hasAttribute?.("data-task-id"));
  return {
    expandId: expander?.getAttribute("data-task-id") ?? null,
    modeEl,
    mode,
    dragTaskId: owner?.getAttribute("data-task-id") ?? modeEl?.getAttribute("data-task-id") ?? null,
    selectId: hit ? hit.getAttribute("data-task-id") : null,
  };
}

/** 键盘上下移动后的目标行下标（-1 = 当前选中不在列表里）。 */
export function nextRowIndex(rows: TaskLayout[], selectedId: string | null, delta: number): number {
  if (!rows.length) return -1;
  const cur = rows.findIndex((r) => r.task.id === selectedId);
  const next =
    cur === -1 ? (delta > 0 ? 0 : rows.length - 1) : Math.min(rows.length - 1, Math.max(0, cur + delta));
  return next === cur ? -1 : next;
}

/** 以光标为锚的横向滚动位置：光标下的日期在缩放前后保持同一屏幕位置。 */
export function zoomScrollLeft(localX: number, scrollLeft: number, cur: number, next: number): number {
  const dayOffset = (localX + scrollLeft) / cur;
  return Math.max(0, dayOffset * next - localX);
}

export interface NavActions {
  select(id: string | null): void;
  move(delta: number): void;
  scrollBy(delta: number): void;
  /** 跳到首行 / 末行（Home / End）；选项很多时逐个按方向键不现实。 */
  jump(edge: "first" | "last"): void;
  /** ←/→：收起 / 展开当前项（APG tree 模式）。`false` = 当前项没有子节点。 */
  toggle(open: boolean): boolean;
  /** Alt+←/→：平移 / 改结束日期（天）。`false` = 这条任务不能这么调。 */
  nudge(mode: "move" | "resize-start" | "resize-end", days: number): boolean;
  /** Alt+↑/↓：改进度（百分点）。 */
  nudgeProgress(delta: number): boolean;
  /**
   * `Alt + Enter`：把当前项设为「连线起点」（两段式建依赖的第一步）。
   * 再次按在同一项上 = 取消。
   */
  toggleLink(): void;
  /** 回车：把当前选中项接在连线起点之后。`false` = 不在连线模式（键位不吞）。 */
  commitLink(): boolean;
  /** `Esc` 在连线模式里先取消连线，而不是取消选中。`false` = 本来就没在连线。 */
  cancelLink(): boolean;
}

/** 进度键盘步长（每按一次多少个百分点）。 */
export const PROGRESS_STEP = 5;

/**
 * 键盘模型（`role="tree"`，APG tree 模式）：
 *   ↑↓ 切换当前项 · → 展开 · ← 收起 · Home/End 首尾 · Esc 取消选中
 *   Shift+←/→ 横向滚动时间轴
 *   Alt+Enter 记住连线起点 · 回车建立依赖 · Esc 取消连线
 *
 * [WHY ←→ 从「滚动时间轴」改成「展开/收起」] 2026-11-16 之前，展开三角只能靠
 * `pointerdown` 命中 `data-task-id` 生效 —— 键盘用户**根本没法展开任何一级**，而
 * 横向滚动只是便利。一个「功能完全不可达」和「少一种滚法」之间没必要犹豫。
 * 横移没有丢：Shift+←/→ 保留原行为，提示语里写了。
 */
export function handleNavKey(e: KeyboardEvent, nav: NavActions): void {
  // [WHY Alt 先于普通方向键判] 拖拽是唯一能改日期的途径时，键盘用户连「把这条任务
  // 往后挪一天」都做不到。Alt+方向键是甘特类工具里最通用的一档（Google Calendar /
  // Asana 同款），且不与已有的 ↑↓ / ←→ / Shift+←→ 撞车。
  if (e.altKey && !e.ctrlKey && !e.metaKey) {
    // Alt+Enter 进/出连线模式。与下面的方向键同属「Alt = 编辑」这一档，
    // 且 Enter 在树里本来没有默认动作（APG 的 Enter 是「激活」，甘特没有激活语义）。
    if (e.key === "Enter") {
      e.preventDefault();
      nav.toggleLink();
      return;
    }
    const forward = e.key === "ArrowRight";
    const backward = e.key === "ArrowLeft";
    if (forward || backward) {
      e.preventDefault();
      const days = forward ? 1 : -1;
      // Alt+Shift+←/→ 改结束日期（= 拖右柄）；Alt+←/→ 整体平移
      nav.nudge(e.shiftKey ? "resize-end" : "move", days);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      nav.nudgeProgress(e.key === "ArrowUp" ? PROGRESS_STEP : -PROGRESS_STEP);
      return;
    }
  }

  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      nav.move(1);
      break;
    case "ArrowUp":
      e.preventDefault();
      nav.move(-1);
      break;
    case "Home":
      e.preventDefault();
      nav.jump("first");
      break;
    case "End":
      e.preventDefault();
      nav.jump("last");
      break;
    case "ArrowRight":
      e.preventDefault();
      if (e.shiftKey) nav.scrollBy(60);
      // [WHY 展开失败要兜住] 叶子节点不能展开，但右箭头在时间轴上仍应有反应 ——
      // 交给 scrollBy 把「没子节点」这件事变成一次小幅横移，按下去不会「死键」。
      else if (!nav.toggle(true)) nav.scrollBy(60);
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (e.shiftKey) nav.scrollBy(-60);
      else if (!nav.toggle(false)) nav.scrollBy(-60);
      break;
    case "Escape":
      // [WHY 先问连线] 连线模式里按 Esc 的意图几乎一定是「退出连线」，而不是
      // 「把选中也清掉」—— 清掉的话下一步还得重新找那条任务，等于罚了两遍。
      if (!nav.cancelLink()) nav.select(null);
      break;
    case "Enter":
      // 不在连线模式时**不吞键**：宿主可能把回车用在别处，返 false 就走默认行为。
      if (nav.commitLink()) e.preventDefault();
      break;
  }
}

/** 拖拽管线需要宿主提供的全部信息（值 + 回调，元素侧从自身状态实时取）。 */
export interface DragPort {
  body(): HTMLElement | null;
  rows(): TaskLayout[];
  range(): { start: Date; end: Date } | null;
  rowHeight(): number;
  dayWidth(): number;
  showWeekends(): boolean;
  root(): ShadowRoot | null;
  rect(): DOMRect;
  chain(e: Event): Element[];
  /** drag-apply 宿主（提交时落模型） */
  host(): DragApplyHost;
  requestUpdate(): void;
}

// [WHY] 手动 DOM 管线：拖拽期零 requestUpdate，preview 只直写
// transform/width/path.d（drag-apply.applyPreview）；drop 后一次提交模型 +
// 单次重建（全量 render 自然恢复被改写的内联样式，无需逐项清理）。
export class GanttDragSession {
  private readonly _drag = new GanttDragController();
  /** 拖拽期直接改写样式的元素引用（innerHTML 重建即失效，收尾置空） */
  private _barEl: HTMLElement | null = null;
  private _progressEl: HTMLElement | null = null;
  private _tempLineEl: SVGPathElement | null = null;
  /** begin 时的 host rect（拖拽期窗口不动，坐标换算基准固定） */
  private _hostRect: DOMRect | null = null;
  private _session: PointerDragSession | null = null;
  /** 边缘自动滚动的帧循环（拖到视口外继续走，见 primitives/edge-scroll）。 */
  private _edge: { stop(): void } | null = null;
  /** 最后一次指针位置（视口坐标）：容器自己滚了的时候，用它重算预览。 */
  private _lastPointer: { x: number; y: number } | null = null;

  constructor(private readonly p: DragPort) {}

  get active(): boolean {
    return this._drag.active;
  }

  begin(e: PointerEvent, modeEl: Element, mode: ZGanttDragMode, taskId: string): boolean {
    const body = this.p.body();
    const grid = body?.querySelector(".z-gantt__grid");
    const range = this.p.range();
    const rows = this.p.rows();
    if (!body || !grid || !range) return false;
    const l = rows.find((r) => r.task.id === taskId);
    // summary 条日期由子叶聚合，拖拽无意义（仍可选中）
    if (!l || l.isSummary) return false;

    const chain = this.p.chain(e);
    const isReal = chain.some((el) => el.classList?.contains("z-gantt__bar--real"));
    // 实际条只支持整体平移（渲染层无 resize/progress 热区，此处双保险）
    if ((mode === "resize-start" || mode === "resize-end") && (l.isMilestone || isReal)) return false;

    const geom = isReal ? realGeom(l) : barGeom(l, this.p.rowHeight());
    const task = l.task;
    const startDate = isReal
      ? String(task.real_start_date ?? task.start_date ?? "")
      : String(task.start_date ?? "");
    const endDate = isReal
      ? String(task.real_end_date ?? task.end_date ?? "")
      : String(task.end_date ?? "");
    if (mode !== "connect" && !startDate) return false;

    const hostRect = this.p.rect();
    const bodyRect = body.getBoundingClientRect();
    const gridRect = grid.getBoundingClientRect();
    this._drag.begin(
      {
        rangeStart: range.start,
        dayWidth: this.p.dayWidth(),
        rowHeight: this.p.rowHeight(),
        chartLeft: bodyRect.left - hostRect.left,
        gridTop: gridRect.top - hostRect.top,
        scrollLeft: body.scrollLeft,
      },
      {
        mode,
        taskId,
        barX: geom.x,
        barWidth: geom.w,
        barCenterY: geom.centerY,
        startDate,
        endDate,
        progress: l.progress,
        isMilestone: l.isMilestone,
        isReal,
        snapWeekends: !this.p.showWeekends(),
        rowAt: (gridY: number) => {
          const r = rows[Math.floor(gridY / this.p.rowHeight())];
          if (!r) return null;
          // 里程碑目标行给外接框宽度，保证连线落点判定有几何可用
          const g = r.isMilestone ? { x: r.x - 7, w: 14 } : { x: r.x, w: r.width };
          return { id: r.task.id, barX: g.x, barWidth: g.w };
        },
      },
      { x: e.clientX - hostRect.left, y: e.clientY - hostRect.top },
    );
    this._hostRect = hostRect;

    // [WHY] milestone 拖拽写 anchor（不旋转的外接框）而非菱形本体：
    // 本体在 anchor 内 left:0，直写 left 会双重偏移
    const barEl = modeEl.closest(".z-gantt__bar, .z-gantt__milestone-anchor");
    this._barEl = barEl instanceof HTMLElement ? barEl : null;
    this._progressEl = this._barEl?.querySelector(".z-gantt__bar-progress") ?? null;
    this._tempLineEl = this.p.root()?.querySelector("[data-ref=temp-line]") ?? null;
    // [WHY 起手/阈值/收尾交给 primitives/pointer-drag] 2026-11-20（issue IKWNJL）：
    // 这里原来自己挂 window 三个监听、自己在 controller 里用 3px 分轴判「算不算拖动」，
    // 与流程图 2px 曼哈顿、图表 4px 各说各话。原语统一成欧氏 3px，并接管
    // pointercancel 复位、Esc 中止、user-select 成对还原、拖动后吞 click。
    this._session?.dispose();
    this._session = new PointerDragSession({
      onMove: (d) => this._handleMove(d),
      onEnd: () => this._onUp(),
      onCancel: () => this._onCancel(),
    });
    this._lastPointer = { x: e.clientX, y: e.clientY };
    this._session.begin(e);
    // [WHY 甘特必须两轴] 时间轴横向才是主方向：只滚纵向的话，"把任务条拖到右边
    // 改远处的日期"仍然做不到 —— 而 issue IKWNJP 记的正是这件事。
    this._edge?.stop();
    this._edge = startEdgeScroll({
      point: () => this._lastPointer ?? { x: 0, y: 0 },
      el: body,
      axis: "xy",
      onScroll: () => this._refreshPreview(),
    });
    return true;
  }

  /**
   * 容器自己滚了：刷新坐标基准再重算预览。
   *
   * [WHY 要刷新几何] `begin()` 时的 `chartLeft` / `gridTop` 是快照（刻意省掉每帧读布局），
   * 容器一滚它们相对 host 就变了；不刷新的话预览按旧基准画，滚一段后任务条和指针分家。
   */
  private _refreshPreview(): void {
    const pt = this._lastPointer;
    const body = this.p.body();
    if (!pt || !body || !this._hostRect) return;
    const grid = body.querySelector(".z-gantt__grid");
    const gridRect = grid?.getBoundingClientRect();
    const patch: Partial<DragGeometry> = {
      chartLeft: body.getBoundingClientRect().left - this._hostRect.left,
      scrollLeft: body.scrollLeft,
    };
    if (gridRect) patch.gridTop = gridRect.top - this._hostRect.top;
    this._drag.setGeometry(patch);
    const preview = this._drag.update(
      { x: pt.x - this._hostRect.left, y: pt.y - this._hostRect.top },
      true,
    );
    if (preview) {
      applyPreview(preview, {
        bar: this._barEl,
        progress: this._progressEl,
        tempLine: this._tempLineEl,
      });
    }
  }

  /** 取消：清掉拖拽状态并重建（恢复被直写的内联样式）。 */
  cancel(): void {
    if (!this._drag.active) return;
    this._drag.cancel();
    this._end();
    this.p.requestUpdate();
  }

  /** 宿主断开时的收尾：取消但不重渲染。 */
  abort(): void {
    if (!this._drag.active) return;
    this._drag.cancel();
    this._end();
  }

  private _end(): void {
    // 归原语管的 window 监听在这里一并摘掉（dispose 只清理、不回调 —— 此时可能在卸载中）
    this._session?.dispose();
    this._session = null;
    this._edge?.stop();
    this._edge = null;
    this._lastPointer = null;
    this._barEl = null;
    this._progressEl = null;
    this._tempLineEl = null;
    this._hostRect = null;
  }

  private _handleMove = (d: PointerDragDelta): void => {
    if (!this._drag.active || !this._hostRect) return;
    this._lastPointer = { x: d.x, y: d.y };
    const preview = this._drag.update(
      { x: d.x - this._hostRect.left, y: d.y - this._hostRect.top },
      d.moved,
    );
    if (preview) {
      applyPreview(preview, {
        bar: this._barEl,
        progress: this._progressEl,
        tempLine: this._tempLineEl,
      });
    }
    d.event.preventDefault();
  };

  private _onUp = (): void => {
    if (!this._drag.active) return;
    const commit = this._drag.end();
    this._end();
    // [WHY] 无提交也要重建：恢复拖拽期被直写的内联样式
    if (commit) applyCommit(commit, this.p.host());
    else this.p.requestUpdate();
  };

  private _onCancel = (): void => {
    if (!this._drag.active) return;
    this._drag.cancel();
    this._end();
    this.p.requestUpdate();
  };
}
