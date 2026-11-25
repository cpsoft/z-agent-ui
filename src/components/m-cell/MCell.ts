// <m-cell> 列表单元：label / value / desc 三段文案，arrow 显示右侧箭头，divider 画分隔线。
// [WHY] 移动端单元格：H5 里 80% 的「一行」都是它 —— 设置项、表单行、列表项、导航入口。
// 它的价值不是样式，而是**把可点区域、键盘路径、右侧指示器收成一个约定**：
// 各处自己写 div 的后果是「有的行高 40、有的 48，有的能点、有的点了没反应」，
// 而后者在手机上无法用 hover 自救。
//
// 只上报 z-click，不做跳转（与 ADR-004 一致：组件不决定去哪）。
import { BaseElement, escapeHtml, html, property } from "../../core/index.js";
import mCellCSS from "./m-cell.css?raw";

export class MCell extends BaseElement {
  static styles = mCellCSS;

  /** 左侧主文案 */
  @property({ type: String }) label = "";
  /** 右侧值文案（`value` 与默认插槽同时给时，插槽优先 —— 插槽能放开关、头像这类复合内容） */
  @property({ type: String }) value = "";
  /** 主文案下的次要说明 */
  @property({ type: String }) desc = "";
  /** 右侧箭头（可点入口的视觉约定） */
  @property({ type: Boolean }) arrow = false;
  /** 可点：决定 role / tabindex / 事件；不写它就是一行纯展示 */
  @property({ type: Boolean }) clickable = false;
  /** 与下一条之间的分隔线。分组里由 m-cell-group 自动加，单独使用时自己开 */
  @property({ type: Boolean }) divider = false;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY 委托到 shadowRoot] render 每次重建子节点，绑在具体节点上的监听会随旧节点一起丢掉；
    // 事件冒泡到 shadowRoot 时新节点照样能命中。
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    super.disconnectedCallback();
  }

  private _onClick = (): void => {
    if (!this.clickable) return;
    this.emit("z-click", { label: this.label, value: this.value });
  };

  // [WHY] 声明了 role=button 就必须给键盘路径：读屏会宣布它是按钮，
  // 用户按回车没反应比不写 role 更糟。
  private _onKeyDown = (e: Event): void => {
    if (!this.clickable) return;
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    ke.preventDefault();
    this._onClick();
  };

  render(): string {
    const value = this.value ? escapeHtml(this.value) : "";
    const desc = this.desc ? html`<span class="m-cell__desc" part="desc">${escapeHtml(this.desc)}</span>` : "";
    const arrow = this.arrow
      ? html`<span class="m-cell__arrow" part="arrow" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>`
      : "";

    const attrs = this.clickable
      ? html`role="button" tabindex="0"`
      : "";

    return html`
      <div class="m-cell${this.clickable ? " m-cell--clickable" : ""}" part="root" ${attrs}>
        <slot name="prefix"></slot>
        <div class="m-cell__main">
          <span class="m-cell__label" part="label">${escapeHtml(this.label)}</span>
          ${desc}
        </div>
        <div class="m-cell__value" part="value"><slot>${value}</slot></div>
        ${arrow}
      </div>
    `;
  }
}

customElements.define("m-cell", MCell);
