import { escapeAttr } from "../../../core/index.js";
import type { AxisModel, GeometryModel, Mark, ResolvedTheme } from "../types.js";
import type { ComputedFrame } from "../layout/layout.js";


function num(v: number | undefined): string {
  return v === undefined ? "0" : String(Math.round(v * 100) / 100);
}

function axisSvg(axis: AxisModel, frame: ComputedFrame, theme: ResolvedTheme): string {
  const { plot } = frame;
  const fontSize = parseFloat(theme.labelFontSize) || 12;
  let out = "";
  for (const t of axis.ticks) {
    const isX = axis.position === "bottom" || axis.position === "top";
    const anchor = isX ? "middle" : axis.position === "left" ? "end" : "start";
    const tx = isX ? t.x : axis.position === "left" ? t.x - 6 : t.x + 6;
    const ty = isX ? t.y + 16 : t.y + 4;
    out += `<text x="${num(tx)}" y="${num(ty)}" text-anchor="${anchor}" font-size="${fontSize}" fill="${axis.color}">${escapeAttr(t.label)}</text>`;
  }
  if (axis.title) {
    if (axis.position === "bottom" || axis.position === "top") {
      out += `<text x="${num(plot.x + plot.width / 2)}" y="${num(plot.y + plot.height + fontSize * 2.6)}" text-anchor="middle" font-size="${fontSize}" fill="${axis.color}">${escapeAttr(axis.title)}</text>`;
    } else if (axis.position === "left") {
      out += `<text transform="rotate(-90 ${num(12)} ${num(plot.y + plot.height / 2)})" x="12" y="${num(plot.y + plot.height / 2)}" text-anchor="middle" font-size="${fontSize}" fill="${axis.color}">${escapeAttr(axis.title)}</text>`;
    } else {
      out += `<text transform="rotate(90 ${num(frame.width - 12)} ${num(plot.y + plot.height / 2)})" x="${num(frame.width - 12)}" y="${num(plot.y + plot.height / 2)}" text-anchor="middle" font-size="${fontSize}" fill="${axis.color}">${escapeAttr(axis.title)}</text>`;
    }
  }
  return out;
}

function markSvg(m: Mark): string {
  switch (m.kind) {
    case "rect":
      return `<rect x="${num(m.x)}" y="${num(m.y)}" width="${num(m.width)}" height="${num(m.height)}" fill="${m.color}" stroke="none"/>`;
    case "circle":
      return `<circle cx="${num(m.cx)}" cy="${num(m.cy)}" r="${num(m.r)}" fill="${m.color}" stroke="none"/>`;
    case "text":
      return `<text x="${num(m.cx)}" y="${num(m.cy)}" text-anchor="${m.textAnchor ?? "middle"}" font-size="${num(m.fontSize)}" font-weight="${num(m.fontWeight)}" fill="${m.color}">${escapeAttr(m.label ?? "")}</text>`;
    case "path": {
      const stroke = m.strokeWidth !== undefined ? ` stroke="${m.color}" stroke-width="${m.strokeWidth}"` : "";
      const dash = m.dash ? ` stroke-dasharray="6 4"` : "";
      if (m.fillOpacity !== undefined) {
        return `<path d="${m.d}" fill="${m.color}" fill-opacity="${m.fillOpacity}"${stroke}${dash}/>`;
      }
      return `<path d="${m.d}" fill="none"${stroke}${dash}/>`;
    }
  }
}

export function renderSvg(model: GeometryModel, frame: ComputedFrame, theme: ResolvedTheme): string {
  const out: string[] = [];
  for (const g of model.gridLines) {
    out.push(`<line x1="${num(g.x1)}" y1="${num(g.y1)}" x2="${num(g.x2)}" y2="${num(g.y2)}" stroke="${g.color}" stroke-width="1"/>`);
  }
  for (const axis of model.axes) {
    out.push(axisSvg(axis, frame, theme));
  }
  for (const m of model.marks) {
    if (m.visible) out.push(markSvg(m));
  }
  return out.join("");
}

// 双引擎统一的悬停命中层：透明 ghost 形状携带 data-m 索引
//
// [WHY pad 逐点取而不是全局常量] 见 TooltipTarget.pad 的注释：密集柱图里
// 固定 4px 外扩会让相邻命中区互相覆盖十几倍，指针落在哪儿都只命中最后几根。
// 几何层知道槽距，所以由它算；这里只负责「不超过自己那一格」。
export function buildOverlaySvg(model: GeometryModel): string {
  const DEFAULT_PAD = 4;
  return model.tooltipTargets
    .map((t, i) => {
      const pad = t.pad ?? DEFAULT_PAD;
      return `<rect x="${num(t.x - pad)}" y="${num(t.y - pad)}" width="${num(t.w + pad * 2)}" height="${num(t.h + pad * 2)}" data-m="${i}" fill="transparent" stroke="none"/>`;
    })
    .join("");
}
