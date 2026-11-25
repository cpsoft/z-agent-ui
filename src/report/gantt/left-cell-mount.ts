// 甘特宿主的内容槽适配：与表格共用 `report/core/cell-mount.ts`。
//
// [WHY 单独一层] 甘特有**两个**写 DOM 的地方：整棵 shadow 重建（`gantt-view`）与
// 虚拟滚动的切片替换（`scroll-controller`）。两处都必须挂一次内容槽，否则滚动一下
// 窗口里的自定义元素就消失（字符串里只剩兜底文本）—— 而界面看起来只是「滚动后变朴素了」。
import { mountCellTags } from "../core/cell-mount.js";
import type { GanttListColumn, ZGanttTask } from "./types.js";

export { resetCellTagWarnings, cellPoolSize } from "../core/cell-mount.js";

/**
 * 在一个渲染根里挂载左列内容槽。
 *
 * @param taskOf 任务 id → 任务对象。整树重建时通常闭包 `data.tasks`，
 *   切片替换时用当前切片建一张小表（切片只有一屏，查表比重建索引便宜）。
 */
/**
 * 挂载条内内容槽（`task.barTag`）。
 *
 * 与左列同一份挂载器：条没有列配置，`data-cell-value="name"` 让挂载器合成最小契约。
 * 行元素取 `.z-gantt__bar`（它带 `data-task-id`），选中态取所在时间轴行。
 */
export function mountGanttBars(
  root: ParentNode,
  taskOf: (id: string) => ZGanttTask | null,
  selectedId?: string | null,
): number {
  return mountCellTags(root, [], {
    rowElOf: (cell) => cell.closest<HTMLElement>(".z-gantt__bar[data-task-id]"),
    rowOf: (bar) => (taskOf(bar.dataset.taskId ?? "") as unknown as Record<string, unknown>) ?? null,
    // 条的稳定标识就是任务 id：滚动换窗口时同一任务会离场再回来，靠它把元素还回去
    keyOf: (bar) => bar.dataset.taskId ?? "",
    selectedOf: (bar) =>
      !!selectedId && !!bar.closest(`.z-gantt__row[data-task-id="${cssEscape(selectedId)}"]`),
  });
}

/** 属性选择器里的 id 可能带引号/空格：转义一下，别让挂载把整块 DOM 抛错吞掉。 */
function cssEscape(v: string): string {
  return v.replace(/["\\]/g, "\\$&");
}

export function mountGanttCells(
  root: ParentNode,
  columns: GanttListColumn[],
  taskOf: (id: string) => ZGanttTask | null,
  selectedId?: string | null,
): number {
  return mountCellTags(root, columns, {
    rowElOf: (cell) => cell.closest<HTMLElement>(".z-gantt__tr[data-task-id]"),
    rowOf: (row) => {
      const id = row.dataset.taskId ?? "";
      // `mountCellTags` 要求 Record；task 是接口对象，取值语义一致
      return (taskOf(id) as unknown as Record<string, unknown>) ?? null;
    },
    // 行下标：优先用 `aria-posinset`（虚拟滚动里它是**全局**可见序 + 1），
    // 没有就退回同一批行里的次序 —— 甘特行不像表格那样带 `data-index`。
    indexOf: (row) => {
      const pos = Number(row.getAttribute("aria-posinset"));
      if (Number.isFinite(pos) && pos > 0) return pos - 1;
      const siblings = row.parentElement ? Array.from(row.parentElement.children) : [];
      return siblings.indexOf(row);
    },
    selectedOf: (row) => !!selectedId && row.dataset.taskId === selectedId,
    // 行 key 用任务 id：甘特没有 `data-row-key` / `data-index`，不显式给就没法池化
    keyOf: (row) => row.dataset.taskId ?? "",
  });
}
