// <m-grid-item> 宫格项：label 文案加 icon 插槽，badge 显示角标，disabled 置灰。
// [WHY] 宫格单元：把「图标 + 文字 + 角标」这套最常见的入口样子收成一个组件。
// 自己用 div 拼的话，图标尺寸/文字截断/角标定位每个页面都要重来一遍。
import { BaseElement, escapeHtml, html, property, defineElement } from "../../core/index.js";
import mGridItemCSS from "./m-grid-item.css?raw";

export class MGridItem extends BaseElement {
  static styles = mGridItemCSS;

  @property({ type: String }) label = "";
  /** 角标数字/文案；空 = 不显示 */
  @property({ type: String }) badge = "";
  @property({ type: Boolean }) clickable = true;
  @property({ type: Boolean }) disabled = false;

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

  private _activate(): void {
    if (!this.clickable || this.disabled) return;
    this.emit("z-click", { label: this.label });
  }

  private _onClick = (): void => this._activate();

  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    ke.preventDefault();
    this._activate();
  };

  /**
   * 有没有实际给图标。
   *
   * [WHY 要判断] 图标容器是固定的 40×40 方块 + 浅色底，**没有内容时它照样占位**。
   * 只看截图很像「图标加载失败」——用户会去查网络请求，而实际上脚本里就没写图标。
   * 图标（或角标）都没有时不渲染这个容器，标签就居中对齐。
   *
   * 读的是 light DOM（`slot="icon"` 的子节点），声明式写法在 `connectedCallback` 之前
   * 就已解析完毕，所以渲染时能拿到。异步后插图标要手动 `requestUpdate()`。
   */
  private get _hasIconSlot(): boolean {
    return !!this.querySelector('[slot="icon"]');
  }

  render(): string {
    const badge = this.badge
      ? html`<span class="m-grid-item__badge" part="badge">${escapeHtml(this.badge)}</span>`
      : "";
    const role = this.clickable ? 'role="button" tabindex="0"' : "";
    // 角标挂在图标容器里（绝对定位到右上角），所以有角标时容器不能省
    const showIcon = this._hasIconSlot || !!this.badge;
    const icon = showIcon
      ? html`<span class="m-grid-item__icon" part="icon">
          <slot name="icon"></slot>
          ${badge}
        </span>`
      : "";
    return html`
      <div class="m-grid-item${this.disabled ? " m-grid-item--disabled" : ""}" part="root" ${role}>
        ${icon}
        ${this.label ? html`<span class="m-grid-item__label" part="label">${escapeHtml(this.label)}</span>` : ""}
      </div>
    `;
  }
}

defineElement("m-grid-item", MGridItem);
