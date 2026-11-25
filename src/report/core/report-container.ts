// 报表容器 / 分组 / 标签页（M8）—— 纯逻辑，无 React 依赖
//
// [为什么是平铺数组 + parentId，而不是嵌套树] 嵌套树一旦存进 JSON，任何「跨层移动」
// 都要删节点再插节点，且兄弟顺序信息会丢；平铺数组里移动只是改 parentId 与坐标。
// 渲染时两趟：先按 parentId 分组，再画（深度上限 2 层，容器不能再装容器）。
//
// [为什么所有回落都往根层走] parentId 可能指向一个已被删除的容器（用户删容器、
// 或老草稿里引用了不存在的 id）。此时若「找不到父就跳过」，卡片会整块消失且
// 无任何报错——属于最难查的一类退化。统一回落根层，最坏情况是卡片位置变了。
import type {
  ReportCellLayout,
  ReportContainer,
  ReportContainerTab,
  ReportContainerVariant,
} from "./types.js";
import { GRID_GAP, ROW_H, clampLayout } from "./report-grid.js";

/** 嵌套深度上限：根层 + 容器内容区 = 2 层。容器不能再装容器 */
export const MAX_NEST_DEPTH = 2;
/** 容器标题占的行数（1 行 = ROW_H 高） */
export const CONTAINER_HEADER_ROWS = 1;

export type { ReportContainerVariant };

/** 画布上的一个定位项（图表或筛选器卡） */
export interface BoardItem {
  id: string;
  layout: ReportCellLayout;
}

/** 容器内容区的屏幕矩形（拖拽命中判定与坐标换算的唯一输入） */
export interface ContentRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function containerById(
  containers: ReportContainer[] | undefined,
  id: string | undefined,
): ReportContainer | undefined {
  if (!id || !containers) return undefined;
  return containers.find((c) => c.id === id);
}

export function isContainerId(containers: ReportContainer[] | undefined, id: string): boolean {
  return !!containerById(containers, id);
}

/** 有效父容器：parentId 指向的容器存在才算；否则视为根层（悬空引用回落，防卡片消失） */
export function effectiveParent(
  containers: ReportContainer[] | undefined,
  layout: ReportCellLayout,
): ReportContainer | undefined {
  return containerById(containers, layout.parentId);
}

/** 项是否在根层 */
export function isRootItem(containers: ReportContainer[] | undefined, item: BoardItem): boolean {
  return effectiveParent(containers, item.layout) === undefined;
}

/** 某个容器的子项 */
export function childrenOf(
  items: BoardItem[],
  containers: ReportContainer[] | undefined,
  containerId: string,
): BoardItem[] {
  return items.filter((it) => effectiveParent(containers, it.layout)?.id === containerId);
}

/** 根层项（含 parentId 悬空的项——它们按根层渲染，不能丢） */
export function rootItems(items: BoardItem[], containers: ReportContainer[] | undefined): BoardItem[] {
  return items.filter((it) => isRootItem(containers, it));
}

/** 按 (y, x) 排的逻辑顺序，用于「新卡接在下方」与导出顺序 */
function byPos(a: { layout: ReportCellLayout }, b: { layout: ReportCellLayout }): number {
  return a.layout.y - b.layout.y || a.layout.x - b.layout.x;
}

/** 容器子卡所占行数（无子卡 = 0） */
export function contentRows(children: BoardItem[]): number {
  return children.reduce((max, c) => Math.max(max, c.layout.y + c.layout.h), 0);
}

/** 容器实际渲染高度（行）：至少能装下标题 + 所有子卡。
 *
 *  [为什么渲染时自动撑高，而不是 overflow:hidden] 裁掉的那张卡用户看不见，
 *  只会以为卡丢了。撑高最多难看，不会造成「数据消失」这种不可逆结果。
 *  存下去的 h 在保存前由 normalizeHeights 归一化，所以不会长期与显示不一致。 */
export function autoHeight(childrenRows: number, storedH: number): number {
  return Math.max(storedH, childrenRows + CONTAINER_HEADER_ROWS, 2);
}

/** 容器内容区高度需要撑高几行（0 = 存的 h 已经够） */
export function heightDrift(childrenRows: number, storedH: number): number {
  return Math.max(0, childrenRows + CONTAINER_HEADER_ROWS - storedH);
}

/** 容器底部下边界（根层避让用） */
export function containerBottom(c: ReportContainer, childrenRows: number): number {
  return c.layout.y + autoHeight(childrenRows, c.layout.h);
}

/** 指针 → 容器内容区内的逻辑坐标（列/行）。
 *
 *  [为什么单独成函数并单测] 屏幕坐标到容器内容区是两级原点，且要减标题高度；
 *  内联在拖拽回调里时，写错了的表现是「卡在容器边缘左右横跳」，极难定位。
 *  第三轮验收（拖进 → 拖出 → 拖进另一个容器）就是拿它当唯一判据。 */
