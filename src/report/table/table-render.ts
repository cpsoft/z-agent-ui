// [WHY] 2026-10-25 系统审计：从 ReportTable.ts（1058 行）按职责拆出
// 职责：纯渲染层——固定列偏移计算、列宽换算、排序后数据、表头/数据行/合计行/空态的 HTML 生成。

import { html } from "../../core/index.js";
import { renderColumnConfig, type ColumnConfigTexts } from "./column-config-panel.js";
import { esc, type ReportColFormat, type ReportColumn, type SortEntry } from "./report-table-types.js";
import { normalizeCell } from "../core/cell-spec.js";
import type { ViewRow } from "./table-view-rows.js";

// ═══════════════════════════════════════════════════════════
// Width / fixed offsets
// ═══════════════════════════════════════════════════════════

export function getColPixelWidth(col: ReportColumn, columnWidths: Map<string, number>): number {
  // [WHY 2026-11-23 L2-P1] 拖宽覆盖优先，其余交给 normalizeCell（默认 120 只在 cell-spec.ts 出现一处）。
  if (columnWidths.has(col.key)) return columnWidths.get(col.key)!;
  return normalizeCell(col).widthPx;
}

export function getColWidth(col: ReportColumn, columnWidths: Map<string, number>): string {
  if (columnWidths.has(col.key)) return columnWidths.get(col.key) + "px";
  if (col.width == null || col.width === "") return "";
  // [WHY 补 px] `CellSpec.width` 允许 number（配置 JSON 里写 `width: 120` 很自然）。
  // 原实现 `col.width || ""` 会把 120 原样塞进 style，而 `width:120` 不是合法 CSS
  // ⇒ 传 number 的宿主看到的是「宽度不生效」，且类型上原本还报错 —— 两处都不对。
  return typeof col.width === "number" ? `${col.width}px` : String(col.width);
}

export interface FixedOffsets {
  left: Map<string, number>;
  right: Map<string, number>;
}

/**
 * 冻结列偏移。
 *
 * `trailingWidth` = 表格最右侧那个「非数据列」的宽度（目前是工具列，见 issue IKQUWH）。
 *
 * [WHY 要这个参数] 工具列 sticky 在 `right: 0` 才能永远可见（19 列表要横滚，不 sticky
 * 就得滚到最右才点得到）。但 `fixed=right` 的列也是 `right: 0` 起算 —— 两者会叠在同一位置。
 * 把工具列宽度作为右冻结的起始偏移，右冻结列就整体左移一格，谁也不盖谁。
 * 左冻结不受影响（工具列在最右，不在左侧累加链上）。
 */
export function computeFixedOffsets(
  visible: ReportColumn[],
  selectable: boolean,
  columnWidths: Map<string, number>,
  trailingWidth = 0,
): FixedOffsets {
  const left = new Map<string, number>();
  const right = new Map<string, number>();

  let leftOffset = 0;
  if (selectable) leftOffset = 40;
  for (const col of visible) {
    if (col.fixed === "left") {
      left.set(col.key, leftOffset);
      leftOffset += getColPixelWidth(col, columnWidths);
    }
  }

  let rightOffset = trailingWidth;
  for (let i = visible.length - 1; i >= 0; i--) {
    const col = visible[i];
    if (col.fixed === "right") {
      right.set(col.key, rightOffset);
      rightOffset += getColPixelWidth(col, columnWidths);
    }
  }
  return { left, right };
}

// ═══════════════════════════════════════════════════════════
// Data prep
// ═══════════════════════════════════════════════════════════

