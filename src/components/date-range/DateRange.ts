// <z-date-range> 日期区间：start / end 双向，min / max 限范围，面板开合与变更各发事件。
// [WHY] z-date-range [[2026-08-11-W15-date]]:
// 双月并排区间选择器（左月 + 左月+1）。面板机制/range 状态机/hover 预览/
// 关闭动画全部照搬 Datepicker（_pendingStart/_hoverISO/_closing），键盘在
// 两月连续窗口内移动（跨月自动平移视图）。日期逻辑复用 calendar.ts 纯函数。
// See: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// [2026-08-11] night-hawk: 创建
import {
  BaseElement,
  html,
  property,
  injectGlobalStyles,
  escapeAttr,
  parseISO,
  formatISO,
  todayISO,
  compareISO,
  isISOInRange,
  getFirstDayOfWeek,
  buildGrid,
  type CalendarCell,
  type ISOString,
  COPY,
  bindTriggerAria,
 defineElement } from "../../core/index.js";
import { FloatingPanelController } from "../../primitives/index.js";
import dateRangeCSS from "./date-range.css?raw";
// 只有「文案与表格标记」还留在 L1；纯算术已下沉 core/date（2026-11-15）
import { getMonthLabel, renderGridTable } from "../datepicker/calendar.js";

// [WHY] 面板在 light DOM（body 下），shadow 样式无法作用，需全局注入（镜像 Datepicker）
function injectStyles(): void {
  injectGlobalStyles("z-date-range", `
    .z-date-range__panel {
      position: fixed;
      z-index: var(--z-z-dropdown);
      padding: var(--z-space-3);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: var(--z-line-height);
      color: var(--z-color-text);
      outline: none;
      user-select: none;
      animation: z-date-range-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-date-range__panel--hiding {
      animation: z-date-range-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-date-range-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-date-range-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-date-range__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--z-space-2);
    }
    .z-date-range__nav {
      width: 28px;
      height: var(--z-control-h-sm);
      border: none;
      background: transparent;
      border-radius: var(--z-radius-sm);
      color: var(--z-color-text-secondary);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: background var(--z-transition-fast);
    }
    .z-date-range__nav:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-date-range__label {
      font-weight: var(--z-font-weight-medium);
    }
    .z-date-range__panels {
      display: flex;
      gap: var(--z-space-4);
    }
    .z-date-range__grid {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .z-date-range__weekday {
      padding: var(--z-space-1) 0;
      width: 32px;
      text-align: center;
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      font-weight: var(--z-font-weight-medium);
    }
    .z-date-range__cell {
      width: 32px;
      height: var(--z-control-h);
      text-align: center;
      vertical-align: middle;
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      font-size: var(--z-font-size-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-date-range__cell:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-date-range__cell--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-date-range__cell--today {
      box-shadow: inset 0 0 0 1px var(--z-color-primary);
    }
    /* ── 区间带（先声明，端点在后覆盖）──
       [WHY] 2026-10-25：原先直接引用原始色板 blue-50（亮色几乎看不出、暗色是亮白块，
       白字压白底直接隐形）。改走 tint 语义层，明暗各一套。 */
    .z-date-range__cell--range-in {
      background: var(--z-color-primary-tint);
      border-radius: 0;
    }
    .z-date-range__cell--range-in:first-child {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-date-range__cell--range-in:last-child {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* hover：同特异性覆盖 .z-date-range__cell:hover，避免选区闪断 */
    .z-date-range__cell--range-in:hover {
      background: var(--z-color-primary-tint-hover);
    }
    /* ── 端点（实心，压在区间带之上）── */
    .z-date-range__cell--selected,
    .z-date-range__cell--range-start,
    .z-date-range__cell--range-end {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-date-range__cell--range-start {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-date-range__cell--range-end {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* 端点跨行断开时恢复四角圆（同 Datepicker 的说明） */
    .z-date-range__cell--range-start:last-child,
    .z-date-range__cell--range-end:first-child {
      border-radius: var(--z-radius-sm);
    }
    .z-date-range__cell--selected:hover,
    .z-date-range__cell--range-start:hover,
    .z-date-range__cell--range-end:hover {
      background: var(--z-color-primary-solid-hover);
    }
    .z-date-range__cell--focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -2px;
    }
  `);
}

export class ZDateRange extends BaseElement {
  static styles = dateRangeCSS;