export function toLocal(
  rect: ContentRect,
  clientX: number,
  clientY: number,
  cols: number,
  gap = GRID_GAP,
  rowH = ROW_H,
): { x: number; y: number } {
  const colW = cols > 0 ? Math.max(0, (rect.width - gap * (cols - 1)) / cols) : 0;
  const stepX = colW + gap;
  const stepY = rowH + gap;
  const x = stepX > 0 ? Math.round((clientX - rect.left) / stepX) : 0;
  const y = stepY > 0 ? Math.round((clientY - rect.top) / stepY) : 0;
  // 纵向夹到「内容区最多能放几行」：不夹的话，指针落到容器下方会算出 y=1500 这种值，
  // 卡片被推到很远的行，表现为「拖出容器后整块画布被撑长」。
  const maxRows = Math.max(0, Math.floor((rect.height + gap) / stepY));
  return {
    x: Math.min(Math.max(0, x), Math.max(0, cols - 1)),
    y: Math.min(Math.max(0, y), maxRows),
  };
}

/** 指针落在哪个容器内容区里（面积最小者优先，防将来支持嵌套时选到外层） */
export function hitContainer(
  rects: { id: string; rect: ContentRect }[],
  clientX: number,
  clientY: number,
): string | null {
  let best: { id: string; area: number } | null = null;
  for (const { id, rect } of rects) {
    if (clientX < rect.left || clientX > rect.left + rect.width) continue;
    if (clientY < rect.top || clientY > rect.top + rect.height) continue;
    const area = rect.width * rect.height;
    if (!best || area < best.area) best = { id, area };
  }
  return best?.id ?? null;
}

/** 容器内容区的屏幕矩形：外框减去标题条与间距 */
export function contentRectOf(rect: ContentRect, gap = GRID_GAP, rowH = ROW_H): ContentRect {
  const top = rect.top + rowH + gap;
  return {
    left: rect.left,
    top,
    width: rect.width,
    height: Math.max(0, rect.top + rect.height - top),
  };
}

/** 能否把某项放进目标容器：目标是容器 → 拒绝（深度上限 2）；目标是卡片/筛选器 → 允许 */
export function canNestInto(itemIsContainer: boolean, targetParentId: string | null): boolean {
  if (targetParentId === null) return true;
  return !itemIsContainer;
}

/** 拖入容器后的布局：坐标改为内容区局部坐标，并夹在容器宽度内 */
export function intoContainer(
  layout: ReportCellLayout,
  containerId: string,
  local: { x: number; y: number },
  colsOfContainer: number,
  tabId?: string,
): ReportCellLayout {
  const w = Math.min(Math.max(1, layout.w), colsOfContainer);
  return {
    ...clampLayout({ ...layout, x: local.x, y: local.y, w }, colsOfContainer),
    parentId: containerId,
    ...(tabId ? { tabId } : { tabId: undefined }),
  };
}

/** 拖出容器：回到根层，坐标由调用方给（根层坐标系），并清掉 tabId */
export function outOfContainer(layout: ReportCellLayout, rootX: number, rootY: number): ReportCellLayout {
  return { ...layout, x: Math.max(0, rootX), y: Math.max(0, rootY), parentId: undefined, tabId: undefined };
}

/** 容器的标签页列表：非 tabs 变体返回空数组 */
export function tabsOf(c: ReportContainer): ReportContainerTab[] {
  return c.variant === "tabs" ? (c.tabs ?? []) : [];
}

/** 当前激活 tab：值不在列表里（被删了）→ 回落到第一个。
 *  [为什么必须回落] 子卡存的 tabId 可能指向已删的 tab，不回落就整片子卡不渲染。 */
export function activeTabOf(c: ReportContainer, want?: string | null): string | undefined {
  const tabs = tabsOf(c);
  if (tabs.length === 0) return undefined;
  return tabs.some((t) => t.id === want) ? (want as string) : tabs[0].id;
}

/** 子卡属于哪个 tab：非 tabs 容器 = undefined；tabs 容器 = 卡上的 tabId（非法则激活 tab） */
export function tabOfItem(c: ReportContainer, layout: ReportCellLayout, activeTab?: string): string | undefined {
  const tabs = tabsOf(c);
  if (tabs.length === 0) return undefined;
  return tabs.some((t) => t.id === layout.tabId) ? layout.tabId : activeTabOf(c, activeTab);
}

/** 某 tab 下的子卡（按位置排序）。view = 只显示激活 tab；edit = 也只显示激活 tab，
 *  但调用方要允许切换激活 tab 才能编辑其它 tab 的内容。 */
