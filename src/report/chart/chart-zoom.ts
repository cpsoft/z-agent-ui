import { COPY, escapeAttr } from "../../core/index.js";
import { detectXKind } from "./data/normalize.js";
import type { AxisSlots } from "./layout/layout.js";
import type { SeriesModel } from "./types.js";

export const ZOOM_HEIGHT = 40;
export const MIN_ZOOM_CATEGORIES = 6;
export const MIN_ZOOM_SPAN = 0.02;

export function parseZoomAttr(raw: string): [number, number] | null {
  const s = (raw ?? "").trim();
  if (!s) return null;
  const parts = s.split(",").map((x) => Number(x.trim()));
  if (parts.length !== 2 || !parts.every((n) => Number.isFinite(n))) return null;
  const a = Math.min(Math.max(parts[0], 0), 1);
  const b = Math.min(Math.max(parts[1], 0), 1);
  return b > a ? [a, b] : null;
}

export function applyCategoryZoom(
  series: SeriesModel[],
  axisSlots: AxisSlots,
  zn: [number, number] | null,
): { series: SeriesModel[]; offset: number } {
  if (!zn) return { series, offset: 0 };
  const kind = detectXKind(
    series.map((s) => s.data),
    axisSlots.x?.type ?? "auto",
  );
  if (kind !== "category") return { series, offset: 0 };
  const n = Math.max(...series.map((s) => s.data.length), 1);
  const lo = Math.min(Math.max(Math.floor(zn[0] * n), 0), n - 1);
  const hi = Math.min(n - 1, Math.max(lo + 1, Math.ceil(zn[1] * n) - 1));
  return {
    series: series.map((s) => ({ ...s, data: s.data.slice(lo, hi + 1) })),
    offset: lo,
  };
}

export function renderZoomBar(
  host: HTMLElement,
  data: unknown[],
  zn: [number, number],
  fallbackWidth: number,
  focusHandle: string | null,
): void {
  const n = data.length;
  const W = Math.max(Math.round(host.clientWidth || fallbackWidth), 40);
  const H = 22;
  const left = Math.round(zn[0] * W);
  const right = Math.round(zn[1] * W);

  const vals = data.map((p) => Number((p as { value?: unknown })?.value));
  const finite = vals.filter((v) => Number.isFinite(v));
  const vMin = finite.length ? Math.min(...finite) : 0;
  const vMax = finite.length ? Math.max(...finite) : 1;
  const span = vMax - vMin || 1;
  let d = "";
  vals.forEach((v, i) => {
    const x = n === 1 ? W / 2 : (i / (n - 1)) * W;
    const y = H - 3 - (((Number.isFinite(v) ? v : vMin) - vMin) / span) * (H - 6);
    d += `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });

  const pct = (v: number) => Math.round(v * 100);
  host.innerHTML = `
    <svg class="z-chart__zoom-svg" width="${W}" height="${H}" aria-hidden="true">
      <path d="${d}" fill="none" stroke-width="1.5" class="z-chart__zoom-track"/>
      <rect class="z-chart__zoom-mask" x="0" y="0" width="${left}" height="${H}"/>
      <rect class="z-chart__zoom-mask" x="${right}" y="0" width="${Math.max(W - right, 0)}" height="${H}"/>
    </svg>
    <div class="z-chart__zoom-window" data-handle="window" role="slider" tabindex="0"
         aria-label="${escapeAttr(COPY.chartZoomWindow)}"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[0])}"
         style="left:${left}px;width:${Math.max(right - left, 8)}px"></div>
    <div class="z-chart__zoom-handle" data-handle="start" role="slider" tabindex="0"
         aria-label="${escapeAttr(COPY.chartZoomStart)}"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[0])}"
         style="left:${left - 4}px"></div>
    <div class="z-chart__zoom-handle" data-handle="end" role="slider" tabindex="0"
         aria-label="${escapeAttr(COPY.chartZoomEnd)}"
         aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(zn[1])}"
         style="left:${right - 4}px"></div>
  `;

  if (focusHandle) {
    host.querySelector<HTMLElement>(`[data-handle="${focusHandle}"]`)?.focus();
  }
}

export function stepZoomRange(
  handle: string,
  start: [number, number],
  delta: number,
): [number, number] {
  const [s0, e0] = start;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  let s = s0;
  let en = e0;
  if (handle === "start") {
    s = clamp(s0 + delta, 0, e0 - MIN_ZOOM_SPAN);
  } else if (handle === "end") {
    en = clamp(e0 + delta, s0 + MIN_ZOOM_SPAN, 1);
  } else {
    const span = e0 - s0;
    s = clamp(s0 + delta, 0, 1 - span);
    en = s + span;
  }
  return [s, en];
}
