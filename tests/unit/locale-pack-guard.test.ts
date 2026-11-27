// Test: 语言包一致性守卫 —— 所有语言包的键集合、非空性与占位符必须与默认包 zh-CN 完全对齐
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { zhCN } from "../../src/core/locales/zh-CN";
import { enUS } from "../../src/core/locales/en-US";

const LOCALES_DIR = path.join(process.cwd(), "src/core/locales");
const PACKS: Record<string, Record<string, string>> = {
  "zh-CN": zhCN,
  "en-US": enUS,
};

function placeholdersOf(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/\{(\w+)(?:,[^}]*)?\}/g)) {
    names.add(m[1]);
  }
  return [...names].sort();
}

describe("语言包一致性守卫", () => {
  it("src/core/locales 下的每个语言包文件都已纳入校验表", () => {
    const files = fs
      .readdirSync(LOCALES_DIR)
      .filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
      .map((f) => f.slice(0, -3))
      .sort();
    expect(Object.keys(PACKS).sort()).toEqual(files);
  });

  it("所有语言包的键集合与默认包 zh-CN 完全一致，且无空值", () => {
    const baseKeys = Object.keys(zhCN).sort();
    for (const [locale, pack] of Object.entries(PACKS)) {
      const keys = Object.keys(pack).sort();
      expect(keys, `${locale} 键集合与 zh-CN 不一致`).toEqual(baseKeys);
      for (const [k, v] of Object.entries(pack)) {
        expect(v.trim().length, `${locale}.${k} 不能为空`).toBeGreaterThan(0);
      }
    }
  });

  it("所有语言包的 {placeholder} 名称与 zh-CN 完全一致", () => {
    for (const [locale, pack] of Object.entries(PACKS)) {
      if (locale === "zh-CN") continue;
      for (const [k, baseVal] of Object.entries(zhCN)) {
        expect(
          placeholdersOf(pack[k]),
          `${locale}.${k} 的占位符与 zh-CN.${k} 不一致`,
        ).toEqual(placeholdersOf(baseVal));
      }
    }
  });
});
