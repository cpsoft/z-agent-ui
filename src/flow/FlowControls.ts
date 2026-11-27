// <z-flow-controls> 流程图画布控制条：缩放 / 适应 / 复位按钮，动作以 z-control-* 交给宿主执行。
// [WHY] 缩放控件：按钮点击经 host 委托识别，派发 z-control-* 事件冒泡给 flow
// See: wiki/requirements/REQ-013-node-flow-editor.md
import { BaseElement, escapeAttr, html, t, defineElement } from "../core/index.js";
import controlsCSS from "./controls.css?raw";

const ACTIONS = ["zoom-in", "zoom-out", "fit-view"] as const;

export class ZFlowControls extends BaseElement {
  static styles = controlsCSS;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  render(): string {
    return html`
      <div class="z-flow-controls" part="root">
        <button type="button" class="z-flow-controls__btn" data-action="zoom-in" aria-label="${escapeAttr(t("zoomIn"))}">+</button>
        <button type="button" class="z-flow-controls__btn" data-action="zoom-out" aria-label="${escapeAttr(t("zoomOut"))}">−</button>
        <button type="button" class="z-flow-controls__btn" data-action="fit-view" aria-label="${escapeAttr(t("fitView"))}">⛶</button>
      </div>
    `;
  }

  private _onClick = (e: MouseEvent): void => {
    const path = this._pathOf(e);
    let btn: Element | null = path.find(
      (el): el is Element => el instanceof Element && el.classList?.contains("z-flow-controls__btn"),
    ) ?? null;
    if (!btn) btn = (e.target as Element)?.closest?.(".z-flow-controls__btn") ?? null;
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    if (!action || !(ACTIONS as readonly string[]).includes(action)) return;
    this.emit(`z-control-${action}`, {});
  };

  private _pathOf(e: Event): EventTarget[] {
    try {
      return e.composedPath();
    } catch {
      return [e.target as EventTarget];
    }
  }
}

defineElement("z-flow-controls", ZFlowControls);
