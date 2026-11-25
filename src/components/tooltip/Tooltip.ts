// [WHY] 2026-10-25 系统审计：原实现手写「建 div → body.appendChild → FloatingPosition →
// transitionend 清理」，与 Select/Datepicker 的 FloatingPanelController 重复。
// 统一改为消费控制器；hover 型浮层不注册外部 mousedown 关闭（由 mouseleave 负责）。
// See: wiki/reference/component-implementation-standard.md
import { BaseElement, html, property, injectGlobalStyles } from "../../core/index.js";
import { FloatingPanelController, type Placement } from "../../primitives/index.js";
import tooltipCSS from "./tooltip.css?raw";

const POPUP_STYLES = `
  .z-tooltip__popup {
    position: fixed;
    z-index: var(--z-z-tooltip);
    max-width: 280px;
    padding: 6px 10px;
    border-radius: var(--z-radius-md);
    /* [WHY] 2026-10-11 [[2026-10-11-theme-mode]]：原 gray-900 底 + white 字在 dark 块 gray 反转后
       变浅底白字（不可读）。改用 text/bg 语义对：亮色 #0f172a/#fff 与原值全等，暗色自动反转为浅底深字。 */
    background: var(--z-color-text);
    color: var(--z-color-bg);
    font-family: var(--z-font-sans);
    font-size: var(--z-font-size-xs);
    line-height: var(--z-line-height);
    pointer-events: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--z-anim-fade-duration) ease-out,
                transform var(--z-anim-fade-duration) ease-out;
    word-wrap: break-word;
  }
  .z-tooltip__popup--visible {
    opacity: 1;
    transform: translateY(0);
  }
  .z-tooltip__popup--hiding {
    opacity: 0;
    transform: translateY(2px);
    transition: opacity var(--z-duration-micro) var(--z-ease-exit),
                transform var(--z-duration-micro) var(--z-ease-exit);
  }
`;

/** 退场 transition 时长 100ms，兜底稍大以免闪烁空窗。 */
const HIDE_FALLBACK_MS = 150;

export class ZTooltip extends BaseElement {
  static styles = tooltipCSS;

  @property({ type: String }) content = "";
  @property({ type: String }) placement: Placement = "top";
  @property({ type: Number }) offset = 6;
  @property({ type: Number }) delay = 400;

  private _floating = new FloatingPanelController(this);
  private _showTimer: ReturnType<typeof setTimeout> | null = null;

  render(): string {
    return html`<slot></slot>`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectGlobalStyles("z-tooltip", POPUP_STYLES);
    this.addEventListener("mouseenter", this._onEnter);
    this.addEventListener("mouseleave", this._onLeave);
    this.addEventListener("focusin", this._onFocusIn);
    this.addEventListener("focusout", this._onFocusOut);
  }

  disconnectedCallback(): void {
    this._hide();
    this.removeEventListener("mouseenter", this._onEnter);
    this.removeEventListener("mouseleave", this._onLeave);
    this.removeEventListener("focusin", this._onFocusIn);
    this.removeEventListener("focusout", this._onFocusOut);
    super.disconnectedCallback();
  }

  private _onEnter = (): void => {
    if (!this.content) return;
    this._clearTimer();
    this._showTimer = setTimeout(() => this._show(), this.delay);
  };

  private _onLeave = (): void => {
    this._clearTimer();
    this._hide();
  };

  private _onFocusIn = (): void => {
    if (!this.content) return;
    this._clearTimer();
    this._show();
  };

  private _onFocusOut = (): void => {
    this._clearTimer();
    this._hide();
  };

  private _show(): void {
    if (this._floating.isOpen) return;
    if (!this.content) return;

    this._floating.open(
      {
        panelClass: "z-tooltip__popup",
        hidingClass: "z-tooltip__popup--hiding",
        part: "popup",
        role: "tooltip",
        tabIndex: false,
        anchor: this,
        placement: this.placement,
        offset: this.offset,
      },
      (panel) => {
        panel.textContent = this.content;
      },
    );

    // 先挂载再取下一帧加 visible，才能触发 opacity transition
    const popup = this._floating.panel;
    requestAnimationFrame(() => {
      popup?.classList.add("z-tooltip__popup--visible");
    });
  }

  private _hide(): void {
    if (!this._floating.isOpen) return;
    this._floating.close(HIDE_FALLBACK_MS);
  }

  private _clearTimer(): void {
    if (this._showTimer) {
      clearTimeout(this._showTimer);
      this._showTimer = null;
    }
  }
}

customElements.define("z-tooltip", ZTooltip);
