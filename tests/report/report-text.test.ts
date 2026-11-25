// Test: 文本卡的受限行内标记解析。
//
// [NOTE] 这里的核心断言不是「粗体能解析」，而是**不认识的写法不会变成可执行内容**。
// 由于实现走「解析成片段 → React 元素」，天然的注入面是零；但仍然要钉住行为，
// 否则将来有人为了「支持更多格式」改成 dangerouslySetInnerHTML，这些用例必须转红。
import { describe, expect, it } from "vitest";
import { parseRichLines, parseRichText, richTextToPlain } from "../../src/report/core/report-text.js";

describe("parseRichText 标记解析", () => {
  it("纯文本原样成为一个片段", () => {
    expect(parseRichText("本月口径")).toEqual([{ kind: "text", text: "本月口径" }]);
  });

  it("**粗体** / *斜体* / `等宽` 各自成段", () => {
    expect(parseRichText("**a**b*c*`d`")).toEqual([
      { kind: "bold", text: "a" },
      { kind: "text", text: "b" },
      { kind: "italic", text: "c" },
      { kind: "code", text: "d" },
    ]);
  });

  it("双星号优先于单星号（否则 **x** 会被切成空的斜体片段）", () => {
    expect(parseRichText("**x**")).toEqual([{ kind: "bold", text: "x" }]);
    // 若先匹配单星号，这里会得到 bold 之外的碎片，最终渲染出两个空 <em>
    expect(parseRichText("**x**y")).toEqual([
      { kind: "bold", text: "x" },
      { kind: "text", text: "y" },
    ]);
  });

  it("等宽里的星号不当标记（写公式时常见）", () => {
    expect(parseRichText("`a*b`")).toEqual([{ kind: "code", text: "a*b" }]);
    expect(parseRichText("`SUM(x)*2`")).toEqual([{ kind: "code", text: "SUM(x)*2" }]);
  });

  it("空字符串 → 空数组（调用方据此显示占位）", () => {
    expect(parseRichText("")).toEqual([]);
  });

  it("未闭合的标记原样保留为文本", () => {
    expect(parseRichText("**没有闭合")).toEqual([{ kind: "text", text: "**没有闭合" }]);
    expect(parseRichText("单价*数量")).toEqual([{ kind: "text", text: "单价*数量" }]);
  });

  it("标记不跨行（跨行的星号通常是算术式）", () => {
    // 单行里解析：* 之间夹换行不算斜体
    expect(parseRichText("*a\nb*")).toEqual([{ kind: "text", text: "*a\nb*" }]);
  });

  it("HTML 片段原样成为文本，不会被当成标记", () => {
    const out = parseRichText("<script>alert(1)</script>");
    expect(out).toEqual([{ kind: "text", text: "<script>alert(1)</script>" }]);
    // 关键：整串只出现在 text 段里，没有任何片段被标记成 bold/italic/code
    expect(out.every((s) => s.kind === "text")).toBe(true);
  });

  it("HTML 与标记混排：只有标记生效，标签留作文本", () => {
    expect(parseRichText("<b>**重点**</b>")).toEqual([
      { kind: "text", text: "<b>" },
      { kind: "bold", text: "重点" },
      { kind: "text", text: "</b>" },
    ]);
  });
});

describe("parseRichLines 按行切分", () => {
  it("换行即分段，空行保留为空片段数组", () => {
    expect(parseRichLines("甲\n\n乙")).toEqual([
      [{ kind: "text", text: "甲" }],
      [],
      [{ kind: "text", text: "乙" }],
    ]);
  });

  it("\\r\\n 与 \\n 等价（Windows 粘贴的文本）", () => {
    expect(parseRichLines("甲\r\n乙")).toEqual([
      [{ kind: "text", text: "甲" }],
      [{ kind: "text", text: "乙" }],
    ]);
  });

  it("空内容 → 空数组", () => {
    expect(parseRichLines("")).toEqual([]);
  });
});

describe("richTextToPlain", () => {
  it("去掉标记字符、保留内容与换行", () => {
    expect(richTextToPlain("**粗**\n*斜*`码`")).toBe("粗\n斜码");
  });
});
