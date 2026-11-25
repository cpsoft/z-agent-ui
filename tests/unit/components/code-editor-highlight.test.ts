// Test: z-code-editor 纯函数 tokenizer（highlightCode / detectLanguage）
// Related: [[REQ-017-code-editor]]
// Wiki: wiki/requirements/REQ-017-code-editor.md
// Date: 2026-09-25
// Author: night-hawk
import { describe, it, expect } from "vitest";
import { highlightCode, detectLanguage } from "../../../src/content/code-editor/highlight.js";

/** 还原高亮输出为源文本：去 span 标签 + 反转义（escapeHtml 只处理 & < >） */
function unwrap(out: string): string {
  return out
    .replace(/<span class="[^"]*">/g, "")
    .replace(/<\/span>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

describe("highlightCode", () => {
  it("plain / auto 不着色，仅转义", () => {
    const src = "<b>a & b</b>";
    for (const lang of ["plain", "auto"] as const) {
      const out = highlightCode(src, lang);
      expect(out).toBe("&lt;b&gt;a &amp; b&lt;/b&gt;");
      expect(out).not.toContain("tok-");
    }
  });

  it("js：关键字 / 字符串 / 注释 / 数字 / 函数调用", () => {
    const out = highlightCode('const x = 42; // note\nfoo("s")', "js");
    expect(out).toContain('<span class="tok-keyword">const</span>');
    expect(out).toContain('<span class="tok-number">42</span>');
    expect(out).toContain('<span class="tok-comment">// note</span>');
    expect(out).toContain('<span class="tok-func">foo</span>');
    expect(out).toContain('<span class="tok-string">"s"</span>');
  });

  it("js：模板串整体一个字符串 token（无嵌套上下文，见 highlight.ts 边界声明）", () => {
    const out = highlightCode("let n = 5; let t = `a${n}b`;", "js");
    // 模板串内插值不细分，${n} 随串整体着色
    expect(out).toContain('<span class="tok-string">`a${n}b`</span>');
    expect(out).toContain('<span class="tok-number">5</span>');
  });

  it("css：选择器 / 属性名 / 颜色值", () => {
    const out = highlightCode(".btn { color: #fff; }", "css");
    expect(out).toContain('<span class="tok-tag">.btn</span>');
    expect(out).toContain('<span class="tok-attr">color</span>');
    expect(out).toContain('<span class="tok-number">#fff</span>');
  });

  it("html：标签 / 属性 / 属性值", () => {
    const out = highlightCode('<div class="a">x</div>', "html");
    expect(out).toContain('<span class="tok-tag">&lt;div</span>');
    expect(out).toContain('<span class="tok-attr">class</span>');
    expect(out).toContain('<span class="tok-string">"a"</span>');
    expect(out).toContain('<span class="tok-tag">&lt;/div</span>');
  });

  it("json：键 / 值字符串 / 数字 / 字面量", () => {
    const out = highlightCode('{"k": 1, "s": "v", "b": true, "n": null}', "json");
    expect(out).toContain('<span class="tok-attr">"k"</span>');
    expect(out).toContain('<span class="tok-number">1</span>');
    expect(out).toContain('<span class="tok-string">"v"</span>');
    expect(out).toContain('<span class="tok-literal">true</span>');
    expect(out).toContain('<span class="tok-literal">null</span>');
  });

  it("markdown：标题 / 行内代码 / 列表标记", () => {
    const out = highlightCode("# Title\n- `code` item", "markdown");
    expect(out).toContain('<span class="tok-keyword"># Title</span>');
    expect(out).toContain('<span class="tok-tag">`code`</span>');
    expect(out).toContain('<span class="tok-punct">- </span>');
  });

  it("python：def / 装饰器 / 注释 / True 字面量", () => {
    const out = highlightCode("@dec\ndef f():\n    return True # ok", "python");
    expect(out).toContain('<span class="tok-keyword">@dec</span>');
    expect(out).toContain('<span class="tok-keyword">def</span>');
    expect(out).toContain('<span class="tok-func">f</span>');
    expect(out).toContain('<span class="tok-literal">True</span>');
    expect(out).toContain('<span class="tok-comment"># ok</span>');
  });

  it("lua：local/function/end 关键字 / 行注释 / 字符串", () => {
    const out = highlightCode('local function greet(name)\n  return "hi" -- ok\nend', "lua");
    expect(out).toContain('<span class="tok-keyword">local</span>');
    expect(out).toContain('<span class="tok-keyword">function</span>');
    expect(out).toContain('<span class="tok-keyword">end</span>');
    expect(out).toContain('<span class="tok-func">greet</span>');
    expect(out).toContain('<span class="tok-string">"hi"</span>');
    expect(out).toContain('<span class="tok-comment">-- ok</span>');
  });

  it("lua：长注释与长字符串按同级别闭合，数字/nil", () => {
    const out = highlightCode("--[[ multi\nline ]] local s = [[data]]\nlocal n = 0x1F nil", "lua");
    expect(out).toContain('<span class="tok-comment">--[[ multi\nline ]]</span>');
    expect(out).toContain('<span class="tok-string">[[data]]</span>');
    expect(out).toContain('<span class="tok-number">0x1F</span>');
    expect(out).toContain('<span class="tok-keyword">nil</span>');
  });

  it("注入向量：token 源文本一律转义，不产生原始标签", () => {
    const out = highlightCode('<script>alert("x&y")</script>', "js");
    expect(out).not.toContain("<script");
    expect(out).toContain("&lt;script");
    expect(out).toContain("&amp;");
  });

  it("还原不变量：去标签反转义后等于源文本", () => {
    const samples: Array<[string, Parameters<typeof highlightCode>[1]]> = [
      ['const re = /a+b/gi; // x<y & "z"', "js"],
      ["/* c */ .a:hover > .b { margin: -1.5em !important; }", "css"],
      ['<!DOCTYPE html>\n<html><body data-x="1">&amp;</body></html>', "html"],
      ['{"a": [1, -2.5e3, null], "b": {"c": false}}', "json"],
      ["## H2\n> quote\n1. one\n**bold** _it_", "markdown"],
      ["class A:\n    '''doc'''\n    pass", "python"],
      ["local t = { x = 1 } -- c\nprint(t.x)", "lua"],
    ];
    for (const [src, lang] of samples) {
      expect(unwrap(highlightCode(src, lang))).toBe(src);
    }
  });
});

describe("detectLanguage", () => {
  it("shebang 分流", () => {
    expect(detectLanguage("#!/usr/bin/env python3\nprint(1)")).toBe("python");
    expect(detectLanguage("#!/usr/bin/env lua\nprint(1)")).toBe("lua");
    expect(detectLanguage("#!/bin/bash\necho hi")).toBe("plain");
  });

  it("html / json 结构判定", () => {
    expect(detectLanguage("<!DOCTYPE html>\n<p>hi</p>")).toBe("html");
    expect(detectLanguage('{"a": 1}')).toBe("json");
    // 语法非法的 {} 内容不误判为 json，兜底 plain
    expect(detectLanguage("{a: 1}")).toBe("plain");
  });

  it("markdown / python / lua / ts / js / css 特征序", () => {
    expect(detectLanguage("# Title\n\n- item")).toBe("markdown");
    expect(detectLanguage("def f(x):\n    return x")).toBe("python");
    expect(detectLanguage("local x = 1\nif x then\n  print(x)\nend")).toBe("lua");
    // lua 方法体含 self 仍是 lua（lua 检测先于 python）
    expect(detectLanguage("function obj:get()\n  return self.x\nend")).toBe("lua");
    // JS promise 链 .then( 不误判 lua
    expect(detectLanguage("p.then(() => 1)")).toBe("js");
    expect(detectLanguage("interface A { x: string }")).toBe("ts");
    expect(detectLanguage("const f = () => 1;")).toBe("js");
    expect(detectLanguage(".btn { color: red; }")).toBe("css");
  });

  it("空与未知内容兜底 plain", () => {
    expect(detectLanguage("")).toBe("plain");
    expect(detectLanguage("   \n  ")).toBe("plain");
    expect(detectLanguage("just some words here")).toBe("plain");
  });
});
