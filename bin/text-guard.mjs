#!/usr/bin/env node
// 硬编码自然语言文案闸门：拦住「组件里继续手写中文而不是走语言包」。
//
// 规则（与 bin/lines-guard.mjs 同一套「欠债表只减不增」模式）：
//   T1 新增硬编码：不在基线里的文件出现硬编码中文字符串 ⇒ 失败。
//   T2 回涨：在基线里，但当前硬编码行数 > 基线值 ⇒ 失败。
//   T3 死条目：基线里有，文件已不存在 ⇒ 失败。
//   T4 已清零未划掉：在基线里，但当前为 0 ⇒ 失败（跑 --update 划掉）。
//   T5 自检：扫描文件数低于下限 ⇒ 失败。
//
// 白名单目录（天然存放文案或登记理由）：
//   · src/core/locales/**（语言包本身）
//   · src/core/copy.ts（COPY_EXEMPT / COPY_DIVERGENCE 登记表）
//
// 用法：
//   node bin/text-guard.mjs            校验（0 = 通过）
//   node bin/text-guard.mjs --list     列出所有仍含硬编码中文的文件
//   node bin/text-guard.mjs --update   按实测重写基线（只允许下调/删除；新增或上调需 --force）

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

const ROOT = process.cwd();
const BASELINE_PATH = resolve(ROOT, "bin/text-baseline.json");
const LIST_ONLY = process.argv.includes("--list");
const UPDATE = process.argv.includes("--update");
const FORCE = process.argv.includes("--force");

const MIN_FILES = 300;
const CJK_RE = /[\u4e00-\u9fff]/;

const EXCLUDED = (rel) =>
  rel === "src/core/copy.ts" || rel.startsWith("src/core/locales/");

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "dist-packages") continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/**
 * 剥离单行/块注释，返回非注释代码中「字符串字面量含中文」的行数。
 * 保留换行符以保证行号对应；模板字符串内的插值与文本一并扫描。
 */
function countHardcodedCjkLines(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  let inStr = null; // '"' | "'" | '`'

  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (inStr) {
      if (ch === "\\") {
        out += ch + (next ?? "");
        i += 2;
        continue;
      }
      // 模板字符串内嵌 CSS 的 /* 注释 */ 不属于用户可见文案
      if (inStr === "`" && ch === "/" && next === "*") {
        i += 2;
        while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
          if (source[i] === "\n") out += "\n";
          i++;
        }
        i += 2;
        continue;
      }
      if (ch === inStr) {
        inStr = null;
        out += ch;
        i++;
        continue;
      }
      out += ch;
      i++;
      continue;
    }

    // 注释跳过（保留换行）
    if (ch === "/" && next === "/") {
      i += 2;
      while (i < n && source[i] !== "\n") i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        if (source[i] === "\n") out += "\n";
        i++;
      }
      i += 2;
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = ch;
    }
    out += ch;
    i++;
  }

  let hits = 0;
  for (const line of out.split("\n")) {
    if (CJK_RE.test(line)) hits++;
  }
  return hits;
}

const keyOf = (abs) => relative(ROOT, abs).split(sep).join("/");

const baseline = existsSync(BASELINE_PATH)
  ? JSON.parse(readFileSync(BASELINE_PATH, "utf8"))
  : { note: "", files: {} };
const files = baseline.files ?? {};

const measured = new Map();
let scanned = 0;
const srcAbs = resolve(ROOT, "src");

const problems = [];
const push = (rule, file, msg) => problems.push({ rule, file, msg });

if (!existsSync(srcAbs)) {
  push("T5", "src", "目录不存在，扫描面塌了");
} else {
  for (const abs of walk(srcAbs)) {
    const key = keyOf(abs);
    if (EXCLUDED(key)) continue;
    scanned++;
    const hits = countHardcodedCjkLines(readFileSync(abs, "utf8"));
    if (hits > 0) measured.set(key, hits);
  }
}

if (scanned < MIN_FILES) {
  push("T5", "scan", `只扫到 ${scanned} 个文件（下限 ${MIN_FILES}），扫描面异常`);
}

if (LIST_ONLY) {
  const rows = [...measured.entries()].sort((a, b) => b[1] - a[1]);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  console.log(`共 ${rows.length} 个文件、${total} 行硬编码中文（扫描 ${scanned} 个文件）：`);
  for (const [k, n] of rows) {
    const base = files[k];
    const diff = base === undefined ? "NEW" : n === base ? "=" : `${n - base > 0 ? "+" : ""}${n - base}`;
    console.log(`  ${String(n).padStart(4)}  (${diff.padStart(4)})  ${k}`);
  }
  process.exit(0);
}

for (const [key, hits] of measured) {
  const base = files[key];
  if (base === undefined) {
    push("T1", key, `新增 ${hits} 行硬编码中文 —— 迁入 src/core/locales/ 并改用 t() / COPY`);
  } else if (hits > base) {
    push("T2", key, `硬编码中文从基线 ${base} 行涨到 ${hits} 行（+${hits - base}）—— 欠债表只减不增`);
  }
}

for (const [key, base] of Object.entries(files)) {
  const abs = resolve(ROOT, key);
  if (!existsSync(abs)) {
    push("T3", key, `文件已不存在，但基线里还留着 (${base}) —— 跑 --update 清理`);
  } else if (!measured.has(key)) {
    push("T4", key, `硬编码中文已清零（原基线 ${base}），从基线划掉：node bin/text-guard.mjs --update`);
  }
}

if (UPDATE) {
  const blocked = problems.filter((p) => p.rule === "T1" || p.rule === "T2");
  if (blocked.length && !FORCE) {
    console.error("TEXT_UPDATE_BLOCKED  不允许自动新增或上调基线（加 --force 才允许）：");
    for (const p of blocked) console.error(`  [${p.rule}] ${p.file}: ${p.msg}`);
    process.exit(1);
  }
  const sorted = Object.fromEntries([...measured.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const payload = {
    note: "硬编码自然语言文案欠债表（只减不增）。清完一个文件就跑 `node bin/text-guard.mjs --update` 划掉它。",
    files: sorted,
  };
  writeFileSync(BASELINE_PATH, JSON.stringify(payload, null, 2) + "\n");
  const total = Object.values(sorted).reduce((s, n) => s + n, 0);
  console.log(`基线已更新：${Object.keys(files).length} → ${Object.keys(sorted).length} 个文件（共 ${total} 行）`);
  process.exit(0);
}

if (problems.length) {
  console.error(`TEXT_FAIL  扫描 ${scanned} 个文件，${problems.length} 条问题\n`);
  for (const p of problems) console.error(`  [${p.rule}] ${p.file}\n        ${p.msg}`);
  console.error("\n清完一个文件的硬编码文案后跑 `node bin/text-guard.mjs --update` 把它从欠债表划掉。");
  process.exit(1);
}

const total = [...measured.values()].reduce((s, n) => s + n, 0);
console.log(
  `TEXT_OK  扫描 ${scanned} 个文件；硬编码中文 ${measured.size} 个文件 / ${total} 行，全部在基线上限内（只减不增）`,
);