export function sortRows(
  data: Record<string, unknown>[],
  sortState: SortEntry[],
  sortMode: "client" | "server",
): Record<string, unknown>[] {
  // [WHY] server 模式: 排序交给后端, 组件保持数据原序, 只通过 z-sort 上报请求
  if (sortMode === "server") return data;
  if (!sortState.length || !data.length) return data;
  return [...data].sort((a, b) => {
    for (const { key, dir } of sortState) {
      const av = a[key];
      const bv = b[key];
      if (av == null && bv == null) continue;
      // [2026-11-08 空值语义] 取 SQL 的 NULL 序：ASC 空在前、DESC 空在后 —— 与
      // page/render-data.ts sortRowsBy 同一套（issue IKQOH1），早先「恒排最后」会把
      // 宿主/兜底已按 SQL 排好的空值行位置改坏，两条排序路径出两种结果。
      if (av == null) return dir === "asc" ? -1 : 1;
      if (bv == null) return dir === "asc" ? 1 : -1;
      // [WHY 数值串必须按数排，2026-11-08] MySQL DECIMAL 经驱动 []byte→string 出来
      // 是字符串（"9" 与 "10"），原生 `<` 会给字典序 —— 点表头排序看起来「乱序」。
      // 与 page/render-data.ts 的 compareCell 同一套语义：两侧都能转数（含纯数字串）
      // 就按数排；转不了（文本/ISO 日期串）落回字典序（ISO 日期串的字典序恰是时间序）。
      const an = typeof av === "number" ? av : Number(av);
      const bn = typeof bv === "number" ? bv : Number(bv);
      let cmp: number;
      if (!Number.isNaN(an) && !Number.isNaN(bn)) {
        cmp = an === bn ? 0 : an < bn ? -1 : 1;
      } else {
        const as = String(av);
        const bs = String(bv);
        cmp = as === bs ? 0 : as < bs ? -1 : 1;
      }
      if (cmp !== 0) return dir === "desc" ? -cmp : cmp;
    }
    return 0;
  });
}

// ═══════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════

export interface HeaderRenderContext {
  sortState: SortEntry[];
  editable: boolean;
  /**
   * 表头可拖宽（与 `editable` **拆开**的门控）。
   *
   * [WHY 拆] 查看态只需要拖宽，不需要齿轮与列序拖拽。原先两者共用一个开关，
   * 查看页要么「什么都不能调」，要么「多出一排编辑控件」—— 见 [[REQ-021-page-column-width]]。
   */
  resizable: boolean;
  columnWidths: Map<string, number>;
  leftOffsets: Map<string, number>;
  rightOffsets: Map<string, number>;
  configOpen: string | null;
  colFormats: Record<string, ReportColFormat>;
  texts: ColumnConfigTexts;
}

/** 口径说明读屏副本的 id。key 已限定为标识符，仍过一遍 esc 以免调用方塞进引号/尖括号。 */
export function tipIdOf(key: string): string {
  return `z-rpt-tip-${esc(key)}`;
}

// [WHY 整个标记串写在一行] th 是内联布局：标签与角标之间的换行缩进会渲染成约 3.5px 空格
// （12 列累计 40px+，正是本表最缺的那点宽度）。
// [WHY「?」用 CSS 伪元素画，不写文本节点] 全仓取列名靠 `th.textContent.trim()`，角标若是文本，
// 列名会变成「物料编码?」，所有按列名匹配的分支（列设置 / 测试 / 校验脚本）都会静默失效。
export function renderHeaderTip(col: ReportColumn): string {
  if (!col.tip) return "";
  return html`<z-tooltip class="z-rpt__tip" content="${esc(col.tip)}" placement="bottom" offset="6" delay="120"><span class="z-rpt__th-tip" part="header-tip" aria-hidden="true"></span></z-tooltip>`;
}

// [WHY 口径文案放在 th 之外] aria-describedby 引用 display:none / 被裁切的元素是允许的，而放在 th 里
// 会污染 th 的可访问名与 textContent（列名变成「物料编码物料编码。…」）。
export function renderHeaderTipDefs(vis: ReportColumn[]): string {
  const items = vis.filter((col) => col.tip);
  if (!items.length) return "";
  return html`<div class="z-rpt__tip-defs" part="tip-defs">${items
    .map((col) => html`<span class="z-rpt__sr-only" id="${tipIdOf(col.key)}">${esc(col.tip)}</span>`)
    .join("")}</div>`;
}

export function renderSelectAllHeader(rowspan = 1): string {
  return html`
      <th class="z-rpt__th z-rpt__th--checkbox z-rpt__th--fixed-left" part="header-cell"${rowspan > 1 ? html` rowspan="${rowspan}"` : ""}>
        <input type="checkbox" class="z-rpt__select-all" part="select-all" />
      </th>
    `;
}

