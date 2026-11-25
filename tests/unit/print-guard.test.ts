// Test: 打印守卫 —— 钉住「打印只由 z-print 承接」这条职责边界
//
// [WHY 需要它] 打印最容易退化成「谁都能顺手加一点」：某个组件为了让自己印得好看，
// 加一段 `@media print`；下一个人照着抄；一年后打印行为散在 20 个组件里，谁也不敢动。
// z-print 的存在意义就是把这些收在一处 —— 所以这条边界必须机械可查。
//
// 四条判据：
//   G1 组件不许自己写打印样式（`@media print` 只允许出现在白名单里，且必须写明理由）
//   G2 z-print 不许认组件内部类名（通用纸面规则只能按标签生效）
//   G3 快照真的展开了 shadow 与 slot（行为判据，不是文本判据）
//   G4 快照必须带 @page（否则页码与页边距丢失）

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildSnapshot } from "../../src/app/print/snapshot.js";

/** 剥注释。本仓已有四次「把注释当代码读」的教训。 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "");
}

function walkCss(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkCss(p, out);
    else if (e.name.endsWith(".css")) out.push(p);
  }
  return out;
}

/**
 * 允许保留 `@media print` 的文件，每个都要写明理由。
 *
 * 这两处是 z-print 之前的历史遗留。按新规矩它们该被接管，但删除前要实测 ——
 * （page-m-view 那条是给吸顶表单栏归位的；sticky 在打印里按理已失效，但没验证就不动。）
 */
const PRINT_CSS_ALLOW = new Map<string, string>([
  ["src/doc/document.css", "历史遗留：`@media print { :host { display: block } }` 冗余，待实测后删"],
  // 原文件 `page-m-view.css` 已按区块拆成 10 段，这条例外规则落在 state 段里
  // （`.zpm-form__bar` 的吸顶归位）。**白名单仍然具体到文件**：不改成前缀放行 ——
  // 前缀豁免等于给同一前缀下以后新增的每一段都发许可证。
  ["src/editor/page-m-view/page-m-view-state.css", "历史遗留：吸顶表单栏打印时归位，待 z-print 实测后删"],
]);

describe("打印守卫", () => {
  it("G1 组件不许自己写打印样式（打印只由 z-print 承接）", () => {
    const offenders: string[] = [];
    for (const f of walkCss("src")) {
      if (PRINT_CSS_ALLOW.has(f)) continue;
      if (/@media\s+print/.test(stripComments(fs.readFileSync(f, "utf8")))) offenders.push(f);
    }
    expect(
      offenders,
      "这些组件自己写了打印样式。打印由 <z-print> 统一接管：组件只管渲染，" +
        "z-print 在打印那一刻把渲染结果拍成快照排版。若确实需要例外，" +
        "加进 PRINT_CSS_ALLOW 并写明理由：",
    ).toEqual([]);
  });

  it("G2 z-print 不许认组件内部类名（通用规则只能按标签生效）", () => {
    const src = stripComments(fs.readFileSync("src/app/print/snapshot.ts", "utf8"));
    // 组件内部类名：`z-rpt__pager` / `z-dl__body` / `z-gantt__bar` 这类「域前缀 + 双下划线」
    const leaks = [...src.matchAll(/\b(?:z|m)-(?!print__)[a-z]+__[a-z-]+/g)].map((m) => m[0]);
    expect(
      [...new Set(leaks)],
      "快照样式里出现了组件内部类名。它只该认标签（table / thead / tr / button…）——" +
        "一旦认了 `z-rpt__pager`，就等于「打印逻辑又漏回组件了」，而且那个类名一改这里就静默失效：",
    ).toEqual([]);
  });

  it("G3 快照真的展开了 shadow 与 slot（内容不许丢）", () => {
    class XSnapshotProbe extends HTMLElement {
      static styles = ":host { display: block } .inner { color: red }";
      constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.shadowRoot!.innerHTML = `<div class="inner">影子<a href="#"><slot></slot></a></div>`;
      }
    }
    customElements.define("x-snapshot-probe", XSnapshotProbe);

    const host = document.createElement("div");
    host.innerHTML = `<x-snapshot-probe><b>槽内容</b></x-snapshot-probe>`;
    document.body.append(host);

    const snap = buildSnapshot(host, {
      header: "",
      footer: "",
      pageRule: "@page { margin: 1mm }",
      hideInteractive: true,
    });

    // ① shadow 里的结构进来了
    expect(snap.html, "shadow root 的内容没进快照").toContain('class="inner"');
    // ② slot 被真实内容替换
    expect(snap.html, "slot 没有被真实内容替换 —— 打印会缺字").not.toContain("<slot");
    expect(snap.html, "槽内容丢了").toContain("<b>槽内容</b>");
    // ③ 组件样式被收集且 :host 已改写
    expect(snap.html, "组件样式没被收集").toContain(".inner { color: red }");
    expect(snap.html, ":host 没改写成标签名 —— 扁平化后组件根样式会全丢").toContain(
      "x-snapshot-probe { display: block }",
    );

    host.remove();
  });

  it("G4 快照必须带 @page 的页眉与页码（页眉不走 DOM，走 margin box）", () => {
    const host = document.createElement("div");
    host.innerHTML = `<span>内容</span>`;
    document.body.append(host);
    const snap = buildSnapshot(host, {
      pageRule:
        '@page { margin: 22mm 12mm 20mm; @top-left { content: "报表" } @bottom-right { content: counter(page) } }',
      hideInteractive: true,
    });
    expect(snap.html, "缺 @top-left：页眉会丢（它只能由 margin box 画）").toContain("@top-left");
    expect(snap.html, "缺页码计数器").toContain("counter(page)");
    expect(snap.html, "不是一份完整文档").toContain("<!DOCTYPE html>");
    host.remove();
  });
});
