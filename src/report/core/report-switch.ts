// 卡种切换的迁移层（M5）：把「切换图表类型」从「改一个 chartType」变成「按目标卡种的槽位容量重排」。
//
// [为什么需要这一层] 旧实现只写 `patch({ chartType: t })`，配置原样保留。于是：
//   2 指标折线 → 饼图：饼图单系列，第二个指标还在 measures 里但永远画不出来（数据在、看不见）
//   3 维度表格 → 柱图：图表只有一根分类轴，rows[1..] 被渲染忽略（同上）
//   任意聚合 → 指标卡：kpi 无维度槽，rows 留着但查询强制 dimensions: []
//   指标卡 → 柱图：rows 为空，图表没有分类轴 → 一张空白卡
// 前两种是最坏的一类：**数据没丢，只是看不见**。用户切回折线图发现指标还在，
// 会以为是渲染 bug 而不是切换行为。所以正确修法不是「删掉多余配置」，而是收进暂存槽
// （stashedMeasures / rowsStash / orderByStash），并在编辑器里显式说明「N 项暂存」。
//
// [为什么不写成 from→to 的 16 项表] 计划的初版是一张 `${from}->${to}` 迁移表，9 条显式规则
// + 未覆盖走告警分支。问题在于 16 个组合里绝大多数是同一个动作：**把装不下的收起来**。
// 写成表意味着「新增第 5 种卡种」要补 8 条规则，而漏一条只会走告警分支静默降级——正是这次要消灭的形态。
// 这里改成「目标卡种的槽位容量」一张 4 项的表：容量是卡种的属性，不是卡种对的属性。
// 饼图的单指标约束不是「容量」而是「形态约束」，单独作为 override 覆写，语义不混。

import type { CardKind, ReportChart, ReportChartType, ReportMeasure, ReportOrderBy } from "./types.js";
import { KIND_OF, cardKind } from "./report-card.js";
import { measureKeyOf } from "./report-kpi.js";
import { toPhysicalDim } from "./report-date.js";

/** 每种卡种能「看得见」多少个槽位。超出部分进暂存，**不删除**。
 *  Infinity = 该槽位无上限（表格装多少维度就分几层）。 */
const CAP_OF: Record<CardKind, { dims: number; measures: number }> = {
  // 图表只有一根分类轴（rows[0]），但可叠多个 series
  chart: { dims: 1, measures: Number.POSITIVE_INFINITY },
  // 表格既能多层分组也能多指标
  table: { dims: Number.POSITIVE_INFINITY, measures: Number.POSITIVE_INFINITY },
  // 明细表逐行：rows 即展示列，无指标槽
  detail: { dims: Number.POSITIVE_INFINITY, measures: 0 },
  // 指标卡：单值、无分类轴、恰好一个指标
  kpi: { dims: 0, measures: 1 },
  // 文本 / 图片卡不查数据：所有字段都进暂存，切回时原样并回。
  // [为什么是 0 而不是「保留但忽略」] 保留会进入查询路径 —— 文本卡若带着 rows/measures，
  // chartQueryable 会判定为可查询，于是每次打开报表都为一个不显示数据的卡片发一次聚合请求。
  text: { dims: 0, measures: 0 },
  image: { dims: 0, measures: 0 },
};

/** 形态约束（不是容量）：饼图只有一个系列，第二个指标放不进去。
 *  单独覆写而不是塞进 CAP_OF，因为 pie 只是 chart 的一个 chartType，
 *  把「饼图」写进卡种容量表会让 chart 这一行自相矛盾。 */
const SHAPE_CAP: Partial<Record<ReportChartType, { dims: number; measures: number }>> = {
  pie: { dims: 1, measures: 1 },
  // 瀑布图逐行一个增量，只消费第一个指标；第二个 metric 起静默不画
  //（与雷达同属 chart 种、形态约束单列 —— 理由同饼图）
  waterfall: { dims: 1, measures: 1 },
};

function capOf(to: CardKind, t: ReportChartType) {
  return SHAPE_CAP[t] ?? CAP_OF[to];
}

/** 按容量把池子切成「留」与「暂存」两段，保留靠前的（切换时老配置优先）。
 *  与 pushCap 的区别只在保留哪一端，见 pushCap 处的说明。 */
function take<T>(pool: T[], n: number): [T[], T[]] {
  if (!Number.isFinite(n)) return [pool, []];
  return [pool.slice(0, n), pool.slice(n)];
}

/** 空数组 → undefined：不切卡种的报表不该因为一次开关而多出 `"stashedMeasures": []`。 */
function optional<T>(a: T[]): T[] | undefined {
  return a.length > 0 ? a : undefined;
}

