// [WHY 把 z-option 一起引进来 2026-10-27] `Select.ts` 只 `import type` 了 ZOption ——
// 类型擦除后没有任何东西注册它。宿主单独 import `z-agent-ui/select` 时，`<z-option>` 是
// **未升级的空标签**：文字还在，`value` / `label` 全是 undefined，于是
//   · 选中项回显不出来（`value="on"` 匹配不到任何选项，控件停在占位符）
//   · 下拉里点任何一项都拿到空值
// 同一个坑 `data-list` / `detail-form` 早就各自绕过了（它们都显式 import 了 Option.js），
// 根上补一次比每个宿主记得引一次可靠。
import "../option/Option.js";
import "./Select.js";
export { ZSelect, type ZSelectOptionSpec, type ZSelectSearchMode } from "./Select.js";
