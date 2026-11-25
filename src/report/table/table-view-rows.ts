// 表格「视图行」：把**数据行**（sortRows 的结果）转成**渲染行**，再切成分页。
//
// [WHY 要单独一层] 分组表要在层级之间插入**算出来的**小计/总计行 —— 它们不是数据行。
// z-report-table 原先的渲染路径是 `sorted.map(renderRow)`，一条数据一个 tr，插入不了。
// 加一层视图行后：数据行排序 → 视图行（可插小计/总计）→ 分页 → 渲染。
// 三条约束得同时满足，所以顺序不能换：
//   ① 排序必须作用在**数据行**上：分组之后再排序会把小计行也排进去（小计不是数据）
//   ② 分组必须作用在**排序后**的行上：组内顺序要跟用户点的表头一致
//   ③ 分页必须作用在**视图行**上：用户看到的是行，跳页跳的是行
//
// [WHY 分组表的页按「组块」切而不是按行切] 一页里的第一行是「华东 小计 4800」而它下面的
// 明细在上一页 —— 分组就没有意义了。块 = 一级组行 + 它的全部子孙；块不被页切开。
// 代价：单块超过 pageSize 时独占一页（行数超过 pageSize）。这是对的取舍 ——
// 把一块硬拆成两页，读者对不上小计。

import { buildGroupRowsBySpec, type GroupSpec } from "../core/report-group.js";

/** 渲染行：`data` = 原始数据行；`group` = 父级小计；`total` = 总计。 */
export interface ViewRow {
  kind: "data" | "group" | "total";
  /** 这一行要渲染的列值（data 就是原行；group/total 是算出来的）。 */
  values: Record<string, unknown>;
  /** 行 key（选择 / 点击 / 折叠都用它）。 */
  key: string;
  /** group 行 = 1..dims.length；data / total 不缩进（0 / -1 都给 0）。 */
  depth: number;
  /** 所属组（树状折叠状态用）。 */
  groupKey: string;
  /** group 行是否还有子级（决定画不画折叠按钮）。 */
  hasChildren: boolean;
  /**
   * 这条渲染行对应的**数据行**在排序后数组里的下标；小计/总计行 = -1。
   *
   * [WHY 不能直接用渲染序号] 插入小计行后 tr 的序号与数据行序号不再一一对应；
   * 行点击（`z-row-click`）按序号回查数据行，用渲染序号会**指向别的行**或第一条重复行，
   * 而 UI 上完全正常 —— 只有点开详情发现内容不对时才知道。
   */
  sourceIndex: number;
}

/** 平表：一条数据一个渲染行。 */
export function dataViewRows(rows: Record<string, unknown>[], rowKey = ""): ViewRow[] {
  return rows.map((r, i) => ({
    kind: "data" as const,
    values: r,
    key: rowKey && r[rowKey] != null ? String(r[rowKey]) : String(i),
    depth: 0,
    groupKey: "",
    hasChildren: false,
    sourceIndex: i,
  }));
}

/**
 * 分组：按 `spec.dims` 的层级顺序归组，父级小计行 + 总计行。
 *
 * 分组本身（含小计怎么算、avg 类聚合为什么显示「—」）全在 `buildGroupRowsBySpec` ——
 * 报表查看、导出 CSV、page 卡三处共用的那一份。这里只做形状转换。
 */
export function groupViewRows(
  spec: GroupSpec,
  rows: Record<string, unknown>[],
  collapsed: ReadonlySet<string> = new Set(),
): ViewRow[] {
  return buildGroupRowsBySpec(spec, rows, { collapsed }).map((r) => ({
    // 分组侧的 `leaf` 就是「一条数据」，在表格的视图行里叫 `data` —— 两套词是为了
    // 各自语义清楚（叶子 vs 树节点 / 数据行 vs 算出来的行），转换只在这一处做。
    kind: r.kind === "leaf" ? ("data" as const) : r.kind,
    values: r.values,
    key: r.rowKey,
    depth: r.kind === "total" ? 0 : r.depth,
    groupKey: r.groupKey,
    hasChildren: r.hasChildren,
    sourceIndex: r.kind === "leaf" ? r.sourceIndex : -1,
  }));
}

export interface PagedView {
  /** 本页要渲染的行（**不含**总计行）。 */
  rows: ViewRow[];
  /** 总计行：固定在表尾，不参与分页。 */
  total: ViewRow | null;
  /** 已 clamp 的当前页（1-based）。 */
  page: number;
  pageCount: number;
  /** 参与分页的行数（不含总计行）。 */
  totalRows: number;
}

/**
 * 分页：页按「组块」切（见文件头），总计行摘出来固定在表尾。
 *
 * @param pageSize 0 / 负数 = 不分页
 */
export function paginateViewRows(views: ViewRow[], pageSize: number, page: number): PagedView {
  const totalRow = views.find((v) => v.kind === "total") ?? null;
  const body = views.filter((v) => v.kind !== "total");

  if (!(pageSize > 0)) {
    return { rows: body, total: totalRow, page: 1, pageCount: 1, totalRows: body.length };
  }

  const pages = chunkPages(body, pageSize);
  const pageCount = Math.max(1, pages.length);
  // [WHY clamp 而不是报错] 换筛选条件后总页数会缩小，而 `page` 还停在旧值上；
  // 不 clamp 就是「筛完只剩 2 页，页面显示第 7 页、一行没有」—— 且没有任何报错。
  const cur = Math.min(Math.max(1, Math.trunc(page) || 1), pageCount);
  return { rows: pages[cur - 1] ?? [], total: totalRow, page: cur, pageCount, totalRows: body.length };
}

/** 把渲染行切成页：有分组行时按一级组块切，否则一行一块。 */
function chunkPages(views: ViewRow[], pageSize: number): ViewRow[][] {
  const blocks = chunkBlocks(views);
  const pages: ViewRow[][] = [];
  let acc: ViewRow[] = [];
  for (const b of blocks) {
    // `acc.length` 这个条件保证「单块比一页还大」时它独占一页，而不是死循环换页
    if (acc.length && acc.length + b.length > pageSize) {
      pages.push(acc);
      acc = [];
    }
    acc.push(...b);
  }
  if (acc.length) pages.push(acc);
  return pages;
}

function chunkBlocks(views: ViewRow[]): ViewRow[][] {
  const grouped = views.some((v) => v.kind === "group");
  // 平表（或关掉了小计行）：每行一块
  if (!grouped) return views.map((v) => [v]);

  const blocks: ViewRow[][] = [];
  let cur: ViewRow[] | null = null;
  for (const v of views) {
    // 一级组行开启新块；其后的子组行、叶子行都归这一块
    if (v.kind === "group" && v.depth === 1) {
      if (cur) blocks.push(cur);
      cur = [v];
      continue;
    }
    if (!cur) cur = [v];
    else cur.push(v);
  }
  if (cur) blocks.push(cur);
  return blocks;
}