export function renderEmptyRow(totalCols: number, emptyText: string): string {
  return html`<tr class="z-rpt__empty-row"><td colspan="${totalCols}" class="z-rpt__empty-cell" part="empty">
                  <svg class="z-rpt__empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                  <span class="z-rpt__empty-text">${esc(emptyText)}</span>
                </td></tr>`;
}

/**
 * @param tabStop 该表头是否是**本行唯一的 Tab 停靠点**。
 *
 * [WHY 由调用方决定而不是自己算] 「第一个可排序列才是停靠点」需要看到**整行**，
 * 而本函数只拿到一列。调用方（ReportTable）在一次 map 里最清楚谁是第一个。
 * 原先写的是 `col.sortable ? 'tabindex="0"'` —— 8 个可排序列就是 8 个 Tab 停靠点，
 * 而同一张表的单元格却是「整表一个停靠点」，同一个控件两套规矩。
 */
export function renderHeader(
  col: ReportColumn,
  ctx: HeaderRenderContext,
  tabStop = false,
  /**
   * 跨几行（分组表头下，未分组的列要跨过组头行）。
   * `0` / `1` = 不写 rowspan —— 表头只有一行时属性本身没有意义，写上只是噪音。
   */
  rowspan = 0,
  /**
   * 分类色（`col group-tone=`）与「组首列」标记。
   *
   * [WHY 由调用方给、不在这里读 col.groupTone] 组色是**组的属性**：同组各列里只有第一列
   * 可能写了色，组内其余列名格要跟着组走；反过来某列自己写了别的色，也不该在同一个组块里
   * 拆出一道异色。谁来定这个统一色，只有拿到整组的 `headGroupPlan` 知道 —— 这里只负责写出去。
   */
  tone: { name?: string; groupStart?: boolean } = {},
): string {
  const { sortState, editable, columnWidths, leftOffsets, rightOffsets } = ctx;
  // [WHY] 调宽手柄的开关是 `editable || resizable`：编辑态照旧全开，
  // 查看态可以只开"拖宽"这一项（`resizable`），不连带齿轮/列序，见 [[REQ-021-page-column-width]]
  const canResize = editable || ctx.resizable;
  const sortIdx = sortState.findIndex((s) => s.key === col.key);
  const isSorted = sortIdx !== -1;
  const sortDir = isSorted ? sortState[sortIdx].dir : "";

  const fixedCls = col.fixed ? `z-rpt__th--fixed-${col.fixed}` : "";
  const sortCls = col.sortable ? "z-rpt__th--sortable" : "";
  const sortedCls = isSorted ? `z-rpt__th--sorted z-rpt__th--sorted-${sortDir}` : "";
  // [WHY] 中文报表习惯: 表头未显式指定对齐时居中, 数据单元格仍默认左对齐
  const alignCls = col.align ? `z-rpt__cell--${col.align}` : "";
  const resizableCls = col.resizable !== false && canResize ? "z-rpt__th--resizable" : "";
  const draggableCls = editable ? "z-rpt__th--draggable" : "";
  // [WHY 组首列单独一个类而不是给组内每格加 border] 相邻两组同色相时（业绩页 8 个渠道组
  // 都是紫），淡底会连成一片，分界只剩组首这条线 —— 与 zWorker 原版 `thead th.g-start` 同一手段。
  const groupCls = tone.groupStart ? "z-rpt__th--group-start" : "";
  const toneName = (tone.name ?? "").trim();
  const toneAttr = toneName ? ` data-group-tone="${esc(toneName)}"` : "";

  const width = getColWidth(col, columnWidths);
  const styleParts: string[] = [];
  if (width) styleParts.push(`width:${width}`);
  if (col.fixed === "left" && leftOffsets.has(col.key)) {
    styleParts.push(`left:${leftOffsets.get(col.key)}px`);
  }
  if (col.fixed === "right" && rightOffsets.has(col.key)) {
    styleParts.push(`right:${rightOffsets.get(col.key)}px`);
  }
  const style = styleParts.length ? ` style="${styleParts.join(";")}"` : "";

  // [WHY] 严谨性: aria-sort 向读屏器传达排序状态; tabindex 支持键盘排序
  const ariaSort = isSorted
    ? sortDir === "asc" ? "ascending" : "descending"
    : col.sortable ? "none" : null;
  const tabIndex = col.sortable ? ` tabindex="${tabStop ? "0" : "-1"}"` : "";
  // [WHY] 口径说明挂在 aria-describedby（不是 aria-label：那会顶掉列名本身）
  const tipId = col.tip ? tipIdOf(col.key) : "";
  const describedBy = tipId ? ` aria-describedby="${tipId}"` : "";

  return html`
      <th class="z-rpt__th ${sortCls} ${sortedCls} ${alignCls} ${fixedCls} ${resizableCls} ${draggableCls} ${groupCls}"
          ${style} data-key="${col.key}" part="header-cell" scope="col"${describedBy}${toneAttr}
          ${rowspan > 1 ? `rowspan="${rowspan}" ` : ""}${ariaSort ? `aria-sort="${ariaSort}"` : ""}${tabIndex}>
        <span class="z-rpt__th-content">${esc(col.title)}</span>${renderHeaderTip(col)}
        ${col.sortable
          ? html`<span class="z-rpt__sort-icon" part="sort-icon" aria-hidden="true">
              <svg class="z-rpt__sort-chevron z-rpt__sort-chevron--asc" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
              <svg class="z-rpt__sort-chevron z-rpt__sort-chevron--desc" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </span>
            ${sortState.length > 1 && isSorted
              ? html`<span class="z-rpt__sort-order">${sortIdx + 1}</span>`
              : ""}`
          : ""}
        ${editable
          ? renderColumnConfig(col, { open: ctx.configOpen === col.key, format: ctx.colFormats[col.key], texts: ctx.texts })
          : ""}
        ${col.resizable !== false && canResize
          ? html`<span class="z-rpt__resize-handle" data-key="${col.key}" part="resize-handle"></span>`
          : ""}
      </th>
    `;
}

