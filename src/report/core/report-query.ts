// 取数语义：把「报表配置」翻译成「查询请求」，再把结果交回渲染层。
//
// [为什么这段必须在 core，不能各宿主自己写] 这里有三条「错了但看不出来」的规则：
//   ① 相对日期标记（@today / @last7d）按**打开报表当天**解析。宿主各写一份 ⇒ 同一张
//      报表在不同系统里窗口不同，数字对不上，且没有任何报错。
//   ② 指标卡是**单值**，必须忽略维度与排序并 limit 1。照旧传维度会返回每个分组一行，
//      卡面取 rows[0] 等于「随便挑一个门店的销售额」—— 数字看着正常，其实全是错的。
//   ③ 明细表展示列 = rows（去 datefmt 前缀）+ measures 物理列，去重保序。漏掉任一侧
//      就是「明细表少一列」或「日期列显示成 datefmt:xxx」。
//
// [为什么 now 可注入] 上面 ① 的语义依赖「当前时间」。若函数内部直接 new Date()，
// 测试就只能去改系统时钟；跨时区 CI 上还会稳定地错一天。把 now 作为可选参数注入，
// 期望值可以手写成字面量（`resolveRelativeDate("@last7d", new Date("2026-03-10T10:00:00"))`）。

import { cardKind } from "./report-card.js";
import { kpiRaw, measureKeyOf, shiftPeriodFilters } from "./report-kpi.js";
import { toPhysicalDim } from "./report-date.js";
import type {
  AggregateRequest,
  ChartQueryData,
  DetailRequest,
  ReportDataSource,
} from "./data-source.js";
import type {
  AggregateResult,
  ReportChart,
  ReportFilter,
  ReportOrderBy,
} from "./types.js";

// ---- 相对日期筛选（@ 标记，查询时按打开报表当天动态解析，保证每次打开都是最新窗口） ----

export interface RelativeDateOption {
  key: string;
  label: string;
}

/** 内置相对日期标记。label 是默认展示文案，宿主可经 relativeDateLabel 的第二个参数覆盖。 */
export const RELATIVE_DATE_OPTS: readonly RelativeDateOption[] = [
  { key: "@today", label: "今天" },
  { key: "@yesterday", label: "昨天" },
  { key: "@last7d", label: "近7天" },
  { key: "@last30d", label: "近30天" },
  { key: "@thisMonth", label: "本月" },
  { key: "@lastMonth", label: "上月" },
  { key: "@thisYear", label: "今年" },
];

const RELATIVE_DATE_KEYS = new Set(RELATIVE_DATE_OPTS.map((o) => o.key));

export function isRelativeDateKey(v: unknown): v is string {
  return typeof v === "string" && RELATIVE_DATE_KEYS.has(v);
}

export function relativeDateLabel(v: unknown, override?: Record<string, string>): string {
  if (typeof v === "string" && override && override[v]) return override[v];
  return RELATIVE_DATE_OPTS.find((o) => o.key === v)?.label ?? String(v ?? "");
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 本地日历日 YYYY-MM-DD（**不用 toISOString**：那是 UTC，东八区早 8 点前会退一天）。 */
export function dateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 相对日期标记 → 实际日期区间 [start, end]。
 *
 *  end 带 23:59:59：这样 datetime 列与 varchar 日期列的前缀比较都成立；
 *  只写到日会把当天 00:00 之后的数据全排除（「今天」查不到今天）。
 *  返回 null = 不是已知标记（调用方原样透传）。 */
export function resolveRelativeDate(
  key: string,
  now: Date = new Date(),
): { start: string; end: string } | null {
  const day = (d: Date) => ({ start: dateStr(d), end: `${dateStr(d)} 23:59:59` });
  const rangeToToday = (start: Date) => ({ start: dateStr(start), end: `${dateStr(now)} 23:59:59` });
  switch (key) {
    case "@today":
      return day(now);
    case "@yesterday": {
      const d = new Date(now);
      d.setDate(d.getDate() - 1);
      return day(d);
    }
    case "@last7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6); // 含今天共 7 天
      return rangeToToday(d);
    }
    case "@last30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return rangeToToday(d);
    }
    case "@thisMonth": {
      return rangeToToday(new Date(now.getFullYear(), now.getMonth(), 1));
    }
    case "@lastMonth": {
      // 用「本月 0 号」取上月末，避免手算 28/29/30/31 天
      return {
        start: dateStr(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: `${dateStr(new Date(now.getFullYear(), now.getMonth(), 0))} 23:59:59`,
      };
    }
    case "@thisYear":
      return rangeToToday(new Date(now.getFullYear(), 0, 1));
    default:
      return null;
  }
}

