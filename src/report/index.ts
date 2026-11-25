/**
 * 报表域的**一次引全**入口。
 *
 * [WHY 需要这个文件] 拆域之前，宿主想要「表格 + 图表 + 甘特 + 数据列表」得写四行
 * `import "z-agent-ui/components/xxx"`，漏一行就是「组件没注册、标签渲染成空元素」——
 * 而浏览器对未注册的自定义元素**不报错**，只是把它当 inline 元素渲染，页面上看起来
 * 像是样式没加载。四行 import 记不全这件事，不该由宿主承担。
 *
 * 现在 `import "z-agent-ui/report"` 一次注册全部报表组件；想只要一个仍走子路径
 * （`z-agent-ui/report/chart` / `z-agent-ui/report/table` …）。
 *
 * [WHY **不** re-export `./core`] `report/core` 是零 DOM 依赖的纯 TS 内核（列格式、
 * 分组聚合、表达式求值），只想要「算个合计」的宿主不该因此拖进 4 个 Web Component。
 * 它有自己的入口 `z-agent-ui/report/core`。
 */
import "./elements/index.js";
import "./chart/index.js";
import "./gantt/index.js";
import "./table/index.js";
import "./data-list/index.js";

export * from "./elements/index.js";
export * from "./chart/index.js";
export * from "./gantt/index.js";
export * from "./table/index.js";
export * from "./data-list/index.js";