// ═══════════════════════════════════════════════════════════
// Head rows（分组表头，issue IKX0CE P1-5）
// ═══════════════════════════════════════════════════════════

/** 表头行里的一格：分组格跨若干列，普通格跨若干行。 */
export type HeadCell = { kind: "group"; title: string; cols: ReportColumn[] } | { kind: "single"; col: ReportColumn };

/**
 * 按 `col.group` 把**可见列**切成表头格序列。
 *
 * [★ 必须以可见列为输入] 组头按声明的组列表来画，就会出现「组里 30 列全被隐藏、
 * 组头还在」—— 而 `colspan` 写 0 会被浏览器当成 1，组头于是展开到表格末列
 * （issue 里点名的 `bug-20260827-grid-label-fixed-width` 就是这一形态）。
 * 从可见列重新分组，隐藏到最后不剩列的组自然什么都不画。
 *
 * 相邻且同名的列合成一格；同名但不相邻的两段**不合并**（`colspan` 只能跨连续列，
 * 硬合并会把中间那列吞进去）。
 */
export function headGroupPlan(vis: ReportColumn[]): HeadCell[] {
  const out: HeadCell[] = [];
  for (const col of vis) {
    const group = (col.group ?? "").trim();
    if (!group) {
      out.push({ kind: "single", col });
      continue;
    }
    const prev = out[out.length - 1];
    if (prev && prev.kind === "group" && prev.title === group) prev.cols.push(col);
    else out.push({ kind: "group", title: group, cols: [col] });
  }
  return out;
}

/**
 * 一个组的分类色：组内**第一个非空**的 `group-tone`。
 *
 * [WHY 取第一个非空而不是取第一列] 一个组横跨 5~8 列，色是组的属性，只该声明一次。
 * 死认第一列等于要求「必须写在组首列」，而组首列会随列序拖拽/隐藏变化 —— 明明写了色，
 * 组头却因为「写在了第二列」而变灰，这种失败不会报错。
 */
function groupToneOf(cell: Extract<HeadCell, { kind: "group" }>): string {
  for (const c of cell.cols) {
    const t = (c.groupTone ?? "").trim();
    if (t) return t;
  }
  return "";
}

