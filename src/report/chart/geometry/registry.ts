import type { ComputedFrame, Domains } from "../layout/layout.js";
import type { ChartType, GeometryModel, ResolvedTheme, SeriesModel } from "../types.js";
import type { BuildContext } from "./shared.js";

export interface GeometryBuildInput {
  type: ChartType | string;
  series: SeriesModel[];
  frame: ComputedFrame;
  domains: Domains | null;
  theme: ResolvedTheme;
  progress: number;
  ctx: BuildContext;
}

export type GeometryBuilder = (input: GeometryBuildInput) => GeometryModel;

const registry = new Map<string, GeometryBuilder>();

/**
 * 注册（或覆写）一种图表类型的几何构建器。
 *
 * 遵循开闭原则：内置图形与外部业务自定义图形统一通过注册表接入 `<z-chart>`，
 * 无需修改图表核心分派逻辑。
 */
export function registerChartGeometry(type: string, builder: GeometryBuilder): void {
  registry.set(type, builder);
}

/** 注销已注册的几何构建器（常用于测试清理或动态卸载插件）。 */
export function unregisterChartGeometry(type: string): boolean {
  return registry.delete(type);
}

/** 查询某图表类型已注册的几何构建器。 */
export function getChartGeometry(type: string): GeometryBuilder | undefined {
  return registry.get(type);
}

/** 列出当前已注册的全部图表几何类型名。 */
export function listChartGeometries(): string[] {
  return Array.from(registry.keys());
}
