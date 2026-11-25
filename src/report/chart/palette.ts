// [WHY] 500 级 hex 在浅色与深色表面都可读，作为 SVG 属性色固定使用（SVG 属性无法 var()）
// [WHY] 前 5 色对齐参考页 chart 色板（REQ-010）：blue-600/emerald-500/amber-500/violet-500/red-500
//
// [2026-10-26 issue IKIDAI] 前 5 色改为**优先读 CSS 变量** `--z-chart-1..5`
// （它们又认宿主的 `--chart-1..5`，见 theme/tokens.css）。这里的 hex 降级成 fallback：
// 图表是「一眼看配色属不属于这个系统」的地方 —— 宿主换掉 primary 却留着默认蓝绿橙，
// 整块看板立刻不像自家产品。第 6 色起仍需内置序列：到那个系列数时，
// 更该做的是减少系列，而不是继续加色。
export const CATEGORICAL: string[] = [
  "#2563eb", // blue-600
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
  "#ec4899", // pink-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
  "#06b6d4", // cyan-500
  "#a855f7", // purple-500
  "#84cc16", // lime-500
];

/** 与 `CATEGORICAL` 前 5 项一一对应的 token 名。 */
const CHART_TOKENS = ["--z-chart-1", "--z-chart-2", "--z-chart-3", "--z-chart-4", "--z-chart-5"];

// [WHY 初始键用哨兵而不是 ""] 无 `data-theme` 时算出来的键也是 ""，
// 空初值会让**第一次**调用就命中缓存、永远不读 computedStyle ——
// 于是默认主题下宿主的 `--z-chart-*` 怎么改都不生效（而自定义主题下又是好的）。
let paletteCacheKey = "\u0000never";
let paletteCache: string[] = CATEGORICAL;

/**
 * 前 5 色按当前主题解析出来的序列色。
 *
 * 缓存键用 `data-theme` / `data-density`：宿主换主题（含自定义主题名）时键变化即失效，
 * 而每帧重读 computedStyle 是没必要的开销（图表 hover 会反复取色）。
 * jsdom 里自定义属性可能返回未解析的 `var(...)` 字符串 —— 认不出就当没配，用 fallback。
 */
function tokenPalette(): string[] {
  if (typeof document === "undefined") return CATEGORICAL;
  const root = document.documentElement;
  const key = `${root.dataset.theme ?? ""}|${root.dataset.density ?? ""}`;
  if (key === paletteCacheKey) return paletteCache;
  const cs = getComputedStyle(root);
  const out = CATEGORICAL.map((fallback, i) => {
    const name = CHART_TOKENS[i];
    if (!name) return fallback;
    const v = cs.getPropertyValue(name).trim();
    return v && !v.includes("var(") ? v : fallback;
  });
  paletteCacheKey = key;
  paletteCache = out;
  return out;
}

export const SEQUENTIAL_LIGHT: string[] = [
  "#eff6ff",
  "#dbeafe",
  "#bfdbfe",
  "#93c5fd",
  "#60a5fa",
  "#3b82f6",
  "#1e40af",
];

export const SEQUENTIAL_DARK: string[] = [
  "#1e3a8a",
  "#1d4ed8",
  "#2563eb",
  "#3b82f6",
  "#60a5fa",
  "#93c5fd",
  "#bfdbfe",
];

export function resolveSeriesColors(count: number, override?: string[] | null): string[] {
  if (override && override.length > 0) {
    return Array.from({ length: count }, (_, i) => override[i % override.length]);
  }
  const base = tokenPalette();
  return Array.from({ length: count }, (_, i) => base[i % base.length]);
}

export interface Quantizer {
  bucketIndex(v: number): number;
  bucketCount: number;
  min: number;
  max: number;
}

export function quantize(
  values: number[],
  bucketCount: number,
  /**
   * 固定上下限。给了就用它，而不是本批数据的 min/max。
   *
   * [WHY 需要] 同一指标的多张热力图各自按自己的极值取色时，深浅**不可比** ——
   * A 图的浅蓝与 B 图的深蓝可能是同一个值。固定上下限才让并排的几张图能直接对照。
   * 超出范围的格子会落到首/末档（clamp 在 bucketIndex 里）。
   */
  clamp?: { min?: number; max?: number },
): Quantizer {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  const dataMin = min;
  const dataMax = max;
  // 固定上下限优先：只给一侧时另一侧仍取数据极值
  if (clamp?.min !== undefined && Number.isFinite(clamp.min)) min = clamp.min;
  if (clamp?.max !== undefined && Number.isFinite(clamp.max)) max = clamp.max;
  // 上下限给反了就**整体忽略** clamp，回到数据极值。
  // [WHY 不是 max = min + 1] 那样会留下一个错的下限：数据全在下限之下，整张图
  // 落进同一档，看着像「所有格子数值相同」—— 比报错更误导。
  if (max <= min) {
    min = dataMin;
    max = dataMax;
    if (max <= min) max = min + 1; // 数据全等时的最后兜底
  }
  const span = max - min || 1;
  return {
    bucketIndex: (v: number) => {
      const idx = Math.floor(((v - min) / span) * bucketCount);
      return Math.min(Math.max(idx, 0), bucketCount - 1);
    },
    bucketCount,
    min,
    max,
  };
}
