// <z-table> 数据表：columns 与 data 驱动，sortKey / sortDir 排序并发 z-sort，loading 与 emptyText 覆盖两种空态。
import { COPY, BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import { gridIntent, resolveCell, roveByKey, roveTo, sameCell } from "../../primitives/index.js";
import tableCSS from "./table.css?raw";

export interface TableColumn {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: "left" | "center" | "right";
  // [WHY] 自定义单元格内容(按钮/图标按钮/徽标等), 返回 HTML 不转义; 组件事件经 shadow 冒泡,
  // 使用方监听 z-click 等事件即可, 见 [[REQ-001]]
  render?: (value: unknown, row: Record<string, unknown>, index: number) => string;
}

export class ZTable extends BaseElement {
  static styles = tableCSS;

  @property({ type: Array, attribute: false }) columns: TableColumn[] = [];
  @property({ type: Array, attribute: false }) data: Record<string, unknown>[] = [];
  @property({ type: String }) sortKey = "";
  @property({ type: String }) sortDir: "asc" | "desc" = "asc";
  @property({ type: Boolean }) striped = false;
  @property({ type: Boolean }) bordered = false;
  @property({ type: String }) size: "sm" | "md" = "md";
  @property({ type: Boolean }) loading = false;
  @property({ type: String }) emptyText = COPY.empty;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) loadingText = COPY.loading;

  /** 重渲染后要把焦点送回哪一列表头（见 `_restoreHeadFocus`）。 */
  private _refocusThKey: string | null = null;

  render(): string {
    const cls = [
      "z-table",
      this.striped ? "z-table--striped" : "",
      this.bordered ? "z-table--bordered" : "",
      `z-table--${this.size}`,
      this.loading ? "z-table--loading" : "",
    ].filter(Boolean).join(" ");

    const sorted = this._getSortedData();

    return html`
      <div class="z-table__wrapper" part="wrapper">
        <table class="${cls}" part="table">
          <thead class="z-table__head" part="head">
            <tr>${this._renderHeaders()}</tr>
          </thead>
          <tbody class="z-table__body" part="body">
            ${this.loading
              ? html`<tr class="z-table__loading-row"><td colspan="${this.columns.length || 1}" class="z-table__loading-cell" part="loading">${escapeAttr(this.loadingText)}</td></tr>`
              : sorted.length === 0
                ? html`<tr class="z-table__empty-row"><td colspan="${this.columns.length || 1}" class="z-table__empty-cell" part="empty">${escapeAttr(this.emptyText)}</td></tr>`
                : sorted.map((row, i) => this._renderRow(row, i)).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  updated(): void {
    const head = this.shadowRoot!.querySelector(".z-table__head");
    if (head && !(head as any).__sortBound) {
      head.addEventListener("click", this._onHeadClick);
      head.addEventListener("keydown", this._onHeadKey);
      (head as any).__sortBound = true;
    }
    const body = this.shadowRoot!.querySelector(".z-table__body");
    if (body && !(body as any).__navBound) {
      body.addEventListener("keydown", this._onCellKey);
      (body as any).__navBound = true;
    }
    this._restoreHeadFocus();
  }

  /**
   * 排序后把焦点送回同一列表头。
   *
   * [WHY 必须做] `sortKey` / `sortDir` 是响应式属性，改它们会触发整体重渲染
   * （BaseElement 换 innerHTML），**表头节点被整个换掉** ⇒ 焦点掉到 `<body>`。
   * 键盘用户按一次 Enter 排序，就得重新 Tab 回表头才能按第二次 —— 而「连续切几列排序」
   * 正是这个控件的用法。鼠标用户无感（手还在原位），所以这个缺陷只在键盘上显形。
   * 同一个坑 2026-11-16 在 `z-column-selector` 上也踩过（勾一列焦点掉 body）。
   */
  private _restoreHeadFocus(): void {
    const key = this._refocusThKey;
    if (!key) return;
    this._refocusThKey = null;
    const th = this.shadowRoot!.querySelector<HTMLElement>(`.z-table__th[data-key="${key}"]`);
    if (!th) return;
    roveTo(th, this._sortableHeads());
  }

  /** 可排序表头（键盘的候选集）。非排序列不参与，否则方向键会停在按不动的格子上。 */
  private _sortableHeads(): HTMLElement[] {
    return Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(".z-table__th--sortable"));
  }

  /** 点表头与按 Enter/Space 走同一条路：两处各写一遍必然有一处忘了切 dir。 */
  private _sortBy(key: string): void {
    // 先记下来：重渲染之后 th 是新节点，只能靠 data-key 找回
    this._refocusThKey = key;
    if (this.sortKey === key) {
      this.sortDir = this.sortDir === "asc" ? "desc" : "asc";
    } else {
      this.sortKey = key;
      this.sortDir = "asc";
    }
    this.emit("z-sort", { key: this.sortKey, dir: this.sortDir });
  }

  private _onHeadKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const th = (ke.target as HTMLElement).closest<HTMLElement>(".z-table__th--sortable");
    if (!th) return;

    if (ke.key === "Enter" || ke.key === " ") {
      if (!th.dataset.key) return;
      ke.preventDefault();
      this._sortBy(th.dataset.key);
      return;
    }

    // [WHY 表头也要 roving] 原来每个可排序列都写着 `tabindex="0"`：一张 8 列全可排序的表
    // 往 Tab 序列里塞 8 个停靠点，键盘用户想越过表头要按 8 下。这跟单元格那套
    // 「整表一个停靠点」的口径也不一致 —— 同一个控件里两套规矩，用户学不会。
    //
    // 表头是**一行**、只沿水平方向排布 ⇒ `axis: "horizontal"`：↑↓ 留给页面滚动，
    // 否则一张表占满视口时键盘用户就没法上下翻页了。
    if (roveByKey(this._sortableHeads(), th, ke.key, { wrap: false, axis: "horizontal" })) {
      ke.preventDefault();
    }
  };

  /**
   * 单元格之间的方向键导航。
   *
   * [WHY 需要它] 表格是这批控件里唯一的**二维**数据：Tab 只能沿一个方向走，
   * 想从「第 3 行第 5 列」挪到下一行同一列，没有方向键就只能 Shift+Tab 绕回去。
   * 读屏用户尤其依赖这个，因为「按行列读」是表格的标准交互。
   * 边界行为：到边就停（不环绕），Home/End 走行首行尾，Ctrl+Home/End 走全表首尾。
   */
  private _onCellKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    // 按键 → 意图 → 新坐标 → 落点，全在 L0 的 primitives/roving 里（与 z-report-table 共用）。
    // 「谁是候选集」留在这里：本表是 `data-row`/`data-col` 标记的完整矩形网格。
    const intent = gridIntent(ke.key, ke);
    if (!intent) return;
    const td = (ke.target as HTMLElement).closest<HTMLElement>(".z-table__td");
    if (!td) return;
    const from = { row: Number(td.dataset.row), col: Number(td.dataset.col) };
    if (Number.isNaN(from.row) || Number.isNaN(from.col)) return;

    const all = Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(".z-table__td[data-row]"));
    const bounds = {
      rows: Math.max(...all.map((c) => Number(c.dataset.row))) + 1,
      cols: this.columns.length,
    };
    const next = resolveCell(from, intent, bounds);
    ke.preventDefault();
    if (sameCell(next, from)) return;

    const target = all.find(
      (x) => Number(x.dataset.row) === next.row && Number(x.dataset.col) === next.col,
    );
    // roving tabindex 跟着走，否则下次 Tab 进表格会回到首格（用户会以为「又从头开始」）
    roveTo(target ?? null, all);
  };

  /** 表头行：可排序列里只有第一个带 `tabindex="0"`（整行一个停靠点，行内方向键走）。 */
  private _renderHeaders(): string {
    let firstSortable = true;
    return this.columns
      .map((col) => {
        const isStop = !!col.sortable && firstSortable;
        if (isStop) firstSortable = false;
        return this._renderHeader(col, isStop);
      })
      .join("");
  }

  private _renderHeader(col: TableColumn, isTabStop = false): string {
    const isActive = this.sortKey === col.key;
    const align = col.align ?? "left";
    const sortCls = col.sortable ? "z-table__th--sortable" : "";
    const activeCls = isActive ? `z-table__th--sorted z-table__th--sorted-${this.sortDir}` : "";
    const alignCls = `z-table__cell--${align}`;
    const width = col.width ? ` style="width:${col.width}"` : "";

    // [WHY aria-sort / tabindex] 排序表头原来只能点：鼠标用户看箭头就知道按了什么，
    // 键盘用户连焦点都落不上去（th 默认不可聚焦），读屏更听不到「当前按哪列升序」。
    // `aria-sort="none"` 要显式给可排序列，否则读屏不说「可排序」，只当普通表头。
    const ariaSort = isActive
      ? this.sortDir === "asc" ? "ascending" : "descending"
      : col.sortable ? "none" : null;

    return html`
      <th class="z-table__th ${sortCls} ${activeCls} ${alignCls}"${width} data-key="${col.key}" part="header-cell" scope="col"
        ${ariaSort ? `aria-sort="${ariaSort}"` : ""}${col.sortable ? ` tabindex="${isTabStop ? "0" : "-1"}"` : ""}>
        ${escapeAttr(col.header)}
        ${col.sortable ? html`<span class="z-table__sort-icon" part="sort-icon" aria-hidden="true"></span>` : ""}
      </th>
    `;
  }

  private _renderRow(row: Record<string, unknown>, index: number): string {
    const cells = this.columns.map((col, colIdx) => {
      const alignCls = `z-table__cell--${col.align ?? "left"}`;
      // [WHY] render 返回的 HTML 原样输出(不转义), 用于渲染 z-button 等自定义内容
      const content = col.render ? col.render(row[col.key], row, index) : escapeAttr(row[col.key]);
      // roving tabindex：整张表只留**一个** Tab 停靠点（首行首列），进去之后用方向键走。
      // 若每个单元格都 tabindex="0"，一张 50 行的表会往 Tab 序列里塞 300 个停靠点，
      // 键盘用户想越过表格得按几百下 —— 那比不能聚焦更糟。
      const tabIndex = index === 0 && colIdx === 0 ? ' tabindex="0"' : ' tabindex="-1"';
      return html`<td class="z-table__td ${alignCls}" part="cell" data-row="${index}" data-col="${colIdx}"${tabIndex}>${content}</td>`;
    }).join("");
    return html`<tr class="z-table__row" part="row">${cells}</tr>`;
  }

  private _getSortedData(): Record<string, unknown>[] {
    if (!this.sortKey || !this.data.length) return this.data;
    return [...this.data].sort((a, b) => {
      const av = a[this.sortKey];
      const bv = b[this.sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return this.sortDir === "desc" ? -cmp : cmp;
    });
  }

  private _onHeadClick = (e: Event): void => {
    const th = (e.target as HTMLElement).closest<HTMLElement>(".z-table__th--sortable");
    if (!th) return;
    const key = th.dataset.key;
    if (!key) return;

    this._sortBy(key);
  };
}

defineElement("z-table", ZTable);
