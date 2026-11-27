import { defineElement, t } from "../core/index.js";
// <z-doc-template-editor> 文档模板编辑器：编辑正文并插入占位符，块选择与属性面板联动，变更发 z-change。
// [WHY] 2026-10-25 系统审计：从 DocTemplateEditor.ts（1264 行）按职责拆出
// 职责：z-doc-template-editor 的事件绑定与交互、编辑型公开 API（增删块 / 表格结构 / 载入模板）；
// 状态与渲染继承自 doc-template-editor-core.ts, 本文件即对外注册的组件类。

import {
  type DocBlock,
  type DocBlockType,
  type DocFormatConfig,
  parseFormatConfig,
} from "./types.js";
import { createBlockId, esc, parseBlocks } from "./render.js";
import { clampedZoom, syncPagesStyle } from "./editor-page-layout.js";
import { type PanelTab } from "./editor-html.js";
import {
  applyBlockPropInput,
  applyFormatConfigInput,
  applyTableConfigInput,
  syncBlockFromDom,
} from "./editor-model.js";
import { DocTemplateEditorBase } from "./doc-template-editor-core.js";

export type { DocPlaceholderDef } from "./types.js";

export class ZDocTemplateEditor extends DocTemplateEditorBase {
  private _eventsBound = false;

  // ── 事件 ────────────────────────────────────────────────

  protected _bindEvents(): void {
    if (this._eventsBound) return;
    const root = this.shadowRoot as unknown as HTMLElement;
    if (!root) return;
    root.addEventListener("click", this._onClick);
    root.addEventListener("change", this._onChange);
    root.addEventListener("input", this._onInput);
    root.addEventListener("dragstart", this._onDragStart);
    root.addEventListener("dragover", this._onDragOver);
    root.addEventListener("drop", this._onDrop);
    this._eventsBound = true;
  }

  private _onClick = (e: Event): void => {
    const el = e.target as HTMLElement;

    const tab = el.closest<HTMLElement>("[data-tab]");
    if (tab) {
      this._panel = tab.dataset.tab as PanelTab;
      this.requestUpdate();
      return;
    }

    const opEl = el.closest<HTMLElement>("[data-op]");
    if (opEl) {
      const op = opEl.dataset.op!;
      const blockEl = opEl.closest<HTMLElement>("[data-block-id]");
      const id = blockEl?.dataset.blockId ?? this._selectedId;
      // [WHY] 缩放控件不属于块操作, 先于块级 op 处理（无 data-block-id 上下文依赖）
      if (op === "zoom-in" || op === "zoom-out" || op === "zoom-reset") {
        const z = clampedZoom(this.zoom);
        if (op === "zoom-reset") this.zoom = 1;
        else {
          const next = Math.min(2, Math.max(0.5, Math.round((z + (op === "zoom-in" ? 0.1 : -0.1)) * 10) / 10));
          this.zoom = next;
        }
        if (this.zoom !== z) this.requestUpdate();
        return;
      }
      if (op === "pick") return; // change 事件处理
      if (op === "insert-ph") {
        this.insertPlaceholder(opEl.dataset.key!);
        return;
      }
      // [WHY] 表格配置面板的增删列/行必须先于 add- 前缀分支判断, 否则会被当成 addBlock("column"/"row")
      if (op === "add-column") {
        this.addTableColumn(id);
        return;
      }
      if (op === "remove-column") {
        this.removeTableColumn(id, Number(opEl.dataset.col));
        return;
      }
      if (op === "add-row") {
        this.addTableRow(id);
        return;
      }
      if (op === "remove-row") {
        this.removeTableRow(id);
        return;
      }
      if (op.startsWith("add-")) {
        this.addBlock(op.replace("add-", "") as DocBlockType);
        return;
      }
      if (op === "up") this.moveBlock(id, -1);
      else if (op === "down") this.moveBlock(id, 1);
      else if (op === "remove") this.removeBlock(id);
      return;
    }

    // [WHY] 点击占位符高亮节点：选中所在块并通知宿主（便于宿主弹配置）
    const ph = el.closest<HTMLElement>(".z-doc-ph");
    if (ph) {
      const blockEl = ph.closest<HTMLElement>("[data-block-id]");
      if (blockEl) this._select(blockEl.dataset.blockId!);
      this.emit("z-placeholder-click", { key: ph.dataset.ph });
      return;
    }

    const blockEl = el.closest<HTMLElement>("[data-block-id]");
    if (blockEl) this._select(blockEl.dataset.blockId!);
  };

