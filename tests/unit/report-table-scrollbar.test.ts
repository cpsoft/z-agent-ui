// 宽表横向滚动条「常驻可见」的机械守卫。
//
// [为什么需要] 这个能力在注释里看着完好、在代码里却可以整段消失：
//   - macOS / 触控板默认是覆盖式滚动条，不滚动时完全不可见；
//   - WebKit 定制 ::-webkit-scrollbar 后不再走 overlay 自动隐藏 —— 但 Firefox 不认这个
//     伪元素，只认 scrollbar-width / scrollbar-color 两个标准属性；
//   - 2026-10-26 主题语义化重构（3681bbb）批量改 CSS 时把 Firefox 那两行**连同**删掉，
//     而 WHY 注释原样留着（「Firefox 走 scrollbar-width/color」）。注释与实现相反，
//     肉眼看代码只会读到注释，于是没有任何测试、构建或 review 会发现它。
//
// [为什么断言到「同一个块」而不是整文件] 这两个属性必须落在**真正滚动的那个元素**上。
// 滚动容器一度从 wrapper 挪到内部 body，若把断言写成「整个 css 里存在 scrollbar-width」，
// 属性落在不滚动的元素上也会通过 —— 那正是假绿。
//
// 判据来源是源码文本：happy-dom 没有布局/滚动引擎，算不出滚动条是否常驻。

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync("src/report/table/report-table.css", "utf8");

/** 取出某个选择器的声明块（不含注释）；找不到返回空串。 */
function blockOf(selector: string): string {
  const at = CSS.indexOf(`${selector} {`);
  if (at < 0) return "";
  const open = CSS.indexOf("{", at);
  const close = CSS.indexOf("}", open);
  return CSS.slice(open + 1, close);
}

const wrapper = blockOf(".z-rpt__wrapper");

describe("report-table 横向滚动条常驻", () => {
  it("滚动容器确实是 .z-rpt__wrapper（overflow-x: auto）", () => {
    // 前置事实：下面两条断言只有在这个元素真的滚动时才有意义
    expect(wrapper).toContain("overflow-x: auto");
  });

  it("WebKit：定制了 ::-webkit-scrollbar（定制后不再 overlay 自动隐藏）", () => {
    expect(CSS).toContain(".z-rpt__wrapper::-webkit-scrollbar {");
    const thumbAt = CSS.indexOf(".z-rpt__wrapper::-webkit-scrollbar-thumb {");
    expect(thumbAt).toBeGreaterThan(-1);
    const thumb = CSS.slice(thumbAt, CSS.indexOf("}", thumbAt));
    // background-clip: content-box 让滑块比轨道窄，视觉上是「细条」而不是整块填满
    expect(thumb).toContain("background-clip: content-box");
  });

  it("Firefox：声明了 scrollbar-width 与 scrollbar-color（只写 WebKit 等于没覆盖）", () => {
    expect(wrapper).toContain("scrollbar-width: thin");
    expect(wrapper).toContain("scrollbar-color:");
    // 轨道透明、滑块取 track-strong，与 WebKit thumb 同源
    expect(wrapper).toMatch(/scrollbar-color:\s*var\(--z-color-track-strong\)\s+transparent/);
  });
});
