// <z-data-list> 数据列表：fields 定列、items 给数据，自带筛选与分页，筛选 / 翻页 / 排序各发事件。
// [WHY] 通用字段驱动列表: 分页(client/server 双模式) + 字段显示控制(复用 z-report-table
// 内置列选择器) + 按显示字段类型自动提供筛选(顶部内联筛选栏)。核心机制为"双路径",
// 永不交叉: 路径 A 仅 @property setter 触发全量重渲染(render 重建 filterbar+table+pager,
// updated 注入对象属性 + 仅新 table 节点 applyConfig 快照恢复); 路径 B 筛选输入直写
// __zui_prop_filters 不重渲染, 只直改内层 table.data / pager.total/current/totalRecords,
// 焦点/输入不丢。列显隐走第三条轻路径: z-column-visibility-change → classList 直切
// filter-item 的 --hidden(渲染全部 filterable 控件, 隐藏的带 class, 不重建)。
// See: wiki/planning/TASKS/2026-08-13-data-list/task_plan.md
// [2026-08-13] night-hawk: 创建
//
// [2026-10-25 系统审计] 类型与过滤/排序纯逻辑拆到 data-list-filter.ts、
// 三块 markup 拆到 data-list-render.ts；本类只留属性、状态、事件绑定与重算编排。

// [WHY] 组合组件依赖注册: 生成 markup 引用以下兄弟组件, 导入即注册
// (customElements.define 副作用), 使用方只需 import data-list 入口
import "../table/ReportTable.js";
import "../../components/pagination/index.js";
import "../../components/input/index.js";
import "../../components/select/index.js";
import "../../components/option/index.js";
import "../../components/datepicker/index.js";

import { COPY, BaseElement, bindFieldName, html, property } from "../../core/index.js";
import type { FieldNameBinder } from "../../core/index.js";
import type { ReportColumn, SortEntry, TableConfig, ZReportTable } from "../table/ReportTable.js";
import type { ZPagination } from "../../components/pagination/index.js";
import {
  compareRows,
  matchesFilters,
  updateFilterStore,
  type DataListDateFilter,
  type DataListField,
  type DataListFieldType,
  type DataListFilterValue,
  type DataListFilters,
  type DataListMode,
  type DataListNumberFilter,
} from "./data-list-filter.js";
import { renderFilterbar, renderPager, renderTable } from "./data-list-render.js";
import dataListCSS from "./data-list.css?raw";

// 公共类型定义在 data-list-filter.ts，此处转出保持入口不变
export type {
  DataListField,
  DataListFieldType,
  DataListFilterValue,
  DataListFilters,
  DataListNumberFilter,
  DataListDateFilter,
  DataListMode,
};

// [WHY] 事件 detail 透传类型: 与内层组件 emit 签名一致(见 findings 事件表)
interface PagerChangeDetail {
  page: number;
  pageSize: number;
  total: number;
  totalRecords: number;
}

export class ZDataList extends BaseElement {
  static styles = dataListCSS;

  // ── Props (路径 A 触发源) ──────────────────────────────
  @property({ type: Array, attribute: false }) fields: DataListField[] = [];
  @property({ type: Array, attribute: false }) items: Record<string, unknown>[] = [];
  @property({ type: Array, attribute: false }) filters: DataListFilters = {};
  @property({ type: Array, attribute: false }) pageSizes: number[] = [10, 20, 50, 100];
  // [WHY] client: 内部过滤+分页; server: 不切片不过滤, 只转发事件, 数据由应用提供
  @property({ type: String }) mode: DataListMode = "client";
  @property({ type: Number }) page = 1;
  @property({ type: Number, attribute: "page-size" }) pageSize = 10;
  @property({ type: Number, attribute: "total-records" }) totalRecords = 0;
  @property({ type: Boolean }) selectable = false;
  @property({ type: String, attribute: "row-key" }) rowKey = "";
  @property({ type: Boolean }) loading = false;
  @property({ type: String, attribute: "max-height" }) maxHeight = "";
  @property({ type: Boolean, attribute: "show-info" }) showInfo = false;
  @property({ type: Boolean, attribute: "show-page-size" }) showPageSize = false;
  @property({ type: String }) locale = "";
  // i18n
  @property({ type: String, attribute: "all-text" }) allText = COPY.all;
  @property({ type: String, attribute: "yes-text" }) yesText = COPY.yes;
  @property({ type: String, attribute: "no-text" }) noText = COPY.no;
  @property({ type: String, attribute: "reset-text" }) resetText = COPY.reset;
  @property({ type: String, attribute: "min-placeholder" }) minPlaceholder = "Min";
  @property({ type: String, attribute: "max-placeholder" }) maxPlaceholder = "Max";

