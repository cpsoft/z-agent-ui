import type {
  AxisModel,
  GeometryModel,
  Mark,
  ResolvedTheme,
  SeriesModel,
  TooltipTarget,
} from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";
import { estimateTextWidth } from "../layout/layout.js";
import { makeFormatter } from "../format/format.js";
import {
  colorOf,
  emptyModel,
  fitLabel,
  type ExtraContext,
  type ExtraLabels,
} from "./extra-shared.js";

interface TreeCell {
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
}

function splitTreemap(
  items: Array<{ index: number; value: number }>,
  rect: { x: number; y: number; w: number; h: number },
  out: TreeCell[],
): void {
  if (items.length === 0) return;
  if (items.length === 1) {
    out.push({ ...rect, index: items[0].index });
    return;
  }
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let acc = 0;
  let k = 0;
  for (; k < items.length - 1; k++) {
    if (acc + items[k].value >= total / 2) break;
    acc += items[k].value;
  }
  const cut = Math.min(Math.max(k + 1, 1), items.length - 1);
  const a = items.slice(0, cut);
  const b = items.slice(cut);
  const aSum = a.reduce((s, i) => s + i.value, 0) || 1;
  const frac = Math.max(Math.min(aSum / total, 0.95), 0.05);
  if (rect.w >= rect.h) {
    splitTreemap(a, { ...rect, w: rect.w * frac }, out);
    splitTreemap(b, { x: rect.x + rect.w * frac, y: rect.y, w: rect.w * (1 - frac), h: rect.h }, out);
  } else {
    splitTreemap(a, { ...rect, h: rect.h * frac }, out);
    splitTreemap(b, { x: rect.x, y: rect.y + rect.h * frac, w: rect.w, h: rect.h * (1 - frac) }, out);
  }
}

export function buildTreemapGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const points = (s?.data ?? [])
    .map((p, index) => ({ index, value: p.value, label: p.label }))
    .filter((p) => Number.isFinite(p.value) && p.value > 0);
  if (points.length === 0) return emptyModel();

  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;
  const cells: TreeCell[] = [];
  splitTreemap(
    [...points].sort((a, b) => b.value - a.value),
    { x: frame.plot.x, y: frame.plot.y, w: frame.plot.width, h: frame.plot.height },
    cells,
  );

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];
  const total = points.reduce((acc, p) => acc + p.value, 0) || 1;

  for (const cell of cells) {
    const p = points.find((x) => x.index === cell.index)!;
    const x = cell.x + 1.5;
    const y = cell.y + 1.5;
    const w = Math.max(cell.w - 3, 0);
    const h = Math.max(cell.h - 3, 0);
    if (w < 2 || h < 2) continue;
    const color = colorOf(ctx, p.index, s.color);
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: p.index,
      x, y, width: w, height: h, color, visible: true,
    });
    if (w >= 34 && h >= 20) {
      const nameSize = Math.min(fontSize, 12);
      const nameLabel = fitLabel(String(p.label ?? ""), w - 10, nameSize);
      if (nameLabel) {
        marks.push({
          kind: "text", seriesIndex: s.index, dataIndex: p.index,
          cx: x + 5, cy: y + fontSize + 3,
          color: "#ffffff", label: nameLabel,
          textAnchor: "start", fontSize: nameSize,
          opacity: progress, visible: true,
        });
      }
      if (h >= 34) {
        const pct = `${fmt(p.value)} (${((p.value / total) * 100).toFixed(0)}%)`;
        const valueLabel =
          estimateTextWidth(pct, 10) <= w - 10
            ? pct
            : estimateTextWidth(fmt(p.value), 10) <= w - 10
              ? fmt(p.value)
              : "";
        if (valueLabel) {
          marks.push({
            kind: "text", seriesIndex: s.index, dataIndex: p.index,
            cx: x + 5, cy: y + fontSize * 2 + 5,
            color: "#ffffff", label: valueLabel,
            textAnchor: "start", fontSize: 10, opacity: progress, visible: true,
          });
        }
      }
    }
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: p.index,
      label: String(p.label ?? p.index + 1),
      values: [
        { name: s.name || labels.value, value: p.value, formatted: fmt(p.value), color },
        { name: labels.share, value: (p.value / total) * 100, formatted: `${((p.value / total) * 100).toFixed(1)}%`, color },
      ],
      x, y, w, h,
    });
  }

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

const SANKEY_SEPS = ["→", "->", ">", "|"];

