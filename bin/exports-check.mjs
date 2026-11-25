#!/usr/bin/env node
// exports:check —— 校验 package.json 的 exports 与实际产物是否对得上（issue IKTXP8 / IKTXPA）。
//
// 用法：
//   node bin/exports-check.mjs            # 校验：任一目标缺失 → 非零退出（可进 CI / prepublishOnly）
//   node bin/exports-check.mjs --report   # 只报表，恒零退出
//
// 为什么需要这个检查：`exports` 是**白名单**，一旦写错只有两种报错，而且都不在构建期：
//   ① 声明了但没产物 —— 解析到不存在的文件 → ERR_MODULE_NOT_FOUND
//      （实例：`./page/datasources` 没进 build entry，dist 里没有；而 tsc 全量扫描照样
//        生成 d.ts，于是 TS/IDE 全绿，只在运行时炸）
//   ② 有产物但没声明 —— 文件就在包里，却被 exports 拦死 → ERR_PACKAGE_PATH_NOT_EXPORTED
//      （实例：`dist/core/*.js` 一直在，但 exports 里只有 `./report/core`）
// 两种情况 `vite build` 与 `tsc` 都不报错，靠人核对 20 多条映射也不现实 —— 机械检查。
//
// 判定：
//   · 顶层 main / types / 其它直指文件的字段 → 文件必须存在
//   · 每个 exports 条目（含 types/import/require 等条件）→ 其目标必须存在
//   · 含 `*` 的通配条目 → 不能逐条列举，退一步校验它的**父目录**存在
//     （声明 `./core/*` 却连 `dist/core/` 都没有，正是「通配指向空目录」这个失败形态）
//
// [WHY 通配只查目录不查文件] 通配的语义就是「这个目录下有什么就能访问什么」，
// 逐文件校验等于把内部模块也当成公开面来要求，会制造大量误报。
// 真正的保障是：**需要对外的东西必须显式列成非通配条目或单列 build entry**。
//
// 退出码：0 = 全部对得上；1 = 有目标缺失；2 = 自身状态异常（读不到 package.json 等）。

import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, normalize } from "node:path";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const reportOnly = process.argv.includes("--report");

let pkg;
try {
  pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
} catch (e) {
  console.error(`[exports:check] 读不到 package.json: ${e.message}`);
  process.exit(2);
}

/** 把一个 exports 目标解析成磁盘路径；通配条目返回其父目录。 */
function targetOf(spec) {
  if (typeof spec !== "string") return null;
  const hasWildcard = spec.includes("*");
  const raw = hasWildcard ? spec.replace(/\*/g, "") : spec;
  const abs = normalize(join(root, raw));
  // 通配：`./dist/page/*.js` → 去掉 * 得到 `./dist/page/.js`，要看的是它的目录
  return hasWildcard ? dirname(abs) : abs;
}

