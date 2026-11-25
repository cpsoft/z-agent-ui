// 几何构建的共用契约：BuildContext 与进度插值工具。
// [WHY 独立成文件] 七个图形族的构建器都要它，放在任一族里都会让其余六族反向依赖那一族。
import type { MapRegion, MapValue, StackMode } from "../types.js";

export interface BuildContext {
  showGrid: boolean;
  /** 堆积方式（本地补丁 2026-10-22）。none 时全部走原来的并排分支。 */
  stack: StackMode;
  /**
   * 参考线（issue IKTM1J）：横向虚线 + 右端标签，挂在**左轴**值域上。
   * 「日目标 7,600」「单次均值 3,289」这类判读基准。
   */
  markline?: number;
  marklineLabel?: string;
  /** 强调某一根柱/点：first / last / max / min（订货页「最近一单」高亮）。 */
  markpoint?: string;
  /**
   * 缺数断线（issue IKTM1J）：折线系列的 null/空值产出 gap 点，路径在此断开、
   * 不按 0 画成塌陷。归一化侧（normalizeSeries）按它产出 gap 点，这里只消费。
   */
  markgap?: boolean;
  /**
   * 柱顶数值标注（labels=yes）：每根可见柱顶上方画格式化后的值。
   * 只对**并排**柱生效（堆积图每段都标会把图涂满，读数靠 tooltip）；
   * 密度护栏：一个分类槽位放不下 24px 时不标 —— 挤成一团的数字比没有更糟。
   */
  labels?: boolean;
  sliceColors?: string[];
  regions: MapRegion[];
  values: MapValue[] | null;
  mapIdKey: string;
  mapNameKey: string;
  projection: "auto" | "equirectangular" | "mercator" | "none";
  locale: string;
  /** 仪表盘量程（缺省 0–100 / 0–读数×1.25）。来自左轴的 min/max。 */
  gaugeMin?: number;
  gaugeMax?: number;
}

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

// 每个 mark 独立错开：progress=1 时全部到 1，progress=0 时全为 0
export function staggered(progress: number, index: number, factor = 0.03): number {
  return clamp01(progress * (1 + index * factor) - index * factor);
}
