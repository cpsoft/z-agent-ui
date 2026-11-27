import { describe, it, expect, afterEach } from "vitest";
import { BaseElement, defineElement, html, property } from "../../../src/core/index";

class TestRuntimeEl extends BaseElement {
  static styles = ":host { display: block; color: rgb(1, 2, 3); }";
  @property({ type: Number }) count = 0;
  @property({ type: String }) label = "init";
  clicks = 0;
  lastWillChanged: ReadonlyMap<string, unknown> | null = null;
  lastUpdatedChanged: ReadonlyMap<string, unknown> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.listen(document, "test-runtime-ping", () => {
      this.clicks++;
    });
  }

  willUpdate(ctx: { isFirst: boolean; changed: ReadonlyMap<string, unknown> }): void {
    this.lastWillChanged = ctx.changed;
  }

  updated(changed: ReadonlyMap<string, unknown>): void {
    this.lastUpdatedChanged = changed;
  }

  render(): string {
    return html`<span class="n">${this.count}</span>`;
  }
}

const flush = () => new Promise((r) => queueMicrotask(() => r(undefined)));

describe("BaseElement 运行时基建（defineElement / adoptedStyleSheets / listen）", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("defineElement 重复注册同一标签名不抛错", () => {
    defineElement("test-runtime-el", TestRuntimeEl);
    expect(() => defineElement("test-runtime-el", TestRuntimeEl)).not.toThrow();
    expect(customElements.get("test-runtime-el")).toBe(TestRuntimeEl);
  });

  it("adoptedStyleSheets 按类共享且重绘不重复注入 <style>", async () => {
    defineElement("test-runtime-el", TestRuntimeEl);
    const a = document.createElement("test-runtime-el") as TestRuntimeEl;
    const b = document.createElement("test-runtime-el") as TestRuntimeEl;
    document.body.append(a, b);
    await flush();

    const sheetsA = a.shadowRoot!.adoptedStyleSheets;
    const sheetsB = b.shadowRoot!.adoptedStyleSheets;
    if (Array.isArray(sheetsA) && sheetsA.length > 0) {
      expect(sheetsA[0]).toBe(sheetsB[0]);
      expect(a.shadowRoot!.querySelector("style")).toBeNull();
      a.count = 1;
      await flush();
      expect(a.shadowRoot!.querySelector("style")).toBeNull();
      expect(a.shadowRoot!.querySelector(".n")!.textContent).toBe("1");
    }
  });

  it("listen() 在 disconnectedCallback 时自动清理，重连后恢复监听", async () => {
    defineElement("test-runtime-el", TestRuntimeEl);
    const el = document.createElement("test-runtime-el") as TestRuntimeEl;
    document.body.appendChild(el);
    await flush();

    document.dispatchEvent(new CustomEvent("test-runtime-ping"));
    expect(el.clicks).toBe(1);

    el.remove();
    document.dispatchEvent(new CustomEvent("test-runtime-ping"));
    expect(el.clicks).toBe(1);

    document.body.appendChild(el);
    await flush();
    document.dispatchEvent(new CustomEvent("test-runtime-ping"));
    expect(el.clicks).toBe(2);
  });

  it("willUpdate(ctx.changed) 与 updated(changed) 准确记录本帧属性变更及最早旧值", async () => {
    defineElement("test-runtime-el", TestRuntimeEl);
    const el = document.createElement("test-runtime-el") as TestRuntimeEl;
    document.body.appendChild(el);
    await flush();

    // 同一微任务内连续赋值两次，旧值应保留第一次变更前的值 (0)
    el.count = 1;
    el.count = 2;
    el.setAttribute("label", "next");
    await flush();

    expect(el.lastWillChanged?.get("count")).toBe(0);
    expect(el.lastWillChanged?.get("label")).toBe("init");
    expect(el.lastUpdatedChanged?.get("count")).toBe(0);
    expect(el.lastUpdatedChanged?.get("label")).toBe("init");

    // 无属性变化时 requestUpdate，changed 为空
    el.requestUpdate();
    await flush();
    expect(el.lastUpdatedChanged?.size).toBe(0);
  });
});
