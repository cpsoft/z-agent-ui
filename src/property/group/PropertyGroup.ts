// <z-property-group> 属性分组：title 作分组名，collapsible 才可收起，展开发 z-toggle。
import { BaseElement, html, property, escapeAttr, setContentCollapsed, defineElement } from "../../core/index.js";
import { CollapseTween } from "../../primitives/index.js";
import propertyGroupCSS from "./property-group.css?raw";

/** 内容区下内边距：`scrollHeight` 不含 padding，展开高度得补上。 */
const PADDING_BOTTOM = 20;

const CHEVRON_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>`;

// [WHY] 折叠动画移植 AccordionItem（bug-20260716-accordion-no-animation 修复后的模式），
// open 默认 true（属性面板惯例默认展开）；首渲染守卫用 _skipAnim 标志，
// 因 updated() 不接收 ctx（BaseElement.ts:80），见 REQ-008
// See: wiki/requirements/REQ-008-property-panel.md
export class ZPropertyGroup extends BaseElement {
  static styles = propertyGroupCSS;

  // [WHY] title 是 HTMLElement 反射属性：`= ""` 字段初始化器在构造期触发原生
  // setter → setAttribute("title") → 违反 CE 构造约束，createElement 抛
  // "The result must not have attributes"。用 `!` 声明不初始化，
  // 默认 "" 由 applyPropertyMeta 读取原生 getter（无属性时返回 ""）取得
  // See: wiki/bugs/bug-20260810-title-ctor-attr.md
  // [2026-08-10] night-hawk: 修复构造期属性污染
  @property({ type: String }) title!: string;
  @property({ type: Boolean }) open = true;
  @property({ type: Boolean }) collapsible = true;
  @property({ type: Boolean }) span = true;
  @property({ type: Boolean }) disabled = false;

  // [2026-11-20] 高度三态收进 L0 的 `CollapseTween`（issue IKWNJN）。这里是同一段
  // trick 的第五处手写，也是历史代价最贵的一处（首帧测量时序付过一次 bug）。
  private _tween = new CollapseTween();
  private _skipAnim = false;
  private _suppressSpanRender = false;

  // [WHY] collapsible=false 时内容常显，open 被忽略（_effectiveOpen 统一所有分支判断）
  private _effectiveOpen(): boolean {
    return this.collapsible ? this.open : true;
  }

  render(): string {
    // [WHY] ?disabled= 不被 html() 处理（bug-20260810-q-attr-literal-disabled）；
    // 条件属性必须作独立片段（放属性值内会渲染 disabled=""，按钮真实禁用），
    // 先例 Select.ts:151；class 由 updated() 的 classList 管理（模板切换会破坏过渡）
    const header = this.collapsible
      ? html`
          <button type="button"
                  ${this.disabled ? "disabled" : ""}
                  class="z-property-group__header"
                  part="header"
                  aria-expanded="${this.open ? "true" : "false"}">
            <span class="z-property-group__title" part="title">
              <slot name="title">${escapeAttr(this.title)}</slot>
            </span>
            <span class="z-property-group__icon" part="icon" aria-hidden="true">
              ${CHEVRON_SVG}
            </span>
          </button>
        `
      : html`
          <div class="z-property-group__header" part="header">
            <span class="z-property-group__title" part="title">
              <slot name="title">${escapeAttr(this.title)}</slot>
            </span>
          </div>
        `;

    return html`
      <div class="z-property-group" part="root">
        ${header}
        <div class="z-property-group__content" part="content">
          <div class="z-property-group__body">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onHeaderClick);
    this._reflectSpan();
  }

  // [WHY] decorator 只在赋值时反射（decorators.ts:124），初始默认值需手动同步，
  // 否则 :host([span]) 默认 grid-column 不生效。必须在 connectedCallback 完成：
  // 若放 updated() 里 setAttribute 会触发 attributeChangedCallback → requestUpdate，
  // 产生第二次重渲染；此时动画分支在插槽子元素尚未布局时测量 scrollHeight=0，
  // 把 --_z-property-content-height 永久写死为 20px，展开内容被截断。
  // See: wiki/bugs/bug-20260811-group-first-render-truncation.md
  // [2026-08-11] night-hawk: 修复首帧测量时序
  private _reflectSpan(): void {
    if (this.span && !this.hasAttribute("span")) {
      this._suppressSpanRender = true;
      this.setAttribute("span", "");
      this._suppressSpanRender = false;
    } else if (!this.span && this.hasAttribute("span")) {
      this._suppressSpanRender = true;
      this.removeAttribute("span");
      this._suppressSpanRender = false;
    }
  }

  attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    // [WHY] 自身反射的 span 同步不触发重渲染，其余属性照常走 BaseElement
    if (name === "span" && this._suppressSpanRender) return;
    super.attributeChangedCallback(name, old, value);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onHeaderClick);
    super.disconnectedCallback();
  }

  willUpdate(ctx: { isFirst: boolean }): void {
    if (ctx.isFirst) {
      // [WHY] 首渲染跳过动画（open 默认 true，避免初始展开跳动）
      this._skipAnim = true;
      return;
    }
    // 收起起点必须在重渲染前量：updated 会换掉内容 DOM，之后 scrollHeight 归零
    const body = this.shadowRoot!.querySelector<HTMLElement>(".z-property-group__body");
    if (!body) return;
    this._tween.willCollapse(this._effectiveOpen(), () => body.scrollHeight + PADDING_BOTTOM);
  }

  updated(): void {
    const root = this.shadowRoot!.querySelector<HTMLElement>(".z-property-group");
    const content = this.shadowRoot!.querySelector<HTMLElement>(".z-property-group__content");
    const body = this.shadowRoot!.querySelector<HTMLElement>(".z-property-group__body");
    const header = this.shadowRoot!.querySelector<HTMLElement>(".z-property-group__header");
    if (!root || !content || !body) return;

    // [WHY 放在所有动画分支**之前**] 首帧走 `_skipAnim` 分支并 early return ——
    // 若把这条放在后面，首屏就处于「收起但可 Tab 进去」的状态，而这恰恰是属性面板
    // 最常见的初态（分组默认收起）。动画只是过渡，可达性必须每一帧都对。
    // [WHY 属性面板最吃这一条] 一个分组里可能十几个输入框，收起后它们全留在 Tab 序列里
    // —— 键盘用户按 Tab 会在「看不见的对照组」里穿行十几次，焦点到哪全靠猜。
    // 真机实测：`focusedWhenCollapsed=true`。见 core/a11y.ts 的 setContentCollapsed。
    setContentCollapsed(this, content, !this._effectiveOpen(), header);

    if (this._skipAnim) {
      this._skipAnim = false;
      root.classList.toggle("z-property-group--open", this._effectiveOpen());
      // [WHY] 首渲染绝不写内联 maxHeight：此刻插槽子元素可能尚未完成首轮
      // 渲染与布局（scrollHeight=0），写入会把展开高度永久卡死为 20px，
      // 内容被截断（弹窗内 detail-form 新建条目）。展开态高度由 CSS 规则
      // max-height: var(--_z-property-content-height, 2000px) 兜底，精确值
      // 由后续动画的 transitionend 写入。
      // See: wiki/bugs/bug-20260811-group-first-render-truncation.md
      // [2026-08-11] night-hawk: 修复首帧测量时序
      // [2026-11-20] 原语只记状态不动 DOM —— 这条约束现在是原语的契约（syncState）
      this._tween.syncState(this._effectiveOpen());
      return;
    }

    root.classList.toggle("z-property-group--open", this._effectiveOpen());
    this._tween.apply(content, this._effectiveOpen(), () => body.scrollHeight + PADDING_BOTTOM, {
      // 展开结束后写回精确高度，供收起动画与 CSS 兜底共用
      onExpanded: (px) => this.style.setProperty("--_z-property-content-height", `${px}px`),
    });
  }

  private _onHeaderClick = (e: Event): void => {
    const header = (e.target as HTMLElement).closest(".z-property-group__header");
    if (!header) return;
    if (!this.collapsible || this.disabled) return;
    this._toggle();
  };

  private _toggle(): void {
    this.open = !this.open;
    this.emit("z-toggle", { open: this.open });
  }

}

defineElement("z-property-group", ZPropertyGroup);
