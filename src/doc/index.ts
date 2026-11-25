// ═══════════════════════════════════════════════════════════
// 文档域（L2）入口：三组件 + 纯函数内核 + 类型契约
//
//   z-doc-template-manager  模板列表（分页 / 搜索 / 分类 / 默认标记）
//   z-doc-template-editor   模板编辑（块模型 + 占位符 + A4 版面）
//   z-doc-preview           模板预览（A4 分页 / 打印 / docx 导出）
//
// 按需引入：import "z-agent-ui/doc/manager" | "z-agent-ui/doc/editor" | "z-agent-ui/doc/preview"
// 整域引入：import "z-agent-ui/doc"
//
// [WHY 2026-11-15 从 `src/editor/doc-template` 迁出来] 这三个元素有**自己的块模型**
// （块 / 占位符 / 分页），判据上是 L2；它与页面编辑器之间一条引用都没有（实测子域间边 0），
// 只是「当初编辑器先写了它」。挂在 editor 下的代价：「只要文档模板」的宿主路径是
// `z-agent-ui/editor/doc-template` —— 得先知道文档属于编辑器域才找得到，而且
// `import "z-agent-ui/editor"` 会把 8 924 行的页面编辑器一起注册。
//
// See: wiki/requirements/REQ-016-doc-template.md（issue IKICYW）
// ═══════════════════════════════════════════════════════════

import "./DocTemplateManager.js";
import "./DocTemplateEditor.js";
import "./DocPreview.js";

export { ZDocTemplateManager } from "./DocTemplateManager.js";
export { ZDocTemplateEditor } from "./DocTemplateEditor.js";
export type { DocPlaceholderDef } from "./DocTemplateEditor.js";
export { ZDocPreview } from "./DocPreview.js";

export {
  esc,
  fillPlaceholders,
  extractPlaceholderKeys,
  parseBlocks,
  normalizeContent,
  renderBlock,
  renderTableBlock,
  renderEditorDocument,
  generateDocument,
  createBlockId,
  highlightPlaceholders,
  readTextFromHtml,
  planPageBreak,
} from "./render.js";
export type { DocContentKind, NormalizedContent, PlaceholderLabelOf } from "./render.js";

export {
  DEFAULT_FORMAT_CONFIG,
  CN_FONT_SIZES,
  CN_FONT_SIZE_OPTIONS,
  resolveFontSize,
  resolveIndent,
  formatConfigToStyle,
  parseFormatConfig,
  PAPER_WIDTH_PX,
  PAPER_HEIGHT_PX,
  mmToPx,
} from "./types.js";
export type {
  DocTemplate,
  DocTemplateQuery,
  DocTemplateDataSource,
  DocRenderAdapter,
  DocBlock,
  DocBlockType,
  DocAlign,
  DocTableColumn,
  DocData,
  DocFormatConfig,
} from "./types.js";