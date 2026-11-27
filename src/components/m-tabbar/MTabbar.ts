// <m-tabbar> 底部标签栏：items 给标签、active 由宿主控制，点击发 z-change。
// [WHY] 移动端底部 TabBar：受控（active 由宿主给），点击只派发 z-change。
// 标签/角标来自配置或数据，插值必须转义 —— html`` 不做自动转义。
import { BaseElement, html, property, escapeHtml, escapeAttr, defineElement } from "../../core/index.js";
import mTabbarCSS from "./m-tabbar.css?raw";

export interface TabbarItem {
  key: string;
  label: string;
  /** 图标：允许传 SVG 片段字符串（故**不转义**，是本组件唯一接受原始 HTML 的入口）。 */
  icon?: string;
  badge?: string | number;
}

export class MTabbar extends BaseElement {
  static styles = mTabbarCSS;

  @property({ type: Array }) items: TabbarItem[] = [];
  @property({ type: String }) active: string = "";

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  private _activate(itemEl: HTMLElement | null): void {
    const key = itemEl?.dataset.key;
    if (!key || key === this.active) return;
    const item = this.items.find((i) => i.key === key);
    if (!item) return;
    this.active = key;
    this.emit("z-change", { key, item });
  }

  private _onClick = (e: Event): void => {
    this._activate((e.target as HTMLElement).closest("[data-key]") as HTMLElement | null);
  };

  // [WHY] 形参声明为 Event：ShadowRoot.addEventListener 在本仓 tsconfig 下只重载了 "slotchange"。
  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    ke.preventDefault();
    this._activate((e.target as HTMLElement).closest("[data-key]") as HTMLElement | null);
  };

  render(): string {
    const itemsHtml = this.items.map((item) => {
      const isActive = item.key === this.active;
      const cls = ["m-tabbar__item", isActive ? "m-tabbar__item--active" : ""]
        .filter(Boolean)
        .join(" ");

      return html`
        <div class="${cls}" data-key="${escapeAttr(item.key)}" part="item" role="tab" tabindex="0" aria-selected="${isActive ? "true" : "false"}">
          <span class="m-tabbar__icon-wrap" part="icon-wrap">
            <span class="m-tabbar__icon" part="icon">${item.icon || ""}</span>
            ${item.badge ? html`<span class="m-tabbar__badge" part="badge">${escapeHtml(String(item.badge))}</span>` : ""}
          </span>
          <span class="m-tabbar__label" part="label">${escapeHtml(item.label || "")}</span>
        </div>
      `;
    });

    return html`<div class="m-tabbar" part="root" role="tablist">${itemsHtml}</div>`;
  }
}

defineElement("m-tabbar", MTabbar);
