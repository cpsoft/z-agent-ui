import { escapeAttr } from "../../core/index.js";
import {
  computeDomains,
  computeFrame,
  computeWaterfallDomains,
  estimateTextWidth,
  insetFrame,
  type AxisSlots,
  type ComputedFrame,
  type Domains,
} from "./layout/layout.js";
import { makeFormatter } from "./format/format.js";
import { buildOverlaySvg, renderSvg } from "./renderer/svg.js";
import { drawCanvas } from "./renderer/canvas.js";
import type { ZChartAxis } from "./ChartAxis.js";
import type { BuildContext } from "./geometry/build.js";
import type {
  ChartType,
  GeometryModel,
  MapRegion,
  MapValue,
  ResolvedTheme,
  SeriesModel,
  StackMode,
  TooltipTarget,
} from "./types.js";

function parseColor(color: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function parseGeoJson(geojson: unknown, idKey: string, nameKey: string): MapRegion[] {
  if (!geojson || typeof geojson !== "object") return [];
  const raw = geojson as any;
  const features: any[] = Array.isArray(raw) ? raw : Array.isArray(raw.features) ? raw.features : [];
  const regions: MapRegion[] = [];
  for (const f of features) {
    const geom = f?.geometry;
    if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) continue;
    const props = f?.properties ?? {};
    const id = String(props[idKey] ?? f?.id ?? "");
    const name = String(props[nameKey] ?? id);
    const rings: number[][][] =
      geom.type === "Polygon" ? geom.coordinates : geom.coordinates.flat();
    if (rings.length > 0) regions.push({ id, name, rings });
  }
  return regions;
}

export function resolveChartTheme(): ResolvedTheme {
  const cs = typeof getComputedStyle === "function" ? getComputedStyle(document.documentElement) : null;
  const get = (name: string, fallback: string) => cs?.getPropertyValue(name).trim() || fallback;
  const bg = get("--z-color-bg", "#ffffff");
  const rgb = parseColor(bg);
  return {
    text: get("--z-color-text", "#0f172a"),
    textSecondary: get("--z-chart-label-color", get("--z-color-text-secondary", "#64748b")),
    grid: get("--z-chart-grid-color", get("--z-color-border", "#e2e8f0")),
    bg,
    dark: rgb ? luminance(rgb) < 0.35 : false,
    fontFamily: get("--z-chart-font-family", get("--z-font-sans", "sans-serif")),
    labelFontSize: get("--z-chart-label-font-size", "12px"),
    titleFontSize: get("--z-chart-title-font-size", "16px"),
  };
}

export function buildAxisSlots(els: ZChartAxis[]): AxisSlots {
  const slots: AxisSlots = {};
  for (const el of els) {
    const position = el.position as "bottom" | "top" | "left" | "right";
    const slot: AxisSlots["left"] = {
      position,
      type: el.type as "auto" | "category" | "value" | "time",
      title: el.title,
      format: el.format,
      min: el.minValue,
      max: el.maxValue,
      tickCount: el.tickCount,
      grid: el.gridOverride,
      ...(el.scale === "log" ? { scale: "log" as const } : {}),
    };
    if ((position === "bottom" || position === "top") && !slots.x) slots.x = slot;
    else if (position === "left" && !slots.left) slots.left = slot;
    else if (position === "right" && !slots.right) slots.right = slot;
  }
  return slots;
}

export function normalizeMapValues(
  values: MapValue[] | Record<string, number> | null,
): MapValue[] | null {
  if (!values) return null;
  if (Array.isArray(values)) {
    return values.map((x) => ({ id: String((x as any).id), value: Number((x as any).value) }));
  }
  return Object.entries(values).map(([id, value]) => ({ id, value: Number(value) }));
}

export function parseHeatmapClamp(raw: string): { clampMin?: number; clampMax?: number } {
  if (!raw) return {};
  const [a, b] = raw.split(",").map((s) => Number(s.trim()));
  const out: { clampMin?: number; clampMax?: number } = {};
  if (Number.isFinite(a)) out.clampMin = a;
  if (Number.isFinite(b)) out.clampMax = b;
  if (out.clampMin !== undefined && out.clampMax !== undefined && out.clampMax <= out.clampMin) {
    return {};
  }
  return out;
}

export interface ChartFrameInput {
  type: ChartType;
  seriesModels: SeriesModel[];
  axisSlots: AxisSlots;
  size: { w: number; h: number };
  locale: string;
  fontSize: number;
  stack: StackMode;
  horizontal: boolean;
  labels: boolean;
  markline: number | undefined;
  geojson: unknown;
  mapIdKey: string;
  mapNameKey: string;
  zoomNorm: [number, number] | null;
  ctx: BuildContext;
}

