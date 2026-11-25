// Test: z-anchor 锚点导航（click 滚动 + IntersectionObserver scrollspy）
// Related: [[2026-08-11-W16-nav]]
// Wiki: wiki/planning/TASKS/2026-08-11-W16-nav/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/anchor/Anchor.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

// [WHY] happy-dom 无 IntersectionObserver: mock 记录 observe/disconnect 调用,
// 测试组件对 IO 的消费方式（scrollspy 行为本身在浏览器冒烟验证）
class MockIO {
  static instances: MockIO[] = [];
  observed: Element[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit;
  disconnected = false;

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options ?? {};
    MockIO.instances.push(this);
  }
  observe(el: Element): void {
    this.observed.push(el);
  }
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true;
  }
  trigger(entries: IntersectionObserverEntry[]): void {
    this.callback(entries as never[], this as never);
  }
}

function mockIO(): void {
  (globalThis as any).IntersectionObserver = MockIO;
  MockIO.instances = [];
}

describe("z-anchor", () => {
  function createAnchor(): any {
    const el = document.createElement("z-anchor") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders links from items", async () => {
    const el = createAnchor();
    el.items = [
      { href: "#sec1", label: "概览" },
      { href: "#sec2", label: "明细" },
    ];
    await flush();
    const links = el.shadowRoot!.querySelectorAll("a[part='link']");
    expect(links.length).toBe(2);
    expect(links[0].textContent).toBe("概览");
    expect(links[0].getAttribute("href")).toBe("#sec1");
    document.body.removeChild(el);
  });

  it("click emits z-change with active href", async () => {
    mockIO();
    const el = createAnchor();
    el.items = [{ href: "#sec1", label: "概览" }];
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const link = el.shadowRoot!.querySelector("a[part='link']") as HTMLElement;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ active: "#sec1" });
    document.body.removeChild(el);
  });

  it("click toggles active class and aria-current", async () => {
    mockIO();
    const el = createAnchor();
    el.items = [
      { href: "#sec1", label: "A" },
      { href: "#sec2", label: "B" },
    ];
    await flush();
    const links = el.shadowRoot!.querySelectorAll("a[part='link']") as NodeListOf<HTMLElement>;
    links[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(links[0].classList.contains("z-anchor__link--active")).toBe(false);
    expect(links[1].classList.contains("z-anchor__link--active")).toBe(true);
    expect(links[1].getAttribute("aria-current")).toBe("true");
    document.body.removeChild(el);
  });

  it("scrollspy observes target elements with band rootMargin", async () => {
    mockIO();
    const el = createAnchor();
    el.offset = 60;
    el.items = [{ href: "#sec1", label: "A" }];
    // 目标元素存在时 IO 才观察
    document.getElementById("sec1")?.remove();
    const target = document.createElement("section");
    target.id = "sec1";
    document.body.appendChild(target);
    await flush();
    const io = MockIO.instances[0];
    expect(io).toBeDefined();
    expect(io.observed).toContain(target);
    expect(io.options.rootMargin).toBe("-60px 0px -75% 0px");
    document.body.removeChild(el);
    document.body.removeChild(target);
  });

  it("IO callback activates entry and emits z-change", async () => {
    mockIO();
    const el = createAnchor();
    el.items = [
      { href: "#sec1", label: "A" },
      { href: "#sec2", label: "B" },
    ];
    const t1 = document.createElement("section");
    t1.id = "sec1";
    const t2 = document.createElement("section");
    t2.id = "sec2";
    document.body.append(t1, t2);
    await flush();
    const io = MockIO.instances[0];
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    io.trigger([{ isIntersecting: true, target: t2 } as never]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ active: "#sec2" });
    const links = el.shadowRoot!.querySelectorAll("a[part='link']") as NodeListOf<HTMLElement>;
    expect(links[1].classList.contains("z-anchor__link--active")).toBe(true);
    document.body.removeChild(el);
    document.body.removeChild(t1);
    document.body.removeChild(t2);
  });

  it("IO is not created when IntersectionObserver is undefined (happy-dom guard)", async () => {
    (globalThis as any).IntersectionObserver = undefined;
    const el = createAnchor();
    el.items = [{ href: "#sec1", label: "A" }];
    await flush();
    // 不抛错,纯点击模式
    expect(el.shadowRoot!.querySelectorAll("a[part='link']").length).toBe(1);
    document.body.removeChild(el);
  });

  it("items change rebuilds observer", async () => {
    mockIO();
    const el = createAnchor();
    const t1 = document.createElement("section");
    t1.id = "sec1";
    const t2 = document.createElement("section");
    t2.id = "sec2";
    document.body.append(t1, t2);
    el.items = [{ href: "#sec1", label: "A" }];
    await flush();
    const first = MockIO.instances[0];
    el.items = [
      { href: "#sec1", label: "A" },
      { href: "#sec2", label: "B" },
    ];
    await flush();
    expect(MockIO.instances.length).toBe(2);
    expect(first.disconnected).toBe(true);
    expect(MockIO.instances[1].observed.length).toBe(2);
    document.body.removeChild(el);
    document.body.removeChild(t1);
    document.body.removeChild(t2);
  });

  it("disconnect clears observer on removal", async () => {
    mockIO();
    const el = createAnchor();
    const t1 = document.createElement("section");
    t1.id = "sec1";
    document.body.appendChild(t1);
    el.items = [{ href: "#sec1", label: "A" }];
    await flush();
    const io = MockIO.instances[0];
    document.body.removeChild(el);
    expect(io.disconnected).toBe(true);
    document.body.removeChild(t1);
  });

  it("click with missing target does not scroll but still activates", async () => {
    mockIO();
    const el = createAnchor();
    el.items = [{ href: "#missing", label: "M" }];
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const link = el.shadowRoot!.querySelector("a[part='link']") as HTMLElement;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(link.classList.contains("z-anchor__link--active")).toBe(true);
    document.body.removeChild(el);
  });
});
