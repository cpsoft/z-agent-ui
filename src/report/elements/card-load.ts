// [WHY] 2026-10-25 系统审计：从 report-card.ts（853 行）按职责拆出
// 职责：取数相关的纯工具 —— 卡种判定、时刻/数值归一、生效筛选与生效排序。

import { validOrderBy } from "../core/report-query.js";
import type { CardKind, ReportChart, ReportFilter, ReportOrderBy } from "../core/types.js";

/** 宿主是否已经注册过这些标签。 */
export function allDefined(tags: string[]): boolean {
  return tags.every((t) => !!customElements.get(t));
}

/** 该卡种要不要查数据。文本/图片卡不查 —— 它们的字段面板全 false（cardSlots），
 *  没有导出/刷新/明细可做，也不该显示「等待配置」（那会让人以为卡没配完）。 */
export function needsQuery(kind: CardKind): boolean {
  return kind !== "text" && kind !== "image";
}

/** 时刻 → HH:MM:SS（状态条的「查询完成 11:29:47」）。 */
export function clockOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** 数值列取值：库里可能是字符串（DECIMAL 走 JSON 会变成 string），必须过 Number。 */
export function numOf(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 生效筛选 = 卡内筛选 + 看板级筛选（AND 语义，顺序不影响结果）。
 *
 *  [为什么必须合并] 只传 this.filters 时，卡自己配的筛选（chart.filters）会被静默忽略
 *  —— 症状是「报表里配的过滤条件不生效」，而看板筛选一切正常，极难联想到这一层。 */
export function effectiveFilters(chart: ReportChart | null, filters: ReportFilter[]): ReportFilter[] {
  const own = chart?.filters ?? [];
  return filters.length ? [...own, ...filters] : own;
}

/** 生效排序：交互排序（点列头）优先，其次 `orderBy` 属性，最后配置里的 orderBy。
 *  三者都要过 `validOrderBy` —— 换字段后残留的排序项会让后端按不存在的列排序。 */
export function effectiveSort(
  chart: ReportChart | null,
  interactive: ReportOrderBy[] | null,
  orderBy: ReportOrderBy[] | null,
): ReportOrderBy[] {
  if (!chart) return [];
  if (interactive) return interactive;
  const given = orderBy ?? chart.orderBy;
  if (!given) return [];
  const valid = new Set(validOrderBy(chart).map((o) => o.field));
  return given.filter((o) => valid.has(o.field));
}
