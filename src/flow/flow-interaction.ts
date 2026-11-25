// [WHY] 2026-10-25 系统审计：从 Flow.ts（947 行）按职责拆出
// 职责：平移/框选/连线手势的判定与状态推进（阈值、视口变换、命中测试、选择集合运算）；不绑 DOM 事件。
import { clamp, rectsOverlap, type ZFlowEdge, type ZRect, type ZViewport } from "./shared.js";
import { wheelZoomIntent } from "../primitives/index.js";
import { nodeFlowRect } from "./flow-geometry.js";
import { ZFlowHandle } from "./FlowHandle.js";
import { ZFlowNode } from "./FlowNode.js";
import { ZFlowMinimap } from "./FlowMinimap.js";
import { ZFlowControls } from "./FlowControls.js";

/** 一次背景拖拽的起始快照（shift = 框选模式）。 */
export interface PanState {
  startX: number;
  startY: number;
  vpX: number;
  vpY: number;
  shift: boolean;
  moved: boolean;
}

/** 事件路径：composedPath 在某些环境会抛，退化为 target。 */
export function pathOf(e: Event): EventTarget[] {
  try {
    return e.composedPath();
  } catch {
    return [e.target as EventTarget];
  }
}

export function isEditingTarget(e: Event): boolean {
  const path = pathOf(e);
  if (
    path.some(
      (el) =>
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        el instanceof HTMLSelectElement,
    )
  ) {
    return true;
  }
  const t = e.target as Element | null;
  return !!(t && t.closest && t.closest("input, textarea, select, [contenteditable='true']"));
}

/** 平移后的视口：起点快照 + 指针位移（zoom 沿用当前视口）。 */
export function panViewport(
  viewport: ZViewport,
  s: PanState,
  clientX: number,
  clientY: number,
): ZViewport {
  return {
    ...viewport,
    x: s.vpX + (clientX - s.startX),
    y: s.vpY + (clientY - s.startY),
  };
}

/** 以光标为锚点缩放：光标下的 flow 坐标在缩放前后保持不变。 */
export function zoomViewportAt(
  viewport: ZViewport,
  cursorX: number,
  cursorY: number,
  factor: number,
  minZoom: number,
  maxZoom: number,
): ZViewport {
  const zoom = clamp(viewport.zoom * factor, minZoom, maxZoom);
  return {
    x: cursorX - (cursorX - viewport.x) * (zoom / viewport.zoom),
    y: cursorY - (cursorY - viewport.y) * (zoom / viewport.zoom),
    zoom,
  };
}

/**
 * 滚轮缩放：算出新视口，不是缩放手势时返回 null。
 *
 * [WHY 返回 null 而不是原视口] null 这个返回值就是「放行」的信号 ——
 * 调用方拿到 null 必须**不阻挡**默认行为，让页面照常滚动。用「返回同一视口」
 * 表示不放行的话，调用方很快就会忘了自己要不要 preventDefault，两种语义就混了。
 *
 * 手势判定在 primitives/wheel-zoom（普通滚轮 = 滚动，Ctrl/⌘ = 缩放，
 * 触控板捏合由浏览器合成为 ctrlKey 的 wheel）；幅度用**归一后的像素值**算，
 * 因为画布是连续量 —— 与 z-gantt 的「按方向走一档」是各自量纲，不该被抹平。
 */
export function wheelZoomViewport(
  viewport: ZViewport,
  e: WheelEvent,
  rect: { left: number; top: number },
  opts: { zoomSpeed: number; minZoom: number; maxZoom: number },
): ZViewport | null {
  const intent = wheelZoomIntent(e);
  if (!intent) return null;
  const factor = Math.pow(1.1, (-intent.deltaPixels / 100) * opts.zoomSpeed);
  return zoomViewportAt(
    viewport,
    e.clientX - rect.left,
    e.clientY - rect.top,
    factor,
    opts.minZoom,
    opts.maxZoom,
  );
}

/** 框选矩形（相对画布左上角的 CSS 像素）。 */
export function boxRect(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  hostRect: { left: number; top: number },
): { left: number; top: number; width: number; height: number } {
  return {
    left: Math.min(x0, x1) - hostRect.left,
    top: Math.min(y0, y1) - hostRect.top,
    width: Math.abs(x1 - x0),
    height: Math.abs(y1 - y0),
  };
}

/** 框选矩形 → flow 坐标矩形。 */
export function boxToFlow(
  box: { left: number; top: number; width: number; height: number },
  viewport: ZViewport,
): ZRect {
  const zoom = viewport.zoom;
  return {
    x: (box.left - viewport.x) / zoom,
    y: (box.top - viewport.y) / zoom,
    w: box.width / zoom,
    h: box.height / zoom,
  };
}

/** 框选命中的节点 id（只收 selectable）。 */
export function nodesInBox(nodes: ZFlowNode[], boxFlow: ZRect): string[] {
  return nodes.filter((n) => n.selectable && rectsOverlap(boxFlow, nodeFlowRect(n))).map((n) => n.id);
}

