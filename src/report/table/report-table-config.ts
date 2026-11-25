// [WHY] 2026-10-25 系统审计：从 ReportTable.ts（1058 行）按职责拆出
// 职责：表格配置快照的读(getConfig)与写(applyConfig)——快照格式转换与按 key 重排，不持有元素/DOM。
// 说明：持久化仍由外部负责；本模块只做快照 ⇄ 列属性的映射，经 ConfigSnapshotHost 回写宿主。

import type { ReportColumn, SortEntry, TableConfig } from "./report-table-types.js";

/** 快照读写所需的宿主状态(ReportTable 实例结构化满足: 均为公开属性) */
export interface ConfigSnapshotHost {
  columns: ReportColumn[];
  sortState: SortEntry[];
  striped: boolean;
  bordered: boolean;
  size: "sm" | "md";
  lines: boolean;
  requestUpdate(): void;
}

// [WHY] 导出配置快照: 列顺序即 columns 数组顺序, 使用者可存 localStorage 或提交服务器
export function takeConfigSnapshot(host: ConfigSnapshotHost, columnWidths: Map<string, number>): TableConfig {
  return {
    columns: host.columns.map((c) => ({
      key: c.key,
      hidden: c.hidden,
      align: c.align ?? null,
      showFooter: c.showFooter,
      fixed: c.fixed ?? null,
      width: columnWidths.get(c.key) ?? null,
    })),
    sortState: [...host.sortState],
    striped: host.striped,
    bordered: host.bordered,
    size: host.size,
    variant: host.lines ? "lines" : "default",
  };
}

// [WHY] 应用配置快照: 按 key 匹配重排/更新列属性, 缺失列保持原顺序追加
export function applyConfigSnapshot(
  host: ConfigSnapshotHost,
  columnWidths: Map<string, number>,
  cfg: TableConfig,
): void {
  if (!cfg || !Array.isArray(cfg.columns)) return;
  if (typeof cfg.striped === "boolean") host.striped = cfg.striped;
  if (typeof cfg.bordered === "boolean") host.bordered = cfg.bordered;
  if (cfg.size === "sm" || cfg.size === "md") host.size = cfg.size;
  if (typeof cfg.lines === "boolean") host.lines = cfg.lines;
  else if (cfg.variant === "lines") host.lines = true;
  else if (cfg.variant === "default") host.lines = false;
  const byKey = new Map(host.columns.map((c) => [c.key, c]));
  const reordered: ReportColumn[] = [];
  const seen = new Set<string>();
  for (const item of cfg.columns) {
    const col = byKey.get(item.key);
    if (!col || seen.has(item.key)) continue;
    seen.add(item.key);
    col.hidden = item.hidden;
    col.align = item.align ?? undefined;
    col.showFooter = item.showFooter;
    // [WHY] 快照为权威: 无 fixed 字段的旧快照解冻该列, 与 hidden 处理一致
    col.fixed = item.fixed === "left" || item.fixed === "right" ? item.fixed : undefined;
    if (item.width != null) columnWidths.set(item.key, item.width);
    reordered.push(col);
  }
  for (const col of host.columns) {
    if (!seen.has(col.key)) reordered.push(col);
  }
  host.columns = reordered;
  if (Array.isArray(cfg.sortState)) host.sortState = [...cfg.sortState];
  host.requestUpdate();
}
