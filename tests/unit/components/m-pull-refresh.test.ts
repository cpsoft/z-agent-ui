// Test: z-m-pull-refresh —— 阈值判定、方向过滤与刷新中态
// Date: 2026-10-25
//
// 下拉刷新的两个经典误判：
//   1. 上滑（deltaY<=0）也拦了默认行为 ⇒ 页面没法正常滚。
//   2. 未达阈值就派发 z-refresh ⇒ 轻轻一碰就刷新，接口被刷爆。
// 另外阻尼会让「手指位移」≠「实际位移」，断言必须按阻尼后的值算阈值，不能拿手指距离比。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-pull-refresh/MPullRefresh";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-pull-refresh") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function touch(el: Element, type: "touchstart" | "touchmove" | "touchend", clientY?: number): TouchEvent {
  const ev = new TouchEvent(type, { bubbles: true, cancelable: true });
  // happy-dom 的 TouchEvent 不解析 touches 初始化器，直接挂在实例上
  Object.defineProperty(ev, "touches", {
    value: clientY === undefined ? [] : [{ clientY, clientX: 0 }],
  });
  el.dispatchEvent(ev);
  return ev;
}

describe("m-pull-refresh", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  function scroller(): HTMLElement {
    return el.shadowRoot.querySelector(".m-pull-refresh__scroller");
  }

  it("下拉超过阈值（阻尼后 ≥ threshold）释放时派发 z-refresh", async () => {
    el = mount({ threshold: 60 });
    await flush();
    let fired = 0;
    el.addEventListener("z-refresh", () => fired++);

    touch(scroller(), "touchstart", 100);
    touch(scroller(), "touchmove", 400); // deltaY=300 → 阻尼 0.3 → 90 ≥ 60
    touch(scroller(), "touchend");

    expect(fired).toBe(1);
  });

  it("未达阈值不派发（阻尼后 100*0.5=50 < 60）", async () => {
    el = mount({ threshold: 60 });
    await flush();
    let fired = 0;
    el.addEventListener("z-refresh", () => fired++);

    touch(scroller(), "touchstart", 100);
    touch(scroller(), "touchmove", 200);
    touch(scroller(), "touchend");

    expect(fired).toBe(0);
  });

  it("上滑（deltaY<=0）不拦截默认行为、不派发", async () => {
    el = mount({ threshold: 60 });
    await flush();
    let fired = 0;
    el.addEventListener("z-refresh", () => fired++);

    touch(scroller(), "touchstart", 300);
    const up = touch(scroller(), "touchmove", 200);
    touch(scroller(), "touchend");

    expect(up.defaultPrevented).toBe(false);
    expect(fired).toBe(0);
  });

  it("下拉过程中的 touchmove 要 preventDefault（阻止原生回弹抢手势）", async () => {
    el = mount({ threshold: 60 });
    await flush();
    touch(scroller(), "touchstart", 100);
    const move = touch(scroller(), "touchmove", 200);
    expect(move.defaultPrevented).toBe(true);
  });

  // [2026-11-20] 原来判「在不在顶部」读的是 `this._scroller.parentElement.scrollTop` ——
  // 那是 shadow 里的包装 div（`overflow:hidden`，从不滚动），读出来恒 0。于是页面滚到
  // 中间再下拉：手势被预防走（页面滚不回去），而且照样过阈值变成「刷新」。
  // 页面层的下拉刷新现在走容器实现（`controllers/pull-refresh.ts`），但组件仍是公开件。
  it("页面已滚到中间 ⇒ 不抢手势、不发 z-refresh", async () => {
    const box = document.createElement("div");
    box.style.overflowY = "auto";
    // jsdom 没有布局：把「真的滚了 240px」造出来
    Object.defineProperty(box, "scrollHeight", { value: 2000, configurable: true });
    Object.defineProperty(box, "clientHeight", { value: 600, configurable: true });
    Object.defineProperty(box, "scrollTop", { value: 240, configurable: true });
    el = mount({ threshold: 60 });
    box.appendChild(el);
    document.body.appendChild(box);
    await flush();

    let fired = 0;
    el.addEventListener("z-refresh", () => fired++);
    touch(scroller(), "touchstart", 100);
    const move = touch(scroller(), "touchmove", 400); // 阻尼后 90 ≥ 60
    touch(scroller(), "touchend");

    expect(move.defaultPrevented).toBe(false);
    expect(fired).toBe(0);
    // 元素现在挂在 box 里（不是 body），`afterEach` 只认 body 的直接子节点
    box.remove();
    el = null;
  });

  it("refreshing=true 时指示器显示「刷新中」并固定在阈值位置", async () => {
    el = mount({ threshold: 60, refreshing: true });
    await flush();
    expect(el.shadowRoot.querySelector(".m-pull-refresh__text").textContent).toBe("刷新中...");
    expect(scroller().style.transform).toBe("translateY(60px)");
  });

  it("refreshing=false 时回弹到 0，未达阈值提示「下拉刷新」", async () => {
    el = mount({ threshold: 60 });
    await flush();
    expect(scroller().style.transform).toBe("translateY(0px)");
    expect(el.shadowRoot.querySelector(".m-pull-refresh__text").textContent).toBe("下拉刷新");
  });
});
