// [WHY] 2026-10-25 系统审计：从 DocTemplateEditor.ts（1264 行）按职责拆出
// 职责：z-doc-template-editor 的状态 / 生命周期 / 持久画布构建 / 查询型公开 API；
// 交互与编辑命令见 DocTemplateEditor.ts（子类）, 分页排版见 editor-page-layout.ts, HTML 见 editor-html.ts。

// ═══════════════════════════════════════════════════════════
// z-doc-template-editor: 块结构文档编辑器（编辑即预览）
// [WHY] BaseElement 每次渲染整体替换 shadow.innerHTML（[[web-components-render-pitfalls]] 陷阱 2）：
// 画布含 contenteditable，若存在于 render 输出中则任何属性变更都会销毁编辑区/丢光标。
// 方案与 z-rich-text 一致（[[2026-08-11-W19-rich-text]]）：render 只输出静态 shell，
// 画布 firstUpdated 一次性构建为持久节点，updated() 将其 re-parent 回新 shell；
// 结构变更（增删/排序/属性/占位符）置 _canvasDirty 重建画布，纯输入走直写模型不重建。
// 排版配置（中文排版）经 CSS 变量下发到画布纸张, 与预览/打印/导出同一出口（[[REQ-016-doc-template]]）。
// See: wiki/requirements/REQ-016-doc-template.md（issue IKICYW）
// ═══════════════════════════════════════════════════════════

import { BaseElement, property, COPY } from "../core/index.js";
import {
  type DocBlock,
  type DocFormatConfig,
  type DocPlaceholderDef,
  DEFAULT_FORMAT_CONFIG,
  parseFormatConfig,
} from "./types.js";
import { esc, extractPlaceholderKeys, parseBlocks } from "./render.js";
import documentCSS from "./document.css?raw";
import docTemplateEditorCSS from "./doc-template-editor.css?raw";
import docTemplateEditorPanelCSS from "./doc-template-editor-panel.css?raw";
import { type EditorView, type PanelTab, blockHtml, renderEditorShell } from "./editor-html.js";
import { compensateScale, createPageShell, layoutPages, syncPagesStyle } from "./editor-page-layout.js";

export abstract class DocTemplateEditorBase extends BaseElement {
  static styles = documentCSS + docTemplateEditorCSS + docTemplateEditorPanelCSS;

  /** 块结构 DSL（JSON 串）；也兼容 HTML / Markdown 降级内容（只读展示, 编辑按段落块处理） */
  @property({ type: String, attribute: false }) content = "";
  /** 排版配置 JSON 串 */
  @property({ type: String, attribute: false }) formatConfig = "";
  /** 占位符定义表（宿主注入, 编辑器内拖拽/插入） */
  @property({ type: Array, attribute: false }) placeholders: DocPlaceholderDef[] = [];
  @property({ type: Boolean }) readonly = false;
  /**
   * 画布手动缩放倍率（0.5–2.0，1 = 100%）。
   * [WHY] 纸张几何固定（794px），缩放经 transform: scale 等比视觉缩放，不触发重排 ——
   * 折行在 100% 布局下决定后整体缩放，内部元素严格等比（2026-09-26 需求）。
   * 画布不再 width:100% 随容器伸缩：页面缩放/窗口变化不改变排版。
   */
  @property({ type: Number }) zoom = 1;

