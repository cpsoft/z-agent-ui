// <m-collapse> 折叠面板：title 作表头、expanded 控制展开，summary 作收起时的摘要，切换发 z-toggle。
// [WHY] 折叠面板：头部点击切换 + max-height 过渡动画
// [2026-11-20] 高度动画改走 L0 的 `CollapseTween`（issue IKWNJN）：此前与 AccordionItem
// 是逐字近似两份，且都漏了「校验 transitionend 的 target」—— 子树里任何一层过渡结束
// 都会把 maxHeight 提前清成 ""，正在跑的动画当场跳变。
// [2026-09-15] night-hawk: 创建移动端交互组件
import { BaseElement, html, property, escapeHtml, setContentCollapsed } from "../../core/index.js";
import { CollapseTween } from "../../primitives/index.js";
import mCollapseCSS from "./m-collapse.css?raw";

const CHEVRON_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`;

export class MCollapse extends BaseElement {
  static styles = mCollapseCSS;

  @property({ type: String }) title = "";
  @property({ type: Boolean }) expanded = false;
  @property({ type: String }) summary = "";

  /** 高度三态（0 → 目标 → auto）收在 L0 原语里，含 target 校验与兜底。 */
  private _tween = new CollapseTween();

  render(): string {
    const cls = `m-collapse${this.expanded ? " m-collapse--expanded" : ""}`;
    return html`
      <div class="${cls}" part="root">
        <button type="button"
                class="m-collapse__header"
                part="header"
                aria-expanded="${this.expanded ? "true" : "false"}">
          <span class="m-collapse__title" part="title">${escapeHtml(this.title)}</span>
          ${this.summary ? html`<span class="m-collapse__summary" part="summary">${escapeHtml(this.summary)}</span>` : ""}
          <span class="m-collapse__arrow" part="arrow" aria-hidden="true">${CHEVRON_SVG}</span>
        </button>
        <div class="m-collapse__content" part="content">
          <div class="m-collapse__body" part="body">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onHeaderClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onHeaderClick);
    super.disconnectedCallback();
  }

  willUpdate(): void {
    // 收起起点必须在重渲染前量：updated 会换掉内容 DOM，之后 scrollHeight 归零
    const body = this.shadowRoot!.querySelector<HTMLElement>(".m-collapse__body");
    if (!body) return;
    this._tween.willCollapse(this.expanded, () => body.scrollHeight);
  }

  updated(): void {
    const root = this.shadowRoot!.querySelector<HTMLElement>(".m-collapse");
    const content = this.shadowRoot!.querySelector<HTMLElement>(".m-collapse__content");
    const body = this.shadowRoot!.querySelector<HTMLElement>(".m-collapse__body");
    const header = this.shadowRoot!.querySelector<HTMLElement>(".m-collapse__header");
    if (!root || !content || !body) return;

    root.classList.toggle("m-collapse--expanded", this.expanded);
    this._tween.apply(content, this.expanded, () => body.scrollHeight);

    // [WHY] 收起的不只是高度：内容仍在 Tab 序列与无障碍树里（真机实测 focus 能进去）。
    // 首屏 `expanded=false` 时同样要设 —— 否则加载完就能 Tab 进一个看不见的面板。
    setContentCollapsed(this, content, !this.expanded, header);
  }

  private _onHeaderClick = (e: Event): void => {
    const header = (e.target as HTMLElement).closest(".m-collapse__header");
    if (!header) return;
    this.expanded = !this.expanded;
    this.emit("z-toggle", { expanded: this.expanded });
  };

}

customElements.define("m-collapse", MCollapse);
