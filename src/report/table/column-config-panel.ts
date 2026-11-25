// [WHY] 2026-10-25 系统审计：从 ReportTable.ts（1058 行）按职责拆出
// 职责：表头列配置/列格式下拉面板的 HTML 生成，以及把这些面板按钮的点击转成"列变更意图"的处理器
// （纯函数 + host 回调，不持有元素引用；状态仍归 ReportTable 所有）。

import { html } from "../../core/index.js";
import { esc, type ReportColFormat, type ReportColumn } from "./report-table-types.js";

// [WHY] i18n: 面板文案全部由宿主属性传入, 面板本身不硬编码文案, 见 [[REQ-001]]
export interface ColumnConfigTexts {
  columnSettingsText: string;
  footerToggleText: string;
  alignLeftText: string;
  alignCenterText: string;
  alignRightText: string;
  pinNoneText: string;
  pinLeftText: string;
  pinRightText: string;
  formatTypeText: string;
  numberText: string;
  percentText: string;
  decimalPlacesText: string;
  thousandsText: string;
  autoText: string;
}

/** 面板处理器回写宿主的唯一通道(对应原 ReportTable 的私有状态与 emit) */
export interface ColumnConfigHost {
  columns: ReportColumn[];
  colFormats: Record<string, ReportColFormat>;
  /** 原 _configOpen 写入口, 不含重绘 */
  setConfigOpen(key: string | null): void;
  getConfigOpen(): string | null;
  /** 原 requestUpdate() */
  update(): void;
  emit(name: string, detail: unknown): void;
  /** 原 _emitConfigChange(): 统一配置快照事件 */
  emitConfigChange(): void;
  setColFormats(next: Record<string, ReportColFormat>): void;
}

// ═══════════════════════════════════════════════════════════
// Render
// ═══════════════════════════════════════════════════════════

export function renderColumnConfig(
  col: ReportColumn,
  opts: { open: boolean; format: ReportColFormat | undefined; texts: ColumnConfigTexts },
): string {
  const { open, texts } = opts;
  const align = col.align ?? "";
  // [WHY] 对齐图标: 三条水平线示意左/中/右对齐, 无需 i18n 文案
  const paths: Record<string, string> = {
    left: '<path d="M4 6h16 M4 12h10 M4 18h13"/>',
    center: '<path d="M4 6h16 M7 12h10 M4 18h16"/>',
    right: '<path d="M4 6h16 M10 12h10 M7 18h13"/>',
  };
  // [WHY] i18n: 对齐 tips 按位置取属性, 中文如"左对齐/居中/右对齐"无统一模板
  const alignTips: Record<string, string> = { left: texts.alignLeftText, center: texts.alignCenterText, right: texts.alignRightText };
  const aligns = (["left", "center", "right"] as const).map((a) => {
    const active = align === a ? " z-rpt__th-config-align--active" : "";
    return html`
        <button type="button" class="z-rpt__th-config-align${active}" data-align="${a}"
                title="${esc(alignTips[a])}" aria-label="${esc(alignTips[a])}" aria-pressed="${active ? "true" : "false"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${paths[a]}</svg>
        </button>`;
  }).join("");

  // [WHY] 编辑态冻结: 无/左/右三段按钮切换 col.fixed, 图标为竖栏 + 吸附边缘线
  const fix = col.fixed ?? "none";
  const fixIcons: Record<string, string> = {
    none: '<rect x="6" y="4" width="12" height="16" rx="1"/>',
    left: '<path d="M5 4v16"/><rect x="8" y="4" width="12" height="16" rx="1"/>',
    right: '<rect x="4" y="4" width="12" height="16" rx="1"/><path d="M19 4v16"/>',
  };
  const fixLabels: Record<string, string> = { none: texts.pinNoneText, left: texts.pinLeftText, right: texts.pinRightText };
  const fixes = (["none", "left", "right"] as const).map((f) => {
    const active = fix === f ? " z-rpt__th-config-fix--active" : "";
    return html`
        <button type="button" class="z-rpt__th-config-fix${active}" data-fix="${f}"
                title="${esc(fixLabels[f])}" aria-label="${esc(fixLabels[f])}" aria-pressed="${active ? "true" : "false"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${fixIcons[f]}</svg>
        </button>`;
  }).join("");

  // [WHY] 数字列格式: 小数位(自动/0-4) + 千分位(开/关), 文本列不渲染该区块
  const fmtMenu = col.numeric ? renderColumnFormat(opts.format, texts) : "";

  return html`
      <span class="z-rpt__th-config ${open ? "z-rpt__th-config--open" : ""}">
        <button type="button" class="z-rpt__th-config-btn" part="column-config-trigger"
                aria-haspopup="menu" aria-expanded="${open ? "true" : "false"}" title="${esc(texts.columnSettingsText)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        ${open
          ? html`<div class="z-rpt__th-config-menu" part="column-config-menu">
              <div class="z-rpt__th-config-row">${aligns}</div>
              <div class="z-rpt__th-config-row z-rpt__th-config-row--fix">${fixes}</div>
              <label class="z-rpt__th-config-row z-rpt__th-config-item">
                <input type="checkbox" class="z-rpt__th-config-footer" data-key="${col.key}"
                       ${col.showFooter !== false ? "checked" : ""} part="column-config-footer" />
                <span>${esc(texts.footerToggleText)}</span>
              </label>
              ${fmtMenu}
            </div>`
          : ""}
      </span>
    `;
}

