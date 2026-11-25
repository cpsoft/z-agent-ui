// [WHY] z-code-editor 零依赖轻量 tokenizer [[REQ-017-code-editor]] [2026-09-25] night-hawk:
// 单遍正则扫描 + 首条命中规则着色。能力边界：无嵌套上下文（模板串内不再细分、
// html 属性值内不区分语言），牺牲精确度换取体积与可维护性。所有输出经
// escapeHtml 转义，token 源文本永不原样进 innerHTML（见 tests 注入向量用例）。
import { escapeHtml } from "../../core/index.js";

export type CodeLanguage =
  | "auto" | "plain" | "js" | "ts" | "jsx" | "css" | "html" | "json" | "markdown" | "python" | "lua";

/** 规则：re 必须带 y（sticky）标志，cls 为 token 类名（plain 文本不标） */
interface Rule { re: RegExp; cls: string }

const R = (src: string, cls: string, flags = ""): Rule => ({ re: new RegExp(src, flags + "y"), cls });

// ── js / ts / jsx 共享语法 ────────────────────────────────
const JS_RULES: Rule[] = [
  R("/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/|//[^\\n]*", "tok-comment"),
  R("(?:'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"|`(?:\\\\.|[^`\\\\])*`)", "tok-string"),
  // jsx 标签：与注释/字符串区分后命中
  R("</?[A-Za-z][\\w.:-]*|/?>", "tok-tag"),
  R("\\b0[xXbBoO][\\da-fA-F_]+n?\\b|\\b\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?\\d+)?n?\\b", "tok-number"),
  R("\\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|async|await|yield|static|get|set|delete|void|debugger|with|as|implements|interface|type|enum|namespace|declare|readonly|public|private|protected|abstract|satisfies|keyof|infer|is)\\b", "tok-keyword"),
  R("\\b(?:true|false|null|undefined|NaN|Infinity)\\b", "tok-literal"),
  R("\\b[A-Za-z_$][\\w$]*(?=\\s*\\()", "tok-func"),
  R("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~]+", "tok-punct"),
];

const GRAMMARS: Record<Exclude<CodeLanguage, "auto" | "plain">, Rule[]> = {
  js: JS_RULES,
  ts: JS_RULES,
  jsx: JS_RULES,
  css: [
    R("/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/", "tok-comment"),
    R("(?:'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\")", "tok-string"),
    R("@[\\w-]+|!important\\b", "tok-keyword"),
    R("#[0-9a-fA-F]{3,8}\\b|-?\\b\\d[\\d_]*(?:\\.\\d+)?(?:px|em|rem|vh|vw|vmin|vmax|s|ms|deg|fr|pt|ch|ex|%)?\\b", "tok-number"),
    R("\\.[-\\w]+|#[-\\w]+|::?[a-zA-Z-]+", "tok-tag"),
    R("[-a-zA-Z_]+(?=\\s*:)", "tok-attr"),
    R("[{}();:,>~+*]", "tok-punct"),
  ],
  html: [
    R("<!--[\\s\\S]*?-->", "tok-comment"),
    R("<!DOCTYPE[^>]*>", "tok-keyword"),
    R("</?[a-zA-Z][\\w.:-]*", "tok-tag"),
    R("/?>", "tok-punct"),
    R("(?:'(?:[^'\\n])*'|\"(?:[^\"\\n])*\")", "tok-string"),
    R("[a-zA-Z_:@\\[\\)\\]][\\w:.@\\-\\(\\)]*(?=\\s*=)", "tok-attr"),
  ],
  json: [
    R("\"(?:\\\\.|[^\"\\\\])*\"(?=\\s*:)", "tok-attr"),
    R("\"(?:\\\\.|[^\"\\\\])*\"", "tok-string"),
    R("-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b", "tok-number"),
    R("\\b(?:true|false|null)\\b", "tok-literal"),
    R("[{}\\[\\],:]", "tok-punct"),
  ],
  markdown: [
    R("```[\\s\\S]*?```|~~~[\\s\\S]*?~~~", "tok-string"),
    R("^#{1,6}[^\\n]*", "tok-keyword", "m"),
    R("^>[^\\n]*", "tok-comment", "m"),
    R("\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__|\\*[^*\\n]+\\*|_[^_\\n]+_|`[^`\\n]+`", "tok-tag"),
    R("\\[[^\\]\\n]*\\]\\([^)\\n]*\\)", "tok-attr"),
    R("^[ \\t]*(?:[-*+]|\\d+\\.)\\s", "tok-punct", "m"),
  ],
  python: [
    R("#[^\\n]*", "tok-comment"),
    R("(?:'''[\\s\\S]*?'''|\"\"\"[\\s\\S]*?\"\"\")", "tok-string"),
    R("(?:'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\")", "tok-string"),
    R("@[\\w.]+", "tok-keyword"),
    R("\\b(?:def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|pass|break|continue|global|nonlocal|assert|yield|del|in|is|not|and|or|async|await|match|case)\\b", "tok-keyword"),
    R("\\b(?:True|False|None|self|cls)\\b", "tok-literal"),
    R("\\b0[xXbBoO][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?j?\\b", "tok-number"),
    R("\\b[A-Za-z_][\\w]*(?=\\s*\\()", "tok-func"),
    R("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~@]+", "tok-punct"),
  ],
  // [WHY] lua：长注释/长字符串用反向引用 \\1 闭合同级 = 号；nil/true/false 是保留字归 keyword
  lua: [
    R("--\\[(=*)\\[[\\s\\S]*?\\]\\1\\]", "tok-comment"),
    R("--[^\\n]*", "tok-comment"),
    R("\\[(=*)\\[[\\s\\S]*?\\]\\1\\]", "tok-string"),
    R("(?:'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\")", "tok-string"),
    R("\\b0[xX][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b", "tok-number"),
    R("\\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\\b", "tok-keyword"),
    R("\\b[A-Za-z_]\\w*(?=\\s*\\()", "tok-func"),
    R("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~#]+", "tok-punct"),
  ],
};

