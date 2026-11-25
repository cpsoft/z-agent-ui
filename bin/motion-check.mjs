#!/usr/bin/env node
// 动效契约的静态守卫：四条规则，每条对应一类**已经发生过**的退化。
//
// [WHY 需要它，而不是靠文档] 2026-11-17 归位时实测：全仓 41 处动效声明里 4 处是裸时长、
// 11 处把「复合值 + 缓动」写进 `animation` 简写。后者不是风格问题 —— 真实浏览器里
// `animation: z-x var(--z-transition-normal) ease-out` 展开成 `250ms ease ease-out`，
// 两个 timing function ⇒ 整条声明作废 ⇒ `animationName` 变 `none`。
// 而 `z-drawer` 的退场是 **等 animationend 才隐藏**的（primitives/overlay/dialogState.ts），
// 动画不跑 ⇒ 事件永不触发 ⇒ 抽屉关不掉。规范 §5 当时只禁了 `transition: 0.15s`，
// 这条路一直是敞的。守住，比在下一次事故里重新推理一遍便宜。
//
// 规则：
//   R1  `transition` / `animation` 的值里出现裸时长（`120ms` / `0.6s`）且不含 `var(--z-`
//       → 绕过 token。只有值是 token，才能被主题 / 密度 / reduced-motion 控制。
//   R2  `animation` 简写引用 `var(--z-transition-*)`（复合值） → 双 timing function，声明作废。
//       合法写法是 `var(--z-duration-*) var(--z-ease-*)`（纯时长 + 单曲线）。
//   R3  `tokens.css` 里定义的 `--z-duration-*` 叶子没有在 `prefers-reduced-motion` 段归零
//       → 元素被 `* { transition-duration: 0ms !important }` 兜住了，看起来没动，
//         但 JS 按 token 算出来的等待时长仍是 150ms（实测 F6/C 组）。
//   R4  `prefers-reduced-motion` 段**之后**还有块在定义动效变量
//       → 归零被静默覆盖，症状同 R3 且更难查（实测 F6/F 组）。
//
// 豁免：`/* motion-check-ignore: 理由 */` 写在声明前 3 行内或同一行。
//       理由必须写 —— 空白豁免等于把守卫改成沉默。
//
// 用法：node bin/motion-check.mjs        校验（0 = 通过）
//       node bin/motion-check.mjs --list 只列命中项
//       node smoke/motion-check-mutation.mjs  变异验证（四条规则各注入一条违规，确认会红）

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const LIST_ONLY = process.argv.includes("--list");

/** 扫描范围：只扫 `src/`。`.ts` 也必须扫 —— 组件的内联样式在模板字符串里，是 CSS 的另一半。 */
const SCAN_DIRS = ["src"];
const SCAN_EXT = /\.(css|ts)$/;
/** 明确豁免的文件：doc-template 是文档产物的快照，markdown.css 是排版基线。 */
const SKIP_FILES = [/^src\/doc\/doc-template\//, /\/markdown\.css$/, /\.min\.(css|js)$/];

// `.2s` 也是合法 CSS 时长 —— 第一版正则只认「数字开头」，变异验证当场漏掉了这种写法
const DURATION_LITERAL = /(?<![\w.-])(?:\d+(?:\.\d+)?|\.\d+)m?s\b/;
const COMPOUND_VAR = /var\(\s*--z-transition-[a-z-]+\s*\)/;
const TOKENS = "src/theme/tokens.css";

const problems = [];
const push = (file, line, rule, msg) => problems.push({ file, line, rule, msg });

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(e.name)) out.push(p);
  }
  return out;
}

const lineOf = (src, pos) => src.slice(0, pos).split("\n").length;

/** 取 `pos` 之前 4 行，用于判豁免。 */
function isExempt(src, pos) {
  const from = Math.max(0, src.lastIndexOf("\n", Math.max(0, pos - 1)) - 400);
  return /motion-check-ignore/.test(src.slice(from, pos));
}

/** 从 `:` 之后读到声明结束（`;` 或 `}`），跨行也算 —— transition 常被换行写。 */
function readDeclarationValue(src, from) {
  let depth = 0;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    else if (depth === 0 && (c === ";" || c === "}")) return src.slice(from, i);
  }
  return src.slice(from);
}

const squash = (s) => s.trim().replace(/\s+/g, " ");

