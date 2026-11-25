import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative } from "node:path";

// ─────────────────────────────────────────────────────────────
// 品牌名守卫：项目名可以改，但不许「改一半」或「改回去」
//
// 2026-11-24 从 zWebUI 改名为 zAgentUI 时，名字散落在 import 路径、产物文件名、
// localStorage 键、构建脚本的判断逻辑里 —— 共 3 种写法、2900 余处。那次靠手工搜替换，
// 漏一处不会报错：`vendor-check` 里写死的依赖名会让它「一个模块都校验不到」而全绿，
// 存储键写死会让新旧数据各存一份。这条守卫把两类地方钉住：
//
//   ① 旧名回潮 —— 活文件里再出现 zwebui / zWebUI / z-web-ui 就红
//   ② 新名硬编码进逻辑 —— src/ 与 bin/ 的**代码**里出现品牌名就红
//      （注释不算：注释里写 `import "z-agent-ui/page/syntax"` 是在教宿主怎么引，
//        那正是它该出现的地方）
//
// 名字的合法住处只有一处：package.json 的 name。谁需要它就去读，别抄。
// ─────────────────────────────────────────────────────────────

const ROOT = process.cwd();

/**
 * 旧名：任何活文件里都不该再有。
 *
 * `WebUI` 单独一条是被漏过一次的形态：页头的 logo 写成 `<span>z</span>WebUI`
 * （`z` 高亮、其余普通），替换 `zWebUI` 时**碰不到它** —— 于是 25 个页面的
 * 左上角都还挂着旧名，而测试全绿、组件全正常。拆开写的品牌名同样算旧名。
 */
const RETIRED = ["zwebui", "zWebUI", "z-web-ui", "WebUI", "zagentui"];

/** 新名：只允许出现在注释、文档与 UI 文案里，不许进逻辑。 */
const BRAND = ["z-agent-ui", "zAgentUI"];

/**
 * 遍历时剪枝，不是遍历完再过滤。
 *
 * 全量跑时这条守卫与另外 500 多个测试并发，扫 `node_modules` + `docs` 的上万个文件
 * 会直接撞 5s 超时 —— 而超时与「有没有旧名」毫无关系，报出来却像内容问题。
 */
const SKIP_DIRS = new Set([
  "node_modules",
  "dist",
  "docs",
  "dist-packages",
  ".git",
  ".worktrees",
  ".workbuddy",
  "coverage",
]);

/**
 * 先让 git 找出「含旧名的文件」，只读这几个。
 *
 * 直接遍历 1500 个文件、读全文再判断，单跑 0.9 秒、全量 527 个测试并发时能吃掉
 * 20 秒以上（读盘被拖慢两个数量级），报出来是「超时」——和内容毫无关系。
 * `git grep` 走索引，同样范围只要 0.1 秒，而且天然只搜已跟踪文件。
 *
 * 返回 null 表示 git 不可用（比如拷出来的裸目录），调用方回退到遍历。
 */
