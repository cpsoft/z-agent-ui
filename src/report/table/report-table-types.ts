import { escapeAttr } from "../../core/index.js";
import type { CellSpec } from "../core/cell-spec.js";

// [WHY] 2026-10-25 系统审计：从 ReportTable.ts（1058 行）按职责拆出
// 职责：报表表格的公开类型（列定义/列格式/排序/配置快照）与无状态工具（HTML 转义/px 解析/行 key）。
// 说明：本文件无 DOM/无元素引用，仅类型与纯函数，可被渲染层与交互层共用。

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

/**
 * 表格列 = 公共契约 `CellSpec` + 表格专属字段。
 *
 * [WHY 2026-11-23 L2-P1 改成 extends] 拆前表格与甘特各有一套列类型，默认宽度 120 各写一遍。
 * 现在 key / title / width / align / hidden / group 只有一个定义处（`report/core/cell-spec.ts`），
 * 甘特左列、甘特条 label、详情表单字段共用同一份契约。
 */
export interface ReportColumn extends CellSpec {
  /**
   * 分组表头的组名（issue IKX0CE P1-5）。
   *
   * [WHY 在列上而不是单独的组列表] 组列必须与可见列**同序同步**：列被隐藏、被拖序、
   * 被列设置清掉，组都得跟着变。另存一份 `[{title, keys[]}]` 就是两份真相，
   * 而漂移的症状是「组头写在 A 列上、组里其实是 B 列」。
   *
   * 相邻且同名的列合成一个 `colspan` 格（跨列不能跳过，所以同名但不相邻 = 两个组头）。
   *
   * [WHY 这里重复声明 group] 语义在 `CellSpec.group`，但组头的 colspan 规则只对表格成立，
   * 甘特左列没有分组概念 —— 说明留在表格侧，契约层只留字段。
   */
  group?: string;
  /**
   * 组头的色相（`col group-tone=blue`）。
   *
   * [WHY 色相挂在列上、跟 group 同一个位置] 一个组横跨几列，颜色是「这一组的属性」，
   * 单独存一份组→色表就又回到「两处声明会漂移」的老问题；挂在列上，组色随组头
   * 自动跟着列序/隐藏走。同一个组里各列写不同色时取**第一列**的（组头只有一格）。
   *
   * 只认 z-agent-ui 色板里的色相名（blue / purple / green / yellow / red / gray）——
   * 这些是「分类色」，回答「这是哪一组」，与 danger/success 那套「要不要处理」
   * 的语义色是两回事，不能混用（把「订货组」染成 danger 会让人以为订货出事了）。
   */
  groupTone?: string;
  // [WHY] 必选字段: 用户不可在列选择器中取消勾选, 隐藏操作对其无效
  required?: boolean;
  // [WHY] 列级合计显隐: false 时该列合计单元格留空, 编辑态表头下拉可配置
  showFooter?: boolean;
  sortable?: boolean;
  /** 字段口径说明：表头列名后的「?」角标，悬停出提示（业务含义 / 计算口径 / 空值语义）。
   *  [WHY 角标而不是 th 的 title] title 必须悬停整格才出、样式不可控、无键盘路径；
   *  角标把「这里能查口径」变成看得见的信息，提示走 z-tooltip（fixed 顶层），
   *  不受表头 sticky / 容器 overflow-x 裁切影响。
   *  [WHY 角标 aria-hidden + 另挂隐藏副本] 角标不进 tab 序列（表头本身已是排序的停靠点）；
   *  口径文本另渲染一份 .z-rpt__sr-only 副本（在 th 之外），由 th 的 aria-describedby 指过去。 */
  tip?: string;
  minWidth?: string;
  maxWidth?: string;
  fixed?: "left" | "right";
  resizable?: boolean;
  // [WHY] 数字列标记: 编辑态表头菜单额外显示"小数位/千分位"格式项, 文本列不显示避免误导
  numeric?: boolean;
  render?: (value: unknown, row: Record<string, unknown>, index: number) => string;
  footer?: string | ((data: Record<string, unknown>[]) => string);
}

// [WHY] 列单元格格式: 纯展示层配置, 仅影响单元格文本渲染, 与数据/SQL 无关。
// 组件只负责菜单 UI 与状态上报(z-column-format-change), 持久化由外部(React)负责 ——
// 格式进了报表配置就不能有两个真相源。
export interface ReportColFormat {
  /** 小数位 0-4；undefined = 保持原始值 */
  decimalPlaces?: number;
  /** 千分位分隔；undefined = 关 */
  thousands?: boolean;
  /** 格式类型: 数值 / 百分数。百分数按 Excel 语义 值×100 加 %（0.93628 → 93.63%） */
  formatType?: "number" | "percent";
}

export interface SortEntry {
  key: string;
  dir: "asc" | "desc";
}

// [WHY] 表格配置快照: 由外部持久化(本地存储/服务器), 组件不负责保存
export interface TableConfig {
  columns: {
    key: string;
    hidden?: boolean;
    width?: number | null;
    align?: "left" | "center" | "right" | null;
    showFooter?: boolean;
    // [WHY] 冻结状态纳入快照: 编辑态冻结列重启后恢复, 见 [[2026-08-10-rpt-freeze]]
    fixed?: "left" | "right" | null;
  }[];
  sortState?: SortEntry[];
  // [WHY] 外观属性纳入快照: 刷新后条纹/边框/密度/线型同样恢复, 见 W6 walkthrough residual
  striped?: boolean;
  bordered?: boolean;
  size?: "sm" | "md";
  /**
   * 三线表开关。
   *
   * [WHY 快照里仍叫 `variant`] 这是**持久化格式**：别人的 localStorage / 接口里存着
   * `variant: "lines"`。组件属性改名成 `lines` 之后，快照键保留旧名并继续双向映射，
   * 这样老快照照样能恢复；等确认没有存量数据后再改键名。
   */
  variant?: "default" | "lines";
  /** 新写法（与 `variant` 同义，优先） */
  lines?: boolean;
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

export { escapeAttr as esc };

// [WHY 2026-11-23 L2-P1 迁到 core] 甘特左列与表格都要解析列宽，实现只留一份（`report/core/cell-spec.ts`）。
// 这里 re-export 而不是改所有调用方：既有 `from "./report-table-types.js"` 的 import 有 20 多处。
export { parsePx } from "../core/cell-spec.js";

/** [WHY] 行 key 解析: rowKey 命中且非空时用字段值, 否则退化为排序后索引(渲染与选择必须同源) */
export function rowKeyOf(row: Record<string, unknown>, index: number, rowKey: string): string {
  if (rowKey && row[rowKey] != null) return String(row[rowKey]);
  return String(index);
}
