// 设计令牌引用守卫：**引用了不存在的 token** 这一类缺陷的机械防线。
//
// [为什么需要] 2026-10-25 审计发现 22 种 token 名在 tokens.css 里根本不存在，而每处引用
// 都带裸 fallback（`var(--z-text-color, #334155)`）—— 浏览器不报错、单测不失败，
// 只有暗色模式下的肉眼能发现整块不跟随。
//
// [为什么不是"批量删 fallback"] 两类用途不能一刀切：兜底（token 存在，fallback 是历史残留）
// 与钩子（token **刻意不定义**，作为宿主覆写点，fallback 就是默认值 —— 删了会全空）。
// 所以本测试不做"有没有 fallback"的判断，而是判断两件事：
//   A. 没有 fallback 的引用，**必须**能在源码某个地方找到定义（否则渲染出无效值）；
//   B. 有 fallback 的"钩子 token"必须与快照清单逐字一致 —— 新增要显式登记（这是对外的
//      覆写 API，得有意识），删掉要同步清理，拼错名字会立刻被抓住。
//
// 判据来源是**源码文本**而不是 getComputedStyle：后者只能看到"算出来是多少"，
// 看不到"这个名字根本没人定义过"（有 fallback 时两者结果一样）。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const SRC = "src";

/**
 * 组件级覆写钩子：**刻意不在 tokens.css 里定义**，由宿主按需覆写，
 * 组件内的 fallback 即默认值。
 *
 * 冻结这份清单的理由：它们等同于一组没有写进文档的公开 API。
 * 新增一个钩子 = 扩大了对外承诺，得有人在 review 时看见；
 * 拼错名字（`--z-gantt-baar-bg`）会在这里变成"新增"，立刻被拦住。
 */
const COMPONENT_HOOKS = new Set([
  "--z-flow-bg",
  "--z-flow-bg-dot",
  "--z-flow-border",
  "--z-flow-box-select-bg",
  "--z-flow-controls-bg",
  "--z-flow-controls-border",
  "--z-flow-controls-btn-active",
  "--z-flow-controls-btn-hover",
  "--z-flow-edge-color",
  "--z-flow-edge-label",
  "--z-flow-handle-bg",
  "--z-flow-handle-border",
  "--z-flow-handle-border-disabled",
  "--z-flow-handle-ring",
  "--z-flow-minimap-bg",
  "--z-flow-minimap-border",
  "--z-flow-minimap-node",
  "--z-flow-minimap-window-bg",
  "--z-flow-node-bg",
  "--z-flow-node-border",
  "--z-flow-node-border-input",
  "--z-flow-node-border-output",
  "--z-flow-node-radius",
  "--z-flow-node-selected-ring",
  "--z-flow-node-shadow",
  "--z-flow-radius",
  "--z-gantt-arrow-color",
  "--z-gantt-bar-bg",
  "--z-gantt-bar-progress-bg",
  "--z-gantt-bar-real-bg",
  "--z-gantt-bar-real-border",
  "--z-gantt-bar-shadow",
  "--z-gantt-bar-text",
  "--z-gantt-bg",
  "--z-gantt-border",
  "--z-gantt-border-soft",
  "--z-gantt-critical-bg",
  "--z-gantt-header-bg",
  "--z-gantt-milestone-bg",
  "--z-gantt-near-critical-bg",
  "--z-gantt-radius",
  "--z-gantt-row-hover",
  "--z-gantt-row-selected",
  "--z-gantt-summary-bg",
  "--z-gantt-summary-border",
  "--z-gantt-today-color",
  "--z-gantt-weekend-bg",
  "--z-rate-color",
  "--z-steps-marker-size",
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".css") || full.endsWith(".ts")) out.push(full);
  }
  return out;
}

interface Ref {
  name: string;
  hasFallback: boolean;
  file: string;
  line: number;
}

