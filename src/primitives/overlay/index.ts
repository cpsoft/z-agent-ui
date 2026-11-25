// [WHY] 与其余 primitives 子目录保持一致的 barrel: package.json exports 的
// ./primitives/* 映射到 dist/primitives/<name>.js 与 dist/types/primitives/<name>/index.d.ts,
// overlay 原只有 overlayManager.ts 无 index 入口, 两者都无法解析。
// [2026-09-24] night-hawk: 补齐 npm 发布所需的子路径入口
export { pushOverlay, removeOverlay, lockScroll, unlockScroll } from "./overlayManager.js";
export type { ZOverlayLike } from "./overlayManager.js";
export { FloatingPanelController } from "./floatingPanel.js";
export type { FloatingPanelOpenOptions } from "./floatingPanel.js";
// [WHY] 2026-10-25 系统审计：Modal/Drawer 共用的对话框状态机，作为原语对外暴露，
// 第三方自建对话框可复用同一套栈/滚动锁/退场动画语义。
export { DialogStateController } from "./dialogState.js";
export type { DialogHost, DialogStateOptions } from "./dialogState.js";
