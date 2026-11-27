// <z-breadcrumb> 面包屑：items 渲染层级路径、separator 定分隔符，点某一级发 z-select。
// [WHY] [[REQ-012]] 后台布局骨架组件族：面包屑导航，items 属性驱动 + aria-current + z-select 事件
// See: wiki/requirements/REQ-012-admin-layout.md
// [2026-08-11] AI: 初始实现
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import breadcrumbCSS from "./breadcrumb.css?raw";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export class ZBreadcrumb extends BaseElement {
  static styles = breadcrumbCSS;

  @property({ type: Array, attribute: false }) items: BreadcrumbItem[] = [];
  @property({ type: String }) separator = "/";

  private _navEl: HTMLElement | null = null;

  render(): string {
    const items = this.items;
    const parts: string[] = [];
    items.forEach((item, i) => {
      const isLast = i === items.length - 1;
      const label = escapeAttr(item.label);
      const sep = i > 0
        ? `<span class="z-breadcrumb__sep" part="separator" aria-hidden="true">${escapeAttr(this.separator)}</span>`
        : "";
      let inner: string;
      if (isLast) {
        inner = `<span class="z-breadcrumb__current" part="current" aria-current="page">${label}</span>`;
      } else if (item.href) {
        inner = `<a class="z-breadcrumb__link" part="link" href="${escapeAttr(item.href)}" data-index="${i}">${label}</a>`;
      } else {
        inner = `<span class="z-breadcrumb__text">${label}</span>`;
      }
      parts.push(`<li part="item">${sep}${inner}</li>`);
    });
    return html`<nav class="z-breadcrumb" part="root" aria-label="breadcrumb"><ol class="z-breadcrumb__list" part="list">${parts.join("")}</ol></nav>`;
  }

  updated(): void {
    // [WHY] 监听器绑 shadow 内 nav 节点：渲染整体替换 innerHTML，须按节点引用比较重绑（[[web-components-render-pitfalls]] 陷阱 2）
    const nav = this.shadowRoot!.querySelector<HTMLElement>(".z-breadcrumb");
    if (!nav || nav === this._navEl) return;
    this._navEl = nav;
    nav.addEventListener("click", this._onClick);
  }

  private _onClick = (e: Event): void => {
    const link = (e.target as HTMLElement).closest<HTMLElement>("a[part='link']");
    if (!link) return;
    const index = Number(link.dataset.index);
    const item = this.items[index];
    if (!item) return;
    this.emit("z-select", { item, index });
  };

}

defineElement("z-breadcrumb", ZBreadcrumb);
