// L1 边界：`src/components/**` 只准经由两个 L0 出口取符号，且不准引上层实现。
//
// Related: [[REQ-038-layered-architecture]] · architecture/l1-plan.html 第 10 章
// Date: 2026-11-14
//
// [为什么需要它] B1 把 159 处 import 手工改到了两个出口，但**没有任何东西阻止
// 下一个人再改回去**。L0 的 l0-boundary 管的是「L0 不往上引」，这一条管的是
// 「L1 不绕 L0 的出口」—— 方向相反，缺一边就等于只防了一半。
//
// [三类违规，判据不同]
//   ① facade  ：引 `src/index.ts` 或 `core/public.ts`。这两个是**对外面**，
//              库内部引它 = 让公开 API 的形状决定内部代码能不能编译。
//   ② L0-deep ：引 `core/xxx.js` / `primitives/xxx/yyy.js` 这类内部文件名。
//              比 ① 更脆：门面至少被 l0-exports 钉着不随便改，内部文件想拆就拆。
//   ③ upper   ：引 `page/` / `report/` / `editor/` / `app/` —— 控件反过来依赖上层，
//              这就是「组装件伪装成控件」的判据。
//
// [① ② 现在必须是 0] B1 已经清零，之后任何一处回来都是回归。
// [③ 暂时只能部分生效] 204 处集中在 5 个「即将搬出 components」的目录（B2）。
//    所以 ③ 用**只减不增**的白名单：名单外的目录一处都不许有；名单本身由测试钉死，
//    想新增必须改这个数组，而改数组会在 code review 里被看见。
//    B2 完成后这 5 个目录从名单删除，③ 就变成全量生效。

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const COMP = resolve(SRC, "components");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

/** 去掉注释但保留行号（换成等长空白）—— 理由同 l0-boundary-guard。 */
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
 * 正是这个形态。守卫漏掉一整种写法，等于漏掉一半的入口。
 */
const IMPORT_RE = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)["']([^"']+)["']/g;

/**
 * 说明符形状过滤。字符串数组里的 `"from"` 会被上面的正则误当成 import，
 * 捕获出 `", "` 这种不可能存在的说明符。L0 那条守卫踩过这个误报。
 */
const SPEC_SHAPE = /^[.@a-zA-Z0-9_~]/;

/**
 * B2 之后应搬出 `src/components` 的目录。它们今天仍在上层依赖里，
 * 所以 ③ 类违规对它们豁免。
 *
 * [只减不增] 这个数组是白名单，不是配置。往里加一个目录 = 给「控件依赖上层」发许可证，
 * 必须在 commit message 里写明为什么这个目录**不该搬走**。
 */
/**
 * 暂时还违规的目录（豁免名单）。
 *
 * **[2026-11-14 B2 完成，名单已清零]** 原先的 4 个（page-editor / page-editor-h5 /
 * page-view / page-m-view）都因为「渲染时要用 page 层的 AST 与 blocks」而暂时违规，
 * 现在它们整体迁到了 `src/editor/`，不再属于 L1 —— 于是 L1 的「不引上层」
 * 从「带豁免」变成了**全量生效**。
 *
 * 保留这个空集合而不是删掉它，是因为下一条断言要读它：**名单只减不增**。
 * 加一个新名字之前，先想清楚它在 B3 之前能不能改完。
 */
const UPPER_EXEMPT_DIRS = new Set<string>([]);

const UPPER_ROOTS = new Set(["page", "report", "editor", "app", "flow"]);

interface Violation {
  file: string;
  line: number;
  spec: string;
  target: string;
}

