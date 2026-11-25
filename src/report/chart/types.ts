/**
 * 图表类型 —— `z-chart` 的 `type` 合法取值。
 *
 * 分两类，几何路径完全不同：
 *  - **笛卡尔族**（bar / line / area / scatter / boxplot）：走 `computeDomains` + `computeFrame`，
 *    有值域、有刻度、有网格线。
 *  - **整图族**（pie / donut / sparkline / radar / waterfall / funnel / heatmap / gauge /
 *    treemap / sankey / map）：各自一套布局，不吃笛卡尔值域（waterfall / boxplot 例外，
 *    它们借笛卡尔框但值域来源特殊）。
 *
 * [WHY 不照抄 ECharts 的 22 个 type] ECharts 的 `pictorialBar` / `lines` / `themeRiver`
 * 这类是「装饰手法」而非「图的语义」，进了枚举就会让每个 `switch` 多一堆永远走不到的分支。
 * 这里只收**形状本身不同**的类型；同一形状的方向/堆积/叠加差异用属性表达（见 `ChartDirection`
 * 与 `StackMode`），不新增 type —— 理由见 `report-chart-style.ts` 文件头。
 */
export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "sparkline"
  | "radar"
  | "waterfall"
  | "map"
  | "funnel"
  | "heatmap"
  | "scatter"
  | "gauge"
  | "treemap"
  | "sankey"
  | "boxplot";

/**
 * 柱图方向。
 *
 * [WHY 是属性而不是 `type=bar-horizontal`] 方向 × 堆积 × 叠加 是三个**正交**维度，
 * 用一维枚举表达三维信息会让每个 `type === "bar"` 的判断再乘一遍分支。
 * 而且横向与堆积**可以共存**（横向堆积条是排行榜的常见形态），不能像 stack/overlay
 * 那样设互斥。
 */
export type ChartDirection = "vertical" | "horizontal";

export type RendererName = "svg" | "canvas";
/** 堆积方式（本地补丁 2026-10-22）：none=并排 / stacked=堆到合计 / percent=按分类归一到 100% */
export type StackMode = "none" | "stacked" | "percent";
export type AxisPosition = "bottom" | "top" | "left" | "right";
export type AxisKind = "category" | "value" | "time";
/**
 * 系列画法。
 *
 * 整图族（funnel / gauge / treemap / sankey / heatmap / boxplot）**刻意不在这里**：
 * 它们的几何按 `ChartType` 整图分派，系列级没有「换成折线」这种自由度，
 * 加进来只会得到一堆恒等的分支。这些类型的系列 kind 统一落在 `bar`（无害，见
 * `normalize.ts` 的 `resolveKind`），因为它们根本不会进笛卡尔分支。
 */
export type SeriesKind = "bar" | "line" | "area" | "pie" | "sparkline" | "radar" | "waterfall" | "scatter";

export interface DataPoint {
  label?: string;
  x?: number;
  value: number;
  /**
   * 缺数点（`markgap`）：这根折线在此处**断开**，不是 0。
   *
   * [WHY 用 NaN + 标记而不是丢点] 分类轴的对齐靠「每个分类一个点」：把缺数点从 data
   * 里删掉，后面所有标签都会左移一位，图和轴就错位了。保留点位、值置 NaN，
   * 值域计算（yDomain 的比较循环）天然忽略 NaN，路径绘制按 gap 断段。
   */
  gap?: boolean;
  /**
   * 气泡第三维（散点专用）：这一点的**大小**取自哪一列。
   *
   * [WHY 单独一个字段而不是拿 value 兼用] 这里早先的注释写着「硬把 value 同时当 y
   * 和半径，会得到『y 越大点越大』这种看着像有含义、其实什么也没表达的图」。
   * 所以第三维必须是数据源里**另一列**，由调用方显式给。
   *
   * 缺省（无 r）时半径固定 4px，退化成普通散点图 —— 存量散点一字不变。
   */
  r?: number;
}