/** 相对日期标记 → 端点值：作为区间起点取 start，作为终点取 end（相对跨度如「本月」仍落到单点）。 */
function resolveRelativeBound(key: string, asEnd: boolean, now: Date): string {
  const rel = resolveRelativeDate(key, now);
  if (!rel) return key;
  return asEnd ? rel.end : rel.start;
}

/** 单条筛选 → 查询条件。
 *
 *  相对日期标记展开为 `>= start AND <= end`（一个条件变两个）；范围 between 的起止
 *  各自按端点解析；其余原样返回。返回值恒为数组 —— between 看似「一进一出」，
 *  统一成数组让调用方不必区分。 */
export function resolveFilter(f: ReportFilter, now: Date = new Date()): ReportFilter[] {
  if (f.op === "between") {
    const arr = Array.isArray(f.value) ? f.value.slice(0, 2) : ["", ""];
    const [loS, hiS] = arr.map((v, i) =>
      isRelativeDateKey(v) ? resolveRelativeBound(v, i === 1, now) : String(v ?? ""),
    );
    return [{ field: f.field, op: "between", value: [loS, hiS] }];
  }
  const rel = isRelativeDateKey(f.value) ? resolveRelativeDate(f.value, now) : null;
  if (!rel) return [f];
  return [
    { field: f.field, op: ">=", value: rel.start },
    { field: f.field, op: "<=", value: rel.end },
  ];
}

/** 批量解析（flatMap：一条相对日期筛选会展开成两条）。 */
export function resolveFilters(filters: ReportFilter[], now: Date = new Date()): ReportFilter[] {
  return filters.flatMap((f) => resolveFilter(f, now));
}

/** 明细表展示列：rows（去 datefmt 前缀）+ measures 物理列，去重保序。 */
export function detailFields(chart: ReportChart): string[] {
  const out: string[] = [];
  const push = (f: string) => {
    if (f && !out.includes(f)) out.push(f);
  };
  for (const r of chart.rows) push(toPhysicalDim(r));
  for (const m of chart.measures) push(m.field);
  return out;
}

/** 该卡**可以**按哪些字段排序。
 *
 *  [为什么要过滤而不是原样下发] 用户把「金额求和」换成了「数量求和」，旧排序项
 *  `sum_amount` 还留在配置里。后端拿到一个不存在的列：MySQL 直接 1054，ClickHouse
 *  报 unknown identifier —— 而界面上这张卡的配置看起来完全正常，没人会想到是排序里
 *  残留了一项。明细卡只能按展示列排（聚合别名在明细里根本不存在）。 */
export function orderableFields(chart: ReportChart): Set<string> {
  const valid = new Set<string>(cardKind(chart) === "detail" ? detailFields(chart) : chart.rows);
  for (const cf of chart.computedFields ?? []) valid.add(cf.key);
  if (cardKind(chart) !== "detail") {
    for (const m of chart.measures) valid.add(measureKeyOf(m));
  }
  return valid;
}

/** 过滤掉字段已不存在的排序项。 */
export function validOrderBy(chart: ReportChart): ReportOrderBy[] {
  const valid = orderableFields(chart);
  return (chart.orderBy ?? []).filter((o) => valid.has(o.field));
}

/** `<z-report-table sortState>`（key/dir）→ 聚合请求的排序项（field/dir）。
 *  两者只差一个键名；转错就是「点了列头没反应」或「按错误的列排」，都不会报错。 */
export function orderByOfSort(
  entries: { key: string; dir: "asc" | "desc" }[],
): ReportOrderBy[] {
  return entries.map((e) => ({ field: e.key, dir: e.dir }));
}

/** 图表配置 → 聚合请求体。
 *
 *  [kpi 三条特例为什么不交给后端判断] 后端只知道「你要按这些维度聚合」，它不知道
 *  前端把这张卡当指标卡显示。维度照传就会返回多行，而指标卡只读第一行 ⟹ 随机分组。
 *  必须在**构造请求时**就收敛掉，让后端根本没有机会多返回。 */