export function computeChartFrameAndDomains(
  input: ChartFrameInput,
): { frame: ComputedFrame; domains: Domains | null } {
  const { type: t, seriesModels, axisSlots, size, locale, fontSize, horizontal, labels, markline, ctx } = input;
  let rightPad = 0;
  if (horizontal && labels) {
    const fmt = makeFormatter(seriesModels[0]?.format ?? "auto", locale);
    const peak = Math.max(
      0,
      ...seriesModels.flatMap((s) => s.data.map((d) => (Number.isFinite(d.value) ? d.value : 0))),
    );
    rightPad = estimateTextWidth(fmt(peak), fontSize) + 12;
  }

  if (t === "pie" || t === "donut") return { frame: insetFrame(size.w, size.h, 8), domains: null };
  if (t === "sparkline") return { frame: insetFrame(size.w, size.h, 4), domains: null };
  if (t === "radar") return { frame: insetFrame(size.w, size.h, 30), domains: null };
  if (t === "waterfall") {
    const domains = computeWaterfallDomains(seriesModels);
    return { frame: computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize), domains };
  }
  if (t === "map") {
    ctx.regions = parseGeoJson(input.geojson, input.mapIdKey, input.mapNameKey);
    return { frame: insetFrame(size.w, size.h, 8), domains: null };
  }
  if (t === "funnel" || t === "treemap" || t === "sankey" || t === "heatmap" || t === "gauge") {
    return { frame: insetFrame(size.w, size.h, t === "gauge" ? 12 : 10), domains: null };
  }

  const domains = computeDomains(seriesModels, axisSlots, input.stack, markline, {
    horizontal,
    xKind: t === "scatter" ? "value" : undefined,
  });
  if ((domains.xKind === "value" || domains.xKind === "time") && input.zoomNorm) {
    const [d0, d1] = domains.xDomain;
    const span = d1 - d0;
    if (Number.isFinite(span) && span > 0) {
      domains.xDomain = [d0 + span * input.zoomNorm[0], d0 + span * input.zoomNorm[1]];
    }
  }
  if (t === "scatter" && seriesModels.some((s) => s.data.some((p) => p.r !== undefined))) {
    const bubblePad = 22;
    const probe = computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize, {
      topPad: 0,
      rightPad,
    });
    const padY = (bubblePad / Math.max(probe.plot.height, 1)) * (domains.leftDomain[1] - domains.leftDomain[0]);
    const padX = (bubblePad / Math.max(probe.plot.width, 1)) * (domains.xDomain[1] - domains.xDomain[0]);
    domains.leftDomain = [domains.leftDomain[0] - padY, domains.leftDomain[1] + padY];
    if (domains.hasRight) {
      domains.rightDomain = [domains.rightDomain[0] - padY, domains.rightDomain[1] + padY];
    }
    domains.xDomain = [domains.xDomain[0] - padX, domains.xDomain[1] + padX];
  }
  const frame = computeFrame(size.w, size.h, domains, axisSlots, locale, fontSize, {
    topPad: horizontal && markline !== undefined ? 14 : 0,
    rightPad,
  });
  return { frame, domains };
}

export function renderChartLegendHtml(model: GeometryModel): string {
  return model.legend
    .map(
      (item) => `<button type="button" class="z-chart__legend-item${item.visible ? "" : " z-chart__legend-item--hidden"}" data-legend-index="${item.index}" part="legend-item">
        <span class="z-chart__legend-swatch" style="background:${item.color}"></span>
        <span>${escapeAttr(item.name)}</span>
      </button>`,
    )
    .join("");
}

export function renderChartTooltipHtml(target: TooltipTarget): string {
  const rows = target.values
    .map(
      (v) => `<div class="z-chart__tooltip-row">
        <span class="z-chart__tooltip-swatch" style="background:${v.color}"></span>
        <span class="z-chart__tooltip-label">${escapeAttr(v.name)}</span>
        <span class="z-chart__tooltip-value">${escapeAttr(v.formatted)}</span>
      </div>`,
    )
    .join("");
  return `<div class="z-chart__tooltip-title">${escapeAttr(target.label)}</div>${rows}`;
}

export function paintChartSurfaces(
  shadow: ShadowRoot,
  model: GeometryModel,
  frame: ComputedFrame,
  theme: ResolvedTheme,
  size: { w: number; h: number },
): void {
  const svgEl = shadow.querySelector<SVGSVGElement>(".z-chart__svg");
  if (svgEl) {
    svgEl.setAttribute("width", String(size.w));
    svgEl.setAttribute("height", String(size.h));
    svgEl.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    svgEl.innerHTML = renderSvg(model, frame, theme);
  }
  const canvasEl = shadow.querySelector<HTMLCanvasElement>(".z-chart__canvas");
  if (canvasEl) {
    const dpr = typeof devicePixelRatio === "number" ? devicePixelRatio : 1;
    canvasEl.width = size.w * dpr;
    canvasEl.height = size.h * dpr;
    canvasEl.style.width = `${size.w}px`;
    canvasEl.style.height = `${size.h}px`;
    const gctx = canvasEl.getContext("2d");
    if (gctx) {
      gctx.scale(dpr, dpr);
      drawCanvas(gctx, model, frame, theme);
    }
  }
  const overlayEl = shadow.querySelector<SVGSVGElement>(".z-chart__overlay");
  if (overlayEl) {
    overlayEl.setAttribute("width", String(size.w));
    overlayEl.setAttribute("height", String(size.h));
    overlayEl.setAttribute("viewBox", `0 0 ${size.w} ${size.h}`);
    overlayEl.innerHTML = buildOverlaySvg(model);
  }
  const legendEl = shadow.querySelector<HTMLElement>(".z-chart__legend");
  if (legendEl) legendEl.innerHTML = renderChartLegendHtml(model);
}
