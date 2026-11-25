// <m-navbar> 导航栏：左返回 / 中标题 / 右侧插槽；点返回发 z-back。
// [WHY] 移动端导航栏：左返回 / 中标题 / 右插槽。
// 标题与返回按钮无障碍名都可能来自配置，插值必须转义（html`` 不做自动转义）。
import { BaseElement, html, property, escapeHtml, escapeAttr } from "../../core/index.js";
import mNavbarCSS from "./m-navbar.css?raw";

const BACK_SVG = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>`;

export class MNavbar extends BaseElement {
  static styles = mNavbarCSS;

  @property({ type: String }) title: string = "";
  /**
   * 是否显示返回按钮。
   *
   * [遗留] 落到标签上是 `<m-navbar showback>`，不如 `back` 好猜。2026-11-09 曾改成
   * `back`，但发现 `tests/unit/components/m-navbar.test.ts` 已在用 `showBack`
   * （既有契约），于是回退 —— 改名是破坏性变更，应当单独立项，不该夹在补测试里。
   */
  @property({ type: Boolean }) showBack: boolean = false;
  /** 返回按钮的无障碍名。默认中文 —— 硬编码 "Back" 会让中文页面的读屏播报夹英文。 */
  @property({ type: String }) backLabel: string = "返回";

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (target.closest(".m-navbar__back")) {
      this.emit("z-back");
    }
  };

  render(): string {
    return html`
      <div class="m-navbar" part="root">
        <div class="m-navbar__left" part="left">
          ${this.showBack
            ? html`<button type="button" class="m-navbar__back" part="back" aria-label="${escapeAttr(this.backLabel)}">${BACK_SVG}</button>`
            : ""}
        </div>
        <div class="m-navbar__title" part="title">${escapeHtml(this.title)}</div>
        <div class="m-navbar__right" part="right"><slot></slot></div>
      </div>
    `;
  }
}

customElements.define("m-navbar", MNavbar);
