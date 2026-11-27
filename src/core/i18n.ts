// 运行时国际化：locale 注册表、取值 `t()`、切换广播。零依赖。
//
// [模型] 一个全局当前 locale + 若干已注册语言包。取值按回退链查找：
//   当前 locale（如 `en-US`）→ 其基础语言（`en`）→ 默认语言 `zh-CN` → 键名本身。
// 默认语言包（zh-CN）随本模块装载，所以「什么都不配」的宿主得到的是完整中文界面。
//
// [WHY 全局而不是每个元素一个 locale] 第一步只解决「整个应用切语言」。元素级覆盖
// （`<z-config-provider locale>` / 祖先 `lang`）会在这个注册表之上加一层解析，
// 不改变 `t()` 的签名。
//
// [切换如何生效] `setLocale` 广播一次；`BaseElement` 统一订阅，对已连接的元素
// 刷新「仍是默认值的文案属性」并 requestUpdate。宿主显式设置过的属性不受影响。

import { zhCN, type MessageKey } from "./locales/zh-CN.js";

/** 一份语言包：键 → 文案。允许只给一部分键（缺的沿回退链取）。 */
export type Messages = Partial<Record<MessageKey, string>> & Record<string, string>;

/** 插值参数。 */
export type MessageParams = Record<string, string | number>;

/** 默认语言，也是回退链的终点。 */
export const DEFAULT_LOCALE = "zh-CN";

const packs = new Map<string, Record<string, string>>([[DEFAULT_LOCALE, { ...zhCN }]]);
let current = DEFAULT_LOCALE;
let version = 0;
const listeners = new Set<(locale: string) => void>();
/** 文案 → 键 的反查表（跨所有已注册语言包），语言包变化时作废。 */
let reverse: Map<string, MessageKey> | null = null;

/** 规范化 locale 标签（`en-us` → `en-US`）；不合法时原样返回去空白后的值。 */
function canonical(locale: string): string {
  const raw = String(locale ?? "").trim();
  if (!raw) return DEFAULT_LOCALE;
  try {
    return Intl.getCanonicalLocales(raw)[0] ?? raw;
  } catch {
    return raw;
  }
}

/** 回退链：`en-US` → `en` → `zh-CN`（去重）。 */
export function localeChain(locale: string = current): string[] {
  const chain = [canonical(locale)];
  const base = chain[0].split("-")[0];
  if (base && base !== chain[0]) chain.push(base);
  if (!chain.includes(DEFAULT_LOCALE)) chain.push(DEFAULT_LOCALE);
  return chain;
}

function notify(): void {
  version++;
  for (const fn of [...listeners]) {
    try {
      fn(current);
    } catch (err) {
      // 一个订阅者抛错不能让其余元素停在旧语言
      console.error("[i18n] locale listener failed:", err);
    }
  }
}

/**
 * 注册（或增量合并）一份语言包。
 * 若它在当前回退链上，已连接的组件会立即刷新。
 */
export function registerMessages(locale: string, messages: Messages): void {
  const key = canonical(locale);
  packs.set(key, { ...packs.get(key), ...messages });
  reverse = null;
  if (localeChain().includes(key)) notify();
}

/**
 * 切换当前语言。可同时传入该语言的语言包（等价于先 `registerMessages` 再切换）。
 *
 * ```js
 * import enUS from "@cpsoft13/z-agent-ui/locales/en-US";
 * setLocale("en-US", enUS);
 * ```
 */
export function setLocale(locale: string, messages?: Messages): void {
  const key = canonical(locale);
  if (messages) {
    packs.set(key, { ...packs.get(key), ...messages });
    reverse = null;
  }
  if (key === current && !messages) return;
  current = key;
  notify();
}

/** 当前语言（规范化后的 BCP 47 标签）。 */
export function getLocale(): string {
  return current;
}

/** 每次语言或当前链上的语言包变化都会 +1；用于判断某个元素是否错过了切换。 */
export function localeVersion(): number {
  return version;
}

