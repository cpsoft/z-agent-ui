// <m-grid> 宫格：columns 定每行列数，子项 m-grid-item 按它均分；framed 画卡片式外框。
// [WHY] 移动端宫格：首页功能入口、快捷操作都用它。用一条「列数」属性代替让使用方自己写
// grid-template-columns —— 后者会让 4 列宫格在 5 个页面里出现 4 种间距。
import { BaseElement, html, property } from "../../core/index.js";
import mGridCSS from "./m-grid.css?raw";

export class MGrid extends BaseElement {
  static styles = mGridCSS;

  /** 每行列数。默认 4（最常见的功能入口） */
  @property({ type: Number }) columns = 4;
  /** 是否画外框（卡片式宫格） */
  @property({ type: Boolean }) framed = false;

  render(): string {
    // [WHY 列数走内联变量] 列数是数据（脚本/属性给的），不是主题；写进 CSS 类会退化成
    // 「只支持 2/3/4 三档」。用变量后任意列数都成立，且 CSS 里只写一次规则。
    const cols = this.columns > 0 ? this.columns : 4;
    return html`
      <div class="m-grid${this.framed ? " m-grid--framed" : ""}" part="root" style="--m-grid-cols:${cols}">
        <slot></slot>
      </div>
    `;
  }
}

customElements.define("m-grid", MGrid);
