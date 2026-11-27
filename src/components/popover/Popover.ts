// [WHY] 2026-10-25 系统审计：浮层面板生命周期改由 FloatingPanelController 统一承载
// （原手写 body.appendChild + FloatingPosition + 文档 mousedown + animationend 清理）。
// See: wiki/reference/component-implementation-standard.md
import { BaseElement, html, property, injectGlobalStyles, bindTriggerAria, defineElement } from "../../core/index.js";
import { FloatingPanelController, type Placement } from "../../primitives/index.js";
import popoverCSS from "./popover.css?raw";

const POPUP_STYLES = `
    .z-popover__popup {
      position: fixed;
      z-index: var(--z-z-dropdown);
      min-width: 160px;
      max-width: 360px;
      padding: var(--z-space-3);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: var(--z-line-height);
      color: var(--z-color-text);
      animation: z-popover-in var(--z-duration-normal) var(--z-ease-enter);
    }
    .z-popover__popup--hiding {
      animation: z-popover-out var(--z-duration-fast) var(--z-ease-exit) forwards;
    }
    @keyframes z-popover-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-popover-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
`;

export class ZPopover extends BaseElement {
  static styles = popoverCSS;

  @property({ type: Boolean }) open = false;
  @property({ type: String }) placement: Placement = "bottom-start";
  @property({ type: Number }) offset = 8;
  @property({ type: String }) trigger: "click" | "hover" = "click";

  private _floating = this.addController(new FloatingPanelController(this));
  private _showTimer: ReturnType<typeof setTimeout> | null = null;
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;
  private _wasOpen = false;

  private _triggerAria = bindTriggerAria(
    () => this._triggerSlot(),
    () => ({ hasPopup: this._triggerHasPopup(), expanded: this.open }),
  );

  /** 触发器所在的槽。popconfirm 用默认槽（只有一个子节点，不必再加一层 `slot="trigger"`）。 */
  protected _triggerSlot(): HTMLSlotElement | null {
    return this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null;
  }

  /** `aria-haspopup` 的值。popover 的浮层是泛指的，popconfirm 里是对话框。 */
  protected _triggerHasPopup(): "dialog" | "menu" | "listbox" | "true" {
    return "true";
  }

  render(): string {
    // [WHY 这两个属性不在模板里] 触发器是消费者塞进槽里的东西，`aria-haspopup` /
    // `aria-expanded` 必须落在**它**身上才有语义；写在这个 slot 容器 `<span>` 上
    // 无障碍树根本不承认（2026-11-16 CDP 实测）。见 core/a11y.ts 的 bindTriggerAria。
    return html`
      <span class="z-popover__trigger" part="trigger">
        <slot name="trigger"></slot>
      </span>
      <div style="display:none" aria-hidden="true">
        <slot></slot>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectGlobalStyles("z-popover", POPUP_STYLES);
    if (this.trigger === "click") {
      this.addEventListener("click", this._onTriggerClick);
    } else {
      this.addEventListener("mouseenter", this._onEnter);
      this.addEventListener("mouseleave", this._onLeave);
    }
  }

  disconnectedCallback(): void {
    this._hide();
    this._triggerAria.dispose();
    this.removeEventListener("click", this._onTriggerClick);
    this.removeEventListener("mouseenter", this._onEnter);
    this.removeEventListener("mouseleave", this._onLeave);
    super.disconnectedCallback();
  }

  updated(): void {
    this._triggerAria.sync();
    if (this.open && !this._wasOpen) {
      this._show();
    } else if (!this.open && this._wasOpen) {
      this._hide();
    }
    this._wasOpen = this.open;
  }

  show(): void {
    if (this.open) return;
    this.open = true;
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  /**
   * 三个可覆盖的钩子（2026-11-15 抽出，供 `z-popconfirm` 复用整套浮层生命周期）。
   *
   * [为什么提取成长这样而不是让 popconfirm 继承后重写 `_show`] `_show` 里除了面板配置，
   * 还有 hover 触发器、`z-popover-open` 事件、`isOpen` 幂等判断 —— 重写等于复制一遍，
   * 而复制的那份不会跟着 popover 后续的修复走（浮层定位的坑踩过两次）。
   * 把「变的部分」（锚点、面板样式、面板内容）做成钩子，`_show` 的骨架只有一份。
   */
  protected _anchorEl(): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>(".z-popover__trigger");
  }

  protected _panelOptions(): {
    panelClass: string;
    hidingClass: string;
    part: string;
    role: string;
  } {
    return {
      panelClass: "z-popover__popup",
      hidingClass: "z-popover__popup--hiding",
      part: "popup",
      role: "dialog",
    };
  }

  /** 默认实现：把默认 slot 的节点 clone 进面板（纯展示内容）。子类可改为自渲染。 */
  protected _fillPanel(panel: HTMLElement): void {
    const slot = this.shadowRoot!.querySelector("slot:not([name])") as HTMLSlotElement | null;
    if (!slot) return;
    slot.assignedNodes().forEach((node) => panel.appendChild(node.cloneNode(true)));
  }

  protected _show(): void {
    if (this._floating.isOpen) return;

    const opts = this._panelOptions();
    const popup = this._floating.open(
      {
        panelClass: opts.panelClass,
        hidingClass: opts.hidingClass,
        part: opts.part,
        role: opts.role as "dialog",
        // [WHY] anchor 用 getter：open 触发重渲染替换 shadow 内 trigger，持旧引用滚动时定位读全 0（2026-09-10）
        // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
        anchor: () => this._anchorEl(),
        placement: this.placement,
        offset: this.offset,
        onOutsideClose: () => this.close(),
      },
      (panel) => this._fillPanel(panel),
    );

    // Hover trigger: close when mouse leaves both trigger and popup
    if (this.trigger === "hover") {
      popup.addEventListener("mouseenter", () => {
        if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
      });
      popup.addEventListener("mouseleave", () => {
        this._scheduleHide();
      });
    }

    this.emit("z-popover-open");
  }

  private _hide(): void {
    this._floating.close();
    if (this._wasOpen) {
      this.emit("z-popover-close");
    }
  }

  private _onTriggerClick = (): void => {
    this.toggle();
  };

  private _onEnter = (): void => {
    if (this._hideTimer) { clearTimeout(this._hideTimer); this._hideTimer = null; }
    if (!this.open) {
      this._showTimer = setTimeout(() => this.show(), 200);
    }
  };

  private _onLeave = (): void => {
    if (this._showTimer) { clearTimeout(this._showTimer); this._showTimer = null; }
    this._scheduleHide();
  };

  private _scheduleHide(): void {
    this._hideTimer = setTimeout(() => this.close(), 150);
  }
}

defineElement("z-popover", ZPopover);
