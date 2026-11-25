// 主题守卫：`color-scheme` 必须两个主题各声明一次。
//
// [为什么需要] 有一整类像素不是组件 CSS 画的，是浏览器自绘的：滚动条、原生 `<select>`
// 弹层、日期面板、输入框自动填充底、文本选中高亮。它们只认 `color-scheme`。
// 少了这一行，症状是「暗色下滚动条还是白的、选中文字是浅蓝」，而逐个检查 DOM 与 CSS
// 全部正确 —— 因为确实没错，只是没告诉浏览器现在是暗色。这类缺口没有任何现有测试能发现：
// getComputedStyle 拿得到值（normal 也是合法值）、截图对比也未必复现（覆盖式滚动条不常显）。
//
// [为什么断言到「块」而不是整文件] 两个值必须落在**各自的主题块**里。写成「文件里有
// `color-scheme: dark`」的话，把它误写进亮色块也会通过 —— 那正是假绿。
//
// 判据来源是源码文本：happy-dom 不做 UA 部件绘制，算不出滚动条明暗。
//
// Related: [[bug-20261028-native-parts-ignore-theme]] REQ-010 明暗主题
// Date: 2026-10-28

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/theme/tokens.css", "utf8");

/** 取某个选择器开头的声明块正文（本文件的块结束 `}` 都在行首）。 */
function blockOf(header: string): string {
  const at = CSS.indexOf(header);
  if (at < 0) return "";
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("\n}", open);
  return CSS.slice(open + 1, close);
}

const light = blockOf('[data-theme="light"] {');
const dark = blockOf('[data-theme="dark"],\n.dark {');

describe("tokens.css 的 color-scheme（浏览器自绘部件跟随主题）", () => {
  it("亮色块声明 color-scheme: light", () => {
    expect(light).toContain("color-scheme: light");
  });

  it("暗色块声明 color-scheme: dark", () => {
    expect(dark).toContain("color-scheme: dark");
  });

  it("两个值没有写反（写反会比缺失更糟：暗色页里弹层是亮的，亮色页里滚动条是黑的）", () => {
    expect(light).not.toContain("color-scheme: dark");
    expect(dark).not.toContain("color-scheme: light");
  });

  it("暗色块的选择器同时覆盖 data-theme 与 .dark（宿主 zwms 用类名切换）", () => {
    // 这一条与上面的块提取同源：选择器改了就取不到块，两条会一起红，不会静默通过
    expect(dark).not.toBe("");
    expect(CSS).toContain('[data-theme="dark"],\n.dark {');
  });
});