/** 订阅语言切换；返回取消订阅函数。 */
export function onLocaleChange(fn: (locale: string) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** 回退链上是否有这条文案。 */
export function hasMessage(key: string, locale: string = current): boolean {
  return localeChain(locale).some((l) => packs.get(l)?.[key] !== undefined);
}

/**
 * 取一条文案。
 *
 * - 不传 `params`：原样返回模板（`COPY.*` 走这条，保持旧行为）。
 * - 传 `params`：替换 `{name}`；支持复数子集
 *   `{count, plural, =0 {none} one {# item} other {# items}}`（`#` 按当前语言格式化）。
 * - 整条链都查不到：返回键名本身（界面上能一眼看出漏翻，而不是一片空白）。
 */
export function t(key: MessageKey | (string & {}), params?: MessageParams): string {
  for (const l of localeChain()) {
    const v = packs.get(l)?.[key];
    if (v !== undefined) return params ? interpolate(v, params, l) : v;
  }
  return key;
}

/**
 * 文案 → 键 的反查（跨所有已注册语言包）。
 *
 * [用途] 组件属性的默认值形如 `closeLabel = COPY.close`，构造时已求值成字符串。
 * 切换语言时要知道「这个属性当前的值是不是某条文案的默认值」才能跟着换 ——
 * 词表的值在每个语言包内唯一（`copy-guard` C4 / `locale-pack-guard` 守住），反查无歧义。
 */
export function messageKeyOf(value: string): MessageKey | undefined {
  if (!reverse) {
    reverse = new Map();
    for (const pack of packs.values()) {
      for (const [k, v] of Object.entries(pack)) {
        if (k in zhCN && !reverse.has(v)) reverse.set(v, k as MessageKey);
      }
    }
  }
  return reverse.get(value);
}

// ── 插值 ────────────────────────────────────────────────

const pluralCache = new Map<string, Intl.PluralRules>();
function pluralRules(locale: string): Intl.PluralRules {
  let pr = pluralCache.get(locale);
  if (!pr) {
    try {
      pr = new Intl.PluralRules(locale);
    } catch {
      pr = new Intl.PluralRules(DEFAULT_LOCALE);
    }
    pluralCache.set(locale, pr);
  }
  return pr;
}

/** 从 `open`（指向 `{`）找到配对的 `}`；找不到返回 -1。 */
function matchBrace(s: string, open: number): number {
  let depth = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === "{") depth++;
    else if (s[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function interpolate(tpl: string, params: MessageParams, locale: string): string {
  let out = "";
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf("{", i);
    if (open < 0) {
      out += tpl.slice(i);
      break;
    }
    const close = matchBrace(tpl, open);
    if (close < 0) {
      out += tpl.slice(i);
      break;
    }
    out += tpl.slice(i, open);
    out += renderArg(tpl.slice(open + 1, close), params, locale);
    i = close + 1;
  }
  return out;
}

function renderArg(body: string, params: MessageParams, locale: string): string {
  const plural = /^\s*(\w+)\s*,\s*plural\s*,([\s\S]*)$/.exec(body);
  if (!plural) {
    const name = body.trim();
    const v = params[name];
    return v === undefined || v === null ? "" : String(v);
  }
  const n = Number(params[plural[1]]);
  const options = new Map<string, string>();
  const spec = plural[2];
  const re = /\s*(=\d+|\w+)\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(spec))) {
    const open = m.index + m[0].length - 1;
    const close = matchBrace(spec, open);
    if (close < 0) break;
    options.set(m[1], spec.slice(open + 1, close));
    re.lastIndex = close + 1;
  }
  const branch =
    options.get(`=${n}`) ?? options.get(Number.isFinite(n) ? pluralRules(locale).select(n) : "other") ?? options.get("other") ?? "";
  const num = Number.isFinite(n) ? new Intl.NumberFormat(locale).format(n) : "";
  return interpolate(branch.replace(/#/g, num), params, locale);
}

/** 仅测试用：恢复到「只有默认语言包、当前为默认语言」的初始状态（会广播一次）。 */
export function __resetI18nForTest(): void {
  packs.clear();
  packs.set(DEFAULT_LOCALE, { ...zhCN });
  reverse = null;
  current = DEFAULT_LOCALE;
  notify();
}
