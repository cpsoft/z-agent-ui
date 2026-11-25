// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：内置函数求值实现（原 ExprEval.callFn 的函数分派表，语义对齐后端 fnSpecs）
// 依赖：funcs-spec、expr-values（单向）

import { FUNC_SPECS } from "./funcs-spec.js";
import { type EvalValue, dateOf, fmtDate, fmtDateTime, numOf, truthyOf, weekOfYear } from "./expr-values.js";

/** 函数求值：与后端 fnSpecs 语义对齐；不可安全求值 / 参数非法 → null */
export function evalBuiltin(name: string, args: EvalValue[]): EvalValue {
  const spec = FUNC_SPECS[name.toUpperCase()];
  if (!spec || spec.unsupported) return null;
  if (args.length < spec.minArgs || (spec.maxArgs >= 0 && args.length > spec.maxArgs)) return null;
  switch (spec.name) {
    // ---- 数学（数值上下文，null 传播） ----
    case "ABS": {
      const a = numOf(args[0]);
      return a === null ? null : Math.abs(a);
    }
    case "CEIL": {
      const a = numOf(args[0]);
      return a === null ? null : Math.ceil(a);
    }
    case "FLOOR": {
      const a = numOf(args[0]);
      return a === null ? null : Math.floor(a);
    }
    case "ROUND": {
      const a = numOf(args[0]);
      if (a === null) return null;
      if (args.length === 1) return Math.round(a);
      const d = numOf(args[1]);
      if (d === null) return null;
      const f = Math.pow(10, Math.trunc(d));
      return Math.round(a * f) / f;
    }
    case "SQRT": {
      const a = numOf(args[0]);
      return a === null || a < 0 ? null : Math.sqrt(a);
    }
    case "POW": {
      const a = numOf(args[0]);
      const b = numOf(args[1]);
      return a === null || b === null ? null : Math.pow(a, b);
    }
    case "GREATEST":
    case "LEAST": {
      const nums = args.map(numOf);
      if (nums.some((n) => n === null)) return null;
      const arr = nums as number[];
      return spec.name === "GREATEST" ? Math.max(...arr) : Math.min(...arr);
    }
    case "LENGTH": {
      return args[0] === null ? null : String(args[0]).length;
    }
    case "LOG": {
      const a = numOf(args[0]);
      if (a === null || a <= 0) return null;
      if (args.length === 1) return Math.log(a);
      const b = numOf(args[1]);
      if (b === null || b <= 0 || b === 1) return null;
      return Math.log(a) / Math.log(b);
    }
    // ---- 字符串 ----
    case "CONCAT": {
      if (args.some((a) => a === null)) return null; // MySQL CONCAT 遇 NULL → NULL
      return args.map(String).join("");
    }
    case "CONCAT_WS": {
      const sep = args[0];
      if (sep === null) return null;
      return args.slice(1).filter((a) => a !== null).map(String).join(String(sep));
    }
    case "LOWER": return args[0] === null ? null : String(args[0]).toLowerCase();
    case "UPPER": return args[0] === null ? null : String(args[0]).toUpperCase();
    case "TRIM": return args[0] === null ? null : String(args[0]).trim();
    case "REVERSE": return args[0] === null ? null : [...String(args[0])].reverse().join("");
    case "REPEAT": {
      if (args[0] === null) return null;
      const n = numOf(args[1]);
      if (n === null) return null;
      return String(args[0]).repeat(Math.max(0, Math.trunc(n)));
    }
    case "SUBSTR": {
      if (args[0] === null) return null;
      const s = String(args[0]);
      const start = numOf(args[1]);
      if (start === null) return null;
      let from = Math.trunc(start) - 1; // MySQL 1-based
      if (from < 0) from = Math.max(0, s.length + from + 1);
      if (args.length === 2) return s.slice(from) || null;
      const len = numOf(args[2]);
      if (len === null) return null;
      return s.slice(from, from + Math.max(0, Math.trunc(len))) || null;
    }
    case "INSTR": {
      if (args[0] === null || args[1] === null) return null;
      return String(args[0]).indexOf(String(args[1])) + 1; // MySQL 1-based，0=未找到
    }
    // ---- 逻辑 ----
    case "IF": return truthyOf(args[0]) ? args[1] : args[2];
    case "COALESCE": {
      for (const a of args) if (a !== null) return a;
      return null;
    }
    case "CASE_WHEN": {
      for (let i = 0; i + 1 < args.length; i += 2) {
        if (truthyOf(args[i])) return args[i + 1];
      }
      return args[args.length - 1] ?? null;
    }
    // ---- 日期时间（仅可解析日期值；不可解析 → null） ----
    case "YEAR": {
      const d = dateOf(args[0]);
      return d ? d.getFullYear() : null;
    }
    case "MONTH": {
      const d = dateOf(args[0]);
      return d ? d.getMonth() + 1 : null;
    }
    case "QUARTER": {
      const d = dateOf(args[0]);
      return d ? Math.floor(d.getMonth() / 3) + 1 : null;
    }
    case "DAYOFMONTH": {
      const d = dateOf(args[0]);
      return d ? d.getDate() : null;
    }
    case "DAYOFWEEK": {
      const d = dateOf(args[0]);
      return d ? d.getDay() + 1 : null; // MySQL 1=周日
    }
    case "WEEKOFYEAR": {
      const d = dateOf(args[0]);
      return d ? weekOfYear(d) : null;
    }
    case "HOUR": {
      const d = dateOf(args[0]);
      return d ? d.getHours() : null;
    }
    case "DATEDIFF": {
      const a = dateOf(args[0]);
      const b = dateOf(args[1]);
      if (!a || !b) return null;
      const da = new Date(a.getFullYear(), a.getMonth(), a.getDate());
      const db = new Date(b.getFullYear(), b.getMonth(), b.getDate());
      return Math.round((da.getTime() - db.getTime()) / 86400000);
    }
    case "DATE_ADD":
    case "DATE_SUB": {
      const d = dateOf(args[0]);
      if (!d) return null;
      const n = numOf(args[1]);
      if (n === null) return null;
      const out = new Date(d);
      out.setDate(out.getDate() + (spec.name === "DATE_ADD" ? Math.trunc(n) : -Math.trunc(n)));
      return fmtDate(out);
    }
    case "TO_DATE": {
      const d = dateOf(args[0]);
      return d ? fmtDate(d) : null;
    }
    case "LASTING_DAYS_TO_DATE": {
      const d = dateOf(args[0]);
      if (!d) return null;
      const now = new Date();
      const db = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dn = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return Math.round((dn.getTime() - db.getTime()) / 86400000);
    }
    case "NOW":
    case "CURRENT_DATE": {
      const now = new Date();
      return spec.name === "CURRENT_DATE" ? fmtDate(now) : fmtDateTime(now);
    }
    // ---- 聚合（小计上下文已由 exprHasAggCall 前置拦截；此处兜底：标量恒等 / 计数） ----
    case "SUM":
    case "AVG":
    case "MAX":
    case "MIN":
    case "COUNT_DISTINCT":
      return args.length === 1 ? args[0] : null;
    case "COUNT":
      return args.length === 1 ? (args[0] === null ? 0 : 1) : null;
    default:
      // COLLECT_LIST/SET、BASE64、REGEXP_*、SPLIT、DATE_TRUNC、FROM_UNIXTIME、RAND 等不可安全求值
      return null;
  }
}