  // ── i18n 文案（属性化, 见 [[REQ-001]]） ──
  @property({ type: String }) addHeadingText = COPY.docHeading;
  @property({ type: String }) addParagraphText = COPY.docParagraph;
  @property({ type: String }) addTableText = COPY.tableRegion;
  @property({ type: String }) addListText = COPY.docList;
  @property({ type: String }) addSignatureText = COPY.docSignature;
  @property({ type: String }) moveUpText = COPY.moveUp;
  @property({ type: String }) moveDownText = COPY.moveDown;
  @property({ type: String }) removeText = COPY.deleteItem;
  @property({ type: String }) multiSelectText = COPY.multiSelect;
  @property({ type: String }) propertiesTabText = COPY.propertiesTab;
  @property({ type: String }) placeholdersTabText = COPY.placeholdersTab;
  @property({ type: String }) typographyTabText = COPY.typographyTab;
  @property({ type: String }) insertText = COPY.insertAction;
  @property({ type: String }) noPlaceholderText = COPY.noPlaceholderDef;
  @property({ type: String }) emptyText = COPY.emptyDocCanvas;
  @property({ type: String }) alignText = COPY.alignLabel;
  @property({ type: String }) alignLeftText = COPY.alignLeftShort;
  @property({ type: String }) alignCenterText = COPY.alignCenterShort;
  @property({ type: String }) alignRightText = COPY.alignRightShort;
  @property({ type: String }) fontFamilyText = COPY.fontFamily;
  @property({ type: String }) fontSizeText = COPY.fontSize;
  @property({ type: String }) colorText = COPY.colorLabel;
  @property({ type: String }) boldText = COPY.boldAction;
  @property({ type: String }) indentText = COPY.firstLineIndent;
  @property({ type: String }) removeIndentText = COPY.removeIndent;
  // 缩放按钮的名字：文本是 − / ＋ / 当前百分比，`title` 只当描述用（读屏念的是标点）
  @property({ type: String }) zoomOutText = COPY.zoomOut;
  @property({ type: String }) zoomInText = COPY.zoomIn;
  @property({ type: String }) zoomResetText = COPY.zoomReset;
  @property({ type: String }) columnWidthText = COPY.columnWidthPt;
  // ── 表格配置面板文案（[[REQ-016-doc-template]]：编辑器内配置表格数据源与展示字段） ──
  @property({ type: String }) tableConfigText = COPY.tableConfig;
  @property({ type: String }) dataKeyText = COPY.dataKeyLabel;
  @property({ type: String }) dataKeyHintText = COPY.dataKeyHint;
  @property({ type: String }) columnKeyText = COPY.fieldColumn;
  @property({ type: String }) columnLabelText = COPY.headerColumn;
  @property({ type: String }) addColumnText = COPY.addColumn;
  @property({ type: String }) removeColumnText = COPY.removeColumn;
  @property({ type: String }) undefinedFieldText = COPY.undefinedField;
  @property({ type: String }) noTableFieldText = COPY.noTableFieldDef;
  @property({ type: String }) staticRowText = COPY.staticRows;
  @property({ type: String }) addRowText = COPY.addRow;
  @property({ type: String }) removeRowText = COPY.removeLastRow;
  @property({ type: String }) bodyFontText = COPY.bodyFont;
  @property({ type: String }) headingFontText = COPY.headingFont;
  @property({ type: String }) bodySizeText = COPY.bodySize;
  @property({ type: String }) headingSizeText = COPY.headingSize;
  @property({ type: String }) lineHeightText = COPY.lineHeight;
  @property({ type: String }) paraSpacingText = COPY.paraSpacingPt;
  @property({ type: String }) firstIndentText = COPY.firstIndentDetail;
  @property({ type: String }) pageMarginText = COPY.pageMarginMm;
  @property({ type: String }) headerTextText = COPY.pageHeader;
  @property({ type: String }) footerTextText = COPY.pageFooter;
  /** 分页符标签（{page} = 下一页页码）；编辑视图按 A4 分页展示（Word 式） */
  @property({ type: String }) pageBreakText = COPY.pageBreakLabel;

