// Test: 文案守卫 —— 默认文案必须中文、同概念不许各写一份、词表是唯一来源
// Related: [[copy]]（src/core/copy.ts）
// Date: 2026-11-15
//
// [WHY 需要这一层守卫] 库里已经有对比度守卫、令牌守卫、清单守卫、词汇守卫 ——
// **文案这个维度一条判据都没有**。而它恰好是最容易被漏掉的一类缺陷：
// 不报错、不崩溃，只是界面上中英混排。
//
// 2026-11-15 实测的真实现状（改之前）：
//   · 48 条 `*Text` / `*Label` 默认值是英文（"No data" / "Loading..." / "Close"），
//     而另外 108 条是中文 —— 同一块屏幕上「暂无数据」与 "No data" 并存
//   · 「空态」有 4 种写法、`closeLabel` 有 2 种、`alignLeftText` 有 2 种，
//     其中一部分是场景化措辞（该留），一部分是随手写的（该收）
//   · 同名概念在 3 个组件里各写一遍字面量，改一处不会带动其它两处
//
// 四条判据各自都能单独抓住一类回归：
//   C1 同属性名跨组件默认值必须一致，差异必须登记（抓「又冒出一个写法」）
//   C2 默认文案必须含中文（抓英文残留；豁免逐条给理由）
//   C3 词表值不许以字面量写进组件（抓「绕过词表各写一份」）
//   C4 词表自身：非空、含中文、不重复、理由写得下

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { COPY, COPY_EXEMPT, COPY_DIVERGENCE } from "../../src/core/copy";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "registry/component-manifest.json");
const SRC = path.join(ROOT, "src");

interface Prop {
  name: string;
  type: string;
  default: unknown;
}
interface Comp {
  tag: string;
  source: string;
  properties: Prop[];
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as { components: Comp[] };

/** 文案类属性：以 Text / Label 结尾、默认值是字符串。 */
const isCopyProp = (p: Prop): p is Prop & { default: string } =>
  /(Text|Label)$/.test(p.name) && typeof p.default === "string";

const HAS_CJK = /[\u4e00-\u9fa5]/;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".ts") && !e.name.endsWith(".d.ts")) out.push(p);
  }
  return out;
}

describe("文案：默认值必须中文、同概念必须一致", () => {
  it("C1 同一个属性名在各组件里的默认值必须一致；差异必须登记在 COPY_DIVERGENCE", () => {
    const byName = new Map<string, Map<string, string>>(); // prop → tag → default
    for (const c of manifest.components) {
      for (const p of c.properties) {
        if (!isCopyProp(p)) continue;
        const m = byName.get(p.name) ?? new Map<string, string>();
        m.set(c.tag, p.default);
        byName.set(p.name, m);
      }
    }

    const problems: string[] = [];
    for (const [name, perTag] of byName) {
      const values = new Set(perTag.values());
      const registered = COPY_DIVERGENCE[name];
      if (values.size === 1) {
        if (registered) {
          problems.push(
            `${name}: 已登记为差异，但库里只剩一个值 ${JSON.stringify([...values])} —— 把登记删掉`,
          );
        }
        continue;
      }
      if (!registered) {
        const detail = [...perTag].map(([t, v]) => `${t}=${JSON.stringify(v)}`).join("  ");
        problems.push(
          `${name}: 有 ${values.size} 种默认值但没登记 —— ${detail}\n` +
            `      要么统一成一个，要么在 src/core/copy.ts 的 COPY_DIVERGENCE 里写清为什么不同`,
        );
        continue;
      }
      const want = new Set(registered.values);
      const missing = [...values].filter((v) => !want.has(v));
      const stale = [...want].filter((v) => !values.has(v));
      if (missing.length || stale.length) {
        problems.push(
          `${name}: 登记与实现不符（多出 [${missing.join(",")}]，登记里已消失 [${stale.join(",")}]）`,
        );
      }
    }
    expect(problems, "同概念文案漂移：").toEqual([]);
  });

  it("C2 默认文案必须含中文（豁免逐条给理由，且不许留已失效的豁免）", () => {
    const exempt = new Map(COPY_EXEMPT.map((e) => [`${e.tag}.${e.prop}`, e.why]));
    const problems: string[] = [];
    const seen = new Set<string>();

    for (const c of manifest.components) {
      for (const p of c.properties) {
        if (!isCopyProp(p)) continue;
        const key = `${c.tag}.${p.name}`;
        if (HAS_CJK.test(p.default)) continue;
        if (exempt.has(key)) {
          seen.add(key);
          continue;
        }
        problems.push(
          `${key} 的默认值是 ${JSON.stringify(p.default)} —— 中文业务系统里默认给英文，` +
            `宿主看到的就是中英混排。改成中文，或引用 COPY.*；确实该保留英文就进 COPY_EXEMPT 并写理由`,
        );
      }
    }
    for (const key of exempt.keys()) {
      if (!seen.has(key)) problems.push(`COPY_EXEMPT 里的 ${key} 已经不存在（或已改成中文），删掉这一条`);
    }
    expect(problems, "默认文案不是中文：").toEqual([]);
  });

  it("C3 词表值不许再以字面量写进组件（否则改一处不会带动其它处）", () => {
    const values = new Set(Object.values(COPY));
    const problems: string[] = [];

    for (const file of walk(SRC)) {
      if (file.endsWith(path.join("core", "copy.ts"))) continue;
      const text = fs.readFileSync(file, "utf8");
      if (!/(?:customElements\.define|defineElement)\s*\(/.test(text)) continue; // 只看组件元素类

      for (const m of text.matchAll(/([A-Za-z_$][\w$]*(?:Text|Label))\s*=\s*"([^"]*)"/g)) {
        const [, prop, value] = m;
        if (!values.has(value)) continue;
        const line = text.slice(0, m.index).split("\n").length;
        const key = Object.entries(COPY).find(([, v]) => v === value)?.[0];
        problems.push(
          `${path.relative(ROOT, file)}:${line}  ${prop} = "${value}"  —— 词表里已有 COPY.${key}，改用它`,
        );
      }
    }
    expect(problems, "组件里还有硬编码的通用文案：").toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("C4 词表自身：非空、含中文、不重复、登记条目都写了理由", () => {
    const problems: string[] = [];

    const seenValue = new Map<string, string>();
    for (const [k, v] of Object.entries(COPY)) {
      if (!v.trim()) problems.push(`COPY.${k} 是空串`);
      else if (!HAS_CJK.test(v)) problems.push(`COPY.${k} = "${v}" 不含中文`);
      const dup = seenValue.get(v);
      if (dup) {
        problems.push(`COPY.${k} 与 COPY.${dup} 的值相同（"${v}"）—— 同一个概念不该有两个键`);
      } else {
        seenValue.set(v, k);
      }
    }

    for (const e of COPY_EXEMPT) {
      if (e.why.trim().length < 8) problems.push(`COPY_EXEMPT 里 ${e.tag}.${e.prop} 的理由太短`);
    }
    for (const [name, d] of Object.entries(COPY_DIVERGENCE)) {
      if (!d.values.length) problems.push(`COPY_DIVERGENCE.${name} 没有登记任何取值`);
      if (d.why.trim().length < 8) problems.push(`COPY_DIVERGENCE.${name} 的理由太短`);
    }

    expect(problems, "词表本身不合格：").toEqual([]);
  });
});
