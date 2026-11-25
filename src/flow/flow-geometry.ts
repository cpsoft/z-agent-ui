// [WHY] 2026-10-25 系统审计：从 Flow.ts（947 行）按职责拆出
// 职责：flow 坐标换算、把手锚点、边几何与边层 SVG 字符串生成；不持有组件状态、不绑事件。
import { escapeAttr } from "../core/index.js";
import {
  getBezier,
  parsePosition,
  type ZFlowEdge,
  type ZHandlePos,
  type ZPosition,
  type ZRect,
  type ZViewport,
} from "./shared.js";
import type { ZFlowHandle } from "./FlowHandle.js";
import type { ZFlowNode } from "./FlowNode.js";

// 把手锚点 = 坐标 + 所在边（控制点法线方向依据，见 [[bug-20260811-bezier-perpendicular]]）
export type ZHandlePoint = ZPosition & { pos: ZHandlePos };

/** 一条边的渲染几何（路径 d + 样式标志 + 标签位置），供 SVG 拼装使用。 */
export interface EdgeGeometry {
  id: string;
  d: string;
  animated: boolean;
  dashed: boolean;
  selected: boolean;
  label: string;
  lx: number;
  ly: number;
}

export { escapeAttr as esc };

export function nodeFlowRect(n: ZFlowNode): ZRect {
  const pos = parsePosition(n.position) ?? { x: 0, y: 0 };
  // [WHY] offsetWidth 是布局尺寸，不受 CSS transform 缩放影响，可直接作 flow 坐标
  return { x: pos.x, y: pos.y, w: n.offsetWidth || 0, h: n.offsetHeight || 0 };
}

/** 屏幕坐标 → flow 坐标（hostRect 为画布自身的 client rect）。 */
export function toFlow(
  clientX: number,
  clientY: number,
  hostRect: { left: number; top: number },
  viewport: ZViewport,
): ZPosition {
  return {
    x: (clientX - hostRect.left - viewport.x) / viewport.zoom,
    y: (clientY - hostRect.top - viewport.y) / viewport.zoom,
  };
}

/**
 * 把手锚点：**全部在 flow 坐标系里算**（节点实时位置 + 把手相对节点的偏移）。
 *
 * ★ [WHY 不能拿把手屏幕坐标反解] 旧实现取 handle.getBoundingClientRect()，再用
 * `_toFlow()`（减 viewport.x/y、除 viewport.zoom）反推 flow 坐标。这要求「rects」
 * 与「viewport 字段」来自同一帧。真实浏览器实测（2026-10-20，Chrome 141）：
 * 画布刚挂载时 fitView 已经把 viewport 换成 (x=-160, y=349.9, zoom=0.769)，
 * 而 rects 仍是上一帧的 (y=333.4, zoom=0.7308) ⇒ 反解出来的源节点锚点 y 是 8.9
 * 而不是 32（节点高 64 的中心），整条边向左上偏移：**每次进画布都错位，点一下
 * 节点触发重算才恢复**（[[bug-20261020-flow-edge-misaligned]]）。
 *
 * 现在只用**同一帧内的相对量**：把手 rect 减节点 rect（平移项自动抵消），再除以
 * 由「节点自身 rect.width / offsetWidth」标定出的渲染缩放（连 viewport.zoom 都
 * 不再信任）。因此 rects 与 viewport 不一致时，算出的 flow 坐标依然正确。
 */
