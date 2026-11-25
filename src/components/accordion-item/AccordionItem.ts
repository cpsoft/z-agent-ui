// <z-accordion-item> 折叠面板的一项：title 当表头、open 控制展开，点表头转出 z-toggle，内容走高度动画。
import { BaseElement, html, property, escapeAttr, setContentCollapsed } from "../../core/index.js";
import { CollapseTween } from "../../primitives/index.js";
import accordionItemCSS from "./accordion-item.css?raw";

/** 内容区下内边距：`scrollHeight` 不含 padding，展开高度得补上。 */
const PADDING_BOTTOM = 20;

const CHEVRON_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`;

export class ZAccordionItem extends BaseElement {
  static styles = accordionItemCSS;

  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) disabled = false;
  // [WHY] title 是 HTMLElement 反射属性：`= ""` 字段初始化器在构造期触发原生
  // setter → setAttribute("title") → 违反 CE 构造约束，createElement 抛
  // "The result must not have attributes"。用 `!` 声明不初始化，
  // 默认 "" 由 applyPropertyMeta 读取原生 getter（无属性时返回 ""）取得
  // See: wiki/bugs/bug-20260810-title-ctor-attr.md
  // [2026-08-10] night-hawk: 修复构造期属性污染
  @property({ type: String }) title!: string;

  // 高度三态（0 → 目标 → auto）与那套 `_prevOpen`/`_closeHeight` 都收在 L0 原语里：
  // 同一段 trick 之前在 accordion / m-collapse / property-group 各写一遍，
  // 且三处都漏了「校验 transitionend 的 target」（issue IKWNJN）。
  private _tween = new CollapseTween();

  render(): string {
    // Class is managed via classList in updated() so CSS transitions work
    // (innerHTML replacement destroys old elements, breaking transitions)
    // [WHY] ?disabled= 是字面属性（html() 纯字符串拼接），原生 button 从未
    // 真正禁用；条件属性作独立片段（先例 Select.ts:151），aria 布尔必须显式字符串
    // See: wiki/bugs/bug-20260810-q-attr-literal-disabled.md
    // [2026-08-10] night-hawk: 修复 ?disabled= 字面属性 + aria-expanded 空串
    return html`
      <div class="z-accordion-item" part="root">
        <button type="button"
                class="z-accordion-item__header"
                part="header"
                ${this.disabled ? "disabled" : ""}
                aria-expanded="${this.open ? "true" : "false"}">
          <span class="z-accordion-item__title" part="title">
            <slot name="title">${escapeAttr(this.title)}</slot>
          </span>
          <span class="z-accordion-item__icon" part="icon" aria-hidden="true">
            ${CHEVRON_SVG}
          </span>
        </button>
        <div class="z-accordion-item__content" part="content">
          <div class="z-accordion-item__body">
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
    // 收起动画的起点必须在**重渲染之前**量：这次 updated 会换掉内容 DOM，
    // 之后 `scrollHeight` 归零，收起就成了「从 0 到 0」（面板瞬间消失）
    const body = this.shadowRoot!.querySelector<HTMLElement>(".z-accordion-item__body");
    if (!body) return;
    this._tween.willCollapse(this.open, () => body.scrollHeight + PADDING_BOTTOM);
  }

  updated(): void {
    const root = this.shadowRoot!.querySelector<HTMLElement>(".z-accordion-item");
    const content = this.shadowRoot!.querySelector<HTMLElement>(".z-accordion-item__content");
    const body = this.shadowRoot!.querySelector<HTMLElement>(".z-accordion-item__body");
    const header = this.shadowRoot!.querySelector<HTMLElement>(".z-accordion-item__header");
    if (!root || !content || !body) return;

    root.classList.toggle("z-accordion-item--open", this.open);
    this._tween.apply(content, this.open, () => body.scrollHeight + PADDING_BOTTOM, {
      // 展开结束后把实测高度写成 CSS 变量：外层 `z-accordion` 要靠它算「一屏能摊开几项」
      onExpanded: (px) => this.style.setProperty("--_accordion-content-height", `${px}px`),
    });

    // [WHY 折叠的不只是高度] 收起后内容仍在 Tab 序列与无障碍树里 —— 真机实测
    // `focusedWhenCollapsed=true`：焦点会停在一个高 0 像素的输入框里，用户看到的是
    // 「按 Tab 焦点消失了」。见 core/a11y.ts 的 setContentCollapsed。
    setContentCollapsed(this, content, !this.open, header);
  }

  private _onHeaderClick = (e: Event): void => {
    const header = (e.target as HTMLElement).closest(".z-accordion-item__header");
    if (!header) return;
    if (this.disabled) return;
    this._toggle();
  };

  private _toggle(): void {
    this.open = !this.open;
    const index = Array.from(this.parentElement?.children ?? []).indexOf(this);
    this.emit("z-toggle", { open: this.open, index });
  }

}

customElements.define("z-accordion-item", ZAccordionItem);
