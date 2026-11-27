// <z-report-table> 报表表格：columns 与 data 驱动，支持排序、列宽与列显隐、分组、分页、虚拟滚动，动作各发事件。
// [组合架构] 元素壳只保留属性契约与事件分发；数据流走 table-pipeline.ts、
// 键盘网格导航与焦点恢复托管给 TableKeyboardController、滚动阴影与虚拟窗口托管给 TableScrollController。
import { COPY, BaseElement, html, property, observeLegacyAttribute, defineElement } from "../../core/index.js";
import "../column-selector/ColumnSelector.js";
import type { ZColumnSelector } from "../column-selector/ColumnSelector.js";
import reportTableCSS from "./report-table.css?raw";
import reportTableGroupedCSS from "./report-table-grouped.css?raw";
import cellSemanticCSS from "./cell-semantic.css?raw";
import reportTableBodyCSS from "./report-table-body.css?raw";
import reportTableFixedCSS from "./report-table-fixed.css?raw";
import { handleColumnConfigClick, type ColumnConfigHost } from "./column-config-panel.js";
import {
  applyConfigSnapshot,
  applyPersistedColumnView,
  readPersistedColumnView,
  reorderColumnsByKeys,
  takeConfigSnapshot,
  writePersistedColumnView,
} from "./report-table-config.js";
import { renderPager } from "./report-table-pager.js";
import { ensureToolsSelector, syncToolsSelector } from "./report-table-tools.js";
import { esc, rowKeyOf, type ReportColFormat, type ReportColumn, type SortEntry, type TableConfig } from "./report-table-types.js";
import type { PagedView, ViewRow } from "./table-view-rows.js";
import type { GroupSpec } from "../core/report-group.js";
import {
  computeFixedOffsets,
  renderEmptyRow,
  renderFooter,
  renderHeadRows,
  renderHeaderTipDefs,
  renderBodyRows,
  sortRows,
  type FooterRenderContext,
  type HeaderRenderContext,
  type RowRenderContext,
} from "./table-render.js";
import { mountTableCells } from "./table-cell-mount.js";
import { renderTableBody } from "./table-virtual.js";
import {
  bindColumnReorder,
  countSelected,
  handleCellClick,
  handleHeadClick,
  handleHeadMouseDown,
  handleResizeMouseMove,
  handleResizeMouseUp,
  handleRowClick,
  handleTableChange,
  type ResizeInfo,
  type TableInteractionHost,
} from "./table-interactions.js";
import { buildTableViewRows, matchesSelectedRowId, runTablePipeline } from "./table-pipeline.js";
import { TableKeyboardController } from "./table-keyboard-controller.js";
import { TableScrollController } from "./table-scroll-controller.js";

export type { ReportColFormat, ReportColumn, SortEntry, TableConfig } from "./report-table-types.js";

const TOOLS_COL_WIDTH = 32;
const MIN_COL_WIDTH = 24;
const MAX_COL_WIDTH = 2000;

export class ZReportTable extends BaseElement {
  static styles =
    reportTableCSS + reportTableGroupedCSS + reportTableBodyCSS + reportTableFixedCSS + cellSemanticCSS;

