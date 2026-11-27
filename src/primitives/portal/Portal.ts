// <z-portal> 把子节点投递到 target（默认 body）—— L0 原语，不直接面向业务。
// [WHY 引 core/index 而非包门面] 门面是给外界的；L0 内部经由它取符号会导致「门面改一行、L0 跟着抖」，且 core 单独打包时这行指向包外。
import { BaseElement, property, defineElement } from "../../core/index.js";
import { resolveDomRef } from "../domRef.js";

/**
 * `<z-portal>` renders its slotted children to a target DOM node
 * (default `<body>`), outside the component's original DOM position.
 *
 * Useful for modals, dropdowns, tooltips — anything that needs to break
 * out of overflow:hidden or z-index stacking contexts.
 */
export class ZPortal extends BaseElement {
  @property({ type: String }) target = "body";

  private _container: HTMLDivElement | null = null;
  private _observer: MutationObserver | null = null;

  render(): null {
    return null; // Portal has no shadow content — it teleports light DOM
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._moveChildren();
    this._observer = new MutationObserver(() => this._moveChildren());
    this._observer.observe(this, { childList: true });
  }

  disconnectedCallback(): void {
    this._observer?.disconnect();
    this._restoreChildren();
    super.disconnectedCallback();
  }

  private _moveChildren(): void {
    const targetEl = this._resolveTarget();
    if (!targetEl) return;

    if (!this._container) {
      this._container = document.createElement("div");
      this._container.style.display = "contents";
      this._container.setAttribute("data-z-portal", "");
      targetEl.appendChild(this._container);
    }

    while (this.childNodes.length > 0) {
      this._container.appendChild(this.childNodes[0]);
    }
  }

  private _restoreChildren(): void {
    if (this._container) {
      while (this._container.childNodes.length > 0) {
        this.appendChild(this._container.childNodes[0]);
      }
      this._container.remove();
      this._container = null;
    }
  }

  private _resolveTarget(): HTMLElement | null {
    if (this.target === "body") return document.body;
    // [WHY 走 resolveDomRef] `target` 是宿主写的字符串，非法选择器会让
    // connectedCallback 抛异常 ⇒ 元素升级失败、子树永远不传送（D-L0-5）。
    return resolveDomRef(this.target);
  }
}

defineElement("z-portal", ZPortal);
