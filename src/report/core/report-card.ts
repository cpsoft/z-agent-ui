// 卡片种类（kind）契约层：把「编辑器/渲染走哪一套」从 chartType 里拆出来。
//
// [WHY] 旧实现把「是不是明细表 / 是不是分组表」直接写成 `chart.chartType === "xxx"`，
// 在 ChartEditorPage 内散落 20+ 处、且 `isGrouped` 被重复定义两次。
// 后果是每加一种图表都要在 20 处里找出「哪些该跟着改」，漏一处就是静默错渲染。
// 现在：种类判断只问 cardKind()，画什么图才问 chartType。

import type { CardKind, ReportChart, ReportChartType } from "./types.js";

/** chartType → kind 的派生表。新增 chartType 必须在此显式登记，否则 tsc 报错（Record 穷举）。 */
export const KIND_OF: Record<ReportChartType, CardKind> = {
  bar: "chart",
  line: "chart",
  pie: "chart",
  radar: "chart",
  waterfall: "chart",
  table: "table",
  "group-table": "table",
  "tree-table": "table",
  "detail-table": "detail",
  kpi: "kpi",
  text: "text",
  image: "image",
};

/** 卡片的种类：显式 kind 优先，否则从 chartType 派生。
 *  显式值优先是为了让「切形态不切种类」成立（如 chart → kpi 之后再切回 bar，种类跟着变回 chart 由编辑器负责写）。 */
export function cardKind(chart: Pick<ReportChart, "chartType" | "kind">): CardKind {
  return chart.kind ?? KIND_OF[chart.chartType] ?? "table";
}

/** 是否是「分组表 / 树状表格」—— 同属 table 种，但多一层层级 + 小计/总计语义。
 *
 *  [WHY 单独一个判据] 这个条件原先散在列构建、导出、渲染三处（`chartType === "group-table"
 *  || chartType === "tree-table"`）。漏掉一处不会报错：分组表被当普通表格画，
 *  小计行整段消失，而卡配置看起来完全正常。 */
export function isGroupedTable(chart: Pick<ReportChart, "chartType" | "kind">): boolean {
  if (cardKind(chart) !== "table") return false;
  return chart.chartType === "group-table" || chart.chartType === "tree-table";
}

/** ZChartReact 真正认的图表类型（vendor/z-agent-ui/src/components/chart/types.ts）。
 *  多一个都渲染不出来，且**不会报错**——props 是 Record<string, unknown>，编译器管不了。 */
export const CHART_RENDERABLE = ["bar", "line", "area", "pie", "donut", "sparkline", "radar", "waterfall"] as const;

export type ChartRenderType = (typeof CHART_RENDERABLE)[number];

/** 把 chart.chartType 收敛成 vendor 能渲染的类型。
 *  三处 `ZChartReact type={chart.chartType}` 必须改走本函数：
 *  直接把 "table" / "kpi" 之类传进去会得到一张空白卡，控制台无任何报错，属最难查的一类。 */
export function chartRenderType(chart: Pick<ReportChart, "chartType">): ChartRenderType {
  const t = chart.chartType;
  if ((CHART_RENDERABLE as readonly string[]).includes(t)) return t as ChartRenderType;
  // 走到这里说明调用方选错了渲染分支（本该走表格/指标卡），是编码错误而非数据问题。
  // 显式报警而不是静默空白：宁可控制台有红字，也不要一张看不出原因的空白卡。
  if (typeof console !== "undefined") {
    console.error(`[report-card] chartType"${t}"不是可渲染的图表类型，已回退 bar`);
  }
  return "bar";
}

/** 编辑器的槽位能力：左池放哪几个投放区、右栏显示哪几节。
 *  与渲染分支同源——渲染不用的槽位，编辑器也不该出现（否则用户拖进去的字段永远不生效）。 */
export interface CardSlots {
  /** 维度槽（行分组） */
  dim: boolean;
  /** 指标槽（聚合度量） */
  measure: boolean;
  /** 排序槽 */
  sort: boolean;
  /** 卡内筛选槽 */
  filter: boolean;
  /** 行数上限 */
  limit: boolean;
}

export function cardSlots(kind: CardKind): CardSlots {
  switch (kind) {
    case "chart":
      return { dim: true, measure: true, sort: true, filter: true, limit: true };
    case "table":
      return { dim: true, measure: true, sort: true, filter: true, limit: false };
    case "detail":
      // 明细表逐行不聚合：有维度（= 展示列）无指标
      return { dim: true, measure: false, sort: true, filter: true, limit: true };
    case "kpi":
      // 单值指标：无维度无排序，指标恰好 1 个（第 2 个起进 stashedMeasures）
      return { dim: false, measure: true, sort: false, filter: true, limit: false };
    case "text":
    case "image":
      // 不查数据：整个字段面板与字段井都不该出现。
      // [为什么全 false 而不是继续显示但禁用] 显示一堆拖不进东西的槽位，
      // 用户会以为「这个卡还没配完」，而实际上它压根不需要配字段。
      return { dim: false, measure: false, sort: false, filter: false, limit: false };
  }
}

/** 卡壳上可出现的动作。
 *
 *  `export` / `expand` / `refresh` 元素自己就能完成（不依赖宿主）。
 *  `detail` / `edit` 必须由宿主实现 —— 明细弹层要知道宿主的接口与权限，编辑器是宿主的
 *  路由。**这两项默认关闭**：不给按钮，就不会出现「点了没反应」的死按钮。
 *
 *  [为什么这个类型在 core 而不是元素里] 宿主需要在**自己那一侧**声明「我这张卡放哪几个
 *  按钮」并把数组递给元素。如果类型只从 `report/card` 出，宿主就得为了一行类型导入
 *  把整个元素模块（含 DOM 注册）拖进类型检查的依赖图。 */
export type CardAction = "export" | "expand" | "refresh" | "detail" | "edit";

/** 该卡种是否需要字段面板（左池）。false 时编辑器把左池折叠成窄条。
 *
 *  [为什么要折叠而不是隐藏] 文本/图片卡没有字段可拖，但左池隐藏后，
 *  用户从文本卡切回图表卡（或反向）时布局会整块跳动。折叠保留一个「字段」竖条，
 *  宽度归零的是内容而不是 DOM，展开状态由编辑器记住。 */
export function needsFieldPanel(kind: CardKind): boolean {
  const s = cardSlots(kind);
  return s.dim || s.measure || s.sort || s.filter;
}
