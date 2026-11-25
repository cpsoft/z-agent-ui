// 内容槽挂载器（L2 共用）：把 `columns[].cellTag` 变成真元素。
//
// [WHY 在 core 而不是 table/] 表格与甘特左列都吃 `CellSpec`（同一条 `cellTag` / `cellProps`
// 契约），两边只差「行对象怎么取、选中态怎么判」。放在 core 让「挂载」只有一份实现，
// 与 `cell-spec.ts` 的意图一致：契约一份、默认值一份、解析一份。
//
// [WHY 需要「两步」而不是渲染里直接拼] 行都是字符串模板拼出来的（`renderRow` / `renderLeftListRows`），
// 字符串里造不出别的组件实例。所以：① 渲染时 `<td>`/`<div>` 打 `data-cell-tag` 并把文本放进
// `.z-cell-fallback`；② DOM 落地后在这里 createElement 替换。
//
// [WHY 降级回落文本而不是白屏] 少 import 一行注册代码是常态，而未注册的自定义元素
// 浏览器**不报错**，只当 inline 元素渲染 —— 看起来像「样式没加载」，最难查。
// 因此：标签没注册 ⇒ 保留 fallback + 每标签警告一次；元素自己抛错 ⇒ 保留 fallback。
// See: architecture/l2-decompose-plan.html §7（cell 契约 / ViewHolder 的等价物）

import type { CellSpec } from "./cell-spec.js";

/**
 * 注入到 cell 元素上的上下文。**不给容器实例** —— cell 不该反过来操作表格。
 *
 * [契约要求：这四个字段必须是「赋值即重绘」的响应式属性]
 * 挂载器只做赋值，不会替元素调度重绘。用 `BaseElement` + `@property({attribute:false})`
 * 声明它们，赋值就会触发一次渲染；写成普通字段则**只在首次挂载时画一次**，
 * 之后值变了元素毫无反应 —— 而复用让这个缺口更容易被撞上：重建元素时
 * `connectedCallback` 会重画一次，把问题盖住了；一旦换成复用旧实例，
 * 格子里就静静显示着旧值。宁可多一行 `@property`，也不要这个。
 */
export interface CellContext {
  /** 本格的值（`row[column.key]`） */
  value: unknown;
  /** 整行数据（表格是原行；甘特是 task） */
  row: Record<string, unknown>;
  /** 行下标（表格用源数据下标，与 `data-index` 一致） */
  index: number;
  /** 该行当前是否选中 */
  selected: boolean;
}

export interface CellMountHost {
  /** 从格子上找到「承载它的那一行」元素（表格是 tr，甘特是行 div）。 */
  rowElOf(cell: HTMLElement): HTMLElement | null;
  /** 从行元素取行对象；返回 null 表示这行不挂内容槽。 */
  rowOf(rowEl: HTMLElement): Record<string, unknown> | null;
  /**
   * 这一行的稳定标识（不含行序）。节点池按它收留元素，所以排序/翻页后
   * 同一行还能拿回自己那个元素。缺省退回 `data-row-key`，再缺省用行下标。
   */
  keyOf?(rowEl: HTMLElement): string;
  /** 行下标；缺省读 `data-index`，读不到给 -1。 */
  indexOf?(rowEl: HTMLElement): number;
  /** 选中态；缺省按 `--selected` 修饰类判断。 */
  selectedOf?(rowEl: HTMLElement): boolean;
  /** 整行跳过（如表格的分组行/总计行：值是聚合出来的，塞内容槽没有意义）。 */
  skip?(rowEl: HTMLElement): boolean;
}

/** 未注册标签的告警只报一次：一张表 200 行会把控制台淹掉。 */
const warned = new Set<string>();

/** 单元格内容槽的兜底容器类名，渲染侧与挂载侧共用一个字符串。 */
export const CELL_FALLBACK_CLASS = "z-cell-fallback";

