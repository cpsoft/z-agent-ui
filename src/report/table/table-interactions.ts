// [WHY] 2026-10-25 系统审计：从 ReportTable.ts（1058 行）按职责拆出
// 职责：交互层——点击排序、拖拽调宽、拖拽换列、行点击、勾选/合计开关分发；状态仍归 ReportTable，
// 本模块只做"DOM 事件 → 状态变更意图 + emit"，经 TableInteractionHost 回写。

import { parsePx, rowKeyOf, type ReportColumn, type SortEntry } from "./report-table-types.js";
import { cellUiOf, nextCellValue } from "./cell-value.js";
import { PointerDragSession } from "../../primitives/index.js";

/** 列宽拖拽会话(原 ReportTable#_resizeInfo) */
export interface ResizeInfo {
  colKey: string;
  startX: number;
  startWidth: number;
  minWidth: number;
  maxWidth: number;
}

export interface TableInteractionHost {
  /** 当前可见列(原 _visible) */
  visibleColumns(): ReportColumn[];
  /** 列宽覆盖表, 拖拽过程中直接写入 */
  columnWidths(): Map<string, number>;
  getSortState(): SortEntry[];
  setSortState(next: SortEntry[]): void;
  getColumns(): ReportColumn[];
  setColumns(next: ReportColumn[]): void;
  getResizeInfo(): ResizeInfo | null;
  setResizeInfo(info: ResizeInfo | null): void;
  getDragKey(): string | null;
  setDragKey(key: string | null): void;
  /** 拖拽调宽期间的宿主类名/光标状态 */
  setResizing(on: boolean): void;
  root(): ShadowRoot | null;
  rowClickable(): boolean;
  /** 最近一次渲染的排序后数据(z-row-click 的 row 取值来源) */
  sortedRows(): Record<string, unknown>[];
  data(): Record<string, unknown>[];
  rowKey(): string;
  /**
   * 整表编辑态（`card edit=yes`，issue IKX0CE P1-6）。
   *
   * 表格只回答「改完这一格要不要画脏标记」，**不持有草稿**：草稿按页集中（三张表统一保存），
   * 归页面层。这里分叉的只有一处观感 —— pending 是「等宿主写回」，草稿是「等用户提交」。
   */
  draftMode?(): boolean;
  selectedKeys(): string[];
  setSelectedKeys(keys: string[]): void;
  /** 勾选键 → 行（整表编辑态的「待删行」）。 */
  rowsOfKeys?(keys: string[]): Record<string, unknown>[];
  selectAll(): void;
  clearSelection(): void;
  emit(name: string, detail: unknown): void;
  /** 原 requestUpdate() */
  update(): void;
  /** 原 _emitConfigChange() */
  emitConfigChange(): void;
}

// ═══════════════════════════════════════════════════════════
// Sorting
// ═══════════════════════════════════════════════════════════

export function handleHeadClick(e: Event, host: TableInteractionHost): void {
  const th = (e.target as HTMLElement).closest<HTMLElement>(".z-rpt__th--sortable");
  if (!th) return;
  if ((e.target as HTMLElement).closest(".z-rpt__resize-handle")) return;

  const key = th.dataset.key;
  if (!key) return;

  const multi = (e as MouseEvent).shiftKey;
  const existingIdx = host.getSortState().findIndex((s) => s.key === key);

  if (multi) {
    const next = [...host.getSortState()];
    if (existingIdx === -1) {
      next.push({ key, dir: "asc" });
    } else if (next[existingIdx].dir === "asc") {
      next[existingIdx] = { key, dir: "desc" };
    } else {
      next.splice(existingIdx, 1);
    }
    host.setSortState(next);
  } else {
    if (existingIdx === -1) {
      host.setSortState([{ key, dir: "asc" }]);
    } else if (host.getSortState()[existingIdx].dir === "asc") {
      host.setSortState([{ key, dir: "desc" }]);
    } else {
      host.setSortState([]);
    }
  }

  host.emit("z-sort", { sortState: [...host.getSortState()] });
  host.emitConfigChange();
}

// ═══════════════════════════════════════════════════════════
// Column resize
// ═══════════════════════════════════════════════════════════

