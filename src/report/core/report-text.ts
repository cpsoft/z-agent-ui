// 文本卡的受限行内标记解析（M6）。
//
// [为什么不用富文本 HTML + sanitizer]
// 见 types.ts 里 ReportTextConfig 的注释：本项目没有 sanitizer 依赖，自己写一个
// 是安全上最不该自己写的东西。这里换成正向策略 —— 只认 3 个标记，解析结果直接是
// 结构化片段（{ kind: "text" | "bold" | "italic" | "code", text }），由 React 渲染成
// <strong>/<em>/<code>。**全流程不产生 innerHTML**，所以不存在「漏了一个属性就被执行」
// 的可能：不认识的写法（含 <script>）原样成为文本片段，在页面上是一串可见字符。
//
// [为什么不支持标题/列表/表格]
// 文本卡是看板上的说明块，不是文档。标题已经有卡片自己的 title 字段；
// 列表与表格用纯文本换行 + 「·」前缀就够了。标记越多，用户越容易写出渲染不出来的东西。

/** 文本片段。kind 决定包哪一层行内元素。 */
export interface TextSpan {
  kind: "text" | "bold" | "italic" | "code";
  text: string;
}

/** 行内标记：**粗体** / *斜体* / `等宽`。
 *
 *  [顺序为什么是 code → bold → italic] 反引号里允许出现 `*`（写公式时常见），
 *  先吃掉 code 段就不会把它内部的星号当标记；粗体双星号优先于单星号，
 *  否则 `**x**` 会被切成一堆空的斜体片段。
 *  三个分支都用 [^\n] 而不是 . —— 标记不跨行，跨行的星号通常是算术式（单价*数量）。
 */
const TOKEN = /`([^`\n]+)`|\*\*([^\n]+?)\*\*|\*([^*\n]+?)\*/g;

/** 把一段文本切成片段。空字符串 → 空数组（调用方据此显示占位提示）。 */
export function parseRichText(src: string): TextSpan[] {
  if (!src) return [];
  const out: TextSpan[] = [];
  let last = 0;
  TOKEN.lastIndex = 0;
  for (let m = TOKEN.exec(src); m; m = TOKEN.exec(src)) {
    if (m.index > last) out.push({ kind: "text", text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ kind: "code", text: m[1] });
    else if (m[2] !== undefined) out.push({ kind: "bold", text: m[2] });
    else out.push({ kind: "italic", text: m[3] });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ kind: "text", text: src.slice(last) });
  return out;
}

/** 按行切分 → 每行一组片段。文本卡的换行即段落，不做自动折行的语义合并。 */
export function parseRichLines(src: string): TextSpan[][] {
  if (!src) return [];
  return src.split(/\r?\n/).map((line) => parseRichText(line));
}

/** 字号档位 → CSS 类名后缀（样式在 style.css 的 .zetl-text-card 下）。 */
export const TEXT_SIZE_CLASS: Record<NonNullable<import("./types").ReportTextConfig["size"]>, string> = {
  sm: "zetl-text-card--sm",
  md: "zetl-text-card--md",
  lg: "zetl-text-card--lg",
};

/** 纯文本化（导出 / 无障碍 / 搜索用）：去掉标记字符，保留内容。
 *  [为什么不复用 parseRichText 再拼接] 那个会丢换行；这里按行处理再 join。 */
export function richTextToPlain(src: string): string {
  return parseRichLines(src)
    .map((spans) => spans.map((s) => s.text).join(""))
    .join("\n");
}
