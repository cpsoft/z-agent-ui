// <z-datepicker> 日期选择：mode 定单日或区间，value 配 min / max 约束，presets 给快捷项；开、合、变更各发事件。
// [组合架构] 浮层托管给 FloatingPanelController、面板投影委托给 datepicker-panel-render.ts、
// 键盘导航委托给 datepicker-keyboard.ts，元素壳只保留属性契约与选择状态机。
import {
  BaseElement,
  html,
  property,
  injectGlobalStyles,
  clampPresetRange,
  presetRangeOf,
  parseISO,
  formatISO,
  todayISO,
  compareISO,
  isISOInRange,
  dayOf,
  composeDateTime,
  type ISOString,
  COPY,
  bindTriggerAria,
  isEditableElement,
  defineElement,
} from "../../core/index.js";
import { FloatingPanelController } from "../../primitives/index.js";
import datepickerCSS from "./datepicker.css?raw";
import { DATEPICKER_PANEL_CSS } from "./panel-styles.js";
import { readTimeSide } from "./time-row.js";
import {
  renderDatepickerPanel,
  resolveTimePart,
} from "./datepicker-panel-render.js";
import {
  computeShiftedFocus,
  handleDatepickerPanelKey,
} from "./datepicker-keyboard.js";

function injectStyles(): void {
  injectGlobalStyles("z-datepicker", DATEPICKER_PANEL_CSS);
}

export type DatepickerMode = "single" | "range";
export type DatepickerPrecision = "day" | "minute";

export class ZDatepicker extends BaseElement {
  static styles = datepickerCSS;

  @property({ type: String }) mode: DatepickerMode = "single";
  @property({ type: String }) value = "";
  @property({ type: String }) start = "";
  @property({ type: String }) end = "";
  @property({ type: String }) min = "";
  @property({ type: String }) max = "";
  @property({ type: String }) locale = "";
  @property({ type: Boolean }) open = false;
  @property({ type: String }) precision: DatepickerPrecision = "day";
  @property({ type: Boolean }) clearable = false;
  @property({ type: String }) presets = "";
  @property({ type: String }) prevMonthLabel = COPY.prevMonth;
  @property({ type: String }) nextMonthLabel = COPY.nextMonth;

  private _floating = this.addController(new FloatingPanelController(this));
  private _viewYear = 0;
  private _viewMonth = 0;
  private _focusISO: ISOString | null = null;
  private _hoverISO: ISOString | null = null;
  private _pendingStart: ISOString | null = null;
  private _pendingTime = "";
  private _pendingTimeEnd = "";
  private _lastPanelProps = "";

  private _triggerAria = bindTriggerAria(
    () => this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null,
    () => ({ hasPopup: "dialog", expanded: this.open }),
  );

  private get _locale(): string {
    return this.locale || navigator.language || "en-US";
  }

  private get _timed(): boolean {
    return this.precision === "minute";
  }

