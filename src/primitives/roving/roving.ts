// 键盘焦点游标：给定「一组候选 + 当前在哪」，算出下一个该聚焦的项。
//
// [WHY 提到 L0] 这套算法在库里已经被手写了六遍 —— `z-table` 的单元格导航、`z-tree`
// 的节点间移动、`z-menu` / `z-app-switcher` 的项间移动、`z-rich-text` 的工具条、
// `z-select` 的选项列表。每一份都包含同样三件事：把按键翻译成「往哪走」、
// 越界怎么办、走完把 `tabindex` 从旧项搬到新项。其中任何一件写错，症状都是
// 「按了没反应」或「Tab 进去又从第一项开始」—— 界面正常，只有键盘用户受影响。
//
// [WHY 只抽这一半，不抽「候选集是什么」] 这是本文件最重要的边界：
//
//   能抽的：按键 → 意图 → 新坐标 → 落点与 roving 写入。全是纯算术 + 两次属性赋值。
//   不能抽：**候选集怎么来**。树是「扁平化的可见节点序」（跨层级、跳过折叠分支），
//           表格是二维网格（行 × 列），菜单是一维列表，工具条是「启用的那几项」。
//           把「谁是候选」也搬进 L0，等于让基础层知道树的展开语义、表格的合并单元格、
//           菜单的禁用规则 —— 那些是各控件的领域规则，且各不相同。
//   同理不能抽：ARIA 角色与属性落在哪一层。2026-11-16 的教训是「语义必须落在
//           可聚焦的那一层」，而那一层由上层结构决定（`z-tree-node` 宿主 vs shadow 里的行）。
//
// [WHY 不依赖 BaseElement / 不碰 aria-*] L0 的边界守卫（`tests/unit/l0-boundary-guard.test.ts`）
// 只允许 `primitives` 引用 `core` / `primitives`。本文件连 core 都不需要：它只做
// 「算出坐标」与「搬 tabindex」，二者都是 DOM 的最小公约数。
//
// ── 四层，从低到高 ──────────────────────────────────────────────────────────
//   listIntent / gridIntent     按键 → 意图（只认键名与方向轴，不碰 DOM）
//   resolveIndex / resolveCell  意图 → 下标/坐标（纯算术，含越界与禁用策略）
//   roveByKey                   组合前两者 + roveTo，给「焦点真的落在项上」的控件用
//   roveTo                      只负责搬 tabindex 与聚焦
//
// 上层要哪层取哪层：菜单与下拉走 activedescendant（焦点不在项上）⇒ 只用 resolveIndex；
// 树与表头走 roving tabindex ⇒ 直接 roveByKey。

/** 二维坐标。行、列都从 0 起。 */
export interface CellPos {
  row: number;
  col: number;
}

/** 网格边界（行数、列数，均为「格子总数」而非最大下标）。 */
export interface GridBounds {
  rows: number;
  cols: number;
}

/** 一个轴上的移动意图。`same` 表示这个轴不动。 */
export type AxisMotion = "prev" | "next" | "first" | "last" | "same";

/** 一次按键翻译出来的二维意图。 */
export interface GridIntent {
  row: AxisMotion;
  col: AxisMotion;
}

/**
 * 一维列表的移动意图。`first` / `last` 就是 Home / End。
 *
 * [WHY 与 `AxisMotion` 不合并] 二维意图里必须有 `same`（「这个轴不动」），
 * 一维里没有这个概念 —— 合并后每个一维调用方都得处理一个永远不会出现的分支，
 * 而「处理了但写错」比「不写」更危险。
 */
export type ListIntent = "prev" | "next" | "first" | "last";

/**
 * 控件声明自己沿哪个轴排布，L0 据此决定认哪些键。
 *
 * [WHY 必须由控件声明，不能一律认四个方向键] 同一个 `ArrowLeft`，在单选组里是
 * 「往前一项」，在树里是「收起当前节点」，在菜单里是「进子菜单」。把它无条件
 * 解释成移动，就会**静默吃掉**上层自己实现的键位 —— 症状是「树的左方向键不收起」，
 * 而看代码时看不出任何问题（事件被 L0 消费掉并 preventDefault 了）。
 *
 *   vertical   ↑↓ + Home/End（列表、树、菜单、下拉、单选组竖排）
 *   horizontal ←→ + Home/End（工具条、单选组横排、表头行）
 *   both      四向 + Home/End（二维网格之外的「四面八方」场景，如 app 切换器）
 */
export type RoveAxis = "vertical" | "horizontal" | "both";

/**
 * 按键 → 二维意图。
 *
 * 认的键与各表格库一致：方向键走一格，`Home` / `End` 走**本行**首尾，
 * `Ctrl/Cmd + Home/End` 走**全表**首尾。不认的键返回 null（调用方据此放行默认行为）。
 *
 * [WHY 把 `Ctrl+Home` 折进同一个意图而不是让调用方分支] 两处表格各写一遍的结果是
 * `z-table` 支持 `Ctrl+End`、`z-report-table` 只支持 `End` —— 同一套键盘契约，
 * 两张表手感不同，而没有任何断言会发现。
 */
