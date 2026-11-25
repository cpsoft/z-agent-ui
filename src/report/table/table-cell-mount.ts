// 表格宿主的内容槽适配：把「行怎么找、选中怎么判、哪些行跳过」交给共用挂载器。
//
// [WHY 只留一层薄壳] 挂载逻辑（查注册、注入上下文、降级告警）在 `report/core/cell-mount.ts`，
// 甘特左列用的是同一份。这里只回答表格特有的三件事，避免两份 createElement 各自漂移。
import { mountCellTags } from "../core/cell-mount.js";
import type { ReportColumn } from "./report-table-types.js";

export { resetCellTagWarnings, cellPoolSize } from "../core/cell-mount.js";

/** 挂载表格里的内容槽。`data` 是表格的数据数组，按 `data-index` 回查行对象。 */
export function mountTableCells(root: ParentNode, columns: ReportColumn[], data: readonly unknown[]): number {
  return mountCellTags(root, columns, {
    rowElOf: (cell) => cell.closest<HTMLElement>("tr.z-rpt__row"),
    rowOf: (tr) => {
      const i = Number(tr.dataset.index ?? -1);
      return i >= 0 ? ((data[i] as Record<string, unknown>) ?? null) : null;
    },
    // 选中态用行上的修饰类（renderRow 已经算过一遍，不在这里按 selectedKeys 重算）
    selectedOf: (tr) => tr.classList.contains("z-rpt__row--selected"),
    // 分组行/总计行的值是聚合出来的，塞「状态标签」「行内操作组」没有意义，
    // 而且分组行还要保住折叠按钮
    skip: (tr) => {
      const kind = tr.getAttribute("data-row-kind");
      return !!kind && kind !== "data";
    },
  });
}
