// Test: 组件详情页的「用法片段」必须与包承诺一致（入口不是手抄的）
//
// Date: 2026-11-15
//
// [WHY 需要机器判据] 片段里唯一会「悄悄错」的是进口那一行：
// 组件目录搬过家（`components/report` → `report`），深引路径全变。手抄 118 份示例，
// 下次搬迁就有 118 处对不上，而页面照样好看、照样能点 —— 读者复制过去得到
// 「找不到模块」，只会认为库坏了。所以入口从 `package.json` 的 exports 推导，
// 并且**全量校验**：推导规则（我写的）与包承诺（exports）可以不一致，不一致就必须红。
//
// 本文件刻意把期望值写成**独立规则**（前缀同构 + 段数下界 + 组件走目录 barrel），
// 而不是「再调一次 entryOf 比对」—— 那样断言与被测实现同源，改坏了也一起绿。

import { describe, expect, it } from "vitest";
import { COMPONENTS } from "../../demo/manifest.js";
import { STYLE_ENTRY, entryOf, isExportable, usageSnippet } from "../../demo/usage.js";
import { SCAN_TIMEOUT_MS } from "../scan-budget";

describe("用法片段：入口必须与 package.json 的 exports 对得上", () => {
  it("扫描面是活的（清单空 / 推导全返回空串时下面几条会变哑巴）", () => {
    expect(COMPONENTS.length).toBeGreaterThan(100);
    expect(COMPONENTS.map(entryOf).filter(Boolean).length).toBe(COMPONENTS.length);
  });

  it("每个组件的入口都在 exports 里（精确键或通配键覆盖）", () => {
    const bad = COMPONENTS.filter((c) => !isExportable(entryOf(c))).map(
      (c) => `${c.tag}: ${entryOf(c)}（source=${c.source}）`,
    );
    expect(bad, `这些入口不在 package.json 的 exports 里，读者复制会「找不到模块」：\n${bad.join("\n")}`).toEqual([]);
    expect(isExportable(STYLE_ENTRY), "样式入口不在 exports 里").toBe(true);
  });

  it("入口与源码路径同构，且不许退化成「根入口」或「整个域」来蒙混", () => {
    const problems: string[] = [];
    for (const c of COMPONENTS) {
      const entry = entryOf(c);
      const rest = entry.split("/").slice(1); // z-agent-ui/report → ["report"]
      const srcSeg = c.source.replace(/^src\//, "").split("/").slice(0, -1); // 去掉文件名
      // ① 至少引到域：`z-agent-ui` 本身也是合法 exports，退化成根会让「按需引入」变成假话
      if (rest.length < 1) {
        problems.push(`${c.tag}: 入口 ${entry} 只到根（至少要引到域）`);
        continue;
      }
      // ② 前缀同构：入口的每一段都必须逐字等于源码目录的前缀
      const same = rest.every((s, i) => s === srcSeg[i]);
      if (!same) problems.push(`${c.tag}: 入口 ${entry} 与源码目录 ${srcSeg.join("/")} 不同构`);
      // ③ 组件域必须按控件目录引：81 个目录都有自己的 barrel，按域引会把 82 个全拉进来
      if (srcSeg[0] === "components" && rest.join("/") !== `components/${srcSeg[1]}`) {
        problems.push(`${c.tag}: 应引 z-agent-ui/components/${srcSeg[1]}，实际 ${entry}`);
      }
    }
    expect(problems, "入口推导与源码路径不一致：").toEqual([]);
  });

  it("片段形状：标签在前、模块脚本在后，事件监听只在有事件时出现", () => {
    const problems: string[] = [];
    for (const c of COMPONENTS) {
      const s = usageSnippet(c);
      const entry = entryOf(c);
      if (!s.includes(`<${c.tag}></${c.tag}>`)) problems.push(`${c.tag}: 缺标签行`);
      if (!s.includes(`import "${entry}"`)) problems.push(`${c.tag}: 缺组件入口`);
      if (!s.includes(`import "${STYLE_ENTRY}"`)) problems.push(`${c.tag}: 缺样式入口（漏了它组件没样式）`);
      if (!s.includes('<script type="module">')) problems.push(`${c.tag}: 不是 module 脚本`);
      if (!s.trimEnd().endsWith("</script>")) problems.push(`${c.tag}: 脚本没闭合`);
      // 标签必须在脚本之前：读者从上往下读时先看到「用起来长什么样」，再看「怎么让它跑起来」
      if (s.indexOf(`<${c.tag}></${c.tag}>`) > s.indexOf('\n<script type="module">')) {
        problems.push(`${c.tag}: 标签排在了脚本后面`);
      }
      // 片段里不许出现 HTML 注释：摘要（来自源码 [WHY]）里可能带 `<`, `--`, 甚至 `<script>`，
      // 塞进注释轻则读不懂、重则把标签变成正文
      if (s.includes("<!--")) problems.push(`${c.tag}: 片段里混进了 HTML 注释`);

      const hasEvent = c.events.length > 0;
      const hasListener = s.includes(".addEventListener(");
      if (hasEvent !== hasListener) {
        problems.push(`${c.tag}: 有事件=${hasEvent} 但监听行=${hasListener}`);
      }
      // 有「值变了」的事件时必须挂它，而不是源码里先登记的那个
      // （z-input 先登记的是 z-blur —— 教读者监听失焦不是任何人的第一需求）
      const names = c.events.map((e) => (typeof e === "string" ? e : e.name));
      const want = ["z-change", "z-input"].find((n) => names.includes(n));
      if (want && !s.includes(`addEventListener("${want}"`)) {
        problems.push(`${c.tag}: 有 ${want} 却挂了别的（${names.join("/")}）`);
      }
    }
    expect(problems, "片段形状不对：").toEqual([]);
  }, SCAN_TIMEOUT_MS);

  it("变异：入口退化成域根时，同构判据必须红（否则上面那条管不住「按需引入」）", () => {
    // 这里不跑实现，只把「退化后的入口」喂给独立规则，确认规则本身有牙齿
    const c = COMPONENTS.find((x) => x.source.startsWith("src/components/"))!;
    const degraded = "z-agent-ui";
    const entrySeg = degraded.replace(/^z-agent-ui\//, "").split("/").filter(Boolean);
    expect(entrySeg.length < 2, "段数下界规则失效了").toBe(true);
    expect(entryOf(c).startsWith("z-agent-ui/components/"), "真实实现没走目录 barrel").toBe(true);
  });
});
