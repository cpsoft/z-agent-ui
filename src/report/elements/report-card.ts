// `<z-report-card>` —— 看板上的一张卡：按 cardKind 分派到指标 / 图表 / 表格 / 明细 / 文本 / 图片。
//
// [为什么一张卡要自己取数，而不是只做纯展示] 报表的核心价值有一半在「配置 → 查询」的
// 翻译上（相对日期窗口、kpi 单值收敛、明细列推导），那部分已在 core/report-query.ts
// 收敛成唯一实现。卡如果只做纯展示，每个宿主都要自己再包一层取数 + 竞态 + 错误态，
// 20 处各写一遍必然分叉。所以这里接 `dataSource` 自己取数，同时保留 `rows` 直传的余地
// （宿主想完全接管取数时不传 dataSource 即可，见下面 render 的细节）。
//
// [为什么图表/表格走命令式挂载] `<z-chart-series>` 的 data 是 attribute:false 的
// property，无法从 HTML 字符串喂数据；而 BaseElement 每次 render 都是整体
// `shadow.innerHTML = ...`。两条约束叠加，图表子树只能在 updated() 里用 DOM API 建。
// 代价是每次属性变化会重建图（动画重播），换来的是不需要给基类加 diff 机制。
//
// [为什么子组件用动态 import] 只用指标卡/文本卡的宿主不该为图表与表格付包体。
// 动态 import 在 lib mode + preserveModules 下会切成独立 chunk，用到才加载。
//
// [为什么卡壳（按钮/状态条/放大）也在这个元素里] 卡壳是「一张卡的可见边界」，
// 不是宿主的业务。宿主自己再包一层，症状是两张卡在同一个看板里内边距、按钮顺序、
// 状态文案各不相同 —— 而这类差异没有任何测试会失败。属于业务的动作（打开明细、
// 跳编辑器）元素**不实现**：按钮由 `actions` 显式开启，点击只发 `z-card-action`
// 事件交给宿主，避免出现「点了没反应」的死按钮。
//
// [为什么卡壳 HTML/取数/导出/挂载各拆一个文件] 纯渲染与状态机混在一个 800+ 行的类里时，
// 改文案要跨过取数逻辑去读；按职责拆开后每块都能单独读。类只留属性、生命周期与事件分发。

import { COPY, BaseElement, escapeHtml, html, property, t, defineElement } from "../../core/index.js";
import { cardKind, type CardAction } from "../core/report-card.js";
import { queryChartData, queryKpiPrev, resolveFilters } from "../core/report-query.js";
import { asQueryError, type ChartQueryData, type ReportDataSource } from "../core/data-source.js";
import type { Column, ReportChart, ReportFilter, ReportOrderBy } from "../core/types.js";
import {
  bodyHtml,
  errorBarHtml,
  headHtml,
  statusHtml,
  visibleActions,
  type CardRenderCtx,
} from "./card-render.js";
import { clockOf, effectiveFilters, effectiveSort, needsQuery } from "./card-load.js";
import { exportRows, runExport } from "./card-export.js";
import { mountSub, type SubMountCtx } from "./card-submount.js";
import reportCardCSS from "./report-card.css?raw";

/** 卡壳上可出现的动作。定义在 core（宿主也要用它声明按钮集合），此处转出便于只引元素的人。 */
export type { CardAction };

export class ZReportCard extends BaseElement {
  static styles = reportCardCSS;

  /** 卡片配置（ReportChart）。含 id/标题/维度/指标/筛选/种类与其专属配置。 */
  @property({ type: Object, attribute: false }) chart: ReportChart | null = null;

  /** 数据源。不传 = 不取数（文本卡/图片卡本来就不查数据；其余种类会停在空态）。 */
  @property({ type: Object, attribute: false }) dataSource: ReportDataSource | null = null;

  /** 看板级生效筛选（已合并筛选卡与本卡筛选）。相对日期标记在这里可以直接传，内部会解析。 */
  @property({ type: Array, attribute: false }) filters: ReportFilter[] = [];

