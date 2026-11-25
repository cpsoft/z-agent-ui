// 组件卡片渲染 —— 总览页、域页、首页「最近新增」共用一份。
// 卡片只认 `ComponentDef`：属性标签取 `properties[0..2]`，层徽标取 `layer`，
// 链接统一 `component.html?tag=`。

import type { ComponentDef } from "./manifest.js";
import { componentHref } from "./nav.js";

const LAYER_LABEL: Record<string, string> = {
  foundation: "L0",
  base: "L1",
  composite: "L2",
  page: "L3",
};

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]!);
}

/** 卡片上的三个属性标签：优先带取值域的那些（`values` 非空 = 枚举，最能说明问题）。 */
function topProps(c: ComponentDef, n = 3): string[] {
  const sorted = [...c.properties].sort((a, b) => {
    const av = a.values ? 1 : 0;
    const bv = b.values ? 1 : 0;
    return bv - av;
  });
  return sorted.slice(0, n).map((p) => p.name);
}

export function renderCards(host: HTMLElement | null, list: ComponentDef[]): void {
  if (!host) return;
  if (list.length === 0) {
    host.innerHTML = `<p class="demo-empty">这一域暂时没有组件 —— 清单里 source 前缀对不上？</p>`;
    return;
  }
  host.innerHTML = list
    .map(
      (c) => `<a class="comp-card" href="${componentHref(c.tag)}">
  <span class="comp-card__head"><b>${esc(c.tag)}</b><em>${LAYER_LABEL[c.layer] ?? c.layer}</em></span>
  <span class="comp-card__sum">${esc(c.summary || "未写摘要")}</span>
  <span class="comp-card__props">${topProps(c).map((p) => `<i>${esc(p)}</i>`).join("")}</span>
</a>`,
    )
    .join("");
}
