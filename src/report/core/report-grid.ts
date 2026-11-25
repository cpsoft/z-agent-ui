// 报表栅格几何与密度（M9：12 / 24 列）
//
// [为什么几何要单独成文件] Reports.tsx 里原本散着 `GRID_COLS` 常量与三处内联的
// `(rect.width - GAP*(COLS-1))/COLS`。改成「按报表声明密度」之后，同一个算式如果还在
// 组件里就地写，24 列报表会出现「拖拽按 24 吸附、渲染按 12 铺格」这种半新半旧的错位，
// 且只在 24 列报表上复现。这里集中成一个纯模块，组件只允许调函数，不允许再写算式。
//
// [为什么不迁移存量数据] x/w 的语义是「第几列 / 占几列」而不是像素。存量报表
// gridCols 缺省 12，`x:3,w:6` 仍然是「第 3 列起占 6 列」，一个字节都不用改。
import type { ReportCellLayout, ReportConfig } from "./types.js";

/** 栅格密度：列数。缺省 12 = 存量报表行为完全不变 */
export type GridCols = 12 | 24;

export const GRID_COLS_DEFAULT: GridCols = 12;
/** 栅格间距（px） */
export const GRID_GAP = 8;
/** 每行高度（px） */
export const ROW_H = 56;
/** 行跨度上限 */
export const MAX_H = 30;

/** 读取报表声明的栅格密度。非 24 一律按 12（不做白名单报错，防一次灰度不同步就整表不渲染） */
export function gridColsOf(cfg?: Pick<ReportConfig, "gridCols"> | null): GridCols {
  return cfg?.gridCols === 24 ? 24 : GRID_COLS_DEFAULT;
}

/** 单列像素宽（容器内容区 / 画布都走这一个入口） */
export function colWidth(boardWidth: number, cols: number, gap = GRID_GAP): number {
  if (cols <= 0) return 0;
  return Math.max(0, (boardWidth - gap * (cols - 1)) / cols);
}

/** n 个逻辑列 → 像素宽 */
export function spanPx(n: number, colW: number, gap = GRID_GAP): number {
  return n <= 0 ? 0 : n * colW + (n - 1) * gap;
}

/** 像素位移 → 吸附列数（四舍五入；用于拖拽/缩放的位移换算）
 *
 *  [为什么 colW ≤ 0 直接返回 0] 画布还没测量到宽度时（首帧 / 隐藏 tab），colW 是 0，
 *  但 gap 仍有 8 —— 用 gap 当步长会把 84px 的位移算成 11 格，第一笔拖动就把卡甩到右边界。 */
export function snapSpan(deltaPx: number, colW: number, gap = GRID_GAP): number {
  if (colW <= 0) return 0;
  return Math.round(deltaPx / (colW + gap));
}

/** 跨报表复制：列跨度按密度比换算，向上取整（12→24 时 w×2，24→12 时 w/2 且不缩没） */
export function rescaleSpan(n: number, from: GridCols, to: GridCols): number {
  if (from === to) return Math.max(1, n);
  return Math.max(1, Math.ceil((n * to) / from));
}

/** 跨报表复制：起始列按密度比换算并夹在界内（否则换算后可能 x+w > to，卡跑到画布外） */
export function rescaleOffset(n: number, from: GridCols, to: GridCols): number {
  if (from === to) return Math.max(0, n);
  return Math.max(0, Math.round((n * to) / from));
}

/** 跨报表复制卡片时的布局换算（宽高比保持，位置按比例） */
export function rescaleLayout(l: ReportCellLayout, from: GridCols, to: GridCols): ReportCellLayout {
  const w = rescaleSpan(l.w, from, to);
  const x = Math.min(rescaleOffset(l.x, from, to), Math.max(0, to - w));
  return { ...l, x, w };
}

/** 夹到栅格内：x ≥ 0、w ≥ 1、x+w ≤ cols、h ≥ 1 且 ≤ MAX_H */
export function clampLayout(l: ReportCellLayout, cols: number): ReportCellLayout {
  const w = Math.min(Math.max(1, Math.round(l.w)), cols);
  const x = Math.min(Math.max(0, Math.round(l.x)), cols - w);
  const h = Math.min(Math.max(1, Math.round(l.h)), MAX_H);
  const y = Math.max(0, Math.round(l.y));
  return { ...l, x, y, w, h };
}

/** 默认 cell 布局：双列瀑布，宽 = 半幅。12 列 → 6×3；24 列 → 12×3（比例一致） */
export function defaultLayout(i: number, cols: number = GRID_COLS_DEFAULT): ReportCellLayout {
  const w = Math.floor(cols / 2);
  return { x: (i % 2) * w, y: Math.floor(i / 2) * 3, w, h: 3 };
}

/** 筛选器卡默认布局：一幅三分之一宽、1 行高，三张横排。12 列 → 4×1；24 列 → 8×1 */
export function defaultFilterLayout(y: number, i: number, cols: number = GRID_COLS_DEFAULT): ReportCellLayout {
  const w = Math.floor(cols / 3);
  return { x: (i % 3) * w, y: y + Math.floor(i / 3), w, h: 1 };
}

/** 容器默认布局：整幅宽、6 行高（够放一张 3 行卡 + 标题） */
export function defaultContainerLayout(y: number, cols: number = GRID_COLS_DEFAULT, h = 6): ReportCellLayout {
  return { x: 0, y, w: cols, h };
}
