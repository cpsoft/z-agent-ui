// <z-switch> 开关：checked 双向绑定、size 两档，切换发 z-change。
import { BaseElement, html, property, escapeAttr } from "../../core/index.js";
import switchCSS from "./switch.css?raw";

export class ZSwitch extends BaseElement {
  static styles = switchCSS;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) size: "sm" | "md" = "md";
  @property({ type: String }) value = "on";
  @property({ type: String }) name = "";
  // [WHY] 同 z-checkbox：合法/非法是语义，由父容器写、控件落到原生字段上。
  @property({ type: Boolean }) invalid = false;

  render(): string {
    const cls = [
      "z-switch",
      this.checked ? "z-switch--checked" : "",
      this.disabled ? "z-switch--disabled" : "",
      `z-switch--${this.size}`,
    ].filter(Boolean).join(" ");

    // [WHY] ?attr= 是字面属性（html() 纯字符串拼接），原生 checked/disabled
    // 从未生效；条件属性作独立片段（先例 Select.ts:151），aria 布尔必须显式字符串
    // See: wiki/bugs/bug-20260810-q-attr-literal-disabled.md
    // [2026-08-10] night-hawk: 修复 ?checked=/?disabled= 字面属性
    return html`
      <label class="${cls}" part="root">
        <input
          type="checkbox"
          class="z-switch__native"
          name="${escapeAttr(this.name)}"
          value="${escapeAttr(this.value)}"
          ${this.checked ? "checked" : ""}
          ${this.disabled ? "disabled" : ""}
          role="switch"
          aria-checked="${this.checked ? "true" : "false"}"
          ${this.invalid ? 'aria-invalid="true"' : ""}
          part="native"
        />
        <span class="z-switch__track" part="track">
          <span class="z-switch__thumb" part="thumb"></span>
        </span>
        <span class="z-switch__label" part="label"><slot></slot></span>
      </label>
    `;
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
    this.emit("z-change", { checked: this.checked });
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 不另判 `.z-switch__native` 早退：监听在宿主上，跨 shadow 时 `e.target` 是宿主本身，
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

customElements.define("z-switch", ZSwitch);
