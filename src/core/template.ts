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
