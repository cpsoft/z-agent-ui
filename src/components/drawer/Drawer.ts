// <z-drawer> 抽屉：placement 定方向、size 定档位、full 铺满，支持遮罩与 Esc 关闭，可挂 beforeClose。
// [WHY] 抽屉组件镜像 Modal 框架 API [[REQ-011-modal-framework]] [2026-08-11] night-hawk:
// open/closeOnOverlay/closeOnEscape/placement/width/height/size/closeLabel/portal/
// title!/beforeClose + show()/close()/toggle() + 静态 ZDrawer.open（无 confirm/alert）。
// [WHY] 2026-10-25 系统审计：状态机（closing/wasOpen 快照/portal 重挂载/栈与滚动锁/退场动画）
// 原为「整体拷贝 Modal.ts」的两份实现，现抽为 DialogStateController 单一来源。
// See: wiki/reference/component-implementation-standard.md
import { COPY, BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import { DialogStateController, type DialogHost } from "../../primitives/index.js";
import drawerCSS from "./drawer.css?raw";


export interface ZDrawerOptions {
  title?: string;
  placement?: "left" | "right" | "top" | "bottom";
  width?: string;
  height?: string;
  size?: "sm" | "md" | "lg";
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  portal?: boolean;
  beforeClose?: () => boolean | Promise<boolean>;
}

let _titleIdCounter = 0;

export class ZDrawer extends BaseElement {
  static styles = drawerCSS;

  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) closeOnOverlay = true;
  @property({ type: Boolean }) closeOnEscape = true;
  @property({ type: String }) placement: "left" | "right" | "top" | "bottom" = "right";
  // [WHY] 尺寸双轨：width/height 显式覆盖 size 预设（CSS 变量兜底 fallback）
  @property({ type: String }) width = "";
  @property({ type: String }) height = "";
  @property({ type: String }) size: "sm" | "md" | "lg" = "md";
  /**
   * 铺满：抽屉 -> 100vw/100vh，弹窗 -> 视口减边距。
   *
   * [WHY 从 `size="full"` 拆出来] `full` 不是尺寸档，是**宽度策略**：它不参与
   * sm/md/lg 的档位序列，硬塞进 size 会让「size 的取值域」既有档位又有策略，
   * 词表守卫也没法把它纳入 SIZES。二十行代码换来一条干净的语义边界。
   */
  @property({ type: Boolean }) full = false;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  // [WHY] 多词属性须显式 kebab（默认 key.toLowerCase() 无连字符,
  // demo close-label= 将失效;先例 slider/rate/pagination）
  @property({ type: String, attribute: "close-label" }) closeLabel = COPY.close;
  // [WHY] portal: 宿主重挂载逃离祖先包含块（同 Modal [[REQ-011-modal-framework]]）
  @property({ type: Boolean }) portal = false;
  // [WHY] title 是 HTMLElement 反射属性,字段初始化器会让 createElement 抛错
  // ([[bug-20260810-title-ctor-attr]]): 必须 ! 声明无初始化器
  @property({ type: String }) title!: string;
  // [WHY] beforeClose 是函数,只能作 property（同 Modal）
  @property({ attribute: false }) beforeClose?: () => boolean | Promise<boolean>;

  private _titleId = `z-drawer-title-${++_titleIdCounter}`;
  private _dialog = new DialogStateController(this as unknown as DialogHost, {
    overlaySelector: ".z-drawer__overlay",
    panelSelector: ".z-drawer__panel",
    stackIndexVar: "--z-drawer-stack-index",
  });

  /**
   * 兼容读：旧 `size="full"` 仍然生效（映射到 `full` 布尔）。
   * [WHY 在 size 上拦一刀] `el.size = "full"` 会反射出 size="full" 这个 attribute，
   * 若不拦，它会落到 super 里被当成合法档位存下来，而 CSS 早已改看 `[full]` —— 界面悄悄退回默认宽度。
   */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "size" && value === "full") {
      this.full = true;
      return;
    }
    if (name === "size" && value && value !== "full") this.full = false;
    super.attributeChangedCallback(name, oldValue, value);
  }

  render(): string {
    if (!this.open && !this._dialog.closing) return html`<div style="display:none" part="hidden"></div>`;

    // [WHY] placement 的退场动画方向: CSS 按 --z-drawer-placement 变量选中
    // translate 方向,JS 只维护 closing 布尔（由 DialogStateController 持有）
    const closing = this._dialog.closing ? " z-drawer__overlay--closing" : "";
    const panelClosing = this._dialog.closing ? " z-drawer__panel--closing" : "";
    const sizeClass = ` z-drawer__panel--${this.size}`;

    return html`
      <div class="z-drawer__overlay${closing}" part="overlay">
        <div
          class="z-drawer__panel${panelClosing}${sizeClass}"
          part="panel"
          role="dialog"
          aria-modal="true"
          style="--z-drawer-placement:${this.placement};${this.width ? `--z-drawer-width:${this.width};` : ""}${this.height ? `--z-drawer-height:${this.height};` : ""}"
          ${this.title ? `aria-labelledby="${this._titleId}"` : ""}
        >
          <div class="z-drawer__header" part="header">
            ${this.title ? `<h2 id="${this._titleId}" class="z-drawer__title" part="title">${escapeAttr(this.title)}</h2>` : ""}
            <slot name="header"></slot>
            <button type="button" class="z-drawer__close" part="close" aria-label="${escapeAttr(this.closeLabel)}">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
          <div class="z-drawer__body" part="body">
            <slot></slot>
          </div>
          <div class="z-drawer__footer" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }

  updated(): void {
    const overlay = this.shadowRoot!.querySelector(".z-drawer__overlay");
    if (overlay) overlay.addEventListener("click", this._onOverlayClick);

    const closeBtn = this.shadowRoot!.querySelector(".z-drawer__close");
    if (closeBtn) closeBtn.addEventListener("click", () => this.close());

    this._dialog.afterUpdate();
  }

  disconnectedCallback(): void {
    this._dialog.handleDisconnect();
    super.disconnectedCallback();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
  }

  close(): void {
    if (!this.open) return;
    // [WHY] beforeClose 钩子（同 Modal）: false 中止; async 决议后守卫 open
    if (this.beforeClose) {
      const r = this.beforeClose();
      if (r === false) return;
      if (r instanceof Promise) {
        r.then((ok) => {
          if (ok && this.open) this.open = false;
        });
        return;
      }
    }
    this.open = false;
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  private _onOverlayClick = (e: Event): void => {
    if (!this.open || !this.closeOnOverlay) return;
    if (e.target === e.currentTarget) this.close();
  };

  // ── 编程式 API ──────────────────────────────────────────────
  // [WHY] 仿 Modal.open 工厂模式: 实例挂 body,关闭动画结束后自移除
  static open(options: ZDrawerOptions = {}): { close(): void; element: ZDrawer } {
    const el = document.createElement("z-drawer") as ZDrawer;
    el._dialog.owned = true;
    if (options.title !== undefined) el.title = options.title;
    if (options.placement !== undefined) el.placement = options.placement;
    if (options.width !== undefined) el.width = options.width;
    if (options.height !== undefined) el.height = options.height;
    if (options.size !== undefined) el.size = options.size;
    if (options.closeOnOverlay !== undefined) el.closeOnOverlay = options.closeOnOverlay;
    if (options.closeOnEscape !== undefined) el.closeOnEscape = options.closeOnEscape;
    if (options.closeLabel !== undefined) el.closeLabel = options.closeLabel;
    if (options.portal !== undefined) el.portal = options.portal;
    if (options.beforeClose !== undefined) el.beforeClose = options.beforeClose;

    document.body.appendChild(el);
    el.show();
    return { close: () => el.close(), element: el };
  }
}

defineElement("z-drawer", ZDrawer);
