import type { AxisModel, GeometryModel, Mark, ResolvedTheme } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";

type Ctx = CanvasRenderingContext2D;

// happy-dom / 部分 webview 无 Path2D，缺失时跳过 path 绘制（不抛错）
function hasPath2D(): boolean {
  return typeof Path2D !== "undefined";
}

function fontString(theme: ResolvedTheme): string {
  return `${theme.labelFontSize} ${theme.fontFamily}`;
}

function strokePath(ctx: Ctx, d: string): void {
  if (!hasPath2D()) return;
  ctx.beginPath();
  ctx.stroke(new Path2D(d));
}

function fillPath(ctx: Ctx, d: string, color: string, opacity: number): void {
  if (!hasPath2D()) return;
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fill(new Path2D(d));
  ctx.globalAlpha = 1;
}

function axisCanvas(ctx: Ctx, axis: AxisModel, frame: ComputedFrame, theme: ResolvedTheme): void {
  const { plot } = frame;
  const fontSize = parseFloat(theme.labelFontSize) || 12;
  ctx.fillStyle = axis.color;
  ctx.font = fontString(theme);
  ctx.textBaseline = "middle";
  for (const t of axis.ticks) {
    const isX = axis.position === "bottom" || axis.position === "top";
    ctx.textAlign = isX ? "center" : axis.position === "left" ? "right" : "left";
    const tx = isX ? t.x : axis.position === "left" ? t.x - 6 : t.x + 6;
    const ty = isX ? t.y + 16 : t.y;
    ctx.fillText(t.label, tx, ty);
  }
  if (axis.title) {
    ctx.textAlign = "center";
    if (axis.position === "bottom" || axis.position === "top") {
      ctx.fillText(axis.title, plot.x + plot.width / 2, plot.y + plot.height + fontSize * 2.6);
    } else if (axis.position === "left") {
      ctx.save();
      ctx.translate(12, plot.y + plot.height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(axis.title, 0, 0);
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(frame.width - 12, plot.y + plot.height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText(axis.title, 0, 0);
      ctx.restore();
    }
  }
}

function markCanvas(ctx: Ctx, m: Mark): void {
  switch (m.kind) {
    case "rect":
      ctx.fillStyle = m.color;
      ctx.fillRect(m.x!, m.y!, m.width!, m.height!);
      break;
    case "circle":
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.arc(m.cx!, m.cy!, m.r!, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "text":
      ctx.fillStyle = m.color;
      ctx.textAlign = m.textAnchor === "start" ? "left" : m.textAnchor === "end" ? "right" : "center";
      ctx.font = `${m.fontSize ?? 12}px ${ctx.font.split(" ").slice(1).join(" ")}`;
      ctx.fillText(m.label ?? "", m.cx!, m.cy!);
      break;
    case "path":
      if (m.fillOpacity !== undefined) {
        fillPath(ctx, m.d!, m.color, m.fillOpacity);
      }
      if (m.strokeWidth !== undefined) {
        ctx.strokeStyle = m.color;
        ctx.lineWidth = m.strokeWidth;
        // markline 的虚线（[6,4] 与 svg 渲染器同参）；画完必须复位，否则后续
        // path 全变虚线 —— setLineDash 是 ctx 状态，不是本次调用局部
        ctx.setLineDash(m.dash ? [6, 4] : []);
        strokePath(ctx, m.d!);
        ctx.setLineDash([]);
      }
      break;
  }
}

export function drawCanvas(
  ctx: Ctx,
  model: GeometryModel,
  frame: ComputedFrame,
  theme: ResolvedTheme,
): void {
  ctx.fillStyle = theme.grid;
  for (const g of model.gridLines) {
    ctx.beginPath();
    ctx.moveTo(g.x1, g.y1);
    ctx.lineTo(g.x2, g.y2);
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  for (const axis of model.axes) {
    axisCanvas(ctx, axis, frame, theme);
  }
  for (const m of model.marks) {
    if (m.visible) markCanvas(ctx, m);
  }
}
