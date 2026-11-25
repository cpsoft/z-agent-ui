// L0 边界守卫：L0 三个目录不许引用上层，也不许借公开门面取符号。
//
// [为什么需要] 2026-11-14 核查 L0 时实测：`src/core` 是唯一没有 `index.ts` 的源码目录，
// 于是 `primitives/portal/Portal.ts` 与 `primitives/position/Position.ts` 写
// `from "../../index.js"` —— 那是**包的公开门面**（`src/index.ts`）。
//
// 这条边有两个问题：
//   1. 方向反了。门面的职责是「把 L0 暴露给外界」，L0 内部经由它取自己的符号，
//      就变成「门面改一行，L0 内部跟着抖」。
//   2. 它让「L0 可独立发布」变成假话：单独打 `core` 的包时，这行 import 指向包外。
//
// [为什么用源码文本判据而不是 import 图] 与 theme-token-guard 同一个理由：
// 要看的是「谁写了什么」，不是「运行时解析成什么」。编译产物会把相对路径重写成别的形态，
// 那时再判断已经晚了。源码文本是唯一能指回行号的地方。
//
// [为什么连 `src/index.ts` 也禁] 禁「上层」是显然的；禁门面是这次的实测发现。
// 只禁上层的话，这条边会以 `import { BaseElement } from "../../index.js"` 的形态长期存活，
// 而它正是「L0 出不去」的根因。判据：L0 内部只能引用 L0 内部。

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, normalize, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SRC = resolve(ROOT, "src");

/** L0 的三个目录，以及每个目录**允许**引用什么。 */
const LAYERS: Record<string, string[]> = {
  core: ["core"],
  primitives: ["core", "primitives"],
  theme: ["theme"],
};

type Layer = keyof typeof LAYERS | "facade" | "upper";

/**
 * 源码里写的是 `./x.js`（TS 的 ESM 风格），磁盘上是 `./x.ts`。
 * 不换算的话所有相对引用都会被判成「src 之外」—— 那会让第一条断言永远红，
 * 而红着的守卫等于没有守卫（参考 theme-token-guard 里同一句判断）。
 */
function canon(abs: string): string {
  return abs.replace(/\.(js|mjs|cjs)$/, ".ts");
}

/**
 * 把绝对路径归类。返回 null 表示 src 之外的路径（不该出现）。
 *
 * [WHY core/public.ts 也算 facade] 2026-11-14（D-L0-3）把它拆出去之后，
 * 「包的对外面」就是它，而不是 src/index.ts（后者只剩一行转发）。L0 内部若经由
 * public.ts 取符号，等于仍然被对外承诺牵着走 —— 与借 src/index.ts 是同一个错误。
 */
