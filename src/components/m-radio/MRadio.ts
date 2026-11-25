// <m-radio> 单选：圆形 20px，选中画实心点；与 <m-radio-group> 一起用（组负责互斥）。
//
// [WHY 互斥不能靠原生 name] 每个自定义元素有自己的 shadow root，而原生 radio 的
// `name` 分组**只在同一个 shadow root 内**生效 —— 三个 <m-radio> 各自成组，
// 于是「选了一个，另外两个不灭」，一屏三个都亮着。所以互斥由 `m-radio-group` 显式做。
import { BaseElement, escapeAttr, html, property } from "../../core/index.js";
import mRadioCSS from "./m-radio.css?raw";

export class MRadio extends BaseElement {
  static styles = mRadioCSS;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) value = "";
  @property({ type: String }) label = "";

  private _input: HTMLInputElement | null = null;

  render(): string {
    const cls = [
      "m-radio",
      this.checked ? "m-radio--checked" : "",
      this.disabled ? "m-radio--disabled" : "",
      this.label ? "" : "m-radio--bare",
    ]
      .filter(Boolean)
      .join(" ");
    return html`
      <label class="${cls}" part="root">
        <input
          type="radio"
          class="m-radio__native"
          value="${escapeAttr(this.value)}"
          ${this.checked ? "checked" : ""}
          ${this.disabled ? "disabled" : ""}
          part="native"
        />
        <span class="m-radio__dot" part="dot"></span>
        <span class="m-radio__label" part="label">${this.label ? escapeAttr(this.label) : "<slot></slot>"}</span>
      </label>
    `;
  }

  firstUpdated(): void {
    this._input = this.shadowRoot!.querySelector(".m-radio__native");
  }

  updated(): void {
    if (this._input) this._input.checked = this.checked;
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

  /** 只在**未选中**时上报：再点一次已选中的单选项不该产生一次「改成同一个值」的事件。 */
  select(): void {
    if (this.disabled || this.checked) return;
    this.checked = true;
    this.emit("z-change", { value: this.value });
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 不另判 `.m-radio__native` 早退：监听在宿主上，跨 shadow 时 `e.target` 是宿主本身，
    // 那个判据从来命中不了。下面的 preventDefault 已经拦掉 label 的原生转发，
    // 一次点击只翻一次（真机实测：原生框 / 文字 / 空白处三条路径都只有 1 次 z-change）。
    e.preventDefault();
    this.select();
  };

  private _onKey = (e: Event): void => {
    const key = (e as KeyboardEvent).key;
    if (key !== " " && key !== "Enter") return;
    e.preventDefault();
    this.select();
  };
}

customElements.define("m-radio", MRadio);