/** 当前配置下「能作为排序键」的字段集：维度 + 指标别名 + 计算字段。
 *
 *  [为什么必须剔除无效排序] 后端对 ORDER BY 做白名单校验（report_handlers.go
 *  `!orderAllowed[o.Field]` → 直接返回 "排序字段 %q 不在可用字段中"），
 *  不是静默忽略。所以切卡种把第二维度收进暂存后，原来「按该维度排序」的规则会让**整张卡查询报错**。
 *  剔除不是丢配置：它们进 orderByStash，切回能装下的卡种时按原顺序并回。 */
function sortableKeys(rows: string[], measures: ReportMeasure[], computed: { key: string }[] | undefined): Set<string> {
  const s = new Set<string>(rows);
  for (const m of measures) s.add(measureKeyOf(m));
  for (const c of computed ?? []) s.add(c.key);
  return s;
}

/** 重排排序条件：能执行的留下，不能执行的进暂存（顺序保持，切回时并回在前）。
 *
 *  [为什么每次都要重排] 排序键的可用集依赖「当前 visible 的维度 + 指标」。切换卡种、手动投放字段
 *  都会改变这个集合；漏一次，后端白名单就报「排序字段 %q 不在可用字段中」整卡查询失败。
 *  所以这里的入参不是「怎么切」，而是「切换后的 rows/measures 是什么」—— 判据只有一份。 */
function pruneOrderBy(
  ch: ReportChart,
  rows: string[],
  measures: ReportMeasure[],
  physicalFields = false,
): Pick<ReportChart, "orderBy" | "orderByStash"> {
  const allowed = sortableKeys(rows, measures, ch.computedFields);
  // 明细表只认物理列，所以 datefmt 排序键要退化成底层字段 ——
  // 这是**有语义代价**的（按「月份」排变成按「日期」排），但沿用旧实现的行为：
  // 直接 stash 掉会让「表格切明细」这个高频动作丢掉排序，而旧版是保留的。
  // 两个 datefmt（月 + 日）退化后可能撞成同一列，按首次出现去重，避免 ORDER BY 重复列。
  const pool = [...(ch.orderBy ?? []), ...(ch.orderByStash ?? [])].map((o) =>
    physicalFields ? { ...o, field: toPhysicalDim(o.field) } : o,
  );
  const kept: ReportOrderBy[] = [];
  const dropped: ReportOrderBy[] = [];
  const seen = new Set<string>();
  for (const o of pool) {
    if (!allowed.has(o.field) || seen.has(o.field)) {
      dropped.push(o);
      continue;
    }
    seen.add(o.field);
    kept.push(o);
  }
  return { orderBy: optional(kept), orderByStash: optional(dropped) };
}

/** 迁移核心：把 ch 重排成「目标卡种（to）下的 t 形态」。switchType 与 restoreStash 共用。 */
function reflow(ch: ReportChart, to: CardKind, t: ReportChartType): Partial<ReportChart> {
  const cap = capOf(to, t);

  // 维度池 = 当前维度 + 暂存维度。明细表只认物理列（逐行不聚合，DATE_FORMAT 无意义），
  // 所以 datefmt 维度在这里退化成底层字段 —— 沿用旧实现的行为，不是新规则。
  const rowPool = [...ch.rows, ...(ch.rowsStash ?? [])];
  const [rows, rowsStash] = take(to === "detail" ? rowPool.map(toPhysicalDim) : rowPool, cap.dims);

  const [measures, stashedMeasures] = take([...ch.measures, ...(ch.stashedMeasures ?? [])], cap.measures);

  const out: Partial<ReportChart> = {
    chartType: t,
    rows,
    measures,
    stashedMeasures: optional(stashedMeasures),
    rowsStash: optional(rowsStash),
    ...pruneOrderBy(ch, rows, measures, to === "detail"),
  };
  // 显式 kind 优先级高于 chartType 派生（见 cardKind）。跨种类切换若不一起改写，
  // cardKind 会一直返回旧种类 —— 表现为「点了饼图，面板却还是指标卡」，且无报错。
  if (ch.kind !== undefined) out.kind = to;
  return out;
}

/** 切换图表类型。同类型直接返回空补丁（不产生无意义的 state 变更）。 */
export function switchType(ch: ReportChart, t: ReportChartType): Partial<ReportChart> {
  if (t === ch.chartType) return {};
  return reflow(ch, KIND_OF[t], t);
}

/** 把暂存项尽可能并回当前卡种（「恢复」按钮）。
 *  与 switchType 同源：等价于「按当前卡种的容量重排一次」，
 *  所以它天然是幂等的，也不会覆盖用户切换后手动加/删的字段。 */
export function restoreStash(ch: ReportChart): Partial<ReportChart> {
  return reflow(ch, cardKind(ch), ch.chartType);
}

