import { t, type ReactiveController } from "../../core/index.js";
import { PointerDragSession, type PointerDragDelta } from "../../primitives/index.js";
import { nextTargetIndex, type NavDir } from "./interaction/hit.js";
import { stepZoomRange } from "./chart-zoom.js";
import type { TooltipTarget } from "./types.js";

export interface ChartBrushHost {
  readonly shadowRoot: ShadowRoot | null;
  readonly brushable: boolean;
  getTargets(): TooltipTarget[];
  getColumns(): number;
  getActiveTarget(): number;
  getZoomOffset(): number;
  getZoomNorm(): [number, number] | null;
  setZoom(next: [number, number]): void;
  moveTarget(idx: number): void;
  hideTooltip(): void;
  emitBrush(detail: {
    x: number;
    y: number;
    w: number;
    h: number;
    points: Array<{ seriesIndex: number; dataIndex: number; label: string }>;
    indexRange: [number, number] | null;
  }): void;
}

/**
 * `<z-chart>` 指针/键盘框选与缩放条拖拽控制器（ReactiveController）。
 *
 * 托管 PointerDragSession、缩放手柄拖拽、绘图区矩形框选以及 Shift+方向键键盘框选，
 * 在 `hostDisconnected()` 自动销毁手势会话。
 */
export class ChartBrushController implements ReactiveController {
  private readonly _host: ChartBrushHost;
  private _session: PointerDragSession | null = null;
  private _drag: { handle: string; startX: number; start: [number, number] } | null = null;
  private _brush: { active: boolean; x0: number; y0: number; x1: number; y1: number } | null = null;
  private _kbdSel: { anchor: number; end: number } | null = null;

  constructor(host: ChartBrushHost) {
    this._host = host;
  }

  get isDragging(): boolean {
    return this._drag !== null || this._brush !== null;
  }

  get hasKbdSel(): boolean {
    return this._kbdSel !== null;
  }

  hostDisconnected(): void {
    this._session?.dispose();
    this._session = null;
    this._drag = null;
    this._brush = null;
    this._kbdSel = null;
  }

  startZoomDrag(e: PointerEvent, handleName: string): void {
    const zn = this._host.getZoomNorm() ?? [0, 1];
    this._drag = {
      handle: handleName,
      startX: e.clientX,
      start: [zn[0], zn[1]],
    };
    this._beginSession(e, 0);
  }

  startBrush(e: PointerEvent): void {
    if (!this._host.brushable) return;
    const plot = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__plot");
    if (!plot) return;
    const r = plot.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return;
    const prev = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (prev) prev.hidden = true;
    this._brush = {
      active: false,
      x0: e.clientX - r.left,
      y0: e.clientY - r.top,
      x1: 0,
      y1: 0,
    };
    this._beginSession(e);
  }

  onPointerUp = (): void => {
    this._session = null;
    this._drag = null;
    const b = this._brush;
    this._brush = null;
    if (b?.active) {
      this._commitBrush(b);
      this._paintBrushRect(b);
    } else {
      this.clearBrush();
    }
  };

  clearBrush(): void {
    this._brush = null;
    const el = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (el) el.hidden = true;
  }

  cancelKbdSel(): void {
    if (!this._kbdSel) return;
    this._kbdSel = null;
    this.clearBrush();
  }

  kbdBrushKey(e: KeyboardEvent): boolean {
    const dirs: Partial<Record<string, NavDir>> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const dir = dirs[e.key];
    if (!dir) return false;
    const total = this._host.getTargets().length;
    if (total <= 0) return false;
    e.preventDefault();
    if (!this._kbdSel) {
      const cur = this._host.getActiveTarget();
      const a = cur >= 0 && cur < total ? cur : 0;
      this._kbdSel = { anchor: a, end: a };
    }
    this._kbdSel.end = nextTargetIndex(this._kbdSel.end, dir, total, this._host.getColumns());
    this._paintKbdSel();
    return true;
  }

  commitKbdSel(): void {
    const hits = this._kbdSelHits();
    this._kbdSel = null;
    if (!hits.length) {
      this.clearBrush();
      return;
    }
    const x = Math.min(...hits.map((item) => item.x));
    const y = Math.min(...hits.map((item) => item.y));
    const w = Math.max(...hits.map((item) => item.x + item.w)) - x;
    const h = Math.max(...hits.map((item) => item.y + item.h)) - y;
    const offset = this._host.getZoomOffset();
    this._emitBrush(
      hits.map((item) => ({
        seriesIndex: item.seriesIndex,
        dataIndex: item.dataIndex + offset,
        label: item.label,
      })),
      { x, y, w, h },
    );
  }

