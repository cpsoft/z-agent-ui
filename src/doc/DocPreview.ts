// <z-doc-preview> 文档预览：content 或 template + data 渲染，带打印与导出工具栏，各动作发事件。
// ═══════════════════════════════════════════════════════════
// z-doc-preview: A4 分页纸张预览 + 打印 + docx 导出
// [WHY] 三端同源（issue IKICYW 验收 3）：预览 DOM 结构 == 打印 DOM 结构 == 导出输入。
// 分页按真实布局测量（mm → px 探针 + 逐块高度累加）切页；测量不可用时（无布局引擎）
// 优雅降级为单页, 不抛错。docx 导出经 DocRenderAdapter 注入, 模块不含后端实现。
// See: wiki/requirements/REQ-016-doc-template.md
// ═══════════════════════════════════════════════════════════

import { BaseElement, html, property, COPY } from "../core/index.js";
import {
  type DocData,
  type DocFormatConfig,
  type DocTemplate,
  formatConfigToStyle,
  mmToPx,
  PAPER_HEIGHT_PX,
  PAPER_WIDTH_PX,
  parseFormatConfig,
} from "./types.js";
import { esc, generateDocument } from "./render.js";
import documentCSS from "./document.css?raw";
import docPreviewCSS from "./doc-preview.css?raw";

export class ZDocPreview extends BaseElement {
  static styles = documentCSS + docPreviewCSS;

  @property({ type: String, attribute: false }) content = "";
  @property({ type: String, attribute: false }) formatConfig = "";
  /** 业务数据（key → value 平铺；表格型数据为 HTML 片段或结构化行数据） */
  @property({ type: Object, attribute: false }) data: DocData = {};
  /** 当前模板（导出适配器入参） */
  @property({ type: Object, attribute: false }) template: DocTemplate | null = null;
  /** docx 渲染导出适配器（宿主注入） */
  @property({ type: Object, attribute: false })
  renderAdapter: { renderDocx(t: DocTemplate, d: DocData): Promise<Blob> } | null = null;
  /** 导出文件名（不含扩展名） */
  @property({ type: String }) exportName = "document";
  @property({ type: Boolean }) showToolbar = true;
  /**
   * 手动缩放倍率（0.5–2.0，1 = 100%）。
   * [WHY] 经 transform: scale 视觉等比缩放，不触发重排 —— 折行/分页在 100% 布局下
   * 计算后整体缩放，内部元素严格等比（2026-09-26 需求：A4 固定，缩放必须手动且等比）。
   * 页面缩放（浏览器 Cmd +/-）不再改变排版：纸张几何为整数 px 锁定，布局缩放不变。
   */
  @property({ type: Number }) zoom = 1;

  // ── i18n 文案（属性化, 见 [[REQ-001]]） ──
  @property({ type: String }) previewText = "文档预览";
  @property({ type: String }) printText = "打印";
  @property({ type: String }) exportText = "导出 docx";
  @property({ type: String }) generateText = "生成文档";
  @property({ type: String }) emptyText = "暂无内容";
  @property({ type: String }) exportingText = "导出中...";
  @property({ type: String }) exportFailedText = "导出失败";
  @property({ type: String }) noAdapterText = "未注入导出适配器";
  @property({ type: String }) pageText = "第 {page} 页 / 共 {total} 页";
  /**
   * 缩放按钮的文案与**可访问名**。
   *
   * [WHY 必须有 aria-label] 这三个按钮的文本是 `−` / `＋` / 当前百分比 —— 无障碍名
   * 的计算里文本优先，`title` 只退化成描述。2026-11-16 CDP 实测：
   * `role=button name="−" desc="缩小"`，读屏念的是一串标点。
   * [WHY 重置键的名字不跟显示值走] 它显示的是**当前**缩放（150%），按下去回到 100%；
   * 名字若取显示值就成了「一个写着 150% 的按钮」。
   */
  @property({ type: String }) zoomOutText = COPY.zoomOut;
  @property({ type: String }) zoomInText = COPY.zoomIn;
  @property({ type: String }) zoomResetText = COPY.zoomReset;

