// [WHY] Modal 框架组件升级 [[REQ-011-modal-framework]] [2026-08-11] night-hawk:
// 编程式 API / portal 宿主重挂载 / 多模态堆叠 / 关闭动画 / beforeClose / title。
// 关键约束见 wiki/lessons/web-components-render-pitfalls.md（title! 反射属性、
// updated() 按节点重绑、wasOpen 快照防关闭分支重复执行）。
// [WHY] 栈/Esc/滚动锁已抽取为公共原语 [[2026-08-11-W13-form-basics]]
// (src/primitives/overlay/overlayManager.ts),本组件只消费。
import { COPY, BaseElement, html, property, injectGlobalStyles, escapeAttr } from "../../core/index.js";
import { DialogStateController, type DialogHost } from "../../primitives/index.js";
import modalCSS from "./modal.css?raw";


export interface ZModalOptions {
  title?: string;
  message?: string | HTMLElement;
  size?: "sm" | "md" | "lg";
  closeOnOverlay?: boolean;
  closeOnEscape?: boolean;
  closeLabel?: string;
  okText?: string;
  cancelText?: string;
  beforeClose?: () => boolean | Promise<boolean>;
}

let _titleIdCounter = 0;

// [WHY] 程序化按钮（confirm/alert footer）位于 light DOM，shadow 样式不生效，
// 需全局注入一次（统一走 injectGlobalStyles，见 2026-10-25 审计）
const MODAL_BTN_STYLES = `
    .z-modal__btn {
      padding: 8px 16px;
      border-radius: var(--z-radius-md);
      border: 1px solid var(--z-color-border);
      background: var(--z-color-bg);
      color: var(--z-color-text);
      font: inherit;
      font-size: var(--z-font-size-sm);
      cursor: pointer;
      transition: background var(--z-transition-fast);
    }
    .z-modal__btn:hover { background: var(--z-color-gray-100); }
    .z-modal__btn--primary {
      /* [WHY] 实心填充：暗色下 primary(#3b82f6) 压白字只有 3.68，solid 层 5.17 */
      background: var(--z-color-primary-solid);
      border-color: var(--z-color-primary-solid);
      color: var(--z-color-white);
    }
    .z-modal__btn--primary:hover { background: var(--z-color-primary-solid-hover); }
  `;

function injectBtnStyles(): void {
  injectGlobalStyles("z-modal-btn", MODAL_BTN_STYLES);
}