/**
 * 分组格（组头行）。
 *
 * [WHY 冻结只在「整组都冻结」时才生效] 组内一半冻结一半不冻（真写出来过），给组头
 * 一个 `left` 偏移会让它横滚时停在别的列上 —— 比不吸顶更糟（不吸顶只是滚走，
 * 停在错位处会让人以为那是另一列的表头）。判据取「全部」，混合就当作不冻结。
 */
function renderGroupHead(cell: Extract<HeadCell, { kind: "group" }>, ctx: HeaderRenderContext): string {
  const first = cell.cols[0];
  const allLeft = cell.cols.every((c) => c.fixed === "left");
  const allRight = cell.cols.every((c) => c.fixed === "right");
  const fixedCls = allLeft ? "z-rpt__th--fixed-left" : allRight ? "z-rpt__th--fixed-right" : "";
  const styleParts: string[] = [];
  if (allLeft && ctx.leftOffsets.has(first.key)) styleParts.push(`left:${ctx.leftOffsets.get(first.key)}px`);
  if (allRight && ctx.rightOffsets.has(first.key)) styleParts.push(`right:${ctx.rightOffsets.get(first.key)}px`);
  const style = styleParts.length ? ` style="${styleParts.join(";")}"` : "";
  const cls = ["z-rpt__th", "z-rpt__th--group", fixedCls].filter(Boolean).join(" ");
  // [WHY 色相取组内第一个非空] 组头只有一格，同组各列理应同色；真要写得不一致，
  // 以第一个出现的为准（而不是随机挑一个）—— 至少渲染是确定的。
  const tone = groupToneOf(cell);
  const toneAttr = tone ? ` data-group-tone="${esc(tone)}"` : "";
  return html`<th class="${cls}" part="header-group"${toneAttr}
                 colspan="${cell.cols.length}" scope="colgroup"${style} title="${esc(cell.title)}"><span class="z-rpt__th-content">${esc(cell.title)}</span></th>`;
}

export interface HeadRowsArgs {
  /** 可见列（已按列序、去掉隐藏列） */
  vis: ReportColumn[];
  ctx: HeaderRenderContext;
  selectable: boolean;
  /** 表头末格工具区的**内层** HTML（列选择器的 `<z-column-selector>`）；空 = 不画 */
  tools?: string;
}

/**
 * 表头整块（一到两行）。
 *
 * [WHY 组装整块而不是「只加一个组头行」] 两行表头会改变**谁跨几行**：选择列、未分组的列、
 * 工具格都要 `rowspan=2`；漏掉任何一格，表头就从那一格起右移。三处各改一次必然漏一处，
 * 所以把「哪一格落在哪一行、跨多少」收在一个函数里。
 *
 * [WHY Tab 停靠点按视觉顺序算] 分组表头下最左那列可能落在**第二行**（DOM 里排在后面），
 * 按 DOM 顺序挑第一个可排序列，键盘用户会先跳到第 8 列。所以先按 `vis` 序找出第一个
 * 可排序列，再让那一格拿 `tabindex=0`。
 */
export function renderHeadRows(args: HeadRowsArgs): string {
  const { vis, ctx, selectable, tools } = args;
  const plan = headGroupPlan(vis);
  const grouped = plan.some((c) => c.kind === "group");
  const firstStop = vis.find((c) => c.sortable)?.key ?? "";
  // 跨几行是**按行**决定的：第一行里未分组的列跨两行，第二行（列名行）的格子不跨
  const cell = (
    col: ReportColumn,
    rowspan: number,
    tone: { name?: string; groupStart?: boolean } = {},
  ): string => renderHeader(col, ctx, col.key === firstStop, rowspan, tone);
  const span = grouped ? 2 : 1;
  const toolsTh = tools
    ? html`<th class="z-rpt__th z-rpt__th--tools" part="toolbar"${span > 1 ? html` rowspan="${span}"` : ""}>${tools}</th>`
    : "";
  const selectTh = selectable ? renderSelectAllHeader(span) : "";

  if (!grouped) {
    return html`<tr>${selectTh}${plan.map((c) => (c.kind === "single" ? cell(c.col, 0, { name: c.col.groupTone }) : "")).join("")}${toolsTh}</tr>`;
  }
  const row1 = plan
    .map((c) => (c.kind === "single" ? cell(c.col, 2, { name: c.col.groupTone }) : renderGroupHead(c, ctx)))
    .join("");
  // 第二行只放「有组」的列：顺序沿 plan（组的先后即列的先后）
  // 组色在这里下传到组内每个列名格：整块表头同色，28 列的表才看得出「这 5 列是一组」。
  const row2 = plan
    .filter((c): c is Extract<HeadCell, { kind: "group" }> => c.kind === "group")
    .flatMap((c) => {
      const tone = groupToneOf(c);
      return c.cols.map((col, i) => cell(col, 0, { name: tone, groupStart: i === 0 }));
    })
    .join("");
  return (
    html`<tr class="z-rpt__headrow z-rpt__headrow--group">${selectTh}${row1}${toolsTh}</tr>` +
    html`<tr class="z-rpt__headrow z-rpt__headrow--cols">${row2}</tr>`
  );
}

