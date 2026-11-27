// <z-flow> 流程画布：edges 给连线、节点走默认槽，支持缩放 / 网格吸附 / 小地图，变更各发事件。
// [组合架构] 手势状态机托管给 FlowGestures、键盘导航与 roving tabindex 托管给 FlowKeyboardController、
// 几何与视图写 DOM 分别由 flow-geometry.ts / flow-view.ts 承担，宿主只保留契约与编排。
import { BaseElement, html, property, escapeAttr, t, defineElement } from "../core/index.js";
import {
  clamp,
  parsePosition,
  type ZFlowEdge,
  type ZPosition,
  type ZViewport,
} from "./shared.js";
import { ZFlowNode } from "./FlowNode.js";
import { computeEdgeGeometry, nodeFlowRect, renderEdgesSvg } from "./flow-geometry.js";
import {
  applyNodeSelection,
  fitViewport,
  minimapViewport,
  nextNodeSelection,
  toggleEdgeSelection,
  wheelZoomViewport,
  type PanState,
} from "./flow-interaction.js";
import { applyViewportStyles, syncMinimap } from "./flow-view.js";
import { FlowGestures, type ConnectPending } from "./flow-gestures.js";
import { FlowKeyboardController } from "./flow-keyboard-controller.js";
import flowCSS from "./flow.css?raw";

let markerSeq = 0;

export class ZFlow extends BaseElement {
  static styles = flowCSS;

  @property({ type: Array, attribute: false }) edges: ZFlowEdge[] = [];
  @property({ type: Number }) minZoom = 0.5;
  @property({ type: Number }) maxZoom = 2;
  @property({ type: Number }) zoomSpeed = 1;
  @property({ type: Number }) fitViewPadding = 40;
  @property({ type: Boolean }) fitViewOnInit = false;
  @property({ type: String }) background: "dots" | "lines" | "none" = "dots";
  @property({ type: Boolean }) editable = true;
  @property({ type: Boolean }) showEdgeArrow = true;
  @property({ type: Boolean }) snapToGrid = false;
  @property({ type: Number }) snapSize = 20;

  private readonly _markerId = `z-flow-arrow-${++markerSeq}`;
  private _draggingNodeId: string | null = null;
  private _viewport: ZViewport = { x: 0, y: 0, zoom: 1 };
  private _viewportEl: HTMLElement | null = null;
  private _bgEl: HTMLElement | null = null;
  private _selection = new Set<string>();
  private _selectedEdges = new Set<string>();
  private _edgesScheduled = false;
  private _viewportEmitPending = false;
  private _observer: MutationObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  private _sizeObserved = new WeakSet<Element>();

  private _keyboard = this.addController(
    new FlowKeyboardController({
      isEditable: () => this.editable,
      isSnapToGrid: () => this.snapToGrid,
      getSnapSize: () => this.snapSize,
      getNodes: () => this._getNodes(),
      getSelection: () => this._selection,
      getSelectedEdges: () => this._selectedEdges,
      getEdges: () => this.edges,
      setEdges: (edges) => {
        this.edges = edges;
      },
      setSelection: (ids, additive) => this._setSelection(ids, additive),
      refreshEdges: () => this.refreshEdges(),
      emitSelectionChange: () => {
        this.emit("z-flow-selection-change", {
          nodeIds: [...this._selection],
          edgeIds: [...this._selectedEdges],
        });
      },
      emitFlowChange: () => {
        if (this.isConnected) this.emit("z-flow-change", this.getData());
      },
    }),
  );

  private _gestures = new FlowGestures({
    isEditable: () => this.editable,
    root: () => this.shadowRoot,
    rect: () => this.getBoundingClientRect(),
    viewport: () => this._viewport,
    commitViewport: (vp) => this._commitViewport(vp),
    nodes: () => this._getNodes(),
    nodeById: (id) => this._nodeById(id),
    draggingNodeId: () => this._draggingNodeId,
    select: (ids, additive) => this._setSelection(ids, additive),
    selectEdge: (id, shift) => this._onEdgePointerDown(id, shift),
    edges: () => this.edges,
    addEdge: (edge) => {
      this.edges = [...this.edges, edge];
    },
    dispatchConnect: (pending) => this._dispatchConnect(pending),
    emitFlowChange: () => {
      if (this.isConnected) this.emit("z-flow-change", this.getData());
    },
    emitConnectEnd: (success) => this.emit("z-connect-end", { success }),
    focusHost: () =>
      this._keyboard.focusNode(this._keyboard.currentNode(this._getNodes()) ?? this._getNodes()[0]),
  });

