// 轻量零依赖 DOM 差量更新（morphdom 思路）。
//
// [WHY 需要它] `shadow.innerHTML = rendered` 每次更新都会销毁并重建整棵影子树，
// 导致焦点丢失、滚动位重置、子组件反复 disconnect/connect、入场动画重播。
// `morphChildren` 在保留 `render(): string` 写法的前提下，按 `data-key` / `id` 与节点位置
// 原地修补属性、文本和子节点，复用既有 DOM 节点。
//
// [使用方式] 组件类声明 `static morph = true`，`BaseElement.performUpdate` 会在首帧之后的
// 更新走 `morphChildren`；也可以在任意容器（如列表区）直接调用 `morphChildren(container, html)`。

function keyOf(node: Node): string | null {
  if (node.nodeType !== 1) return null;
  const el = node as Element;
  return el.getAttribute("data-key") || el.getAttribute("id") || null;
}

function sameNode(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType) return false;
  if (a.nodeType === 1) {
    const ea = a as Element;
    const eb = b as Element;
    return ea.tagName === eb.tagName && ea.namespaceURI === eb.namespaceURI;
  }
  return true;
}

function syncAttributes(from: Element, to: Element): void {
  // 移除旧节点多余的 attribute
  const fromAttrs = from.attributes;
  for (let i = fromAttrs.length - 1; i >= 0; i--) {
    const name = fromAttrs[i].name;
    if (!to.hasAttribute(name)) {
      from.removeAttribute(name);
    }
  }
  // 写入新增或变更的 attribute
  const toAttrs = to.attributes;
  for (let i = 0; i < toAttrs.length; i++) {
    const { name, value } = toAttrs[i];
    if (from.getAttribute(name) !== value) {
      from.setAttribute(name, value);
    }
  }
  // 同步表单控件的运行期属性（attribute 改了不会自动改 live value/checked）
  if (from.tagName === "INPUT") {
    const fi = from as HTMLInputElement;
    const ti = to as HTMLInputElement;
    if (fi.checked !== ti.checked) fi.checked = ti.checked;
    if (fi.value !== ti.value) fi.value = ti.value;
  } else if (from.tagName === "TEXTAREA") {
    const ft = from as HTMLTextAreaElement;
    const tt = to as HTMLTextAreaElement;
    if (ft.value !== tt.value) ft.value = tt.value;
  } else if (from.tagName === "OPTION") {
    const fo = from as HTMLOptionElement;
    const toOpt = to as HTMLOptionElement;
    if (fo.selected !== toOpt.selected) fo.selected = toOpt.selected;
  }
}

function morphNode(from: Node, to: Node): void {
  if (from.nodeType === 3 || from.nodeType === 8) {
    if (from.nodeValue !== to.nodeValue) {
      from.nodeValue = to.nodeValue;
    }
    return;
  }
  if (from.nodeType === 1 && to.nodeType === 1) {
    syncAttributes(from as Element, to as Element);
    morphChildList(from as Element, to as Element);
  }
}

function morphChildList(fromParent: ParentNode, toParent: ParentNode): void {
  // 为旧子节点建立 keyed 查找表
  const keyed = new Map<string, Node>();
  for (let cur = fromParent.firstChild; cur; cur = cur.nextSibling) {
    const k = keyOf(cur);
    if (k && !keyed.has(k)) keyed.set(k, cur);
  }

  let curFrom = fromParent.firstChild;
  const toNodes = Array.from(toParent.childNodes);

  for (const toChild of toNodes) {
    const toKey = keyOf(toChild);
    let matched: Node | null = null;

    if (toKey && keyed.has(toKey)) {
      const candidate = keyed.get(toKey)!;
      if (sameNode(candidate, toChild)) {
        matched = candidate;
        keyed.delete(toKey);
      }
    } else if (curFrom && !keyOf(curFrom) && sameNode(curFrom, toChild)) {
      matched = curFrom;
    }

    if (matched) {
      if (matched === curFrom) {
        curFrom = curFrom.nextSibling;
      } else {
        fromParent.insertBefore(matched, curFrom);
      }
      morphNode(matched, toChild);
    } else {
      // 未命中可复用节点：直接插入新节点
      fromParent.insertBefore(toChild, curFrom);
    }
  }

  // 清理尾部多余的旧节点
  while (curFrom) {
    const next = curFrom.nextSibling;
    fromParent.removeChild(curFrom);
    curFrom = next;
  }
}

/** 将 `html` 差量更新到 `target` 的子节点中，尽可能复用现有 DOM 节点。 */
export function morphChildren(target: ParentNode, html: string): void {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  morphChildList(target, tpl.content);
}
