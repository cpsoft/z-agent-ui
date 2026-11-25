// Test: 对比度守卫 —— 「控件边框要看得见、文字要读得清」变成可算的数字
//
// [WHY 需要它] 2026-11-15 的反馈是「控件对比度太低，很难识别」。这不是审美偏好，
// 而是一个能算出来的量：输入框边框当时是 `--z-color-border` = gray-200，
// 对白底 **1.23:1**；占位符借用「禁用色」gray-400，对白底 **2.56:1**。
// 两条都远低于可用阈值，而**没有任何东西会报错** —— 界面只是「看着发灰」。
//
// 判据分两半，缺一半都不成立：
//   ① 数值：令牌之间的对比度必须过线（WCAG 1.4.11 控件边界 3:1、正文 4.5:1）
//   ② 接线：表单控件必须**真的用了**控件档令牌。只有 ① 的话，把令牌定义得很好看、
//      组件继续用 gray-200，守卫照样全绿 —— 这正是「判据存在但不生效」的经典形态。
//
// 解析口径：直接读 `src/theme/tokens.css`，按 `[data-theme="light"]` / `.dark` 分两个作用域，
// 同作用域内后者覆盖前者（与 CSS 层叠一致）。`var(--a, fallback)` 递归解析。

import { describe, it, expect } from "vitest";
import fs from "node:fs";

const TOKENS = "src/theme/tokens.css";

type Scope = Map<string, string>;

/** 剥注释（本仓已有三次「把注释当代码读」的教训，这里是第四次的机会） */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

function parseScopes(css: string): { light: Scope; dark: Scope } {
  const light: Scope = new Map();
  const dark: Scope = new Map();
  const clean = stripComments(css);
  // 顶层的 `选择器 { ... }`，不处理嵌套（本文件没有嵌套规则块）
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  for (const m of clean.matchAll(blockRe)) {
    const selector = m[1].trim();
    const body = m[2];
    const isDark = /dark/.test(selector);
    const isLight = /data-theme="light"|^:root$/.test(selector);
    if (!isDark && !isLight) continue;
    const target = isDark ? dark : light;
    for (const decl of body.split(";")) {
      const idx = decl.indexOf(":");
      if (idx < 0) continue;
      const name = decl.slice(0, idx).trim();
      const value = decl.slice(idx + 1).trim();
      if (!name.startsWith("--z-")) continue;
      target.set(name, value);
    }
  }
  return { light, dark };
}

