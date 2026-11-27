// [WHY] 2026-10-25 系统审计：从 DocTemplateEditor.ts（1264 行）按职责拆出
// 职责：编辑器外壳 / 单个块 / 右侧面板（属性·占位符·排版·表格配置）的 HTML 生成 —— 纯函数,
// 组件状态经 EditorTexts（i18n 文案）与 EditorView（视图状态）显式传入, 不引用组件实例。

import { html, t as msg } from "../core/index.js";
import {
  type DocBlock,
  type DocFormatConfig,
  type DocPlaceholderDef,
  type DocTableColumn,
  CN_FONT_SIZE_OPTIONS,
} from "./types.js";
import { esc, renderBlock } from "./render.js";
import { clampedZoom } from "./editor-page-layout.js";
import { tableFieldPool } from "./editor-model.js";

export type PanelTab = "props" | "placeholders" | "typography";

/** 编辑器 i18n 文案（结构上由组件实例满足：均为 @property({type: String})） */
export interface EditorTexts {
  addHeadingText: string;
  addParagraphText: string;
  addTableText: string;
  addListText: string;
  addSignatureText: string;
  moveUpText: string;
  moveDownText: string;
  removeText: string;
  multiSelectText: string;
  propertiesTabText: string;
  placeholdersTabText: string;
  typographyTabText: string;
  insertText: string;
  noPlaceholderText: string;
  alignText: string;
  alignLeftText: string;
  alignCenterText: string;
  alignRightText: string;
  fontFamilyText: string;
  fontSizeText: string;
  colorText: string;
  boldText: string;
  indentText: string;
  columnWidthText: string;
  zoomOutText: string;
  zoomInText: string;
  zoomResetText: string;
  tableConfigText: string;
  dataKeyText: string;
  dataKeyHintText: string;
  columnKeyText: string;
  columnLabelText: string;
  addColumnText: string;
  removeColumnText: string;
  undefinedFieldText: string;
  noTableFieldText: string;
  staticRowText: string;
  addRowText: string;
  removeRowText: string;
  bodyFontText: string;
  headingFontText: string;
  bodySizeText: string;
  headingSizeText: string;
  lineHeightText: string;
  paraSpacingText: string;
  firstIndentText: string;
  pageMarginText: string;
  headerTextText: string;
  footerTextText: string;
}

/** 渲染所需的视图状态（组件每次渲染前组装一次） */
export interface EditorView {
  readonly: boolean;
  blocks: DocBlock[];
  selectedId: string;
  pickedIds: ReadonlySet<string>;
  multi: boolean;
  panel: PanelTab;
  cfg: DocFormatConfig;
  placeholders: DocPlaceholderDef[];
  labelOf: (key: string) => string | undefined;
  zoom: number;
}

function toolbarBtn(readonly: boolean, op: string, label: string): string {
  return `<button type="button" class="z-dte__btn" data-op="${op}"${readonly ? " disabled" : ""}>${esc(label)}</button>`;
}

function tabBtn(active: PanelTab, tab: PanelTab, label: string): string {
  const cls = active === tab ? " z-dte__tab--active" : "";
  return `<button type="button" class="z-dte__tab${cls}" data-tab="${tab}">${esc(label)}</button>`;
}

/** 组件外壳：工具栏 + 画布挂载点（持久节点由 firstUpdated 注入）+ 右侧面板 */
export function renderEditorShell(t: EditorTexts, v: EditorView): string {
  return html`
      <div class="z-dte" part="root">
        <div class="z-dte__toolbar" part="toolbar">
          ${toolbarBtn(v.readonly, "add-heading", t.addHeadingText)}
          ${toolbarBtn(v.readonly, "add-paragraph", t.addParagraphText)}
          ${toolbarBtn(v.readonly, "add-table", t.addTableText)}
          ${toolbarBtn(v.readonly, "add-list", t.addListText)}
          ${toolbarBtn(v.readonly, "add-signature", t.addSignatureText)}
          <span class="z-dte__sep"></span>
          <label class="z-dte__multi">
            <input type="checkbox" class="z-dte__multi-cb" part="multi-select"${v.multi ? " checked" : ""} />
            ${esc(t.multiSelectText)}
          </label>
          <span class="z-dte__sep"></span>
          <button type="button" class="z-dte__btn" data-op="zoom-out" title="${esc(t.zoomOutText)}" aria-label="${esc(t.zoomOutText)}">−</button>
          <button type="button" class="z-dte__btn z-dte__zoom-pct" data-op="zoom-reset" title="${esc(t.zoomResetText)}" aria-label="${esc(t.zoomResetText)}">${Math.round(clampedZoom(v.zoom) * 100)}%</button>
          <button type="button" class="z-dte__btn" data-op="zoom-in" title="${esc(t.zoomInText)}" aria-label="${esc(t.zoomInText)}">＋</button>
        </div>
        <div class="z-dte__main">
          <div class="z-dte__canvas-wrap" part="canvas-wrap">
            <!-- [WHY] 画布由 firstUpdated 一次性创建（不进渲染循环）, 见文件头注释：
                若把持久节点写进 render 输出, 每次重渲染都会多出一个新节点（旧节点被
                重新挂回 → 重复累积）, z-rich-text 同款约束 -->
          </div>
          <aside class="z-dte__aside" part="aside">
            <div class="z-dte__tabs" part="panel-tabs">
              ${tabBtn(v.panel, "props", t.propertiesTabText)}
              ${tabBtn(v.panel, "placeholders", t.placeholdersTabText)}
              ${tabBtn(v.panel, "typography", t.typographyTabText)}
            </div>
            <div class="z-dte__panel" part="panel">${panelHtml(t, v)}</div>
          </aside>
        </div>
      </div>`;
}

