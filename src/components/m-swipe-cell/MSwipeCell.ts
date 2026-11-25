// <m-swipe-cell> 列表行左滑露出操作按钮：按阈值吸附展开、同一时刻只展开一行、关闭前可用 z-before-close 拦截。
//
// [WHY 需要它] 移动端「删除 / 置顶 / 标记」这类低频操作用按钮排一行会把行高撑到两倍，
// 而左滑是 iOS 起就成立的手势约定。它真正的价值不是动效，而是**三个约束**：
//   ① 阈值吸附 —— 松手时只有「明显滑过一半」才停住，否则回弹；否则半开半合的状态没法收场
//   ② 互斥展开 —— 同屏两行同时露出操作区时，用户分不清哪个删除按钮对应哪一行
//   ③ 可拦截关闭 —— 删除前要确认、要调接口，组件不能自己先把行收起来再说
//
// [WHY 键盘路径是必须的，不是加分项] 左滑在手势设备上是「天然」的，在键盘上根本不存在。
// 只做 touch 等于把操作入口对键盘用户完全关闭 —— 而它们恰好是读屏用户。所以内容区
// 可聚焦，按 Enter / ArrowLeft 展开并把焦点送进操作区，Escape 收起并回焦。
import { BaseElement, COPY, html, property } from "../../core/index.js";
import swipeCSS from "./m-swipe-cell.css?raw";

/**
 * 同一时刻只允许一行展开。
 *
 * [WHY 模块级而不是父容器协调] 行的父级通常是 `m-cell-group` 或一段普通 DOM，它们
 * 没有义务知道「左滑」这件事；而「只展开一行」是全局性约束，跨分组同样成立。
 * 一个模块级登记表是唯一不需要宿主配合的做法。
 */
let openInstance: ZMSwipeCell | null = null;

/**
 * 方向锁定的最小位移（px）。
 *
 * 低于它在 touchmove 里不判定方向：手指按下时的抖动、以及纵向滚动起步那几像素，
 * 都会被误判成横滑，结果是「想上下滚列表，行却侧移了一下」。
 */
const DIRECTION_LOCK_PX = 6;

