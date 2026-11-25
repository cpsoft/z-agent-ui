// 报表内核：类型 + 纯计算。**零框架依赖**（不引 lit、不引 react、不碰 DOM 事件）。
//
// [WHY 单独一层] 报表的「配置形状」「怎么聚合」「怎么排版」是跨宿主的公共契约：
// zEtl（React）与 zWorker（Vue）产生的配置必须能被同一套渲染逻辑解释。把这层做成
// 无框架的纯 TS，两条路都成立：
//   1. npm 按需引 —— `import { cardKind } from "z-agent-ui/report/core/report-card"`
//   2. 源码 copy-in —— 直接把本目录文件拷进业务项目（见 registry/report-core.json）
//
// [WHY 不做成一个大 barrel 就完事] 内部文件保留 `report-*` 前缀的历史命名，因为
// 27 个既有测试与 20 多处组件 import 都指着这些路径；改名只能换来大面积 diff，
// 换不到行为收益。**对外请用子路径按需引**，不要从这里整体取 —— 那样会把表达式
// 引擎（约 1150 行）一起拖进只想要一个布局计算的页面。
export * from "./types.js";
export * from "./cell-spec.js";
export * from "./data-source.js";
export * from "./column-label.js";
export * from "./report-card.js";
export * from "./report-kpi.js";
export * from "./report-grid.js";
export * from "./report-layout.js";
export * from "./report-container.js";
export * from "./report-filter-card.js";
export * from "./report-switch.js";
export * from "./report-chart-style.js";
export * from "./report-axis.js";
export * from "./report-date.js";
export * from "./report-text.js";
export * from "./report-image.js";
export * from "./report-funcs.js";
export * from "./report-query.js";
export * from "./report-columns.js";
export * from "./report-table-columns.js";
export * from "./report-group.js";
export * from "./report-export.js";
export * from "./exploration.js";
