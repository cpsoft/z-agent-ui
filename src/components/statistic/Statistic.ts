// [WHY] 统计数字 [[2026-08-11-W17-data]] [2026-08-11] night-hawk:
// Intl.NumberFormat 千分位/精度 + count-up rAF 缓动（从 0 到 value）。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import statisticCSS from "./statistic.css?raw";


export class ZStatistic extends BaseElement {
  static styles = statisticCSS;

  @property({ type: Number }) value = 0;
  @property({ type: Number }) precision = 0;
  @property({ type: String }) prefix = "";
  @property({ type: String }) suffix = "";
  @property({ type: Boolean }) separator = false;
  // [WHY] 多词布尔属性须显式 kebab（默认 attribute=key.toLowerCase() 无连字符,
  // count-up 属性将永不生效,冒烟 countUp=false 实锤）; 先例 slider show-tooltip / rate allow-half
  @property({ type: Boolean, attribute: "count-up" }) countUp = false;
  // [WHY] 动画时长可配; 默认 2000ms（规划值）
  @property({ type: Number }) duration = 2000;

  private _display = 0;
  private _raf = 0;
  private _lastTarget = 0;

  // [WHY] count-up 只影响展示值,不发 z-change（完成时发一次,供父组件统计曝光）
  private _format(n: number): string {
    const opts: Intl.NumberFormatOptions = {
      minimumFractionDigits: this.precision,
      maximumFractionDigits: this.precision,
    };
    if (this.separator) opts.useGrouping = true;
    else opts.useGrouping = false;
    return new Intl.NumberFormat(undefined, opts).format(n);
  }

  render(): string {
    // [WHY] count-up 关时直接展示 value（_display 保持 0）;
    // count-up 开时展示动画中的 _display（完成即等于 value）
    const num = this._format(this.countUp ? this._display : this.value);
    return html`
      <div class="z-statistic" part="root">
        ${this.prefix ? `<span class="z-statistic__prefix" part="prefix">${escapeAttr(this.prefix)}</span>` : ""}
        <span class="z-statistic__value" part="value">${num}</span>
        ${this.suffix ? `<span class="z-statistic__suffix" part="suffix">${escapeAttr(this.suffix)}</span>` : ""}
      </div>
    `;
  }

  updated(): void {
    // [WHY] 值变更重启动画: 新 value 从当前展示值缓动过去（非每次从 0）;
    // _lastTarget 记录动画目标,目标变更即重启（不依赖完成标志）
    if (!this.countUp || this.value === this._lastTarget) return;
    this._startCountUp();
  }

  private _startCountUp(): void {
    cancelAnimationFrame(this._raf);
    const from = this._display;
    const to = this.value;
    // [WHY] 先记目标再逐帧: 每帧 requestUpdate → updated() 复查 value===_lastTarget
    // 直接跳过,否则动画期间每帧重启
    this._lastTarget = to;
    const start = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / this.duration);
      this._display = from + (to - from) * easeOutCubic(t);
      this.requestUpdate();
      if (t < 1) {
        this._raf = requestAnimationFrame(step);
      } else {
        this._display = to;
        this._lastTarget = to;
        this.emit("z-change", { value: to });
        this.requestUpdate();
      }
    };
    this._raf = requestAnimationFrame(step);
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this._raf);
    super.disconnectedCallback();
  }
}

defineElement("z-statistic", ZStatistic);
