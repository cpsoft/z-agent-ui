// <z-chart> 图表：type 定图形、values 给数据，tooltip / legend / markline 按需开关，交互各发事件。
// [组合架构] 布局/主题/值域管道在 chart-layout-pipeline.ts、缩放条与切片在 chart-zoom.ts、
// 框选与缩放手势托管给 ChartBrushController、几何构建走 geometry/registry.ts 插件注册表。
import { BaseElement, COPY, property, html, escapeAttr, defineElement } from "../../core/index.js";
import chartCSS from "./chart.css?raw";
import { resolveRenderer } from "./renderer/renderer.js";
import { buildGeometry, type BuildContext } from "./geometry/build.js";
import { normalizeSeries } from "./data/normalize.js";
import { resolveSeriesColors } from "./palette.js";
import { prefersReducedMotion, Animator } from "./animator/animator.js";
import { TooltipManager } from "./interaction/tooltip.js";
import { nextTargetIndex, type NavDir } from "./interaction/hit.js";
import { ZChartSeries } from "./ChartSeries.js";
import { ZChartAxis } from "./ChartAxis.js";
import {
  buildAxisSlots,
  computeChartFrameAndDomains,
  normalizeMapValues,
  paintChartSurfaces,
  parseHeatmapClamp,
  renderChartTooltipHtml,
  resolveChartTheme,
} from "./chart-layout-pipeline.js";
import {
  MIN_ZOOM_CATEGORIES,
  ZOOM_HEIGHT,
  applyCategoryZoom,
  parseZoomAttr,
  renderZoomBar,
  stepZoomRange,
} from "./chart-zoom.js";
import { ChartBrushController } from "./chart-brush-controller.js";
import type {
  ChartType,
  GeometryModel,
  MapValue,
  RendererName,
  ResolvedTheme,
  StackMode,
  TooltipTarget,
} from "./types.js";

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 320;
const SPARKLINE_HEIGHT = 48;
let CHART_SEQ = 0;

function findInEventPath(e: Event, selector: string): Element | null {
  for (const p of e.composedPath()) {
    if (p instanceof Element && p.matches(selector)) return p;
  }
  return null;
}

export class ZChart extends BaseElement {
  static styles = chartCSS;

  @property({ type: String }) type: ChartType | string = "bar";
  @property({ type: String }) direction = "vertical";
  @property({ type: String, attribute: "heatmap-clamp" }) heatmapClamp = "";
  @property({ type: Boolean }) zoomable = false;
  @property({ type: String }) zoom = "";
  @property({ type: Boolean }) brushable = false;
  @property({ type: String }) stack: StackMode | string = "none";
  @property({ type: String }) renderer = "svg";
  @property({ type: String }) width = "auto";
  @property({ type: String }) height = "auto";
  @property({ type: String }) title!: string;
  @property({ type: Boolean }) legend = true;
  @property({ type: Boolean }) tooltip = true;
  @property({ type: Boolean }) animation = true;
  @property({ type: Boolean, attribute: "show-grid" }) showGrid = true;
  @property({ type: String }) locale = "en-US";
  @property({ type: String }) projection: "auto" | "equirectangular" | "mercator" | "none" = "auto";
  @property({ type: String, attribute: "map-id-key" }) mapIdKey = "id";
  @property({ type: String, attribute: "map-name-key" }) mapNameKey = "name";
  @property({ type: String }) markline = "";
  @property({ type: String, attribute: "markline-label" }) marklineLabel = "";
  @property({ type: String }) markpoint = "";
  @property({ type: Boolean }) markgap = false;
  @property({ type: Boolean }) labels = false;
  @property({ type: Array, attribute: false }) colors: string[] | null = null;
  @property({ type: Object, attribute: false }) geojson: unknown = null;
  @property({ type: Array, attribute: false }) values: MapValue[] | Record<string, number> | null = null;

