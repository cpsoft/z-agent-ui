#!/usr/bin/env node
// 文件规模闸门：按 `wiki/reference/component-implementation-standard.md` §9 的三条硬线，
// 拦住「拆完之后重新变胖」。
//
// [WHY 需要它，而不是再审计一次] 2026-10-25 的审计结论是「src 下已无 >600 行文件」，
// 三周后是 27 个。更关键的是拆过的文件又长回去了（`ReportTable` 433 → 1003、
// `Flow` 441 → 640、`Gantt` 448 → 707）——拆分一次只解决那一次，没有机制阻止它回涨。
// 而回涨是**不报错**的：构建通过、测试全绿、控制台干净，只有下一次审计才看得见。
//
// 规则：
//   G1 新增超标：超过阈值且不在基线 ⇒ 失败。新文件从一开始就要守住线。
//   G2 回涨：在基线里，但当前行数 > 基线值 ⇒ 失败。这是本闸门的核心 —— 基线不是
//      「许可证」，是「当前欠债的准确记账」，只许减不许增。
//   G3 死条目：基线里有，文件已不存在 ⇒ 失败。与 `layer-guard` G0 同一条教训：
//      条目留着而对象没了，守卫会以为自己还在保护它。
//   G4 已达标未清理：在基线里，但当前 ≤ 阈值 ⇒ 失败。拆完就该从欠债表里划掉，
//      否则这张表会慢慢变成「历史清单」，G2 也就失去意义。
//   G5 自检：扫描面的文件数低于下限 ⇒ 失败。路径写错 / 目录改名会让 G1–G4 全部
//      无事可判而退出码 0 —— 那就是一条恒绿的守卫。
//
// 阈值来自规范，不在这里发明：
//   · `src/**/*.ts`   > 600 行 必须拆分
//   · `src/**/*.css`  > 400 行 按区块拆文件
//   · `tests/**/*.ts` > 600 行 按行为域拆文件
//
// 用法：
//   node bin/lines-guard.mjs            校验（0 = 通过）
//   node bin/lines-guard.mjs --list     只列超标项与基线差值
//   node bin/lines-guard.mjs --update   按实测重写基线（只允许下调 / 删除；新增或上调要 --force）
//   node bin/lines-guard.mjs --update --force   允许上调 / 新增（拆了一半的中间态才用，须在提交说明里写明）

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = resolve(ROOT, "bin/lines-baseline.json");
const LIST_ONLY = process.argv.includes("--list");
const UPDATE = process.argv.includes("--update");
const FORCE = process.argv.includes("--force");

/** 三条硬线。`threshold` 是「超过就要拆」的行数（严格大于）。 */
const RULES = [
  { id: "src-ts", root: "src", ext: ".ts", threshold: 600, label: "组件 .ts" },
  { id: "src-css", root: "src", ext: ".css", threshold: 400, label: "组件 .css" },
  { id: "tests-ts", root: "tests", ext: ".ts", threshold: 600, label: "测试 .ts" },
];

/**
 * 扫描面下限。
 * [口径] 2026-11-19 实测：`src` 下 628 个 ts + 60 个 css，`tests` 下 441 个 ts。
 * 下限取实测的 ~85%：正常增删碰不到，而「路径写错 / 目录被挪走」会立刻掉到 0 附近。
 */
const MIN_FILES = 750;

const problems = [];
const push = (rule, file, msg) => problems.push({ rule, file, msg });

/** 按 `\n` 计数，与 `wc -l` 逐字对齐（末尾无换行时不多算一行）。 */
function countLines(text) {
  let n = 0;
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") n++;
  // 有内容但末尾无换行：`wc -l` 不计这一行，这里也不计 —— 与审计脚本保持同一口径，
  // 否则「审计说有 601 行、守卫说 600」会变成一场没有结论的争论。
  return n;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "dist-packages") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 归一成仓库相对路径（`/` 分隔），作为基线的键。 */
const keyOf = (abs) => relative(ROOT, abs).split(sep).join("/");

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : { note: "", files: {} };
const files = baseline.files ?? {};

const measured = new Map(); // key → { lines, rule }
let scanned = 0;

