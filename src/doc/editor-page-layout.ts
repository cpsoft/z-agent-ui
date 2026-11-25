// [WHY] 2026-10-25 系统审计：从 DocTemplateEditor.ts（1264 行）按职责拆出
// 职责：编辑画布的 A4 逐页分派 / 缩放高度补偿 / 排版变量下发 / 跨页光标保持 —— 纯 DOM 几何逻辑,
// 所需状态（页面容器、缩放倍率、排版配置）全部由调用方以参数传入, 不引用组件实例。

import { type DocFormatConfig, formatConfigToStyle } from "./types.js";
import { esc } from "./render.js";

export interface CaretSnapshot {
  blockId: string;
  offset: number;
}

export function clampedZoom(zoom: number): number {
  return Math.min(2, Math.max(0.5, zoom || 1));
}

/**
 * 缩放高度补偿：transform 不改变布局盒, scale≠1 时按视觉高度撑高包装层,
 * 否则 z>1 时画布底部超出可滚动区、z<1 时下方留大段空白。
 */
export function compensateScale(
  scaleEl: HTMLElement | null,
  pagesWrap: HTMLElement | null,
  zoom: number,
): void {
  if (!scaleEl || !pagesWrap) return;
  const z = clampedZoom(zoom);
  if (z === 1) {
    scaleEl.style.transform = "";
    scaleEl.style.height = "";
    return;
  }
  // [WHY] transform 是缩放本体, 必须始终应用; 高度补偿需要布局测量,
  // offsetHeight<=0（无布局引擎/未布局）时跳过, 避免把包装层压成 0 高
  scaleEl.style.transform = `scale(${z})`;
  if (pagesWrap.offsetHeight <= 0) return;
  scaleEl.style.height = `${Math.ceil(pagesWrap.offsetHeight * z)}px`;
}

export function syncPagesStyle(pagesWrap: HTMLElement, cfg: DocFormatConfig): void {
  // [WHY] CSS 变量挂在容器上经继承到达每页纸张（页边距 padding 在 .z-doc-paper 消费）
  pagesWrap.setAttribute("style", formatConfigToStyle(cfg));
}

// ── 编辑视图逐页分派（Word 式多页, 纯显示层） ─────────────

/** 单页纸张壳：完整 .z-doc-paper（794×1123px + 页边距 padding）+ 每页页眉/页脚 */
export function createPageShell(cfg: DocFormatConfig): HTMLDivElement {
  const head = cfg.headerText?.trim() ?? "";
  const foot = cfg.footerText?.trim() ?? "";
  const page = document.createElement("div");
  page.className = "z-dte__page z-doc-paper z-doc-paper--sized z-doc-paper--hf";
  page.setAttribute("part", "page");
  page.innerHTML =
    (head ? `<div class="z-doc-page-head">${esc(head)}</div>` : "") +
    `<div class="z-doc-page-body"></div>` +
    (foot ? `<div class="z-doc-page-foot">${esc(foot)}</div>` : "");
  return page;
}

/**
 * 按真实块高把块分派到逐页独立 A4 纸张的正文区（每页页容量自动扣除页眉页脚与上下边距）。
 * [WHY] 2026-09-26 用户反馈：分页线方案只有一条虚线, 没体现每页的页眉页脚与边距；
 * Word 式形态 = 画布直接由多张完整 A4 纸组成。只搬移块节点, 不改块模型；
 * 单块高于整页（超长表格）无法拆 → 该页增高容纳（.z-dte__page--tall）。
 */
