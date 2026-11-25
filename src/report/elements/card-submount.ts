// [WHY] 2026-10-25 系统审计：从 report-card.ts（853 行）按职责拆出
// 职责：图表/表格/明细/分组表的命令式挂载、列推导与子组件懒加载。

import { cardKind, chartRenderType, isGroupedTable } from "../core/report-card.js";
import { measureKeyOf } from "../core/report-kpi.js";
import { formatXLabels } from "../core/report-axis.js";
import { buildTableColumns, withRank, type ReportTableColumn } from "../core/report-table-columns.js";
import { groupSpecOfChart } from "../core/report-group.js";
import { orderByOfSort } from "../core/report-query.js";
import { pointSelection, type ChartSelection } from "../core/exploration.js";
import type { ChartQueryData } from "../core/data-source.js";
import type { AggregateResult, Column, ReportChart, ReportOrderBy } from "../core/types.js";
import { allDefined, numOf } from "./card-load.js";

/** 仅在画图表时才把图表组件拉进来。
 *
 *  [WHY 先查注册表] 宿主应用通常已经引过 z-agent-ui（`z-agent-ui/components/chart` 等），
 *  而那些组件是**无条件** `customElements.define`。本元素再从源码 dynamic import 一份
 *  就会二次 define，直接抛 `z-chart already defined`；抛点在一次异步加载里，
 *  症状是「卡片空白 + 控制台一条陌生错误」，很难归因到「引了两份 z-agent-ui」。
 *  已注册就复用宿主那份 —— 顺带避免同一页面存在两套图表实现。 */
export async function ensureChartElement(): Promise<void> {
  if (allDefined(["z-chart", "z-chart-series", "z-chart-axis"])) return;
  await import("../chart/index.js");
}

/** 仅在画表格/明细时才把表格组件拉进来。同上：宿主已有就复用。 */
export async function ensureReportTableElement(): Promise<void> {
  if (allDefined(["z-report-table"])) return;
  await import("../table/index.js");
}

/**
 * @deprecated 分组表已合入 `<z-report-table>`（`group` 属性 + `tree`），本函数仅为
 * 兼容旧宿主调用保留，内部转成加载报表表格 —— 两条链路从此只有一套实现。
 */
export async function ensureGroupTableElement(): Promise<void> {
  await ensureReportTableElement();
}

/** 挂载一帧所需的全部输入（元素侧从自身状态快照出来）。
 *  回调由元素注入：交互排序要写回元素状态，图元点击要由元素 emit。 */
export interface SubMountCtx {
  chart: ReportChart;
  data: ChartQueryData | null;
  cols: Column[];
  emptyText: string;
  sort: ReportOrderBy[];
  /** 表头点排序 → 元素记录交互排序并重新聚合 */
  onSort: (next: ReportOrderBy[]) => void;
  /** 图元点击翻译出的联动选择 → 元素发 z-point-select */
  emit: (type: string, detail: ChartSelection) => void;
}

/** 表格列 = core 的 buildTableColumns（React 版与元素版的唯一口径）。
 *
 *  [为什么不能再按 result.columns 拼] 元素版原先按**后端回传的列**拼列，而分组行、
 *  联动、排序都按**图表配置里的原串**取值（`datefmt:d:day` → 后端可能叫 `d`）。
 *  平时看不出差别，一旦画分组表，小计行的维度格就对不上 key 而变成空白 —— 无报错。
 *  顺带补上「# 排名」列，之前只有 React 版有。 */
export function tableColumns(
  chart: ReportChart,
  cols: Column[],
  sort: ReportOrderBy[],
  isDetail: boolean,
): ReportTableColumn[] {
  return buildTableColumns(chart, cols, chart.colFormats ?? {}, {
    // 排名列跟随「当前生效的排序」（点列头排序后也要有 #）
    rank: !isDetail && sort.length > 0,
    // 分组表不提供列头排序：层级 + 小计语义下「按金额排」没有意义，且需要重排整棵树
    sortable: !isGroupedTable(chart),
  });
}