/** 单个块外壳：拖拽手柄（多选勾选框 / 序号 / 上下移 / 删除）+ 正文可编辑区 */
export function blockHtml(t: EditorTexts, v: EditorView, block: DocBlock, index: number): string {
  const picked = v.pickedIds.has(block.id);
  const selected = block.id === v.selectedId;
  const cls = ["z-dte__block", selected ? "z-dte__block--selected" : "", picked ? "z-dte__block--picked" : ""]
    .filter(Boolean)
    .join(" ");
  const editable = v.readonly ? "" : ' contenteditable="true"';
  const inner = renderBlock(block, null, v.labelOf);
  // [WHY] 标题/段落为单文本域；列表/签名区/表格按子节点分别可编辑（见 _onCanvasInput）
  // [WHY] 子节点必须显式带 data-editable：_onInput 用 [data-editable] 定位可编辑节点,
  // 仅加 contenteditable 的 li/span/td 会被 _onInput 早退丢掉, 输入不入模型（[[REQ-016-doc-template]]）
  const body =
    block.type === "paragraph" || block.type === "heading"
      ? inner.replace(/^<(h\d|p)([^>]*)>/, `<$1$2 data-editable="text"${editable}>`)
      : inner
          .replace(/<li>/g, `<li${editable} data-editable="list-item">`)
          .replace(/<span>/g, `<span${editable} data-editable="signature">`)
          .replace(/<th>/g, `<th${editable} data-editable="th">`)
          .replace(/<td /g, `<td${editable} data-editable="td" `);

  return html`
      <div class="${cls}" data-block-id="${esc(block.id)}" draggable="${v.readonly ? "false" : "true"}" part="block">
        <div class="z-dte__handle" part="block-handle">
          ${v.multi ? `<input type="checkbox" class="z-dte__pick" data-op="pick"${picked ? " checked" : ""} />` : ""}
          <span class="z-dte__idx">${index + 1}</span>
          <button type="button" class="z-dte__mini" data-op="up" title="${esc(t.moveUpText)}" aria-label="${esc(t.moveUpText)}">↑</button>
          <button type="button" class="z-dte__mini" data-op="down" title="${esc(t.moveDownText)}" aria-label="${esc(t.moveDownText)}">↓</button>
          <button type="button" class="z-dte__mini z-dte__mini--danger" data-op="remove" title="${esc(t.removeText)}" aria-label="${esc(t.removeText)}">✕</button>
        </div>
        <div class="z-dte__body" part="block-body">${body}</div>
      </div>`;
}

// ── 右侧面板 ────────────────────────────────────────────

export function panelHtml(t: EditorTexts, v: EditorView): string {
  if (v.panel === "placeholders") return placeholdersHtml(t, v);
  if (v.panel === "typography") return typographyHtml(t, v);
  return propsHtml(t, v);
}

