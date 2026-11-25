// 指针拖拽的**手势层**：一次 pointerdown → pointerup 之间，只回答三件事 ——
// 有没有越过起手阈值、位移多少、这一下算拖还是算点。
//
// [WHY 只做这一层] 库里有十处自写拖拽（编辑器 PC / H5、报表列头、甘特、图表、
// 流程图、滑块…），判定阈值出现了 2 / 3 / 4 / 8 / 10 五种。但它们的**落点计算**
// 完全不同（栅格第几行、时间轴第几天、列的新下标、时间轴的哪一帧），那不是 L0
// 该知道的东西。所以这里只管手势：起手、阈值、位移、结束/取消。
// 落点与提交留给宿主 —— 与 `report/gantt/drag-controller` 里那个「纯状态机 +
// 宿主提交」的分工同型，只是再往下切了一层。
//
// [WHY 阈值只能有一个默认值] 2px 在触控板上会被手抖判成拖动（想点一下变成拖了），
// 4px 以上在密集表头里想微调一下又完全没反应。3px 是两端都不明显的位置，
// 也是原先甘特已经在用的值。要例外就得显式传 —— 默认只此一个。
//
// 三件「每个拖拽实现都会踩一次」的事，一并在这里吃掉：
//   1. `pointercancel` 必须复位：触屏按住后一滚列表，浏览器发 cancel 而不是 up。
//      不复位则状态永远 active，下一次 pointerdown 叠在旧的起点上。
//   2. 拖动后紧随的那一次 `click` 要吞掉：浏览器顺序是 pointerup → click，
//      列表里拖一次会顺手打开一次详情。
//   3. `user-select` 要**成对还原**（存原值再写回，不是置空）：设置与还原不在同一处
//      的写法一旦复制走样，症状是「整页突然选不中字」。

/** 一次拖拽中的位移快照。 */
export interface PointerDragDelta {
  /** 当前指针位置（视口坐标） */
  x: number;
  y: number;
  /** 相对起手位置的位移 */
  dx: number;
  dy: number;
  /**
   * 是否已越过起手阈值。
   * false 时宿主通常只做「按住」反馈（如高亮），true 之后才当作拖动。
   */
  moved: boolean;
  event: PointerEvent;
}

export interface PointerDragOptions {
  /** 起手阈值 px，欧氏距离。默认 3。 */
  threshold?: number;
  /** 拖动期间锁 `body` 的 user-select。默认 true。 */
  lockSelection?: boolean;
  /** 拖动结束后吞掉紧随的 click。默认 true。 */
  suppressClick?: boolean;
  /** Esc 中止本次拖拽（走 onCancel）。默认 true。 */
  escCancel?: boolean;
  /**
   * 要把指针捕获到哪个元素。默认 **null（不捕获）**。
   *
   * [WHY 不默认捕获] `setPointerCapture` 会把后续 pointer 事件的 `target`
   * 改成捕获元素，`composedPath()` 也跟着变。流程图靠 up 事件的路径找连线落点，
   * 一捕获就找不到手柄了 —— 这类破坏不会报错，只是「拖完连不上」。
   * 宿主确认自己不依赖 target 时再显式打开。
   */
  captureTarget?: Element | null;
}

export interface PointerDragHandlers {
  /** 每次 pointermove 都调（含未越过阈值时），是否当拖动由宿主按 `moved` 判。 */
  onMove(d: PointerDragDelta): void;
  /** pointerup：松手。`moved=false` 表示这一下是点击。 */
  onEnd(d: PointerDragDelta): void;
  /** `pointercancel` / Esc：复位，不提交。 */
  onCancel?(): void;
}

/** 默认起手阈值 px（欧氏距离）。 */
export const DRAG_THRESHOLD = 3;

/**
 * 一次拖拽会话。宿主在 pointerdown 里 new 一个并 `begin(e)`，用完即弃。
 *
 * [WHY 一次性对象而不是长命控制器] 会话的寿命就是一根手指按住的时长。
 * 长命控制器要自己维护「现在是否 active、旧起点有没有清干净」，
 * 而这正是 cancel 类 bug 的来源；每次按下新建一个，状态天然清零。
 */
export class PointerDragSession {
  private _origin: { x: number; y: number } | null = null;
  private _last: PointerDragDelta | null = null;
  private _moved = false;
  private _done = false;
  private _prevUserSelect: string | null = null;
  private _captured: number | null = null;
  private readonly _threshold: number;