export class ZModal extends BaseElement {
  static styles = modalCSS;

  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) closeOnOverlay = true;
  @property({ type: Boolean }) closeOnEscape = true;
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
  @property({ type: String }) closeLabel = COPY.close;
  // [WHY] portal: 宿主重挂载逃离祖先包含块,见 [[REQ-011-modal-framework]]
  @property({ type: Boolean }) portal = false;
  // [WHY] title 是 HTMLElement 反射属性,字段初始化器会让 createElement 抛错
  // ([[bug-20260810-title-ctor-attr]]): 必须 ! 声明无初始化器,默认 "" 由
  // applyPropertyMeta 读原生 getter 取得
  @property({ type: String }) title!: string;
  // [WHY] beforeClose 是函数,只能作 property,见 [[REQ-011-modal-framework]]
  @property({ attribute: false }) beforeClose?: () => boolean | Promise<boolean>;

  private _titleId = `z-modal-title-${++_titleIdCounter}`;
  // [WHY] 2026-10-25 系统审计：状态机（wasOpen 快照/closing 退场/portal 重挂载/栈与滚动锁/
  // FocusTrap）抽为 DialogStateController，与 Drawer 共用一份实现。
  private _dialog = new DialogStateController(this as unknown as DialogHost, {
    overlaySelector: ".z-modal__overlay",
    panelSelector: ".z-modal__panel",
    stackIndexVar: "--z-modal-stack-index",
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

    const closing = this._dialog.closing ? " z-modal__overlay--closing" : "";
    const panelClosing = this._dialog.closing ? " z-modal__panel--closing" : "";

    return html`
      <div class="z-modal__overlay${closing}" part="overlay">
        <div class="z-modal__panel${panelClosing}" part="panel" role="dialog" aria-modal="true" ${this.title ? `aria-labelledby="${this._titleId}"` : ""}>
          <div class="z-modal__header" part="header">
            ${this.title ? `<h2 id="${this._titleId}" class="z-modal__title" part="title">${escapeAttr(this.title)}</h2>` : ""}
            <slot name="header"></slot>
            <button type="button" class="z-modal__close" part="close" aria-label="${escapeAttr(this.closeLabel)}">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
          <div class="z-modal__body" part="body">
            <slot></slot>
          </div>
          <div class="z-modal__footer" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `;
  }

  updated(): void {
    // Re-bind DOM events on fresh elements (render recreates DOM each time)
    const overlay = this.shadowRoot!.querySelector(".z-modal__overlay");
    if (overlay) overlay.addEventListener("click", this._onOverlayClick);

    const closeBtn = this.shadowRoot!.querySelector(".z-modal__close");
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
    // [WHY] beforeClose 钩子 [[REQ-011-modal-framework]]: false 中止; async 决议后
    // 守卫 open（await 期间可能被重开）; 无钩子时保持同步路径（既有测试依赖）
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
    // [WHY] open 守卫: 关闭动画期间点击遮罩惰性
    if (!this.open || !this.closeOnOverlay) return;
    if (e.target === e.currentTarget) this.close();
  };

  // ── 编程式 API ──────────────────────────────────────────────
  // [WHY] 仿 ZToast 工厂模式 [[W1-TOAST]]: 创建实例挂到 body（天然 portal 层）,
  // 关闭动画结束后自移除,promise 在 DOM 清理后结算 (findings F4/F6)

  static open(options: ZModalOptions = {}): { close(): void; element: ZModal } {
    const el = document.createElement("z-modal") as ZModal;
    ZModal._applyOptions(el, options);
    el._dialog.owned = true;

    if (options.message !== undefined) {
      if (typeof options.message === "string") {
        const div = document.createElement("div");
        div.textContent = options.message;
        el.appendChild(div);
      } else {
        el.appendChild(options.message);
      }
    }

    document.body.appendChild(el);
    el.show();
    return { close: () => el.close(), element: el };
  }

  static confirm(options: ZModalOptions = {}): Promise<boolean> {
    const el = document.createElement("z-modal") as ZModal;
    ZModal._applyOptions(el, options);
    el._dialog.owned = true;

    if (options.message !== undefined) {
      if (typeof options.message === "string") {
        const div = document.createElement("div");
        div.textContent = options.message;
        el.appendChild(div);
      } else {
        el.appendChild(options.message);
      }
    }

    injectBtnStyles();
    let okClicked = false;
    const footer = document.createElement("div");
    footer.slot = "footer";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "z-modal__btn";
    cancelBtn.textContent = options.cancelText ?? "Cancel";
    cancelBtn.addEventListener("click", () => el.close());
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "z-modal__btn z-modal__btn--primary";
    okBtn.textContent = options.okText ?? "OK";
    okBtn.addEventListener("click", () => {
      okClicked = true;
      el.close();
    });
    footer.append(cancelBtn, okBtn);
    el.appendChild(footer);

    document.body.appendChild(el);
    el.show();

    return new Promise((resolve) => {
      el._dialog.onCloseComplete = () => resolve(okClicked);
    });
  }

  static alert(options: ZModalOptions = {}): Promise<void> {
    const el = document.createElement("z-modal") as ZModal;
    ZModal._applyOptions(el, options);
    el._dialog.owned = true;

    if (options.message !== undefined) {
      if (typeof options.message === "string") {
        const div = document.createElement("div");
        div.textContent = options.message;
        el.appendChild(div);
      } else {
        el.appendChild(options.message);
      }
    }

    injectBtnStyles();
    const footer = document.createElement("div");
    footer.slot = "footer";
    const okBtn = document.createElement("button");
    okBtn.type = "button";
    okBtn.className = "z-modal__btn z-modal__btn--primary";
    okBtn.textContent = options.okText ?? "OK";
    okBtn.addEventListener("click", () => el.close());
    footer.appendChild(okBtn);
    el.appendChild(footer);

    document.body.appendChild(el);
    el.show();

    return new Promise((resolve) => {
      el._dialog.onCloseComplete = () => resolve();
    });
  }

  private static _applyOptions(el: ZModal, options: ZModalOptions): void {
    if (options.title !== undefined) el.title = options.title;
    if (options.size !== undefined) el.size = options.size;
    if (options.closeOnOverlay !== undefined) el.closeOnOverlay = options.closeOnOverlay;
    if (options.closeOnEscape !== undefined) el.closeOnEscape = options.closeOnEscape;
    if (options.closeLabel !== undefined) el.closeLabel = options.closeLabel;
    if (options.beforeClose !== undefined) el.beforeClose = options.beforeClose;
  }
}

customElements.define("z-modal", ZModal);
