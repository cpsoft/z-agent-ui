// <z-time-picker> 时间选择：value 双向，format 定格式，step 控制分钟粒度，开合与变更各发事件。
// [WHY] z-time-picker [[2026-08-11-W15-date]]:
// 时分秒滚动列选择器。下拉壳（body 面板 + styleInjected + FloatingPanelController +
// 点击外部关闭 + _closing 动画）照搬 Datepicker；值始终 24 小时制规范串
// "HH:mm[:ss]"，format="12" 只影响列内容与 AM/PM 列。
// 滚动列高频更新直写 __zui_prop_value + DOM 局部高亮，不走 requestUpdate
// （防面板重渲染滚动复位，slider 拖拽直写先例）。
// See: wiki/planning/TASKS/2026-08-11-W15-date/task_plan.md
// [2026-08-11] night-hawk: 创建
import { BaseElement, html, property, injectGlobalStyles, escapeAttr, bindTriggerAria, defineElement } from "../../core/index.js";
import { FloatingPanelController } from "../../primitives/index.js";
import timePickerCSS from "./time-picker.css?raw";

// [WHY] 面板在 light DOM（body 下），shadow 样式无法作用，需全局注入（镜像 Select/Datepicker）
const ITEM_H = 28;

function injectStyles(): void {
  injectGlobalStyles("z-time-picker", `
    .z-time-picker__panel {
      position: fixed;
      z-index: var(--z-z-dropdown);
      padding: var(--z-space-2) 0;
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      color: var(--z-color-text);
      outline: none;
      user-select: none;
      animation: z-time-picker-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-time-picker__panel--hiding {
      animation: z-time-picker-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-time-picker-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-time-picker-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-time-picker__cols {
      display: flex;
    }
    .z-time-picker__col {
      width: 48px;
      height: 140px;
      overflow-y: auto;
      scrollbar-width: none;
      scroll-snap-type: y mandatory;
      outline: none;
    }
    .z-time-picker__col::-webkit-scrollbar {
      display: none;
    }
    .z-time-picker__col:focus {
      /* [WHY] blue-50 暗色不翻转，焦点列会变亮白；改语义 soft */
      background: var(--z-color-primary-soft);
    }
    .z-time-picker__item {
      height: var(--z-control-h-sm);
      line-height: var(--z-control-h-sm);
      text-align: center;
      cursor: pointer;
      scroll-snap-align: center;
      border-radius: var(--z-radius-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-time-picker__item:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-time-picker__item--selected {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-time-picker__item--selected:hover {
      background: var(--z-color-primary-solid-hover);
    }
  `);
}

interface TimeParts {
  h: number;
  m: number;
  s: number;
}