export function aggregateRequestOf(
  chart: ReportChart,
  filters: ReportFilter[],
  orderBy?: ReportOrderBy[],
  now: Date = new Date(),
): AggregateRequest {
  const kind = cardKind(chart);
  const isKpi = kind === "kpi";
  return {
    dimensions: isKpi ? [] : chart.rows,
    measures: chart.measures.map((m) => ({
      field: m.field,
      agg: m.agg,
      alias: measureKeyOf(m),
      computed: m.computed,
      groupBy: m.groupBy,
      havingMin: m.havingMin,
      aggField: m.aggField,
    })),
    computed: chart.computedFields ?? [],
    having: chart.having ?? [],
    filters: resolveFilters(filters, now),
    orderBy: isKpi ? [] : orderBy,
    limit: isKpi ? 1 : chart.limit,
  };
}

/** 图表配置 → 明细请求体（逐行不聚合）。 */
export function detailRequestOf(
  chart: ReportChart,
  filters: ReportFilter[],
  orderBy?: ReportOrderBy[],
  now: Date = new Date(),
): DetailRequest {
  return {
    fields: detailFields(chart),
    filters: resolveFilters(filters, now),
    orderBy,
    limit: chart.limit,
    computed: chart.computedFields ?? [],
  };
}

/** 统一查询入口：明细卡走 detail（逐行），其余走 aggregate（分组聚合）。
 *
 *  调用方只给「卡片 + 生效筛选 + 排序」，不必关心走哪个接口 —— 走错接口的症状是
 *  明细卡显示成一行汇总 / 图表卡按行铺开，都不会报错。 */
export async function queryChartData(
  dataSource: ReportDataSource,
  chart: ReportChart,
  filters: ReportFilter[],
  orderBy?: ReportOrderBy[],
  now: Date = new Date(),
): Promise<ChartQueryData> {
  if (cardKind(chart) === "detail") {
    const detail = await dataSource.fetchDatasetDetail(
      chart.datasetId,
      detailRequestOf(chart, filters, orderBy, now),
    );
    return { result: null, detail };
  }
  const result: AggregateResult = await dataSource.aggregateDataset(
    chart.datasetId,
    aggregateRequestOf(chart, filters, orderBy, now),
  );
  return { result, detail: null };
}

// ---- 指标卡环比（需要第二次查询） ----

const DATE_VALUE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME_VALUE_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;

/** 筛选值是否长得像日期。
 *
 *  [为什么不依赖数据集 meta 判字段类型] meta 是异步的，依赖它会让环比先显示 "--"
 *  再跳成真实值，看起来像数据不稳。日期窗口的过滤值必然是 YYYY-MM-DD 形态，
 *  这个判据不依赖任何异步状态，同一份配置任何时候都得到同一结论。 */
export function looksLikeDateValue(v: unknown): boolean {
  if (typeof v === "string") return DATE_VALUE_RE.test(v) || DATETIME_VALUE_RE.test(v);
  return (
    Array.isArray(v) &&
    v.some((x) => typeof x === "string" && (DATE_VALUE_RE.test(x) || DATETIME_VALUE_RE.test(x)))
  );
}

/** 指标卡的「上期」原始值。返回 null = 不适用或查不到，调用方必须显示 "--"。
 *
 *  [为什么串行再查一次而不是塞进一次查询] 聚合接口按维度分组：把本期与上期塞进一次
 *  查询只能靠两个日期条件或 UNION —— 前者会把两期数据混在一起算一个总数，后者后端
 *  不支持。多一次往返换一个不会算错的环比，值得。
 *
 *  @param resolvedFilters **已经过 resolveRelativeDate 展开**的条件（含具体日期边界） */
export async function queryKpiPrev(
  dataSource: ReportDataSource,
  chart: ReportChart,
  resolvedFilters: ReportFilter[],
): Promise<number | null> {
  const cmp = chart.kpi?.compare;
  if (!cmp || cmp.mode !== "prev_period") return null;
  const shifted = shiftPeriodFilters(resolvedFilters, (field) =>
    resolvedFilters.some((f) => f.field === field && looksLikeDateValue(f.value)),
  );
  if (!shifted) return null;
  const m = chart.measures?.[0];
  if (!m) return null;
  const result = await dataSource.aggregateDataset(chart.datasetId, {
    dimensions: [],
    measures: [
      {
        field: m.field,
        agg: m.agg,
        alias: measureKeyOf(m),
        computed: m.computed,
        groupBy: m.groupBy,
        havingMin: m.havingMin,
        aggField: m.aggField,
      },
    ],
    computed: chart.computedFields ?? [],
    having: [],
    filters: shifted,
    orderBy: [],
    limit: 1,
  });
  return kpiRaw(chart, result);
}

