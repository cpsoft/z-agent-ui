// [WHY] 2026-10-25 系统审计：从 DocTemplateEditor.ts（1264 行）按职责拆出
// 职责：画布 / 右侧面板的输入 → 块模型与排版配置的回写逻辑 —— 只改模型数据, 不碰 DOM 结构、
// 不触发重渲染（脏标记与 emit 由调用方决定）, 便于单测。

import { type DocBlock, type DocFormatConfig, type DocPlaceholderDef } from "./types.js";
import { readTextFromHtml } from "./render.js";

/**
 * 表格列字段候选池：当前 dataKey 指向那张表的 fields 优先, 否则合并全部表定义的 fields（去重保序）。
 */
export function tableFieldPool(
  placeholders: DocPlaceholderDef[],
  dataKey?: string,
): { key: string; label: string }[] {
  const tableFields = placeholders.filter((p) => p.type === "table");
  const active = tableFields.find((f) => f.key === dataKey);
  const src = active?.fields?.length ? active.fields : tableFields.flatMap((t) => t.fields ?? []);
  const pool: { key: string; label: string }[] = [];
  for (const f of src) if (!pool.some((p) => p.key === f.key)) pool.push(f);
  return pool;
}

/** 画布就地编辑 → 块模型（文本 / 列表项 / 表头 / 单元格 / 签名区） */
export function syncBlockFromDom(blocks: DocBlock[], target: HTMLElement, editable: HTMLElement): void {
  const blockEl = editable.closest<HTMLElement>("[data-block-id]");
  if (!blockEl) return;
  const block = blocks.find((b) => b.id === blockEl.dataset.blockId);
  if (!block) return;

  if (editable.dataset.editable === "text") {
    block.text = readTextFromHtml(editable.innerHTML);
    return;
  }
  if (editable.tagName === "LI") {
    const items = Array.from(blockEl.querySelectorAll("li")).map((li) => readTextFromHtml(li.innerHTML));
    block.items = items;
    return;
  }
  if (editable.tagName === "TH") {
    // [WHY] 表头就地编辑 → columns[i].label（展示的字段由属性面板「字段」下拉写 key, 表头文案在画布上改）
    const th = target.closest("th") as HTMLTableCellElement | null;
    if (!th || !block.columns) return;
    const col = Array.from(blockEl.querySelectorAll("th")).indexOf(th);
    if (col < 0 || !block.columns[col]) return;
    block.columns[col].label = readTextFromHtml(th.innerHTML);
    return;
  }
  if (editable.tagName === "TD") {
    const td = target.closest("td") as HTMLElement | null;
    if (!td) return;
    const row = Number(td.dataset.row);
    const col = Number(td.dataset.col);
    block.rows = block.rows ?? [];
    while (block.rows.length <= row) block.rows.push([]);
    if (!block.rows[row]) block.rows[row] = [];
    block.rows[row][col] = readTextFromHtml(td.innerHTML);
    return;
  }
  // 签名区：按 span 顺序回写 left / right
  const spans = Array.from(blockEl.querySelectorAll(".z-doc-signature > span"));
  if (spans.length === 2) {
    block.left = readTextFromHtml(spans[0].innerHTML);
    block.right = readTextFromHtml(spans[1].innerHTML);
  }
}

/** 排版面板输入 → 新排版配置（不可变更新, 返回新对象） */
export function applyFormatConfigInput(cfg: DocFormatConfig, cfgKey: keyof DocFormatConfig, input: HTMLInputElement): DocFormatConfig {
  const raw = input.type === "number" ? Number(input.value) : input.value;
  // [WHY] lineHeight 声明为数值却经 select 编辑（DOM 只能给字符串）, 按当前值类型回写,
  // 避免导出的 DocFormatConfig.lineHeight 退化为字符串
  const prev = (cfg as unknown as Record<string, unknown>)[cfgKey];
  const v = typeof prev === "number" ? Number(raw) : raw;
  return { ...cfg, [cfgKey]: v } as DocFormatConfig;
}

/**
 * 表格配置面板输入 → 块模型（数据键 / 列字段 / 表头 / 列宽）。
 * 返回 false 表示该输入不属于表格配置（或列下标无效）, 调用方据此早退。
 */
export function applyTableConfigInput(
  block: DocBlock,
  input: HTMLInputElement,
  placeholders: DocPlaceholderDef[],
): boolean {
  const tableProp = input.dataset.table;
  if (!tableProp) return false;
  const idx = Number(input.dataset.col);
  const col = Number.isInteger(idx) ? block.columns?.[idx] : undefined;
  if (tableProp === "dataKey") {
    // [WHY] 清空 dataKey = 退回静态表格模式（面板据此显示/隐藏静态行操作）
    block.dataKey = input.value.trim() || undefined;
  } else if (tableProp === "columnKey" && col) {
    const prev = col.key;
    col.key = input.value || col.key;
    // [WHY] 换字段时表头若还是旧字段名（或为空）, 自动补该字段的显示名, 免得表头与字段对不上
    const def = tableFieldPool(placeholders, block.dataKey).find((f) => f.key === col.key);
    if (def && (!col.label || col.label === prev)) col.label = def.label;
  } else if (tableProp === "columnLabel" && col) {
    col.label = input.value;
  } else if (tableProp === "columnWidth" && col) {
    const w = Number(input.value);
    col.width = w > 0 ? w : undefined;
  } else return false;
  return true;
}

/** 属性面板输入 → 块模型（对齐 / 字号 / 颜色 / 加粗 / 字体 / 缩进） */
export function applyBlockPropInput(block: DocBlock, prop: string, input: HTMLInputElement): void {
  (block as unknown as Record<string, unknown>)[prop] =
    input.type === "checkbox" ? input.checked : input.value || undefined;
}
