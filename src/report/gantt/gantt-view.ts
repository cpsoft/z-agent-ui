// [WHY] 甘特图视图纯渲染：布局 → geomMap → 依赖箭头 → 关键路径 → 虚拟窗口 →
// 双栏 HTML 骨架。只产出 HTML 字符串与渲染产物（供宿主缓存/滚动控制器复用），
// 交互（选中/手势/右键）全部由宿主事件委托接线；行窗口计算经 windowFor 回调
// 注入（overscan 常量与行高语义归滚动控制器，本模块不重复实现）。
// See: wiki/requirements/REQ-018-gantt.md
import { COPY, escapeAttr, html } from "../../core/index.js";
import { computeArrowPaths, type BarGeometry } from "./arrows.js";
import { renderChartGrid, renderChartHeader, type ChartRenderOptions } from "./chart-render.js";
import { computeCriticalPath } from "./critical-path.js";
import { BAR_HEIGHT, computeTaskLayouts, dateToPixels, getVisibleRange } from "./layout.js";
import { listTotalWidth, renderLeftListHeader, renderLeftListRows } from "./left-list.js";
import { generateTimelineHeaderData } from "./timeline.js";
import type { GanttListColumn, GanttTree, TaskLayout, ZGanttData, ZGanttViewMode } from "./types.js";

/** 键盘提示节点的 id。每个甘特实例有自己的 shadow 树，固定 id 不会互相撞。 */
const HintId = "z-gantt-kbd-hint";
/**
 * tree 节点的 id。
 *
 * [WHY 必须有 id] `BaseElement` 每次重渲染都整块替换 `shadow.innerHTML`，靠
 * `focusKeyOf()` 记下焦点节点的「键」再找回来。取键顺序是
 * `data-focus-key` → `data-field` → `id` → `name`，**三条都落空就不恢复焦点**。
 * 这个 tree 既不是字段也没有 name，没 id 的话：按一下方向键 → 重渲染 → 焦点掉到
 * body，键盘用户按一次就得重新 Tab 回来一次。
 */
const TreeId = "z-gantt-tree";
/**
 * 播报节点（`role="status"`）的 id。
 *
 * [WHY 与提示节点分开] 提示是**静态**的（aria-describedby 一次性念），播报是
 * **动态**的（连线起点、拒绝原因）。合成一个节点的话，每次改 textContent 都会把
 * 描述文本一起换掉，描述就丢了。
 */
export const GANTT_STATUS_ID = "z-gantt-status";

export interface GanttViewInput {
  data: ZGanttData;
  /** 已解析缺省的列定义（空数组时宿主给 DEFAULT_COLUMNS） */
  columns: GanttListColumn[];
  today: Date;
  viewMode: ZGanttViewMode;
  dayWidth: number;
  rowHeight: number;
  headerHeight: number;
  showWeekends: boolean;
  showToday: boolean;
  showCriticalPath: boolean;
  selectedId: string | null;
  /** readonly 取反：控制手柄/连线端口/progress 热区是否渲染 */
  editable: boolean;
  /** render 前捕获的纵向滚动位置（虚拟窗口定位用） */
  pendingScrollTop: number;
  bodyClientHeight: number;
  /** 行窗口计算（宿主注入滚动控制器实现） */
  windowFor: (scrollTop: number, viewH: number, total: number) => [number, number];
}

export interface GanttViewOutput {
  html: string;
  rows: TaskLayout[];
  tree: GanttTree;
  range: { start: Date; end: Date };
  /** 渲染参数快照（scroll-controller rewindow 重写切片时复用同一份） */
  chartOpts: ChartRenderOptions;
  winStart: number;
  winEnd: number;
}