  @property({ type: String }) start = "";
  @property({ type: String }) end = "";
  @property({ type: String }) min = "";
  @property({ type: String }) max = "";
  @property({ type: String }) locale = "";
  @property({ type: String }) separator = "~";
  @property({ type: Boolean }) open = false;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) prevMonthLabel = COPY.prevMonth;
  @property({ type: String }) nextMonthLabel = COPY.nextMonth;
  @property({ type: String }) clearLabel = COPY.clear;
  @property({ type: String }) ariaLabel = COPY.dateRangePicker;

  // [WHY] 浮层面板生命周期（创建/定位/外部关闭/隐藏动画）委托给公共控制器
  private _floating = new FloatingPanelController(this);
  private _viewYear = 0;
  private _viewMonth = 0; // 左月，0-11；右月恒为左月+1
  private _focusISO: ISOString | null = null;
  private _hoverISO: ISOString | null = null;
  private _pendingStart: ISOString | null = null; // range: start picked, awaiting end
  private _lastPanelProps = "";

  /**
   * `aria-haspopup` / `aria-expanded` 要落在**槽里那个可聚焦件**上。
   * 写在下面的 `<span>` 容器上无障碍树不承认（2026-11-16 CDP 实测，六处同形）。
   */
  private _triggerAria = bindTriggerAria(
    () => this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null,
    () => ({ hasPopup: "dialog", expanded: this.open }),
  );

  private get _locale(): string {
    return this.locale || navigator.language || "en-US";
  }

  render(): string {
    return html`
      <span
        class="z-date-range__trigger ${this.open ? "z-date-range__trigger--open" : ""}"
        part="trigger"
      >
        <slot name="trigger"></slot>
      </span>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectStyles();
    this.addEventListener("click", this._onTriggerClick);
  }

  disconnectedCallback(): void {
    this._closePanel();
    this._triggerAria.dispose();
    this.removeEventListener("click", this._onTriggerClick);
    super.disconnectedCallback();
  }

  // 外部属性变更（min/max/locale/start/end）时重渲染打开中的面板
  updated(): void {
    this._triggerAria.sync();
    if (this.open && this._floating.panel && !this._panelPropsCurrent()) {
      this._renderPanelTo(this._floating.panel);
      this._focusCell();
    }
  }

  show(): void {
    this._openPanel();
  }

  close(): void {
    this._closePanel();
  }

  toggle(): void {
    this.open ? this._closePanel() : this._openPanel();
  }

  private _onTriggerClick = (): void => {
    this.toggle();
  };

  private _getTriggerEl(): HTMLElement | null {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]');
    const assigned = slot?.assignedElements();
    return (assigned && (assigned[0] as HTMLElement)) || null;
  }

  private _openPanel(): void {
    if (this.open) return;

    injectStyles();

    const seed = parseISO(this.start) ?? parseISO(this.end) ?? new Date();
    this._viewYear = seed.getFullYear();
    this._viewMonth = seed.getMonth();
    this._focusISO = formatISO(seed);
    this._pendingStart = this.start && !this.end ? this.start : null;
    this._hoverISO = null;

    const panel = this._floating.open({
      panelClass: "z-date-range__panel",
      hidingClass: "z-date-range__panel--hiding",
      ariaLabel: this.ariaLabel,
      // [WHY] anchor 用 getter：open 触发重渲染替换 shadow 内 trigger，持旧引用滚动时定位读全 0（2026-09-10）
      // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
      anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-date-range__trigger"),
      onOutsideClose: () => this._closePanel(),
    }, (p) => this._renderPanelTo(p));

    // 委托监听挂在 panel 上，innerHTML 重建不丢失（镜像 Select/Datepicker）
    panel.addEventListener("click", this._onPanelClick);
    panel.addEventListener("mouseover", this._onPanelMouseOver);
    panel.addEventListener("mouseleave", this._onPanelMouseLeave);
    panel.addEventListener("keydown", this._onPanelKey);

    this.open = true;
    this._focusCell();

    this.emit("z-date-range-open");
  }

  private _closePanel(): void {
    if (!this.open) return;

    // [WHY] 先解绑面板内委托监听再交控制器关闭（控制器只管定位/外部监听/移除面板）
    const panel = this._floating.panel;
    panel?.removeEventListener("click", this._onPanelClick);
    panel?.removeEventListener("mouseover", this._onPanelMouseOver);
    panel?.removeEventListener("mouseleave", this._onPanelMouseLeave);
    panel?.removeEventListener("keydown", this._onPanelKey);
    this._floating.close();

    this.open = false;
    this._hoverISO = null;
    this._pendingStart = null;
    this._focusISO = null;

    this._getTriggerEl()?.focus();

    this.emit("z-date-range-close");
  }

  private _panelPropsSnapshot(): string {
    return [this.start, this.end, this.min, this.max, this._locale].join("|");
  }

  private _panelPropsCurrent(): boolean {
    return this._panelPropsSnapshot() === this._lastPanelProps;
  }

  private _renderPanelTo(panel: HTMLElement): void {
    panel.innerHTML = this._renderPanel();
    this._lastPanelProps = this._panelPropsSnapshot();
  }

  private _focusCell(): void {
    this._floating.panel?.querySelector<HTMLElement>(".z-date-range__cell--focus")?.focus();
  }

  private _renderPanel(): string {
    const locale = this._locale;
    const weekStart = getFirstDayOfWeek(locale);
    const today = todayISO();
    // 右月 = 左月 + 1（跨年自动进位，new Date(y, m+1, 1) 原生处理）
    const rightYear = this._viewMonth === 11 ? this._viewYear + 1 : this._viewYear;
    const rightMonth = (this._viewMonth + 1) % 12;
    const labelL = getMonthLabel(locale, this._viewYear, this._viewMonth);
    const labelR = getMonthLabel(locale, rightYear, rightMonth);

    return html`
      <div class="z-date-range__header" part="header">
        <button type="button" class="z-date-range__nav" data-nav="prev" part="nav-prev" aria-label="${escapeAttr(this.prevMonthLabel)}">‹</button>
        <div class="z-date-range__label" part="label">${labelL} ${this.separator} ${labelR}</div>
        <button type="button" class="z-date-range__nav" data-nav="next" part="nav-next" aria-label="${escapeAttr(this.nextMonthLabel)}">›</button>
      </div>
      <div class="z-date-range__panels" part="panels">
        ${this._gridHTML(this._viewYear, this._viewMonth, weekStart, today)}
        ${this._gridHTML(rightYear, rightMonth, weekStart, today)}
      </div>
    `;
  }

  private _gridHTML(year: number, month: number, weekStart: number, today: ISOString): string {
    return renderGridTable({
      prefix: "z-date-range",
      locale: this._locale,
      weekStart,
      cells: buildGrid(year, month, weekStart),
      today,
      ariaLabel: getMonthLabel(this._locale, year, month),
      cellHTML: (cell, t) => this._cellHTML(cell, t),
    });
  }

  private _cellHTML(cell: CalendarCell, today: ISOString): string {
    const { iso, day } = cell;
    const cls = ["z-date-range__cell"];
    const disabled = !isISOInRange(iso, this.min, this.max);
    if (disabled) cls.push("z-date-range__cell--disabled");
    if (iso === today) cls.push("z-date-range__cell--today");

    let ariaSelected = "false";
    if (this.start && iso === this.start) {
      cls.push("z-date-range__cell--range-start");
      ariaSelected = "true";
    }
    if (this.end && iso === this.end) {
      cls.push("z-date-range__cell--range-end");
      ariaSelected = "true";
    }
    const inCommitted =
      !!(this.start && this.end && compareISO(iso, this.start) > 0 && compareISO(iso, this.end) < 0);
    const inHover =
      !!(this._pendingStart && this._hoverISO && compareISO(iso, this._pendingStart) >= 0 && compareISO(iso, this._hoverISO) <= 0);
    if (inCommitted || inHover) cls.push("z-date-range__cell--range-in");

    const isFocus = iso === this._focusISO;
    if (isFocus) cls.push("z-date-range__cell--focus");
    return html`<td
      class="${cls.join(" ")}"
      role="gridcell"
      data-iso="${iso}"
      tabindex="${isFocus ? 0 : -1}"
      aria-selected="${ariaSelected}"
      aria-disabled="${disabled ? "true" : "false"}"
      ${iso === today ? 'aria-current="date"' : ""}
      part="cell"
    >${day}</td>`;
  }

  private _onPanelClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const nav = target.closest<HTMLElement>("[data-nav]");
    if (nav) {
      e.preventDefault();
      this._navMonth(nav.dataset.nav === "next" ? 1 : -1);
      return;
    }
    const cell = target.closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    if (cell.classList.contains("z-date-range__cell--disabled")) return;
    this._selectISO(iso);
  };

  private _selectISO(iso: ISOString): void {
    this._focusISO = iso;
    // range 状态机：空/已完成后重新起头；iso >= start 完成区间；否则重置 start
    // （照搬 Datepicker._selectISO）
    if (!this.start || this.end) {
      this.start = iso;
      this.end = "";
      this._pendingStart = iso;
      this._renderPanelTo(this._floating.panel!);
    } else if (compareISO(iso, this.start) >= 0) {
      this.end = iso;
      this._pendingStart = null;
      this.emit("z-change", { start: this.start, end: iso });
      this._renderPanelTo(this._floating.panel!);
    } else {
      this.start = iso;
      this._pendingStart = iso;
      this._renderPanelTo(this._floating.panel!);
    }
    this._focusCell();
  }

  private _onPanelMouseOver = (e: Event): void => {
    if (!this._pendingStart) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    if (iso === this._hoverISO) return;
    this._hoverISO = iso;
    this._renderPanelTo(this._floating.panel!);
  };

  private _onPanelMouseLeave = (): void => {
    if (!this._hoverISO) return;
    this._hoverISO = null;
    this._renderPanelTo(this._floating.panel!);
  };

  // [WHY] 键盘焦点模型：两月连续窗口 [左月首日, 右月末日]，按天移动；
  // 移出窗口时整体平移视图（左月随之进退），照搬 Datepicker._onPanelKey 骨架
  private _onPanelKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const iso = this._focusISO;
    switch (ke.key) {
      case "ArrowLeft":
        e.preventDefault();
        this._moveFocus(iso, -1);
        break;
      case "ArrowRight":
        e.preventDefault();
        this._moveFocus(iso, 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        this._moveFocus(iso, -7);
        break;
      case "ArrowDown":
        e.preventDefault();
        this._moveFocus(iso, 7);
        break;
      case "Home":
        e.preventDefault();
        this._moveFocusToWeekBoundary(iso, false);
        break;
      case "End":
        e.preventDefault();
        this._moveFocusToWeekBoundary(iso, true);
        break;
      case "PageUp":
        e.preventDefault();
        if (ke.shiftKey) this._navYear(-1);
        else this._navMonth(-1);
        break;
      case "PageDown":
        e.preventDefault();
        if (ke.shiftKey) this._navYear(1);
        else this._navMonth(1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (iso && this._isSelectable(iso)) this._selectISO(iso);
        break;
      case "Escape":
        e.preventDefault();
        this._closePanel();
        break;
      case "Tab":
        this._closePanel();
        break;
    }
  };

  private _isSelectable(iso: ISOString): boolean {
    return parseISO(iso) !== null && isISOInRange(iso, this.min, this.max);
  }

  private _moveFocus(iso: ISOString | null, delta: number): void {
    if (!iso) return;
    const d = parseISO(iso);
    if (!d) return;
    const target = new Date(d);
    target.setDate(target.getDate() + delta);
    const targetISO = formatISO(target);
    // [WHY 只用「日期有效」拦，不用 `_isSelectable`] 这里原来写的是
    // `if (!this._isSelectable(targetISO)) return;` —— 结果是**按了没反应**：
    // 用户在 `min` 当天按 ←（或落在 `disabled-dates` 上按 →），焦点一动不动，
    // 也没有任何提示。他无法区分「键盘坏了」与「这天不可选」，而界面上两者完全相同。
    //
    // 现在的分工：**焦点移动 = 位置移动，与可选性解耦；可选性只在「选中」时判**
    // （见 keydown 的 Enter 分支与 click 分支）。这也是 ARIA APG 网格模式的做法 ——
    // 不可选的单元格要**可聚焦**并标 `aria-disabled="true"`，让读屏与键盘用户都知道
    // 「这天存在但不可用」。与本库既有的判断一致：`aria-disabled` 而非原生 `disabled`
    // —— **可达可念、不可激活**（`z-app-switcher` 那轮定过同一条）。
    if (parseISO(targetISO) === null) return;
    const windowStart = new Date(this._viewYear, this._viewMonth, 1);
    const windowEnd = new Date(this._viewYear, this._viewMonth + 2, 0); // 右月末日
    if (target < windowStart) {
      this._shiftView(-1);
    } else if (target > windowEnd) {
      this._shiftView(1);
    }
    this._focusISO = targetISO;
    this._renderPanelTo(this._floating.panel!);
    this._focusCell();
  }

  private _moveFocusToWeekBoundary(iso: ISOString | null, toEnd: boolean): void {
    if (!iso) return;
    const d = parseISO(iso);
    if (!d) return;
    const weekStart = getFirstDayOfWeek(this._locale);
    const offset = (d.getDay() - weekStart + 7) % 7;
    this._moveFocus(iso, toEnd ? 6 - offset : -offset);
  }

  private _shiftView(dir: number): void {
    let m = this._viewMonth + dir;
    let y = this._viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this._viewMonth = m;
    this._viewYear = y;
  }

  private _navMonth(dir: number): void {
    let m = this._viewMonth + dir;
    let y = this._viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    if (m > 11) {
      m = 0;
      y += 1;
    }
    this._viewMonth = m;
    this._viewYear = y;
    // [WHY] 视图平移后焦点日期随行：同号日留在窗口内（越界钳到窗口边界）
    this._focusISO = formatISO(new Date(this._viewYear, this._viewMonth, 1));
    this._renderPanelTo(this._floating.panel!);
    this._focusCell();
  }

  private _navYear(dir: number): void {
    this._viewYear += dir;
    this._focusISO = formatISO(new Date(this._viewYear, this._viewMonth, 1));
    this._renderPanelTo(this._floating.panel!);
    this._focusCell();
  }
}

defineElement("z-date-range", ZDateRange);
