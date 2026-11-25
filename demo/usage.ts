// 组件详情页的「可复制用法片段」—— 从清单 + package.json 现算，不手写。
// 入口从 `package.json` 的 exports 推导 + 校验（`isExportable`），事件名从清单里读。

import type { ComponentDef } from "./manifest.js";
import pkg from "../package.json";

const EXPORT_KEYS = Object.keys(pkg.exports as Record<string, unknown>);

/** 样式入口。组件的观感（间距 / 描边 / 密度）全在令牌里，漏了它组件「渲染得出来但没样式」。 */
export const STYLE_ENTRY = "z-agent-ui/z-agent-ui.css";

/**
 * 该组件应该从哪个入口引入。
 *
 * [判据] `src/components/<控件目录>/` 每个目录都有自己的 barrel（81/81 实测都有 index.ts），
 * 所以按目录引 —— 一个页面只用两三个控件时不该把 82 个全拉进来。
 * 其余域（report / doc / content / property / app / flow / editor）引**域入口**：
 * 域内部的文件布局是随时会变的实现细节，只有域 barrel 是承诺。
 */
export function entryOf(c: ComponentDef): string {
  const parts = c.source.split("/");
  const domain = parts[1];
  if (domain === "components" && parts[2]) return `z-agent-ui/components/${parts[2]}`;
  return `z-agent-ui/${domain}`;
}

/**
 * 入口是不是包真的承诺了。精确键或通配键（`./components/*`）覆盖都算。
 *
 * 推导结果要与 package.json 的 exports 核对：两者会不一致（新域忘了加 exports、目录改名），
 * 不一致时页面要说出来，而不是给出一个复制过去会报错的片段。
 * 守卫 `tests/unit/demo-usage.test.ts` 对 118 个组件全量跑。
 */
export function isExportable(entry: string): boolean {
  if (!entry.startsWith("z-agent-ui")) return false;
  const sub = "." + entry.slice("z-agent-ui".length); // z-agent-ui/components/input → ./components/input
  return EXPORT_KEYS.some((k) => k === sub || (k.endsWith("/*") && sub.startsWith(k.slice(0, -1))));
}

/**
 * 片段里挂哪个事件。
 *
 * 不能直接取清单里第一个：清单按源码登记顺序排，`z-input` 的第一个是 `z-blur`，
 * 片段就会教「监听失焦」。这里给一条**优先级**：有「值变了」就挂「值变了」，否则退回第一个。
 * `z-change` / `z-input` 是本库统一的取值出口，其余（`z-blur` / `z-focus` / `z-open`）是补充信号。
 */
const PREFERRED_EVENTS = ["z-change", "z-input", "z-value-change"];

function snippetEvent(c: ComponentDef): string {
  const names = c.events.map((e) => (typeof e === "string" ? e : e.name));
  return PREFERRED_EVENTS.find((p) => names.includes(p)) ?? names[0] ?? "";
}

/**
 * 最小可运行片段。
 *
 * 三段顺序：**标签在前、脚本在后** —— 先看「用起来长什么样」，再看「怎么让它跑起来」。
 * 脚本必须是 `<script type="module">`：custom element 走模块，放进普通 `<script>` 时
 * `import` 直接语法错误。
 */
export function usageSnippet(c: ComponentDef): string {
  const entry = entryOf(c);
  const ev = snippetEvent(c);

  // 摘要的第一句不一定是「这是什么」—— `z-markdown` 的摘要
  // 是 `实测 <img src=x onerror=alert(1)>、<script>… 全部原样进 DOM 执行`（它来自源码里
  // 的 注释）。把它塞进 `<!-- -->`：① 读起来莫名其妙；② 摘要里一旦出现 `--`，
  // 注释会提前闭合、标签变成正文。摘要在页头已经展示过了，片段里只要**能跑的最小代码**。
  const lines = [`<${c.tag}></${c.tag}>`, "", '<script type="module">'];
  lines.push(`  import "${STYLE_ENTRY}";  // 令牌与基础样式`);
  if (isExportable(entry)) {
    // 中文是双宽字符，按字符数补空格只会让两行注释看起来更歪
    lines.push(`  import "${entry}";  // 注册 <${c.tag}>`);
  } else {
    lines.push(`  // ⚠ 入口 ${entry} 不在 package.json 的 exports 里 —— 这一段先不要照抄`);
  }
  if (ev) {
    lines.push("");
    lines.push(`  document.querySelector("${c.tag}")`);
    lines.push(`    .addEventListener("${ev}", (e) => console.log(e.detail));`);
  }
  lines.push("</script>");
  return lines.join("\n");
}
