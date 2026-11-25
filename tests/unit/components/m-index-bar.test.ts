// Test: m-index-bar —— 索引收集、点按跳转、反向高亮、无分组时不渲染索引条
// Date: 2026-11-16
//
// [背景] 索引条看着是装饰，实际是长列表**唯一的随机访问入口**。它坏起来的样子很安静：
// 「点了字母，页面不动」或者「滚到了 C 分组，索引条还亮着 A」。前者是绑定没接上，
// 后者是反向同步缺失 —— 两者都不报错、也不影响页面其余部分。
//
// [WHY 滚动位置本身不在这里验] happy-dom 不做布局：所有 `getBoundingClientRect()` 都是 0，
// 滚动容器也不存在真实溢出。这里只能验「有没有发出跳转」「高亮有没有跟着走」；
// 「跳到的位置对不对」放在 `smoke/smoke-swipe-w23.mjs`（真 Chrome，能读真实 scrollTop）。
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import "../../../src/components/m-index-bar/MIndexBar";

const flush = (times = 2): Promise<void> => {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) p = p.then(() => new Promise<void>((r) => setTimeout(r, 0)));
  return p;
};

interface El extends HTMLElement {
  indexes: string;
  active: string;
  hideBubble: boolean;
}

/** 挂一个索引条；`groups` 是分组字母，默认 A/B/C。 */
function mount(groups = ["A", "B", "C"], props: Record<string, unknown> = {}): El {
  const el = document.createElement("m-index-bar") as El;
  Object.assign(el, props);
  for (const g of groups) {
    const group = document.createElement("div");
    group.setAttribute("data-index", g);
    group.textContent = `${g} 组`;
    el.appendChild(group);
  }
  document.body.appendChild(el);
  return el;
}

const rail = (el: El): HTMLElement | null => el.shadowRoot!.querySelector(".z-m-index-bar__rail");
const items = (el: El): HTMLElement[] =>
  Array.from(el.shadowRoot!.querySelectorAll<HTMLElement>(".z-m-index-bar__item"));

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe("m-index-bar", () => {
  const hosts: El[] = [];
  const track = (el: El): El => (hosts.push(el), el);
  let scrollSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollSpy = vi.fn();
    // happy-dom 没有真实滚动，把 scrollTo 换成可断言的桩
    (window as any).scrollTo = scrollSpy;
  });

  afterEach(() => {
    hosts.splice(0).forEach((h) => h.remove());
    vi.restoreAllMocks();
  });

  it("I1 从子元素的 data-index 收集索引，顺序与文档一致且去重", async () => {
    // 故意重复一个 A：真实场景是「同组被拆成了两段」
    const el = track(mount(["A", "B", "A", "C"]));
    await flush();
    expect(items(el).map((b) => b.textContent)).toEqual(["A", "B", "C"]);
  });

  it("I2 indexes 属性优先于子元素收集（异步渲染时先占位用）", async () => {
    const el = track(mount(["A"], { indexes: "A,B,C,热点" }));
    await flush();
    expect(items(el).map((b) => b.textContent)).toEqual(["A", "B", "C", "热点"]);
  });

  it("I3 一个分组都收不到时不渲染索引条（空索引条比没有更困惑）", async () => {
    const el = track(mount([]));
    await flush();
    expect(rail(el), "没有索引项却画了一条空的索引条").toBeNull();
  });

  it("I4 点字母：切 active、发 z-index-change、触发滚动", async () => {
    const el = track(mount());
    await flush();
    const changes = collect(el, "z-index-change");

    items(el)[1].click();
    await flush();

    expect(el.active).toBe("B");
    expect(el.getAttribute("active"), "active 要反射成属性（宿主 CSS 与读屏都靠它）").toBe("B");
    expect(changes).toEqual([{ index: "B" }]);
    expect(scrollSpy, "点了字母却没发出滚动 —— 页面不会动").toHaveBeenCalled();
  });

  it("I5 高亮跟着 active 走，只写在真命中的那一项上", async () => {
    const el = track(mount());
    await flush();

    items(el)[2].click();
    await flush();

    const cur = items(el).filter((b) => b.getAttribute("aria-current") === "true");
    expect(cur.map((b) => b.textContent)).toEqual(["C"]);
    // [WHY 不许写 aria-current=\"false\"] 它合法但冗余，而「每项都带一个属性」会让
    // 「有没有当前项」这件事在 DOM 上失去区分度（和 G1 那条空值判据同源）。
    expect(items(el).filter((b) => b.hasAttribute("aria-current")).length).toBe(1);
  });

  it("I6 点同一个索引两次只发一次事件（避免宿主重复取数）", async () => {
    const el = track(mount());
    await flush();
    const changes = collect(el, "z-index-change");

    items(el)[0].click();
    await flush();
    items(el)[0].click();
    await flush();

    expect(changes.length, "重复点同一项应只通知一次").toBe(1);
  });

  it("I7 hide-bubble 时不渲染气泡（有些设计只要索引条本身）", async () => {
    const withBubble = track(mount(["A"], { hideBubble: false }));
    const without = track(mount(["A"], { hideBubble: true }));
    await flush();

    expect(withBubble.shadowRoot!.querySelector(".z-m-index-bar__bubble")).toBeTruthy();
    expect(without.shadowRoot!.querySelector(".z-m-index-bar__bubble")).toBeFalsy();
  });

  it("I8 索引条是导航而不是一串无语义按钮：容器有 role 与名称", async () => {
    const el = track(mount());
    await flush();
    const r = rail(el)!;
    expect(r.getAttribute("role")).toBe("navigation");
    // 没有名字的 navigation 在读屏的「地标列表」里显示成「导航」，用户分不出是哪个
    expect(r.getAttribute("aria-label")).toBeTruthy();
    expect(items(el).every((b) => b.tagName === "BUTTON" && b.getAttribute("type") === "button")).toBe(true);
  });
});
