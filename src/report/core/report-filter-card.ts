// 看板筛选器卡（M7）：独立于 charts 的画布元素，通过 targets 绑定到具体卡片。
//
// [为什么不是 charts[] 里的一种 kind] 已经试过那种形态，问题是「作用于哪些卡」无处表达 ——
// 只能退化成「同数据集自动全部生效」，而这恰好是作者最想覆盖的语义：同一数据集的
// 当期看板与历史快照，作者只想筛前者。独立结构之后，筛选器卡是一份纯配置
// （筛选控件 + 作用对象），不参与卡种切换、字段容量、字段井这些只对「产出数据的卡」有意义的东西。
//
// [为什么不复用 settings.filters] 页头筛选条按数据集生效，是「全页广播」；
// 筛选器卡按卡片绑定，是「定向」。两者语义不同，混成一个数组就无法回答
// 「这条筛选到底作用于谁」，删掉一张卡时也无从判断该不该连带清掉某条筛选。
// 它们仍共用同一个投影终点（ReportFilter → 后端 WHERE），只是来源不同。
//
// [同一字段两条筛选的处置] 页头与筛选器卡命中同一张卡的同一字段时，两条都会 AND 进查询，
// 结果恒空 —— 而两张控件各自都显示着自己的值，谁看都不像有错。所以按卡屏蔽：
// 该卡被筛选器卡覆盖的字段，页头那条对它不再生效（见 headFiltersForChart）。

import type { ReportChart, ReportFilter, ReportFilterCard, ReportWidgetFilter } from "./types.js";
import { cardKind } from "./report-card.js";

/** 读者在查看模式改过的值。按筛选器卡 id 存，不落库。
 *
 *  存 op 是为了识别「作者改过运算符」：把「等于」改成「范围」后，旧的单值在新语义下
 *  会被当成区间的一端，表现为「改完运算符，值莫名消失一半」。op 不一致就丢弃旧值。 */
export type FilterCardValues = Record<string, { op: ReportFilter["op"]; value: unknown }>;

/** 筛选值是否生效（空值不参与过滤；isNull/isNotNull 恒生效）。
 *
 *  [为什么必须单独判] 后端对空值也会拼出 `field = ''`，于是「没填」被当成「筛空字符串」，
 *  结果是一张空卡 —— 而用户以为自己只是没动那个框。 */
export function filterValueActive(op: ReportFilter["op"], value: unknown): boolean {
  if (op === "isNull" || op === "isNotNull") return true;
  if (op === "between") {
    // 区间：任一端点非空即生效（两端都不填 = 不筛选）
    if (!Array.isArray(value)) return false;
    return value.some((x) => x !== "" && x !== null && x !== undefined);
  }
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === "string" ? value.trim() !== "" : value !== undefined && value !== null && value !== "";
}

/** 筛选值展示文本（数组 → 逗号连接；isNull/isNotNull 无值） */
export function filterValueText(op: ReportFilter["op"], value: unknown): string {
  if (op === "isNull" || op === "isNotNull") return "";
  if (Array.isArray(value)) return value.join(", ");
  return value === undefined || value === null ? "" : String(value);
}

/** 筛选器卡是否配到能渲染控件（没选字段 = 还没配完，卡面给引导语） */
export function filterCardReady(fc: Pick<ReportFilterCard, "field">): boolean {
  return Boolean(fc.field);
}

/** 一张卡能否被筛选器卡作用。
 *
 *  [为什么排除 text/image] 它们不查数据，绑定上去不会有任何变化，但编辑器里能选中
 *  会让作者以为「已生效」。文案卡被筛选是概念错误，不是「暂不支持」。
 *  这里用卡种判据，而不是「看它有没有 rows/measures」—— 后者在配了一半的卡上会误判。 */
export function isTargetable(chart: Pick<ReportChart, "kind" | "chartType">): boolean {
  const kind = cardKind(chart);
  return kind === "chart" || kind === "table" || kind === "detail" || kind === "kpi";
}