export async function mountSub(ctx: SubMountCtx, root: ShadowRoot | null): Promise<void> {
  const chart = ctx.chart;
  const kind = cardKind(chart);
  if (kind !== "chart" && kind !== "table" && kind !== "detail") return;

  const mount = root?.querySelector<HTMLElement>("[data-mount]");
  if (!mount) return;
  if (!ctx.data) return;

  const grouped = isGroupedTable(chart);
  if (kind === "chart") {
    await ensureChartElement();
  } else if (grouped) {
    // 分组表也是 `<z-report-table>`：能力已合入，不必再引第二个元素
    await ensureReportTableElement();
  } else {
    await ensureReportTableElement();
  }
  // await 期间可能已经重渲染换了节点，旧节点不能再写（否则内容挂到游离树上）
  if (!mount.isConnected || root?.querySelector("[data-mount]") !== mount) return;

  if (kind === "chart") buildChart(ctx, mount);
  else if (grouped) buildGroupTable(ctx, mount);
  else buildTable(ctx, mount, kind === "detail");
}

/** 分组表 / 树状表格：层级 + 小计/总计。
 *
 *  [WHY 曾经是独立元素，现在不是] 原先 `<z-report-group-table>` 自己画 table：它只有
 *  分组/小计/折叠，没有列宽、列格式、固定列、分页 —— 而 `<z-report-table>` 反过来。
 *  两个都叫「报表表格」，能力却是互补的，宿主一旦想要「分组 + 列宽」就只能自建
 *  （zEtl 的 GroupTable 就是这么来的，代价是屏幕/导出口径各算一份）。
 *  现在 `z-report-table` 用 `group` / `tree` 两个属性吃下分组能力，小计算法仍是
 *  `report/core/report-group` 那一份 —— 实现只有一套，入口有 page 卡与报表卡两个。
 *
 *  [为什么仍然不拼在本元素的 template 里] 折叠是交互态，而本元素的 render() 是
 *  `shadow.innerHTML = …` 整体重建 —— 折一次会把表格子树全拆了重建（焦点掉回 body，
 *  滚动位置归零）。独立的 `z-report-table` 自己持有折叠状态，只重建自己。 */
export function buildGroupTable(ctx: SubMountCtx, mount: HTMLElement): void {
  const chart = ctx.chart;
  const el = document.createElement("z-report-table") as HTMLElement & Record<string, unknown>;
  el.columns = tableColumns(chart, ctx.cols, ctx.sort, false);
  el.data = ctx.data?.result?.rows ?? [];
  // 小计/总计的开关由 chart 决定（`groupSpecOfChart` 会带过来）—— 元素侧不再读 chart，
  // 只按 spec 渲染。同一份配置只有一个读者。
  el.group = groupSpecOfChart(chart);
  el.tree = chart.chartType === "tree-table";
  el.emptyText = ctx.emptyText;
  el.size = "sm";
  el.setAttribute("variant", "lines");
  // 分组表不提供列选择/列配置：层级 + 小计下「显示哪列」不是用户要调的东西
  el.showColumnSelector = false;
  mount.appendChild(el);
}

export function buildChart(ctx: SubMountCtx, mount: HTMLElement): void {
  const chart = ctx.chart;
  const result = ctx.data?.result;
  if (!result) return;
  const el = document.createElement("z-chart") as HTMLElement & { requestUpdate?: () => void };
  el.setAttribute("type", chartRenderType(chart));
  if (chart.stack && chart.stack !== "none") el.setAttribute("stack", chart.stack);
  const overlay = chart.overlay && chart.overlay !== "none" ? chart.overlay : "";

  const dimKey = dimensionKey(chart, result);
  const labels = result.rows.map((r) => String(r[dimKey] ?? ""));
  const shown = formatXLabels(labels, chart.xLabelFormat).labels;

  // 先在游离节点上把子树建全，再整体连入 —— 图表在 connectedCallback 里就要读
  // z-chart-series，晚挂的子元素不会被看到（表现为一张空白图，无任何报错）
  const catAxis = document.createElement("z-chart-axis");
  catAxis.setAttribute("position", "bottom");
  catAxis.setAttribute("type", "category");
  el.appendChild(catAxis);

  const valAxis = document.createElement("z-chart-axis");
  valAxis.setAttribute("position", "left");
  valAxis.setAttribute("type", "value");
  el.appendChild(valAxis);

  // 第 2 个指标起按 overlay 改折线/面积（柱线组合图）；饼图只有一个系列
  const type = chartRenderType(chart);
  const multi = chart.measures.length > 1;
  chart.measures.forEach((m, i) => {
    const key = measureKeyOf(m);
    const s = document.createElement("z-chart-series");
    s.setAttribute("name", m.alias || m.field);
    if (multi && overlay && i > 0 && type === "bar") s.setAttribute("type", overlay);
    (s as HTMLElement & { data?: unknown[] }).data = result.rows.map((r, idx) => ({
      label: shown[idx],
      value: numOf(r[key]),
    }));
    el.appendChild(s);
  });

  mount.appendChild(el);
  // 图元点击联动：z-chart 已经把「点了哪个系列的第几行」算好了（z-marker-click 带
  // seriesIndex/dataIndex），本元素只负责把那行翻译成维度筛选。翻译在 core 的
  // pointSelection 里 —— 日期粒度折半开区间这类换算差一天就是错数据，不能有两份。
  el.addEventListener("z-marker-click", (ev) => markerClick(ctx, ev as CustomEvent));
  el.requestUpdate?.();
}