export function buildSankeyGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const s = series.find((x) => x.visible) ?? series[0];
  const links: Array<{ from: string; to: string; value: number; index: number }> = [];
  (s?.data ?? []).forEach((p, i) => {
    if (!Number.isFinite(p.value) || p.value <= 0) return;
    const raw = String(p.label ?? "");
    const sep = SANKEY_SEPS.find((x) => raw.includes(x));
    if (!sep) return;
    const parts = raw.split(sep);
    const from = (parts[0] ?? "").trim();
    const to = (parts[1] ?? "").trim();
    if (!from || !to) return;
    links.push({ from, to, value: p.value, index: i });
  });
  if (links.length === 0) return emptyModel();

  const fmt = makeFormatter(s?.format ?? "auto", ctx.locale);
  const fontSize = parseFloat(theme.labelFontSize) || 12;

  const leftNames: string[] = [];
  const rightNames: string[] = [];
  for (const l of links) {
    if (!leftNames.includes(l.from)) leftNames.push(l.from);
    if (!rightNames.includes(l.to)) rightNames.push(l.to);
  }
  const leftSum = links.reduce((acc, l) => acc + l.value, 0) || 1;
  const rightSum = leftSum;

  const labelW = Math.min(78, frame.plot.width * 0.22);
  const px = frame.plot.x + labelW;
  const pw = Math.max(frame.plot.width - labelW * 2, 20);
  const nodeW = 10;
  const gap = 4;
  const leftTotalH = frame.plot.height - gap * Math.max(leftNames.length - 1, 0);
  const rightTotalH = frame.plot.height - gap * Math.max(rightNames.length - 1, 0);

  const sumOf = (name: string, side: "from" | "to") =>
    links.filter((l) => (side === "from" ? l.from : l.to) === name).reduce((acc, l) => acc + l.value, 0);

  const leftH = new Map<string, number>();
  const rightH = new Map<string, number>();
  for (const n of leftNames) leftH.set(n, Math.max((sumOf(n, "from") / leftSum) * leftTotalH, 1));
  for (const n of rightNames) rightH.set(n, Math.max((sumOf(n, "to") / rightSum) * rightTotalH, 1));

  const leftY = new Map<string, number>();
  let cursor = frame.plot.y;
  for (const n of leftNames) {
    leftY.set(n, cursor);
    cursor += leftH.get(n)! + gap;
  }
  const rightY = new Map<string, number>();
  cursor = frame.plot.y;
  for (const n of rightNames) {
    rightY.set(n, cursor);
    cursor += rightH.get(n)! + gap;
  }

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  for (const n of leftNames) {
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: -1,
      x: px, y: leftY.get(n)!, width: nodeW, height: leftH.get(n)!,
      color: colorOf(ctx, leftNames.indexOf(n), s.color), visible: true,
    });
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: -1,
      cx: px - 6, cy: leftY.get(n)! + leftH.get(n)! / 2 + fontSize * 0.36,
      color: theme.text, label: n, textAnchor: "end", fontSize,
      opacity: progress, visible: true,
    });
  }
  for (const n of rightNames) {
    marks.push({
      kind: "rect", seriesIndex: s.index, dataIndex: -1,
      x: px + pw - nodeW, y: rightY.get(n)!, width: nodeW, height: rightH.get(n)!,
      color: colorOf(ctx, rightNames.indexOf(n), s.color), visible: true,
    });
    marks.push({
      kind: "text", seriesIndex: s.index, dataIndex: -1,
      cx: px + pw + 6, cy: rightY.get(n)! + rightH.get(n)! / 2 + fontSize * 0.36,
      color: theme.text, label: n, textAnchor: "start", fontSize,
      opacity: progress, visible: true,
    });
  }

  const leftCur = new Map<string, number>();
  const rightCur = new Map<string, number>();
  for (const n of leftNames) leftCur.set(n, leftY.get(n)!);
  for (const n of rightNames) rightCur.set(n, rightY.get(n)!);

  for (const l of links) {
    const lh = (l.value / leftSum) * leftTotalH;
    const rh = (l.value / rightSum) * rightTotalH;
    const y0 = leftCur.get(l.from)!;
    const y1 = rightCur.get(l.to)!;
    leftCur.set(l.from, y0 + lh);
    rightCur.set(l.to, y1 + rh);

    const x0 = px + nodeW;
    const x1 = px + pw - nodeW;
    const xm = (x0 + x1) / 2;
    const d =
      `M ${x0} ${y0} C ${xm} ${y0}, ${xm} ${y1}, ${x1} ${y1}` +
      ` L ${x1} ${y1 + rh} C ${xm} ${y1 + rh}, ${xm} ${y0 + lh}, ${x0} ${y0 + lh} Z`;
    const color = colorOf(ctx, links.indexOf(l), s.color);
    marks.push({
      kind: "path", seriesIndex: s.index, dataIndex: l.index, d,
      color, fillOpacity: 0.32 * Math.max(progress, 0.001), visible: true,
    });
    tooltipTargets.push({
      seriesIndex: s.index, dataIndex: l.index,
      label: `${l.from} → ${l.to}`,
      values: [
        { name: labels.flow, value: l.value, formatted: fmt(l.value), color },
        { name: labels.sourceShare, value: l.value, formatted: `${((l.value / (sumOf(l.from, "from") || 1)) * 100).toFixed(1)}%`, color },
      ],
      x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.max(Math.abs(y1 - y0) + lh, 1),
    });
  }

  return { marks, gridLines: [], axes: [], legend: [], tooltipTargets, noData: false };
}