export interface SeriesModel {
  name: string;
  kind: SeriesKind;
  data: DataPoint[];
  color: string;
  yAxis: "left" | "right";
  format: string;
  visible: boolean;
  index: number;
  /**
   * 气泡第三维的标题（如「订单量」）。只在 `data[].r` 存在时用：
   * tooltip 要写明「圆的大小代表什么」，否则读者只能猜。
   */
  sizeTitle?: string;
}

export interface AxisConfig {
  position: AxisPosition;
  type: AxisKind | "auto";
  title: string;
  format: string;
  min?: number;
  max?: number;
  tickCount: number;
  grid?: boolean;
  /**
   * 刻度分布（`scale=log`）。只对**左值轴**生效，见 Domains.logLeft 的注释。
   *
   * [WHY 不是 `AxisKind` 的一个值] `type` 回答「这是分类还是数值」，`scale` 回答
   * 「数值怎么分布」。柱状图的对数轴仍是 `type=value` —— 把 log 塞进 type 会让
   * `xKind === "value"` 那一片判断全都要多认一个值。
   */
  scale?: "linear" | "log";
}

export interface MapValue {
  id: string;
  value: number;
}

export interface ChartOptions {
  type: ChartType;
  stack: StackMode;
  renderer: RendererName;
  width: number;
  height: number;
  title: string;
  showLegend: boolean;
  showTooltip: boolean;
  animation: boolean;
  showGrid: boolean;
  locale: string;
  colors: string[] | null;
  projection: "auto" | "equirectangular" | "mercator" | "none";
  mapIdKey: string;
  mapNameKey: string;
  geojson: unknown | null;
  values: MapValue[] | null;
}

export interface ResolvedTheme {
  text: string;
  textSecondary: string;
  grid: string;
  bg: string;
  dark: boolean;
  fontFamily: string;
  labelFontSize: string;
  titleFontSize: string;
}

export interface Tick {
  value: number;
  label: string;
  x: number;
  y: number;
}

export interface AxisModel {
  position: AxisPosition;
  kind: AxisKind;
  title: string;
  ticks: Tick[];
  color: string;
  fontFamily: string;
  fontSize: string;
}

export interface Frame {
  width: number;
  height: number;
  plot: { x: number; y: number; width: number; height: number };
  margins: { top: number; right: number; bottom: number; left: number };
}

export interface Mark {
  kind: "rect" | "path" | "circle" | "text";
  seriesIndex: number;
  dataIndex: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  d?: string;
  /** 虚线描边（markline 参考线用）；只对有 strokeWidth 的 path 生效。 */
  dash?: boolean;
  r?: number;
  cx?: number;
  cy?: number;
  points?: Array<[number, number]>;
  color: string;
  opacity?: number;
  strokeWidth?: number;
  fillOpacity?: number;
  label?: string;
  textAnchor?: "start" | "middle" | "end";
  fontSize?: number;
  fontWeight?: number;
  visible: boolean;
}

export interface GridLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export interface LegendItem {
  index: number;
  name: string;
  color: string;
  visible: boolean;
}

export interface TooltipValue {
  name: string;
  value: number;
  formatted: string;
  color: string;
}

export interface TooltipTarget {
  seriesIndex: number;
  dataIndex: number;
  label: string;
  values: TooltipValue[];
  x: number;
  y: number;
  w: number;
  h: number;
  /**
   * 命中区外扩量（px）。缺省 4。
   *
   * [WHY 需要逐点可覆盖] 4px 外扩是为了让 2px 的小圆点也好点中。但在密集柱图里
   * 它是**灾难**：534 根柱在 280px 高里槽距只有 0.52px，而每根被外扩到 8.39px
   * ⇒ 相邻 16 根的命中区完全重叠，指针落在哪儿都只会命中最后绘制的那几根。
   * 表现是「tooltip 显示的店名和鼠标下的柱子无关」，且不报错。
   *
   * 所以几何层按**自己的槽距**算出这个值传进来；不传才用缺省。
   */
  pad?: number;
}

export interface GeometryModel {
  marks: Mark[];
  gridLines: GridLine[];
  axes: AxisModel[];
  legend: LegendItem[];
  tooltipTargets: TooltipTarget[];
  noData: boolean;
}

export interface MapRegion {
  id: string;
  name: string;
  rings: number[][][];
  value?: number;
}
