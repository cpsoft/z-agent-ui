// ═══════════════════════════════════════════════════════════
// z-doc-template: 文档生成内核（纯函数, 无组件依赖, 可单测）
// [WHY] 渲染优先级：块结构 DSL > HTML > Markdown（与 zwms 行为对齐, issue IKICYW）。
// 占位符三路替换：{{key}} 文本替换 / data-placeholder 节点替换 / 表格块级整块替换。
// 未命中的数据键一律置空，保证未替换的 {{key}} 不落进导出文件。
// 排版配置（字体/字号/行距/缩进）经 CSS 自定义属性下发到纸张容器（formatConfigToStyle），
// 块级属性以行内样式覆盖同名字号/字体/颜色 —— 预览/打印/导出三端共用同一份 DOM 结构。
// See: wiki/requirements/REQ-016-doc-template.md
// ═══════════════════════════════════════════════════════════

import { escapeAttr } from "../core/index.js";
import { marked } from "marked";
import { type DocAlign, type DocBlock, type DocData, type DocTableColumn, resolveFontSize } from "./types.js";

export { escapeAttr as esc };

/** [WHY] 占位符值允许注入 HTML 片段（表格型数据），此处不做转义 */
function raw(v: unknown): string {
  return v == null ? "" : String(v);
}

// ── 占位符 ────────────────────────────────────────────────

