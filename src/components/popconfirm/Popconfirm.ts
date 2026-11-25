// 气泡确认：删除一行不该弹 modal。
//
// [为什么继承 z-popover 而不是新写一套浮层] 浮层真正难的不是「画个气泡」，是
// 「定位 + 点外部关闭 + 滚动时重定位 + 动画结束清理 + 移动端不越界」。这些
// `FloatingPanelController` 已经处理过两轮（见 popover 里两处 [WHY] 注释）。
// 复制一遍的代价不是多写 80 行，而是**将来那两处修复不会跟过来**。
//
// 所以把 popover 的 `_show` 拆出三个 protected 钩子（锚点 / 面板配置 / 面板内容），
// popover 的骨架只留一份，popconfirm 只覆盖「面板里放什么」。
import { COPY, html, property, escapeAttr, injectGlobalStyles } from "../../core/index.js";
import { ZPopover } from "../popover/Popover.js";
import popconfirmCSS from "./popconfirm.css?raw";

export type ZPopconfirmTone = "primary" | "danger";

/**
 * 面板样式注入到 document.head（浮动层挂在 body 下，shadow 里的 `static styles` 够不到）。
 *
 * [为什么 class 名同时带 z-popover__popup] 背景、边框、圆角、阴影、进出场动画这些
 * 都由 popover 的那份全局样式提供 —— 两处各写一份的话，改一个圆角要改两个文件，
 * 而漏改的那个不会报错。
 */
const PANEL_STYLES = `
  .z-popconfirm__popup {
    min-width: 220px;
    max-width: 320px;
    padding: var(--z-space-3);
  }
  .z-popconfirm__title {
    font-weight: 600;
    font-size: var(--z-font-size-sm);
    color: var(--z-color-text);
    line-height: var(--z-line-height);
  }
  .z-popconfirm__desc {
    margin-top: var(--z-space-1);
    font-size: var(--z-font-size-sm);
    color: var(--z-color-text-secondary);
    line-height: var(--z-line-height);
  }
  .z-popconfirm__actions {
    display: flex;
    justify-content: flex-end;
    gap: var(--z-space-2);
    margin-top: var(--z-space-3);
  }
  .z-popconfirm__actions button {
    height: var(--z-control-h-sm);
    padding: 0 var(--z-space-3);
    font-family: inherit;
    font-size: var(--z-font-size-sm);
    border-radius: var(--z-radius-sm);
    border: 1px solid var(--z-color-border);
    background: var(--z-color-bg);
    color: var(--z-color-text);
    cursor: pointer;
  }
  .z-popconfirm__actions button:hover {
    border-color: var(--z-color-border-hover);
  }
  .z-popconfirm__actions button:focus-visible {
    outline: var(--z-focus-ring-outline);
    outline-offset: 1px;
  }
  /* [WHY 选择器要带上前面的 .z-popconfirm__actions] 上面那条「__actions button」的特异性
     是 (0,1,1)，而单独写 .z-popconfirm__confirm--danger 只有 (0,1,0) —— 结果按钮一直是白底，
     tone="danger" 完全失效。这个 bug 单测抓不到（类名加对了、断言也过了），
     只有真渲染读 computed background 才会发现。 */
  .z-popconfirm__actions button.z-popconfirm__confirm--primary {
    background: var(--z-color-primary-solid);
    border-color: var(--z-color-primary-solid);
    color: var(--z-color-primary-text);
  }
  .z-popconfirm__actions button.z-popconfirm__confirm--primary:hover {
    background: var(--z-color-primary-solid-hover);
    border-color: var(--z-color-primary-solid-hover);
  }
  .z-popconfirm__actions button.z-popconfirm__confirm--danger {
    background: var(--z-color-danger-solid);
    border-color: var(--z-color-danger-solid);
    color: var(--z-color-danger-text);
  }
  .z-popconfirm__actions button.z-popconfirm__confirm--danger:hover {
    background: var(--z-color-danger-solid-hover);
    border-color: var(--z-color-danger-solid-hover);
  }
`;

