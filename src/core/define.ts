// 幂等注册自定义元素：已注册时跳过，避免重复打包 / 微前端 / HMR 下 customElements.define 抛错。
//
// [WHY 不进 core/public.ts] `l0-boundary-guard` 明确禁止主入口 `z-agent-ui` 的闭包里出现
// `customElements.define`（确保只引 core 不会附带任何注册副作用）。因此只从 `core/index.ts`
// 导出给库内组件使用；需要时也可通过 `z-agent-ui/core/define` 按需引入。

export function defineElement(
  tag: string,
  ctor: CustomElementConstructor,
  options?: ElementDefinitionOptions,
): void {
  if (typeof customElements === "undefined") return;
  if (customElements.get(tag)) return;
  customElements.define(tag, ctor, options);
}
