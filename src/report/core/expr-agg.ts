// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：聚合词法扫描与计算字段聚合传播（exprHasAggCall / aggKindOf / datasetComputedAggUsed）
// 依赖：funcs-spec、expr-parse（单向）

import { lookupFn } from "./funcs-spec.js";
import { extractFieldRefs, isIdentPart, isIdentStart } from "./expr-parse.js";

/** 判断表达式是否直接调用聚合函数（与后端 exprHasAggCall 一致，词法扫描跳过字符串与 [字段] 引用） */
export function exprHasAggCall(expr: string): boolean {
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const c = expr[i];
    if (c === "'" || c === '"') {
      const q = c;
      i++;
      while (i < n) {
        if (expr[i] === "\\" && i + 1 < n) { i += 2; continue; }
        if (expr[i] === q) {
          if (q === "'" && i + 1 < n && expr[i + 1] === "'") { i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
    } else if (c === "[") {
      const j = expr.indexOf("]", i);
      if (j < 0) return false;
      i = j + 1;
    } else if (isIdentStart(c)) {
      let start = i;
      while (i < n && isIdentPart(expr[i])) i++;
      const name = expr.slice(start, i);
      let k = i;
      while (k < n && (expr[k] === " " || expr[k] === "\t" || expr[k] === "\n" || expr[k] === "\r")) k++;
      if (k < n && expr[k] === "(") {
        const spec = lookupFn(name);
        if (spec && spec.agg) return true;
      }
    } else {
      i++;
    }
  }
  return false;
}

/**
 * 聚合种类分类（供分组表小计/总计汇总含聚合计算字段）：
 *  - 仅含 SUM/COUNT → "sum"（子级小计累加）；
 *  - 仅含 MIN → "min"；仅含 MAX → "max"（取极值）；
 *  - 含 AVG/COUNT_DISTINCT 等不可从子级重算的聚合，或 sum/min/max 混用 → null（小计显示 —）。
 * 词法扫描与 exprHasAggCall 一致（跳过字符串与 [字段] 引用）。
 */
export function aggKindOf(expr: string): "sum" | "min" | "max" | null {
  let sum = false;
  let min = false;
  let max = false;
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const c = expr[i];
    if (c === "'" || c === '"') {
      const q = c;
      i++;
      while (i < n) {
        if (expr[i] === "\\" && i + 1 < n) { i += 2; continue; }
        if (expr[i] === q) {
          if (q === "'" && i + 1 < n && expr[i + 1] === "'") { i += 2; continue; }
          i++;
          break;
        }
        i++;
      }
    } else if (c === "[") {
      const j = expr.indexOf("]", i);
      if (j < 0) return null;
      i = j + 1;
    } else if (isIdentStart(c)) {
      const start = i;
      while (i < n && isIdentPart(expr[i])) i++;
      const name = expr.slice(start, i).toUpperCase();
      let k = i;
      while (k < n && (expr[k] === " " || expr[k] === "\t" || expr[k] === "\n" || expr[k] === "\r")) k++;
      if (k < n && expr[k] === "(") {
        const spec = lookupFn(name);
        if (spec && spec.agg) {
          if (name === "SUM" || name === "COUNT") sum = true;
          else if (name === "MIN") min = true;
          else if (name === "MAX") max = true;
          else return null; // AVG / COUNT_DISTINCT 等无法从子级小计重算
        }
      }
    } else {
      i++;
    }
  }
  // 多类聚合同时出现（如 SUM + MAX）无法用单一操作汇总子级 → null
  if ((sum && (min || max)) || (min && max)) return null;
  if (sum) return "sum";
  if (min) return "min";
  if (max) return "max";
  return null;
}
export function datasetComputedAggUsed(
  fields: { name: string; computed?: boolean; expr?: string }[]
): Map<string, boolean> {
  const cfByKey = new Map<string, { name: string; computed?: boolean; expr?: string }>();
  for (const f of fields) {
    if (f.computed) cfByKey.set(f.name, f);
  }
  const memo = new Map<string, boolean>();

  function calc(name: string): boolean {
    if (memo.has(name)) return memo.get(name)!;
    const f = cfByKey.get(name);
    if (!f || !f.expr) { memo.set(name, false); return false; }
    // 先检查自身直接调用聚合函数
    let result = exprHasAggCall(f.expr);
    // 再检查引用的其他计算字段是否含聚合（DAG 传播）
    if (!result) {
      for (const ref of extractFieldRefs(f.expr)) {
        if (ref !== name && cfByKey.has(ref) && calc(ref)) { result = true; break; }
      }
    }
    memo.set(name, result);
    return result;
  }

  for (const name of cfByKey.keys()) calc(name);
  return memo;
}