// ═══════════════════════════════════════════════════════════
// Body
// ═══════════════════════════════════════════════════════════

export interface RowRenderContext {
  selectable: boolean;
  selectedKeys: string[];
  visible: ReportColumn[];
  leftOffsets: Map<string, number>;
  rightOffsets: Map<string, number>;
  /** 字符串型选中标记（`id:10` / `code:a,b`）的判定，由元素壳解析后注入 */
  isSelectedById?: (row: Record<string, unknown>) => boolean;
  /** 函数型行 class（React 宿主可直接传函数；Vue / 纯 HTML 宿主用 selectedRowId） */
  rowClass?: ((row: Record<string, unknown>, index: number) => string) | null;
  /**
   * 分组上下文：有值时该表的行可能是小计/总计行，需要缩进与折叠按钮。
   *
   * `dims` 是**维度字段名**而不是列 key 的另一套映射 —— 列的 key 本身就是字段名
   * （page 卡的 col 与 metric 也按字段名出 key），多一层映射只会多一处漂移点。
   */
  group?: { dims: string[]; collapsed: ReadonlySet<string> } | null;
  /**
   * 行尾要不要跟一格工具列占位（issue IKQUWH）。
   *
   * [WHY 每行都要这一格] 工具列是表头里的一列（`<th>`），表体每一行都必须有对应 `<td>`，
   * 否则整张表**从第一行起就左移一格**：表头「状态」下面画的是「操作」。
   * 空态行的 `colspan` 同理（见 ReportTable 的 totalCols）。这三处任漏一处 =
   * 表头与表体错位，而错位在肉眼下很像「列顺序配错了」。
   */
  tools?: boolean;
}