export function gridIntent(
  key: string,
  mods: { ctrlKey?: boolean; metaKey?: boolean } = {},
): GridIntent | null {
  switch (key) {
    case "ArrowUp":
      return { row: "prev", col: "same" };
    case "ArrowDown":
      return { row: "next", col: "same" };
    case "ArrowLeft":
      return { row: "same", col: "prev" };
    case "ArrowRight":
      return { row: "same", col: "next" };
    case "Home":
      return { row: mods.ctrlKey || mods.metaKey ? "first" : "same", col: "first" };
    case "End":
      return { row: mods.ctrlKey || mods.metaKey ? "last" : "same", col: "last" };
    default:
      return null;
  }
}

/**
 * 按键 → 一维意图。`axis` 决定认哪一组方向键，见 `RoveAxis` 的说明。
 *
 * `Home` / `End` **不分轴**，永远认：它们在一维控件里的语义没有二义
 * （「到第一个 / 最后一个」），而缺了它们，长列表只能一条条按过去。
 * 2026-11-16 实测：`z-select` 就没有这两个键，500 项的物料下拉里
 * 「跳到末项」得按 499 下 —— 而它和菜单的键盘帮助写在同一份文档里。
 */
export function listIntent(key: string, opts: { axis?: RoveAxis } = {}): ListIntent | null {
  const axis = opts.axis ?? "vertical";
  switch (key) {
    case "ArrowUp":
      return axis === "horizontal" ? null : "prev";
    case "ArrowDown":
      return axis === "horizontal" ? null : "next";
    case "ArrowLeft":
      return axis === "vertical" ? null : "prev";
    case "ArrowRight":
      return axis === "vertical" ? null : "next";
    case "Home":
      return "first";
    case "End":
      return "last";
    default:
      return null;
  }
}

/** 把单轴意图落到具体下标上。`wrap=true` 时首尾相接（菜单/工具条要，表格不要）。 */
function stepAxis(pos: number, motion: AxisMotion, size: number, wrap: boolean): number {
  if (size <= 0) return 0;
  const last = size - 1;
  switch (motion) {
    case "same":
      return pos;
    case "first":
      return 0;
    case "last":
      return last;
    case "prev":
      if (pos > 0) return pos - 1;
      return wrap ? last : 0;
    case "next":
      if (pos < last) return pos + 1;
      return wrap ? 0 : last;
  }
}

/**
 * 意图 → 新坐标。
 *
 * 默认 `wrap: false`：表格**到边就停**。这不是省事，是键盘用户对表格的既有预期 ——
 * 在最后一行按 ↓ 又跳回第一行，会让人以为自己看漏了一屏。
 */
export function resolveCell(
  from: CellPos,
  intent: GridIntent,
  bounds: GridBounds,
  opts: { wrap?: boolean } = {},
): CellPos {
  const wrap = opts.wrap ?? false;
  return {
    row: stepAxis(from.row, intent.row, bounds.rows, wrap),
    col: stepAxis(from.col, intent.col, bounds.cols, wrap),
  };
}

export function sameCell(a: CellPos | null, b: CellPos | null): boolean {
  return !!a && !!b && a.row === b.row && a.col === b.col;
}

/**
 * 意图 → 一维下标。返回值 **-1 表示「没有落点」**（空列表 / 全部不可用）。
 *
 * `isDisabled` 是「跳过不可用项」的唯一入口。两种候选集模型都能用这一份实现：
 *
 *   · 候选集已过滤（树、菜单把 disabled 项先筛掉了）⇒ 不传 `isDisabled`；
 *   · 候选集含不可用项、但下标必须与全集对齐（`z-select` 的选项下标同时是
 *     `id` 后缀与勾选态的依据）⇒ 传 `isDisabled`，在全集下标空间里走并跳过。
 *
 * [WHY 两种模型不能强行合并] 「先滤再算」要求调用方交出的长度是**可用数**，
 * 而下拉交不出（它必须是全集）。让一个函数同时接受两种长度，就要调用方每次回答
 * 「你传的这一个是全量还是可用数」—— 那个问题一定会被答错，答错的症状是
 * 「高亮跳到禁用项上」，看起来像样式问题而不是键盘问题。
 *
 * [WHY 单独实现而不复用 `resolveCell(…, {cols:1})`] 一维场景要 `wrap`
 * （工具条末项再按 → 绕回首项），而表格要「到边停」。压成一个函数就得让调用方
 * 记住「这里其实不是二维」，下一次迁移就会传错参数。
 *
 * 三个边界各有明确答案，且都有用例锁着：
 *   · **当前项不在范围内**（`current = -1`，焦点还没落到任何项上）：
 *     `next` 取第 0 项、`prev` 取末项 —— 顺着他按键的方向进场，而不是从 0 硬算；
 *   · **到边且 `wrap=false`**：返回当前项（原地不动），**不是** -1。若返回 -1，
 *     调用方会当成「这键不归我管」而放行默认行为 —— 在表头上按 → 会滚页面；
 *   · **全部不可用**：返回 -1。手写的 `do…while` 在这种情形下要么死循环，
 *     要么靠外面一句 `if (enabled.length === 0) return` 兜住，那是第二份真相。
 */