/**
 * 节点池：`root` → 两段。
 *
 * - `active`：上一轮挂在 DOM 上的（`rowKey::colKey` → 元素），本轮优先取回；
 * - `idle`：上一轮**没用上**但被留下的（行被筛掉、滚出虚拟窗口），回来时仍能拿回同一个实例。
 *
 * [WHY 必须跨轮持有引用] 行是字符串模板整体重写的（`innerHTML = rows.join("")`），
 * 连 `<td>` 都是新节点 —— 所以「就地更新已有元素」根本救不了状态：宿主已经换了，
 * 挂在旧宿主上的元素跟着一起没了。唯一有效的是**在渲染之前就把元素捞出来**，
 * 渲染完再按 key 贴回新宿主。池持有引用 ⇒ 元素不被回收，实例字段（用户输入的文字、
 * 展开标记、拖动中的位置）就还在。
 *
 * [WHY WeakMap 而不是 Map] 表格/甘特元素被销毁时池必须跟着走，否则宿主一多就泄漏。
 * 键是 shadowRoot 或切片容器，它随宿主存活，正好是弱引用该用的场景。
 */
interface CellPool {
  active: Map<string, HTMLElement>;
  idle: Map<string, HTMLElement>;
}

const pools = new WeakMap<ParentNode, CellPool>();

/**
 * 回收站上限（按「行 × 列」条目计）。
 *
 * [WHY 需要这一条] 上一版是「本轮没用上就丢」，代价写在旧注释里：甘特滚出视口再滚回来，
 * 那几格是新建的 —— 格内有输入框/展开态时，**滚动一下就丢**，而用户只是把行滚出去看了别处。
 * 留一个回收站就能拿回同一实例。但回收站必须封顶，否则一千条任务就是一千个常驻元素
 * （它们还各自攥着自己的 `row` 对象）。
 *
 * 120 = 一屏的量级（甘特 20 行 × 6 列，或表格 60 行 × 2 列）。再多没有命中机会 ——
 * 用户要滚回去的位置早已超出这个范围。
 */
const IDLE_LIMIT = 120;

function poolOf(root: ParentNode): CellPool {
  let pool = pools.get(root);
  if (!pool) {
    pool = { active: new Map(), idle: new Map() };
    pools.set(root, pool);
  }
  return pool;
}

/** 池的当前规模（测试与调试用：回收站封顶是行为，得能被断言）。 */
export function cellPoolSize(root: ParentNode): { active: number; idle: number } {
  const pool = pools.get(root);
  return { active: pool?.active.size ?? 0, idle: pool?.idle.size ?? 0 };
}

/**
 * 就地挂载内容槽，返回成功挂载的格数（供测试与调试断言）。
 *
 * `root` 可以是整棵 shadowRoot（全量渲染后）或某个切片容器（虚拟滚动只换窗口时）。
 */
