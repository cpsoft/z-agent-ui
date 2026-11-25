// 滚轮手势的判定：这一下滚轮，是「在控件内缩放」还是「滚页面」。
//
// [WHY 抽成原语] 2026-11-20 之前，同一个库里两种手感：
//   · z-flow  普通滚轮直接缩放并 preventDefault —— 画布上的页面滚不动
//   · z-gantt 要 Ctrl/⌘+滚轮才缩放 —— 普通滚轮保持原生滚动
// 用户的原话是「所有控件的基础行为要一致」。这里统一的是**手势语义**：
// 同一类操作只允许有一种解释，不允许「看你落在哪个控件上」。
//
// 两处各写一个 if 的形态下，第三处必然再漏一次：漏 metaKey（Mac 上的 ⌘）、
// 漏「纯横向滚轮」、或者干脆把修饰键判反。判据只此一处，新控件加缩放时调用它。
//
// ── 口径（全库唯一） ──
//   · 普通滚轮            = 滚动，控件**不拦**（不 preventDefault）
//   · Ctrl / ⌘ + 滚轮     = 控件内缩放
//   · 触控板双指捏合       = 缩放。浏览器把 pinch 合成为 `ctrlKey: true` 的 wheel
//                          （Chromium / Safari / Firefox 同此），所以不必单独判 pinch ——
//                          单独判反而会在真机上与合成的 ctrl+wheel 重复触发。
//
// ── 统一的是「什么手势」，不是「缩放多快」 ──
// Flow 是连续视口，按幅度算缩放因子；Gantt 是离散日宽，按方向步进一档。
// 这个差异属于各自的领域（连续量 vs 离散量），不该被抹平 ——
// 与 LongPressController 的结论同型：统一判定语义，不统一那个数字。
// 但**幅度必须先归一**：那不是控件领域，是浏览器差异（见 toPixels）。

/**
 * `deltaMode = 1`（DOM_DELTA_LINE）时 deltaY 的单位是「行」。
 * 16px 是浏览器默认行高的近似值；Firefox 的鼠标滚轮走的就是这一档（deltaY = ±3）。
 */
const PX_PER_LINE = 16;

/**
 * `deltaMode = 2`（DOM_DELTA_PAGE）的单位是「页」。实际设备极少发这个，
 * 取常见视口高度的保守值即可 —— 它只影响缩放的快慢，不影响「算不算缩放」。
 */
const PX_PER_PAGE = 800;

/**
 * 把 deltaY 折算成像素；`deltaMode = 0`（DOM_DELTA_PIXEL）时原样返回。
 *
 * [WHY 必须折算] issue IKWNJP 记的实况：Chrome 的鼠标滚轮是 `deltaMode: 0`、
 * `deltaY = ±100`，Firefox 是 `deltaMode: 1`、`deltaY = ±3`。同一格滚轮不折算就差
 * 33 倍 —— 在 Firefox 里缩放几乎不动，看起来像「这个画布坏了」。
 * 两处旧实现都没处理：各写各的时候，没人会同时想到两个浏览器的单位不同。
 */
function toPixels(deltaY: number, deltaMode: number): number {
  if (deltaMode === 1) return deltaY * PX_PER_LINE;
  if (deltaMode === 2) return deltaY * PX_PER_PAGE;
  return deltaY;
}

/** 一次缩放意图。`direction` 为 1 表示放大（内容变大），-1 表示缩小。 */
export interface WheelZoomIntent {
  direction: 1 | -1;
  /** 归一成像素的幅度：连续缩放（画布类）的调用方用它算因子，按步进的不必看。 */
  deltaPixels: number;
  /** 原始 deltaY 与 deltaMode：手感不对时先看这两个数，别猜。 */
  rawDeltaY: number;
  deltaMode: number;
}

/**
 * 判定一次 wheel 是否构成缩放意图；不是则返回 null，调用方必须**放行**
 * （不 preventDefault），让浏览器照常滚动页面。
 */
export function wheelZoomIntent(e: WheelEvent): WheelZoomIntent | null {
  // 修饰键是唯一的开关。缺了它，普通滚轮就变成了缩放 —— 那正是我们要消除的分叉。
  if (!e.ctrlKey && !e.metaKey) return null;

  // deltaY 为 0 时是纯横向滚动（触控板左右滑）叠加了修饰键，没有「上下」的缩放方向可言。
  // 同时兜住 deltaY 缺失（合成事件构造不全）的情况 —— 没有幅度就不该缩放。
  if (!e.deltaY) return null;

  const deltaMode = e.deltaMode ?? 0;
  return {
    // 滚轮向上（deltaY < 0）= 放大，与浏览器 Ctrl+加号、地图/设计工具的传统一致。
    direction: e.deltaY < 0 ? 1 : -1,
    deltaPixels: toPixels(e.deltaY, deltaMode),
    rawDeltaY: e.deltaY,
    deltaMode,
  };
}
