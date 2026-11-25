// 列 / 单元格的统一契约：一份类型、一份默认值、一处解析。
//
// [WHY 2026-11-23 L2-P1] 拆前有两套列类型（`ReportColumn` 25 字段 / `GanttListColumn` 4 字段），
// 默认宽度 120 在 4 处各写一遍（`gantt/left-list.ts` 三处 + `table/table-render.ts` 一处）。
// 改默认值时漏改一处不会报错，只表现为「两张表宽度不一致」—— 与 silent-degradation 同一类。
// See: architecture/l2-decompose-plan.html §6.1 复用矩阵、§7 组合协议第 7 条

export type CellAlign = "left" | "center" | "right";

/**
 * 列 / 单元格的公共契约。表格 `columns[]`、甘特左列 `columns[]`、
 * 甘特条 label、详情表单 `fields[]` 都收敛到它。
 *
 * [WHY 宽度允许 number | string] 表格侧历史上写 `"120px"`，配置 JSON 里又常写 `120`。
 * 两种都得认 —— `parsePx` 对纯数字字符串会返回 0，若这里只声明 string，
 * 宿主传 number 时类型报错、运行时静默退化成默认宽度（宽度不生效是最难察觉的一类）。
 */
export interface CellSpec {
  key: string;
  title: string;
  width?: number | string;
  align?: CellAlign;
  hidden?: boolean;
  group?: string;
  /**
   * 内容槽：自定义元素标签名（P3 起真正 mount）。
   * 缺省 = 内置文本渲染 —— 这就是默认方案：不配也能出表，配错也只退化成朴素版本。
   */
  cellTag?: string;
  cellProps?: Record<string, unknown>;
}

/** 唯一的默认值来源。宿主与容器里不要再写 `?? 120`（见 §8 验收指标：默认值守卫）。 */
export const CELL_DEFAULTS = {
  width: 120,
} as const;

export interface NormalizedCell {
  /** 像素宽度，已含默认值 */
  widthPx: number;
  /**
   * 原样透传。
   *
   * [WHY 不在这里按 format / 数值推断对齐] 方案初稿写过「数值列默认右对齐」，实装时否掉了：
   * 表格侧已有更准的来源 —— 调用方按「指标 right / 维度 left」传 def，且 `colFormats` 还能覆盖
   * （`core/report-columns.ts:colAlign`）。在这里按格式猜会盖掉那个语义，且猜错不报错，
   * 只表现为「这一列看着别扭」。通用层只补「从 spec 自身一定能推出」的默认值，业务语义留给消费方。
   */
  align?: CellAlign;
  /** 内容渲染方式。本批恒为 text；P3 起 tag 才会真正创建元素。 */
  renderer: { kind: "text" } | { kind: "tag"; tag: string };
}

/**
 * 把 `120` / `"120px"` 解析成像素数；认不出的一律返回 0，由调用方决定回落。
 *
 * [WHY 接受 number] 列宽来自配置 JSON，调用方写 `width: 120` 很自然；
 * 只认字符串时 `.match` 直接 TypeError，且抛在 render 里 ⇒ 整张表消失
 * （比"宽度不生效"严重得多）。原实现见 `table/report-table-types.ts`，2026-11-23 迁入本文件。
 */
export function parsePx(v: string | number | undefined | null): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const m = String(v).match(/^(\d+(?:\.\d+)?)px$/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * 归一化一格：目前只补宽度。
 *
 * [WHY 只做这些] 契约要预留 `cellTag`（P3）的位置，但不能凭空造默认值 ——
 * 每多一个"智能推断"，就多一处静默猜错的可能。宽度是纯布局（猜错只挤一点），
 * 所以它可以有默认；对齐与格式都带业务语义，留空就是留空。
 */
export function normalizeCell(spec: CellSpec): NormalizedCell {
  const widthPx = parsePx(spec.width) || CELL_DEFAULTS.width;
  return {
    widthPx,
    align: spec.align,
    renderer: spec.cellTag ? { kind: "tag", tag: spec.cellTag } : { kind: "text" },
  };
}