export function handleHeadMouseDown(e: MouseEvent, host: TableInteractionHost): void {
  const handle = (e.target as HTMLElement).closest<HTMLElement>(".z-rpt__resize-handle");
  if (!handle) return;
  e.preventDefault();

  const colKey = handle.dataset.key!;
  const th = handle.closest("th")!;
  const col = host.visibleColumns().find((c) => c.key === colKey);
  if (!col) return;

  const startWidth = th.getBoundingClientRect().width;
  const minW = parsePx(col.minWidth) || 50;
  const maxW = parsePx(col.maxWidth) || Infinity;

  host.setResizeInfo({ colKey, startX: e.clientX, startWidth, minWidth: minW, maxWidth: maxW });
  host.setResizing(true);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
}

export function handleResizeMouseMove(e: MouseEvent, host: TableInteractionHost): void {
  const info = host.getResizeInfo();
  if (!info) return;
  const { colKey, startX, startWidth, minWidth, maxWidth } = info;
  const newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + (e.clientX - startX)));
  host.columnWidths().set(colKey, Math.round(newWidth));
  host.update();
}

export function handleResizeMouseUp(host: TableInteractionHost): void {
  const info = host.getResizeInfo();
  if (!info) return;
  const colKey = info.colKey;
  host.setResizing(false);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  host.setResizeInfo(null);
  host.emit("z-column-resize", { key: colKey, width: host.columnWidths().get(colKey) });
  host.emitConfigChange();
}

// ═══════════════════════════════════════════════════════════
// Column reorder (editable)
// ═══════════════════════════════════════════════════════════
//
// [WHY 从 HTML5 DnD 换成 pointer] 2026-11-20（issue IKWNJL）。这个库自己早就论证过
// DnD 的三条硬伤（见 `editor/page-editor/controllers/drag.ts` 文件头）：
// ① 松手位置对不上（dragover 只在浏览器愿意发的时候发）；② 没有跟手物；
// ③ **容器里抓不住子块** —— `draggable` 是「最近可拖祖先」的继承语义。
// 表头 `th` 里正好有 handle、排序图标、筛选按钮，是 ③ 的教科书场景；
// 而报表这边一直留着 DnD，等于同一库里两套互斥方案并存。
//
// 现在起手、阈值、松手判定都交给 `primitives/pointer-drag`（普通滚轮那套
// 「判据只写一处」的同一条规矩），落点仍由表格自己算 —— 它才知道列头在哪。

/** 视口坐标落在哪个列头上；找不到返回 null（拖到表头外松手）。 */
function headAt(root: ParentNode | null, x: number, y: number): HTMLElement | null {
  const ths = root?.querySelectorAll<HTMLElement>("th[data-key]") ?? [];
  for (const th of Array.from(ths)) {
    const r = th.getBoundingClientRect();
    // [WHY 按 rect 命中而不是 elementFromPoint] window 上的 pointermove 在 shadow 外
    // 监听时，target 被重定向成宿主、composedPath 里也没有 shadow 内部节点；
    // 而 `ShadowRoot.elementFromPoint` 是非标准 API。列数不过几十，遍历比猜 API 稳。
    //
    // [WHY 右边界是开区间] 相邻两列的边界是同一个像素：两列都闭区间时，落在边界的
    // 指针永远命中**排在前面的那一列**，于是「按住 A 的右缘拖到 B」会判成「还在 A 上」，
    // 松手等于没动。左闭右开保证一个像素只属于一列。
    if (x >= r.left && x < r.right && y >= r.top && y <= r.bottom) return th;
  }
  return null;
}

export function handleColDragStart(e: PointerEvent, host: TableInteractionHost): void {
  if (e.button !== 0) return;
  const target = e.target as HTMLElement | null;
  if (!target?.closest) return;
  // 列宽手柄在同一个 th 里：按在它上面是要调宽，不是换列
  if (target.closest(".z-rpt__resize-handle")) return;
  const th = target.closest<HTMLElement>("th[data-key]");
  const key = th?.dataset.key;
  if (!key) return;
  host.setDragKey(key);
}

export function handleColDragMove(e: PointerEvent, host: TableInteractionHost): void {
  const dragKey = host.getDragKey();
  if (!dragKey) return;
  const th = headAt(host.root(), e.clientX, e.clientY);
  if (!th || th.dataset.key === dragKey) return;
  clearDragOver(host.root());
  th.classList.add("z-rpt__th--drag-over");
}