export function renderRow(
  row: Record<string, unknown>,
  index: number,
  key: string,
  ctx: RowRenderContext,
  /** 视图行元信息：分组/总计行靠它决定类名、缩进与折叠按钮。平表传 undefined。 */
  meta?: { kind: "data" | "group" | "total"; depth: number; groupKey: string; hasChildren: boolean },
): string {
  const kind = meta?.kind ?? "data";
  const isSelected = ctx.selectedKeys.includes(key) || (ctx.isSelectedById?.(row) ?? false);
  const selectedCls = isSelected ? "z-rpt__row--selected" : "";
  const rowExtra = ctx.rowClass ? ctx.rowClass(row, index) || "" : "";
  const kindCls = kind === "group" ? "z-rpt__row--group" : kind === "total" ? "z-rpt__row--total" : "";
  const firstDim = ctx.group?.dims[0] ?? "";

  const cells = ctx.visible.map((col) => {
    const value = row[col.key];
    const alignCls = `z-rpt__cell--${col.align ?? "left"}`;
    const fixedCls = col.fixed ? `z-rpt__td--fixed-${col.fixed}` : "";

    const styleParts: string[] = [];
    if (col.fixed === "left" && ctx.leftOffsets.has(col.key)) {
      styleParts.push(`left:${ctx.leftOffsets.get(col.key)}px`);
    }
    if (col.fixed === "right" && ctx.rightOffsets.has(col.key)) {
      styleParts.push(`right:${ctx.rightOffsets.get(col.key)}px`);
    }
    // 层级缩进：只作用于**第一个维度列**，与 `<z-report-group-table>` 逐像素一致（10 + 16×(depth-1)）。
    // 总计行不缩进 —— 它不属于任何层级。
    if (meta && kind === "group" && col.key === firstDim && meta.depth > 0) {
      styleParts.push(`padding-left:${10 + (meta.depth - 1) * 16}px`);
    }
    const style = styleParts.length ? ` style="${styleParts.join(";")}"` : "";

    // 折叠按钮放在「这一层自己的那一列」：depth=1 落第 0 个维度列，depth=2 落第 1 个。
    // 恒放第一列的话，二级组的 ▾ 会画在「华东」旁边，点的却是「杭州」—— 看不出折的是哪个组。
    const ownCol = kind === "group" && !!ctx.group && !!meta && ctx.group.dims[meta.depth - 1] === col.key;
    const collapsedNow = !!ctx.group?.collapsed.has(meta?.groupKey ?? "");
    const toggle =
      ownCol && meta?.hasChildren
        ? `<button type="button" class="z-rpt__toggle" data-toggle="${esc(meta.groupKey)}" aria-expanded="${
            collapsedNow ? "false" : "true"
          }" title="${collapsedNow ? "展开" : "折叠"}" part="toggle">${collapsedNow ? "▸" : "▾"}</button>`
        : "";

    // [WHY null 在小计/总计行显示「—」] 聚合不可重算（avg / countDistinct 的小计）时
    // 交上来的是 null；显示空白会读成「这一组分文没有」，而事实是「算不出」。
    const content =
      meta && kind !== "data" && (value === null || value === undefined)
        ? col.numeric
          ? "—"
          : ""
        : col.render
          ? col.render(value, row, index)
          : esc(value);
    // [WHY] 严谨性: 纯文本截断时以 title 提供完整内容, 自定义渲染不做猜测。
    // 内容槽（cellTag）也算自定义：里面画什么由宿主决定，td 上的 title 会和它打架。
    const titleAttr =
      !col.render && !col.cellTag && !(meta && kind !== "data") && (typeof value === "string" || typeof value === "number")
        ? ` title="${esc(String(value))}"`
        : "";
    // [WHY 内容槽先渲染文本、再挂元素] 这是「降级承诺」的落点：标签没注册、宿主少 import
    // 一行、或者元素自己抛错时，格子里至少还是原来那段文本，不会白成一片。
    // 真正的元素由 `mountCellTags()` 在 DOM 落地后替换（字符串模板造不出别的组件的实例）。
    if (col.cellTag) {
      return html`<td class="z-rpt__td ${alignCls} ${fixedCls}"${style}${titleAttr} part="cell" data-cell-tag="${esc(
        col.cellTag,
      )}" data-cell-col="${esc(col.key)}"><span class="z-cell-fallback">${toggle}${content}</span></td>`;
    }
    return html`<td class="z-rpt__td ${alignCls} ${fixedCls}"${style}${titleAttr} part="cell">${toggle}${content}</td>`;
  }).join("");

  // 小计/总计行保留 checkbox 单元格（否则列数与表头不一致，整表错位），但不给勾选框：
  // 「全选」只对数据行有意义，勾上一个算出来的合计行没有对应的数据行可操作。
  const checkboxCell = ctx.selectable
    ? kind === "data"
      ? html`<td class="z-rpt__td z-rpt__td--checkbox z-rpt__td--fixed-left" part="cell">
          <input type="checkbox" class="z-rpt__row-checkbox" data-key="${esc(key)}" ${isSelected ? "checked" : ""} part="row-checkbox" />
        </td>`
      : html`<td class="z-rpt__td z-rpt__td--checkbox z-rpt__td--fixed-left" part="cell"></td>`
    : "";

  // 行尾工具列占位：与表头的工具列同一格（issue IKQUWH），见 RowRenderContext.tools
  const toolsCell = ctx.tools ? html`<td class="z-rpt__td z-rpt__td--tools" part="cell"></td>` : "";

  // [WHY] data-index 记录排序后行序: z-row-click 直接按索引取 _sortedRows, 见 [[REQ-014]]
  return html`<tr class="z-rpt__row ${selectedCls} ${kindCls} ${rowExtra}" part="row" data-row-key="${esc(key)}" data-index="${index}"${
    meta ? ` data-row-kind="${kind}"` : ""
  }>${checkboxCell}${cells}${toolsCell}</tr>`;
}