export function renderColumnFormat(fmt: ReportColFormat | undefined, texts: ColumnConfigTexts): string {
  const f = fmt ?? {};
  const type = f.formatType ?? "number";
  const typeOpts = (["number", "percent"] as const).map((v) => {
    const active = type === v ? " z-rpt__th-config-fmt--active" : "";
    const label = v === "number" ? texts.numberText : texts.percentText;
    return html`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-type${active}"
                data-format-type="${v}" title="${esc(texts.formatTypeText)}: ${esc(label)}"
                aria-pressed="${active ? "true" : "false"}">${esc(label)}</button>`;
  }).join("");
  const dec = f.decimalPlaces;
  const decOpts = (["auto", "0", "1", "2", "3", "4"] as const).map((v) => {
    const active = (v === "auto" ? dec === undefined : dec === Number(v)) ? " z-rpt__th-config-fmt--active" : "";
    const label = v === "auto" ? texts.autoText : v;
    return html`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-dec${active}"
                data-dec="${v}" title="${esc(texts.decimalPlacesText)}: ${esc(label)}"
                aria-pressed="${active ? "true" : "false"}">${esc(label)}</button>`;
  }).join("");
  const thou = f.thousands === true;
  const thouOpts = (["off", "on"] as const).map((v) => {
    const active = (v === "on") === thou ? " z-rpt__th-config-fmt--active" : "";
    const label = v === "on" ? "开" : "关";
    return html`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-thou${active}"
                data-thou="${v}" title="${esc(texts.thousandsText)}: ${label}"
                aria-pressed="${active ? "true" : "false"}">${label}</button>`;
  }).join("");
  return html`
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${esc(texts.formatTypeText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${typeOpts}</span>
      </div>
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${esc(texts.decimalPlacesText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${decOpts}</span>
      </div>
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${esc(texts.thousandsText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${thouOpts}</span>
      </div>`;
}

// ═══════════════════════════════════════════════════════════
// Click handlers (DOM 读取 → 列变更意图 → host 回写)
// ═══════════════════════════════════════════════════════════

function handleToggleConfig(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key ?? null;
  host.setConfigOpen(host.getConfigOpen() === key ? null : key);
  host.update();
}

function handleFixChange(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  const fix = btn.dataset.fix as "none" | "left" | "right";
  if (!key || !fix) return;
  const col = host.columns.find((c) => c.key === key);
  if (!col) return;
  // [WHY] 再点当前冻结位置还原为不冻结, 与对齐按钮"再点还原默认"交互一致
  col.fixed = fix === "none" ? undefined : col.fixed === fix ? undefined : fix;
  host.setConfigOpen(null);
  host.update();
  host.emit("z-column-config-change", { key, align: col.align ?? null, showFooter: col.showFooter !== false, fixed: col.fixed ?? null });
  host.emitConfigChange();
}

