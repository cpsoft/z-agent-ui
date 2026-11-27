// <z-report-table> 大表行虚拟滚动（固定行高窗口切片 + 上下占位行）。
//
// [WHY 独立成模块] 保持 ReportTable.ts 行数不越线，同时让窗口计算可纯函数单测。
// 仅在 `virtual` 为 true 且数据行数大于可见窗口时生效，不影响既有平表/分组表行为。

import type { ViewRow } from "./table-view-rows.js";
import { renderBodyRows, type RowRenderContext } from "./table-render.js";

export interface VirtualWindow {
  start: number;
  end: number;
  topHeight: number;
  bottomHeight: number;
}

const DEFAULT_VIEWPORT_HEIGHT = 400;
const DEFAULT_OVERSCAN = 8;

/** 计算当前滚动位置对应的可见行区间与上下占位高度。 */
export function computeVirtualWindow(
  total: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  overscan: number = DEFAULT_OVERSCAN,
): VirtualWindow {
  const rh = Math.max(16, Math.trunc(rowHeight) || 36);
  const vh = viewportHeight > 0 ? viewportHeight : DEFAULT_VIEWPORT_HEIGHT;
  if (total <= 0) return { start: 0, end: 0, topHeight: 0, bottomHeight: 0 };

  const visibleCount = Math.ceil(vh / rh);
  const firstVisible = Math.max(0, Math.floor(Math.max(0, scrollTop) / rh));
  const start = Math.max(0, firstVisible - overscan);
  const end = Math.min(total, firstVisible + visibleCount + overscan);
  return {
    start,
    end,
    topHeight: start * rh,
    bottomHeight: Math.max(0, (total - end) * rh),
  };
}

/** 渲染虚拟滚动表体：顶部占位行 + 可见区间行 + 底部占位行。 */
export function renderVirtualBodyRows(
  rows: ViewRow[],
  rowCtx: RowRenderContext,
  totalCols: number,
  win: VirtualWindow,
): string {
  const slice = rows.slice(win.start, win.end);
  const top =
    win.topHeight > 0
      ? `<tr class="z-rpt__vspacer" aria-hidden="true"><td colspan="${totalCols}" style="height:${win.topHeight}px;padding:0;border:0"></td></tr>`
      : "";
  const bottom =
    win.bottomHeight > 0
      ? `<tr class="z-rpt__vspacer" aria-hidden="true"><td colspan="${totalCols}" style="height:${win.bottomHeight}px;padding:0;border:0"></td></tr>`
      : "";
  return top + renderBodyRows(slice, rowCtx) + bottom;
}

/** 从 maxHeight 字符串（如 "400px"）解析兜底视口高度，用于首帧或无布局引擎（happy-dom）时。 */
export function parseViewportFallback(maxHeight: string): number {
  const m = /^(\d+(?:\.\d+)?)px$/i.exec(String(maxHeight ?? "").trim());
  return m ? Number(m[1]) : DEFAULT_VIEWPORT_HEIGHT;
}

export interface VirtualState {
  scrollTop: number;
  viewportH: number;
  start: number;
  end: number;
}

/** 根据当前滚动状态渲染完整表体或虚拟切片，并记录最新窗口边界。 */
export function renderTableBody(
  rows: ViewRow[],
  rowCtx: RowRenderContext,
  totalCols: number,
  virtual: boolean,
  rowHeight: number,
  maxHeight: string,
  state: VirtualState,
): string {
  if (!virtual) return renderBodyRows(rows, rowCtx);
  const vh = state.viewportH > 0 ? state.viewportH : parseViewportFallback(maxHeight);
  const win = computeVirtualWindow(rows.length, state.scrollTop, vh, rowHeight);
  state.start = win.start;
  state.end = win.end;
  return renderVirtualBodyRows(rows, rowCtx, totalCols, win);
}

/** 滚动时检测虚拟窗口是否变化；若变化则更新 state 并返回 true 触发重绘。 */
export function handleVirtualScroll(
  wrapper: HTMLElement,
  totalRows: number,
  rowHeight: number,
  maxHeight: string,
  state: VirtualState,
): boolean {
  const top = wrapper.scrollTop;
  const vh = wrapper.clientHeight > 0 ? wrapper.clientHeight : parseViewportFallback(maxHeight);
  const next = computeVirtualWindow(totalRows, top, vh, rowHeight);
  state.scrollTop = top;
  state.viewportH = vh;
  return next.start !== state.start || next.end !== state.end;
}
