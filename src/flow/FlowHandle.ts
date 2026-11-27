// <z-flow-handle> 流程节点连接桩：id / type / position 描述方位与方向，connectable 决定能否从这里起线。
// [WHY] 连接把手：发起连线手势，目标 handle 检测由 flow 在 pointerup 时处理
// See: wiki/requirements/REQ-013-node-flow-editor.md
import { BaseElement, property, defineElement } from "../core/index.js";
import handleCSS from "./handle.css?raw";

export interface FlowConnectStartDetail {
  sourceId: string;
  sourceHandle: string;
  handle: ZFlowHandle;
}

export class ZFlowHandle extends BaseElement {
  static styles = handleCSS;

  @property({ type: String }) id = "";
  @property({ type: String }) type: "source" | "target" = "source";
  @property({ type: String }) position: "top" | "right" | "bottom" | "left" = "right";
  @property({ type: Boolean }) connectable = true;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("pointerdown", this._onPointerDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener("pointerdown", this._onPointerDown);
    super.disconnectedCallback();
  }

  render(): string {
    // 空字符串触发 styles 注入，视觉由 :host 样式承担
    return "";
  }

  updated(): void {
    // [WHY] Boolean 属性 reflect 用属性存在性表达，无法用 [attr="false"] 选择器，
    // 禁用态用 host class 承载（见 css-specificity-override lesson）
    this.classList.toggle("z-flow-handle--disabled", !this.connectable);
  }

  private _onPointerDown = (e: PointerEvent): void => {
    // [WHY] 不 setPointerCapture：捕获会把后续 pointerup 重定向到源 handle，
    // 目标 handle 的 composedPath 检测失效（REQ-013 关键决策）
    if (!this.connectable || e.button !== 0) return;
    const node = this.closest("z-flow-node");
    if (!node) return;
    this.emit<FlowConnectStartDetail>("z-connect-start", {
      sourceId: node.id,
      sourceHandle: this.id,
      handle: this,
    });
  };
}

defineElement("z-flow-handle", ZFlowHandle);
