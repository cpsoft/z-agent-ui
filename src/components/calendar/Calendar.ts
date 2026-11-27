// <z-calendar> 月历面板：value 为选中日期，min / max 与 disabledDates 限制可选范围，翻月发 z-month-change。
// [WHY] z-calendar [[2026-08-11-W15-date]]:
// 独立月历面板（shadow DOM 渲染，非下拉）。42 格网格/键盘导航照搬 Datepicker
// （_onPanelKey 去 Escape/Tab 关闭语义），日期逻辑全部复用 calendar.ts 纯函数。
// 交互后同步重渲染（performUpdate）+ 恢复焦点，镜像 Datepicker _renderPanelTo 模式。
// See: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// [2026-08-11] night-hawk: 创建
import {
  BaseElement,
  html,
  property,
  escapeAttr,
  parseISO,
  formatISO,
  todayISO,
  isISOInRange,
  getFirstDayOfWeek,
  buildGrid,
  type CalendarCell,
  type ISOString,
  COPY,
  ariaBool,
 defineElement } from "../../core/index.js";
import calendarCSS from "./calendar.css?raw";
// 只有「文案与表格标记」还留在 L1；纯算术已下沉 core/date（2026-11-15）
import { getMonthLabel, renderGridTable } from "../datepicker/calendar.js";

