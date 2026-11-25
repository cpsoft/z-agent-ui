// 密度档（[data-density]）必须真的能穿透到表格 —— 而不是只缩小字号、行高原地不动。
//
// [为什么需要] 2026-10-26 实测：`data-density="compact"` 下
//   - 字号 13 → 12px（--z-font-size-sm 生效）
//   - 分页按钮 28 → 26px（--z-control-h-sm 生效）
//   - **表格行高只从 32.5 掉到 31.19px**，即 ~1.3px
// 根因是单元格内边距写死 `padding: 6px 12px`、字号写死 `13px`：行盒只跟着 line-height
// 缩了 1.3px。视觉结果是「字变小了、行没变矮」—— 观感反而更松，而且与同时缩小的按钮不一致。
//
// [为什么不用布局断言] tests/unit 跑在 happy-dom 上，没有排版引擎，量不出行高。
// 所以这里守的是**接缝**：单元格的行高与字号必须来自 spacing/typography token，
// 而那几个 token 必须真的被两个密度档覆盖。两件事都满足，密度才可能生效。
// 真实行高由 smoke 实测记录在 commit 与 wiki（默认 32.5 → 紧凑 ~27.9px）。
//
// 变异验证：
//   - 把 padding 改回 `6px 12px` → 第 1 组红
//   - 从 compact 块里删掉 `--z-space-1-5` → 第 2 组红

import { describe, expect, it } from "vitest";
import tableCSS from "../../src/report/table/report-table.css?raw";
import bodyCSS from "../../src/report/table/report-table-body.css?raw";
import tokensCSS from "../../src/theme/tokens.css?raw";

/**
 * 取某选择器声明块（剥注释；找不到返回空串）。
 * 选择器允许跨多行/多选择器（`[data-density="compact"],\n[data-density="small"] {`），
 * 所以定位方式是「找到该文本 → 取其后第一个 `{` → 花括号配对」，而不是拼 `sel + " {"`。
 */
function blockOf(css: string, selector: string): string {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  // 精确到「选择器边界」：`.z-rpt` 不能匹配到 `.z-rpt__toolbar` / `.z-rpt--sm`
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\w-])");
  const hit = re.exec(src);
  if (!hit) return "";
  const open = src.indexOf("{", hit.index);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open + 1, i);
  }
  return "";
}

/** 取 :root 默认档里某个 token 的值。 */
function tokenDefault(name: string): string {
  const root = blockOf(tokensCSS, ":root");
  const m = new RegExp(`${name}\\s*:\\s*([^;}]+)`).exec(root || tokensCSS);
  return m ? m[1].trim() : "";
}

/** 取某个密度块的声明文本。 */
function densityBlock(kind: "compact" | "comfortable"): string {
  const sel = kind === "compact" ? '[data-density="compact"]' : '[data-density="comfortable"]';
  return blockOf(tokensCSS, sel);
}

describe("report-table 的密度档接缝", () => {
  it("单元格内边距走 spacing token（默认值与旧字面量逐像素相同）", () => {
    const td = blockOf(bodyCSS, ".z-rpt__td");
    expect(td).toMatch(/padding:\s*var\(--z-space-[\w-]+\)\s+var\(--z-space-[\w-]+\)/);
    // 合计行必须同款，否则最后一行会比明细高出一截
    const tf = blockOf(bodyCSS, ".z-rpt__tf");
    expect(tf).toMatch(/padding:\s*var\(--z-space-[\w-]+\)\s+var\(--z-space-[\w-]+\)/);
    // 表头同样
    const th = blockOf(tableCSS, ".z-rpt__head .z-rpt__th");
    expect(th).toMatch(/padding:\s*var\(--z-space-[\w-]+\)\s+var\(--z-space-[\w-]+\)/);
  });

  it("字号走 typography token（不是字面量 13px）", () => {
    expect(blockOf(tableCSS, ".z-rpt")).toMatch(/font-size:\s*var\(--z-font-size-/);
    expect(blockOf(tableCSS, ".z-rpt__head .z-rpt__th")).toMatch(/font-size:\s*var\(--z-font-size-/);
    expect(blockOf(bodyCSS, ".z-rpt__tf")).toMatch(/font-size:\s*var\(--z-font-size-/);
  });

  it("上述 token 真的被两个密度档覆盖（否则换成 token 也白搭）", () => {
    const compact = densityBlock("compact");
    const comfortable = densityBlock("comfortable");
    for (const t of ["--z-space-1-5", "--z-space-3", "--z-font-size-sm"]) {
      expect(compact, `compact 缺 ${t}`).toContain(`${t}:`);
      expect(comfortable, `comfortable 缺 ${t}`).toContain(`${t}:`);
    }
  });

  it("默认档取值与替换前一致（6px / 12px / 13px）——替换不得改观感", () => {
    expect(tokenDefault("--z-space-1-5")).toBe("6px");
    expect(tokenDefault("--z-space-3")).toBe("12px");
    expect(tokenDefault("--z-font-size-sm")).toBe("13px");
  });
});
