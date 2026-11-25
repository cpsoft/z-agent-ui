// <m-notice-bar> 通告条：text 单行滚动文案，type 定语气，closable 出关闭按钮并发 z-close。
// [WHY] 提示条：移动端页面顶部用来放「只读/待审核/今日休市」这类状态。
// 与 z-alert 的区别是它**不占版面块的位置**、不打断阅读，且默认单行不换行溢出省略 ——
// 移动端一条提示换成三行会把首屏第一张卡挤下去。
import { COPY, BaseElement, escapeHtml, html, property } from "../../core/index.js";
import mNoticeBarCSS from "./m-notice-bar.css?raw";

export type MNoticeType = "info" | "success" | "warning" | "danger";

export class MNoticeBar extends BaseElement {
  static styles = mNoticeBarCSS;

  @property({ type: String }) text = "";
  @property({ type: String }) type: MNoticeType = "info";
  @property({ type: Boolean }) closable = false;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    // [WHY 上报但不自己隐藏] 隐藏与否交给宿主：它可能还想记一条「用户已读过」。
    // 组件自己藏掉的话，宿主把它重新渲染一次提示就「复活」，状态两处各说一套。
    if (t?.dataset.act === "close") this.emit("z-close", { text: this.text });
  };

  render(): string {
    const close = this.closable
      ? html`<button class="m-notice-bar__close" part="close" type="button" data-act="close" aria-label="${COPY.close}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>`
      : "";

    return html`
      <div class="m-notice-bar m-notice-bar--${this.type}" part="root" role="status">
        <span class="m-notice-bar__icon" part="icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3" />
            <path d="M7 6.2V10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            <circle cx="7" cy="4.2" r="0.8" fill="currentColor" />
          </svg>
        </span>
        <span class="m-notice-bar__text" part="text"><slot>${escapeHtml(this.text)}</slot></span>
        ${close}
      </div>
    `;
  }
}

customElements.define("m-notice-bar", MNoticeBar);
