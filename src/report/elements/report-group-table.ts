// `<z-report-group-table>` —— 分组表 / 树状表格：层级缩进 + 父级小计行 + 总计行。
//
// @deprecated 2026-10-26：分组能力已合入 `<z-report-table>`（`group` / `tree` 属性，
// 见 `report/table/table-view-rows.ts`）。本元素保留**仅**为了不破坏
// 已发布的 `ZReportGroupTableReact` 包装与宿主里手写的 `<z-report-group-table>`；
// 新代码请用 `<z-report-table group=... tree>`。
//
// [WHY 当初是独立元素、为什么现在不是] 本元素只有分组/小计/折叠，没有列宽、列格式、
// 固定列、分页；而 z-report-table 反过来。两个都叫「报表表格」能力却互补，宿主想要
// 「分组 + 列宽」就只能自建（zEtl 的 GroupTable 就是这么来的，代价是屏幕与导出各算一份）。
// 归并后小计算法仍然只有 `report/core/report-group` 一份，本文件只是它的第二种渲染壳。
//
// [为什么不复用 z-report-table] 那个组件的行是「一条 result 行 = 一个 tr」，而分组表要
// 在层级之间插入**算出来的**小计行（不是后端返回的行），还要按 depth 缩进、按 tree 折叠。
// 把这些塞进 z-report-table 会让它的 data 需要同时支持「原始行」与「渲染行」两种语义，
// 而它的排序/列宽/服务端排序全建立在前者上。
//
// [为什么小计行由本元素算、而不是宿主传] 算小计要用 chart 的 metrics/aggregation 语义
// （见 core/report-group），宿主已经传了 chart，再让它算一遍等于两处实现。
// 导出需要同一份行，所以 core 里那份 `buildGroupRows` 是三处共用的唯一入口。
//
// [为什么状态全在内部] 折叠是纯 UI 态（不写回配置）：用户折了一个组再刷新，不该
// 变成「这个组以后都折叠」。配置里有 showSubtotal / showGrandTotal，那是另一回事。

import { COPY, BaseElement, escapeAttr, escapeHtml, html, property, t, defineElement } from "../../core/index.js";
import { buildGroupRows, type GroupRenderRow } from "../core/report-group.js";
import type { ReportTableColumn } from "../core/report-table-columns.js";
import type { ReportChart } from "../core/types.js";
import groupTableCSS from "./report-group-table.css?raw";

/** 缩进基准：父级行 10px，每下一级 +16px（与 React 版 GroupTable 逐像素一致）。 */
const INDENT_BASE = 10;
const INDENT_STEP = 16;

export class ZReportGroupTable extends BaseElement {
  static styles = groupTableCSS;

  /** 卡片配置。只用到 rows / measures / computedFields / showSubtotal / showGrandTotal
   *  以及聚合种类 —— 小计怎么算是由它们决定的。 */
  @property({ type: Object, attribute: false }) chart: ReportChart | null = null;

  /** 展示列（由 core 的 buildTableColumns 产出，key 与 chart.rows 原串一致）。 */
  @property({ type: Array, attribute: false }) columns: ReportTableColumn[] = [];

  /** 叶子行（后端聚合结果 result.rows）。 */
  @property({ type: Array, attribute: false }) rows: Record<string, unknown>[] = [];

  /** 是否显示父级小计行。`null` = 听图表的 `showSubtotal`（缺省 true）。
   *  [为什么默认是 null 而不是 true] 图表自带这两个开关。元素默认 true 会让
   *  「图表里关掉了小计」在渲染时被元素悄悄打开 —— 宿主只有一个 chart 却看到两种行为。 */
  @property({ type: Boolean, attribute: "subtotal" }) subtotal: boolean | null = null;

  /** 是否显示总计行。`null` = 听图表的 `showGrandTotal`（缺省 true）。 */
  @property({ type: Boolean, attribute: "grand-total" }) grandTotal: boolean | null = null;

  /** 树状模式：父级行带折叠按钮。`null` = 听图表的 chartType。 */
  @property({ type: Boolean, attribute: "tree" }) tree: boolean | null = null;

  @property({ type: String, attribute: "empty-text" }) emptyText = COPY.empty;
  @property({ type: String, attribute: "max-height" }) maxHeight = "";

  /** 已折叠的组 key。折叠状态**不写回配置**（纯 UI 态），刷新后恢复全展开。 */
  private _collapsed = new Set<string>();