export function handleColDrop(e: PointerEvent, host: TableInteractionHost): void {
  clearDragOver(host.root());
  const key = host.getDragKey();
  host.setDragKey(null);
  if (!key) return;
  const th = headAt(host.root(), e.clientX, e.clientY);
  const targetKey = th?.dataset.key;
  if (!targetKey || targetKey === key) return;
  const columns = host.getColumns();
  const from = columns.findIndex((c) => c.key === key);
  const to = columns.findIndex((c) => c.key === targetKey);
  if (from === -1 || to === -1) return;
  const cols = [...columns];
  const [moved] = cols.splice(from, 1);
  // [WHY] 目标索引在 splice 后可能前移, 重新查找更稳妥
  const to2 = cols.findIndex((c) => c.key === targetKey);
  cols.splice(to2, 0, moved);
  host.setColumns(cols);
  host.emit("z-column-order-change", { keys: cols.map((c) => c.key) });
  host.emitConfigChange();
}

export function handleColDragEnd(host: TableInteractionHost): void {
  host.setDragKey(null);
  clearDragOver(host.root());
}

/**
 * 把「列头换序」挂到 shadow 根上；返回解绑函数。
 *
 * [WHY 绑在 table-interactions 而不是 ReportTable] 会话的寿命是「按住的那一下」，
 * 要就地 new、就地丢。放进 ReportTable 会给那个已经超线的文件再添十几行。
 */
export function bindColumnReorder(
  root: ShadowRoot,
  host: TableInteractionHost,
  enabled: () => boolean,
): () => void {
  let session: PointerDragSession | null = null;

  const onDown = (e: Event): void => {
    if (!enabled()) return;
    // 上一根还没收尾（理论上不会有）：先按取消处理，别把旧起点带进新会话
    session?.abort();
    handleColDragStart(e as PointerEvent, host);
    // 没命中列头（或按在调宽手柄上）时不建会话 —— handleColDragStart 不设 key
    if (!host.getDragKey()) return;
    session = new PointerDragSession({
      onMove: (d) => {
        if (d.moved) handleColDragMove(d.event, host);
      },
      onEnd: (d) => {
        // 没越过阈值 = 这一下是点击（排序），只清状态
        if (d.moved) handleColDrop(d.event, host);
        else handleColDragEnd(host);
        session = null;
      },
      onCancel: () => {
        handleColDragEnd(host);
        session = null;
      },
    });
    session.begin(e as PointerEvent);
  };

  root.addEventListener("pointerdown", onDown);
  return () => root.removeEventListener("pointerdown", onDown);
}

export function clearDragOver(root: ParentNode | null): void {
  root?.querySelectorAll(".z-rpt__th--drag-over")
    .forEach((el) => el.classList.remove("z-rpt__th--drag-over"));
}

// ═══════════════════════════════════════════════════════════
// Row click
// ═══════════════════════════════════════════════════════════

// [WHY] 整行点击事件(与 editable 无关): 业务列表页"点击行→打开详情"的通用交互, 见 issue IKD6L8 / [[REQ-014]]
// 语义: 点击行非交互区域时 emit z-row-click, detail { index, row }(row 为排序后的数据对象)。
// 排除交互元素命中: composedPath 从触发点扫到 <tr>, 命中 BUTTON/INPUT/SELECT/TEXTAREA/A
// 或自定义元素(含 z-* 组件)即放弃 — 行内 render 的按钮/链接/组件各自消费点击, 不冒泡为行事件。
/**
 * 行内控件（`col ui=`）的单元格点击 → `z-cell-change`。
 *
 * [WHY 由表格自己发，而不是让装配层读 DOM 算] 「这一格改成了什么新值」需要三样东西：
 * 行对象（`sortedRows[index]`）、当前值、以及 stepper 的上下限与步长。前者只有表格有
 * （`_sortedRows` 是排序后的行序，装配层手里的 `data` 是排序前的），后两者在这一格的
 * `data-*` 上。让装配层重新算一遍，就会出现「点第三行改了第一行」这种错位 —— 而页面不报错。
 *
 * 返回 true = 已消费（不再冒成行点击）。`ui=action` 没有 `data-cell`，走行点击那条路。
 */
