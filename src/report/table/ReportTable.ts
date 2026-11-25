// <z-report-table> 报表表格：columns 与 data 驱动，支持排序、列宽与列显隐、分组、分页，动作各发事件。
import { COPY, BaseElement, html, property, observeLegacyAttribute } from "../../core/index.js";
// [WHY] 列选择器已抽为独立组件 z-column-selector(可外部摆放绑定), 内置工具栏复用该组件,
// import 先于 define 保证注册; 内嵌实例经 open 属性由 columnSelectorOpen 镜像开局, 见 [[REQ-015-column-selector]]
import "../column-selector/ColumnSelector.js";
import reportTableCSS from "./report-table.css?raw";
import reportTableGroupedCSS from "./report-table-grouped.css?raw";
import cellSemanticCSS from "./cell-semantic.css?raw";
import reportTableBodyCSS from "./report-table-body.css?raw";
import reportTableFixedCSS from "./report-table-fixed.css?raw";

/**
 * 表头工具列（列选择器那一格）的宽度，单位 px。
 *
 * [WHY 有个常量还要写一遍 CSS] 这个数被两处消费，两处都躲不开：
 *   1. 右冻结列的起始偏移（`computeFixedOffsets` 的 trailingWidth）—— TypeScript 侧；
 *   2. 这一格自己的 `width / min-width / max-width` —— CSS 侧（`--z-rpt-tools-w`）。
 * 改一处不改另一处的后果不是「差 2px」：偏移按 32 算、实际渲染 36 时，右冻结列会与
 * 工具列**叠在一起**（一个盖住另一个），而不是留一条缝。
 * 所以 CSS 里用 `--z-rpt-tools-w: 32px` 定义、TS 里读这个常量，两处都在注释里指向对方。
 */
const TOOLS_COL_WIDTH = 32;
/**
 * 列宽覆盖的合法区间（px）。
 *
 * [WHY 有下界] 拖到 0 宽的表头仍留着可点区域，用户看不出「这列被我拖没了」；
 * 且有上界挡住 localStorage 里被改坏的值（`1e9` 会把表格撑成横向长城）。
 */
const MIN_COL_WIDTH = 24;
const MAX_COL_WIDTH = 2000;
// [WHY] 2026-10-25 系统审计：原 1058 行单文件按职责拆为 types / column-config-panel / table-render /
// table-interactions 四个模块, 本文件只保留元素壳(属性/生命周期/状态/事件分发/配置快照)
import { handleColumnConfigClick, type ColumnConfigHost } from "./column-config-panel.js";
import { applyConfigSnapshot, takeConfigSnapshot } from "./report-table-config.js";
import { gridIntent, resolveCell, roveByKey, roveTo, sameCell, type CellPos, type GridBounds } from "../../primitives/index.js";
import { esc, rowKeyOf, type ReportColFormat, type ReportColumn, type SortEntry, type TableConfig } from "./report-table-types.js";
import { dataViewRows, groupViewRows, paginateViewRows, type PagedView, type ViewRow } from "./table-view-rows.js";
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

// [WHY] 公开类型仍从本文件转出: index.ts 与下游(React 包装/宿主页)按 "./ReportTable.js" 取类型
export type { ReportColFormat, ReportColumn, SortEntry, TableConfig } from "./report-table-types.js";

// ═══════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════

export class ZReportTable extends BaseElement {
  // [WHY] 三段拼接顺序必须与原单文件一致（表体/固定列/暗色依次覆盖），
  // 否则同特异性规则会因顺序变化而互相顶掉。2026-10-25 拆分时已 diff 校验等价。
  static styles =
    reportTableCSS + reportTableGroupedCSS + reportTableBodyCSS + reportTableFixedCSS + cellSemanticCSS;


