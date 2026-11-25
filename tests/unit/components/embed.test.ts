// Test: z-embed 嵌入 HTML 页面（src / 内联 html / sandbox 收敛 / lazy / 超时重试 / auto-height）
// Related: wiki/reference/component-implementation-standard.md（组件实现规范）
// Wiki: wiki/log.md（2026-11-20 新增 z-embed）
// Date: 2026-11-20
//
// [WHY 断言落在属性与状态上，不落在渲染像素] happy-dom 不加载 iframe 文档，也不派发 load；
// 这里按住的是组件自己的判据（沙箱收敛、懒加载时机、超时与重试、测高降级），
// 「iframe 里真的渲染出页面」属于浏览器行为，由冒烟/真机确认。
import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/embed/Embed.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

class MockIO {
  static instances: MockIO[] = [];
  observed: Element[] = [];
  callback: IntersectionObserverCallback;
  disconnected = false;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
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

function createEmbed(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-embed") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else if (typeof v === "number") {
      el[k] = v;
    } else {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  return el;
}

function frame(el: any): HTMLIFrameElement | null {
  return el.shadowRoot!.querySelector(".z-embed__frame");
}

afterEach(() => {
  document.body.innerHTML = "";
  delete (globalThis as any).IntersectionObserver;
});

describe("z-embed 渲染与沙箱", () => {
  it("外部地址：渲染 iframe，默认沙箱只给 allow-same-origin，无 title 时退回「嵌入页面」", async () => {
    const el = createEmbed({ src: "report/2026-11.html" });
    await flush();
    const f = frame(el);
    expect(f).not.toBeNull();
    expect(f!.getAttribute("src")).toBe("report/2026-11.html");
    expect(f!.getAttribute("sandbox")).toBe("allow-same-origin");
    // 读屏靠 title 区分多个嵌入区：没写也得有一个名字
    expect(f!.getAttribute("title")).toBe("嵌入页面");
    expect(f!.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(el.shadowRoot!.querySelector(".z-embed")!.getAttribute("style")).toContain("480px");
  });

  it("内联 html 走 srcdoc，引号被转义（否则属性会被截断）", async () => {
    const html = '<p class="a">甲</p>';
    const el = createEmbed({ html });
    await flush();
    const f = frame(el)!;
    expect(f.getAttribute("srcdoc")).toBe(html);
    expect(f.hasAttribute("src")).toBe(false);
  });

  it("内联 html + allow-scripts 时强制去掉 allow-same-origin", async () => {
    const el = createEmbed({ html: "<b>x</b>", sandbox: "allow-scripts allow-same-origin" });
    await flush();
    expect(frame(el)!.getAttribute("sandbox")).toBe("allow-scripts");
  });

  it("外部地址不受这条收敛影响（那是对方自己的源）", async () => {
    const el = createEmbed({ src: "https://x.test/a.html", sandbox: "allow-scripts allow-same-origin" });
    await flush();
    expect(frame(el)!.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin");
  });

  it("两个来源都没给：只出提示，不渲染空 iframe", async () => {
    const el = createEmbed();
    await flush();
    expect(frame(el)).toBeNull();
    expect(el.shadowRoot!.textContent).toContain("未配置");
  });
});

describe("z-embed 加载状态", () => {
  it("lazy：进入视口前不创建 iframe", async () => {
    mockIO();
    const el = createEmbed({ src: "a.html", lazy: true });
    await flush();
    expect(frame(el)).toBeNull();
    MockIO.instances[0].trigger([{ isIntersecting: true } as never]);
    await flush();
    expect(frame(el)).not.toBeNull();
  });

  it("load 后 emit z-load 且撤掉加载遮罩", async () => {
    const el = createEmbed({ src: "a.html" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-load", spy);
    frame(el)!.dispatchEvent(new Event("load"));
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ src: "a.html", inline: false });
    expect(el.shadowRoot!.querySelector(".z-embed__state--overlay")).toBeNull();
  });

  it("超时后 emit z-timeout 并提供重试，重试会重建 iframe", async () => {
    const el = createEmbed({ src: "a.html" });
    el.timeout = 1;
    await flush();
    const before = frame(el);
    const spy = vi.fn();
    el.addEventListener("z-timeout", spy);
    await new Promise((r) => setTimeout(r, 20));
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    const retry = el.shadowRoot!.querySelector(".z-embed__retry") as HTMLElement;
    expect(retry).not.toBeNull();

    retry.click();
    await flush();
    expect(frame(el)).not.toBe(before);
    expect(el.shadowRoot!.querySelector(".z-embed__retry")).toBeNull();
  });

  it("卸载后不再触发超时（定时器必须被摘掉）", async () => {
    const el = createEmbed({ src: "a.html" });
    el.timeout = 1;
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-timeout", spy);
    el.remove();
    await new Promise((r) => setTimeout(r, 20));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("z-embed auto-height", () => {
  function stubDoc(f: HTMLIFrameElement, height: number): void {
    Object.defineProperty(f, "contentDocument", {
      configurable: true,
      value: { documentElement: { scrollHeight: height }, body: { scrollHeight: height } },
    });
  }

  it("能读到文档时按 scrollHeight 伸展宿主", async () => {
    const el = createEmbed({ src: "a.html", "auto-height": true });
    await flush();
    const f = frame(el)!;
    stubDoc(f, 900);
    f.dispatchEvent(new Event("load"));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-embed")!.getAttribute("style")).toContain("900px");
  });

  it("读不到 contentDocument 时退回固定高度，且只警告一次", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const el = createEmbed({ src: "a.html", "auto-height": true });
    await flush();
    const f = frame(el)!;
    Object.defineProperty(f, "contentDocument", { configurable: true, value: null });
    f.dispatchEvent(new Event("load"));
    await flush();
    // 第二次 load 不会再警告（同一个实例只提示一次）
    f.dispatchEvent(new Event("load"));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-embed")!.getAttribute("style")).toContain("480px");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