  private _engine: RendererName = "svg";
  private _engineKey = "";
  private _model: GeometryModel | null = null;
  private _theme: ResolvedTheme = {
    text: "#0f172a", textSecondary: "#64748b", grid: "#e2e8f0", bg: "#ffffff",
    dark: false, fontFamily: "sans-serif", labelFontSize: "12px", titleFontSize: "16px",
  };
  private _lastKey = "";
  private _lastSizeKey = "";
  private _chromeH = -1;
  private _chromeKey = "";
  private _readyEmitted = false;
  private _suppressAnim = false;
  private _animator = new Animator();
  private _tooltip: TooltipManager | null = null;
  private _activeTarget = -1;
  private _uid = `z-chart-${++CHART_SEQ}`;
  private _columns = 1;
  private _zoom: [number, number] | null = null;
  private _zoomOffset = 0;
  private _zoomFocus: string | null = null;
  private _ro: ResizeObserver | null = null;
  private _mo: MutationObserver | null = null;
  private _brushCtrl: ChartBrushController;

  constructor() {
    super();
    const self = this;
    this._brushCtrl = this.addController(
      new ChartBrushController({
        get shadowRoot() {
          return self.shadowRoot;
        },
        get brushable() {
          return self.brushable;
        },
        getTargets: () => self._model?.tooltipTargets ?? [],
        getColumns: () => self._columns,
        getActiveTarget: () => self._activeTarget,
        getZoomOffset: () => self._zoomOffset,
        getZoomNorm: () => self.zoomNorm(),
        setZoom: (next) => {
          self._zoom = next;
          self._suppressAnim = true;
          self.requestUpdate();
        },
        moveTarget: (idx) => self.moveTarget(idx),
        hideTooltip: () => self.hideTooltip(),
        emitBrush: (detail) => {
          self.emit("z-brush", detail);
        },
      }),
    );
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("tabindex", "0");
    this.listen(this, "pointermove", this.onPointerMove as EventListener);
    this.listen(this, "pointerdown", this.onPointerDown as EventListener);
    this.listen(this, "pointerup", this._brushCtrl.onPointerUp);
    this.listen(this, "pointercancel", this._brushCtrl.onPointerUp);
    this.listen(this, "pointerleave", this.onPointerLeave);
    this.listen(this, "click", this.onClick as EventListener);
    this.listen(this, "keydown", this.onKeyDown as EventListener);
    this.listen(this, "z-series-change", this.onSeriesChange);
    this._mo = new MutationObserver(() => this.requestUpdate());
    this._mo.observe(this, { childList: true });
    if (typeof ResizeObserver !== "undefined") {
      this._ro = new ResizeObserver(() => {
        this._suppressAnim = true;
        this.requestUpdate();
      });
      this._ro.observe(this);
    }
  }

  disconnectedCallback(): void {
    this._mo?.disconnect();
    this._ro?.disconnect();
    this._animator.cancel();
    this._tooltip?.destroy();
    this._tooltip = null;
    super.disconnectedCallback();
  }

  willUpdate(): void {
    this._engine = this.resolveEngine();
    const chromeKey = `${this.legend ? 1 : 0}|${this.title ? 1 : 0}`;
    if (chromeKey !== this._chromeKey) {
      this._chromeKey = chromeKey;
      this._chromeH = -1;
    }
  }

  render(): string | null {
    const aria = this.title || `${this.type} chart`;
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", aria);
    const legend = this.legend ? `<div class="z-chart__legend" part="legend"></div>` : "";
    return html`
      ${this.title ? `<div class="z-chart__title" part="title">${escapeAttr(this.title)}</div>` : ""}
      ${legend}
      <div class="z-chart__plot" part="plot" role="img" aria-label="${escapeAttr(aria)}"
           aria-describedby="${this._uid}-hint">
        ${this._engine === "svg"
          ? `<svg class="z-chart__svg" aria-hidden="true"></svg>`
          : `<canvas class="z-chart__canvas" aria-hidden="true"></canvas>`}
        <svg class="z-chart__overlay" aria-hidden="true"></svg>
        <div class="z-chart__brush" part="brush" hidden></div>
        <div class="z-chart__focus-ring" hidden></div>
      </div>
      ${this.zoomVisible() ? `<div class="z-chart__zoom" part="zoom"></div>` : ""}
      <span class="z-chart__sr-only" id="${this._uid}-hint">${escapeAttr(COPY.chartKeyboardHint)}</span>
      <span class="z-chart__sr-only" role="status" id="${this._uid}-live"></span>
    `;
  }

