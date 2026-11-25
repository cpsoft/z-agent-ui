// 内容槽元素的默认基类：`columns[].cellTag` / `task.barTag` 指向的元素继承它即可。
//
// [WHY 需要它] cell 契约要求四个注入字段是「赋值即重绘」的响应式属性
// （见 `report/core/cell-mount.ts` 的 `CellContext`）。手写这四个
// `@property({ attribute: false })` 是每格 12 行样板 —— 而**写漏一行的代价是静默的**：
// 写成普通字段照样显示内容，只是值变了元素不重绘（排序/翻页后停在旧值）。
// 让「默认写法」与「正确写法」重合，比在文档里提醒三遍可靠。
//
// [WHY 不并入 `report/core` 的 barrel] 那个出口承诺「零框架依赖、不碰 DOM」，
// 而本类继承 `BaseElement`。走子路径 `z-agent-ui/report/cell`，与 `report/core/*`
// 按需引是同一套约定。
import { BaseElement, property } from "../../core/index.js";
import type { CellContext } from "../core/cell-mount.js";
import cellCSS from "./base-cell.css?raw";

/**
 * 内容槽元素基类：宿主只需实现 `render()`。
 *
 * ```ts
 * class StatusCell extends BaseCell {
 *   render(): string {
 *     return html`<z-badge variant="${toneOf(this.value)}">${this.value}</z-badge>`;
 *   }
 * }
 * // 注册与其它元素一样（customElements.define），然后
 * // columns = [{ key: "status", cellTag: "my-status-cell" }]
 * ```
 *
 * 四个字段由容器注入，**不要**在子类里重复声明成普通字段盖掉它们 ——
 * 那会退回「只在挂载时画一次」。
 */
export abstract class BaseCell extends BaseElement implements CellContext {
  /**
   * 默认盒：撑满格子（见 `base-cell.css` 里两种宿主的差别）。
   *
   * 子类要加自己的样式时**别直接覆盖**：`static styles` 是静态字段，覆盖会把这一条
   * 一起丢掉，症状是「在表格里正常、到甘特里进度条塌成一条线」。
   * 正确写法：`static styles = [BaseCell.styles, myCSS]`（基类允许数组拼接）。
   */
  static styles = cellCSS;

  /** 本格的值（表格取 `row[column.key]`；条内槽取 `data-cell-value` 指定的字段）。 */
  @property({ attribute: false }) value: unknown = "";
  /** 整行数据（表格是原行；甘特是 task）。 */
  @property({ attribute: false }) row: Record<string, unknown> = {};
  /** 行下标（表格用源数据下标，与 `data-index` 一致）。 */
  @property({ attribute: false }) index = -1;
  /** 该行当前是否选中。 */
  @property({ attribute: false }) selected = false;
}
