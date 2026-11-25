// [WHY] 时间轴区渲染纯函数：双层表头刻度、周末遮罩、today 线、任务行
//（计划条/实际条/summary 条/里程碑菱形）。只输出 HTML 字符串 + data-task-id /
// data-mode 打点，交互（选中/手势）由 Gantt 主类经事件委托接线；
// 手势渲染细节（handle 渐显、拖拽态）由 gantt.css 控制。
// See: wiki/requirements/REQ-018-gantt.md
import { escapeAttr, escapeHtml } from "../../core/index.js";
import { BAR_HEIGHT } from "./layout.js";
import { diffDays, parseDate } from "./date.js";
import type { ArrowPath } from "./arrows.js";
import type { TaskLayout, TimelineHeaderData } from "./types.js";

export interface ChartRenderOptions {
  rowHeight: number;
  showWeekends: boolean;
  /** null = 不渲染 today 线 */
  todayX: number | null;
  /** readonly 时不出手柄、progress 不作拖拽热区 */
  editable: boolean;
  selectedId: string | null;
  /** 依赖箭头 path（Gantt 预计算） */
  arrows: ArrowPath[];
  /** 关键路径任务 id（null = 不高亮） */
  criticalIds: Set<string> | null;
  /** 近关键（总浮时 > 0 且 <= 阈值）任务 id（null = 不高亮） */
  nearCriticalIds?: Set<string> | null;
  /** 虚拟滚动：实际渲染的行切片（缺省渲染全部 rows） */
  visibleRows?: TaskLayout[];
  /** 切片首行行号（translateY 定位用） */
  windowStart?: number;
  /** 全部任务行数（`aria-setsize`；虚拟滚动时 DOM 里只有窗口内那几行） */
  totalRows?: number;
}

/** 双层表头：外层行占 40% 高、内层行占 60% */
export function renderChartHeader(header: TimelineHeaderData, headerHeight: number): string {
  const topH = Math.round(headerHeight * 0.4);
  const bottomH = headerHeight - topH;
  const top = header.top
    .map(
      (t) =>
        `<div class="z-gantt__tick z-gantt__tick--top" style="left:${t.left}px;width:${t.width}px;height:${topH}px">${escapeHtml(t.label)}</div>`,
    )
    .join("");
  const bottom = header.bottom
    .map(
      (t) =>
        `<div class="z-gantt__tick z-gantt__tick--bottom${t.isWeekend ? " z-gantt__tick--weekend" : ""}${t.isToday ? " z-gantt__tick--today" : ""}" style="left:${t.left}px;width:${t.width}px;height:${bottomH}px">${escapeHtml(t.label)}</div>`,
    )
    .join("");
  return `<div class="z-gantt__header-row" style="height:${topH}px">${top}</div><div class="z-gantt__header-row" style="height:${bottomH}px">${bottom}</div>`;
}

export function renderChartGrid(rows: TaskLayout[], header: TimelineHeaderData, opts: ChartRenderOptions): string {
  const weekend = opts.showWeekends
    ? header.bottom
        .filter((t) => t.isWeekend)
        .map((t) => `<div class="z-gantt__weekend" style="left:${t.left}px;width:${t.width}px;height:100%"></div>`)
        .join("")
    : "";
  const today =
    opts.todayX != null
      ? `<div class="z-gantt__today" part="today-line" style="left:${opts.todayX}px;height:100%"></div>`
      : "";
  // [WHY] 行切片容器铺满网格（grid 自身高度即 spacer），滚动时 Gantt 只重写
  // 切片 innerHTML + translateY，不走 requestUpdate（VirtualList 同式，
  // 重渲染会重建滚动容器复位 scrollTop）
  const slice = `<div class="z-gantt__rows"><div class="z-gantt__rows-slice" style="transform:translateY(${(opts.windowStart ?? 0) * opts.rowHeight}px)">${renderChartRows(opts.visibleRows ?? rows, opts)}</div></div>`;
  // [WHY] SVG 覆盖层置于行之上承载依赖箭头与连线临时线；pointer-events:none
  // 保证不挡条形交互。marker 箭头头部经 defs 定义（shadow 内 id 无冲突）
  const arrowPaths = opts.arrows
    .map(
      (a) =>
        `<path class="z-gantt__arrow" d="${escapeAttr(a.d)}" marker-end="url(#z-gantt-arrow-head)"></path>`,
    )
    .join("");
  const overlay =
    `<svg class="z-gantt__arrows" part="arrows" width="${header.totalWidth}" height="${rows.length * opts.rowHeight}">` +
    `<defs><marker id="z-gantt-arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">` +
    `<path d="M0,0 L6,3 L0,6 Z" class="z-gantt__arrow-head"></path></marker></defs>` +
    arrowPaths +
    `<path class="z-gantt__temp-line" data-ref="temp-line" d="" style="display:none"></path>` +
    `</svg>`;
  return `${weekend}${today}${slice}${overlay}`;
}

