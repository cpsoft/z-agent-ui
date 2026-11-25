// 属性收口期的**兼容读**：让一个旧 attribute 仍然能驱动新属性。
//
// [WHY 需要它] D-L1-2 把 `variant` 收口成 `tone` / `shape` 时，存量页面与业务代码
// 写的是旧名字。一刀切改名会让它们**静默退回默认值** —— 不报错、不告警，只是颜色/形状不对，
// 正是 `[[bug-20260902-ce-kebab-attr-miss]]` 那一类最难查的缺陷。
// 所以要有一段「读旧名、写新名」的窗口期：本文件提供读旧名所需的**观察注册**，
// 取值映射由组件的 `attributeChangedCallback` 自己做（各组件旧值域不同，不能一刀切）。
//
// [WHY 不能直接写 `static get observedAttributes()`] `@property` 装饰器在**类定义期**
// 给子类 ctor 装了 `observedAttributes` 的 getter（见 `BaseElement` 顶部注释与
// `tests/unit/core/decorators.test.ts`）。在类体里再写一个静态 getter，谁覆盖谁取决于
// 装饰器执行顺序 —— 那是一个「今天能跑、改一次编译配置就静默失效」的依赖。
// 这里改成**类定义之后**追加：读一次装饰器算出的名单，再装一个合并后的 getter。
//
// [契约] 必须在 `customElements.define()` 之前调用。定义之后再改，浏览器已经缓存了
// 观察名单，新加的 attribute 永远不会触发回调（且不报错）。
export function observeLegacyAttribute(ctor: CustomElementConstructor, attr: string): void {
  const base = (ctor as unknown as { observedAttributes?: string[] }).observedAttributes ?? [];
  if (base.includes(attr)) return;

  const merged = [...base, attr];
  Object.defineProperty(ctor, "observedAttributes", {
    get: () => merged,
    configurable: true,
  });
}

/**
 * 把旧 attribute 映射出的值**同时写到属性与属性值上**。
 *
 * [WHY 不能只 `this.tone = x`] `applyPropertyMeta`（安装 property 访问器的地方）是在
 * `connectedCallback` 里跑的，而 `attributeChangedCallback` 在元素**升级时、还没连接**就可能先跑。
 * 那一刻 `this.tone = x` 只是给实例加了个普通字段：属性值后来被 `applyPropertyMeta`
 * 当成「字段默认值」收下，**但 `tone` 这个 attribute 从来没被写出来**。
 * 结果：JS 读 `el.tone` 是对的，CSS 的 `:host([tone=…])` 匹配不到 → 渲染成默认样式。
 * 这类「值对了、样子不对」比彻底坏掉更难查 —— 2026-11-15 的按钮收口就是这样被浏览器实测抓到的。
 *
 * 所以这里两个都写：连接后是赋值（无闪烁），连接前是 setAttribute（撑到 applyPropertyMeta 读属性）。
 */
export function syncAlias(
  el: HTMLElement,
  prop: string,
  attr: string,
  value: string,
): void {
  (el as unknown as Record<string, unknown>)[prop] = value;
  if (el.getAttribute(attr) !== value) el.setAttribute(attr, value);
}