  render(): string {
    const hasValue = this.mode === "range" ? !!(this.start || this.end) : !!this.value;
    const clear =
      this.clearable && hasValue
        ? `<span class="z-datepicker__clear" part="clear" role="button" tabindex="-1" aria-label="${COPY.clear}">` +
          `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">` +
          `<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>`
        : "";
    return html`
      <span
        class="z-datepicker__trigger ${this.open ? "z-datepicker__trigger--open" : ""}"
        part="trigger"
      >
        <slot name="trigger"></slot>
        ${clear}
      </span>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectStyles();
    if (this.shadowRoot) this.listen(this.shadowRoot, "click", this._onClearClick);
    this.listen(this, "click", this._onTriggerClick);
    this.listen(this, "keydown", this._onHostKey);
  }

  disconnectedCallback(): void {
    this._closePanel();
    this._triggerAria.dispose();
    super.disconnectedCallback();
  }

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

  private _onClearClick = (e: Event): void => {
    const origin = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
    if (!origin?.closest?.(".z-datepicker__clear")) return;
    e.preventDefault();
    e.stopPropagation();
    this._clearValue();
  };

  private _onHostKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Delete" || this.open || !this.clearable) return;
    const hasValue = this.mode === "range" ? !!(this.start || this.end) : !!this.value;
    if (!hasValue) return;
    const origin = (e.composedPath?.()[0] ?? e.target) as Element | null;
    if (isEditableElement(origin)) return;
    ke.preventDefault();
    this._clearValue();
  };

  private _clearValue(): void {
    if (this.mode === "range") {
      if (!this.start && !this.end) return;
      this.start = "";
      this.end = "";
      this._pendingStart = null;
      this._pendingTime = "";
      this._pendingTimeEnd = "";
      this._closePanel();
      this.emit("z-change", { start: "", end: "" });
      return;
    }
    if (!this.value) return;
    this.value = "";
    this._pendingTime = "";
    this._closePanel();
    this.emit("z-change", { value: "" });
  }

  private _getTriggerEl(): HTMLElement | null {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]');
    const assigned = slot?.assignedElements();
    return (assigned && (assigned[0] as HTMLElement)) || null;
  }

  private _resolveSeedISO(): ISOString {
    if (this.value && parseISO(dayOf(this.value))) return dayOf(this.value);
    if (this.start && parseISO(dayOf(this.start))) return dayOf(this.start);
    if (this.end && parseISO(dayOf(this.end))) return dayOf(this.end);
    return todayISO();
  }

  private _openPanel(): void {
    if (this.open) return;
    injectStyles();

    const seed = parseISO(this._resolveSeedISO()) ?? new Date();
    this._viewYear = seed.getFullYear();
    this._viewMonth = seed.getMonth();
    this._focusISO = formatISO(seed);
    this._pendingStart = this.mode === "range" && this.start && !this.end ? dayOf(this.start) : null;
    this._hoverISO = null;
    this._pendingTime = "";
    this._pendingTimeEnd = "";

    const panel = this._floating.open(
      {
        panelClass: "z-datepicker__panel",
        hidingClass: "z-datepicker__panel--hiding",
        ariaLabel: "Datepicker",
        anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-datepicker__trigger"),
        onOutsideClose: () => this._closePanel(),
      },
      (p) => this._renderPanelTo(p),
    );

    panel.addEventListener("click", this._onPanelClick);
    panel.addEventListener("mouseover", this._onPanelMouseOver);
    panel.addEventListener("mouseleave", this._onPanelMouseLeave);
    panel.addEventListener("keydown", this._onPanelKey);
    panel.addEventListener("change", this._onPanelChange);

    this.open = true;
    this._focusCell();
    this.emit("z-datepicker-open");
  }

  private _closePanel(): void {
    if (!this.open) return;

    const panel = this._floating.panel;
    panel?.removeEventListener("click", this._onPanelClick);
    panel?.removeEventListener("mouseover", this._onPanelMouseOver);
    panel?.removeEventListener("mouseleave", this._onPanelMouseLeave);
    panel?.removeEventListener("keydown", this._onPanelKey);
    panel?.removeEventListener("change", this._onPanelChange);
    this._floating.close();

    this.open = false;
    this._hoverISO = null;
    this._pendingStart = null;
    this._pendingTime = "";
    this._pendingTimeEnd = "";
    this._focusISO = null;

    this._getTriggerEl()?.focus();
    this.emit("z-datepicker-close");
  }

  private _panelPropsSnapshot(): string {
    return [
      this.mode,
      this.value,
      this.start,
      this.end,
      this.min,
      this.max,
      this._locale,
      this.presets,
      this.precision,
    ].join("|");
  }

  private _panelPropsCurrent(): boolean {
    return this._panelPropsSnapshot() === this._lastPanelProps;
  }

  private _renderPanelTo(panel: HTMLElement): void {
    panel.innerHTML = renderDatepickerPanel({
      mode: this.mode,
      precision: this.precision,
      value: this.value,
      start: this.start,
      end: this.end,
      min: this.min,
      max: this.max,
      locale: this._locale,
      presets: this.presets,
      prevMonthLabel: this.prevMonthLabel,
      nextMonthLabel: this.nextMonthLabel,
      viewYear: this._viewYear,
      viewMonth: this._viewMonth,
      focusISO: this._focusISO,
      hoverISO: this._hoverISO,
      pendingStart: this._pendingStart,
      pendingTime: this._pendingTime,
      pendingTimeEnd: this._pendingTimeEnd,
    });
    this._lastPanelProps = this._panelPropsSnapshot();
  }

  private _focusCell(): void {
    const cell = this._floating.panel?.querySelector<HTMLElement>(".z-datepicker__cell--focus");
    cell?.focus();
  }

  private _repaintPanel(): void {
    const panel = this._floating.panel;
    if (panel) this._renderPanelTo(panel);
  }

  private _applyPreset(name: string): void {
    const now = new Date();
    const range = presetRangeOf(name, now);
    if (!range) return;
    const clamped = clampPresetRange(range, this.min, this.max);
    if (!clamped) return;
    const start = this._timed ? composeDateTime(clamped.start, "00:00") : clamped.start;
    const end = this._timed ? composeDateTime(clamped.end, "23:59") : clamped.end;
    this.start = start;
    this.end = end;
    this._pendingStart = null;
    this._focusISO = clamped.start;
    this._hoverISO = null;
    this.emit("z-change", { start, end });
    this._closePanel();
  }

  private _onPanelClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const preset = target.closest<HTMLElement>("[data-preset]");
    if (preset) {
      e.preventDefault();
      if ((preset as HTMLButtonElement).disabled) return;
      this._applyPreset(preset.dataset.preset ?? "");
      return;
    }
    const nav = target.closest<HTMLElement>("[data-nav]");
    if (nav) {
      e.preventDefault();
      this._navMonth(nav.dataset.nav === "next" ? 1 : -1, false);
      return;
    }
    if (target.closest("[data-time-done]")) {
      e.preventDefault();
      this._commitTime();
      this._closePanel();
      return;
    }
    if (target.closest("[data-time-part]")) return;
    const cell = target.closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    if (!isISOInRange(iso, this.min, this.max)) return;
    if (cell.classList.contains("z-datepicker__cell--out")) {
      const d = parseISO(iso);
      if (d) {
        this._viewYear = d.getFullYear();
        this._viewMonth = d.getMonth();
      }
    }
    this._selectISO(iso);
  };

  private _selectISO(iso: ISOString): void {
    this._focusISO = iso;
    if (this.mode === "single") {
      const next = this._timed
        ? composeDateTime(iso, resolveTimePart(this.value, this._pendingTime, "00:00"))
        : iso;
      if (this.value !== next) this.value = next;
      this.emit("z-change", { value: next });
      if (!this._timed) {
        this._closePanel();
        return;
      }
      this._repaintPanel();
      this._focusCell();
      return;
    }
    if (!this.start || this.end) {
      this.start = this._timed
        ? composeDateTime(iso, resolveTimePart("", this._pendingTime, "00:00"))
        : iso;
      this.end = "";
      this._pendingStart = iso;
      this._repaintPanel();
    } else if (compareISO(iso, dayOf(this.start)) >= 0) {
      this.end = this._timed
        ? composeDateTime(iso, resolveTimePart("", this._pendingTimeEnd, "23:59"))
        : iso;
      this._pendingStart = null;
      this.emit("z-change", { start: this.start, end: this.end });
      this._repaintPanel();
    } else {
      this.start = this._timed
        ? composeDateTime(iso, resolveTimePart("", this._pendingTime, "00:00"))
        : iso;
      this._pendingStart = iso;
      this._repaintPanel();
    }
    this._focusCell();
  }

  private _onPanelChange = (e: Event): void => {
    const el = (e.target as HTMLElement | null)?.closest?.("[data-time-part]");
    if (!el) return;
    this._commitTime();
  };

  private _commitTime(): void {
    const panel = this._floating.panel;
    if (!panel) return;
    const read = (side: string): string | null => readTimeSide(panel, side);

    if (this.mode === "range") {
      const st = read("start");
      const en = read("end");
      if (st === null || en === null) return;
      this._pendingTime = st;
      this._pendingTimeEnd = en;
      if (!this.start || !this.end) return;
      const start = composeDateTime(dayOf(this.start), st);
      const end = composeDateTime(dayOf(this.end), en);
      if (start === this.start && end === this.end) return;
      this.start = start;
      this.end = end;
      this._lastPanelProps = this._panelPropsSnapshot();
      this.emit("z-change", { start, end });
      return;
    }

    const time = read("value");
    if (time === null) return;
    this._pendingTime = time;
    if (!dayOf(this.value)) return;
    const next = composeDateTime(dayOf(this.value), time);
    if (next === this.value) return;
    this.value = next;
    this._lastPanelProps = this._panelPropsSnapshot();
    this.emit("z-change", { value: next });
  }

  private _onPanelMouseOver = (e: Event): void => {
    if (this.mode !== "range" || !this._pendingStart) return;
    const cell = (e.target as HTMLElement).closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    if (iso === this._hoverISO) return;
    this._hoverISO = iso;
    this._repaintPanel();
  };

  private _onPanelMouseLeave = (): void => {
    if (!this._hoverISO) return;
    this._hoverISO = null;
    this._repaintPanel();
  };

  private _onPanelKey = (e: Event): void => {
    handleDatepickerPanelKey(e, {
      getFocusISO: () => this._focusISO,
      getLocale: () => this._locale,
      isSelectable: (iso) => parseISO(iso) !== null && isISOInRange(iso, this.min, this.max),
      moveFocus: (iso, delta) => this._moveFocus(iso, delta),
      navMonth: (dir, keepFocus) => this._navMonth(dir, keepFocus),
      navYear: (dir) => this._navYear(dir),
      selectISO: (iso) => this._selectISO(iso),
      closePanel: () => this._closePanel(),
    });
  };

  private _moveFocus(iso: ISOString | null, delta: number): void {
    const next = computeShiftedFocus(iso, delta);
    if (!next) return;
    if (next.year !== this._viewYear || next.month !== this._viewMonth) {
      this._viewYear = next.year;
      this._viewMonth = next.month;
    }
    this._focusISO = next.iso;
    this._repaintPanel();
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
    this._viewMonth = m;
    this._viewYear = y;
    this._repaintPanel();
    const panel = this._floating.panel;
    if (!panel) return;
    if (keepFocus) {
      this._focusCell();
    } else {
      const sel = dir === 1 ? '[data-nav="next"]' : '[data-nav="prev"]';
      panel.querySelector<HTMLElement>(sel)?.focus();
    }
  }

  private _navYear(dir: number): void {
    this._viewYear += dir;
    this._repaintPanel();
    this._focusCell();
  }
}

defineElement("z-datepicker", ZDatepicker);
