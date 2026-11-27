// Test: React 包装器一致性守卫 —— component-manifest.json 里的每个组件都必须有对应 React 包装器，
// 且不得存在重复包装或未登记的外部标签。
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, "registry/component-manifest.json");
const REACT_INDEX = path.join(ROOT, "src/react/index.ts");

/** 属于独立包 z-agent-page 的标签，为兼容存量 React 宿主保留包装。 */
const EXTERNAL_TAGS = new Set([
  "z-page-view",
  "z-page-m-view",
  "z-page-editor",
  "z-page-editor-h5",
]);

describe("React 包装器一致性守卫", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as {
    components: Array<{ tag: string }>;
  };
  const manifestTags = new Set(manifest.components.map((c) => c.tag));
  const reactSrc = fs.readFileSync(REACT_INDEX, "utf8");
  const reactTags = [...reactSrc.matchAll(/createReactWrapper\(\s*"([^"]+)"\s*\)/g)].map((m) => m[1]);

  it("没有重复包装同一个标签", () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const tag of reactTags) {
      if (seen.has(tag)) dups.push(tag);
      else seen.add(tag);
    }
    expect(dups, "src/react/index.ts 中存在重复包装的标签").toEqual([]);
  });

  it("清单里的每个组件在 src/react/index.ts 都有对应包装器", () => {
    const reactSet = new Set(reactTags);
    const missing = [...manifestTags].filter((t) => !reactSet.has(t));
    expect(missing, "以下组件缺少 React 包装器").toEqual([]);
  });

  it("不在清单里的包装器必须显式登记在 EXTERNAL_TAGS", () => {
    const unknown = reactTags.filter((t) => !manifestTags.has(t) && !EXTERNAL_TAGS.has(t));
    expect(unknown, "未登记的外部标签").toEqual([]);
  });
});
