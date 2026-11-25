// Test: 数据驱动的属性/标签注入（markdown 原始 HTML 透传 + select 选项未转义）
// Related: [[bug-20261025-xss-injection]]
// Wiki: wiki/bugs/bug-20261025-xss-injection.md
// Date: 2026-10-25
// Author: 吴八哥 (AI)
//
// [WHY] 两条路径的共同点是「数据被当成标记解析」：
//   markdown —— marked 默认透传原始 HTML，旧 sanitize 只挡双引号包裹的 javascript:/data:
//   select   —— opt.label / opt.value 直接拼进模板，html() 不做自动转义
// 断言一律检查「危险的东西不存在」，不检查「清理后的等价形态」——后者容易照抄实现而空转。

import { describe, it, expect } from "vitest";
import "../../src/content/markdown/Markdown";
import "../../src/components/select/Select";
import "../../src/content/rich-text/RichText";

const flush = () => new Promise((r) => setTimeout(r, 0));

async function mountMarkdown(content: string): Promise<HTMLElement> {
  const el = document.createElement("z-markdown") as any;
  el.content = content;
  document.body.appendChild(el);
  await flush();
  return el;
}

describe("z-markdown 必须阻断原始 HTML 注入", () => {
  it("剥离 img 的 onerror 事件处理器", async () => {
    const el = await mountMarkdown("<img src=x onerror=alert(1)>");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;

    expect(root.querySelector("img")?.getAttribute("onerror")).toBeNull();
    // 反向确认：不能靠「把整个 img 摘掉」蒙混过关，合法部分要保留
    expect(root.querySelector("img")?.getAttribute("src")).toBe("x");
    document.body.removeChild(el);
  });

  it("剥离单引号形式的事件处理器", async () => {
    const el = await mountMarkdown("<img src='x' onerror='alert(1)'>");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("img")?.getAttribute("onerror")).toBeNull();
    document.body.removeChild(el);
  });

  it("移除 script 元素", async () => {
    const el = await mountMarkdown("<script>alert(1)</script>");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("script")).toBeNull();
    document.body.removeChild(el);
  });

  it("移除 iframe 与其 srcdoc", async () => {
    const el = await mountMarkdown('<iframe srcdoc="<script>alert(1)</script>"></iframe>');
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("iframe")).toBeNull();
    document.body.removeChild(el);
  });

  it("移除 style 元素（可借 @import 外联）", async () => {
    const el = await mountMarkdown("<style>@import url(//evil.test/x.css)</style>");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("style")).toBeNull();
    document.body.removeChild(el);
  });

  it("大小写混写的 javascript: 协议归一为 #", async () => {
    const el = await mountMarkdown("[x](JaVaScRiPt:alert(1))");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("a")?.getAttribute("href")).toBe("#");
    document.body.removeChild(el);
  });

  it("属性值里夹控制字符的 javascript: 也要挡住", async () => {
    // `java\tscript:` 是浏览器可执行但前缀正则匹配不到的形式
    const el = await mountMarkdown('<a href="java\tscript:alert(1)">x</a>');
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    const href = root.querySelector("a")?.getAttribute("href") ?? "";
    expect(href.toLowerCase()).not.toContain("javascript");
    document.body.removeChild(el);
  });

  it("vbscript: 与 data:text/html 同样归一为 #", async () => {
    const el = await mountMarkdown(
      '<a href="vbscript:msgbox(1)">a</a>\n<img src="data:text/html,<script>alert(1)</script>">',
    );
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("a")?.getAttribute("href")).toBe("#");
    expect(root.querySelector("img")?.getAttribute("src")).toBe("#");
    document.body.removeChild(el);
  });

  it("保留合法结构：details / kbd 不被误杀", async () => {
    const el = await mountMarkdown("<details><summary>s</summary>body</details>\n\n<kbd>Ctrl</kbd>");
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("details")).toBeTruthy();
    expect(root.querySelector("kbd")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("data:image 的内联图仍可用", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const el = await mountMarkdown(`![a](${png})`);
    const root = el.shadowRoot!.querySelector(".z-markdown")!;
    expect(root.querySelector("img")?.getAttribute("src")).toBe(png);
    document.body.removeChild(el);
  });
});

