// <m-stepper> 步进器：加减数量、不弹数字键盘；到边界置灰，小数步长不出浮点噪声。
// [WHY] 步进器：移动端改数量、改份数都用它。与 z-number-input 的差别是**不弹键盘** ——
// 手机上点开数字键盘会把下半屏盖住，而这类字段的取值区间通常只有几个值。
//
// 三条必须做对的事：
//   ① 到边界要把按钮置灰（不然用户会一直点，以为没生效）；
//   ② 步长是小数时不能出现 0.30000000000000004（浮点噪声在数量字段上是资损口径）；
//   ③ 值改变要上报，但不自己写 `value` 属性的外部副本 —— 受控组件由宿主回写。
import { BaseElement, html, property } from "../../core/index.js";
import mStepperCSS from "./m-stepper.css?raw";

export class MStepper extends BaseElement {
  static styles = mStepperCSS;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min: number | undefined = 0;
  @property({ type: Number }) max: number | undefined;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean }) disabled = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  /** 步长的小数位数：用来把浮点结果收回去（step=0.1 时 0.1+0.2 会是 0.30000000000000004）。 */
  private get _precision(): number {
    const s = String(this.step);
    const dot = s.indexOf(".");
    return dot < 0 ? 0 : s.length - dot - 1;
  }

  private _clamp(v: number): number {
    const min = this.min ?? Number.NEGATIVE_INFINITY;
    const max = this.max ?? Number.POSITIVE_INFINITY;
    const rounded = Number(v.toFixed(this._precision));
    return Math.min(max, Math.max(min, rounded));
  }

  private _atMin(): boolean {
    return this.min !== undefined && this.value <= this.min;
  }

  private _atMax(): boolean {
    return this.max !== undefined && this.value >= this.max;
  }

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    const btn = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (!btn) return;
    const prev = this.value;
    const next = this._clamp(btn.dataset.act === "plus" ? prev + this.step : prev - this.step);
    // [WHY 值没变也要 return] 到边界后继续点会发一串「值没变」的 change，
    // 宿主要是拿它去写库就是一批空写。
    if (next === prev) return;
    this.value = next;
    this.emit("z-change", { value: next, prev });
  };

  render(): string {
    const minusDisabled = this.disabled || this._atMin();
    const plusDisabled = this.disabled || this._atMax();
    return html`
      <div class="m-stepper${this.disabled ? " m-stepper--disabled" : ""}" part="root">
        <button
          class="m-stepper__btn"
          part="minus"
          type="button"
          data-act="minus"
          aria-label="减少"
          ${minusDisabled ? "disabled" : ""}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <span class="m-stepper__value" part="value" role="status" aria-live="polite">${String(this.value)}</span>
        <button
          class="m-stepper__btn"
          part="plus"
          type="button"
          data-act="plus"
          aria-label="增加"
          ${plusDisabled ? "disabled" : ""}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M7 3V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `;
  }
}

customElements.define("m-stepper", MStepper);