  // ── 事件回调属性（宿主可直接传函数, 同时保留 composed 事件） ──
  @property({ type: Object, attribute: false }) onGenerate?: (detail: { content: string; data: DocData }) => void;
  @property({ type: Object, attribute: false }) onPrint?: () => void;
  @property({ type: Object, attribute: false })
  onExport?: (detail: { blob: Blob | null; error?: string }) => void;

  /** 分页结果：overflow=true 的页纸张自适应高度（单块超页高时内容不被裁切, 2026-09-25 线上实撞） */
  private _pages: { html: string; overflow: boolean }[] = [];
  private _exporting = false;
  private _error = "";
  private _eventsBound = false;
  private _lastKey = "";

  willUpdate(): void {
    const key = `${this.content}||${this.formatConfig}||${JSON.stringify(this.data ?? {})}`;
    if (key === this._lastKey) return;
    this._lastKey = key;
    this._recompute();
  }

  private _cfg(): DocFormatConfig {
    return parseFormatConfig(this.formatConfig);
  }

  /** 生成正文 HTML（块 DSL > HTML > Markdown）并切页 */
  private _recompute(): void {
    const cfg = this._cfg();
    const body = generateDocument(this.content, this.data ?? {});
    this._pages = this._paginate(body, cfg);
  }

  /**
   * 分页：把正文块按 A4 内容区高度（1123px - 上下页边距 - 页眉页脚）切分。
   * [WHY] 几何常量与纸张 CSS 同源（PAPER_*_PX + mmToPx 唯一出口），整数 px 在任意
   * 浏览器缩放下布局一致。
   * [WHY] 无布局引擎（happy-dom）时高度恒为 0 → 降级单页。
   */
  private _paginate(bodyHtml: string, cfg: DocFormatConfig): { html: string; overflow: boolean }[] {
    const style = formatConfigToStyle(cfg);
    if (!bodyHtml.trim()) return [];
    const mT = mmToPx(cfg.marginTop ?? 20);
    const mB = mmToPx(cfg.marginBottom ?? 20);
    const mL = mmToPx(cfg.marginLeft ?? 18);
    const mR = mmToPx(cfg.marginRight ?? 18);
    const contentW = Math.max(40, PAPER_WIDTH_PX - mL - mR); // 正文宽 px
    const innerH = Math.max(60, PAPER_HEIGHT_PX - mT - mB); // 纸张内容区高 px

    // 页眉/页脚占高（不入分页流，需从页容量中扣除）
    const hfH = this._measureHF(cfg, style, contentW);

    const probe = document.createElement("div");
    probe.setAttribute(
      "style",
      `position:absolute;left:-9999px;top:0;width:${contentW}px;${style};font-family:var(--z-doc-body-font);font-size:var(--z-doc-body-size);line-height:var(--z-doc-line-height);`,
    );
    probe.className = "z-doc-body";
    // [WHY] 页容量直接用 px 常量铺 ruler：几何与纸张 CSS 同源整数 px，无需 mm→px 实测
    const ruler = document.createElement("div");
    ruler.style.cssText = `position:absolute;left:-9999px;top:0;width:${innerH}px;height:0;`;
    document.body.appendChild(probe);
    document.body.appendChild(ruler);
    // [WHY] 探针挂宿主 body, 不在 shadow DOM 内, 拿不到 document.css 的组件样式——
    // 表格/标题按 UA 默认样式测高, 系统性偏差 → 切页过满 → 真实渲染溢出 --sized 被裁。
    // 注入同一份 documentCSS 使测量与真实渲染同源; probe 同步测完即删, 不产生绘制。
    probe.innerHTML = `<style>${documentCSS}</style>${bodyHtml}`;
    const pageHeight = ruler.getBoundingClientRect().width;
    ruler.remove();

    // [WHY] 用「逐元素 offset 偏移量」而非各自 getBoundingClientRect().height 累加：
    // 后者不含 margin（document.css 标题/段落/表格都有 6pt+ 下边距, 签名区有 24pt 上边距）,
    // 逐块累加系统性偏小 → used 永远到不了页容量 → 全文塞进一页被 overflow:hidden 裁掉
    // （2026-09-25 线上实撞「质量与验收超出 A4 且无第二页」）。offset 差值天然含 margin 折叠。
    // [WHY] 注入的 <style> 不是内容块, 不参与分页
    const els = (Array.from(probe.children) as HTMLElement[]).filter((el) => el.tagName !== "STYLE");
    const tops = els.map((el) => el.getBoundingClientRect().top);
    let totalH = 0;
    if (els.length) {
      const last = els[els.length - 1];
      const lastMb = Number.parseFloat(getComputedStyle(last).marginBottom) || 0;
      totalH = last.getBoundingClientRect().bottom + lastMb - tops[0];
    }
    const rel = tops.map((t) => Math.max(0, t - tops[0]));
    const extents = rel.map((t, i) => Math.max(0, (i + 1 < els.length ? rel[i + 1] : totalH) - t));
    probe.remove();

    // [WHY] 测量不可用时降级单页且标记 overflow：纸张自适应高度, 内容全可见
    // （--sized 纸张 overflow:hidden, 若按固定页高渲染会直接裁掉超页内容）
    if (pageHeight <= 0 || !els.length || extents.every((h) => h <= 0)) return [{ html: bodyHtml, overflow: true }];

    // [WHY] 探针与真实渲染环境仍有残余差异（字体度量子集等）, 留 3% 页底余量
    const usable = Math.max(10, (pageHeight - hfH) * 0.97);
    const pages: { html: string; overflow: boolean }[] = [];
    let buffer: string[] = [];
    let used = 0;
    const flush = (overflow: boolean) => {
      if (buffer.length) pages.push({ html: buffer.join(""), overflow });
      buffer = [];
      used = 0;
    };
    els.forEach((el, i) => {
      const h = extents[i];
      if (used > 0 && used + h > usable) flush(false);
      buffer.push(el.outerHTML);
      used += h;
      // [WHY] 单块独占一页仍超页高（如超长表格）：该页标记 overflow 让纸张长高,
      // 否则 --sized 的 overflow:hidden 会把超出部分裁掉, 用户看到内容「消失」
      if (used > usable) flush(true);
    });
    flush(false);
    return pages.length ? pages : [{ html: bodyHtml, overflow: true }];
  }