  /** 排序。缺省读 chart.orderBy。 */
  @property({ type: Array, attribute: false }) orderBy: ReportOrderBy[] | null = null;

  @property({ type: Boolean, attribute: "show-title" }) showTitle = true;
  @property({ type: String, attribute: "loading-text" }) loadingText = COPY.loading;
  @property({ type: String, attribute: "empty-text" }) emptyText = COPY.empty;
  @property({ type: String, attribute: "no-chart-text" }) noChartText = COPY.noChart;

  // ---- 卡壳 ----

  /** 显示哪些动作按钮。默认只给元素自己做得完的三个（见 SELF_ACTIONS）。
   *  `detail` / `edit` 需要宿主监听 `z-card-action`，不监听就别放进来。 */
  @property({ type: Array, attribute: false })
  actions: CardAction[] = ["export", "expand", "refresh"];

  /** 数据集标签文案（宿主负责把 datasetId 翻成名字）。空 = 不显示标签。 */
  @property({ type: String, attribute: "dataset-name" }) datasetName = "";

  /** 自动刷新秒数。0 = 不自动刷新。 */
  @property({ type: Number, attribute: "refresh-seconds" }) refreshSeconds = 0;

  /** 导出文件名，缺省用 chart.title。 */
  @property({ type: String, attribute: "export-name" }) exportName = "";

  // ---- 状态条 / 按钮文案（全部可覆盖，便于宿主统一 i18n） ----
  @property({ type: String, attribute: "waiting-text" }) waitingText = COPY.waitingConfig;
  @property({ type: String, attribute: "updating-text" }) updatingText = COPY.updating;
  @property({ type: String, attribute: "done-text" }) doneText = COPY.queryDone;
  @property({ type: String, attribute: "failed-text" }) failedText = COPY.updateFailedFallback;
  @property({ type: String, attribute: "error-text" }) errorText = COPY.updateFailed;
  @property({ type: String, attribute: "retry-text" }) retryText = COPY.retry;
  @property({ type: String, attribute: "collapse-text" }) collapseText = COPY.collapsePanel;

  // ---- 内部状态（不反射到 attribute） ----
  private _loading = false;
  private _error = "";
  private _data: ChartQueryData | null = null;
  private _kpiPrev: number | null = null;
  private _updatedAt = "";
  private _expanded = false;
  /** 数据集字段元数据（列头别名/注释来源）。见 _metaOf。 */
  private _cols: Column[] = [];
  /** 上面这份元数据对应的 datasetId（换数据集要重取，否则列头沿用旧别名）。 */
  private _colsOf = -1;
  /** 已发起的取数指纹。用它挡住「updated 里再次判定需要取数」造成的无限循环。 */
  private _loadKey = "";
  /** 请求序号：宿主快速改筛选时，只有最后一次请求的结果能落地。 */
  private _seq = 0;
  /** `_data` 属于哪张卡。换卡时必须清空 —— 否则新卡会先显示上一张卡的数字。 */
  private _dataOf = "";
  /** 交互排序（点列头产生）。null = 跟随配置（orderBy 属性 / chart.orderBy）。 */
  private _sort: ReportOrderBy[] | null = null;
  /** `_sort` 属于哪张卡：换卡后配置排序重新生效。 */
  private _sortOf = "";
  private _timer = 0;
  /** 当前定时器对应的秒数，-1 = 尚未建立。 */
  private _timerOf = -1;
  /** 下次渲染完成后要把焦点还给谁（选择器）。空 = 不还。 */
  private _focusAfterRender = "";

  constructor() {
    super();
    // 事件委托挂在 shadowRoot 上（innerHTML 整体重建不会换掉 root，按钮却每次都是新节点）。
    // 逐个按钮 addEventListener 的写法在每次 render 后都要重挂，漏一次就是「按钮点了没反应」。
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this._stopTimer();
    document.removeEventListener("keydown", this._onDocKey);
    super.disconnectedCallback();
  }

