import { BaseElement, html, property, sanitizeHtml, escapeAttr, COPY } from "../../core/index.js";
import { marked, type Renderer, type Tokens } from "marked";
import markdownCSS from "./markdown.css?raw";

// [WHY] marked 默认透传原始 HTML —— 旧实现只用一条正则挡「双引号包裹的 javascript:/data:」，
// 实测 `<img src=x onerror=alert(1)>`、`<script>`、`<iframe srcdoc=...>` 全部原样进 DOM 执行。
// 清理逻辑已抽到 core/sanitize.ts（rich-text 回填复用同一份，避免两处规则漂移）。
// 见 [[bug-20261025-xss-injection]]

/**
 * 清理 marked 产出的 HTML，并把表格包一层可横向滚动的区域。
 *
 * [WHY 容器带 `role="region"` + `tabindex="0"` + 名字] 2026-11-16 Chrome 157 实测三件事：
 *
 * 1. 可滚动容器**会**被浏览器自动放进 Tab 序（Chrome 132 起的行为），方向键也能滚
 *    —— 所以「没 tabindex 就滚不到」这句老说法在当前浏览器上不成立；
 * 2. 但那条自动行为有个前提：容器里**没有可聚焦后代**。表格里有链接时，Tab 直接跳过
 *    容器进到链接上，横向溢出就再也滚不动了（实测：`md>A → md>A → after`）；
 * 3. 无论哪种情况，那个 div 都没有 role、没有名字 —— Tab 到一个「什么都不说」的东西上。
 *
 * 所以这里**显式**给 `tabindex="0"`（不依赖上面那条启发式）+ `role="region"` + 名字。
 * 代价是不溢出的表格也会多一个 Tab 停靠点；不用「检测溢出后再补 tabindex」来消除它，
 * 因为那个属性会随窗口缩放来回变，而焦点正落在容器上时把 tabindex 从 0 改成 -1
 * 会让焦点掉到 `<body>` —— 本库在 `z-json-viewer` / `z-radio-group` 上各踩过一次。
 */
function wrapTables(html: string, label: string): string {
  const attrs = `class="z-markdown__table" role="region" tabindex="0" aria-label="${escapeAttr(label)}"`;
  return html
    .replace(/<table>/g, `<div ${attrs}><table>`)
    .replace(/<\/table>/g, "</table></div>");
}

export class ZMarkdown extends BaseElement {
  static styles = markdownCSS;

  @property({ type: String }) content = "";

  /** 表格滚动区域的名称（会被读屏念出来，随 locale 覆盖）。 */
  @property({ type: String }) tableLabel = COPY.tableRegion;

  @property({ type: Object, attribute: false })
  highlight: ((code: string, lang: string) => string) | null = null;

  private _getRenderer(): Renderer {
    const highlight = this.highlight;
    const renderer = new marked.Renderer();

    renderer.code = function (token: Tokens.Code): string {
      const lang = token.lang || "";
      const code = token.text;
      const langAttr = lang ? ` class="language-${lang}"` : "";

      if (highlight) {
        try {
          const highlighted = highlight(code, lang);
          return `<pre><code${langAttr}>${highlighted}</code></pre>\n`;
        } catch {
          // highlight failed, fall through to plain output
        }
      }

      const escaped = escapeAttr(code);
      return `<pre><code${langAttr}>${escaped}</code></pre>\n`;
    };

    return renderer;
  }

  render(): string {
    if (!this.content) return "";

    const renderer = this._getRenderer();

    let parsed: string;
    try {
      parsed = marked.parse(this.content, {
        gfm: true,
        breaks: false,
        renderer,
      }) as string;
    } catch {
      return html`<div class="z-markdown"><p>Invalid markdown content</p></div>`;
    }

    const safe = wrapTables(sanitizeHtml(parsed), this.tableLabel || COPY.tableRegion);

    queueMicrotask(() => {
      this.emit("z-render", { html: safe });
    });

    return html`<div class="z-markdown">${safe}</div>`;
  }
}

customElements.define("z-markdown", ZMarkdown);