/** 绑定是否成立：同数据集（后端字段白名单会拒绝跨数据集字段）且目标卡真的会查数据。 */
export function canBind(fc: Pick<ReportFilterCard, "datasetId" | "targets">, chart: ReportChart): boolean {
  return fc.datasetId === chart.datasetId && isTargetable(chart);
}

/** 该筛选器卡是否作用于这张卡。
 *
 *  targets 为空 = 该数据集下全部卡（含以后新增）。这与页头筛选的语义一致，
 *  也是「新建一张筛选器卡、填好字段」能立刻看到效果的唯一可能 ——
 *  若空表示「谁都不作用」，作者会以为功能坏了。 */
export function appliesTo(fc: ReportFilterCard, chart: ReportChart): boolean {
  if (!filterCardReady(fc)) return false;
  if (!canBind(fc, chart)) return false;
  if (fc.targets.length === 0) return true;
  return fc.targets.includes(chart.id);
}

/** 读者当前应看到的值：override 只在运算符一致时生效，否则回落到作者默认值。 */
export function effectiveValue(fc: ReportFilterCard, values?: FilterCardValues | null): unknown {
  const o = values?.[fc.id];
  if (o && o.op === fc.op) return o.value;
  return fc.value;
}

/** 筛选器卡投影成查询条件（值是生效值）。未配置 / 值未填时返回 null —— 不参与查询。 */
export function toFilter(fc: ReportFilterCard, values?: FilterCardValues | null): ReportFilter | null {
  if (!filterCardReady(fc)) return null;
  const value = effectiveValue(fc, values);
  if (!filterValueActive(fc.op, value)) return null;
  return { field: fc.field, op: fc.op, value };
}

/** 作用于这张卡的全部筛选条件（只含值已填的）。 */
export function filtersForChart(
  chart: ReportChart,
  cards: ReportFilterCard[],
  values?: FilterCardValues | null,
): ReportFilter[] {
  const out: ReportFilter[] = [];
  for (const fc of cards) {
    if (!appliesTo(fc, chart)) continue;
    const f = toFilter(fc, values);
    if (f) out.push(f);
  }
  return out;
}

/** 这张卡被筛选器卡覆盖的字段集合 —— 页头同字段的筛选据此对该卡屏蔽。
 *
 *  [为什么按卡算而不是全局算] 页头一条「门店=甲店」会喂给该数据集下所有卡。
 *  若筛选器卡只绑了卡 1（门店=乙店），全局屏蔽会让卡 2 彻底失去门店筛选；
 *  而不屏蔽则是卡 1 同时吃甲店与乙店，恒空。按卡算才有正确答案。 */
export function coveredFieldsForChart(chart: ReportChart, cards: ReportFilterCard[]): Set<string> {
  const set = new Set<string>();
  for (const fc of cards) {
    if (appliesTo(fc, chart)) set.add(fc.field);
  }
  return set;
}

/** 页头筛选对某张卡应有的项：剔除被筛选器卡覆盖的字段，其余保序。
 *
 *  「收纳」不是删除：settings.filters 里那条配置还在，把筛选器卡删掉它就回到页头。 */
export function headFiltersForChart(all: ReportWidgetFilter[], chart: ReportChart, cards: ReportFilterCard[]): ReportWidgetFilter[] {
  const covered = coveredFieldsForChart(chart, cards);
  if (covered.size === 0) return all;
  // 数据集也要匹配：不同数据集同名字段互不相干
  return all.filter((w) => !(w.datasetId === chart.datasetId && covered.has(w.field)));
}

/** 绑定状态（编辑器展示 + 校验用） */
export interface TargetState {
  /** all = 作用于该数据集全部卡（targets 为空）；some = 只作用于列出的卡 */
  mode: "all" | "some";
  /** 实际能命中的卡片数（按 canBind 过滤后） */
  alive: number;
  /** targets 里指向已删除 / 已改成文本卡的卡片 id —— 必须提示，否则显示「绑定 3 张」实际只影响 2 张 */
  dangling: string[];
  /** targets 里跨数据集的卡片 id（数据集被改过时会留下，同样要提示） */
  crossDataset: string[];
}