function layerOf(rawAbs: string): Layer | null {
  const abs = canon(rawAbs);
  const rel = relative(SRC, abs).split(sep).join("/");
  if (rel === "index.ts" || rel === "core/public.ts") return "facade";
  const top = rel.split("/")[0];
  if (top in LAYERS) return top as Layer;
  if (["components", "report", "page", "react"].includes(top)) return "upper";
  return null;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

interface Violation {
  file: string;
  line: number;
  spec: string;
  target: string;
  kind: "upper" | "facade" | "outside";
}

/**
 * 去掉注释但**保留行号**（换成等长空白）。
 *
 * [WHY 必须剥] 2026-11-14 首次跑本守卫时抓到 3 处，其中 1 处是误报：
 * `core/index.ts` 的注释里写着示例 `from "../../index.js"`，正则把它当成真 import。
 * 判据类守卫如果不区分类释，就会把「解释这个缺陷的文字」判成本身就是缺陷 ——
 * 于是正确的写法反而红，人会去改注释来迁就测试。
 *
 * [WHY 不整段删掉] 删掉会让后面所有行号错位，报错信息指不到真实位置。
 * 等长空白替换保持行列结构不变。
 *
 * 已知取舍：字符串里的 `//`（如 URL）也会被吃掉。对「找 import 语句」这个用途无害 ——
 * import 不会出现在字符串里。
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, keep: string) => keep + " ".repeat(m.length - keep.length));
}

/**
 * 静态 import / export-from / 裸副作用 import / 动态 import() 四种形态都要扫。
 *
 * [WHY 补 `\bimport\s+`] 2026-11-14 变异验证时发现：`import "../../page/x.js";`
 * 这种**裸副作用导入**没有 `from`，原正则完全看不到它 —— 全仓有 105 个 barrel 用的
 * 正是这个形态。L0 侧同样漏了一种写法。
 */
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

/**
 * 模块说明符的形状：以 `.` / `@` / 字母数字开头。
 *
 * [WHY 需要它] 2026-11-14 实测：`sanitize.ts` 里有一个字符串数组
 * `["values", "to", "from", "by"]`，其中 `"from"` 后面紧跟 `"`，被上面的
 * `\bfrom\s*["']` 当成一条 import —— 捕获到的说明符是 `", "`，于是「零外部依赖」
 * 那条报了一个字符串数组当外部依赖。**判据类守卫误报的代价比漏报更大**：
 * 人会去改被测代码来迁就它（把 "from" 改名），而真正的缺陷还在。
 * 说明符不可能是逗号开头，按形状过滤一次即可，不必为此把扫描器写成 AST。
 */
const SPEC_SHAPE = /^[.@a-zA-Z0-9_~]/;

function scan(): { violations: Violation[]; checked: number } {
  const violations: Violation[] = [];
  let checked = 0;

  for (const [layer, allowed] of Object.entries(LAYERS)) {
    for (const file of walk(resolve(SRC, layer))) {
      const text = stripComments(readFileSync(file, "utf8"));
      const lineOf = (idx: number) => text.slice(0, idx).split("\n").length;

      for (const m of text.matchAll(IMPORT_RE)) {
        const spec = m[1];
        // 只处理相对引用；L0 当前零外部依赖，非相对 import 由下面单独一条断言覆盖
        if (!spec.startsWith(".") || !SPEC_SHAPE.test(spec)) continue;
        checked++;

        // 去掉 vite 的 `?raw` 之类后缀再解析
        const clean = spec.replace(/[?#].*$/, "");
        const abs = normalize(resolve(file, "..", clean));
        const target = layerOf(abs);

        if (target === null) {
          violations.push({ file, line: lineOf(m.index ?? 0), spec, target: relative(ROOT, abs), kind: "outside" });
        } else if (target === "facade") {
          // [例外] core/index.ts 转发 public.ts 是它的职责（内部出口 ⊇ 对外面）。
          // 除此之外任何 L0 文件引用 public.ts 都算「借对外面」。
          if (relative(SRC, file).split(sep).join("/") === "core/index.ts") continue;
          violations.push({ file, line: lineOf(m.index ?? 0), spec, target: relative(ROOT, abs), kind: "facade" });
        } else if (!allowed.includes(target)) {
          violations.push({ file, line: lineOf(m.index ?? 0), spec, target: relative(ROOT, abs), kind: "upper" });
        }
      }
    }
  }
  return { violations, checked };
}

const { violations, checked } = scan();

describe("L0 边界：只准往下引，不准借门面", () => {
  it("扫描面是活的（正则失效时不能让下面两条变哑巴）", () => {
    // 实测 2026-11-14：三个目录共 25 个 .ts，相对引用 40 处上下。
    // 阈值取下界，避免新增文件时误报；主要作用是「一个都没扫到」时立刻红。
    expect(checked).toBeGreaterThan(25);
  });

  it("L0 不引用上层目录（components / report / page / react）", () => {
    const bad = violations.filter((v) => v.kind === "upper" || v.kind === "outside");
    expect(
      bad,
      `L0 引用了 L0 之外的实现。L0 必须能单独打包，这条边一存在就做不到：\n` +
        bad.map((v) => `  ${relative(ROOT, v.file)}:${v.line}  ${v.spec}  →  ${v.target}`).join("\n"),
    ).toEqual([]);
  });

  it("L0 不借对外面（src/index.ts / core/public.ts）取自己的符号", () => {
    const bad = violations.filter((v) => v.kind === "facade");
    expect(
      bad,
      `这些地方经由对外面取 L0 符号。对外面是给外界的，L0 内部应引 core/index.ts：\n` +
        bad.map((v) => `  ${relative(ROOT, v.file)}:${v.line}  ${v.spec}`).join("\n"),
    ).toEqual([]);
  });

  it("L0 零外部运行时依赖（INV-6 的一部分）", () => {
    const external: string[] = [];
    for (const layer of Object.keys(LAYERS)) {
      for (const file of walk(resolve(SRC, layer))) {
        const text = stripComments(readFileSync(file, "utf8"));
        for (const m of text.matchAll(IMPORT_RE)) {
          const spec = m[1];
          // 形状不对 = 字符串里的 from（见 SPEC_SHAPE 的注释），不是依赖
          if (!SPEC_SHAPE.test(spec)) continue;
          if (spec.startsWith(".") || spec.startsWith("node:")) continue;
          // CSS 的 ?raw 是 vite 特性，算自身资源
          if (/\.css(\?|$)/.test(spec)) continue;
          external.push(`${relative(ROOT, file)}  ${spec}`);
        }
      }
    }
    expect(
      external,
      `L0 出现了外部依赖。它是最底层，一旦引入就把「零依赖」这条承诺作废：\n${external.join("\n")}`,
    ).toEqual([]);
  });

  // ─────────────────────────────────────────────────────────────
  // 根入口 `z-agent-ui` 只给 L0 工具，**一个组件都不注册**。
  //
  // [WHY 要一条守卫钉住一句文档] `demo/start.html` 原话是「引根入口会把全部组件带上」，
  // 而代码相反：`src/index.ts` → `core/public.ts`，导出的是 BaseElement / property /
  // html / escapeHtml / sanitizeHtml / 词汇表 / css，传递闭包里连一个 `components/` 都没有。
  // 2026-11-15 核查 `dist/z-agent-ui.js`：`customElements.define` 出现 0 次、import 只有 core。
  //
  // 危害形态正是本仓反复踩的那种：**照文档写代码，标签不渲染且零报错** ——
  // 未注册的自定义元素被当行内元素处理，样式不生效、内容消失，只有肉眼看页面才发现。
  //
  // 所以把这句文档变成可执行事实：根入口的传递闭包必须全在 core/ 里，且不含 define。
  // 哪天有人往根入口塞一个组件（或塞一个 import 顺带注册），这里会红 ——
  // 那时要么改代码，要么改文档，但不能两边各说各话。
  // ─────────────────────────────────────────────────────────────
  it("根入口的闭包只到 L0，不注册任何组件（文档里「引根入口=全量」是错的）", () => {
    const ENTRY = resolve(SRC, "index.ts");
    // 自己的正则副本：IMPORT_RE 是带 g 的模块级常量，别处用过 exec 循环会留下 lastIndex，
    // matchAll 会从那里开始 —— 那正是「守卫看似在跑，其实漏了半个文件」的形态。
    const RE = new RegExp(IMPORT_RE.source, "g");
    const seen = new Set<string>();
    const queue = [ENTRY];
    const defines: string[] = [];

    while (queue.length) {
      const file = queue.pop()!;
      if (seen.has(file)) continue;
      seen.add(file);
      const text = stripComments(readFileSync(file, "utf8"));
      if (/customElements\.define\s*\(/.test(text)) defines.push(relative(ROOT, file));
      for (const m of text.matchAll(RE)) {
        const spec = m[1];
        if (!spec.startsWith(".")) continue;
        const target = canon(resolve(file, "..", spec));
        if (seen.has(target) || !existsSync(target)) continue;
        queue.push(target);
      }
    }

    const outsideCore = [...seen]
      .map((f) => relative(SRC, f).split(sep).join("/"))
      // 入口自己（src/index.ts）当然不在 core/ 里，它只是转发
      .filter((rel) => rel !== "index.ts" && !rel.startsWith("core/"));

    // 扫描面是活的：闭包至少要有 index.ts + public.ts + 基类，否则「空集恒绿」
    expect(seen.size, "根入口闭包小得不像话，判据可能已经失效").toBeGreaterThan(4);

    expect(
      outsideCore,
      `根入口引到 core/ 之外了。\`import "z-agent-ui"\` 只承诺 L0 工具；\n` +
        `组件必须由域入口（z-agent-ui/components/button 等）注册：\n${outsideCore.join("\n")}`,
    ).toEqual([]);
    expect(
      defines,
      `根入口闭包里出现了 customElements.define。\n` +
        `引根入口就注册组件会把「按需引入」作废，也会让 start.html 的说明与代码再次相反：\n` +
        defines.join("\n"),
    ).toEqual([]);
  });
});
