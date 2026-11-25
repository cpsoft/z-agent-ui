// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：求值值类型与标量运算辅助（数值/真值/算术/比较/三值逻辑/日期格式化）
// 依赖：无（被 expr-eval 与 expr-builtins 共用，避免二者循环依赖）

/** 求值环境值类型：数字 / 字符串 / null（与后端 SQL 行值一致） */
export type EvalValue = number | string | null;

/** 规约为数字（非数字字符串/null → null；MySQL 数值上下文语义） */
export function numOf(v: EvalValue): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "" || isNaN(Number(t))) return null;
    return Number(t);
  }
  return null;
}

/** 布尔化（MySQL 真值语义：0 / '' / '0' / null → false，其余 → true） */
export function truthyOf(v: EvalValue): boolean {
  if (v === null) return false;
  if (typeof v === "number") return v !== 0;
  return v !== "" && v !== "0";
}

/** 算术：null 传播；除零/非法 → null（+ 仅数值相加，字符串拼接请用 CONCAT） */
export function arithVals(a: EvalValue, b: EvalValue, op: string): EvalValue {
  const an = numOf(a);
  const bn = numOf(b);
  if (an === null || bn === null) return null;
  switch (op) {
    case "+": return an + bn;
    case "-": return an - bn;
    case "*": return an * bn;
    case "/": return bn === 0 ? null : an / bn;
    case "%": return bn === 0 ? null : an % bn;
    default: return null;
  }
}

/** 比较：null 传播；先数值后字符串比较，返回 1/0 */
export function cmpVals(a: EvalValue, b: EvalValue, op: string): EvalValue {
  if (a === null || b === null) return null;
  const an = numOf(a);
  const bn = numOf(b);
  let cmp: number; // -1 | 0 | 1
  if (an !== null && bn !== null) cmp = an < bn ? -1 : an > bn ? 1 : 0;
  else {
    const as = String(a);
    const bs = String(b);
    cmp = as < bs ? -1 : as > bs ? 1 : 0;
  }
  switch (op) {
    case ">": return cmp > 0 ? 1 : 0;
    case "<": return cmp < 0 ? 1 : 0;
    case ">=": return cmp >= 0 ? 1 : 0;
    case "<=": return cmp <= 0 ? 1 : 0;
    case "=":
    case "==": return cmp === 0 ? 1 : 0;
    case "!=":
    case "<>": return cmp !== 0 ? 1 : 0;
    default: return null;
  }
}

/** AND（三值逻辑：任一明确假 → 0；否则有 null → null；否则 1） */
export function andVals(a: EvalValue, b: EvalValue): EvalValue {
  if (a !== null && !truthyOf(a)) return 0;
  if (b !== null && !truthyOf(b)) return 0;
  if (a === null || b === null) return null;
  return 1;
}

/** OR（三值逻辑：任一明确真 → 1；否则有 null → null；否则 0） */
export function orVals(a: EvalValue, b: EvalValue): EvalValue {
  if (truthyOf(a) || truthyOf(b)) return 1;
  if (a === null || b === null) return null;
  return 0;
}

/** 解析日期值：'YYYY-MM-DD[ HH:mm:ss]' 字符串 / YYYYMMDD 数字 / 秒/毫秒时间戳；不可解析 → null */
export function dateOf(v: EvalValue): Date | null {
  if (v === null) return null;
  if (typeof v === "number") {
    if (v > 1e11) {
      const d = new Date(v);
      return isNaN(d.getTime()) ? null : d;
    }
    if (v > 1e8) {
      const d = new Date(v * 1000);
      return isNaN(d.getTime()) ? null : d;
    }
    if (Number.isInteger(v) && v >= 10000101 && v <= 99991231) {
      const s = String(v);
      const d = new Date(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8)));
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  const t = v.trim();
  if (t === "") return null;
  const d = new Date(t.replace(/-/g, "/")); // Safari 兼容
  return isNaN(d.getTime()) ? null : d;
}

/** 日期 → 'YYYY-MM-DD' */
export function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 日期 → 'YYYY-MM-DD HH:mm:ss' */
export function fmtDateTime(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${fmtDate(d)} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** ISO 周数（与 MySQL WEEKOFYEAR 近似，周一为一周起点） */
export function weekOfYear(d: Date): number {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getTime() + 3 * 86400000) / 86400000;
  const jan1 = new Date(target.getFullYear(), 0, 1);
  const week = Math.floor((dayNr - jan1.getDay() / 7) / 7) + 1;
  return week;
}
