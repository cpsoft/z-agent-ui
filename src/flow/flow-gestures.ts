// [WHY] 2026-10-25 系统审计：从 Flow.ts（947 行）按职责拆出
// 职责：平移/框选/连线三组手势的状态机（持有拖拽期状态、在 window 登记监听），DOM 落笔委托 flow-view。
import { getBezierPath, type ZFlowEdge, type ZViewport } from "./shared.js";
import {
  boxRect,
  boxToFlow,
  findTargetHandle,
  hasDuplicateEdge,
  nodesInBox,
  panViewport,
  pointerIntent,
  resolveConnectTarget,
  type PanState,
} from "./flow-interaction.js";
import { PointerDragSession, type PointerDragDelta } from "../primitives/index.js";
import { applyTempEdgeDom, hideBoxSelect, writeBoxSelect, type BoxRect } from "./flow-view.js";
import { getHandlePoint, toFlow, type ZHandlePoint } from "./flow-geometry.js";
import type { FlowConnectStartDetail } from "./FlowHandle.js";
import type { ZFlowNode } from "./FlowNode.js";

/** 待建边的四元组（z-connect 的 detail 结构）。 */
export interface ConnectPending {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

/**
 * 手势模块对宿主（z-flow 元素）的最小依赖面。
 * 事件名/detail 的构造留在宿主内，手势只做判定与状态推进。
 */
export interface FlowGestureHost {
  isEditable(): boolean;
  root(): ShadowRoot | null;
  rect(): { left: number; top: number };
  viewport(): ZViewport;
  /** 应用视口 + 同步 minimap + 合并派发 z-viewport-change */
  commitViewport(vp: ZViewport): void;
  nodes(): ZFlowNode[];
  nodeById(id: string): ZFlowNode | null;
  draggingNodeId(): string | null;
  select(ids: string[], additive: boolean): void;
  selectEdge(id: string, shift: boolean): void;
  edges(): ZFlowEdge[];
  addEdge(edge: ZFlowEdge): void;
  /** 派发 z-connect；返回 false 表示被外部 preventDefault 拒绝 */
  dispatchConnect(pending: ConnectPending): boolean;
  emitFlowChange(): void;
  emitConnectEnd(success: boolean): void;
  focusHost(): void;
}

export class FlowGestures {
  private _panState: PanState | null = null;
  private _panSession: PointerDragSession | null = null;
  private _connecting: { sourceId: string; sourceHandle: string } | null = null;
  private _tempEdgeStart: ZHandlePoint | null = null;
  private _tempEdgeD: string | null = null;
  private _lastBox: BoxRect | null = null;
  private _edgeSeq = 0;

  constructor(private readonly host: FlowGestureHost) {}

  /** 当前临时边路径（宿主渲染边层时读取）。 */
  get tempEdgeD(): string | null {
    return this._tempEdgeD;
  }

  /** 当前平移状态（宿主暴露给单测观察）。 */
  get panState(): PanState | null {
    return this._panState;
  }

  // ── 平移 / 框选 ────────────────────────────────────────
  //
  // [WHY 起手/阈值/收尾交给 primitives/pointer-drag] 2026-11-20（issue IKWNJL）。
  // 这里原先自己挂 window 三个监听、自己用曼哈顿距离 2px 判「算不算拖动」；
  // 甘特用 3px 分轴、图表用 4px —— 同一次会话里三种手感。原语统一成欧氏 3px，
  // 顺带接管 pointercancel 复位、Esc 中止、user-select 成对还原、拖动后吞 click。
  // 落点（视口怎么算）仍留在本文件：那才是流程图的领域知识。

  onPointerDown = (e: PointerEvent): void => {
    const intent = pointerIntent(e);
    if (intent.kind === "ignored" || intent.kind === "editing") return;
    if (intent.kind === "edge") {
      this.host.selectEdge(intent.edgeId, e.shiftKey);
      return;
    }
    this.host.focusHost();
    const vp = this.host.viewport();
    const s: PanState = {
      startX: e.clientX,
      startY: e.clientY,
      vpX: vp.x,
      vpY: vp.y,
      shift: e.shiftKey,
      moved: false,
    };
    this._panState = s;
    this._panSession?.abort();
    this._panSession = new PointerDragSession({
      onMove: (d) => this._panMove(s, d),
      onEnd: (d) => this._panEnd(s, d.moved),
      // 触屏一滚列表 / Esc：复位，不算点击。**不清空选择** —— 用户是在滚页面，不是在点空白
      onCancel: () => {
        this._panState = null;
        hideBoxSelect(this.host.root());
      },
    });
    this._panSession.begin(e);
  };

