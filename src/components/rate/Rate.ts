// <z-rate> 评分：value 双向，count 定星数，allowHalf 支持半星，悬停与变更各发事件。
// [WHY] z-rate [[2026-08-11-W13-form-basics]]:
// 星形评分; hover 预览(鼠标移过重渲染, 移出恢复); allowHalf 用前景裁剪宽度实现;
// 键盘 Arrow/Home/End; disabled/readonly 无交互。
import { BaseElement, html, property, escapeAttr, ariaBool, defineElement } from "../../core/index.js";
import rateCSS from "./rate.css?raw";

// 16x16 五角星 path（fill=currentColor）
const STAR_PATH = "M8 1.5l1.95 4.13 4.55.55-3.34 3.12.87 4.5L8 11.6 4 13.8l.87-4.5L1.55 6.18l4.55-.55z";

export class ZRate extends BaseElement {
  static styles = rateCSS;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) count = 5;
  @property({ type: Boolean, attribute: "allow-half" }) allowHalf = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;
  @property({ type: Boolean }) clearable = false;
  @property({ type: String }) label = "";

  private _hover = -1;

  render(): string {
    const n = Math.max(1, this.count);
    const stars = [];
    for (let i = 0; i < n; i++) {
      const active = this._hover >= 0 ? this._hover : this.value;
      // [WHY] 前景裁剪宽度统一处理全星/半星: fillPct = 0/50/100（allowHalf 时）
      const fillPct = active >= i + 1 ? 100 : active > i ? Math.round((active - i) * 100) : 0;
      stars.push(html`
        <span class="z-rate__star" part="star" role="radio" aria-checked="${ariaBool(active >= i + 1 || (active > i && active < i + 1))}" data-index="${i}">
          <span class="z-rate__star-bg">
            <svg viewBox="0 0 16 16" width="18" height="18"><path d="${STAR_PATH}" fill="currentColor"/></svg>
          </span>
          <span class="z-rate__star-fg" style="width:${fillPct}%" data-index="${i}">
            <svg viewBox="0 0 16 16" width="18" height="18"><path d="${STAR_PATH}" fill="currentColor"/></svg>
          </span>
        </span>
      `);
    }

    const rootClass = [
      this.disabled ? "z-rate--disabled" : "",
      this.readonly ? "z-rate--readonly" : "",
      this._hover >= 0 ? "z-rate--hovering" : "",
    ].filter(Boolean).join(" ");

    return html`
      <div class="z-rate ${rootClass}" part="root"
        role="slider" tabindex="${this.disabled || this.readonly ? "-1" : "0"}"
        aria-label="${escapeAttr(this.label || "Rating")}"
        aria-valuemin="0" aria-valuemax="${n}"
        aria-valuenow="${this.value}" aria-valuetext="${this.value} out of ${n}">
        ${stars.join("")}
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] TS 的 ShadowRootEventMap 只声明 slotchange: 传具体事件名会命中错误重载;
    // 运行时 shadow root 就是 EventTarget, 按 HTMLElementEventMap 注册
    const root = this.shadowRoot as unknown as HTMLElement;
    root.addEventListener("mouseover", this._onMouseOver);
    root.addEventListener("mouseout", this._onMouseOut);
    root.addEventListener("click", this._onClick);
    root.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot as unknown as HTMLElement;
    root.removeEventListener("mouseover", this._onMouseOver);
    root.removeEventListener("mouseout", this._onMouseOut);
    root.removeEventListener("click", this._onClick);
    root.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  focus(): void {
    this.shadowRoot!.querySelector<HTMLElement>(".z-rate")?.focus();
  }

  private _step(): number {
    return this.allowHalf ? 0.5 : 1;
  }

  private _setHover(v: number): void {
    if (this._hover === v) return;
    this._hover = v;
    this.requestUpdate();
  }

  private _onMouseOver = (e: MouseEvent): void => {
    if (this.disabled || this.readonly) return;
    const star = (e.target as HTMLElement).closest(".z-rate__star") as HTMLElement | null;
    if (!star) return;
    const idx = Number(star.dataset.index);
    const hover = this._hoverValue(idx, e);
    this._setHover(hover);
    this.emit("z-hover", { value: hover });
  };

  private _hoverValue(idx: number, e: MouseEvent): number {
    if (!this.allowHalf) return idx + 1;
    const star = this.shadowRoot!.querySelectorAll(".z-rate__star")[idx] as HTMLElement;
    const rect = star?.getBoundingClientRect();
    if (rect && e.clientX - rect.left <= rect.width / 2) return idx + 0.5;
    return idx + 1;
  }

  private _onMouseOut = (e: MouseEvent): void => {
    // [WHY] closest 而非 classList: 移出时 target 可能是星内 svg/path 子节点
    if ((e.target as HTMLElement).closest(".z-rate__star")) {
      this._setHover(-1);
      this.emit("z-hover", { value: -1 });
    }
  };

  private _onClick = (e: MouseEvent): void => {
    if (this.disabled || this.readonly) return;
    const star = (e.target as HTMLElement).closest(".z-rate__star") as HTMLElement | null;
    if (!star) return;
    const idx = Number(star.dataset.index);
    const target = this._hoverValue(idx, e);
    // [WHY] clearable: 再点当前值清除为 0（仿原生 rate 交互）
    const next = this.clearable && target === this.value ? 0 : target;
    this.value = next;
    this.emit("z-change", { value: next });
  };

  private _onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled || this.readonly) return;
    const n = Math.max(1, this.count);
    const step = this._step();
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      next = Math.min(n, this.value + step);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      next = Math.max(0, this.value - step);
    } else if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = n;
    }
    if (next !== null) {
      e.preventDefault();
      this.value = next;
      this.emit("z-change", { value: next });
    }
  };
}

defineElement("z-rate", ZRate);
