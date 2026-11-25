export type Placement =
  | "top" | "top-start" | "top-end"
  | "bottom" | "bottom-start" | "bottom-end"
  | "left" | "left-start" | "left-end"
  | "right" | "right-start" | "right-end";

export type FloatingAnchor = HTMLElement | (() => HTMLElement | null);

/**
 * 坐标锚点：以视口坐标定位，没有 DOM 锚点。
 *
 * [WHY 需要它] 右键菜单/长按菜单在某一点弹出，而不是挂在某个元素上。此前甘特自己
 * `createElement + appendChild(body)` 手写了一份，绕开了定位器的翻转与 clamp。
 * 有了它，这类浮层仍然走 `FloatingPanelController`，定位只有一份实现。
 */
export interface AnchorPoint {
  x: number;
  y: number;
}

export interface PositionOptions {
  /** 元素锚点；与 `point` 二选一（同时给时以 `point` 为准）。 */
  anchor?: FloatingAnchor;
  /** 坐标锚点（右键菜单）。没有可跟随的滚动面，只在 resize 时重算。 */
  point?: AnchorPoint;
  floating: HTMLElement;
  placement?: Placement;
  offset?: number;
  flip?: boolean;
}

interface Rect {
  x: number; y: number; width: number; height: number;
}

const OPPOSITE: Record<string, string> = {
  top: "bottom", bottom: "top",
  left: "right", right: "left",
};

export class FloatingPosition {
  private _anchor: FloatingAnchor | null;
  private _point: AnchorPoint | null;
  private _floating: HTMLElement;
  private _placement: Placement;
  private _offset: number;
  private _flip: boolean;
  private _currentPlacement: Placement;
  private _cleanups: Array<() => void> = [];

  constructor(options: PositionOptions) {
    this._anchor = options.anchor ?? null;
    this._point = options.point ?? null;
    this._floating = options.floating;
    this._placement = options.placement ?? "bottom-start";
    this._offset = options.offset ?? 4;
    this._flip = options.flip ?? true;
    this._currentPlacement = this._placement;

    this._update();
    this._listen();
  }

  get currentPlacement(): Placement {
    return this._currentPlacement;
  }

  update(): void {
    this._update();
  }

  destroy(): void {
    for (const fn of this._cleanups) fn();
    this._cleanups = [];
  }

  private _resolveAnchor(): HTMLElement | null {
    if (!this._anchor) return null;
    return typeof this._anchor === "function" ? this._anchor() : this._anchor;
  }

  private _update(): void {
    let anchorRect: Rect;
    if (this._point) {
      // 坐标锚点没有「脱离文档」的问题，也不参与滚动跟随
      anchorRect = { x: this._point.x, y: this._point.y, width: 0, height: 0 };
    } else {
      const anchor = this._resolveAnchor();
      // [WHY] 锚点可能是 shadow DOM 内的 trigger，宿主 open 触发 BaseElement 重渲染会把旧元素替换并脱离文档；
      // 此时 getBoundingClientRect 返回全 0 矩形，若继续计算会把浮动层 clamp 到视口左上角（2026-09-10）
      // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
      if (!anchor || !anchor.isConnected) return;
      anchorRect = anchor.getBoundingClientRect();
    }
    const rect = this._floating.getBoundingClientRect();
    // [WHY 布局尺寸优先于 rect 2026-10-30] rect 里含 transform：`.z-select__dropdown` 的
    // 入场动画从 `scale(0.96)` 起跳，定位发生在动画第一帧时量到的是 124.8 而不是 130 ——
    // 恰好让 `y + h > 视口` 这个判断差 5px 不成立，flip 与 clamp 双双不触发，动画结束后
    // 底边就越界（实测 top 775 / 高 130 / 视口 900）。`offsetWidth/Height` 是布局尺寸，
    // 不含 transform，也不会被动画期间的值带偏。取不到（happy-dom 无布局）时退回 rect。
    const floatingRect = {
      x: rect.x,
      y: rect.y,
      width: this._floating.offsetWidth || rect.width,
      height: this._floating.offsetHeight || rect.height,
    };
    const viewport = { width: window.innerWidth, height: window.innerHeight };

    let best = this._calcPosition(this._placement, anchorRect, floatingRect, viewport);

    if (this._flip) {
      const flipped = this._flipPlacement(this._placement);
      const flippedPos = this._calcPosition(flipped, anchorRect, floatingRect, viewport);
      if (flippedPos.fits > best.fits) {
        best = flippedPos;
        this._currentPlacement = flipped;
      } else {
        this._currentPlacement = this._placement;
      }
    }

    this._floating.style.position = "fixed";
    this._floating.style.left = `${best.x}px`;
    this._floating.style.top = `${best.y}px`;
    this._floating.style.margin = "0";
  }

