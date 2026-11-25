import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startEdgeScroll } from "../../src/primitives/edge-scroll/index.js";

// rAF 在 happy-dom 里是 setTimeout(~16ms)，用假定时器推进一帧
const FRAME = 17;

function makeBox(top = 0, height = 600, left = 0, width = 800): HTMLElement {
  const el = document.createElement("div");
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => ({ top, left, width, height, bottom: top + height, right: left + width, x: left, y: top, toJSON: () => ({}) }),
  });
  document.body.appendChild(el);
  return el;
}

let pos = { x: 400, y: 300 };
let scrolls = 0;
let handle: { stop(): void } | null = null;

function start(el: HTMLElement, extra: Record<string, unknown> = {}): void {
  handle = startEdgeScroll({
    point: () => pos,
    el,
    onScroll: () => {
      scrolls++;
    },
    ...extra,
  });
}

describe("startEdgeScroll", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pos = { x: 400, y: 300 };
    scrolls = 0;
  });

  afterEach(() => {
    handle?.stop();
    handle = null;
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("指针在中间：不滚", () => {
    const el = makeBox();
    el.scrollTop = 100;
    start(el);
    vi.advanceTimersByTime(FRAME * 3);
    expect(el.scrollTop).toBe(100);
    expect(scrolls).toBe(0);
  });

  // 变异：把 dy 的符号反过来 ⇒ 这条红（贴顶反而往下滚）
  it("指针贴上边缘：向上滚", () => {
    const el = makeBox();
    el.scrollTop = 300;
    pos = { x: 400, y: 5 };
    start(el);
    vi.advanceTimersByTime(FRAME);
    expect(el.scrollTop).toBeLessThan(300);
    expect(scrolls).toBe(1);
  });

  it("指针贴下边缘：向下滚", () => {
    const el = makeBox();
    el.scrollTop = 100;
    pos = { x: 400, y: 595 };
    start(el);
    vi.advanceTimersByTime(FRAME);
    expect(el.scrollTop).toBeGreaterThan(100);
  });

  // 越靠边越快：贴顶(0) 比刚进边带(30) 一帧滚得多
  it("越靠边步长越大", () => {
    const a = makeBox();
    a.scrollTop = 300;
    pos = { x: 400, y: 0 };
    start(a);
    vi.advanceTimersByTime(FRAME);
    const fast = 300 - a.scrollTop;
    handle?.stop();

    const b = makeBox();
    b.scrollTop = 300;
    pos = { x: 400, y: 30 };
    start(b);
    vi.advanceTimersByTime(FRAME);
    const slow = 300 - b.scrollTop;
    expect(fast).toBeGreaterThan(slow);
  });

  // 变异：去掉 inX 判断 ⇒ 这条红（指针在左栏也会滚中间那栏）
  it("指针横向离开容器：不滚", () => {
    const el = makeBox();
    el.scrollTop = 300;
    pos = { x: 900, y: 5 };
    start(el);
    vi.advanceTimersByTime(FRAME * 2);
    expect(el.scrollTop).toBe(300);
  });

  // 变异：去掉 overshoot 判断 ⇒ 这条红（指针跑到顶栏还在把画布滚到顶）
  it("指针纵向远离容器（超过 overshoot）：不滚", () => {
    const el = makeBox(0, 600);
    el.scrollTop = 300;
    pos = { x: 400, y: -200 };
    start(el);
    vi.advanceTimersByTime(FRAME * 2);
    expect(el.scrollTop).toBe(300);
  });

  it("已经到顶：scrollTop 不变就不回调", () => {
    const el = makeBox();
    el.scrollTop = 0;
    pos = { x: 400, y: 5 };
    start(el);
    vi.advanceTimersByTime(FRAME * 2);
    expect(el.scrollTop).toBe(0);
    expect(scrolls).toBe(0);
  });

  it("stop() 之后不再滚", () => {
    const el = makeBox();
    el.scrollTop = 300;
    pos = { x: 400, y: 5 };
    start(el);
    vi.advanceTimersByTime(FRAME);
    const after = el.scrollTop;
    expect(after).toBeLessThan(300);
    handle?.stop();
    handle = null;
    vi.advanceTimersByTime(FRAME * 5);
    expect(el.scrollTop).toBe(after);
  });

  // 甘特那种「时间轴横向才是主方向」的容器：axis=xy 时贴右缘要滚 scrollLeft
  it('axis: "xy" 时贴右缘横向滚', () => {
    const el = makeBox();
    el.scrollLeft = 200;
    pos = { x: 795, y: 300 };
    start(el, { axis: "xy" });
    vi.advanceTimersByTime(FRAME);
    expect(el.scrollLeft).toBeGreaterThan(200);
  });

  // 默认（axis 不写）是纵向专用：贴右缘不该横向滚 —— 栅格里那是在选落点
  it("默认不滚横向", () => {
    const el = makeBox();
    el.scrollLeft = 200;
    pos = { x: 795, y: 300 };
    start(el);
    vi.advanceTimersByTime(FRAME * 2);
    expect(el.scrollLeft).toBe(200);
  });
});
