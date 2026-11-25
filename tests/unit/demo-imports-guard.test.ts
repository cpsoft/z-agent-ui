// Test: demo 的「对库的引用面」守卫 —— 只许走对外入口，且用到的标签必须真的注册了
//
// [WHY 需要这条守卫] demo 是**使用方唯一会照抄的地方**。它怎么写 import，宿主就会怎么写；
// 于是库内部的深引路径（`src/components/button/Button.js`）会先传染给文档、再传染给 20 个业务系统，
// 最后变成「组件目录一搬迁，所有人一起断」。
// 这正是 2026-11-15 那次五目录搬迁要付的代价：库自己 203 处深引改完了，
// demo 里还留着 79 处 —— **文档比库更晚学会规矩**。
//
// 判据口径（三层，缺一层都会漏）：
//   ① 路径形态：demo 对 src 的引用只能是 barrel（`../src/**/index.js`）。
//      这一层管「写得对不对」。深引不会报错，只会在某次搬迁后变成 404。
//   ② 对外可解析：每个 barrel 都要能被 `package.json exports` 解析到，且产物里真有那个文件。
//      这一层管「这个路径对使用方是否存在」—— barrel 在源码里存在 ≠ 包对外承诺了它。
//   ③ 注册覆盖：页面上用到的每个 `z-*` / `m-*` 标签，必须被该页**自己引入的某个 barrel
//      （含其目录子树）** 覆盖。这一层管「东西真的会渲染」。
//      未注册的自定义元素被当行内元素渲染：**不报错、样式不生效、内容消失**。
//      实例：`internal/theme-host.html` 用了 `<z-tab-panel>` 却只 import `tabs`（它不注册
//      tab-panel）；`internal/density-probe.html` 用了 `<m-cell>` 却只 import `m-list`。
//      两个都是「页面上少了一块」，且没有任何东西会报错。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const DEMO = "demo";
const SRC = "src";
/** dist 存在与否决定判据②的第二段要不要跑（构建产物不是源码事实） */
const distReady = fs.existsSync("dist");
if (!distReady) console.warn("[demo-imports-guard] 没有 dist/，跳过「产物里真有这个入口」这一段（先 npm run build）");

const PKG = JSON.parse(fs.readFileSync("package.json", "utf8")) as {
  exports: Record<string, string | { types?: string; import?: string }>;
};
const manifest: { components: Array<{ tag: string; source: string }> } = JSON.parse(
  fs.readFileSync("registry/component-manifest.json", "utf8"),
);

/** tag → 它的实现文件（判 ③ 用它跟「这一页实际加载的模块图」比对） */
const tagSource = new Map<string, string>();
for (const c of manifest.components) tagSource.set(c.tag, path.normalize(c.source));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * 剥注释再匹配。
 *
 * [WHY 与 demo-coverage-guard 同样的处理] 本仓库已经三次栽在「守卫把注释当代码读」上。
 * 这里两处会中招：import 写在注释里（假引用）、tag 出现在注释里（假缺失）。
 * 只剥行注释与 HTML 注释 —— 不剥块注释：HTML 里嵌 JS/CSS，块注释边界靠正则猜会吃掉半份文件。
 *
 * [补充：`<style>` 里的块注释要单独剥（第四次踩同一个坑）] h5-editor.html 有一句 CSS 注释
 * 「`--z-app-shell-text` 只在 `<z-app-shell>` 里定义」，那条注释让判据③报「z-app-shell 没引入」。
 * 页面本身完全正常。整份文件一起剥块注释会出事，但**只剥 `<style>…</style>` 区间内部**是安全的
 * —— CSS 里没有 JS 字符串、也不嵌 JS，边界可靠。
 */
