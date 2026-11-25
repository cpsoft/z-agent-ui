// <z-badge> 徽标：把计数或短语贴在角上，tone 定语义色，size 定大小。
import {
  BaseElement,
  html,
  property,
  observeLegacyAttribute,
  syncAlias,
  resolveTone,
} from "../../core/index.js";
import type { Tone } from "../../core/index.js";
import badgeCSS from "./badge.css?raw";

export class ZBadge extends BaseElement {
  static styles = badgeCSS;

  @property({ type: String }) tone: Tone = "default";
  @property({ type: String }) size: "sm" | "md" = "md";

  /** 兼容读：旧名 `variant` 仍然生效，只写 `tone`（不进清单，新代码写不出来）。 */
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
  get variant(): Tone | "" {
    return (this.getAttribute("variant") as Tone | null) ?? "";
  }
  set variant(value: Tone | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const cls = [
      "z-badge",
      `z-badge--${this.tone}`,
      `z-badge--${this.size}`,
    ].join(" ");

    return html`<span class="${cls}" part="root"><slot></slot></span>`;
  }
}

observeLegacyAttribute(ZBadge, "variant");

customElements.define("z-badge", ZBadge);
