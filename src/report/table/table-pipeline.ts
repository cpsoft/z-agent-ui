import type { GroupSpec } from "../core/report-group.js";
import type { SortEntry } from "./report-table-types.js";
import { sortRows } from "./table-render.js";
import {
  dataViewRows,
  groupViewRows,
  paginateViewRows,
  type PagedView,
  type ViewRow,
} from "./table-view-rows.js";

export interface TablePipelineInput {
  data: Record<string, unknown>[];
  sortState: SortEntry[];
  sortMode: "client" | "server";
  rowKey: string;
  group: GroupSpec | null;
  collapsed: ReadonlySet<string>;
  pageSize: number;
  page: number;
  pageMode: "client" | "server";
  totalRecords: number;
}

export interface TablePipelineResult {
  sortedRows: Record<string, unknown>[];
  viewRows: ViewRow[];
  paged: PagedView;
}

/**
 * 表格单向数据管道：
 * `data -> sortRows -> viewRows (平表或分组小计) -> paginateViewRows -> server 分页覆写`。
 *
 * 保持纯函数与零 DOM 依赖，供渲染、CSV 导出（`renderRows()`）与单测共享同一真源。
 */
export function buildTableViewRows(
  sorted: Record<string, unknown>[],
  rowKey: string,
  group: GroupSpec | null,
  collapsed: ReadonlySet<string>,
): ViewRow[] {
  if (!group || !group.dims.length) return dataViewRows(sorted, rowKey);
  return groupViewRows(group, sorted, collapsed as Set<string>);
}

export function runTablePipeline(input: TablePipelineInput): TablePipelineResult {
  const sortedRows = sortRows(input.data, input.sortState, input.sortMode);
  const viewRows = buildTableViewRows(sortedRows, input.rowKey, input.group, input.collapsed);
  const basePaged = paginateViewRows(
    viewRows,
    input.pageMode === "server" ? 0 : input.pageSize,
    input.page,
  );
  const paged: PagedView =
    input.pageMode === "server" && input.pageSize > 0
      ? {
          ...basePaged,
          page: Math.max(1, input.page),
          pageCount: Math.max(1, Math.ceil(Math.max(0, input.totalRecords) / input.pageSize) || 1),
          totalRows: input.totalRecords > 0 ? input.totalRecords : basePaged.totalRows,
        }
      : basePaged;

  return { sortedRows, viewRows, paged };
}

/**
 * 解析 `selectedRowId`（`id:10` 或 `code:a,b`，逗号分隔多组）判断本行是否命中。
 * 冒号后为空不命中；值逐字比较。
 */
export function matchesSelectedRowId(row: Record<string, unknown>, specRaw: string): boolean {
  const spec = specRaw.trim();
  if (!spec) return false;
  for (const item of spec.split(",")) {
    const idx = item.indexOf(":");
    if (idx < 0) continue;
    const key = item.slice(0, idx).trim();
    const want = item.slice(idx + 1).trim();
    if (!key || !want) continue;
    if (String(row[key] ?? "") === want) return true;
  }
  return false;
}