// ---- 手动往槽位投放字段（与 switchType 共用同一份容量表） ----
//
// [为什么这里也要管容量] 只在切换时管容量是半个修法：在指标卡上再拖一个指标进来，
// 界面照样把它塞进 measures[1]，而 kpi 的查询强制 dimensions/limit 只取一个值 ——
// 第 2 个指标永远不显示，且没有任何提示。这跟「切卡种丢指标」是同一个缺陷，
// 只是入口从「切类型按钮」换成了「字段井拖拽」。容量必须是卡种的属性，不是某个入口的规矩。

/** 按容量切分：保留**最后** n 项（新投放的优先），其余按原顺序进暂存。
 *  与 take 的差别是保留哪一端 —— 切换时保留靠前的老配置（用户已有布局不该被新值顶掉），
 *  投放时保留靠后的新字段（用户刚拖进来的必须立刻可见）。 */
function pushCap<T>(pool: T[], n: number): [T[], T[]] {
  if (!Number.isFinite(n)) return [pool, []];
  // 注意 n=0 不能走 slice(-n)：slice(-0) 等于 slice(0) 会整段返回，是个静默的全保留 bug
  if (n <= 0) return [[], pool];
  if (pool.length <= n) return [pool, []];
  return [pool.slice(pool.length - n), pool.slice(0, pool.length - n)];
}

/** 投放一个维度。超出容量时把最早的那个维度挤进暂存。
 *
 *  [为什么还要重排排序] 被挤走的维度如果正被当作排序键，那条 ORDER BY 立刻失效
 *  —— 后端白名单是硬校验（不是忽略），漏这一步会让「拖一个维度进柱图」直接报错。 */
export function pushDim(ch: ReportChart, field: string): Partial<ReportChart> {
  if (!field || ch.rows.includes(field)) return {};
  const cap = capOf(cardKind(ch), ch.chartType);
  const pool = [...ch.rows, field];
  const [rows, displaced] = pushCap(pool, cap.dims);
  return {
    rows,
    rowsStash: optional([...displaced, ...(ch.rowsStash ?? [])]),
    ...pruneOrderBy(ch, rows, ch.measures, cardKind(ch) === "detail"),
  };
}

/** 投放一个指标。超出容量时把最早的那个指标挤进暂存。 */
export function pushMeasure(ch: ReportChart, m: ReportMeasure): Partial<ReportChart> {
  if (ch.measures.some((x) => x.field === m.field)) return {};
  const cap = capOf(cardKind(ch), ch.chartType);
  const pool = [...ch.measures, m];
  const [measures, displaced] = pushCap(pool, cap.measures);
  return {
    measures,
    stashedMeasures: optional([...displaced, ...(ch.stashedMeasures ?? [])]),
    ...pruneOrderBy(ch, ch.rows, measures, cardKind(ch) === "detail"),
  };
}

/** 编辑器提示条所需的文案（纯函数，便于单测；不依赖任何 i18n 框架）。 */
export interface StashNotice {
  /** 暂存的指标个数 */
  measures: number;
  /** 暂存的维度个数 */
  dims: number;
  /** 暂存的排序条件个数 */
  sorts: number;
  /** 有东西可恢复（否则不显示提示条） */
  canRestore: boolean;
  /** 提示文案 */
  text: string;
}

export function stashNotice(ch: ReportChart): StashNotice {
  const measures = ch.stashedMeasures?.length ?? 0;
  const dims = ch.rowsStash?.length ?? 0;
  const sorts = ch.orderByStash?.length ?? 0;
  const total = measures + dims + sorts;
  if (total === 0) return { measures, dims, sorts, canRestore: false, text: "" };

  const parts: string[] = [];
  if (dims > 0) parts.push(`${dims} 个维度`);
  if (measures > 0) parts.push(`${measures} 个指标`);
  if (sorts > 0) parts.push(`${sorts} 条排序`);

  // 「恢复」按钮只在当前卡种还有余量时才可用。
  // kpi 容量已满（1 指标 / 0 维度），并回不会改变任何东西 ——
  // 此时按钮应置灰，文案改成「切回图表类可恢复」，而不是点了没反应（那会被当成坏了）。
  // 判据直接用 reflow 的结果（同一个源），不另写一套「还剩几个空位」的算术，避免两处口径漂移。
  const restored = reflow(ch, cardKind(ch), ch.chartType);
  const canRestore =
    (restored.measures?.length ?? 0) > ch.measures.length ||
    (restored.rows?.length ?? 0) > ch.rows.length ||
    (restored.orderBy?.length ?? 0) > (ch.orderBy?.length ?? 0);

  return {
    measures,
    dims,
    sorts,
    canRestore,
    text: canRestore ? `${parts.join("、")}暂存（当前卡种装不下）` : `${parts.join("、")}暂存，切回其它卡种可恢复`,
  };
}
