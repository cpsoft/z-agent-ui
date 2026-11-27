// flex 布局原语：AI 生成布局的第一块积木。
//
// [为什么和 z-space 两个都有] 两者的分工是「原语 vs 语义糖」，不是重复：
//   · z-flex 是**布局容器**：决定方向、对齐、换行，`gap` 只接受长度（默认 0）。
//     你要的是「这一行怎么排」，它不猜。
//   · z-space 是**间距容器**：只解决「子元素之间留多大空」，用 `size="sm|md|lg"`
//     这种相对档位（跟着密度令牌走）。它默认 inline、默认 start 对齐 —— 因为它服务的是
//     「一行图标 + 文字」这种局促场景，不是页面骨架。
// 把两者合成一个组件就得加一堆「只有某模式下有意义」的属性，那是另一个方向的复杂。
//
// [为什么对齐只认这几个词] Ant / Tailwind / CSS 各有各的写法（start/flex-start/left），
// 这里统一成 `start|center|end|between|around|evenly`，由 ALIGN_MAP 翻译成 CSS 关键字。
// 只认一套词汇的收益：写页面的人不需要在两套命名之间切换。
import { BaseElement, html, property, defineElement } from "../../core/index.js";
import flexCSS from "./flex.css?raw";

export type ZFlexDirection = "row" | "column" | "row-reverse" | "column-reverse";
export type ZFlexJustify = "start" | "center" | "end" | "between" | "around" | "evenly";
export type ZFlexAlign = "start" | "center" | "end" | "baseline" | "stretch";

/**
 * 词汇 → CSS 关键字。
 *
 * [为什么导出] `z-space` 用的是同一套词汇，它从 `../flex/index.js` 引这张表 ——
 * 两份各自维护的映射表迟早会漂（改一处漏一处不会报错，只会让两个组件的 `align="end"`
 * 表现不同）。
 */
export const ALIGN_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  baseline: "baseline",
  stretch: "stretch",
};

export const JUSTIFY_MAP: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
  around: "space-around",
  evenly: "space-evenly",
};

export class ZFlex extends BaseElement {
  static styles = flexCSS;

  @property({ type: String }) direction: ZFlexDirection = "row";
  /** 长度。空 = 0。纯数字按像素（`gap="12"` → 12px），其余原样下发。 */
  @property({ type: String }) gap = "";
  @property({ type: String }) justify: ZFlexJustify = "start";
  @property({ type: String }) align: ZFlexAlign = "stretch";
  @property({ type: Boolean }) wrap = false;
  /** 行内 flex（不像块级那样占满整行）。 */
  @property({ type: Boolean }) inline = false;

  protected willUpdate(): void {
    const s = this.style;
    s.setProperty("--_display", this.inline ? "inline-flex" : "flex");
    s.setProperty("--_dir", this.direction);
    s.setProperty("--_wrap", this.wrap ? "wrap" : "nowrap");
    s.setProperty("--_align", ALIGN_MAP[this.align] ?? ALIGN_MAP.stretch);
    s.setProperty("--_justify", JUSTIFY_MAP[this.justify] ?? JUSTIFY_MAP.start);
    s.setProperty("--_gap", this._gapValue());
  }

  private _gapValue(): string {
    const raw = (this.gap ?? "").trim();
    if (!raw) return "0";
    return /^\d+(\.\d+)?$/.test(raw) ? `${raw}px` : raw;
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

defineElement("z-flex", ZFlex);