  constructor() {
    super();
    // 事件委托挂在 shadowRoot 上：render() 每次都整体重建 innerHTML，
    // 逐个按钮绑监听就得每次重绑，漏一次就是「点了没反应」。
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  /** 当前折叠的组（宿主/测试可读）。 */
  get collapsedGroups(): string[] {
    return [...this._collapsed];
  }

  /** 展开/折叠某个组。 */
  setCollapsed(groupKey: string, v: boolean): void {
    if (v === this._collapsed.has(groupKey)) return;
    if (v) this._collapsed.add(groupKey);
    else this._collapsed.delete(groupKey);
    this.requestUpdate();
    this.emit("z-group-toggle", { groupKey, collapsed: v });
  }

  /** 当前实际渲染的行（含小计/总计）。导出走同一份，屏幕与 CSV 才不会差几行。 */
  renderRows(): GroupRenderRow[] {
    const chart = this.chart;
    if (!chart) return [];
    return buildGroupRows(chart, this.rows ?? [], {
      collapsed: this._collapsed,
      // null 交给 core 去读 chart.showSubtotal / showGrandTotal（单一真源）
      subtotal: this.subtotal ?? undefined,
      grandTotal: this.grandTotal ?? undefined,
    });
  }

  /** 是否树状模式：未显式指定时看图表类型。 */
  private _isTree(): boolean {
    return this.tree ?? this.chart?.chartType === "tree-table";
  }

  render(): string {
    const chart = this.chart;
    const cols = this.columns ?? [];
    if (!chart || cols.length === 0) return `<div class="state">${escapeHtml(this.emptyText)}</div>`;

    const list = this.renderRows();
    if (list.length === 0) return `<div class="state">${escapeHtml(this.emptyText)}</div>`;

    const head = cols
      .map((c) => {
        const cls = c.align === "right" ? " num" : c.align === "center" ? " center" : "";
        const w = c.width ? ` style="width:${escapeAttr(c.width)}"` : "";
        return `<th class="${cls.trim()}"${w}>${escapeHtml(c.title)}</th>`;
      })
      .join("");

    const body = list.map((r) => this._rowHtml(r, cols)).join("");
    const style = this.maxHeight ? ` style="max-height:${escapeAttr(this.maxHeight)}"` : "";
    return html`<div class="wrap"${style}><table class="gt"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  private _rowHtml(r: GroupRenderRow, cols: ReportTableColumn[]): string {
    const rowCls = r.kind === "group" ? " class=\"group\"" : r.kind === "total" ? " class=\"total\"" : "";
    const tds = cols
      .map((c, ci) => this._cellHtml(r, c, ci))
      .join("");
    return `<tr data-rowkey="${escapeAttr(r.rowKey)}"${rowCls}>${tds}</tr>`;
  }

  private _cellHtml(r: GroupRenderRow, c: ReportTableColumn, ci: number): string {
    const v = r.values[c.key];
    const isFirstDim = !!c.isDim && ci === 0;
    const cls = [c.align === "right" ? "num" : c.align === "center" ? "center" : "", c.isDim ? "dim" : ""]
      .filter(Boolean)
      .join(" ");
    const clsAttr = cls ? ` class="${cls}"` : "";
    // 层级缩进：只有第一个维度列按 depth 递进；总计行不缩进（它不属于任何层级）
    const pad =
      isFirstDim && r.kind !== "total"
        ? ` style="padding-left:${INDENT_BASE + Math.max(0, r.depth - 1) * INDENT_STEP}px"`
        : "";

    // 折叠按钮放在「这一层自己的那一列」：depth=1 落在第 0 列，depth=2 落在第 1 列。
    // [为什么不是恒放第 0 列] 第 0 列永远是第一级维度的值，把二级组的 ▾ 画在
    // 「华东」旁边，点击折叠的却是「杭州」—— 用户无法从界面看出折的是哪个组。
    const ownCol = c.isDim && r.kind === "group" && ci === r.depth - 1;
    const toggle =
      ownCol && this._isTree() && r.hasChildren
        ? `<button type="button" class="tg" data-toggle="${escapeAttr(r.groupKey)}" aria-expanded="${
            this._collapsed.has(r.groupKey) ? "false" : "true"
          }" title="${escapeAttr(this._collapsed.has(r.groupKey) ? t("expand") : t("collapse"))}">${
            this._collapsed.has(r.groupKey) ? "▸" : "▾"
          }</button>`
        : "";

    // [为什么不可重算的小计显示「—」而不是空] 空与「该组没有数据」在视觉上无法区分；
    // 而 avg / countDistinct 的小计确实是「无法计算」而不是「没有」。见 report-group 的 subtotalOf。
    const text =
      v === null || v === undefined ? (c.numeric && r.kind !== "leaf" ? "—" : "") : c.render ? c.render(v, r.values, 0) : String(v);

    return `<td${clsAttr}${pad}>${toggle}${escapeHtml(text)}</td>`;
  }

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement | null;
    const btn = target?.closest?.("[data-toggle]") as HTMLElement | null;
    if (!btn) return;
    const key = btn.getAttribute("data-toggle");
    if (key === null) return;
    this.setCollapsed(key, !this._collapsed.has(key));
  };
}

// 与全库一致：直接 define（同模块经 ESM 只执行一次；「引了两份产物」是宿主侧问题，
// guard 也救不了 —— 两份产物是两个不同的类，instanceof 早就不同了）。
defineElement("z-report-group-table", ZReportGroupTable);

declare global {
  interface HTMLElementTagNameMap {
    "z-report-group-table": ZReportGroupTable;
  }
}