  updated(): void {
    const size = this.resolveSize();
    const sizeKey = `${size.w}x${size.h}`;
    if (sizeKey !== this._lastSizeKey) {
      if (this._lastSizeKey !== "") this.emit("z-resize", { width: size.w, height: size.h });
      this._lastSizeKey = sizeKey;
    }
    const key = this.drawKey(size);
    if (key !== this._lastKey) {
      this._lastKey = key;
      if (!this._suppressAnim && this.animation && !prefersReducedMotion()) {
        this._animator.play(400, (tVal) => this.draw(tVal, size));
        return;
      }
    }
    this._suppressAnim = false;
    this._animator.cancel();
    this.draw(1, size);
  }

  private stackMode(): StackMode {
    const s = this.stack;
    return s === "stacked" || s === "percent" ? s : "none";
  }

  private zoomNorm(): [number, number] | null {
    return this._zoom ?? parseZoomAttr(this.zoom);
  }

  private zoomVisible(): boolean {
    if (!this.zoomable) return false;
    const first = this.seriesConfigs()[0];
    const n = Array.isArray(first?.data) ? first.data.length : 0;
    return n >= MIN_ZOOM_CATEGORIES;
  }

  private resolveEngine(): RendererName {
    const key = `${this.type}|${this.renderer}`;
    if (key !== this._engineKey) {
      this._engineKey = key;
      this._engine = resolveRenderer(this.type as ChartType, this.renderer as RendererName);
    }
    return this._engine;
  }

  private resolveSize(): { w: number; h: number } {
    const w = this.width !== "auto" ? parseFloat(this.width) || 0 : this.clientWidth || 0;
    const hRaw = this.height !== "auto" ? parseFloat(this.height) || 0 : this.clientHeight || 0;
    const chrome = this._chromeH >= 0 ? this._chromeH : this.chromeHeight();
    const zoomH = this.zoomVisible() ? ZOOM_HEIGHT : 0;
    const h = Math.max(0, hRaw - chrome - zoomH);
    const defH = this.type === "sparkline" ? SPARKLINE_HEIGHT : DEFAULT_HEIGHT;
    return { w: w > 0 ? w : DEFAULT_WIDTH, h: h > 0 ? h : defH };
  }

  private chromeHeight(): number {
    const plot = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__plot");
    if (!plot) return 0;
    return Math.max(0, Math.round(plot.getBoundingClientRect().top - this.getBoundingClientRect().top));
  }

  private marklineValue(): number | undefined {
    if (!this.markline && this.markline !== "0") return undefined;
    const n = Number(this.markline);
    return Number.isFinite(n) ? n : undefined;
  }

  private drawKey(size: { w: number; h: number }): string {
    const series = this.seriesConfigs();
    return JSON.stringify({
      type: this.type,
      stack: this.stack,
      direction: this.direction,
      heatmapClamp: this.heatmapClamp,
      zoom: this._zoom ? this._zoom.join(",") : this.zoom,
      zoomable: this.zoomable,
      engine: this._engine,
      w: size.w,
      h: size.h,
      colors: this.colors,
      showGrid: this.showGrid,
      locale: this.locale,
      projection: this.projection,
      mapIdKey: this.mapIdKey,
      mapNameKey: this.mapNameKey,
      geojson: this.geojson,
      values: this.values,
      markline: this.marklineValue(),
      marklineLabel: this.marklineLabel,
      markpoint: this.markpoint,
      markgap: this.markgap,
      labels: this.labels,
      series: series.map((s) => ({
        name: s.name, type: s.type, color: s.color, yAxis: s.yAxis, format: s.format, data: s.data,
      })),
      axes: this.axisConfigs(),
    });
  }

  private seriesConfigs(): ZChartSeries[] {
    return Array.from(this.querySelectorAll("z-chart-series"));
  }

  private axisConfigs(): ZChartAxis[] {
    return Array.from(this.querySelectorAll("z-chart-axis"));
  }

