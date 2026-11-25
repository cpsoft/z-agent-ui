#!/usr/bin/env node
// 五层架构的闸门：目录映射完备、依赖方向单向、外部依赖白名单、扫描面不缩水。
//
// [WHY 需要它，而不是靠三条 vitest 守卫] 那三条（l0 / l1 / l2-l3）各自只查自己那一段，
// 而且都写在测试里 —— 它们能挡住「下层引上层」，但挡不住两件更基础的事：
//   ① **映射表不完备**：`src/platform` 没写进映射表，它所有违规都落进「未知」被跳过，
//      零违规、退出码 0、看起来全绿，而整个目录没被查过（l2-l3 的注释里已经踩过）；
//   ② **扫描面缩水**：路径写错 / 目录改名后扫到的文件变少，业务断言照样绿。
// 这两条都靠「我扫到了多少」的自检来防，而自检只有放在**全仓一个扫描器**里才有意义。
//
// 规则：
//   G0 映射完备：`src` 下每个一级目录都要有层号或入 ADAPTERS；映射表里的目录也必须真实存在
//      （后者防「死条目」：目录删了但表里还在 ⇒ 守卫以为自己在保护它）。
//   G1 单向依赖：引用方层号必须 ≥ 目标层号。下层引上层 = 组装件伪装成控件 / 页面反向依赖路由。
//   G2 出口约束：L4 / L5 引用任何下层模块，必须落在目标层的 `index.ts` 出口上。
//      （只对新层生效：L0–L3 的深引由各自守卫按「只减不增」白名单在收，不在这里重复实现。）
//   G3 外部依赖白名单：非相对说明符必须命中 `bin/layers.mjs` 的 EXTERNAL_ALLOW，且未过期。
//   G4 自检：扫到的文件数与 import 数必须高于下限，否则判定扫描面塌了（不是全绿）。
//
// 用法：node bin/layer-guard.mjs          校验（0 = 通过）
//       node bin/layer-guard.mjs --list   只列命中项
//       node smoke/layer-guard-mutation.mjs  变异验证（每条规则各注入一条，确认会红）

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { ADAPTERS, DIR_LAYER, EXTERNAL_ALLOW, LAYER_ENTRY, LAYER_NAME, layerOfPath, rankOf } from "./layers.mjs";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");
const LIST_ONLY = process.argv.includes("--list");

/**
 * 扫描面下限。
 *
 * [口径] 2026-11-17 实测：`src` 下 476 个 `.ts`（去掉 `.d.ts`），跳过 `react` 适配层后
 * 守卫扫到 473 个文件、1609 条 import。下限取实测的 ~93%：正常增删不会碰到，
 * 而「路径写错 / 目录被挪走 / 正则失效」会立刻掉到 0 附近。
 * 不要为了「整齐」把这些数改成 500 / 2000 —— 那等于把自检放松成装饰。
 */
const MIN_FILES = 380;
const MIN_IMPORTS = 1050;