function stripComments(src: string): string {
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(<style[^>]*>)([\s\S]*?)(<\/style>)/g, (_m, open: string, css: string, close: string) => {
      return open + css.replace(/\/\*[\s\S]*?\*\//g, "") + close;
    })
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

/** 读文件 + 剥注释的结果缓存（同一份文件会被多个页面反复读，逐个正则很慢） */
const textCache = new Map<string, string>();
function textOf(file: string): string {
  let hit = textCache.get(file);
  if (hit === undefined) {
    hit = stripComments(fs.readFileSync(file, "utf8"));
    textCache.set(file, hit);
  }
  return hit;
}

const demoFiles = walk(DEMO).filter((f) => f.endsWith(".html") || f.endsWith(".ts"));

interface Ref {
  file: string;
  spec: string;
  /** import 语句里被引用的名字（空数组 = 纯副作用 import） */
  names: string[];
}

/** 从同一条 import 语句里取名字：`{ a, b as c }` 与默认导入都算 */
function namesOf(stmt: string): string[] {
  const braces = /\{([^}]*)\}/.exec(stmt);
  if (braces) {
    return braces[1]
      .split(",")
      .map((s) => s.trim().replace(/^type\s+/, ""))
      .filter(Boolean)
      .map((s) => (s.includes(" as ") ? s.split(" as ")[0].trim() : s));
  }
  const def = /import\s+(?:type\s+)?([A-Za-z_$][\w$]*)\s+from/.exec(stmt);
  return def ? [def[1]] : [];
}

const refs: Ref[] = [];
for (const file of demoFiles) {
  const src = textOf(file);
  // [WHY `(?:\.\./)+`] demo/examples/ 与 demo/internal/ 在深一层，写的是 `../../src/...`。
  // 只写 `\.\./src/` 的判据会**一条都匹配不到**这两个目录 —— 守卫在一片违规里报「全绿」。
  // 第一版就是这么错的：干跑说「79 处待改」，实际是 171 处。
  const stmtRe = /import\s+(?:type\s+)?(?:[^;]*?\s+from\s+)?"((?:\.\.\/)+src\/[^"]+)"/g;
  for (const m of src.matchAll(stmtRe)) {
    refs.push({ file, spec: m[1], names: namesOf(m[0]) });
  }
}

/** `../../src/components/button/index.js` → `src/components/button/index.ts`（相对引用方的目录） */
function toTsPath(spec: string, fromFile: string): string {
  return path.normalize(path.join(path.dirname(fromFile), spec)).replace(/\.js$/, ".ts");
}