  // ── 路径 B 内部状态 (直写, 绝不 requestUpdate) ─────────
  private _filters: DataListFilters = {};
  private _sortState: SortEntry[] = [];
  private _config: TableConfig | null = null;
  private _tableEl: ZReportTable | null = null;
  private _pagerEl: ZPagination | null = null;
  /**
   * 筛选控件 → 名称绑定器（见 `_syncFilterNames`）。
   *
   * [WHY 每个控件一个绑定器、还要自己管生命周期] 筛选栏的可见标签是
   * `<span class="z-dl__filter-label">`，而真正的输入框在控件**自己的**影子树里 ——
   * `<label>` / `aria-labelledby` 都跨不过那道边界（2026-11-16 实测：宿主上的
   * `aria-describedby` 指自己影子树里的 id，解析出来是 null）。唯一的办法是把名字
   * 写进内层字段；而控件一重渲染（选了个值就会）字段节点就换一个，名字跟着没了。
   * 绑定器负责「写一次 + 跟着重渲染补回去」，它持有的 MutationObserver 必须显式
   * 释放，否则全量重渲染每来一次就漏一个。
   */
  private _nameBinders = new Map<Element, FieldNameBinder>();
  private _lastFiltersRef: DataListFilters | null = null;
  private _eventsBound = false;

  // ── 公共 API ───────────────────────────────────────────

