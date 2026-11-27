import { describe, it, expect, afterEach } from "vitest";
import { BaseElement, defineElement, html, morphChildren, property } from "../../../src/core/index";

class TestMorphEl extends BaseElement {
  static styles = ":host { display: block; }";
  static morph = true;

  @property({ type: String }) title = "A";
  @property({ type: Array, attribute: false }) items: Array<{ id: string; text: string }> = [];

  render(): string {
    return html`<div class="wrap">
      <input class="inp" value="${this.title}" />
      <ul>${this.items.map((it) => `<li data-key="${it.id}">${it.text}</li>`).join("")}</ul>
    </div>`;
  }
}

defineElement("test-morph-el", TestMorphEl);
const flush = () => new Promise((r) => queueMicrotask(() => r(undefined)));

describe("core/morph (morphChildren & BaseElement static morph)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("原地修补属性、文本与删除多余节点，保留已有节点引用", () => {
    const host = document.createElement("div");
    host.innerHTML = `<span class="a" data-old="1">hello</span><em>extra</em>`;
    const spanBefore = host.querySelector("span")!;

    morphChildren(host, `<span class="b" data-new="2">world</span>`);

    const spanAfter = host.querySelector("span")!;
    expect(spanAfter).toBe(spanBefore);
    expect(spanAfter.className).toBe("b");
    expect(spanAfter.hasAttribute("data-old")).toBe(false);
    expect(spanAfter.getAttribute("data-new")).toBe("2");
    expect(spanAfter.textContent).toBe("world");
    expect(host.querySelector("em")).toBeNull();
  });

  it("按 data-key 复用并重排列表节点", () => {
    const host = document.createElement("ul");
    host.innerHTML = `<li data-key="a">A</li><li data-key="b">B</li><li data-key="c">C</li>`;
    const liA = host.querySelector('[data-key="a"]')!;
    const liC = host.querySelector('[data-key="c"]')!;

    morphChildren(host, `<li data-key="c">C2</li><li data-key="a">A2</li>`);

    const list = Array.from(host.children);
    expect(list.length).toBe(2);
    expect(list[0]).toBe(liC);
    expect(list[1]).toBe(liA);
    expect(liC.textContent).toBe("C2");
    expect(liA.textContent).toBe("A2");
  });

  it("同步 checkbox 的 checked 状态", () => {
    const host = document.createElement("div");
    host.innerHTML = `<input type="checkbox" />`;
    const input = host.querySelector("input")! as HTMLInputElement;
    expect(input.checked).toBe(false);

    morphChildren(host, `<input type="checkbox" checked />`);
    expect(host.querySelector("input")).toBe(input);
    expect(input.checked).toBe(true);

    morphChildren(host, `<input type="checkbox" />`);
    expect(input.checked).toBe(false);
  });

  it("BaseElement 开启 static morph = true 时重绘保留 input 节点引用", async () => {
    const el = document.createElement("test-morph-el") as TestMorphEl;
    el.items = [
      { id: "1", text: "One" },
      { id: "2", text: "Two" },
    ];
    document.body.appendChild(el);
    await flush();

    const inpBefore = el.shadowRoot!.querySelector<HTMLInputElement>(".inp")!;
    const li2Before = el.shadowRoot!.querySelector('[data-key="2"]')!;

    el.title = "B";
    el.items = [
      { id: "2", text: "Two!" },
      { id: "1", text: "One!" },
    ];
    await flush();

    const inpAfter = el.shadowRoot!.querySelector<HTMLInputElement>(".inp")!;
    const li2After = el.shadowRoot!.querySelector('[data-key="2"]')!;
    expect(inpAfter).toBe(inpBefore);
    expect(inpAfter.value).toBe("B");
    expect(li2After).toBe(li2Before);
    expect(li2After.textContent).toBe("Two!");
  });
});
