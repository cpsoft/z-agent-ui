#!/usr/bin/env node
// 只跑「守卫」（不变式测试），用于每批改动后的快速验收。
//
// [WHY 需要这个脚本，而不是「记得跑那几条」]
// 2026-11-15 新增 `z-typography` 时，我跑了 7 条守卫里的 4 条（边界 3 条 + 令牌 1 条），
// 漏掉 `vocabulary-guard` —— 它当场就该红：`variant` 是 vocabulary.ts 明确定义的
// **待拆分遗留词**，新组件不许再用它承载新语义。结果要等 25 分钟全量回归才发现，
// 而那时 `variant="h1"` 已经写进源文件、测试、清单和文档了。
//
// 失败模式不是「不知道有这条守卫」，是**靠记忆列举**。列举必然漏。
// 所以：改成跑「tests 下所有 *guard*.test.ts」，并列出一份名册做双向核对。
//
// [WHY 名册而不是纯 glob] 守卫文件被改名/挪走后，纯 glob 会安静地少跑一条 ——
// 输出依然「全部通过」。名册把「少了一条」变成退出码非零：
//   · 名册里有、磁盘上没有 → 文件被删/改名了，先确认它去哪了
//   · 磁盘上有、名册里没有 → 新增的守卫还没被纳入本闸门，加进去再跑
// 名册与 LEGACY_EXEMPTIONS 同一个道理：只该因为「真的增删了守卫」而变，不为省事而变。

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** 守卫名册。新增守卫测试时同步加一行（下面的核对会提醒你）。 */
const ROSTER = [
  "tests/unit/a11y-guard.test.ts",
  "tests/unit/aria-contract-guard.test.ts",
  "tests/unit/brand-guard.test.ts",
  "tests/unit/build-info-guard.test.ts",
  "tests/unit/component-manifest-guard.test.ts",
  "tests/unit/components/collapse-target-guard.test.ts",
  "tests/unit/contrast-guard.test.ts",
  "tests/unit/control-size-guard.test.ts",
  "tests/unit/copy-guard.test.ts",
  "tests/unit/demo-coverage-guard.test.ts",
  "tests/unit/demo-imports-guard.test.ts",
  "tests/unit/demo-nav-guard.test.ts",
  "tests/unit/l0-boundary-guard.test.ts",
  "tests/unit/l1-boundary-guard.test.ts",
  "tests/unit/l1-escape-guard.test.ts",
  "tests/unit/locale-pack-guard.test.ts",
  "tests/unit/print-guard.test.ts",
  "tests/unit/react-wrapper-guard.test.ts",
  "tests/unit/shadow-target-guard.test.ts",
  "tests/unit/theme-token-guard.test.ts",
  "tests/unit/tone-migration-guard.test.ts",
  "tests/unit/vocabulary-guard.test.ts",

];

function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/guard.*\.test\.ts$/.test(e.name)) out.push(p.replaceAll("\\", "/"));
  }
  return out;
}

const found = walk("tests").sort();
const roster = [...ROSTER].sort();

const missing = roster.filter((f) => !found.includes(f));
const unlisted = found.filter((f) => !roster.includes(f));

if (missing.length || unlisted.length) {
  const lines = [];
  if (missing.length) {
    lines.push("名册里有、磁盘上没有（被删或改名了？先确认它去哪了）：");
    for (const f of missing) lines.push(`  - ${f}`);
  }
  if (unlisted.length) {
    lines.push("磁盘上有、名册里没有（新增的守卫还没纳入闸门，加进 ROSTER 再跑）：");
    for (const f of unlisted) lines.push(`  + ${f}`);
  }
  console.error(`\n守卫名册与磁盘不一致：\n${lines.join("\n")}\n`);
  console.error("这个不一致本身就是失败 —— 纯 glob 会安静地少跑一条，输出依然「全绿」。\n");
  process.exit(1);
}

console.log(`守卫 ${found.length} 条，名册核对通过。开始运行…\n`);
const r = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "vitest",
    "run",
    "--maxWorkers=2",
    // [WHY 显式放宽超时] vitest 默认 5s/例。这些守卫是**全仓扫描**（l2-l3 扫 1300 个文件、
    // theme-token 2.5s、skill-artifact 还要 spawn 子进程跑 linter），在冷缓存或与别的
    // vitest 进程相邻运行时离 5s 不远。2026-11-15 有一次运行出现过「1 例失败」但未能
    // 复现（四跑全绿、清 .vite 缓存后也绿），最可能就是超时 —— 但**没有证据，所以按超时处理而不是按通过处理**：
    // 放宽到 15s 只是让它别被无关的机器负载判红，判据本身一条没动。
    "--testTimeout=15000",
    ...found,
  ],
  { stdio: "inherit" },
);
process.exit(r.status ?? 1);
