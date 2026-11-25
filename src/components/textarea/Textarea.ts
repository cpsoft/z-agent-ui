// [WHY] z-textarea 独立实现 [[2026-08-11-W13-form-basics]]:
// 不复用 z-input 的 multiline,提供 autosize 自适应高度 / 字数统计 / resize 策略。
// 约束: 输入中直写 __zui_prop_value 不走重渲染(Input 先例);
// autosize 高度直写 textarea.style(不进响应式循环,见 [[lesson-web-components-render-pitfalls]] §2)。
import { BaseElement, html, property, escapeHtml, escapeAttr } from "../../core/index.js";
import textareaCSS from "./textarea.css?raw";

export class ZTextarea extends BaseElement {
  static styles = textareaCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = "";
  @property({ type: String }) label = "";
  @property({ type: String }) error = "";
  @property({ type: String }) hint = "";
  @property({ type: Number }) rows = 3;
  @property({ type: Boolean }) autosize = false;
  @property({ type: Number }) maxlength: number | undefined;
  @property({ type: Boolean }) counter = false;
  @property({ type: String }) resize: "none" | "vertical" | "auto" = "vertical";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  // [WHY] 语义上的非法（父容器校验失败），与 `error`（文案 + 视觉）分开，理由同 z-input。
  @property({ type: Boolean }) invalid = false;

  private _focused = false;

  render(): string {
    const { value, placeholder, label, error, hint, disabled, readonly, rows } = this;
    const hasError = !!error;
    const invalid = hasError || this.invalid;
    const effectiveAuto = this.autosize || this.resize === "auto";

    const stateClass = [
      this._focused ? "z-textarea--focused" : "",
      disabled ? "z-textarea--disabled" : "",
      hasError ? "z-textarea--error" : "",
      readonly ? "z-textarea--readonly" : "",
    ].filter(Boolean).join(" ");

    const resizeClass = effectiveAuto ? "z-textarea__field--resize-none" : `z-textarea__field--resize-${this.resize}`;

    // [WHY] 只引用真的渲染出来的 id（旧写法在两者都为空时输出空字符串属性，
    // 且「hint + error 同时给」时 hint 不渲染，IDREF 落空）。同 z-input。
    const describedBy = [hasError ? "z-textarea-error" : hint ? "z-textarea-hint" : ""].filter(Boolean);

    const fieldAttrs = [
      // 同 z-input：label 的 for 要指到同一 shadow 内存在的 id
      `id="z-textarea-field"`,
      `name="${escapeAttr(this.getAttribute("name") ?? "")}"`,
      placeholder ? `placeholder="${escapeAttr(placeholder)}"` : "",
      disabled ? "disabled" : "",
      readonly ? "readonly" : "",
      this.maxlength != null ? `maxlength="${this.maxlength}"` : "",
      `rows="${rows}"`,
      describedBy.length ? `aria-describedby="${describedBy.join(" ")}"` : "",
      `aria-invalid="${invalid ? "true" : "false"}"`,
    ].filter(Boolean).join(" ");

    return html`
      ${label ? html`<label class="z-textarea__label" for="z-textarea-field" part="label">${escapeHtml(label)}</label>` : ""}
      <div class="z-textarea__wrapper ${stateClass}" part="wrapper">
        <textarea class="z-textarea__field ${resizeClass}" ${fieldAttrs} part="field">${escapeHtml(value)}</textarea>
      </div>
      <div class="z-textarea__messages">
        ${hint && !hasError ? html`<span class="z-textarea__hint" id="z-textarea-hint" part="hint">${escapeHtml(hint)}</span>` : ""}
        ${error ? html`<span class="z-textarea__error" id="z-textarea-error" part="error" role="alert">${escapeHtml(error)}</span>` : ""}
        ${this.counter && this.maxlength != null ? html`<span class="z-textarea__counter" part="counter">${(value?.length ?? 0)}/${this.maxlength}</span>` : ""}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("focusin", this._onFocusIn);
    this.addEventListener("focusout", this._onFocusOut);
    this.shadowRoot!.addEventListener("input", this._onInput);
    this.shadowRoot!.addEventListener("change", this._onChange);
  }

  disconnectedCallback(): void {
    this.removeEventListener("focusin", this._onFocusIn);
    this.removeEventListener("focusout", this._onFocusOut);
    this.shadowRoot!.removeEventListener("input", this._onInput);
    this.shadowRoot!.removeEventListener("change", this._onChange);
    super.disconnectedCallback();
  }

  firstUpdated(): void {
    this._syncFieldValue();
    this._resize();
  }

  updated(): void {
    this._syncFieldValue();
    this._updateCounter();
    this._resize();
  }

  focus(): void {
    this._getField()?.focus();
  }

  blur(): void {
    this._getField()?.blur();
  }

  select(): void {
    this._getField()?.select();
  }

  clear(): void {
    this.value = "";
    this.emit("z-input", { value: "" });
    this.emit("z-change", { value: "" });
  }

  private _getField(): HTMLTextAreaElement | null {
    return this.shadowRoot!.querySelector(".z-textarea__field");
  }

  private _syncFieldValue(): void {
    const field = this._getField();
    if (field && field.value !== this.value) {
      field.value = this.value;
    }
  }

  private _updateCounter(): void {
    const counter = this.shadowRoot!.querySelector(".z-textarea__counter");
    if (counter) counter.textContent = `${(this.value?.length ?? 0)}/${this.maxlength}`;
  }

  // [WHY] autosize 高度直写 style 不进渲染循环;scrollHeight=0（首帧/happy-dom）跳过
  private _resize(): void {
    const field = this._getField();
    if (!field) return;
    const effectiveAuto = this.autosize || this.resize === "auto";
    if (!effectiveAuto) return;
    field.style.height = "auto";
    if (field.scrollHeight > 0) field.style.height = `${field.scrollHeight}px`;
  }

  private _onInput = (): void => {
    const field = this._getField();
    if (field) {
      (this as any).__zui_prop_value = field.value;
      this._updateCounter();
      this._resize();
      this.emit("z-input", { value: field.value });
    }
  };

  private _onChange = (): void => {
    const field = this._getField();
    if (field) {
      (this as any).__zui_prop_value = field.value;
      this._updateCounter();
      this.emit("z-change", { value: field.value });
    }
  };

  private _onFocusIn = (): void => {
    this._focused = true;
    this.shadowRoot!.querySelector(".z-textarea__wrapper")?.classList.add("z-textarea--focused");
    this.emit("z-focus");
  };

  private _onFocusOut = (): void => {
    this._focused = false;
    this.shadowRoot!.querySelector(".z-textarea__wrapper")?.classList.remove("z-textarea--focused");
    this.emit("z-blur");
  };

}

customElements.define("z-textarea", ZTextarea);
