// <z-flow> 流程画布：edges 给连线、节点走默认槽，支持缩放 / 网格吸附 / 小地图，变更各发事件。
// [WHY] 画布主容器：视口（pan/zoom）/边层/选择/连线状态机。
// 监听器只挂 host/window（shadow innerHTML 每次重建，内部监听器失效，
// 见 web-components-render-pitfalls 陷阱②）；边重算用 setTimeout 合并而非 rAF
// （happy-dom 测试挂起）。See: wiki/requirements/REQ-013-node-flow-editor.md
// [WHY] 2026-10-25 系统审计：947 行按职责拆出 —— 几何/SVG → flow-geometry.ts，
// 手势判定 → flow-interaction.ts，视图写 DOM → flow-view.ts，手势状态机 → flow-gestures.ts
import { BaseElement, html, property, deepActiveElement, escapeAttr, t, defineElement } from "../core/index.js";
import {
  clamp,
  formatPosition,
  parsePosition,
  type ZFlowEdge,
  type ZPosition,
  type ZViewport,
} from "./shared.js";
import { ZFlowNode } from "./FlowNode.js";
import { computeEdgeGeometry, nodeFlowRect, renderEdgesSvg } from "./flow-geometry.js";
import {
  applyNodeSelection,
  deleteSelection,
  fitViewport,
  isEditingTarget,
  minimapViewport,
  nearestInDirection,
  nextNodeSelection,
  toggleEdgeSelection,
  wheelZoomViewport,
  type FlowDirection,
  type PanState,
} from "./flow-interaction.js";
import { applyViewportStyles, syncMinimap } from "./flow-view.js";
import { FlowGestures, type ConnectPending } from "./flow-gestures.js";
import flowCSS from "./flow.css?raw";

/** 每个 z-flow 实例一个独立 marker id：同页多个画布时 id 不能撞。 */
let markerSeq = 0;

/** 方向键 → 位移向量。方向键移动焦点，Shift+方向键按这个向量移动节点。 */
const DIR_VEC: Record<string, { dx: number; dy: number; dir: FlowDirection }> = {
  ArrowUp: { dx: 0, dy: -1, dir: "up" },
  ArrowDown: { dx: 0, dy: 1, dir: "down" },
  ArrowLeft: { dx: -1, dy: 0, dir: "left" },
  ArrowRight: { dx: 1, dy: 0, dir: "right" },
};

/**
 * 键盘微调步长（画布像素）。
 *
 * [WHY 不用 1px] 1px 要按 100 下才能挪一个节点宽度；[WHY 不用 snapSize 作默认]
 * 未开吸附时画布是自由坐标，硬套 20 会让人以为吸附被偷偷打开了。
 * 开了吸附则必须跟随 snapSize —— 否则「键盘挪过的节点」不落在网格上，
 * 与鼠标拖拽的结果不一致。
 */
const NUDGE_STEP = 10;

export class ZFlow extends BaseElement {
  static styles = flowCSS;

  @property({ type: Array, attribute: false }) edges: ZFlowEdge[] = [];
  @property({ type: Number }) minZoom = 0.5;
  @property({ type: Number }) maxZoom = 2;
  @property({ type: Number }) zoomSpeed = 1;
  @property({ type: Number }) fitViewPadding = 40;
  // [WHY] 不能用 fitView 作属性名：applyPropertyMeta 的实例访问器会遮蔽原型上的
  // fitView() 方法（实例属性优先于原型方法），属性改名 fitViewOnInit
  @property({ type: Boolean }) fitViewOnInit = false;
  @property({ type: String }) background: "dots" | "lines" | "none" = "dots";
  @property({ type: Boolean }) editable = true;
  /**
   * 边末端是否画箭头（默认开）。
   *
   * [WHY 要能关] 箭头表达「边的方向」，这是通用语义。但消费方若已用把手承载方向
   * （如 zEtl 画布：入把手空心三角、出把手空心圆），边上再挂箭头等于同一方向标两次，
   * 且箭头会压到节点边框上。默认开 = 不动既有视觉；需要关的消费方显式传 false。
   */
  @property({ type: Boolean }) showEdgeArrow = true;

