// Test: z-json-viewer JSON 查看器（递归高亮/展开折叠/copy/行号/深度）
// Related: [[2026-08-11-W18-enterprise]]
// Wiki: wiki/planning/TASKS/2026-08-11-W18-enterprise/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/content/json-viewer/JsonViewer.js";
import { deepActiveElement } from "../../../src/core/index.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createViewer(data: unknown, props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-json-viewer") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  el.data = data; // attribute:false, 必须 JS 赋值
  document.body.appendChild(el);
  return el;
}

function text(el: any): string {
  // [WHY] 只取 .z-jv 内容: shadowRoot.textContent 含 <style> 注入的 CSS
  return el.shadowRoot!.querySelector(".z-jv")?.textContent ?? "";
}

describe("z-json-viewer", () => {
  it("renders primitives with type classes", async () => {
    const el = createViewer({ s: "hi", n: 42, b: true, x: null });
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector(".z-jv__string")!.textContent).toBe('"hi"');
    expect(shadow.querySelector(".z-jv__number")!.textContent).toBe("42");
    expect(shadow.querySelector(".z-jv__boolean")!.textContent).toBe("true");
    expect(shadow.querySelector(".z-jv__null")!.textContent).toBe("null");
    document.body.removeChild(el);
  });

  it("renders object keys and braces", async () => {
    const el = createViewer({ a: 1 });
    await flush();
    expect(text(el)).toContain('"a"');
    expect(text(el)).toContain("{");
    expect(text(el)).toContain("}");
    document.body.removeChild(el);
  });

  it("renders array with indexes", async () => {
    const el = createViewer([10, 20]);
    await flush();
    expect(text(el)).toContain("[");
    expect(text(el)).toContain("]");
    expect(text(el)).toContain("10");
    expect(text(el)).toContain("20");
    document.body.removeChild(el);
  });

  it("empty object/array renders inline", async () => {
    const el = createViewer({ o: {}, a: [] });
    await flush();
    expect(text(el)).toContain("{}");
    expect(text(el)).toContain("[]");
    document.body.removeChild(el);
  });

  it("toggle collapses and expands", async () => {
    const el = createViewer({ x: { b: 1 }, y: { c: 2 } });
    await flush();
    expect(text(el)).toContain("1");
    // 折叠根容器 → "2 项"（根有两个子键）,内部键 b 隐藏
    el.shadowRoot!.querySelector(".z-jv__toggle")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(text(el)).toContain("2 项");
    expect(text(el)).not.toContain("b");
    // 再点展开 → 内容回归
    el.shadowRoot!.querySelector(".z-jv__toggle")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(text(el)).toContain("1");
    document.body.removeChild(el);
  });

  it("collapsed attribute collapses first-level containers", async () => {
    const el = createViewer({ a: { b: 1 }, c: 2 }, { collapsed: 1 });
    await flush();
    // collapsed=1: depth>=1 的容器（键 a 的对象）默认折叠 → "1 项"
    expect(text(el)).toContain("1 项");
    expect(text(el)).not.toContain("b");
    document.body.removeChild(el);
  });

  it("max-depth collapses deep containers", async () => {
    const el = createViewer({ a: { b: { c: 1 } } }, { maxDepth: 1 });
    await flush();
    expect(text(el)).toContain("1 项");
    document.body.removeChild(el);
  });

  it("expandAll and collapseAll methods", async () => {
    const el = createViewer({ a: { b: { c: 99 } } });
    await flush();
    el.collapseAll();
    await flush();
    expect(text(el)).toContain("1 项");
    expect(text(el)).not.toContain("99");
    el.expandAll();
    await flush();
    expect(text(el)).toContain("99");
    document.body.removeChild(el);
  });

  it("copyable shows copy buttons and emits z-copy", async () => {
    const el = createViewer({ a: 1 }, { copyable: true });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-copy", handler);
    el.shadowRoot!.querySelector(".z-jv__copy")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ path: "a", value: 1 });
    document.body.removeChild(el);
  });

  it("show-line-numbers renders row numbers", async () => {
    const el = createViewer({ a: 1 });
    el.setAttribute("show-line-numbers", "");
    await flush();
    const nos = el.shadowRoot!.querySelectorAll(".z-jv__line-no");
    expect(nos.length).toBeGreaterThan(0);
    expect(nos[0].textContent).toBe("1");
    document.body.removeChild(el);
  });

  it("data change re-renders tree", async () => {
    const el = createViewer({ a: 1 });
    await flush();
    el.data = { b: 2 };
    await flush();
    expect(text(el)).toContain('"b"');
    expect(text(el)).not.toContain('"a"');
    document.body.removeChild(el);
  });
});

/**
 * 键盘与表达层（2026-11-16）。
 *
 * [WHY 单独一组] 这份测试原有 11 例，**一条键盘断言都没有** —— 于是「展开/折叠开关是
 * `<span role="button">`、没有 tabindex、没有名字」长期没被发现：鼠标点得动、视觉正常，
 * 而键盘用户根本聚焦不到它。这类「自称按钮却不可达」的形态，只有在真按键时才露馅。
 */