  private _calcPosition(
    placement: Placement,
    anchor: Rect,
    floating: Rect,
    viewport: { width: number; height: number },
  ): { x: number; y: number; fits: number } {
    const [side, align = "start"] = placement.split("-") as [string, string?];
    let x = 0, y = 0;
    const gap = this._offset;

    // Main axis
    switch (side) {
      case "top":
        y = anchor.y - floating.height - gap;
        break;
      case "bottom":
        y = anchor.y + anchor.height + gap;
        break;
      case "left":
        x = anchor.x - floating.width - gap;
        break;
      case "right":
        x = anchor.x + anchor.width + gap;
        break;
    }

    // Cross axis
    switch (align) {
      case "start":
        if (side === "top" || side === "bottom") x = anchor.x;
        else y = anchor.y;
        break;
      case "end":
        if (side === "top" || side === "bottom") x = anchor.x + anchor.width - floating.width;
        else y = anchor.y + anchor.height - floating.height;
        break;
      case "center":
      default:
        if (side === "top" || side === "bottom") x = anchor.x + (anchor.width - floating.width) / 2;
        else y = anchor.y + (anchor.height - floating.height) / 2;
        break;
    }

    // Clamp to viewport and count how well it fits
    let fits = 4;
    if (x < 0) { x = 0; fits--; }
    if (y < 0) { y = 0; fits--; }
    if (x + floating.width > viewport.width) { x = viewport.width - floating.width; fits--; }
    if (y + floating.height > viewport.height) { y = viewport.height - floating.height; fits--; }
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    return { x, y, fits };
  }

  private _flipPlacement(p: Placement): Placement {
    const [side, ...rest] = p.split("-");
    const flipped = OPPOSITE[side] ?? side;
    return (flipped + (rest.length ? `-${rest[0]}` : "")) as Placement;
  }

  private _listen(): void {
    const onFrame = () => this._update();
    const raf = () => requestAnimationFrame(onFrame);
    // [WHY 要挂到锚点所在的 shadowRoot 2026-10-30] `scroll` **不是 composed 事件**，
    // 在 shadow DOM 里滚动内部容器时它到 shadow root 就停了，挂在 window 上的 capture
    // 收不到。而浮层偏偏活在这种场景里：`z-page-editor` 的右栏 `.pi` 是滚动容器，
    // 里面的 `z-select` 展开后滚面板 —— 浮层挂在 body 上按 fixed 定位，面板一滚就与触发器
    // 脱节（实测滚 60px，触发器上移、下拉不动）。逐层挂到每个 shadow root 才覆盖得到。
    const targets = this._scrollTargets();
    for (const t of targets) t.addEventListener("scroll", raf, true);
    window.addEventListener("resize", raf);
    this._cleanups.push(
      ...targets.map((t) => () => t.removeEventListener("scroll", raf, true)),
      () => window.removeEventListener("resize", raf),
    );

    // [WHY 还要盯自身尺寸 2026-10-30] 浮层内容**不是**在构造时就齐的：`z-select` 先 `open()`
    // 建面板（此时只有一个空的 `.z-select__options`），返回后才 `_renderOptionList()` 填选项。
    // 构造时量到的高度因此是 0（或几十像素），clamp / flip 全按这个假尺寸算 ——
    // 实测：面板高 130px、视口 900、锚点在下方，算出的 top 是 890，**底边越界 120px**；
    // 因为 `y + 0 > 900` 不成立，clamp 一次都没触发，看起来还「正常打开了」。
    // 后续搜索过滤让列表变短、异步 loading 变高都是同一类。
    // 盯尺寸变化重算是唯一不依赖各组件记得 `reposition()` 的兜底。
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(() => this._update());
      ro.observe(this._floating);
      this._cleanups.push(() => ro.disconnect());
    }
  }

  /** 需要监听的滚动面：window + 锚点逐层往上的每个 shadow root。 */
  private _scrollTargets(): EventTarget[] {
    const out: EventTarget[] = [window];
    let node: Node | null = this._resolveAnchor();
    while (node) {
      const root = node.getRootNode();
      if (!(root instanceof ShadowRoot)) break;
      out.push(root);
      node = root.host;
    }
    return out;
  }
}
