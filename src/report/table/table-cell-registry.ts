import type { ReportColumn } from "./report-table-types.js";

export type TableCellRenderer = (
  value: unknown,
  row: Record<string, unknown>,
  index: number,
  col: ReportColumn,
) => string;

const cellRegistry = new Map<string, TableCellRenderer>();

/**
 * 注册（或覆写）一种 `<z-report-table>` 命名单元格渲染器。
 *
 * 与 `registerChartGeometry` 同构：外部业务方可通过 `col.cellRenderer = "badge"` 等
 * 声明式引用已注册的渲染器，无需在每份列定义里手写重复的 `render` 闭包。
 */
export function registerTableCellRenderer(name: string, renderer: TableCellRenderer): void {
  cellRegistry.set(name, renderer);
}

/** 注销已注册的命名单元格渲染器。 */
export function unregisterTableCellRenderer(name: string): boolean {
  return cellRegistry.delete(name);
}

/** 查询已注册的命名单元格渲染器。 */
export function getTableCellRenderer(name: string): TableCellRenderer | undefined {
  return cellRegistry.get(name);
}

/** 列出当前已注册的全部命名单元格渲染器。 */
export function listTableCellRenderers(): string[] {
  return Array.from(cellRegistry.keys());
}

/** 按优先级解析列内容：`col.render` > 已注册 `col.cellRenderer` > null（由调用方退回转义文本）。 */
export function resolveCellRendererHtml(
  col: ReportColumn,
  value: unknown,
  row: Record<string, unknown>,
  index: number,
): string | null {
  if (col.render) return col.render(value, row, index);
  if (col.cellRenderer) {
    const fn = cellRegistry.get(col.cellRenderer);
    if (fn) return fn(value, row, index, col);
  }
  return null;
}
