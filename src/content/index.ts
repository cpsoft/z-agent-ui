/**
 * 内容渲染域：**把一段内容变成可见的东西**。四个组件，各管一种内容形态。
 *
 *   markdown      源文本 → HTML（marked 走 optional peer，未安装时降级为纯文本）
 *   rich-text     富文本 HTML ↔ 编辑（execCommand，零依赖）
 *   json-viewer   任意 JSON → 可折叠树（复用 L1 的 tree）
 *   code-editor   源码 + 语言 → 高亮 + 行号 + 补全（textarea + overlay，零依赖）
 *
 * [WHY 从 `src/editor/content` 迁出来（2026-11-15）] 它原来挂在编辑器域下，但四个组件
 * **没有一个被编辑器用**（实测子域间边为 0）。它们被 demo、被宿主直接使用 ——
 * 「因为当初是给编辑器写的」不是归属理由。留在 editor 里的代价是可验证的：
 * `import "z-agent-ui/editor"` 会把 8 924 行的页面编辑器一起注册，而只要一个 markdown 的
 * 宿主只能去猜路径 `z-agent-ui/editor/content/markdown`。
 *
 * [WHY 需要域入口] 宿主做一屏「文档预览 + 源码查看」通常要两个以上。逐个引容易漏，
 * 而漏引的症状是**标签渲染成空元素、控制台不报错**。
 *
 * 分层：L2。依赖只有 L0 出口（core / primitives），不引 L1 控件以外的东西。
 */
import "./markdown/index.js";
import "./rich-text/index.js";
import "./json-viewer/index.js";
import "./code-editor/index.js";

export * from "./markdown/index.js";
export * from "./rich-text/index.js";
export * from "./json-viewer/index.js";
export * from "./code-editor/index.js";
