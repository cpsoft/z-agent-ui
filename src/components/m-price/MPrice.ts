// <m-price> 价格：符号小、整数大、小数小，可选划线价与后缀。
//
// [WHY 单独一个组件而不是让每个页面拼 span] 同一个价格在列表、详情、购物车、结算栏
// 四处出现，四处各拼一遍的结果是四套字号与四种「¥」的对齐方式。更麻烦的是小数位：
// 有人补两位（`9.90`），有人不补（`9.9`），同一商品在两个页面上看起来价格不同。
// 拆分数值的规则只有一份（`core/price.ts`），这里只管排版。
//
// 触控：它是纯展示件，不给 44px 命中区 —— 可点的外层是商品卡或行（那边负责触控）。
import { BaseElement, escapeAttr, html, priceParts, priceText, property, defineElement } from "../../core/index.js";
import mPriceCSS from "./m-price.css?raw";

export class MPrice extends BaseElement {
  static styles = mPriceCSS;

  @property({ type: String }) value: string | number = "";
  @property({ type: String }) currency = "¥";
  @property({ type: Number }) decimals = 2;
  /** sm 用于列表副行 / 购物车小计，md 用于商品卡，lg 用于详情主价。 */
  @property({ type: String }) size: "sm" | "md" | "lg" = "md";
  /** 划线价（原价）。只改排版，不改语义 —— 宿主不该把「现价」放进 strike。 */
  @property({ type: Boolean }) strike = false;
  /** 价格后缀，如 `/件`、`起`。 */
  @property({ type: String }) suffix = "";
  @property({ type: String, attribute: "empty-text" }) emptyText = "--";

  render(): string {
    const p = priceParts(this.value, this.decimals);
    const cls = ["m-price", `m-price--${this.size}`, this.strike ? "m-price--strike" : "", p?.negative ? "m-price--negative" : ""]
      .filter(Boolean)
      .join(" ");
    if (!p) {
      return html`
        <span class="${cls}" part="root" aria-label="${escapeAttr(this.emptyText)}">
          <span class="m-price__empty" aria-hidden="true">${escapeAttr(this.emptyText)}</span>
        </span>
      `;
    }
    return html`
      <span class="${cls}" part="root" aria-label="${escapeAttr(priceText(this.value, this.decimals, this.currency))}">
        <span class="m-price__main" aria-hidden="true">
          ${p.negative ? '<span class="m-price__sign">-</span>' : ""}
          <span class="m-price__symbol">${escapeAttr(this.currency)}</span>
          <span class="m-price__int">${p.int}</span>
          ${p.dec ? `<span class="m-price__dec">.${p.dec}</span>` : ""}
        </span>
        ${this.suffix ? `<span class="m-price__suffix" aria-hidden="true">${escapeAttr(this.suffix)}</span>` : ""}
      </span>
    `;
  }

  /** 供宿主的「已失效」逻辑读取：当前值是否可解析（false 时界面上是空态文案）。 */
  get valid(): boolean {
    return priceParts(this.value, this.decimals) !== null;
  }

  /** 屏幕阅读器读的那一句（宿主拼在列表 aria-label 里时用）。 */
  get text(): string {
    return priceText(this.value, this.decimals, this.currency);
  }
}

defineElement("m-price", MPrice);
