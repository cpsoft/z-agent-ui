// Test: z-m-list —— 底部哨兵触发加载、三态页脚、重试
// Date: 2026-10-25
//
// 无限滚动的失效方式都很安静：多拉一次（重复数据）或少拉一次（用户以为到底了）。
// 这里用假的 IntersectionObserver 精确控制「哨兵进入视口」这一时机，而不是猜布局。
// 关键契约：loading / finished / error 任一为真时都不得再派发 z-loadmore ——
// 否则会形成「加载中继续触发加载」的自激循环。
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import "../../../src/components/m-list/MList";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

class FakeIO {
  static instances: FakeIO[] = [];
  cb: (entries: Array<{ isIntersecting: boolean }>) => void;
  observed: Element[] = [];

  constructor(cb: any) {
    this.cb = cb;
    FakeIO.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  disconnect(): void {
    this.observed = [];
  }
  unobserve(): void {}
  takeRecords(): Array<unknown> {
    return [];
  }
}

function lastIO(): FakeIO {
  return FakeIO.instances[FakeIO.instances.length - 1];
}

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-list") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-list", () => {
  let el: any;

  beforeEach(() => {
    FakeIO.instances = [];
    vi.stubGlobal("IntersectionObserver", FakeIO);
  });

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
    vi.unstubAllGlobals();
  });

  it("挂载后开始观察底部哨兵，进入视口时派发 z-loadmore", async () => {
    el = mount();
    await flush();
    const io = lastIO();
    expect(io.observed.length).toBe(1);
    expect((io.observed[0] as HTMLElement).className).toContain("m-list__sentinel");

    let fired = 0;
    el.addEventListener("z-loadmore", () => fired++);
    io.cb([{ isIntersecting: true }]);
    expect(fired).toBe(1);
  });

  it("loading 时停止观察，回调也不再派发（防自激循环）", async () => {
    el = mount();
    await flush();
    const io = lastIO();
    let fired = 0;
    el.addEventListener("z-loadmore", () => fired++);

    el.loading = true;
    await flush();
    expect(io.observed.length).toBe(0);
    io.cb([{ isIntersecting: true }]);
    expect(fired).toBe(0);
  });

  it("finished 时显示「没有更多了」且不再观察", async () => {
    el = mount({ finished: true });
    await flush();
    expect(el.shadowRoot.querySelector(".m-list__footer").textContent).toContain("没有更多了");
    expect(lastIO().observed.length).toBe(0);
  });

  it("error 时显示错误文案，点重试派发 z-loadmore", async () => {
    el = mount({ error: "网络异常" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-list__footer--error").textContent).toContain("网络异常");

    let fired = 0;
    el.addEventListener("z-loadmore", () => fired++);
    el.shadowRoot.querySelector(".m-list__retry").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fired).toBe(1);
  });

  it("错误文案里的标签被转义", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ error: evil });
    await flush();
    const footer = el.shadowRoot.querySelector(".m-list__footer--error");
    expect(footer.querySelector("img")).toBeNull();
    expect(footer.textContent).toContain(evil);
  });

  it("loading 时显示加载中页脚", async () => {
    el = mount({ loading: true });
    await flush();
    expect(el.shadowRoot.querySelector(".m-list__footer").textContent).toContain("加载中");
    expect(el.shadowRoot.querySelector(".m-list__spinner")).toBeTruthy();
  });
});
