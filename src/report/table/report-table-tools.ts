// 工具栏列选择器的承载与同步。
//
// [WHY 必须住在 light DOM] 勾一列会 toggleColumn → 表格 requestUpdate →
// `shadow.innerHTML` 整块重建。选择器若写在 shadow 模板里，它连同下拉一起被销毁重建：
// 内部滚动位置回到顶部、入场动画重播、定位器重算 —— 用户看到的是「每选一次跳一下」
// （2026-11-25 反馈）。light DOM 子节点不参与 shadow 重建，实例、滚动位置、开合状态
// 原样保留，只靠表头里的 `<slot name="tools">` 重新分配位置。
//
// [WHY 单独一个文件] 「创建 + 挂 slot + 绑事件 + 同步文案/开合」是一小组配套逻辑，
// 留在元素壳里会与主渲染逻辑混在一起，也会把那个文件推过行数红线。

import type { ZColumnSelector } from "../column-selector/ColumnSelector.js";

/** 从表格读、往选择器写的那几个字段。 */
export interface ToolsSelectorHost {
  columnsText: string;
  requiredColumnText: string;
  reorderColumnText: string;
  columnSelectorOpen: boolean;
  showColumnSelector: boolean;
}

/**
 * 取回（或首次创建）工具栏选择器，并挂到宿主自己的 light DOM 上。
 *
 * @param onOpen 开合事件回调（宿主用它把 `open` 镜像到 `columnSelectorOpen`）
 */
export function ensureToolsSelector(
  host: HTMLElement & ToolsSelectorHost,
  current: ZColumnSelector | null,
  onOpen: (e: Event) => void,
): ZColumnSelector {
  if (current?.isConnected) return current;
  const el = document.createElement("z-column-selector") as ZColumnSelector;
  el.setAttribute("slot", "tools");
  el.addEventListener("z-column-selector-open", onOpen);
  el.addEventListener("z-column-selector-close", onOpen);
  host.appendChild(el);
  syncToolsSelector(el, host);
  return el;
}

/** 文案与开合状态同步（属性 setter 同值即返回，重复调用无成本）。 */
export function syncToolsSelector(el: ZColumnSelector | null, host: ToolsSelectorHost): void {
  if (!el) return;
  el.columnsText = host.columnsText;
  el.requiredColumnText = host.requiredColumnText;
  el.reorderText = host.reorderColumnText;
  // 工具栏关掉时不留一个还能被 Escape / 脚本打开的下拉
  el.open = host.showColumnSelector ? host.columnSelectorOpen : false;
}