  // ── 编辑器内部状态 ──
  protected _blocks: DocBlock[] = [];
  protected _cfg: DocFormatConfig = { ...DEFAULT_FORMAT_CONFIG };
  protected _selectedId = "";
  protected _pickedIds = new Set<string>();
  protected _multi = false;
  protected _panel: PanelTab = "props";
  // [WHY] 页面容器持久节点（内含逐页独立 A4 纸张）：结构变更才重建（见文件头注释）
  protected _pagesWrap: HTMLDivElement | null = null;
  /** 缩放包装层（wrap → scaleEl → canvas）：transform 挂包装层, 不污染画布内联样式 */
  private _scaleEl: HTMLDivElement | null = null;
  protected _canvasDirty = true;
  protected _dragId = "";
  private _emitTimer: ReturnType<typeof setTimeout> | null = null;
  protected _lastHydrated = "";
  private _lastPhRef: DocPlaceholderDef[] | null = null;
  /** [WHY] 画布内容高度随输入变化（缩放≠1 时包装层需同步补偿视觉高度） */
  private _resizeObs: ResizeObserver | null = null;
  /** [WHY] 输入会改变块高 → 分页布局去抖重算（布局读有强制 reflow, 不能逐键跑） */
  private _pageLayoutTimer: ReturnType<typeof setTimeout> | null = null;

  // ── 生命周期 ────────────────────────────────────────────

  /** 事件绑定由子类（交互层）实现：本基类只负责状态/渲染/查询 */
  protected abstract _bindEvents(): void;

  connectedCallback(): void {
    super.connectedCallback();
    this._hydrateFromProps();
  }

  /** 外部赋值 content/formatConfig → 反解为内部模型（仅当内容真的变化时重建画布） */
  willUpdate(): void {
    this._hydrateFromProps();
  }

  private _hydrateFromProps(): void {
    // [WHY] placeholders 引用变化也要触发画布重建：画布芯片显示字段名取自定义表,
    // 宿主后注入定义时芯片需要重渲染（content/formatConfig 走 key 比对, 数组只能比引用）
    const phChanged = this._lastPhRef !== this.placeholders;
    const key = `${this.content}||${this.formatConfig}`;
    if (key === this._lastHydrated && !phChanged) return;
    this._lastHydrated = key;
    this._lastPhRef = this.placeholders;
    this._blocks = parseBlocks(this.content) ?? [];
    this._cfg = parseFormatConfig(this.formatConfig);
    this._canvasDirty = true;
  }

  /** [WHY] 画布占位符芯片显示字段名（label）而非 {{key}}：模型回写按 data-ph 反解, 显示与模型解耦 */
  protected _labelOf = (key: string): string | undefined =>
    this.placeholders.find((p) => p.key === key)?.label;

  /** 渲染所需的视图状态快照（i18n 文案直接以 this 传入：均为 @property({type: String})） */
  protected _view(): EditorView {
    return {
      readonly: this.readonly,
      blocks: this._blocks,
      selectedId: this._selectedId,
      pickedIds: this._pickedIds,
      multi: this._multi,
      panel: this._panel,
      cfg: this._cfg,
      placeholders: this.placeholders,
      labelOf: this._labelOf,
      zoom: this.zoom,
    };
  }

  render(): string {
    return renderEditorShell(this, this._view());
  }

  firstUpdated(): void {
    const wrap = this.shadowRoot!.querySelector(".z-dte__canvas-wrap");
    if (!wrap) return;
    // [WHY] 缩放包装层：transform: scale 挂包装层而非画布（画布内联样式被
    // _syncPagesStyle 整体覆写, 挂画布会被冲掉）
    const scaleEl = document.createElement("div");
    scaleEl.className = "z-dte__scale";
    wrap.appendChild(scaleEl);
    this._scaleEl = scaleEl;
    // [WHY] 页面容器 = 持久节点（逐页 A4 纸张 + 文档版式类名与预览/打印同源）, 只构建一次
    const pagesWrap = document.createElement("div");
    pagesWrap.className = "z-dte__canvas z-doc-body";
    pagesWrap.setAttribute("part", "canvas");
    scaleEl.appendChild(pagesWrap);
    this._pagesWrap = pagesWrap;
    // [WHY] 页数/页高随输入增减（缩放≠1 时包装层视觉高度需跟随补偿）
    if (typeof ResizeObserver !== "undefined") {
      this._resizeObs = new ResizeObserver(() => compensateScale(this._scaleEl, this._pagesWrap, this.zoom));
      this._resizeObs.observe(pagesWrap);
    }
    this._renderCanvas();
  }

