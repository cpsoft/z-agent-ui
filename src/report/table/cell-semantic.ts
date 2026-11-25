// 单元格语义类（is-badge / is-danger / zpg-progress）的样式字符串。
//
// [WHY 由本包导出字符串，而不是让消费方自己引 .css?raw] 表格在自己的 shadow root 里
// 渲染单元格，页面编辑器画布要把**同一份**规则拼进自己的 styles。若各自存一份 CSS，
// 两边靠人肉同步，迟早一边改了另一边没改 —— 表现是「编辑器里是胶囊、运行时是纯文本」。
// 包内导出字符串，消费方 import 即可，单一来源。
import css from "./cell-semantic.css?raw";

export const CELL_SEMANTIC_CSS = css;