  private draw(progress: number, size: { w: number; h: number }): void {
    this._theme = resolveChartTheme();
    const chartType = this.type as ChartType;
    const seriesEls = this.seriesConfigs();
    const sliceColored =
      chartType === "pie" ||
      chartType === "donut" ||
      chartType === "funnel" ||
      chartType === "treemap" ||
      chartType === "sankey";
    const colorCount = sliceColored
      ? Math.max(1, ...seriesEls.map((el) => (Array.isArray(el.data) ? el.data.length : 0)))
      : seriesEls.length;
    const palette = resolveSeriesColors(colorCount, this.colors);
    const markline = this.marklineValue();
    const allSeries = normalizeSeries(
      seriesEls.map((el, i) => ({
        name: el.name,
        type: el.type,
        data: el.data,
        color: el.color || palette[i % palette.length],
        yAxis: el.yAxis as "left" | "right",
        format: el.format,
        visible: el.visible,
        index: i,
        ...(el.sizeTitle ? { sizeTitle: el.sizeTitle } : {}),
      })),
      chartType,
      { markgap: this.markgap },
    );

    const axisSlots = buildAxisSlots(this.axisConfigs());
    const zoomed = applyCategoryZoom(allSeries, axisSlots, this.zoomNorm());
    this._zoomOffset = zoomed.offset;
    const seriesModels = zoomed.series;
    const fontSize = parseFloat(this._theme.labelFontSize) || 12;

    const ctx: BuildContext = {
      showGrid: this.showGrid,
      stack: this.stackMode(),
      markline,
      marklineLabel: this.marklineLabel || undefined,
      markpoint: this.markpoint || undefined,
      markgap: this.markgap,
      labels: this.labels,
      sliceColors: palette,
      regions: [],
      values: normalizeMapValues(this.values),
      mapIdKey: this.mapIdKey,
      mapNameKey: this.mapNameKey,
      projection: this.projection,
      locale: this.locale,
      gaugeMin: axisSlots.left?.min,
      gaugeMax: axisSlots.left?.max,
      ...parseHeatmapClamp(this.heatmapClamp),
    };

    const { frame, domains } = computeChartFrameAndDomains({
      type: chartType,
      seriesModels,
      axisSlots,
      size,
      locale: this.locale,
      fontSize,
      stack: this.stackMode(),
      horizontal: this.direction === "horizontal" && chartType === "bar",
      labels: this.labels,
      markline,
      geojson: this.geojson,
      mapIdKey: this.mapIdKey,
      mapNameKey: this.mapNameKey,
      zoomNorm: this.zoomNorm(),
      ctx,
    });

    this._model = buildGeometry(chartType, seriesModels, frame, domains, this._theme, progress, ctx);
    this._columns = Math.max(1, new Set(this._model.tooltipTargets.map((item) => item.dataIndex)).size);

    const shadow = this.shadowRoot!;
    paintChartSurfaces(shadow, this._model, frame, this._theme, size);

    const zoomHost = shadow.querySelector<HTMLElement>(".z-chart__zoom");
    if (zoomHost) {
      const first = seriesEls[0];
      const data: unknown[] = Array.isArray(first?.data) ? first.data : [];
      renderZoomBar(zoomHost, data, this.zoomNorm() ?? [0, 1], size.w, this._zoomFocus);
      this._zoomFocus = null;
    }

    const chrome = this.chromeHeight();
    if (chrome !== this._chromeH) {
      this._chromeH = chrome;
      this.requestUpdate();
    }
    if (!this._readyEmitted) {
      this._readyEmitted = true;
      this.emit("z-ready", { type: this.type, width: size.w, height: size.h });
    }
  }

  private onSeriesChange = (): void => {
    this.requestUpdate();
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (this._brushCtrl.isDragging) return;
    const ghost = findInEventPath(e, "[data-m]");
    if (!ghost) {
      this.hideTooltip();
      return;
    }
    this.showTarget(Number(ghost.getAttribute("data-m")), ghost);
  };

  private onPointerDown = (e: PointerEvent): void => {
    const handle = findInEventPath(e, "[data-handle]");
    if (handle) {
      this._brushCtrl.startZoomDrag(e, handle.getAttribute("data-handle") ?? "window");
      return;
    }
    this._brushCtrl.startBrush(e);
  };

  private onPointerLeave = (): void => {
    this.hideTooltip();
  };

