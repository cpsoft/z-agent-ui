// 排版组件：标题 / 正文 / 次要文字的语义化版本。
//
// [为什么需要它] 库里有 markdown（L2）却没有任何标题组件 —— 于是每处都在写
// `<h3 style="font-size:18px;font-weight:600">`，字号与字重各写各的。
// 令牌有了、markdown 有了，中间这一层语义没有。
//
// [为什么 h1 封顶 26px（--z-font-size-2xl），不加新令牌] Ant 的 h1 是 38px ——
// 那是营销页的尺度。这是一个中后台库：页面里最大的字通常是列表页标题，
// 26px 已经比正文（16px）大一倍多。为了对齐 Ant 而引入 32/38 两个令牌，
// 会诱导业务页把标题越写越大，而真正的问题「标题层级不统一」一点没解决。
// 阶梯比例 26 / 20 / 18 / 16 / 13 取自现有令牌，不新增任何定义。
import { BaseElement, html, property } from "../../core/index.js";
import typographyCSS from "./typography.css?raw";

// [WHY 属性名叫 scale 而不是 variant] 本来是 `variant="h1|h2|…|secondary"`，
// `vocabulary-guard` 直接红了 —— `src/core/vocabulary.ts` 把 `variant` 定为**待拆分的遗留词**：
// 它同时承载语义色（badge/tag 的 default|primary|…）、外观（button 的 outline|ghost）、
// 形状（skeleton 的 text|circle|rect），存量靠 LEGACY_EXEMPTIONS 冻结，**新增一律不许再进来**。
// 这条规矩是对的：h1..h5/body/secondary 是第 **四** 种语义（排版阶梯），
// 塞进 `variant` 只会让「这个组件的 variant 到底指什么」再难一层。
// `scale`（排版模数）是这七个值唯一准确的共同名字 —— 它们是同一条阶梯上的七个位置。
export type ZTypographyScale =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "body"
  | "secondary";

/** scale → 字号令牌。**改阶梯只改这张表**，CSS 里不再出现字号字面量。 */
const SIZE: Record<ZTypographyScale, string> = {
  h1: "var(--z-font-size-2xl)",
  h2: "var(--z-font-size-xl)",
  h3: "var(--z-font-size-lg)",
  h4: "var(--z-font-size-base)",
  h5: "var(--z-font-size-sm)",
  body: "var(--z-font-size-base)",
  secondary: "var(--z-font-size-sm)",
};

const WEIGHT: Record<ZTypographyScale, string> = {
  h1: "700",
  h2: "600",
  h3: "600",
  h4: "600",
  h5: "600",
  body: "400",
  secondary: "400",
};

/** 语义标签：variance 决定用 h1..h5 还是 p。**不要用 div** —— 屏幕阅读器靠标题标签跳转。 */
const TAG: Record<ZTypographyScale, string> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  body: "p",
  secondary: "p",
};

export class ZTypography extends BaseElement {
  static styles = typographyCSS;

  @property({ type: String }) scale: ZTypographyScale = "body";
  /** 单行省略（`text-overflow: ellipsis`）。多行省略用 `lines`。 */
  @property({ type: Boolean }) ellipsis = false;
  /** 多行省略的行数。0 = 不限。优先级高于 `ellipsis`。 */
  @property({ type: Number }) lines = 0;
  @property({ type: Boolean }) strong = false;
  /** 右侧显示复制按钮，点击把文本写入剪贴板并 emit `z-copy`。 */
  @property({ type: Boolean }) copyable = false;

  protected willUpdate(): void {
    const s = this.style;
    const v = (SIZE[this.scale] ? this.scale : "body") as ZTypographyScale;
    s.setProperty("--_size", SIZE[v]);
    // strong 覆盖 scale 的字重：`<z-typography scale="body" strong>` 是常见组合
    s.setProperty("--_weight", this.strong ? "700" : WEIGHT[v]);
    const n = Math.floor(Number(this.lines));
    s.setProperty("--_lines", String(Number.isFinite(n) && n > 0 ? n : 0));
  }

  /** 纯文本内容：供复制用。取 light DOM 的 textContent（组件自己不缓存文本）。 */
  private _text(): string {
    return (this.textContent ?? "").trim();
  }

  private async _copy(): Promise<void> {
    const text = this._text();
    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      // 剪贴板可能被权限拒绝（非用户手势、iframe 无 allow）
      // —— 事件照发，让宿主决定如何提示；静默失败比抛错更合理
    }
    this.emit("z-copy", { text });
  }

  render(): string {
    const v = SIZE[this.scale] ? this.scale : "body";
    const tag = TAG[v];
    const cls = [
      "z-typography",
      `z-typography--${v}`,
      this.ellipsis && !this.lines ? "z-typography--ellipsis" : "",
      this.lines > 0 ? "z-typography--clamp" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const copyBtn = this.copyable
      ? html`<button class="z-typography__copy" part="copy" type="button" aria-label="复制">复制</button>`
      : "";

    // 标签名来自内部映射表，不是用户输入 —— 这里的插值不会引入注入面。
    // 内容走 <slot>，所以使用方的 HTML 结构不被重新解析。
    return html`<${tag} class="${cls}" part="root"><slot></slot>${copyBtn}</${tag}>`;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  private _onClick = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.(".z-typography__copy")) void this._copy();
  };
}

customElements.define("z-typography", ZTypography);