export function resolveIndex(
  length: number,
  current: number,
  intent: ListIntent,
  opts: { wrap?: boolean; isDisabled?: (index: number) => boolean } = {},
): number {
  if (length <= 0) return -1;
  const wrap = opts.wrap ?? true;
  const blocked = opts.isDisabled;

  if (intent === "first" || intent === "last") {
    // 从边界往里走，跳过不可用项 —— 首项被禁用时「Home」该落在第一个能用的项上，
    // 而不是落在一个按下去没反应的位置。
    for (let i = 0; i < length; i++) {
      const idx = intent === "first" ? i : length - 1 - i;
      if (!blocked?.(idx)) return idx;
    }
    return -1;
  }

  const step = intent === "next" ? 1 : -1;
  let idx = current >= 0 && current < length ? current : intent === "next" ? -1 : length;

  // 最多走一整圈：走回起点说明除了当前项没有别的可去处
  for (let n = 0; n < length; n++) {
    let next = idx + step;
    if (next < 0 || next >= length) {
      if (!wrap) return current >= 0 && current < length && !blocked?.(current) ? current : -1;
      next = next < 0 ? length - 1 : 0;
    }
    if (!blocked?.(next)) return next;
    idx = next;
  }
  return -1;
}

/**
 * 把 roving tabindex 落到目标上（并把同组其余项置 -1），可选聚焦。
 *
 * 整组只留**一个** `tabindex="0"` 是这套模型的全部意义：50 行的表格若每格都
 * `tabindex="0"`，键盘用户想越过它得按几百下 Tab —— 那比进不去更糟。
 *
 * [WHY 这里必须逐个写而不是「只改变化的两个」] 候选集每次可能是新的 DOM 节点
 * （组件重渲染 = innerHTML 整块替换），拿不到「上一次是哪个」的可靠引用。
 * 全量写一遍在几百个节点的量级上无感，换来的是没有残留 `tabindex="0"`。
 */
export function roveTo(target: Element | null, group: Iterable<Element>, opts: { focus?: boolean } = {}): void {
  if (!target) return;
  for (const el of group) {
    if (el === target) el.setAttribute("tabindex", "0");
    else if (el.getAttribute("tabindex") !== "-1") el.setAttribute("tabindex", "-1");
  }
  if (opts.focus !== false) (target as HTMLElement).focus?.();
}

/**
 * 「按键 + 一组候选 + 当前项」→ 把焦点挪过去。**返回 null 表示这个键不归我管**。
 *
 * 这是给「焦点真的落在项上」的控件用的（树、菜单里的 roving 项、表头行）。
 * 菜单与下拉走 `aria-activedescendant`（焦点留在容器上、只有视觉高亮在动），
 * 那种形态不该用这个函数 —— 它会把焦点搬走，于是容器上的 keydown 监听再也
 * 收不到下一个按键。它们只用 `resolveIndex` 拿下标。
 *
 * 返回值刻意是「目标元素」而不是 boolean：调用方常常要在 `preventDefault()`
 * 之外再做点事（记录落点以便重渲染后回焦），拿得到元素就不用再查一次。
 * 到边停住时返回的是**当前项本身**（不是 null）—— 那一键仍然被消费掉了。
 */
export function roveByKey<T extends Element>(
  group: readonly T[],
  current: Element | null,
  key: string,
  opts: { wrap?: boolean; axis?: RoveAxis } = {},
): T | null {
  const intent = listIntent(key, opts);
  if (!intent) return null;
  // `group as readonly Element[]`：`current` 的类型是 `Element | null`（调用方可能传一个
  // 恰好身在同组的祖先/兄弟类型），而 `readonly T[]` 的 `indexOf` 只收 `T`。
  // 这里要的本来就是「按引用找位置」，与元素的具体标签类型无关。
  const at = current ? (group as readonly Element[]).indexOf(current) : -1;
  // [WHY 当前项不在组里就整键放行] 否则 `resolveIndex` 会把它当成「无当前项」
  // 从端点进场 —— 用户按一下 →，焦点却从第一列重新开始。这类位移在界面上的
  // 表现是「焦点乱跳」，很难归因到「候选集与当前项不是同一份」。
  // 调用方本来就该保证 current 来自同一个候选集；这一条是让违约**可见地不生效**，
  // 而不是变成一次莫名其妙的跳转。（树与表头的实际路径都满足这个前提。）
  if (current && at < 0) return null;
  const idx = resolveIndex(group.length, at, intent, { wrap: opts.wrap });
  const target = idx >= 0 ? group[idx] : null;
  if (target) roveTo(target, group);
  return target;
}
