// 笛卡尔图的轴、网格线、图例装配。纯计算，不碰 DOM。
import type { AxisModel, GridLine, LegendItem, ResolvedTheme, SeriesModel } from "../types.js";
import type { ComputedFrame, Domains } from "../layout/layout.js";

export function cartesianAxes(frame: ComputedFrame, domains: Domains, theme: ResolvedTheme, xPosition: "bottom" | "top"): AxisModel[] {
  const axes: AxisModel[] = [];
  // [WHY 横向要换 ticks 的来源] 横向时 frame.xTicks 装的是**值刻度**、frame.yTicks.left 装的是
  // **分类标签**（见 layout.ts 的 computeHorizontalFrame）。照原来的「xTicks 归底轴、yTicks 归左轴」
  // 直接搬过来，分类名会被当成数值刻度画在底部，而左轴显示一串数字 —— 图还是能画出来。
  if (domains.horizontal) {
    if (frame.xTicks.length > 0) {
      axes.push({
        position: xPosition,
        kind: "value",
        title: frame.titles.x ?? "",
        ticks: frame.xTicks,
        color: theme.textSecondary,
        fontFamily: theme.fontFamily,
        fontSize: theme.labelFontSize,
      });
    }
    if (frame.yTicks.left.length > 0) {
      axes.push({
        position: "left",
        kind: "category",
        title: frame.titles.left ?? "",
        ticks: frame.yTicks.left,
        color: theme.textSecondary,
        fontFamily: theme.fontFamily,
        fontSize: theme.labelFontSize,
      });
    }
    // 横向下右轴不画（语义见 computeHorizontalFrame 的注释）
    return axes;
  }
  if (domains.xKind === "category" || frame.xTicks.length > 0) {
    axes.push({
      position: xPosition,
      kind: domains.xKind,
      title: frame.titles.x ?? "",
      ticks: frame.xTicks,
      color: theme.textSecondary,
      fontFamily: theme.fontFamily,
      fontSize: theme.labelFontSize,
    });
  }
  if (domains.hasLeft) {
    axes.push({
      position: "left",
      kind: "value",
      title: frame.titles.left ?? "",
      ticks: frame.yTicks.left,
      color: theme.textSecondary,
      fontFamily: theme.fontFamily,
      fontSize: theme.labelFontSize,
    });
  }
  if (domains.hasRight) {
    axes.push({
      position: "right",
      kind: "value",
      title: frame.titles.right ?? "",
      ticks: frame.yTicks.right,
      color: theme.textSecondary,
      fontFamily: theme.fontFamily,
      fontSize: theme.labelFontSize,
    });
  }
  return axes;
}

export function gridLines(frame: ComputedFrame, domains: Domains, theme: ResolvedTheme, showGrid: boolean, hasLeft: boolean, hasRight: boolean): GridLine[] {
  if (!showGrid) return [];
  const lines: GridLine[] = [];
  const { x: px, y: py, width: pw, height: ph } = frame.plot;
  // [WHY 横向单独一条路] 横向的网格线必须垂直于**值轴**（即竖线）。照搬竖向逻辑会拿
  // yTicks（此时是分类标签）画横线 —— 分类多时整张图被糊成横格纸，而且完全不报错。
  if (domains.horizontal) {
    for (const t of frame.xTicks) {
      if (t.x <= px + 0.5 || t.x >= px + pw - 0.5) continue;
      lines.push({ x1: t.x, y1: py, x2: t.x, y2: py + ph, color: theme.grid });
    }
    return lines;
  }
  const yTicks = hasLeft ? frame.yTicks.left : hasRight ? frame.yTicks.right : [];
  for (const t of yTicks) {
    if (t.y <= py + 0.5 || t.y >= py + ph - 0.5) continue;
    lines.push({ x1: px, y1: t.y, x2: px + pw, y2: t.y, color: theme.grid });
  }
  if (domains.xKind !== "category") {
    for (const t of frame.xTicks) {
      if (t.x <= px + 0.5 || t.x >= px + pw - 0.5) continue;
      lines.push({ x1: t.x, y1: py, x2: t.x, y2: py + ph, color: theme.grid });
    }
  }
  return lines;
}

export function seriesLegend(series: SeriesModel[]): LegendItem[] {
  return series
    .filter((s) => s.kind !== "pie")
    .map((s) => ({ index: s.index, name: s.name, color: s.color, visible: s.visible }));
}
