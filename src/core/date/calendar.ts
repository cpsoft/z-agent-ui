// 日期算术内核：**纯函数，零 DOM、零文案、零 import**。
//
// [WHY 从 `components/datepicker/calendar.ts` 拆出来并下沉到 L0] 2026-11-15：
// 这份代码原本只服务三个 L1 控件（datepicker / date-range / calendar），后来 L3 也需要：
//   · `page/syntax/lint.ts`   校验 `default=近30天` 的合法取值域
//   · `page/data/date-token.ts` 把相对日期 token 翻成具体日期
//   · `page/render/render-m.ts` 出移动端快捷区间按钮
//   · `editor/page-m-view`     同上
// 四处当时都写 `from "../../components/datepicker/presets.js"` —— **L3 深引 L1 的私有文件**。
// 症状不是报错，而是「L1 挪一个文件，L3 编译失败」，且 `syntax` 号称「纯函数、无 DOM」
// 却 import 了控件目录。
//
// 判据用的是 L0 那条：**两层以上在用 ⇒ 下沉**（先例：`core/number.ts` 的 `cleanFloat`）。
// 拆分时刻意把「有外观的部分」（`getMonthLabel` / `renderGridTable`）留在
// `components/datepicker/calendar.ts` —— L0 不放带具体外观的东西。
//
// 约束（沿用原注释，逐条都是踩过的坑）：
//   · 一律本地日历日（`new Date(y, m, d)` / `getDate()`），**不用 `toISOString()`**：
//     东八区 00:30 转 UTC 会退到前一天，「今天」在凌晨变成昨天。
//   · 可在无 DOM 环境单测 —— 本文件不许引任何模块。

export type ISOString = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse ISO YYYY-MM-DD to a local Date at midnight. Returns null on malformed input. */
// [WHY] 本地午夜构造而非 Date.parse/toISOString，避免时区偏移导致日期错位
export function parseISO(iso: string): Date | null {
  const m = ISO_RE.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  // Roundtrip check rejects nonexistent dates like 2026-02-30
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** Format a local Date as ISO YYYY-MM-DD. Never toISOString() (UTC shift bug). */
export function formatISO(date: Date): ISOString {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): ISOString {
  return formatISO(new Date());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Calendar-safe day addition (local time, crosses month/year boundaries). */
export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Lexical comparison is correct for zero-padded ISO strings. */
export function compareISO(a: ISOString, b: ISOString): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** True when iso is within [min, max]; empty min/max means unbounded. */
export function isISOInRange(iso: ISOString, min: ISOString, max: ISOString): boolean {
  if (min && compareISO(iso, min) < 0) return false;
  if (max && compareISO(iso, max) > 0) return false;
  return true;
}

const weekInfoCache = new Map<string, number>();

/**
 * First day of week for a locale: 0 = Sunday .. 6 = Saturday.
 * Uses Intl.Locale.getWeekInfo when available (CLDR 1-7), falls back to Sunday.
 */
export function getFirstDayOfWeek(locale: string): number {
  const cached = weekInfoCache.get(locale);
  if (cached !== undefined) return cached;
  let first = 0;
  try {
    const info = (new Intl.Locale(locale) as any).getWeekInfo?.();
    if (info && typeof info.firstDay === "number" && info.firstDay >= 1 && info.firstDay <= 7) {
      first = info.firstDay % 7; // CLDR 1=Mon..7=Sun -> JS 0=Sun..6=Sat
    }
  } catch {
    first = 0;
  }
  weekInfoCache.set(locale, first);
  return first;
}

export interface CalendarCell {
  iso: ISOString;
  day: number;
  inMonth: boolean;
}

/** Fixed 6x7 = 42 cells for the month grid, starting at the week boundary. */
export function buildGrid(year: number, month: number, weekStart: number): CalendarCell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const gridStart = new Date(year, month, 1 - offset);
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i);
    cells.push({
      iso: formatISO(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    });
  }
  return cells;
}

// ── 日期 + 时间（精度到分）──────────────────────────────────
//
// [WHY 值里带时间，而不是「日期 + 另一个字段」] 「2026-08-01 09:30」是**一个时刻**，
// 拆成两个参数下推就会在两条筛选之间出现「日期还在、时间被清空」的半截状态，
// 而接口那边看到的是「从 8-01 00:00 起」——一个看起来正常的查询。
//
// [WHY 下沉到 L0] 三个消费方：`z-datepicker`（L1）、页面筛选渲染（L3）、
// 表单取值（L3）。放在任一层都要被另两层深引。

export interface DateTimeParts {
  /** `YYYY-MM-DD`；认不出时是原串。 */
  day: string;
  /** `HH:mm`；没有时间时是空串。 */
  time: string;
}

/**
 * 拆一个值。认 `2026-08-01`、`2026-08-01 09:30`、`2026-08-01T09:30` 三种写法。
 *
 * [WHY 三种都认] 空格是给人看的形态（服务端返回的历史值多半是它），`T` 是我们写出去
 * 的形态（ISO 8601）。只认一种的病是「宿主回填了一个空格形态的值，时间框显示 00:00」
 * ——时间被静默截掉，而用户以为自己没选。
 */
export function splitDateTime(raw: string): DateTimeParts {
  const text = (raw ?? "").trim();
  if (!text) return { day: "", time: "" };
  const m = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{1,2}):(\d{1,2}))?/.exec(text);
  if (!m) return { day: text, time: "" };
  if (m[2] === undefined) return { day: m[1], time: "" };
  return { day: m[1], time: normalizeHHmm(`${m[2]}:${m[3]}`) };
}

/** 值 → 日期部分。所有「和日期格比大小」的地方都该用它，而不是直接比整个串。 */
export function dayOf(raw: string): ISOString {
  return splitDateTime(raw).day;
}

/** 值 → 时间部分（`HH:mm`，没有就是空串）。 */
export function timeOf(raw: string): string {
  return splitDateTime(raw).time;
}

/** 拼回一个值：`day` 为空 ⇒ 空串（时间单独存在没有意义）。 */
export function composeDateTime(day: string, time: string): ISOString {
  if (!day) return "";
  return `${day}T${normalizeHHmm(time)}`;
}

/**
 * 时间串归一：`9:5` → `09:05`，越界钳到边界，认不出回到 `00:00`。
 *
 * [WHY 钳而不是报错] 它服务的是**用户正在敲的输入框**：他打「2」准备打「23」，
 * 中间态不该弹红字。真正的拦截在写入那一步（`isValidHHmm`）。
 */
export function normalizeHHmm(raw: string): string {
  const m = /^\s*(\d{1,2})(?:\s*[:：]\s*(\d{1,2}))?\s*$/.exec(raw ?? "");
  if (!m) return "00:00";
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const mi = Math.min(59, Math.max(0, Number(m[2] ?? "0")));
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/** `HH:mm` 是否合法（分量在界内且两位）。 */
export function isValidHHmm(raw: string): boolean {
  const text = (raw ?? "").trim();
  if (!/^\d{1,2}:\d{2}$/.test(text)) return false;
  const [h, m] = text.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

/**
 * 值 → 屏幕上给人看的文字：`2026-08-01 09:30`。
 *
 * [WHY 只在显示时换空格] 值是机器读的（进查询、进 URL），`T` 才是无歧义的形态。
 * 在值里写空格，宿主那边就得猜「这串是不是被 URL 编码过、空格是不是 +」。
 */
export function formatDateTimeDisplay(raw: string): string {
  const { day, time } = splitDateTime(raw);
  if (!day) return raw ?? "";
  return time ? `${day} ${time}` : day;
}

