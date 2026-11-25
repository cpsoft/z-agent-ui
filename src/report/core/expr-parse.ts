// [WHY] 2026-10-25 系统审计：从 report-funcs.ts（1149 行）按职责拆出，原文件超 600 行硬上限
// 职责：表达式校验（词法常量、计算字段 key/字段引用提取、递归下降校验器 ExprValidator）
// 依赖：funcs-spec（单向）

import { fnNames, lookupFn } from "./funcs-spec.js";

/** 计算字段 key 正则（^[A-Za-z_][A-Za-z0-9_]*$，与后端 cfKeyRe 一致） */
export const CF_KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** 生成计算字段 key：中文 → pinyin 首字母不可能（前端无拼音库），用 cf_ 前缀 + 时间戳 */
export function genCfKey(name: string): string {
  // 如果已是合法 ASCII 标识符，直接用
  if (CF_KEY_RE.test(name)) return name;
  // 中文/非 ASCII → cf_ + base36 时间戳（保证唯一性与合法性）
  return "cf_" + Date.now().toString(36);
}

/** 提取表达式中的 [字段名] 引用（与后端 extractFieldRefs 一致） */
export function extractFieldRefs(expr: string): string[] {
  const refs: string[] = [];
  const seen = new Set<string>();
  const re = /\[([^\[\]]*)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(expr))) {
    const name = m[1].trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      refs.push(name);
    }
  }
  return refs;
}

/** 比较运算符（最长匹配优先，与后端 cmpOps 一致） */
export const CMP_OPS = [">=", "<=", "!=", "<>", "==", ">", "<", "="];

/** 判断字符是否为标识符起始字符 */
export function isIdentStart(c: string): boolean {
  return c === "_" || (c >= "A" && c <= "Z") || (c >= "a" && c <= "z");
}

/** 判断字符是否为标识符组成部分 */
export function isIdentPart(c: string): boolean {
  return isIdentStart(c) || (c >= "0" && c <= "9");
}

/**
 * 表达式校验：镜像后端 compileDatasetExpr 的语法/白名单/参数个数/字段存在性检查。
 * 返回错误信息（空串 = 合法）。
 *
 * @param expr 用户表达式
 * @param fields 可用字段名集合（物理列 + 计算字段 key）
 * @param allowAgg 是否允许聚合函数（度量 = true；维度/筛选/排序/明细 = false）
 */
export function validateDatasetExpr(expr: string, fields: Set<string>, allowAgg: boolean): string {
  if (expr.trim() === "") return "表达式为空，例如 SUM([销量]) * 1.13";
  const p = new ExprValidator(expr, fields, allowAgg);
  const err = p.parseOr();
  if (err) return err;
  if (!p.eof()) return `表达式含无法解析的内容「${p.peekText()}」（位置 ${p.pos}）`;
  if (!p.hit) return "表达式为空，例如 SUM([销量]) * 1.13";
  return "";
}

// ---- 递归下降校验器（镜像后端 exprParser） ----

class ExprValidator {
  src: string;
  pos = 0;
  fields: Set<string>;
  allowAgg: boolean;
  hit = false; // 是否消费了任何有效 token

  constructor(src: string, fields: Set<string>, allowAgg: boolean) {
    this.src = src;
    this.fields = fields;
    this.allowAgg = allowAgg;
  }

  eof(): boolean {
    this.skipWS();
    return this.pos >= this.src.length;
  }

  peekText(): string {
    return this.pos < this.src.length ? this.src.slice(this.pos) : "";
  }

