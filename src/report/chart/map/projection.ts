import type { MapRegion } from "../types.js";

export type ProjectionMode = "auto" | "equirectangular" | "mercator" | "none";

export function detectProjection(coords: number[][]): "geographic" | "projected" {
  for (const [x, y] of coords) {
    if (x < -360 || x > 360 || y < -90 || y > 90) return "projected";
  }
  return "geographic";
}

export function projectPoint(
  lon: number,
  lat: number,
  mode: "equirectangular" | "mercator",
): [number, number] {
  if (mode === "mercator") {
    const clamped = Math.max(-85, Math.min(85, lat));
    const rad = (clamped * Math.PI) / 180;
    return [lon, -Math.log(Math.tan(Math.PI / 4 + rad / 2))];
  }
  return [lon, -lat];
}

export function ringProjected(
  ring: number[][],
  mode: "equirectangular" | "mercator",
): number[][] {
  return ring.map(([x, y]) => projectPoint(x, y, mode));
}

export interface FitTransform {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
}

// bbox over all rings of all regions, then uniform scale + center translate
export function fitToFrame(
  regions: MapRegion[],
  plot: { x: number; y: number; width: number; height: number },
  pad = 0.05,
): FitTransform {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const region of regions) {
    for (const ring of region.rings) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!Number.isFinite(minX)) return { sx: 1, sy: 1, ox: plot.x, oy: plot.y };
  const bw = maxX - minX || 1;
  const bh = maxY - minY || 1;
  const scale = Math.min(plot.width / bw, plot.height / bh) * (1 - pad);
  const ox = plot.x + (plot.width - bw * scale) / 2 - minX * scale;
  const oy = plot.y + (plot.height - bh * scale) / 2 - minY * scale;
  return { sx: scale, sy: scale, ox, oy };
}

export function applyTransform(ring: number[][], t: FitTransform): number[][] {
  return ring.map(([x, y]) => [t.ox + x * t.sx, t.oy + y * t.sy]);
}
