// ═══════════════════════════════════════════════════════════
// z-doc-template-manager: 模板列表（分页 / 搜索 / 分类筛选 / 默认标记 / 增删改）
// [WHY] 纯前端：所有读写经 dataSource 适配器（DocTemplateDataSource）注入, 模块不绑定后端。
// 组件自身不弹表单, 新建/编辑以事件交给宿主（宿主可复用 z-detail-form / z-modal 承载表单）。
// See: wiki/requirements/REQ-016-doc-template.md（issue IKICYW）
// ═══════════════════════════════════════════════════════════

import { COPY, BaseElement, html, property, defineElement } from "../core/index.js";
// 搜索框走 L1 组件（防抖/清空/焦点光晕一份实现），本文件不再自己计时
import "../components/search-bar/index.js";
import { esc } from "./render.js";
import type { DocTemplate, DocTemplateDataSource, DocTemplateQuery } from "./types.js";
import docTemplateManagerCSS from "./doc-template-manager.css?raw";

export class ZDocTemplateManager extends BaseElement {
  static styles = docTemplateManagerCSS;

  // [WHY] 适配器为函数型契约, 不走 attribute（attribute:false 编程式赋值）
  @property({ type: Object, attribute: false }) dataSource: DocTemplateDataSource | null = null;
  @property({ type: Number }) pageSize = 10;
  /** 当前分类筛选值（空 = 全部） */
  @property({ type: String }) category = "";
  /** 分类候选（宿主注入, 用于筛选下拉） */
  @property({ type: Array, attribute: false }) categories: string[] = [];
  @property({ type: String }) selectedId = "";

  // ── i18n 文案（属性化, 见 [[REQ-001]]；默认简体中文, 宿主可覆盖） ──
  @property({ type: String }) titleText = COPY.docTemplates;
  @property({ type: String }) searchPlaceholder = COPY.searchTemplatePlaceholder;
  @property({ type: String }) newText = COPY.newTemplate;
  @property({ type: String }) allCategoryText = COPY.allCategories;
  @property({ type: String }) nameLabel = COPY.templateName;
  @property({ type: String }) categoryLabel = COPY.category;
  @property({ type: String }) descriptionLabel = COPY.description;
  @property({ type: String }) updatedLabel = COPY.updatedAt;
  @property({ type: String }) defaultText = COPY.defaultBadge;
  @property({ type: String }) actionsLabel = COPY.actionsColumn;
  @property({ type: String }) editText = COPY.editAction;
  @property({ type: String }) deleteText = COPY.deleteItem;
  @property({ type: String }) emptyText = COPY.emptyTemplates;
  @property({ type: String }) loadingText = COPY.loading;
  @property({ type: String }) totalText = COPY.totalCount;
  @property({ type: String }) prevText = COPY.prevPage;
  @property({ type: String }) nextText = COPY.nextPage;
  @property({ type: String }) confirmDeleteText = COPY.confirmDeleteTemplate;