  /** 页眉+页脚在纸张内占据的总高度（px；无页眉页脚返回 0） */
  private _measureHF(cfg: DocFormatConfig, style: string, contentW: number): number {
    const head = cfg.headerText?.trim();
    const foot = cfg.footerText?.trim();
    if (!head && !foot) return 0;
    const hfHtml =
      (head ? `<div class="z-doc-page-head">${esc(head)}</div>` : "") +
      (foot ? `<div class="z-doc-page-foot">${esc(foot)}</div>` : "");
    const probe = document.createElement("div");
    probe.setAttribute("style", `position:absolute;left:-9999px;top:0;width:${contentW}px;${style};font-family:var(--z-doc-body-font);`);
    probe.className = "z-doc-paper";
    probe.innerHTML = `<style>${documentCSS}</style>${hfHtml}`;
    document.body.appendChild(probe);
    const els = (Array.from(probe.children) as HTMLElement[]).filter((el) => el.tagName !== "STYLE");
    let h = 0;
    if (els.length) {
      const last = els[els.length - 1];
      const lastMb = Number.parseFloat(getComputedStyle(last).marginBottom) || 0;
      h = last.getBoundingClientRect().bottom + lastMb - els[0].getBoundingClientRect().top;
    }
    probe.remove();
    return Math.max(0, h);
  }

