// Test: Core html template helper
// Related: [[REQ-016-doc-template]]（escapeHtml/escapeAttr 全项目去重抽取）
// Wiki: wiki/requirements/REQ-016-doc-template.md
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import { html, escapeHtml, escapeAttr } from "../../../src/core/template";

describe("html template tag", () => {
  it("returns a string", () => {
    const result = html`<div>hello</div>`;
    expect(typeof result).toBe("string");
    expect(result).toBe("<div>hello</div>");
  });

  it("interpolates string values", () => {
    const name = "world";
    expect(html`<span>${name}</span>`).toBe("<span>world</span>");
  });

  it("interpolates number values", () => {
    expect(html`<span>${42}</span>`).toBe("<span>42</span>");
  });

  it("omits false/ null/ undefined values", () => {
    expect(html`<div a="${false}" b="${null}" c="${undefined}">x</div>`).toBe(
      '<div a="" b="" c="">x</div>'
    );
  });

  it("flattens arrays", () => {
    const items = ["a", "b", "c"];
    expect(html`<ul>${items.map((i) => `<li>${i}</li>`)}</ul>`).toBe(
      "<ul><li>a</li><li>b</li><li>c</li></ul>"
    );
  });

  it("filters null/undefined/false from arrays", () => {
    const items = ["a", null, "b", undefined, false, "c"];
    expect(html`<ul>${items.map((i) => (i ? `<li>${i}</li>` : null))}</ul>`).toBe(
      "<ul><li>a</li><li>b</li><li>c</li></ul>"
    );
  });

  it("handles empty template", () => {
    expect(html``).toBe("");
  });

  it("handles multiple interpolations", () => {
    const cls = "active";
    const label = "Click";
    expect(html`<button class="${cls}">${label}</button>`).toBe(
      '<button class="active">Click</button>'
    );
  });
});

describe("escapeHtml / escapeAttr", () => {
  it("escapes HTML-sensitive characters in text positions", () => {
    expect(escapeHtml(`a&b<c>d`)).toBe("a&amp;b&lt;c&gt;d");
    expect(escapeHtml(`say "hi"`)).toBe(`say "hi"`); // 文本位置不转义引号
  });

  it("escapes double quotes in addition for attribute positions", () => {
    expect(escapeAttr(`a&b<c>"d"`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;");
  });

  it("leaves safe strings untouched", () => {
    expect(escapeHtml("plain text 123")).toBe("plain text 123");
    expect(escapeAttr("plain text 123")).toBe("plain text 123");
  });

  // Related: Gitee IKRAOT —— 属性位置允许非字符串入参
  it("stringifies non-string input instead of throwing", () => {
    // [WHY] 原签名 `s: string` 只挡 TS；脚本层把 number / Date 直接绑到字段时，
    // 运行时就是 `s.replace is not a function`。
    // 变异判据：把实现改回 escapeHtml(s)（不 String()）本用例必红。
    // 注意不要在组件上测这条 —— @property({type: String}) 的 setter 已把值转成 string，
    // 那种断言变异了也不会红（假绿）。
    expect(escapeAttr(123)).toBe("123");
    expect(escapeAttr(0)).toBe("0");
    expect(escapeAttr(true)).toBe("true");
  });

  it("renders null / undefined as an empty attribute value", () => {
    // [WHY] 空串而不是字面量 "null"：属性位置出现 value="undefined" 是一种更难查的脏数据
    expect(escapeAttr(null)).toBe("");
    expect(escapeAttr(undefined)).toBe("");
  });

  it("escapes after stringifying", () => {
    // 字符串化与转义的顺序不能反：先 String 再转义，否则 quote 会漏
    expect(escapeAttr(`<img src=x onerror="1">`)).toBe(
      "&lt;img src=x onerror=&quot;1&quot;&gt;",
    );
  });
});
