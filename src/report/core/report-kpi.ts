// 指标卡（kind = "kpi"）的取值、格式化、环比与阈值计算。
//
// [为什么单独成文件] 这四件事都会「算错了但看不出来」：空值显示成 0、环比把 -100→-50
// 算成 -50%（其实是改善）、阈值方向反了会把达标染成红色。埋进 JSX 里只能靠肉眼查，
// 拆成纯函数才能用硬编码字面量把每种边界钉死。

import type {
  AggregateResult,
  KpiFormat,
  KpiThresholds,
  ReportChart,
  ReportFilter,
  ReportMeasure,
} from "./types.js";

const DAY_MS = 86_400_000;

/** 指标列 key：普通度量 = agg_field；计算字段度量 = 字段 key（带 agg 时加前缀防冲突）。
 *
 *  [唯一实现] Reports.tsx 里的 measureKey 直接复用本函数（别名），不另写一份 ——
 *  这行规则一旦两处不一致，取值就会恒为 undefined（卡面永远「--」），且不会有任何报错。 */
export function measureKeyOf(m: ReportMeasure): string {
  if (m.alias) return m.alias;
  return m.agg ? `${m.agg}_${m.field}` : m.field;
}

/** 指标卡的原始值。null = 无数据 / 非数字，**必须与 0 区分**。
 *
 *  [为什么单独处理 null] 无 GROUP BY 的 SUM() 零匹配仍返回 1 行、值为 NULL。
 *  把它当 0 显示，等于告诉用户「本期卖了 0 元」，而事实是「没有数据」。 */