/** 从 inline transform 读回当前位移（不信任内部状态：别的代码可能改过它）。 */
function readX(el: HTMLElement | null): number {
  if (!el) return 0;
  const m = /translate3d\((-?[\d.]+)px/.exec(el.style.transform);
  return m ? Number(m[1]) : 0;
}

export class ZMSwipeCell extends BaseElement {
  static styles = swipeCSS;

  /**
   * 展开态。
   *
   * [WHY 可写] 展开态是宿主也可能要控制的状态（比如「点了另一行的删除」时统一收起）。
   * 但**写完不一定生效** —— 关到已展开的行时仍会先问 `z-before-close`，
   * 宿主拦下就停在展开态。要强制收起用 `close()`。
   */
  @property({ type: Boolean }) open = false;

  /** 禁用滑动（也不给键盘路径）：行本身不可操作时，露出操作区没有意义。 */
  @property({ type: Boolean }) disabled = false;

  /**
   * 吸附阈值，操作区宽度的比例（0~1）。
   *
   * 0.3 是规格给的默认值：滑过三成才停住。低于 0.2 会「一碰就开」，
   * 高于 0.5 则「怎么滑都回弹」，两个极端都让人以为手势坏了。
   */
  @property({ type: Number }) threshold = 0.3;

  /** 拖动中：关掉过渡，让位移跟手。 */
  private _dragging = false;
  private _startX = 0;
  private _startY = 0;
  private _startOffset = 0;
  private _axis: "none" | "x" | "y" = "none";
  private _actionWidth = 0;

  /**
   * 重建前的位移。
   *
   * [WHY 必须记这个] 本基类 `performUpdate` 是 `shadow.innerHTML = ...` **整体重建**：
   * `open` 一变，内容层就是**新节点**，它的 transform 从 none 开始。若在 `updated()`
   * 里直接写目标值，浏览器把「none → 目标」当同一帧，过渡不会发生 —— 视觉上就是
   * 「啪一下贴过去」，而不是滑过去。所以在 `willUpdate`（旧节点还在）里记下位置，
   * `updated`（新节点）里先摆到旧位置，下一帧再摆到目标，动画才有起点。
   */
  private _lastX = 0;

  /**
   * 待回焦目标。
   *
   * [WHY 不能同步 focus] 回焦时机在属性变化之后，而属性变化会把内容层整个换掉；
   * 同步 focus 拿到的是**即将被丢弃的旧节点**，重建后焦点又回到 body（这正是
   * `FocusTrap` 上一轮踩过的同一个坑）。所以只记意图，真正落焦放在 `updated()` 末尾。
   */
  private _focusTarget: "content" | "action" | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // 委托到 shadowRoot：render 会重建内部节点，绑在具体节点上的监听随之失效
    this.shadowRoot!.addEventListener("touchstart", this._onTouchStart, { passive: true });
    this.shadowRoot!.addEventListener("touchmove", this._onTouchMove, { passive: false });
    this.shadowRoot!.addEventListener("touchend", this._onTouchEnd);
    this.shadowRoot!.addEventListener("touchcancel", this._onTouchEnd);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
    // [WHY 点内容区收起] 展开后用户点别处（包括点这一行本身）应当先收起 ——
    // 否则「点了一下，什么都没发生」会让人以为整行失灵。捕获阶段拦，避免行内的
    // 点击（m-cell 的 z-click）先跑掉。
    this.shadowRoot!.addEventListener("click", this._onContentClick, true);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("touchstart", this._onTouchStart);
    this.shadowRoot!.removeEventListener("touchmove", this._onTouchMove);
    this.shadowRoot!.removeEventListener("touchend", this._onTouchEnd);
    this.shadowRoot!.removeEventListener("touchcancel", this._onTouchEnd);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    this.shadowRoot!.removeEventListener("click", this._onContentClick, true);
    if (openInstance === this) openInstance = null;
    super.disconnectedCallback();
  }

  /**
   * 收起当前行，返回是否真的收起了。
   *
   * `z-before-close` 可取消：宿主 `preventDefault()` 后停在展开态（删除前确认走这条）。
   */
  close(): boolean {
    if (!this.open) return true;
    const ev = this.emit("z-before-close", { reason: "close" }, { cancelable: true });
    if (ev.defaultPrevented) return false;
    this.open = false;
    return true;
  }

  /**
   * 展开当前行，并收起别的行。
   *
   * @param focusActions 键盘触发时传 true：展开后把焦点送进第一个操作按钮。
   *   触屏/鼠标触发不传 —— 用户的手指/光标已经在那行上了，抢焦点反而会让
   *   紧随其后的 click 落到被移动的元素上。
   */
  show(focusActions = false): void {
    if (this.disabled || this.open) return;
    // [WHY 不检查上一行是否真的关掉了] 「同时只展开一行」是硬约束，但上一行可能拦下
    // `z-before-close`（宿主正在弹确认框）。此时强行关掉会替宿主做决定 —— 用户正在
    // 确认「要不要删这一行」，界面却把那一行收起来了。让宿主在确认框的回调里自己
    // 调 close() 是更诚实的顺序。
    openInstance?.close();
    this.open = true;
    if (focusActions) this._focusTarget = "action";
  }

  private get _content(): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>(".z-m-swipe__content");
  }

  private get _actions(): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>(".z-m-swipe__actions");
  }

  /** 操作区实际宽度：吸附阈值按它算，所以每次开始拖动都重新量（内容可能变）。 */
  private _measure(): number {
    this._actionWidth = this._actions?.offsetWidth ?? 0;
    return this._actionWidth;
  }

  /**
   * 把内容层从 `from` 滑到 `to`。
   *
   * 两帧写法：先无过渡地摆到起点（新节点默认 transform 是 none，直接设目标不会触发
   * 过渡），下一帧恢复过渡再设目标。`from === to` 时只摆一次，不白跑一帧。
   */
  private _slideTo(from: number, to: number): void {
    const c = this._content;
    if (!c) return;
    const at = (px: number): string => (px === 0 ? "" : `translate3d(${px}px, 0, 0)`);

    if (from === to) {
      c.style.transition = "";
      c.style.transform = at(to);
      return;
    }
    c.style.transition = "none";
    c.style.transform = at(from);
    // [WHY rAF 而不是 queueMicrotask] 微任务仍在同一帧内，浏览器会把两次赋值合并成
    // 一次样式计算，过渡照样不发生。必须等到下一帧的样式刷新生效之后。
    const raf =
      typeof requestAnimationFrame === "function"
        ? requestAnimationFrame
        : (f: FrameRequestCallback) => setTimeout(() => f(0), 16) as unknown as number;
    raf(() => {
      const cur = this._content;
      if (!cur) return;
      cur.style.transition = "";
      cur.style.transform = at(to);
    });
  }

  /** 拖动中的即时位移：无过渡，直接跟手。 */
  private _follow(px: number): void {
    const c = this._content;
    if (!c) return;
    this._dragging = true;
    this.toggleAttribute("dragging", true);
    c.style.transition = "none";
    c.style.transform = px === 0 ? "" : `translate3d(${px}px, 0, 0)`;
  }

  private _onTouchStart = (e: Event): void => {
    if (this.disabled) return;
    const te = e as TouchEvent;
    if (te.touches.length !== 1) return;
    this._measure();
    if (this._actionWidth <= 0) return;
    this._startX = te.touches[0].clientX;
    this._startY = te.touches[0].clientY;
    this._startOffset = this.open ? -this._actionWidth : 0;
    this._axis = "none";
  };

  private _onTouchMove = (e: Event): void => {
    if (this.disabled || this._actionWidth <= 0) return;
    const te = e as TouchEvent;
    if (te.touches.length !== 1) return;

    const dx = te.touches[0].clientX - this._startX;
    const dy = te.touches[0].clientY - this._startY;

    // 方向锁定：只判一次，判完这一趟就不再改（中途改方向会让位移来回跳）
    if (this._axis === "none") {
      if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
      this._axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (this._axis !== "x") return;

    // [WHY 必须 preventDefault] 横滑时浏览器的默认行为是横向滚动/触发侧滑返回；
    // 不拦住的话位移会跟系统手势打架。这也是这个监听不能是 passive 的唯一原因。
    te.preventDefault();

    // 越界阻尼：往左拖超过操作区宽度、或往右拖过原位时只走 1/3，给出「到底了」的手感
    let next = this._startOffset + dx;
    if (next < -this._actionWidth) next = -this._actionWidth - (-next - this._actionWidth) / 3;
    if (next > 0) next = next / 3;
    this._follow(next);
  };

  private _onTouchEnd = (): void => {
    if (this.disabled) return;
    if (this._axis !== "x") {
      this._axis = "none";
      return;
    }
    this._axis = "none";
    this._dragging = false;
    this.toggleAttribute("dragging", false);

    const offset = readX(this._content);
    const width = this._actionWidth;

    if (this.open) {
      // 已在展开态：滑回去超过一半就收起，否则弹回展开位
      if (Math.abs(offset) < width * (1 - this.threshold)) {
        if (!this.close()) this._slideTo(offset, -width);
      } else {
        this._slideTo(offset, -width);
      }
      return;
    }

    if (Math.abs(offset) > width * this.threshold) {
      this.show();
    } else {
      this._slideTo(offset, 0);
    }
  };

  private _onContentClick = (e: Event): void => {
    if (!this.open) return;
    // 点在操作区里不收起（那是用户要按的按钮）
    if (this._actions?.contains(e.target as Node)) return;
    if (this.close()) e.stopPropagation();
  };

  private _onKeyDown = (e: Event): void => {
    if (this.disabled) return;
    const ke = e as KeyboardEvent;

    if (!this.open) {
      // Enter 与 ArrowLeft 都展开：前者是「这是个可操作的行」的通用直觉，
      // 后者与手势同向（想一想手指往哪边滑）。
      if (ke.key === "Enter" || ke.key === "ArrowLeft") {
        ke.preventDefault();
        this.show(true);
      }
      return;
    }

    if (ke.key === "Escape" || ke.key === "ArrowRight" || ke.key === "Enter") {
      ke.preventDefault();
      if (this.close()) this._focusTarget = "content";
    }
  };

  protected willUpdate(): void {
    // 旧节点还在：把动画起点记下来，供 updated() 两帧播放
    this._lastX = readX(this._content);
  }

  protected updated(): void {
    const content = this._content;
    const actions = this._actions;
    if (!content || !actions) return;

    // 内容区只有「有操作区」时才进 Tab 序列：没有 actions 的行不该多一个停靠点
    const hasActions = !!this.querySelector('[slot="actions"]');
    if (hasActions && !this.disabled) content.setAttribute("tabindex", "0");
    else content.removeAttribute("tabindex");

    // [WHY 收起时把操作区从无障碍树摘掉] 它还留在 DOM 里（只是被内容盖住）。
    // 不摘的话读屏会把「删除」念成这一行的第一个按钮 —— 而视觉上它根本不存在，
    // 用户按了也不知道自己在删什么。
    if (this.open) actions.removeAttribute("inert");
    else actions.setAttribute("inert", "");

    // 拖动中不碰位移：手指还在上面，任何插值都会让位移跳一下
    if (!this._dragging) {
      const width = this._measure();
      this._slideTo(this._lastX, this.open ? -width : 0);
    }

    if (this.open) {
      openInstance = this;
      this.emit("z-swipe-open", { width: this._actionWidth });
    } else if (openInstance === this) {
      openInstance = null;
      this.emit("z-swipe-close", {});
    }

    // 落焦放在最后：此时 DOM 已是最终节点，focus 才落得住
    if (this._focusTarget) {
      const target =
        this._focusTarget === "content" ? content : this.querySelector<HTMLElement>('[slot="actions"]');
      this._focusTarget = null;
      target?.focus?.();
    }
  }

  render(): string {
    return html`
      <div class="z-m-swipe__content" part="content"><slot></slot></div>
      <div class="z-m-swipe__actions" part="actions" role="group" aria-label="${COPY.rowActions}">
        <slot name="actions"></slot>
      </div>
    `;
  }
}

customElements.define("m-swipe-cell", ZMSwipeCell);
