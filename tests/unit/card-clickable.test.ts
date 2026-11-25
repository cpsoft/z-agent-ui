// Test: z-card 的 clickable —— role / tabindex / 键盘路径 / z-click（issue IKXHH9）
// Related: [[IKXHH9]]
// Date: 2026-11-24
//
// 缺陷形态：`clickable` 以前只拼一个 CSS 类。鼠标照旧能点（宿主自己在卡上挂 onClick），
// **键盘用户从此无法到达这张卡**，读屏也念不出它是可操作的 —— 而页面上看不出任何异常。
// 四条验收全在这里钉住：能聚焦 / Enter / Space（且不滚页面）/ 不带 clickable 时行为不变。
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../src/components/card/index.js";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-card") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

/** 卡片根（shadow 里那个带 role 的 div）。 */
const rootOf = (el: HTMLElement) => el.shadowRoot!.querySelector(".z-card") as HTMLElement;

function count(el: HTMLElement, name: string): { n: number } {
  const box = { n: 0 };
  el.addEventListener(name, () => (box.n += 1));
  return box;
}

const key = (target: Element, k: string): KeyboardEvent => {
  const ev = new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true, composed: true });
  target.dispatchEvent(ev);
  return ev;
};

describe("z-card clickable", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("clickable：卡片根拿到 role=button 与 tabindex=0", async () => {
    const el = mount({ clickable: true });
    await flush();
    expect(rootOf(el).getAttribute("role")).toBe("button");
    expect(rootOf(el).getAttribute("tabindex")).toBe("0");
  });

  it("不带 clickable：不可聚焦，也没有 role（存量用法一点不变）", async () => {
    const el = mount();
    await flush();
    expect(rootOf(el).hasAttribute("role")).toBe(false);
    expect(rootOf(el).hasAttribute("tabindex")).toBe(false);
  });

  it("Enter 发一次 z-click，并拦掉默认行为", async () => {
    const el = mount({ clickable: true });
    await flush();
    const hits = count(el, "z-click");
    const ev = key(rootOf(el), "Enter");
    expect(hits.n).toBe(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("Space 也发 z-click（不 preventDefault 会连页面一起滚下去）", async () => {
    const el = mount({ clickable: true });
    await flush();
    const hits = count(el, "z-click");
    const ev = key(rootOf(el), " ");
    expect(hits.n).toBe(1);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("其它键不发（Tab / 字母键不能当点击）", async () => {
    const el = mount({ clickable: true });
    await flush();
    const hits = count(el, "z-click");
    key(rootOf(el), "Tab");
    key(rootOf(el), "a");
    expect(hits.n).toBe(0);
  });

  it("鼠标点卡身发 z-click", async () => {
    const el = mount({ clickable: true });
    await flush();
    const hits = count(el, "z-click");
    rootOf(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(hits.n).toBe(1);
  });

  it("点卡内的按钮不发（否则一次点击会被读成「整卡被点」两次）", async () => {
    const el = mount({ clickable: true });
    await flush();
    const btn = document.createElement("button");
    el.appendChild(btn);
    const hits = count(el, "z-click");
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(hits.n).toBe(0);
  });

  it("不带 clickable 时按 Enter 不发事件", async () => {
    const el = mount();
    await flush();
    const hits = count(el, "z-click");
    key(rootOf(el), "Enter");
    expect(hits.n).toBe(0);
  });

  it("点击监听是委托到 shadowRoot 的：重渲染之后仍然生效", async () => {
    const el = mount({ clickable: true });
    await flush();
    const hits = count(el, "z-click");
    // 触发一次重渲染：节点换新，绑在旧节点上的监听会随旧节点丢掉
    el.bordered = true;
    await flush();
    rootOf(el).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(hits.n).toBe(1);
  });
});
