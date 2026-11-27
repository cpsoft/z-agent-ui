import type {
  AxisModel,
  GeometryModel,
  Mark,
  ResolvedTheme,
  SeriesModel,
  TooltipTarget,
} from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";
import { estimateTextWidth } from "../layout/layout.js";
import { quantize, SEQUENTIAL_DARK, SEQUENTIAL_LIGHT } from "../palette.js";
import { makeFormatter } from "../format/format.js";
import {
  arcPath,
  colorOf,
  emptyModel,
  readableOn,
  type ExtraContext,
  type ExtraLabels,
} from "./extra-shared.js";

export function buildFunnelGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const data = (s?.data ?? []).filter((p) => Number.isFinite(p.value) && p.value >= 0);
  if (data.length === 0) return emptyModel();

  const { plot } = frame;
  const labelW = Math.min(plot.width * 0.28, 120);
  const bodyW = Math.max(plot.width - labelW * 2, 20);
  const left = plot.x + labelW;
  const right = left + bodyW;
  const centerX = left + bodyW / 2;

  const maxV = Math.max(...data.map((p) => p.value), 1);
  const n = data.length;
  const gap = 2;
  const layerH = Math.max((plot.height - gap * (n - 1)) / n, 1);
  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  data.forEach((p, i) => {
    const y = plot.y + (layerH + gap) * i;
    const h = layerH * Math.max(progress, 0.001);
    const wTop = (p.value / maxV) * bodyW;
    const nextV = i + 1 < n ? data[i + 1].value : p.value;
    const wBottom = (nextV / maxV) * bodyW;
    const ratio = layerH > 0 ? h / layerH : 1;
    const wBottomNow = wTop + (wBottom - wTop) * ratio;

    const d =
      `M ${centerX - wTop / 2} ${y} L ${centerX + wTop / 2} ${y}` +
      ` L ${centerX + wBottomNow / 2} ${y + h} L ${centerX - wBottomNow / 2} ${y + h} Z`;
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: i, d,
      color: colorOf(ctx, i, s.color), fillOpacity: 0.92, visible: true,
    });

    const cy = y + layerH / 2 + fontSize * 0.36;
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: i,
      cx: left - 8, cy,
      color: theme.text, label: p.label ?? String(i + 1),
      textAnchor: "end", fontSize, opacity: progress, visible: true,
    });
    const pct = maxV > 0 ? (p.value / maxV) * 100 : 0;
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: i,
      cx: right + 8, cy,
      color: theme.text, label: `${fmt(p.value)}  ${pct.toFixed(0)}%`,
      textAnchor: "start", fontSize, opacity: progress, visible: true,
    });

    const hitW = Math.max(wTop, wBottomNow);
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: i,
      label: p.label ?? String(i + 1),
      values: [
        { name: s.name || labels.value, value: p.value, formatted: fmt(p.value), color: colorOf(ctx, i, s.color) },
        { name: labels.share, value: pct, formatted: `${pct.toFixed(1)}%`, color: colorOf(ctx, i, s.color) },
      ],
      x: centerX - hitW / 2, y, w: hitW, h: Math.max(h, 1),
    });
  });

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

