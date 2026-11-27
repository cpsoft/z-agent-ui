import { estimateTextWidth } from "../layout/layout.js";
import type { GeometryModel } from "../types.js";

export interface ExtraLabels {
  value: string;
  share: string;
  flow: string;
  sourceShare: string;
  max: string;
  median: string;
  min: string;
}

export interface ExtraContext {
  locale: string;
  sliceColors?: string[];
  gaugeMin?: number;
  gaugeMax?: number;
  labels?: boolean;
  clampMin?: number;
  clampMax?: number;
}

export function emptyModel(noData = true): GeometryModel {
  return { marks: [], gridLines: [], axes: [], legend: [], tooltipTargets: [], noData };
}

export function colorOf(ctx: ExtraContext, i: number, fallback: string): string {
  const pal = ctx.sliceColors;
  if (!pal || pal.length === 0) return fallback;
  return pal[i % pal.length];
}

export function arcPath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const x0 = cx + r * Math.cos(a0);
  const y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1);
  const y1 = cy + r * Math.sin(a1);
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
}

export function readableOn(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return "#0f172a";
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.55 ? "#0f172a" : "#ffffff";
}

export function fitLabel(text: string, maxWidth: number, fontSize: number): string {
  if (!text || maxWidth <= 0) return "";
  if (estimateTextWidth(text, fontSize) <= maxWidth) return text;
  let out = "";
  for (const ch of text) {
    if (estimateTextWidth(`${out}${ch}…`, fontSize) > maxWidth) break;
    out += ch;
  }
  return out ? `${out}…` : "";
}
