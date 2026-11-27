// [WHY] 抽取自 Input/Textarea/NumberInput/Slider/Upload 五处完全相同的私有实现（2026-09-25 全项目去重）
// 仅用于手工拼接的 attribute/文本位置；html`` 模板内的插值不做自动转义，需转义处显式调用
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// [WHY 连单引号一起转义] 库内模板统一用双引号包裹属性，但消费者可能把它用在单引号属性里；
// 少转一个引号就是一条注入路径，多转一个字符没有任何代价（[[bug-20261025-xss-injection]]）
// [WHY 收 unknown] 修复 Gitee IKRAOT：`value` 允许从脚本绑定 number / Date（如 date 类型控件），
// 原签名 `s: string` 只挡住 TS，运行时就是 `s.replace is not a function`。
// null / undefined 产出空串而不是字面量 "null"，避免属性位置出现 `value="undefined"`。
export function escapeAttr(s: unknown): string {
  return escapeHtml(s == null ? "" : String(s)).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    const val = values[i];
    if (val === false || val === null || val === undefined) {
      result += "";
    } else if (Array.isArray(val)) {
      result += val.filter(v => v != null && v !== false).join("");
    } else {
      result += String(val);
    }
    result += strings[i + 1] ?? "";
  }
  return result;
}

const RAW_HTML = Symbol("zui.rawHtml");

/** 已信任的 HTML 片段标记：由 `safeHtml` 或显式 `unsafeHTML()` 产出，嵌套时不再二次转义。 */
export interface RawHtml {
  readonly [RAW_HTML]: true;
  readonly value: string;
  toString(): string;
}

/** 显式声明一段已净化或静态受控的 HTML，供 `safeHtml` 原样输出。 */
export function unsafeHTML(value: string): RawHtml {
  const s = value == null ? "" : String(value);
  return {
    [RAW_HTML]: true,
    value: s,
    toString: () => s,
  };
}

function isRawHtml(v: unknown): v is RawHtml {
  return typeof v === "object" && v !== null && RAW_HTML in v;
}

function renderSafePart(val: unknown): string {
  if (val === false || val === null || val === undefined) return "";
  if (isRawHtml(val)) return val.value;
  if (Array.isArray(val)) return val.map(renderSafePart).join("");
  return escapeAttr(val);
}

/**
 * 默认自动转义全部插值的模板标签（防 XSS）。
 *
 * - 普通字符串/数字/数组元素默认按 `escapeAttr` 转义（文本与属性位置均安全）；
 * - 嵌套的 `safeHtml` 与显式 `unsafeHTML(...)` 保持原样，不会二次转义；
 * - 可直接作为 `BaseElement.render()` 的返回值，也可经 `String(...)` 转为普通字符串。
 */
export function safeHtml(strings: TemplateStringsArray, ...values: unknown[]): RawHtml {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += renderSafePart(values[i]);
    result += strings[i + 1] ?? "";
  }
  return unsafeHTML(result);
}
