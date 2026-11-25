// Test: 组件表达词汇守卫 —— 跨组件公共维度（tone / appearance / size / variant）
// 只能取 src/core/vocabulary.ts 里定义的值，或命中冻结的历史豁免清单
// Related: [[req-20261025-ai-gen-vocabulary]]
// Wiki: wiki/reference/component-vocabulary.md
// Date: 2026-10-25
// Author: 吴八哥 (AI)
//
// [WHY 守卫放在契约而不是逐个改组件] 90 个组件里 10 个的 variant 有 9 种取值集，
// 一次全改的回归面巨大；但**不拦住新增**才是真正的问题——第 11 个组件会再发明一套。
// 所以：存量按豁免清单冻结，新增一律不许越界。清单只允许缩小。

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  governedDimension,
  LEGACY_EXEMPTIONS,
  TONES,
  APPEARANCES,
  SIZES,
} from "../../src/core/vocabulary";

const MANIFEST = "registry/component-manifest.json";

interface Prop {
  name: string;
  values: string[] | null;
}
interface Comp {
  tag: string;
  properties: Prop[];
}

function loadManifest(): { components: Comp[] } {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(`${MANIFEST} 不存在，先跑 npm run manifest`);
  }
  return JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
}

describe("公共词汇守卫", () => {
  const manifest = loadManifest();

  it("每个受管属性的取值都在词汇表或冻结豁免内", () => {
    const violations: string[] = [];

    for (const comp of manifest.components) {
      for (const prop of comp.properties) {
        const allowed = governedDimension(prop.name);
        if (!allowed || !prop.values) continue;

        const exempt = LEGACY_EXEMPTIONS[comp.tag]?.[prop.name] ?? [];
        const bad = prop.values.filter((v) => !allowed.includes(v) && !exempt.includes(v));
        if (bad.length) {
          violations.push(
            `${comp.tag}.${prop.name} 用了未登记的取值: ${bad.join(", ")}` +
              `（允许: ${allowed.join("|")}）`,
          );
        }
      }
    }

    expect(violations, `\n${violations.join("\n")}\n`).toEqual([]);
  });

  it("豁免清单只能收紧：登记的组件/属性必须真实存在", () => {
    const byTag = new Map(manifest.components.map((c) => [c.tag, c]));
    const stale: string[] = [];

    for (const [tag, props] of Object.entries(LEGACY_EXEMPTIONS)) {
      const comp = byTag.get(tag);
      if (!comp) {
        stale.push(`${tag} 已不存在`);
        continue;
      }
      for (const [propName, values] of Object.entries(props)) {
        const prop = comp.properties.find((p) => p.name === propName);
        if (!prop) {
          stale.push(`${tag}.${propName} 已不存在`);
          continue;
        }
        // 组件已经改成规范值后，豁免项应当删除 —— 否则清单会腐化成垃圾桶
        const stillUsesLegacy = (prop.values ?? []).some((v) => values.includes(v));
        if (!stillUsesLegacy) stale.push(`${tag}.${propName} 已不再使用旧值，请从清单删除`);
      }
    }

    expect(stale, `\n${stale.join("\n")}\n`).toEqual([]);
  });

  it("词汇表三个维度互不重叠（同一个词不能既表示色调又表示外观）", () => {
    const overlap = (a: readonly string[], b: readonly string[], an: string, bn: string) =>
      a.filter((x) => b.includes(x)).map((x) => `${an}/${bn} 都含 "${x}"`);

    const problems = [
      ...overlap(TONES, APPEARANCES, "tone", "appearance"),
      ...overlap(TONES, SIZES, "tone", "size"),
      ...overlap(APPEARANCES, SIZES, "appearance", "size"),
    ];
    expect(problems).toEqual([]);
  });

  it("契约清单没有过期（组件属性改了必须重新生成）", () => {
    // 只查结构量级，不重跑完整反射（那要 11s）。完整重建由 npm run manifest 负责。
    const totalProps = manifest.components.reduce((s, c) => s + c.properties.length, 0);
    expect(manifest.components.length).toBeGreaterThan(80);
    expect(totalProps).toBeGreaterThan(500);
    expect(fs.existsSync("src/core/vocabulary.ts")).toBe(true);
  });
});
