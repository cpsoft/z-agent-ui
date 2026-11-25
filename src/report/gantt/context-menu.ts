// [WHY] 2026-11-23：原 103 行自制菜单（createElement + appendChild(body) + 内联样式 +
// `role="menu"` 但无键盘/无焦点管理）收归 `z-context-menu`。该组件的面板样式与键盘导航
// 与 `z-menu` 共用 `menu-panel.ts`，所以甘特这一份不再自成一套。
// 本文件只剩「甘特怎么用菜单」的适配：一个模块级实例 + 回调转接，不再有 DOM 与样式。
// See: wiki/reference/component-implementation-standard.md（浮层必须走 FloatingPanelController）
// [WHY 这里是副作用 import] 下面 `createElement("z-context-menu")` 只有在组件模块被加载过
// 才会升级成自定义元素；只写 `import type` 会被 TS 擦除，运行时拿到的是裸 HTMLElement，
// 表现为 `el.showAt is not a function` —— 而且不报未定义元素，很安静。
import "../../components/context-menu/index.js";
import type { ZContextMenu, ContextMenuItem } from "../../components/context-menu/index.js";

/** 甘特菜单项：形状沿用 `key / label / danger`，即 `z-context-menu` 的选项类型。 */
export type GanttMenuAction = ContextMenuItem;

let host: ZContextMenu | null = null;
let pickHandler: ((key: string) => void) | null = null;

function ensureHost(): ZContextMenu {
  if (host) return host;
  const el = document.createElement("z-context-menu") as ZContextMenu;
  // 监听只装一次：每次打开只换 pickHandler，避免重复绑定导致「点一次触发两次」
  el.addEventListener("z-pick", (e: Event) => {
    pickHandler?.((e as CustomEvent<{ key: string }>).detail.key);
  });
  document.body.appendChild(el);
  host = el;
  return el;
}

/** 在屏幕坐标处打开菜单。空菜单直接返回（不弹一个点不掉的面板）。 */
export function openContextMenu(opts: {
  x: number;
  y: number;
  actions: GanttMenuAction[];
  onPick: (key: string) => void;
}): void {
  if (!opts.actions.length) return;
  const el = ensureHost();
  pickHandler = opts.onPick;
  el.items = opts.actions;
  el.showAt(opts.x, opts.y);
}

export function closeContextMenu(): void {
  host?.hide();
}
