// Test: Markdown rendering component
// Related: [[req-markdown-component]]
// Wiki: wiki/requirements/markdown-component.md
// Date: 2026-07-16
// Author: AI

import { describe, it, expect, vi } from "vitest";
import "../../../src/content/markdown/Markdown";

function sleep(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe("z-markdown", () => {
  it("renders basic markdown", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "# Hello World";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("h1")?.textContent).toBe("Hello World");
    document.body.removeChild(el);
  });

  it("renders paragraphs and inline formatting", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "Some **bold** and *italic* text.";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("strong")?.textContent).toBe("bold");
    expect(root.querySelector("em")?.textContent).toBe("italic");
    document.body.removeChild(el);
  });

  it("renders links and images", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "[link](https://example.com)\n![img](image.png)";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const a = root.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("https://example.com");
    expect(a.textContent).toBe("link");
    expect(root.querySelector("img")?.getAttribute("src")).toBe("image.png");
    document.body.removeChild(el);
  });

  it("renders GFM tables", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "| A | B |\n|---|---|\n| 1 | 2 |";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("table")).toBeTruthy();
    expect(root.querySelector("th")?.textContent?.trim()).toBe("A");
    expect(root.querySelector("td")?.textContent?.trim()).toBe("1");
    document.body.removeChild(el);
  });

  it("renders aligned GFM tables", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "| L | C | R |\n|:---|:---:|---:|\n| a | b | c |";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const ths = root.querySelectorAll("th");
    expect(ths[0].getAttribute("align")).toBe("left");
    expect(ths[1].getAttribute("align")).toBe("center");
    expect(ths[2].getAttribute("align")).toBe("right");

    const tds = root.querySelectorAll("td");
    expect(tds[0].getAttribute("align")).toBe("left");
    expect(tds[1].getAttribute("align")).toBe("center");
    expect(tds[2].getAttribute("align")).toBe("right");
    document.body.removeChild(el);
  });

  it("renders task lists", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "- [x] Done\n- [ ] Not done";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const checks = root.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect(checks.length).toBe(2);
    expect(checks[0].checked).toBe(true);
    expect(checks[1].checked).toBe(false);
    document.body.removeChild(el);
  });

  it("renders code blocks", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = '```ts\nconst x = 1;\n```';
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const code = root.querySelector("pre code")!;
    expect(code.textContent).toContain("const x = 1");
    expect(code.classList.contains("language-ts")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders inline code", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "Use `const` keyword";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const code = root.querySelector("code")!;
    expect(code.textContent).toBe("const");
    document.body.removeChild(el);
  });

  it("renders blockquotes", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "> quoted text";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const bq = root.querySelector("blockquote")!;
    expect(bq.textContent?.trim()).toBe("quoted text");
    document.body.removeChild(el);
  });

  it("renders horizontal rules", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "---";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("hr")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("sanitizes javascript: URLs in links", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "[click](javascript:alert(1))";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const a = root.querySelector("a")!;
    expect(a.getAttribute("href")).toBe("#");
    document.body.removeChild(el);
  });

  it("sanitizes javascript: URLs in images", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "![x](javascript:alert(1))";
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const img = root.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("#");
    document.body.removeChild(el);
  });

  it("emits z-render event after rendering", async () => {
    const el = document.createElement("z-markdown") as any;
    const handler = vi.fn();
    el.addEventListener("z-render", handler);
    el.content = "test";
    document.body.appendChild(el);
    await sleep();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.html).toContain("test");
    document.body.removeChild(el);
  });

  it("renders empty string gracefully", async () => {
    const el = document.createElement("z-markdown") as any;
    el.content = "";
    document.body.appendChild(el);
    await sleep();

    expect(el.shadowRoot!.querySelector(".z-markdown")).toBeNull();
    document.body.removeChild(el);
  });

  it("M1 表格外层是可聚焦、有名字的滚动区域", async () => {
    // [WHY 三条一起断言] 它们各自独立失效：
    //   · 没有 tabindex ⇒ 容器里有链接时浏览器会跳过它（Chrome 的自动可聚焦有前提）
    //   · 没有 role    ⇒ 名字挂不到 generic 上（ARIA 明确禁止 generic 带 name）
    //   · 没有名字     ⇒ 读屏念一个「什么都不说」的东西，用户不知道这里能左右滚
    const el = document.createElement("z-markdown") as any;
    el.content = "| A | B |\n|---|---|\n| 1 | 2 |";
    document.body.appendChild(el);
    await sleep();

    const wrap = el.shadowRoot!.querySelector(".z-markdown__table") as HTMLElement;
    expect(wrap).toBeTruthy();
    expect(wrap.getAttribute("role")).toBe("region");
    expect(wrap.getAttribute("tabindex")).toBe("0");
    expect(wrap.getAttribute("aria-label")).toBe("表格");
    // 表格本身还在里面（包一层不能把结构改坏）
    expect(wrap.querySelector("table")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("M2 表格区域的名字可覆盖（i18n）", async () => {
    const el = document.createElement("z-markdown") as any;
    el.tableLabel = "Table";
    el.content = "| A |\n|---|\n| 1 |";
    document.body.appendChild(el);
    await sleep();

    const wrap = el.shadowRoot!.querySelector(".z-markdown__table")!;
    expect(wrap.getAttribute("aria-label")).toBe("Table");
    document.body.removeChild(el);
  });

  it("M3 名字里的引号被转义（不能靠它注入属性）", async () => {
    const el = document.createElement("z-markdown") as any;
    el.tableLabel = '表" onmouseover="x';
    el.content = "| A |\n|---|\n| 1 |";
    document.body.appendChild(el);
    await sleep();

    const wrap = el.shadowRoot!.querySelector(".z-markdown__table") as HTMLElement;
    expect(wrap.getAttribute("aria-label")).toBe('表" onmouseover="x');
    expect(wrap.hasAttribute("onmouseover"), "属性注入了").toBe(false);
    document.body.removeChild(el);
  });

  it("uses custom highlight function for code blocks", async () => {
    const el = document.createElement("z-markdown") as any;
    el.highlight = (code: string, lang: string) =>
      `<span class="hljs">${code}</span>`;
    el.content = '```js\nvar x = 1;\n```';
    document.body.appendChild(el);
    await sleep();

    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const span = root.querySelector(".hljs")!;
    expect(span.textContent).toBe("var x = 1;");
    document.body.removeChild(el);
  });
});
