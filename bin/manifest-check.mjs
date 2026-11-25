#!/usr/bin/env node
// 组件契约清单的**精确漂移闸门**。
//
// [WHY 需要它，而不是靠守卫测试] 守卫（tests/unit/component-manifest-guard.test.ts）是纯 fs
// 扫描，只能比 tag / source / stats 自洽 —— 它**看不见属性级漂移**。真实出现过一次：
// attributesOnly 78 → 79、`apps` 属性从 `{attribute:"apps"}` 变成 `{attribute:false}`，
// 提交版落后于源码，而没有任何测试红（issue IKTJVR）。
//
// 精确判定只有一条路：**重跑一次反射**，与提交版逐字段比对。所以这里：
//   1. 把生成器的输出指到临时文件（MANIFEST_OUT），不碰工作区
//   2. 与 registry/component-manifest.json 比
//   3. 不同 → 打印「哪个组件、哪个属性、哪个字段」并 exit 1
//
// [WHY 不直接 `npm run manifest && git diff --exit-code`] 那样会先**覆盖**产物再让人自己看
// git diff：跑一次就把工作区弄脏，且「生成成功」与「清单本来就对」在输出上无法区分。
// 临时文件方案让 check 是纯读的，可以挂在 pre-push 上而不会改任何东西。
//
// 用法：
//   node bin/manifest-check.mjs     只校验（一致 → 0，不一致 → 1）
//   npm run manifest                真正重新生成

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const COMMITTED = "registry/component-manifest.json";
const TMP = join(tmpdir(), `manifest-check-${process.pid}.json`);

function fail(msg) {
  console.error(`[manifest:check] ${msg}`);
  process.exit(1);
}

if (!existsSync(COMMITTED)) {
  fail(`${COMMITTED} 不存在。先跑 npm run manifest 生成一次并提交。`);
}

// 1) 反射到临时文件
const vitestBin = resolve("node_modules/vitest/vitest.mjs");
if (!existsSync(vitestBin)) fail("找不到 node_modules/vitest，先 npm install");

const run = spawnSync(
  process.execPath,
  [vitestBin, "run", "--config", "vitest.gen.config.ts", "tests/tools/manifest.gen.test.ts"],
  {
    env: { ...process.env, MANIFEST_OUT: TMP },
    encoding: "utf8",
    timeout: 180_000,
  },
);

if (run.status !== 0) {
  console.error(run.stdout?.slice(-2000) ?? "");
  console.error(run.stderr?.slice(-2000) ?? "");
  fail("反射生成失败（上面是生成器的输出）。这一条本身就是坏信号，不要跳过。");
}
if (!existsSync(TMP)) fail("生成器没有写出临时文件，检查 MANIFEST_OUT 是否被忽略。");

// 2) 逐字段比对
const nextText = readFileSync(TMP, "utf8");
const prevText = readFileSync(COMMITTED, "utf8");
const next = JSON.parse(nextText);
const prev = JSON.parse(prevText);
rmSync(TMP, { force: true });

const diffs = [];

/**
 * stats 里既有数字也可能有对象（2026-11-15 加了 `byLayer`）。
 *
 * [WHY 不能直接 `a !== b`] 对对象那是**引用比较**，永远不等 —— 于是清单完全一致时
 * 也会报 `stats.byLayer: 提交版 [object Object] → 源码 [object Object]`。
 * 这条闸门一旦出现「永远红」，人就会开始跳它，跳一次就再也不会认真看。
 * 对象按序列化比（key 顺序由生成器的遍历顺序决定，是稳定的）。
 */
const sameValue = (a, b) =>
  a !== null && b !== null && typeof a === "object" && typeof b === "object"
    ? JSON.stringify(a) === JSON.stringify(b)
    : a === b;

for (const k of new Set([...Object.keys(prev.stats ?? {}), ...Object.keys(next.stats ?? {})])) {
  const a = prev.stats?.[k];
  const b = next.stats?.[k];
  if (!sameValue(a, b)) {
    diffs.push(`stats.${k}: 提交版 ${JSON.stringify(a)} → 源码 ${JSON.stringify(b)}`);
  }
}

const prevByTag = new Map((prev.components ?? []).map((c) => [c.tag, c]));
const nextByTag = new Map((next.components ?? []).map((c) => [c.tag, c]));

for (const tag of nextByTag.keys()) {
  if (!prevByTag.has(tag)) diffs.push(`新增组件 ${tag}（清单里没有）`);
}
for (const tag of prevByTag.keys()) {
  if (!nextByTag.has(tag)) diffs.push(`删除组件 ${tag}（清单里还有）`);
}

for (const [tag, b] of nextByTag) {
  const a = prevByTag.get(tag);
  if (!a) continue;

  if (a.source !== b.source) diffs.push(`${tag}.source: ${a.source} → ${b.source}`);
  if (a.summary !== b.summary) diffs.push(`${tag}.summary 变了`);

  const pa = new Map((a.properties ?? []).map((p) => [p.name, p]));
  const pb = new Map((b.properties ?? []).map((p) => [p.name, p]));

  for (const name of pb.keys()) if (!pa.has(name)) diffs.push(`${tag}.${name}: 新增属性`);
  for (const name of pa.keys()) if (!pb.has(name)) diffs.push(`${tag}.${name}: 属性已删除`);

  for (const [name, x] of pb) {
    const y = pa.get(name);
    if (!y) continue;
    // attribute 是最容易静默变的一列（"我是属性" 变 "我不是属性"，页面写法立刻失效）
    if (y.attribute !== x.attribute) {
      diffs.push(`${tag}.${name}.attribute: ${JSON.stringify(y.attribute)} → ${JSON.stringify(x.attribute)}`);
    }
    if (JSON.stringify(y.aliases) !== JSON.stringify(x.aliases)) diffs.push(`${tag}.${name}.aliases 变了`);
    if (y.type !== x.type) diffs.push(`${tag}.${name}.type: ${y.type} → ${x.type}`);
    if (JSON.stringify(y.default) !== JSON.stringify(x.default)) diffs.push(`${tag}.${name}.default 变了`);
    if (JSON.stringify(y.values) !== JSON.stringify(x.values)) diffs.push(`${tag}.${name}.values 变了`);
  }
}

// 兜底：上面只比了已知字段。将来生成器加了新字段（events / slots / 新 stats），
// 未分类的差异不能静默通过 —— 那正是「字段加了但没人重新生成」的入口。
if (!diffs.length && prevText !== nextText) {
  diffs.push("存在未分类的差异（生成器新增了字段？）—— 跑 npm run manifest 重新生成后肉眼看一遍");
}

if (!diffs.length) {
  console.log(
    `MANIFEST_OK  ${prev.stats?.components} 个组件 / ${prev.stats?.properties} 个属性与源码一致`,
  );
  process.exit(0);
}

console.error(`[manifest:check] 提交版清单与源码不一致，共 ${diffs.length} 处：`);
for (const d of diffs.slice(0, 40)) console.error(`  - ${d}`);
if (diffs.length > 40) console.error(`  ...（还有 ${diffs.length - 40} 处）`);
console.error("");
console.error("修法：npm run manifest 重新生成，把 registry/component-manifest.json 一起提交。");
console.error("注意：不要用 git checkout registry/ 收拾工作区 —— 那会把这批真实更新一起丢掉。");
process.exit(1);