  private _select(id: string): void {
    if (this._selectedId === id) return;
    this._selectedId = id;
    this._pickedIds.clear();
    // [WHY] 选中态只切 class, 不重建画布（避免丢失正在编辑的光标位置）
    const pagesWrap = this._pagesWrap;
    if (pagesWrap) {
      pagesWrap.querySelectorAll(".z-dte__block").forEach((b) => {
        const on = (b as HTMLElement).dataset.blockId === id;
        b.classList.toggle("z-dte__block--selected", on);
        // [WHY] 属性面板需随选中块刷新；画布不整块重建, 仅 requestUpdate 面板
      });
    }
    this.emit("z-block-select", { block: this._blocks.find((b) => b.id === id) ?? null });
    this.requestUpdate();
  }

  /** 画布输入直写模型, 不触发重渲染（[[2026-08-11-W19-rich-text]] 同款约束） */
  private _onInput = (e: Event): void => {
    const el = e.target as HTMLElement;
    const editable = el.closest<HTMLElement>("[data-editable]");
    if (!editable) return;
    if (editable.hasAttribute("contenteditable") || editable.getAttribute("contenteditable") === "true") {
      this._syncBlockFromDom(el, editable);
      this._scheduleEmit();
      this._schedulePageLayout();
    }
  };

  private _syncBlockFromDom(target: HTMLElement, editable: HTMLElement): void {
    syncBlockFromDom(this._blocks, target, editable);
  }

  private _onChange = (e: Event): void => {
    const el = e.target as HTMLElement;
    const input = el as HTMLInputElement;

    if (el.classList.contains("z-dte__multi-cb")) {
      this._multi = input.checked;
      if (!this._multi) this._pickedIds.clear();
      this._canvasDirty = true;
      this.requestUpdate();
      return;
    }
    if (el.classList.contains("z-dte__pick")) {
      const id = el.closest<HTMLElement>("[data-block-id]")?.dataset.blockId;
      if (!id) return;
      if (input.checked) this._pickedIds.add(id);
      else this._pickedIds.delete(id);
      return;
    }

    const cfgKey = input.dataset.cfg as keyof DocFormatConfig | undefined;
    if (cfgKey) {
      this._cfg = applyFormatConfigInput(this._cfg, cfgKey, input);
      // [WHY] 排版只改样式变量, 不重建画布（保光标）；预览/打印/导出读同一份配置
      if (this._pagesWrap) syncPagesStyle(this._pagesWrap, this._cfg);
      // [WHY] 边距/页眉页脚变更会改变页容量 → 分页需重算
      this._schedulePageLayout();
      this._scheduleEmit(true);
      return;
    }

    const block = this._blocks.find((b) => b.id === this._selectedId);
    if (!block) return;

    // [WHY] 表格配置面板：数据键 / 列字段 / 表头 / 列宽（[[REQ-016-doc-template]]）
    if (input.dataset.table) {
      if (!applyTableConfigInput(block, input, this.placeholders)) return;
      this._canvasDirty = true;
      // [WHY] 结构变更需立即通知宿主：预览要按新 dataKey 重新取数, 宿主数据录入表单要按新字段重排
      this._scheduleEmit(true);
      this.requestUpdate();
      return;
    }

    const prop = input.dataset.prop;
    if (!prop) return;
    applyBlockPropInput(block, prop, input);
    this._canvasDirty = true;
    this.requestUpdate();
  };

  // ── 拖拽：块排序 + 占位符拖入 ───────────────────────────