/**
 * 按 sticky 正则逐位置扫描，首条命中规则着色，未命中字符按 plain 累积。
 * 输出全部经 escapeHtml 转义。
 */
export function highlightCode(code: string, lang: CodeLanguage): string {
  const rules = lang === "auto" || lang === "plain" ? undefined : GRAMMARS[lang];
  if (!rules) return escapeHtml(code);
  let out = "";
  let plain = "";
  let i = 0;
  const flushPlain = () => {
    if (plain) {
      out += escapeHtml(plain);
      plain = "";
    }
  };
  while (i < code.length) {
    let matched = false;
    for (const rule of rules) {
      rule.re.lastIndex = i;
      const m = rule.re.exec(code);
      if (m && m[0].length > 0) {
        flushPlain();
        out += `<span class="${rule.cls}">${escapeHtml(m[0])}</span>`;
        i += m[0].length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      plain += code[i];
      i++;
    }
  }
  flushPlain();
  return out;
}

/**
 * 提取语言关键字/字面量表（自 keyword/literal 规则的 \b(?:a|b)\b 源码还原），
 * 供补全默认源。无此类规则的语言（css/html/markdown 等）返回 []。
 */
export function getKeywords(lang: CodeLanguage): string[] {
  const rules = lang === "auto" || lang === "plain" ? undefined : GRAMMARS[lang];
  if (!rules) return [];
  const out: string[] = [];
  for (const rule of rules) {
    if (rule.cls !== "tok-keyword" && rule.cls !== "tok-literal") continue;
    const m = /\\b\(\?:([^)]+)\)/.exec(rule.re.source);
    if (!m) continue;
    for (const w of m[1].split("|")) if (w) out.push(w);
  }
  return out;
}

/** 内容启发式语言检测：按特征强度排序，命中即返回 */
export function detectLanguage(code: string): CodeLanguage {
  const s = code.trimStart();
  if (!s) return "plain";
  if (/^#![^\n]*python/.test(s)) return "python";
  if (/^#![^\n]*lua\b/.test(s)) return "lua";
  if (/^#![^\n]*(?:bash|sh)\b/.test(s)) return "plain";
  if (/^<!DOCTYPE\s+html/i.test(s) || /^<html[\s>]/i.test(s)) return "html";
  if ((s.startsWith("{") || s.startsWith("[")) && /^[\s\S]*[\]}]\s*$/.test(s)) {
    try {
      JSON.parse(s);
      return "json";
    } catch {
      /* fallthrough */
    }
  }
  const head = s.slice(0, 4000);
  if (/^\s*(```|#{1,6}\s|>\s|\s*[-*+]\s)/m.test(code)) return "markdown";
  // [WHY] lua 检测先于 python：lua 方法体含 self 会被 python 的 self 特征抢判；
  // then\s*$ 要求 then 收行，规避 JS promise 链 .then( 误判；冒号方法定义
  // function obj:m() 是 lua 独有形式（JS 冒号无此用法）
  if (
    /\blocal\s/m.test(head) ||
    /\belseif\b/.test(head) ||
    /\bthen\s*$/.test(head) ||
    /\brepeat\b[\s\S]*\buntil\b/.test(head) ||
    /\bfunction\s+[\w.]+\s*:\s*[\w_]+\s*\(/.test(head)
  ) {
    return "lua";
  }
  if (/\b(?:def |elif |self\b|import \w+\nfrom )/.test(head) || /^\s*@\w+/m.test(head)) return "python";
  if (/\b(?:interface |type \w+ =|enum |implements |: (?:string|number|boolean|any|void|unknown)\b|<[A-Z]\w*(?:,|>))/.test(head)) return "ts";
  if (/(?:=>|\bconst |\blet |\bvar |\bfunction |\breturn |\bimport |\bexport default |\bclass |\bdocument\.|\bconsole\.)/.test(head)) return "js";
  if (/(?:^\s*[.#][\w-]+\s*\{|\s[a-z-]+\s*:\s*[^;{}]+;)/m.test(head) && !/=>/.test(head)) return "css";
  if (/<\/?[a-zA-Z][\s\S]*>/.test(head)) return "html";
  return "plain";
}
