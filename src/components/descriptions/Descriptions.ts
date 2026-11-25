// 只读键值展示：详情页的「字段名 / 字段值」网格。
//
// [为什么需要它] 详情页现在只能拿 `z-form` + disabled 假装 —— 那带来了三样不想要的东西：
// 可聚焦的输入框、表单的校验态、以及「看起来能改但其实不能」的误导。
//
// [为什么用子件而不是 `items` 数组] 数组属性在 HTML 里只能写成 JSON 字符串
// （`items='[{"label":"门店","value":"A-1024"}]'`），一是难读，二是 value 里出现引号就要转义地狱，
// 三是没法在 value 里放组件（一个状态角标、一个链接）。子件两样都能。
// See: D-L1-3 的原则 —— 事实层求机械可验证，结构层求人能读懂。
import { BaseElement, html, property } from "../../core/index.js";
import descriptionsCSS from "./descriptions.css?raw";

export class ZDescriptions extends BaseElement {
  static styles = descriptionsCSS;

  /** 一行几列。默认 3（详情页最常见的密度）。 */
  @property({ type: Number }) column = 3;
  /** 带边框（表格观感，密集数据时更容易横向对齐）。 */
  @property({ type: Boolean }) bordered = false;
  /** 紧凑：减小行距，用于字段很多的详情页。 */
  @property({ type: Boolean }) compact = false;

  protected willUpdate(): void {
    const s = this.style;
    const n = Math.floor(Number(this.column));
    // 与 z-grid 同一个坑：`repeat(0, …)` 是无效值，整条声明会被丢弃 ⇒ 退化成单列，
    // 而视觉上「只是变窄了」，不会报错。
    s.setProperty("--_col", String(Number.isFinite(n) && n > 0 ? n : 3));
    // 边框靠「grid gap 露出底色」实现，两个变量必须一起设：
    // 只设 gap 会露出页面白底（等于没有线），只设底色会得到一整块实色。
    s.setProperty("--_gap", this.bordered ? "1px" : "0");
    s.setProperty("--_bg", this.bordered ? "var(--z-color-border)" : "transparent");
    // padding 由父算好、子继承 —— 这样 `compact` 只需要在父组件里判断一次
    const padY = this.compact ? "var(--z-space-1)" : "var(--z-space-2)";
    s.setProperty(
      "--_pad",
      this.bordered ? `${padY} var(--z-space-3)` : `${padY} 0`,
    );
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-descriptions", ZDescriptions);