  /** 本实例的箭头 marker id（同页多实例不撞） */
  private readonly _markerId = `z-flow-arrow-${++markerSeq}`;

  /**
   * 正在被拖拽的节点 id（null = 无）。
   *
   * [WHY 需要这个标记] 节点位置有两个来源：`position` 属性（外部改它，同步可读）
   * 与 `style.left/top`（拖拽期逐帧写，position 属性到 pointerup 才提交）。
   * 取位置时必须知道当前是哪种场景，否则必然读错其中一个：
   *   - 外部改 position 属性后立即 refreshEdges → style 还是旧值 ⇒ 边粘在旧位置
   *   - 拖拽中读 position 属性 → 属性还没提交 ⇒ 边跟不上手
   */
  private _draggingNodeId: string | null = null;
  // [WHY] 网格吸附（2026-08-12）：节点拖拽时位置对齐到 snapSize 的整数倍，
  // 默认 20px 与背景网格大小一致，视觉上节点边缘贴合网格线
  @property({ type: Boolean }) snapToGrid = false;
  @property({ type: Number }) snapSize = 20;

  private _viewport: ZViewport = { x: 0, y: 0, zoom: 1 };
  private _viewportEl: HTMLElement | null = null;
  // [WHY] 背景层独立于视口变换：bg 在视口外部，通过 background-position/size
  // 模拟 pan/zoom，使网格始终覆盖完整可见区域（2026-08-12 修复画布移动后网格不全）
  private _bgEl: HTMLElement | null = null;
  private _selection = new Set<string>();
  private _selectedEdges = new Set<string>();
  private _edgesScheduled = false;
  private _viewportEmitPending = false;
  private _observer: MutationObserver | null = null;
  private _resizeObserver: ResizeObserver | null = null;
  // [WHY] 节点尺寸也要观察（字体加载/文案变化会把卡撑大，把手随之移动）。
  // 原来只观察宿主：宿主尺寸不变、节点长大了，边就停在旧几何上。
  private _sizeObserved = new WeakSet<Element>();