    // 字符串型选中标记（`id:10` 或 `code:a,b`）：供**不能传函数**的宿主（Vue / 纯 HTML）
  // 表达「当前正在编辑哪一行」。函数型 rowClass 在非 React 宿主里常拿不到
  // （attribute:false 的 property 必须由 JS 赋值，模板里写属性不会命中），
  // 而选中态是「点没点生效」的唯一视觉线索 —— 缺了用户会以为操作没反应。
  @property({ type: String, attribute: "selected-row-id" }) selectedRowId = "";
  // 函数型行 class（React 宿主可直接传函数）；Vue / 纯 HTML 宿主拿不到函数型 property，
  // 用上面的 selected-row-id。两者取并集，可并存。
  @property({ attribute: false }) rowClass:
    | ((row: Record<string, unknown>, index: number) => string)
    | null = null;


@property({ type: Array, attribute: false }) columns: ReportColumn[] = [];
  @property({ type: Array, attribute: false }) data: Record<string, unknown>[] = [];
  @property({ type: Array, attribute: false }) sortState: SortEntry[] = [];
  @property({ type: Array, attribute: false }) selectedKeys: string[] = [];
  @property({ type: Boolean }) selectable = false;
  // [WHY] 编辑态: 控制列的"编辑"能力(表头配置齿轮/拖拽调宽/拖拽排序/冻结);
  // 列选择器不再受 editable 门控, 由 showColumnSelector 独立控制, 见 issue IKD6L8 / [[REQ-014]]
  @property({ type: Boolean }) editable = false;
  /**
   * 只开「拖表头调宽」这一项，不含齿轮与列序拖拽。
   *
   * [WHY 与 editable 拆开] 查看页的用户要的是「这列太窄，我自己拉宽」——这是纯查看侧的
   * 微调，不该连带出现编辑态的齿轮与列序拖拽。`editable` 仍然蕴含它（编辑态全开）。
   * 见 [[REQ-021-page-column-width]]。
   */
  @property({ type: Boolean }) resizable = false;
  @property({ type: Boolean }) showColumnSelector = true;
  // [WHY] 整行点击开关: 默认开启(z-row-click 开箱即用); 列表页若自行接管行内点击可置 false 关闭, 见 [[REQ-014]]
  @property({ type: Boolean }) rowClickable = true;
  // [WHY] 排序模式: client 组件内部排序; server 仅触发 z-sort, 数据由调用方按 sortState 重新获取
  @property({ type: String }) sortMode: "client" | "server" = "client";
  @property({ type: String }) rowKey = "";
  /**
   * 整表编辑态（`card edit=yes`，issue IKX0CE P1-6）。
   *
   * 组件只读它一件事：改完这一格标 `is-dirty`（草稿，等用户提交）还是 `is-pending`
   * （已上报，等宿主写回）。草稿本身在页面层 —— 三张表统一保存，卡片级存不下。
   */
  @property({ type: Boolean }) draftMode = false;
  @property({ type: Boolean }) showFooter = false;
  @property({ type: Boolean }) striped = false;
  @property({ type: Boolean }) bordered = false;
  /**
   * 三线表：顶线 / 表头下 / 底线加粗，无竖线（中文报表习惯，见 [[2026-08-10-rpt-business-polish]]）。
   *
   * [WHY 从 `variant="lines"` 改成布尔] 旧写法只有两个取值（default / lines），本质是
   * 「有没有三线」的一根开关。占着 `variant` 这个词会与 tone/appearance 词表冲突，
   * 还让人以为有第三种样式。`lines` 直接表达它是什么。
   */
  @property({ type: Boolean }) lines = false;
  @property({ type: String }) size: "sm" | "md" = "md";
  @property({ type: Boolean }) loading = false;
  // [WHY] 表头冻结: 非空时 wrapper 施加 max-height + overflow-y auto, sticky 表头在纵向滚动时吸附顶部
  @property({ type: String }) maxHeight = "";
  @property({ type: String }) emptyText = COPY.empty;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) loadingText = COPY.loading;
  // [WHY] 中文报表习惯: 合计行首列标签, 首列未定义 footer 时自动显示
  @property({ type: String }) footerLabel = COPY.total;
  // [WHY] i18n: 必选字段的悬浮提示文案, 见 [[REQ-001]]
  @property({ type: String }) requiredColumnText = COPY.requiredField;
  // [WHY] i18n: 表头配置下拉中"合计"开关文案, 见 [[REQ-001]]
  @property({ type: String }) footerToggleText = COPY.total;
  // [WHY] i18n: tips 文案属性化(表头配置/对齐/冻结/列选择器), 见 [[REQ-001]] [[2026-08-09-W5-i18n]]
  @property({ type: String }) columnSettingsText = COPY.columnSettings;
  @property({ type: String }) alignLeftText = COPY.alignLeft;
  @property({ type: String }) alignCenterText = COPY.alignCenter;
  @property({ type: String }) alignRightText = COPY.alignRight;
  @property({ type: String }) pinNoneText = COPY.pinNone;
  @property({ type: String }) pinLeftText = COPY.pinLeft;
  @property({ type: String }) pinRightText = COPY.pinRight;
  @property({ type: String }) columnsText = COPY.columns;
  // [WHY] 列格式: 外部传入的列级格式配置(React 侧持久化), 菜单编辑后通过 z-column-format-change 上报
  @property({ type: Object, attribute: false }) colFormats: Record<string, ReportColFormat> = {};
  // [WHY] i18n: 列格式菜单文案属性化, 见 [[REQ-001]]
  @property({ type: String }) formatTypeText = "格式";
  @property({ type: String }) numberText = "数值";
  @property({ type: String }) percentText = "百分数";
  @property({ type: String }) decimalPlacesText = "小数位";
  @property({ type: String }) thousandsText = "千分位";
  @property({ type: String }) autoText = "自动";
  @property({ type: Boolean }) columnSelectorOpen = false;
  private _configOpen: string | null = null;

  // ── 分组（多级小计 / 总计 / 树状折叠）────────────────────
  /**
   * 分组定义。为空 = 平表（一条数据一个 tr，与原行为逐像素一致）。
   *
   * [WHY 吃 spec 而不是 chart] 小计只能有**一个**实现 —— 报表查看、导出 CSV、
   * page 卡（`card kind=group-table`）三处都要出同一组数。`GroupSpec` 是那个最小交集：
   * 报表侧用 `groupSpecOfChart()` 适配，page 卡直接构造。见 `report/core/report-group.ts`。
   */
  @property({ type: Object, attribute: false }) group: GroupSpec | null = null;
  /** 是否树状模式（组行带折叠按钮）。`null` = 有 `group` 就带。 */
  @property({ type: Boolean, attribute: "tree" }) tree: boolean | null = null;

  // ── 分页 ────────────────────────────────────────────────
  /** 每页行数；0 = 不分页（默认值 = 历史行为，不改变任何存量调用）。 */
  @property({ type: Number, attribute: "page-size" }) pageSize = 0;
  /** 当前页（1-based）。越界会被 clamp —— 换筛选后总页数缩小是常态。 */
  @property({ type: Number }) page = 1;
  /**
   * 分页模式：
   * - `client`（默认）组件自己切页
   * - `server` 组件不切页，只发 `z-page-change`，数据由宿主按 page 重新取
   */
  @property({ type: String, attribute: "page-mode" }) pageMode: "client" | "server" = "client";
  /**
   * 总条数（**仅 server 模式用**）。由宿主从取数结果里带回来（`{rows,total}`）。
   *
   * [WHY 必须有] server 模式下组件只拿到当前页的行，它数不出「一共几页」。
   * 没有这个数，页脚只能显示「共 20 条 · 第 1 / 1 页」，下一页按钮恒 disabled ——
   * 数据是通的、页脚却把翻页锁死了，用户只会以为「后端就只有这一页」。
   */
  @property({ type: Number, attribute: "total-records" }) totalRecords = 0;
  // [WHY] i18n: 与组件既有风格一致，分页文案全部属性化
  @property({ type: String, attribute: "pager-total-text" }) pagerTotalText = "共 {n} 条";
  @property({ type: String, attribute: "pager-page-text" }) pagerPageText = "第 {p} / {c} 页";
  @property({ type: String, attribute: "prev-page-text" }) prevPageText = COPY.prevPage;
  @property({ type: String, attribute: "next-page-text" }) nextPageText = COPY.nextPage;
  /**
   * 「每页多少行」下拉的候选档位，逗号分隔（`10,20,50,100`）。空 = 不显示下拉。
   *
   * [WHY 缺省为空] 分页器多一个可选项就多一分界面噪音，而报表侧的页行数由宿主
   * 固定（导出/打印要可预期）。页面卡自己带档位，`pageSize` 不到 1（= 不分页）
   * 时也不画。空字符串是**存量行为**，与升级前逐像素一致。
   */
  @property({ type: String, attribute: "page-size-options" }) pageSizeOptions = "";
  /** 档位文案模板（`{n}` 换成行数）。 */
  @property({ type: String, attribute: "pager-size-text" }) pagerSizeText = "每页 {n} 行";
  /** 档位下拉的无障碍标签（下拉可见文本是「每页 20 行」，标签说明它管什么）。 */
  @property({ type: String, attribute: "pager-size-label" }) pagerSizeLabel = "每页行数";

  /** 已折叠的组 key。折叠是**纯 UI 态**，不写回配置（刷新后恢复全展开）。 */
  private _collapsed = new Set<string>();
  /**
   * 单元格游标：重渲染后把 roving 停靠点放回这里。
   *
   * [WHY 需要记] 排序 / 换页 / 改每页行数都会整体重渲染（innerHTML 替换），
   * 所有 `<td>` 都是新节点 —— 不记的话每次 Tab 回表格都从首格重来，
   * 用户会以为自己「看漏了一屏」。
   */
  private _cursor: CellPos | null = null;
  /** 重渲染后要把焦点送回哪一列表头（见 `_restoreFocus`）。 */
  private _refocusThKey: string | null = null;
  /**
   * 重渲染后要把焦点送回哪个元素（CSS 选择器）。
   *
   * 存选择器而不是节点引用：重渲染后节点已经不在文档里了（innerHTML 整块替换），
   * 只有选择器还能在新树上找回同一个位置。
   */
  private _refocusSelector: string | null = null;

  /** 最近一次渲染的分页结果（`pageCount` / `renderRows()` 读它）。 */
  private _paged: PagedView = { rows: [], total: null, page: 1, pageCount: 1, totalRows: 0 };

  private _columnWidths: Map<string, number> = new Map();
  private _resizeInfo: ResizeInfo | null = null;
  private _leftOffsets: Map<string, number> = new Map();
  private _rightOffsets: Map<string, number> = new Map();
  private _eventsBound = false;
  private _scrollWrapper: HTMLElement | null = null;
  private _dragKey: string | null = null;
  // [WHY] 最近一次渲染的排序后数据: z-row-click 按 tr data-index 取值, 避免点击时重复排序, 见 [[REQ-014]]
  private _sortedRows: Record<string, unknown>[] = [];

  // ── Visible columns ────────────────────────────────────

  private get _visible(): ReportColumn[] {
    // [WHY] required 字段即使被程序置 hidden 也强制显示, 保证报表关键字段不丢失
    return this.columns.filter((c) => !c.hidden || c.required);
  }

  /**
   * 屏幕上真实可见的列（`hidden` 且非 `required` 的不出现）。
   *
   * [WHY 公开出去] CSV 导出必须与屏幕同源。拿 `columns` 导出会把被列选择器勾掉的列
   * （价格 / 成本族）也写进文件 —— 那份文件是要转发出去的，用户收起它正是因为这个。
   * 判据与 `_visible` 同一条，不另写第二个版本。
   */
  get shownColumns(): ReportColumn[] {
    return this._visible;
  }

  // ── 视图行 / 分页 ───────────────────────────────────────

  /** 数据行（已排序）→ 视图行。有 `group` 走分组，否则一条数据一条。 */
  private _viewRows(sorted: Record<string, unknown>[]): ViewRow[] {
    if (!this.group || !this.group.dims.length) return dataViewRows(sorted, this.rowKey);
    return groupViewRows(this.group, sorted, this._collapsed);
  }

  /**
   * 当前表格实际渲染的行（含小计/总计，**不分页**）。
   *
   * 导出 CSV 必须走这个出口：屏幕与导出各算一份的后果是「页面上 4800、导出 4300」，
   * 没有任何断言会红，只有对账时才发现。
   */
  renderRows(): ViewRow[] {
    return this._viewRows(sortRows(this.data, this.sortState, this.sortMode));
  }

  /** 当前生效的页码总数（不分页时恒为 1）。 */
  get pageCount(): number {
    return this._paged.pageCount;
  }

  /**
   * 换页。
   *
   * [WHY server 模式也改 page] 宿主从 `z-page-change` 里拿到页码后把 `page` 属性设回来是
   * 标准用法，但「忘了设回来」这个错误在客户端毫无痕迹（数据没变、页码不动）。
   * 组件自己先改，宿主设回同一个值是无操作 —— 两种写法都能用。
   */
  private _setPage(p: number): void {
    const next = Math.min(Math.max(1, Math.trunc(p) || 1), Math.max(1, this._paged.pageCount));
    if (next === this._paged.page) return;
    this.page = next;
    this.emit("z-page-change", { page: next, pageSize: this.pageSize });
    this.requestUpdate();
  }

  /**
   * 换每页行数。
   *
   * [WHY 页码必须归 1] 行数变了，原来第 3 页对应的「第 41-60 行」已经不存在：
   * 20 行/页翻到第 3 页时切 50 行/页，还停在第 3 页就是「第 101-150 行」——
   * 越界会被 clamp 成最后一页，用户看到的是「换了行数，内容跳走了」。
   * 归 1 是唯一可解释的行为，也是所有表格库的既有习惯。
   *
   * [WHY 照旧 emit `z-page-change`] server 模式下一律由宿主重取：行数变了等于换了
   * 一份数据（取数键里有 pageSize）。事件里同时带 `page` 与 `pageSize`，宿主不需要
   * 再读一次属性才知道两者都变了。
   */
  private _setPageSize(next: number): void {
    if (next === this.pageSize) return;
    this.pageSize = next;
    this.page = 1;
    this.emit("z-page-change", { page: 1, pageSize: next });
    this.requestUpdate();
  }

  /** 分页器上的候选档位：去重、升序，并保证含当前行数（脚本写的 30 也要能选回来）。 */
  private _sizeChoices(): number[] {
    const list = this.pageSizeOptions
      .split(",")
      .map((s) => Math.trunc(Number(s.trim())))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (this.pageSize > 0) list.push(this.pageSize);
    return [...new Set(list)].sort((a, b) => a - b);
  }

  private _renderPager(p: PagedView): string {
    if (!(this.pageSize > 0)) return "";
    const sizes = this._sizeChoices();
    const picker = sizes.length > 1;
    // [WHY 只有一页就不画] 「共 4 条 · 第 1 / 1 页」加两个禁用按钮，占一行高度却没有任何
    // 可执行动作 —— 短表卡（KPI 级数据）本来就不高，这一行纯属噪音。
    // server 模式例外：页数由宿主决定，组件手里恒为 1，画出来才有的点。
    const noNav = this.pageMode !== "server" && p.pageCount <= 1;
    if (noNav && !picker) return "";
    // [WHY 有下拉时「一页」也要画] 30 行数据按每页 50 行只有 1 页 —— 而用户恰恰要
    // 把它改成 10 行。按老规则整条分页栏会消失，「改行数」的入口就只在数据已经
    // 比一页多时才存在。真正该省的是**空表**上的那一行。
    if (picker && p.totalRows === 0 && p.rows.length === 0) return "";
    const info = `${this.pagerTotalText.replace("{n}", String(p.totalRows))} · ${this.pagerPageText
      .replace("{p}", String(p.page))
      .replace("{c}", String(p.pageCount))}`;
    const btn = (go: "prev" | "next", text: string, disabled: boolean): string =>
      `<button type="button" class="z-rpt__pager-btn" data-page-go="${go}"${
        disabled ? " disabled" : ""
      } part="pager-button">${esc(text)}</button>`;
    // 档位下拉：`<select>` 原生实现即可 —— 键盘、触屏、无障碍语义都是浏览器给的，
    // 自绘一个「点开才出选项」的浮层只会在表格底部被裁切（卡片有 overflow）。
    const sizeSel = picker
      ? `<span class="z-rpt__pager-size"><select data-page-size part="pager-size-select"
           aria-label="${esc(this.pagerSizeLabel)}">${sizes
          .map(
            (n) =>
              `<option value="${n}"${n === this.pageSize ? " selected" : ""}>${esc(
                this.pagerSizeText.replace("{n}", String(n)),
              )}</option>`,
          )
          .join("")}</select></span>`
      : "";
    return html`
      <div class="z-rpt__pager" part="pager">
        <span class="z-rpt__pager-info" part="pager-info">${esc(info)}</span>
        <div class="z-rpt__pager-right">
          ${sizeSel}
          ${noNav ? "" : html`<div class="z-rpt__pager-btns">
            ${btn("prev", this.prevPageText, p.page <= 1)}${btn("next", this.nextPageText, p.page >= p.pageCount)}
          </div>`}
        </div>
      </div>
    `;
  }

  /** 折叠按钮点击。返回 true = 已消费（不再走行点击）。 */
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

  /** 分页按钮点击。返回 true = 已消费。 */
  private _onPagerClick(e: Event): boolean {
    const btn = (e.target as HTMLElement | null)?.closest?.("[data-page-go]") as HTMLElement | null;
    if (!btn || btn.hasAttribute("disabled")) return false;
    const go = btn.getAttribute("data-page-go");
    // 换页会整体重渲染，分页按钮节点被换掉 ⇒ 记下方向，updated() 里把焦点送回
    this._refocusSelector = `[data-page-go="${go}"]`;
    this._setPage(go === "next" ? this._paged.page + 1 : this._paged.page - 1);
    return true;
  }

  /** 分页器「每页行数」下拉变更。返回 true = 已消费。 */
  private _onPagerSizeChange(e: Event): boolean {
    const sel = (e.target as HTMLElement | null)?.closest?.("[data-page-size]") as HTMLSelectElement | null;
    if (!sel) return false;
    const next = Math.trunc(Number(sel.value));
    if (!Number.isFinite(next) || next <= 0) return false;
    this._refocusSelector = "[data-page-size]";
    this._setPageSize(next);
    return true;
  }

  // ── Lifecycle ──────────────────────────────────────────

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("mousemove", this._onResizeMouseMove);
    document.addEventListener("mouseup", this._onResizeMouseUp);
    document.addEventListener("mousedown", this._onGlobalMouseDown);
  }

  disconnectedCallback(): void {
    document.removeEventListener("mousemove", this._onResizeMouseMove);
    document.removeEventListener("mouseup", this._onResizeMouseUp);
    document.removeEventListener("mousedown", this._onGlobalMouseDown);
    this._unbindColDrag?.();
    this._unbindColDrag = null;
    super.disconnectedCallback();
  }

  // ── Render ─────────────────────────────────────────────

  /** 兼容读：`variant="lines"` → `lines`，`variant="default"` → 关掉。 */
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

  render(): string {
    const vis = this._visible;
    // 工具列（列选择器）现在落在表头最右一格，不再独占一行（issue IKQUWH）。
    // [WHY 宽度要传给偏移计算] 它是 `position: sticky; right: 0` 的一格；
    // 而 `fixed=right` 的列也从 `right: 0` 起算 —— 不给右冻结列加上这个起始偏移，
    // 两者会叠在同一处，冻结列会把图标盖掉（或反过来）。
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
      // 两行表头（`col group=`）：CSS 靠这个类给第二行算 sticky 的 top
      vis.some((c) => !!c.group) ? "z-rpt--grouped" : "",
    ].filter(Boolean).join(" ");

    const sorted = sortRows(this.data, this.sortState, this.sortMode);
    // [WHY] 缓存本次渲染的排序后数据供 z-row-click 定位行对象, 见 [[REQ-014]]
    this._sortedRows = sorted;
    // 数据行 → 视图行（可插小计/总计）→ 分页。顺序不能换，理由见 table-view-rows 头部。
    const views = this._viewRows(sorted);
    const paged = paginateViewRows(views, this.pageMode === "server" ? 0 : this.pageSize, this.page);
    // [WHY server 模式要覆写 pageCount / totalRows] server 模式下组件手里只有**当前页**的行
    // （宿主按 page 取数），`paginateViewRows` 数出来永远是「1 页 / 20 条」——
    // 页脚就成了「共 20 条 · 第 1 / 1 页」，下一页按钮恒 disabled，翻不动。
    // 总页数只能来自宿主：`totalRecords`（`PageDataSource.fetch` 返回的 `total`）。
    this._paged =
      this.pageMode === "server" && this.pageSize > 0
        ? {
            ...paged,
            page: Math.max(1, this.page),
            pageCount: Math.max(1, Math.ceil(Math.max(0, this.totalRecords) / this.pageSize) || 1),
            totalRows: this.totalRecords > 0 ? this.totalRecords : paged.totalRows,
          }
        : paged;
    // [WHY +1 是工具列] 表头多了一格 `<th>`（列选择器），表体的空态行要用 colspan 盖满，
    // 少算一格就会在空态时露出一截白底；`renderRow` 每行也各补一格 `<td>`。
    const totalCols = vis.length + (this.selectable ? 1 : 0) + (showTools ? 1 : 0);
    // texts: 本元素的 i18n 属性名与 ColumnConfigTexts 字段一一对应, 直接以自身作文案来源
    const headerCtx: HeaderRenderContext = {
      sortState: this.sortState,
      editable: this.editable,
      // 编辑态全开；查看态由 resizable 单独开"只拖宽"（见属性注释与 [[REQ-021-page-column-width]]）
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
      isSelectedById: (row) => this._selectedById(row),
      rowClass: this.rowClass,
      // 分组上下文：缩进与折叠按钮都要知道「哪些列是维度、哪些组已折叠」
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

    // [WHY 列选择器搬进表头末格] 原来它独占一行（24px 图标 + 4px 间距 = 28px），
    // 每张表都白付这一行；宽表本来就要横滚，纵向每层都挤掉可见行数（issue IKQUWH）。
    // 末格同时满足「不占行」与「永不遮挡列标题」—— 浮在表头上的做法在数值列
    // （右对齐）上必然压住表头文字。
    //
    // 这里只给**内层元素**：`<th>` 自己要不要 `rowspan=2`（分组表头）由 `renderHeadRows`
    // 统一决定 —— 两处各判一次，漏一处就是表头从那一格起右移。
    const toolsHtml = showTools
      ? html`<z-column-selector ${this.columnSelectorOpen ? "open" : ""}
              columnstext="${esc(this.columnsText)}" requiredcolumntext="${esc(this.requiredColumnText)}"></z-column-selector>`
      : "";
    const headRows = renderHeadRows({ vis, ctx: headerCtx, selectable: this.selectable, tools: toolsHtml });

    // [WHY 分组表头必须自带 colgroup] `table-layout: fixed` 只按**第一行**分配列宽。
    // 分组模式下第一行是组头（只有 colspan、没有 width），浏览器于是把总宽按 colspan
    // 均分 —— `col w=104` 全部失效，28 列被压成 71px，数字整列变「…」。
    // `colgroup > col` 的宽度不受 rowspan/colspan 影响，是与表头层数无关的唯一入口。
    //
    // 只在分组时输出：非分组表第一行就是列名行、宽度本来就正确，多一层 colgroup 会
    // 让既有 golden 快照全部漂移，而收益为零。
    const grouped = vis.some((c) => (c.group ?? "").trim() !== "");
    const colgroupHtml = grouped
      ? html`<colgroup>
          ${this.selectable ? html`<col style="width:40px">` : ""}
          ${vis.map((c) => {
            // `col.width` 已是带单位的字符串（"104px"），`_columnWidths` 是不带单位的 px 数
            // —— 两者混着用会出现 `width:104pxpx`（浏览器整条忽略，等于没写）。
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
              : renderBodyRows(this._paged.rows, rowCtx)}
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
      ${this._renderPager(this._paged)}
    `;
  }

  updated(): void {
    this._bindEvents();
    this._bindWrapperScroll();
    this._refreshScrollState();
    // [WHY 量一次合计行高度] tfoot（列汇总）与 tbody 里的 total 行（分组总计）都要贴底，
    // 两者同时存在时叠成一坨 —— 把 tfoot 的高度写进变量，让 total 行叠在它上面。
    // 只在 updated 里量：合计行高度随字号/密度变，但不是每帧都变。
    const foot = this.shadowRoot?.querySelector<HTMLElement>(".z-rpt__foot");
    this.style.setProperty(
      "--z-rpt-foot-h",
      foot ? `${Math.round(foot.getBoundingClientRect().height)}px` : "0px",
    );

    this._applyCursor();
    this._restoreFocus();
    // 内容槽：字符串模板造不出别的组件实例，DOM 落地后再挂（见 report/core/cell-mount.ts）
    // [WHY 传 _sortedRows 而不是 this.data] `data-index` 是**排序后**的序号（排序先跑、
    // 再由 dataViewRows 编号），拿它去索引原始数组会取到别的行 —— 排序一开，格子里
    // 就显示别行的值，而界面长得完全正常。_sortedRows 与 z-row-click 同源，
    // 正是 `rowKeyOf` 注释里那条「渲染与选择必须同源」。
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
  }

  // ── Config snapshot (external persistence) ─────────────

  getConfig(): TableConfig {
    return takeConfigSnapshot(this, this._columnWidths);
  }

  applyConfig(cfg: TableConfig): void {
    applyConfigSnapshot(this, this._columnWidths, cfg);
  }

  // ── Column widths (external persistence) ───────────────

  /**
   * 回灌列宽覆盖（**只碰宽度**，不动隐藏/顺序/对齐/冻结）。
   *
   * [WHY 不用 `applyConfig`] 配置快照是**全量权威**：只带 width 的最小快照会把
   * `hidden` / `fixed` / `align` 一起写成 undefined —— 脚本里 `col x fixed=left`
   * 声明的冻结会被静默抹掉。查看页的「本机记住列宽」只需要宽度这一条通道。
   * 见 [[REQ-021-page-column-width]]。
   *
   * 非法值（非数字 / 越界）直接丢弃：这份数据来自 localStorage，可能是上一版本的格式
   * 或被手工改坏。放行一个 `NaN` 会让整列宽度塌成 0，而且没有任何报错。
   */
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

  /** 当前生效的列宽覆盖（只含用户拖过的列），供宿主持久化。 */
  getColumnWidths(): Record<string, number> {
    return Object.fromEntries(this._columnWidths);
  }

  private _emitConfigChange(): void {
    // [WHY] 统一配置变更事件: 任何列配置/排序变更都携带完整快照, 外部只需监听这一个事件做持久化
    this.emit("z-config-change", { config: this.getConfig() });
  }

  // ── Public helpers ─────────────────────────────────────

  clearSelection(): void {
    this.selectedKeys = [];
    this.emit("z-selection-change", { selectedKeys: [], rows: [] });
  }

  selectAll(): void {
    this.selectedKeys = this.data.map((row, i) => this._getRowKey(row, i));
    // `rows` 给整表编辑态用（选中 = 待删）：页面层没有 key↔行 的映射，自己再算就是第二份判据
    this.emit("z-selection-change", { selectedKeys: [...this.selectedKeys], rows: [...this.data] });
  }

  /** 勾选键 → 行对象（顺序按 `data`）。整表编辑态的「待删行」靠它。 */
  rowsOfKeys(keys: string[]): Record<string, unknown>[] {
    if (!keys.length) return [];
    const want = new Set(keys);
    return this.data.filter((row, i) => want.has(this._getRowKey(row, i)));
  }

  showColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    if (col && col.hidden) { col.hidden = false; this.requestUpdate(); this._emitConfigChange(); }
  }

  hideColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    // [WHY] required 字段不可隐藏, 调用方传入也忽略
    if (col && !col.required && !col.hidden) { col.hidden = true; this.requestUpdate(); this._emitConfigChange(); }
  }

  toggleColumn(key: string): void {
    const col = this.columns.find((c) => c.key === key);
    if (col && !col.required) { col.hidden = !col.hidden; this.requestUpdate(); this._emitConfigChange(); }
  }

  // ── Hosts for extracted modules ────────────────────────
  // [WHY] 拆出的面板/交互模块不持有元素引用, 私有状态经这层闭包回写(见对应文件头)

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

  // ── Event binding ──────────────────────────────────────

  private _onHeadMouseDown = (e: MouseEvent): void => handleHeadMouseDown(e, this._interactionHost);
  private _onResizeMouseMove = (e: MouseEvent): void => handleResizeMouseMove(e, this._interactionHost);
  private _onResizeMouseUp = (): void => handleResizeMouseUp(this._interactionHost);
  private _unbindColDrag: (() => void) | null = null;
  private _onHeadClick = (e: Event): void => handleHeadClick(e, this._interactionHost);

  private _bindEvents(): void {
    if (this._eventsBound) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    if (!shadow) return;
    shadow.addEventListener("mousedown", this._onHeadMouseDown as unknown as EventListener);
    shadow.addEventListener("click", this._onShadowClick as unknown as EventListener);
    shadow.addEventListener("change", this._onTableChange);
    // [WHY] 键盘可达性: Enter/Space 触发排序, Escape 关闭列选择器/表头配置
    shadow.addEventListener("keydown", this._onShadowKeydown as unknown as EventListener);
    // [WHY] 内嵌 z-column-selector 的 open 镜像(组件自身处理 trigger/Escape/外部点击后经事件上报)
    // [WHY 用带前缀的事件名] 修复 Gitee IKRAOR：`z-open` / `z-close` 是通用名且冒泡，
    // 内嵌的 z-select / z-datepicker 开合也会触发这里，把列选择器状态改错。
    shadow.addEventListener("z-column-selector-open", this._onColumnSelectorOpenEvent);
    shadow.addEventListener("z-column-selector-close", this._onColumnSelectorOpenEvent);
    // [WHY 不再用 HTML5 DnD] 见 table-interactions#bindColumnReorder 顶部：
    // 同一库里编辑器早把 DnD 换成了 pointer（三条硬伤写在那份文件头），这里一直没跟。
    this._unbindColDrag = bindColumnReorder(this.shadowRoot!, this._interactionHost, () => this.editable);
    this._eventsBound = true;
  }

  // ── 键盘：网格导航与焦点恢复 ────────────────────────────

  /** 表体数据行（不含空态行）。DOM 顺序即行号。 */
  private _gridRows(): HTMLElement[] {
    return Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>("tbody .z-rpt__row") ?? []);
  }

  private _gridBounds(rows: HTMLElement[]): GridBounds {
    let cols = 0;
    for (const r of rows) cols = Math.max(cols, r.children.length);
    return { rows: rows.length, cols };
  }

  private _cellAt(rows: HTMLElement[], pos: CellPos): HTMLElement | null {
    return (rows[pos.row]?.children[pos.col] as HTMLElement | undefined) ?? null;
  }

  private _allCells(rows: HTMLElement[]): HTMLElement[] {
    return rows.flatMap((r) => Array.from(r.children) as HTMLElement[]);
  }

  /**
   * 把 roving 停靠点放回游标处（**不**抢焦点）。
   *
   * [WHY 不 focus] 这个方法是「重渲染之后重挂」用的，触发者可能是排序、换页，
   * 也可能是宿主动了个数据字段。后者不该把用户的焦点从别处抢回表格里。
   * 只有明确由用户操作引发的位置变化才恢复焦点（见 `_restoreFocus`）。
   */
  private _applyCursor(): void {
    const rows = this._gridRows();
    if (!rows.length) return;
    const bounds = this._gridBounds(rows);
    const cursor = this._cursor;
    const want =
      cursor && cursor.row < bounds.rows && cursor.col < bounds.cols ? cursor : { row: 0, col: 0 };
    const target = this._cellAt(rows, want);
    if (target) roveTo(target, this._allCells(rows), { focus: false });
  }

  /**
   * 重渲染后把焦点送回用户刚才所在的位置。
   *
   * [WHY 需要它] 排序 / 换页 / 改每页行数都会触发整体重渲染，**节点被整个换掉**，
   * 焦点掉到 `<body>`。鼠标用户无感（手还在原位），键盘用户每操作一次就得重新 Tab
   * 回来 —— 而「连续切几列排序」「连翻几页」正是这些控件的用法。
   * 同类缺陷 2026-11-16 已在 `z-column-selector`（勾一列）与 `z-table`（排序）上修过。
   */
  private _restoreFocus(): void {
    const thKey = this._refocusThKey;
    const selector = this._refocusSelector;
    this._refocusThKey = null;
    this._refocusSelector = null;

    if (thKey) {
      const th = this.shadowRoot?.querySelector<HTMLElement>(`.z-rpt__th[data-key="${thKey}"]`);
      if (th) {
        roveTo(th, this._sortableThs());
        return;
      }
    }
    if (!selector) return;
    const el = this.shadowRoot?.querySelector<HTMLElement>(selector);
    if (el && !(el as HTMLButtonElement).disabled) {
      el.focus();
      return;
    }
    // 分页按钮在边界处变灰（第一页按「上一页」）—— 焦点给另一个，别掉到 body
    const other = /data-page-go="prev"/.test(selector)
      ? '[data-page-go="next"]'
      : /data-page-go="next"/.test(selector)
        ? '[data-page-go="prev"]'
        : null;
    const fallback = other ? this.shadowRoot?.querySelector<HTMLElement>(other) : null;
    if (fallback && !(fallback as HTMLButtonElement).disabled) fallback.focus();
  }

  private _sortableThs(): HTMLElement[] {
    return Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>(".z-rpt__th--sortable") ?? []);
  }

  /**
   * 表内的键盘契约：表头排序 + 表头/单元格的 roving 移动。
   *
   * [WHY 单元格导航是本轮新加的] 这张表原先只有「可排序表头按 Enter」一条键盘路径，
   * 数据区**完全碰不到**：`<td>` 不可聚焦，读屏能按行列念，键盘却挪不过去一格。
   * 而它恰恰是业务里最长的那张表（报表页 20 列 × 50 行）。现在与 `z-table` 同一套：
   * 整表一个 Tab 停靠点，进去方向键走格，Home/End 走行首行尾，Ctrl+Home/End 走全表。
   * 算法在 `primitives/roving`（L0），这里只负责「候选集是本表的 tbody 行」。
   */
  private _onShadowKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && (this.columnSelectorOpen || this._configOpen)) {
      this.columnSelectorOpen = false;
      this._configOpen = null;
      this.requestUpdate();
      return;
    }

    const th = (e.target as HTMLElement).closest?.(".z-rpt__th--sortable") as HTMLElement | null;
    if (th) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        // [WHY 这里**不**再记 `_refocusThKey`] 记录点只有一个：`_onShadowClick` 分发到
        // 表头时记（键盘的 `th.click()` 也走那条路，因为 click() 是同步派发、会冒泡到
        // shadowRoot）。两处都记的话，删掉任一处测试都照样绿 —— 等于两处都没有护栏。
        // 这是变异验证发现的：删掉这一行，G5 仍然全绿。
        th.click();
        return;
      }
      // [WHY 表头也要 roving] 原来每个可排序列都带 `tabindex="0"`，而同一张表的
      // 单元格却是「整表一个停靠点」—— 一个控件两套规矩，键盘用户学不会。
      // 表头只沿水平方向排布 ⇒ `axis: "horizontal"`（↑↓ 留给页面滚动）。
      if (roveByKey(this._sortableThs(), th, e.key, { wrap: false, axis: "horizontal" })) {
        e.preventDefault();
      }
      return;
    }

    const td = (e.target as HTMLElement).closest?.(".z-rpt__td") as HTMLElement | null;
    if (!td) return;
    const intent = gridIntent(e.key, e);
    if (!intent) return;
    const rowEl = td.parentElement as HTMLElement | null;
    const rows = this._gridRows();
    const row = rowEl ? rows.indexOf(rowEl) : -1;
    const col = rowEl ? Array.from(rowEl.children).indexOf(td) : -1;
    if (row < 0 || col < 0) return;

    const from = { row, col };
    const bounds = this._gridBounds(rows);
    const next = resolveCell(from, intent, bounds);
    e.preventDefault();
    if (sameCell(next, from)) return;

    const target = this._cellAt(rows, next);
    if (!target) return;
    this._cursor = next;
    roveTo(target, this._allCells(rows));
  };

  // [WHY] 自然交互: 固定列阴影仅在滚动到边缘时显示, 见滚动感知阴影 CSS
  // BaseElement 每次渲染整体替换 innerHTML, wrapper 节点会重建, 须按节点引用重新绑定
  private _bindWrapperScroll(): void {
    const wrapper = this.shadowRoot?.querySelector(".z-rpt__wrapper") as HTMLElement | null;
    if (!wrapper || wrapper === this._scrollWrapper) return;
    this._scrollWrapper = wrapper;
    wrapper.addEventListener("scroll", this._refreshScrollState, { passive: true });
  }

  private _refreshScrollState = (): void => {
    const wrapper = this.shadowRoot?.querySelector(".z-rpt__wrapper") as HTMLElement | null;
    if (!wrapper) return;
    const scrolledLeft = wrapper.scrollLeft > 0;
    const scrolledRight = wrapper.scrollLeft + wrapper.clientWidth < wrapper.scrollWidth - 1;
    wrapper.classList.toggle("z-rpt__wrapper--scrolled-left", scrolledLeft);
    wrapper.classList.toggle("z-rpt__wrapper--scrolled-right", scrolledRight);
  };

  // [WHY] 整行点击逻辑见 table-interactions#handleRowClick(composedPath 排除交互元素)
  private _onShadowClick = (e: Event): void => {
    // 折叠按钮与分页按钮必须先于行点击拦下：它们都在 tr / 表格内，
    // 让 handleRowClick 先跑会把它当成「点了这一行」，宿主收到一次假的 z-row-click。
    if (this._onGroupToggle(e)) return;
    if (this._onPagerClick(e)) return;
    // 行内控件（`col ui=`）先于行点击：控件格不该顺带冒成「点了这一行」（issue IKUXAB）
    if (handleCellClick(e, this._interactionHost)) return;
    if (handleRowClick(e, this._interactionHost)) return;
    // Column config dropdown (editable): 面板内部按钮由 column-config-panel 统一分发
    if (handleColumnConfigClick(e.target as HTMLElement, this._panelHost)) return;
    // Sortable header
    // [WHY] 列选择器触发器/勾选已由内嵌 z-column-selector 自消费(事件不冒泡到表头/行逻辑)
    const sortTh = (e.target as HTMLElement | null)?.closest?.(".z-rpt__th--sortable") as HTMLElement | null;
    // 拖调宽手柄不该把焦点拽回表头（用户还在拖，焦点在哪都不该由一次 resize 决定）
    if (sortTh && !(e.target as HTMLElement | null)?.closest?.(".z-rpt__resize-handle")) {
      this._refocusThKey = sortTh.dataset.key ?? null;
    }
    this._onHeadClick(e);
  };

  private _onGlobalMouseDown = (e: MouseEvent): void => {
    if (!this._configOpen) return;
    const host = this.shadowRoot?.host;
    if (!host) return;
    // [WHY] 不能用 host.contains(e.target): composed 事件在 document 上的 target
    // 被 retarget 成最外层宿主(如嵌套在 z-data-list 时 target 是 z-data-list),
    // contains 恒 false → 误判外部点击 → dropdown 随 mousedown 关闭 → click 丢失。
    // composedPath() 保留完整事件路径(含 shadow 内部元素), 见 [[bug-20260813-report-table-click-outside]]
    if (!(e.composedPath() as EventTarget[]).includes(host)) {
      this._configOpen = null;
      this.requestUpdate();
    }
  };

  // [WHY] 列选择器已抽为独立组件 z-column-selector(见文件头), 其 open 状态经
  // z-column-selector-open/-close 事件镜像到本表 columnSelectorOpen, 见 [[REQ-015-column-selector]]
  private _onColumnSelectorOpenEvent = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    // [WHY] 仅镜像内嵌的 z-column-selector(页面上外部摆放的选择器事件不进本表 shadow)
    if (!t || t.tagName !== "Z-COLUMN-SELECTOR") return;
    const open = e.type === "z-column-selector-open";
    // [WHY] 同值守卫: 事件翻转后由模板 open 属性 seed 重建, 重建实例不 emit, 无环
    if (this.columnSelectorOpen !== open) this.columnSelectorOpen = open;
  };

  // ── Selection ──────────────────────────────────────────
  // [WHY] 勾选变更/配置合计开关的统一分发见 table-interactions#handleTableChange

  private _getRowKey(row: Record<string, unknown>, index: number): string {
    return rowKeyOf(row, index, this.rowKey);
  }

  /**
   * 解析 `selectedRowId`（`id:10` 或 `code:a,b`，逗号分隔多组）判断本行是否命中。
   * 口径：冒号后为空 ⇒ 不命中（防 `id:` 命中一切）；值逐字比较，除 trim 外不做转换。
   */
  private _selectedById(row: Record<string, unknown>): boolean {
    const spec = this.selectedRowId.trim();
    if (!spec) return false;
    for (const item of spec.split(",")) {
      const idx = item.indexOf(":");
      if (idx < 0) continue;
      const key = item.slice(0, idx).trim();
      const want = item.slice(idx + 1).trim();
      if (!key || !want) continue;
      if (String(row[key] ?? "") === want) return true;
    }
    return false;
  }

  private _onTableChange = (e: Event): void => {
    // 分页器下拉要先拦：它不是行内控件（不是勾选、不是格内编辑），漏下去会被当成
    // 「表格配置变更」，且下拉的 change 会一路冒到宿主（旧实现里翻页事件就那么脏了
    // 一次编辑器 —— 一次翻页 = 一次保存空脚本）。
    if (this._onPagerSizeChange(e)) return;
    handleTableChange(e, this._interactionHost);
  };
}

observeLegacyAttribute(ZReportTable, "variant");

customElements.define("z-report-table", ZReportTable);