export function layoutPages(wrap: HTMLElement | null, cfg: DocFormatConfig): void {
  if (!wrap) return;
  const blocks = Array.from(wrap.querySelectorAll<HTMLElement>(".z-dte__block"));
  if (blocks.length === 0) return;
  const paper = blocks[0].closest<HTMLElement>(".z-dte__page");
  if (!paper || paper.clientHeight <= 0) return; // 无布局引擎（happy-dom）→ 维持单页

  // 页容量 = 纸张内容盒高 - 页眉占位 - 页脚占位（含外边距）; 2px 防边缘溢出被 overflow:hidden 裁
  const cs = getComputedStyle(paper);
  const contentH =
    paper.clientHeight - (Number.parseFloat(cs.paddingTop) || 0) - (Number.parseFloat(cs.paddingBottom) || 0);
  const occupied = (sel: string): number => {
    const el = paper.querySelector<HTMLElement>(sel);
    if (!el) return 0;
    const s = getComputedStyle(el);
    return el.offsetHeight + (Number.parseFloat(s.marginTop) || 0) + (Number.parseFloat(s.marginBottom) || 0);
  };
  const cap = contentH - occupied(".z-doc-page-head") - occupied(".z-doc-page-foot") - 2;
  if (cap < 60) return;

  // Phase 1: 批量读布局 + 贪心分页（块依次入页, 装不下换新页）
  const hs = blocks.map((el) => el.offsetHeight);
  const groups: number[][] = [[]];
  const tallPages = new Set<number>();
  let used = 0;
  for (let i = 0; i < blocks.length; i++) {
    const h = hs[i];
    if (h > cap) {
      // [WHY] 单块高过整页：Word 做文本级跨页切分, 块模型无法拆, 退化为独占一页并增高
      if (groups[groups.length - 1].length > 0) {
        groups.push([]);
        used = 0;
      }
      tallPages.add(groups.length - 1);
      groups[groups.length - 1].push(i);
      groups.push([]);
      used = 0;
      continue;
    }
    if (used > 0 && used + h > cap) {
      groups.push([]);
      used = 0;
    }
    groups[groups.length - 1].push(i);
    used += h;
  }
  while (groups.length > 1 && groups[groups.length - 1].length === 0) groups.pop();

  // 分布未变化 → 不动 DOM（保 IME 组合输入/光标/撤销栈）
  const pages = Array.from(wrap.querySelectorAll<HTMLElement>(":scope > .z-dte__page"));
  const distSame =
    pages.length === groups.length &&
    blocks.every((b, i) => {
      const target = groups.findIndex((g) => g.includes(i));
      return pages.indexOf(b.closest(".z-dte__page") as HTMLElement) === target;
    });
  if (distSame) {
    pages.forEach((pg, p) => pg.classList.toggle("z-dte__page--tall", tallPages.has(p)));
    return;
  }

  // Phase 2: 搬移块节点到各页正文区（节点本体不变, 内容/撤销栈保留）
  const caret = saveCaret(wrap);
  const frag = document.createDocumentFragment();
  groups.forEach((idxs, p) => {
    const page = createPageShell(cfg);
    if (tallPages.has(p)) page.classList.add("z-dte__page--tall");
    const body = page.querySelector(".z-doc-page-body")!;
    for (const i of idxs) body.appendChild(blocks[i]);
    frag.appendChild(page);
  });
  wrap.replaceChildren(frag);
  restoreCaret(wrap, caret);
}

// ── 光标跨页搬移保护 ────────────────────────────────────

/** 光标快照：块 id + 块内全局文本偏移（节点搬移后按偏移重建选区） */
export function saveCaret(wrap: HTMLElement): CaretSnapshot | null {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const anchor = range.startContainer;
  const el = anchor.nodeType === 1 ? (anchor as HTMLElement) : anchor.parentElement;
  const blockEl = el?.closest<HTMLElement>("[data-block-id]");
  if (!blockEl || !wrap.contains(blockEl)) return null;
  const textLen = (n: Node): number => (n.nodeType === 3 ? (n as Text).length : (n.textContent?.length ?? 0));
  let offset = 0;
  const visit = (n: Node): boolean => {
    if (n === anchor) {
      if (n.nodeType === 3) offset += range.startOffset;
      else Array.from(n.childNodes).slice(0, range.startOffset).forEach((c) => (offset += textLen(c)));
      return true;
    }
    for (const c of Array.from(n.childNodes)) if (visit(c)) return true;
    offset += textLen(n);
    return false;
  };
  visit(blockEl);
  return { blockId: blockEl.dataset.blockId!, offset };
}

/** 按快照重建选区（块被搬到别的页后光标跟回原位置） */
export function restoreCaret(wrap: HTMLElement | null, caret: CaretSnapshot | null): void {
  if (!caret) return;
  if (!wrap) return;
  const blockEl = wrap.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(caret.blockId)}"]`);
  if (!blockEl) return;
  let remaining = caret.offset;
  let target: { node: Text; offset: number } | null = null;
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const len = (n as Text).length;
    if (remaining <= len) {
      target = { node: n as Text, offset: remaining };
      break;
    }
    remaining -= len;
  }
  const sel = document.getSelection();
  if (!sel) return;
  const range = document.createRange();
  if (target) range.setStart(target.node, target.offset);
  else {
    // 空块/偏移越界（文本被删）→ 光标落块末尾
    range.selectNodeContents(blockEl);
    range.collapse(false);
  }
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
}
