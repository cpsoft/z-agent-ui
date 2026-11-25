// X 轴标签显示格式（M12）：把维度值改写成更短的写法，好让一张卡里塞得下更多分类。
// 纯函数、不碰查询 —— 联动与筛选仍然用行里的原始值。
import type { ReportXLabelFormat } from "./types.js";

/** 下拉选项（顺序即界面顺序；auto 必须在第一位，它就是「不配」的形态） */
export const LABEL_FORMAT_OPTIONS: ReadonlyArray<{ value: ReportXLabelFormat; label: string }> = [
  { value: "auto", label: "原样" },
  { value: "md", label: "月-日（10-16）" },
  { value: "slash", label: "月/日（10/16）" },
  { value: "time", label: "时:分（10:16）" },
];

/** 日期片段：只有「年 + 月 + 日」都齐全才认为是日期。
 *  [为什么三个分隔符都收] 源系统里同一列可能写成 2026-10-16 / 2026/10/16 / 2026.10.16，
 *  这跟显示格式无关，是数据本身的历史形态。 */
const DATE_RE = /(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/;
/** 时间片段：前面不能紧邻数字，否则 `2026-10-16` 里的 `10-16` 会被误读成 10:16 之类 */
const TIME_RE = /(?:^|[^\d])(\d{1,2}):(\d{2})/;

const pad2 = (n: number) => String(n).padStart(2, "0");

/** 单个标签的改写。看不出是日期/时间时原样返回（不猜、不抛错）。 */
export function formatOneLabel(raw: string, fmt: ReportXLabelFormat): string {
  if (fmt === "auto") return raw;
  if (fmt === "time") {
    const t = TIME_RE.exec(raw);
    if (!t) return raw;
    const hh = Number(t[1]);
    if (hh > 23) return raw; // 不是时间（如 `版本 5:99` 这类）就别硬改
    return `${pad2(hh)}:${t[2]}`;
  }
  const d = DATE_RE.exec(raw);
  if (!d) return raw;
  const mm = Number(d[2]);
  const dd = Number(d[3]);
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return raw;
  return fmt === "slash" ? `${pad2(mm)}/${pad2(dd)}` : `${pad2(mm)}-${pad2(dd)}`;
}

/**
 * 整列标签的改写 + **重复检测**。
 *
 * [为什么必须有重复检测，而且不合格就整体不生效]
 * X 轴分类的身份就是标签本身（vendor 的 computeDomains 按 `!xLabels.includes(label)`
 * 去重）。把 `2025-10-16` 与 `2026-10-16` 都改成 `10-16`，这两行会**合并成一个分类**：
 * 图上少一根柱子、值还对不上，且没有任何报错。比「标签太长」严重得多。
 * 所以这里宁可整体退回原样，并把 `collapsed: true` 交给界面显示一句原因 ——
 * 静默降级成「格式没生效」也算一种骗人。
 *
 * 返回的 labels 与入参**等长同序**（调用方按行下标取），永远不增不减。
 */
export function formatXLabels(
  labels: string[],
  fmt: ReportXLabelFormat | undefined,
): { labels: string[]; collapsed: boolean } {
  const f = fmt ?? "auto";
  if (f === "auto" || labels.length === 0) return { labels, collapsed: false };
  const out = labels.map((l) => formatOneLabel(l, f));
  // 改写后若「不同标签的个数」变少，说明有分类撞到一起了
  if (new Set(out).size < new Set(labels).size) return { labels, collapsed: true };
  return { labels: out, collapsed: false };
}
