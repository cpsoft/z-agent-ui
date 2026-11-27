// <m-coupon> 优惠券票券：面额区 + 说明区 + 操作区，中间虚线，上下各挖一个半圆缺口。
//
// 三种面额：`amount`（满减 ¥20）/ `discount`（8.5 折）/ `freight`（免运费）。
// 三种状态：`available` / `used` / `expired` —— 后两种整体降饱和并盖一枚斜印章，
// 而不是只把按钮置灰：券还在列表里，用户要能一眼看出「这张为什么不能用」。
//
// 缺口颜色取 `--m-coupon-cut`（缺省 `var(--z-color-bg)`）。缺口是**挖掉**的视觉，
// 但 CSS 无法真的挖洞（`mask-composite` 在旧内核上不可靠），只能用「与背景同色的圆」
// 盖在券的边缘。放在非 `--z-color-bg` 的底色上（如灰色分组背景）时，宿主覆盖这个钩子。
import { BaseElement, escapeAttr, escapeHtml, html, priceParts, property, t as msg, defineElement } from "../../core/index.js";
import mCouponCSS from "./m-coupon.css?raw";

export type CouponKind = "amount" | "discount" | "freight";
export type CouponStatus = "available" | "used" | "expired";

/**
 * 面额文案。
 *
 * `money` 为 true（金额 / 门槛）时只省掉整角整分：`20.00` → `20`，而 `19.90` 保持 `19.90` ——
 * 印成 `19.9` 会被读成「十九块九不到二十」，在券面上是**少收一角**的观感。
 * `money` 为 false（折扣）时去掉全部尾零：`8.50` → `8.5`，因为折扣位数本身没有「分」的概念。
 */
function faceText(value: string | number, money: boolean): string {
  const p = priceParts(value, 2);
  if (!p) return "";
  if (money) return p.dec === "00" ? p.int : `${p.int}.${p.dec}`;
  const dec = p.dec.replace(/0+$/, "");
  return dec ? `${p.int}.${dec}` : p.int;
}

export class MCoupon extends BaseElement {
  static styles = mCouponCSS;

  @property({ type: String }) kind: CouponKind = "amount";
  /** 面额：`amount` 是金额，`discount` 是折扣（8.5），`freight` 忽略。 */
  @property({ type: String }) value: string | number = "";
  /** 使用门槛（元）。0 = 无门槛。 */
  @property({ type: String }) threshold: string | number = "0";
  /** 券名。 */
  @property({ type: String }) title = "";
  /** 适用范围 / 说明。 */
  @property({ type: String }) desc = "";
  /** 有效期文案（如 `2026-11-01 至 2026-11-30`）。 */
  @property({ type: String }) valid = "";
  @property({ type: String }) status: CouponStatus = "available";
  /** 操作按钮文案；留空不画按钮（自取或已领取的券）。 */
  @property({ type: String }) action = "";
  /** 整张券可点（进券详情 / 选择这张券）。 */
  @property({ type: Boolean }) clickable = false;

  private get _usable(): boolean {
    return this.status === "available";
  }

  private get _stamp(): string {
    return this.status === "used" ? msg("couponUsed") : this.status === "expired" ? msg("couponExpired") : "";
  }

  /**
   * 面额区主文案：金额带 ¥，折扣带「折」，免运费只有三个字。
   *
   * 符号与数字放在**同一行**（`__amount` 是 flex 行），不能让 flex 列把它们竖着排 ——
   * 「¥」独立成行、数字掉到下一行，看起来像两张券叠在一起。
   */
  private _face(): string {
    if (this.kind === "freight") {
      return `<div class="m-coupon__amount"><span class="m-coupon__word">${escapeHtml(msg("freeShipping"))}</span></div>`;
    }
    const n = escapeAttr(faceText(this.value, this.kind === "amount"));
    const unit =
      this.kind === "discount"
        ? `<span class="m-coupon__num">${n}</span><span class="m-coupon__unit">${escapeHtml(msg("discountUnit"))}</span>`
        : `<span class="m-coupon__sym">¥</span><span class="m-coupon__num">${n}</span>`;
    return `<div class="m-coupon__amount">${unit}</div>`;
  }

  private _cond(): string {
    const t = Number(this.threshold);
    if (!Number.isFinite(t) || t <= 0) return msg("noThreshold");
    return msg("couponCondition", { amount: faceText(t, true) });
  }

  render(): string {
    const cls = [
      "m-coupon",
      `m-coupon--${this.kind}`,
      this._usable ? "is-usable" : "is-dead",
      this.clickable ? "is-clickable" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const label = [
      msg("couponLabel"),
      this.title,
      this.kind === "freight"
        ? msg("freeShipping")
        : this.kind === "discount"
          ? msg("couponDiscountText", { value: faceText(this.value, false) })
          : msg("couponAmountText", { threshold: faceText(this.threshold, true), value: faceText(this.value, true) }),
      this._usable ? "" : this._stamp,
    ]
      .filter(Boolean)
      .join("，");
    return html`
      <div class="${cls}" part="root" role="group" aria-label="${escapeAttr(label)}"
        aria-disabled="${this._usable ? "false" : "true"}">
        <div class="m-coupon__face" part="face">
          ${this._face()}
          <div class="m-coupon__cond" part="condition">${escapeAttr(this._cond())}</div>
        </div>
        <div class="m-coupon__body" part="body">
          <p class="m-coupon__title" part="title">${escapeAttr(this.title)}</p>
          ${this.desc ? `<p class="m-coupon__desc">${escapeAttr(this.desc)}</p>` : ""}
          ${this.valid ? `<p class="m-coupon__valid">${escapeAttr(this.valid)}</p>` : ""}
        </div>
        <div class="m-coupon__side" part="side">
          ${this._usable
            ? this.action
              ? `<button type="button" class="m-coupon__action" part="action" data-own-act="coupon">${escapeAttr(this.action)}</button>`
              : `<slot name="side"></slot>`
            : `<span class="m-coupon__stamp" part="stamp">${this._stamp}</span>`}
        </div>
        <span class="m-coupon__cut m-coupon__cut--top" aria-hidden="true"></span>
        <span class="m-coupon__cut m-coupon__cut--bottom" aria-hidden="true"></span>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // 监听挂在宿主上：shadow 内元素的事件冒泡到宿主时 target 仍是内层节点，
    // 所以能直接 closest 到「领取」按钮（与 m-goods-card 的加购判定同一写法）。
    this.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    // `composedPath()[0]` 同 m-goods-card：宿主上的监听拿到的 `e.target` 是宿主，
    // 不是被点的按钮（只有 jsdom 不重定向，所以单测测不出这个错）。
    const inner = (e.composedPath()[0] ?? e.target) as HTMLElement;
    const btn = inner.closest("[part~='action']");
    if (btn) {
      // 领券按钮不冒泡成整张券的点击：用户点「领取」不该顺带进券详情
      e.stopPropagation();
      if (!this._usable) return;
      this.emit("z-action", { kind: this.kind, value: this.value, title: this.title });
      return;
    }
    if (!this.clickable || !this._usable) return;
    this.emit("z-click", { kind: this.kind, value: this.value, title: this.title });
  };
}

defineElement("m-coupon", MCoupon);
