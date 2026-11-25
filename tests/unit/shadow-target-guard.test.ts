// 影子边界：挂在**宿主**上的点击监听，不许用 `e.target` 找内层元素。
//
// Related: [[REQ-056-shadow-target-audit]]
// Date: 2026-11-24
//
// [为什么需要它] 事件从 shadow 树里冒泡出来、到宿主上被监听时，`target` 已被重定向成
// **宿主本身**。于是 `this.addEventListener("click", ...)` 里写
// `(e.target as HTMLElement).closest("[data-key]")` 恒为 null —— 表现是「点了没反应」，
// 而控制台干净、lint 干净、jsdom 单测也全绿（jsdom 不做这步重定向）。
//
// 2026-11-24 一笔真浏览器审计在这一类写法上抓到三处实打实的坏件：
// `m-tabs`（点页签不切）、`segmented`（点段不选）、`m-checkout-bar`（提交 / 全选不报）。
// 这一天之前在 `m-goods-card` / `m-coupon` 上抓到过同一类。
//
// [判据] 只认 `this.addEventListener(...)` 注册的处理函数体（`this.shadowRoot` 上注册的
// 在同一棵影子树里，`target` 不重定向 —— 不在此列）。体内出现 `.target` 且没有
// `composedPath` 就算违规：要么改 `composedPath()[0]`，要么这行判据本来就该删。
//
// [为什么不是白名单] 这一条没有「暂时例外」：修法是一行，改不动说明判据本身不成立。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const ROOT = resolve(__dirname, "../..");
const COMP = resolve(ROOT, "src/components");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** 去掉 `//` 行注释与 `/* *\/` 块注释 —— 注释里讲「target 会被重定向」不算违规。 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/([^:"'`])\/\/[^\n]*/g, "$1");
}

/** 从 `open`（指向 `{`）起抠出配对大括号之间的内容。 */
function braceBody(src: string, open: number): string | null {
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    else if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  return null;
}

/**
 * 取某个处理函数体的文本：`_onClick = (e) => { … }` 与 `_onClick(e) { … }` 两种写法。
 * 找不到（比如它只做转发，函数体在别的文件）就返回 null —— 那种情况由调用链本来就不违规。
 */
function bodyOf(src: string, name: string): string | null {
  const arrow = new RegExp(`(?:private\\s+|protected\\s+)?${name}\\s*=\\s*(?:async\\s*)?\\([^)]*\\)[^=]*?=>\\s*\\{`, "m");
  const method = new RegExp(`(?:private\\s+|protected\\s+)?${name}\\s*\\([^)]*\\)[^{;]*\\{`, "m");
  for (const re of [arrow, method]) {
    const m = re.exec(src);
    if (m) return braceBody(src, m.index + m[0].length - 1);
  }
  return null;
}

/** 宿主上注册的 click 处理：既要函数名，也要内联箭头。 */
function hostClickHandlers(src: string): Array<{ name: string; body: string | null }> {
  const out: Array<{ name: string; body: string | null }> = [];
  const named = /this\.addEventListener\(\s*"click"\s*,\s*this\.(\w+)/g;
  for (let m = named.exec(src); m; m = named.exec(src)) {
    out.push({ name: `this.${m[1]}`, body: bodyOf(src, m[1]) });
  }
  const inline = /this\.addEventListener\(\s*"click"\s*,\s*\(?\s*\w*\s*\)?\s*=>\s*\{/g;
  for (let m = inline.exec(src); m; m = inline.exec(src)) {
    out.push({ name: "内联箭头", body: braceBody(src, m.index + m[0].length - 1) });
  }
  return out;
}

describe("影子边界：宿主监听不许用 e.target 找内层节点", () => {
  it(
    "src/components 下所有宿主 click 处理函数都经 composedPath 取内层节点",
    () => {
      const bad: string[] = [];
      for (const file of walk(COMP)) {
        if (file.endsWith("/index.ts")) continue;
        const src = stripComments(readFileSync(file, "utf8"));
        if (!src.includes('this.addEventListener("click"')) continue;
        for (const h of hostClickHandlers(src)) {
          if (!h.body) continue;
          if (!/\.target\b/.test(h.body)) continue;
          if (/composedPath/.test(h.body)) continue;
          bad.push(`${relative(ROOT, file)} → ${h.name}`);
        }
      }
      expect(
        bad,
        `宿主上的 click 监听里 e.target 是宿主本身（跨 shadow 被重定向），closest 恒 null：\n` +
          `改成 (e.composedPath()[0] ?? e.target)；判据本来就不可达的就删掉。\n  ` +
          bad.join("\n  "),
      ).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it("判据自身有效：拿一个违规样本喂进去能红", () => {
    // 守卫最容易变成「永远是绿的」：正则写歪、扫空目录、匹配不上都表现为通过。
    // 这里固定一份最小样本，确保上面那条真的在看 `this.addEventListener`。
    const sample = [
      "class X {",
      "  connectedCallback() { this.addEventListener(\"click\", this._onClick); }",
      "  private _onClick = (e: Event): void => {",
      "    const btn = (e.target as HTMLElement).closest(\"[data-key]\");",
      "    use(btn);",
      "  };",
      "}",
    ].join("\n");
    const src = stripComments(sample);
    const [h] = hostClickHandlers(src);
    expect(h?.name).toBe("this._onClick");
    expect(/\.target\b/.test(h!.body!)).toBe(true);
    expect(/composedPath/.test(h!.body!)).toBe(false);

    // 改对之后必须不再命中
    const fixed = stripComments(sample.replace("e.target", "(e.composedPath()[0] ?? e.target)"));
    expect(/composedPath/.test(hostClickHandlers(fixed)[0]!.body!)).toBe(true);
  });
});
