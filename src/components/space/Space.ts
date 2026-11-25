// 间距容器：把「子元素之间留白」变成一次声明，而不是每个业务页各写一遍 margin。
//
// [为什么需要它] 令牌（`--z-space-*`）早就有了，但**容器**没有 —— 于是每个页面都在
// `margin-right: var(--z-space-3)` 与 `margin-bottom` 之间做选择，换行时最后一项多出一截，
// 而这一截在 flex-wrap 下无法用 margin 干净地表达（这是 gap 存在的理由）。
//
// [为什么视觉全走 CSS 变量、不靠 attribute 反射] `el.align = "center"` 直接赋值时，
// attribute 的反射时机取决于装饰器实现；而 CSS 属性选择器 `[align="center"]` 只认 attribute。
// 两者一旦不同步，症状是「用 JS 赋值不生效、写 HTML 属性却生效」—— 极难归因。
// 走 `willUpdate` 里同步写 `--_*` 就只有一个入口。
import { BaseElement, html, property } from "../../core/index.js";
// 词汇映射表从 flex 取，而不是各写一份 —— `align="end"` 在两个组件里必须是同一个 CSS 关键字，
// 两份表迟早会漂，而漂了不会报错，只会让两个容器的「end」表现不同。
import { ALIGN_MAP, JUSTIFY_MAP } from "../flex/index.js";
import spaceCSS from "./space.css?raw";

export type ZSpaceSize = "sm" | "md" | "lg";
export type ZSpaceDirection = "horizontal" | "vertical";
export type ZSpaceAlign = "start" | "center" | "end" | "baseline" | "stretch";
export type ZSpaceJustify = "start" | "center" | "end" | "between" | "around";

/**
 * size 档 → 间距令牌。**改档位只改这张表**。
 *
 * 取值 8 / 16 / 24 对齐 Ant Space 的 small / middle / large，也正好是
 * `--z-space-2 / -4 / -6` —— 密度切换时这三个令牌会一起变（compact 8/12/20），
 * 所以「compact 页面的间距」不需要任何额外处理。
 */
const SIZE_GAP: Record<ZSpaceSize, string> = {
  sm: "var(--z-space-2)",
  md: "var(--z-space-4)",
  lg: "var(--z-space-6)",
};

export class ZSpace extends BaseElement {
  static styles = spaceCSS;

  @property({ type: String }) direction: ZSpaceDirection = "horizontal";
  @property({ type: String }) size: ZSpaceSize = "md";
  /** 显式间距，覆盖 `size`。接受 `"12"`（转 12px）或任意 CSS 长度（含 `var(--z-space-3)`）。 */
  @property({ type: String }) gap = "";
  @property({ type: Boolean }) wrap = false;
  /**
   * 占满整行。
   *
   * [为什么是 `block` 而不是 `inline`] Boolean 属性的成立条件是「存在且不为 null」
   * ——`inline="false"` 在 `attributeChangedCallback` 里会被判成 **true**。
   * 所以默认值必须是 false 的那个方向，否则「无属性 = 默认值」这条路走不通。
   */
  @property({ type: Boolean }) block = false;
  @property({ type: String }) align: ZSpaceAlign = "start";
  @property({ type: String }) justify: ZSpaceJustify = "start";

  protected willUpdate(): void {
    const s = this.style;
    s.setProperty("--_display", this.block ? "flex" : "inline-flex");
    s.setProperty("--_dir", this.direction === "vertical" ? "column" : "row");
    s.setProperty("--_wrap", this.wrap ? "wrap" : "nowrap");
    s.setProperty("--_align", ALIGN_MAP[this.align] ?? ALIGN_MAP.start);
    s.setProperty("--_justify", JUSTIFY_MAP[this.justify] ?? JUSTIFY_MAP.start);
    s.setProperty("--_gap", this._gapValue());
  }

  private _gapValue(): string {
    const raw = (this.gap ?? "").trim();
    if (!raw) return SIZE_GAP[this.size] ?? SIZE_GAP.md;
    // 纯数字按像素 —— 与 Ant / Vant 的 `gap="12"` 习惯一致。
    // 其余原样下发，这样 `gap="var(--z-space-8)"` / `gap="1.5rem"` 都能用，
    // 不需要在这里维护一份「合法 CSS 长度」的清单（那清单永远不全）。
    return /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-space", ZSpace);
