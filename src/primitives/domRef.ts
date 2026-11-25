/**
 * 把「id 或 CSS 选择器」解析成元素。
 *
 * [WHY 需要 try/catch] 这个字符串来自宿主属性（`<z-portal target>` / `<z-position anchor>`），
 * 内容不可控：`"门店 A"`、`"1号位"`、`"a]("` 都不是合法选择器，`document.querySelector`
 * 会抛 `DOMException: not a valid selector`。抛点落在 `connectedCallback` 里，
 * 于是元素**升级失败、整块不渲染**，控制台只留一行与业务毫无关系的选择器报错 ——
 * 用户看到的是「这个弹层不出现在该在的位置」，没人会想到去查 anchor 的写法。
 *
 * 解析失败返回 null：两个原语的调用方本来就按「找不到目标就什么都不做」处理，
 * 静默降级比抛异常好 —— 前者只丢一次定位，后者会让整个组件挂掉。
 *
 * 先按 id 查（最常见写法，且 `getElementById` 不看选择器语法），失败再当选择器试。
 * 不用 `CSS.escape` 包一层：`getElementById` 已经覆盖了「名字里有特殊字符」的主要场景，
 * 而 `CSS.escape` 会把 `#foo` / `.bar` 这类**选择器写法**转义成字面量，反而查不到。
 */
export function resolveDomRef(ref: string): HTMLElement | null {
  if (!ref) return null;
  const byId = document.getElementById(ref);
  if (byId) return byId;
  try {
    return document.querySelector<HTMLElement>(ref);
  } catch {
    return null;
  }
}