function handleAlignChange(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  const align = btn.dataset.align as "left" | "center" | "right";
  if (!key || !align) return;
  const col = host.columns.find((c) => c.key === key);
  if (!col) return;
  // [WHY] 再点当前对齐项还原为默认(undefined), 表头默认居中/数据默认左对齐
  col.align = col.align === align ? undefined : align;
  host.setConfigOpen(null);
  host.update();
  host.emit("z-column-config-change", { key, align: col.align ?? null, showFooter: col.showFooter !== false });
  host.emitConfigChange();
}

function handleFormatTypeChange(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  const v = btn.dataset.formatType as "number" | "percent";
  if (!key || !v) return;
  const fmt = { ...(host.colFormats[key] ?? {}) };
  if (v === "number") delete fmt.formatType;
  else fmt.formatType = v;
  applyFormatChange(key, fmt, host);
}

function handleDecimalChange(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  const v = btn.dataset.dec;
  if (!key || !v) return;
  const fmt = { ...(host.colFormats[key] ?? {}) };
  if (v === "auto") delete fmt.decimalPlaces;
  else fmt.decimalPlaces = Number(v);
  applyFormatChange(key, fmt, host);
}

function handleThousandsChange(btn: HTMLElement, host: ColumnConfigHost): void {
  const th = btn.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  const v = btn.dataset.thou;
  if (!key || !v) return;
  const fmt = { ...(host.colFormats[key] ?? {}) };
  if (v === "on") fmt.thousands = true;
  else delete fmt.thousands;
  applyFormatChange(key, fmt, host);
}

function applyFormatChange(key: string, fmt: ReportColFormat, host: ColumnConfigHost): void {
  // [WHY] 清空对象: 外部(React)据此从 colFormats 移除该列, 保持配置干净; 组件内部同步状态驱动按钮选中态
  if (Object.keys(fmt).length === 0) {
    const next = { ...host.colFormats };
    delete next[key];
    host.setColFormats(next);
  } else {
    host.setColFormats({ ...host.colFormats, [key]: fmt });
  }
  host.setConfigOpen(null);
  host.update();
  host.emit("z-column-format-change", { key, format: fmt });
}

/**
 * 面板内点击分发: 命中任一配置项则处理并返回 true。
 * 顺序与原 _onShadowClick 中的 closest 判定链一致(trigger → 对齐 → 冻结 → 格式类型 → 小数位 → 千分位)。
 */
export function handleColumnConfigClick(target: HTMLElement, host: ColumnConfigHost): boolean {
  const configBtn = target.closest(".z-rpt__th-config-btn");
  if (configBtn) {
    handleToggleConfig(configBtn as HTMLElement, host);
    return true;
  }
  // Align option in config dropdown
  const alignBtn = target.closest(".z-rpt__th-config-align");
  if (alignBtn) {
    handleAlignChange(alignBtn as HTMLElement, host);
    return true;
  }
  // Freeze option in config dropdown
  const fixBtn = target.closest(".z-rpt__th-config-fix");
  if (fixBtn) {
    handleFixChange(fixBtn as HTMLElement, host);
    return true;
  }
  // Format type option in config dropdown
  const typeBtn = target.closest(".z-rpt__th-config-type");
  if (typeBtn) {
    handleFormatTypeChange(typeBtn as HTMLElement, host);
    return true;
  }
  // Decimal places option in config dropdown
  const decBtn = target.closest(".z-rpt__th-config-dec");
  if (decBtn) {
    handleDecimalChange(decBtn as HTMLElement, host);
    return true;
  }
  // Thousands option in config dropdown
  const thouBtn = target.closest(".z-rpt__th-config-thou");
  if (thouBtn) {
    handleThousandsChange(thouBtn as HTMLElement, host);
    return true;
  }
  return false;
}