  private _onDragStart = (e: DragEvent): void => {
    const el = e.target as HTMLElement;
    const ph = el.closest<HTMLElement>("[data-ph-key]");
    if (ph) {
      this._dragId = "";
      e.dataTransfer?.setData("text/z-doc-ph", ph.dataset.phKey!);
      return;
    }
    const blockEl = el.closest<HTMLElement>("[data-block-id]");
    if (blockEl) {
      this._dragId = blockEl.dataset.blockId!;
      e.dataTransfer?.setData("text/z-doc-block", this._dragId);
    }
  };

  private _onDragOver = (e: DragEvent): void => {
    const el = e.target as HTMLElement;
    if (el.closest("[data-block-id]") || el.closest("[data-ph-key]")) e.preventDefault();
  };

  private _onDrop = (e: DragEvent): void => {
    const el = e.target as HTMLElement;
    const phKey = e.dataTransfer?.getData("text/z-doc-ph");
    const blockEl = el.closest<HTMLElement>("[data-block-id]");

    if (phKey) {
      e.preventDefault();
      const editable = blockEl?.querySelector<HTMLElement>("[data-editable]");
      if (editable) {
        this._insertIntoEditable(editable, phKey);
        this._syncBlockFromDom(editable, editable);
      } else {
        this.insertPlaceholder(phKey);
      }
      return;
    }

    const dragId = this._dragId || e.dataTransfer?.getData("text/z-doc-block");
    if (!dragId || !blockEl) return;
    e.preventDefault();
    const targetId = blockEl.dataset.blockId!;
    if (dragId === targetId) return;
    const from = this._blocks.findIndex((b) => b.id === dragId);
    const to = this._blocks.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = this._blocks.splice(from, 1);
    this._blocks.splice(to, 0, moved);
    this._dragId = "";
    this._canvasDirty = true;
    this._scheduleEmit(true);
  };