export function getHandlePoint(
  node: ZFlowNode,
  draggingNodeId: string | null,
  handleId: string | undefined,
  type: "source" | "target",
): ZHandlePoint | null {
  // ★ 基准位置随场景切换，两个来源都有各自的失准时点：
  //   - 拖拽中：ZFlowNode 只改 style.left/top（commit-on-end，position 到 pointerup 才写）
  //     ⇒ 必须读 style，读属性会让边拖拽时黏在旧位置
  //   - 非拖拽：外部刚改完 position 属性，style 还没跟上（Lit 异步渲染）
  //     ⇒ 必须读属性，读 style 会让边停在旧位置直到下一次重渲染
  // 两者混用其一都会在另一半场景下错位，所以按 _draggingNodeId 分流。
  const declared = parsePosition(node.position) ?? { x: 0, y: 0 };
  const num = (v: string, fallback: number): number => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const base =
    draggingNodeId === node.id
      ? { x: num(node.style.left, declared.x), y: num(node.style.top, declared.y) }
      : declared;
  const nodeRect = node.getBoundingClientRect();
  // 渲染缩放：同一元素的 rect 宽 / 布局宽（offsetWidth 不受 transform 影响）
  const scale = node.offsetWidth > 0 && nodeRect.width > 0 ? nodeRect.width / node.offsetWidth : 1;
  const local = (clientX: number, clientY: number): ZPosition => ({
    x: (clientX - nodeRect.left) / scale,
    y: (clientY - nodeRect.top) / scale,
  });
  let handle: ZFlowHandle | null = null;
  const handles = Array.from(node.querySelectorAll<ZFlowHandle>("z-flow-handle"));
  if (handleId) handle = handles.find((h) => h.id === handleId) ?? null;
  if (!handle && type === "source") {
    handle = handles.find((h) => h.type === "source") ?? null;
  }
  if (!handle && type === "target") {
    handle = handles.find((h) => h.type === "target") ?? null;
  }
  if (handle) {
    const hr = handle.getBoundingClientRect();
    const c = local(hr.left + hr.width / 2, hr.top + hr.height / 2);
    // [WHY] pos 携带把手所在边，曲线控制点按法线方向外延
    // （[[bug-20260811-bezier-perpendicular]]）
    return { x: base.x + c.x, y: base.y + c.y, pos: handle.position };
  }
  // 无 handle 时默认：source 右边缘中点，target 左边缘中点（布局尺寸即 flow 尺寸）
  if (type === "source") {
    return { x: base.x + node.offsetWidth, y: base.y + node.offsetHeight / 2, pos: "right" };
  }
  return { x: base.x, y: base.y + node.offsetHeight / 2, pos: "left" };
}

export function computeEdgeGeometry(params: {
  edges: ZFlowEdge[];
  selectedEdges: ReadonlySet<string>;
  resolveNode: (id: string) => ZFlowNode | null;
  draggingNodeId: string | null;
}): EdgeGeometry[] {
  const out: EdgeGeometry[] = [];
  for (const edge of params.edges) {
    const sourceNode = params.resolveNode(edge.source);
    const targetNode = params.resolveNode(edge.target);
    const sp = sourceNode
      ? getHandlePoint(sourceNode, params.draggingNodeId, edge.sourceHandle, "source")
      : null;
    const tp = targetNode
      ? getHandlePoint(targetNode, params.draggingNodeId, edge.targetHandle, "target")
      : null;
    if (!sp || !tp) continue;
    // [WHY] 传把手所在边，控制点沿法线外延（[[bug-20260811-bezier-perpendicular]]）
    const bezier = getBezier(sp.x, sp.y, tp.x, tp.y, sp.pos, tp.pos);
    out.push({
      id: edge.id,
      d: `M ${sp.x} ${sp.y} C ${bezier.c1.x} ${bezier.c1.y}, ${bezier.c2.x} ${bezier.c2.y}, ${tp.x} ${tp.y}`,
      animated: !!edge.animated,
      dashed: !!edge.dashed,
      selected: params.selectedEdges.has(edge.id),
      label: edge.label ?? "",
      lx: bezier.mid.x,
      ly: bezier.mid.y,
    });
  }
  return out;
}

export function renderEdgesSvg(params: {
  markerId: string;
  showEdgeArrow: boolean;
  tempEdgeD: string | null;
  geometries: EdgeGeometry[];
}): string {
  // [WHY 箭头可关] 默认画：没有把手约定的消费方需要箭头才看得出边的方向。
  // 消费方若用把手承载方向（入=空心三角 / 出=空心圆），再挂箭头等于同一方向标两次、
  // 且箭头压在节点边框上，那时传 showEdgeArrow=false。
  const defs = params.showEdgeArrow
    ? `<defs><marker id="${params.markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"></path></marker></defs>`
    : "";
  const arrow = params.showEdgeArrow ? ` marker-end="url(#${params.markerId})"` : "";
  const paths = params.geometries
    .map((g) => {
      const classes = ["z-flow__edge-path"];
      if (g.animated) classes.push("z-flow__edge-path--animated");
      if (g.dashed) classes.push("z-flow__edge-path--dashed");
      if (g.selected) classes.push("z-flow__edge-path--selected");
      const label = g.label
        ? `<text class="z-flow__edge-label" x="${g.lx}" y="${g.ly}">${escapeAttr(g.label)}</text>`
        : "";
      return (
        `<path class="${classes.join(" ")}" d="${g.d}"${arrow} data-edge-id="${escapeAttr(g.id)}" data-zui-edge=""></path>` +
        label
      );
    })
    .join("");
  const temp = params.tempEdgeD
    ? `<path class="z-flow__temp-edge" d="${params.tempEdgeD}"></path>`
    : `<path class="z-flow__temp-edge" hidden=""></path>`;
  return defs + paths + temp;
}
