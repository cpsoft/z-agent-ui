// Test: demo 示例覆盖率守卫 —— 「清单里的每个组件，demo 里都有一处能看见」
//
// [WHY 需要这条守卫] 「96/117 覆盖」是这次重构的动机之一，但**它是手数出来的**。
// 手数的数字第二天就开始烂：清单加了组件、页面删了一段示例、某个 tag 拼错了 ——
// 三种情况下 demo 都照样构建成功，只是「有 21 个组件没有示例」这件事又悄悄长回来。
//
// 判据口径（这是本条守卫最需要写清的部分，不然它会撒谎）：
//   **示例 = demo 的 html 或 examples/*.ts 里出现了 `<tag` 或 `createElement("tag")`。**
//   · 扫 `demo/**/*.html`：包括以画框嵌进文档页的整页 demo（它们是真跑的页面）
//   · 扫 `demo/examples/**/*.ts`：与旧页一起抽出来的接线模块
//   · **不扫** `nav.ts` / `manifest.ts` / `cards.ts` / `frame.ts` / `shell.ts`：
//     它们里面有 tag 字符串（家族成员表、卡片链接、画框清单），但那是**名单**不是示例。
//     这一条是必须的 —— 早期用「文件里出现 tag 字符串」当判据，把家族表算成示例，
//     覆盖率虚报成 112/117，实际只有 93。
//
// 四类判据：
//   ① 清单里的每个 tag 要么被示例覆盖，要么在 NON_DEMOABLE 里**并给出理由**
//   ② NON_DEMOABLE 不许「其实已经被示例了」（否则名单会变成垃圾桶，慢慢吃掉全部组件）
//   ③ 示例里出现的 tag 必须在清单里（拼错的 tag 会安静地少覆盖一个组件，渲染成空标签）
//   ④ 覆盖率数字必须等于「清单 − NON_DEMOABLE」，不允许有第三态

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const MANIFEST = "registry/component-manifest.json";
const DEMO = "demo";

interface Comp {
  tag: string;
  layer: string;
}

const manifest: { components: Comp[] } = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const allTags = manifest.components.map((c) => c.tag);

/**
 * 没有示例的组件，以及**为什么可以没有**。
 *
 * [WHY 允许存在这个名单] 有些件是「机制」不是「控件」：它没有外观，行为只在别的组件里
 * 才观察得到。硬给它摆一个示例，只会得到一块看不懂的空白。但「没有示例」必须是一个
 * **要写理由的决定**，不是「还没做」—— 所以条目是对象而不是字符串。
 *
 * 判据 ② 反着查：名单里写了的，不许其实已经被示例了。
 */
const NON_DEMOABLE: Array<{ tag: string; reason: string }> = [];

/** 目录扫描：递归收集 demo 下的 html 与 ts */
function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

/**
 * 不参与「示例」判据的模块：它们是**名单与壳**，里面出现 tag 字符串不等于有示例。
 *
 * [WHY 用排除表而不是「只扫 examples/」] 只用 examples/ 会漏掉一整类示例：
 * 有些页面把组件**用 JS 建出来**（`demo/page-def.ts:534` 建 `<z-page-editor>`、
 * `demo/h5-editor.ts:84` 建 `<z-page-editor-h5>`），页面自己的 .ts 就是接线文件。
 * 第一版守卫只扫 examples/，于是这两个 L3 编辑器被报成「没有示例」—— 判据的口径错，
 * 不是代码缺。**判据错和代码错必须分清**，否则会去补一个已经存在的东西。
 */
const LIST_MODULES = new Set(["nav.ts", "manifest.ts", "cards.ts", "frame.ts", "shell.ts"]);

/** 参与「示例」判据的文件：demo 下所有 html + 所有 ts（除名单/壳模块） */
const exampleFiles = walk(DEMO).filter(
  (f) => f.endsWith(".html") || (f.endsWith(".ts") && !LIST_MODULES.has(path.basename(f))),
);

/** 文件里真实用到某个 tag 的三种写法：`<tag`、`<tag>`、createElement("tag") */
function usesTag(src: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`<${escaped}[\\s/>]`).test(src) ||
    new RegExp(`createElement\\(\\s*["'\`]${escaped}["'\`]`).test(src)
  );
}

/**
 * 剥掉注释再匹配。
 *
 * [WHY 必须剥] 本仓库已经栽过两次「守卫把注释当代码读」：`theme-token-guard` 把注释里的
 * `--z-x:` 当成定义、`control-size-guard` 把解释缺陷的注释当成声明。这次同样：
 * 我在 density-probe 里写了一句「原写法 createElement("z-m-list") 是错的」——
 * 那条注释本身把幽灵 tag 判据再次点红。
 * 注释既会**造出假红**（提到不存在的标签），也会**造出假绿**（注释掉的标记被算成示例），
 * 两个方向都要防，所以统一在进判据之前剥掉。
 */