export function handleCellClick(e: Event, host: TableInteractionHost): boolean {
  const path = e.composedPath();
  const cell = path.find((n) => n instanceof Element && n.hasAttribute("data-cell")) as HTMLElement | undefined;
  if (!cell) return false;
  const rowEl = cell.closest(".z-rpt__row") as HTMLElement | null;
  const index = Number(rowEl?.dataset.index ?? "-1");
  const row = host.sortedRows()[index];
  // 取不到行也**吃掉**这次点击：控件格不该顺带冒成「点了这一行」
  if (!row) return true;
  const ui = cellUiOf(cell);
  const field = cell.dataset.cell ?? "";
  // 输入框（`ui=text|number`）点进来不算提交：`nextCellValue` 没有 `typed` 时返回 `null`，
  // 于是落到下面那条 `!hit` 就结束了。**不在这里再判一次** —— 两处都判时，
  // 删掉任一处测试都不会红（实测过），守卫互相掩护比没有守卫更危险。
  const old = row[field];
  const dec = path.find((n) => n instanceof Element && n.hasAttribute("data-act")) as HTMLElement | undefined;
  const dir: -1 | 1 = dec?.getAttribute("data-act") === "dec" ? -1 : 1;
  const hit = nextCellValue(ui, {
    old,
    dir,
    step: cell.dataset.step !== undefined ? Number(cell.dataset.step) : undefined,
    min: cell.dataset.min !== undefined ? Number(cell.dataset.min) : undefined,
    max: cell.dataset.max !== undefined ? Number(cell.dataset.max) : undefined,
  });
  // 到边界不再上报：否则宿主收到一串「值没变」，还会白跑一次写入
  if (!hit || !hit.changed) return true;
  const next = hit.next;
  // [WHY 只给 pending 态、不改本地值] 界面先翻过去、宿主写失败时没人翻回来 ——
  // 用户看到「已保存」、数据里是旧的。等下一次 `load()` 带上真实值再定。
  markCell(cell, host);
  // `eventName` / `args` 一起带出去：装配层要按页面的事件契约算 payload，
  // 而这两样是**渲染时**才知道的（`onchange=` 与参数取值表达式），表格不该自己去解析脚本。
  host.emit("z-cell-change", {
    index,
    row,
    field,
    old,
    next,
    ui,
    eventName: cell.dataset.onchange ?? "",
    args: cell.dataset.args ?? "[]",
  });
  return true;
}

/**
 * 输入框单元格（`ui=text|number`）的提交口：失焦 / 回车 → `z-cell-change`。
 *
 * [WHY 走原生 `change` 而不是自己听 input] `change` 的语义恰好就是「值改完了、离开这一格」：
 * 打字过程中不触发，IME 组字中间态也不会被当成值发出去（筛选输入框踩过这个坑）。
 *
 * [WHY 读 `input.value` 而不是 `data-value`] `data-value` 是**渲染时**的旧值，
 * 用户改了它不会变 —— 读它等于每次上报的都还是原来的数（「保存了但没变」）。
 */
export function handleCellCommit(input: HTMLInputElement, host: TableInteractionHost): boolean {
  const cell = input.closest("[data-cell]") as HTMLElement | null;
  if (!cell) return false;
  const rowEl = cell.closest(".z-rpt__row") as HTMLElement | null;
  const index = Number(rowEl?.dataset.index ?? "-1");
  const row = host.sortedRows()[index];
  if (!row) return true;
  const field = cell.dataset.cell ?? "";
  const ui = cellUiOf(cell);
  const hit = nextCellValue(ui, { old: row[field], typed: input.value });
  // `null` = 打进来的不是数：留在原地让用户改，不上报（写 `NaN` 进数据比写错更难查）
  if (!hit || !hit.changed) return true;
  markCell(cell, host);
  host.emit("z-cell-change", {
    index,
    row,
    field,
    old: row[field],
    next: hit.next,
    ui,
    eventName: cell.dataset.onchange ?? "",
    args: cell.dataset.args ?? "[]",
  });
  return true;
}

/**
 * 改完这一格要画什么标记。
 *
 * 两档（见 `TableInteractionHost.draftMode`）：草稿态标 `is-dirty`（整行一起标，宽表里
 * 只标一格等于没标），逐格上报态仍标 `is-pending`。行元素从 cell 往上找 —— `tr` 在
 * 组件自己的 shadow 里，装配层拿不到。
 */
function markCell(cell: HTMLElement, host: TableInteractionHost): void {
  if (!host.draftMode?.()) {
    cell.classList.add("is-pending");
    return;
  }
  cell.classList.add("is-dirty");
  cell.closest(".z-rpt__row")?.classList.add("is-dirty");
}