  private _items: DocTemplate[] = [];
  private _total = 0;
  private _page = 1;
  private _keyword = "";
  private _loading = false;
  private _error = "";
  private _eventsBound = false;
  /** dataSource 是否已触发过首拉（connectedCallback 或 updated 二者只取其一，防双拉） */
  private _dataSourcePrimed = false;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.dataSource) {
      this._dataSourcePrimed = true;
      this.refresh();
    }
  }

  // [CONTRACT] BaseElement.performUpdate 调 updated() **不传参**（非 lit，无 changed Map），
  // 签名必须无参——写成 lit 风格 updated(changed) 会在 changed.has 处直接 TypeError
  // （[[2026-09-25]] 线上 doc-template chunk 实撞）。
  updated(): void {
    this._bindEvents();
    // [WHY] React/Vue wrapper 均在元素 connectedCallback **之后**（各自 useEffect/onMounted）
    // 才把函数型 dataSource 作为 DOM property 注入 ⇒ connectedCallback 的预取必然落空,
    // 列表永远为空且零请求。dataSource 从「无 → 有」时在此补一次首拉；
    // 已有适配器后宿主换实现属显式行为, 由宿主自行调 refresh()。
    if (!this._dataSourcePrimed && this.dataSource) {
      this._dataSourcePrimed = true;
      void this.refresh(1);
    }
  }

  // ── 数据 ────────────────────────────────────────────────

  /** 拉取列表（宿主可主动调用；失败 emit z-error 并保留上一页数据） */
  async refresh(page = this._page): Promise<void> {
    const ds = this.dataSource;
    if (!ds) return;
    this._page = page;
    this._loading = true;
    this._error = "";
    this.requestUpdate();
    try {
      const query: DocTemplateQuery = {
        page: this._page,
        size: this.pageSize,
        keyword: this._keyword || undefined,
        category: this.category || undefined,
      };
      const res = await ds.list(query);
      this._items = res.data ?? [];
      this._total = res.total ?? 0;
      this.emit("z-refresh", { total: this._total, page: this._page });
    } catch (e) {
      this._error = e instanceof Error ? e.message : String(e);
      this.emit("z-error", { error: e });
    } finally {
      this._loading = false;
      this.requestUpdate();
    }
  }

  /** [WHY] 删除走适配器后自动回到当前页刷新, 宿主无需重复拉取（业务侧仍需同步自己的缓存） */
  async removeTemplate(id: string): Promise<void> {
    const ds = this.dataSource;
    if (!ds) return;
    try {
      await ds.remove(id);
      if (this.selectedId === id) this.selectedId = "";
      await this.refresh();
    } catch (e) {
      this._error = e instanceof Error ? e.message : String(e);
      this.emit("z-error", { error: e });
      this.requestUpdate();
    }
  }

  private get _pageCount(): number {
    return Math.max(1, Math.ceil(this._total / this.pageSize));
  }

  // ── 渲染 ────────────────────────────────────────────────

  render(): string {
    const rows = this._items
      .map((t) => {
        const active = t.id === this.selectedId ? " z-dtm__row--active" : "";
        return html`
          <tr class="z-dtm__row${active}" data-id="${esc(t.id)}" part="row">
            <td class="z-dtm__cell z-dtm__cell--name">
              <span class="z-dtm__name">${esc(t.name)}</span>
              ${t.isDefault ? `<span class="z-dtm__badge" part="default-badge">${esc(this.defaultText)}</span>` : ""}
            </td>
            <td class="z-dtm__cell">${esc(t.category ?? "")}</td>
            <td class="z-dtm__cell z-dtm__cell--desc">${esc(t.description ?? "")}</td>
            <td class="z-dtm__cell z-dtm__cell--time">${esc(t.updatedAt ?? "")}</td>
            <td class="z-dtm__cell z-dtm__cell--ops">
              <button type="button" class="z-dtm__btn" data-action="edit" data-id="${esc(t.id)}">${esc(this.editText)}</button>
              <button type="button" class="z-dtm__btn z-dtm__btn--danger" data-action="delete" data-id="${esc(t.id)}">${esc(this.deleteText)}</button>
            </td>
          </tr>`;
      })
      .join("");

    const body = this._loading
      ? `<div class="z-dtm__state">${esc(this.loadingText)}</div>`
      : this._items.length === 0
        ? `<div class="z-dtm__state">${esc(this.emptyText)}</div>`
        : html`
          <table class="z-dtm__table" part="table">
            <thead>
              <tr>
                <th>${esc(this.nameLabel)}</th>
                <th>${esc(this.categoryLabel)}</th>
                <th>${esc(this.descriptionLabel)}</th>
                <th>${esc(this.updatedLabel)}</th>
                <th class="z-dtm__th--ops">${esc(this.actionsLabel)}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>`;

    const pageOpts = Array.from({ length: this._pageCount }, (_, i) => i + 1)
      .map(
        (p) =>
          `<button type="button" class="z-dtm__page${p === this._page ? " z-dtm__page--active" : ""}" data-page="${p}">${p}</button>`,
      )
      .join("");

    return html`
      <div class="z-dtm" part="root">
        <div class="z-dtm__toolbar" part="toolbar">
          <span class="z-dtm__title">${esc(this.titleText)}</span>
          <!-- [WHY 换成 z-search-bar] 原来是原生 input + 这里手写 250ms 防抖 + 手写 aria，
               与 m-search 的契约（防抖 / z-input / z-search / z-clear）是两份实现。
               组件自带清空按钮与 Esc 清空，本文件不再持有定时器。 -->
          <z-search-bar class="z-dtm__search" part="search"
                        placeholder="${esc(this.searchPlaceholder)}"
                        value="${esc(this._keyword)}"
                        debounce="250"></z-search-bar>
          ${this.categories.length
            ? html`<select class="z-dtm__select" part="category-filter" aria-label="${esc(this.categoryLabel)}">
                <option value=""${this.category ? "" : " selected"}>${esc(this.allCategoryText)}</option>
                ${this.categories
                  .map((c) => `<option value="${esc(c)}"${c === this.category ? " selected" : ""}>${esc(c)}</option>`)
                  .join("")}
              </select>`
            : ""}
          <span class="z-dtm__spacer"></span>
          <button type="button" class="z-dtm__btn z-dtm__btn--primary" data-action="create" part="create-button">
            ${esc(this.newText)}
          </button>
        </div>

        ${this._error ? `<div class="z-dtm__error" part="error">${esc(this._error)}</div>` : ""}
        <div class="z-dtm__list" part="list">${body}</div>

        <div class="z-dtm__footer" part="footer">
          <span class="z-dtm__total">${esc(this.totalText.replace("{total}", String(this._total)))}</span>
          <span class="z-dtm__spacer"></span>
          <button type="button" class="z-dtm__page" data-page="${this._page - 1}"${this._page <= 1 ? " disabled" : ""}>
            ${esc(this.prevText)}
          </button>
          ${pageOpts}
          <button type="button" class="z-dtm__page" data-page="${this._page + 1}"${this._page >= this._pageCount ? " disabled" : ""}>
            ${esc(this.nextText)}
          </button>
        </div>
      </div>`;
  }

  // ── 事件（shadow 级委托一次, 见 [[web-components-render-pitfalls]]） ──

  private _bindEvents(): void {
    if (this._eventsBound) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    if (!shadow) return;
    shadow.addEventListener("click", this._onClick);
    shadow.addEventListener("change", this._onChange);
    // [WHY] input 走 debounce：搜索框每次输入都请求会打爆适配器
    // [WHY 监听 z-input 而不是原生 input] 搜索框已由 z-search-bar 接管输入与防抖，
    // 它对外只发 z-input（结算后的值）；原生 input 仍在组件 shadow 内部，到不了这里。
    shadow.addEventListener("z-input", this._onInput);
    this._eventsBound = true;
  }

  private _onClick = (e: Event): void => {
    const el = e.target as HTMLElement;
    const pageBtn = el.closest<HTMLElement>("[data-page]");
    if (pageBtn && !pageBtn.hasAttribute("disabled")) {
      const page = Number(pageBtn.dataset.page);
      if (page >= 1 && page <= this._pageCount) void this.refresh(page);
      return;
    }
    const btn = el.closest<HTMLElement>("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id ?? "";
    const template = this._items.find((t) => t.id === id);

    if (action === "create") {
      this.emit("z-create", { category: this.category || undefined });
    } else if (action === "edit" && template) {
      this.selectedId = template.id;
      this.emit("z-edit", { template });
      this.requestUpdate();
    } else if (action === "delete" && template) {
      // [WHY] 用户档案偏好：对话框不因点遮罩关闭, 删除确认用原生 confirm 保持零依赖
      if (typeof window !== "undefined" && window.confirm && !window.confirm(this.confirmDeleteText)) return;
      void this.removeTemplate(id);
    }
  };

  private _onChange = (e: Event): void => {
    const el = e.target as HTMLElement;
    if (el.classList.contains("z-dtm__select")) {
      this.category = (el as unknown as HTMLSelectElement).value;
      void this.refresh(1);
    }
  };

  /** 搜索框已防抖（debounce="250"），这里只消费结果，不再自己计时。 */
  private _onInput = (e: Event): void => {
    const el = e.target as HTMLElement;
    if (el.tagName !== "Z-SEARCH-BAR") return;
    this._keyword = (e as CustomEvent<{ value: string }>).detail.value;
    void this.refresh(1);
  };
}

// [WHY] 行内按钮（编辑/删除）与分页按钮同走 click 委托；行点击选中以 z-select 交由宿主
defineElement("z-doc-template-manager", ZDocTemplateManager);