  render(): string {
    if (this._pages.length === 0 && !this._lastKey) this._recompute();
    const cfg = this._cfg();
    const style = formatConfigToStyle(cfg);
    const head = cfg.headerText?.trim() ?? "";
    const foot = cfg.footerText?.trim() ?? "";
    const headHtml = head ? `<div class="z-doc-page-head">${esc(head)}</div>` : "";
    const footHtml = foot ? `<div class="z-doc-page-foot">${esc(foot)}</div>` : "";
    const hfCls = head || foot ? " z-doc-paper--hf" : "";
    const pagesHtml = this._pages.length
      ? this._pages
          .map(
            (p, i) => html`
              <div class="z-docp__page" part="page" data-page="${i + 1}">
                <div class="z-docp__scale" style="${this._scaleStyle()}">
                  <div class="${p.overflow ? "z-doc-paper" : "z-doc-paper z-doc-paper--sized"}${hfCls} z-doc-body" part="paper" style="${esc(style)}">${headHtml}<div class="z-doc-page-body">${p.html}</div>${footHtml}</div>
                </div>
                <div class="z-docp__page-no">${esc(this.pageText.replace("{page}", String(i + 1)).replace("{total}", String(this._pages.length)))}</div>
              </div>`,
          )
          .join("")
      : `<div class="z-docp__empty" part="empty">${esc(this.emptyText)}</div>`;

    const zoomPct = `${Math.round(this._clampedZoom() * 100)}%`;
    return html`
      <div class="z-docp" part="root">
        ${this.showToolbar
          ? html`<div class="z-docp__toolbar" part="toolbar">
              <span class="z-docp__title">${esc(this.previewText)}</span>
              <span class="z-docp__spacer"></span>
              ${this._error ? `<span class="z-docp__error">${esc(this._error)}</span>` : ""}
              <button type="button" class="z-docp__btn" data-op="zoom-out" part="zoom-out-button" title="${esc(this.zoomOutText)}" aria-label="${esc(this.zoomOutText)}">−</button>
              <button type="button" class="z-docp__btn z-docp__zoom-pct" data-op="zoom-reset" part="zoom-reset-button" title="${esc(this.zoomResetText)}" aria-label="${esc(this.zoomResetText)}">${esc(zoomPct)}</button>
              <button type="button" class="z-docp__btn" data-op="zoom-in" part="zoom-in-button" title="${esc(this.zoomInText)}" aria-label="${esc(this.zoomInText)}">＋</button>
              <button type="button" class="z-docp__btn" data-op="generate" part="generate-button">${esc(this.generateText)}</button>
              <button type="button" class="z-docp__btn" data-op="print" part="print-button">${esc(this.printText)}</button>
              <button type="button" class="z-docp__btn z-docp__btn--primary" data-op="export" part="export-button"${this._exporting ? " disabled" : ""}>
                ${esc(this._exporting ? this.exportingText : this.exportText)}
              </button>
            </div>`
          : ""}
        <div class="z-docp__pages" part="pages">${pagesHtml}</div>
      </div>`;
  }

  // ── 手动缩放（transform 等比，不重排） ───────────────────

  private _clampedZoom(): number {
    return Math.min(2, Math.max(0.5, this.zoom || 1));
  }

  private _scaleStyle(): string {
    const z = this._clampedZoom();
    return z === 1 ? "" : `transform: scale(${z});`;
  }

  private _zoomStep(delta: number): void {
    const next = Math.min(2, Math.max(0.5, Math.round((this._clampedZoom() + delta) * 10) / 10));
    if (next === this._clampedZoom()) return;
    this.zoom = next;
    this.requestUpdate();
  }

  /**
   * 缩放高度补偿：transform 不改变布局盒, scale≠1 时按视觉高度撑高包装层,
   * 否则 z>1 时末页底部超出可滚动区、z<1 时页脚下方留大段空白。
   */
  private _compensateScale(): void {
    const root = this.shadowRoot as unknown as HTMLElement | null;
    if (!root) return;
    const z = this._clampedZoom();
    root.querySelectorAll<HTMLElement>(".z-docp__scale").forEach((wrap) => {
      const paper = wrap.firstElementChild as HTMLElement | null;
      if (!paper) return;
      // [WHY] offsetHeight<=0（无布局引擎/未布局）不补偿, 避免把包装层压成 0 高
      if (paper.offsetHeight <= 0) return;
      wrap.style.height = z === 1 ? "" : `${Math.ceil(paper.offsetHeight * z)}px`;
    });
  }

  updated(): void {
    this._bindEvents();
    this._compensateScale();
  }

  /** 生成：把当前 data 与模板合成为文档并回调宿主（便于挂业务流程） */
  generate(): void {
    this._recompute();
    this.requestUpdate();
    const detail = { content: this.content, data: this.data ?? {} };
    this.emit("z-generate", detail);
    this.onGenerate?.(detail);
  }

  setData(data: DocData): void {
    this.data = data;
    this._recompute();
    this.requestUpdate();
  }