function stripComments(src: string): string {
  // [WHY 不剥块注释] 第一版连 `/* … */` 一起剥，结果 report.html 里一个没闭合的
  // `/*` 把后面整份文件都吃掉了 —— z-chart / z-gantt / z-column-selector 从「已覆盖」
  // 变成「找不到示例」，红得很有说服力但完全是假的。**HTML 里嵌 JS/CSS，
  // 块注释的边界不能靠正则猜**。行注释与 HTML 注释足够覆盖这次的两类误读。
  return src
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const sources = exampleFiles.map((f) => ({ file: f, src: stripComments(fs.readFileSync(f, "utf8")) }));

/** tag → 用到它的文件（报错时给出「在哪儿」，而不是只说缺了谁） */
const demoedIn = new Map<string, string[]>();
for (const { file, src } of sources) {
  for (const tag of allTags) {
    if (usesTag(src, tag)) demoedIn.set(tag, [...(demoedIn.get(tag) ?? []), path.relative(DEMO, file)]);
  }
}

/**
 * 示例里出现的所有 `z-*` / `m-*` 标签名（用来查幽灵 tag）。
 *
 * [WHY 也要抓 createElement] 标签可以只出现在 JS 里：
 * `createElement("z-m-list")` 写错时不会有任何标记层面的痕迹，而页面同样是空白。
 * 2026-11-15 就是这样在 density-probe 里躺着一个 `z-m-list` + `z-m-list-item`
 * （真名是 `m-list` / `m-cell`），格子空了不知道多久。
 */
const usedTagNames = new Set<string>();
for (const { src } of sources) {
  for (const m of src.matchAll(/<((?:z|m)-[a-z0-9-]+)[\s/>]/g)) usedTagNames.add(m[1]);
  for (const m of src.matchAll(/createElement\(\s*["'`]((?:z|m)-[a-z0-9-]+)["'`]/g)) usedTagNames.add(m[1]);
}

describe("demo 覆盖率：清单里每个组件都得有示例", () => {
  it("① 清单里的每个 tag 都有示例，或在 NON_DEMOABLE 里写明理由", () => {
    const excused = new Map(NON_DEMOABLE.map((d) => [d.tag, d.reason]));

    const noReason = NON_DEMOABLE.filter((d) => !d.reason || d.reason.trim().length < 12).map((d) => d.tag);
    expect(noReason, `NON_DEMOABLE 里的条目必须写清「为什么可以没有示例」（≥12 字）：`).toEqual([]);

    const missing = allTags.filter((t) => !demoedIn.has(t) && !excused.has(t));
    expect(
      missing,
      `这 ${missing.length} 个组件在 demo 里一处都找不到 —— 要么补示例，` +
        `要么在 NON_DEMOABLE 里写明为什么可以没有：\n  ${missing.join("\n  ")}`,
    ).toEqual([]);
  });

  it("② NON_DEMOABLE 不许是垃圾桶（写进去的必须真的没有示例）", () => {
    const stale = NON_DEMOABLE.filter((d) => demoedIn.has(d.tag)).map(
      (d) => `${d.tag} 已被 ${demoedIn.get(d.tag)!.join(", ")} 示例`,
    );
    expect(stale, `这些组件其实已经有示例了，把理由从 NON_DEMOABLE 里删掉：`).toEqual([]);
  });

  it("③ 示例里出现的 tag 必须在清单里（拼错会渲染成空标签，且不报错）", () => {
    const ghosts = [...usedTagNames].filter((t) => !allTags.includes(t)).sort();
    expect(
      ghosts,
      `demo 里用了清单中不存在的 tag —— 多半是拼错，页面会渲染成一块空白：\n  ${ghosts.join("\n  ")}`,
    ).toEqual([]);
  });

  it("④ 覆盖率 = 清单 − NON_DEMOABLE（没有第三态）", () => {
    const covered = allTags.filter((t) => demoedIn.has(t)).length;
    const excused = NON_DEMOABLE.filter((d) => !demoedIn.has(d.tag)).length;
    // 这条看着是同义反复，但它锁的是「四个数字互相对得上」：
    // 一旦有人把某个组件既加进 NON_DEMOABLE 又偷偷示例（或反过来），
    // ①② 各报一半，这条会指出总数不对。
    expect(covered + excused).toBe(allTags.length);
    // 覆盖率写进测试输出，方便和文档里的数字核对 —— 文档里那个数必须是这里跑出来的。
    console.log(`[demo 覆盖] ${covered}/${allTags.length} 有示例，${excused} 个显式豁免`);
  });
});