export class ZCalendar extends BaseElement {
  static styles = calendarCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) min = "";
  @property({ type: String }) max = "";
  @property({ type: String }) locale = "";
  // [WHY] 多词属性需显式 attribute 名（decorators 只做 toLowerCase，见 src/core/decorators.ts:23）
  @property({ type: Boolean, attribute: "show-outside" }) showOutside = false;
  @property({ type: Array, attribute: false }) disabledDates: ISOString[] = [];
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) prevMonthLabel = COPY.prevMonth;
  @property({ type: String }) nextMonthLabel = COPY.nextMonth;

  private _viewYear = 0;
  private _viewMonth = 0; // 0-11
  private _focusISO: ISOString | null = null;

  private get _locale(): string {
    return this.locale || navigator.language || "en-US";
  }

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] 视图种子在首次渲染前定好（connectedCallback 内属性已 apply，见 decorators.ts:191 属性优先）
    const seed = parseISO(this.value) ?? new Date();
    this._viewYear = seed.getFullYear();
    this._viewMonth = seed.getMonth();
    this._focusISO = this.value && parseISO(this.value) ? this.value : formatISO(seed);
    // [WHY] 监听挂 shadowRoot：innerHTML 重建不丢失（镜像 Datepicker 面板委托）
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("keydown", this._onKey);
    super.disconnectedCallback();
  }

  render(): string {
    const locale = this._locale;
    const weekStart = getFirstDayOfWeek(locale);
    const cells = buildGrid(this._viewYear, this._viewMonth, weekStart);
    const today = todayISO();
    const monthLabel = getMonthLabel(locale, this._viewYear, this._viewMonth);

    return html`
      <div class="z-calendar" part="root">
        <div class="z-calendar__header" part="header">
          <button type="button" class="z-calendar__nav" data-nav="prev" part="nav-prev" aria-label="${escapeAttr(this.prevMonthLabel)}">‹</button>
          <div class="z-calendar__label" part="label">${monthLabel}</div>
          <button type="button" class="z-calendar__nav" data-nav="next" part="nav-next" aria-label="${escapeAttr(this.nextMonthLabel)}">›</button>
        </div>
        ${renderGridTable({
          prefix: "z-calendar",
          locale,
          weekStart,
          cells,
          today,
          ariaLabel: monthLabel,
          cellHTML: (cell, t) => this._cellHTML(cell, t),
        })}
      </div>
    `;
  }

  private _cellHTML(cell: CalendarCell, today: ISOString): string {
    const { iso, day, inMonth } = cell;
    const cls = ["z-calendar__cell"];
    let ariaDisabled = false;
    if (!inMonth) {
      // [WHY] show-outside 只控制可见性：42 格布局恒定（键盘焦点移动按 42 格）
      cls.push(this.showOutside ? "z-calendar__cell--out" : "z-calendar__cell--hidden");
      ariaDisabled = true;
    } else if (!isISOInRange(iso, this.min, this.max) || this.disabledDates.includes(iso)) {
      cls.push("z-calendar__cell--disabled");
      ariaDisabled = true;
    }
    if (iso === today) cls.push("z-calendar__cell--today");
    const selected = !!(this.value && iso === this.value);
    if (selected) cls.push("z-calendar__cell--selected");
    if (iso === this._focusISO) cls.push("z-calendar__cell--focus");
    return html`<td
      class="${cls.join(" ")}"
      role="gridcell"
      data-iso="${iso}"
      tabindex="${iso === this._focusISO ? 0 : -1}"
      aria-selected="${ariaBool(selected)}"
      aria-disabled="${ariaDisabled ? "true" : "false"}"
      ${iso === today ? 'aria-current="date"' : ""}
      part="cell"
    >${day}</td>`;
  }

  // ── 交互 ──

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const nav = target.closest<HTMLElement>("[data-nav]");
    if (nav) {
      e.preventDefault();
      this._navMonth(nav.dataset.nav === "next" ? 1 : -1, false);
      return;
    }
    const cell = target.closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    if (cell.classList.contains("z-calendar__cell--disabled") || cell.classList.contains("z-calendar__cell--out") || cell.classList.contains("z-calendar__cell--hidden")) {
      return;
    }
    this._selectISO(iso);
  };

  private _onKey = (e: Event): void => {
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
        else this._navMonth(-1, true);
        break;
      case "PageDown":
        e.preventDefault();
        if (ke.shiftKey) this._navYear(1);
        else this._navMonth(1, true);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (iso && this._isSelectable(iso)) this._selectISO(iso);
        break;
      // [WHY] 无 Escape/Tab：独立日历无关闭语义，Tab 走自然焦点流
    }
  };

  private _selectISO(iso: ISOString): void {
    this._focusISO = iso;
    if (this.value !== iso) {
      this.value = iso;
      this.emit("z-change", { value: iso });
    }
    this._sync();
    this._focusCell();
  }

  private _navMonth(dir: number, keepFocus: boolean): void {
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
    if (keepFocus) {
      // [WHY] 焦点日期随视图平移（同号日，越界钳到月末）：
      // 否则 focusISO 留在旧月，新月格子里无此日期 → --focus 类丢失
      const d = parseISO(this._focusISO ?? todayISO());
      if (d) {
        const day = Math.min(d.getDate(), new Date(y, m + 1, 0).getDate());
        this._focusISO = formatISO(new Date(y, m, day));
      }
    }
    this._setView(y, m);
    if (keepFocus) {
      this._focusCell();
    } else {
      const sel = dir === 1 ? '[data-nav="next"]' : '[data-nav="prev"]';
      this.shadowRoot!.querySelector<HTMLElement>(sel)?.focus();
    }
  }

  private _navYear(dir: number): void {
    this._setView(this._viewYear + dir, this._viewMonth);
    this._focusCell();
  }

  private _setView(y: number, m: number): void {
    if (y === this._viewYear && m === this._viewMonth) return;
    this._viewYear = y;
    this._viewMonth = m;
    this._sync();
    this.emit("z-month-change", { year: y, month: m });
  }

  private _isSelectable(iso: ISOString): boolean {
    return (
      parseISO(iso) !== null &&
      isISOInRange(iso, this.min, this.max) &&
      !this.disabledDates.includes(iso)
    );
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
    // 也没有任何提示。他无法区分「键盘坏了」与「这天不可选」，而界面上两者完全相同
    // （那格本来就是淡的，隔壁格也淡）。
    //
    // 现在的分工：**焦点移动 = 位置移动，与可选性解耦；可选性只在「选中」时判**
    // （见 `_onKey` 的 Enter 分支与 `_onClick`）。这也是 ARIA APG 网格模式的做法 ——
    // 不可选的单元格要**可聚焦**并标 `aria-disabled="true"`，让读屏与键盘用户都知道
    // 「这天存在但不可用」。与本库既有的判断一致：`aria-disabled` 而非原生 `disabled`
    // —— **可达可念、不可激活**（`z-app-switcher` 那轮定过同一条）。
    //
    // 不会因此落到隐藏格：跨月时 `_setView` 会切到目标月，那个日期在新视图里是当月格；
    // `show-outside=false` 只影响「当前视图里的外月格」，而焦点从来不跳格（只 ±1 / ±7）。
    if (parseISO(targetISO) === null) return;
    // [WHY] 先更新 focusISO 再重渲染：否则 DOM 按旧焦点构建，--focus 类在旧格子上
    this._focusISO = targetISO;
    if (target.getFullYear() !== this._viewYear || target.getMonth() !== this._viewMonth) {
      this._setView(target.getFullYear(), target.getMonth());
    } else {
      this._sync();
    }
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

  // [WHY] 交互后同步重渲染 + 恢复焦点：requestUpdate 是微任务，焦点恢复需 DOM 已更新
  // （镜像 Datepicker _renderPanelTo 后紧跟 _focusCell 的模式）
  private _sync(): void {
    this.performUpdate();
  }

  private _focusCell(): void {
    this.shadowRoot?.querySelector<HTMLElement>(".z-calendar__cell--focus")?.focus();
  }
}

defineElement("z-calendar", ZCalendar);
