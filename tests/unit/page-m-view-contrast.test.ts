// Test: 浅色语气底上的文字不能是「实心底的白字」。
// Date: 2026-11-08（2026-11-09 扩到全库）
//
// [WHY 需要这条] `--z-color-info-soft`（blue-50）配 `--z-color-info-text`（**白色**）的
// 对比度约 1.2:1 —— 提示条上的字等于隐形，而页面结构、脚本、控制台全都正常。
// 这类缺陷截图以外没有任何信号（主题 token 的对比度用例只覆盖它自己登记的那几组配对）。
//
// [WHY 从单文件扩到全库] 第一版只扫 `page-m-view.css`，因为缺陷是在那里发现的。
// 同一次提交里写的 `m-notice-bar.css` 有**一模一样的四处**，却因为不在扫描面内而漏掉 ——
// 「守卫只保护它出生的那个文件」是这类规则的典型退化：修一处、留三处，
// 下次换个组件再犯一次。判据必须跟着「这个问题可能出现在哪」走，而不是「我第一次在哪遇到」。
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 扫描面：**所有**组件样式。排除主题定义本身（那里 `-text` 是给人配实心底用的）。
 *
 * [WHY 2026-11-14 从 `src/components/**` 扩到 `src/**`] 组件按域分组之后
 * （`src/report` / `src/editor` / `src/app` / `src/flow`），写死 `src/components`
 * 的扫描面**立刻缩水**：实测规则块从 >1000 掉到 918，而这条「扫描面是活的」断言
 * 正是为这种情况写的 —— 它是唯一报出来的东西。
 *
 * 这件事本身就是本文件注释第 8-11 行批判过的那个退化：**判据跟着
 * 「我第一次在哪遇到」走，而不是「这个问题可能出现在哪」**。上一版从单文件扩到了
 * `src/components`，但「全库」这个说法当时就不成立（report/editor 早就有 CSS 了）。
 */
const FILES = globSync("src/**/*.css", { cwd: process.cwd() })
  .filter((f) => !f.startsWith("src/theme/"))
  .sort();

/** 去掉注释，避免把注释里的示例当成真实声明。 */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

describe("语气色：soft 底不配实心前景色", () => {
  it("扫描面是活的（文件数、规则块、soft 底都真的扫到了）", () => {
    expect(FILES.length).toBeGreaterThan(30);
    let blocks = 0;
    let softBg = 0;
    for (const file of FILES) {
      const css = stripComments(readFileSync(file, "utf8"));
      blocks += css.split("}").length;
      softBg += (css.match(/background(-color)?:\s*var\(--z-color-[a-z]+-soft\)/g) ?? []).length;
    }
    expect(blocks).toBeGreaterThan(1000);
    // 扫描面里必须有 soft 底，否则下面那条断言会因为「一个都没扫到」而假绿
    expect(softBg).toBeGreaterThan(10);
  });

  it("每个 soft 底的文字都不是 *-text", () => {
    const bad: string[] = [];
    for (const file of FILES) {
      const blocks = stripComments(readFileSync(file, "utf8")).split("}");
      blocks.forEach((block, i) => {
        // `background` 与 `background-color` 两种写法都算（本仓两种都有）
        if (!/background(-color)?:\s*var\(--z-color-[a-z]+-soft\)/.test(block)) return;
        const fg = /(?<![-\w])color:\s*var\(--z-color-([a-z-]+?)-text\)/.exec(block);
        if (fg) {
          const sel = block.trim().split("{")[0].trim();
          bad.push(`${file} 第 ${i + 1} 块 ${sel} → color: var(--z-color-${fg[1]}-text)`);
        }
      });
    }
    expect(bad).toEqual([]);
  });
});