/** `src/components/button/index.ts` → `components/button`（package exports 的子路径形态） */
function toSubpath(tsPath: string): string {
  const rel = tsPath.replace(/^src\//, "").replace(/\/index\.ts$/, "").replace(/\.ts$/, "");
  return rel === "index" ? "" : rel;
}

/** package exports 能否解析这个子路径（支持精确项与 `*` 通配） */
function resolvableByExports(sub: string): boolean {
  if (sub === "") return "." in PKG.exports;
  for (const key of Object.keys(PKG.exports)) {
    if (key === `.${sub === "" ? "" : "/" + sub}`) return true;
    const star = key.indexOf("*");
    if (star >= 0) {
      const pre = key.slice(0, star);
      const post = key.slice(star + 1);
      const target = "." + "/" + sub;
      if (target.startsWith(pre) && target.endsWith(post) && target.length >= pre.length + post.length) return true;
    }
  }
  return false;
}

/**
 * 该子路径的产物应当在哪。
 *
 * [WHY 先读 exports 再退回拼约定] 主入口的子路径是 `""`，产物是 `dist/z-agent-ui.js` ——
 * 按 `<sub>.js` 拼出来是 `dist/.js`，于是「demo 引主入口」被误判成「产物里没有」。
 * 主入口是完全合法的 barrel（宿主写自定义 cell 时就要从它取 `BaseElement`），
 * 所以这里改成认 exports 里的精确项：有就照它写的位置找，没有（通配符子路径）再拼约定。
 */
function distFileOf(sub: string): string {
  const key = sub === "" ? "." : `./${sub}`;
  const exp = PKG.exports[key];
  const imp = typeof exp === "string" ? exp : exp && "import" in exp ? exp.import : undefined;
  if (typeof imp === "string") return imp.replace(/^\.\//, "");
  return path.join("dist", `${sub}.js`);
}

describe("demo 对库的引用面：只走 barrel + 标签必须注册", () => {
  it("① demo 对 src 的引用只能是 barrel（`../src/**/index.js`）", () => {
    const deep = refs.filter((r) => !/\/index\.js$/.test(r.spec));
    expect(
      deep.map((r) => `${path.relative(DEMO, r.file)} → ${r.spec}`),
      "demo 里还在深引组件实现文件。改成它所在目录的 barrel（index.js）——\n" +
        "深引不会立刻报错，但组件目录一搬迁，文档与照抄文档的宿主会一起断：",
    ).toEqual([]);
  });

  it("② 引用的 barrel 必须存在，且能被 package.json exports 解析、产物里真有", () => {
    const problems: string[] = [];
    for (const r of refs) {
      const ts = toTsPath(r.spec, r.file);
      if (!fs.existsSync(ts)) {
        problems.push(`${path.relative(DEMO, r.file)} → ${r.spec}：源码里没有 ${ts}`);
        continue;
      }
      const sub = toSubpath(ts);
      if (!resolvableByExports(sub)) {
        problems.push(`${path.relative(DEMO, r.file)} → ${r.spec}：exports 无法解析子路径 "${sub}"`);
        continue;
      }
      // [WHY 还要看产物] barrel 在源码里存在，不代表它被列成构建入口。
      // vite.config 的 scanEntries 只把带 index.ts 的目录收成入口；一旦某个 barrel 的
      // index.ts 被挪走/改名，exports 仍然「解析成功」，而 dist 里没有那个文件 —— 只在消费方炸。
      // [WHY 没有 dist 就跳过这一条] dist 是构建产物，不是源码事实。新克隆里跑守卫时它不存在，
      // 一屏 100 条「产物里没有 XXX」只会让人以为判据坏了。宁可显式说明「这次没查」。
      if (!distReady) continue;
      if (!fs.existsSync(distFileOf(sub))) {
        problems.push(`${path.relative(DEMO, r.file)} → ${r.spec}：产物里没有 ${distFileOf(sub)}（先 npm run build）`);
      }
    }
    expect(problems, "这些引用指向了「源码有、包对外没有」的路径：").toEqual([]);
  });

  it("③ 页面上用到的标签，必须真的被「这一页加载的模块图」注册", () => {
    /**
     * 相对路径 → 真实的 .ts 文件（先当文件、再当目录找 index.ts）。
     * `import "./x.js"` 在源码里是 `x.ts`；`import "./x"` 可能是 `x/index.ts`。
     *
     * [WHY 加缓存] 同一条 import 会在「页面闭包 / src 闭包 / registered 累加」三处被反复解析，
     * 每次两条 existsSync —— 而这个仓库的 fs 很贵（实测读 581 个文件 2.3s）。
     * 2026-11-15 这条用例 7.0s，超了 5s 默认预算而断言全通过。
     * 缓存 key 是「引用方 + spec」，编译器/模块系统的解析本来就是这对参数的纯函数。
     */
    const resolveCache = new Map<string, string | null>();
    function resolveTs(fromFile: string, spec: string): string | null {
      const key = `${fromFile}\0${spec}`;
      const hit = resolveCache.get(key);
      if (hit !== undefined) return hit;
      const base = path.normalize(path.join(path.dirname(fromFile), spec));
      const noExt = base.replace(/\.(js|ts)$/, "");
      const cands = [noExt + ".ts", path.join(noExt, "index.ts")];
      const found = cands.find((c) => fs.existsSync(c)) ?? null;
      resolveCache.set(key, found);
      return found;
    }

    /**
     * 一个文件的相对 import（含 HTML 的 `<script src>`）。
     *
     * [WHY 必须排除 `import type`] 类型导入**在运行时不执行**，它不会触发
     * `customElements.define`。`src/components/tabs/Tabs.ts` 里就有
     * `import type { ZTabPanel } from "../tab-panel/TabPanel.js"` —— 如果把它算成
     * 「加载了 tab-panel」，判据③ 就再也看不见「用了 `<z-tab-panel>` 却没引 tab-panel」
     * 这个真实缺陷。变异验证 C（删掉 tab-panel 的 import）正是靠这一条才变红的。
     */
    function localSpecs(file: string): string[] {
      const src = textOf(file);
      const specs: string[] = [];
      for (const m of src.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) specs.push(m[1]);
      for (const m of src.matchAll(/import\s+(?:type\s+)?[^;]*?from\s+"(\.[^"]+)"/g)) {
        if (/^import\s+type\s/.test(m[0])) continue; // 纯类型导入：不产生运行时副作用
        specs.push(m[1]);
      }
      for (const m of src.matchAll(/(?:^|\n)\s*import\s+"(\.[^"]+)"/g)) specs.push(m[1]);
      for (const m of src.matchAll(/export\s+(?:type\s+)?(?:\*|\{[^}]*\})\s+from\s+"(\.[^"]+)"/g)) {
        if (/^export\s+type\s/.test(m[0])) continue;
        specs.push(m[1]);
      }
      return specs;
    }

    /**
     * demo 侧闭包：这一页实际加载了哪些本仓文件。
     *
     * [WHY 也要看 `<script src>`] 有 6 个页面的接线是外链模块
     * （`<script type="module" src="./complex-page.ts">`），它们自己一行 import 都没有。
     * 只看 `import` 语句会把这些页面判成「什么组件都没引」—— 第一版就是这么误报了 6 页。
     */
    function demoClosure(file: string, seen = new Set<string>()): Set<string> {
      if (seen.has(file)) return seen;
      seen.add(file);
      for (const spec of localSpecs(file)) {
        const target = resolveTs(file, spec);
        if (target && target.startsWith(DEMO + path.sep)) demoClosure(target, seen);
      }
      return seen;
    }

    /**
     * src 侧闭包：一个模块被加载时，**通过 import 链**会连带注册哪些元素。
     *
     * [WHY 不能只看「目录子树」] 第一版按目录判：barrel 在自己目录里注册自己。它漏掉一类
     * 常见情况 —— 一个组件的实现里 import 了另一个组件（`report/table` 内部会拉起
     * `column-selector`、`chart` 拉起 `chart-axis`），那个 tag 由**别人的目录**注册。
     * 于是 report.html 明明能跑，守卫却报「z-column-selector 没引入」。
     * 判据必须走真实的 import 图，不能近似成目录。
     */
    const closureCache = new Map<string, Set<string>>();
    function srcClosure(entry: string): Set<string> {
      const cached = closureCache.get(entry);
      if (cached) return cached;
      const seen = new Set<string>([entry]);
      const queue = [entry];
      while (queue.length) {
        const file = queue.pop()!;
        for (const spec of localSpecs(file)) {
          const target = resolveTs(file, spec);
          if (target && target.startsWith(SRC + path.sep) && !seen.has(target)) {
            seen.add(target);
            queue.push(target);
          }
        }
      }
      closureCache.set(entry, seen);
      return seen;
    }

    const problems: string[] = [];
    for (const file of demoFiles.filter((f) => f.endsWith(".html"))) {
      const page = demoClosure(file);
      const registered = new Set<string>();
      const used = new Set<string>();

      for (const f of page) {
        for (const spec of localSpecs(f)) {
          const ts = resolveTs(f, spec);
          if (ts && ts.startsWith(SRC + path.sep)) for (const s of srcClosure(ts)) registered.add(s);
        }
        const src = textOf(f);
        for (const m of src.matchAll(/<((?:z|m)-[a-z0-9-]+)[\s/>]/g)) used.add(m[1]);
        for (const m of src.matchAll(/createElement\(\s*["'`]((?:z|m)-[a-z0-9-]+)["'`]/g)) used.add(m[1]);
      }

      const missing = [...used].filter((tag) => {
        const source = tagSource.get(tag);
        if (!source) return false; // 幽灵 tag 由 demo-coverage-guard ③ 负责，不在这里重复报
        return !registered.has(source);
      });
      if (missing.length) problems.push(`${path.relative(DEMO, file)}: ${missing.sort().join(", ")}`);
    }

    expect(
      problems,
      "这些页面用到了没引入的组件 —— 未注册的自定义元素被当行内元素渲染：\n" +
        "不报错、样式不生效、内容直接消失。给页面补上对应的 barrel import：",
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS); // 要遍历所有页面的模块图，实测 7.0s，见 tests/scan-budget.ts
});