/** `var(--a, var(--b, #fff))` → 取值；找不到就返回 null（让调用方看见「没定义」） */
function resolve(scope: Scope, name: string, depth = 0): string | null {
  if (depth > 10) return null;
  const raw = scope.get(name);
  if (raw === undefined) return null;
  const m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(raw.trim());
  if (!m) return raw.trim();
  const inner = resolve(scope, m[1], depth + 1);
  if (inner !== null) return inner;
  if (m[2] !== undefined) {
    const fb = m[2].trim();
    const m2 = /^var\(\s*(--[\w-]+)/.exec(fb);
    return m2 ? resolve(scope, m2[1], depth + 1) : fb;
  }
  return null;
}

function rgb(hex: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 对比度。两色无法解析时抛错 —— 让「取不到值」显式失败，而不是默默跳过。 */
function contrast(aHex: string, bHex: string): number {
  const a = rgb(aHex);
  const b = rgb(bHex);
  if (!a || !b) throw new Error(`无法解析颜色：${aHex} / ${bHex}`);
  const la = luminance(a);
  const lb = luminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

const { light, dark } = parseScopes(fs.readFileSync(TOKENS, "utf8"));

interface Pair {
  fg: string;
  bg: string;
  min: number;
  why: string;
}

const PAIRS: Pair[] = [
  { fg: "--z-color-text", bg: "--z-color-bg", min: 4.5, why: "正文" },
  { fg: "--z-color-text-secondary", bg: "--z-color-bg", min: 4.5, why: "次要文字" },
  { fg: "--z-color-text-secondary", bg: "--z-color-bg-secondary", min: 4.5, why: "次要文字压在浅底上" },
  { fg: "--z-color-text-placeholder", bg: "--z-color-bg", min: 4.5, why: "占位符（用户要读的提示，不是禁用态）" },
  { fg: "--z-color-border-control", bg: "--z-color-bg", min: 3, why: "控件边框（WCAG 1.4.11 要求 3:1）" },
  { fg: "--z-color-border-control", bg: "--z-color-bg-secondary", min: 3, why: "控件边框压在浅底/卡片上" },
  { fg: "--z-color-border-control-hover", bg: "--z-color-bg", min: 4.5, why: "hover 态边框要比静止态更明确" },
  { fg: "--z-color-primary", bg: "--z-color-bg", min: 3, why: "主色（焦点环与链接的可辨识度）" },
];

describe("对比度：控件看得见、文字读得清", () => {
  it("① 两套主题下，每一对颜色的对比度都过线", () => {
    const problems: string[] = [];
    for (const [scopeName, scope] of [
      ["light", light],
      ["dark", dark],
    ] as Array<[string, Scope]>) {
      for (const p of PAIRS) {
        const fg = resolve(scope, p.fg);
        const bg = resolve(scope, p.bg);
        if (!fg || !bg) {
          problems.push(`${scopeName}: ${p.fg} 或 ${p.bg} 取不到值（${fg} / ${bg}）`);
          continue;
        }
        const ratio = contrast(fg, bg);
        if (ratio < p.min) {
          problems.push(
            `${scopeName}: ${p.fg}(${fg}) 对 ${p.bg}(${bg}) = ${ratio.toFixed(2)}:1 < ${p.min}:1 —— ${p.why}`,
          );
        }
      }
    }
    expect(problems, "对比度不足（这是算出来的，不是感觉）：").toEqual([]);
  });

  it("② 控件档必须与容器档不同（否则「分两档」是个空承诺）", () => {
    for (const [scopeName, scope] of [
      ["light", light],
      ["dark", dark],
    ] as Array<[string, Scope]>) {
      const control = resolve(scope, "--z-color-border-control");
      const container = resolve(scope, "--z-color-border");
      expect(control, `${scopeName}: --z-color-border-control 没定义`).toBeTruthy();
      expect(
        control,
        `${scopeName}: 控件边框与容器边框取同一个值 —— 那等于没分档，容器边框会被一起加深`,
      ).not.toBe(container);
    }
  });

  it("③ 表单控件真的接了控件档（只改令牌不改组件 = 判据全绿而界面照旧）", () => {
    const mustUseControl = [
      "src/components/input/input.css",
      "src/components/textarea/textarea.css",
      "src/components/number-input/number-input.css",
      "src/components/select/select.css",
      "src/components/checkbox/checkbox.css",
      "src/components/radio/radio.css",
      "src/components/pagination/pagination.css",
      "src/components/calendar/calendar.css",
      "src/components/m-stepper/m-stepper.css",
      "src/components/m-uploader/m-uploader.css",
    ];
    const missing = mustUseControl.filter((f) => !fs.readFileSync(f, "utf8").includes("var(--z-color-border-control)"));
    expect(missing, "这些控件的轮廓还在用容器档（gray-200，1.23:1）：").toEqual([]);

    // 反向：输入框的外框不许再退回容器档。只看 `solid var(--z-color-border)` 这一形态，
    // 因为文件里还有内部装饰线（输入框内部分隔）可以用容器档。
    const regressed = [
      "src/components/input/input.css",
      "src/components/textarea/textarea.css",
      "src/components/select/select.css",
    ].filter((f) => /border:\s*[^;]*solid var\(--z-color-border\)/.test(fs.readFileSync(f, "utf8")));
    expect(regressed, "这些文件的控件外框又退回容器档了：").toEqual([]);
  });

  it("④ 占位符不许再借用「禁用色」", () => {
    const files = [
      "src/components/input/input.css",
      "src/components/textarea/textarea.css",
      "src/components/number-input/number-input.css",
      "src/components/m-search/m-search.css",
    ];
    const bad: string[] = [];
    for (const f of files) {
      const css = fs.readFileSync(f, "utf8");
      const rule = /[^\n{}]*::placeholder[^{]*\{[^}]*\}/.exec(css);
      if (!rule) continue;
      if (!rule[0].includes("var(--z-color-text-placeholder)")) bad.push(f);
    }
    expect(bad, "占位符还在用 disabled 色（2.56:1）—— 提示文字读不清：").toEqual([]);
  });
});