  private _panMove(s: PanState, d: PointerDragDelta): void {
    if (!this._panState) return;
    s.moved = d.moved;
    if (s.shift && this.host.isEditable()) {
      this._lastBox = boxRect(s.startX, s.startY, d.x, d.y, this.host.rect());
      writeBoxSelect(this.host.root(), this._lastBox);
    } else {
      this.host.commitViewport(panViewport(this.host.viewport(), s, d.x, d.y));
    }
  }

  private _panEnd(s: PanState, moved: boolean): void {
    this._panState = null;
    this._panSession = null;
    hideBoxSelect(this.host.root());
    if (s.shift && this.host.isEditable() && moved) {
      if (this._lastBox) {
        this.host.select(nodesInBox(this.host.nodes(), boxToFlow(this._lastBox, this.host.viewport())), true);
      }
    } else if (!moved && !s.shift) {
      // 空白点击清空选择
      this.host.select([], false);
    }
  }

  // ── 连线状态机 ─────────────────────────────────────────

  onConnectStart = (e: Event): void => {
    if (!this.host.isEditable() || this._connecting) return;
    const detail = (e as CustomEvent<FlowConnectStartDetail>).detail;
    if (!detail?.handle) return;
    const sourceNode = this.host.nodeById(detail.sourceId);
    if (!sourceNode || sourceNode.connectable === false) return;
    const sourcePoint = getHandlePoint(
      sourceNode,
      this.host.draggingNodeId(),
      detail.sourceHandle,
      "source",
    );
    if (!sourcePoint) return;
    this._connecting = { sourceId: detail.sourceId, sourceHandle: detail.sourceHandle };
    this._tempEdgeStart = sourcePoint;
    this._tempEdgeD = getBezierPath(sourcePoint.x, sourcePoint.y, sourcePoint.x, sourcePoint.y, sourcePoint.pos);
    applyTempEdgeDom(this.host.root(), this._tempEdgeD, true);
    window.addEventListener("pointermove", this.onConnectMove);
    window.addEventListener("pointerup", this.onConnectUp);
    window.addEventListener("pointercancel", this.onConnectCancel);
    window.addEventListener("keydown", this.onConnectKey);
  };

  onConnectMove = (e: PointerEvent): void => {
    if (!this._connecting || !this._tempEdgeStart) return;
    const p = toFlow(e.clientX, e.clientY, this.host.rect(), this.host.viewport());
    // [WHY] 临时边源端沿用把手法线，拖拽中保持垂直离开节点（[[bug-20260811-bezier-perpendicular]]）
    this._tempEdgeD = getBezierPath(this._tempEdgeStart.x, this._tempEdgeStart.y, p.x, p.y, this._tempEdgeStart.pos);
    const t = this.host.root()?.querySelector(".z-flow__temp-edge");
    if (t) {
      t.removeAttribute("hidden");
      t.setAttribute("d", this._tempEdgeD);
    }
  };

  onConnectUp = (e: PointerEvent): void => {
    const state = this._connecting;
    if (!state) return;
    const target = findTargetHandle(e);
    const targetNode = (target?.closest("z-flow-node") ?? null) as ZFlowNode | null;
    const resolved = resolveConnectTarget(target, targetNode, state.sourceId);
    if (!resolved) {
      this._endConnect(false);
      return;
    }
    const pending: ConnectPending = {
      source: state.sourceId,
      sourceHandle: state.sourceHandle,
      target: resolved.nodeId,
      targetHandle: resolved.handleId,
    };
    if (hasDuplicateEdge(this.host.edges(), pending)) {
      this._endConnect(false);
      return;
    }
    if (!this.host.dispatchConnect(pending)) {
      this._endConnect(false);
      return;
    }
    this.host.addEdge({ id: `edge-${++this._edgeSeq}`, ...pending });
    this._endConnect(true);
  };

  onConnectCancel = (): void => {
    if (this._connecting) this._endConnect(false);
  };

  onConnectKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") this._endConnect(false);
  };

  private _endConnect(success: boolean): void {
    this._endConnectListeners();
    this._connecting = null;
    this._tempEdgeStart = null;
    this._tempEdgeD = null;
    applyTempEdgeDom(this.host.root(), null, false);
    if (success) this.host.emitFlowChange();
    this.host.emitConnectEnd(success);
  }

  private _endConnectListeners(): void {
    window.removeEventListener("pointermove", this.onConnectMove);
    window.removeEventListener("pointerup", this.onConnectUp);
    window.removeEventListener("pointercancel", this.onConnectCancel);
    window.removeEventListener("keydown", this.onConnectKey);
  }

  /** 宿主断开连接时清掉所有 window 监听与在手状态。 */
  dispose(): void {
    // 平移到窗口上的监听现在归原语：dispose() 只清理、不回调宿主（卸载时 DOM 已拆）
    this._panSession?.dispose();
    this._panSession = null;
    this._endConnectListeners();
    this._panState = null;
    this._connecting = null;
    this._tempEdgeStart = null;
    this._tempEdgeD = null;
  }
}
