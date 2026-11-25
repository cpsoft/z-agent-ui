// <z-spinner> 加载指示器：size 定大小、shape 定形态，用于按钮内嵌或区块占位。
import {
  BaseElement,
  html,
  property,
  observeLegacyAttribute,
  syncAlias,
} from "../../core/index.js";
import spinnerCSS from "./spinner.css?raw";

export type SpinnerSize = "sm" | "md" | "lg";
/** 形态（组件局部维度：环形 / 生长 / 三点，与语义色无关）。 */
export type SpinnerShape = "border" | "grow" | "dots";
/** @deprecated 2026-11-15 起用 `shape`；旧名仍可读，下一主版本删除。 */
export type SpinnerVariant = SpinnerShape;
const SHAPES: readonly SpinnerShape[] = ["border", "grow", "dots"];

export class ZSpinner extends BaseElement {
  static styles = spinnerCSS;

  @property({ type: String }) size: SpinnerSize = "md";
  @property({ type: String }) shape: SpinnerShape = "border";

  /** 兼容读：旧名 `variant` 的取值域与 `shape` 完全相同，直接搬运。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      if (value && (SHAPES as readonly string[]).includes(value)) syncAlias(this, "shape", "shape", value);
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
  get variant(): SpinnerShape | "" {
    return (this.getAttribute("variant") as SpinnerShape | null) ?? "";
  }
  set variant(value: SpinnerShape | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const cls = `z-spinner z-spinner--${this.shape} z-spinner--${this.size}`;

    if (this.shape === "dots") {
      return html`
        <span class="${cls}" part="root" aria-hidden="true">
          <span class="z-spinner__dot"></span>
          <span class="z-spinner__dot"></span>
          <span class="z-spinner__dot"></span>
        </span>
      `;
    }

    return html`<span class="${cls}" part="root" aria-hidden="true"></span>`;
  }
}

observeLegacyAttribute(ZSpinner, "variant");

customElements.define("z-spinner", ZSpinner);