export function buildBoxplotGeometry(
  series: SeriesModel[],
  frame: ComputedFrame,
  domains: Domains | null,
  theme: ResolvedTheme,
  progress: number,
  ctx: ExtraContext,
  labels: ExtraLabels,
): GeometryModel {
  const visible = series.filter((x) => x.visible);
  if (!domains || visible.length < 5) return emptyModel();

  const [minS, q1S, medS, q3S, maxS] = visible.slice(0, 5);
  const n = minS.data.length;
  if (n === 0) return emptyModel();

  const { plot } = frame;
  const slot = (plot.width / Math.max(n, 1)) * 0.5;
  const fmt = makeFormatter(medS.format ?? "auto", ctx.locale);

  const yFor = (v: number) => {
    const span = domains.leftDomain[1] - domains.leftDomain[0] || 1;
    return plot.y + plot.height - ((v - domains.leftDomain[0]) / span) * plot.height;
  };

  const marks: Mark[] = [];
  const tooltipTargets: TooltipTarget[] = [];

  for (let i = 0; i < n; i++) {
    const vMin = minS.data[i]?.value;
    const vQ1 = q1S.data[i]?.value;
    const vMed = medS.data[i]?.value;
    const vQ3 = q3S.data[i]?.value;
    const vMax = maxS.data[i]?.value;
    if (![vMin, vQ1, vMed, vQ3, vMax].every((v) => Number.isFinite(v))) continue;

    const step = plot.width / Math.max(n, 1);
    const cx = plot.x + step * i + step / 2;
    const x0 = cx - slot / 2;
    const yMin = yFor(vMin);
    const yQ1 = yFor(vQ1);
    const yMed = yFor(vMed);
    const yQ3 = yFor(vQ3);
    const yMax = yFor(vMax);
    const grow = (y: number) => yMed + (y - yMed) * Math.max(progress, 0.001);

    const boxTop = Math.min(grow(yQ1), grow(yQ3));
    const boxH = Math.abs(grow(yQ3) - grow(yQ1));
    const color = colorOf(ctx, 0, medS.color);

    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d: `M ${x0} ${boxTop} L ${x0 + slot} ${boxTop} L ${x0 + slot} ${boxTop + boxH} L ${x0} ${boxTop + boxH} Z`,
      color, fillOpacity: 0.22, strokeWidth: 1.5, visible: true,
    });
    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d: `M ${x0} ${grow(yMed)} L ${x0 + slot} ${grow(yMed)}`,
      color, strokeWidth: 2, visible: true,
    });
    marks.push({
      kind: "path", seriesIndex: medS.index, dataIndex: i,
      d:
        `M ${cx} ${grow(yMax)} L ${cx} ${grow(yQ3)}` +
        ` M ${cx} ${grow(yQ1)} L ${cx} ${grow(yMin)}` +
        ` M ${cx - slot / 4} ${grow(yMax)} L ${cx + slot / 4} ${grow(yMax)}` +
        ` M ${cx - slot / 4} ${grow(yMin)} L ${cx + slot / 4} ${grow(yMin)}`,
      color, strokeWidth: 1.2, visible: true,
    });

    tooltipTargets.push({
      seriesIndex: medS.index, dataIndex: i,
      label: minS.data[i]?.label ?? String(i + 1),
      values: [
        { name: labels.max, value: vMax, formatted: fmt(vMax), color },
        { name: "Q3", value: vQ3, formatted: fmt(vQ3), color },
        { name: labels.median, value: vMed, formatted: fmt(vMed), color },
        { name: "Q1", value: vQ1, formatted: fmt(vQ1), color },
        { name: labels.min, value: vMin, formatted: fmt(vMin), color },
      ],
      x: x0, y: Math.min(grow(yMax), grow(yMin)), w: slot,
      h: Math.max(Math.abs(grow(yMin) - grow(yMax)), 1),
    });
  }

  if (marks.length === 0) return emptyModel();

  const axes: AxisModel[] = [
    {
      position: "bottom", kind: "category", title: "",
      ticks: frame.xTicks, color: theme.textSecondary,
      fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
    {
      position: "left", kind: "value", title: "",
      ticks: frame.yTicks.left, color: theme.textSecondary,
      fontFamily: theme.fontFamily, fontSize: theme.labelFontSize,
    },
  ];

  return {
    marks,
    gridLines: frame.yTicks.left
      .filter((t) => t.y > plot.y + 0.5 && t.y < plot.y + plot.height - 0.5)
      .map((t) => ({ x1: plot.x, y1: t.y, x2: plot.x + plot.width, y2: t.y, color: theme.grid })),
    axes,
    legend: [],
    tooltipTargets,
    noData: false,
  };
}