/** fitView 的视口计算；返回 null 表示无内容/无尺寸，由调用方回落到单位视口。 */
export function fitViewport(
  rects: ZRect[],
  flowW: number,
  flowH: number,
  pad: number,
  minZoom: number,
  maxZoom: number,
): ZViewport | null {
  if (!rects.length || !flowW || !flowH) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  const bw = maxX - minX;
  const bh = maxY - minY;
  // [NOTE 2026-10-20] 自动适配必须装下全部内容（用户要求「一进来就看全图」），
  // 不再设可读缩放下限 —— 下限会把右侧节点裁到视口外。缩得太小时由用户自行
  // 收起侧栏（画布变宽）或滚轮放大。See: wiki/bugs/bug-20261020-canvas-text-blur.md
  const zoom = clamp(Math.min((flowW - pad * 2) / bw, (flowH - pad * 2) / bh), minZoom, maxZoom);
  // 装得下就居中；装不下（minZoom 下限生效，如极小窗口）就贴左上起始边，
  // 保证阅读起点（第一列节点）可见
  const contentW = bw * zoom;
  const contentH = bh * zoom;
  return {
    x: contentW + pad * 2 <= flowW ? (flowW - contentW) / 2 - minX * zoom : pad - minX * zoom,
    y: contentH + pad * 2 <= flowH ? (flowH - contentH) / 2 - minY * zoom : pad - minY * zoom,
    zoom,
  };
}

/** minimap 点击定位：把 flow 点居中到视口。 */
export function minimapViewport(
  point: { x: number; y: number },
  width: number,
  height: number,
  zoom: number,
): ZViewport {
  return { x: -point.x + width / 2, y: -point.y + height / 2, zoom };
}

/**
 * 连线落点合法性：必须是目标把手、非自身、目标节点 connectable。
 * 返回待建边的目标信息，非法返回 null。
 */
export function resolveConnectTarget(
  target: ZFlowHandle | null,
  targetNode: ZFlowNode | null,
  sourceId: string,
): { nodeId: string; handleId: string } | null {
  if (!target || !targetNode || target.type !== "target") return null;
  if (targetNode.id === sourceId || targetNode.connectable === false) return null;
  return { nodeId: targetNode.id, handleId: target.id || "" };
}

/** 同源同把手到同一目标把手的边已存在则视为重复。 */
export function hasDuplicateEdge(
  edges: ZFlowEdge[],
  pending: { source: string; sourceHandle?: string; target: string; targetHandle?: string },
): boolean {
  return edges.some(
    (ed) =>
      ed.source === pending.source &&
      (ed.sourceHandle ?? "") === (pending.sourceHandle ?? "") &&
      ed.target === pending.target &&
      (ed.targetHandle ?? "") === (pending.targetHandle ?? ""),
  );
}

/** 背景 pointerdown 的意图分类：忽略 / 选中边 / 输入框内 / 开始平移。 */
export type PointerIntent =
  | { kind: "ignored" }
  | { kind: "edge"; edgeId: string }
  | { kind: "editing" }
  | { kind: "pan" };

export function pointerIntent(e: PointerEvent): PointerIntent {
  if (e.button !== 0) return { kind: "ignored" };
  const path = pathOf(e);
  // [WHY] 节点/把手/边/自身 UI 控件（minimap/controls）自己处理自己的手势；
  // composedPath 探测而非 stopPropagation。minimap/controls 必须排除：
  // 其 pointerdown 冒泡被当背景手势 → pointerup 清空选择触发 _syncMinimap
  // 在 down/up 之间重渲染小地图，Chrome 丢弃后续 click（真实浏览器实测）
  if (
    path.some(
      (el) =>
        el instanceof ZFlowNode ||
        el instanceof ZFlowHandle ||
        el instanceof ZFlowMinimap ||
        el instanceof ZFlowControls,
    )
  ) {
    return { kind: "ignored" };
  }
  const edgePath = path.find(
    (el): el is SVGPathElement =>
      el instanceof SVGPathElement && el.classList?.contains("z-flow__edge-path"),
  ) ?? (
    // [WHY] happy-dom composedPath 不含 shadow 内部元素时，e.target 即内层元素
    (e.target as Element | null)?.classList?.contains("z-flow__edge-path") ? (e.target as SVGPathElement) : null
  );
  if (edgePath) return { kind: "edge", edgeId: edgePath.getAttribute("data-edge-id") ?? "" };
  if (isEditingTarget(e)) return { kind: "editing" };
  return { kind: "pan" };
}