/** R1 + R2：逐条 `transition` / `animation` 声明。 */
function checkDeclarations(absPath) {
  const rel = relative(ROOT, absPath).replaceAll("\\", "/");
  if (SKIP_FILES.some((re) => re.test(rel))) return;
  const src = readFileSync(absPath, "utf8");

  const re = /(?:^|[\s;{])(transition|animation)\s*:/gm;
  let m;
  while ((m = re.exec(src))) {
    const propStart = m.index + (m[0].length - m[1].length - 1);
    const value = readDeclarationValue(src, m.index + m[0].length);
    // 整行被注释掉的写法（`/* transition: ... */`）不算声明
    const lineStart = src.lastIndexOf("\n", propStart) + 1;
    if (/^\s*(\/\/|\*|\/\*)/.test(src.slice(lineStart, propStart))) continue;
    if (isExempt(src, propStart)) continue;

    const dur = DURATION_LITERAL.exec(value);
    if (dur && !value.includes("var(--z-")) {
      push(rel, lineOf(src, propStart), "R1", `${m[1]} 值里有裸时长 ${dur[0]} —— ${squash(value)}`);
    }
    if (m[1] === "animation" && COMPOUND_VAR.test(value)) {
      push(
        rel,
        lineOf(src, propStart),
        "R2",
        `animation 简写引用了复合值 —— ${squash(value)}；会展开成双 timing function，整条声明作废`,
      );
    }
  }
}

/** 把 `@media (prefers-reduced-motion: reduce)` 块的起止位置找出来（花括号配平）。 */
function reduceBlockRange(src) {
  const start = src.search(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  if (start < 0) return null;
  let depth = 0;
  let opened = false;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") {
      depth++;
      opened = true;
    } else if (src[i] === "}") {
      depth--;
      if (opened && depth === 0) return { start, end: i + 1 };
    }
  }
  return { start, end: src.length };
}

/** R3：`:root` 里定义的 duration 叶子，必须在 reduced-motion 段里归零。 */
function checkReducedMotionLeaves() {
  const src = readFileSync(join(ROOT, TOKENS), "utf8");
  const range = reduceBlockRange(src);
  if (!range) {
    push(TOKENS, 0, "R3", "找不到 prefers-reduced-motion 段");
    return;
  }
  const reduceBlock = src.slice(range.start, range.end);
  const seen = new Set();
  for (const m of src.matchAll(/^\s*(--z-duration-[a-z-]+)\s*:\s*([^;]+);/gm)) {
    const leaf = m[1];
    if (seen.has(leaf)) continue; // 只按首个定义报一次（data-motion 等覆写块里还有同名行）
    seen.add(leaf);
    if (new RegExp(`${leaf}\\s*:\\s*0m?s\\s*;`).test(reduceBlock)) continue;
    push(
      TOKENS,
      lineOf(src, m.index),
      "R3",
      `${leaf} 没在 prefers-reduced-motion 段归零 —— 元素被 !important 兜住，但 JS 读 token 算出的等待时长仍非 0`,
    );
  }
}

/** R4：reduced-motion 段之后不得再有块定义动效变量。 */
function checkOverrideOrder() {
  const src = readFileSync(join(ROOT, TOKENS), "utf8");
  const range = reduceBlockRange(src);
  if (!range) return;
  const after = src.slice(range.end);
  for (const m of after.matchAll(/^\s*(--z-(?:duration|ease|transition)-[a-z-]+)\s*:\s*[^;]+;/gm)) {
    push(
      TOKENS,
      lineOf(src, range.end + m.index),
      "R4",
      `${m[1]} 定义在 prefers-reduced-motion 段之后 —— 会把归零静默盖掉`,
    );
  }
}

for (const dir of SCAN_DIRS) {
  try {
    statSync(dir);
  } catch {
    continue;
  }
  for (const f of walk(dir)) checkDeclarations(f);
}
checkReducedMotionLeaves();
checkOverrideOrder();

problems.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

if (LIST_ONLY) {
  for (const p of problems) console.log(`${p.file}:${p.line}  [${p.rule}]  ${p.msg}`);
  process.exit(0);
}

if (!problems.length) {
  console.log("MOTION_OK  动效声明全部走 token；reduced-motion 归零覆盖完整且位置正确");
  process.exit(0);
}

console.error(`[motion:check] 命中 ${problems.length} 处：`);
for (const p of problems) console.error(`  ${p.file}:${p.line}  [${p.rule}] ${p.msg}`);
console.error("");
console.error("修法：");
console.error("  R1 → 换成 var(--z-duration-*) / var(--z-transition-*)；确实没有对应档位时加");
console.error("       /* motion-check-ignore: 为什么这条不能归位 */");
console.error("  R2 → animation 只用纯时长：var(--z-duration-*) var(--z-ease-*)，禁止复合值");
console.error("  R3 → 在 tokens.css 的 prefers-reduced-motion 段补上该叶子归零");
console.error("  R4 → 把那个块挪到 prefers-reduced-motion 段之前");
process.exit(1);
