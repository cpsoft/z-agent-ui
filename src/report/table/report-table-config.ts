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

// ═══════════════════════════════════════════════════════════
// 本机记忆（persist-key）
// ═══════════════════════════════════════════════════════════
//
// [WHY 只存"顺序 + 隐藏"而不是整份 TableConfig] 本机记忆要回答的是「我把列摆成什么样」
// 这一个问题。把 striped / size / variant 一起存进去，等于让三个月前的一次点击
// 永久压住代码里新改的默认外观 —— 用户不知道去哪儿改回来，也没有入口。

/** 本机记住的列视图。`order` 含隐藏列，勾回来时才能回到原位。 */
export interface PersistedColumnView {
  v: 1;
  order: string[];
  hidden: string[];
}

export function takePersistedColumnView(host: ConfigSnapshotHost): PersistedColumnView {
  return {
    v: 1,
    order: host.columns.map((c) => c.key),
    // [WHY 排除 required] 它们永远可见，记进去只会在读回时制造一次无意义的冲突
    hidden: host.columns.filter((c) => c.hidden && !c.required).map((c) => c.key),
  };
}

/**
 * 校验并归一化存下来的值。
 *
 * 这段数据来自 localStorage：可能是上一版本的格式、被手工改坏、或被别的页面写脏。
 * 任何不成立的形状一律当作「没存过」，而不是抛错或部分应用 —— 后者会让表格
 * 显示一半旧顺序一半新顺序，比直接回到默认更难解释。
 */
export function parsePersistedColumnView(raw: unknown): PersistedColumnView | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.order)) return null;
  const order = o.order.filter((k): k is string => typeof k === "string" && k !== "");
  if (order.length === 0) return null;
  const hidden = Array.isArray(o.hidden)
    ? o.hidden.filter((k): k is string => typeof k === "string" && k !== "")
    : [];
  return { v: 1, order, hidden };
}

/**
 * 把记住的顺序与显隐应用到当前列。返回「是否真的改了」—— 调用方据此决定要不要重绘。
 *
 * 存储里没有的列（宿主新加的）保持声明时的默认值，并排在最后：本机记忆管的是
 * 「用户摆过的那批列」，新列不该被一条三个月前的记录藏起来或塞进中间。
 */
export function applyPersistedColumnView(
  host: ConfigSnapshotHost,
  view: PersistedColumnView,
): boolean {
  const byKey = new Map(host.columns.map((c) => [c.key, c]));
  const hiddenSet = new Set(view.hidden);
  let changed = false;

  for (const key of view.order) {
    const col = byKey.get(key);
    if (!col || col.required) continue;
    const hidden = hiddenSet.has(key);
    if (!!col.hidden !== hidden) {
      col.hidden = hidden;
      changed = true;
    }
  }

  const ordered: ReportColumn[] = [];
  const seen = new Set<string>();
  for (const key of view.order) {
    const col = byKey.get(key);
    if (!col || seen.has(key)) continue;
    seen.add(key);
    ordered.push(col);
  }
  if (ordered.length && ordered.length < host.columns.length) {
    for (const col of host.columns) if (!seen.has(col.key)) ordered.push(col);
  }
  if (ordered.length && ordered.some((c, i) => c !== host.columns[i])) {
    host.columns = ordered;
    changed = true;
  }
  return changed;
}

/** 读本机记忆。存储被禁用 / 值被写坏一律当作「没存过」，表格照默认走。 */
export function readPersistedColumnView(storageKey: string): PersistedColumnView | null {
  if (!storageKey) return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw == null ? null : parsePersistedColumnView(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 写本机记忆。配额满或被禁用时静默失败 —— 记忆失效不该让单元格操作失败。 */
export function writePersistedColumnView(storageKey: string, host: ConfigSnapshotHost): void {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(takePersistedColumnView(host)));
  } catch {
    // 见上：本机记忆是锦上添花，不是数据通道
  }
}

/**
 * 按完整 key 列表重排，返回重排后的 key 顺序；顺序没变返回 null。
 *
 * [WHY 收完整列表而不是 from/to] 列选择器拖动时已经把行挪到最终位置，它手里最准的
 * 信息就是「松手后的完整顺序」。换算成索引等于两处各算一遍落点。
 */
export function reorderColumnsByKeys(host: ConfigSnapshotHost, keys: string[]): string[] | null {
  const byKey = new Map(host.columns.map((c) => [c.key, c]));
  const next: ReportColumn[] = [];
  const seen = new Set<string>();
  for (const k of keys) {
    const col = byKey.get(k);
    if (!col || seen.has(k)) continue;
    seen.add(k);
    next.push(col);
  }
  if (next.length === 0) return null;
  for (const col of host.columns) if (!seen.has(col.key)) next.push(col);
  if (next.length === host.columns.length && next.every((c, i) => c === host.columns[i])) return null;
  host.columns = next;
  return next.map((c) => c.key);
}
