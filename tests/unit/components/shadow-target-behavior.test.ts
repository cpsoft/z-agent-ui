// 影子边界的行为回归：点内层元素必须真的生效。
//
// Related: [[REQ-056-shadow-target-audit]] · tests/unit/shadow-target-guard.test.ts（静态那条）
// Date: 2026-11-24
//
// [为什么这里要手工伪造 composedPath] jsdom **不实现**跨 shadow 边界的事件重定向：
// `btn.click()` 冒泡到宿主时 `e.target` 仍是 `btn`，于是 `closest("[data-key]")` 能命中，
// 断言全绿 —— 而真浏览器里 target 已经换成宿主，同一行代码恒 null。2026-11-24 的审计
// 就是靠真浏览器才抓到这三件。所以这里派发事件时**刻意**把 target 留成宿主
// （在宿主上 dispatch），只让 composedPath 带上内层节点，把真浏览器的形状搬进 jsdom。

import { describe, expect, it } from "vitest";
import "../../../src/components/m-tabs/index.js";
import "../../../src/components/segmented/index.js";
import "../../../src/components/m-checkout-bar/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

/**
 * 造一次「真浏览器形状」的点击：inner 上派发，但 `target` 与 `composedPath` 按跨 shadow
 * 边界之后的样子改写 —— target 是宿主、path 的第一段仍是内层节点。
 *
 * 两个 getter 都要改：
 *   · 只改 path 不改 target，被测代码若写 `e.target` 就还是能过（测不出真 bug）；
 *   · 在宿主上 dispatch（而不是 inner），happy-dom 会按 path 逐段派发，宿主监听被叫两次
 *     —— 全选那种「翻转」会翻回去，看起来像组件坏了。
 */
function clickInner(host: HTMLElement, inner: Element): void {
  const ev = new MouseEvent("click", { bubbles: true, composed: true });
  Object.defineProperty(ev, "target", { value: host });
  Object.defineProperty(ev, "composedPath", { value: () => [inner, host] });
  inner.dispatchEvent(ev);
}

function mount<T extends HTMLElement>(tag: string, attrs: Record<string, string> = {}): T {
  const el = document.createElement(tag) as T;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe("m-tabs：点页签切页", () => {
  it("点第二项 → active 跟着变，并发 z-change", async () => {
    const el = mount("m-tabs", { items: "all|全部,unpaid|待付款,shipped|待发货", active: "all" });
    await tick();
    const seen: string[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail.key));
    const btns = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>("[data-key]"));
    expect(btns.length).toBe(3);

    clickInner(el, btns[1]);
    expect(el.getAttribute("active")).toBe("unpaid");
    expect(seen).toEqual(["unpaid"]);
    el.remove();
  });

  it("点空白处（路径里没有 [data-key]）不切", async () => {
    const el = mount("m-tabs", { items: "a|甲,b|乙", active: "a" });
    await tick();
    clickInner(el, el.shadowRoot!.querySelector(".m-tabs__wrap") ?? el.shadowRoot!.firstElementChild!);
    expect(el.getAttribute("active")).toBe("a");
    el.remove();
  });
});

describe("segmented：点段选中", () => {
  it("点第二段 → value 跟着变，并发 z-change", async () => {
    const el = mount("z-segmented", { options: "a|一,b|二,c|三", value: "a" });
    await tick();
    const seen: string[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail.value));
    const btns = Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>("[data-value]"));
    expect(btns.length).toBe(3);

    clickInner(el, btns[1]);
    expect(el.getAttribute("value")).toBe("b");
    expect(seen).toEqual(["b"]);
    el.remove();
  });
});

describe("m-checkout-bar：提交与全选上报", () => {
  it("点提交 → z-submit 带件数与金额", async () => {
    const el = mount("m-checkout-bar", { count: "2", total: "100" });
    await tick();
    const seen: string[] = [];
    el.addEventListener("z-submit", (e) => {
      const d = (e as CustomEvent).detail;
      seen.push(`${d.count}/${d.total}`);
    });
    const btn = el.shadowRoot!.querySelector('[data-act="submit"]');
    expect(btn).not.toBeNull();

    clickInner(el, btn!);
    expect(seen).toEqual(["2/100"]);
    el.remove();
  });

  it("点全选 → 翻转 checked 并报 z-check-all", async () => {
    const el = mount("m-checkout-bar", { count: "2", total: "100" });
    await tick();
    const seen: boolean[] = [];
    el.addEventListener("z-check-all", (e) => seen.push((e as CustomEvent).detail.checked));
    const box = el.shadowRoot!.querySelector('[data-act="check"]')!;

    clickInner(el, box);
    expect(el.checked).toBe(true);
    expect(seen).toEqual([true]);
    el.remove();
  });
});
