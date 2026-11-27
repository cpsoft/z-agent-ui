// <z-tag> 标签：tone 定语义色，closable 出删除按钮并发 z-tag-close。
import { COPY, BaseElement, html, property, escapeAttr, observeLegacyAttribute, syncAlias, resolveTone, defineElement } from "../../core/index.js";
import type { Tone } from "../../core/index.js";
import tagCSS from "./tag.css?raw";

/** 语义色（规范词表 TONES 的子集全量）。 */
export type TagTone = Tone;
/** @deprecated 2026-11-15 起用 `tone`；`variant` 仍可读（见文件末尾的兼容读），下一主版本删除。 */
export type TagVariant = Tone;
export type TagSize = "sm" | "md";

const CLOSE_SVG = `<svg viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke-width="1.5" stroke-linecap="round"/></svg>`;

export class ZTag extends BaseElement {
  static styles = tagCSS;

  @property({ type: String }) tone: TagTone = "default";
  @property({ type: String }) size: TagSize = "md";
  @property({ type: Boolean }) closable = false;
  @property({ type: Boolean }) disabled = false;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) removeLabel = COPY.remove;

  /**
   * 兼容读：`variant="danger"` 仍然生效，但**只写** `tone`。
   * 旧名不进清单（它不是 `@property`），所以新代码写不出来；旧页面不必改。
   */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      const tone = resolveTone(value);
      if (tone) syncAlias(this, "tone", "tone", tone);
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }


  /**
   * @deprecated 旧名 `variant` 的 **JS 属性**兼容层。
   *
   * [WHY 属性也要兼容，不能只管 attribute] 兼容读只挂 `attributeChangedCallback` 时，
   * `el.variant = "danger"` 会变成给实例加一个普通字段 —— 读得回自己写的值，界面上毫无变化，
   * 且**零报错**。这正是收口期最危险的一种「看起来生效」。这里把它转成 setAttribute，
   * 复用同一条映射，保证 attribute 与 property 两条入口行为一致。
   */
  get variant(): TagTone | "" {
    return (this.getAttribute("variant") as TagTone | null) ?? "";
  }
  set variant(value: TagTone | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const cls = `z-tag z-tag--${this.tone} z-tag--${this.size}`;

    return html`
      <span class="${cls}" part="root" aria-disabled="${this.disabled ? "true" : "false"}" role="status">
        <span class="z-tag__label" part="label">
          <slot></slot>
        </span>
        ${this.closable ? html`
          <button type="button" class="z-tag__close" part="close" aria-label="${escapeAttr(this.removeLabel)}">
            ${CLOSE_SVG}
          </button>
        ` : ""}
      </span>
    `;
  }

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
    if (target.closest(".z-tag__close") && !this.disabled) {
      e.stopPropagation();
      this.emit("z-tag-close");
    }
  };
}

// 兼容读登记：必须在 define 之前 —— 定义后浏览器已缓存观察名单，新加的 attribute 永远不回调
observeLegacyAttribute(ZTag, "variant");

defineElement("z-tag", ZTag);
