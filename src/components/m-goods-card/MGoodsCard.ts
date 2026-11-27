// <m-goods-card> 商品卡：图 + 名称 + 卖点 + 价格 + 标签 + 加购。
//
// [WHY 自绘价格而不内嵌 <m-price>] 一张列表里可能有 20 张卡，每张卡再套一个自定义元素
// 就是 20 个 shadow root；价格 DOM 只有三个 span，自己画省一层。口径没有分叉 ——
// 两边都走 `core/price.ts` 的 `priceParts`，所以「列表 ¥9.90、详情 ¥9.90」不会出现
// 「一个补零一个不补」。
//
// [WHY 点击分两条通道] 整卡点击 = 进详情；右下角加购按钮 = 直接进购物车。
// 加购若冒泡成整卡点击，用户点「+」会跳走，是商城最招骂的交互之一，所以显式 stopPropagation。
import { BaseElement, escapeAttr, escapeHtml, html, priceParts, property, t, defineElement } from "../../core/index.js";
import mGoodsCardCSS from "./m-goods-card.css?raw";

/** `tags` 的字符串形态：`包邮|新品`（逗号或竖线都可，两种都常见）。 */
function parseTags(raw: string | string[]): string[] {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return raw
    .split(/[,，|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export class MGoodsCard extends BaseElement {
  static styles = mGoodsCardCSS;

  /** 业务标识（商品 id / sku），事件原样带回给宿主。 */
  @property({ type: String }) value = "";
  @property({ type: String }) title = "";
  @property({ type: String }) desc = "";
  @property({ type: String }) image = "";
  @property({ type: String }) price: string | number = "";
  /** 划线原价；空表示不展示。 */
  @property({ type: String }) origin: string | number = "";
  @property({ type: Number }) decimals = 2;
  @property({ type: String }) tags: string | string[] = "";
  /** 自由文本，如「已售 1200」「3 人拼」。 */
  @property({ type: String }) sales = "";
  /** grid：两列列表；row：购物车/订单那种横排。 */
  @property({ type: String }) mode: "grid" | "row" = "grid";
  /** 关掉加购按钮（如「已售罄」）。 */
  @property({ type: Boolean }) noAdd = false;
  @property({ type: Boolean, attribute: "sold-out" }) soldOut = false;

  private _priceHtml(v: string | number, cls: string, size: "md" | "sm"): string {
    const p = priceParts(v, this.decimals);
    if (!p) return "";
    return `<span class="m-goods-card__${cls} m-goods-card__${cls}--${size}">
      ${p.negative ? "-" : ""}<span class="sym">¥</span><span class="int">${p.int}</span>${p.dec ? `<span class="dec">.${p.dec}</span>` : ""}
    </span>`;
  }

  render(): string {
    const tags = parseTags(this.tags);
    const img = this.image
      ? `<img class="m-goods-card__img" src="${escapeAttr(this.image)}" alt="" loading="lazy" decoding="async" />`
      : `<span class="m-goods-card__img m-goods-card__img--empty" aria-hidden="true"></span>`;
    return html`
      <div
        class="m-goods-card m-goods-card--${this.mode}${this.soldOut ? " m-goods-card--out" : ""}"
        part="root"
        role="group"
        ${this.title ? `aria-label="${escapeAttr(this.title)}"` : ""}
      >
        <div class="m-goods-card__media" part="media">
          ${img}
          ${this.soldOut ? `<span class="m-goods-card__mask">${escapeHtml(t("soldOut"))}</span>` : ""}
        </div>
        <div class="m-goods-card__body" part="body">
          <p class="m-goods-card__title" part="title">${escapeAttr(this.title)}</p>
          ${this.desc ? `<p class="m-goods-card__desc">${escapeAttr(this.desc)}</p>` : ""}
          ${tags.length ? `<div class="m-goods-card__tags">${tags.map((t) => `<span class="m-goods-card__tag">${escapeAttr(t)}</span>`).join("")}</div>` : ""}
          <div class="m-goods-card__foot">
            <div class="m-goods-card__prices">
              ${this._priceHtml(this.price, "price", "md")}
              ${this.origin !== "" ? this._priceHtml(this.origin, "origin", "sm") : ""}
            </div>
            ${this.sales ? `<span class="m-goods-card__sales">${escapeAttr(this.sales)}</span>` : ""}
            ${this.noAdd || this.soldOut
              ? ""
              : `<button class="m-goods-card__add" type="button" aria-label="${escapeAttr(t("addToCart"))}" part="add" data-own-act="add">
                   <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                 </button>`}
          </div>
          <slot name="footer"></slot>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    // ★ 必须用 `composedPath()[0]`：监听挂在宿主上，跨 shadow 边界时 `e.target` 已被
    // 重定向成宿主本身（M-GOODS-CARD），`closest("[part~='add']")` 恒为 null ——
    // 症状是点「+」不发 z-add、而是当整卡点击。jsdom 不做这一步重定向，所以单测看不出来。
    const inner = (e.composedPath()[0] ?? e.target) as HTMLElement;
    const add = inner.closest("[part~='add']");
    if (add) {
      // 加购不冒泡成整卡点击（见文件头）
      e.stopPropagation();
      if (this.soldOut) return;
      this.emit("z-add", { value: this.value });
      return;
    }
    this.emit("z-click", { value: this.value });
  };
}

defineElement("m-goods-card", MGoodsCard);