  /** 在可编辑节点光标处插入占位符高亮节点（芯片显示字段名, 回写按 data-ph 反解） */
  private _insertIntoEditable(editable: HTMLElement, key: string): void {
    const label = this._labelOf(key);
    const inner = label ? esc(label) : `{{${esc(key)}}}`;
    const span = `<span class="z-doc-ph" data-ph="${esc(key)}" contenteditable="false" draggable="false">${inner}</span>`;
    const sel = document.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editable.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const frag = range.createContextualFragment(span);
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
    }
    editable.insertAdjacentHTML("beforeend", span);
  }

  // ── 编辑型公开 API ──────────────────────────────────────

  /** 在选中块末尾（或新建段落）插入占位符 */
  insertPlaceholder(key: string): void {
    if (this.readonly) return;
    const block = this._blocks.find((b) => b.id === this._selectedId);
    const editable = this._pagesWrap?.querySelector<HTMLElement>(
      `[data-block-id="${this._selectedId}"] [data-editable]`,
    );
    if (block && editable && (block.type === "paragraph" || block.type === "heading")) {
      this._insertIntoEditable(editable, key);
      this._syncBlockFromDom(editable, editable);
    } else {
      const nb: DocBlock = { id: createBlockId(), type: "paragraph", text: `{{${key}}}` };
      this._blocks.push(nb);
      this._selectedId = nb.id;
      this._canvasDirty = true;
    }
    this._scheduleEmit(true);
    this.requestUpdate();
  }

  addBlock(type: DocBlockType): DocBlock {
    const block: DocBlock = { id: createBlockId(), type };
    if (type === "heading") {
      block.level = 1;
      block.text = "";
    } else if (type === "paragraph") {
      block.text = "";
    } else if (type === "list") {
      block.items = [""];
      block.ordered = false;
    } else if (type === "table") {
      block.columns = [
        { key: "col1", label: t("columnN", { n: 1 }), width: 60 },
        { key: "col2", label: t("columnN", { n: 2 }), width: 60 },
      ];
      block.rows = [["", ""]];
    } else if (type === "signature") {
      block.left = t("partyASignature");
      block.right = t("partyBSignature");
    }
    this._blocks.push(block);
    this._selectedId = block.id;
    this._canvasDirty = true;
    this._scheduleEmit(true);
    this.requestUpdate();
    return block;
  }

  // ── 表格结构编辑（[[REQ-016-doc-template]]：编辑器内配置展示字段 / 列数 / 行数） ──

  /** 加一列：字段名与表头给默认值待配, 列结构变更后由属性面板下拉改成真实字段 */
  addTableColumn(id: string): void {
    const block = this._tableBlock(id);
    if (!block) return;
    block.columns = block.columns ?? [];
    const n = block.columns.length + 1;
    block.columns.push({ key: `col${n}`, label: t("columnN", { n }), width: 60 });
    // [WHY] 静态行同步补齐单元格, 避免 rows 参差（保存后宿主看到的数据结构不规整）
    for (const row of block.rows ?? []) while (row.length < block.columns.length) row.push("");
    this._afterTableMutate(block);
  }

  /** 删第 index 列：至少保留一列；静态行同步删该列单元格, 保持列对齐 */
  removeTableColumn(id: string, index: number): void {
    const block = this._tableBlock(id);
    if (!block?.columns || block.columns.length <= 1) return;
    if (index < 0 || index >= block.columns.length) return;
    block.columns.splice(index, 1);
    for (const row of block.rows ?? []) row.splice(index, 1);
    this._afterTableMutate(block);
  }

  /** 静态表格加一行空行（列数按当前列定义） */
  addTableRow(id: string): void {
    const block = this._tableBlock(id);
    if (!block) return;
    block.rows = block.rows ?? [];
    block.rows.push(Array.from({ length: block.columns?.length ?? 0 }, () => ""));
    this._afterTableMutate(block);
  }

  /** 静态表格删末行：至少保留一行 */
  removeTableRow(id: string): void {
    const block = this._tableBlock(id);
    if (!block?.rows || block.rows.length <= 1) return;
    block.rows.pop();
    this._afterTableMutate(block);
  }

  private _tableBlock(id: string): DocBlock | null {
    const block = this._blocks.find((b) => b.id === id);
    return block && block.type === "table" ? block : null;
  }

  /** [WHY] 表格结构变更统一出口：重建画布 + 立即通知宿主（预览取数/数据表单需按新字段重排） */
  private _afterTableMutate(block: DocBlock): void {
    this._selectedId = block.id;
    this._canvasDirty = true;
    this._scheduleEmit(true);
    this.requestUpdate();
  }

  moveBlock(id: string, delta: number): void {
    const from = this._blocks.findIndex((b) => b.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= this._blocks.length) return;
    const [moved] = this._blocks.splice(from, 1);
    this._blocks.splice(to, 0, moved);
    this._canvasDirty = true;
    this._scheduleEmit(true);
    this.requestUpdate();
  }

  removeBlock(id: string): void {
    if (this.readonly) return;
    // [WHY] 多选态批量删除：命中任一被勾选块即删除全部勾选块（块可增删、排序、多选）
    const ids = this._pickedIds.size > 1 && this._pickedIds.has(id) ? Array.from(this._pickedIds) : [id];
    this._blocks = this._blocks.filter((b) => !ids.includes(b.id));
    ids.forEach((i) => this._pickedIds.delete(i));
    if (ids.includes(this._selectedId)) this._selectedId = "";
    this._canvasDirty = true;
    this._scheduleEmit(true);
    this.requestUpdate();
  }

  /** 载入模板（列表 → 编辑器的标准入口） */
  loadTemplate(tpl: { content: string; formatConfig: string }): void {
    this.content = tpl.content;
    this.formatConfig = tpl.formatConfig;
    this._blocks = parseBlocks(tpl.content) ?? [];
    this._cfg = parseFormatConfig(tpl.formatConfig);
    this._selectedId = "";
    this._pickedIds.clear();
    this._lastHydrated = `${this.content}||${this.formatConfig}`;
    this._canvasDirty = true;
    this.requestUpdate();
  }
}

defineElement("z-doc-template-editor", ZDocTemplateEditor);
