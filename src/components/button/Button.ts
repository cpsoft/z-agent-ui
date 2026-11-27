// <z-button> 按钮：tone 定语义色、appearance 定外观、size 定尺寸，loading 与 disabled 都会拦住 z-click。
import {
  BaseElement,
  html,
  property,
  observeLegacyAttribute,
  syncAlias,
  ariaBool,
 defineElement } from "../../core/index.js";
import type { Appearance, Tone } from "../../core/index.js";

import buttonCSS from "./button.css?raw";

/** 语义色：按钮只用到这三档（info/success/warning 在按钮上没有既定样式）。 */
export type ButtonTone = Extract<Tone, "primary" | "danger" | "default">;
/** 外观：与语义色正交 —— 同一个 tone 可以是实心、描边、幽灵、软底或链接。 */
export type ButtonAppearance = Appearance;
/** @deprecated 2026-11-15 起用 `tone` + `appearance`；旧名 `variant` 仍可读，下一主版本删除。 */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

/**
 * 旧 variant → (tone, appearance)。
 *
 * [WHY 要这张表而不是「删掉 variant」] 存量页面有 170 多处 `variant="ghost"` 这类写法，
 * 一刀切会让它们退回默认样式（蓝底实心）——不报错，只是整页按钮都变了样。
 * 表里没有的值**不做任何映射**（保持现状），避免把拼写错误悄悄变成默认样式。
 */
const LEGACY_VARIANTS: Record<string, readonly [ButtonTone, ButtonAppearance]> = {
  primary: ["primary", "solid"],
  secondary: ["default", "solid"],
  outline: ["primary", "outline"],
  ghost: ["primary", "ghost"],
  danger: ["danger", "solid"],
};

export class ZButton extends BaseElement {
  static styles = buttonCSS;

  @property({ type: String }) tone: ButtonTone = "primary";
  @property({ type: String }) appearance: ButtonAppearance = "solid";
  @property({ type: String }) size: ButtonSize = "md";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) loading = false;
  @property({ type: String, attribute: "type" }) buttonType: "button" | "submit" | "reset" = "button";

  /** 兼容读：旧名 `variant` 拆到 `tone` + `appearance` 两维，只写新维度。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      const mapped = value ? LEGACY_VARIANTS[value] : undefined;
      if (mapped) {
        syncAlias(this, "tone", "tone", mapped[0]);
        syncAlias(this, "appearance", "appearance", mapped[1]);
      }
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }

  /**
   * @deprecated 旧名 `variant` 的 JS 属性兼容层：转成 setAttribute，复用同一条映射。
   * [WHY] 只挂 attribute 回调时 `el.variant = "ghost"` 会变成给实例加普通字段 ——
   * 读得回自己写的值、界面毫无变化、零报错。
   */
  get variant(): string {
    return this.getAttribute("variant") ?? "";
  }
  set variant(value: string) {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    // [WHY tone 不参与模板] 语义色由 CSS 的 `:host([tone=…])` 决定（attribute 已反射），
    // 模板只负责外观类名与尺寸类名 —— 这样新增一个 tone 只需要加一段变量，不用碰模板。
    const { appearance, size, disabled, loading, buttonType } = this;
    const isDisabled = disabled || loading;

    return html`
      <button
        class="z-button z-button--${appearance} z-button--${size}"
        type="${buttonType}"
        ${isDisabled ? "disabled" : ""}
        aria-disabled="${ariaBool(isDisabled)}"
        aria-busy="${ariaBool(loading)}"
        part="button"
      >
        ${loading ? html`<span class="z-button__spinner" part="spinner"></span>` : ""}
        <span class="z-button__prefix" part="prefix"><slot name="prefix"></slot></span>
        <span class="z-button__label" part="label"><slot></slot></span>
        <span class="z-button__suffix" part="suffix"><slot name="suffix"></slot></span>
      </button>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
  }

  private _onClick = (e: Event): void => {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (this.buttonType === "submit" || this.buttonType === "reset") {
      const form = this.closest("form");
      if (form && this.buttonType === "submit") {
        e.preventDefault();
        form.requestSubmit();
      } else if (form && this.buttonType === "reset") {
        e.preventDefault();
        form.reset();
      }
    }
    this.emit("z-click");
  };
}

observeLegacyAttribute(ZButton, "variant");

defineElement("z-button", ZButton);
