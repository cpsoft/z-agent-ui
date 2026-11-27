// <m-checkout-bar> 结算栏：全选 + 合计 + 主按钮，贴底显示。
//
// [WHY 独立成组件而不是拿 m-action-bar 拼] 结构是固定的三件（全选框 / 合计金额 / 主按钮），
// 用通用操作条拼出来每次都要重写「全选与半选、件数与金额的位置」；而这里的每一个偏移
// 都会在真机上被看见（合计金额被按钮挤掉 = 用户不敢下单）。
//
// [WHY 全选框自己画] 与 m-goods-card 同一条理由：L1 控件之间不互相内嵌，否则一层手机界面
// 会套出五六个 shadow root。样式与 m-checkbox 同源（都是 20px 方块 + 44px 命中区）。
import { BaseElement, COPY, ariaBool, escapeAttr, escapeHtml, html, priceParts, property, t, defineElement } from "../../core/index.js";
import mCheckoutBarCSS from "./m-checkout-bar.css?raw";

export class MCheckoutBar extends BaseElement {
  static styles = mCheckoutBarCSS;

  /** 全选态。半选时宿主传 `indeterminate`。 */
  @property({ type: Boolean }) checked = false;
  @property({ type: Boolean }) indeterminate = false;
  /** 已选件数（0 时按钮置灰）。 */
  @property({ type: Number }) count = 0;
  /** 合计金额（元）。 */
  @property({ type: String }) total: string | number = "";
  @property({ type: Number }) decimals = 2;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String, attribute: "submit-text" }) submitText = COPY.checkout;
  @property({ type: String, attribute: "check-text" }) checkText = COPY.selectAll;
  /** 由贴底改为行内（嵌在弹层或卡片里时用）。 */
  @property({ type: Boolean }) inline = false;
  /** 隐藏全选框（详情页的「立即购买」不需要全选）。 */
  @property({ type: Boolean, attribute: "no-check" }) noCheck = false;

  render(): string {
    const p = priceParts(this.total, this.decimals);
    const hasTotal = p !== null;
    const canSubmit = !this.disabled && this.count > 0;
    const cls = [
      "m-checkout-bar",
      this.inline ? "m-checkout-bar--inline" : "",
      this.disabled ? "m-checkout-bar--disabled" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const icon = this.indeterminate
      ? '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3.5 7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
      : this.checked
        ? '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3 7.2l2.6 2.6L11 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
        : "";
    return html`
      <div class="${cls}" part="root" role="group" aria-label="${escapeAttr(t("checkoutBar"))}">
        ${this.noCheck
          ? ""
          : `<button
               class="m-checkout-bar__check${this.checked || this.indeterminate ? " is-on" : ""}"
               type="button"
               data-act="check"
               aria-pressed="${ariaBool(this.checked)}"
               ${this.disabled ? "disabled" : ""}
               part="check"
             >
               <span class="m-checkout-bar__box" aria-hidden="true">${icon}</span>
               <span class="m-checkout-bar__check-text">${escapeAttr(this.checkText)}</span>
             </button>`}
        <div class="m-checkout-bar__sum" part="sum">
          <span class="m-checkout-bar__label">${escapeHtml(t("total"))}</span>
          ${hasTotal
            ? `<span class="m-checkout-bar__amount" aria-label="${escapeAttr(`${p.negative ? "-" : ""}¥${p.int}${p.dec ? "." + p.dec : ""}`)}">
                 <span aria-hidden="true">${p.negative ? "-" : ""}<span class="sym">¥</span><span class="int">${p.int}</span>${p.dec ? `<span class="dec">.${p.dec}</span>` : ""}</span>
               </span>`
            : '<span class="m-checkout-bar__amount m-checkout-bar__amount--empty">--</span>'}
          ${this.count > 0 ? `<span class="m-checkout-bar__count">${escapeHtml(t("itemCount", { count: this.count }))}</span>` : ""}
        </div>
        <button
          class="m-checkout-bar__submit"
          type="button"
          data-act="submit"
          ${canSubmit ? "" : "disabled"}
          part="submit"
        >${escapeAttr(this.submitText)}</button>
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
    // 监听挂在宿主上 ⇒ 跨 shadow 边界时 `e.target` 已被重定向成宿主，closest 恒 null
    const act = ((e.composedPath()[0] ?? e.target) as HTMLElement).closest("[data-act]")?.getAttribute("data-act");
    if (!act) return;
    if (act === "check") {
      if (this.disabled) return;
      const next = !this.checked;
      this.checked = next;
      // 半选被点成全选：不清掉会一直画横杠
      this.indeterminate = false;
      this.emit("z-check-all", { checked: next });
      return;
    }
    if (this.count <= 0 || this.disabled) return;
    this.emit("z-submit", { count: this.count, total: this.total });
  };
}

defineElement("m-checkout-bar", MCheckoutBar);