  resetFilters(): void {
    this._filters = {};
    const shadow = this.shadowRoot as unknown as HTMLElement;
    // [WHY] 直改控件 value 属性(控件自渲染), 不重建 filterbar, 保焦点
    shadow.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      const tag = el.tagName;
      if (tag === "Z-INPUT" || tag === "Z-SELECT") {
        (el as unknown as { value: string }).value = "";
      } else if (tag === "Z-DATEPICKER") {
        (el as unknown as { start: string; end: string }).start = "";
        (el as unknown as { start: string; end: string }).end = "";
      }
    });
    this._applyFilters();
  }

  getConfig(): TableConfig | null {
    return this._config ? { ...this._config, columns: [...this._config.columns] } : null;
  }

  applyConfig(config: TableConfig): void {
    this._config = config;
    this._tableEl?.applyConfig(config);
  }

  clearSelection(): void {
    this._tableEl?.clearSelection();
  }

  disconnectedCallback(): void {
    for (const binder of this._nameBinders.values()) binder.dispose();
    this._nameBinders.clear();
    super.disconnectedCallback();
  }

  // ── 渲染 (路径 A) ──────────────────────────────────────
  render(): string {
    // [WHY] 程序化 filters 赋值走 setter → 全量重渲染, 此处把 prop store 同步进
    // 路径 B store; 路径 B 只写 _filters 副本, prop 引用不变则永不覆盖(R5)
    if (this.filters !== this._lastFiltersRef) {
      this._filters = { ...this.filters };
      this._lastFiltersRef = this.filters;
    }
    const filterbar = renderFilterbar({
      fields: this.fields,
      filters: this._filters,
      locale: this.locale,
      texts: {
        resetText: this.resetText,
        allText: this.allText,
        yesText: this.yesText,
        noText: this.noText,
        minPlaceholder: this.minPlaceholder,
        maxPlaceholder: this.maxPlaceholder,
      },
    });
    const body = renderTable();
    const footer = renderPager({ showInfo: this.showInfo, showPageSize: this.showPageSize });
    return html`
      ${filterbar}
      ${body}
      ${footer}
    `;
  }

  // ── 路径 A 收尾: 注入对象属性 + 快照恢复 ───────────────

  updated(): void {
    const prevTable = this._tableEl;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    const table = shadow.querySelector<ZReportTable>("z-report-table");
    const pager = shadow.querySelector<ZPagination>("z-pagination");
    this._tableEl = table;
    this._pagerEl = pager;
    this._bindEvents();

    if (table) {
      table.columns = this._buildColumns();
      // [WHY] 多词属性一律走 property 注入而非 markup attribute: report-table 默认
      // attribute 是纯小写(sortmode/rowkey/maxheight, 无 kebab),
      // 见 [[multiword-attribute-kebab]]; 同值赋值被 setter 守卫短路不重渲染
      table.editable = true;
      table.showColumnSelector = true;
      table.sortMode = "server";
      table.selectable = this.selectable;
      table.loading = this.loading;
      if (this.rowKey) table.rowKey = this.rowKey;
      if (this.maxHeight) table.maxHeight = this.maxHeight;
      if (this.mode === "server") {
        // [WHY] server 模式直通 items(与 sortMode=server 直通语义一致), 不切片不过滤
        table.data = this.items;
      } else {
        table.data = this._computeSlice();
      }
      // [WHY] 全量重渲染后内层 table 是新建节点, 状态全丢; 快照仅在新节点时恢复
      // (路径 B 不重渲染, 永不触发 applyConfig), 见 [[2026-08-10-W6-report-table]]
      if (this._config && table !== prevTable) {
        table.applyConfig(this._config);
      }
      this._syncFilterVisibility();
    }
    // [WHY 放在 if (table) 外面] 名称只跟筛选栏有关，内层表格还没就绪时筛选栏
    // 照样在（render 一次全出）；挂在表格分支里会让「表格慢一拍」的那次渲染丢名字
    this._syncFilterNames();
    if (pager) {
      pager.pageSizes = this.pageSizes;
      pager.pageSize = this.pageSize;
      pager.current = this.page;
      if (this.mode === "server") {
        pager.totalRecords = this.totalRecords;
        const maxPage = Math.max(1, Math.ceil((this.totalRecords || 0) / this.pageSize));
        pager.total = maxPage;
        // [WHY] 属性驱动越界钳制: 静默不发事件, 与 Pagination.updated() 语义一致
        const page = Math.min(Math.max(1, this.page), maxPage);
        if (page !== this.page) (this as any).__zui_prop_page = page;
        pager.current = page;
      }
    }
  }

  /**
   * 把字段名送进每个筛选控件内部的可聚焦件。
   *
   * 2026-11-16 实测（改之前）：7 个筛选控件内层 `aria-label` / `aria-labelledby`
   * 全为 null，只有 placeholder —— `z-select` 三个连 placeholder 都没有，就是
   * 「组合框，空白」；数字区间两个读到「最小值」「最大值」，**丢掉了是哪一列的最小值**。
   * 而页面上明明写着「年龄」，只是那行字是个 `<span>`，跟输入框没有任何程序化关联。
   */
  private _syncFilterNames(): void {
    const shadow = this.shadowRoot;
    if (!shadow) return;
    const seen = new Set<Element>();
    for (const item of Array.from(shadow.querySelectorAll(".z-dl__filter-item"))) {
      const key = item.getAttribute("data-key") ?? "";
      const field = this.fields.find((f) => f.key === key);
      if (!field) continue;
      for (const ctl of Array.from(item.querySelectorAll("z-input,z-select,z-datepicker"))) {
        seen.add(ctl);
        let binder = this._nameBinders.get(ctl);
        if (!binder) {
          const el = ctl;
          binder = bindFieldName(() => el, () => this._filterNameOf(field, el.getAttribute("data-bound")));
          this._nameBinders.set(ctl, binder);
        }
        binder.sync();
      }
    }
    // 全量重渲染换掉了整块筛选栏：旧控件的观察器必须释放，否则每渲染一次漏一个
    for (const [ctl, binder] of Array.from(this._nameBinders)) {
      if (seen.has(ctl)) continue;
      binder.dispose();
      this._nameBinders.delete(ctl);
    }
  }

  /** 筛选控件的名称：区间型要带「最小 / 最大」，否则两个框同名。 */
  private _filterNameOf(field: DataListField, bound: string | null): string {
    if (field.type !== "number") return field.label;
    return `${field.label}${bound === "max" ? this.maxPlaceholder : this.minPlaceholder}`;
  }

  private _buildColumns(): ReportColumn[] {    return this.fields.map((f) => ({
      key: f.key,
      title: f.label,
      required: f.required ?? false,
      hidden: f.hidden ?? false,
      sortable: f.sortable ?? true,
      width: f.width,
      align: f.align,
      render: f.render,
    }));
  }

  // [WHY] client 切片计算(路径 A 与路径 B 共用); 静默钳制页码, 直改 pager 不发事件
  private _computeSlice(): Record<string, unknown>[] {
    const filtered = this.items.filter((row) => matchesFilters(this.fields, this._filters, row));
    // [WHY] sort 回调 this 为 undefined(strict), 用箭头闭包绑定实例
    const sorted = this._sortState.length
      ? [...filtered].sort((a, b) => compareRows(this._sortState, a, b))
      : filtered;
    const maxPage = Math.max(1, Math.ceil(sorted.length / this.pageSize));
    const page = Math.min(Math.max(1, this.page), maxPage);
    if (page !== this.page) (this as any).__zui_prop_page = page;
    const start = (page - 1) * this.pageSize;
    const slice = sorted.slice(start, start + this.pageSize);
    const pager = this._pagerEl;
    if (pager) {
      pager.totalRecords = sorted.length;
      pager.total = maxPage;
      pager.current = page;
    }
    return slice;
  }

  private _syncFilterVisibility(): void {
    const table = this._tableEl;
    if (!table) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    // [WHY] 快照恢复后以 table.columns 为显隐唯一真源, 防路径 A 重渲染后
    // filter-item class 退回 f.hidden 与表格实际显隐不一致
    for (const col of table.columns) {
      const item = shadow.querySelector<HTMLElement>(`.z-dl__filter-item[data-key="${CSS.escape(col.key)}"]`);
      item?.classList.toggle("z-dl__filter-item--hidden", !!col.hidden);
    }
  }

  // ── 路径 B: 事件委托 (shadowRoot 常驻, render 重建不丢) ─

  private _bindEvents(): void {
    if (this._eventsBound) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    if (!shadow) return;
    shadow.addEventListener("z-input", this._onFilterInput);
    shadow.addEventListener("z-change", this._onShadowChange);
    shadow.addEventListener("z-size-change", this._onSizeChange);
    shadow.addEventListener("z-sort", this._onSort);
    shadow.addEventListener("z-column-visibility-change", this._onColumnVisibility);
    shadow.addEventListener("z-config-change", this._onConfigChange);
    shadow.addEventListener("z-selection-change", this._onSelectionChange);
    shadow.addEventListener("z-column-config-change", this._onColumnConfigChange);
    shadow.addEventListener("click", this._onShadowClick);
    this._eventsBound = true;
  }

  // [WHY] z-input 实时事件(text/number 键入), 直写 store 后重算, 不重渲染保焦点
  private _onFilterInput = (e: Event): void => {
    e.stopPropagation();
    const el = e.target as HTMLElement;
    if (el.tagName !== "Z-INPUT") return;
    const key = el.dataset.key;
    if (!key) return;
    const bound = el.dataset.bound ?? "";
    const value = String((e as CustomEvent).detail?.value ?? "");
    if (updateFilterStore(this.fields, this._filters, key, bound, value)) this._applyFilters();
  };

  // [WHY] 筛选与分页都发 z-change, 按 composedPath 首元素 tagName 分派
  // (z-select/z-datepicker → 筛选; z-pagination → 分页; z-input → commit 同上)
  private _onShadowChange = (e: Event): void => {
    e.stopPropagation();
    const el = e.target as HTMLElement;
    const detail = (e as CustomEvent).detail ?? {};
    const key = el.dataset.key;
    const tag = el.tagName;
    if (tag === "Z-INPUT" && key) {
      const value = String(detail.value ?? "");
      if (updateFilterStore(this.fields, this._filters, key, el.dataset.bound ?? "", value)) this._applyFilters();
    } else if (tag === "Z-SELECT" && key) {
      if (updateFilterStore(this.fields, this._filters, key, "", String(detail.value ?? ""))) this._applyFilters();
    } else if (tag === "Z-DATEPICKER" && key) {
      // [WHY] range 半程不触发 z-change → store 短暂陈旧, 不影响已显示数据(R6)
      const range = { start: String(detail.start ?? ""), end: String(detail.end ?? "") };
      if (updateFilterStore(this.fields, this._filters, key, "", range)) this._applyFilters();
    } else if (tag === "Z-PAGINATION") {
      this._onPagerChange(detail as PagerChangeDetail);
    }
  };

  // [WHY] 分页器 updated() 静默钳制不发事件 → z-data-list 自算钳页并主动补发
  private _onPagerChange(detail: PagerChangeDetail): void {
    const nextPage = Math.max(1, detail.page ?? 1);
    const nextSize = detail.pageSize ?? this.pageSize;
    if (nextPage !== this.page) (this as any).__zui_prop_page = nextPage;
    if (nextSize !== this.pageSize) (this as any).__zui_prop_pageSize = nextSize;
    if (this.mode === "client") {
      this._recompute();
    }
    // server 模式: 应用按 z-page-change 重新 fetch, z-data-list 只记录状态
    this._emitPageChange();
  }

  private _onSizeChange = (e: Event): void => {
    // [WHY] 真实处理走随后的 z-change (Pagination.ts:184 无条件 emit), 仅拦卫生
    e.stopPropagation();
  };

  // [WHY] client 排序接管: 内层恒 sort-mode=server, 否则只排当前页切片(语义错误);
  // 用全量过滤集排序(同 report-table 多列比较器, null 排尾), 重置 page=1 后重切片
  private _onSort = (e: Event): void => {
    e.stopPropagation();
    const detail = (e as CustomEvent).detail ?? {};
    this._sortState = detail.sortState ? [...(detail.sortState as SortEntry[])] : [];
    if (this.mode === "server") {
      this.emit("z-sort", { sortState: [...this._sortState] });
      return;
    }
    const pageChanged = this.page !== 1;
    if (pageChanged) (this as any).__zui_prop_page = 1;
    this._recompute();
    if (pageChanged) this._emitPageChange();
    this.emit("z-sort", { sortState: [...this._sortState] });
  };

  private _onColumnVisibility = (e: Event): void => {
    e.stopPropagation();
    const detail = (e as CustomEvent).detail ?? {};
    const key = detail.key;
    if (!key) return;
    // [WHY] 第三条轻路径: class 直切, 无重渲染, filter-item 元素身份不变
    const item = this.shadowRoot?.querySelector<HTMLElement>(`.z-dl__filter-item[data-key="${CSS.escape(key)}"]`);
    item?.classList.toggle("z-dl__filter-item--hidden", !detail.visible);
  };

  // [WHY] z-config-change 携带 getConfig() 全量快照 → 存 _config 不重渲染, 透传
  private _onConfigChange = (e: Event): void => {
    e.stopPropagation();
    this._config = ((e as CustomEvent).detail?.config as TableConfig) ?? this._config;
    this.emit("z-config-change", { config: this._config });
  };

  private _onSelectionChange = (e: Event): void => {
    e.stopPropagation();
    const selectedKeys = ((e as CustomEvent).detail?.selectedKeys as string[]) ?? [];
    this.emit("z-selection-change", { selectedKeys: [...selectedKeys] });
  };

  // [WHY] 内层列配置变化(z-column-config-change)不对外暴露, 仅拦截防穿透
  private _onColumnConfigChange = (e: Event): void => {
    e.stopPropagation();
  };

  private _onShadowClick = (e: Event): void => {
    const reset = (e.target as HTMLElement).closest(".z-dl__reset");
    if (!reset) return;
    this.resetFilters();
  };

  // ── 过滤重算 (路径 B 核心) ─────────────────────────────

  private _applyFilters(): void {
    // [WHY] 过滤条件变更 → 回到第 1 页(与排序一致), 语义见 task_plan 验收
    const pageChanged = this.page !== 1;
    if (pageChanged) (this as any).__zui_prop_page = 1;
    if (this.mode === "server") {
      this.emit("z-filter-change", { filters: { ...this._filters } });
      if (pageChanged) this._emitPageChange();
      return;
    }
    this._recompute();
    if (pageChanged) this._emitPageChange();
    this.emit("z-filter-change", { filters: { ...this._filters } });
  }

  private _recompute(): void {
    const table = this._tableEl;
    if (!table) return;
    const filtered = this.items.filter((row) => matchesFilters(this.fields, this._filters, row));
    // [WHY] sort 回调 this 为 undefined(strict), 用箭头闭包绑定实例
    const sorted = this._sortState.length
      ? [...filtered].sort((a, b) => compareRows(this._sortState, a, b))
      : filtered;
    const maxPage = Math.max(1, Math.ceil(sorted.length / this.pageSize));
    const page = Math.min(Math.max(1, this.page), maxPage);
    const pageChanged = page !== this.page;
    if (pageChanged) (this as any).__zui_prop_page = page;
    const start = (page - 1) * this.pageSize;
    table.data = sorted.slice(start, start + this.pageSize);
    const pager = this._pagerEl;
    if (pager) {
      pager.totalRecords = sorted.length;
      pager.total = maxPage;
      pager.current = page;
    }
    if (pageChanged) this._emitPageChange();
  }

  private _emitPageChange(): void {
    this.emit("z-page-change", {
      page: this.page,
      pageSize: this.pageSize,
      totalRecords: this.mode === "client" ? this._filteredCount() : this.totalRecords,
    });
  }

  private _filteredCount(): number {
    return this.items.filter((row) => matchesFilters(this.fields, this._filters, row)).length;
  }
}

customElements.define("z-data-list", ZDataList);
