// Test 共用设施：z-doc-template 三组件（manager / editor / preview）与渲染内核的测试夹具。
//
// [WHY] 2026-10-25 系统审计：原 tests/unit/components/doc-template.test.ts 单文件 1279 行，
// 超 600 行上限。按被测对象拆成 4 个测试文件，公共夹具集中到这里，避免四份拷贝各自漂移。

import { vi } from "vitest";
// [WHY] 这里必须是**值导入**（而不是只 import type）：模块求值才执行 customElements.define。
// 拆分成多文件后，只引类型的分册（如 manager 分册）不会触发注册，
// document.createElement("z-doc-template-manager") 拿到未升级的 HTMLElement，
// 失败长这样：`mgr.refresh is not a function`——看起来像组件 API 没了，其实是没注册。
import { DEFAULT_FORMAT_CONFIG } from "../../../src/doc/index";
import type { DocTemplate, DocTemplateQuery } from "../../../src/doc/index";

void DEFAULT_FORMAT_CONFIG;

// [WHY] happy-dom 无布局引擎（getBoundingClientRect 恒 0）→ 分页降级单页, 用例按此预期断言
if (!URL.createObjectURL) (URL as unknown as { createObjectURL: () => string }).createObjectURL = () => "blob:mock";
if (!URL.revokeObjectURL) (URL as unknown as { revokeObjectURL: () => void }).revokeObjectURL = () => undefined;

export function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

export async function rendered(el: unknown): Promise<void> {
  void el;
  await tick();
  await tick();
}

/** 假时钟下 tick() 不推进, 手动冲微任务（队列里只有 queueMicrotask 与已 resolve 的 promise） */
export async function flushMicro(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

export function stubConfirm(answer: boolean): void {
  // [WHY] 组件用 window.confirm 而非 z-modal（零依赖）；测试直接替换宿主 API
  (window as unknown as { confirm: (m?: string) => boolean }).confirm = vi.fn(() => answer);
}

// ── 适配器 mock（模块不绑定后端, 全部交互经注入适配器） ──────

export function seedTemplate(i: number): DocTemplate {
  return {
    id: `t${i}`,
    name: `模板${i}`,
    description: `描述${i}`,
    category: i % 2 ? "合同" : "通知",
    content: "[]",
    formatConfig: "{}",
    isDefault: i === 1,
    updatedAt: "2026-09-01",
  };
}

export function makeDataSource(count = 3): Record<string, ReturnType<typeof vi.fn>> & { db: DocTemplate[] } {
  const db = Array.from({ length: count }, (_, i) => seedTemplate(i + 1));
  const list = vi.fn(async (q: DocTemplateQuery) => {
    let rows = db.slice();
    if (q.keyword) rows = rows.filter((r) => r.name.includes(q.keyword!));
    if (q.category) rows = rows.filter((r) => r.category === q.category);
    const start = (q.page - 1) * q.size;
    return { data: rows.slice(start, start + q.size), total: rows.length };
  });
  const get = vi.fn(async (id: string) => db.find((r) => r.id === id)!);
  const create = vi.fn(async (t: Partial<DocTemplate>) => ({ ...seedTemplate(99), ...t }) as DocTemplate);
  const update = vi.fn(async () => undefined);
  const remove = vi.fn(async (id: string) => {
    const i = db.findIndex((r) => r.id === id);
    if (i >= 0) db.splice(i, 1);
  });
  return { list, get, create, update, remove, db };
}

export function createManager(ds: unknown, pageSize = 5): any {
  const el = document.createElement("z-doc-template-manager") as any;
  el.pageSize = pageSize;
  el.dataSource = ds;
  document.body.appendChild(el);
  return el;
}

export function createEditor(): any {
  const el = document.createElement("z-doc-template-editor") as any;
  document.body.appendChild(el);
  return el;
}

export function createPreview(): any {
  const el = document.createElement("z-doc-preview") as any;
  document.body.appendChild(el);
  return el;
}

export const THREE_BLOCKS = JSON.stringify([
  { id: "b1", type: "heading", level: 1, text: "合同标题" },
  { id: "b2", type: "paragraph", text: "甲方：{{partyA}}" },
  { id: "b3", type: "signature", left: "甲方（签章）：", right: "乙方（签章）：" },
]);

// [WHY] 表格配置面板用例：宿主注入带 fields 的表占位符, 编辑器据此渲染「数据键」候选与「展示字段」下拉
export const TABLE_PH = [
  {
    key: "items",
    label: "标的明细表",
    type: "table",
    fields: [
      { key: "name", label: "项目名称" },
      { key: "qty", label: "数量" },
      { key: "price", label: "单价(元)" },
    ],
  },
  { key: "partyA", label: "甲方" },
];

export const TABLE_TEMPLATE = JSON.stringify([
  {
    id: "t1",
    type: "table",
    dataKey: "items",
    columns: [
      { key: "name", label: "项目名称", width: 180 },
      { key: "qty", label: "数量", width: 60 },
    ],
    rows: [["", ""]],
  },
]);
