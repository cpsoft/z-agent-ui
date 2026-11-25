/**
 * 属性布局域：**「标签 + 控件」的三种粒度**，用来把一屏字段排整齐。
 *
 *   z-property-panel  多列多组的容器（收 `columns` 数组）
 *   z-property-group  一组字段（标题 + 内容）
 *   z-property-row    一行字段（标签 + 控件）
 *
 * [WHY 从 `src/editor/inspector` 迁出来（2026-11-15）] 名字里的 `inspector`（检视器）
 * 是编辑器右栏的叫法，但真实使用方是 **`z-detail-form`**（详情页的字段排版）与宿主
 * 自己搭的表单页 —— 它们跟编辑器没有关系。留在 inspector 下有两个后果：
 *   ① `z-agent-ui/detail-form` 的实现要引 `editor/inspector/property-*`，L2 的 app 域
 *      路径上依赖了 L3 的编辑器域；
 *   ② 使用方要「属性面板」得先知道它属于编辑器。
 *
 * [WHY 三个都要] 它们不是可替换的三种风格，是三个粒度：一屏 / 一组 / 一行。
 * 只用其中一个的宿主会发现「组内标题」「跨整行」这两件事没有别的控件能表达。
 *
 * 分层：L2。只依赖 L0 出口。
 */
import "./panel/index.js";
import "./group/index.js";
import "./row/index.js";

export * from "./panel/index.js";
export * from "./group/index.js";
export * from "./row/index.js";
