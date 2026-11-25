// [WHY] flow 组件族共享的纯类型与几何函数，独立于 DOM 便于单测
// See: wiki/requirements/REQ-013-node-flow-editor.md

export interface ZFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  animated?: boolean;
  /**
   * 虚线（本地扩展，2026-10-20）：表达「上游节点未配置，数据流未定型」。
   * 上游只有 animated（流动虚线动画），语义是加载中，不能复用来表达异常态。
   */
  dashed?: boolean;
}

export interface ZViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface ZPosition {
  x: number;
  y: number;
}

export interface ZRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function parsePosition(value: string): ZPosition | null {
  const parts = value.split(",");
  // [WHY] Number("") === 0，空片段会被误判为合法坐标
  if (parts.length !== 2 || parts[0] === "" || parts[1] === "") return null;
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export type ZHandlePos = "top" | "right" | "bottom" | "left";

// [WHY] 控制点必须沿把手所在边的法线外延，曲线才能在节点侧边垂直离开/进入；
// 旧实现固定水平控制点，top/bottom 把手处曲线斜切节点边（[[bug-20260811-bezier-perpendicular]]）
// See: wiki/bugs/bug-20260811-bezier-perpendicular.md
const HANDLE_NORMAL: Record<ZHandlePos, ZPosition> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function getBezierPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sourcePos: ZHandlePos = "right",
  targetPos: ZHandlePos = "left",
): string {
  const d = getBezier(sx, sy, tx, ty, sourcePos, targetPos);
  return `M ${sx} ${sy} C ${d.c1.x} ${d.c1.y}, ${d.c2.x} ${d.c2.y}, ${tx} ${ty}`;
}

export function getBezier(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  sourcePos: ZHandlePos = "right",
  targetPos: ZHandlePos = "left",
): {
  c1: ZPosition;
  c2: ZPosition;
  mid: ZPosition;
} {
  const dx = Math.max(50, Math.abs(tx - sx) * 0.5);
  const dy = Math.max(50, Math.abs(ty - sy) * 0.5);
  const sn = HANDLE_NORMAL[sourcePos];
  const tn = HANDLE_NORMAL[targetPos];
  // 源控制点沿 source 法线外延；目标控制点沿 target 法线外延（曲线从外侧垂直进入）
  const c1 = { x: sx + dx * sn.x, y: sy + dy * sn.y };
  const c2 = { x: tx + dx * tn.x, y: ty + dy * tn.y };
  // 三次贝塞尔 t=0.5 的中点：(P0 + 3P1 + 3P2 + P3) / 8
  const mid = {
    x: (sx + 3 * c1.x + 3 * c2.x + tx) / 8,
    y: (sy + 3 * c1.y + 3 * c2.y + ty) / 8,
  };
  return { c1, c2, mid };
}

export function rectsOverlap(a: ZRect, b: ZRect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function formatPosition(pos: ZPosition): string {
  return `${pos.x},${pos.y}`;
}