function propsHtml(t: EditorTexts, v: EditorView): string {
  const block = v.blocks.find((b) => b.id === v.selectedId);
  if (!block) return `<div class="z-dte__hint">—</div>`;
  const align = block.align ?? "";
  const fontSizeOpts = [`<option value=""${block.fontSize ? "" : " selected"}>—</option>`]
    .concat(
      CN_FONT_SIZE_OPTIONS.map(
        (s) => `<option value="${s}"${block.fontSize === s ? " selected" : ""}>${s}</option>`,
      ),
    )
    .join("");

  let extra = "";
  if (block.type === "paragraph" || block.type === "heading") {
    extra = html`
        <label class="z-dte__field">
          <span>${esc(t.fontFamilyText)}</span>
          <input type="text" data-prop="fontFamily" value="${esc(block.fontFamily ?? "")}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.indentText)}</span>
          <input type="checkbox" data-prop="indent"${block.indent ? " checked" : ""} />
        </label>`;
  }
  if (block.type === "table") extra += tableConfigHtml(t, v, block);

  return html`
      <div class="z-dte__group">
        <div class="z-dte__group-name">${esc(block.type)}</div>
        <label class="z-dte__field">
          <span>${esc(t.alignText)}</span>
          <select data-prop="align">
            <option value=""${align === "" ? " selected" : ""}>—</option>
            <option value="left"${align === "left" ? " selected" : ""}>${esc(t.alignLeftText)}</option>
            <option value="center"${align === "center" ? " selected" : ""}>${esc(t.alignCenterText)}</option>
            <option value="right"${align === "right" ? " selected" : ""}>${esc(t.alignRightText)}</option>
          </select>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.fontSizeText)}</span>
          <select data-prop="fontSize">${fontSizeOpts}</select>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.colorText)}</span>
          <input type="color" data-prop="color" value="${esc(block.color || "#000000")}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.boldText)}</span>
          <input type="checkbox" data-prop="bold"${block.bold ? " checked" : ""} />
        </label>
        ${extra}
      </div>`;
}

/**
 * 表格配置区块：数据键 dataKey + 列定义（字段名 / 表头 / 列宽 / 增删列）+ 静态行增删。
 * [WHY] 编辑器此前只能手绘静态表格（只写 rows），dataKey 与字段映射必须由宿主拼 JSON 预置；
 * 本区块把「表格取哪份数据、展示哪些字段」的配置权交回编辑器（[[REQ-016-doc-template]]）。
 * 字段名候选来自宿主注入的 placeholders：dataKey 取 type="table" 的定义,
 * 列字段取该表定义的 fields（未指定 dataKey 时合并全部表定义的 fields 做候选）。
 */
export function tableConfigHtml(t: EditorTexts, v: EditorView, block: DocBlock): string {
  const columns = block.columns ?? [];
  const tableFields = v.placeholders.filter((p) => p.type === "table");
  const pool = tableFieldPool(v.placeholders, block.dataKey);
  // [WHY] 列 key 可能是宿主预置或历史数据（不在候选池里）：保留为一个「未定义」选项并选中,
  // 否则 select 会静默把 key 改成候选首项, 与宿主数据结构脱节
  const fieldOpts = (cur: string): string => {
    const known = pool.some((f) => f.key === cur);
    const head =
      cur && !known
        ? `<option value="${esc(cur)}" selected>${esc(cur)} · ${esc(t.undefinedFieldText)}</option>`
        : `<option value=""${cur ? "" : " selected"}>—</option>`;
    return (
      head +
      pool
        .map((f) => `<option value="${esc(f.key)}"${f.key === cur ? " selected" : ""}>${esc(f.label || f.key)}</option>`)
        .join("")
    );
  };
  const colRows = columns
    .map(
      (c: DocTableColumn, i: number) => html`
          <div class="z-dte__col-row">
            <select data-table="columnKey" data-col="${i}" title="${esc(t.columnKeyText)}">${fieldOpts(c.key)}</select>
            <input
              type="text"
              data-table="columnLabel"
              data-col="${i}"
              value="${esc(c.label)}"
              title="${esc(t.columnLabelText)}"
            />
            <input
              type="number"
              min="10"
              data-table="columnWidth"
              data-col="${i}"
              value="${c.width ?? ""}"
              title="${esc(t.columnWidthText)}"
            />
            <button
              type="button"
              class="z-dte__mini z-dte__mini--danger"
              data-op="remove-column"
              data-col="${i}"
              title="${esc(t.removeColumnText)}"
              aria-label="${esc(t.removeColumnText)}"
              ${v.readonly ? "disabled" : ""}
            >✕</button>
          </div>`,
    )
    .join("");
  // [WHY] 静态行只在未接数据源时才有意义：接上 dataKey 后表体由数据驱动, rows 被渲染忽略
  const rowsBlock = block.dataKey
    ? ""
    : html`
          <div class="z-dte__sub">${esc(t.staticRowText)} · ${block.rows?.length ?? 0}</div>
          <div class="z-dte__row-ops">
            <button type="button" class="z-dte__btn" data-op="add-row" ${v.readonly ? "disabled" : ""}>
              ${esc(t.addRowText)}
            </button>
            <button type="button" class="z-dte__btn" data-op="remove-row" ${v.readonly ? "disabled" : ""}>
              ${esc(t.removeRowText)}
            </button>
          </div>`;

  return html`
      <div class="z-dte__sub">${esc(t.tableConfigText)}</div>
      <label class="z-dte__field">
        <span>${esc(t.dataKeyText)}</span>
        <input
          type="text"
          data-table="dataKey"
          list="z-dte-table-keys"
          value="${esc(block.dataKey ?? "")}"
          placeholder="${esc(t.dataKeyHintText)}"
        />
      </label>
      <datalist id="z-dte-table-keys">
        ${tableFields.map((f) => `<option value="${esc(f.key)}">${esc(f.label)}</option>`).join("")}
      </datalist>
      <div class="z-dte__cols">${colRows}</div>
      <div class="z-dte__row-ops">
        <button type="button" class="z-dte__btn" data-op="add-column" ${v.readonly ? "disabled" : ""}>
          ${esc(t.addColumnText)}
        </button>
      </div>
      ${pool.length === 0 ? `<div class="z-dte__sub">${esc(t.noTableFieldText)}</div>` : ""}
      ${rowsBlock}`;
}