  skipWS(): void {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") this.pos++;
      else return;
    }
  }

  // orExpr := andExpr (OR andExpr)*
  parseOr(): string {
    let err = this.parseAnd();
    if (err) return err;
    for (;;) {
      this.skipWS();
      if (this.consumeKeyword("OR")) {
        this.hit = true;
        err = this.parseAnd();
        if (err) return err;
        continue;
      }
      return "";
    }
  }

  // andExpr := notExpr (AND notExpr)*
  parseAnd(): string {
    let err = this.parseNot();
    if (err) return err;
    for (;;) {
      this.skipWS();
      if (this.consumeKeyword("AND")) {
        this.hit = true;
        err = this.parseNot();
        if (err) return err;
        continue;
      }
      return "";
    }
  }

  // notExpr := NOT notExpr | cmpExpr
  parseNot(): string {
    this.skipWS();
    if (this.consumeKeyword("NOT")) {
      this.hit = true;
      return this.parseNot();
    }
    return this.parseCmp();
  }

  // cmpExpr := addExpr (cmpOp addExpr)*
  parseCmp(): string {
    let err = this.parseAdd();
    if (err) return err;
    for (;;) {
      this.skipWS();
      const op = this.consumeCmpOp();
      if (!op) return "";
      this.hit = true;
      err = this.parseAdd();
      if (err) return err;
    }
  }

  consumeCmpOp(): string | null {
    for (const op of CMP_OPS) {
      if (this.src.slice(this.pos, this.pos + op.length) === op) {
        this.pos += op.length;
        return op;
      }
    }
    return null;
  }

  // addExpr := mulExpr (('+'|'-') mulExpr)*
  parseAdd(): string {
    let err = this.parseMul();
    if (err) return err;
    for (;;) {
      this.skipWS();
      const c = this.src[this.pos];
      if (c === "+" || c === "-") {
        this.hit = true;
        this.pos++;
        err = this.parseMul();
        if (err) return err;
        continue;
      }
      return "";
    }
  }

  // mulExpr := unary (('*'|'/'|'%') unary)*
  parseMul(): string {
    let err = this.parseUnary();
    if (err) return err;
    for (;;) {
      this.skipWS();
      const c = this.src[this.pos];
      if (c === "*" || c === "/" || c === "%") {
        this.hit = true;
        this.pos++;
        err = this.parseUnary();
        if (err) return err;
        continue;
      }
      return "";
    }
  }

  // unary := ('-'|'+') unary | primary
  parseUnary(): string {
    this.skipWS();
    const c = this.src[this.pos];
    if (c === "-" || c === "+") {
      this.hit = true;
      this.pos++;
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  // primary := [field] | 'string' | (orExpr) | number | FUNC(...)
  parsePrimary(): string {
    this.skipWS();
    if (this.pos >= this.src.length) {
      return "表达式意外结束（可能缺少操作数或括号不匹配）";
    }
    const c = this.src[this.pos];
    if (c === "[") return this.parseField();
    if (c === "'" || c === '"') return this.parseString();
    if (c === "(") {
      this.pos++;
      const err = this.parseOr();
      if (err) return err;
      this.skipWS();
      if (this.pos >= this.src.length || this.src[this.pos] !== ")") {
        return "括号不匹配：缺少右括号 )";
      }
      this.pos++;
      this.hit = true;
      return "";
    }
    if ((c >= "0" && c <= "9") || c === ".") return this.parseNumber();
    if (isIdentStart(c)) return this.parseIdentOrCall();
    return `非法字符「${c}」（位置 ${this.pos}）`;
  }

  parseField(): string {
    const end = this.src.indexOf("]", this.pos);
    if (end < 0) return "字段引用缺少右括号 ]";
    const name = this.src.slice(this.pos + 1, end).trim();
    this.pos = end + 1;
    if (!name) return "字段引用为空：[] 中须填写字段名";
    if (!this.fields.has(name)) {
      const avail = [...this.fields].sort().join("、");
      return `字段 [${name}] 不存在（可用字段：${avail || "无"}）`;
    }
    this.hit = true;
    return "";
  }

  parseString(): string {
    const quote = this.src[this.pos];
    this.pos++;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === "\\" && this.pos + 1 < this.src.length) {
        this.pos += 2;
        continue;
      }
      if (c === quote) {
        // 单引号 '' 转义
        if (quote === "'" && this.pos + 1 < this.src.length && this.src[this.pos + 1] === "'") {
          this.pos += 2;
          continue;
        }
        this.pos++;
        this.hit = true;
        return "";
      }
      this.pos++;
    }
    return "字符串字面量未闭合（缺少结束引号）";
  }

  parseNumber(): string {
    const re = /^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/;
    const m = re.exec(this.src.slice(this.pos));
    if (!m) return `非法数字（位置 ${this.pos}）`;
    this.pos += m[0].length;
    this.hit = true;
    return "";
  }

  consumeKeyword(kw: string): boolean {
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

  parseIdentOrCall(): string {
    const start = this.pos;
    while (this.pos < this.src.length && isIdentPart(this.src[this.pos])) this.pos++;
    const name = this.src.slice(start, this.pos);
    this.skipWS();
    if (this.pos >= this.src.length || this.src[this.pos] !== "(") {
      return `标识符「${name}」不是函数（函数须以 () 调用，如 ${name}(...)；字段引用请用 [${name}]）`;
    }
    const spec = lookupFn(name);
    if (!spec) {
      return `函数 ${name.toUpperCase()} 不在白名单中（可用：${fnNames().join("、")}）`;
    }
    // 消费 (
    this.pos++;
    const args: string[] = []; // 用空串占位（前端不生成 SQL，只校验）
    this.skipWS();
    if (this.pos < this.src.length && this.src[this.pos] === ")") {
      this.pos++;
    } else {
      for (;;) {
        const err = this.parseOr();
        if (err) return err;
        args.push("");
        this.skipWS();
        if (this.pos >= this.src.length) {
          return `函数 ${spec.name} 参数括号不匹配：缺少右括号 )`;
        }
        if (this.src[this.pos] === ",") { this.pos++; continue; }
        if (this.src[this.pos] === ")") { this.pos++; break; }
        return `函数 ${spec.name} 参数间缺少逗号或右括号（位置 ${this.pos}）`;
      }
    }
    // 参数个数校验（先解析参数后校验，与后端一致）
    if (args.length < spec.minArgs || (spec.maxArgs >= 0 && args.length > spec.maxArgs)) {
      let range: string;
      if (spec.maxArgs >= 0) {
        range = spec.maxArgs !== spec.minArgs ? `${spec.minArgs}~${spec.maxArgs}` : `${spec.minArgs}`;
      } else {
        range = `≥${spec.minArgs}`;
      }
      return `函数 ${spec.name} 参数个数错误：期望 ${range} 个，实际 ${args.length} 个`;
    }
    // CASE_WHEN 特判：需奇数个参数（条件/结果成对 + 默认值），与后端 compileCaseWhen 一致
    if (spec.name === "CASE_WHEN" && args.length % 2 === 0) {
      return `函数 CASE_WHEN 参数个数错误：期望奇数个（条件, 结果, ..., 默认值），实际 ${args.length} 个`;
    }
    // 聚合函数上下文校验
    if (spec.agg && !this.allowAgg) {
      return `聚合函数 ${spec.name} 不能用于当前上下文（仅度量支持聚合；维度/筛选/排序/明细字段请用行级函数）`;
    }
    if (spec.unsupported) {
      return `函数 ${spec.name} 暂不支持在 MySQL 后端执行（仅兼容前端函数目录）`;
    }
    this.hit = true;
    return "";
  }
}