function exists(p) {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

const problems = [];
const checked = [];

// [前置] 必须整体构建过（vite build + build:types）。
// 只跑 `vite build` 时 dist/types 不存在，会让 16 条 types 目标集体报缺失 ——
// 那是环境状态，不是 exports 写错。先拦在这里，避免把「没构建」误读成「配置坏了」。
for (const need of ["dist", "dist/types"]) {
  if (!exists(join(root, need))) {
    console.error(
      `[exports:check] ${need}/ 不存在 —— 先跑 \`npm run build\`（= vite build + build:types）。` +
        `\n                单跑 vite build 不会产出类型文件。`,
    );
    process.exit(2);
  }
}

/** 检查一条「说明符 → 目标」，items 是条件对象或字符串。 */
function checkEntry(key, spec, field = "") {
  const target = targetOf(spec);
  if (target == null) return;
  const ok = exists(target);
  const rel = target.slice(root.length + 1);
  const label = field ? `${key} [${field}]` : key;
  checked.push({ label, rel, ok, wildcard: String(spec).includes("*") });
  if (!ok) problems.push(`${label} → ${rel}（不存在）`);
}

// ── 1) 顶层直指文件的字段 ────────────────────────────────
// 只查这几个约定字段；exports 之外的入口（如 bin/scripts）不归这里管。
for (const key of ["main", "types", "module"]) {
  if (typeof pkg[key] === "string") checkEntry(key, pkg[key]);
}

// ── 2) exports ─────────────────────────────────────────
const exp = pkg.exports;
if (!exp) {
  console.error("[exports:check] package.json 没有 exports 字段 —— 这会让所有内部路径都可被导入");
  process.exit(2);
}

// 两种形态：字符串直指文件，或 `{ ".": {...} }` 的条件表。
if (typeof exp === "string") {
  checkEntry("exports", exp);
} else {
  for (const [key, val] of Object.entries(exp)) {
    if (typeof val === "string") {
      checkEntry(key, val);
    } else if (val && typeof val === "object") {
      for (const [cond, spec] of Object.entries(val)) checkEntry(key, spec, cond);
    }
  }
}

// ── 输出 ───────────────────────────────────────────────
if (!reportOnly) {
  for (const c of checked) {
    if (!c.ok) console.log(`  ✗ ${c.label.padEnd(40)} → ${c.rel}`);
  }
}

const wildcards = checked.filter((c) => c.wildcard);
console.log(
  `[exports:check] 检查 ${checked.length} 个目标（其中 ${wildcards.length} 个通配只看父目录），` +
    (problems.length ? `缺失 ${problems.length} 个` : "全部存在"),
);

// ── 3) 通配覆盖：声明的 `./x/*` 是否真的覆盖了 src 里的每一个子入口 ──────
//
// [WHY 光校验父目录不够] 那是 IKTXP8 的漏点：声明 `./page/*` 时 `dist/page/` 一直都在
// （里面有 ast.js / parse.js 等几十个模块），而唯一没产物的 `page/datasources` 照样通过 ——
// 消费方 import 它仍然 module not found。判据必须是「src 里存在的单元，dist 里有没有对应文件」。
//
// 推导方式：`./dist/page/*.js` → src 目录 `src/page`，逐个单元检查
//   `dist/page/<unit>.js`（单文件入口 / preserveModules 产物）或
//   `dist/page/<unit>/index.js`（目录形式）
// 两者都没有才算缺失 —— 目录形式是正常的（`page/components/index.js` 就是），不能一刀切。
const unitProblems = [];

/** `./dist/page/*.js` → `src/page`；不是这种形态返回 null。 */
function srcDirForWildcard(spec) {
  const m = /^\.\/dist\/(.+)\/\*[^/]*$/.exec(spec);
  return m ? join(root, "src", m[1]) : null;
}

function listUnits(srcDir) {
  if (!exists(srcDir)) return [];
  const out = [];
  for (const ent of readdirSync(srcDir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    // [★ 只看「目录型子入口」] 判据是子目录里有 index.ts —— 这种 index.ts 的唯一存在理由
    // 就是「让这个目录能被单独 import」，所以必须有产物。
    //
    // 不查两种情况，都是合法的「src 有、dist 没有」：
    //   · 目录自己的 index.ts（如 src/page/index.ts）—— 它对应的是 `dist/page.js`，
    //     由 `./page` 这条非通配条目校验，不该按 `<dir>/index.js` 去找；
    //   · 文件型模块（如 src/report/core/types.ts 纯类型）—— 编译后本来就是空的。
    //     注意：**非纯类型的文件型模块必须有产物**，那条由下面的「导出完整性」兜
    //     （report-funcs.ts 曾经整文件无产物，就是被它抓出来的）。
    if (!ent.isDirectory()) continue;
    if (exists(join(srcDir, ent.name, "index.ts"))) out.push(ent.name);
  }
  return out;
}

/** 目录下所有 .ts（含 index.ts）—— 用于导出完整性比对。 */
function listTsFiles(dir) {
  if (!exists(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".ts") && !e.name.endsWith(".d.ts"))
    .map((e) => e.name.slice(0, -3));
}

/**
 * 从源码提取**值导出**（函数/常量/类/显式 export 表）。
 *
 * 只取值导出：`export interface` / `export type` 编译后被擦除，产物里本来就没有，
 * 要求它们出现会制造大量误报。
 * 遇到 `export * from` 直接返回 null —— 静态无法枚举，跳过该文件比猜更安全。
 */
function valueExports(src) {
  if (/^\s*export\s+\*\s+from/m.test(src)) return null;
  const out = new Set();
  for (const m of src.matchAll(/^\s*export\s+(?:async\s+)?function\s+(\w+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s+(?:const|let|var)\s+(\w+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s+class\s+(\w+)/gm)) out.add(m[1]);
  for (const m of src.matchAll(/^\s*export\s*\{([^}]+)\}/gm)) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      // `export { type PageCardKind, realThing }` —— TS 5 的内联类型导出。
      // 编译后类型被擦除，产物里不会有它，当成值导出会制造误报（实测踩过）。
      if (/^type\s/.test(seg)) continue;
      const as = /\bas\s+(\w+)\s*$/.exec(seg);
      out.add(as ? as[1] : seg.replace(/\s+/g, ""));
    }
  }
  return out;
}

/** 从产物提取导出名（压缩后形如 `export { a as NAME, ... }`）。 */
function distExports(js) {
  const out = new Set();
  for (const m of js.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(",")) {
      const seg = part.trim();
      if (!seg) continue;
      const as = /\bas\s+([\w$]+)\s*$/.exec(seg);
      out.add(as ? as[1] : seg.replace(/\s+/g, ""));
    }
  }
  for (const m of js.matchAll(/export\s+(?:async\s+)?function\s+([\w$]+)/g)) out.add(m[1]);
  for (const m of js.matchAll(/export\s+(?:const|let|var|class)\s+([\w$]+)/g)) out.add(m[1]);
  return out;
}

