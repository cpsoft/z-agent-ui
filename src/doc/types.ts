// ═══════════════════════════════════════════════════════════
// z-doc-template: 文档模板数据模型 + 适配器契约 + 中文排版换算
// [WHY] 纯前端模块，不含任何后端实现：所有服务端交互经 DocTemplateDataSource
// 注入，docx 生成经 DocRenderAdapter 注入，宿主自行对接（issue IKICYW）
// See: wiki/requirements/REQ-016-doc-template.md
// ═══════════════════════════════════════════════════════════

/** 模板实体（持久化形态）。content/formatConfig 为 JSON 串，允许存 HTML/Markdown 作降级内容 */
export interface DocTemplate {
  id: string;
  name: string;
  description?: string;
  /** 块结构 DSL（JSON 串）；也兼容 HTML / Markdown 降级内容 */
  content: string;
  /** 排版配置 JSON 串，见 DocFormatConfig */
  formatConfig: string;
  isDefault: boolean;
  /** 分类（宿主自定义，如合同类型） */
  category?: string;
  updatedAt?: string;
}

/** 列表查询入参（分页 / 关键字 / 分类） */
export interface DocTemplateQuery {
  page: number;
  size: number;
  keyword?: string;
  category?: string;
}

/**
 * 数据源适配器：宿主注入, 模块不绑定任何具体后端。
 * 组件挂载后经 `dataSource` 属性赋值（attribute:false, 函数型契约不适合走 attribute）
 */
