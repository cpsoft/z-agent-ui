// 转义：所有组件域里不许再手写 HTML 转义。
//
// Related: [[REQ-038-layered-architecture]] · [[bug-20261025-xss-injection]]
// Wiki: wiki/bugs/bug-20261025-xss-injection.md
// Date: 2026-11-14
//
// [为什么需要它] 库里原本有 37 处自写转义，其中 **13 处只转 `& < >`**。这些助手
// 一旦被用在属性位置（单/双引号属性），少转一个引号就是一条注入路径 —— 而它
// 平时完全正常，只有遇到含引号的输入才漏。`escapeAttr` 已经连 `'` 一起转，
// 且 `null`/`undefined` 产出空串而不是字面量 "null"。
//
// 37 处里 28 个是私有助手、1 个是 markdown 的 escapeHTML、4 个是被别的模块
// import 的 `esc`（改成 escapeAttr 的再导出，保留名字）。B1 已清零。
//
// [为什么判据是「replace(/&/g」] 任何手写转义都以它开头 —— 先转 `&` 再转别的，
// 否则二次转义。反过来，见到 `replace(/&/g, "&amp;")` 就一定有第二套实现。
// 不按「有没有 escapeHtml 这个函数名」判，因为改名很容易绕过。
//
// [为什么不能只查 escapeHtml 调用] 有实现藏在 `private _esc` / `const esc = (s) => …`
// 里，名字随人起。查实现特征比查名字可靠。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

// [WHY 本文件整体放宽到 SCAN_TIMEOUT_MS] 这里每条用例都扫一遍 src 全树（读 580+ 文件 / 5MB）。
// 单跑 2 秒，但 `bin/check-guards.mjs` 是 18 个文件并行 —— 实测这时会窜到 9 秒以上，
// 撞上 vitest 默认的 5000ms，报「扫描器真的读到了文件」失败。
// 那条断言本来是防「路径写错导致零违规」的假绿，结果自己被超时打成红的：
// 一条假红比没有守卫更糟 —— 会让人开始习惯性忽略它。
vi.setConfig({ testTimeout: SCAN_TIMEOUT_MS });

const ROOT = resolve(__dirname, "../..");

/**
 * 扫描面 = 所有**渲染 HTML 的域**，不只是 L1。
 *
 * [WHY 2026-11-14 从 `src/components` 扩到全部域] 组件按域分组之后，写死
 * `src/components` 会让这条规则**恰好漏掉最需要它的地方**：report-table 用
 * innerHTML 渲染整张表、gantt 拼 SVG、doc-template 生成文档结构 —— 都是拼字符串，
 * 都在 `src/report` / `src/editor` 里。B1 清掉的 37 处自写转义中，就有 4 处本来
 * 在这两个域（`report-table-types` / `doc-template/render` / `data-list-render` /
 * `flow-geometry` 的 `esc`）。
 *
 * [WHY 名字里去掉 L1] 规则本身就是「全库只有一处实现」，不是「L1 不许写」。
 * 文件当时叫 l1-escape 是因为它跟着 B1 上线，不意味着边界止于 L1。
 */
// 组件库里的全部「会拼字符串」的域。`src/editor` 不在本仓库（页面引擎那边），
// 而 doc / content / property 同属 L2、同样拼 HTML，原先靠 editor 顺手覆盖到，
// 拆开后必须显式列上，否则规则恰好漏掉最需要它的地方。
const DOMAINS = [
  "src/components",
  "src/report",
  "src/flow",
  "src/doc",
  "src/content",
  "src/property",
  "src/app",
].map((d) => resolve(ROOT, d));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** 剥注释保留行号（理由见 l0-boundary-guard）。 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, keep: string) => keep + " ".repeat(m.length - keep.length));
}

/** 手写转义的特征：把 `&` 替换成实体。 */
const HANDMADE_ESCAPE = /\.replace\(\s*\/&\/(?:g|gy)?\s*,\s*["']&amp;["']\s*\)/g;

describe("L1 转义：只有一处实现（core 的 escapeAttr / escapeHtml）", () => {
  it("扫描器真的读到了文件（防止路径写错导致「零违规」的假绿）", () => {
    const files = DOMAINS.flatMap((d) => walk(d));
    const total = files.reduce((n, f) => n + readFileSync(f, "utf8").length, 0);
    // 基线：2026-11-14 B2 完成后实测 340 个 .ts / 1 673 568 字符
    // （components 150 · report 87 · editor 82 · app 10 · flow 11）。阈值取八成。
    // 再搬域时要回到这里重算 —— 但搬迁已收口，之后只会涨。
    expect(files.length, "只扫到这么点文件，多半是路径写错了").toBeGreaterThan(270);
    expect(total, "总字符数太小时，「没找到违规」没有意义").toBeGreaterThan(1_300_000);
  });

  it("所有组件域里没有手写的 & → &amp; 替换", () => {
    const hits: string[] = [];
    for (const file of DOMAINS.flatMap((d) => walk(d))) {
      const text = stripComments(readFileSync(file, "utf8"));
      for (const m of text.matchAll(HANDMADE_ESCAPE)) {
        const line = text.slice(0, m.index ?? 0).split("\n").length;
        hits.push(`  ${relative(ROOT, file).split(sep).join("/")}:${line}  ${m[0]}`);
      }
    }
    expect(
      hits,
      `这些地方在自写转义。改成 import { escapeAttr } from "<相对路径>/core/index.js" —— ` +
        `它连 ' 与 " 一起转，且是唯一实现：\n${hits.join("\n")}`,
    ).toEqual([]);
  });
});