function filesWithRetired(): string[] | null {
  const patterns = RETIRED.flatMap((p) => ["-e", p]);
  try {
    const out = execFileSync(
      "git",
      ["grep", "-l", "-F", ...patterns, "--", ...SCAN_DIRS, ...SCAN_FILES],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    return out.split("\n").filter(Boolean);
  } catch (err) {
    // git grep 一条都没命中时退出码是 1，这不是错误
    if ((err as { status?: number }).status === 1) return [];
    return null;
  }
}

function walk(dir: string, out: string[] = []): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of names) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/** 去掉 `//` 行注释与 `/* *\/` 块注释：注释里提名字是说明，不是依赖。 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

// ── ① 旧名回潮 ────────────────────────────────────────────────
//
// 扫描面是**明确列举**的，不是 `walk(ROOT)` 减历史目录：后者会读掉 wiki 里
// 上千个历史 md（其中不少是几十 KB 的长文），全量并发时必然撞超时，而超时报出来
// 长得像「内容有问题」。这里只列出会真的把旧名漏给用户的地方。
const SCAN_DIRS = [
  "src",
  "demo",
  "tests",
  "bin",
  "smoke",
  "skills",
  "registry",
  "architecture",
  "wiki/reference",
  "wiki/requirements",
];

const SCAN_FILES = [
  "package.json",
  "README.md",
  "README.zh-CN.md",
  "AGENTS.md",
  "CLAUDE.md",
  "LICENSE",
  "index.html",
  "vite.config.ts",
  "vite.demo.config.ts",
];

describe("旧名不得回潮", () => {
  it("活文件里不再出现 zwebui / zWebUI / z-web-ui / 裸 WebUI", () => {
    const located = filesWithRetired();
    const files =
      located !== null
        ? located
        : [
            ...SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))),
            // 根文件里有的仓库没有（AGENTS.md / CLAUDE.md 属于上层仓库），只扫真实存在的
            ...SCAN_FILES.map((f) => join(ROOT, f)).filter((f) => existsSync(f)),
          ].filter((f) => /\.(ts|tsx|mjs|css|html|json|md|sh)$/.test(f));

    const hits: string[] = [];
    for (const f of files) {
      const rel = f.startsWith(ROOT) ? relative(ROOT, f) : f;
      // 守卫自己必然写着旧名 —— 那正是它要抓的东西
      if (rel === "tests/unit/brand-guard.test.ts") continue;
      // 已发出的 issue 正文与收口记录：改名会让它与 gitee 上的正文对不上
      if (/^wiki\/planning\/.*issue.*\.md$/.test(rel)) continue;
      // 改名这件事的记录必然写着旧名 —— 不写读者不知道从什么改成了什么
      if (/^wiki\/requirements\/REQ-057-rename/.test(rel)) continue;

      const raw = readFileSync(f.startsWith(ROOT) ? f : join(ROOT, f), "utf8");
      // ★ 先做一次纯字符串判断：绝大多数文件根本不含旧名，直接跳过。
      //   不加这一层的话，每个文件都要 split → filter → join → 三次 replace 分配一堆
      //   临时字符串，1500 个文件在全量并发下能吃掉 20 秒（单跑只要 0.8 秒）。
      if (!RETIRED.some((pat) => raw.includes(pat))) continue;

      // 命中的少数文件才做逐行过滤：改名需求（REQ-057）自己的记录行允许出现旧名，
      // 其余行一律不许 —— 否则「改了一半」正是这条守卫要抓的东西。
      const text = raw
        .split("\n")
        .filter((line) => !line.includes("REQ-057"))
        .join("\n")
        .replace(/cpsoft13\.gitee\.io\/z-web-ui/g, "")
        .replace(/cpsoft13\/z-web-ui/g, "")
        // 演示站域名是部署侧的绑定，改它要动 DNS/CNAME，不是改代码能完成的。
        // 新域名（z-agent-ui.haoyongde.com）配好之前，这个地址是唯一能打开的演示站。
        .replace(/zwebui\.haoyongde\.com/g, "");

      for (const pat of RETIRED) {
        if (text.includes(pat)) hits.push(`${rel} 含 ${pat}`);
      }
    }
    expect(hits, `旧项目名重新出现（改名前叫 zWebUI）：\n${hits.join("\n")}`).toEqual([]);
  }, 20_000);
});

// ── ② 新名不得进逻辑 ──────────────────────────────────────────
describe("品牌名不得写进代码逻辑", () => {
  it("src/ 的代码里没有品牌名（注释不算）", () => {
    const hits: string[] = [];
    for (const f of walk(join(ROOT, "src"))) {
      if (!/\.(ts|css)$/.test(f) || f.endsWith(".d.ts")) continue;
      const raw = readFileSync(f, "utf8");
      // 快速预筛：不含品牌名的文件（多数）不必进正则剥注释 —— 全量并发时
      // 对 670 个文件逐个剥注释会撞 5s 超时，而超时报出来像内容问题
      if (!BRAND.some((b) => raw.includes(b))) continue;
      const code = stripComments(raw);
      for (const pat of BRAND) {
        if (code.includes(pat)) hits.push(`${relative(ROOT, f)} 含 ${pat}`);
      }
    }
    expect(
      hits,
      `库本体不该知道自己的名字（读 package.json 或提到文档里）：\n${hits.join("\n")}`,
    ).toEqual([]);
  }, 20_000);

  it("bin/ 的校验与构建逻辑里没有品牌名（CLI 帮助文案除外）", () => {
    const hits: string[] = [];
    // CLI 入口的用户可见帮助文案必然写着命令名，它是给人看的，不是判断依据
    const ALLOW = new Set(["bin/z-agent-ui.mjs"]);
    for (const f of walk(join(ROOT, "bin"))) {
      if (!f.endsWith(".mjs")) continue;
      const rel = relative(ROOT, f);
      if (ALLOW.has(rel)) continue;
      const code = stripComments(readFileSync(f, "utf8"));
      for (const pat of BRAND) {
        if (code.includes(pat)) hits.push(`${rel} 含 ${pat}`);
      }
    }
    expect(
      hits,
      `包名从 package.json 读，别抄进脚本 —— 抄了之后改名时这里会静默失效：\n${hits.join("\n")}`,
    ).toEqual([]);
  });

  it("存储键不得含品牌名（它一旦绑定名字，每次改名都要迁移用户数据）", () => {
    const hits: string[] = [];
    for (const f of walk(join(ROOT, "src"))) {
      if (!f.endsWith(".ts") || f.endsWith(".d.ts")) continue;
      const raw = readFileSync(f, "utf8");
      if (!/[:."]/.test(raw)) continue; // 没有字符串字面量的文件直接跳过
      const code = stripComments(raw);
      // 任何字符串字面量里出现 `<品牌>:<用途>` 或 `<品牌>-<用途>` 都算
      for (const m of code.matchAll(/"([a-z][a-z0-9-]*)([:.])[^"]*"/g)) {
        const head = m[1];
        if (BRAND.some((b) => head.startsWith(b))) {
          hits.push(`${relative(ROOT, f)}：${m[0]}`);
        }
      }
    }
    expect(hits, `存储键前缀请用中性的 \`zui\`：\n${hits.join("\n")}`).toEqual([]);
  }, 20_000);
});

// ── ③ 名字只有一处真源 ────────────────────────────────────────
describe("名字的真源只有 package.json", () => {
  it("package.json 的 name 是 @cpsoft13/z-agent-ui", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    // 仓库名、npm 包名、import 路径三者同一个字符串。
    // 与品牌名 `zAgentUI` 是两个东西：那是给人看的标题，这是给包管理器看的标识。
    //
    // [WHY 带 scope] npm 判定 `z-agent-ui` 与已存在的 `zagentui` 太相似，非作用域名
    // 无法发布（E403）。scope 是 npm 的命名空间，不是品牌的一部分 —— 标识本体仍是
    // 后半段，产物名、样式入口、仓库地址都按它推导。
    expect(pkg.name).toBe("@cpsoft13/z-agent-ui");
    expect(pkg.name.replace(/^@[^/]+\//, "")).toBe("z-agent-ui");
  });

  it("构建产物名与 repo 地址跟着 package.json 走", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    // [WHY 去 scope] `dist/<包名>.js` 在作用域包下会拼出 `dist/@scope/name.js` 这种
    // 不存在的路径。产物名历来是不带 scope 的标识本体。
    const name = pkg.name.replace(/^@[^/]+\//, "");
    // 产物以包名命名：dist/<name>.js。改了入口 key 而没改这里 = 产物名与 exports 对不上
    expect(pkg.main, "main 必须指向 dist/<包名>.js").toBe(`./dist/${name}.js`);
    expect(pkg.exports[`./${name}.css`], "样式入口 key 必须与包名一致").toBe(
      `./dist/${name}.css`,
    );
    expect(pkg.repository?.url ?? "", "仓库地址必须与包名同源").toContain(name);
  });

  it("两个 README 的标题与 package.json 的品牌一致", () => {
    for (const f of ["README.md", "README.zh-CN.md"]) {
      const text = readFileSync(join(ROOT, f), "utf8");
      const h1 = text.split("\n").find((l) => l.startsWith("# ")) ?? "";
      expect(h1.trim(), `${f} 的一级标题不是 zAgentUI`).toBe("# zAgentUI");
    }
  });
});

// ── ④ 守卫自身得能红 ──────────────────────────────────────────
describe("守卫自己得能红", () => {
  it("喂一条旧名就报错", () => {
    const sample = 'import "zwebui/components/button";';
    expect(RETIRED.some((p) => sample.includes(p))).toBe(true);
  });

  it("拆开写的 logo 也算旧名（`<span>z</span>WebUI` 曾整批漏掉）", () => {
    const logo = '<div class="demo-header__brand"><span>z</span>WebUI</div>';
    expect(RETIRED.some((p) => logo.includes(p))).toBe(true);
    // 新名字里不含 WebUI，不该误报
    expect(RETIRED.some((p) => '<span>z</span>AgentUI'.includes(p))).toBe(false);
  });

  it("喂一条写进逻辑的品牌名就报错（注释里的不算）", () => {
    const bad = 'const dep = pkg.dependencies?.["z-agent-ui"];';
    const ok = '// 宿主这样引：import "z-agent-ui/page/syntax"';
    const hasBrand = (src: string) => {
      const code = stripComments(src);
      return BRAND.some((b) => code.includes(b));
    };
    expect(hasBrand(bad)).toBe(true);
    expect(hasBrand(ok)).toBe(false);
  });
});