  /** 当前文档完整 HTML（打印 / 宿主二次加工 / 后端导出输入） */
  getDocumentHtml(): string {
    const style = formatConfigToStyle(this._cfg());
    const body = this._pages.length ? this._pages.map((p) => p.html).join("") : generateDocument(this.content, this.data ?? {});
    // [WHY] 字体族含双引号（"PingFang SC"）, 插进 style 属性必须转义, 否则属性被截断
    return `<div class="z-doc-body" style="${esc(style)}">${body}</div>`;
  }

  // ── 打印：同源 DOM + 独立打印样式, 分页不裁切 ─────────────

  print(): void {
    const win = window.open("", "_blank", "width=900,height=1200");
    if (!win) {
      this._error = "window.open blocked";
      this.requestUpdate();
      return;
    }
    const cfg = this._cfg();
    const style = esc(formatConfigToStyle(cfg));
    const head = cfg.headerText?.trim() ?? "";
    const foot = cfg.footerText?.trim() ?? "";
    const headHtml = head ? `<div class="z-doc-page-head">${esc(head)}</div>` : "";
    const footHtml = foot ? `<div class="z-doc-page-foot">${esc(foot)}</div>` : "";
    const hfCls = head || foot ? " z-doc-paper--hf" : "";
    const paper = (body: string): string =>
      `<div class="z-doc-paper${hfCls} z-doc-body" style="${style}">${headHtml}<div class="z-doc-page-body">${body}</div>${footHtml}</div>`;
    const pages = this._pages.length
      ? this._pages.map((p) => `<div class="z-doc-page">${paper(p.html)}</div>`).join("")
      : `<div class="z-doc-page">${paper(generateDocument(this.content, this.data ?? {}))}</div>`;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
<title>${esc(this.template?.name ?? this.exportName)}</title>
<style>${documentCSS}
  body { margin: 0; background: #fff; }
  .z-doc-paper { box-shadow: none; border: none; min-height: 0; margin: 0; }
  .z-doc-page { page-break-after: always; break-after: page; }
  .z-doc-page:last-child { page-break-after: auto; break-after: auto; }
  @page { size: A4; margin: 0; }
</style></head><body>${pages}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    this.emit("z-print");
    this.onPrint?.();
  }

  // ── 导出 docx（适配器注入, 模块不含后端） ────────────────

  async exportDocx(): Promise<Blob | null> {
    if (!this.renderAdapter || !this.template) {
      this._error = this.noAdapterText;
      this.requestUpdate();
      this.emit("z-export", { blob: null, error: this.noAdapterText });
      this.onExport?.({ blob: null, error: this.noAdapterText });
      return null;
    }
    this._exporting = true;
    this._error = "";
    this.requestUpdate();
    try {
      const blob = await this.renderAdapter.renderDocx(this.template, this.data ?? {});
      this._download(blob);
      this.emit("z-export", { blob });
      this.onExport?.({ blob });
      return blob;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this._error = `${this.exportFailedText}: ${msg}`;
      this.emit("z-export", { blob: null, error: msg });
      this.onExport?.({ blob: null, error: msg });
      return null;
    } finally {
      this._exporting = false;
      this.requestUpdate();
    }
  }

  private _download(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${this.exportName}.docx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private _bindEvents(): void {
    if (this._eventsBound) return;
    const root = this.shadowRoot as unknown as HTMLElement;
    if (!root) return;
    root.addEventListener("click", this._onClick);
    this._eventsBound = true;
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-op]");
    if (!btn) return;
    const op = btn.dataset.op;
    if (op === "generate") this.generate();
    else if (op === "print") this.print();
    else if (op === "export") void this.exportDocx();
    else if (op === "zoom-in") this._zoomStep(0.1);
    else if (op === "zoom-out") this._zoomStep(-0.1);
    else if (op === "zoom-reset") {
      if (this._clampedZoom() !== 1) {
        this.zoom = 1;
        this.requestUpdate();
      }
    }
  };
}

// [WHY] 事件回调（onExport/onPrint/onGenerate）与 composed 事件双通道：函数式属性便于宿主
// 直接挂业务流程, composed 事件便于跨 shadow 边界监听（issue IKICYW「事件回调」约定）
customElements.define("z-doc-preview", ZDocPreview);