describe("z-json-viewer 键盘与无障碍", () => {
  /** 从**当前真实焦点**派发按键（往容器上 dispatch 的写法在焦点丢了之后照样通过）。 */
  function press(key: string): boolean {
    const target = (document.activeElement as Element) ?? document.body;
    const ev = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      composed: true,
      // 合成事件默认不可取消 ⇒ preventDefault() 静默失效，「有没有被消费」恒读 false
      cancelable: true,
    });
    return !target.dispatchEvent(ev);
  }

  function toggles(el: any): HTMLElement[] {
    return Array.from(el.shadowRoot!.querySelectorAll(".z-jv__toggle"));
  }

  it("J1 开关是原生 button，因此天然可聚焦（不再是 span[role=button]）", async () => {
    const el = createViewer({ a: 1 });
    await flush();
    const t = toggles(el)[0];
    expect(t.tagName).toBe("BUTTON");
    expect(t.getAttribute("type")).toBe("button");
    // 原生 button 在 Tab 序里；span 要靠手写 tabindex 才行，而原实现没写
    expect((t as HTMLButtonElement).disabled).toBe(false);
    el.shadowRoot!.querySelector(".z-jv__toggle")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    document.body.removeChild(el);
  });

  it("J2 名字说清「展开/折叠 哪一层」，而不是一个三角形符号", async () => {
    const el = createViewer({ a: { b: 1 } });
    await flush();
    const all = toggles(el);
    // 根容器 + 键 a 的容器
    expect(all.length).toBe(2);
    expect(all[0].getAttribute("aria-label")).toBe("折叠 根");
    expect(all[1].getAttribute("aria-label")).toBe("折叠 a");
    document.body.removeChild(el);
  });

  it("J3 aria-expanded 随状态翻转，名字也跟着换动作", async () => {
    const el = createViewer({ a: 1 });
    await flush();
    const root = () => toggles(el)[0];
    expect(root().getAttribute("aria-expanded")).toBe("true");
    expect(root().getAttribute("aria-label")).toBe("折叠 根");

    root().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(root().getAttribute("aria-expanded")).toBe("false");
    expect(root().getAttribute("aria-label")).toBe("展开 根");
    document.body.removeChild(el);
  });

  it("J4 ★ 连按两次都有效（重建后焦点必须找回，否则只能操作一次）", async () => {
    const el = createViewer({ a: { b: 1 } });
    await flush();
    const first = toggles(el)[0];
    first.focus();
    await flush();
    // 焦点在 shadow 内部时 document.activeElement 是宿主（retarget），穿透取
    expect(deepActiveElement()).toBe(first);

    first.click(); // 折叠
    await flush();
    expect(text(el)).toContain("1 项");

    const second = toggles(el)[0];
    expect(second, "requestUpdate 会整体重建 shadow，所以这是一个新节点").not.toBe(first);
    // ★ 这一条是核心：focus() 之后 shadow 被整块替换，新节点上若没有可找回的标识
    // （`data-focus-key`），焦点就落到 <body> —— 键盘用户按一次开关之后，第二次再按
    // 没有任何对象。判据用 `shadowRoot.activeElement`：那是 BaseElement 记录/恢复焦点时
    // 用的同一个口径；`document.activeElement` 在这里只会返回宿主，比不出真假。
    expect(
      (el.shadowRoot as ShadowRoot).activeElement,
      "折叠后焦点掉到 <body> ⇒ 键盘用户只能操作一次",
    ).toBe(second);
    expect(second.getAttribute("aria-label"), "找回的必须是对应的那一个新节点").toBe("展开 根");

    second.click(); // 展开
    await flush();
    expect(text(el)).toContain('"b"');
    document.body.removeChild(el);
  });

  it("J5 开关在 Tab 序里（tabIndex=0），且焦点真的能落上去", async () => {
    const el = createViewer({ x: { y: 1 } });
    await flush();
    const t = toggles(el)[0] as HTMLButtonElement;
    // 原来那个 <span> 的 tabIndex 是 **-1** —— 它连 Tab 序都不在，谈何键盘操作
    expect(t.tabIndex).toBe(0);
    t.focus();
    await flush();
    // 焦点在 shadow 内部时 document.activeElement 会被 retarget 到宿主（标准行为），
    // 必须穿透取 —— 直接比 document.activeElement 会恒等于 <z-json-viewer>
    expect(deepActiveElement()).toBe(t);
    document.body.removeChild(el);
  });

  it("J6 行号不进无障碍树（否则读屏会念一串与内容无关的数字）", async () => {
    const el = createViewer({ a: 1 });
    el.setAttribute("show-line-numbers", "");
    await flush();
    const nos = el.shadowRoot!.querySelectorAll(".z-jv__line-no");
    expect(nos.length).toBeGreaterThan(0);
    for (const n of Array.from(nos)) {
      expect(n.getAttribute("aria-hidden")).toBe("true");
    }
    document.body.removeChild(el);
  });

  it("J7 嵌套开关各自带自己的 path（名字不会都变成「根」）", async () => {
    const el = createViewer({ a: { b: { c: 1 } } });
    await flush();
    const names = toggles(el).map((t) => t.getAttribute("aria-label"));
    expect(new Set(names).size, "每个开关的名字必须唯一，否则读屏分不清在哪一层").toBe(names.length);
    expect(names).toContain("折叠 a.b");
    document.body.removeChild(el);
  });
});
