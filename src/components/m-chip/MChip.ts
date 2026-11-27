// <m-chip> 筛选标签：label 作文案、tone 定语气的，selected 画选中态；点击发 z-click，选中与否由宿主决定。
// [WHY] 移动端筛选标签：把「选中态」交给宿主（受控组件），本组件只负责点击与外观。
// 标签文本来自接口数据（门店名、分类名等），插值必须转义 —— html`` 不做自动转义。
import {
  BaseElement,
  html,
  property,
  escapeHtml,
  observeLegacyAttribute,
  syncAlias,
  resolveTone,
 defineElement } from "../../core/index.js";
import type { Tone } from "../../core/index.js";
import mChipCSS from "./m-chip.css?raw";

export class MChip extends BaseElement {
  static styles = mChipCSS;

  /** 标签文本；留空时渲染默认插槽（允许放图标 + 文本的复合内容）。 */
  @property({ type: String }) label: string = "";
  @property({ type: String }) tone: Tone = "default";
  @property({ type: Boolean }) selected: boolean = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onActivate);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onActivate);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  private _onActivate = (): void => {
    this.emit("z-click", { selected: this.selected });
  };

  // [WHY] role="button" + tabindex="0" 声明了「这是个可操作的按钮」，就必须给键盘路径。
  // 只有 tabindex 没有 keydown 的无障碍缺陷比不写 role 更糟：读屏会宣布它是按钮，用户按回车却没反应。
  // [WHY] 形参声明为 Event：ShadowRoot.addEventListener 在本仓 tsconfig 下只重载了
  // "slotchange"，传 KeyboardEvent 形参会 TS2769；需要键位信息就在体内收窄。
  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    // [WHY] Space 默认会滚动页面，必须拦掉
    ke.preventDefault();
    this._onActivate();
  };

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
  get variant(): Tone | "" {
    return (this.getAttribute("variant") as Tone | null) ?? "";
  }
  set variant(value: Tone | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const cls = [
      "m-chip",
      `m-chip--${this.tone}`,
      this.selected ? "m-chip--selected" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const content = this.label ? escapeHtml(this.label) : html`<slot></slot>`;

    return html`<div class="${cls}" part="root" role="button" tabindex="0" aria-pressed="${this.selected ? "true" : "false"}">${content}</div>`;
  }
}

observeLegacyAttribute(MChip, "variant");

defineElement("m-chip", MChip);
