// 日期快捷区间（issue IKUE1G）：`近 7 天 / 近 30 天 / 本月 / 上月` 这类预设。
//
// [WHY 单独一个纯模块] 同一份「预设名 → 起止日期」有三处要用，且必须算出**完全一样**的
// 两个日期：
//   · 页面脚本的 `quick=[近7天, 近30天]`（渲染层出按钮）
//   · 页面脚本的 `default=近30天`（渲染层与 `defaultFilterValues` 共用的解析）
//   · `z-datepicker` 的 `presets=` 属性（面板上的按钮与「当前选中」判定）
// 各写一遍的症状不是报错，而是「按钮写 近30天、默认值算出来 29 天」这类差一天 ——
// 页面上两个日期都长得对，只有对账时才发现少了一天。
//
// 约束：**只用本地日历日**（`new Date(y, m, d)` / `getDate()`），不用 `toISOString()`。
// 东八区 00:30 转 UTC 会退到前一天，「今天」在凌晨变成昨天。
//
// 不碰 DOM、不引组件：`calendar.ts` 那些纯函数已经够用，本模块可在无 DOM 环境单测。
import { addDays, formatISO, type ISOString } from "./calendar.js";

export interface DatePresetRange {
  start: ISOString;
  end: ISOString;
}

interface PresetDef {
  /** 脚本里写的名字（也是按钮文案）。 */
  name: string;
  range(now: Date): DatePresetRange;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** 当月最后一天。`new Date(y, m+1, 0)` 的原生进位对 12 月也成立。 */
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

/**
 * 五个预设。名字即文案 —— 不给「键 / 文案」两套，是因为脚本作者写的就是界面上要看的字，
 * 多一层映射就多一处能对不上的地方。
 *
 * [WHY 近 7 天是 today-6d 而不是 today-7d] 「近 7 天」= 含今天在内的 7 个日历日。
 * 写成 -7d 会得到 8 天，差的那一天在日报口径上就是「多算一天」。
 *
 * [WHY 本月 / 上月是整月而不是「至今」] 两种口径在**取数结果**上等价（未来的行不存在），
 * 但整月的边界是确定的：同一份脚本在月初和月末打开，按钮对应的高亮与手选日期都一致。
 * 「至今」会让同一个 `default=本月` 在不同日期解析出不同的结束日 —— 那正是 issue 里
 * 「写死相对时间」想消灭的东西换了个马甲。要「至今」请写 `today-29d~today` 这类显式区间。
 */
const PRESETS: readonly PresetDef[] = [
  { name: "今天", range: (now) => ({ start: formatISO(now), end: formatISO(now) }) },
  {
    name: "近7天",
    range: (now) => ({ start: formatISO(addDays(now, -6)), end: formatISO(now) }),
  },
  {
    name: "近30天",
    range: (now) => ({ start: formatISO(addDays(now, -29)), end: formatISO(now) }),
  },
  {
    name: "本月",
    range: (now) => ({ start: formatISO(startOfMonth(now)), end: formatISO(endOfMonth(now)) }),
  },
  {
    name: "上月",
    range: (now) => {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { start: formatISO(startOfMonth(prev)), end: formatISO(endOfMonth(prev)) };
    },
  },
];

/** 全部预设名（面板、文档、测试共用一份）。顺序即按钮顺序。 */
export const DATE_PRESET_NAMES: readonly string[] = PRESETS.map((p) => p.name);

/**
 * 预设名 → 区间。不是预设名（含空串、拼错、绝对日期）一律返回 null ——
 * 调用方据此决定「按 token 继续解析」还是「报未知」。
 *
 * 大小写与空格宽松：`近30天` 与 `近 30 天` 都认（脚本里手敲空格很常见）。
 */
export function presetRangeOf(name: string, now: Date = new Date()): DatePresetRange | null {
  const key = name.replace(/\s+/g, "");
  if (!key) return null;
  const hit = PRESETS.find((p) => p.name === key);
  return hit ? hit.range(now) : null;
}

/** 是不是一个合法的预设名（lint / 面板用来判「拼错了」）。 */
export function isPresetName(name: string): boolean {
  return presetRangeOf(name, new Date()) !== null;
}

/**
 * `min` / `max` 的夹取：预设区间与可选边界冲突时以边界为准（issue 的语义要求）。
 *
 * 夹完 `start > end` 表示整段都落在可选范围之外 —— 返回 null，调用方把这一项置灰，
 * 而不是画一个点下去没有反应的按钮。
 */
export function clampPresetRange(
  range: DatePresetRange,
  min: string,
  max: string,
): DatePresetRange | null {
  const start = min && range.start < min ? min : range.start;
  const end = max && range.end > max ? max : range.end;
  return start > end ? null : { start, end };
}

/**
 * 当前起止是否**恰好**等于某个预设（决定按钮高亮）。
 *
 * [WHY 要求完全匹配] 手选一个 7 天的自定义区间不该让「近7天」亮着 —— 那会让人以为
 * 自己点过预设，下次想复位时点它反而没变化（值相同 ⇒ 组件不发事件 ⇒ 看着像坏了）。
 */
export function presetIsActive(
  name: string,
  start: string,
  end: string,
  now: Date = new Date(),
  min = "",
  max = "",
): boolean {
  if (!start || !end) return false;
  const range = presetRangeOf(name, now);
  if (!range) return false;
  const clamped = clampPresetRange(range, min, max);
  return !!clamped && clamped.start === start && clamped.end === end;
}