export function childrenInTab(
  children: BoardItem[],
  c: ReportContainer,
  activeTab?: string,
): BoardItem[] {
  const tabs = tabsOf(c);
  if (tabs.length === 0) return [...children].sort(byPos);
  const want = activeTabOf(c, activeTab);
  return children.filter((it) => tabOfItem(c, it.layout, activeTab) === want).sort(byPos);
}

/** 删除 tab 的影响面：返回该 tab 下的子卡 id 与迁移目标 tab。
 *  [为什么要返回两个分支] 静默删卡会让用户丢内容；静默迁移会让用户多出想不到的卡。
 *  必须由 UI 让用户二选一，本函数只负责算清「有多少张、迁去哪」。 */
export function planTabRemoval(
  c: ReportContainer,
  tabId: string,
  children: BoardItem[],
): { cards: string[]; nextTabId: string | undefined } {
  const tabs = tabsOf(c).filter((t) => t.id !== tabId);
  const cards = children.filter((it) => it.layout.tabId === tabId).map((it) => it.id);
  return { cards, nextTabId: tabs[0]?.id };
}

/** 卡片/容器的逻辑输出顺序：按根层位置走，遇到容器就把它的子卡连续输出。
 *
 *  [为什么不能按数组顺序] 数组顺序是「创建顺序」，用户把卡拖进容器后数组没变，
 *  导出 CSV / 打印会得到与画布完全不同的顺序。
 *
 *  [为什么容器要参与排序] 容器本身不在 items 里（items 只有图表与筛选器卡）。
 *  若只拿 items 排序，容器永远「不在根层」，它的子卡会被兜底循环推到全表末尾 ——
 *  于是画布中间的分组区块，导出时跑到最后。 */
export function flowOrder(
  items: BoardItem[],
  containers: ReportContainer[] | undefined,
): string[] {
  const list = containers ?? [];
  const rootCards = rootItems(items, list);
  // 根层节点 = 根层卡片 + 全部容器（容器不参与嵌套，恒在根层）
  const nodes: { id: string; layout: ReportCellLayout; isContainer: boolean }[] = [
    ...rootCards.map((r) => ({ id: r.id, layout: r.layout, isContainer: false })),
    ...list
      .filter((c) => !rootCards.some((r) => r.id === c.id))
      .map((c) => ({ id: c.id, layout: c.layout, isContainer: true })),
  ].sort(byPos);

  const out: string[] = [];
  for (const n of nodes) {
    if (n.isContainer) {
      for (const child of childrenOf(items, list, n.id).sort(byPos)) out.push(child.id);
    } else {
      out.push(n.id);
    }
  }
  return out;
}

/** 删除容器时把子卡迁回根层并接在容器下方（不静默删卡）。
 *  `x` 保持子卡原来的列位置，`y` 整体下移容器顶部高度。 */
export function releaseContainer(
  containers: ReportContainer[],
  items: BoardItem[],
  containerId: string,
): { containers: ReportContainer[]; layouts: Record<string, ReportCellLayout> } {
  const c = containerById(containers, containerId);
  const layouts: Record<string, ReportCellLayout> = {};
  if (!c) return { containers, layouts };
  const baseY = c.layout.y;
  for (const it of childrenOf(items, containers, containerId)) {
    layouts[it.id] = {
      ...it.layout,
      y: baseY + it.layout.y + CONTAINER_HEADER_ROWS,
      parentId: undefined,
      tabId: undefined,
    };
  }
  return { containers: containers.filter((x) => x.id !== containerId), layouts };
}

/** 执行「删标签页」的决策：del=true 一并删卡，false 迁移到相邻标签页。
 *
 *  [为什么决策要落成纯函数] 「不能静默删卡」这句话是靠两个分支都真的生效来保证的。
 *  若判断写在点击回调里，测不到 —— 只能靠人工点两次弹窗。这里把「用户选了什么」
 *  与「配置怎么变」分开，两个分支各有一条断言守。 */
export function tabRemovalEffect(
  plan: { cards: string[]; nextTabId: string | undefined },
  del: boolean,
  items: BoardItem[],
): { remove: string[]; relayout: Record<string, ReportCellLayout> } {
  if (del) return { remove: [...plan.cards], relayout: {} };
  const relayout: Record<string, ReportCellLayout> = {};
  for (const it of items) {
    if (!plan.cards.includes(it.id)) continue;
    relayout[it.id] = { ...it.layout, tabId: plan.nextTabId };
  }
  return { remove: [], relayout };
}

/** 保存前归一化容器高度：把「渲染时撑高」的结果写回存储，避免存的 h 与显示长期不一致 */
export function normalizeHeights(
  containers: ReportContainer[],
  items: BoardItem[],
): ReportContainer[] {
  return containers.map((c) => {
    const rows = contentRows(childrenOf(items, containers, c.id));
    const h = autoHeight(rows, c.layout.h);
    return h === c.layout.h ? c : { ...c, layout: { ...c.layout, h } };
  });
}