describe("z-select 选项必须转义", () => {
  async function mountSelect(optionHTML: string): Promise<HTMLElement> {
    const el = document.createElement("z-select") as any;
    el.innerHTML = optionHTML;
    document.body.appendChild(el);
    await flush();
    return el;
  }

  it("label 中的标签按文本渲染，不生成元素", async () => {
    const el = await mountSelect('<z-option value="a" label="placeholder"></z-option>');
    // 直接验 _buildOptionsHTML 产物：比「等它渲染到某个 DOM 分支」更精准，
    // 也避开 trigger 在未选中态只显示 placeholder 的分支干扰
    const out: string = (el as any)._buildOptionsHTML([
      { value: "a", label: "<img src=x onerror=alert(1)>" },
    ]);

    expect(out).not.toContain("<img");
    // 允许 &lt; / &#60; / &#x3c; 任一实体写法，防止「直接丢弃 label」式的假修复
    expect(out).toMatch(/&lt;|&#0*60;|&#x0*3c;/i);
    document.body.removeChild(el);
  });

  it("value 中的引号不能闭合属性", async () => {
    const el = await mountSelect('<z-option value="a" label="x"></z-option>');
    // [WHY 不用 querySelector("[onmouseover]") 查 shadowRoot] 选项渲染在 panel（挂在 body 上、默认未打开），
    // 在 trigger 的 shadowRoot 里查恒为 null —— 那样的断言对「未转义」也是绿的（假绿）。
    // [WHY 不查字符串是否含 "onmouseover"] 转义后文本仍在属性值里，按子串否定必假红。
    // 判据只能是「解析成 DOM 后有没有这个属性」。
    const out: string = (el as any)._buildOptionsHTML([
      { value: 'a" onmouseover="alert(1)', label: "x" },
    ]);
    const host = document.createElement("div");
    host.innerHTML = out;

    expect(host.querySelector("[onmouseover]")).toBeNull();
    // 反向确认：值完整保留，是转义而不是丢弃
    expect(host.querySelector(".z-select__option")?.getAttribute("data-value")).toBe(
      'a" onmouseover="alert(1)',
    );
    document.body.removeChild(el);
  });
});

describe("z-rich-text 回填 value 必须净化", () => {
  async function mountRich(value: string, sanitize?: (h: string) => string): Promise<any> {
    const el = document.createElement("z-rich-text") as any;
    if (sanitize) el.sanitize = sanitize;
    el.value = value;
    document.body.appendChild(el);
    await flush();
    return el;
  }
  const editorOf = (el: any): HTMLDivElement => el.shadowRoot.querySelector(".z-rt__editor");

  it("默认剥离 onerror 与 script", async () => {
    const el = await mountRich('<img src=x onerror=alert(1)><script>alert(2)</script><b>ok</b>');
    const ed = editorOf(el);

    expect(ed.querySelector("[onerror]")).toBeNull();
    expect(ed.querySelector("script")).toBeNull();
    // 合法富文本要留下 —— 否则就是「删干净」式假修复
    expect(ed.querySelector("b")?.textContent).toBe("ok");
    document.body.removeChild(el);
  });

  it("保留 execCommand 产出的内联 style", async () => {
    const el = await mountRich('<span style="color: rgb(255, 0, 0)">红</span>');
    const ed = editorOf(el);
    expect(ed.querySelector("span")?.getAttribute("style")).toBe("color: rgb(255, 0, 0)");
    document.body.removeChild(el);
  });

  it("显式传 (h) => h 可关闭净化（信任边界可关闭，但不能是默认）", async () => {
    const el = await mountRich("<script>alert(1)</script>", (h) => h);
    const ed = editorOf(el);
    expect(ed.querySelector("script")).toBeTruthy();
    document.body.removeChild(el);
  });
});
