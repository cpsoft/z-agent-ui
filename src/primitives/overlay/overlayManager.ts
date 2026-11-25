// [WHY] overlay 公共原语 [[2026-08-11-W13-form-basics]]: 多模态/抽屉/命令面板
// 共享的模块级栈 + Esc 处理 + 滚动锁。从 Modal.ts 抽取，行为逐行等价
// ([[2026-08-11-W10-modal-framework]]); 首个入栈挂 Esc 监听、末个出栈摘除。
export interface ZOverlayLike {
  close(): void;
  closeOnEscape: boolean;
}

const stack: ZOverlayLike[] = [];
let _scrollLockCount = 0;
let _prevOverflow = "";

function onDocumentKeyDown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  const top = stack[stack.length - 1];
  if (top && top.closeOnEscape) top.close();
}

/** 入栈，返回栈索引（供 z-index 层级用）。首个入栈时挂文档 Esc 监听。 */
export function pushOverlay(o: ZOverlayLike): number {
  stack.push(o);
  if (stack.length === 1) document.addEventListener("keydown", onDocumentKeyDown);
  return stack.length - 1;
}

/** 出栈；末个出栈时摘文档 Esc 监听。 */
export function removeOverlay(o: ZOverlayLike): void {
  const idx = stack.indexOf(o);
  if (idx < 0) return;
  stack.splice(idx, 1);
  if (stack.length === 0) document.removeEventListener("keydown", onDocumentKeyDown);
}

/** 滚动锁计数：首个加锁存 overflow，末个解锁还原。 */
export function lockScroll(): void {
  if (_scrollLockCount === 0) {
    _prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  _scrollLockCount++;
}

/**
 * 解锁。计数归零才还原 `overflow`。
 *
 * [WHY 未加锁时直接返回，而不是「压到 0 再还原一次」] 这里原本是无条件执行
 * `_prevOverflow` 回写。于是**一次不配对的 unlock**（组件早退路径、宿主直接 remove、
 * 同一个弹窗的 disconnect 与 close 各调一次）会在计数已经是 0 时把
 * `body.style.overflow` 改写成上次记录的旧值 —— 既可能把页面滚回「不能滚」，
 * 也可能把**别人**（另一个浮层库、业务代码）刚设的 `overflow` 抹掉。
 * 计数锁的语义是「加过才解」，不加就不该有副作用。
 */
export function unlockScroll(): void {
  if (_scrollLockCount === 0) return;
  _scrollLockCount--;
  if (_scrollLockCount === 0) {
    document.body.style.overflow = _prevOverflow;
    _prevOverflow = "";
  }
}