  /** 强制重新取数（宿主在外部数据变动后调用）。
   *  保留当前数据直到新结果落地 —— 否则外部一触发刷新，整块卡先变空再变回来。 */
  reload(): void {
    this._loadKey = "";
    this.requestUpdate();
  }

  /** 立刻导出当前卡的数据。返回是否真的导出了（无数据时 false）。 */
  exportNow(): boolean {
    const chart = this.chart;
    if (!chart) return false;
    return runExport({
      chart,
      data: this._data,
      cols: this._cols,
      sort: this._effectiveSort(),
      name: this.exportName,
      emit: (type, detail) => this.emit(type, detail),
    });
  }

  /** 放大到整屏 / 收起。ESC 等价于收起。 */
  setExpanded(v: boolean): void {
    if (this._expanded === v) return;
    this._expanded = v;
    if (v) document.addEventListener("keydown", this._onDocKey);
    else document.removeEventListener("keydown", this._onDocKey);
    this.requestUpdate();
    this.emit("z-card-expand", { chartId: this.chart?.id, expanded: v });
  }

  render(): string {
    const chart = this.chart;
    if (!chart) return `<div class="state">${escapeHtml(this.noChartText)}</div>`;

    const kind = cardKind(chart);
    const hasData = needsQuery(kind);
    const mods = this._expanded ? " card--expanded" : "";
    // [为什么错误有两种呈现] 有旧数据时错误只是「这次更新失败」，卡体必须留着旧值，
    // 所以用一条可关闭的窄条（_errorBar）。没有旧数据时卡体本来就是空的，再用窄条
    // 等于「一块空白 + 一行小字」，所以直接让卡体变成错误占位（_errorPlaceholder）。
    const ctx = this._renderCtx(chart);
    const bar = this._error && this._data ? errorBarHtml(ctx) : "";
    return html`
      <div class="card card--${kind}${mods}" part="card">
        ${headHtml(ctx, chart, hasData)}${hasData ? statusHtml(ctx) : ""}${bar}
        <div class="body">${bodyHtml(ctx, chart, kind)}</div>
      </div>
    `;
  }

  updated(): void {
    this._maybeLoad();
    this._syncTimer();
    void this._mountSub();
    if (this._focusAfterRender) {
      const sel = this._focusAfterRender;
      this._focusAfterRender = "";
      this.shadowRoot?.querySelector<HTMLElement>(sel)?.focus();
    }
  }

  /** 一帧渲染所需的输入快照（卡壳/卡体 HTML 全部是纯函数，只吃这份状态）。 */
  private _renderCtx(chart: ReportChart): CardRenderCtx {
    return {
      showTitle: this.showTitle,
      datasetName: this.datasetName,
      actions: this.actions,
      expanded: this._expanded,
      loading: this._loading,
      error: this._error,
      data: this._data,
      kpiPrev: this._kpiPrev,
      updatedAt: this._updatedAt,
      collapseText: this.collapseText,
      waitingText: this.waitingText,
      updatingText: this.updatingText,
      doneText: this.doneText,
      failedText: this.failedText,
      errorText: this.errorText,
      retryText: this.retryText,
      loadingText: this.loadingText,
      emptyText: this.emptyText,
      exportRows: () => exportRows(chart, this._data),
    };
  }

  // ---- 事件 ----

  /** 点击委托：按钮是每次 render 新建的节点，监听只能挂在 shadowRoot 上。 */
  private _onClick = (e: Event): void => {
    const act = this._actOf(e);
    if (!act) return;
    if (act === "retry") {
      this._reloadNow();
      return;
    }
    // 不在可见列表里的动作一律不响应：按钮被 CSS/宿主误留时不会触发宿主的业务回调
    if (!visibleActions(this.actions, this._hasData()).includes(act)) return;
    if (act === "export") {
      this.exportNow();
    } else if (act === "expand") {
      this.setExpanded(!this._expanded);
    } else if (act === "refresh") {
      this._reloadNow();
    } else {
      // detail / edit：元素不实现，交给宿主（明细弹层与编辑器都在宿主那边）
      this.emit("z-card-action", { chartId: this.chart?.id, action: act });
    }
  };