export class ZTimePicker extends BaseElement {
  static styles = timePickerCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) format: "12" | "24" = "24";
  @property({ type: Number }) step = 1;
  @property({ type: Boolean }) second = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) open = false;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) amLabel = "AM";
  @property({ type: String }) pmLabel = "PM";

  // [WHY] 浮层面板生命周期（创建/定位/外部关闭/隐藏动画）委托给公共控制器
  private _floating = new FloatingPanelController(this);
  private _h = 0;
  private _m = 0;
  private _s = 0;
  private _lastPanelProps = "";

  /**
   * 触发器语义写到**槽里那个可聚焦件**上 —— 写在下面的 `<span>` 上无障碍树不承认
   * （2026-11-16 CDP 实测，同 popover / menu / datepicker / date-range）。
   * `aria-disabled` 一起迁：它原来也在这个 span 上，同样没生效。
   */
  private _triggerAria = bindTriggerAria(
    () => this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null,
    () => ({ hasPopup: "dialog", expanded: this.open, disabled: this.disabled }),
  );

  render(): string {
    return html`
      <span
        class="z-time-picker__trigger ${this.open ? "z-time-picker__trigger--open" : ""}"
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

  // 列定义变化（format/second/step）时重渲染打开中的面板
  updated(): void {
    this._triggerAria.sync();
    if (this.open && this._floating.panel && !this._panelPropsCurrent()) {
      this._renderPanelTo(this._floating.panel);
      this._scrollColumns();
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
    if (this.disabled) return;
    this.toggle();
  };

  private _getTriggerEl(): HTMLElement | null {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>('slot[name="trigger"]');
    const assigned = slot?.assignedElements();
    return (assigned && (assigned[0] as HTMLElement)) || null;
  }

  private _parseValue(v: string): TimeParts | null {
    const m = /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(v);
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    const s = m[3] !== undefined ? Number(m[3]) : 0;
    if (h > 23 || min > 59 || s > 59) return null;
    return { h, m: min, s };
  }

  private _formatValue(parts: TimeParts): string {
    const p = (n: number): string => String(n).padStart(2, "0");
    return `${p(parts.h)}:${p(parts.m)}${this.second ? `:${p(parts.s)}` : ""}`;
  }

  private _openPanel(): void {
    if (this.open || this.disabled) return;

    injectStyles();

    const parts = this._parseValue(this.value) ?? { h: 0, m: 0, s: 0 };
    this._h = parts.h;
    this._m = parts.m;
    this._s = parts.s;

    const panel = this._floating.open({
      panelClass: "z-time-picker__panel",
      hidingClass: "z-time-picker__panel--hiding",
      ariaLabel: "Time picker",
      anchor: this.shadowRoot!.querySelector<HTMLElement>(".z-time-picker__trigger") as HTMLElement,
      onOutsideClose: () => this._closePanel(),
    }, (p) => this._renderPanelTo(p));

    // 委托监听挂在 panel 上，innerHTML 重建不丢失（镜像 Select/Datepicker）
    panel.addEventListener("click", this._onPanelClick);
    panel.addEventListener("keydown", this._onPanelKey);
    // [WHY] scroll 不冒泡但走捕获阶段，panel 捕获层监听能接住列滚动
    // （列随 innerHTML 重建，滚动监听挂 panel 不丢失）
    panel.addEventListener("scroll", this._onPanelScroll, true);

    this.open = true;
    this._scrollColumns();
    panel.querySelector<HTMLElement>(".z-time-picker__col")?.focus();

    this.emit("z-time-picker-open");
  }

  private _closePanel(): void {
    if (!this.open) return;

    // [WHY] 先解绑面板内委托监听再交控制器关闭（控制器只管定位/外部监听/移除面板）
    const panel = this._floating.panel;
    panel?.removeEventListener("click", this._onPanelClick);
    panel?.removeEventListener("keydown", this._onPanelKey);
    panel?.removeEventListener("scroll", this._onPanelScroll, true);
    this._floating.close();

    this.open = false;
    this._getTriggerEl()?.focus();

    this.emit("z-time-picker-close");
  }

  private _panelPropsSnapshot(): string {
    return [this.format, this.second ? "s" : "", this.step, this.amLabel, this.pmLabel].join("|");
  }

  private _panelPropsCurrent(): boolean {
    return this._panelPropsSnapshot() === this._lastPanelProps;
  }

  private _renderPanelTo(panel: HTMLElement): void {
    panel.innerHTML = this._renderPanel();
    this._lastPanelProps = this._panelPropsSnapshot();
  }

  private _renderPanel(): string {
    const cols: string[] = [];

    // 时列：24h 0-23；12h 1-12
    const hourCount = this.format === "12" ? 12 : 24;
    let hourItems = "";
    for (let i = 0; i < hourCount; i++) {
      const display = this.format === "12" ? String(i + 1) : String(i).padStart(2, "0");
      hourItems += `<div class="z-time-picker__item" data-index="${i}" part="item">${display}</div>`;
    }
    cols.push(`<div class="z-time-picker__col" data-col="hour" tabindex="0" part="col" aria-label="Hour">${hourItems}</div>`);

    // 分列：按 step 步进
    const minuteCount = Math.ceil(60 / this.step);
    let minuteItems = "";
    for (let i = 0; i < minuteCount; i++) {
      const v = i * this.step;
      minuteItems += `<div class="z-time-picker__item" data-index="${i}" part="item">${String(v).padStart(2, "0")}</div>`;
    }
    cols.push(`<div class="z-time-picker__col" data-col="minute" tabindex="0" part="col" aria-label="Minute">${minuteItems}</div>`);

    if (this.second) {
      let secondItems = "";
      for (let i = 0; i < 60; i++) {
        secondItems += `<div class="z-time-picker__item" data-index="${i}" part="item">${String(i).padStart(2, "0")}</div>`;
      }
      cols.push(`<div class="z-time-picker__col" data-col="second" tabindex="0" part="col" aria-label="Second">${secondItems}</div>`);
    }

    if (this.format === "12") {
      cols.push(
        `<div class="z-time-picker__col z-time-picker__col--ampm" data-col="ampm" tabindex="0" part="col" aria-label="Period">` +
          `<div class="z-time-picker__item" data-index="0" part="item">${escapeAttr(this.amLabel)}</div>` +
          `<div class="z-time-picker__item" data-index="1" part="item">${escapeAttr(this.pmLabel)}</div>` +
          `</div>`,
      );
    }

    return `<div class="z-time-picker__cols" part="cols">${cols.join("")}</div>`;
  }

  private _scrollColumns(): void {
    if (!this._floating.panel) return;
    // 12h 时列的选中 index = (h % 12 || 12) - 1；AM/PM = h >= 12 ? 1 : 0
    // [WHY] scroll=true：scrollTop 是键盘/滚动读取选中位置的唯一依据，
    // 不滚动则始终 0（happy-dom 与浏览器一致）
    const hIdx = this.format === "12" ? (this._h % 12 || 12) - 1 : this._h;
    const mIdx = this._m / this.step;
    this._setColIndex("hour", hIdx, true);
    this._setColIndex("minute", mIdx, true);
    if (this.second) this._setColIndex("second", this._s, true);
    if (this.format === "12") this._setColIndex("ampm", this._h >= 12 ? 1 : 0, false);
  }

  /** 把列滚到指定 index 并同步高亮 */
  private _setColIndex(colName: string, index: number, scroll: boolean): void {
    const col = this._floating.panel?.querySelector<HTMLElement>(`[data-col="${colName}"]`);
    if (!col) return;
    const count = col.querySelectorAll(".z-time-picker__item").length;
    const idx = Math.min(Math.max(0, Math.round(index)), count - 1);
    const items = col.querySelectorAll<HTMLElement>(".z-time-picker__item");
    items.forEach((it, i) => it.classList.toggle("z-time-picker__item--selected", i === idx));
    if (scroll) {
      col.scrollTop = idx * ITEM_H;
    }
  }

  private _onPanelClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(".z-time-picker__item");
    if (!item) return;
    const col = item.closest<HTMLElement>("[data-col]") as HTMLElement;
    if (!col) return;
    const index = Number(item.dataset.index);
    this._applySelection(col.dataset.col!, index, true);
  };

  private _onPanelScroll = (e: Event): void => {
    const col = e.target as HTMLElement;
    const colName = col.dataset.col;
    if (!colName || colName === "ampm") return;
    const index = Math.round(col.scrollTop / ITEM_H);
    this._applySelection(colName, index, false);
  };

  /** 选中值应用：更新内部状态 + 直写 value + 局部高亮 + 发事件（不重渲染面板） */
  private _applySelection(colName: string, index: number, scroll: boolean): void {
    let h = this._h;
    let m = this._m;
    let s = this._s;
    switch (colName) {
      case "hour": {
        if (this.format === "12") {
          // 12h 显示 1-12 → 按当前 AM/PM 换算回 0-23
          const display = index + 1;
          h = (this._h >= 12 ? 12 : 0) + (display % 12);
        } else {
          h = index;
        }
        break;
      }
      case "minute":
        m = index * this.step;
        break;
      case "second":
        s = index;
        break;
      case "ampm":
        if (index === 0 && h >= 12) h -= 12;
        else if (index === 1 && h < 12) h += 12;
        break;
    }
    this._h = h;
    this._m = m;
    this._s = s;
    // [WHY] 直写 prop store 不走 requestUpdate：面板重渲染会复位滚动位置
    (this as any).__zui_prop_value = this._formatValue({ h, m, s });
    this._setColIndex(colName, index, scroll);
    this.emit("z-change", { value: this._formatValue({ h, m, s }) });
  }

  private _onPanelKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const col = (e.target as HTMLElement).closest<HTMLElement>("[data-col]");
    switch (ke.key) {
      case "ArrowUp":
      case "ArrowDown": {
        if (!col) return;
        e.preventDefault();
        const dir = ke.key === "ArrowUp" ? -1 : 1;
        const colEl = col as HTMLElement;
        const cur = Math.round(colEl.scrollTop / ITEM_H);
        this._applySelection(col.dataset.col!, cur + dir, true);
        break;
      }
      case "Enter":
        e.preventDefault();
        this._closePanel();
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

}

defineElement("z-time-picker", ZTimePicker);
