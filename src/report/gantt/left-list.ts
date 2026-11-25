// [WHY] 左列表渲染纯函数：列定义借鉴 Table.columns 惯例；首列固定渲染
// 缩进 + 展开/折叠钮 + 名称。行 HTML 与右侧条形行由同一 flatVisible 数据源
// 生成（Gantt.render 单周期），保证左右行数一致不错位。
// See: wiki/requirements/REQ-018-gantt.md
import { escapeAttr, escapeHtml } from "../../core/index.js";
import { normalizeCell } from "../core/cell-spec.js";
import type { FlatRow, GanttListColumn, ZGanttTask } from "./types.js";

export const DEFAULT_COLUMNS: GanttListColumn[] = [
  { key: "name", title: "Task", width: 200 },
  { key: "start_date", title: "Start", width: 90, align: "center" },
  { key: "end_date", title: "End", width: 90, align: "center" },
  { key: "progress", title: "%", width: 60, align: "right" },
];

export function listTotalWidth(columns: GanttListColumn[]): number {
  // [WHY 2026-11-23 L2-P1] 默认宽度不再写在这里（原 `c.width ?? 120`），
  // 统一由 `normalizeCell` 给，见 report/core/cell-spec.ts 的 CELL_DEFAULTS。
  return columns.reduce((s, c) => s + normalizeCell(c).widthPx, 0);
}

function cellText(task: ZGanttTask, key: string): string {
  if (key === "progress") {
    const n = Number(task.progress);
    return `${Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0}%`;
  }
  const v = task[key];
  return v == null ? "" : String(v);
}

export function renderLeftListHeader(columns: GanttListColumn[]): string {
  return columns
    .map((c) => {
      // [WHY] align 的兜底 "left" 留在这里而不是 normalizeCell：甘特左列没有「指标/维度」概念，
      // 默认左对齐是甘特自己的业务判断，通用契约层不猜（见 cell-spec.ts 的 align 注释）。
      const cell = normalizeCell(c);
      return `<div class="z-gantt__th" data-col-key="${escapeAttr(c.key)}" style="width:${cell.widthPx}px;text-align:${cell.align ?? "left"}">${escapeHtml(c.title)}</div>`;
    })
    .join("");
}

export interface LeftListRowsOptions {
  rowHeight: number;
  selectedId: string | null;
  /** childrenOf 来自 buildTree：判断展开钮是否渲染 */
  childrenOf: Map<string, ZGanttTask[]>;
  /** 全部可见行数（`aria-setsize`；虚拟滚动时 DOM 里只有窗口内那几行） */
  totalRows?: number;
  /** 本切片首行的行号（`aria-posinset` = windowStart + 切片内下标 + 1） */
  windowStart?: number;
}

/** 内容槽的属性串（标签 + 列 key）：挂载器靠它找回列配置。 */
function slotAttrs(c: GanttListColumn): string {
  return ` data-cell-tag="${escapeAttr(c.cellTag ?? "")}" data-cell-col="${escapeAttr(c.key)}"`;
}

/** 首列的内联槽：属性挂在内层 span 上，展开钮留在容器这边。 */
function slot(c: GanttListColumn, inner: string): string {
  return `<span${slotAttrs(c)}>${inner}</span>`;
}

export function renderLeftListRows(
  rows: FlatRow[],
  columns: GanttListColumn[],
  opts: LeftListRowsOptions,
): string {
  // [WHY 循环外预算] 下面 rows × columns 会用到每列的宽度，逐格调用 normalizeCell 会重复算；
  // 列数 ≤ 5，但这层每次都渲染整个可见窗口，提到外面只算一遍。
  const norms = columns.map((c) => normalizeCell(c));
  return rows
    .map((r, i) => {
      const t = r.task;
      const selected = opts.selectedId === t.id ? " z-gantt__tr--selected" : "";
      const kids = opts.childrenOf.get(t.id) ?? [];
      const hasKids = kids.length > 0;
      const isExpanded = t.is_expanded !== false;
      const cells = columns
        .map((c, ci) => {
          if (ci === 0) {
            // [WHY] 缩进用 padding 而非独立占位元素：深度只影响首列文本起点，
            // 行选中态仍铺满整格
            const indent = 8 + r.depth * 16;
            // [WHY 展开钮 aria-hidden] 展开状态改为写在行上（`role="treeitem"` 的
            // `aria-expanded`），这个三角只是给鼠标的一个点击热区。键盘用户走
            // 方向键：→ 展开 / ← 收起（APG tree 模式）。两个都暴露会是「同一件事
            // 两个控件」，读屏会念两遍状态。
            const expander = hasKids
              ? `<span class="z-gantt__expander${isExpanded ? " z-gantt__expander--open" : ""}" data-task-id="${escapeAttr(t.id)}" part="expander" aria-hidden="true"></span>`
              : `<span class="z-gantt__expander z-gantt__expander--leaf" aria-hidden="true"></span>`;
            // 内容槽只替换「名字」这一块：展开钮是树的控制件，归容器所有，
            // 交给 cell 画的话，换掉一个名字就顺手把整棵树的折叠能力删了。
            const nameHtml = c.cellTag
              ? slot(c, `<span class="z-cell-fallback">${escapeHtml(t.name ?? "")}</span>`)
              : escapeHtml(t.name ?? "");
            return `<div class="z-gantt__td" style="width:${norms[ci].widthPx}px;padding-left:${indent}px"><div class="z-gantt__name">${expander}${nameHtml}</div></div>`;
          }
          const text = `<span class="z-cell-fallback">${escapeHtml(cellText(t, c.key))}</span>`;
          return `<div class="z-gantt__td${c.cellTag ? " z-gantt__td--slot" : ""}"${c.cellTag ? slotAttrs(c) : ""} style="width:${norms[ci].widthPx}px;text-align:${norms[ci].align ?? "left"}">${c.cellTag ? text : escapeHtml(cellText(t, c.key))}</div>`;
        })
        .join("");
      // [WHY 这里才是无障碍树里的主体] 上一版把「一行」的角色挂在右侧时间轴的行上，
      // 左侧这份 `aria-hidden`。但层级（depth）和展开状态只有左侧这份有 ——
      // 时间轴上的行是扁平条形，`role="option"` 根本表达不了 `aria-expanded`。
      // 现在反过来：左侧 = `treeitem`（有 level / expanded / selected），
      // 右侧时间轴 = `aria-hidden` 的纯可视化。
      const item =
        ` role="treeitem" id="z-gantt-item-${escapeAttr(t.id)}"` +
        ` aria-level="${r.depth + 1}"` +
        (hasKids ? ` aria-expanded="${isExpanded ? "true" : "false"}"` : "") +
        ` aria-selected="${opts.selectedId === t.id ? "true" : "false"}"` +
        (opts.totalRows != null ? ` aria-setsize="${opts.totalRows}" aria-posinset="${(opts.windowStart ?? 0) + i + 1}"` : "");
      return `<div class="z-gantt__tr${selected}"${item} data-task-id="${escapeAttr(t.id)}" style="height:${opts.rowHeight}px">${cells}</div>`;
    })
    .join("");
}
