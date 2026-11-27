// [WHY] 槽位式节点：拖拽自持（pointer 事件 + zoom 换算），
// move 期直接 style 突变，pointerup 一次性提交 position（commit-on-end，REQ-013）
// See: wiki/requirements/REQ-013-node-flow-editor.md
import { BaseElement, html, property, defineElement } from "../core/index.js";
import { formatPosition, parsePosition, type ZPosition } from "./shared.js";
import { ZFlowHandle } from "./FlowHandle.js";
import nodeCSS from "./node.css?raw";

export interface FlowNodeDragDetail {
  id: string;
  position: ZPosition;
}

export class ZFlowNode extends BaseElement {
  static styles = nodeCSS;

  @property({ type: String }) id = "";
  @property({ type: String }) position = "0,0";
  @property({ type: String }) type: "default" | "input" | "output" = "default";
  @property({ type: Boolean }) draggable = true;
  @property({ type: Boolean }) selectable = true;
  @property({ type: Boolean }) connectable = true;
  @property({ type: Boolean }) deletable = true;
  // [WHY] reflect:false：每次选择变化写 attribute 会触发二次渲染（web-components-render-pitfalls）
  @property({ type: Boolean, reflect: false }) selected = false;

  private _dragging = false;
  private _dragMoved = false;
  private _dragStartClient = { x: 0, y: 0 };
  private _dragStartPos: ZPosition = { x: 0, y: 0 };
  private _lastPos: ZPosition = { x: 0, y: 0 };
  private _pointerDownShift = false;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY option] `aria-selected` 只被 7 个 role 支持（gridcell/option/row/tab/treeitem/
    // columnheader/rowheader），宿主没有 role 时它是 generic ⇒ 属性被无障碍树直接忽略，
    // 读屏永远不知道哪个节点被选中。父 canvas 的 .z-flow__nodes 是 listbox，
    // 这里对位的 role 就是 option。
    this.setAttribute("role", "option");
    this.addEventListener("pointerdown", this._onPointerDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this._onPointerDown);
    this._endDragListeners();
    super.disconnectedCallback();
  }

  render(): string {
    const classes = ["z-flow-node__box"];
    if (this.selected) classes.push("z-flow-node__box--selected");
    if (this.type === "input" || this.type === "output") {
      classes.push(`z-flow-node__box--${this.type}`);
    }
    return html`
      <div class="${classes.join(" ")}" part="node">
        <slot></slot>
      </div>
    `;
  }

  updated(): void {
    const pos = parsePosition(this.position) ?? { x: 0, y: 0 };
    this.style.left = `${pos.x}px`;
    this.style.top = `${pos.y}px`;
    this.classList.toggle("z-flow-node--no-drag", !this.draggable);
    // [WHY] aria-selected 不在 observedAttributes，手动 setAttribute 不会触发重渲染
    this.setAttribute("aria-selected", String(this.selected));
  }

  private get _zoom(): number {
    const flow = this.closest("z-flow") as { viewport?: { zoom: number } } | null;
    return flow?.viewport?.zoom ?? 1;
  }

  // [WHY] 网格吸附（2026-08-12）：从父 z-flow 读取 snapToGrid/snapSize 属性，
  // 拖拽时将坐标对齐到网格整数倍，视觉上节点边缘贴合网格线
  private get _snapInfo(): { snap: boolean; size: number } {
    const flow = this.closest("z-flow") as { snapToGrid?: boolean; snapSize?: number } | null;
    return {
      snap: !!flow?.snapToGrid,
      size: flow?.snapSize ?? 20,
    };
  }

  private _snap(pos: ZPosition): ZPosition {
    const si = this._snapInfo;
    if (!si.snap || si.size <= 0) return pos;
    return {
      x: Math.round(pos.x / si.size) * si.size,
      y: Math.round(pos.y / si.size) * si.size,
    };
  }

  private _onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0 || !this.draggable) return;
    const flow = this.closest("z-flow") as { editable: boolean } | null;
    if (flow && !flow.editable) return;
    // [WHY] 连线手势（handle 上的 pointerdown）不触发拖拽；用 composedPath 探测而非
    // stopPropagation，避免破坏 handle 事件冒泡（REQ-013 关键决策）
    if (e.composedPath().some((el) => el instanceof ZFlowHandle)) return;
    e.preventDefault();

    this._dragging = true;
    this._dragMoved = false;
    this._pointerDownShift = e.shiftKey;
    this._dragStartClient = { x: e.clientX, y: e.clientY };
    this._dragStartPos = parsePosition(this.position) ?? { x: 0, y: 0 };
    this._lastPos = { ...this._dragStartPos };
    this.classList.add("z-flow-node--dragging");

    // [WHY] 拖拽监听挂 window（move/up 可能在 host 外），处理器存字段便于精确注销
    window.addEventListener("pointermove", this._onDragMove);
    window.addEventListener("pointerup", this._onDragUp);
    window.addEventListener("pointercancel", this._onDragUp);

    this.emit<FlowNodeDragDetail>("z-node-dragstart", {
      id: this.id,
      position: { ...this._dragStartPos },
    });
  };

  private _onDragMove = (e: PointerEvent): void => {
    if (!this._dragging) return;
    const dx = e.clientX - this._dragStartClient.x;
    const dy = e.clientY - this._dragStartClient.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) this._dragMoved = true;
    this._lastPos = this._snap({
      x: this._dragStartPos.x + dx / this._zoom,
      y: this._dragStartPos.y + dy / this._zoom,
    });
    // 拖拽期不调 requestUpdate，直接 style 突变（与 render 携带的 left/top 收敛）
    this.style.left = `${this._lastPos.x}px`;
    this.style.top = `${this._lastPos.y}px`;
    this.emit<FlowNodeDragDetail>("z-node-dragmove", {
      id: this.id,
      position: { ...this._lastPos },
    });
  };

  private _onDragUp = (): void => {
    if (!this._dragging) return;
    this._dragging = false;
    this.classList.remove("z-flow-node--dragging");
    this._endDragListeners();
    if (!this.isConnected) return;
    if (this._dragMoved) {
      // commit-on-end：一次性提交 position（reflect 写 attribute），避免每帧反射刷 DOM
      this.position = formatPosition(this._lastPos);
      this.emit<FlowNodeDragDetail>("z-node-dragend", {
        id: this.id,
        position: { ...this._lastPos },
      });
    } else {
      this.emit<FlowNodeDragDetail & { shiftKey: boolean }>("z-node-click", {
        id: this.id,
        position: { ...this._lastPos },
        shiftKey: this._pointerDownShift,
      });
    }
  };

  private _endDragListeners(): void {
    window.removeEventListener("pointermove", this._onDragMove);
    window.removeEventListener("pointerup", this._onDragUp);
    window.removeEventListener("pointercancel", this._onDragUp);
  }
}

defineElement("z-flow-node", ZFlowNode);