export function buildHeatmapGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const rows = series.filter((x) => x.visible);
  const cols: string[] = [];
  for (const s of rows) {
    for (const p of s.data) {
      const label = p.label ?? "";
      if (label && !cols.includes(label)) cols.push(label);
    }
  }
  if (rows.length === 0 || cols.length === 0) return emptyModel();

  const fontSize = parseFloat(theme.labelFontSize) || 12;
  const fmt = makeFormatter(rows[0]?.format ?? "auto", ctx.locale);
  const rowLabelW = Math.max(...rows.map((r) => estimateTextWidth(r.name, fontSize))) + 10;
  const bottomH = fontSize + 8;
  const scaleH = 8 + 4 + fontSize;
  const px = frame.plot.x + rowLabelW;
  const py = frame.plot.y;
  const pw = Math.max(frame.plot.width - rowLabelW - 4, 10);
  const ph = Math.max(frame.plot.height - bottomH - scaleH, 10);

  const nRows = rows.length;
  const nCols = cols.length;
  const cw = pw / nCols;
  const ch = ph / nRows;

  const all: number[] = [];
  for (const s of rows) for (const p of s.data) if (Number.isFinite(p.value)) all.push(p.value);
  const buckets = 7;
  const q = quantize(all, buckets, { min: ctx.clampMin, max: ctx.clampMax });
  const scale = theme.dark ? SEQUENTIAL_DARK : SEQUENTIAL_LIGHT;

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  rows.forEach((s, ri) => {
    cols.forEach((col, ci) => {
      const p = s.data.find((d) => (d.label ?? "") === col);
      if (!p || !Number.isFinite(p.value)) return;
      const idx = q.bucketIndex(p.value);
      const color = scale[Math.min(idx, scale.length - 1)];
      const x = px + cw * ci;
      const y = py + ch * ri;
      const w = Math.max(cw - 1, 1);
      const h = Math.max(ch - 1, 1);
      marks.push({
        kind: "rect", seriesIndex: s.index, dataIndex: s.data.indexOf(p),
        x, y, width: w, height: h, color, visible: true,
      });
      if (cw >= 38 && ch >= 18 && ctx.labels !== false) {
        marks.push({
          kind: "text", seriesIndex: s.index, dataIndex: s.data.indexOf(p),
          cx: x + w / 2, cy: y + h / 2 + fontSize * 0.36,
          color: readableOn(color),
          label: fmt(p.value), textAnchor: "middle", fontSize: 10,
          opacity: progress, visible: true,
        });
      }
      tooltipTargets.push({
        seriesIndex: s.index, dataIndex: s.data.indexOf(p),
        label: `${s.name} · ${col}`,
        values: [{ name: s.name || labels.value, value: p.value, formatted: fmt(p.value), color }],
        x, y, w, h,
      });
    });
  });

  const scaleY = py + ph + bottomH - 2;
  const segW = pw / buckets;
  for (let i = 0; i < buckets; i++) {
    marks.push({
      kind: "rect", seriesIndex: -1, dataIndex: -1,
      x: px + segW * i, y: scaleY,
      width: Math.max(segW - 1, 1), height: 8,
      color: scale[Math.min(i, scale.length - 1)], visible: true,
    });
  }
  const scaleLabelY = scaleY + 8 + fontSize - 1;
  marks.push({
    kind: "text", seriesIndex: -1, dataIndex: -1,
    cx: px, cy: scaleLabelY,
    color: theme.textSecondary, label: fmt(q.min),
    textAnchor: "start", fontSize: fontSize - 2, opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: -1, dataIndex: -1,
    cx: px + pw, cy: scaleLabelY,
    color: theme.textSecondary, label: fmt(q.max),
    textAnchor: "end", fontSize: fontSize - 2, opacity: progress, visible: true,
  });

  const colLabelW = Math.max(...cols.map((c) => estimateTextWidth(c, fontSize)), 1) + 8;
  const colStep = Math.max(1, Math.ceil(colLabelW / Math.max(cw, 1)));
  const colTicks = cols
    .map((c, i) => ({ value: i, label: c, x: px + cw * i + cw / 2, y: py + ph }))
    .filter((_, i) => i % colStep === 0);
  const rowLineH = fontSize + 2;
  const rowStep = Math.max(1, Math.ceil(rowLineH / Math.max(ch, 1)));
  const rowTicks = rows
    .map((r, i) => ({ value: i, label: r.name, x: px, y: py + ch * i + ch / 2 }))
    .filter((_, i) => i % rowStep === 0);

  const axes: AxisModel[] = [
    {
      position: "bottom", kind: "category", title: "",
      ticks: colTicks,
      color: theme.textSecondary, fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
    {
      position: "left", kind: "category", title: "",
      ticks: rowTicks,
      color: theme.textSecondary, fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
  ];

  return { marks, gridLines: [], axes, legend: [], tooltipTargets, noData: false };
}

export function buildGaugeGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const p = s?.data?.find((d) => Number.isFinite(d.value));
  if (!p) return emptyModel();

  const min = Number.isFinite(ctx.gaugeMin) ? ctx.gaugeMin! : 0;
  const maxIn = Number.isFinite(ctx.gaugeMax) ? ctx.gaugeMax! : undefined;
  const max = maxIn !== undefined && maxIn > min ? maxIn : Math.max(p.value * 1.25, min + 1);
  const ratio = Math.max(0, Math.min(1, (p.value - min) / (max - min || 1)));

  const { plot } = frame;
  const r = Math.max(Math.min(plot.width / 2 - 16, plot.height * 0.58), 12);
  const cx = plot.x + plot.width / 2;
  const cy = plot.y + plot.height * 0.66;
  const thickness = Math.max(r * 0.16, 6);
  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const marks: Mark[] = [];
  const A0 = Math.PI;
  const A1 = Math.PI * 2;

  marks.push({
    kind: "path", seriesIndex: s.index, dataIndex: 0,
    d: arcPath(cx, cy, r, A0, A1),
    color: theme.grid, strokeWidth: thickness, opacity: 1, visible: true,
  });
  if (ratio > 0) {
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: 0,
      d: arcPath(cx, cy, r, A0, A0 + (A1 - A0) * ratio * Math.max(progress, 0.001)),
      color: s.color, strokeWidth: thickness, opacity: 1, visible: true,
    });
  }
  const ang = A0 + (A1 - A0) * ratio;
  const tipR = r - thickness - 4;
  marks.push({
    kind: "path", seriesIndex: s.index, dataIndex: 0,
    d: `M ${cx} ${cy} L ${cx + tipR * Math.cos(ang)} ${cy + tipR * Math.sin(ang)}`,
    color: theme.text, strokeWidth: 2, opacity: progress, visible: true,
  });
  marks.push({
    kind: "circle", seriesIndex: s.index, dataIndex: 0,
    cx, cy, r: Math.max(thickness * 0.5, 3), color: theme.text, opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx, cy: cy + fontSize * 2.6,
    color: theme.text, label: fmt(p.value),
    textAnchor: "middle", fontSize: Math.max(fontSize * 1.6, 16), fontWeight: 600,
    opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx: cx - r, cy: cy + thickness * 0.5 + fontSize * 0.9,
    color: theme.textSecondary, label: fmt(min),
    textAnchor: "middle", fontSize, opacity: progress, visible: true,
  });
  marks.push({
    kind: "text", seriesIndex: s.index, dataIndex: 0,
    cx: cx + r, cy: cy + thickness * 0.5 + fontSize * 0.9,
    color: theme.textSecondary, label: fmt(max),
    textAnchor: "middle", fontSize, opacity: progress, visible: true,
  });

  return {
    marks, gridLines: [], axes: [], legend: [],
    tooltipTargets: [{
      seriesIndex: s.index, dataIndex: 0,
      label: p.label ?? s.name ?? "",
      values: [{ name: s.name || labels.value, value: p.value, formatted: fmt(p.value), color: s.color }],
      x: cx - r, y: cy - r, w: r * 2, h: r + thickness,
    }],
    noData: false,
  };
}
