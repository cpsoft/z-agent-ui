import { deepActiveElement, type ReactiveController } from "../core/index.js";
import { formatPosition, parsePosition, type ZFlowEdge } from "./shared.js";
import type { ZFlowNode } from "./FlowNode.js";
import { nodeFlowRect } from "./flow-geometry.js";
import {
  deleteSelection,
  isEditingTarget,
  nearestInDirection,
  nextNodeSelection,
  type FlowDirection,
} from "./flow-interaction.js";

const DIR_VEC: Record<string, { dx: number; dy: number; dir: FlowDirection }> = {
  ArrowUp: { dx: 0, dy: -1, dir: "up" },
  ArrowDown: { dx: 0, dy: 1, dir: "down" },
  ArrowLeft: { dx: -1, dy: 0, dir: "left" },
  ArrowRight: { dx: 1, dy: 0, dir: "right" },
};

const NUDGE_STEP = 10;

export interface FlowKeyboardHost {
  isEditable(): boolean;
  isSnapToGrid(): boolean;
  getSnapSize(): number;
  getNodes(): ZFlowNode[];
  getSelection(): Set<string>;
  getSelectedEdges(): Set<string>;
  getEdges(): ZFlowEdge[];
  setEdges(edges: ZFlowEdge[]): void;
  setSelection(ids: string[], additive: boolean): void;
  refreshEdges(): void;
  emitSelectionChange(): void;
  emitFlowChange(): void;
}

/**
 * `<z-flow>` 画布键盘与 roving tabindex 控制器（ReactiveController）。
 *
 * 托管方向键几何最近邻导航、Shift+方向键微调节点、Enter/Space 选中、
 * Delete/Backspace 删除后焦点补位与 roving tabindex 同步。
 */
export class FlowKeyboardController implements ReactiveController {
  private readonly _host: FlowKeyboardHost;

  constructor(host: FlowKeyboardHost) {
    this._host = host;
  }

  hostConnected(): void {
    this.syncTabStops();
  }

  currentNode(nodes: ZFlowNode[]): ZFlowNode | null {
    const active = deepActiveElement();
    return active ? nodes.find((n) => n === active) ?? null : null;
  }

  syncTabStops(prefer?: ZFlowNode): void {
    const nodes = this._host.getNodes();
    if (nodes.length === 0) return;
    const keep =
      (prefer && nodes.includes(prefer) ? prefer : null) ??
      this.currentNode(nodes) ??
      nodes.find((n) => n.getAttribute("tabindex") === "0") ??
      nodes[0];
    for (const n of nodes) n.setAttribute("tabindex", n === keep ? "0" : "-1");
  }

  focusNode(node: ZFlowNode | null | undefined): void {
    if (!node) return;
    this.syncTabStops(node);
    node.focus({ preventScroll: true });
  }

  onFocusIn = (e: Event): void => {
    const target = e.target as Element | null;
    if (!target || target.tagName !== "Z-FLOW-NODE") return;
    this.syncTabStops(target as ZFlowNode);
  };

  onKeyDown = (e: KeyboardEvent): void => {
    if (isEditingTarget(e)) return;
    const nodes = this._host.getNodes();
    if (nodes.length === 0) return;

    const key = e.key;
    const vec = DIR_VEC[key];
    if (vec) {
      if (e.shiftKey) {
        if (!this._host.isEditable()) return;
        if (this._nudgeNodes(vec)) e.preventDefault();
        return;
      }
      const next = this._neighborInDirection(nodes, vec.dir);
      if (!next) return;
      e.preventDefault();
      this.focusNode(next);
      return;
    }

    if (key === "Home" || key === "End") {
      e.preventDefault();
      this.focusNode(key === "Home" ? nodes[0] : nodes[nodes.length - 1]);
      return;
    }

    if ((key === "Enter" || key === " ") && this._host.isEditable()) {
      const cur = this.currentNode(nodes);
      if (!cur || !cur.selectable) return;
      e.preventDefault();
      this._host.setSelection(nextNodeSelection(this._host.getSelection(), cur.id, e.shiftKey), false);
      return;
    }

    if (key !== "Delete" && key !== "Backspace") return;
    if (!this._host.isEditable()) return;
    const selection = this._host.getSelection();
    const selectedEdges = this._host.getSelectedEdges();
    if (!selection.size && !selectedEdges.size) return;
    e.preventDefault();

    const cur = this.currentNode(nodes);
    const curAt = cur ? nodes.indexOf(cur) : -1;
    const result = deleteSelection({
      nodes,
      selection,
      selectedEdges,
      edges: this._host.getEdges(),
    });
    if (!result.changed) return;
    this._host.setEdges(result.edges);
    this._host.emitSelectionChange();
    this._host.emitFlowChange();

    if (curAt >= 0) {
      const rest = this._host.getNodes();
      const next = rest[Math.min(curAt, rest.length - 1)];
      if (next) this.focusNode(next);
    }
  };

  private _neighborInDirection(nodes: ZFlowNode[], dir: FlowDirection): ZFlowNode | null {
    const from = this.currentNode(nodes);
    if (!from) return dir === "up" || dir === "left" ? nodes[nodes.length - 1] : nodes[0];
    const id = nearestInDirection(
      nodeFlowRect(from),
      nodes.filter((n) => n !== from).map((n) => ({ id: n.id, rect: nodeFlowRect(n) })),
      dir,
    );
    return id ? nodes.find((n) => n.id === id) ?? null : null;
  }

  private _nudgeNodes(vec: { dx: number; dy: number }): boolean {
    const nodes = this._host.getNodes();
    const cur = this.currentNode(nodes);
    const selection = this._host.getSelection();
    const picked = nodes.filter((n) => selection.has(n.id));
    const targets = picked.length ? picked : cur ? [cur] : [];
    if (targets.length === 0) return false;
    const step = this._host.isSnapToGrid() ? Math.max(1, this._host.getSnapSize()) : NUDGE_STEP;
    for (const n of targets) {
      const p = parsePosition(n.position) ?? { x: 0, y: 0 };
      n.position = formatPosition({ x: p.x + vec.dx * step, y: p.y + vec.dy * step });
    }
    this._host.refreshEdges();
    this._host.emitFlowChange();
    return true;
  }
}
