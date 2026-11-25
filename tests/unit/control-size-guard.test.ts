// Test: 控件尺寸档位守卫 —— `size` 的语义边界
//
// [WHY 需要这条守卫] B3b 之前，「表单族 size」是一句空话：14 个控件里 4 个有 size
// （且各指各的：switch 指图形尺寸、button 指 padding 档），10 个没有。
// 而定完语义之后新的风险是**漂回去**：有人给 z-checkbox 加个 size、有人把某个控件的
// `height: var(--z-input-height)` 直接写回去 —— 两种都不会报错，只是表单又开始参差。
//
// 四类判据：
//   ① 名单内的组件必须有 size 属性，且取值恰好是四档（不多不少）
//   ② 名单内的控件盒必须经 `var(--_h` 取高 —— 不许直接引用高度令牌
//   ③ 名单外的组件不许凑齐四档（凑齐 = 用了同一套高度语义却没登记）
//   ④ 四档取值必须是全局词汇表 SIZES 的子集（否则 vocabulary-guard 会红，这里提前说清）
//
// 名单本身不在这里，在 `src/core/controlSize.ts` 的 `SIZE_SUPPORTED` —— 它与
// `controlHeight()` 是同一份事实。守卫只负责核对「名单与代码一致」。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CONTROL_SIZES, SIZE_SUPPORTED, controlHeight } from "../../src/core/controlSize";
import { SIZES } from "../../src/core/vocabulary";

const MANIFEST = "registry/component-manifest.json";

interface Prop {
  name: string;
  values: string[] | null;
}
interface Comp {
  tag: string;
  source: string;
  properties: Prop[];
}

const manifest: { components: Comp[] } = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
const byTag = new Map(manifest.components.map((c) => [c.tag, c]));


/**
 * 剥掉块注释再做正则判断（保留换行，行号不漂）。
 *
 * [WHY] 上一版守卫把注释里的 `height: var(--z-input-height)` 当成真声明报了一条红 ——
 * 而这正是 B3 修 `theme-token-guard` 时踩过的同一个坑：**注释被当代码读**。
 * 判据要回答的是「样式表声明了什么」，不是「文件里出现过哪些字」。
 */
function stripCssComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/** 组件目录下的全部 CSS（不含 index.ts 之类）。 */
function cssOf(source: string): string[] {
  const dir = path.dirname(source);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".css"))
    .map((f) => path.join(dir, f));
}

describe("控件尺寸档位：size 的语义边界", () => {
  it("名单内的组件都在清单里（名单腐化会在这里响）", () => {
    const missing = SIZE_SUPPORTED.filter((t) => !byTag.has(t));
    expect(missing, `SIZE_SUPPORTED 里有不存在的组件：${missing.join(", ")}`).toEqual([]);
  });

  it("名单内的组件都有 size，且取值恰好四档", () => {
    const bad: string[] = [];
    for (const tag of SIZE_SUPPORTED) {
      const prop = byTag.get(tag)!.properties.find((p) => p.name === "size");
      if (!prop) {
        bad.push(`${tag}: 名单里但没有 size 属性`);
        continue;
      }
      const got = [...(prop.values ?? [])].sort();
      const want = [...CONTROL_SIZES].sort();
      if (JSON.stringify(got) !== JSON.stringify(want)) {
        bad.push(`${tag}.size: 取值 [${got.join(",")}]，应为 [${want.join(",")}]`);
      }
    }
    expect(bad, `\n${bad.join("\n")}\n先跑 npm run manifest`).toEqual([]);
  });

  it("名单内的控件盒必须经 var(--_h) 取高（不许直接吃高度令牌）", () => {
    const bad: string[] = [];
    // 高度令牌：只有经 --_h 才能在 size 切档时改变
    const DIRECT = /height:\s*var\(--(?:z-input-height|z-control-h[a-z-]*)\)/;
    for (const tag of SIZE_SUPPORTED) {
      const files = cssOf(byTag.get(tag)!.source);
      const stripped = files.map((f) => [f, stripCssComments(fs.readFileSync(f, "utf8"))] as const);
      const text = stripped.map(([, t]) => t).join("\n");
      if (!text.includes("var(--_h")) bad.push(`${tag}: 没有任何 var(--_h …)，size 写了也不生效`);
      for (const [f, t] of stripped) {
        const idx = t.split("\n").findIndex((l) => DIRECT.test(l));
        if (idx >= 0) bad.push(`${f}:${idx + 1} 直接吃了高度令牌，应改为 var(--_h, …)`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("名单外的组件不许凑齐四档（凑齐 = 用了同一套高度语义却没登记）", () => {
    const want = [...CONTROL_SIZES].sort().join(",");
    const offenders = manifest.components
      .filter((c) => !(SIZE_SUPPORTED as readonly string[]).includes(c.tag))
      .filter((c) => {
        const p = c.properties.find((x) => x.name === "size");
        return p?.values && [...p.values].sort().join(",") === want;
      })
      .map((c) => c.tag);
    expect(
      offenders,
      `这些组件已有四档 size 语义但不在 SIZE_SUPPORTED：${offenders.join(", ")}\n` +
        `先确认它是「控件高度」还是「图形尺寸」，再决定登记还是改名 —— 见 core/controlSize.ts 的边界说明`,
    ).toEqual([]);
  });

  it("四档取值是全局词汇表 SIZES 的子集（否则 vocabulary-guard 会红）", () => {
    const outside = CONTROL_SIZES.filter((s) => !(SIZES as readonly string[]).includes(s));
    expect(outside, `CONTROL_SIZES 有词表外的取值：${outside.join(", ")}`).toEqual([]);
  });

  it("未知取值兜底到 sm（不认识的 size 不能让控件塌成 0 高）", () => {
    // 直接核对映射表行为，避免只测「有四个值」这种形状判据
    expect(controlHeight("sm")).toBe(controlHeight("nonsense" as never));
    expect(controlHeight("md")).not.toBe(controlHeight("sm"));
  });
});