  private _actOf(e: Event): CardAction | "retry" | null {
    for (const n of (e.composedPath?.() ?? []) as HTMLElement[]) {
      const a = n?.dataset?.act;
      if (a) return a as CardAction;
    }
    return null;
  }

  private _reloadNow(): void {
    this._loadKey = "";
    this.requestUpdate();
  }

  private _onDocKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this._expanded) {
      // 焦点要在**重渲染之后**还给按钮：收起会整块重建 shadow DOM，此刻的按钮节点
      // 马上就要被替换掉，现在 focus 它等于把焦点扔在一个即将消失的元素上（症状：
      // 键盘用户收起后焦点掉回 body，Tab 从头开始）。
      this._focusAfterRender = '[data-act="expand"]';
      this.setExpanded(false);
    }
  };

  private _hasData(): boolean {
    const chart = this.chart;
    return !!chart && needsQuery(cardKind(chart));
  }

  /** 同步自动刷新定时器。只在秒数变化时重建，避免每次 updated 都重置计时。 */
  private _syncTimer(): void {
    const secs = this.refreshSeconds;
    if (this._timerOf === secs) return;
    this._stopTimer();
    this._timerOf = secs;
    if (secs > 0) {
      this._timer = setInterval(() => this._reloadNow(), secs * 1000) as unknown as number;
    }
  }

  private _stopTimer(): void {
    if (this._timer) clearInterval(this._timer);
    this._timer = 0;
    this._timerOf = -1;
  }

  // ---- 取数 ----

  private _effectiveFilters(): ReportFilter[] {
    return effectiveFilters(this.chart, this.filters);
  }

  /** 生效排序：交互排序（点列头）优先，其次 `orderBy` 属性，最后配置里的 orderBy。 */
  private _effectiveSort(): ReportOrderBy[] {
    return effectiveSort(this.chart, this._sort, this.orderBy);
  }

  private _maybeLoad(): void {
    const chart = this.chart;
    const ds = this.dataSource;
    if (!chart || !ds) return;
    const kind = cardKind(chart);
    if (!needsQuery(kind)) return;

    // 换卡：交互排序与旧数据都要作废。不清的话「切到另一张卡」会先显示上一张卡的数字，
    // 且上一张卡点过的列头排序会继续作用在新卡上（字段名不同 ⇒ 后端 1054 或静默乱序）。
    const cardId = String(chart.id ?? "");
    if (cardId !== this._sortOf) {
      this._sortOf = cardId;
      this._sort = null;
    }
    if (cardId !== this._dataOf) {
      this._dataOf = cardId;
      this._data = null;
      this._kpiPrev = null;
      this._updatedAt = "";
    }

    const key = JSON.stringify([chart, this._effectiveFilters(), this._effectiveSort()]);
    if (key === this._loadKey) return;
    this._loadKey = key; // 先记指纹再发请求：requestUpdate 触发的 updated 才能被挡住
    void this._load(chart, ds, kind, key);
  }

  private async _load(chart: ReportChart, ds: ReportDataSource, kind: string, key: string): Promise<void> {
    const seq = ++this._seq;
    this._loading = true;
    this._error = "";
    // [为什么不在这里清 _data] 刷新失败时卡面必须还留着上一次的数字（状态条已说明
    // 「以下保留上次结果」）。清掉就变成「刷新一下整块卡空了」，用户读作「数据没了」。
    // 换卡时的清理在 _maybeLoad 里按 chart.id 做。
    this.requestUpdate();

    // 同一次取数用同一个 now：本期与上期若跨过午夜会落到不同日期，两个窗口就不再等长
    const now = new Date();
    const orderBy = this._effectiveSort();
    const filters = this._effectiveFilters();
    try {
      // 列元数据与数据一起取：表格列头要「别名 > 注释 > 物理名」（report-columns.dimLabel）。
      // 单独取、失败不致命 —— 拿不到元数据就退回物理列名，不能因此把整张卡打成错误态。
      const [data, cols] = await Promise.all([
        queryChartData(ds, chart, filters, orderBy, now),
        this._metaOf(chart.datasetId, ds),
      ]);
      this._cols = cols;
      let prev: number | null = null;
      if (kind === "kpi" && chart.kpi?.compare) {
        try {
          prev = await queryKpiPrev(ds, chart, resolveFilters(filters, now));
        } catch {
          // 环比是附加信息：查不到就显示 "--"，不能让整张卡变错误态
          prev = null;
        }
      }
      if (seq !== this._seq || key !== this._loadKey) return; // 已被更新的请求取代
      this._data = data;
      this._kpiPrev = prev;
      this._loading = false;
      this._updatedAt = clockOf(new Date());
      this.requestUpdate();
      this.emit("z-card-loaded", { chartId: chart.id, ...data });
    } catch (e) {
      if (seq !== this._seq || key !== this._loadKey) return;
      const err = asQueryError(e);
      this._loading = false;
      this._error = err.message || t("queryFailed");
      this.requestUpdate();
      this.emit("z-card-error", { chartId: chart.id, error: err });
    }
  }

  /** 数据集字段元数据（列别名/注释的来源）。
   *
   *  [WHY 失败不抛] 它只影响列头文案与对齐，数据本身是好的。取不到就退回物理列名，
   *  不能因为元数据接口 500 就把整张卡打成错误态。缓存按 datasetId 失效 ——
   *  同一张卡反复改筛选不该反复取元数据。 */
  private async _metaOf(datasetId: number, ds: ReportDataSource): Promise<Column[]> {
    if (datasetId <= 0) return this._cols;
    if (this._colsOf === datasetId && this._cols.length > 0) return this._cols;
    try {
      const cols = await ds.getDatasetMeta(datasetId);
      this._colsOf = datasetId;
      return cols;
    } catch {
      return this._cols;
    }
  }

  // ---- 图表 / 表格 / 明细：命令式挂载 ----

  /** 把当前状态快照成挂载输入（回调写回元素状态 / 由元素 emit）。 */
  private _mountCtx(chart: ReportChart): SubMountCtx {
    return {
      chart,
      data: this._data,
      cols: this._cols,
      emptyText: this.emptyText,
      sort: this._effectiveSort(),
      onSort: (next) => this._applySort(next),
      emit: (type, detail) => this.emit(type, detail),
    };
  }

  private async _mountSub(): Promise<void> {
    const chart = this.chart;
    if (!chart) return;
    await mountSub(this._mountCtx(chart), this.shadowRoot);
  }

  /** 交互排序：记录本次排序并重新聚合。
   *  `null` 与空数组语义不同 —— 空数组是「用户点了第三次，取消排序」，必须真的
   *  清掉排序项（回到后端的自然序），不能回落到配置里的 orderBy。 */
  private _applySort(next: ReportOrderBy[]): void {
    this._sort = next;
    this._loadKey = ""; // 指纹里含 _sort，这里清空是双保险
    this.requestUpdate();
    this.emit("z-sort-change", { chartId: this.chart?.id, orderBy: next });
  }
}

// [为什么不像某些自定义元素库那样加 define 守卫] 本库所有组件都是直接 define：
// 同一模块经 ESM 只执行一次，重复调用不会发生。真正会重复的场景是「宿主同时引了
// 两份不同产物（dist + src）」，那是两份不同类，guard 也救不了（instanceof 已不同）。
// 全库统一比给单个组件加伪防护更重要。
defineElement("z-report-card", ZReportCard);
