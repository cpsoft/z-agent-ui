// <m-checkbox> 复选框：勾选 / 半选（全选）/ 禁用，变更发 z-change。
//
// [WHY 不复用 z-checkbox] 两者的命中区与观感是两套：桌面 14px 方块 + 行内文字，
// 手机 20px 方块 + 44px 触控行；购物车一屏要放五六个，方块小 2px 就会频繁点不中。
// 拆开的代价只是两份 SVG，收益是两端的排版各自能给到极限。
//
// [WHY 半选是独立状态而不是「未选中」] 购物车的「全选」在「买了三件里的两件」时必须
// 画成横杠：画成未选，用户会以为一件都没勾；画成选中，点一下变全不选，与预期相反。
import { BaseElement, ariaBool, escapeAttr, html, property } from "../../core/index.js";
import mCheckboxCSS from "./m-checkbox.css?raw";

export class MCheckbox extends BaseElement {
  static styles = mCheckboxCSS;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) indeterminate = false;
  @property({ type: String }) value = "";
  @property({ type: String }) name = "";
  /** 无 slot 内容时的文字（有 slot 时以 slot 为准，避免两处都写）。 */
  @property({ type: String }) label = "";

  private _input: HTMLInputElement | null = null;

  render(): string {
    const icon = this.indeterminate
      ? '<svg class="m-checkbox__icon" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      : this.checked
        ? '<svg class="m-checkbox__icon" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.2l2.6 2.6L11 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
        : "";
    const cls = [
      "m-checkbox",
      this.checked ? "m-checkbox--checked" : "",
      this.indeterminate ? "m-checkbox--indeterminate" : "",
      this.disabled ? "m-checkbox--disabled" : "",
      this.label ? "" : "m-checkbox--bare",
    ]
      .filter(Boolean)
      .join(" ");
    return html`
      <label class="${cls}" part="root">
        <input
          type="checkbox"
          class="m-checkbox__native"
          name="${escapeAttr(this.name)}"
          value="${escapeAttr(this.value)}"
          ${this.checked ? "checked" : ""}
          ${this.disabled ? "disabled" : ""}
          aria-checked="${this.indeterminate ? "mixed" : ariaBool(this.checked)}"
          part="native"
        />
        <span class="m-checkbox__box" part="box">${icon}</span>
        <span class="m-checkbox__label" part="label">${this.label ? escapeAttr(this.label) : "<slot></slot>"}</span>
      </label>
    `;
  }

  firstUpdated(): void {
    this._input = this.shadowRoot!.querySelector(".m-checkbox__native");
    if (this._input) this._input.indeterminate = this.indeterminate;
  }

  updated(): void {
    if (!this._input) return;
    this._input.checked = this.checked;
    this._input.indeterminate = this.indeterminate;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onClick);
    this.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("keydown", this._onKey);
    super.disconnectedCallback();
  }

  /** 外部调用（如「全选」联动）。与点击同一条路径，事件只发一次。 */
  toggle(): void {
    if (this.disabled) return;
    const checked = !this.checked;
    this.checked = checked;
    // 半选被点掉之后就是明确的选中/未选中，不清掉会一直画横杠
    this.indeterminate = false;
    this.emit("z-change", { checked, value: this.value });
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 不另判 `.m-checkbox__native` 早退：监听在宿主上，跨 shadow 时 `e.target` 是宿主本身，
    // 那个判据从来命中不了。下面的 preventDefault 已经拦掉 label 的原生转发，
    // 一次点击只翻一次（真机实测：原生框 / 文字 / 空白处三条路径都只有 1 次 z-change）。
    e.preventDefault();
    this.toggle();
  };

  private _onKey = (e: Event): void => {
    const key = (e as KeyboardEvent).key;
    if (key !== " " && key !== "Enter") return;
    e.preventDefault();
    this.toggle();
  };
}

customElements.define("m-checkbox", MCheckbox);
