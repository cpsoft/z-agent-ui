// <z-progress> 进度条：value 取 0–100，tone 定语义色，striped 与 animated 给条纹和流动，showLabel 显示百分比。
import {
  BaseElement,
  html,
  property,
  observeLegacyAttribute,
  syncAlias,
  resolveTone,
} from "../../core/index.js";
import type { Tone } from "../../core/index.js";
import progressCSS from "./progress.css?raw";

/** 语义色（规范词表 TONES）。 */
export type ProgressTone = Tone;
/** @deprecated 2026-11-15 起用 `tone`；旧名仍可读，下一主版本删除。 */
export type ProgressVariant = Tone;

export class ZProgress extends BaseElement {
  static styles = progressCSS;

  @property({ type: Number }) value = 0;
  @property({ type: String }) tone: ProgressTone = "default";
  @property({ type: String }) size: "sm" | "md" = "md";
  @property({ type: Boolean }) striped = false;
  @property({ type: Boolean }) animated = false;
  @property({ type: Boolean }) showLabel = false;

  /** 兼容读：旧名 `variant` 仍然生效，只写 `tone`。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      const tone = resolveTone(value);
      if (tone) syncAlias(this, "tone", "tone", tone);
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
  get variant(): ProgressTone | "" {
    return (this.getAttribute("variant") as ProgressTone | null) ?? "";
  }
  set variant(value: ProgressTone | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const pct = Math.max(0, Math.min(100, this.value));
    const fillCls = [
      `z-progress__fill--${this.tone}`,
      this.striped ? "z-progress__fill--striped" : "",
      this.animated && this.striped ? "z-progress__fill--animated" : "",
    ].filter(Boolean).join(" ");

    return html`
      <div class="z-progress z-progress--${this.size}" part="root" role="progressbar"
           aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="z-progress__track" part="track">
          <div class="z-progress__fill ${fillCls}" part="fill"
               style="width:${pct}%"></div>
        </div>
        ${this.showLabel ? html`<span class="z-progress__label" part="label">${pct}%</span>` : ""}
      </div>
    `;
  }
}

observeLegacyAttribute(ZProgress, "variant");

customElements.define("z-progress", ZProgress);