export function handleRowClick(e: Event, host: TableInteractionHost): boolean {
  if (!host.rowClickable()) return false;
  const path = e.composedPath();
  const rowIdx = path.findIndex((n) => n instanceof Element && n.classList.contains("z-rpt__row"));
  if (rowIdx === -1) return false;
  for (let i = 0; i < rowIdx; i++) {
    const n = path[i];
    if (!(n instanceof Element)) continue;
    const tag = n.tagName;
    if (tag === "BUTTON" || tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "A") {
      const actBtn = n.closest("[data-rowact]") as HTMLElement | null;
      if (actBtn) {
        // 行内主按钮（`col ui=action`）有两种语义，靠按钮上有没有 `data-event` 区分：
        //   · 有 → 这是**动作**（「对这一行做什么」）：把契约原文交上去，**不**发 z-row-click；
        //   · 没有 → 旧行为「点它等于点这一行」，继续往下走成行点击。
        // [WHY 表格只转交原文、不解析契约] `name` / `args` 的语义属于页面层；
        // L2 一旦开始解释事件名，就得跟着页面契约一起改。这里只回答「哪一行、哪个按钮」。
        const ev = actBtn.dataset.event;
        if (ev) {
          const tr = path[rowIdx] as HTMLElement;
          const index = Number(tr.dataset.index ?? -1);
          const row = index >= 0 ? host.sortedRows()[index] : undefined;
          if (row !== undefined) {
            host.emit("z-cell-act", { index, row, event: ev });
            return true;
          }
        }
        continue;
      }
      return false;
    }
    // [WHY] 自定义元素一律视为交互元素: 其内部点击由组件自身消费, 对齐 z-table 的 z-* 排除语义
    if (tag.includes("-")) return false;
  }
  const tr = path[rowIdx] as HTMLElement;
  const index = Number(tr.dataset.index ?? -1);
  const row = host.sortedRows()[index];
  if (index < 0 || row === undefined) return false;
  host.emit("z-row-click", { index, row });
  return true;
}

// ═══════════════════════════════════════════════════════════
// Selection / config-footer change
// ═══════════════════════════════════════════════════════════

export function handleTableChange(e: Event, host: TableInteractionHost): void {
  const target = e.target as HTMLElement;
  // `ui=text|number` 的提交口（issue IKWNGS 第一条）。放在最前面：它不是勾选、
  // 不是格内按钮，漏下去会被当成「表格配置变更」，一次改值连带发一条 z-config-change。
  if (target?.matches?.("input.zp-cellctl--input")) {
    handleCellCommit(target as HTMLInputElement, host);
    return;
  }
  if (target.classList.contains("z-rpt__select-all")) {
    if ((e.target as HTMLInputElement).checked) {
      host.selectAll();
    } else {
      host.clearSelection();
    }
  } else if (target.classList.contains("z-rpt__row-checkbox")) {
    const cb = e.target as HTMLInputElement;
    const key = cb.dataset.key!;
    const set = new Set(host.selectedKeys());
    if (cb.checked) {
      set.add(key);
    } else {
      set.delete(key);
    }
    host.setSelectedKeys([...set]);
    const keys = [...host.selectedKeys()];
    host.emit("z-selection-change", { selectedKeys: keys, rows: host.rowsOfKeys?.(keys) ?? [] });
  // [WHY] 列选择器勾选已由内嵌 z-column-selector 处理: 委托 toggleColumn(key) 翻转
  // col.hidden(shared 引用)并 emit z-column-visibility-change, 本表只走 z-config-change, 见 [[REQ-015-column-selector]]
  } else if (target.classList.contains("z-rpt__th-config-footer")) {
    const cb = target as HTMLInputElement;
    const key = cb.dataset.key!;
    const col = host.getColumns().find((c) => c.key === key);
    if (col) {
      col.showFooter = cb.checked;
      host.update();
      host.emit("z-column-config-change", { key, align: col.align ?? null, showFooter: col.showFooter });
      host.emitConfigChange();
    }
  }
}

/** [WHY] 选择计数与渲染同源: updated() 用它同步表头全选框的 checked/indeterminate */
export function countSelected(
  data: Record<string, unknown>[],
  rowKey: string,
  selectedKeys: string[],
): number {
  const allKeys = data.map((row, i) => rowKeyOf(row, i, rowKey));
  return allKeys.filter((k) => selectedKeys.includes(k)).length;
}