export function renderGanttView(input: GanttViewInput): GanttViewOutput {
  const { data, columns, today, viewMode, dayWidth, rowHeight, headerHeight } = input;
  const range = getVisibleRange(data.tasks, today, 2);
  const header = generateTimelineHeaderData(range.start, range.end, viewMode, dayWidth, today);
  const { rows, tree } = computeTaskLayouts(data.tasks, {
    rangeStart: range.start,
    dayWidth,
    rowHeight,
  });

  const todayX = input.showToday ? dateToPixels(today, range.start, dayWidth) + dayWidth / 2 : null;
  const listW = listTotalWidth(columns);

  // [WHY] 箭头/关键路径在渲染期从布局派生：几何与条形渲染同源，
  // 折叠/缩放/拖拽提交后自然重算，无独立状态需同步
  const geomMap = new Map<string, BarGeometry>();
  for (const l of rows) {
    geomMap.set(
      l.task.id,
      l.isMilestone
        ? { x: l.x - 7, width: 14, centerY: l.y + rowHeight / 2 }
        : { x: l.x, width: l.width, centerY: l.y + (rowHeight - BAR_HEIGHT) / 2 + BAR_HEIGHT / 2 },
    );
  }
  const deps = data.dependencies ?? [];
  const arrows = computeArrowPaths(deps, (id) => geomMap.get(id) ?? null);
  // 全量 CPM：critical（float<=0）与 near-critical（0<float<=阈值）两组
  const cp = input.showCriticalPath ? computeCriticalPath(data.tasks, deps) : null;
  const criticalIds = cp?.critical ?? null;
  const nearCriticalIds = cp?.nearCritical ?? null;

  // [WHY] 虚拟滚动窗口：无布局环境（clientHeight=0，如 happy-dom/首帧）回退全量，
  // 保证行始终可见；渲染参数缓存供滚动控制器 rewindow 复用
  const total = rows.length;
  const [winStart, winEnd] = input.windowFor(input.pendingScrollTop, input.bodyClientHeight, total);
  const visibleRows = rows.slice(winStart, winEnd);
  const chartOpts: ChartRenderOptions = {
    rowHeight,
    showWeekends: input.showWeekends,
    todayX,
    editable: input.editable,
    selectedId: input.selectedId,
    totalRows: total,
    arrows,
    criticalIds,
    nearCriticalIds,
  };

  const out = html`
    <div class="z-gantt" part="base">
      <!-- [WHY 角色挂在左侧列表体上，不挂在宿主上] aria-activedescendant 是 IDREF，
           2026-11-16 Chrome 141 实测：宿主引不到自己影子树里的 id（无障碍树里连这个
           属性都不出现，最小复现同样为空）。带 role 的元素必须和 treeitem 待在
           同一棵树里 —— 只能是 shadow 内部这个列表体，焦点也跟着落在这里。
           注意：模板字符串里的注释不能写反引号，会把模板截断（这里踩过一次）。 -->
      <!-- [WHY 提示与播报是 tree 的兄弟，不是子节点] role=tree 的直接拥有者只能是
           treeitem / group：把静态提示塞进去，无障碍树里就多出一个非选项子节点。
           两者同在影子树内，aria-describedby 照常解析（上一轮实测过：同一棵树内的
           IDREF 有效，跨 shadow 才失效）。注意注释里不能写反引号，会截断模板。 -->
      <span class="z-gantt__sr-only" id="${HintId}">${COPY.ganttKeyboardHint}${
        input.editable ? "；" + COPY.ganttEditHint : ""
      }</span>
      <span class="z-gantt__sr-only" id="${GANTT_STATUS_ID}" role="status"></span>
      <div class="z-gantt__list" part="list" style="width:${listW}px">
        <div class="z-gantt__list-header" part="list-header" aria-hidden="true" style="height:${headerHeight}px">
          ${renderLeftListHeader(columns)}
        </div>
        <div
          class="z-gantt__list-body"
          part="list-body"
          id="${TreeId}"
          role="tree"
          tabindex="0"
          aria-label="${escapeAttr(COPY.gantt)}"
          aria-describedby="${HintId}"
        >
          <!-- [WHY 两层包裹都标 presentation] 虚拟滚动把可见行包在「撑高度的占位层 +
               位移切片」里，treeitem 因此不是 tree 的直接子节点。ARIA 要求 tree 只拥有
               treeitem / group；把这两层去掉语义，拥有关系就重新落在 tree 上。 -->
          <div class="z-gantt__list-space" role="presentation" style="height:${total * rowHeight}px">
            <div class="z-gantt__list-slice" role="presentation" style="transform:translateY(${winStart * rowHeight}px)">
              ${renderLeftListRows(visibleRows, columns, {
                rowHeight,
                selectedId: input.selectedId,
                childrenOf: tree.childrenOf,
                totalRows: total,
                windowStart: winStart,
              })}
            </div>
          </div>
        </div>
      </div>
      <!-- [WHY 右侧时间轴 aria-hidden] 它和左侧是同一批任务的两次渲染，右侧只有条形与
           日期刻度。层级与展开状态只存在于左侧（treeitem 的 level/expanded），
           读屏把两份都念一遍会让人以为有两倍任务。 -->
      <div class="z-gantt__chart" part="chart" aria-hidden="true">
        <div class="z-gantt__header" part="header" style="height:${headerHeight}px">
          <div class="z-gantt__header-inner" style="width:${header.totalWidth}px">
            ${renderChartHeader(header, headerHeight)}
          </div>
        </div>
        <div class="z-gantt__body" part="body">
          <div
            class="z-gantt__grid"
            style="width:${header.totalWidth}px;height:${Math.max(total * rowHeight, 0)}px"
          >
            ${renderChartGrid(rows, header, {
              ...chartOpts,
              visibleRows,
              windowStart: winStart,
            })}
          </div>
        </div>
      </div>
    </div>
  `;

  return { html: out, rows, tree, range, chartOpts, winStart, winEnd };
}