/** 仅渲染行切片（虚拟滚动窗口变化时由 Gantt 直写 innerHTML 复用） */
export function renderChartRows(rows: TaskLayout[], opts: ChartRenderOptions): string {
  return rows.map((l) => renderRow(l, opts)).join("");
}

function renderRow(l: TaskLayout, opts: ChartRenderOptions): string {
  const selected = opts.selectedId === l.task.id ? " z-gantt__row--selected" : "";
  let inner = "";
  if (l.isMilestone) {
    inner = milestoneHtml(l, opts);
  } else if (l.isSummary) {
    inner = summaryHtml(l, opts);
  } else if (l.width > 0) {
    inner = barHtml(l, opts) + realBarHtml(l) + barConnects(l, opts);
  }
  // [WHY 这里不带 role / aria] 整块右侧时间轴是 `aria-hidden` 的纯可视化
  // （见 gantt-view.ts）。任务行的语义在左列表的 `role="treeitem"` 上：那边有
  // 层级（aria-level）和展开状态（aria-expanded），扁平的条形行表达不了 ——
  // 2026-11-16 实测 `option` 连 `aria-posinset`/`aria-setsize` 都不进无障碍树。
  return `<div class="z-gantt__row${selected}" data-task-id="${escapeAttr(l.task.id)}" style="height:${opts.rowHeight}px">${inner}</div>`;
}

// [WHY] 连线端口圆点挂行而非条形内：.z-gantt__bar overflow:hidden 会把越出
// 条缘的半颗圆点裁掉（[[bug-20260927-gantt-row-anchor]]）；left 直接用条形
// 缘的 chart 坐标（行铺满网格宽，与条形同一坐标系），纵向由 CSS top:50%+
// margin-top:-4px 在行内居中；--end 端口清掉类的 right 规则改由 left 定位
function barConnects(l: TaskLayout, opts: ChartRenderOptions): string {
  if (!opts.editable) return "";
  return (
    `<div class="z-gantt__connect z-gantt__connect--start" data-mode="connect" style="left:${l.x - 4}px"></div>` +
    `<div class="z-gantt__connect z-gantt__connect--end" data-mode="connect" style="left:${l.x + l.width - 4}px;right:auto"></div>`
  );
}

/** critical/near-critical 高亮 class（css-specificity-override lesson：状态类需与基础类并列） */
function criticalClass(l: TaskLayout, opts: ChartRenderOptions): string {
  if (opts.criticalIds?.has(l.task.id)) return " z-gantt__bar--critical";
  if (opts.nearCriticalIds?.has(l.task.id)) return " z-gantt__bar--near-critical";
  return "";
}

/** 条内内容槽的属性串；不配 `barTag` 时为空串，渲染结果与改动前逐字节一致。 */
function barSlotAttrs(l: TaskLayout): string {
  const tag = l.task.barTag;
  if (!tag) return "";
  // `data-cell-value` 说明「.value 取哪个字段」：条上没有列配置，挂载器靠它合成契约
  return ` data-cell-tag="${escapeAttr(tag)}" data-cell-value="name"`;
}