  private _beginSession(e: PointerEvent, threshold?: number): void {
    this._session?.dispose();
    this._session = new PointerDragSession(
      {
        onMove: (d) => this._onDragMove(d),
        onEnd: () => this.onPointerUp(),
        onCancel: () => {
          this._drag = null;
          this._brush = null;
          this.clearBrush();
        },
      },
      threshold === undefined
        ? { captureTarget: e.target as Element | null }
        : { captureTarget: e.target as Element | null, threshold },
    );
    this._session.begin(e);
    e.preventDefault();
  }

  private _onDragMove(d: PointerDragDelta): void {
    if (this._drag) {
      this._dragZoomTo(d.x);
      return;
    }
    const b = this._brush;
    if (!b) return;
    if (!b.active) {
      if (!d.moved) return;
      b.active = true;
      this._host.hideTooltip();
    }
    this._brushTo(d.x, d.y);
  }

  private _dragZoomTo(clientX: number): void {
    const d = this._drag;
    if (!d) return;
    const host = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__zoom");
    const W = host?.clientWidth ?? 0;
    if (W <= 0) return;
    const dx = (clientX - d.startX) / W;
    this._host.setZoom(stepZoomRange(d.handle, d.start, dx));
  }

  private _brushTo(clientX: number, clientY: number): void {
    const b = this._brush;
    const plot = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__plot");
    if (!b || !plot) return;
    const r = plot.getBoundingClientRect();
    b.x1 = Math.min(Math.max(clientX - r.left, 0), r.width);
    b.y1 = Math.min(Math.max(clientY - r.top, 0), r.height);
    const el = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (!el) return;
    el.hidden = false;
    el.style.left = `${Math.min(b.x0, b.x1)}px`;
    el.style.top = `${Math.min(b.y0, b.y1)}px`;
    el.style.width = `${Math.abs(b.x1 - b.x0)}px`;
    el.style.height = `${Math.abs(b.y1 - b.y0)}px`;
  }

  private _paintBrushRect(b: { x0: number; y0: number; x1: number; y1: number }): void {
    this._brush = null;
    const el = this._host.shadowRoot?.querySelector<HTMLElement>(".z-chart__brush");
    if (!el) return;
    el.hidden = false;
    el.style.left = `${Math.min(b.x0, b.x1)}px`;
    el.style.top = `${Math.min(b.y0, b.y1)}px`;
    el.style.width = `${Math.abs(b.x1 - b.x0)}px`;
    el.style.height = `${Math.abs(b.y1 - b.y0)}px`;
  }

  private _commitBrush(b: { x0: number; y0: number; x1: number; y1: number }): void {
    const x = Math.min(b.x0, b.x1);
    const y = Math.min(b.y0, b.y1);
    const w = Math.abs(b.x1 - b.x0);
    const h = Math.abs(b.y1 - b.y0);
    const offset = this._host.getZoomOffset();
    const hits = this._host.getTargets().filter((item) => {
      const cx = item.x + item.w / 2;
      const cy = item.y + item.h / 2;
      return cx >= x && cx <= x + w && cy >= y && cy <= y + h;
    });
    this._emitBrush(
      hits.map((item) => ({
        seriesIndex: item.seriesIndex,
        dataIndex: item.dataIndex + offset,
        label: item.label,
      })),
      { x, y, w, h },
    );
  }

  private _emitBrush(
    points: Array<{ seriesIndex: number; dataIndex: number; label: string }>,
    box: { x: number; y: number; w: number; h: number },
  ): void {
    const indices = points.map((p) => p.dataIndex);
    this._host.emitBrush({
      ...box,
      points,
      indexRange: indices.length ? [Math.min(...indices), Math.max(...indices)] : null,
    });
    const live = this._host.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
    if (live) {
      live.textContent = points.length
        ? t("chartPointsSelected", { count: points.length })
        : t("chartNoPointsSelected");
    }
  }

  private _kbdSelHits(): TooltipTarget[] {
    const s = this._kbdSel;
    const targets = this._host.getTargets();
    if (!s || !targets.length) return [];
    const lo = Math.max(0, Math.min(s.anchor, s.end));
    const hi = Math.min(targets.length - 1, Math.max(s.anchor, s.end));
    return targets.slice(lo, hi + 1);
  }

  private _paintKbdSel(): void {
    const hits = this._kbdSelHits();
    const s = this._kbdSel;
    if (!hits.length || !s) return;
    const x0 = Math.min(...hits.map((item) => item.x));
    const y0 = Math.min(...hits.map((item) => item.y));
    const x1 = Math.max(...hits.map((item) => item.x + item.w));
    const y1 = Math.max(...hits.map((item) => item.y + item.h));
    this._paintBrushRect({ x0, y0, x1, y1 });
    this._host.moveTarget(s.end);
    const endLabel = hits[hits.length - 1]?.label ?? "";
    const live = this._host.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
    if (live) {
      live.textContent = t("chartKeyboardBrush", { count: hits.length, label: endLabel });
    }
  }
}