/**
 * 渲染整个 tbody 的行串（含分组小计/总计行的元信息透传）。
 *
 * [WHY 从 ReportTable 搬过来] 那是纯呈现：把 `ViewRow` 映射成 `renderRow` 的入参，
 * 与排序、分页、选中状态都无关。留在元素壳里既让 1000 行的文件继续变长，
 * 也让「行怎么渲染」散在两处。2026-11-23 随内容槽一起搬入。
 */
export function renderBodyRows(rows: ViewRow[], ctx: RowRenderContext): string {
  return rows
    .map((v) =>
      renderRow(v.values, v.sourceIndex, v.key, ctx, {
        kind: v.kind,
        depth: v.depth,
        groupKey: v.groupKey,
        hasChildren: v.hasChildren,
      }),
    )
    .join("");
}

// ═══════════════════════════════════════════════════════════
// Footer
// ═══════════════════════════════════════════════════════════

export interface FooterRenderContext {
  visible: ReportColumn[];
  data: Record<string, unknown>[];
  footerLabel: string;
  selectable: boolean;
  leftOffsets: Map<string, number>;
  rightOffsets: Map<string, number>;
  /** 行尾工具列占位（issue IKQUWH）：表头多一列，合计行也得有，否则合计行左移一格。 */
  tools?: boolean;
}

export function renderFooter(ctx: FooterRenderContext): string {
  const cells = ctx.visible.map((col, i) => {
    const alignCls = `z-rpt__cell--${col.align ?? "left"}`;
    let content = "";
    // [WHY] 列级合计开关: showFooter === false 时该列合计单元格留空, 编辑态下拉可配置
    if (col.showFooter === false) {
      content = "";
    } else if (col.footerRender) {
      // [WHY 不转义] 模板由列定义作者写（与 col.render 同一可信级别）；footer 那条
      // 纯文本路径仍然 esc —— 两者是「可信模板 / 不可信值」的分界，不是风格差异。
      content = col.footerRender(ctx.data);
    } else if (col.footer !== undefined) {
      content = typeof col.footer === "function"
        ? esc(col.footer(ctx.data))
        : esc(col.footer);
    } else if (i === 0 && ctx.footerLabel !== "") {
      content = esc(ctx.footerLabel);
    }
    // [WHY] 合计行固定列: 与表头/表体同用 _leftOffsets/_rightOffsets, 水平滚动时合计行与冻结列对齐,
    // 见 [[bug-20260810-rpt-header-overlap]] 遗留
    const fixedCls = col.fixed ? `z-rpt__tf--fixed-${col.fixed}` : "";
    const styleParts: string[] = [];
    if (col.fixed === "left" && ctx.leftOffsets.has(col.key)) {
      styleParts.push(`left:${ctx.leftOffsets.get(col.key)}px`);
    }
    if (col.fixed === "right" && ctx.rightOffsets.has(col.key)) {
      styleParts.push(`right:${ctx.rightOffsets.get(col.key)}px`);
    }
    const style = styleParts.length ? ` style="${styleParts.join(";")}"` : "";
    return html`<th class="z-rpt__tf ${alignCls} ${fixedCls}"${style} part="footer-cell">${content}</th>`;
  }).join("");

  const checkboxCell = ctx.selectable
    ? html`<th class="z-rpt__tf z-rpt__tf--checkbox z-rpt__tf--fixed-left" part="footer-cell"></th>`
    : "";
  const toolsCell = ctx.tools ? html`<th class="z-rpt__tf z-rpt__tf--tools" part="footer-cell"></th>` : "";

  return html`
      <tfoot class="z-rpt__foot" part="foot">
        <tr>${checkboxCell}${cells}${toolsCell}</tr>
      </tfoot>
    `;
}