  private onClick = (e: MouseEvent): void => {
    const ghost = findInEventPath(e, "[data-m]");
    if (ghost) {
      const target = this._model?.tooltipTargets[Number(ghost.getAttribute("data-m"))];
      if (target) {
        const v = target.values[0];
        this.emit("z-marker-click", {
          seriesIndex: target.seriesIndex,
          dataIndex: target.dataIndex + this._zoomOffset,
          value: v?.value,
          formatted: v?.formatted,
        });
      }
      return;
    }
    const legendBtn = findInEventPath(e, "[data-legend-index]");
    if (legendBtn) {
      const index = Number(legendBtn.getAttribute("data-legend-index"));
      const series = this.seriesConfigs()[index];
      if (!series) return;
      series.visible = !series.visible;
      this.emit("z-series-toggle", {
        index,
        name: series.name,
        visible: series.visible,
        hidden: this.seriesConfigs().map((s, i) => ({ s, i })).filter(({ s }) => !s.visible).map(({ i }) => i),
      });
    }
  };

  private zoomKey(e: KeyboardEvent): boolean {
    const handle = findInEventPath(e, "[data-handle]")?.getAttribute("data-handle") ?? "";
    const dir = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
    if (!dir) return false;
    const step = (e.shiftKey ? 0.1 : 0.01) * dir;
    e.preventDefault();
    this._zoom = stepZoomRange(handle, this.zoomNorm() ?? [0, 1], step);
    this._suppressAnim = true;
    this._zoomFocus = handle || "window";
    this.requestUpdate();
    return true;
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (findInEventPath(e, "[data-handle]") && this.zoomKey(e)) return;
    if (e.key === "Escape") {
      this.hideTooltip();
      this._brushCtrl.cancelKbdSel();
      return;
    }
    if (e.key === "Enter" && this._brushCtrl.hasKbdSel) {
      e.preventDefault();
      this._brushCtrl.commitKbdSel();
      return;
    }
    if (e.shiftKey && this.brushable && this._brushCtrl.kbdBrushKey(e)) return;
    const total = this._model?.tooltipTargets.length ?? 0;
    if (e.key === "Home" || e.key === "End") {
      if (total <= 0) return;
      e.preventDefault();
      this.moveTarget(e.key === "Home" ? 0 : total - 1);
      return;
    }
    const dirs: Partial<Record<string, NavDir>> = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "up",
      ArrowDown: "down",
    };
    const dir = dirs[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = nextTargetIndex(this._activeTarget, dir, total, this._columns);
    if (next >= 0) this.moveTarget(next);
  };

  private moveTarget(idx: number): void {
    const total = this._model?.tooltipTargets.length ?? 0;
    if (idx < 0 || idx >= total) return;
    this._activeTarget = idx;
    const anchor = this.shadowRoot?.querySelector(`[data-m="${idx}"]`);
    this.showTarget(idx, anchor ?? this);
  }

  private showTarget(idx: number, anchor: Element): void {
    const target = this._model?.tooltipTargets[idx];
    if (!target) return;
    this._activeTarget = idx;
    if (this.tooltip) {
      if (!this._tooltip) this._tooltip = new TooltipManager();
      this._tooltip.show(anchor, renderChartTooltipHtml(target));
    }
    this.setFocusRing(target);
    this.announce(target);
    this.emit("z-tooltip-change", {
      visible: true,
      seriesIndex: target.seriesIndex,
      dataIndex: target.dataIndex + this._zoomOffset,
      label: target.label,
      values: target.values,
    });
  }

  private announce(target: TooltipTarget): void {
    const live = this.shadowRoot?.querySelector<HTMLElement>(`#${this._uid}-live`);
    if (!live) return;
    const vals = target.values.map((v) => `${v.name} ${v.formatted}`).join("，");
    live.textContent = vals ? `${target.label}：${vals}` : target.label;
  }

  private hideTooltip(): void {
    this._activeTarget = -1;
    this._tooltip?.hide();
    const ring = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__focus-ring");
    if (ring) ring.hidden = true;
    const live = this.shadowRoot?.querySelector<HTMLElement>(`#${this._uid}-live`);
    if (live) live.textContent = "";
    this.emit("z-tooltip-change", { visible: false });
  }

  private setFocusRing(target: TooltipTarget): void {
    const ring = this.shadowRoot?.querySelector<HTMLElement>(".z-chart__focus-ring");
    if (!ring) return;
    ring.hidden = false;
    ring.style.left = `${target.x}px`;
    ring.style.top = `${target.y}px`;
    ring.style.width = `${target.w}px`;
    ring.style.height = `${target.h}px`;
  }
}

defineElement("z-chart", ZChart);
