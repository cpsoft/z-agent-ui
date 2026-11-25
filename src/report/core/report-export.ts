// 报表导出：把「已排好列的表格」转成 CSV 并触发下载。
//
// [WHY 在 core 而不是各宿主自己写] 导出的三件事——列序、表头文案、单元格取值——
// 必须与**屏幕上的那张表**逐列对齐。任何一处各写一遍，症状都是「导出的 CSV 列名
// 和页面不一样」「导出 24.681818、页面 24.68」，而这类差异没人会当成 bug 报上来，
// 只会被当成「导出的数据不准」。所以列定义由调用方给（它就是渲染时用的那一份），
// 取值口径由 `format` 钩子给（默认与卡面共用 formatCellValue）。
//
// [WHY 不用 \r\n] RFC 4180 规定 CRLF，但字段内含换行时本就会被引号包住，Excel、
// Numbers、pandas 对 LF 都正确解析。改成 CRLF 只会让「同一份数据的导出字节」变一次，
// 换不到任何兼容性收益 —— 不做无收益的行为变更。

/** 导出一列：只要求 key 与 title。其余字段（width/align/render）是渲染用的，导出不看。 */
export interface ExportColumn {
  key: string;
  title: string;
}

/** 单元格取值钩子：返回最终写进 CSV 的文本。缺省走 `cellText`（原始值）。 */
export type ExportCellFormat = (key: string, value: unknown) => string;

/** 原始值 → CSV 文本。数字保持原样（不补千分位），null/undefined → 空串。
 *
 *  [为什么数字不格式化] 原始值才能被 Excel / pandas 当数值继续算。用户显式配了
 *  小数位/百分数时由 `format` 钩子接管（见 report-columns.formatCellValue）。 */
export function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  return String(value);
}

/** CSV 字段转义：含逗号/双引号/换行/回车时必须整体加引号，内部双引号翻倍。 */
function esc(s: string): string {
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 表格 → CSV 文本（含 UTF-8 BOM）。
 *
 *  [为什么带 BOM] 不带 BOM 的 UTF-8 CSV 在 Excel（简体中文 Windows）里打开是乱码，
 *  而「导出的表是乱码」是这类功能最常见的投诉。BOM 对 pandas / Numbers 无副作用。
 *
 *  [为什么逐行 join 而不是拼字符串累加] 行数上万时字符串反复拼接是 O(n²) 拷贝。 */
export function toCSV(
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  format?: ExportCellFormat,
): string {
  // 缺省格式化只看值（不看列 key）—— 需要按列配置小数位的调用方传自己的 format
  const pick = format ?? ((_key: string, v: unknown) => cellText(v));
  const head = columns.map((c) => esc(c.title)).join(",");
  const lines: string[] = [head];
  for (const r of rows) {
    lines.push(columns.map((c) => esc(pick(c.key, r[c.key]))).join(","));
  }
  return "\uFEFF" + lines.join("\n");
}

/** 触发浏览器下载。文件名缺 `.csv` 后缀会补上。 */
export function downloadText(filename: string, text: string, mime = "text/csv;charset=utf-8"): void {
  // 非浏览器环境（SSR / 单测未打桩）直接报错而不是静默不下载 ——
  // 「点了导出什么都没发生」比一条明确错误难查得多。
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("[report-export] 当前环境不支持文件下载");
  }
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.rel = "noopener";
  // 不挂到 document 上也能点击（Chrome/Firefox/Safari 一致），省掉一次 DOM 变更
  a.click();
  // 立刻 revoke 在部分浏览器会让下载中断：挪到下一个宏任务
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** 一步到位：表格 → CSV → 下载。 */
export function exportCSV(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[],
  format?: ExportCellFormat,
): void {
  downloadText(filename, toCSV(columns, rows, format));
}