const PLACEHOLDER_RE = /\{\{\s*([\w.-]+)\s*\}\}/g;
const DATA_PLACEHOLDER_ATTR_RE = /data-placeholder\s*=\s*"([^"]+)"/g;
// [WHY] 带 data-placeholder 的元素整体替换：非贪婪 + 同标签闭合, 覆盖 <span>/<div>/<td>
const DATA_PLACEHOLDER_EL_RE = /<(\w+)([^>]*\sdata-placeholder\s*=\s*"([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g;

/**
 * 文本替换 {{...}} 与 data-placeholder 元素。
 * keepUnresolved=true 时保留原样（编辑器态高亮用）；否则未命中数据置空。
 */
export function fillPlaceholders(text: string, data: DocData, keepUnresolved = false): string {
  if (!text) return "";
  const out = text.replace(PLACEHOLDER_RE, (_m, key: string) => {
    const has = Object.prototype.hasOwnProperty.call(data, key) && data[key] != null;
    if (!has) return keepUnresolved ? `{{${key}}}` : "";
    return raw(data[key]);
  });
  return out.replace(DATA_PLACEHOLDER_EL_RE, (m, _tag, _attrs, key: string) => {
    const has = Object.prototype.hasOwnProperty.call(data, key) && data[key] != null;
    if (!has) return keepUnresolved ? m : "";
    return raw(data[key]);
  });
}

/** 宿主用于「生成时采集数据」：从模板内容反向提取占位符 key 列表（去重保序） */
export function extractPlaceholderKeys(blocks: DocBlock[] | null, rawContent = ""): string[] {
  const keys: string[] = [];
  const push = (s?: string): void => {
    if (!s) return;
    for (const m of s.matchAll(PLACEHOLDER_RE)) if (!keys.includes(m[1])) keys.push(m[1]);
    for (const m of s.matchAll(DATA_PLACEHOLDER_ATTR_RE)) if (!keys.includes(m[1])) keys.push(m[1]);
  };
  if (blocks) {
    for (const b of blocks) {
      push(b.text);
      push(b.left);
      push(b.right);
      b.items?.forEach(push);
      // [WHY] 表格的数据键 dataKey 是宿主要提供的那份数据, 必须被采集：
      // 编辑器可在属性面板直接改 dataKey, 宿主若不知道新键值就无从取数（[[REQ-016-doc-template]]）
      if (b.dataKey && !keys.includes(b.dataKey)) keys.push(b.dataKey);
      // [WHY] 表头先于表体：key 顺序与文档中出现顺序一致（宿主据此排布数据录入表单）
      b.columns?.forEach((c) => push(c.label));
      b.rows?.forEach((r) => r.forEach(push));
    }
  }
  push(rawContent);
  return keys;
}

// ── 内容归一化 ────────────────────────────────────────────

export type DocContentKind = "blocks" | "html" | "markdown";

export interface NormalizedContent {
  kind: DocContentKind;
  blocks: DocBlock[] | null;
  body: string;
}

function isDocBlock(v: unknown): v is DocBlock {
  if (!v || typeof v !== "object") return false;
  const t = (v as DocBlock).type;
  return t === "heading" || t === "paragraph" || t === "table" || t === "list" || t === "signature";
}

/** 解析块结构 DSL（非法 / 非数组 / 空数组 → null，交由 HTML/Markdown 降级路径） */
export function parseBlocks(content: string): DocBlock[] | null {
  if (!content) return null;
  const s = content.trim();
  if (!s.startsWith("[") && !s.startsWith("{")) return null;
  try {
    const parsed = JSON.parse(s) as unknown;
    const arr = Array.isArray(parsed) ? parsed : (parsed as { blocks?: unknown })?.blocks;
    if (!Array.isArray(arr)) return null;
    const blocks = arr.filter(isDocBlock);
    return blocks.length ? blocks : null;
  } catch {
    return null;
  }
}

export function normalizeContent(content: string): NormalizedContent {
  const blocks = parseBlocks(content);
  if (blocks) return { kind: "blocks", blocks, body: content };
  const s = (content ?? "").trim();
  // [WHY] HTML 判定：出现成对标签或自闭合块级标签即按 HTML 渲染, 否则走 Markdown
  if (/<([a-z][\w-]*)(\s[^>]*)?>[\s\S]*<\/\1>/i.test(s) || /<(br|hr|img|table|input)\b[^>]*\/?>/i.test(s)) {
    return { kind: "html", blocks: null, body: content };
  }
  return { kind: "markdown", blocks: null, body: content };
}

// ── 块渲染 ────────────────────────────────────────────────

function alignStyle(align?: DocAlign): string {
  return align ? ` style="text-align:${align}"` : "";
}

/** 块级覆盖样式（缺省继承模板排版配置下发到纸张容器的 CSS 变量） */
function blockOverrideStyle(block: DocBlock): string {
  const parts: string[] = [];
  if (block.fontFamily) parts.push(`font-family:${block.fontFamily}`);
  if (block.fontSize) parts.push(`font-size:${resolveFontSize(block.fontSize, "")}`);
  if (block.color) parts.push(`color:${block.color}`);
  if (block.bold) parts.push("font-weight:700");
  if (block.align) parts.push(`text-align:${block.align}`);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

function tableColgroup(columns: DocTableColumn[]): string {
  if (!columns.some((c) => c.width)) return "";
  // [WHY] 列宽按比例归一为百分比, 不输出固定 pt：A4 内容宽仅 174mm(≈493pt),
  // 模板列宽总和一旦超出即触发 fixed 布局溢出纸张（2026-09-25 线上实撞）。
  // 百分比在编辑器画布(自适应宽)与 A4 预览都恰好铺满, 比例语义与 docx 导出(pct 表宽)一致。
  const total = columns.reduce((s, c) => s + (typeof c.width === "number" && c.width > 0 ? c.width : 0), 0);
  return `<colgroup>${columns
    .map((c) =>
      typeof c.width === "number" && c.width > 0 && total > 0
        ? `<col style="width:${((c.width / total) * 100).toFixed(2)}%" />`
        : "<col />"
    )
    .join("")}</colgroup>`;
}

/**
 * 编辑器态占位符高亮：{{key}} → 带 data-ph 的 span（真实节点, 便于点击/拖入）。
 * [WHY] 芯片内显示字段名（label）而非 {{key}} 原文：模型回写走 readTextFromHtml 的
 * data-ph 属性反解, 显示文字与模型解耦；labelOf 未命中或未提供时回退 {{key}} 原文。
 * See: wiki/requirements/REQ-016-doc-template.md
 */
export type PlaceholderLabelOf = (key: string) => string | undefined;

export function highlightPlaceholders(text: string, labelOf?: PlaceholderLabelOf): string {
  return text.replace(PLACEHOLDER_RE, (_m, key: string) => {
    const label = labelOf?.(key);
    const inner = label ? escapeAttr(label) : `{{${key}}}`;
    return `<span class="z-doc-ph" data-ph="${key}" contenteditable="false">${inner}</span>`;
  });
}

/** 表格块 → HTML：dataKey 命中数组 / HTML 片段时整块替换（不把表格 HTML 转义进段落） */
export function renderTableBlock(block: DocBlock, data: DocData): string {
  const columns = block.columns ?? [];
  let rows: string[][] = [];

  if (block.dataKey) {
    const source = data[block.dataKey];
    if (typeof source === "string") return fillPlaceholders(source, data);
    if (Array.isArray(source)) {
      rows = source.map((r) => {
        if (Array.isArray(r)) return r.map((c) => raw(c));
        const obj = r as Record<string, unknown>;
        return columns.map((c) => raw(obj[c.key]));
      });
    }
  } else {
    rows = block.rows ?? [];
  }

  let colDefs = columns;
  if (colDefs.length === 0) {
    if (rows.length === 0) return "";
    const width = Math.max(...rows.map((r) => r.length));
    colDefs = Array.from({ length: width }, (_, i) => ({ key: String(i), label: "" }));
  }

  const head = `<thead><tr>${colDefs.map((c) => `<th>${fillPlaceholders(escapeAttr(c.label), data)}</th>`).join("")}</tr></thead>`;
  const bodyRows = rows
    .map(
      (r) =>
        `<tr>${colDefs.map((_c, i) => `<td>${fillPlaceholders(raw(r[i]), data)}</td>`).join("")}</tr>`,
    )
    .join("");

  return `<table class="z-doc-table"${alignStyle(block.align)}>${tableColgroup(colDefs)}${head}<tbody>${bodyRows}</tbody></table>`;
}

/** 编辑器态表格（保留 dataKey 描述, 静态行单元格可编辑） */
function renderEditorTableBlock(block: DocBlock, labelOf?: PlaceholderLabelOf): string {
  const columns = block.columns ?? [];
  const rows = block.rows ?? [];
  if (columns.length === 0) return "";
  const head = `<thead><tr>${columns
    .map((c) => `<th>${highlightPlaceholders(escapeAttr(c.label) || escapeAttr(c.key), labelOf)}</th>`)
    .join("")}</tr></thead>`;
  const bodyRows = rows
    .map(
      (r, ri) =>
        `<tr>${columns
          .map((_c, ci) => `<td data-row="${ri}" data-col="${ci}">${highlightPlaceholders(escapeAttr(r[ci] ?? ""), labelOf)}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  return `<table class="z-doc-table z-doc-table--editable">${tableColgroup(columns)}${head}<tbody>${bodyRows}</tbody></table>`;
}

/**
 * 单个块 → HTML。data=null 表示编辑器态：保留占位符并高亮为字段名芯片（labelOf 提供
 * 字段名时芯片显示字段名, 否则显示 {{key}} 原文），不填数据。
 */
export function renderBlock(block: DocBlock, data: DocData | null, labelOf?: PlaceholderLabelOf): string {
  const keep = data === null;
  const d: DocData = data ?? {};
  // [WHY] 文本管线消重（标题/段落/列表项/签名区共用）：编辑器态（keep）保留 {{key}} 并包
  // 字段名芯片, 生成态未命中置空 —— 两条路径的转义与填充顺序必须一致
  const renderText = (s: string): string =>
    keep ? highlightPlaceholders(fillPlaceholders(escapeAttr(s), d, true), labelOf) : fillPlaceholders(escapeAttr(s), d, false);

  switch (block.type) {
    case "heading": {
      const level = block.level ?? 1;
      const text = renderText(block.text ?? "");
      return `<h${level} class="z-doc-heading z-doc-heading--${level}"${blockOverrideStyle(block)}>${text}</h${level}>`;
    }
    case "paragraph": {
      const source = block.text ?? "";
      if (keep) {
        return `<p class="z-doc-para"${blockOverrideStyle(block)}>${renderText(source)}</p>`;
      }
      // [WHY] 整段即一个占位符且其值为表格 HTML 时整块替换, 避免表格被塞进 <p> 转义
      const single = source.trim().match(/^\{\{\s*([\w.-]+)\s*\}\}$/);
      if (single) {
        const value = d[single[1]];
        if (typeof value === "string" && /<table[\s>]/i.test(value)) return value;
      }
      const text = renderText(source);
      return `<p class="z-doc-para"${blockOverrideStyle(block)}>${text || "&nbsp;"}</p>`;
    }
    case "list": {
      // [WHY] 编辑器态列表项同样包芯片：否则 {{key}} 以裸文本显示（无法换字段名）,
      // 且裸文本经 readTextFromHtml 原样回写, 显示与模型纠缠
      const items = (block.items ?? []).map((it) => `<li>${renderText(it)}</li>`).join("");
      if (!items) return "";
      const tag = block.ordered ? "ol" : "ul";
      return `<${tag} class="z-doc-list"${blockOverrideStyle(block)}>${items}</${tag}>`;
    }
    case "table":
      return keep ? renderEditorTableBlock(block, labelOf) : renderTableBlock(block, d);
    case "signature": {
      // [WHY] 签名区默认右对齐块（合同场景：乙方签章落右下）
      return `<div class="z-doc-signature"${blockOverrideStyle(block)}><span>${renderText(block.left ?? "")}</span><span>${renderText(block.right ?? "")}</span></div>`;
    }
    default:
      return "";
  }
}

/**
 * 文档生成：模板内容（DSL > HTML > Markdown）+ 业务数据 → 正文 HTML。
 * 返回纸张容器内部 HTML（不含纸张外壳与排版样式）。
 */
export function generateDocument(content: string, data: DocData = {}): string {
  const normalized = normalizeContent(content);
  if (normalized.kind === "blocks") {
    return (normalized.blocks ?? []).map((b) => renderBlock(b, data)).join("");
  }
  if (normalized.kind === "markdown") {
    const html = marked.parse(normalized.body, { async: false }) as string;
    return fillPlaceholders(html, data, false);
  }
  return fillPlaceholders(normalized.body, data, false);
}

/** 编辑器态整篇渲染（保留占位符高亮, 不填数据） */
export function renderEditorDocument(blocks: DocBlock[], labelOf?: PlaceholderLabelOf): string {
  return blocks.map((b) => renderBlock(b, null, labelOf)).join("");
}

/** 唯一块 id 生成（编辑器新增块用） */
export function createBlockId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** 画布 innerHTML → 块文本：高亮 span 反解回 {{key}} 原文（contenteditable 回写用） */
export function readTextFromHtml(html: string): string {
  return html
    .replace(/<span class="z-doc-ph"[^>]*data-ph="([^"]+)"[^>]*>[\s\S]*?<\/span>/g, "{{$1}}")
    .replace(/<br\s*\/?>/gi, "")
    .trim();
}
// ── 编辑器分页布局（纯几何, DOM 应用在 DocTemplateEditor._layoutPages） ──

/**
 * 判定一个块是否跨 A4 页边界, 返回下一页内容区起点（内容坐标, 已含在 cap 体系内）或 null。
 * [WHY] 2026-09-26 用户反馈「编辑画布超出 A4 长度」：编辑视图原是一张连续长纸,
 * 看不出分页边界。编辑器按真实块高把跨页块推到下一页页首（Word 式分页展示）。
 * @param cStart 块顶的内容坐标（相对当页内容区原点的累计坐标 = 块顶绝对 y - 上边距）
 * @param h 块高 px
 * @param cap 每页内容区高（页高 - 上下边距）
 * @returns 需要分页时返回下一页内容区起点（内容坐标）, 否则 null
 */
export function planPageBreak(cStart: number, h: number, cap: number): number | null {
  if (h <= 0 || cap <= 0) return null;
  // [WHY] 单块高于整页（超长表格）：无法整块下移, 允许跨页（Word 同款）, 不插分页符
  if (h > cap) return null;
  const startPage = Math.floor(cStart / cap);
  // [WHY] -0.5 容差：块底恰好压线（cStart+h == 页界）不算跨页
  const endPage = Math.floor((cStart + h - 0.5) / cap);
  return endPage > startPage ? (startPage + 1) * cap : null;
}
