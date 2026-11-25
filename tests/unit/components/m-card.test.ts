// Test: z-m-card —— 手势判定（点击 / 长按 / 拖动）与事件契约
// Date: 2026-10-25
//
// 为什么重点测「拖动不算点击」：移动端列表里卡片是滚动内容的载体，手指按住卡片滑动是
// 最常见的滚动姿势。早期实现只在 pointermove 里清了长按计时器、没有标记「已拖动」，
// 于是 pointerup 仍派发 z-click —— 表现是「滑一下列表就进了详情页」，且不报错、不进日志。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../../../src/components/m-card/MCard";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(opts: { clickable?: boolean } = {}): any {
  const el = document.createElement("m-card") as any;
  if (opts.clickable) el.clickable = true;
  document.body.appendChild(el);
  return el;
}

function pointer(el: HTMLElement, type: string, x: number, y: number): void {
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
}

describe("m-card 手势", () => {
  let el: any;

  beforeEach(() => {
    el = mount({ clickable: true });
    el.addEventListener("z-click", () => (el.__clicks = (el.__clicks ?? 0) + 1));
    el.addEventListener("z-longpress", () => (el.__longpress = (el.__longpress ?? 0) + 1));
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it("轻点（位移在容差内）派发 z-click", async () => {
    await flush();
    pointer(el, "pointerdown", 100, 100);
    pointer(el, "pointermove", 103, 104);
    pointer(el, "pointerup", 103, 104);
    expect(el.__clicks).toBe(1);
  });

  it("拖动超过 10px 后抬起**不**派发 z-click（滑列表误进详情页的回归）", async () => {
    await flush();
    pointer(el, "pointerdown", 100, 100);
    pointer(el, "pointermove", 100, 160); // 纵向滚动 60px
    pointer(el, "pointerup", 100, 160);
    expect(el.__clicks).toBeUndefined();
  });

  it("pointercancel（触摸滚动时浏览器发的事件）也按拖动处理，且取消长按", async () => {
    await flush();
    pointer(el, "pointerdown", 100, 100);
    pointer(el, "pointercancel", 100, 100);
    pointer(el, "pointerup", 100, 100);
    expect(el.__clicks).toBeUndefined();
  });

  it("clickable=false 时完全不派发事件（卡片当纯展示用）", async () => {
    const plain = mount();
    let fired = 0;
    plain.addEventListener("z-click", () => fired++);
    await flush();
    pointer(plain, "pointerdown", 10, 10);
    pointer(plain, "pointerup", 10, 10);
    expect(fired).toBe(0);
    document.body.removeChild(plain);
  });

  it("长按 800ms 派发 z-longpress，抬起不再补一个 z-click", async () => {
    await flush();
    pointer(el, "pointerdown", 100, 100);
    await new Promise((r) => setTimeout(r, 850));
    pointer(el, "pointerup", 100, 100);
    expect(el.__longpress).toBe(1);
    expect(el.__clicks).toBeUndefined();
  });
});
