// core 的**对外面**：`z-agent-ui` 主入口导出的全部内容，一个符号都不多。
//
// [WHY 从 core/index.ts 拆出来] 2026-11-14 第二轮核查的遗留（D-L0-3）：
// `core/index.ts` 同时承担两个角色 —— 「包的对外面」与「L0 内部的取符号出口」。
// 两者共用一份清单的直接后果是 **L0 内部工具永远进不了出口**：
// `cleanFloat` 是 `page/data/dataset.ts` 与 `report/core/report-group.ts` 要用的，
// 但它一旦写进 core/index.ts 就等于向外界承诺了一个新符号（`l0-exports` 会红）。
// 于是那两个文件只能深引 `core/number.js` —— 正是这次改造要消灭的形态。
//
// 拆开之后职责单一：
//   · `public.ts`（本文件）= 对外承诺。加一行 = 发版说明里要有；由 l0-exports 钉死。
//   · `index.ts`（同目录）  = 内部出口。可以随 L0 内部重构自由增删，不惊动外界。
//   · `src/index.ts` 只转发本文件，不再 `export *` 整个 core。
//
// [注意 `./core/*` 仍是公开路径] package.json 里有 `"./core/*"` 映射，所以
// `z-agent-ui/core/number` 这类深引对宿主是可用的 —— 本文件管的是**主入口**的承诺，
// 不是「core 里所有导出」。两者不是一个集合，改这里不要以为改了全部。

// 基类与属性装饰器：所有组件的起点
export { BaseElement, type UpdateContext } from "./BaseElement.js";
export { property } from "./decorators.js";

// 模板与转义：组件拼 HTML 的唯一入口（自写转义会绕过这里的引号处理）
export { html, safeHtml, unsafeHTML, escapeHtml, escapeAttr, type RawHtml } from "./template.js";

// 净化：markdown 与富文本回填
export { sanitizeHtml, type SanitizeOptions } from "./sanitize.js";

// 公共词汇表：tone / appearance / size 的取值域（vocabulary-guard 的判据来源）
export {
  TONES,
  APPEARANCES,
  SIZES,
  TONE_ALIASES,
  governedDimension,
  type Tone,
  type Appearance,
  type Size,
} from "./vocabulary.js";

// 模板字面量 helper
// [注意] 运行侧零使用（只有 css.test.ts 与主入口引用）。保留是因为它已是对外导出，
// 删除属于破坏性改动；待裁定后再决定去留。
export { css } from "./css.js";

// 全局样式注入：10 个浮层组件的统一入口（替代各自 `let styleInjected`）
export { injectGlobalStyles } from "./styleInjection.js";

// 国际化与格式化：默认中文（zh-CN），支持运行时切换任意语言包
export {
  DEFAULT_LOCALE,
  getLocale,
  hasMessage,
  onLocaleChange,
  registerMessages,
  setLocale,
  t,
  type MessageParams,
  type Messages,
} from "./i18n.js";
export type { MessageKey } from "./locales/zh-CN.js";
export { fmt, getDateTimeFormat, getNumberFormat } from "./format.js";
