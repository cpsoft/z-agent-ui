// <z-alert> 页内提示条：tone 定语义色（info/success/warning/danger），title 给标题、默认槽给正文，closable 出关闭按钮并发 z-alert-close。
import {
  BaseElement,
  html,
  property,
  escapeAttr,
  observeLegacyAttribute,
  syncAlias,
  resolveTone,
  COPY,
 defineElement } from "../../core/index.js";
import type { Tone } from "../../core/index.js";
import alertCSS from "./alert.css?raw";

/**
 * alert 支持的语义色：**TONES 的子集**。
 *
 * [WHY 不直接等于 Tone] alert 只有「提示 / 成功 / 警告 / 危险」四种语气。
 * `primary` 是品牌色，用在提示条上没有对应底色 —— 写上去会渲染成没有 accent 的灰条，
 * 不报错但是错的。类型收窄到四个，反而让「写错了」在编译期就暴露。
 */
export type AlertTone = Extract<Tone, "info" | "success" | "warning" | "danger">;
/** @deprecated 2026-11-15 起用 `tone`；旧名 `variant` 仍可读（error → danger）。 */
export type AlertVariant = AlertTone | "error";

const ICONS: Record<string, string> = {
  info: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4M8 5h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  success: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  warning: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M1 14L8 2l7 12H1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 7v3M8 12h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  danger: `<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4M8 11h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
};

const CLOSE_SVG = `<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>`;

export class ZAlert extends BaseElement {
  static styles = alertCSS;

  @property({ type: String }) tone: AlertTone = "info";
  @property({ type: Boolean }) closable = false;
  // [WHY] title 是 HTMLElement 反射属性：`= ""` 字段初始化器在构造期触发原生
  // setter → setAttribute("title") → 违反 CE 构造约束，createElement 抛
  // "The result must not have attributes"。用 `!` 声明不初始化，
  // 默认 "" 由 applyPropertyMeta 读取原生 getter（无属性时返回 ""）取得
  // See: wiki/bugs/bug-20260810-title-ctor-attr.md
  // [2026-08-10] night-hawk: 修复构造期属性污染
  @property({ type: String }) title!: string;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) closeLabel = COPY.closeAlert;

  private _visible = true;

  /** 兼容读：`variant="error"` → `tone="danger"`，`variant="info"` → `tone="info"`。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      const tone = resolveTone(value);
      if (tone && tone !== "default" && tone !== "primary") syncAlias(this, "tone", "tone", tone);
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }


  /**
   * @deprecated 旧名 `variant` 的 **JS 属性**兼容层。
   *
   * [WHY 属性也要兼容，不能只管 attribute] 兼容读只挂 `attributeChangedCallback` 时，
   * `el.variant = "danger"` 会变成给实例加一个普通字段 —— 读得回自己写的值，界面上毫无变化，
   * 且**零报错**。这正是收口期最危险的一种「看起来生效」。这里把它转成 setAttribute，
   * 复用同一条映射，保证 attribute 与 property 两条入口行为一致。
   */
  get variant(): AlertTone | "" {
    return (this.getAttribute("variant") as AlertTone | null) ?? "";
  }
  set variant(value: AlertTone | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    if (!this._visible) {
      this.setAttribute("hidden", "");
      return html`<div style="display:none" part="hidden"></div>`;
    }
    this.removeAttribute("hidden");

    const icon = ICONS[this.tone] ?? ICONS.info;

    return html`
      <div class="z-alert z-alert--${this.tone}" part="root" role="alert">
        <span class="z-alert__icon" part="icon">
          <slot name="icon">${icon}</slot>
        </span>
        <div class="z-alert__content">
          ${this.title ? html`<div class="z-alert__title" part="title">${escapeAttr(this.title)}</div>` : ""}
          <div class="z-alert__message" part="message">
            <slot></slot>
          </div>
        </div>
        ${this.closable ? html`
          <button type="button" class="z-alert__close" part="close" aria-label="${escapeAttr(this.closeLabel)}">
            ${CLOSE_SVG}
          </button>
        ` : ""}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  show(): void {
    this._visible = true;
    this.requestUpdate();
  }

  hide(): void {
    this._visible = false;
    this.emit("z-alert-close");
    this.requestUpdate();
  }

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (target.closest(".z-alert__close")) {
      this.hide();
    }
  };

}

observeLegacyAttribute(ZAlert, "variant");

defineElement("z-alert", ZAlert);
