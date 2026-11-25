// [WHY] z-code-editor 自动补全/参数提示纯函数 [[REQ-017-code-editor]] [2026-09-25] night-hawk:
// 与键盘逻辑同样抽为纯函数供单测（规避 happy-dom 合成选区怪癖）。数据源三层：
// 宿主 completions 回调（完全接管）> functions 注册表（函数元数据，补全+参数提示共用）
// > 内置默认（文档单词 + 语言关键字）。所有函数不做 DOM 操作。
import { type CodeLanguage, getKeywords } from "./highlight.js";

export interface CompletionItem {
  label: string;
  kind?: "keyword" | "function" | "variable" | "snippet" | "text";
  /** 右侧灰色说明 */
  detail?: string;
  /** 插入文本，缺省用 label */
  insert?: string;
  /** 参数名列表：非空时补全插入 "()" 且触发参数提示 */
  params?: string[];
  /** 参数提示底部说明 */
  desc?: string;
}

export interface CallContext {
  name: string;
  paramIndex: number;
}

export interface ApplyResult {
  text: string;
  selStart: number;
  selEnd: number;
}

/** 文档单词提取（去重保序，限量） */
export function extractWords(code: string, limit = 300): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of code.matchAll(/[A-Za-z_$][\w$]*/g)) {
    if (!seen.has(m[0])) {
      seen.add(m[0]);
      out.push(m[0]);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** 光标前的词前缀（\w$ 连续段） */
export function getWordPrefix(code: string, caret: number): string {
  let i = caret;
  while (i > 0 && /[\w$]/.test(code[i - 1])) i--;
  return code.slice(i, caret);
}

/** 前缀过滤：startsWith 优先、includes 兜底、与已输入完全相同的词不再推荐、去重限量 */
export function filterItems(items: CompletionItem[], prefix: string, limit = 50): CompletionItem[] {
  const p = prefix.toLowerCase();
  const starts: CompletionItem[] = [];
  const includes: CompletionItem[] = [];
  const seen = new Set<string>();
  for (const it of items) {
    if (!it?.label || seen.has(it.label)) continue;
    const l = it.label.toLowerCase();
    if (p && l === p) continue;
    if (p && !l.includes(p)) continue;
    seen.add(it.label);
    (l.startsWith(p) ? starts : includes).push(it);
    if (starts.length + includes.length >= limit) break;
  }
  return [...starts, ...includes];
}

/** 应用补全：替换光标前词前缀；函数项插入 "()" 且光标落括号内 */
export function applyCompletion(code: string, caret: number, item: CompletionItem): ApplyResult {
  let i = caret;
  while (i > 0 && /[\w$]/.test(code[i - 1])) i--;
  const insert = item.insert ?? item.label;
  const call = item.params?.length ? "()" : "";
  const text = code.slice(0, i) + insert + call + code.slice(caret);
  const selStart = i + insert.length + (call ? 1 : 0);
  return { text, selStart, selEnd: selStart };
}

/**
 * 向上扫描光标是否处于函数调用括号内（v1 简化：反向遇引号按字符串跳过，
 * 不解析块注释）。返回函数名（成员调用取末段）与当前参数序号（顶层逗号数）。
 */
export function findCallContext(code: string, caret: number): CallContext | null {
  let depth = 0;
  let commas = 0;
  let inStr: string | null = null;
  let open = -1;
  let i = caret - 1;
  while (i >= 0) {
    const ch = code[i];
    if (inStr) {
      if (ch === inStr) inStr = null;
      i--;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
      i--;
      continue;
    }
    if (ch === ")") {
      depth++;
      i--;
      continue;
    }
    if (ch === "(") {
      if (depth === 0) {
        open = i;
        break;
      }
      depth--;
      i--;
      continue;
    }
    if (depth === 0 && ch === ",") commas++;
    i--;
  }
  if (open < 0) return null;
  let j = open - 1;
  while (j >= 0 && /\s/.test(code[j])) j--;
  const end = j + 1;
  while (j >= 0 && /[\w$.:]/.test(code[j])) j--;
  // [WHY] 成员调用（obj.m / obj:m）取末段做注册表键，宿主按裸函数名注册
  const tail = code.slice(j + 1, end);
  const m = /[A-Za-z_$][\w$]*$/.exec(tail);
  if (!m) return null;
  return { name: m[0], paramIndex: commas };
}

/** 内置默认补全源：语言关键字/字面量（取自 tokenizer 规则）+ 文档单词 */
export function defaultItems(code: string, lang: CodeLanguage): CompletionItem[] {
  const kws = getKeywords(lang);
  const items: CompletionItem[] = kws.map((k) => ({ label: k, kind: "keyword" as const }));
  for (const w of extractWords(code)) items.push({ label: w, kind: "variable" as const });
  return items;
}