  @property({ type: String, attribute: "selected-row-id" }) selectedRowId = "";
  @property({ attribute: false }) rowClass:
    | ((row: Record<string, unknown>, index: number) => string)
    | null = null;
  @property({ type: Array, attribute: false }) columns: ReportColumn[] = [];
  @property({ type: Array, attribute: false }) data: Record<string, unknown>[] = [];
  @property({ type: Array, attribute: false }) sortState: SortEntry[] = [];
  @property({ type: Array, attribute: false }) selectedKeys: string[] = [];
  @property({ type: Boolean }) selectable = false;
  @property({ type: Boolean }) editable = false;
  @property({ type: Boolean }) resizable = false;
  @property({ type: Boolean }) showColumnSelector = true;
  @property({ type: String }) persistKey = "";
  @property({ type: Boolean }) rowClickable = true;
  @property({ type: String }) sortMode: "client" | "server" = "client";
  @property({ type: String }) rowKey = "";
  @property({ type: Boolean }) draftMode = false;
  @property({ type: Boolean }) showFooter = false;
  @property({ type: Boolean }) striped = false;
  @property({ type: Boolean }) bordered = false;
  @property({ type: Boolean }) virtual = false;
  @property({ type: Number, attribute: "row-height" }) rowHeight = 36;
  @property({ type: Boolean }) lines = false;
  @property({ type: String }) size: "sm" | "md" = "md";
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) maxHeight = "";
  @property({ type: String }) emptyText = COPY.empty;
  @property({ type: String }) loadingText = COPY.loading;
  @property({ type: String }) footerLabel = COPY.total;
  @property({ type: String }) requiredColumnText = COPY.requiredField;
  @property({ type: String }) reorderColumnText = COPY.reorderColumn;
  @property({ type: String }) footerToggleText = COPY.total;
  @property({ type: String }) columnSettingsText = COPY.columnSettings;
  @property({ type: String }) alignLeftText = COPY.alignLeft;
  @property({ type: String }) alignCenterText = COPY.alignCenter;
  @property({ type: String }) alignRightText = COPY.alignRight;
  @property({ type: String }) pinNoneText = COPY.pinNone;
  @property({ type: String }) pinLeftText = COPY.pinLeft;
  @property({ type: String }) pinRightText = COPY.pinRight;
  @property({ type: String }) columnsText = COPY.columns;
  @property({ type: Object, attribute: false }) colFormats: Record<string, ReportColFormat> = {};
  @property({ type: String }) formatTypeText = COPY.formatLabel;
  @property({ type: String }) numberText = COPY.numberFormat;
  @property({ type: String }) percentText = COPY.percentFormat;
  @property({ type: String }) decimalPlacesText = COPY.decimalPlaces;
  @property({ type: String }) thousandsText = COPY.thousandsSep;
  @property({ type: String }) autoText = COPY.autoOption;
  @property({ type: Boolean }) columnSelectorOpen = false;
  @property({ type: Object, attribute: false }) group: GroupSpec | null = null;
  @property({ type: Boolean, attribute: "tree" }) tree: boolean | null = null;
  @property({ type: Number, attribute: "page-size" }) pageSize = 0;
  @property({ type: Number }) page = 1;
  @property({ type: String, attribute: "page-mode" }) pageMode: "client" | "server" = "client";
  @property({ type: Number, attribute: "total-records" }) totalRecords = 0;
  @property({ type: String, attribute: "pager-total-text" }) pagerTotalText = COPY.pagerTotal;
  @property({ type: String, attribute: "pager-page-text" }) pagerPageText = COPY.pagerPage;
  @property({ type: String, attribute: "prev-page-text" }) prevPageText = COPY.prevPage;
  @property({ type: String, attribute: "next-page-text" }) nextPageText = COPY.nextPage;
  @property({ type: String, attribute: "page-size-options" }) pageSizeOptions = "";
  @property({ type: String, attribute: "pager-size-text" }) pagerSizeText = COPY.pagerSize;
  @property({ type: String, attribute: "pager-size-label" }) pagerSizeLabel = COPY.pagerSizeLabel;

  private _configOpen: string | null = null;
  private _collapsed = new Set<string>();
  private _paged: PagedView = { rows: [], total: null, page: 1, pageCount: 1, totalRows: 0 };
  private _columnWidths: Map<string, number> = new Map();
  private _resizeInfo: ResizeInfo | null = null;
  private _leftOffsets: Map<string, number> = new Map();
  private _rightOffsets: Map<string, number> = new Map();
  private _eventsBound = false;
  private _dragKey: string | null = null;
  private _sortedRows: Record<string, unknown>[] = [];
  private _selectorEl: ZColumnSelector | null = null;
  private _unbindColDrag: (() => void) | null = null;

  private _keyboard: TableKeyboardController;
  private _scroll: TableScrollController;

  constructor() {
    super();
    const self = this;
    this._keyboard = this.addController(
      new TableKeyboardController({
        get shadowRoot() {
          return self.shadowRoot;
        },
        hasOpenPopover: () => self.columnSelectorOpen || self._configOpen !== null,
        closePopovers: () => {
          self.columnSelectorOpen = false;
          self._configOpen = null;
          self.requestUpdate();
        },
      }),
    );
    this._scroll = this.addController(
      new TableScrollController({
        get shadowRoot() {
          return self.shadowRoot;
        },
        get virtual() {
          return self.virtual;
        },
        get rowHeight() {
          return self.rowHeight;
        },
        get maxHeight() {
          return self.maxHeight;
        },
        getPagedRowCount: () => self._paged.rows.length,
        requestUpdate: () => self.requestUpdate(),
      }),
    );
  }

  private get _visible(): ReportColumn[] {
    return this.columns.filter((c) => !c.hidden || c.required);
  }

  get shownColumns(): ReportColumn[] {
    return this._visible;
  }

  renderRows(): ViewRow[] {
    return buildTableViewRows(
      sortRows(this.data, this.sortState, this.sortMode),
      this.rowKey,
      this.group,
      this._collapsed,
    );
  }

  get pageCount(): number {
    return this._paged.pageCount;
  }

  private _setPage(p: number): void {
    const next = Math.min(Math.max(1, Math.trunc(p) || 1), Math.max(1, this._paged.pageCount));
    if (next === this._paged.page) return;
    this.page = next;
    this.emit("z-page-change", { page: next, pageSize: this.pageSize });
    this.requestUpdate();
  }

  private _setPageSize(next: number): void {
    if (next === this.pageSize) return;
    this.pageSize = next;
    this.page = 1;
    this.emit("z-page-change", { page: 1, pageSize: next });
    this.requestUpdate();
  }

  private _onGroupToggle(e: Event): boolean {
    const btn = (e.target as HTMLElement | null)?.closest?.("[data-toggle]") as HTMLElement | null;
    if (!btn) return false;
    const key = btn.getAttribute("data-toggle") ?? "";
    const next = !this._collapsed.has(key);
    if (next) this._collapsed.add(key);
    else this._collapsed.delete(key);
    this.emit("z-group-toggle", { groupKey: key, collapsed: next });
    this.requestUpdate();
    return true;
  }

  private _onPagerClick(e: Event): boolean {
    const btn = (e.target as HTMLElement | null)?.closest?.("[data-page-go]") as HTMLElement | null;
    if (!btn || btn.hasAttribute("disabled")) return false;
    const go = btn.getAttribute("data-page-go");
    this._keyboard.scheduleRefocusSelector(`[data-page-go="${go}"]`);
    this._setPage(go === "next" ? this._paged.page + 1 : this._paged.page - 1);
    return true;
  }

  private _onPagerSizeChange(e: Event): boolean {
    const sel = (e.target as HTMLElement | null)?.closest?.("[data-page-size]") as HTMLSelectElement | null;
    if (!sel) return false;
    const next = Math.trunc(Number(sel.value));
    if (!Number.isFinite(next) || next <= 0) return false;
    this._keyboard.scheduleRefocusSelector("[data-page-size]");
    this._setPageSize(next);
    return true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.listen(document, "mousemove", this._onResizeMouseMove as EventListener);
    this.listen(document, "mouseup", this._onResizeMouseUp as EventListener);
    this.listen(document, "mousedown", this._onGlobalMouseDown as EventListener);
    this._ensureSelectorEl();
  }

  disconnectedCallback(): void {
    this._unbindColDrag?.();
    this._unbindColDrag = null;
    super.disconnectedCallback();
  }

  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      if (value === "lines") this.lines = true;
      else if (value === "default") this.lines = false;
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }

  /** @deprecated 旧名 `variant` 的 JS 属性兼容层。 */
  get variant(): string {
    return this.lines ? "lines" : "default";
  }
  set variant(value: string) {
    this.lines = value === "lines";
  }

  willUpdate(): void {
    const view = readPersistedColumnView(this.persistKey);
    if (view) applyPersistedColumnView(this, view);
    syncToolsSelector(this._selectorEl, this);
  }

  render(): string {
    const vis = this._visible;
    const showTools = this.showColumnSelector;
    const offsets = computeFixedOffsets(vis, this.selectable, this._columnWidths, showTools ? TOOLS_COL_WIDTH : 0);
    this._leftOffsets = offsets.left;
    this._rightOffsets = offsets.right;

    const cls = [
      "z-rpt",
      this.striped ? "z-rpt--striped" : "",
      this.bordered ? "z-rpt--bordered" : "",
      this.lines ? "z-rpt--lines" : "",
      `z-rpt--${this.size}`,
      this.loading ? "z-rpt--loading" : "",
      this.selectable ? "z-rpt--selectable" : "",
      vis.some((c) => !!c.group) ? "z-rpt--grouped" : "",
    ]
      .filter(Boolean)
      .join(" ");

    const pipe = runTablePipeline({
      data: this.data,
      sortState: this.sortState,
      sortMode: this.sortMode,
      rowKey: this.rowKey,
      group: this.group,
      collapsed: this._collapsed,
      pageSize: this.pageSize,
      page: this.page,
      pageMode: this.pageMode,
      totalRecords: this.totalRecords,
    });
    this._sortedRows = pipe.sortedRows;
    this._paged = pipe.paged;

    const totalCols = vis.length + (this.selectable ? 1 : 0) + (showTools ? 1 : 0);
    const headerCtx: HeaderRenderContext = {
      sortState: this.sortState,
      editable: this.editable,
      resizable: this.resizable || this.editable,
      columnWidths: this._columnWidths,
      leftOffsets: this._leftOffsets,
      rightOffsets: this._rightOffsets,
      configOpen: this._configOpen,
      colFormats: this.colFormats,
      texts: this,
    };
    const rowCtx: RowRenderContext = {
      selectable: this.selectable,
      selectedKeys: this.selectedKeys,
      visible: vis,
      leftOffsets: this._leftOffsets,
      rightOffsets: this._rightOffsets,
      isSelectedById: (row) => matchesSelectedRowId(row, this.selectedRowId),
      rowClass: this.rowClass,
      group: this.group ? { dims: this.group.dims, collapsed: this._collapsed } : null,
      tools: showTools,
    };
    const footerCtx: FooterRenderContext = {
      visible: vis,
      data: this.data,
      footerLabel: this.footerLabel,
      selectable: this.selectable,
      leftOffsets: this._leftOffsets,
      rightOffsets: this._rightOffsets,
      tools: showTools,
    };

    const toolsHtml = showTools ? html`<slot name="tools"></slot>` : "";
    const headRows = renderHeadRows({ vis, ctx: headerCtx, selectable: this.selectable, tools: toolsHtml });
    const grouped = vis.some((c) => (c.group ?? "").trim() !== "");
    const colgroupHtml = grouped
      ? html`<colgroup>
          ${this.selectable ? html`<col style="width:40px">` : ""}
          ${vis.map((c) => {
            const px = this._columnWidths.get(c.key);
            const w = px != null ? `${px}px` : c.width || "";
            return w ? html`<col style="width:${w}">` : html`<col>`;
          })}
          ${showTools ? html`<col style="width:${TOOLS_COL_WIDTH}px">` : ""}
        </colgroup>`
      : "";

    return html`
      ${renderHeaderTipDefs(vis)}
      <div class="z-rpt__wrapper" part="wrapper"
           ${this.maxHeight ? `style="max-height:${this.maxHeight};overflow-y:auto"` : ""}>
        <table class="${cls}" part="table">
          ${colgroupHtml}
          <thead class="z-rpt__head" part="head">${headRows}</thead>
          <tbody class="z-rpt__body" part="body">
            ${this._paged.rows.length === 0
              ? renderEmptyRow(totalCols, this.emptyText)
              : renderTableBody(this._paged.rows, rowCtx, totalCols, this.virtual, this.rowHeight, this.maxHeight, this._scroll.virtualState)}
            ${this._paged.total ? renderBodyRows([this._paged.total], rowCtx) : ""}
          </tbody>
          ${this.showFooter && vis.length > 0 ? renderFooter(footerCtx) : ""}
        </table>
        ${this.loading
          ? html`<div class="z-rpt__loading-overlay" part="loading">
              <span class="z-rpt__spinner" part="spinner"></span>
              <span class="z-rpt__loading-text">${esc(this.loadingText)}</span>
            </div>`
          : ""}
      </div>
      ${renderPager(this._paged, this)}
    `;
  }

  private _ensureSelectorEl(): void {
    this._selectorEl = ensureToolsSelector(this, this._selectorEl, this._onColumnSelectorOpenEvent);
  }

  updated(): void {
    this._bindEvents();
    const foot = this.shadowRoot?.querySelector<HTMLElement>(".z-rpt__foot");
    this.style.setProperty(
      "--z-rpt-foot-h",
      foot ? `${Math.round(foot.getBoundingClientRect().height)}px` : "0px",
    );
    mountTableCells(this.shadowRoot!, this._visible, this._sortedRows);

    if (this.selectable) {
      const selectAll = this.shadowRoot!.querySelector(".z-rpt__select-all") as HTMLInputElement | null;
      if (selectAll) {
        const total = this.data.length;
        const selCount = countSelected(this.data, this.rowKey, this.selectedKeys);
        selectAll.checked = total > 0 && selCount === total;
        selectAll.indeterminate = selCount > 0 && selCount < total;
      }
    }
    this._selectorEl?.reposition();
  }

  getConfig(): TableConfig {
    return takeConfigSnapshot(this, this._columnWidths);
  }

  applyConfig(cfg: TableConfig): void {
    applyConfigSnapshot(this, this._columnWidths, cfg);
  }

  setColumnWidths(widths: Record<string, number> | null | undefined): void {
    if (!widths || typeof widths !== "object") return;
    let changed = false;
    for (const [key, raw] of Object.entries(widths)) {
      const px = Math.round(Number(raw));
      if (!Number.isFinite(px) || px < MIN_COL_WIDTH || px > MAX_COL_WIDTH) continue;
      if (this._columnWidths.get(key) === px) continue;
      this._columnWidths.set(key, px);
      changed = true;
    }
    if (changed) this.requestUpdate();
  }

  getColumnWidths(): Record<string, number> {
    return Object.fromEntries(this._columnWidths);
  }

  private _emitConfigChange(): void {
    this.emit("z-config-change", { config: this.getConfig() });
    writePersistedColumnView(this.persistKey, this);
    this._selectorEl?.syncColumnState();
  }

  clearSelection(): void {
    this.selectedKeys = [];
    this.emit("z-selection-change", { selectedKeys: [], rows: [] });
  }

  selectAll(): void {
    this.selectedKeys = this.data.map((row, i) => rowKeyOf(row, i, this.rowKey));
    this.emit("z-selection-change", { selectedKeys: [...this.selectedKeys], rows: [...this.data] });
  }

  rowsOfKeys(keys: string[]): Record<string, unknown>[] {
    if (!keys.length) return [];
    const want = new Set(keys);
    return this.data.filter((row, i) => want.has(rowKeyOf(row, i, this.rowKey)));
  }

  showColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    if (col && col.hidden) { col.hidden = false; this.requestUpdate(); this._emitConfigChange(); }
  }

  hideColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    if (col && !col.required && !col.hidden) { col.hidden = true; this.requestUpdate(); this._emitConfigChange(); }
  }

  toggleColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    if (col && !col.required) { col.hidden = !col.hidden; this.requestUpdate(); this._emitConfigChange(); }
  }

  reorderColumns(keys: string[]): void {
    const next = reorderColumnsByKeys(this, keys);
    if (!next) return;
    this.requestUpdate();
    this.emit("z-column-order-change", { keys: next });
    this._emitConfigChange();
  }

  private get _panelHost(): ColumnConfigHost {
    return {
      columns: this.columns,
      colFormats: this.colFormats,
      setConfigOpen: (key) => { this._configOpen = key; },
      getConfigOpen: () => this._configOpen,
      update: () => this.requestUpdate(),
      emit: (name, detail) => this.emit(name, detail),
      emitConfigChange: () => this._emitConfigChange(),
      setColFormats: (next) => { this.colFormats = next; },
    };
  }

  private get _interactionHost(): TableInteractionHost {
    return {
      visibleColumns: () => this._visible,
      columnWidths: () => this._columnWidths,
      getSortState: () => this.sortState,
      setSortState: (next) => { this.sortState = next; },
      getColumns: () => this.columns,
      setColumns: (next) => { this.columns = next; },
      getResizeInfo: () => this._resizeInfo,
      setResizeInfo: (info) => { this._resizeInfo = info; },
      getDragKey: () => this._dragKey,
      setDragKey: (key) => { this._dragKey = key; },
      setResizing: (on) => { this.classList.toggle("z-rpt--resizing", on); },
      root: () => this.shadowRoot,
      rowClickable: () => this.rowClickable,
      sortedRows: () => this._sortedRows,
      data: () => this.data,
      rowKey: () => this.rowKey,
      draftMode: () => this.draftMode,
      selectedKeys: () => this.selectedKeys,
      setSelectedKeys: (keys) => { this.selectedKeys = keys; },
      rowsOfKeys: (keys) => this.rowsOfKeys(keys),
      selectAll: () => this.selectAll(),
      clearSelection: () => this.clearSelection(),
      emit: (name, detail) => this.emit(name, detail),
      update: () => this.requestUpdate(),
      emitConfigChange: () => this._emitConfigChange(),
    };
  }

  private _onHeadMouseDown = (e: MouseEvent): void => handleHeadMouseDown(e, this._interactionHost);
  private _onResizeMouseMove = (e: MouseEvent): void => handleResizeMouseMove(e, this._interactionHost);
  private _onResizeMouseUp = (): void => handleResizeMouseUp(this._interactionHost);
  private _onHeadClick = (e: Event): void => handleHeadClick(e, this._interactionHost);
  private _onShadowKeydown = (e: KeyboardEvent): void => this._keyboard.handleKeydown(e);

  private _bindEvents(): void {
    if (this._eventsBound) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    if (!shadow) return;
    shadow.addEventListener("mousedown", this._onHeadMouseDown as unknown as EventListener);
    shadow.addEventListener("click", this._onShadowClick as unknown as EventListener);
    shadow.addEventListener("change", this._onTableChange);
    shadow.addEventListener("keydown", this._onShadowKeydown as unknown as EventListener);
    this._ensureSelectorEl();
    this._unbindColDrag = bindColumnReorder(this.shadowRoot!, this._interactionHost, () => this.editable);
    this._eventsBound = true;
  }

  private _onShadowClick = (e: Event): void => {
    if (this._onGroupToggle(e)) return;
    if (this._onPagerClick(e)) return;
    if (handleCellClick(e, this._interactionHost)) return;
    if (handleRowClick(e, this._interactionHost)) return;
    if (handleColumnConfigClick(e.target as HTMLElement, this._panelHost)) return;
    const sortTh = (e.target as HTMLElement | null)?.closest?.(".z-rpt__th--sortable") as HTMLElement | null;
    if (sortTh && !(e.target as HTMLElement | null)?.closest?.(".z-rpt__resize-handle")) {
      this._keyboard.scheduleRefocusTh(sortTh.dataset.key ?? null);
    }
    this._onHeadClick(e);
  };

  private _onGlobalMouseDown = (e: MouseEvent): void => {
    if (!this._configOpen) return;
    const host = this.shadowRoot?.host;
    if (!host) return;
    if (!(e.composedPath() as EventTarget[]).includes(host)) {
      this._configOpen = null;
      this.requestUpdate();
    }
  };

  private _onColumnSelectorOpenEvent = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (!t || t.tagName !== "Z-COLUMN-SELECTOR") return;
    const open = e.type === "z-column-selector-open";
    if (this.columnSelectorOpen !== open) this.columnSelectorOpen = open;
  };

  private _onTableChange = (e: Event): void => {
    if (this._onPagerSizeChange(e)) return;
    handleTableChange(e, this._interactionHost);
  };
}

observeLegacyAttribute(ZReportTable, "variant");
defineElement("z-report-table", ZReportTable);
