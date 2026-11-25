// [WHY 这一行看着像「给 theme 入口带样式」，其实不是] 2026-11-14 实测产物：
// `dist/theme.js` 顶部是 `/* empty css */` —— 构建把 CSS 抽到 `dist/z-agent-ui.css`（14.9KB，
// 含 token 与全部组件样式），JS 侧只剩一句空注释。也就是说：
//   · 走 `import "z-agent-ui/theme"` 的消费方，拿到 token 靠的是 `ThemeController.init()` 里的
//     `?raw` 注入，不是这一行；
//   · 这一行唯一的作用是**让 tokens.css 进入那份聚合 CSS**，供 `@import "z-agent-ui/z-agent-ui.css"`
//     的消费方使用。删掉它，显式引入 CSS 的人就只剩组件样式、没有令牌。
// 所以它不能当「无用副作用 import」清理掉（[[bug-20260810-external-css-tokens]] 修复第 2 条）。
import "./tokens.css";
export { ThemeController, themeController } from "./ThemeController.js";
export type { Theme } from "./ThemeController.js";