// [WHY] 目标 handle 三级 fallback：真实浏览器事件 retarget 到 host，composedPath
// 含内层元素；elementFromPoint 穿透 shadow；happy-dom 无 retarget，e.target 即内层
export function findTargetHandle(e: PointerEvent): ZFlowHandle | null {
  try {
    for (const el of e.composedPath()) {
      if (el instanceof ZFlowHandle) return el;
    }
  } catch {
    // noop
  }
  if (typeof document.elementFromPoint === "function") {
    const hit = document.elementFromPoint(e.clientX, e.clientY);
    if (hit) {
      const h = (hit as Element).closest?.("z-flow-handle");
      if (h) return h as ZFlowHandle;
    }
  }
  const t = e.target as Element | null;
  if (t?.closest) {
    const h = t.closest("z-flow-handle");
    if (h) return h as ZFlowHandle;
  }
  return null;
}

/** 边选择集合的 shift 切换（非 shift 时连带清空节点选择）。 */
export function toggleEdgeSelection(
  selection: Set<string>,
  selectedEdges: Set<string>,
  id: string,
  shift: boolean,
): void {
  if (shift) {
    if (selectedEdges.has(id)) {
      selectedEdges.delete(id);
    } else {
      selectedEdges.add(id);
    }
  } else {
    selection.clear();
    selectedEdges.clear();
    selectedEdges.add(id);
  }
}

export type FlowDirection = "up" | "down" | "left" | "right";

/**
 * 二维画布上的「方向键下一项」：几何最近邻，**不是数组下一项**。
 *
 * [WHY 不能照搬树的做法] `z-tree` 的下一项就是数组下一项，因为视觉顺序 = 数组顺序。
 * 画布是自由布局：DOM 里第 2 个节点完全可能画在右下角，而且节点一拖动，
 * DOM 序与视觉序就彻底脱钩。按数组序处理方向键的后果是「按 ↓ 焦点跳到左上方那张卡」，
 * 用户会认为键盘导航坏了 —— 而代码看不出任何问题。
 *
 * [WHY 副轴乘 2] 只按主轴距离取最近时，「正右方 200px」与「右下 150px」分数接近，
 * 焦点会斜着乱跳。副轴加权后，对齐的邻居稳定胜出 —— 这也是人眼认为的「右边那个」。
 *
 * 主轴用严格不等号：中心重合的节点（同一行并排）彼此不应「按上下键能到对方」。
 * 返回 null = 该方向没有候选，调用方**不要** preventDefault（把键还给上层）。
 */
export function nearestInDirection(
  from: ZRect,
  candidates: ReadonlyArray<{ id: string; rect: ZRect }>,
  dir: FlowDirection,
): string | null {
  const fcx = from.x + from.w / 2;
  const fcy = from.y + from.h / 2;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    const dx = c.rect.x + c.rect.w / 2 - fcx;
    const dy = c.rect.y + c.rect.h / 2 - fcy;
    let main: number;
    let cross: number;
    if (dir === "right") {
      if (!(dx > 0)) continue;
      main = dx;
      cross = Math.abs(dy);
    } else if (dir === "left") {
      if (!(dx < 0)) continue;
      main = -dx;
      cross = Math.abs(dy);
    } else if (dir === "down") {
      if (!(dy > 0)) continue;
      main = dy;
      cross = Math.abs(dx);
    } else {
      if (!(dy < 0)) continue;
      main = -dy;
      cross = Math.abs(dx);
    }
    const score = main + cross * 2;
    if (score < bestScore) {
      bestScore = score;
      best = c.id;
    }
  }
  return best;
}

/** 节点点击后的选择集合：shift 取反，普通点击单选。 */
export function nextNodeSelection(selection: Set<string>, id: string, shift: boolean): string[] {
  if (!shift) return [id];
  const next = new Set(selection);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return [...next];
}

export function applyNodeSelection(nodes: ZFlowNode[], selection: ReadonlySet<string>): void {
  for (const node of nodes) {
    node.selected = selection.has(node.id);
  }
}

/**
 * Delete/Backspace 删除选中项：节点连带删除其所有边（React Flow 同款行为）。
 * 原地修改 selection/selectedEdges，返回过滤后的 edges 与是否有变更。
 */
export function deleteSelection(params: {
  nodes: ZFlowNode[];
  selection: Set<string>;
  selectedEdges: Set<string>;
  edges: ZFlowEdge[];
}): { edges: ZFlowEdge[]; changed: boolean } {
  let edges = params.edges;
  let changed = false;
  if (params.selection.size) {
    const toDelete = params.nodes.filter((n) => params.selection.has(n.id) && n.deletable);
    toDelete.forEach((n) => n.remove());
    toDelete.forEach((n) => params.selection.delete(n.id));
    if (toDelete.length) {
      // 联动删除：被删节点的所有边一并移除（React Flow 同款行为）
      const deleted = new Set(toDelete.map((n) => n.id));
      edges = edges.filter((ed) => !deleted.has(ed.source) && !deleted.has(ed.target));
      changed = true;
    }
  }
  if (params.selectedEdges.size) {
    const ids = new Set(params.selectedEdges);
    edges = edges.filter((ed) => !ids.has(ed.id));
    params.selectedEdges.clear();
    changed = true;
  }
  return { edges, changed };
}