/** 把「点了某个数据点」翻译成 `z-point-select`（宿主据此做联动/下钻）。
 *  产不出选择时不发事件 —— 发一个空选择比不发更糟：宿主会用它把下游图表清空。 */
export function markerClick(ctx: SubMountCtx, ev: CustomEvent): void {
  const detail = ev.detail as { dataIndex?: number } | undefined;
  const idx = detail?.dataIndex;
  if (typeof idx !== "number") return;
  const row = ctx.data?.result?.rows?.[idx];
  if (!row) return;
  const sel: ChartSelection | null = pointSelection(ctx.chart, row, ctx.cols);
  if (!sel) return;
  ctx.emit("z-point-select", sel);
}

/** 维度列 key：优先用后端回传的列名（datefmt 维度会被后端换成聚合别名），
 *  拿不到再退回配置里的第一个维度。两者不一致的症状是「柱子全 0」。 */
export function dimensionKey(chart: ReportChart, result: AggregateResult): string {
  const dim = result.columns?.find((c) => c.kind === "dimension");
  return dim?.name ?? chart.rows[0] ?? "";
}

export function buildTable(ctx: SubMountCtx, mount: HTMLElement, isDetail: boolean): void {
  const chart = ctx.chart;
  const raw = isDetail ? (ctx.data?.detail?.rows ?? []) : (ctx.data?.result?.rows ?? []);
  const el = document.createElement("z-report-table") as HTMLElement & Record<string, unknown>;

  const cols = tableColumns(chart, ctx.cols, ctx.sort, isDetail);
  el.columns = cols;
  // 表里有「#」列就必须给行号：data 里没有 _rank 时那一列整列空白，看着像渲染坏了
  el.data = isDetail || ctx.sort.length > 0 ? withRank(raw) : raw;
  if (chart.colFormats) el.colFormats = chart.colFormats;
  el.size = "sm";
  el.emptyText = ctx.emptyText;
  // 明细卡动辄上千行：给个高度上限，否则整页被一张卡撑开
  if (isDetail) el.maxHeight = "420px";
  // [为什么是 server 而不是 client] 表格拿到的是**本页聚合结果**（limit 已生效）。
  // 让它在局部排序等于「只排前 20 行」，用户点第二次列头才发现的错序最难归因。
  // server 模式下它只 emit z-sort，本元素据此重新聚合，排序覆盖全量数据。
  el.sortMode = "server";
  el.sortState = ctx.sort.map((o) => ({ key: o.field, dir: o.dir }));
  el.setAttribute("variant", "lines");
  // 回写 sortState 是给表头箭头用的：不传的话点完列头箭头不亮，看着像没排上
  el.addEventListener("z-sort", (ev) => {
    const next = (ev as CustomEvent).detail?.sortState as
      | { key: string; dir: "asc" | "desc" }[]
      | undefined;
    if (!next) return;
    ctx.onSort(orderByOfSort(next));
  });
  mount.appendChild(el);
}