  constructor(
    private readonly _handlers: PointerDragHandlers,
    private readonly _opts: PointerDragOptions = {},
  ) {
    this._threshold = _opts.threshold ?? DRAG_THRESHOLD;
  }

  get active(): boolean {
    return this._origin !== null && !this._done;
  }

  get moved(): boolean {
    return this._moved;
  }

  begin(e: PointerEvent): void {
    if (this._origin) return;
    this._origin = { x: e.clientX, y: e.clientY };
    this._last = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: false, event: e };

    if (this._opts.lockSelection !== false) {
      this._prevUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
    }
    if (this._opts.captureTarget) {
      try {
        this._opts.captureTarget.setPointerCapture(e.pointerId);
        this._captured = e.pointerId;
      } catch {
        // 元素已从文档移除等情况：不捕获也能靠 window 监听收到 move/up
        this._captured = null;
      }
    }
    window.addEventListener("pointermove", this._onMove);
    window.addEventListener("pointerup", this._onUp);
    window.addEventListener("pointercancel", this._onCancelEvent);
    if (this._opts.escCancel !== false) window.addEventListener("keydown", this._onKey);
  }

  /** 主动中止（例如宿主自己的 Esc / 业务取消）。幂等。 */
  abort(): void {
    if (this._done) return;
    this._finish();
    this._handlers.onCancel?.();
  }

  /**
   * 只清理，**不回调**。组件卸载时用。
   *
   * [WHY 要和 abort 分开] 卸载时宿主已经拆了一半 DOM，此时再回调 onCancel，
   * 里面若去 querySelector / 改 select 就是对着空壳操作 —— 报错位置还会指到
   * 卸载流程里，看起来像「组件卸载有 bug」。清理与通知是两件事。
   */
  dispose(): void {
    if (this._done) return;
    this._finish();
  }

  private _onMove = (e: PointerEvent): void => {
    const o = this._origin;
    if (!o || this._done) return;
    const dx = e.clientX - o.x;
    const dy = e.clientY - o.y;
    if (!this._moved && Math.hypot(dx, dy) > this._threshold) this._moved = true;
    this._last = { x: e.clientX, y: e.clientY, dx, dy, moved: this._moved, event: e };
    this._handlers.onMove(this._last);
  };

  private _onUp = (e: PointerEvent): void => {
    if (this._done) return;
    const delta = this._last
      ? { ...this._last, x: e.clientX, y: e.clientY, moved: this._moved, event: e }
      : { x: e.clientX, y: e.clientY, dx: 0, dy: 0, moved: this._moved, event: e };
    const moved = this._moved;
    this._finish();
    if (moved && this._opts.suppressClick !== false) this._suppressNextClick();
    this._handlers.onEnd(delta);
  };

  // 触屏滚动手势一旦被识别，浏览器发 cancel 而不是 up：必须复位，且不提交
  private _onCancelEvent = (): void => {
    if (this._done) return;
    this._finish();
    this._handlers.onCancel?.();
  };

  private _onKey = (e: KeyboardEvent): void => {
    if (e.key !== "Escape" || this._done) return;
    e.stopPropagation();
    this.abort();
  };

  /** 摘监听 / 还原 user-select / 释放捕获。只做一次。 */
  private _finish(): void {
    this._done = true;
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    window.removeEventListener("pointercancel", this._onCancelEvent);
    window.removeEventListener("keydown", this._onKey);
    if (this._prevUserSelect !== null) {
      document.body.style.userSelect = this._prevUserSelect;
      this._prevUserSelect = null;
    }
    if (this._captured !== null) {
      try {
        this._opts.captureTarget?.releasePointerCapture(this._captured);
      } catch {
        // 元素已被移除：捕获随元素一并释放
      }
      this._captured = null;
    }
    this._origin = null;
  }

  /**
   * 吞掉紧随其后的那一次 click。
   *
   * [WHY 用 capture 且 once] 在 window 的**捕获**阶段拦，才能赶在祖先/文档上的
   * 点击处理之前；用 once 是因为只该吞这一次。不吞的话，列表里拖一行会顺手
   * 打开一次详情（pointerup → click 是浏览器固定顺序）。
   */
  private _suppressNextClick(): void {
    const swallow = (ev: Event): void => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    // [WHY 再补一个 timer 摘掉] 某些情况下浏览器不发 click（如拖到窗口外松手），
    // once 监听就会一直挂着，变成「下一次正常点击被吞掉」—— 那更难排查。
    setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
  }
}
