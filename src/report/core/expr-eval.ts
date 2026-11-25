// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：递归下降求值器 ExprEval 与对外入口 evalDatasetExpr
// 依赖：expr-parse（词法常量）、expr-values、expr-builtins（单向，无环）

import { CMP_OPS, isIdentPart, isIdentStart } from "./expr-parse.js";
import { evalBuiltin } from "./expr-builtins.js";
import { type EvalValue, andVals, arithVals, cmpVals, numOf, orVals, truthyOf } from "./expr-values.js";

// ---- 运行时求值（前端小计/总计上下文） ----
// [WHY] 分组表小计/总计需在浏览器端重算报表级计算字段：后端只按叶子分组求值，
//   粗粒度组的小计无法下推 SQL，只能在前端用「小计环境（度量 key → 小计值）」重求值。
//   语法与后端 exprParser 完全一致；任何非法/无法求值 → null（保守，与后端 NULL 传播一致）。

/** 递归下降求值器（镜像后端 exprParser 结构；任何错误 → null） */
class ExprEval {
  src: string;
  pos = 0;
  env: Record<string, EvalValue>;

  constructor(src: string, env: Record<string, EvalValue>) {
    this.src = src;
    this.env = env;
  }

  private skipWS(): void {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") this.pos++;
      else return;
    }
  }

  private peek(): string {
    return this.pos < this.src.length ? this.src[this.pos] : "";
  }

  eof(): boolean {
    this.skipWS();
    return this.pos >= this.src.length;
  }

  private consumeKeyword(kw: string): boolean {
    this.skipWS();
    const rest = this.src.slice(this.pos);
    if (rest.length >= kw.length && rest.slice(0, kw.length).toLowerCase() === kw.toLowerCase()) {
      if (rest.length === kw.length || !isIdentPart(rest[kw.length])) {
        this.pos += kw.length;
        return true;
      }
    }
    return false;
  }

  private consumeCmpOp(): string | null {
    for (const op of CMP_OPS) {
      if (this.src.slice(this.pos, this.pos + op.length) === op) {
        this.pos += op.length;
        return op;
      }
    }
    return null;
  }

  // orExpr := andExpr (OR andExpr)*
  evalOr(): EvalValue {
    let v = this.evalAnd();
    for (;;) {
      this.skipWS();
      if (this.consumeKeyword("OR")) v = orVals(v, this.evalAnd());
      else return v;
    }
  }

  // andExpr := notExpr (AND notExpr)*
  evalAnd(): EvalValue {
    let v = this.evalNot();
    for (;;) {
      this.skipWS();
      if (this.consumeKeyword("AND")) v = andVals(v, this.evalNot());
      else return v;
    }
  }

  // notExpr := NOT notExpr | cmpExpr
  evalNot(): EvalValue {
    this.skipWS();
    if (this.consumeKeyword("NOT")) {
      const v = this.evalNot();
      return v === null ? null : truthyOf(v) ? 0 : 1;
    }
    return this.evalCmp();
  }

  // cmpExpr := addExpr (cmpOp addExpr)*
  evalCmp(): EvalValue {
    let v = this.evalAdd();
    for (;;) {
      this.skipWS();
      const op = this.consumeCmpOp();
      if (!op) return v;
      v = cmpVals(v, this.evalAdd(), op);
    }
  }

  // addExpr := mulExpr (('+'|'-') mulExpr)*
  evalAdd(): EvalValue {
    let v = this.evalMul();
    for (;;) {
      this.skipWS();
      const c = this.peek();
      if (c === "+" || c === "-") {
        this.pos++;
        v = arithVals(v, this.evalMul(), c);
        continue;
      }
      return v;
    }
  }

  // mulExpr := unary (('*'|'/'|'%') unary)*
  evalMul(): EvalValue {
    let v = this.evalUnary();
    for (;;) {
      this.skipWS();
      const c = this.peek();
      if (c === "*" || c === "/" || c === "%") {
        this.pos++;
        v = arithVals(v, this.evalUnary(), c);
        continue;
      }
      return v;
    }
  }

  // unary := ('-'|'+') unary | primary
  evalUnary(): EvalValue {
    this.skipWS();
    const c = this.peek();
    if (c === "-" || c === "+") {
      this.pos++;
      const v = this.evalUnary();
      const n = numOf(v);
      if (n === null) return null;
      return c === "-" ? -n : n;
    }
    return this.evalPrimary();
  }

  // primary := [field] | 'string' | (orExpr) | number | FUNC(...)
  evalPrimary(): EvalValue {
    this.skipWS();
    if (this.pos >= this.src.length) return null;
    const c = this.src[this.pos];
    if (c === "[") {
      const end = this.src.indexOf("]", this.pos);
      if (end < 0) return null;
      const name = this.src.slice(this.pos + 1, end).trim();
      this.pos = end + 1;
      if (!name) return null;
      return Object.prototype.hasOwnProperty.call(this.env, name) ? this.env[name] : null;
    }
    if (c === "'" || c === '"') return this.parseString();
    if (c === "(") {
      this.pos++;
      const v = this.evalOr();
      this.skipWS();
      if (this.peek() !== ")") return null;
      this.pos++;
      return v;
    }
    if ((c >= "0" && c <= "9") || c === ".") return this.parseNumber();
    if (isIdentStart(c)) return this.parseCall();
    return null; // 非法字符 → null
  }

  private parseNumber(): EvalValue {
    const re = /^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/;
    const m = re.exec(this.src.slice(this.pos));
    if (!m) return null;
    this.pos += m[0].length;
    return Number(m[0]);
  }

  private parseString(): EvalValue {
    const quote = this.src[this.pos];
    this.pos++;
    let out = "";
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === "\\" && this.pos + 1 < this.src.length) {
        out += this.src[this.pos + 1];
        this.pos += 2;
        continue;
      }
      if (c === quote) {
        this.pos++;
        if (quote === "'" && this.pos < this.src.length && this.src[this.pos] === "'") {
          out += "'";
          this.pos++;
          continue;
        }
        return out;
      }
      out += c;
      this.pos++;
    }
    return null; // 未闭合 → null
  }

  private parseCall(): EvalValue {
    const start = this.pos;
    while (this.pos < this.src.length && isIdentPart(this.src[this.pos])) this.pos++;
    const name = this.src.slice(start, this.pos);
    this.skipWS();
    if (this.peek() !== "(") return null; // 裸标识符非法（与后端一致：字段须 [x]）
    this.pos++; // '('
    const args: EvalValue[] = [];
    this.skipWS();
    if (this.peek() === ")") {
      this.pos++;
    } else {
      for (;;) {
        args.push(this.evalOr());
        this.skipWS();
        if (this.peek() === ",") {
          this.pos++;
          continue;
        }
        if (this.peek() === ")") {
          this.pos++;
          break;
        }
        return null;
      }
    }
    return evalBuiltin(name, args);
  }
}


/** 运行时求值：镜像后端 exprParser 语法；非法表达式 / 引用缺失 / 无法求值 → null（保守，仅前端小计/总计展示用） */
export function evalDatasetExpr(expr: string, env: Record<string, EvalValue>): EvalValue {
  if (expr.trim() === "") return null;
  const p = new ExprEval(expr, env);
  const v = p.evalOr();
  if (!p.eof()) return null;
  return v;
}