export function mountCellTags(root: ParentNode, columns: CellSpec[], host: CellMountHost): number {
  const byKey = new Map(columns.map((c) => [c.key, c]));
  const pool = poolOf(root);
  const used = new Set<string>();
  let mounted = 0;

  for (const cellHost of Array.from(root.querySelectorAll<HTMLElement>("[data-cell-tag]"))) {
    const tag = cellHost.dataset.cellTag ?? "";
    // [WHY 允许没有列] 甘特条内槽是**逐任务**声明的（`task.barTag`），没有列可查。
    // 用 `data-cell-value` 说明 .value 取哪个字段，合成一份最小契约，避免为它另写一套挂载器。
    const col =
      byKey.get(cellHost.dataset.cellCol ?? "") ??
      ({ key: cellHost.dataset.cellValue ?? "name", title: "", cellTag: tag } as CellSpec);
    if (!tag) continue;

    const rowEl = host.rowElOf(cellHost);
    if (!rowEl) continue;
    if (host.skip?.(rowEl)) continue;

    const row = host.rowOf(rowEl);
    if (!row) continue;

    const Ctor = customElements.get(tag);
    if (!Ctor) {
      if (!warned.has(tag)) {
        warned.add(tag);
        console.warn(
          `[cellTag] 列「${col.key}」的 cellTag="${tag}" 没有注册，已回落为文本。` +
            ` 检查是否 import 了该元素的入口文件。`,
        );
      }
      continue;
    }

    const rowKey = host.keyOf
      ? host.keyOf(rowEl)
      : (rowEl.dataset.rowKey ?? rowEl.dataset.index ?? "");
    // [WHY 空 key 不许池化] 空 key 会让所有行共用同一个池项，于是同一个元素被
    // 一行接一行地搬走 —— 最后只有最后一行有内容，前面的格子被清空且不会再挂回来。
    // 这比「不复用」糟得多，而且完全无声。拿不到稳定 key 就老老实实每轮新建。
    const poolable = rowKey !== "";
    const poolKey = `${rowKey}\u0000${col.key}`;
    // 同 key 且标签没换 ⇒ 收留上一轮那个实例；标签换了必须新建（换了组件类型，
    // 硬复用会让新标签的组件跑在旧元素的构造函数上，表现为「整个格子不认识自己」）。
    // 先查 active（上一轮还在屏上），再查 idle（上一轮滚出去 / 被筛掉，回来还能拿回同一实例）。
    let cell = poolable ? (pool.active.get(poolKey) ?? pool.idle.get(poolKey)) : undefined;
    if (cell && poolable) pool.idle.delete(poolKey);
    if (!cell || cell.localName !== tag.toLowerCase()) cell = document.createElement(tag);
    if (poolable) {
      pool.active.set(poolKey, cell);
      used.add(poolKey);
    }

    const target = cell as HTMLElement & Partial<CellContext>;
    target.value = row[col.key];
    target.row = row;
    target.index = host.indexOf ? host.indexOf(rowEl) : Number(rowEl.dataset.index ?? -1);
    // 缺省读 `aria-selected`：两个宿主都会写它（表格行由 tr 上的类表达，另传 selectedOf）。
    // [WHY 不按类名猜] 猜一个 `is-selected` 会引入一条「产出但没人定义样式」的语义类，
    // 守卫 `page-semantic-class-coverage` 正是为这类静默无效而设。
    target.selected = host.selectedOf
      ? host.selectedOf(rowEl)
      : rowEl.getAttribute("aria-selected") === "true";
    // cellProps 是列级常量（如 tone、格式），逐格覆盖上下文里没有的字段
    if (col.cellProps) Object.assign(cell, col.cellProps);

    // [WHY 判 parentElement 而不是无条件 append] 无条件 append 会把元素从新宿主上
    // 摘下来再插回去，一路触发 disconnected → connected；组件在 connected 里重建
    // shadow DOM，默认值会把刚注入的上下文盖掉。只在确实换了宿主时才搬。
    if (target.parentElement !== cellHost) {
      // [WHY 清空而不是 append] fallback 是给「没注册」兜底的，挂上了就该由元素自己负责内容；
      // 留着两份会在元素渲染失败时出现「文本 + 空白元素」叠在一起。
      cellHost.textContent = "";
      cellHost.appendChild(target);
    }
    mounted++;
  }

  // 本轮没用上的：搬进回收站，**先别丢**。
  //
  // 甘特虚拟滚动与「筛掉几行再放开」都表现为「本轮没用上」，而它们并不是「行没了」：
  // 直接把元素丢掉，滚回来 / 放开筛选时是新建的 —— 格内的输入、展开态、拖动位置全丢，
  // 用户只是把行滚出去看了别处。留一屏的回收站就能拿回同一实例。
  // 上限由 `IDLE_LIMIT` 封顶（Map 的插入顺序即 FIFO），超出的最老条目才真正丢弃。
  for (const k of Array.from(pool.active.keys())) {
    if (used.has(k)) continue;
    const el = pool.active.get(k);
    pool.active.delete(k);
    if (el) pool.idle.set(k, el); // 重新 set 会把该 key 排到队尾
  }
  while (pool.idle.size > IDLE_LIMIT) {
    const oldest = pool.idle.keys().next().value;
    if (oldest === undefined) break;
    pool.idle.delete(oldest);
  }

  return mounted;
}

/** 仅供测试重置告警去重状态。 */
export function resetCellTagWarnings(): void {
  warned.clear();
}