  get viewport(): ZViewport {
    return { ...this._viewport };
  }

  get _panState(): PanState | null {
    return this._gestures.panState;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", t("flowChart"));

    this.listen(this, "pointerdown", this._onPointerDown as EventListener);
    this.listen(this, "keydown", this._keyboard.onKeyDown as EventListener);
    this.listen(this, "focusin", this._keyboard.onFocusIn);
    this.listen(this, "wheel", this._onWheel as EventListener, { passive: false });
    this.listen(this, "z-connect-start", this._onConnectStart);
    this.listen(this, "z-node-dragmove", this._onNodeDragMove);
    this.listen(this, "z-node-dragend", this._onNodeDragEnd);
    this.listen(this, "z-node-click", this._onNodeClick);
    this.listen(this, "z-minimap-navigate", this._onMinimapNavigate);
    this.listen(this, "z-control-zoom-in", this._onZoomIn);
    this.listen(this, "z-control-zoom-out", this._onZoomOut);
    this.listen(this, "z-control-fit-view", this._onFitView);

    this._observer = new MutationObserver(() => {
      this._keyboard.syncTabStops();
      this.scheduleEdges();
    });
    this._observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["position", "id", "type"],
      characterData: true,
    });
    if ("ResizeObserver" in window) {
      this._resizeObserver = new ResizeObserver(() => this.scheduleEdges());
      this._resizeObserver.observe(this);
    }
  }

  disconnectedCallback(): void {
    this._observer?.disconnect();
    this._resizeObserver?.disconnect();
    this._gestures.dispose();
    super.disconnectedCallback();
  }

  render(): string {
    return html`
      <div class="z-flow__bg z-flow__bg--${this.background}" part="background"></div>
      <div class="z-flow__viewport" part="viewport">
        <svg class="z-flow__edges" part="edges">${this._edgesSvgHtml()}</svg>
        <div
          class="z-flow__nodes"
          part="nodes"
          role="listbox"
          aria-label="${escapeAttr(t("flowNodes"))}"
          aria-multiselectable="true"
        ><slot></slot></div>
      </div>
      <div class="z-flow__overlay" part="overlay">
        <slot name="minimap"></slot>
        <slot name="controls"></slot>
        <div class="z-flow__box-select" hidden=""></div>
      </div>
    `;
  }

  firstUpdated(): void {
    this._viewportEl = this.shadowRoot!.querySelector(".z-flow__viewport");
    this._bgEl = this.shadowRoot!.querySelector(".z-flow__bg");
    this._applyViewport();
    if (this.fitViewOnInit) this.fitView();
  }

  updated(): void {
    this._viewportEl = this.shadowRoot!.querySelector(".z-flow__viewport");
    this._bgEl = this.shadowRoot!.querySelector(".z-flow__bg");
    this._applyViewport();
    this._syncMinimap();
    this.scheduleEdges();
  }

  setViewport(vp: ZViewport): void {
    this._commitViewport({
      x: vp.x,
      y: vp.y,
      zoom: clamp(vp.zoom, this.minZoom, this.maxZoom),
    });
  }

  fitView(): void {
    const vp = fitViewport(
      this._getNodes().map(nodeFlowRect),
      this.clientWidth,
      this.clientHeight,
      this.fitViewPadding,
      this.minZoom,
      this.maxZoom,
    );
    this.setViewport(vp ?? { x: 0, y: 0, zoom: 1 });
  }

  refreshEdges(): void {
    this._observeNodeSizes();
    const svg = this.shadowRoot?.querySelector(".z-flow__edges");
    if (svg) svg.innerHTML = this._edgesSvgHtml();
    this._syncMinimap();
  }

  private _observeNodeSizes(): void {
    const ro = this._resizeObserver;
    if (!ro) return;
    for (const n of this._getNodes()) {
      if (this._sizeObserved.has(n)) continue;
      this._sizeObserved.add(n);
      ro.observe(n);
    }
  }

  getData(): { nodes: Array<{ id: string; position: ZPosition; type: string }>; edges: ZFlowEdge[] } {
    const nodes = this._getNodes().map((n) => ({
      id: n.id,
      position: parsePosition(n.position) ?? { x: 0, y: 0 },
      type: n.type,
    }));
    return { nodes, edges: [...this.edges] };
  }

  scheduleEdges(): void {
    if (this._edgesScheduled) return;
    this._edgesScheduled = true;
    setTimeout(() => {
      this._edgesScheduled = false;
      if (this.isConnected) this.refreshEdges();
    }, 0);
  }

  private _applyViewport(): void {
    applyViewportStyles(this._viewportEl, this._bgEl, this._viewport, this.background, this.snapSize);
  }

  private _syncMinimap(): void {
    syncMinimap(this, this._getNodes(), this._viewport);
  }

  private _commitViewport(vp: ZViewport): void {
    this._viewport = vp;
    this._applyViewport();
    this._syncMinimap();
    this._emitViewportChange();
  }

  private _emitViewportChange(): void {
    if (this._viewportEmitPending) return;
    this._viewportEmitPending = true;
    queueMicrotask(() => {
      this._viewportEmitPending = false;
      if (this.isConnected) this.emit("z-viewport-change", { ...this._viewport });
    });
  }

  private _onWheel = (e: WheelEvent): void => {
    const vp = wheelZoomViewport(this._viewport, e, this.getBoundingClientRect(), this);
    if (!vp) return;
    e.preventDefault();
    this._commitViewport(vp);
  };

  private _onZoomIn = (): void => {
    this.setViewport({
      ...this._viewport,
      zoom: clamp(this._viewport.zoom * 1.2, this.minZoom, this.maxZoom),
    });
  };

  private _onZoomOut = (): void => {
    this.setViewport({
      ...this._viewport,
      zoom: clamp(this._viewport.zoom / 1.2, this.minZoom, this.maxZoom),
    });
  };

  private _onFitView = (): void => {
    this.fitView();
  };

  private _onPointerDown = (e: PointerEvent): void => this._gestures.onPointerDown(e);
  private _onConnectStart = (e: Event): void => this._gestures.onConnectStart(e);

  private _dispatchConnect(pending: ConnectPending): boolean {
    const evt = new CustomEvent("z-connect", {
      detail: pending,
      bubbles: true,
      composed: true,
      cancelable: true,
    });
    this.dispatchEvent(evt);
    return !evt.defaultPrevented;
  }

  private _onNodeClick = (e: Event): void => {
    if (!this.editable) return;
    const detail = (e as CustomEvent<{ id: string; shiftKey?: boolean }>).detail;
    const node = this._nodeById(detail?.id);
    if (!node || !node.selectable) return;
    this._keyboard.focusNode(node);
    this._setSelection(nextNodeSelection(this._selection, node.id, !!detail.shiftKey), false);
  };

  private _onEdgePointerDown = (id: string, shift: boolean): void => {
    if (!this.editable) return;
    toggleEdgeSelection(this._selection, this._selectedEdges, id, shift);
    this._applySelectionChange();
  };

  private _setSelection(ids: string[], additive: boolean): void {
    if (!additive) {
      this._selection.clear();
      this._selectedEdges.clear();
    }
    ids.forEach((id) => this._selection.add(id));
    this._applySelectionChange();
  }

  private _applySelectionChange(): void {
    applyNodeSelection(this._getNodes(), this._selection);
    this.refreshEdges();
    this.emit("z-flow-selection-change", {
      nodeIds: [...this._selection],
      edgeIds: [...this._selectedEdges],
    });
  }

  private _onNodeDragMove = (e: Event): void => {
    this._draggingNodeId = (e as CustomEvent<{ id?: string }>).detail?.id ?? null;
    this.refreshEdges();
  };

  private _onNodeDragEnd = (): void => {
    this._draggingNodeId = null;
    if (this.isConnected) this.emit("z-flow-change", this.getData());
  };

  private _onMinimapNavigate = (e: Event): void => {
    const d = (e as CustomEvent<{ x: number; y: number }>).detail;
    if (!d) return;
    this.setViewport(minimapViewport(d, this.clientWidth, this.clientHeight, this._viewport.zoom));
  };

  private _getNodes(): ZFlowNode[] {
    return Array.from(this.querySelectorAll("z-flow-node"));
  }

  private _nodeById(id: string): ZFlowNode | null {
    return this._getNodes().find((n) => n.id === id) ?? null;
  }

  private _edgesSvgHtml(): string {
    return renderEdgesSvg({
      markerId: this._markerId,
      showEdgeArrow: this.showEdgeArrow,
      tempEdgeD: this._gestures.tempEdgeD,
      geometries: computeEdgeGeometry({
        edges: this.edges,
        selectedEdges: this._selectedEdges,
        resolveNode: (id) => this._nodeById(id),
        draggingNodeId: this._draggingNodeId,
      }),
    });
  }
}

defineElement("z-flow", ZFlow);
