// Test: sanitizeHtml（markdown / 富文本回填的唯一净化入口）
//
// [为什么补这份] 它是对外 13 个符号之一（`z-agent-ui` 主入口导出），此前只有
// `bug-20261025-xss-injection` 的回归用例**间接**覆盖（经 markdown / rich-text 两个组件）。
// 间接覆盖只能证明「那两条路径挡住了」，挡不住两件事：
//   ① 清洗过度 —— 把正常内容改坏（D-L0-4 就是这一类：`title="file: not found"` → `"#"`）；
//   ② style 里的 url() —— 协议藏在函数调用里，组件级用例从来没喂过这种输入。

import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../../../src/core/sanitize";

/** 把净化结果解析回 DOM 再断言 —— 对字符串做子串判断容易被实体写法骗过。 */
function parse(html: string): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = sanitizeHtml(html);
  return host;
}

describe("sanitizeHtml：危险内容", () => {
  it("删除事件属性（on*）与 script", () => {
    const host = parse('<img src="x" onerror="alert(1)"><script>alert(2)</script>');
    expect(host.querySelector("[onerror]")).toBeNull();
    expect(host.querySelector("script")).toBeNull();
    // 反向确认：不是「整块删掉」，合法部分要留
    expect(host.querySelector("img")?.getAttribute("src")).toBe("x");
  });

  it("URL 属性里的危险协议归一为 #", () => {
    const host = parse('<a href="javascript:alert(1)">x</a>');
    expect(host.querySelector("a")?.getAttribute("href")).toBe("#");
  });

  it("style 里的 url(javascript:) 被替换，其余声明保留", () => {
    const host = parse('<span style="color: red; background: url(javascript:alert(1))">x</span>');
    const style = host.querySelector("span")?.getAttribute("style") ?? "";
    expect(style.toLowerCase()).not.toContain("javascript");
    expect(style).toContain("url(#)");
    expect(style).toContain("color: red");
  });

  it("style 里带引号、大小写混写的 url() 同样被替换", () => {
    const host = parse(`<span style="background:URL('JaVaScRiPt:alert(1)')">x</span>`);
    const style = host.querySelector("span")?.getAttribute("style") ?? "";
    expect(style.toLowerCase()).not.toContain("javascript");
  });

  it("style 里的 data:text/html 被替换（可执行），data:image 保留（合法内联图）", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const host = parse(
      `<span style="background:url(data:text/html,<script>alert(1)</script>)">a</span>` +
        `<i style="background:url(${png})">b</i>`,
    );
    expect(host.querySelector("span")?.getAttribute("style")).toContain("url(#)");
    expect(host.querySelector("i")?.getAttribute("style")).toContain(png);
  });

  it("SVG SMIL 的 values 里是可执行协议时整条属性删除", () => {
    const out = sanitizeHtml(
      '<svg><a><animate attributeName="href" values="javascript:alert(1)"></animate><text>t</text></a></svg>',
    );
    expect(out.toLowerCase()).not.toContain("javascript");
  });
});

describe("sanitizeHtml：不许误伤普通内容（D-L0-4）", () => {
  it("普通文本属性里以 data: / file: 开头的值原样保留", () => {
    // 原实现把「值开头命中危险协议」的**非 URL 属性**整值换成 #：
    // title="file: not found" → "#"，静默损坏用户内容。
    const host = parse('<span title="file: not found" data-hint="data: chart">x</span>');
    const el = host.querySelector("span")!;
    expect(el.getAttribute("title")).toBe("file: not found");
    expect(el.getAttribute("data-hint")).toBe("data: chart");
  });

  it("普通 style 声明（含颜色/字体）不被改写", () => {
    const raw = "color: rgb(255, 0, 0); font-weight: 600";
    const host = parse(`<span style="${raw}">x</span>`);
    expect(host.querySelector("span")?.getAttribute("style")).toBe(raw);
  });

  it("allowDataImage: false 时连 data:image 也拒", () => {
    const png = "data:image/png;base64,iVBORw0KGgo=";
    const out = sanitizeHtml(`<img src="${png}">`, { allowDataImage: false });
    expect(out).not.toContain("data:image");
  });
});
