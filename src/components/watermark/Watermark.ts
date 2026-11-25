// <z-watermark> 水印：content / color / fontSize / rotate 定内容与样式，gap 定间距，铺满父容器。
// [WHY] 水印 [[2026-08-11-W18-enterprise]] [2026-08-11] night-hawk:
// canvas 生成 dataURL 平铺 host 背景（pointer-events:none）+ MutationObserver
// 防篡改重涂。happy-dom 无 canvas 2D → 守卫跳过（测试 mock getContext）。
// 注意：v1 为视觉水印，无防截图/防打印手段（浏览器不可靠）。
import { BaseElement, html, property } from "../../core/index.js";
import watermarkCSS from "./watermark.css?raw";

export class ZWatermark extends BaseElement {
  static styles = watermarkCSS;

  @property({ type: String }) content = "";
  @property({ type: String }) color = "rgba(0, 0, 0, 0.08)";
  @property({ type: Number }) fontSize = 16;
  @property({ type: Number }) rotate = -22;
  @property({ type: Number }) gap = 100;
  @property({ type: Number }) zIndex = 0;

  private _dataUrl = "";
  private _tileW = 0;
  private _tileH = 0;
  private _lastKey = "";
  private _mo: MutationObserver | null = null;

  private _keyOf(): string {
    return `${this.content}|${this.color}|${this.fontSize}|${this.rotate}|${this.gap}`;
  }

  render(): string {
    const bg = this._dataUrl
      ? `background-image:url('${this._dataUrl}');background-size:${this._tileW}px ${this._tileH}px;`
      : "";
    return html`<div class="z-watermark" part="root" style="${bg}z-index:${this.zIndex}"></div>`;
  }

  updated(): void {
    // [WHY] 参数变更才重绘: _lastKey 记录已绘制参数,避免每次渲染都重画
    const key = this._keyOf();
    if (this._dataUrl && key === this._lastKey) return;
    this._lastKey = key;
    if (this._draw()) this.requestUpdate();
    // [WHY] 防篡改: 水印节点被外部删除（devtools/脚本）→ 下次渲染自动补回。
    // 观察 shadowRoot 自身 childList（re-render 会触发,但节点存在即 no-op）
    if (!this._mo && typeof MutationObserver !== "undefined") {
      this._mo = new MutationObserver(() => {
        if (this.shadowRoot && !this.shadowRoot.querySelector(".z-watermark")) {
          this.requestUpdate();
        }
      });
      this._mo.observe(this.shadowRoot!, { childList: true });
    }
  }

  /** @returns 是否成功生成 dataURL（无 canvas 环境返回 false） */
  private _draw(): boolean {
    if (typeof document === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return false; // happy-dom 无 canvas → 保持空白
      ctx.font = `${this.fontSize}px sans-serif`;
      const textWidth = ctx.measureText(this.content || " ").width;
      this._tileW = Math.ceil(textWidth + this.gap);
      this._tileH = Math.ceil(this.fontSize + this.gap);
      canvas.width = this._tileW;
      canvas.height = this._tileH;
      ctx.translate(this._tileW / 2, this._tileH / 2);
      ctx.rotate((this.rotate * Math.PI) / 180);
      ctx.fillStyle = this.color;
      ctx.font = `${this.fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.content, 0, 0);
      this._dataUrl = canvas.toDataURL();
      return true;
    } catch {
      // [WHY] 无 canvas 2D 实现的环境（happy-dom 未实现,可能抛 Not implemented）
      return false;
    }
  }

  disconnectedCallback(): void {
    this._mo?.disconnect();
    this._mo = null;
    super.disconnectedCallback();
  }
}

customElements.define("z-watermark", ZWatermark);
