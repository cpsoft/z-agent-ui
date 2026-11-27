// <z-flow-minimap> 流程图小地图：data 画缩略节点、viewport 画可视框，尺寸由 width / height 定。
// [WHY] 小地图：flow 推节点 bbox + viewport（含 flow 尺寸），点击跳转
// See: wiki/requirements/REQ-013-node-flow-editor.md
import { BaseElement, html, property, escapeAttr, defineElement } from "../core/index.js";
import minimapCSS from "./minimap.css?raw";

export interface FlowMinimapNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowMinimapViewport {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;
}

const PAD = 10;

export class ZFlowMinimap extends BaseElement {
  static styles = minimapCSS;

  @property({ type: Array, attribute: false }) data: FlowMinimapNode[] = [];
  @property({ type: Object, attribute: false }) viewport: FlowMinimapViewport = {
    x: 0,
    y: 0,
    zoom: 1,
    width: 0,
    height: 0,
  };
  @property({ type: Number }) width = 180;
  @property({ type: Number }) height = 120;

  private _scale = 1;
  private _originX = 0;
  private _originY = 0;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  render(): string {
    const { data, width, height, viewport } = this;
    if (!data.length) {
      return html`<svg width="${width}" height="${height}" class="z-flow-minimap__svg"></svg>`;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of data) {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    const bw = maxX - minX;
    const bh = maxY - minY;
    const scale =
      bw > 0 && bh > 0
        ? Math.min((width - PAD * 2) / bw, (height - PAD * 2) / bh)
        : 1;
    this._scale = scale > 0 ? scale : 1;
    // [WHY] 内容在小地图里居中（2026-10-20，[[bug-20261020-canvas-text-blur]]）：
    // 原来 origin 固定取 (PAD, PAD)，而比例通常由宽度方向决定，垂直方向的剩余空间全落到下方
    // —— 同一行的节点就贴在小地图最上沿，但画布上 fitView 是把内容垂直居中的，
    // 用户看到的现象是「小地图里算子的上下位置和实际不符」。居中后两处一致。
    this._originX = PAD + ((width - PAD * 2) - bw * this._scale) / 2 - minX * this._scale;
    this._originY = PAD + ((height - PAD * 2) - bh * this._scale) / 2 - minY * this._scale;

    const rects = data
      .map(
        (n) =>
          `<rect class="z-flow-minimap__node" x="${this._originX + n.x * this._scale}" y="${this._originY + n.y * this._scale}" width="${Math.max(2, n.w * this._scale)}" height="${Math.max(2, n.h * this._scale)}" data-node-id="${escapeAttr(n.id)}"></rect>`,
      )
      .join("");

    // 视口窗口（flow 坐标系 → 小地图坐标），裁剪到小地图边界内
    const wx = this._originX + (-viewport.x / viewport.zoom) * this._scale;
    const wy = this._originY + (-viewport.y / viewport.zoom) * this._scale;
    const ww = (viewport.width / viewport.zoom) * this._scale;
    const wh = (viewport.height / viewport.zoom) * this._scale;
    const win = this._clipRect(wx, wy, ww, wh, width, height);

    return html`
      <svg width="${width}" height="${height}" class="z-flow-minimap__svg" part="root">
        <rect class="z-flow-minimap__bg" width="${width}" height="${height}" rx="4"></rect>
        ${rects}
        <rect class="z-flow-minimap__viewport" x="${win.x}" y="${win.y}" width="${win.w}" height="${win.h}"></rect>
      </svg>
    `;
  }

  private _clipRect(
    x: number,
    y: number,
    w: number,
    h: number,
    maxW: number,
    maxH: number,
  ): { x: number; y: number; w: number; h: number } {
    const cx = Math.max(0, Math.min(x, maxW));
    const cy = Math.max(0, Math.min(y, maxH));
    const cw = Math.max(0, Math.min(w, maxW - cx));
    const ch = Math.max(0, Math.min(h, maxH - cy));
    return { x: cx, y: cy, w: cw, h: ch };
  }

  private _onClick = (e: MouseEvent): void => {
    const svg = this.shadowRoot?.querySelector("svg");
    if (!svg || !this.data.length) return;
    const rect = svg.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const flowX = (localX - this._originX) / this._scale;
    const flowY = (localY - this._originY) / this._scale;
    if (flowX < 0 || flowY < 0) return;
    this.emit<{ x: number; y: number }>("z-minimap-navigate", { x: flowX, y: flowY });
  };
}

defineElement("z-flow-minimap", ZFlowMinimap);
