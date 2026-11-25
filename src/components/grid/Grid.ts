// 12 栅格容器。响应式的底线 —— 在此之前，所有页面都在手写 `display: grid` 与列宽。
//
// [为什么保留 z-grid-col 这个子件，而不是只给 z-grid 一个 `cols` 属性]
// 「等分」与「跨列」是两件事：等分是**容器**的规则（`grid-template-columns`），
// 跨列/偏移是**子项**的规则（`grid-column`）。合成一个组件只能靠 `<z-grid-item span="6">`
// 这样的子标签，那和两个标签没有区别，反而让「容器」和「子项」的职责混在一个类里。
//
// [为什么断点用字面量而不是令牌] CSS 的 `@media` 条件**不接受 `var()`**。
// 四个断点值与 tokens.css 顶部注释里的 `--z-breakpoint-*` 一致（640 / 768 / 1024 / 1280），
// 但这里只能写死。改断点时要同时改两处 —— 这是 CSS 的现实限制，不是偷懒；
// 写在注释里是为了让下一个人知道「还有另一处」。
import { BaseElement, html, property } from "../../core/index.js";
import { ALIGN_MAP } from "../flex/index.js";
import gridCSS from "./grid.css?raw";

export class ZGrid extends BaseElement {
  static styles = gridCSS;

  /** 等分列数。默认 12（业界事实标准，也是 antd / bootstrap 的口径）。 */
  @property({ type: Number }) cols = 12;
  /** 列间距 + 行间距。空 = `--z-space-4`。纯数字按像素。 */
  @property({ type: String }) gap = "";
  @property({ type: String }) align = "stretch";

  protected willUpdate(): void {
    const s = this.style;
    // cols 只接受正整数：`repeat(0, 1fr)` 是无效值，整条声明会被丢弃 ⇒ 退化成单列，
    // 而这在视觉上「看起来只是窄了」，不会有任何报错。
    const n = Math.floor(Number(this.cols));
    s.setProperty("--_cols", String(Number.isFinite(n) && n > 0 ? n : 12));
    s.setProperty("--_align", ALIGN_MAP[this.align] ?? ALIGN_MAP.stretch);
    const raw = (this.gap ?? "").trim();
    s.setProperty(
      "--_gap",
      !raw ? "var(--z-space-4)" : /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw,
    );
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-grid", ZGrid);