function barHtml(l: TaskLayout, opts: ChartRenderOptions): string {
  // [WHY] 行内元素一律用行相对 top：l.y 是全量绝对坐标，而条形的包含块是
  // position:relative 的 .z-gantt__row，直接写 l.y 会双重偏移（逐行对角下坠，
  // [[bug-20260927-gantt-row-anchor]]）。箭头 SVG/geomMap 仍用绝对坐标
  const top = (opts.rowHeight - BAR_HEIGHT) / 2;
  const color = l.task.color ? `background:${escapeAttr(String(l.task.color))};` : "";
  const progressMode = opts.editable ? ' data-mode="progress"' : "";
  const handles = opts.editable
    ? `<div class="z-gantt__handle z-gantt__handle--start" data-mode="resize-start"></div>` +
      `<div class="z-gantt__handle z-gantt__handle--end" data-mode="resize-end"></div>`
    : "";
  return (
    `<div class="z-gantt__bar${criticalClass(l, opts)}" part="bar" data-task-id="${escapeAttr(l.task.id)}" data-mode="move"` +
    ` style="left:${l.x}px;top:${top}px;width:${l.width}px;${color}">` +
    `<div class="z-gantt__bar-progress"${progressMode} style="width:${l.progress}%"></div>` +
    // 条内内容槽：属性挂在 label 上，几何（left/top/width）与手势仍归 `.z-gantt__bar`
    `<div class="z-gantt__bar-label"${barSlotAttrs(l)}>${escapeHtml(String(l.task.name ?? ""))}${barDaysHtml(l)}</div>` +
    handles +
    `</div>`
  );
}

// [WHY] 条上天数徽标（对齐参考 GanttChart.tsx 的 {days}d 后缀观感）：
// 有起止日期才显示，无日期任务不渲染
function barDaysHtml(l: TaskLayout): string {
  const start = l.task.start_date != null ? String(l.task.start_date) : "";
  const end = l.task.end_date != null ? String(l.task.end_date) : "";
  if (!start || !end) return "";
  const s = parseDate(start);
  const e = parseDate(end);
  if (!s || !e) return "";
  const days = diffDays(s, e) + 1;
  return `<span class="z-gantt__bar-days">${days}d</span>`;
}

function realBarHtml(l: TaskLayout): string {
  if (!l.realWidth) return "";
  // [WHY] realY 为全量绝对坐标，行内 top 需减行顶 l.y（同 barHtml 行相对语义）
  const top = l.realY - l.y;
  return (
    `<div class="z-gantt__bar z-gantt__bar--real" part="bar" data-task-id="${escapeAttr(l.task.id)}" data-mode="move"` +
    ` style="left:${l.realX}px;top:${top}px;width:${l.realWidth}px"></div>`
  );
}

function summaryHtml(l: TaskLayout, opts: ChartRenderOptions): string {
  // summary 条高 10px（淡填充 + 描边胶囊由 CSS 绘制，对齐参考展开态观感；行相对 top）
  const top = (opts.rowHeight - 10) / 2;
  return (
    `<div class="z-gantt__bar z-gantt__bar--summary${criticalClass(l, opts)}" part="bar" data-task-id="${escapeAttr(l.task.id)}" data-mode="move"` +
    ` style="left:${l.x}px;top:${top}px;width:${l.width}px"></div>`
  );
}

function milestoneHtml(l: TaskLayout, opts: ChartRenderOptions): string {
  const size = 14;
  // [WHY] 行相对 top（anchor 未被裁剪，connects 仍留在 anchor 内）
  const top = (opts.rowHeight - size) / 2;
  const color = l.task.color ? ` style="background:${escapeAttr(String(l.task.color))}"` : "";
  // [WHY] anchor 不旋转承载定位/手势命中区，菱形本体内部 rotate(45deg)：
  // connects 若放进旋转坐标系会跟着转导致锚点错位；本体保留 data-task-id/
  // data-mode/part 以兼容选择委托与样式穿透
  const connects = opts.editable
    ? `<div class="z-gantt__connect z-gantt__connect--start" data-mode="connect"></div>` +
      `<div class="z-gantt__connect z-gantt__connect--end" data-mode="connect"></div>`
    : "";
  return (
    `<div class="z-gantt__milestone-anchor" data-task-id="${escapeAttr(l.task.id)}"` +
    ` style="left:${l.x - size / 2}px;top:${top}px;width:${size}px;height:${size}px">` +
    `<div class="z-gantt__milestone${criticalClass(l, opts)}" part="bar" data-task-id="${escapeAttr(l.task.id)}" data-mode="move"${color}></div>` +
    connects +
    `</div>`
  );
}
