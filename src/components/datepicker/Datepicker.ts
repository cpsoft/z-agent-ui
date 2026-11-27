// <z-datepicker> 日期选择：mode 定单日或区间，value 配 min / max 约束，presets 给快捷项；开、合、变更各发事件。
import {
  BaseElement,
  html,
  property, t,
  injectGlobalStyles,
  escapeAttr,
  escapeHtml,
  clampPresetRange,
  presetIsActive,
  presetRangeOf,
  parseISO,
  formatISO,
  todayISO,
  compareISO,
  isISOInRange,
  dayOf,
  timeOf,
  composeDateTime,
  getFirstDayOfWeek,
  buildGrid,
  type CalendarCell,
  type ISOString,
  COPY,
  ariaBool,
  bindTriggerAria,
  isEditableElement,
 defineElement } from "../../core/index.js";
import { FloatingPanelController } from "../../primitives/index.js";
import datepickerCSS from "./datepicker.css?raw";
import { DATEPICKER_PANEL_CSS } from "./panel-styles.js";
import { readTimeSide, timeRowHtml } from "./time-row.js";
import { getMonthLabel, renderGridTable } from "./calendar.js";

// [WHY] 面板在 light DOM（body 下），shadow 样式无法作用，需全局注入（镜像 Select/Popover）
// See: wiki/planning/TASKS/W4-datepicker/findings.md
// 样式本体在 `panel-styles.ts`：它与组件逻辑改动的理由不同（视觉要调 vs 行为要改），
// 挤在一个文件里时改哪边都要通读另一边。
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
  /**
   * 精度：`day` 只到日（缺省），`minute` 到分（issue IKWNI3）。
   *
   * [WHY 是属性而不是「加一个 time 开关」] 它是**同一个值的精度**：选了日期还选不选时间，
   * 是这件事本身的属性，不是两件东西的组合。开关式（`time`）下一步就要长成
   * `time=yes step=15 withSeconds=no` —— 那是把格式串塞进属性表。
   *
   * [WHY 缺省 day] 存量用法一个像素都不变。见 `page/data/date-precision.ts`。
   */
  @property({ type: String }) precision: DatepickerPrecision = "day";
  /**
   * 有值时在框内右侧显示清除入口。
   *
   * [WHY 缺省关闭] 表单里的「生日」「入职日期」是必填项，清空只会制造一个非法态；
   * 只有筛选场景需要「选了能退回不筛」。缺省关 = 现有用法一个像素都不变。
   */
  @property({ type: Boolean }) clearable = false;
  /**
   * 快捷区间（issue IKUE1G）：逗号分隔的预设名，如 `近7天,近30天,本月`。
   *
   * 只在 `mode="range"` 生效 —— 单选日历没有「区间」可快选。
   * 点一下 = 写入 start / end 并 emit `z-change`（与手选走同一条出口），然后关面板：
   * 快捷键的价值就是「一次点击结束」，选完还留着一个开着的日历等于让人再点一下。
   *
   * 名字不认识就**不画那个按钮**（与 `actions=` 的口径一致），不猜同义词。
   */
  @property({ type: String }) presets = "";
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) prevMonthLabel = COPY.prevMonth;
  @property({ type: String }) nextMonthLabel = COPY.nextMonth;

  // [WHY] 浮层面板生命周期（创建/定位/外部关闭/隐藏动画）委托给公共控制器
  private _floating = new FloatingPanelController(this);
  private _viewYear = 0;
  private _viewMonth = 0; // 0-11
  private _focusISO: ISOString | null = null;
  private _hoverISO: ISOString | null = null;
  private _pendingStart: ISOString | null = null; // range: start picked, awaiting end
  /**
   * `precision="minute"` 时，用户**先填时间、后选日期**的那一段暂存。
   *
   * [WHY 需要暂存] 时间行的位置在日历下面，但用户完全可能先点时间框再点日期
   * （他上一屏刚看过「09:00 的班次」）。没有暂存的话，那次输入会被下一次重画面板
   * 抹掉 —— 而界面看起来一切正常，只是他填的分没了。
   *
   * 只活在面板开着的时候：值里已经有时间时永远优先取值里的（见 `_timeOr`）。
   */
  private _pendingTime = "";
  private _pendingTimeEnd = "";
  private _lastPanelProps = "";

  /**
   * `aria-haspopup` / `aria-expanded` 要落在**槽里那个可聚焦件**上。
   * 写在下面的 `<span>` 容器上无障碍树不承认（2026-11-16 CDP 实测）。
   */
  private _triggerAria = bindTriggerAria(
    () => this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null,
    () => ({ hasPopup: "dialog", expanded: this.open }),
  );

  private get _locale(): string {
    return this.locale || navigator.language || "en-US";
  }

  render(): string {
    // 区间只要有一端就算「有值」：只选了起点时同样要能退回去，否则卡在「半截区间」只能重选
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
    // 清除钮的点击必须挂在 **shadowRoot** 上：
    // 挂在宿主机上时，对 shadow 树来说监听器在「边界外」，`e.target` 会被重定向成宿主本身，
    // `closest(".z-datepicker__clear")` 恒为 null —— 点 × 的结果变成打开日历。
    // 挂在 root 上则在边界内，target 是真实节点；`stopPropagation` 再拦住宿主的 toggle。
    this.shadowRoot?.addEventListener("click", this._onClearClick);
    this.addEventListener("click", this._onTriggerClick);
    this.addEventListener("keydown", this._onHostKey);
  }

  disconnectedCallback(): void {
    this._closePanel();
    this._triggerAria.dispose();
    this.shadowRoot?.removeEventListener("click", this._onClearClick);
    this.removeEventListener("click", this._onTriggerClick);
    this.removeEventListener("keydown", this._onHostKey);
    super.disconnectedCallback();
  }

  // 外部属性变更（min/max/mode/locale/value/start/end）时重渲染打开中的面板
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

  /** 清除钮：挂在 shadowRoot 上（见 connectedCallback 的注释），命中就清值并拦住宿主的 toggle。 */
  private _onClearClick = (e: Event): void => {
    const origin = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
    if (!origin?.closest?.(".z-datepicker__clear")) return;
    e.preventDefault();
    e.stopPropagation();
    this._clearValue();
  };

  /**
   * 触发器上的 `Delete`：清空当前值。
   *
   * [WHY 需要一条键盘路径] 清除钮是 `tabindex="-1"` 的（它不该占一个 Tab 停靠点 ——
   * 触发器本身已经是停靠点），于是**键盘用户没有任何办法清空这个字段**：
   * 日期不是能选中再删掉的文本，`z-input` 那套「全选 + 删除」在这里不成立。
   *
   * [WHY 用 Delete 而不是 Escape] 面板开着时 Esc 是「关面板」，那是更靠前的语义；
   * 而 `Delete` 在原生 `<select>`（多选）与各类标签输入里就是「删掉这个值」。
   *
   * [WHY 还要判可编辑焦点] 槽里塞的可能是 `<z-input>`。若它是可编辑的，Delete 归它
   * （删字符），抢过来就等于把一个能打字的输入框弄坏。
   */
  private _onHostKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Delete") return;
    if (this.open || !this.clearable) return;
    const hasValue = this.mode === "range" ? !!(this.start || this.end) : !!this.value;
    if (!hasValue) return;
    // 判据用**事件真实目标**（穿 shadow），不是 `document.activeElement`：
    // 后者在 shadow 里拿到的是宿主，`<z-input>` 会被判成"不可编辑"，
    // 于是 Delete 从输入框里被抢走 —— 一个能打字的框被组件弄坏。
    const origin = (e.composedPath?.()[0] ?? e.target) as Element | null;
    if (isEditableElement(origin)) return;
    ke.preventDefault();
    this._clearValue();
  };

  /**
   * 清空当前值并通知宿主。
   *
   * 与 `z-select` 走同一条出口（`z-change` + 空值），不再发明 `z-clear`：
   * 消费方（PageView）已经按「值变化」处理，多一个事件名就多一处要记得接的地方。
   * 清空后立刻关面板：面板还开着、框里已经没值，用户会以为没点中。
   */
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
    // 每次都从值开始：上次关面板时暂存已经没意义了（值里有的才是真的）
    this._pendingTime = "";
    this._pendingTimeEnd = "";

    const panel = this._floating.open({
      panelClass: "z-datepicker__panel",
      hidingClass: "z-datepicker__panel--hiding",
      ariaLabel: "Datepicker",
      // [WHY] anchor 用 getter：open 触发重渲染替换 shadow 内 trigger，持旧引用滚动时定位读全 0（2026-09-10）
      // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
      anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-datepicker__trigger"),
      onOutsideClose: () => this._closePanel(),
    }, (p) => this._renderPanelTo(p));

    // 委托监听挂在 panel 上，innerHTML 重建不丢失（镜像 Select）
    panel.addEventListener("click", this._onPanelClick);
    panel.addEventListener("mouseover", this._onPanelMouseOver);
    panel.addEventListener("mouseleave", this._onPanelMouseLeave);
    panel.addEventListener("keydown", this._onPanelKey);
    // 时间框用 `change`（失焦 / 回车）而不是 `input`：边打边提交会把「2」当成 02:00，
    // 而用户正要打「23」—— 一次查询按 02:00 发出去，结果是空表格。
    panel.addEventListener("change", this._onPanelChange);

    this.open = true;
    this._focusCell();

    this.emit("z-datepicker-open");
  }

  private _closePanel(): void {
    if (!this.open) return;

    // [WHY] 先解绑面板内委托监听再交控制器关闭（控制器只管定位/外部监听/移除面板）
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

    // Focus back to trigger
    this._getTriggerEl()?.focus();

    this.emit("z-datepicker-close");
  }

  private _panelPropsSnapshot(): string {
    return [this.mode, this.value, this.start, this.end, this.min, this.max, this._locale, this.presets, this.precision].join("|");
  }

  private _panelPropsCurrent(): boolean {
    return this._panelPropsSnapshot() === this._lastPanelProps;
  }

  private _renderPanelTo(panel: HTMLElement): void {
    panel.innerHTML = this._renderPanel();
    this._lastPanelProps = this._panelPropsSnapshot();
  }

  private _focusCell(): void {
    const cell = this._floating.panel?.querySelector<HTMLElement>(".z-datepicker__cell--focus");
    cell?.focus();
  }

  /**
   * 重渲染打开中的面板。
   *
   * [WHY] 修复 Gitee IKRAOS：宿主常在 `z-change` 里同步 `close()`（"选完立刻收起"），
   * 而 `floatingPanel.close()` 会把内部 `_panel` 置 null。此时 `this._floating.panel!`
   * 的非空断言只骗过 TS —— 运行时就是 `null.innerHTML`。
   * 面板已经关掉就无需重渲染，直接跳过；这里统一收口，避免每处各写一遍判断。
   */
  private _repaintPanel(): void {
    const panel = this._floating.panel;
    if (panel) this._renderPanelTo(panel);
  }

  private _renderPanel(): string {
    const locale = this._locale;
    const weekStart = getFirstDayOfWeek(locale);
    const cells = buildGrid(this._viewYear, this._viewMonth, weekStart);
    const today = todayISO();
    const monthLabel = getMonthLabel(locale, this._viewYear, this._viewMonth);

    return html`
      ${this._presetsHTML()}
      <div class="z-datepicker__header" part="header">
        <button type="button" class="z-datepicker__nav" data-nav="prev" part="nav-prev" aria-label="${escapeAttr(this.prevMonthLabel)}">‹</button>
        <div class="z-datepicker__label" part="label">${monthLabel}</div>
        <button type="button" class="z-datepicker__nav" data-nav="next" part="nav-next" aria-label="${escapeAttr(this.nextMonthLabel)}">›</button>
      </div>
      ${renderGridTable({
        prefix: "z-datepicker",
        locale,
        weekStart,
        cells,
        today,
        ariaLabel: monthLabel,
        cellHTML: (cell, t) => this._cellHTML(cell, t),
      })}
      ${this._timeHTML()}
    `;
  }

  /** 时间行的 HTML（渲染在 `time-row.ts`，这里只补上当前值）。 */
  private _timeHTML(): string {
    if (!this._timed) return "";
    if (this.mode === "range") {
      return timeRowHtml({
        mode: "range",
        time: this._timeOf(this.start, this._pendingTime, "00:00"),
        timeTo: this._timeOf(this.end, this._pendingTimeEnd, "23:59"),
      });
    }
    return timeRowHtml({
      mode: "single",
      time: this._timeOf(this.value, this._pendingTime, "00:00"),
      timeTo: "",
    });
  }

  /** 某一端当前的时间：值里带的 → 暂存的 → 缺省。 */
  private _timeOf(raw: string, pending: string, fallback: string): string {
    return timeOf(raw) || pending || fallback;
  }

  /**
   * 快捷区间那一排 chip（issue IKUE1G）。
   *
   * 三条规则写在这里，别处不要再算：
   *   ① 只认 `presets=` 里写到的名字，拼错的不画按钮（不猜同义词）；
   *   ② 区间被 `min` / `max` 夹完为空 ⇒ 按钮置灰（点下去也不会有反应的东西不该可点）；
   *   ③ 只有**完全等于**某个预设时才高亮 —— 手选的自定义区间不许点亮预设，
   *      否则用户点它想复位时值没变化 ⇒ 组件不发事件 ⇒ 看着像按钮坏了。
   */
  private _presetsHTML(): string {
    if (this.mode !== "range" || !this.presets.trim()) return "";
    const now = new Date();
    const items = this.presets
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => {
        const range = presetRangeOf(name, now);
        if (!range) return "";
        const usable = clampPresetRange(range, this.min, this.max) !== null;
        const active = presetIsActive(name, dayOf(this.start), dayOf(this.end), now, this.min, this.max);
        return (
          `<button type="button" class="z-datepicker__preset${active ? " is-active" : ""}"` +
          ` data-preset="${escapeAttr(name)}" aria-pressed="${active ? "true" : "false"}"` +
          (usable ? "" : ` disabled aria-disabled="true" title="${escapeAttr(t("dateOutOfRange"))}"`) +
          `>${escapeHtml(name)}</button>`
        );
      })
      .filter(Boolean)
      .join("");
    if (!items) return "";
    return (
      `<div class="z-datepicker__presets" part="presets" role="group" aria-label="${escapeAttr(t("quickRanges"))}">` +
      `${items}</div>`
    );
  }

  /**
   * 点一个预设：写入两端、emit、关面板。
   *
   * [WHY 与手选走同一条出口] 值的分发只有 `z-change {start,end}` 这一条（PageView 的
   * `applyFilters` 也只认它）。预设另发一个事件名的话，宿主得接两套 —— 而漏接的那一套
   * 表现为「点了按钮日期变了、数据没变」。
   */
  private _applyPreset(name: string): void {
    const now = new Date();
    const range = presetRangeOf(name, now);
    if (!range) return;
    const clamped = clampPresetRange(range, this.min, this.max);
    if (!clamped) return;
    // 预设给的是**日期**（「近 30 天」是 30 个日历日），到分时要把它还原成
    // 「第一天 00:00 ~ 最后一天 23:59」。补成 00:00~00:00 会让最后一天整天被排除，
    // 而区间看起来是完整的 —— 月末对账会少一天的数据，没人会想到是这里。
    const start = this._timed ? composeDateTime(clamped.start, "00:00") : clamped.start;
    const end = this._timed ? composeDateTime(clamped.end, "23:59") : clamped.end;
    this.start = start;
    this.end = end;
    this._pendingStart = null;
    this._focusISO = clamped.start;
    this._hoverISO = null;
    this.emit("z-change", { start, end });
    // emit 后宿主可能已 close()（IKRAOS），_closePanel 自己判 open，重复调用安全
    this._closePanel();
  }

  /** 这台控件要不要时间（`precision="minute"`）。 */
  private get _timed(): boolean {
    return this.precision === "minute";
  }

  private _cellHTML(cell: CalendarCell, today: ISOString): string {
    const { iso, day, inMonth } = cell;
    const rangeMode = this.mode === "range";
    const cls = ["z-datepicker__cell"];
    const disabled = !inMonth || !isISOInRange(iso, this.min, this.max);
    if (!inMonth) cls.push("z-datepicker__cell--out");
    else if (!isISOInRange(iso, this.min, this.max)) cls.push("z-datepicker__cell--disabled");
    if (iso === today) cls.push("z-datepicker__cell--today");

    let ariaSelected = "false";
    if (rangeMode) {
      // 端点的比较一律取**日期部分**：到分时 `end` 是 `2026-08-29T23:59`，
      // 直接与格子（`2026-08-29`）比永远不等 ⇒ 选了却不亮，看着像没选中。
      if (this.start && iso === dayOf(this.start)) {
        cls.push("z-datepicker__cell--range-start");
        ariaSelected = "true";
      }
      if (this.end && iso === dayOf(this.end)) {
        cls.push("z-datepicker__cell--range-end");
        ariaSelected = "true";
      }
      const inCommitted =
        !!(this.start && this.end && compareISO(iso, dayOf(this.start)) > 0 && compareISO(iso, dayOf(this.end)) < 0);
      // [WHY] 预览区间含两端（>= / <=）：只取严格内部时，鼠标停住的那一格没有 --range-in，
      // 会退回默认的 :hover 灰底，看起来像「选区的终点是个缺口」。
      // 起点本身已被 solid 端点覆盖，多带一个类不会变色（样式声明顺序见 CSS）。
      const inHover =
        !!(this._pendingStart && this._hoverISO && compareISO(iso, this._pendingStart) >= 0 && compareISO(iso, this._hoverISO) <= 0);
      if (inCommitted || inHover) cls.push("z-datepicker__cell--range-in");
    } else {
      if (this.value && iso === dayOf(this.value)) {
        cls.push("z-datepicker__cell--selected");
        ariaSelected = "true";
      }
    }

    const isFocus = iso === this._focusISO;
    if (isFocus) cls.push("z-datepicker__cell--focus");
    return html`<td
      class="${cls.join(" ")}"
      role="gridcell"
      data-iso="${iso}"
      tabindex="${isFocus ? 0 : -1}"
      aria-selected="${ariaSelected}"
      aria-disabled="${ariaBool(disabled)}"
      ${iso === today ? 'aria-current="date"' : ""}
      part="cell"
    >${day}</td>`;
  }

  private _onPanelClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    // 快捷区间先判：它在头区上方，不是日历格；落在后面的 `[data-iso]` 分支会直接 return
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
    // 「确定」：时间已经提交过了（改一次发一次），这里只负责收尾 ——
    // 到分时选完日期**不关**面板（还要填时间），于是必须有一个「我填完了」的出口，
    // 否则用户只能点面板外面，而他会怀疑「这样算不算选上了」。
    if (target.closest("[data-time-done]")) {
      e.preventDefault();
      this._commitTime();
      this._closePanel();
      return;
    }
    // 时间框是 `<input>`，点它不该冒泡到「选日期」
    if (target.closest("[data-time-part]")) return;
    const cell = target.closest<HTMLElement>("[data-iso]");
    if (!cell) return;
    const iso = cell.dataset.iso!;
    // [WHY 2026-11-06 跨月选择] 面板一次只画一个月，上/下月的补格是 `--out`（灰字）。
    // 原先这些格子点了直接 return —— 用户想「10-30 选到 11-03」时点了灰格毫无反应，
    // 只会得出「这个控件不能跨月」。改为：翻到该格所属月份再选中，与点亮格同一条路径。
    // min/max 之外的格子仍然不可选（那是真的非法值，不是导航问题）；注意 `--out` 格在
    // `_cellHTML` 里**不做** disabled 标记，合法性只能在这里判。
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
      // [★ 值没变也要发 z-change 2026-11-05] 用户**明确点了**某一天，就是一次意图表达，
      // 不能因为「跟当前值一样」就静默吞掉。
      //
      // 症状（「配送日未发货」页实测）：脚本 `default=today+1d` 让日历上高亮的是明天，
      // 而首屏那次查询因为默认值没下推拿到的是全量。用户去点日历上那个已经高亮的日期，
      // 期望「按这一天重查」，结果 `value === iso` ⇒ 一个事件都不发 ⇒ 页面纹丝不动，
      // 看起来就是「日历坏了」。不报错、不打日志，只有当事人知道点了。
      //
      // 代价：宿主会收到一次「值没变」的通知。那是它自己该做的幂等（页面层有 60s 查询缓存
      // 与同批合并，重复请求不会真的打到数据库）。
      const next = this._timed
        ? composeDateTime(iso, this._timeOf(this.value, this._pendingTime, "00:00"))
        : iso;
      if (this.value !== next) this.value = next;
      this.emit("z-change", { value: next });
      // 到分时选完日期**不关面板**：用户还要填时间。关了的话他就得重新点开日历，
      // 而这时「时间填在哪」变成一个要去猜的问题（很多人会以为它在外面的筛选栏上）。
      if (!this._timed) {
        this._closePanel();
        return;
      }
      this._repaintPanel();
      this._focusCell();
      return;
    }
    // range 状态机：空/已完成后重新起头；iso >= start 完成区间；否则重置 start
    if (!this.start || this.end) {
      this.start = this._timed ? composeDateTime(iso, this._timeOf("", this._pendingTime, "00:00")) : iso;
      this.end = "";
      this._pendingStart = iso;
      this._repaintPanel();
    } else if (compareISO(iso, dayOf(this.start)) >= 0) {
      this.end = this._timed ? composeDateTime(iso, this._timeOf("", this._pendingTimeEnd, "23:59")) : iso;
      this._pendingStart = null;
      // 区间到分时**不关面板**：起点的时间可能还没填（用户是先点两头再填时间）
      this.emit("z-change", { start: this.start, end: this.end });
      // [WHY] emit 后宿主可能已 close()，面板为 null —— 见 _repaintPanel（IKRAOS）
      this._repaintPanel();
    } else {
      this.start = this._timed ? composeDateTime(iso, this._timeOf("", this._pendingTime, "00:00")) : iso;
      this._pendingStart = iso;
      this._repaintPanel();
    }
    this._focusCell();
  }

  /**
   * 时间输入变化（失焦 / 回车）。
   *
   * [WHY 用 `change` 不用 `input`] 边打边提交会把中间的「2」当成 02:00 发出去一次查询，
   * 而用户正要打「23」。筛选是**改一项发一次**的链路，那一次查询会真的打到后端。
   */
  private _onPanelChange = (e: Event): void => {
    const el = (e.target as HTMLElement | null)?.closest?.("[data-time-part]");
    if (!el) return;
    this._commitTime();
  };

  /**
   * 读时间框、写回值、发事件。
   *
   * 三条口径：
   *   ① **非法值不写入**（`25` / 空）—— 只标红。写一个非法值进去，它会被当成参数下推，
   *      后端把不认识的值当没写 ⇒ 查询静默退回全量；
   *   ② **没有日期时只暂存**：时间单独存在没有意义，等选了日期才拼成一个值；
   *   ③ **提交后不重画面板**：重画会重建输入框，用户正在里面打字，焦点与光标一起丢。
   *      快照同步一次即可（见 `_lastPanelProps` 那行的注释）。
   */
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
      // 区间还没两端齐：只暂存。发一个半截区间出去，宿主会按「起点到无」查一次 ——
      // 结果是对的，但用户还没选完，那一轮查询纯属浪费。
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

    const t = read("value");
    if (t === null) return;
    this._pendingTime = t;
    if (!dayOf(this.value)) return;
    const next = composeDateTime(dayOf(this.value), t);
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
    if (target.getFullYear() !== this._viewYear || target.getMonth() !== this._viewMonth) {
      this._viewYear = target.getFullYear();
      this._viewMonth = target.getMonth();
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
    // [WHY 2026-11-06] 面板可能已关闭（外部 close / 宿主重绘），`_floating.panel!` 在这时是
    // `null.innerHTML` 的 TypeError —— 翻月一次抛一次，整块面板白。改走 `_repaintPanel`
    // （内部判空），焦点相关操作再各自守卫。
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
    this._repaintPanel(); // 同 _navMonth：面板可能已关闭，非空断言会抛 TypeError
    this._focusCell();
  }
}

defineElement("z-datepicker", ZDatepicker);