export class ZPopconfirm extends ZPopover {
  static styles = popconfirmCSS;

  @property({ type: String }) title = "确认执行此操作？";
  @property({ type: String }) description = "";
  /** 确认按钮的语气。删除类操作传 `danger`。 */
  @property({ type: String }) tone: ZPopconfirmTone = "primary";
  @property({ type: String }) confirmText = COPY.confirm;
  @property({ type: String }) cancelText = COPY.cancel;

  connectedCallback(): void {
    // 父类会注入 popover 的面板基础样式（背景/边框/阴影/动画），本类只补差异部分
    super.connectedCallback();
    injectGlobalStyles("z-popconfirm", PANEL_STYLES);
  }

  protected _anchorEl(): HTMLElement | null {
    return this.shadowRoot!.querySelector<HTMLElement>(".z-popconfirm__trigger");
  }

  protected _panelOptions(): {
    panelClass: string;
    hidingClass: string;
    part: string;
    role: string;
  } {
    return {
      // 两个类名并存：z-popover__popup 提供基础观感，z-popconfirm__popup 只覆盖差异
      panelClass: "z-popover__popup z-popconfirm__popup",
      hidingClass: "z-popover__popup--hiding",
      part: "popup",
      role: "alertdialog",
    };
  }

  protected _fillPanel(panel: HTMLElement): void {
    // 文本走 escapeAttr：title / description 常来自业务数据（「确认删除门店 A-1024？」），
    // 门店名里出现引号或尖括号完全正常，直接拼进 innerHTML 就是一条注入路径。
    const desc = this.description
      ? html`<div class="z-popconfirm__desc">${escapeAttr(this.description)}</div>`
      : "";
    panel.innerHTML = html`
      <div class="z-popconfirm__title">${escapeAttr(this.title)}</div>
      ${desc}
      <div class="z-popconfirm__actions">
        <button class="z-popconfirm__cancel" type="button">${escapeAttr(this.cancelText)}</button>
        <button
          class="z-popconfirm__confirm z-popconfirm__confirm--${this.tone === "danger" ? "danger" : "primary"}"
          type="button"
        >${escapeAttr(this.confirmText)}</button>
      </div>
    `;
    // [为什么用 onclick 而不是 addEventListener] 面板可能被 FloatingPanelController 复用；
    // addEventListener 每开一次就多一个监听 ⇒ 一次点击发出两次 z-confirm。
    // onclick 是覆盖语义，天然幂等。
    panel.onclick = this._onPanelClick;
  }

  private _onPanelClick = (e: Event): void => {
    const btn = (e.target as HTMLElement | null)?.closest?.("button");
    if (!btn) return;
    if (btn.classList.contains("z-popconfirm__confirm")) {
      this.emit("z-confirm");
      this.close();
    } else if (btn.classList.contains("z-popconfirm__cancel")) {
      this.emit("z-cancel");
      this.close();
    }
  };

  /** 默认 slot 就是触发器（`<z-popconfirm><z-button>删除</z-button></z-popconfirm>`）。 */
  protected _triggerSlot(): HTMLSlotElement | null {
    return this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])") ?? null;
  }

  protected _triggerHasPopup(): "dialog" {
    return "dialog";
  }

  render(): string {
    // [WHY 不写 aria-haspopup / aria-expanded] 它们是触发器的语义，得落在消费者塞进来的
    // 那个控件上；写在这个 `<span>` 槽容器上无障碍树不承认（2026-11-16 CDP 实测）。
    // 由父类的 _triggerAria 写到真正可聚焦件上，见 core/a11y.ts 的 bindTriggerAria。
    return html`
      <span class="z-popconfirm__trigger" part="trigger"><slot></slot></span>
    `;
  }
}

customElements.define("z-popconfirm", ZPopconfirm);
