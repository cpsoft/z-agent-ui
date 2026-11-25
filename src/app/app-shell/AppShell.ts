// <z-app-shell> 后台外壳：header / sidebar / main / footer 四槽布局，collapsed 收起侧栏并发 z-collapse-change。
// [WHY] [[REQ-012]] 后台布局骨架组件族：全视口布局容器（header/sidebar/main/footer 命名槽 + 折叠）
// See: wiki/requirements/REQ-012-admin-layout.md
// [2026-08-11] AI: 初始实现
import { BaseElement, html, property } from "../../core/index.js";
import appShellCSS from "./app-shell.css?raw";

export class ZAppShell extends BaseElement {
  static styles = appShellCSS;

  @property({ type: Boolean }) collapsed = false;

  private _sidebarSlot: HTMLSlotElement | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] 监听器绑在 host，不受 shadow innerHTML 整体替换影响（[[web-components-render-pitfalls]] 陷阱 2）
    // z-sidebar-toggle 需 bubbles+composed 才能从槽内容穿透 shadow 边界到达 host
    this.addEventListener("z-sidebar-toggle", this._onToggle);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-sidebar-toggle", this._onToggle);
    super.disconnectedCallback();
  }

  render(): string {
    return html`
      <header class="z-app-shell__header" part="header">
        <slot name="header"></slot>
      </header>
      <div class="z-app-shell__body" part="body">
        <div class="z-app-shell__sidebar" part="sidebar">
          <slot name="sidebar"></slot>
        </div>
        <main class="z-app-shell__main" part="main">
          <slot name="main"><slot></slot></slot>
        </main>
      </div>
      <footer class="z-app-shell__footer" part="footer">
        <slot name="footer"></slot>
      </footer>
    `;
  }

  updated(): void {
    this._bindSlotChange();
    this._syncSidebar();
  }

  private _onToggle = (): void => {
    this.collapsed = !this.collapsed;
    this.emit("z-collapse-change", { collapsed: this.collapsed });
  };

  // [WHY] 每次渲染 slot 都是新节点，须按节点引用比较重绑（陷阱 2），否则重渲染后监听随旧节点销毁
  private _bindSlotChange(): void {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="sidebar"]');
    if (!slot || slot === this._sidebarSlot) return;
    this._sidebarSlot = slot;
    slot.addEventListener("slotchange", this._onSlotChange);
  }

  // [WHY] 不能 requestUpdate：每次渲染整体替换 innerHTML，新 slot 节点重新分配会再触发 slotchange，
  // 若 handler 触发重渲染则无限循环（真实浏览器必现，happy-dom 不触发因此单测漏网）
  private _onSlotChange = (e: Event): void => {
    this._syncElements((e.target as HTMLSlotElement).assignedElements());
  };

  private _syncSidebar(): void {
    const slot = this._sidebarSlot;
    if (!slot) return;
    this._syncElements(slot.assignedElements());
  }

  private _syncElements(elements: Element[]): void {
    for (const el of elements) {
      // [WHY] tagName 判断避免 import Sidebar.js 强制注册 z-sidebar（树摇分离）
      if (el.tagName.toLowerCase() !== "z-sidebar") continue;
      // [WHY] 槽内容按 Element 声明, 此处按运行时契约收窄到 z-sidebar 的 collapsed
      const sidebar = el as Element & { collapsed: boolean };
      if (sidebar.collapsed !== this.collapsed) sidebar.collapsed = this.collapsed;
    }
  }
}

customElements.define("z-app-shell", ZAppShell);