for (const rule of RULES) {
  const rootAbs = resolve(ROOT, rule.root);
  if (!existsSync(rootAbs)) {
    push("G5", rule.root, `目录不存在，扫描面塌了`);
    continue;
  }
  for (const abs of walk(rootAbs)) {
    if (!abs.endsWith(rule.ext)) continue;
    // 只看与这一条规则对应的扩展名，避免同一文件被两条规则重复统计
    scanned++;
    const key = keyOf(abs);
    const lines = countLines(readFileSync(abs, "utf8"));
    measured.set(key, { lines, rule });
  }
}

if (scanned < MIN_FILES) {
  push("G5", "-", `只扫到 ${scanned} 个文件（下限 ${MIN_FILES}）—— 路径或扩展名写坏了`);
}

// ── 判据 ────────────────────────────────────────────────────────────────────

const overLimit = []; // 当前超阈值的文件（含基线内与基线外）
for (const [key, { lines, rule }] of measured) {
  if (lines > rule.threshold) overLimit.push({ key, lines, rule });
}
overLimit.sort((a, b) => b.lines - a.lines);

for (const { key, lines, rule } of overLimit) {
  const base = files[key];
  if (base === undefined) {
    push("G1", key, `${lines} 行 > ${rule.threshold}（${rule.label}），且不在基线里 —— 新代码从一开始就要守线`);
  } else if (lines > base) {
    push("G2", key, `${lines} 行 > 基线 ${base}（回涨 ${lines - base} 行）—— 基线只减不增`);
  }
}

for (const key of Object.keys(files)) {
  const hit = measured.get(key);
  if (!hit) {
    push("G3", key, `基线里有，文件已不存在 —— 条目该删（同名文件改名也算）`);
  } else if (hit.lines <= hit.rule.threshold) {
    push("G4", key, `已降到 ${hit.lines} 行（阈值 ${hit.rule.threshold}）—— 拆完了就从基线删掉`);
  }
}

// ── 输出 ────────────────────────────────────────────────────────────────────

if (LIST_ONLY) {
  console.log(`扫描 ${scanned} 个文件；超阈值 ${overLimit.length} 个（基线 ${Object.keys(files).length} 条）`);
  for (const { key, lines, rule } of overLimit) {
    const base = files[key];
    const mark = base === undefined ? "新增" : lines > base ? `回涨 +${lines - base}` : `余量 ${base - lines}`;
    console.log(`  ${String(lines).padStart(5)} / ${rule.threshold}  ${key}  [${mark}]`);
  }
  process.exit(0);
}

if (UPDATE) {
  const next = {};
  const rejected = [];
  for (const { key, lines } of overLimit) {
    const base = files[key];
    if (base === undefined) {
      if (!FORCE) rejected.push(`${key}: 基线里没有（新增条目要 --force）`);
      else next[key] = lines;
    } else if (lines > base) {
      if (!FORCE) rejected.push(`${key}: ${base} → ${lines} 是回涨（上调要 --force）`);
      else next[key] = lines;
    } else {
      next[key] = lines; // 下调：正常记账
    }
  }
  if (rejected.length) {
    console.error("拒绝写入 —— 基线只减不增：");
    for (const r of rejected) console.error(`  ${r}`);
    console.error("拆完再 `--update`；若确实是「拆了一半的中间态」，加 --force 并在提交说明里写明原因。");
    process.exit(1);
  }
  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => a.localeCompare(b)));
  const payload = {
    note: "超阈值的欠债表（只减不增）。拆完一个就 `node bin/lines-guard.mjs --update` 划掉它。阈值见 wiki/reference/component-implementation-standard.md §9。",
    files: sorted,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`基线已更新：${Object.keys(files).length} → ${Object.keys(sorted).length} 条`);
  process.exit(0);
}

if (problems.length) {
  console.error(`LINES_FAIL  扫描 ${scanned} 个文件，${problems.length} 条问题\n`);
  for (const p of problems) console.error(`  [${p.rule}] ${p.file}\n        ${p.msg}`);
  console.error("\n阈值：组件 .ts > 600 / 组件 .css > 400 / 测试 .ts > 600（规范 §9）");
  console.error("拆完一个文件后跑 `node bin/lines-guard.mjs --update` 把它的条目划掉。");
  process.exit(1);
}

const debt = Object.keys(files).length;
console.log(
  `LINES_OK  扫描 ${scanned} 个文件；超阈值 ${overLimit.length} 个，全部在基线上限内（欠债 ${debt} 条，只减不增）`,
);
