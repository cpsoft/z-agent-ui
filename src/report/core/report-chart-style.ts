import { cardKind } from "./report-card.js";
import type { ReportChart, ReportOverlay, ReportStack } from "./types.js";

/** 柱形族的组合参数（M10）。
 *
 *  [为什么不新增 chartType] 观远那 73 个 chart_type 里柱形族占 19 个，本质是
 *  「方向 × 堆积 × 叠加」的笛卡尔积。把 19 个名字写进 ReportChartType 意味着
 *  每个 `chartType === "bar"` 的判断都要再加 18 个分支，而 `cardKind` 又会把
 *  它们全部归到 chart 种 —— 等于用一维枚举表达了三维信息，还得在 20+ 处同步。
 *  这里改成三个正交参数：主类型仍是 `bar`，后面挂 stack / overlay。
 *
 *  [为什么 stack 与 overlay 互斥] 叠加把第 2 个指标起改成折线，于是柱只剩一根；
 *  只有一根柱子的「堆积」在几何上与并排完全等价，而 percent 会退化成
 *  「每根柱子都是 100%」的一堆等高条 —— 那是错图。允许两者同时存下来只会得到
 *  一个「配置看起来开了、图上没变化」的静默失效。所以设其中一个就清掉另一个，
 *  并且按钮上直接写明互斥。
 */

type StyleChart = Pick<ReportChart, "chartType" | "kind" | "measures" | "stack" | "overlay">;

/** 是否具备堆积/叠加的前提：柱图，且至少两个指标。
 *
 *  [为什么必须 ≥2 指标] 见文件头：单指标的「堆积」与「并排」等价，percent 更是错图。
 *  底层 vendor 用**同一判据**回落（bar 系列数 < 2 时不堆），所以 UI 与渲染不会打架。
 *  若只在前端判、后端画，就会出现「界面写着已堆积、图上没变」这种最难查的一类不一致。 */
export function stackCapable(ch: StyleChart): boolean {
  return cardKind(ch) === "chart" && ch.chartType === "bar" && (ch.measures?.length ?? 0) >= 2;
}

/** 实际生效的堆积方式。不满足前提时一律 none（与底层回落口径一致）。 */
export function effectiveStack(ch: StyleChart): ReportStack {
  if (!stackCapable(ch)) return "none";
  const s = ch.stack;
  return s === "stacked" || s === "percent" ? s : "none";
}

/** 实际生效的叠加画法。 */
export function effectiveOverlay(ch: StyleChart): ReportOverlay {
  if (!stackCapable(ch)) return "none";
  const o = ch.overlay;
  return o === "line" || o === "area" ? o : "none";
}

/** 第 index 个指标该用什么画法：undefined = 跟随主类型（交给底层 "auto"）。 */
export function seriesTypeAt(ch: StyleChart, index: number): "line" | "area" | undefined {
  const o = effectiveOverlay(ch);
  return o !== "none" && index >= 1 ? o : undefined;
}

/** 设置堆积：同时清掉叠加（互斥）。 */
export function withStack(v: ReportStack): Partial<ReportChart> {
  return { stack: v, overlay: undefined };
}

/** 设置叠加：同时清掉堆积（互斥）。 */
export function withOverlay(v: ReportOverlay): Partial<ReportChart> {
  return { overlay: v, stack: undefined };
}

/** 「配了但当前不生效」的原因（空串 = 正常）。
 *
 *  [为什么要单独算这个] 用户配了堆积之后回左池删掉一个指标，卡就从「堆积柱」
 *  静默变回「单柱」——没有任何提示。这条文案专门用来把这种静默失效说出来。 */
export function styleWarning(ch: StyleChart): string {
  const wantsStack = ch.stack === "stacked" || ch.stack === "percent";
  const wantsOverlay = ch.overlay === "line" || ch.overlay === "area";
  if (!wantsStack && !wantsOverlay) return "";
  if (cardKind(ch) !== "chart" || ch.chartType !== "bar") {
    return `当前不是柱状图，已忽略${wantsStack ? "堆积" : "叠加"}设置`;
  }
  if ((ch.measures?.length ?? 0) < 2) {
    return `只有 1 个指标，${wantsStack ? "堆积" : "叠加"}不生效（需至少 2 个）`;
  }
  return "";
}

/** 卡片副标题用的一句话摘要（如「堆积 · 2 指标」）。空串 = 无特殊形态。 */
export function styleSummary(ch: StyleChart): string {
  const s = effectiveStack(ch);
  if (s === "stacked") return "堆积";
  if (s === "percent") return "百分比堆积";
  const o = effectiveOverlay(ch);
  if (o === "line") return "柱线组合";
  if (o === "area") return "柱 + 面积";
  return "";
}
