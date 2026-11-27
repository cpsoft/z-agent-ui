// <z-property-panel> 属性面板容器：columns 定列数，disabled / readonly 整体禁用或只读。
import { BaseElement, html, property, defineElement } from "../../core/index.js";
import propertyPanelCSS from "./property-panel.css?raw";

// [WHY] JS 级联而非 CSS：::slotted() 无法写属性，z-* 组件只有自身
// disabled 属性翻转才锁定（见 REQ-008）；属性面板/组本身也需禁用视觉
const FORM_CONTROL_SELECTOR = [
  "z-input", "z-select", "z-switch", "z-checkbox", "z-radio", "z-radio-group",
  "z-button", "z-datepicker", "z-property-row", "z-property-group",
  "input", "select", "textarea", "button",
].join(", ");

// readonly 语义仅对文本控件成立，其余控件用 inert 锁定（保留外观、阻断交互）
const TEXTUAL_SELECTOR = "input, textarea, z-input";

interface SavedState {
  disabled: boolean;
  readonly: boolean;
  inert: boolean;
}

// [WHY] 属性面板容器：columns 经 host 内联 --_z-property-cols 传给组（480px
// 媒体查询可覆盖）；disabled/readonly 级联到后代表单控件，WeakMap 快照原状态
// 以便精确恢复（原先就 disabled 的控件保留），见 REQ-008
// See: wiki/requirements/REQ-008-property-panel.md
export class ZPropertyPanel extends BaseElement {
  static styles = propertyPanelCSS;

  @property({ type: String }) columns = "1";
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) readonly = false;

  private _saved = new WeakMap<Element, SavedState>();
  private _observer?: MutationObserver;

  connectedCallback(): void {
    super.connectedCallback();
    this._observer = new MutationObserver(() => this._applyFormState());
    this._observer.observe(this, { childList: true, subtree: true });
  }

  disconnectedCallback(): void {
    this._observer?.disconnect();
    this._observer = undefined;
    this._restoreAll();
    super.disconnectedCallback();
  }

  updated(): void {
    this._applyColumns();
    this._applyFormState();
  }

  render(): string {
    return html`
      <div class="z-property-panel" part="root">
        <slot></slot>
      </div>
    `;
  }

  private _applyColumns(): void {
    const value = this.columns.trim().toLowerCase();
    let cols: string;
    if (value === "auto") {
      cols = "repeat(auto-fill, minmax(160px, 1fr))";
    } else {
      const n = parseInt(value, 10);
      const clamped = Number.isNaN(n) ? 1 : Math.min(6, Math.max(1, n));
      cols = `repeat(${clamped}, minmax(0, 1fr))`;
    }
    // [WHY] 不加 !important：窄屏媒体查询需能覆盖内联值
    this.style.setProperty("--_z-property-cols", cols);
  }

  // [WHY] 只动后代、不动自身属性，避免 requestUpdate 循环；重复执行幂等
  private _applyFormState(): void {
    const els = this.querySelectorAll(FORM_CONTROL_SELECTOR);
    for (const el of els) {
      const state = this._getState(el);
      const tag = el.tagName.toLowerCase();

      if (tag === "z-property-group") {
        // 组只做禁用视觉（表头原生 disabled 由组自身属性接管）；只读不锁表头
        if (this.disabled) {
          if (!state.disabled) el.setAttribute("disabled", "");
        } else if (!state.disabled) {
          el.removeAttribute("disabled");
        }
        continue;
      }

      if (this.disabled) {
        if (!state.disabled) el.setAttribute("disabled", "");
      } else if (!state.disabled) {
        el.removeAttribute("disabled");
      }

      if (this.readonly) {
        if (el.matches(TEXTUAL_SELECTOR)) {
          if (!state.readonly) el.setAttribute("readonly", "");
        } else if (!state.inert) {
          el.setAttribute("inert", "");
        }
      } else {
        if (!state.readonly) el.removeAttribute("readonly");
        if (!state.inert) el.removeAttribute("inert");
      }
    }
  }

  private _getState(el: Element): SavedState {
    let state = this._saved.get(el);
    if (!state) {
      state = {
        disabled: el.hasAttribute("disabled"),
        readonly: el.hasAttribute("readonly"),
        inert: el.hasAttribute("inert"),
      };
      this._saved.set(el, state);
    }
    return state;
  }

  private _restoreAll(): void {
    const els = this.querySelectorAll(FORM_CONTROL_SELECTOR);
    for (const el of els) {
      const state = this._saved.get(el);
      if (!state) continue;
      if (!state.disabled) el.removeAttribute("disabled");
      if (!state.readonly) el.removeAttribute("readonly");
      if (!state.inert) el.removeAttribute("inert");
      this._saved.delete(el);
    }
  }
}

defineElement("z-property-panel", ZPropertyPanel);
