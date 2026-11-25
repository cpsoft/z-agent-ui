// 日期层级维度的编码/解码（纯函数，无 React / 无 DOM）。
//
// [为什么从 Reports.tsx 搬出来] 卡种切换的迁移层（report-switch.ts）要把 datefmt 维度
// 退化成物理列（明细表逐行不聚合，DATE_FORMAT 表达式没有意义）。如果解析函数还留在
// 4600 行的页面文件里，report-switch → Reports.tsx → report-switch 就成环了。
// 这里只搬「字符串 ↔ {field, gran}」这一层；展示名（dimLabel）依赖列元数据，留在页面。

import type { ReportDateGranularity } from "./types.js";

export const DATEFMT_RE = /^datefmt:([^:]+):(year|quarter|month|week|dayofweek|day|hour|minute|second)$/;

/** 编码日期层级维度：datefmt:<field>:<gran>（后端 buildAggregateQuery 编译为 DATE_FORMAT 等表达式） */
export function encodeDateDim(field: string, gran: ReportDateGranularity): string {
  return `datefmt:${field}:${gran}`;
}

/** 解析日期层级维度；非 datefmt 前缀返回 null（普通物理列名） */
export function parseDateDim(dim: string): { field: string; gran: ReportDateGranularity } | null {
  const m = DATEFMT_RE.exec(dim);
  if (!m) return null;
  return { field: m[1], gran: m[2] as ReportDateGranularity };
}

/** datefmt 维度 → 物理列名；普通列原样返回（明细表的字段白名单只认物理列） */
export function toPhysicalDim(dim: string): string {
  return parseDateDim(dim)?.field ?? dim;
}
