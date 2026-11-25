import type { ChartType, RendererName } from "../types.js";

export interface Renderer {
  readonly name: RendererName;
}

// pie/donut/sparkline 元素量少，canvas 无收益，SVG 文本/命中更优
export function resolveRenderer(type: ChartType, renderer: RendererName): RendererName {
  if (renderer === "canvas" && (type === "pie" || type === "donut" || type === "sparkline")) {
    // eslint-disable-next-line no-console
    console.warn(`[z-chart] renderer="canvas" is not supported for type="${type}", falling back to svg`);
    return "svg";
  }
  return renderer;
}