/** 分析一张筛选器卡的作用对象。 */
export function targetState(fc: ReportFilterCard, charts: ReportChart[]): TargetState {
  if (fc.targets.length === 0) {
    return { mode: "all", alive: charts.filter((c) => canBind(fc, c)).length, dangling: [], crossDataset: [] };
  }
  const byId = new Map(charts.map((c) => [c.id, c]));
  const dangling: string[] = [];
  const crossDataset: string[] = [];
  let alive = 0;
  for (const id of fc.targets) {
    const c = byId.get(id);
    if (!c) {
      dangling.push(id);
      continue;
    }
    if (c.datasetId !== fc.datasetId) {
      crossDataset.push(id);
      continue;
    }
    if (!isTargetable(c)) {
      // 数据集对但已改成文本/图片卡：等同于失效，按悬空处理（作者的原意已经不可达）
      dangling.push(id);
      continue;
    }
    alive++;
  }
  return { mode: "some", alive, dangling, crossDataset };
}

/** 可选绑定目标：同数据集且会查数据的卡（编辑器多选列表）。 */
export function bindableCharts(fc: Pick<ReportFilterCard, "datasetId">, charts: ReportChart[]): ReportChart[] {
  return charts.filter((c) => c.datasetId === fc.datasetId && isTargetable(c));
}

/** 切换绑定多选：返回新的 targets。
 *
 *  [为什么取消全选要落成 []（= 全部）而不是「一个都不选」]
 *  后者在当前模型里等于「不存在」，无法与「我还没配」区分；而作者取消勾选的意图
 *  通常是「恢复默认」。所以全不选 = 回到默认的全部生效，文案上加提示。 */
export function toggleTarget(fc: ReportFilterCard, chartId: string, checked: boolean): string[] {
  const set = new Set(fc.targets);
  if (checked) set.add(chartId);
  else set.delete(chartId);
  return [...set];
}

/** 同数据集同字段被多张筛选器卡作用到同一张卡 → 返回冲突的卡片 id（后来者）。
 *
 *  [为什么需要检测] 两张卡筛同一字段时，两个值都 AND 进查询：一张改成甲店、
 *  另一张还是乙店，界面两张卡都显示正常，结果永远是空 —— 无报错、无空态，
 *  只会被当成「数据没同步」。 */
export function conflictingCards(cards: ReportFilterCard[], charts: ReportChart[]): string[] {
  const dup = new Set<string>();
  for (const ch of charts) {
    if (!isTargetable(ch)) continue;
    const seen = new Set<string>();
    for (const fc of cards) {
      if (!appliesTo(fc, ch)) continue;
      if (seen.has(fc.field)) dup.add(fc.id);
      else seen.add(fc.field);
    }
  }
  return [...dup];
}

/** 卡面标题：作者填的 label 优先，其次字段别名，最后字段名。 */
export function filterCardTitle(fc: Pick<ReportFilterCard, "label" | "field">, fieldLabel?: string): string {
  return fc.label?.trim() || fieldLabel || fc.field;
}

/** 摘要文案：说清「作用在几张卡上」，以及有没有失效绑定。
 *
 *  [为什么卡面必须显示这个] 筛选器卡最典型的失败是「值填了，但没作用到你以为的卡」。
 *  把作用对象写在卡上，读者/作者都不用点开配置就能核对。 */
export function targetSummary(state: TargetState): string {
  const base = state.mode === "all" ? `作用于全部 ${state.alive} 张卡` : `作用于 ${state.alive} 张卡`;
  const parts = [base];
  if (state.dangling.length > 0) parts.push(`${state.dangling.length} 个绑定已失效`);
  if (state.crossDataset.length > 0) parts.push(`${state.crossDataset.length} 个跨数据集`);
  return parts.join(" · ");
}