export interface DocTemplateDataSource<T extends DocTemplate = DocTemplate> {
  list(query: DocTemplateQuery): Promise<{ data: T[]; total: number }>;
  get(id: string): Promise<T>;
  create(t: Partial<T>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<void>;
  remove(id: string): Promise<void>;
}

/** 渲染导出适配器：docx 生成由宿主决定（自有后端渲染 / 客户端生成均可） */
export interface DocRenderAdapter {
  renderDocx(template: DocTemplate, data: DocData): Promise<Blob>;
}

// ── 块结构 DSL ────────────────────────────────────────────

export type DocBlockType = "heading" | "paragraph" | "table" | "list" | "signature";
export type DocAlign = "left" | "center" | "right";

export interface DocTableColumn {
  /** 数据字段名（dataKey 表格取数 / 手工表格仅作标识） */
  key: string;
  /** 表头文案 */
  label: string;
  /** 列宽，单位 pt（编辑器内配置需在打印/导出端保留） */
  width?: number;
}

export interface DocBlock {
  id: string;
  type: DocBlockType;
  align?: DocAlign;
  /** 字体族覆盖（缺省取模板排版配置） */
  fontFamily?: string;
  /** 字号覆盖：中文字号（小四/三号）或 pt / 半点数值 */
  fontSize?: string;
  color?: string;
  bold?: boolean;
  /** 首行缩进（段落默认继承模板排版配置） */
  indent?: boolean;
  /** 标题级别 1-4（type=heading） */
  level?: 1 | 2 | 3 | 4;
  /** 标题 / 段落正文：支持内联 HTML 片段与占位符 {{key}}、<span data-placeholder="key"> */
  text?: string;
  /** 列表（type=list） */
  ordered?: boolean;
  items?: string[];
  /** 表格（type=table） */
  columns?: DocTableColumn[];
  rows?: string[][];
  /** 表体数据取自 DocData[dataKey]（数组）时整块替换为渲染后的表格 */
  dataKey?: string;
  /** 签名区（type=signature）左右两栏文案 */
  left?: string;
  right?: string;
}

/** 文档生成输入数据：key → 值平铺；表格型数据为 HTML 片段或结构化行数据 */
export type DocData = Record<string, unknown>;

// ── 占位符定义（宿主注入编辑器） ─────────────────────────

/** 宿主注入的占位符定义（key / label / 类型 / 示例值） */
export interface DocPlaceholderDef {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "table";
  sample?: string;
  /**
   * type="table" 时的列定义（列字段名 + 表头文案）。
   * [WHY] 编辑器要用它做「展示哪些字段」的候选池（表格配置面板）：
   * 只有宿主知道某张业务表的列结构, 因此列候选随占位符定义一起注入（[[REQ-016-doc-template]]）。
   */
  fields?: { key: string; label: string }[];
}

// ── 纸张几何常量（编辑器画布 / 预览 / 分页测量三端共用唯一出口） ──

/**
 * A4 纸张 96dpi 整数像素锁定：794 × 1123 px。
 * [WHY] 不用 mm：210mm = 793.7px、20mm 边距 = 75.59px 都是分数 px，
 * 浏览器页面缩放 / 不同 DPR 下亚像素取整抖动 → 折行漂移 → 排版随缩放改变
 * （2026-09-26 线上实撞「合同模板随页面缩放改变排版」）。
 * 整数 px 布局在任意缩放级别下逐 CSS px 一致；打印端 1in = 96px（CSS 绝对定义），
 * 794px 精确映射回 210mm，打印/导出保真不受影响。
 */
export const PAPER_WIDTH_PX = 794;
export const PAPER_HEIGHT_PX = 1123;

/** mm → 整数 px（96dpi；四舍五入误差 ≤0.13mm，排版稳定性优先） */
export function mmToPx(mm: number): number {
  return Math.round((mm * 96) / 25.4);
}

// ── 中文排版配置 ──────────────────────────────────────────

export interface DocFormatConfig {
  /** 正文字体 */
  bodyFont: string;
  /** 标题字体 */
  headingFont: string;
  /** 正文字号：中文字号 或 pt（如 小四 / 12pt） */
  bodyFontSize: string;
  /** 标题字号（一级标题基准，逐级递减） */
  headingFontSize: string;
  /** 行距 1.0 / 1.5 / 1.8 / 2.0 */
  lineHeight: number;
  /** 段间距，单位 pt */
  paragraphSpacing: number;
  /** 首行缩进：字符（如 2ch）或 pt（如 24pt） */
  firstLineIndent: string;
  /** 页边距（mm）：上 / 下 / 左 / 右（A4 210×297mm） */
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  /** 页眉文本（每页顶部；空串 = 不显示） */
  headerText: string;
  /** 页脚文本（每页底部；空串 = 不显示） */
  footerText: string;
}

// [WHY] 编辑器默认值 = 排版配置默认值（同一常量出口），避免双端观感差异，见 issue 验收第 3 条
export const DEFAULT_FORMAT_CONFIG: DocFormatConfig = {
  bodyFont: '"PingFang SC", "Microsoft YaHei", SimSun, serif',
  headingFont: '"PingFang SC", "Microsoft YaHei", SimHei, sans-serif',
  bodyFontSize: "小四",
  headingFontSize: "三号",
  lineHeight: 1.8,
  paragraphSpacing: 0,
  firstLineIndent: "2ch",
  marginTop: 20,
  marginBottom: 20,
  marginLeft: 18,
  marginRight: 18,
  headerText: "",
  footerText: "",
};

// [WHY] Word 中文字号 ↔ pt 换算表（Word 内部单位为半点, 1pt = 2半点）
export const CN_FONT_SIZES: Record<string, number> = {
  初号: 42,
  小初: 36,
  一号: 26,
  小一: 24,
  二号: 22,
  小二: 18,
  三号: 16,
  小三: 15,
  四号: 14,
  小四: 12,
  五号: 10.5,
  小五: 9,
  六号: 7.5,
  小六: 6.5,
};

/** 中文字号下拉选项（编辑器用） */
export const CN_FONT_SIZE_OPTIONS = Object.keys(CN_FONT_SIZES);

/**
 * 字号统一换算为 CSS 长度。
 * - 中文字号（小四/三号）→ 查表转 pt
 * - 带单位（12pt / 2em）→ 原样
 * - 纯数值 → 视作 Word 半点 → pt（24 → 12pt）
 */
export function resolveFontSize(value: string | undefined, fallback = ""): string {
  if (!value) return fallback;
  const v = value.trim();
  if (!v) return fallback;
  if (CN_FONT_SIZES[v] !== undefined) return `${CN_FONT_SIZES[v]}pt`;
  if (/^[\d.]+(pt|px|em|rem|%|ch)$/i.test(v)) return v;
  const num = Number(v);
  if (!Number.isNaN(num) && num > 0) return `${num / 2}pt`;
  return v;
}

/** 首行缩进：字符单位原样, 纯数值视作 pt */
export function resolveIndent(value: string | undefined, fallback = "2ch"): string {
  if (!value) return fallback;
  const v = value.trim();
  if (!v) return fallback;
  if (/[\d.]+(pt|px|em|rem|ch)$/i.test(v)) return v;
  const num = Number(v);
  if (!Number.isNaN(num) && num > 0) return `${num}pt`;
  return v;
}

/** 排版配置 → CSS 自定义属性串（编辑器画布 / 预览 / 打印三端共用同一出口） */
export function formatConfigToStyle(cfg: DocFormatConfig): string {
  // [WHY] 一级标题取配置值, 二/三/四级逐级递减 1pt（合同标题层级习惯）
  const headingPt = CN_FONT_SIZES[cfg.headingFontSize] ?? (Number.parseFloat(resolveFontSize(cfg.headingFontSize, "16pt")) || 16);
  return [
    `--z-doc-body-font:${cfg.bodyFont}`,
    `--z-doc-heading-font:${cfg.headingFont}`,
    `--z-doc-body-size:${resolveFontSize(cfg.bodyFontSize, "12pt")}`,
    `--z-doc-heading-size:${resolveFontSize(cfg.headingFontSize, "16pt")}`,
    `--z-doc-heading-size-1:${headingPt}pt`,
    `--z-doc-heading-size-2:${headingPt - 1}pt`,
    `--z-doc-heading-size-3:${headingPt - 2}pt`,
    `--z-doc-heading-size-4:${headingPt - 3}pt`,
    `--z-doc-line-height:${cfg.lineHeight}`,
    `--z-doc-para-spacing:${cfg.paragraphSpacing}pt`,
    `--z-doc-indent:${resolveIndent(cfg.firstLineIndent)}`,
    // [WHY] 边距换算成整数 px 下发（mmToPx 唯一出口）：mm 是分数 px，缩放下取整抖动
    // 导致折行漂移；配置端仍以 mm 录入（用户语义），渲染端统一 px
    `--z-doc-margin-top:${mmToPx(cfg.marginTop)}px`,
    `--z-doc-margin-bottom:${mmToPx(cfg.marginBottom)}px`,
    `--z-doc-margin-left:${mmToPx(cfg.marginLeft)}px`,
    `--z-doc-margin-right:${mmToPx(cfg.marginRight)}px`,
  ].join(";");
}

/** 解析 formatConfig JSON（容错：非法输入回退默认值） */
export function parseFormatConfig(raw: string | undefined | null): DocFormatConfig {
  if (!raw) return { ...DEFAULT_FORMAT_CONFIG };
  try {
    const parsed = JSON.parse(raw) as Partial<DocFormatConfig>;
    return { ...DEFAULT_FORMAT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_FORMAT_CONFIG };
  }
}