// [WHY] z-number-input [[2026-08-11-W13-form-basics]]:
// 步进按钮 + 键盘上下 + min/max 钳制 + precision 小数。
// z-input 语义: 输入中 z-input 给原始字符串(不钳制),change 时 z-change 给钳制后数字。
import { COPY, BaseElement, html, property, escapeAttr, controlHeight, type ControlSize } from "../../core/index.js";
import numberInputCSS from "./number-input.css?raw";

export class ZNumberInput extends BaseElement {
  // 控件高度档位（xs 24 / sm 28 / md 32 / lg 36，随密度缩放）。默认 sm = 既有高度。
  @property({ type: String }) size: ControlSize = "sm";

  protected willUpdate(): void {
    // 见 core/controlSize.ts 的边界说明：size 只改高度，密度改的是令牌本身，局部永远赢。
    this.style.setProperty("--_h", controlHeight(this.size));
  }
  static styles = numberInputCSS;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min: number | undefined;
  @property({ type: Number }) max: number | undefined;
  @property({ type: Number }) step = 1;
  @property({ type: Number }) precision: number | undefined;
  @property({ type: String }) placeholder = "";
  @property({ type: Boolean }) disabled = false;
  // [WHY] 合法/非法是语义，由 z-form-item 写入；控件负责落到内部 input 上。
  @property({ type: Boolean }) invalid = false;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) incrementLabel = COPY.increment;
  @property({ type: String }) decrementLabel = COPY.decrement;

  private _focused = false;

  render(): string {
    const { value, placeholder, disabled } = this;
    const stateClass = [
      this._focused ? "z-number-input--focused" : "",
      disabled ? "z-number-input--disabled" : "",
    ].filter(Boolean).join(" ");

    return html`
      <div class="z-number-input ${stateClass}" part="root">
        <input
          class="z-number-input__field"
          part="field"
          type="text"
          inputmode="decimal"
          value="${escapeAttr(this._format(value))}"
          ${placeholder ? `placeholder="${escapeAttr(placeholder)}"` : ""}
          ${disabled ? "disabled" : ""}
          ${disabled ? "" : "aria-valuenow=\"" + value + "\""}
          ${this.invalid ? 'aria-invalid="true"' : ""}
        />
        <span class="z-number-input__controls" part="controls">
          <button type="button" class="z-number-input__step z-number-input__step--up" part="step-up" tabindex="-1" aria-label="${escapeAttr(this.incrementLabel)}" ${disabled ? "disabled" : ""}>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l5-5 5 5"/></svg>
          </button>
          <button type="button" class="z-number-input__step z-number-input__step--down" part="step-down" tabindex="-1" aria-label="${escapeAttr(this.decrementLabel)}" ${disabled ? "disabled" : ""}>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6l5 5 5-5"/></svg>
          </button>
        </span>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("focusin", this._onFocusIn);
    this.addEventListener("focusout", this._onFocusOut);
    // [WHY] TS 的 ShadowRootEventMap 只声明 slotchange: 传具体事件名会命中错误重载;
    // 运行时 shadow root 就是 EventTarget, 按 HTMLElementEventMap 注册
    const root = this.shadowRoot as unknown as HTMLElement;
    root.addEventListener("input", this._onInput);
    root.addEventListener("change", this._onChange);
    root.addEventListener("click", this._onClick);
    root.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener("focusin", this._onFocusIn);
    this.removeEventListener("focusout", this._onFocusOut);
    const root = this.shadowRoot as unknown as HTMLElement;
    root.removeEventListener("input", this._onInput);
    root.removeEventListener("change", this._onChange);
    root.removeEventListener("click", this._onClick);
    root.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  focus(): void {
    this._getField()?.focus();
  }

  blur(): void {
    this._getField()?.blur();
  }

  stepUp(): void {
    this._commit(this.value + this.step);
  }

  stepDown(): void {
    this._commit(this.value - this.step);
  }

  private _getField(): HTMLInputElement | null {
    return this.shadowRoot!.querySelector(".z-number-input__field");
  }

  private _format(n: number): string {
    const p = this._decimals();
    return p > 0 ? n.toFixed(p) : String(n);
  }

  private _decimals(): number {
    if (this.precision != null) return this.precision;
    const s = String(this.step);
    const dot = s.indexOf(".");
    return dot >= 0 ? s.length - dot - 1 : 0;
  }

  // [WHY] 统一钳制+精度: min/max 钳制, precision 四舍五入, 避免 0.1+0.2 类浮点尾差
  private _clamp(n: number): number {
    if (this.min != null && n < this.min) n = this.min;
    if (this.max != null && n > this.max) n = this.max;
    const p = this._decimals();
    if (p > 0) {
      const factor = 10 ** p;
      n = Math.round(n * factor) / factor;
    }
    return n;
  }

  /** 解析字符串 → 钳制数字 → 写属性并 emit。非法输入回退 value。 */
  private _commit(raw: string | number): void {
    let n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isNaN(n)) {
      this._syncFieldValue();
      return;
    }
    n = this._clamp(n);
    this.value = n;
    this._syncFieldValue();
    this.emit("z-change", { value: n });
  }

  private _syncFieldValue(): void {
    const field = this._getField();
    if (field) field.value = this._format(this.value);
  }

  private _onInput = (): void => {
    const field = this._getField();
    if (field) this.emit("z-input", { value: field.value });
  };

  private _onChange = (): void => {
    const field = this._getField();
    if (field) this._commit(field.value);
  };

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // [WHY] closest 而非 classList: 按钮内含 svg, 真实浏览器点击 target 是 path
    // (happy-dom 派发到按钮本身, 单测漏网, 浏览器冒烟发现)
    const target = (e.target as HTMLElement).closest(".z-number-input__step");
    if (!target) return;
    if (target.classList.contains("z-number-input__step--up")) {
      this.stepUp();
      this.emit("z-input", { value: this._format(this.value) });
    } else if (target.classList.contains("z-number-input__step--down")) {
      this.stepDown();
      this.emit("z-input", { value: this._format(this.value) });
    }
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.stepUp();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      this.stepDown();
    }
  };

  private _onFocusIn = (): void => {
    this._focused = true;
    this.shadowRoot!.querySelector(".z-number-input")?.classList.add("z-number-input--focused");
    this.emit("z-focus");
  };

  private _onFocusOut = (): void => {
    this._focused = false;
    this.shadowRoot!.querySelector(".z-number-input")?.classList.remove("z-number-input--focused");
    this.emit("z-blur");
  };

}

customElements.define("z-number-input", ZNumberInput);
