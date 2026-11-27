// Test: 组件契约清单（`registry/component-manifest.json`）不许漂移。
//
// 与 `tests/tools/manifest.gen.test.ts` 配对：那边负责**写**，这边负责**没重写就红**。
// 生成器的注释一直声称「配对 component-manifest-guard 测试防漂移」，但这个文件此前
// 并不存在 —— 于是清单只是「某次生成时的快照」：新增组件、改属性、改 tag 全都不报错，
// 而消费方（AI 读清单生成页面）会照着过期契约写代码。
//
// [WHY 纯 fs 扫描、不 import 组件] 守卫要在毫秒级跑完，且不该被组件的浏览器依赖拖下水。
// 反射是生成器的事；这里只比对「源码里 define 了哪些 tag」与「清单里记了哪些」。
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const MANIFEST = "registry/component-manifest.json";

/** 与生成器同一份根目录清单（两处不一致本身就是漂移）。 */
// [2026-11-15] 新增 src/doc / src/content / src/property：文档模板、内容渲染器、
// 属性面板从 editor/ 迁出（L2 复合件不该挂在 L3 的编辑器域下）。**九个根，每个只出现一次** ——
// 同时写 `src/report` 与 `src/report/elements` 会让 scanDirs() 把每个 tag 收两遍，
// 而「重复标签」比「缺标签」更难发现（数量看起来是对的）。
const ROOTS = [
  "src/components",
  "src/primitives",
  "src/report",
  "src/flow",
  "src/doc",
  "src/content",
  "src/property",
  "src/app",
];

/**
 * 列出的九个根必须都存在。
 *
 * 组件库从页面引擎里拆出来之后 `src/editor` 不在了，而这行原先只写死在数组里 ——
 * `readdirSync` 直接抛 ENOENT，报出来是「测试文件加载失败」，看不出是「目录少了」。
 * 现在缺目录会得到一句明确的话；反过来，将来把某个域搬走而忘了删这里，也会红。
 */
function assertRoots(): void {
  const missing = ROOTS.filter((d) => !fs.existsSync(d));
  expect(missing, `ROOTS 里这些目录不存在：${missing.join(", ")}`).toEqual([]);
}

