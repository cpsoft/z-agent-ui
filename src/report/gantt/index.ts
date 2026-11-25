// [WHY] 副作用注册 + 导出，同 flow/index.ts 惯例：import 即完成 customElements.define
import "./Gantt.js";

export { ZGantt } from "./Gantt.js";
export {
  DEFAULT_DAY_WIDTH,
  generateTimelineHeaderData,
} from "./timeline.js";
export {
  BAR_HEIGHT,
  REAL_HEIGHT,
  buildTree,
  computeTaskLayouts,
  dateToPixels,
  getVisibleRange,
  pixelsToDate,
} from "./layout.js";
export { DEFAULT_COLUMNS, listTotalWidth } from "./left-list.js";
// [WHY] 依赖箭头/自动排程/关键路径为可复用纯函数，随 lib entry 一并导出（计划 API 契约）
export { computeArrowPaths } from "./arrows.js";
export type { ArrowPath, BarGeometry } from "./arrows.js";
export { cascadeSchedule } from "./schedule.js";
export { computeCriticalPath, NEAR_CRITICAL_FLOAT } from "./critical-path.js";
export type { CriticalPathResult } from "./critical-path.js";
export * from "./types.js";