function scan(): { facade: Violation[]; deep: Violation[]; upper: Violation[]; exempted: Violation[]; checked: number } {
  const facade: Violation[] = [];
  const deep: Violation[] = [];
  const upper: Violation[] = [];
  // 白名单目录里的违规单独收，用来判「名单是不是还有用」，不能混进 upper
  const exempted: Violation[] = [];
  let checked = 0;

  for (const file of walk(COMP)) {
    const text = stripComments(readFileSync(file, "utf8"));
    const dir = relative(COMP, file).split(sep)[0];

    for (const m of text.matchAll(IMPORT_RE)) {
      const spec = m[1];
      if (!spec.startsWith(".") || !SPEC_SHAPE.test(spec)) continue;
      checked++;

      const abs = resolve(dirname(file), spec.replace(/[?#].*$/, "").replace(/\.js$/, ".ts"));
      const rel = relative(SRC, abs).split(sep).join("/");
      const top = rel.split("/")[0];
      const v = { file: relative(ROOT, file), line: text.slice(0, m.index ?? 0).split("\n").length, spec, target: rel };

      // 对外面：src/index.ts 是包门面，core/public.ts 是同一份承诺的真源
      if (rel === "index.ts" || rel === "core/public.ts") {
        facade.push(v);
        continue;
      }
      // L0 内部文件（两个出口之外的任何 core/ primitives/ 路径）
      if ((top === "core" || top === "primitives") && !/(^|\/)index\.ts$/.test(rel)) {
        deep.push(v);
        continue;
      }
      // 上层实现
      if (UPPER_ROOTS.has(top)) {
        (UPPER_EXEMPT_DIRS.has(dir) ? exempted : upper).push(v);
      }
    }
  }
  return { facade, deep, upper, exempted, checked };
}

const fmt = (list: Violation[]) =>
  list.map((v) => `  ${v.file}:${v.line}  ${v.spec}  →  ${v.target}`).join("\n");

describe("L1 边界：只准经由 L0 的两个出口", () => {
  // [WHY 只扫一次] 原来每个用例各调一次 `scan()`，同一批 150 个文件被读 5 遍。
  // 单跑本文件时够快，整仓并行回归时（其它 worker 同时吃 CPU 与磁盘）实测 4 条用例
  // 一起撞 5s 默认预算而**超时**——报错长得像「边界被破坏」，其实是假红。
  // 扫描期间源码不会变，一次就够；扫描型用例的预算见 tests/scan-budget.ts。
  const S = scan();

  it("扫描器真的读到了文件（防止路径写错导致「零违规」的假绿）", () => {
    const { checked } = S;
    // 基线：2026-11-14 B2 完成后实测 345 个相对 import（components 只剩 L1，150 个 .ts）。
    // 阈值取八成：走错路径时这里会接近 0，而「零违规」正是最难分辨的假绿。
    expect(checked).toBeGreaterThan(270);
  });

  it("不引包的对外面（src/index.ts / core/public.ts）", () => {
    const bad = S.facade;
    expect(
      bad,
      `这些地方经由对外面取 L0 符号。对外面是给宿主的；库内部应引 core/index.ts：\n${fmt(bad)}`,
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("不深引 L0 内部文件（core/*.js / primitives/*/*.js）", () => {
    const bad = S.deep;
    expect(
      bad,
      `这些地方绕过出口直接引 L0 的内部文件，L0 一改布局就一起红。改走 core/index.js 或 primitives/index.js：\n${fmt(bad)}`,
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("不引上层实现（page / report / editor / app / flow），已搬走的目录除外", () => {
    const bad = S.upper;
    expect(
      bad,
      `这些目录不在 B2 的搬迁名单里，却引了上层实现 —— 说明它是组装件而不是控件，应补进 4.2 的映射表：\n${fmt(bad)}`,
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("上层豁免名单只减不增：名单里的目录必须仍然存在且确实在用上层依赖", () => {
    const { exempted } = S;
    // 豁免的意义是「暂时还违规」。一个目录如果已经不再引上层，它就该从名单里消失 ——
    // 否则名单会变成「永久免检」，B2 做完也没人记得清理。
    const still = new Set(exempted.map((v) => relative(COMP, resolve(ROOT, v.file)).split(sep)[0]));
    const stale = [...UPPER_EXEMPT_DIRS].filter((d) => !still.has(d));
    expect(
      stale,
      `这些目录已不再引上层实现，请从 UPPER_EXEMPT_DIRS 删除（名单只减不增）：\n  ${stale.join("\n  ")}`,
    ).toEqual([]);
  }, SCAN_TIMEOUT_MS);
});