export function kpiRaw(chart: ReportChart, result: AggregateResult | null): number | null {
  const m = chart.measures?.[0];
  if (!m) return null;
  const row = result?.rows?.[0];
  if (!row) return null;
  const v = row[measureKeyOf(m)];
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 指标卡显示文本。null → "--"（绝不显示 0 或空串：空串会让人以为卡坏了）。 */
export function formatKpi(v: number | null, fmt?: KpiFormat): string {
  if (v === null || !Number.isFinite(v)) return "--";
  const decimals = fmt?.decimals ?? 0;
  const thousands = fmt?.thousands ?? true;
  const body = thousands
    ? v.toLocaleString("zh-CN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : v.toFixed(decimals);
  return fmt?.unit ? `${body}${fmt.unit}` : body;
}

export type KpiDeltaKind = "up" | "down" | "flat" | "new" | "unknown";

export interface KpiDelta {
  kind: KpiDeltaKind;
  /** 直接可渲染的文本，如 "+12.5%" / "新增" / "持平" / "--" */
  text: string;
}

/**
 * 环比。
 *
 * 四种边界都必须有确定答案，否则卡面会出现 NaN / Infinity：
 *  - 上期为 0：本期 0 → 持平；本期非 0 → 「新增」（除以 0 是 Infinity，不能显示）
 *  - 上期为负：改用**绝对差**。负基数的百分比反直觉（-100 → -50 算出 -50%，
 *    但那是改善），显示绝对差与方向更不容易被误读。
 *  - 任一侧 null：→ "--"（没有可比的数据，不是「0%」）
 */
export function kpiDelta(cur: number | null, prev: number | null): KpiDelta {
  if (cur === null || prev === null) return { kind: "unknown", text: "--" };
  if (prev === 0) {
    if (cur === 0) return { kind: "flat", text: "持平" };
    return { kind: "new", text: "新增" };
  }
  if (prev < 0) {
    const diff = cur - prev;
    if (diff === 0) return { kind: "flat", text: "持平" };
    return {
      kind: diff > 0 ? "up" : "down",
      text: `${diff > 0 ? "+" : ""}${trimNum(diff)}`,
    };
  }
  const pct = ((cur - prev) / prev) * 100;
  const r = Math.round(pct * 10) / 10;
  if (r === 0) return { kind: "flat", text: "0%" };
  return { kind: r > 0 ? "up" : "down", text: `${r > 0 ? "+" : ""}${r}%` };
}

function trimNum(v: number): string {
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);
}

export type KpiTone = "normal" | "warn" | "danger";

/**
 * 阈值色。
 *
 * `higher_is_worse`（成本、退货率）：超过 danger 是危险，超过 warn 是警戒。
 * `lower_is_worse`（营收、利润）：低于 danger 是危险，低于 warn 是警戒。
 * 判反了不会报错，只会把「超额完成」染成红色 —— 所以两个方向各有一条断言。
 */
export function kpiTone(v: number | null, t?: KpiThresholds): KpiTone {
  if (v === null || !t) return "normal";
  if (t.direction === "higher_is_worse") {
    if (v >= t.danger) return "danger";
    if (v >= t.warn) return "warn";
    return "normal";
  }
  if (v <= t.danger) return "danger";
  if (v <= t.warn) return "warn";
  return "normal";
}

/** 卡面颜色归属：环比与阈值互斥，环比优先。
 *
 *  [为什么不是两者叠加] 卡面只有一个颜色位置。环比表达「涨/跌」，阈值表达「达标/预警」，
 *  同时开启时「红色」既可能是涨也可能是超限 —— 用户无从判断。编辑器做成单选，
 *  这里再兜一次（历史数据可能两个字段都存了）。 */
export function kpiColorMode(cfg: { compare?: unknown; thresholds?: unknown } | undefined): "compare" | "thresholds" | "none" {
  if (!cfg) return "none";
  if (cfg.compare) return "compare";
  if (cfg.thresholds) return "thresholds";
  return "none";
}

/**
 * 把筛选条件整体前移一个等长周期，得到「上期」的筛选。
 *
 * 返回 null 表示**找不到可平移的日期窗口** —— 此时调用方必须显示「--」而不是拿本期数据
 * 当上期（那会恒等于 0% 变化，看起来一切正常，实际环比完全没生效）。
 *
 * @param filters 已经过 resolveFilter 解析的条件（相对日期标记必须已展开成具体日期）
 * @param isDateField 字段是否日期型。只有日期字段平移，数值字段（如金额 > 100）照原样带上。
 */
export function shiftPeriodFilters(
  filters: ReportFilter[],
  isDateField: (field: string) => boolean,
): ReportFilter[] | null {
  // 先按字段收集上下界，用来算区间长度。同一字段的 >= 与 <= 必须用同一个 span。
  const bounds = new Map<string, { lo?: string; hi?: string }>();
  for (const f of filters) {
    if (!isDateField(f.field)) continue;
    const b = bounds.get(f.field) ?? {};
    if (f.op === ">=" && typeof f.value === "string") b.lo = f.value;
    else if (f.op === "<=" && typeof f.value === "string") b.hi = f.value;
    else if (f.op === "=" && typeof f.value === "string") {
      b.lo = f.value;
      b.hi = f.value;
    } else if (f.op === "between" && Array.isArray(f.value) && f.value.length === 2) {
      b.lo = String(f.value[0] ?? "");
      b.hi = String(f.value[1] ?? "");
    } else continue;
    bounds.set(f.field, b);
  }

  let shifted = 0;
  const out: ReportFilter[] = [];
  for (const f of filters) {
    const b = bounds.get(f.field);
    if (!b?.lo || !b?.hi) {
      out.push(f); // 非日期条件（或只有单边界的日期条件）原样保留
      continue;
    }
    const span = spanDays(b.lo, b.hi);
    if (span <= 0) {
      out.push(f);
      continue;
    }
    if (f.op === ">=") out.push({ ...f, value: shiftDate(b.lo, -span) });
    else if (f.op === "<=") out.push({ ...f, value: shiftDate(b.hi, -span) });
    else if (f.op === "=") out.push({ ...f, value: shiftDate(b.hi, -span) });
    else if (f.op === "between") out.push({ ...f, value: [shiftDate(b.lo, -span), shiftDate(b.hi, -span)] });
    else {
      out.push(f);
      continue;
    }
    shifted++;
  }
  return shifted > 0 ? out : null;
}

/** "YYYY-MM-DD" 或 "YYYY-MM-DD HH:mm:ss" → UTC 毫秒（只取日期部分）。
 *  不用 new Date(str)：带空格的字符串在部分引擎里是 Invalid Date。 */
function parseDay(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** 含首尾的天数：10-01~10-07 = 7 天（不是 6 天）。差一天会让上期多算/少算一天。 */
function spanDays(lo: string, hi: string): number {
  const a = parseDay(lo);
  const b = parseDay(hi);
  if (a === null || b === null) return 0;
  return Math.round((b - a) / DAY_MS) + 1;
}

/** 平移日期，保留原值的时间部分（00:00:00 与 23:59:59 不能互相顶替）。 */
function shiftDate(s: string, days: number): string {
  const t = parseDay(s);
  if (t === null) return s;
  const d = new Date(t + days * DAY_MS);
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const time = s.includes(" ") ? ` ${s.split(" ")[1]}` : "";
  return `${y}-${mo}-${da}${time}`;
}