/**
 * 定义来源（三者都算）：
 * - CSS 声明 `--z-x: …`
 * - TS 里拼的内联样式 `--z-x: …`（doc-template 的排版变量就是这么下发的）
 * - `setProperty("--z-x", …)`（运行时写宿主变量）
 *
 * [WHY 先剥块注释] 2026-11-15 实测：注释里写一句 `--z-x: 12px` 会被当成**定义**，
 * 于是某处 `var(--z-x)` 的拼写错误凭空「可达」——**假绿**。反过来，注释里写的
 * 示例 `var(--a, #fff)` 会被当成**引用**，逼着人把注释改得含糊。
 * 两个方向都是「注释被当代码读」，所以统一剥掉。
 * 只剥块注释不剥 `//`：TS 里 `//` 后面常跟 URL，按行剥会误伤。
 */
function stripBlockComments(t: string): string {
  return t.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

function scan(): { defined: Set<string>; refs: Ref[]; texts: Array<{ file: string; text: string }> } {
  const defined = new Set<string>();
  const refs: Ref[] = [];
  // [WHY 连剥完注释的正文一起返回] 下面的裸 z-index 用例要再看一遍同一批文件。
  // 2026-11-15 实测：在这个仓库上「把 src/ 的 581 个文���读一遍」本身就要 2.3s，
  // 而两遍 readFileSync + 两遍剥注释正好把那条用例顶过 5s 默认预算（实测 12.1s 才跑完）。
  // 缓存正文是唯一既不加预算也不改变判据的修法 —— 同一进程里源码不会中途变。
  const texts: Array<{ file: string; text: string }> = [];

  for (const file of walk(SRC)) {
    const text = stripBlockComments(readFileSync(file, "utf8"));
    const lineOf = (idx: number) => text.slice(0, idx).split("\n").length;
    texts.push({ file, text });

    for (const m of text.matchAll(/(--z-[a-z0-9-]+)\s*:/g)) defined.add(m[1]);
    for (const m of text.matchAll(/setProperty\(\s*["'](--z-[a-z0-9-]+)/g)) defined.add(m[1]);
    for (const m of text.matchAll(/var\(\s*(--z-[a-z0-9-]+)\s*(,)?/g)) {
      refs.push({ name: m[1], hasFallback: Boolean(m[2]), file, line: lineOf(m.index ?? 0) });
    }
  }
  return { defined, refs, texts };
}

const { defined, refs, texts } = scan();

/**
 * **全局静态令牌**：在 tokens.css 的 `:root` 系列块里定义 —— 任何主题、任何密度下都能解析。
 *
 * [为什么不能用上面的 `defined`] `scan().defined` 把 `setProperty("--z-x", …)` 与内联样式里的
 * `--z-x: …` 也算作「已定义」，而那是**运行时**变量：`--z-tabs-indicator-left` 在 Tabs 首次
 * 渲染前没有值、`--z-doc-*` 在文档模型下发前没有值。它们带 fallback 是**首帧兜底**，删了会闪。
 * 判据必须只认「静态写死在 :root 的」那一类。
 */
function rootTokens(css: string): Set<string> {
  const out = new Set<string>();
  for (const m of css.matchAll(/([^{}]*)\{/g)) {
    if (!m[1].includes(":root")) continue;
    let depth = 1;
    let i = m.index! + m[0].length;
    const start = i;
    while (i < css.length && depth > 0) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}") depth--;
      i++;
    }
    for (const d of css.slice(start, i - 1).matchAll(/(--z-[a-z0-9-]+)\s*:/g)) out.add(d[1]);
  }
  return out;
}

const GLOBAL_TOKENS = rootTokens(readFileSync("src/theme/tokens.css", "utf8"));

describe("设计令牌：引用必须可达", () => {
  // ─────────────────────────────────────────────────────────────
  // 浮层档位
  //
  // [为什么只抓 ≥1000] `z-index: 2` 这类是**层叠上下文内的相对顺序**（节点图里 handle 压在
  // 节点上面），换令牌没有意义也没有对应档位。而 ≥1000 一定是「想压住某个浮层」——
  // 那就必须落在 --z-z-* 的七档里，否则它压得住谁全靠碰运气。
  //
  // 2026-11-15 实测的 5 处，全都是「令牌档位上移过、裸值没跟」：
  //   · select 下拉 1050（dropdown 档是 1000，比它低 50）
  //   · chart tooltip 1000（tooltip 档是 1300，**比它高**，被 modal 盖住）
  //   · m-action-sheet 1000（modal 档是 1100）
  //   · report-card 放大态 9999 / H5 拖拽幽灵 9999+9998（没有对应档位 ⇒ 新增 --z-z-topmost）
  // ─────────────────────────────────────────────────────────────
  it(
    "浮层档位不得写裸数字（≥1000 必须走 --z-z-*）",
    () => {
      const bad: string[] = [];
      // 复用 scan() 里读过、剥过块注释的正文（不重复读盘，理由见 scan() 的注释）
      for (const { file, text: stripped } of texts) {
        const text = stripped.replace(
          /(^|[^:])\/\/[^\n]*/g,
          (m, p1: string) => p1 + " ".repeat(m.length - p1.length),
        );
        for (const m of text.matchAll(/z-index\s*:\s*(\d+)/g)) {
          if (Number(m[1]) < 1000) continue;
          bad.push(`${file}:${text.slice(0, m.index).split("\n").length}  z-index: ${m[1]}`);
        }
      }
      expect(
        bad,
        `请改用档位令牌：--z-z-dropdown(1000) / -modal(1100) / -popover(1200) /\n` +
          `-tooltip(1300) / -toast(1400) / -topmost(9000，拖拽与全屏查看)：\n${bad.join("\n")}`,
      ).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it("剥注释这一步本身是活的（否则「注释被当代码读」会悄悄回来）", () => {
    const src = "a/*\n --z-fake: 1px;\n var(--z-fake2, #fff);\n*/b";
    const out = stripBlockComments(src);
    expect(out).not.toContain("--z-");
    expect(out.startsWith("a")).toBe(true);
    expect(out.endsWith("b")).toBe(true);
    // 换行必须保留，否则报错的行号会整体错位
    expect(out.split("\n").length).toBe(src.split("\n").length);
  });

  it("扫描面是活的（正则失效时不能让后面两条变哑巴）", () => {
    expect(defined.size).toBeGreaterThan(150);
    expect(refs.length).toBeGreaterThan(1500);
    // 抽两个已知的锚点，确认 css 与 ts 两条定义路径都在工作
    expect(defined.has("--z-color-primary")).toBe(true);
    expect(defined.has("--z-doc-body-font")).toBe(true); // 只在 TS 内联样式里出现
  });

  it("没有『引用不存在 + 没有 fallback』的 token（渲染出来是无效值）", () => {
    const broken = refs
      .filter((r) => !r.hasFallback && !defined.has(r.name))
      .map((r) => `${r.file}:${r.line}  ${r.name}`);
    expect(broken, `以下引用的 token 既没定义也没有 fallback：\n${broken.join("\n")}`).toEqual([]);
  });

  it("钩子 token 清单与快照一致（新增/改名都要显式登记）", () => {
    const actual = new Set(refs.filter((r) => r.hasFallback && !defined.has(r.name)).map((r) => r.name));
    const added = [...actual].filter((n) => !COMPONENT_HOOKS.has(n)).sort();
    const removed = [...COMPONENT_HOOKS].filter((n) => !actual.has(n)).sort();

    expect(
      added,
      `出现未登记的组件钩子（确认它是有意的对外覆写点后加进 COMPONENT_HOOKS，\n` +
        `若是拼写错误则改回原 token）：\n${added.join("\n")}`,
    ).toEqual([]);
    expect(
      removed,
      `COMPONENT_HOOKS 里这些已经没有引用了，请从清单删除：\n${removed.join("\n")}`,
    ).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────
  // 死兜底：令牌明明静态定义着，却还写一份值
  //
  // [为什么这算缺陷而不是「保险」] 2026-11-15 实测 803 处：它们**永远不生效**
  // （`var()` 的第一参数解析成功就不会看第二参数），所以不是保险，是一份**没人维护的影子配置**。
  // 而它确实已经漂移了 —— 191 处与令牌真实值不一致，且全是「更早的版本」：
  //   · `var(--z-z-toast, 1200)` 而令牌是 1400、`var(--z-z-tooltip, 1100)` 而令牌是 1300
  //     （层级档位上移过，兜底没跟）
  //   · `var(--z-color-bg-secondary, #f3f4f6)` 而令牌是 #f8fafc（gray → slate 迁移漏了兜底）
  //   · `var(--z-font-size-base, 14px)` 而令牌是 16px
  // 危害有两个，都不是「看起来坏了」：
  //   ① 令牌哪天被删/改名，兜底会静默启用一个**过时**的值 —— 比直接失效更难查；
  //   ② 读代码的人会把兜底当成真实值去推断（实测中我据 `var(--z-input-height, 36px)`
  //      判断「输入框高 36px」，真实是 28px）。
  // ─────────────────────────────────────────────────────────────
  it("引用全局令牌时不得带 fallback（死兜底，已与真实值漂移 191 处）", () => {
    const bad = refs
      .filter((r) => r.hasFallback && GLOBAL_TOKENS.has(r.name) && !r.file.includes("theme/"))
      .map((r) => `${r.file}:${r.line}  ${r.name}`);
    expect(
      bad,
      `这些令牌在 tokens.css 的 :root 里静态定义，fallback 永不生效，删掉它：\n` +
        `（钩子请登记到 COMPONENT_HOOKS，运行时变量保持原样）\n${bad.join("\n")}`,
    ).toEqual([]);
  });

  it("三类令牌的边界没串（全局 / 运行时 / 钩子，各管各的）", () => {
    // 自检：解析不出来时上面那条会「零违规」——最危险的绿
    expect(GLOBAL_TOKENS.size).toBeGreaterThan(200);
    // 全局：静态定义，不准带兜底
    expect(GLOBAL_TOKENS.has("--z-color-border")).toBe(true);
    expect(GLOBAL_TOKENS.has("--z-input-height")).toBe(true);
    // 控件高度基线在第二个 :root 组合块里，只认第一个块会漏掉它
    expect(GLOBAL_TOKENS.has("--z-control-h-sm")).toBe(true);
    // 运行时变量：由 TS 下发，不在 :root
    expect(GLOBAL_TOKENS.has("--z-tabs-indicator-left")).toBe(false);
    expect(GLOBAL_TOKENS.has("--z-doc-para-spacing")).toBe(false);
    // 钩子：刻意不定义
    expect(GLOBAL_TOKENS.has("--z-gantt-bg")).toBe(false);
    expect(GLOBAL_TOKENS.has("--z-flow-node-bg")).toBe(false);
  });

  it("钩子都在组件目录里（tokens.css 不该出现未定义的语义名）", () => {
    const inTokens = refs.filter((r) => r.file.includes("theme/") && !defined.has(r.name) && r.name.startsWith("--z-"));
    // theme/ 下允许引用自身定义之外的，仅限通过 setProperty 暴露的运行时变量；
    // 这里只断言「theme 目录不会引用未定义的 token」，避免主题层自己写错名字
    const bad = inTokens.filter((r) => !r.hasFallback).map((r) => `${r.file}:${r.line} ${r.name}`);
    expect(bad).toEqual([]);
  });

  // [WHY] 2026-10-25：日历区间、tag、outline 按钮 hover、select 激活项、report-table 选中行
  // 共 8 处直接引用了 blue/red/green/yellow 的 50/100 阶。这类「极浅阶」在亮色是近白，
  // 暗色块又不覆盖它们 ⇒ 深色主题下变成一片亮白块，压在上面的近白文字直接隐形
  // （学员原话：「明亮模式下范围看不清，暗夜模式下范围为亮白」）。
  // 这条守卫把「必须走语义层」变成机械判据，而不是靠人记得。
  it("组件不得直接引用极浅阶原始色（暗色语义不稳，必须走 -soft / -tint）", () => {
    // 复用顶部 scan() 的结果，不重新遍历磁盘 —— 单跑 0.9s、全量并发下曾撞 5s 超时
    const SHALLOW = /^--z-color-(?:blue|red|green|yellow|purple)-(?:50|100|200)$/;
    const offenders = refs
      .filter((r) => !r.file.includes("theme/") && SHALLOW.test(r.name)) // 语义层本身就该由原始色板拼出来
      .map((r) => `${r.file}:${r.line}  ${r.name}`);
    expect(
      offenders,
      `组件绕过了语义层。浅阶原始色在亮色是「近白」，暗色不会自动翻转 ——\n` +
        `直接当背景会变成亮白块。请改用 --z-color-{role}-soft（微量染色）\n` +
        `或 --z-color-primary-tint（成片选区）：\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// 对比度：把「配色可读性」变成可重算的断言
//
// [为什么写在这] 2026-10-25 实测：`--z-color-primary` 同时被当作「强调文字色」与
// 「白色文字的实心底」，两个角色在暗色下的最优取值相反（文字要亮、底要深）。
// 结果就是主按钮在暗色只有 3.68、danger 按钮 3.76、success 实心 2.54 —— 全部不达 AA 4.5，
// 而这类问题**没有任何自动化手段能发现**：DOM 断言不看颜色，肉眼在浅色主题下看不出。
// 所以在这里用 WCAG 公式重算，谁把颜色改坏了，谁就红。
// ─────────────────────────────────────────────────────────────

type ColorMap = Record<string, string>;

/** 取出 tokens.css 里某个选择器块内的声明。 */
function tokenBlock(source: string, selector: string): ColorMap {
  const at = source.indexOf(selector);
  if (at < 0) return {};
  const start = source.indexOf("{", at);
  let depth = 0;
  let end = start;
  for (let i = start; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const out: ColorMap = {};
  for (const m of source.slice(start, end).matchAll(/(--z-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const tokensSource = readFileSync("src/theme/tokens.css", "utf8");
const LIGHT = tokenBlock(tokensSource, ":root");
// 暗色块只覆盖部分 token，未覆盖的回落到 :root（CSS 的真实层叠行为）
const DARK_ONLY = tokenBlock(tokensSource, '[data-theme="dark"]');
const DARK: ColorMap = { ...LIGHT, ...DARK_ONLY };

interface Rgb {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** var() 解引用（最多 8 层），支持 `var(--a, #fff)` 形式的兜底。 */
function resolveValue(map: ColorMap, raw: string, depth = 0): string {
  const trimmed = raw.trim();
  // [WHY 认任意变量名而不是只认 --z-*] 2026-10-26 起语义色写成
  // `var(--primary, var(--z-color-blue-600))` 的兼容层（issue IKIDAI：宿主用 shadcn 命名
  // 覆盖即生效）。只认 --z- 前缀会让整个解析链断在兼容层上 —— 表现是「所有配对颜色无法解析」，
  // 那是守卫看不见新形态，不是颜色真坏了。宿主名不在本表时按 CSS 语义取 fallback。
  const m = trimmed.match(/^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*(.+))?\)$/);
  if (!m) return trimmed;
  if (depth > 8) return trimmed;
  const target = map[m[1]];
  if (target) return resolveValue(map, target, depth + 1);
  return m[2] ? resolveValue(map, m[2], depth + 1) : trimmed;
}

function parseColor(map: ColorMap, name: string): Rgb | null {
  const raw = resolveValue(map, `var(${name})`);
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].split("").map((c) => c + c).join("") : hex[1];
    const n = parseInt(h, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgba = raw.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)$/i);
  if (rgba) {
    return { r: +rgba[1], g: +rgba[2], b: +rgba[3], a: rgba[4] === undefined ? 1 : +rgba[4] };
  }
  return null;
}

/** 半透明前景先与背景做 alpha 合成，再算对比度（rgba 的 soft 底必须这样算才真实）。 */
function over(fg: Rgb, bg: Rgb): Rgb {
  if (fg.a >= 1) return fg;
  const mix = (f: number, b: number) => Math.round(f * fg.a + b * (1 - fg.a));
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a: 1 };
}

function luminance(c: Rgb): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

function contrast(map: ColorMap, fgName: string, bgName: string): number | null {
  const bg = parseColor(map, bgName);
  const fg = parseColor(map, fgName);
  if (!bg || !fg) return null;
  const bgSolid = over(bg, parseColor(map, "--z-color-bg") ?? { r: 255, g: 255, b: 255, a: 1 });
  const fgSolid = over(fg, bgSolid);
  const [hi, lo] = [luminance(fgSolid), luminance(bgSolid)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 需要 AA（4.5:1）的文本配对。表里每一行都是一个真实使用场景。 */
const TEXT_PAIRS: Array<[label: string, fg: string, bg: string]> = [
  ["正文 / 页面底", "--z-color-text", "--z-color-bg"],
  ["次级文字 / 页面底", "--z-color-text-secondary", "--z-color-bg"],
  ["正文 / 浅底", "--z-color-text", "--z-color-bg-subtle"],
  ["次级文字 / 浅底", "--z-color-text-secondary", "--z-color-bg-subtle"],
  ["强调色当文字 / 页面底", "--z-color-primary", "--z-color-bg"],
  ["主按钮：白字 / 实心底", "--z-color-primary-text", "--z-color-primary-solid"],
  ["主按钮：白字 / hover", "--z-color-primary-text", "--z-color-primary-solid-hover"],
  ["主按钮：白字 / active", "--z-color-primary-text", "--z-color-primary-solid-active"],
  ["危险按钮：白字 / 实心底", "--z-color-danger-text", "--z-color-danger-solid"],
  ["危险按钮：白字 / hover", "--z-color-danger-text", "--z-color-danger-solid-hover"],
  ["警告按钮：黑字 / 实心底", "--z-color-warning-text", "--z-color-warning"],
  ["成功实心：白字 / 底", "--z-color-success-text", "--z-color-success-solid"],
  ["信息实心：白字 / 底", "--z-color-info-text", "--z-color-info-solid"],
  ["成功提示：strong / soft", "--z-color-success-strong", "--z-color-success-soft"],
  ["警告提示：strong / soft", "--z-color-warning-strong", "--z-color-warning-soft"],
  ["危险提示：strong / soft", "--z-color-danger-strong", "--z-color-danger-soft"],
  ["信息提示：strong / soft", "--z-color-info-strong", "--z-color-info-soft"],
  // 标签：极浅底 + 深色字（暗色翻成淡底 + 亮字）。原先底字都是原始色板，两边都不跟随主题。
  ["标签 primary：strong / soft", "--z-color-primary-strong", "--z-color-primary-soft"],
  ["标签 success：strong / soft", "--z-color-success-strong", "--z-color-success-soft"],
  ["标签 warning：strong / soft", "--z-color-warning-strong", "--z-color-warning-soft"],
  ["标签 danger：strong / soft", "--z-color-danger-strong", "--z-color-danger-soft"],
];

describe("设计令牌：对比度（WCAG AA）", () => {
  it("解析器本身是可信的（拿已知值对照，防止解析失败后全部返回 null）", () => {
    expect(parseColor(LIGHT, "--z-color-white")).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor(LIGHT, "--z-color-black")).toEqual({ r: 0, g: 0, b: 0, a: 1 });
    // 白底黑字 = 21:1，解析链（hex → 变量 → 变量）全通才会得到这个数
    expect(contrast(LIGHT, "--z-color-white", "--z-color-black")).toBeCloseTo(21, 0);
  });

  for (const theme of ["light", "dark"] as const) {
    it(`${theme} 主题：所有文本配对 ≥ 4.5:1`, () => {
      const map = theme === "light" ? LIGHT : DARK;
      const failures: string[] = [];
      for (const [label, fg, bg] of TEXT_PAIRS) {
        const ratio = contrast(map, fg, bg);
        if (ratio === null) {
          failures.push(`${label}（${fg} / ${bg}）颜色无法解析`);
        } else if (ratio < 4.5) {
          failures.push(`${label}（${fg} / ${bg}）= ${ratio.toFixed(2)}:1`);
        }
      }
      expect(failures, `${theme} 主题下不达 AA 的配对：\n${failures.join("\n")}`).toEqual([]);
    });
  }

  it("实心填充层不随主题变化（它只服务于白字底，跟着主题变亮就会掉到 3:1）", () => {
    for (const name of [
      "--z-color-primary-solid",
      "--z-color-primary-solid-hover",
      "--z-color-primary-solid-active",
      "--z-color-danger-solid",
      "--z-color-success-solid",
      "--z-color-info-solid",
    ]) {
      expect(DARK_ONLY[name], `${name} 不该在暗色块里被覆盖`).toBeUndefined();
      expect(LIGHT[name], `${name} 未定义`).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 选区可辨识度：不是「文字好不好读」，而是「选区看不看得见」
//
// [为什么单独一组] 2026-10-25 学员报障日历的「pick a range」：
//   · 亮色下区间带是 #eff6ff 压 #fff，只差 1.14 —— 32px 的格子里几乎看不出选区（原话「看不清」）；
//   · 暗色下同一个值是亮白块，而格内文字继承 --z-color-text（近白）⇒ 白字压白底 1.05，日期隐形
//     （原话「范围为亮白」）。
// 这两个问题都不会被 AA 文本断言抓住（文字在「正确」的底上是对比达标的，只是底错了），
// 也不会被 DOM 断言抓住。所以给「面 vs 面」单独定阈值。
// ─────────────────────────────────────────────────────────────

describe("设计令牌：选区可辨识度", () => {
  // 面板/卡片上的成片选区（日历区间带、表格选中行）与底板的亮度差必须落在一个**区间**内：
  // 下限 = 不能被看成白底（那就是「看不清」）；上限 = 不能亮到变成一块白斑
  // （暗色主题下沿用亮色值就是这个后果 —— 12.9 的对比度，视觉上是一块亮白）。
  const SURFACE_RANGE: Record<"light" | "dark", [lo: number, hi: number]> = {
    light: [1.2, 2],
    dark: [1.3, 4],
  };

  it("区间带在两种主题下都与底板可分，且不越界成白斑", () => {
    const failures: string[] = [];
    for (const theme of ["light", "dark"] as const) {
      const map = theme === "light" ? LIGHT : DARK;
      const [lo, hi] = SURFACE_RANGE[theme];
      const ratio = contrast(map, "--z-color-primary-tint", "--z-color-bg");
      if (ratio === null) failures.push(`${theme}：无法解析`);
      else if (ratio < lo || ratio > hi) {
        failures.push(`${theme} = ${ratio.toFixed(2)}（应落在 ${lo}–${hi}:1）`);
      }
    }
    expect(failures, `区间带与底板的反差不在合理区间：\n${failures.join("\n")}`).toEqual([]);
  });

  it("区间带上的文字仍达 AA（看见选区不能以牺牲可读性为代价）", () => {
    const failures: string[] = [];
    for (const theme of ["light", "dark"] as const) {
      const map = theme === "light" ? LIGHT : DARK;
      const ratio = contrast(map, "--z-color-text", "--z-color-primary-tint");
      if (ratio === null) failures.push(`${theme}：无法解析`);
      else if (ratio < 4.5) failures.push(`${theme} = ${ratio.toFixed(2)}`);
    }
    expect(failures, `区间带上的正文不达 AA：\n${failures.join("\n")}`).toEqual([]);
  });

  it("tint 必须在暗色块里重新定义（沿用亮色值就是那块亮白）", () => {
    for (const name of ["--z-color-primary-tint", "--z-color-primary-tint-hover"]) {
      expect(LIGHT[name], `${name} 未定义`).toBeDefined();
      expect(DARK_ONLY[name], `${name} 必须在 [data-theme="dark"] 里覆盖`).toBeDefined();
    }
  });

  it("tint 比 soft 更实（否则区间带和 hover 底分不开）", () => {
    // 用「与白底的反差」近似比较：tint 必须比 soft 深
    for (const theme of ["light", "dark"] as const) {
      const map = theme === "light" ? LIGHT : DARK;
      const soft = contrast(map, "--z-color-primary-soft", "--z-color-bg");
      const tint = contrast(map, "--z-color-primary-tint", "--z-color-bg");
      expect(soft, `${theme}：soft 无法解析`).not.toBeNull();
      expect(tint, `${theme}：tint 无法解析`).not.toBeNull();
      expect(tint! - soft!, `${theme}：tint 应比 soft 更明显`).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 页面体系样式：档位与语义
//
// [为什么单列一组] 2026-10-26 审计的结论不是「token 拼错了」——引用可达性是 0 违例。
// 问题全在**档位写对但语义写反**，而上面所有断言对此都是瞎的：
//   · 分隔线用 `-border-soft`（它 = gray-300，比 `-border` 的 gray-200 更深）→ 缝比边框重
//   · 删除按钮用 `-danger`（red-500）当文字色 → 3.76:1，规范 §3.5 自己就把这个数列在反面
//   · focus 手写 `0 0 0 2px var(-primary-soft)` → 1.04:1，光环实际看不见
//   · demo/page-def.css 引用 3 个不存在的 token，靠 fallback 活了半年，暗色从不跟随
// 这四条都不会让 DOM 断言变红（元素都在、class 都对），只能靠源码判据。
//
// [为什么只覆盖 4 个文件] 这 4 个是用户真正看到的两个页面，也是问题最密集处。
// 同源缺陷在全仓还有存量（`-danger` 当文字色 23 处、`!important` 12 处），
// 一次性收进来会让本测试长期红着 —— 红着的守卫等于没有守卫。
// 逐个子系统收口，比一条永远失败的全仓断言有用。
// See: wiki/audits/2026-10-26-pagedef-style-audit.md
// ─────────────────────────────────────────────────────────────



/**
 * 对外色板：`--z-badge-*`。
 *
 * [WHY 单独钉住] 2026-11-14 的 L0 孤儿令牌统计把它们算成了「25 个组件令牌里的 16 个残留，
 * 建议下版本删除」—— **判错了**。它们不是给组件用的，是给**页面作者内联用**的：
 * z-report-table 以 innerHTML 渲染状态角标，内容落在它的 shadow DOM 里，外部 CSS 命不中，
 * 只能写 `style="color:var(--z-badge-red-fg)"`。所以「源码里零 var() 引用」正是它的设计，
 * 而不是没人用。删掉不会报错，只会让所有页面里的状态角标在暗色下变白块。
 *
 * 判据只有一条：明暗两套都在。少一套就是「暗色下刺眼」的经典故障。
 */
const PUBLIC_PALETTE = [
  "--z-badge-green-bg", "--z-badge-green-fg",
  "--z-badge-amber-bg", "--z-badge-amber-fg",
  "--z-badge-orange-bg", "--z-badge-orange-fg",
  "--z-badge-red-bg", "--z-badge-red-fg",
  "--z-badge-blue-bg", "--z-badge-blue-fg",
  "--z-badge-violet-bg", "--z-badge-violet-fg",
  "--z-badge-slate-bg", "--z-badge-slate-fg",
  "--z-badge-solid-bg", "--z-badge-solid-fg",
];

describe("令牌 · 对外色板（页面内联用）", () => {
  it("16 个 badge 色在明暗两套里都定义", () => {
    for (const name of PUBLIC_PALETTE) {
      expect(LIGHT[name], `${name} 未在 :root 定义`).toBeDefined();
      expect(DARK_ONLY[name], `${name} 未在 [data-theme="dark"] 给出对应值`).toBeDefined();
    }
  });
});