  /** 平移/框选/连线三组手势（状态机在模块内，DOM 落笔与 emit 回到本类）。 */
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
    // 「焦点收回画布」= 落在当前节点（或第一个节点）上 —— **不是** `this.focus()`：
    // 宿主不能有 tabindex（见 connectedCallback 的实测说明），没有 tabindex 的
    // `host.focus()` 是静默空转，点完空白处焦点就留在 <body>，随后 Delete 不再到达画布。
    focusHost: () =>
      this._focusNode(this._currentNode(this._getNodes()) ?? this._getNodes()[0]),
  });

  get viewport(): ZViewport {
    return { ...this._viewport };
  }

  /** 平移状态本体在 flow-gestures；下划线前缀 = 内部状态，仅供观察（单测断言松手后为 null）。 */
  get _panState(): PanState | null {
    return this._gestures.panState;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // ★ [WHY 宿主**一个 tabindex 都不能有**] 2026-11-16 真机实测（Chrome 141，最小复现
    // 与 z-flow 无关）：shadow 宿主带 `tabindex="-1"` 时，**整棵 light DOM / shadow 子树
    // 会从顺序焦点导航里消失** —— 里面装什么都不能 Tab 到：
    //     宿主无 tabindex → b1 → inner → b2
    //     宿主 tabindex=-1 → b1 → b2          （子树被跳过）
    //     宿主 tabindex=0  → b1 → 宿主 → inner → b2
    // 规范里没有这条，DOM / AX 树也查不出来（元素 checkVisibility 为 true、
    // AX 里 focusable 也是 true），只有真按 Tab 才暴露。**任何「容器可聚焦 + 后代
    // roving」的写法在 Chrome 上都是死的**：焦点永远进不去那一族。
    // 所以「空白处点击把焦点收回画布」不能靠宿主聚焦，改为聚焦当前节点（见 focusHost）。
    this.setAttribute("role", "group");
    this.setAttribute("aria-label", t("flowChart"));

    this.addEventListener("pointerdown", this._onPointerDown);
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("focusin", this._onFocusIn);
    this.addEventListener("wheel", this._onWheel, { passive: false });
    this.addEventListener("z-connect-start", this._onConnectStart);
    this.addEventListener("z-node-dragmove", this._onNodeDragMove);
    this.addEventListener("z-node-dragend", this._onNodeDragEnd);
    this.addEventListener("z-node-click", this._onNodeClick);
    this.addEventListener("z-minimap-navigate", this._onMinimapNavigate);
    this.addEventListener("z-control-zoom-in", this._onZoomIn);
    this.addEventListener("z-control-zoom-out", this._onZoomOut);
    this.addEventListener("z-control-fit-view", this._onFitView);

    // [WHY] slotchange 不冒泡且不 composed，改用 light DOM MutationObserver 覆盖
    // 节点增删/position 变化/内容变化（节点尺寸影响边端点）
    this._observer = new MutationObserver(() => {
      // 节点增删会改变 roving 落点（删掉唯一 tabindex=0 的那个就得补一个），
      // 与边重算同批做 —— 两件事都由「子结构变了」触发，分开监听没意义。
      this._syncTabStops();
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
    // 解析时就写在 light DOM 里的节点不会再触发 observer（observe 之前就存在），补一次
    this._syncTabStops();
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this._onPointerDown);
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("focusin", this._onFocusIn);
    this.removeEventListener("wheel", this._onWheel);
    this.removeEventListener("z-connect-start", this._onConnectStart);
    this.removeEventListener("z-node-dragmove", this._onNodeDragMove);
    this.removeEventListener("z-node-dragend", this._onNodeDragEnd);
    this.removeEventListener("z-node-click", this._onNodeClick);
    this.removeEventListener("z-minimap-navigate", this._onMinimapNavigate);
    this.removeEventListener("z-control-zoom-in", this._onZoomIn);
    this.removeEventListener("z-control-zoom-out", this._onZoomOut);
    this.removeEventListener("z-control-fit-view", this._onFitView);
    this._observer?.disconnect();
    this._resizeObserver?.disconnect();
    this._gestures.dispose();
    super.disconnectedCallback();
  }

  /**
   * [WHY .z-flow__nodes 是 listbox] 节点上的 `aria-selected` 从 2026-08 起就写着，
   * 但它一直**不成立**：该属性只被 gridcell / option / row / tab / treeitem /
   * columnheader / rowheader 这七个 role 支持，而 `z-flow-node` 没有 role ⇒
   * 无障碍树里是 generic，属性被直接忽略（读屏永远不知道哪个节点被选中）。
   * listbox 必须安在「装着节点」的那一层：这里正好只有 `<slot>`，而小地图与控制条
   * 在兄弟节点 .z-flow__overlay 里，不会被打进列表语义。
   */
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

  // ── Public API ─────────────────────────────────────────

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

  /** 给每个节点挂尺寸观察（幂等；新节点由 MutationObserver 触发的重算顺手补上）。 */
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

  // ── 视口 ───────────────────────────────────────────────

  private _applyViewport(): void {
    applyViewportStyles(this._viewportEl, this._bgEl, this._viewport, this.background, this.snapSize);
  }

  private _syncMinimap(): void {
    syncMinimap(this, this._getNodes(), this._viewport);
  }

  /** 视口落笔的唯一出口：写 DOM + 同步 minimap + 合并派发 z-viewport-change。 */
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
    // 普通滚轮放行给页面滚动（与 z-gantt 同一口径，判据在 primitives/wheel-zoom）
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

  // ── 手势事件（实现见 flow-gestures.ts）─────────────────

  private _onPointerDown = (e: PointerEvent): void => this._gestures.onPointerDown(e);

  private _onConnectStart = (e: Event): void => this._gestures.onConnectStart(e);

  /** [WHY] z-connect 可取消：外部 preventDefault 即拒绝本次连线。 */
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

  // ── 选择 / 删除 ────────────────────────────────────────

  private _onNodeClick = (e: Event): void => {
    if (!this.editable) return;
    const detail = (e as CustomEvent<{ id: string; shiftKey?: boolean }>).detail;
    const node = this._nodeById(detail?.id);
    if (!node || !node.selectable) return;
    // 焦点落在被点的节点上（宿主不可聚焦，见 connectedCallback 的实测说明）
    this._focusNode(node);
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

  /**
   * 画布级键盘：焦点在节点间游走（roving tabindex），选择与删除落在焦点节点上。
   *
   * [WHY 这是这一轮的主体] 在此之前画布只有 Delete 一个分支，而 `_selection` 只由
   * pointerdown / 框选建立 —— **键盘用户按 Tab 进画布之后什么也做不了**：选不中任何节点，
   * 于是那个 Delete 分支对他们是死代码（代码里看着"支持删除"，实际永远进不去）。
   *
   * 键位：
   *   ↑↓←→        焦点移到该方向最近的节点（几何最近邻，见 nearestInDirection）
   *   Home / End  第一个 / 最后一个节点（DOM 序，与读屏的阅读序一致）
   *   Enter / 空格 选中焦点节点；Shift + 同键 = 在选中集里切换
   *   Shift+↑↓←→  移动节点（有选中则整组移动，否则移焦点那个）—— 键盘拖拽
   *   Delete / Backspace  删除选中项（沿用既有实现）
   *
   * 只读画布（editable=false）保留前两条：浏览节点是读的功能，删改才是写的功能。
   */
  private _onKeyDown = (e: KeyboardEvent): void => {
    // 节点内部有输入框/可编辑区时，方向键与删除键属于它（改标题、删字符）
    if (isEditingTarget(e)) return;
    const nodes = this._getNodes();
    if (nodes.length === 0) return;

    const key = e.key;
    const vec = DIR_VEC[key];
    if (vec) {
      if (e.shiftKey) {
        if (!this.editable) return;
        // 没有可移动目标时**不** preventDefault：把键还给页面（否则用户以为按坏了）
        if (this._nudgeNodes(vec)) e.preventDefault();
        return;
      }
      const next = this._neighborInDirection(nodes, vec.dir);
      // 该方向没有邻居 ⇒ 不消费这一键。画布边缘按 → 不该吞掉页面的横向滚动/焦点移动。
      if (!next) return;
      e.preventDefault();
      this._focusNode(next);
      return;
    }

    if (key === "Home" || key === "End") {
      e.preventDefault();
      this._focusNode(key === "Home" ? nodes[0] : nodes[nodes.length - 1]);
      return;
    }

    if ((key === "Enter" || key === " ") && this.editable) {
      const cur = this._currentNode(nodes);
      if (!cur || !cur.selectable) return;
      e.preventDefault();
      this._setSelection(nextNodeSelection(this._selection, cur.id, e.shiftKey), false);
      return;
    }

    if (key !== "Delete" && key !== "Backspace") return;
    if (!this.editable) return;
    if (!this._selection.size && !this._selectedEdges.size) return;
    e.preventDefault();
    const cur = this._currentNode(nodes);
    const curAt = cur ? nodes.indexOf(cur) : -1;
    const result = deleteSelection({
      nodes,
      selection: this._selection,
      selectedEdges: this._selectedEdges,
      edges: this.edges,
    });
    if (!result.changed) return;
    this.edges = result.edges;
    this.emit("z-flow-selection-change", {
      nodeIds: [...this._selection],
      edgeIds: [...this._selectedEdges],
    });
    this.emit("z-flow-change", this.getData());
    // [WHY 删完必须补一个焦点] 被删的正是焦点所在节点，它一 `remove()` 焦点就掉到
    // `<body>`，此后的按键都不再冒泡到画布 —— **键盘用户只能删一次**，界面一切正常，
    // 用键盘的人只知道它失灵了。与 z-radio-group 那轮同一个形态（那里是被重渲染换掉）。
    if (curAt >= 0) {
      const rest = this._getNodes();
      const next = rest[Math.min(curAt, rest.length - 1)];
      // 删空了就无处可去：宿主不参与 Tab 也接不住程序化聚焦，焦点落回 body 是对的
      // （没有可操作内容了）。留着「聚焦宿主」的兜底反而是静默空转。
      if (next) this._focusNode(next);
    }
  };

  /** 当前持有焦点的节点（穿透 shadow）；焦点不在任何节点上时返回 null。 */
  private _currentNode(nodes: ZFlowNode[]): ZFlowNode | null {
    const active = deepActiveElement();
    return active ? nodes.find((n) => n === active) ?? null : null;
  }

  /**
   * 方向键的下一个节点。
   *
   * 焦点还不在任何节点上时（Shift+Tab 从控制条退回、或刚 focus 到宿主）按**方向**进场：
   * ↓/→ 落第一个、↑/← 落最后一个 —— 与 z-app-switcher 那轮同一条「顺方向进场」。
   */
  private _neighborInDirection(nodes: ZFlowNode[], dir: FlowDirection): ZFlowNode | null {
    const from = this._currentNode(nodes);
    if (!from) return dir === "up" || dir === "left" ? nodes[nodes.length - 1] : nodes[0];
    const id = nearestInDirection(
      nodeFlowRect(from),
      nodes.filter((n) => n !== from).map((n) => ({ id: n.id, rect: nodeFlowRect(n) })),
      dir,
    );
    return id ? nodes.find((n) => n.id === id) ?? null : null;
  }

  /** 移动节点（Shift+方向键）。返回是否真的移动了。 */
  private _nudgeNodes(vec: { dx: number; dy: number }): boolean {
    const nodes = this._getNodes();
    const cur = this._currentNode(nodes);
    const picked = nodes.filter((n) => this._selection.has(n.id));
    const targets = picked.length ? picked : cur ? [cur] : [];
    if (targets.length === 0) return false;
    const step = this.snapToGrid ? Math.max(1, this.snapSize) : NUDGE_STEP;
    for (const n of targets) {
      const p = parsePosition(n.position) ?? { x: 0, y: 0 };
      n.position = formatPosition({ x: p.x + vec.dx * step, y: p.y + vec.dy * step });
    }
    // 与拖拽 pointerup 之后走同一条路：先重算边，再一次性 emit（不逐帧提交）
    this.refreshEdges();
    this.emit("z-flow-change", this.getData());
    return true;
  }

  /**
   * roving tabindex：候选集里恰好一个节点 `tabindex=0`，其余 `-1`。
   *
   * `prefer` 用于「刚把焦点搬到某个节点」的场景 —— 不传则沿用当前落点，
   * 落点消失（节点被删）时回落到第一个，与 z-tree / z-table 同口径。
   */
  private _syncTabStops(prefer?: ZFlowNode): void {
    const nodes = this._getNodes();
    if (nodes.length === 0) return;
    const keep =
      (prefer && nodes.includes(prefer) ? prefer : null) ??
      this._currentNode(nodes) ??
      nodes.find((n) => n.getAttribute("tabindex") === "0") ??
      nodes[0];
    for (const n of nodes) n.setAttribute("tabindex", n === keep ? "0" : "-1");
  }

  /** 把焦点送到某个节点（先确保它带着 tabindex=0，否则 focus() 静默空转）。 */
  private _focusNode(node: ZFlowNode | null | undefined): void {
    if (!node) return;
    this._syncTabStops(node);
    node.focus({ preventScroll: true });
  }

  /**
   * 焦点落进某个节点时把 roving 落点跟过去。
   *
   * [WHY 需要这一条] 鼠标点节点、或宿主代码 `node.focus()`，都不经过 keydown；
   * 不同步的话下次 Tab 回画布会跳回「上一个落点」，用户觉得点哪都不算数。
   */
  private _onFocusIn = (e: Event): void => {
    const t = e.target as Element | null;
    if (!t || t.tagName !== "Z-FLOW-NODE") return;
    this._syncTabStops(t as ZFlowNode);
  };

  // ── 节点事件 ───────────────────────────────────────────

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

  // ── 节点查询 / 边渲染 ─────────────────────────────────

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