// 同一份 dist 目录可能被多条通配覆盖，按目录去重，避免重复报。
const checkedDirs = new Set();
const dirPairs = []; // [srcDir, distDir]，供导出完整性比对复用
if (typeof exp === "object" && exp !== null) {
  for (const [, val] of Object.entries(exp)) {
    for (const [cond, spec] of Object.entries(val && typeof val === "object" ? val : {})) {
      // 只用运行时条件（import/require/default）推导产物；types 指向的是 .d.ts，形态不同
      if (cond === "types") continue;
      const srcDir = srcDirForWildcard(spec);
      if (!srcDir) continue;
      const distDir = dirname(normalize(join(root, spec.replace(/\*/g, ""))));
      const key = `${srcDir}→${distDir}`;
      if (checkedDirs.has(key)) continue;
      checkedDirs.add(key);
      dirPairs.push([srcDir, distDir, spec]);
      for (const unit of listUnits(srcDir)) {
        const fileForm = join(distDir, `${unit}.js`);
        const dirForm = join(distDir, unit, "index.js");
        if (!exists(fileForm) && !exists(dirForm)) {
          unitProblems.push(
            `${spec} 声称覆盖 ${spec.replace(/\*/g, unit)}，但 src 有 ` +
              `${srcDir.slice(root.length + 1)}/${unit}，dist 里既没有 ${unit}.js 也没有 ${unit}/index.js`,
          );
        }
      }
    }
  }
}

// ── 4) 导出完整性：src 里的每个「值导出」在产物里是否还在 ────────────────
//
// [WHY 必须单独查这一层] `preserveModules` 只保证「模块按文件输出」，**不保证导出完整** ——
// rollup 仍会 tree-shake 掉「本包内无人 import」的导出。产物文件在、`.d.ts` 在、
// TS 与 IDE 全绿，运行时 `import { X }` 却是 undefined。实测两例：
//   · `page/link-model.ts` 导出 8 个，dist 只有 7 个（`linkSpecsOf` 被删）；
//   · `report/core/report-funcs.ts` 整个文件没产物（12 个导出全丢）。
// 修法是把它们逐个列成 build entry，这条检查就是那个修复的哨兵。
const exportGaps = [];
for (const [srcDir, distDir] of dirPairs) {
  for (const unit of listTsFiles(srcDir)) {
    const srcFile = join(srcDir, `${unit}.ts`);
    const want = valueExports(readFileSync(srcFile, "utf8"));
    if (!want || want.size === 0) continue;
    const distFile = [join(distDir, `${unit}.js`), join(distDir, unit, "index.js")].find(exists);
    if (!distFile) continue; // 缺产物归上一节报，这里不重复
    const got = distExports(readFileSync(distFile, "utf8"));
    const missing = [...want].filter((n) => !got.has(n));
    if (missing.length) {
      exportGaps.push(
        `${srcDir.slice(root.length + 1)}/${unit}.ts → ${distFile.slice(root.length + 1)} ` +
          `缺导出：${missing.join(", ")}`,
      );
    }
  }
}

if (unitProblems.length) {
  console.log(`[exports:check] 通配覆盖检查：${unitProblems.length} 个 src 单元无产物`);
} else if (checkedDirs.size) {
  console.log(`[exports:check] 通配覆盖检查：${checkedDirs.size} 组目录，src 单元与产物一一对上`);
}

if (exportGaps.length) {
  console.log(`[exports:check] 导出完整性：${exportGaps.length} 个模块的导出被裁剪`);
} else if (dirPairs.length) {
  console.log("[exports:check] 导出完整性：src 的值导出在产物里都在");
}

if ((problems.length || unitProblems.length || exportGaps.length) && !reportOnly) {
  if (problems.length) {
    console.error("\n目标缺失：");
    for (const p of problems) console.error(`  - ${p}`);
  }
  if (unitProblems.length) {
    console.error("\n通配覆盖缺口（IKTXP8 的形态）：");
    for (const p of unitProblems) console.error(`  - ${p}`);
  }
  if (exportGaps.length) {
    console.error("\n导出被 tree-shaking 裁剪（文件在、导出没了）：");
    for (const p of exportGaps) console.error(`  - ${p}`);
  }
  console.error(
    "\n提示：`vite build` 与 `tsc` 都不会报这些错 ——" +
      "\n  · 缺产物 = 没进 build entry（preserveModules 只收入口可达的模块）" +
      "\n  · 缺声明 = exports 少了一条（exports 是白名单，没列就 import 不到）" +
      "\n  · 缺导出 = 模块不是 entry，rollup 把「本包内无人使用」的导出删了" +
      "\n            （修法：用 scanFiles 把它列进 build entry）" +
      "\n  三种都只在**消费方运行时**才炸，而 build:types 生成的 d.ts 会让 TS/IDE 一切正常。",
  );
  process.exit(1);
}
process.exit(0);
