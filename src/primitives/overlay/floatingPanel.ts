// [WHY] 抽取自 Select/Datepicker/DateRange/TimePicker 四处相同的浮层面板生命周期：
// 创建面板 → FloatingPosition 定位 → 外部 mousedown 关闭 → hiding 动画 → 移除（2026-09-25 全项目去重）
// 事件委托接线/FocusTrap/状态复位因组件而异，保留在各组件内
import { FloatingPosition, type AnchorPoint, type FloatingAnchor, type Placement } from "../position/FloatingPosition.js";

export interface FloatingPanelOpenOptions {
  /** 面板根类名，如 "z-datepicker__panel" */
  panelClass: string;
  /** 关闭动画类名，如 "z-datepicker__panel--hiding" */
  hidingClass: string;
  /** part 属性（外部 ::part 样式 API），默认 "panel"（Select 下拉为 "dropdown"） */
  part?: string;
  /** role 属性，默认 "dialog"；传 null 不设置 */
  role?: string | null;
  /** aria-label，默认不设置 */
  ariaLabel?: string | null;
  /** 是否设 tabindex="-1"，默认 true */
  tabIndex?: boolean;
  // [WHY] 优先传 getter 而非元素引用：宿主 open 触发重渲染会替换 shadow 内 trigger，
  // 持旧引用滚动时定位读全 0（见 wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md）
  anchor?: FloatingAnchor;
  /** 坐标锚点（右键/长按菜单）：与 `anchor` 二选一，给了就不需要元素。 */
  point?: AnchorPoint;
  placement?: Placement;
  offset?: number;
  /** 外部 mousedown（目标不在面板内也不在宿主内）时触发，通常调组件的 _closePanel。
   *  不传则不注册文档监听 —— hover 型浮层（Tooltip）由自身 mouseleave 负责关闭。 */
  onOutsideClose?: () => void;
}

/** light-DOM 浮层面板控制器：一个实例对应一个可开关面板。 */
export class FloatingPanelController {
  private _host: HTMLElement;
  private _panel: HTMLElement | null = null;
  private _position: FloatingPosition | null = null;
  private _onDocMouse: ((e: MouseEvent) => void) | null = null;
  private _hidingClass = "";

  constructor(host: HTMLElement) {
    this._host = host;
  }

  /** 当前打开的面板元素；未打开为 null。 */
  get panel(): HTMLElement | null {
    return this._panel;
  }

  /** 面板是否处于打开态。 */
  get isOpen(): boolean {
    return this._panel !== null;
  }

  /** 内容变化导致尺寸变化后手动重新定位（滚动/resize 由 FloatingPosition 内部处理）。 */
  reposition(): void {
    this._position?.update();
  }

  /**
   * 创建面板挂到 body、定位、挂外部关闭监听，返回面板供组件继续接线。
   * fill 在 append 之前执行（先填内容再定位），保证 FloatingPosition 按实际尺寸计算初始位置。
   */
  open(opts: FloatingPanelOpenOptions, fill?: (panel: HTMLElement) => void): HTMLElement {
    // [WHY 先拆掉上一个] 重入（未 close 就再次 open）原先会同时泄漏三样东西：
    //   · 旧面板仍挂在 body 上，位置由已失效的定位器算过，永远停在那；
    //   · `this._onDocMouse` 被新监听覆盖，旧监听**再也摘不掉** —— 之后任何外部点击
    //     都会调用**旧的** onOutsideClose，表现为「点一次关两个面板」或关掉不相干的那个；
    //   · 旧 FloatingPosition 的 scroll/resize/ResizeObserver 一起留在内存里。
    // 这三样在单测里都不报错（新面板正常出现），只有连点两次才发现。
    if (this._panel) this._discard();

    const panel = document.createElement("div");
    panel.className = opts.panelClass;
    panel.setAttribute("part", opts.part ?? "panel");
    const role = opts.role === undefined ? "dialog" : opts.role;
    if (role) panel.setAttribute("role", role);
    if (opts.ariaLabel) panel.setAttribute("aria-label", opts.ariaLabel);
    if (opts.tabIndex !== false) panel.setAttribute("tabindex", "-1");
    this._panel = panel;
    this._hidingClass = opts.hidingClass;
    fill?.(panel);
    document.body.appendChild(panel);

    this._position = new FloatingPosition({
      anchor: opts.anchor,
      point: opts.point,
      floating: panel,
      placement: opts.placement ?? "bottom-start",
      offset: opts.offset ?? 4,
    });

    // Click outside → close（未提供回调时不注册，见 onOutsideClose 注释）
    if (opts.onOutsideClose) {
      const onOutsideClose = opts.onOutsideClose;
      this._onDocMouse = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target || !document.body.contains(target)) return;
        if (panel.contains(target)) return;
        if (this._host.contains(target)) return;
        onOutsideClose();
      };
      document.addEventListener("mousedown", this._onDocMouse, true);
    }

    return panel;
  }

  /**
   * 停止定位与外部监听，播放 hiding 动画后从 DOM 移除面板（组件须先自行解绑面板内事件）。
   *
   * @param fallbackMs 无 animationend 时的兜底移除延迟。默认 200ms；
   *   用 transition 做退场的面板（如 Tooltip，100ms）应传更小值以免视觉空窗。
   */
  close(fallbackMs = 200): void {
    const panel = this._panel;
    this._panel = null;
    this._stopWatching();
    if (!panel) return;

    panel.classList.add(this._hidingClass);
    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      panel.remove();
    };
    panel.addEventListener("animationend", cleanup, { once: true });
    // [WHY] happy-dom/jsdom 不触发 animationend，setTimeout 兜底
    // See: wiki/lessons/animation-system.md
    setTimeout(cleanup, fallbackMs);
  }

  /** ReactiveController 钩子：宿主脱离文档时自动拆除残留浮层、定位器与文档监听。 */
  hostDisconnected(): void {
    this._discard();
  }

  /** 摘掉定位器与文档 mousedown 监听（close 与重入拆除共用）。 */
  private _stopWatching(): void {
    this._position?.destroy();
    this._position = null;
    if (this._onDocMouse) {
      document.removeEventListener("mousedown", this._onDocMouse, true);
      this._onDocMouse = null;
    }
  }

  /** 重入时立即拆除上一个面板：不播退场动画，也不留定时器。 */
  private _discard(): void {
    const panel = this._panel;
    this._panel = null;
    this._stopWatching();
    panel?.remove();
  }
}