const problems = [];
const push = (file, line, rule, msg) => problems.push({ file, line, rule, msg });

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/** 去注释但保留行号（换成等长空白）。理由同三条既有守卫：剥错行号会指错文件行。 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, keep) => keep + " ".repeat(m.length - keep.length));
}

const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;
const SPEC_SHAPE = /^[.@a-zA-Z0-9_~]/;
const lineOf = (src, pos) => src.slice(0, pos).split("\n").length;

function pkgOf(spec) {
  return spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
}

// ── G0 映射完备 ────────────────────────────────────────────────────────────
const dirs = readdirSync(SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name);

for (const d of dirs) {
  if (DIR_LAYER[d] || ADAPTERS.has(d)) continue;
  push("src", 0, "G0", `目录 ${d} 没有层号，也没列进 ADAPTERS —— 它的所有引用都不会被检查（假绿）`);
}
for (const d of Object.keys(DIR_LAYER)) {
  if (!dirs.includes(d)) push("bin/layers.mjs", 0, "G0", `映射表里的 ${d} 在 src 下不存在（死条目：守卫以为在保护它）`);
}
for (const d of ADAPTERS) {
  if (!dirs.includes(d)) push("bin/layers.mjs", 0, "G0", `ADAPTERS 里的 ${d} 在 src 下不存在`);
}

// ── G1 / G2 / G3 逐文件扫 import ───────────────────────────────────────────
let scanned = 0;
let imports = 0;

for (const file of walk(SRC)) {
  const relFile = relative(SRC, file).split(sep).join("/");
  const srcLayer = layerOfPath(relFile);
  if (!srcLayer) continue; // ADAPTERS：它的依赖由自己那条守卫管（按标签名生成，不引组件）
  scanned++;

  const text = stripComments(readFileSync(file, "utf8"));
  for (const m of text.matchAll(IMPORT_RE)) {
    const spec = m[1];
    if (!SPEC_SHAPE.test(spec)) continue;
    imports++;
    const line = lineOf(text, m.index ?? 0);

    // G3 外部依赖
    if (!spec.startsWith(".") && !spec.startsWith("/")) {
      const pkg = pkgOf(spec);
      const allow = EXTERNAL_ALLOW.find((a) => a.name === pkg);
      if (!allow) {
        push(relative(ROOT, file), line, "G3", `引入外部依赖 "${pkg}"：库的 dependencies 为空，白名单也没有它`);
      } else if (allow.expires !== "never" && new Date(allow.expires) < new Date()) {
        push(relative(ROOT, file), line, "G3", `外部依赖 "${pkg}" 的豁免已于 ${allow.expires} 到期：${allow.replacement}`);
      }
      continue;
    }

    const bare = spec.replace(/[?#].*$/, "").replace(/\.js$/, ".ts");
    const rel = relative(SRC, resolve(dirname(file), bare)).split(sep).join("/");
    const targetTop = rel.split("/")[0];
    const targetLayer = layerOfPath(rel);
    if (!targetLayer) continue;

    // G1 单向依赖
    if (rankOf(targetLayer) > rankOf(srcLayer)) {
      push(
        relative(ROOT, file),
        line,
        "G1",
        `${srcLayer}(${LAYER_NAME[srcLayer]}) 引了上层 ${targetLayer}(${LAYER_NAME[targetLayer]})：${rel}`,
      );
      continue;
    }

    // G2 出口约束（仅 L4 / L5）
    if (rankOf(srcLayer) >= rankOf("L4") && rankOf(targetLayer) < rankOf(srcLayer)) {
      const forms = (LAYER_ENTRY[targetLayer] ?? []).map((f) => f.replace("<dir>", targetTop));
      if (!forms.includes(rel)) {
        push(
          relative(ROOT, file),
          line,
          "G2",
          `${srcLayer} 深引下层私有文件：${rel}（只准走 ${forms.join(" 或 ")}）`,
        );
      }
    }
  }
}

// ── G4 扫描面自检 ──────────────────────────────────────────────────────────
if (scanned < MIN_FILES) push("src", 0, "G4", `只扫到 ${scanned} 个文件（下限 ${MIN_FILES}）：路径写错或目录被挪走了`);
if (imports < MIN_IMPORTS) push("src", 0, "G4", `只解析到 ${imports} 条 import（下限 ${MIN_IMPORTS}）：扫到的是空壳`);

problems.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));

if (LIST_ONLY) {
  for (const p of problems) console.log(`${p.file}:${p.line}  [${p.rule}]  ${p.msg}`);
  process.exit(0);
}

if (!problems.length) {
  const layers = Object.entries(DIR_LAYER).map(([, l]) => l);
  const tally = layers.reduce((acc, l) => ((acc[l] = (acc[l] ?? 0) + 1), acc), {});
  const brief = Object.keys(tally)
    .sort()
    .map((l) => `${l}×${tally[l]}`)
    .join(" ");
  console.log(`LAYER_OK  ${scanned} 个文件 / ${imports} 条 import；目录分布 ${brief}`);
  process.exit(0);
}

console.error(`[layer:check] 命中 ${problems.length} 处：`);
for (const p of problems) console.error(`  ${p.file}:${p.line}  [${p.rule}] ${p.msg}`);
console.error("");
console.error("修法：");
console.error("  G0 → 新目录要么在 bin/layers.mjs 的 DIR_LAYER 里给层号，要么进 ADAPTERS");
console.error("  G1 → 把那段逻辑下沉到下层，或把引用改成通过下层出口取符号");
console.error("  G2 → L4/L5 只准 import 下层的 index.ts 出口（不要点私有文件）");
console.error("  G3 → 用相对路径 / 自研，或给 bin/layers.mjs 的 EXTERNAL_ALLOW 加一条带 expires 的豁免");
console.error("  G4 → 通常意味着扫描路径错了，不是「全都合规」");
process.exit(1);