function walkTs(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

/**
 * 源码正文缓存。
 *
 * [WHY] 本文件要把同一批组件源码读**四遍**（definedTags / eventsIn / slotsIn / 全局 emit 守恒），
 * 而 2026-11-15 实测「读 src/ 的 581 个文件」自己就要 2.3s。四遍叠起来把那条反向用例顶过
 * 5s 默认预算（实测 6.5s，断言全通过）。缓存不改变任何判据 —— 同一进程里源码不会中途变。
 */
const srcCache = new Map<string, string>();
function readSrc(file: string): string {
  let hit = srcCache.get(file);
  if (hit === undefined) {
    hit = fs.readFileSync(file, "utf8");
    srcCache.set(file, hit);
  }
  return hit;
}

/** 源码里 每个 tag 的 define 文件（同一 tag 重复 define 会被浏览器拒绝，故取首个即可）。 */
function definedTags(): Map<string, string> {
  const re = /(?:customElements\.define|defineElement)\(\s*"([a-z0-9-]+)"/g;
  const out = new Map<string, string>();
  for (const root of ROOTS) {
    for (const file of walkTs(root)) {
      const src = readSrc(file);
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) if (!out.has(m[1])) out.set(m[1], file);
    }
  }
  return out;
}

interface Entry {
  tag: string;
  source: string;
  summary: string;
  layer: "foundation" | "base" | "composite" | "page";
  events: string[];
  slots: string[];
  properties: Array<{ name: string; attribute: string | false; aliases: string[]; type: string }>;
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
  stats: { components: number; properties: number; byLayer: Record<string, number> };
  components: Entry[];
};

const tags = definedTags();

describe("组件清单与源码一致", () => {
  it("扫描根目录都存在（少一个目录曾经直接抛 ENOENT，报成「加载失败」）", () => {
    assertRoots();
  });

  it("源码里 define 的每个 tag 都在清单里（漏组件不报错，但 AI 会以为它不存在）", () => {
    const missing = [...tags.keys()].filter((t) => !manifest.components.some((c) => c.tag === t));
    expect(missing, `清单缺这些 tag，跑 npm run manifest 重新生成：${missing.join(", ")}`).toEqual([]);
  });

  it("清单里没有源码中已不存在的 tag", () => {
    const stale = manifest.components.filter((c) => !tags.has(c.tag)).map((c) => c.tag);
    expect(stale, `清单里有已删除的组件：${stale.join(", ")}`).toEqual([]);
  });

  it("每条 source 都真的定义了这个 tag（防手改清单蒙混过关）", () => {
    const wrong = manifest.components
      .filter((c) => tags.get(c.tag) !== c.source)
      .map((c) => `${c.tag}: 清单写 ${c.source}，实际 ${tags.get(c.tag) ?? "无"}`);
    expect(wrong).toEqual([]);
  });

  it("stats 与数组对得上（有人手改过清单会在这里露出来）", () => {
    expect(manifest.stats.components).toBe(manifest.components.length);
    const props = manifest.components.reduce((s, c) => s + c.properties.length, 0);
    expect(manifest.stats.properties).toBe(props);
  });

  it("每条 layer 与它所在的目录一致（清单是给 AI 读的，层号是它唯一的结构性事实）", () => {
    // [WHY 判据写在守卫里而不是生成器里] 生成器算一遍、守卫再算一遍，两处独立才叫校验。
    // 只靠生成器的话，改错映射后重新生成 —— 清单和源码「一致地错」，谁都不会红。
    const expected = (source: string): Entry["layer"] => {
      const top = source.split("/")[1];
      if (top === "primitives") return "foundation";
      if (top === "components") return "base";
      if (top === "page" || top === "editor") return "page";
      return "composite";
    };
    const wrong = manifest.components
      .filter((c) => c.layer !== expected(c.source))
      .map((c) => `${c.tag}: 目录是 ${c.source.split("/")[1]}，清单写 ${c.layer}`);
    expect(wrong).toEqual([]);
  });

  it("每个组件都有真的一句摘要（空摘要 = 读清单的 AI 只能靠 tag 名猜）", () => {
    // [WHY 这也算契约] summary 是清单里唯一一列**语义**信息。props/events/slots 只回答
    // 「怎么用」，不回答「这是干什么的」—— 而后者恰恰是 AI 决定该不该用这个组件的前提。
    // 2026-11-15 实测：117 个组件里 34 个的卡片显示「未写摘要」，且没有任何判据会红。
    //
    // 两件事一起判：
    //   ① 非空 —— 生成器抠不到（源码头 40 行里没有一句「像说明」的 `//`）；
    //   ② 是句子 —— 装饰线（`// ═════`）会被当成摘要，卡片上显示成一排横线。
    //      判据与生成器一致：一行里既没有中文也没有拉丁字母，就不是句子。
    const empty = manifest.components.filter((c) => !c.summary || !c.summary.trim()).map((c) => c.tag);
    expect(empty, `这些组件的源码头缺一句说明，卡片会显示「未写摘要」：${empty.join(", ")}`).toEqual(
      [],
    );

    const notSentence = manifest.components
      .filter((c) => !/[\u4e00-\u9fa5A-Za-z]/.test(c.summary))
      .map((c) => `${c.tag}: ${c.summary}`);
    expect(notSentence, "摘要里既无中文也无拉丁字母 —— 多半是把注释分隔线当成了说明：").toEqual([]);

    // ③ 像一句话（以句末标点收尾）
    // 2026-11-15 实测：39 条摘要抄的是文件头的 [WHY] 片段，README 一样断在句中
    // （「判据是本组件最核心的部分 —— 手指在卡片上滑动……不能当成点击，」）。
    // 生成器按 120 字截断，所以「以句末标点结尾」正好能识别出「半句话」。
    const halfSentence = manifest.components
      .filter((c) => !/[。）)!?」】]$/.test(c.summary.trim()))
      .map((c) => `${c.tag}: ${c.summary.slice(-30)}`);
    expect(
      halfSentence,
      "摘要看起来是半句话（多以 [WHY] 片段被截断所致）—— 换成一句完整的说明：",
    ).toEqual([]);
  });

  it("stats.byLayer 与逐条统计对得上（三个层号都要出现）", () => {
    const counted = manifest.components.reduce<Record<string, number>>((acc, c) => {
      acc[c.layer] = (acc[c.layer] ?? 0) + 1;
      return acc;
    }, {});
    expect(manifest.stats.byLayer).toEqual(counted);
    // 没有 `page`：那一层是页面引擎的组件（`z-page-view` / `z-page-m-view` 等），
    // 它们依赖本包、不在本包里。这条断言因此是「本仓库只含组件库的组件」的一条证据 ——
    // 哪天真把某个页面组件塞进来，这里会先红。
    expect(Object.keys(counted).sort()).toEqual(["base", "composite", "foundation"]);
  });

  it("每条的属性名唯一、attribute 为 false 时 aliases 为空", () => {
    const bad: string[] = [];
    for (const c of manifest.components) {
      const names = c.properties.map((p) => p.name);
      if (new Set(names).size !== names.length) bad.push(`${c.tag}: 属性名重复`);
      for (const p of c.properties) {
        if (p.attribute === false && p.aliases.length) bad.push(`${c.tag}.${p.name}: 非属性却有别名`);
        if (p.attribute !== false && !p.aliases.includes(p.attribute)) {
          bad.push(`${c.tag}.${p.name}: 别名里没有 attribute`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// 事件与插槽：清单的另外两列
//
// [为什么必须独立重算] 生成器与守卫各扫一遍源码，只靠生成器的话，正则写错后重新生成
// —— 清单与源码「一致地错」，谁都不红。这条原则在 layer 字段上已经用过（见上）。
//
// 已知边界（写下来，免得下次把它当 bug 查）：
//   `z-open` / `z-close` 由 `primitives/overlay/dialogState.ts` **替宿主组件发出**
//   （`host.emit("z-open")`），源码不在 z-drawer / z-modal 的目录里，所以它们不在
//   这两个组件的 events 里。全局守恒判据（最后一条）会确认这两个事件确实被算在了
//   primitives 侧，而不是「谁都没收」。
// ─────────────────────────────────────────────────────────────

/** 组件自己的源码文件：定义 tag 的文件 + 同目录下不定义 tag 的 .ts（同生成器口径）。 */
function ownSources(file: string, tagFiles: Set<string>): string[] {
  const out: string[] = [];
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = `${d}/${e.name}`;
      if (e.isDirectory()) {
        walk(p);
        continue;
      }
      if (!p.endsWith(".ts") || p.endsWith("index.ts")) continue;
      if (tagFiles.has(p) && p !== file) continue;
      out.push(p);
    }
  };
  walk(path.dirname(file));
  return out;
}

const tagFiles = new Set(tags.values());

function eventsIn(files: string[]): string[] {
  const set = new Set<string>();
  const norm = (v: string) => v.replace(/\$\{[^}]*\}/g, "*");
  for (const f of files) {
    const src = readSrc(f);
    for (const m of src.matchAll(/\.emit\(\s*[`"']([^`"']+)[`"']/g)) set.add(norm(m[1]));
    for (const m of src.matchAll(/dispatchEvent\(\s*new\s+CustomEvent\(\s*[`"']([^`"']+)[`"']/g))
      set.add(norm(m[1]));
  }
  return [...set].sort();
}

function slotsIn(files: string[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    const src = readSrc(f);
    for (const m of src.matchAll(/<slot([^>]*)>/g)) {
      const name = /name="([^"]*)"/.exec(m[1]);
      if (!name) {
        set.add("default");
        continue;
      }
      set.add(name[1].replace(/\$\{[^}]*\}/g, "*"));
    }
  }
  return [...set].sort();
}

describe("组件清单：事件与插槽", () => {
  it(
    "每个组件的 events 与源码一致（漏一个都不会报错，AI 只会以为它不发）",
    () => {
      const bad: string[] = [];
      for (const c of manifest.components) {
        const expected = eventsIn(ownSources(c.source, tagFiles));
        const got = [...c.events].sort();
        if (JSON.stringify(expected) !== JSON.stringify(got)) {
          const miss = expected.filter((e) => !got.includes(e));
          const extra = got.filter((e) => !expected.includes(e));
          bad.push(`${c.tag}: 少 [${miss.join(",")}] 多 [${extra.join(",")}]`);
        }
      }
      expect(bad, `请跑 npm run manifest 重新生成：\n${bad.join("\n")}`).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it("events 全部是 z- 开头的自定义事件（库的既有约定）", () => {
    const bad = manifest.components.flatMap((c) =>
      c.events.filter((e) => !e.startsWith("z-")).map((e) => `${c.tag}: ${e}`),
    );
    expect(bad).toEqual([]);
  });

  it(
    "每个组件的 slots 与源码一致",
    () => {
      const bad: string[] = [];
      for (const c of manifest.components) {
        const expected = slotsIn(ownSources(c.source, tagFiles));
        const got = [...c.slots].sort();
        if (JSON.stringify(expected) !== JSON.stringify(got)) {
          bad.push(`${c.tag}: 应为 [${expected.join(",")}]，清单写 [${got.join(",")}]`);
        }
      }
      expect(bad, `请跑 npm run manifest 重新生成：\n${bad.join("\n")}`).toEqual([]);
    },
    SCAN_TIMEOUT_MS,
  );

  it("没有源码声明的事件凭空出现在清单里（反向：防手写/防生成器越界）", () => {
    const all = new Set(manifest.components.flatMap((c) => c.events));
    // 不属于任何 web component 的事件源。两类，都不是「漏扫」：
    //   · 共享原语：`primitives/overlay/dialogState.ts` 用 `host.emit()` **替宿主组件**发出
    //     （z-drawer / z-modal 的开关事件），实现不在组件目录里；
    //   · 运行时控制器：`page/behavior/command-runner.ts` 的 z-page-*（页面脚本要执行的动作，
    //     由页面宿主监听）、`theme/ThemeController` 的 z-theme-change（document 上的全局广播）。
    // 想加新的？先确认它**不是**某个组件该发的 —— 这条判据的全部意义就是逼人回答这个问题。
    const RUNTIME_EVENTS = new Set([
      "z-open",
      "z-close",
      "z-page-command",
      "z-page-close",
      "z-page-toast",
      "z-page-navigate",
      // `then download` 成功后的通知（2026-11-24，issue IKXKMN）：由 command-runner
      // 替两个页面组件发出 —— 宿主可能要记「谁导出了什么」，而浏览器不会告诉它
      "z-page-download",
      "z-theme-change",
    ]);
    const globalEmit = new Set<string>();
    for (const f of walkTs("src")) {
      const src = readSrc(f);
      for (const m of src.matchAll(/\.emit\(\s*[`"']([^`"']+)[`"']/g))
        globalEmit.add(m[1].replace(/\$\{[^}]*\}/g, "*"));
      for (const m of src.matchAll(/dispatchEvent\(\s*new\s+CustomEvent\(\s*[`"']([^`"']+)[`"']/g))
        globalEmit.add(m[1].replace(/\$\{[^}]*\}/g, "*"));
    }
    const orphans = [...all].filter((e) => !globalEmit.has(e) && !RUNTIME_EVENTS.has(e));
    expect(orphans, `清单里有源码中找不到的事件：${orphans.join(", ")}`).toEqual([]);

    // 反向：全仓每个 emit 都要么归到某个组件，要么来自共享原语 —— 否则就是「谁都没收」
    const unowned = [...globalEmit].filter((e) => !all.has(e) && !RUNTIME_EVENTS.has(e));
    expect(unowned, `这些事件没有归到任何组件，也没登记为共享原语：${unowned.join(", ")}`).toEqual(
      [],
    );
  }, SCAN_TIMEOUT_MS); // 这一条要 walk 整个 src/（不只 ROOTS），实测 6.5s，见 tests/scan-budget.ts

  it("stats.events / componentsWithEvents 与逐条对得上", () => {
    const stats = manifest.stats as unknown as {
      events: number;
      componentsWithEvents: number;
      componentsWithNamedSlots: number;
    };
    expect(stats.events).toBe(manifest.components.reduce((s, c) => s + c.events.length, 0));
    expect(stats.componentsWithEvents).toBe(
      manifest.components.filter((c) => c.events.length > 0).length,
    );
    expect(stats.componentsWithNamedSlots).toBe(
      manifest.components.filter((c) => c.slots.some((x) => x !== "default")).length,
    );
  });
});
