// 底部主操作条：移动端「保存 / 提交」那一行。
//
// [为什么需要它] 现在用 `m-floating-button` 漂在右下角 —— 它遮挡内容，且
// 点击区域与拇指落点不一致。底部操作条是移动端表单的标准形态：贴底、满宽、
// 避让安全区（iPhone 的家条）。
//
// [为什么不提供「关闭安全区」的开关] 安全区在 PC 上是 `env(safe-area-inset-bottom)` = 0px，
// 所以「始终避让」在两端都是对的。加一个开关只是多一个可以配错的东西。
// （令牌 `--z-safe-bottom` 已经封装了 env() 与 0px 兜底，这里不再直接写 env()。）
import { BaseElement, html, property, defineElement } from "../../core/index.js";
import barCSS from "./action-bar.css?raw";

export type ZMActionBarAlign = "start" | "center" | "end" | "between";

const JUSTIFY: Record<string, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  between: "space-between",
};

export class ZMActionBar extends BaseElement {
  static styles = barCSS;

  /** 不固定：作为普通区块放在卡片/页面底部（长表单里有时更适合内联）。 */
  @property({ type: Boolean }) inline = false;
  /**
   * 去掉上边框。
   *
   * [为什么叫 `borderless` 而不是 `bordered`] Boolean 属性的成立条件是「存在且不为 null」
   * —— `bordered="false"` 会被判成 **true**。要「默认有边框、可关」，属性名必须是
   * 关闭的那一侧，否则「无属性 = 默认值」这条路走不通。
   */
  @property({ type: Boolean }) borderless = false;
  @property({ type: String }) align: ZMActionBarAlign = "end";

  protected willUpdate(): void {
    const s = this.style;
    s.setProperty("--_pos", this.inline ? "static" : "fixed");
    s.setProperty("--_justify", JUSTIFY[this.align] ?? JUSTIFY.end);
    s.setProperty("--_border", this.borderless ? "none" : "var(--z-color-border)");
    // inline 模式下这些必须一起复位，否则 fixed 的 left/right/bottom:0 会留着
    s.setProperty("--_left", this.inline ? "auto" : "0");
    s.setProperty("--_right", this.inline ? "auto" : "0");
    s.setProperty("--_bottom", this.inline ? "auto" : "0");
    s.setProperty(
      "--_padb",
      this.inline ? "var(--z-space-2)" : "calc(var(--z-space-2) + var(--z-safe-bottom))",
    );
    s.setProperty(
      "--_minh",
      this.inline ? "var(--z-touch-min)" : "calc(var(--z-touch-min) + var(--z-space-4))",
    );
    s.setProperty("--_radius", this.inline ? "var(--z-radius-md)" : "0");
  }

  render(): string {
    return html`
      <div class="z-m-action-bar__left" part="left"><slot name="left"></slot></div>
      <div class="z-m-action-bar__main" part="main"><slot></slot></div>
    `;
  }
}

defineElement("m-action-bar", ZMActionBar);
