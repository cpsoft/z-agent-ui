// <z-sidebar> 侧栏：collapsed 收起成图标条，默认槽放菜单、footer 槽放底部区。
// [WHY] [[REQ-012]] 后台布局骨架组件族：可折叠侧边栏面板，独立可用（不依赖 app-shell）
// See: wiki/requirements/REQ-012-admin-layout.md
// [2026-08-11] AI: 初始实现
import { BaseElement, html, property, defineElement } from "../../core/index.js";
import sidebarCSS from "./sidebar.css?raw";

export class ZSidebar extends BaseElement {
  static styles = sidebarCSS;

  @property({ type: Boolean }) collapsed = false;

  render(): string {
    return html`
      <aside class="z-sidebar" part="root">
        <div class="z-sidebar__content" part="content">
          <slot></slot>
        </div>
        <div class="z-sidebar__footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </aside>
    `;
  }
}

defineElement("z-sidebar", ZSidebar);