function placeholdersHtml(t: EditorTexts, v: EditorView): string {
  if (v.placeholders.length === 0) {
    return `<div class="z-dte__hint">${esc(t.noPlaceholderText)}</div>`;
  }
  return `<div class="z-dte__ph-list">${v.placeholders
    .map(
      (p) => html`
          <div class="z-dte__ph" draggable="true" data-ph-key="${esc(p.key)}" part="placeholder-item">
            <div class="z-dte__ph-info">
              <span class="z-dte__ph-key">{{${esc(p.key)}}}</span>
              <span class="z-dte__ph-label">${esc(p.label)}</span>
              ${p.sample ? `<span class="z-dte__ph-sample">${esc(p.sample)}</span>` : ""}
            </div>
            <button type="button" class="z-dte__btn" data-op="insert-ph" data-key="${esc(p.key)}"${v.readonly ? " disabled" : ""}>
              ${esc(t.insertText)}
            </button>
          </div>`,
    )
    .join("")}</div>`;
}

function typographyHtml(t: EditorTexts, v: EditorView): string {
  const cfg = v.cfg;
  const sizeOpts = (cur: string): string =>
    [`<option value=""${cur ? "" : " selected"}>—</option>`]
      .concat(CN_FONT_SIZE_OPTIONS.map((s) => `<option value="${s}"${cur === s ? " selected" : ""}>${s}</option>`))
      .join("");
  const lhOpts = [1, 1.5, 1.8, 2]
    .map((h) => `<option value="${h}"${cfg.lineHeight === h ? " selected" : ""}>${h.toFixed(1)}</option>`)
    .join("");
  return html`
      <div class="z-dte__group">
        <label class="z-dte__field">
          <span>${esc(t.bodyFontText)}</span>
          <input type="text" data-cfg="bodyFont" value="${esc(cfg.bodyFont)}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.headingFontText)}</span>
          <input type="text" data-cfg="headingFont" value="${esc(cfg.headingFont)}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.bodySizeText)}</span>
          <select data-cfg="bodyFontSize">${sizeOpts(cfg.bodyFontSize)}</select>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.headingSizeText)}</span>
          <select data-cfg="headingFontSize">${sizeOpts(cfg.headingFontSize)}</select>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.lineHeightText)}</span>
          <select data-cfg="lineHeight">${lhOpts}</select>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.paraSpacingText)}</span>
          <input type="number" min="0" step="1" data-cfg="paragraphSpacing" value="${cfg.paragraphSpacing}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.firstIndentText)}</span>
          <input type="text" data-cfg="firstLineIndent" value="${esc(cfg.firstLineIndent)}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.pageMarginText)}</span>
          <span class="z-dte__margin-row">
            <input type="number" min="0" max="60" step="1" data-cfg="marginTop" value="${cfg.marginTop ?? 20}" title="${esc(msg("marginTopShort"))}" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginBottom" value="${cfg.marginBottom ?? 20}" title="${esc(msg("marginBottomShort"))}" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginLeft" value="${cfg.marginLeft ?? 18}" title="${esc(msg("alignLeftShort"))}" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginRight" value="${cfg.marginRight ?? 18}" title="${esc(msg("alignRightShort"))}" />
          </span>
        </label>
        <label class="z-dte__field">
          <span>${esc(t.headerTextText)}</span>
          <input type="text" data-cfg="headerText" value="${esc(cfg.headerText ?? "")}" placeholder="${esc(msg("headerPlaceholder"))}" />
        </label>
        <label class="z-dte__field">
          <span>${esc(t.footerTextText)}</span>
          <input type="text" data-cfg="footerText" value="${esc(cfg.footerText ?? "")}" placeholder="${esc(msg("footerPlaceholder"))}" />
        </label>
      </div>`;
}
