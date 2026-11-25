// primitives 的出口：八个无 UI 的原语 + 四个状态控制器。
//
// [这份注释的作用：区分「没人用」和「不该用」] 2026-11-14 实测了各组件对这些导出的
// 采用情况。两者在维护上是两件事 —— 零采用的如果标清楚原因，下次有人要加浮层逻辑时
// 会先看这里，而不是再写第四份；没标清楚，就会有人以为「大概漏了」而重新实现一遍。
//
// ── 被 L1 / L2 采用 ──
//   roving（listIntent / gridIntent / resolveIndex / resolveCell / roveByKey / roveTo）  8 个组件
//       键盘游标：按键 → 意图 → 坐标/下标 → 落点。四层，用哪层取哪层。
//       · 二维网格 + roving tabindex：z-table、z-report-table（表头行与单元格）
//       · 一维 + roving tabindex：z-tree（节点间）、z-rich-text（工具条）
//       · 一维 + activedescendant（焦点在容器上，只有高亮在动）：z-menu、z-select
//       · 一维 + 「移动即选中」：z-radio-group、z-app-switcher
//       只抽「怎么移动」，不抽「谁是候选集」——树的可见节点序、表格的二维网格、
//       菜单与下拉的禁用规则是各控件的领域规则，见 roving/roving.ts 顶部。
//       2026-11-16 之前这八份各写一遍，其中三份的「当前项算法」是错的（恒取第一项）。
//   FloatingPosition          5 个组件   浮层定位（12 种 placement + 自动翻转）
//   FloatingPanelController   7 个       面板生命周期（创建 → 定位 → 外部点击 → 退场）
//   FocusTrap                 4 个       对话框焦点圈定
//   DialogStateController     2 个       modal / drawer 的状态机（原先 Drawer 抄了 Modal）
//   overlayManager            2 个       栈 + Esc + 滚动锁
//   afterAnimation            5 个       「这段动效演完了」（2026-11-20，issue IKWNJN）
//       退场 animationend / 高度 transitionend 都走它。此前五处各写一遍，
//       其中四处漏了 L0 自己记过的「校验 target」结论，也没有兜底。
//   CollapseTween             3 个       高度三态 from → to → auto（含那次强制回流与
//       `_prevOpen`/`_closeHeight` 那套状态机）。tree-node 带 opacity 双属性，只用 afterAnimation。
//   LongPressController       2 个       触屏上的「右键」（2026-11-20，issue IKWNJO）。
//       此前 gantt 用欧氏距离 8px/500ms、MCard 用矩形 10px/800ms —— 斜着挪时结论不同。
//       统一的是判定语义（欧氏 / pointercancel / 吃掉原生 contextmenu），不是那个数字。
//   wheelZoomIntent          2 个       「这一下滚轮是缩放还是滚页面」（2026-11-20，issue IKWNJP）。
//       此前 z-flow 普通滚轮即缩放并 preventDefault、z-gantt 要 Ctrl/⌘+滚轮 —— 同一个手势
//       换个控件意思就变了，而两边各自的用例都是绿的。统一的是手势语义，不是缩放幅度
//       （画布连续、甘特按档），见 wheel-zoom/wheelZoom.ts 顶部。
//   PointerDragSession       3 个       指针拖拽的「手势层」（2026-11-20，issue IKWNJL）。
//       此前起手判定各写各的：阈值 2 / 3 / 4 三种手感，user-select 的设置与还原不在同一处，
//       拖动后那次 click 有的吞有的忘（症状是"拖一行顺手打开一次详情"）。
//       原语只回答「算不算拖、位移多少、松手算拖还是算点」；**落点仍归各控件**
//       （栅格第几行、时间轴第几天、列的新下标）—— 那是领域知识，收上来只会变成
//       一个大而无当的 PanZoomController。同 long-press：统一判定语义，不统一量纲。
//
// ── 零采用，保留为公开原语 ──
//   ZPortal / ZPosition
//     元素式 API（`<z-portal>` / `<z-position>`）。组件统一走 FloatingPosition 类。
//     另有明确决定：modal **不用** ZPortal —— slot 元素移出 shadow tree 会失去分配、
//     移出节点丢失 shadow 样式，所以 modal 采用「宿主整体重挂载」（REQ-011 / findings F3）。
//     这两个不提供 React 包装，理由与白名单在 tests/unit/react-wrapper-coverage.test.ts。
//
//   ClickOutside
//     它用 `element.contains(target)` 判内外，而 slot 分配进来的节点**不是 DOM 后代** ——
//     于是 Menu / ColumnSelector / ReportTable / gantt 各自写了一套「按 slot 属性判定」
//     的关闭逻辑。要用它得先让它认得 slot（改判据属于新功能，不在整理范围）。
export { ZPortal } from "./portal/Portal.js";
export { ZPosition, FloatingPosition } from "./position/index.js";
export type { Placement, PositionOptions } from "./position/index.js";
export { FocusTrap } from "./focus-trap/index.js";
export type { FocusTrapOptions } from "./focus-trap/index.js";
export { ClickOutside } from "./click-outside/index.js";
export type { ClickOutsideOptions } from "./click-outside/index.js";
export { pushOverlay, removeOverlay, lockScroll, unlockScroll } from "./overlay/overlayManager.js";
export type { ZOverlayLike } from "./overlay/overlayManager.js";
export { FloatingPanelController } from "./overlay/floatingPanel.js";
export type { FloatingPanelOpenOptions } from "./overlay/floatingPanel.js";
export { DialogStateController } from "./overlay/dialogState.js";
export type { DialogHost, DialogStateOptions } from "./overlay/dialogState.js";

export { afterAnimation, onAnimationEnd, forceReflow, CollapseTween } from "./after-animation/index.js";
export type {
  AfterAnimationOptions,
  AnimationKind,
  CollapseTweenOptions,
} from "./after-animation/index.js";

export {
  LongPressController,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE,
} from "./long-press/index.js";
export type { LongPressOptions } from "./long-press/index.js";

export { wheelZoomIntent } from "./wheel-zoom/index.js";
export type { WheelZoomIntent } from "./wheel-zoom/index.js";

export { PointerDragSession, DRAG_THRESHOLD } from "./pointer-drag/index.js";
export type {
  PointerDragDelta,
  PointerDragOptions,
  PointerDragHandlers,
} from "./pointer-drag/index.js";

export { startEdgeScroll, EDGE_SCROLL_RANGE, EDGE_SCROLL_STEP } from "./edge-scroll/index.js";
export type { EdgeScrollOptions } from "./edge-scroll/index.js";

export {
  gridIntent,
  listIntent,
  resolveCell,
  resolveIndex,
  roveByKey,
  roveTo,
  sameCell,
} from "./roving/index.js";
export type {
  AxisMotion,
  CellPos,
  GridBounds,
  GridIntent,
  ListIntent,
  RoveAxis,
} from "./roving/index.js";
