// <z-slider> 滑块：value 双向，min / max / step 定范围，vertical 竖排，拖动发 z-input、松开发 z-change。
// [WHY] z-slider [[2026-08-11-W13-form-basics]]:
// 单 thumb; 拖拽中直写 __zui_prop_value + 局部样式, 绝不 requestUpdate
// (整体重渲染会重建 thumb 丢 pointer capture, 见 [[lesson-web-components-render-pitfalls]] §2)。
// 键盘变更走属性 setter(requestUpdate 后 updated() 按引用恢复焦点)。
import { BaseElement, html, property, escapeHtml, defineElement } from "../../core/index.js";
import { PointerDragSession } from "../../primitives/index.js";
import sliderCSS from "./slider.css?raw";

export interface ZSliderMark {
  value: number;
  label?: string;
}

export class ZSlider extends BaseElement {
  static styles = sliderCSS;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 100;
  @property({ type: Number }) step = 1;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) vertical = false;
  @property({ type: Boolean, attribute: "show-tooltip" }) showTooltip = false;
  // [WHY] marks 是对象属性, attribute: false 走 JSON 解析 [[W1-REACTIVE]]
  @property({ attribute: false }) marks: ZSliderMark[] | null = null;

  private _dragging = false;
  /** 本次按下的手势会话（起手/收尾/取消归 primitives/pointer-drag）。 */
  private _session: PointerDragSession | null = null;
  private _focused = false;
  private _thumb: HTMLElement | null = null;

  render(): string {
    const pct = this._percent(this.value);
    const stateClass = [
      this.vertical ? "z-slider--vertical" : "",
      this.disabled ? "z-slider--disabled" : "",
      this._dragging ? "z-slider--dragging" : "",
    ].filter(Boolean).join(" ");

    const marksHtml = this.marks?.length
      ? html`<div class="z-slider__marks" part="marks">
          ${this.marks.map((m) => {
            const mp = this._percent(m.value);
            const pos = this.vertical ? `bottom:${mp}%` : `left:${mp}%`;
            return html`<span class="z-slider__mark" style="${pos}" part="mark">
              <span class="z-slider__mark-tick"></span>
              ${m.label ? html`<span class="z-slider__mark-label">${escapeHtml(m.label)}</span>` : ""}
            </span>`;
          })}
        </div>`
      : "";

    return html`
      <div class="z-slider ${stateClass}" part="root">
        <div class="z-slider__track" part="track"></div>
        <div class="z-slider__fill" part="fill" style="${this.vertical ? `height:${pct}%` : `width:${pct}%`}"></div>
        <div
          class="z-slider__thumb"
          part="thumb"
          role="slider"
          tabindex="${this.disabled ? "-1" : "0"}"
          aria-valuemin="${this.min}"
          aria-valuemax="${this.max}"
          aria-valuenow="${this.value}"
          aria-orientation="${this.vertical ? "vertical" : "horizontal"}"
          style="${this.vertical ? `bottom:${pct}%` : `left:${pct}%`}"
        >
          ${this.showTooltip ? html`<span class="z-slider__tooltip" part="tooltip">${this.value}</span>` : ""}
        </div>
        ${marksHtml}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] TS 的 ShadowRootEventMap 只声明 slotchange: 传具体事件名会命中错误重载;
    // 运行时 shadow root 就是 EventTarget, 按 HTMLElementEventMap 注册
    const root = this.shadowRoot as unknown as HTMLElement;
    root.addEventListener("pointerdown", this._onPointerDown);
    root.addEventListener("keydown", this._onKeyDown);
    root.addEventListener("focusin", this._onFocusIn);
    root.addEventListener("focusout", this._onFocusOut);
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot as unknown as HTMLElement;
    root.removeEventListener("pointerdown", this._onPointerDown);
    root.removeEventListener("keydown", this._onKeyDown);
    root.removeEventListener("focusin", this._onFocusIn);
    root.removeEventListener("focusout", this._onFocusOut);
    // 卸载时只清理、不回调：此刻 shadow 已拆，再走 onCancel 去改 class 是对着空壳操作
    this._session?.dispose();
    this._session = null;
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] 键盘变更触发重渲染后 thumb 是新节点, 恢复焦点避免键盘操作中断
    const thumb = this.shadowRoot!.querySelector(".z-slider__thumb") as HTMLElement | null;
    if (this._focused && thumb && thumb !== this._thumb && !this.disabled) {
      thumb.focus();
    }
    this._thumb = thumb;
  }

  focus(): void {
    this.shadowRoot!.querySelector<HTMLElement>(".z-slider__thumb")?.focus();
  }

  private _percent(n: number): number {
    const range = this.max - this.min;
    if (range <= 0) return 0;
    return Math.min(100, Math.max(0, ((n - this.min) / range) * 100));
  }

  /** 从指针位置解出步进钳制值 */
  private _valueFromPointer(clientX: number, clientY: number): number {
    const root = this.shadowRoot!.querySelector(".z-slider") as HTMLElement;
    if (!root) return this.value;
    const rect = root.getBoundingClientRect();
    let ratio: number;
    if (this.vertical) {
      ratio = 1 - (clientY - rect.top) / rect.height;
    } else {
      ratio = (clientX - rect.left) / rect.width;
    }
    ratio = Math.min(1, Math.max(0, ratio));
    const raw = this.min + ratio * (this.max - this.min);
    // [WHY] 步进取整: (raw - min)/step 四舍五入后再乘回, 保证落点可复现
    const steps = Math.round((raw - this.min) / this.step);
    return Math.min(this.max, Math.max(this.min, this.min + steps * this.step));
  }

  /** 拖拽/键盘公共提交: 直写存储 + 局部样式, 不触发重渲染; 值未变不重复 emit */
  private _applyValue(n: number, commit: boolean): void {
    const changed = n !== this.value;
    (this as any).__zui_prop_value = n;
    const pct = this._percent(n);
    const fill = this.shadowRoot!.querySelector(".z-slider__fill") as HTMLElement | null;
    if (fill) fill.style[this.vertical ? "height" : "width"] = `${pct}%`;
    const thumb = this.shadowRoot!.querySelector(".z-slider__thumb") as HTMLElement | null;
    if (thumb) {
      thumb.style[this.vertical ? "bottom" : "left"] = `${pct}%`;
      thumb.setAttribute("aria-valuenow", String(n));
      const tooltip = thumb.querySelector(".z-slider__tooltip");
      if (tooltip) tooltip.textContent = String(n);
    }
    if (changed) this.emit("z-input", { value: n });
    if (commit) this.emit("z-change", { value: n });
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (this.disabled) return;
    const target = e.target as HTMLElement;
    if (!target.closest(".z-slider__thumb")) return;
    e.preventDefault();
    this._setDragging(true);
    // [WHY threshold: 0] 滑块是「按住就跟着走」，不存在「拖 vs 点」的判定；
    // 起手 / 收尾 / 取消仍走同一把原语，省掉自己管 document 上的两个监听与 user-select。
    this._session?.dispose();
    this._session = new PointerDragSession(
      {
        onMove: (d) => this._applyValue(this._valueFromPointer(d.x, d.y), false),
        onEnd: () => {
          this._setDragging(false);
          // [WHY] 拖拽值已在 move 中直写存储, 结束只需 emit; 属性 setter 同值会跳过不反射
          this.emit("z-change", { value: this.value });
        },
        onCancel: () => this._setDragging(false),
      },
      { threshold: 0, captureTarget: target },
    );
    this._session.begin(e);
    // 按下即生效：点轨道/手柄立刻跳到该位置，不必等下一下移动
    this._applyValue(this._valueFromPointer(e.clientX, e.clientY), false);
  };

  private _setDragging(on: boolean): void {
    this._dragging = on;
    const root = this.shadowRoot?.querySelector(".z-slider");
    if (on) root?.classList.add("z-slider--dragging");
    else root?.classList.remove("z-slider--dragging");
  }

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled) return;
    if (!(e.target as HTMLElement).classList.contains("z-slider__thumb")) return;
    const delta = this.vertical
      ? { ArrowUp: 1, ArrowDown: -1 }
      : { ArrowRight: 1, ArrowLeft: -1 };
    const dir = delta[e.key as keyof typeof delta];
    let next: number | null = null;
    if (dir) {
      next = this._clampToStep(this.value + dir * this.step);
    } else if (e.key === "Home") {
      next = this.min;
    } else if (e.key === "End") {
      next = this.max;
    } else if (e.key === "PageUp") {
      next = this._clampToStep(this.value + this.step * 10);
    } else if (e.key === "PageDown") {
      next = this._clampToStep(this.value - this.step * 10);
    }
    if (next !== null) {
      e.preventDefault();
      this.value = next;
      this.emit("z-change", { value: next });
    }
  };

  private _clampToStep(n: number): number {
    return Math.min(this.max, Math.max(this.min, n));
  }

  private _onFocusIn = (e: FocusEvent): void => {
    if ((e.target as HTMLElement).classList.contains("z-slider__thumb")) {
      this._focused = true;
    }
  };

  private _onFocusOut = (): void => {
    this._focused = false;
  };

}

defineElement("z-slider", ZSlider);