  updated(): void {
    this._bindEvents();
    const wrap = this.shadowRoot!.querySelector(".z-dte__canvas-wrap");
    const pagesWrap = this._pagesWrap;
    const scaleEl = this._scaleEl;
    if (pagesWrap && scaleEl && pagesWrap.parentElement !== scaleEl) {
      // [WHY] re-parent：render 整体替换 innerHTML 后容器被摘下, 重新挂回（同一节点,
      // 内容/光标/撤销栈不丢）
      scaleEl.appendChild(pagesWrap);
    }
    if (scaleEl && wrap && scaleEl.parentElement !== wrap) wrap.appendChild(scaleEl);
    if (pagesWrap && this._canvasDirty) this._renderCanvas();
    else if (pagesWrap) syncPagesStyle(pagesWrap, this._cfg);
    layoutPages(pagesWrap, this._cfg);
    compensateScale(scaleEl, pagesWrap, this.zoom);
  }

  /** 输入会改变块高 → 分页布局去抖重算（不能逐键跑强制 reflow） */
  protected _schedulePageLayout(): void {
    if (this._pageLayoutTimer) clearTimeout(this._pageLayoutTimer);
    this._pageLayoutTimer = setTimeout(() => {
      this._pageLayoutTimer = null;
      layoutPages(this._pagesWrap, this._cfg);
      compensateScale(this._scaleEl, this._pagesWrap, this.zoom);
    }, 400);
  }

  // ── 画布构建（持久节点内容） ────────────────────────────

  private _renderCanvas(): void {
    const wrap = this._pagesWrap;
    if (!wrap) return;
    this._canvasDirty = false;
    syncPagesStyle(wrap, this._cfg);
    if (this._blocks.length === 0) {
      wrap.innerHTML = `<div class="z-dte__empty">${esc(this.emptyText)}</div>`;
      return;
    }
    // [WHY] 先把全部块放进第 1 页, 随后 layoutPages 按实测块高分派到各页
    const page = createPageShell(this._cfg);
    const view = this._view();
    page.querySelector(".z-doc-page-body")!.innerHTML = this._blocks
      .map((b, i) => blockHtml(this, view, b, i))
      .join("");
    for (const ph of page.querySelectorAll<HTMLElement>(".z-doc-ph")) {
      ph.setAttribute("draggable", "false");
    }
    wrap.replaceChildren(page);
  }

  // ── 查询型公开 API ──────────────────────────────────────

  getBlocks(): DocBlock[] {
    return this._blocks.map((b) => ({ ...b }));
  }

  getContent(): string {
    return JSON.stringify(this._blocks);
  }

  getFormatConfig(): DocFormatConfig {
    return { ...this._cfg };
  }

  getFormatConfigJSON(): string {
    return JSON.stringify(this._cfg);
  }

  /** 宿主生成时采集数据：反向提取模板占位符 key 列表 */
  extractPlaceholderKeys(): string[] {
    return extractPlaceholderKeys(this._blocks, this.content.startsWith("[") ? "" : this.content);
  }

  /** 未注入定义但内容里已用的占位符（提示宿主补定义） */
  getUndefinedPlaceholderKeys(): string[] {
    const defined = new Set(this.placeholders.map((p) => p.key));
    return this.extractPlaceholderKeys().filter((k) => !defined.has(k));
  }

  protected _scheduleEmit(immediate = false): void {
    if (this._emitTimer) clearTimeout(this._emitTimer);
    if (immediate) {
      this._emitTimer = null;
      this.emit("z-change", { content: this.getContent(), formatConfig: this.getFormatConfigJSON() });
      return;
    }
    this._emitTimer = setTimeout(() => {
      this._emitTimer = null;
      this.emit("z-change", { content: this.getContent(), formatConfig: this.getFormatConfigJSON() });
    }, 150);
  }

  disconnectedCallback(): void {
    if (this._emitTimer) clearTimeout(this._emitTimer);
    if (this._pageLayoutTimer) clearTimeout(this._pageLayoutTimer);
    this._resizeObs?.disconnect();
    this._resizeObs = null;
    super.disconnectedCallback();
  }
}
