// <z-radio> 单选框：checked / value / name，变更发 z-change；成组使用请套 z-radio-group。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import radioCSS from "./radio.css?raw";

export class ZRadio extends BaseElement {
  static styles = radioCSS;

  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) value = "on";
  @property({ type: String }) name = "";
  // [WHY] 同 z-checkbox：非法态由 z-form-item 写入，控件负责落到原生字段上。
  @property({ type: Boolean }) invalid = false;

  render(): string {
    const cls = [
      "z-radio",
      this.checked ? "z-radio--checked" : "",
      this.disabled ? "z-radio--disabled" : "",
    ].filter(Boolean).join(" ");

    return html`
      <label class="${cls}" part="root">
        <input
          type="radio"
          class="z-radio__native"
          name="${escapeAttr(this.name)}"
          value="${escapeAttr(this.value)}"
          ${this.checked ? "checked" : ""}
          ${this.disabled ? "disabled" : ""}
          ${this.invalid ? 'aria-invalid="true"' : ""}
          part="native"
          data-focus-key="native"
        />
        <span class="z-radio__circle" part="circle">
          <span class="z-radio__dot" part="dot"></span>
        </span>
        <span class="z-radio__label" part="label"><slot></slot></span>
      </label>
    `;
  }

  /**
   * 把焦点送到内部的原生 input。
   *
   * [WHY 必须转发] 宿主自身不可聚焦（没有 `tabindex`），`host.focus()` 在真浏览器里
   * 是**静默空转** —— 与树那轮踩的 `node.focus()` 完全同一个形态。
   * `z-radio-group` 的「移动即选中」需要把焦点一起搬走，而它只能拿到宿主引用。
   */
  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector<HTMLInputElement>(".z-radio__native")?.focus(options);
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

  select(): void {
    if (this.disabled) return;
    this.checked = true;
    this.emit("z-change", { checked: true, value: this.value });
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 不另判 `.z-radio__native` 早退：监听在宿主上，跨 shadow 时 `e.target` 是宿主本身，
    // 那个判据从来命中不了。下面的 preventDefault 已经拦掉 label 的原生转发，
    // 一次点击只翻一次（真机实测：原生框 / 文字 / 空白处三条路径都只有 1 次 z-change）。
    e.preventDefault();
    this.select();
  };

  private _onKey = (e: Event): void => {
    if ((e as KeyboardEvent).key === " " || (e as KeyboardEvent).key === "Enter") {
      e.preventDefault();
      this.select();
    }
  };
}

defineElement("z-radio", ZRadio);
