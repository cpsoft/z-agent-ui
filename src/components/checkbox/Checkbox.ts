// <z-checkbox> 复选框：checked 与 indeterminate 三态，value / name 随表单提交，变更发 z-change。
import { BaseElement, html, property, escapeAttr, ariaBool, defineElement } from "../../core/index.js";
import checkboxCSS from "./checkbox.css?raw";

export class ZCheckbox extends BaseElement {
  static styles = checkboxCSS;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) indeterminate = false;
  @property({ type: String }) value = "on";
  @property({ type: String }) name = "";
  // [WHY] 校验失败态由父容器（z-form-item）写入，控件负责把它落到可聚焦件上 ——
  // 宿主拿到的只是 `<z-checkbox>` 这个 host，而 host 没有角色，`aria-invalid` 挂上去读屏读不到。
  @property({ type: Boolean }) invalid = false;

  private _input: HTMLInputElement | null = null;

  render(): string {
    const icon = this.indeterminate
      ? html`<svg class="z-checkbox__icon" viewBox="0 0 12 12" part="icon"><rect x="2" y="5" width="8" height="2" rx="0.5" fill="currentColor"/></svg>`
      : this.checked
        ? html`<svg class="z-checkbox__icon" viewBox="0 0 12 12" part="icon"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
        : "";

    const cls = [
      "z-checkbox",
      this.checked ? "z-checkbox--checked" : "",
      this.indeterminate ? "z-checkbox--indeterminate" : "",
      this.disabled ? "z-checkbox--disabled" : "",
    ].filter(Boolean).join(" ");

    return html`
      <label class="${cls}" part="root">
        <input
          type="checkbox"
          class="z-checkbox__native"
          name="${escapeAttr(this.name)}"
          value="${escapeAttr(this.value)}"
          ${this.checked ? "checked" : ""}
          ${this.disabled ? "disabled" : ""}
          aria-checked="${this.indeterminate ? "mixed" : ariaBool(this.checked)}"
          ${this.invalid ? 'aria-invalid="true"' : ""}
          part="native"
        />
        <span class="z-checkbox__box" part="box">${icon}</span>
        <span class="z-checkbox__label" part="label"><slot></slot></span>
      </label>
    `;
  }

  firstUpdated(): void {
    this._input = this.shadowRoot!.querySelector(".z-checkbox__native");
    this._input!.indeterminate = this.indeterminate;
  }

  updated(): void {
    if (this._input) {
      this._input.checked = this.checked;
      this._input.indeterminate = this.indeterminate;
    }
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

  toggle(): void {
    if (this.disabled) return;
    this.checked = !this.checked;
    this.indeterminate = false;
    this.emit("z-change", { checked: this.checked });
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 不另判 `.z-checkbox__native` 早退：监听在宿主上，跨 shadow 时 `e.target` 是宿主本身，
    // 那个判据从来命中不了。下面的 preventDefault 已经拦掉 label 的原生转发，
    // 一次点击只翻一次（真机实测：原生框 / 文字 / 空白处三条路径都只有 1 次 z-change）。
    e.preventDefault();
    this.toggle();
  };

  private _onKey = (e: Event): void => {
    if ((e as KeyboardEvent).key === " " || (e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      this.toggle();
    }
  };
}

defineElement("z-checkbox", ZCheckbox);
