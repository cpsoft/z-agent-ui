// 吸顶容器：表头吸顶、筛选条吸顶。
//
// [为什么是 `position: sticky` 而不是 Ant Affix 那套 scroll 监听 + fixed 切换]
// Affix 需要「监听滚动 → 算位置 → 切 fixed → 补占位高度防止跳动」，四步都有边界情况
// （容器滚动、resize、缩放）。sticky 是浏览器原生实现，零 JS、零重排，
// 而且天然只在**最近的滚动祖先**内生效 —— 这正是「表头在表格容器里吸顶」要的语义。
// 代价是父链上不能有 `overflow: hidden`（那会让 sticky 失效且**没有任何报错**）——
// 这个坑写在 CSS 注释里，因为它在组件层无法检测。
import { BaseElement, html, property } from "../../core/index.js";
import stickyCSS from "./sticky.css?raw";

export class ZSticky extends BaseElement {
  static styles = stickyCSS;

  /** 距视口（或滚动容器）顶部多少像素开始吸。 */
  @property({ type: Number }) offsetTop = 0;
  /** 距底部多少像素开始吸。> 0 时**改用 bottom**，此时 offsetTop 不再生效（两者语义冲突）。 */
  @property({ type: Number }) offsetBottom = 0;
  @property({ type: Boolean }) disabled = false;
  /** 吸顶时的层级。默认 1 —— 只需压住同一滚动容器里的内容，不是浮层档位。 */
  @property({ type: Number }) zIndex = 1;

  protected willUpdate(): void {
    const s = this.style;
    const bottom = Math.floor(Number(this.offsetBottom));
    const top = Math.floor(Number(this.offsetTop));
    const useBottom = Number.isFinite(bottom) && bottom > 0;

    s.setProperty("--_pos", this.disabled ? "static" : "sticky");
    // 两个方向只能生效一个：同时设 top 与 bottom 会让元素被钉在两者之间，
    // 看起来像「吸住但位置诡异」，而浏览器不会报错。
    s.setProperty("--_top", useBottom ? "auto" : `${Number.isFinite(top) ? top : 0}px`);
    s.setProperty("--_bottom", useBottom ? `${bottom}px` : "auto");
    const z = Math.floor(Number(this.zIndex));
    s.setProperty("--_z", String(Number.isFinite(z) ? z : 1));
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-sticky", ZSticky);
