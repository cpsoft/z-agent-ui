import { COPY, BaseElement, html, property, escapeHtml, escapeAttr, controlHeight, type ControlSize } from "../../core/index.js";
import inputCSS from "./input.css?raw";

// [WHY] 修复 Gitee IKRAOT：放行四个原生日期时间类型，让 label / hint / error / clearable /
// prefix-suffix 这套壳能直接复用，不必为原生日期控件另造一层。
export type InputType =
  | "text" | "password" | "email" | "number" | "search" | "url" | "tel"
  | "date" | "month" | "datetime-local" | "time";

export class ZInput extends BaseElement {
  static styles = inputCSS;

  @property({ type: String }) type: InputType = "text";
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = "";
  @property({ type: String }) label = "";
  @property({ type: String }) error = "";
  @property({ type: String }) hint = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) required = false;
  @property({ type: Boolean }) clearable = false;
  @property({ type: Boolean }) multiline = false;
  @property({ type: Number }) maxlength: number | undefined;
  @property({ type: Number }) minlength: number | undefined;
  @property({ type: String }) pattern = "";
  @property({ type: String }) autocomplete = "";
  // [WHY] 修复 Gitee IKRAOT：number / date / month / datetime-local / time 五个类型都需要
  // 原生约束与步进。刻意用 string 而非 number —— `step="any"` 是合法值，原生 type="date"
  // 的 min/max 又是 "YYYY-MM-DD" 字符串，声明成 number 反而会把它挡在外面。
  @property({ type: String }) min = "";
  @property({ type: String }) max = "";
  @property({ type: String }) step = "";
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) clearLabel = COPY.clearInput;
  // 控件高度档位（xs 24 / sm 28 / md 32 / lg 36，随密度缩放）。
  // 默认 sm **等于既有高度** —— 换成 md 会让全站输入框长高 4px，那是另一个决定。
  @property({ type: String }) size: ControlSize = "sm";
  // [WHY 需要 invalid，而不是让宿主直接写 aria-invalid]
  // `aria-invalid` 必须落在**可聚焦件**上才有语义（本控件里是 shadow 内的 `<input>`），
  // 而宿主/父容器只能拿到 `<z-input>` 这个 host。`z-form-item` 校验失败时正是这种处境：
  // 它要么写 host 的 `aria-invalid`（读屏忽略，host 没有角色），要么就得知道内部结构。
  // 给一条属性，控件自己在 render 里把它写到字段上 —— 唯一知道内部结构的人来做这件事。
  // `error` 属性管「文案 + 视觉 + 占位高度」，`invalid` 只管语义，两者互不替代：
  // 校验期把 error 设上去会多出一行文案、撑高布局（见 FormItem._setError 的说明）。
  @property({ type: Boolean }) invalid = false;

  private _focused = false;

  protected willUpdate(): void {
    // 只写一条变量，CSS 里 `height: var(--_h, var(--z-input-height))` 接它。
    // 不走 `:host([size="lg"])` 属性选择器：那条路依赖 attribute 反射，
    // 与 `el.size = "lg"` 会分成两条路径（症状是「写 HTML 生效、JS 赋值不生效」）。
    this.style.setProperty("--_h", controlHeight(this.size));
  }

  render(): string {
    const {
      type, value, placeholder, label, error, hint,
      disabled, readonly, required,
      clearable, multiline, maxlength, minlength, pattern, autocomplete,
      min, max, step,
    } = this;

    const hasError = !!error;
    // 语义上的非法 = 自带错误文案，或父容器（z-form-item）判定的校验失败
    const invalid = hasError || this.invalid;
    const showClear = clearable && (value?.length ?? 0) > 0 && !disabled && !readonly;

    // [WHY 只列**真的渲染了**的 id] 旧写法恒输出 `aria-describedby=" "`（hint 与 error 都为空时），
    // 以及「hint 与 error 同时给」时指向 hint —— 而 hint 在 hasError 分支里是不渲染的
    // （见下面的 `hint && !hasError`）。于是读屏拿到一个指向空处的 IDREF 引用，
    // 更糟的是它会**顶掉**父容器想要的关联。空列表就不写这个属性。
    const describedBy = [hint && !hasError ? "z-input-hint" : "", hasError ? "z-input-error" : ""]
      .filter(Boolean);

    const stateClass = [
      this._focused ? "z-input--focused" : "",
      disabled ? "z-input--disabled" : "",
      hasError ? "z-input--error" : "",
      readonly ? "z-input--readonly" : "",
    ].filter(Boolean).join(" ");

    const fieldAttrs = [
      // [WHY] label 的 `for` 必须指到一个**同一 shadow 内**存在的 id。
      // 旧写法只渲染了 `<label>` 文字，没有 for、字段也没有 id —— 于是
      // ① 点 label 不聚焦字段 ② 读屏认为字段没有名称（占位符不是名称）。
      // 在本 shadow 内 id 唯一即可（影子树各自独立，多实例不会互相命中）。
      `id="z-input-field"`,
      `type="${multiline ? "" : type}"`,
      `name="${escapeAttr(this.getAttribute("name") ?? "")}"`,
      placeholder ? `placeholder="${escapeAttr(placeholder)}"` : "",
      disabled ? "disabled" : "",
      readonly ? "readonly" : "",
      required ? "required" : "",
      maxlength != null ? `maxlength="${maxlength}"` : "",
      minlength != null ? `minlength="${minlength}"` : "",
      // [WHY] 只在单行字段透传：textarea 没有 min/max/step 语义（IKRAOT）
      !multiline && min ? `min="${escapeAttr(min)}"` : "",
      !multiline && max ? `max="${escapeAttr(max)}"` : "",
      !multiline && step ? `step="${escapeAttr(step)}"` : "",
      pattern ? `pattern="${escapeAttr(pattern)}"` : "",
      autocomplete ? `autocomplete="${escapeAttr(autocomplete)}"` : "",
      `aria-invalid="${invalid ? "true" : "false"}"`,
      describedBy.length ? `aria-describedby="${describedBy.join(" ")}"` : "",
    ].filter(Boolean).join(" ");

    const inputField = multiline
      ? html`<textarea class="z-input__field" ${fieldAttrs} part="field">${escapeHtml(value)}</textarea>`
      : html`<input class="z-input__field" ${fieldAttrs} value="${escapeAttr(value)}" part="field" />`;

    return html`
      ${label ? html`<label class="z-input__label" for="z-input-field" part="label">${escapeHtml(label)}${required ? html`<span class="z-input__required" aria-hidden="true">*</span>` : ""}</label>` : ""}
      <div class="z-input__wrapper ${stateClass}" part="wrapper">
        <span class="z-input__prefix" part="prefix"><slot name="prefix"></slot></span>
        ${inputField}
        <span class="z-input__suffix" part="suffix">
          <slot name="suffix"></slot>
          ${showClear ? html`<button type="button" class="z-input__clear" part="clear" tabindex="-1" aria-label="${escapeAttr(this.clearLabel)}">&times;</button>` : ""}
        </span>
      </div>
      ${hint && !hasError ? html`<span class="z-input__hint" id="z-input-hint" part="hint">${escapeHtml(hint)}</span>` : ""}
      ${error ? html`<span class="z-input__error" id="z-input-error" part="error">${escapeHtml(error)}</span>` : ""}
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("focusin", this._onFocusIn);
    this.addEventListener("focusout", this._onFocusOut);
    this.shadowRoot!.addEventListener("input", this._onInput);
    this.shadowRoot!.addEventListener("change", this._onChange);
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("focusin", this._onFocusIn);
    this.removeEventListener("focusout", this._onFocusOut);
    this.shadowRoot!.removeEventListener("input", this._onInput);
    this.shadowRoot!.removeEventListener("change", this._onChange);
    this.shadowRoot!.removeEventListener("click", this._onClick);
  }

  firstUpdated(): void {
    this._syncFieldValue();
  }

  updated(): void {
    this._syncFieldValue();
  }

  /** Programmatic focus. */
  focus(): void {
    this._getField()?.focus();
  }

  /** Programmatic blur. */
  blur(): void {
    this._getField()?.blur();
  }

  /** Select all text in the field. */
  select(): void {
    this._getField()?.select();
  }

  /** Clear the value and emit z-input. */
  clear(): void {
    this.value = "";
    this.emit("z-input", { value: "" });
    this.emit("z-change", { value: "" });
  }

  private _getField(): HTMLInputElement | HTMLTextAreaElement | null {
    return this.shadowRoot!.querySelector(".z-input__field");
  }

  private _syncFieldValue(): void {
    const field = this._getField();
    if (field && field.value !== this.value) {
      field.value = this.value;
    }
  }

  private _updateClearButton(): void {
    const suffix = this.shadowRoot!.querySelector(".z-input__suffix");
    if (!suffix) return;
    const btn = suffix.querySelector(".z-input__clear") as HTMLElement | null;
    const show = this.clearable && (this.value?.length ?? 0) > 0 && !this.disabled && !this.readonly;
    if (show && !btn) {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "z-input__clear";
      el.setAttribute("part", "clear");
      el.tabIndex = -1;
      el.setAttribute("aria-label", this.clearLabel);
      el.textContent = "×";
      suffix.appendChild(el);
    } else if (!show && btn) {
      btn.remove();
    }
  }

  private _onInput = (): void => {
    const field = this._getField();
    if (field) {
      (this as any).__zui_prop_value = field.value;
      this._updateClearButton();
      this.emit("z-input", { value: field.value });
    }
  };

  private _onChange = (): void => {
    const field = this._getField();
    if (field) {
      (this as any).__zui_prop_value = field.value;
      this._updateClearButton();
      this.emit("z-change", { value: field.value });
    }
  };

  private _onFocusIn = (): void => {
    this._focused = true;
    const wrapper = this.shadowRoot!.querySelector(".z-input__wrapper");
    if (wrapper) wrapper.classList.add("z-input--focused");
    this.emit("z-focus");
  };

  private _onFocusOut = (): void => {
    this._focused = false;
    const wrapper = this.shadowRoot!.querySelector(".z-input__wrapper");
    if (wrapper) wrapper.classList.remove("z-input--focused");
    this.emit("z-blur");
  };

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("z-input__clear")) {
      this.clear();
    }
  };

}

customElements.define("z-input", ZInput);
