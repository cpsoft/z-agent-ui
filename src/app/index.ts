/**
 * 应用外壳域：把控件拼成「一个能跑的后台页面」所需的四件东西。
 *
 *   app-shell     侧栏 + 顶栏 + 内容区的骨架
 *   app-switcher  应用切换器（多产品共用一个壳时用）
 *   app-nav       侧栏导航（吃「有哪些页面」，出分组菜单 + 选中态 + 折叠，[[REQ-040-app-nav]]）
 *   login         登录页
 *   detail-form   详情页（字段名 + 只读值 + 分组的排版）
 *   print         打印容器（页眉页脚每页重复 + 页码 + 打印动作）
 *
 * [WHY 单独成域而不留在 components] 这四个都**不是控件**：它们的属性里有 `menu` /
 * `fields` / `appId` 这种「一屏数据」，而不是 `size` / `disabled` 这种「一个控件状态」。
 * 混在 components 里会让人以为「控件也接受 menu 数组」，而 z-input 的邻居是
 * 一个 320 行的应用外壳，这件事本身就让「扫一眼 components 就知道有哪些控件」失效。
 *
 * [WHY 仍然给一个域入口] 宿主搭后台几乎必然四个都要，逐个引容易漏 login（症状是
 * 登录页渲染成空白 div，而控制台只在 undefined 时才报错）。
 */
import "./app-shell/index.js";
import "./app-switcher/index.js";
import "./login/index.js";
import "./detail-form/index.js";
import "./print/index.js";
import "./app-nav/index.js";

export * from "./app-shell/index.js";
export * from "./app-switcher/index.js";
export * from "./login/index.js";
export * from "./detail-form/index.js";
export * from "./print/index.js";
export * from "./app-nav/index.js";
