// 模板字面量 helper：把带插值的 CSS 片段拼成普通字符串（不做转义、不做去重）。
//
// [现状：运行侧零使用] 2026-11-14 实测，全仓只有两处引用：`src/index.ts` 的导出、
// `tests/unit/core/css.test.ts`。组件的 `static styles` 一律是普通模板字符串。
//
// [为什么不删] 它在包主入口的导出清单里（`z-agent-ui` 的 13 个运行时符号之一），
// 删除属于破坏性改动；而它只有 8 行、无依赖、无副作用 —— 留着的维护成本近乎为零，
// 这个代价远小于发一次 break。这里标注现状，是为了让后来者知道
// 「没人用」是既有事实，不是他漏找了调用点。
//
// [如果要给它找用途] 唯一合理的场景是「拼出来的样式需要先做一次字符串处理」
// （去重、加前缀、压缩）。在当前实现里它等价于模板字符串本身，所以没有收益。
export function css(strings: TemplateStringsArray, ...values: unknown[]): string {
  let result = strings[0];
  for (let i = 0; i < values.length; i++) {
    result += String(values[i] ?? "");
    result += strings[i + 1] ?? "";
  }
  return result;
}
