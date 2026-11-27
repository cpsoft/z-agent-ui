// <z-select> 下拉选择：searchable 带搜索、multiple 多选、clearable 清空，开、合、变更、搜索各发事件。
import { DROPDOWN_CSS } from "./dropdown-css.js";
import { COPY, BaseElement, html, property, t, injectGlobalStyles, escapeHtml, escapeAttr, controlHeight, type ControlSize, defineElement } from "../../core/index.js";
import { FloatingPanelController, FocusTrap, listIntent, resolveIndex } from "../../primitives/index.js";
import type { ZOption } from "../option/Option.js";
import selectCSS from "./select.css?raw";

export interface ZSelectOptionSpec {
  value: string;
  label: string;
  disabled?: boolean;
}

export type ZSelectSearchMode = "frontend" | "backend";

const REMOTE_SEARCH_DELAY = 300;

function injectDropdownStyles(): void {
  injectGlobalStyles("z-select", DROPDOWN_CSS);
}

/**
 * 组件默认占位文案。
 *
 * [WHY 单独提出来] 多选的空态要在三层里挑文案：作者写的 → 空值选项的文案 → 这个默认值。
 * 而 `this.placeholder` **永远有值**（默认就是它），直接判真假区分不出「作者写了」和
 * 「用了默认」—— 判不出来就只能让空值选项永远被英文 "Select..." 盖掉。
 */
const DEFAULT_PLACEHOLDER = "Select...";

/** 实例 id 前缀的自增源（同页多个下拉时 activedescendant 不能互相指错）。 */
let SELECT_SEQ = 0;

export class ZSelect extends BaseElement {
  static styles = selectCSS;

  // 控件高度档位（xs 24 / sm 28 / md 32 / lg 36，随密度缩放）。默认 sm = 既有高度。
  @property({ type: String }) size: ControlSize = "sm";

  protected willUpdate(): void {
    // 见 core/controlSize.ts 的边界说明：size 只改高度，密度改的是令牌本身，局部永远赢。
    this.style.setProperty("--_h", controlHeight(this.size));
  }
  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = DEFAULT_PLACEHOLDER;
  @property({ type: Boolean }) disabled = false;
  // [WHY] 合法/非法是语义，由 z-form-item 写入；控件负责落到自己的可聚焦件（trigger）上。
  // 挂在 host 上读屏读不到 —— host 没有角色，也没有 tabindex。
  @property({ type: Boolean }) invalid = false;
  @property({ type: Boolean }) open = false;
  @property({ type: String }) name = "";
  @property({ type: Boolean }) searchable = false;
  @property({ type: String, attribute: "search-mode" }) searchMode: ZSelectSearchMode = "frontend";
  @property({ type: String, attribute: "search-placeholder" }) searchPlaceholder = "Search...";
  @property({ type: Boolean }) loading = false;
  // 多选：value 仍是逗号串（空串 = 未选）；事件 detail 带 { values, value }。
  // [WHY 不改 value 类型] 宿主普遍按字符串绑（表单序列化 / URL 参数）；改数组会让所有
  // 既有调用点类型改一遍。逗号串 + values 附件是纯增量。
  @property({ type: Boolean }) multiple = false;
  /**
   * 有值时是否显示整框「清除」钮。
   *
   * [WHY 缺省 false] 这是纯增量能力：存量调用方（表单里的普通下拉）外观一个字都不变。
   * 筛选场景由渲染层显式打开 —— 那里的「能选不能退」是真问题，下拉本体的默认值不该跟着变。
   */
  @property({ type: Boolean }) clearable = false;
  /**
   * 多选「先勾选、点确定才提交」。
   *
   * [WHY 需要这个开关 2026-11-02] 筛选栏里的多选是**取数触发器**：每勾一项就发一次
   * `z-change`，宿主立刻发一次查询并整页重渲染。勾 5 项 = 5 次查询，中途还会看到半成品
   * 结果（只筛了第一项）—— 而且大表查询本身要几百毫秒，用户勾到第三项时第一项的响应才回来，
   * 界面在几批数据之间来回跳。筛选场景要的是「选完再查」，这也是主流后台（Ant Design Pro /
   * Fusion / SAP Fiori）的形态：下拉里勾，底部「重置 / 确定」。
   *
   * [WHY 做成 opt-in 而不是改多选的默认行为] 表单里的多选没有「提交」这一步，勾了就该有值。
   * 若默认暂存，表单会**静默丢勾选**（用户以为选了，提交却是空）—— 那是比多几次查询严重得多
   * 的问题。所以只在筛选渲染层显式打开（`render.ts` 的 multi 控件）。
   *
   * 关闭面板（点外部 / Esc / Tab）= 丢弃草稿、不发事件，即「没点确定就不生效」。
   * 代价是勾完忘了点确定会白选一次，用面板底部的「已选 N 项」提示。
   */
  @property({ type: Boolean, attribute: "commit-on-confirm" }) commitOnConfirm = false;
  /**
   * 多选标签最多展开几个，其余折叠成 `+N`；`0` = 不折叠。
   *
   * [WHY 缺省是 2 而不是 3] 筛选栏一格定宽 168px（`--zpg-filter` 的窄档），三个中文标签
   * 会被压成单字（实测「原料」只剩「原」）。2 个标签 + `+N` 是这个宽度下的实际上限；
   * 宽容器要更多就显式写 `max-tags=`。
   */
  @property({ type: Number, attribute: "max-tags" }) maxTags = 2;
  // 后端搜索回调（property 而非 attribute）：返回 OptionSpec[] 或 Promise<OptionSpec[]> 时自动重建 z-option
  remoteMethod: ((query: string) => void | ZSelectOptionSpec[] | Promise<ZSelectOptionSpec[]>) | null = null;

  // [WHY] 浮层面板生命周期（创建/定位/外部关闭/隐藏动画）委托给公共控制器
  private _floating = new FloatingPanelController(this);
  private _focusTrap: FocusTrap | null = null;
  private _activeIndex = -1;
  private _query = "";
  /**
   * 暂存中的多选值（只在 `commit-on-confirm` 下非 null）。
   *
   * 与 `value` 分开是为了让「面板里勾了什么」与「控件对外是什么」互不干扰：
   * 勾选期间 `value` 一个字都不变（所以 trigger 上的标签、宿主的取数都不会动），
   * 只有点「确定」才把草稿一次性写成 `value` 并发一次 `z-change`。
   */
  /**
   * 本实例的 id 前缀。
   *
   * [WHY 需要它] 选项要有 id 才能被 `aria-activedescendant` 指到，而同一个页面里
   * 筛选行常常并排三个 `z-select` —— id 不带实例前缀就会互相指错，读屏念的是隔壁下拉的选项。
   */
  private _uid = `z-select-${++SELECT_SEQ}`;
  private _draft: string[] | null = null;
  private _searchTimer: number | null = null;
  private _optionsObserver: MutationObserver | null = null;

  render(): string {
    // [WHY] html() 不剥离 ? 前缀，`?disabled` 会渲染成字面量属性（潜伏 bug，2026-08-06 修复）
    // See: wiki/planning/TASKS/W4-datepicker/findings.md
    const selected = this._getSelectedOption();
    const values = this._selectedValues();
    // 多选的空态文案：**作者显式写的 placeholder 优先**，没写才退回空值选项的文案。
    // [WHY 顺序不能反] 渲染层总会塞一个 `value=""` 的「全部」项当全清入口，它的文案是
    // 通用词「全部」。若让它优先，脚本里 `placeholder="全部分类"` 永远不出现 ——
    // 同一个筛选行里文本框显示「物料名称」、下拉却显示「全部」，看起来像两个作者写的。
    const emptyLabel = this._optionByValue("")?.label ?? "";
    const filled = this.multiple ? values.length > 0 : !!selected;

    // 整框清除钮：只在「单选 + 有值 + clearable」时出现。
    // [WHY 多选不放这里] 168px 的筛选格里「标签× × 标签× × 整框×」三个叉挨在一起，
    // 点错就是把筛选整个清掉；而且它还挤掉了折叠的「+N」。多选的全清入口放在下拉里的
    // 「全部」项（点它 = 清空已选），那里空间不受限、也不会误触。
    const clear =
      this.clearable && filled && !this.disabled && !this.multiple
        ? `<span class="z-select__clear" part="clear" role="button" tabindex="-1" aria-label="${COPY.clear}">` +
          `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">` +
          `<path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>`
        : "";

    // 多选走标签列表（每个标签自带 ×），单选仍是单行文案
    const body = this.multiple
      ? values.length
        ? `<span class="z-select__tags" part="value">${this._renderTags(values)}</span>`
        : `<span class="z-select__value z-select__placeholder" part="value">${escapeHtml(
            this._authoredPlaceholder() || emptyLabel || this.placeholder,
          )}</span>`
      : `<span class="z-select__value${selected ? "" : " z-select__placeholder"}" part="value">${escapeHtml(
          String(selected ? selected.label : this.placeholder),
        )}</span>`;

    // 单选整框放不下时悬停看全文；多选的完整清单挂在标签的 title 上（见 _renderTags）
    // [WHY] 选项文案来自数据源，进属性必须 escapeAttr —— `"` 未转义可闭合 title 注入新属性
    const titleAttr = !this.multiple && selected ? ` title="${escapeAttr(String(selected.label))}"` : "";

    return html`
      <button
        type="button"
        class="z-select__trigger ${this.open ? "z-select__trigger--open" : ""}${this.multiple ? " z-select__trigger--multi" : ""}"
        ${this.disabled ? "disabled" : ""}
        aria-expanded="${this.open ? "true" : "false"}"
        aria-haspopup="listbox"
        ${this.invalid ? 'aria-invalid="true"' : ""}
        ${titleAttr}
        part="trigger"
        data-focus-key="trigger"
      >
        ${body}${clear}
        <span class="z-select__chevron ${this.open ? "z-select__chevron--open" : ""}" part="chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onTriggerClick);
    this.addEventListener("keydown", this._onTriggerKey);
  }

  disconnectedCallback(): void {
    this._closeDropdown();
    this.removeEventListener("click", this._onTriggerClick);
    this.removeEventListener("keydown", this._onTriggerKey);
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] loading 可能由外部直接赋值（事件流后端搜索），需同步 light-DOM 下拉里的加载行
    // See: wiki/planning/TASKS/2026-08-10-select-search/task_plan.md
    if (this._floating.panel) this._renderOptionList();
  }

  private _getOptions(): ZOption[] {
    return Array.from(this.querySelectorAll<ZOption>("z-option"));
  }

  private _getSelectedOption(): ZOption | undefined {
    // [WHY 空值不算「已选中」] 筛选控件由渲染层额外插一个 `value=""` 的空值项（点它 = 清空）。
    // 若把这一项算成已选中，控件就永远显示它的文案（页面文案里是「—」）：
    // 作者写的 `placeholder="全部分类"` 一辈子不出现，空状态下还挂着一个清除叉
    // —— 用户看到「—」既不知道是什么，也读不出「还没筛」。
    // 表单里的普通下拉本来就不写 `value=""` 的选项，缺省值是空串时更该显示 placeholder。
    if (!this.value) return undefined;
    return this._getOptions().find(o => o.value === this.value && !o.disabled);
  }

  /** 多选当前值。非多选返回 []（多选分支不参与单选逻辑）。 */
  private _selectedValues(): string[] {
    if (!this.multiple || !this.value) return [];
    return this.value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /** 是否处于「暂存 + 确认」模式（只有多选才有意义）。 */
  private _staging(): boolean {
    return this.multiple && this.commitOnConfirm;
  }

  /**
   * 面板里该显示成「已勾选」的一组值。
   *
   * 暂存模式下取草稿、否则取已提交值 —— 渲染勾选态与计数都走这一个入口，
   * 免得某一处忘了切档（症状是「勾了看不到勾」或「没确定却已经显示为选中」）。
   */
  private _draftValues(): string[] {
    return this._draft ?? this._selectedValues();
  }

  /**
   * 多选标签列表：每个已选值一个标签，标签自带 ×。
   *
   * [WHY 从「已选 N 项」改成标签] 折叠成计数之后，取消某一项只能重新打开下拉、在长列表里
   * 找回那一行再点一次 —— 「当前筛了什么」和「怎么去掉它」被拆到两个坐标上。标签把它们合回一处。
   * 超过 `maxTags` 折叠成 `+N`：筛选栏一格约 168px，三个中文标签就撑破。
   *
   * 选项文案来自数据源，进属性一律 `escapeAttr` / `escapeHtml`（`"` 不转义可闭合 title 注入）。
   */
  private _renderTags(values: string[]): string {
    // maxTags<=0 时 limit = 全量，slice 全取，不需要额外分支
    const limit = this.maxTags > 0 ? this.maxTags : values.length;
    const shown = values.slice(0, limit);
    const rest = values.length - shown.length;
    const tags = shown.map((v) => {
      const text = this._optionByValue(v)?.label ?? v;
      // [WHY × 用 span 不用 button] trigger 本身就是 <button>，内层再放 <button> 是非法嵌套，
      // 浏览器解析时会把内层拆到外面 —— 表现为标签与叉错位、甚至只剩一个孤立的叉。
      return (
        `<span class="z-select__tag" title="${escapeAttr(text)}">` +
        `<span class="z-select__tag-label">${escapeHtml(text)}</span>` +
        `<span class="z-select__tag-x" role="button" tabindex="-1" data-value="${escapeAttr(v)}"` +
        ` aria-label="${escapeAttr(t("removeItem", { label: text }))}">` +
        `<svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">` +
        `<path d="M1.6 1.6l4.8 4.8M6.4 1.6L1.6 6.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>` +
        `</span></span>`
      );
    });
    if (rest > 0) {
      // 折叠起来的那几项必须在悬停里看得见：给一个「+2」却不说 + 的是谁，
      // 用户只能靠再打开下拉去数
      const hidden = values.slice(limit).map((v) => this._optionByValue(v)?.label ?? v);
      tags.push(
        `<span class="z-select__tag z-select__tag--more" title="${escapeAttr(hidden.join("、"))}">+${rest}</span>`,
      );
    }
    return tags.join("");
  }

  private _optionByValue(v: string): ZOption | undefined {
    return this._getOptions().find((o) => o.value === v);
  }

  /** 作者显式写的占位文案（没写 = 空串，与组件默认值区分开）。 */
  private _authoredPlaceholder(): string {
    return this.placeholder === DEFAULT_PLACEHOLDER ? "" : this.placeholder;
  }

  private _getFilteredOptions(): ZOption[] {
    const options = this._getOptions();
    if (!this.searchable || !this._query) return options;
    const q = this._query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q));
  }

  private _onTriggerClick = (e: Event): void => {
    if (this.disabled) return;
    // [WHY 先判标签上的 × / 清除钮] click 监听取在 host 上，点「×」也会冒泡到这里。
    // 直接 toggle 的后果是一次点击既删了值、又把下拉弹开（或反过来把已经开着的关掉）。
    // composedPath 而不是 target：标签在 shadow 内，而宿主可能在别的 shadow 里包一层。
    const origin = (e.composedPath?.()[0] ?? e.target) as HTMLElement | null;
    const tagX = origin?.closest?.(".z-select__tag-x") as HTMLElement | null;
    if (tagX) {
      this._removeValue(tagX.getAttribute("data-value") ?? "");
      return;
    }
    if (origin?.closest?.(".z-select__clear")) {
      this._clearValue();
      return;
    }
    this.open ? this._closeDropdown() : this._openDropdown();
  };

  /**
   * 多选去掉一项（标签 ×）。
   *
   * 值与 `_selectOption` 同一条出口（逗号串 + `z-change`），否则「从标签删」和
   * 「从下拉取消勾选」会走出两种状态。面板开着时要同步勾选态：标签没了、下拉里还打着勾，
   * 用户会以为没删掉。
   */
  private _removeValue(value: string): void {
    const next = this._selectedValues().filter((v) => v !== value);
    if (next.length === this._selectedValues().length) return;
    this.value = next.join(",");
    // 标签 × 是**对已提交值的直接操作**（不经过确定），草稿跟着走一遍，
    // 否则面板里那一项还打着勾，而 trigger 上已经没有它了。
    if (this._staging()) this._draft = next.slice();
    if (this.open) this._renderOptionList();
    this.emit("z-change", { values: next.slice(), value: this.value });
  }

  /**
   * 整框清除。空串 = 不限，与点「value='' 的空值选项」同义。
   *
   * [WHY 也发 `z-change` 而不是单独的 `z-clear`] 消费方（PageView）已经按「值变化」处理
   * 取数与重渲染；再造一个事件就多一条必须被同时监听的路径，漏一个就是「清空后不重新取数」。
   */
  private _clearValue(): void {
    if (!this.value) return;
    this.value = "";
    if (this._staging()) this._draft = [];
    if (this.open) this._renderOptionList();
    this.emit("z-change", this.multiple ? { values: [], value: "" } : { value: "" });
  }

  private _onTriggerKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key === "ArrowDown" || ke.key === "ArrowUp") {
      e.preventDefault();
      if (!this.open) {
        this._openDropdown();
      } else if (this._floating.panel) {
        // [WHY] 打开状态下把方向键委托给下拉，否则焦点停留在 trigger 时键盘导航无响应
        this._onDropdownKey(ke as Event);
      }
    } else if (ke.key === "Enter" && this.open) {
      e.preventDefault();
      this._onDropdownKey(ke as Event);
    } else if (ke.key === "Escape") {
      // [WHY 拦住冒泡 2026-11-05] Esc 的语义是「逐层退出」：下拉开着时这一下只该收起下拉。
      // 不拦的话事件会继续冒到 window，外层（页面编辑器的 Esc = 回到上一级）也执行一遍 ——
      // 表现是「下拉收起了，同时选中的控件被取消选中、整块属性面板换成上一层的」。
      // See: wiki/bugs/20261105-bind-field-select-blur.md
      e.stopPropagation();
      this._closeDropdown();
    } else if (ke.key === "Delete" && !this.open) {
      // [WHY 需要这条] 整框清除钮是 `tabindex="-1"` 的（trigger 本身已经是停靠点，
      // 再塞一个进去，用户想 Tab 过这个筛选格要按两次）。代价是**键盘用户没有清空路径** ——
      // 下拉的值不是能选中删掉的文本。`Delete` 在原生多选 select 与各类选择控件里
      // 就是「删掉这个值」。
      if (this.multiple || !this.clearable || !this.value) return;
      e.preventDefault();
      this._clearValue();
    } else if (ke.key === "Backspace" && this.multiple && !this.open) {
      // 多选：退掉最后一个标签。标签上的 × 同样是 `tabindex="-1"`（一个标签一个停靠点
      // 太贵），而 `Backspace` 删末项是标签输入框的通行约定（邮件收件人、GitHub 标签）。
      // [WHY 取值的末项而不是「最后一个可见标签」] 顺序以值为准；`maxTags` 折叠时
      // 反馈是 `+N` 少一，虽然弱但方向正确 —— 取可见项的话折叠掉的那几个永远删不掉。
      const values = this._selectedValues();
      if (!values.length) return;
      e.preventDefault();
      this._removeValue(values[values.length - 1]);
    }
  };

  private _openDropdown(): void {
    if (this.open) return;

    injectDropdownStyles();
    this._query = "";
    this._clearSearchTimer();
    this.loading = false;

    // Position relative to trigger
    // [WHY] anchor 必须用 getter：open=true 触发 BaseElement 重渲染替换 shadow 内的 trigger，
    // 持旧引用会让滚动时 _update 读到脱离元素的全 0 矩形，下拉跳到视口左上角（2026-09-10）
    // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
    const trigger = this.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;
    const dd = this._floating.open(
      {
        panelClass: "z-select__dropdown",
        hidingClass: "z-select__dropdown--hiding",
        part: "dropdown",
        // [WHY 不在这层给 listbox] 面板里本来就有一个 `.z-select__options[role=listbox]`，
        // 两层都标 listbox 会得到「listbox 套 listbox」，读屏进去要报两次。
        role: null,
        tabIndex: false,
        anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-select__trigger"),
        onOutsideClose: () => this._closeDropdown(),
      },
      (panel) => {
        // [WHY input 才是 combobox、trigger 不是] 可搜索模式下焦点在面板里的 input 上，
        // 而它才是「用户往里打字、列表跟着过滤」的那个东西。combobox 角色必须落在**持有
        // 焦点**的元素上，否则它的 aria-expanded / aria-activedescendant 全是空转。
        // 同时 input 在 body 这边、选项也在 body 这边 —— 同一棵树，IDREF 能解析（这是
        // 非搜索模式做不到的，见 _updateActive 的说明）。
        const searchHTML = this.searchable
          ? html`<input type="text" class="z-select__search" part="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${this._uid}-listbox" placeholder="${escapeAttr(this.searchPlaceholder)}" aria-label="${escapeAttr(this.searchPlaceholder)}" autocomplete="off" />`
          : "";
        // 暂存模式的底部操作条：左侧计数（唯一能看出「已勾几项、还没提交」的地方），
        // 右侧「清空 / 确定」。放在 `.z-select__options` **外面**：那个容器每次勾选都整体
        // 重写 innerHTML，放在里面会被一起冲掉。
        const footerHTML = this._staging()
          ? `<div class="z-select__footer" part="footer">` +
            `<span class="z-select__count" part="count"></span>` +
            `<span class="z-select__footer-actions">` +
            `<button type="button" class="z-select__btn" data-act="reset">${escapeHtml(t("clearAll"))}</button>` +
            `<button type="button" class="z-select__btn z-select__btn--primary" data-act="confirm">${escapeHtml(t("confirm"))}</button>` +
            `</span></div>`
          : "";
        // listbox 自身 `tabindex="-1"`：非搜索模式下焦点要落在它身上（见 _updateActive）。
        // -1 而不是 0 —— 它不该出现在 Tab 序列里，展开才进来、关闭就回触发器。
        //
        // [WHY aria-label 要条件写] 焦点进列表后读屏先念「列表框，<名字>」。没名字时它只念
        // 「列表框」，用户不知道这是哪个字段的列表（筛选行里常并排三个）。名字取占位符
        // ——那是作者对「这里选什么」唯一的表述。空值不写：`aria-label=""` 在 ARIA 里是
        // 一个空名字，比没有更糟，而且 a11y 守卫会把空 aria 值判红。
        const listName = this._authoredPlaceholder() || this.placeholder;
        const listLabel = listName ? ` aria-label="${escapeAttr(listName)}"` : "";
        panel.innerHTML = `${searchHTML}<div class="z-select__options" role="listbox" id="${this._uid}-listbox" tabindex="-1"${listLabel}></div>${footerHTML}`;
      },
    );

    // Click handler on options
    dd.addEventListener("click", (e) => {
      // 底部按钮优先：它是 `.z-select__option` 的兄弟节点，混进下面的分支会被当成选项
      const act = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
      if (act) {
        if (act.dataset.act === "confirm") this._commitDraft();
        else if (act.dataset.act === "reset") this._resetDraft();
        return;
      }
      const opt = (e.target as HTMLElement).closest<HTMLElement>(".z-select__option");
      if (!opt) return;
      const val = opt.dataset.value;
      if (val !== undefined && !opt.classList.contains("z-select__option--disabled")) {
        this._selectOption(val);
      }
    });

    // Hover tracking for keyboard nav
    dd.addEventListener("mouseover", (e) => {
      const opt = (e.target as HTMLElement).closest<HTMLElement>(".z-select__option");
      if (opt) {
        this._setActiveByElement(opt);
      }
    });

    dd.querySelector(".z-select__search")?.addEventListener("input", this._onSearchInput);

    // Sync width
    const triggerRect = trigger.getBoundingClientRect();
    // 暂存模式的下拉里多了「已选 N 项 + 清空 + 确定」一行，按 trigger 宽度铺开会把三个
    // 元素挤成两行（筛选栏一格只有 168px）—— 给一个下限，宽容器不受影响。
    dd.style.minWidth = `${this._staging() ? Math.max(triggerRect.width, 240) : triggerRect.width}px`;

    // Focus trap
    this._focusTrap = new FocusTrap({ container: dd });

    this.open = true;
    // 草稿从**已提交值**起步：上一次没点确定就关掉的那批勾选必须丢掉，
    // 否则「取消」会变成「悄悄保留」，下次打开看到一堆没生效的勾。
    if (this._staging()) this._draft = this._selectedValues();
    this._activeIndex = this._getOptions().findIndex(o => o.value === this.value && !o.disabled);
    this._renderOptionList();
    // [WHY 填完选项必须重定位 2026-10-30] 面板是在**空列表**状态下建好并定位的，上面的
    // `_renderOptionList()` 之后高度才变成真实值（4 项 = 130px）。不重定位就沿用按 0 高度
    // 算出的坐标 —— 锚点在视口下半部时底边直接越出视口（实测 top 890 / 视口 900 / 高 130）。
    // `FloatingPosition` 的 ResizeObserver 也会补一次，但那是下一帧：这一行是消除首帧错位。
    this._floating.reposition();
    this._observeOptions();

    // Keyboard nav
    dd.addEventListener("keydown", this._onDropdownKey);

    // [WHY 非搜索模式要把焦点搬进列表] 这是 `aria-activedescendant` 能不能生效的**唯一**
    // 前提：它是个 IDREF，只在**同一棵树**里解析。触发器在 `z-select` 的 shadow 里，
    // 而面板挂在 `document.body` —— 把 activedescendant 写在触发器上，DOM 里查得到、
    // AX 树里根本不出现（2026-11-15 用 CDP 无障碍树实测），读屏全程不吭声。
    //
    // 所以这里改走 ARIA 的另一种标准用法：触发器是「按钮 + aria-haspopup=listbox」，
    // 展开后焦点进入 listbox，由 listbox 自己承载 activedescendant（同树 ⇒ 生效）。
    // 可搜索模式不用搬 —— 它的焦点本来就在面板里的 input 上（FocusTrap 已送进去），
    // 那个 input 才是 combobox，同样同树。
    if (!this.searchable) {
      this._floating.panel?.querySelector<HTMLElement>(".z-select__options")?.focus();
      // 焦点进去之后补写一次：浏览器的读屏适配层在 focus 那一刻读取该属性，
      // 早于这次 focus 写的值在某些实现里不会重新播报。
      this._updateActive();
    }

    this.emit("z-select-open");
  }

  private _closeDropdown(): void {
    if (!this.open) return;

    this._clearSearchTimer();
    this._optionsObserver?.disconnect();
    this._optionsObserver = null;

    this._focusTrap?.destroy();
    this._focusTrap = null;
    this._floating.panel?.removeEventListener("keydown", this._onDropdownKey);
    // [WHY] 控制器负责定位销毁/外部监听解绑/hiding 动画与面板移除
    this._floating.close();

    this.open = false;
    this._activeIndex = -1;
    // 关闭 = 丢弃草稿（未点「确定」的勾选不生效）。放在这里而不是各调用点：
    // 点外部 / Esc / Tab / 提交后关闭都走同一条出口，漏一处就会残留上一轮的勾选。
    this._draft = null;

    // Focus back to trigger
    const trigger = this.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;
    trigger?.focus();

    this.emit("z-select-close");
  }

  private _selectOption(value: string): void {
    // [暂存模式] 勾选只改草稿：`value` 不动、不发事件，宿主因此不会取数。
    // 这是「选完再查」的全部实现 —— 每次点击都发 `z-change` 的话，勾 5 项就是 5 次查询，
    // 而用户此时连筛选条件都还没输完。
    if (this._staging()) {
      const draft = this._draft ?? this._selectedValues();
      if (value === "") {
        draft.length = 0;
      } else {
        const i = draft.indexOf(value);
        if (i >= 0) draft.splice(i, 1);
        else draft.push(value);
      }
      this._draft = draft;
      this._renderOptionList();
      return;
    }
    // [多选] 点选项 = 切换勾选，面板不关；点 value="" 的空值选项 = 清空全部。
    // [WHY 不关面板] 多选的典型操作是连续勾几项；关一次就要重开一次。
    if (this.multiple) {
      const values = value === "" ? [] : this._selectedValues();
      if (value !== "") {
        const i = values.indexOf(value);
        if (i >= 0) values.splice(i, 1);
        else values.push(value);
      }
      this.value = values.join(",");
      this._renderOptionList();
      this.emit("z-change", { values: values.slice(), value: this.value });
      return;
    }
    if (this.value === value) {
      this._closeDropdown();
      return;
    }
    this.value = value;
    this._closeDropdown();
    this.emit("z-change", { value });
  }

  /**
   * 提交草稿（暂存模式的「确定」）。
   *
   * 顺序是**先关面板、再改值、最后发事件**：宿主收到 `z-change` 会重渲染整个筛选栏，
   * 这个元素（连同浮层）可能在事件处理里被摘掉 —— 那时再去拆面板就是对已脱离文档的节点
   * 做操作，轻则报错重则浮层残留。先把自己收拾干净再交出去。
   *
   * 值没变就不发事件（否则「打开 → 直接点确定」也会触发一次全量查询）。
   */
  private _commitDraft(): void {
    const next = (this._draft ?? []).slice();
    const changed = next.join(",") !== this.value;
    this._closeDropdown();
    if (!changed) return;
    this.value = next.join(",");
    this.emit("z-change", { values: next.slice(), value: this.value });
  }

  /** 草稿清空（暂存模式的「清空」）。只清草稿，仍需点「确定」才生效。 */
  private _resetDraft(): void {
    if (!this._draft?.length) return;
    this._draft = [];
    this._renderOptionList();
  }

  /** 底部计数的文案与「清空」的可用态（打开面板、每次勾选都会刷新）。 */
  private _updateFooter(): void {
    const panel = this._floating.panel;
    if (!panel) return;
    const count = panel.querySelector<HTMLElement>(".z-select__count");
    if (!count) return;
    const n = (this._draft ?? []).length;
    // 计数而不是「已选 N 项」在 0 时的空串：空串会让底部只剩两个右对齐按钮，看起来像缺了一块
    count.textContent = n > 0 ? t("selectedCount", { count: n }) : t("noneSelected");
    const reset = panel.querySelector<HTMLButtonElement>('[data-act="reset"]');
    if (reset) reset.disabled = n === 0;
  }

  private _onSearchInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this._query = input.value;
    if (this.searchMode === "backend") {
      this._scheduleRemoteSearch();
    } else {
      this._renderOptionList();
    }
  };

  private _clearSearchTimer(): void {
    if (this._searchTimer !== null) {
      window.clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }
  }

  private _scheduleRemoteSearch(): void {
    this._clearSearchTimer();
    this._searchTimer = window.setTimeout(() => {
      this._searchTimer = null;
      this._runRemoteSearch();
    }, REMOTE_SEARCH_DELAY);
  }

  private _runRemoteSearch(): void {
    const query = this._query;
    const result = this.remoteMethod ? this.remoteMethod(query) : undefined;

    if (result && typeof (result as Promise<unknown>).then === "function") {
      this.loading = true;
      (result as Promise<ZSelectOptionSpec[]>)
        .then((specs) => {
          // [WHY] 防竞态：下拉已关闭或查询词已变时丢弃过期结果
          if (!this.open || this._query !== query || !Array.isArray(specs)) return;
          this._applyRemoteOptions(specs);
        })
        .catch(() => {
          // remote search 失败时保留现有选项
        })
        .finally(() => {
          if (this.open && this._query === query) this.loading = false;
        });
    }

    this.emit("z-search", { query });
  }

  private _applyRemoteOptions(specs: ZSelectOptionSpec[]): void {
    this._getOptions().forEach(o => o.remove());
    for (const spec of specs) {
      const opt = document.createElement("z-option") as ZOption;
      opt.value = spec.value;
      opt.textContent = spec.label;
      if (spec.disabled) opt.disabled = true;
      this.appendChild(opt);
    }
    this._renderOptionList();
  }

  private _observeOptions(): void {
    if (this._optionsObserver) return;
    this._optionsObserver = new MutationObserver(() => {
      if (this.open) this._renderOptionList();
    });
    this._optionsObserver.observe(this, { childList: true });
  }

  private _renderOptionList(): void {
    if (!this._floating.panel) return;
    const container = this._floating.panel.querySelector<HTMLElement>(".z-select__options");
    if (!container) return;

    if (this.loading) {
      container.innerHTML = html`<div class="z-select__loading" part="loading">Loading...</div>`;
      this._activeIndex = -1;
      this._updateFooter();
      return;
    }

    const options = this._getFilteredOptions();
    container.innerHTML = this._buildOptionsHTML(options);
    // 计数与「清空」的可用态跟着勾选变 —— 它和选项列表同一次刷新，不会有中间态
    this._updateFooter();

    if (options.length === 0) {
      this._activeIndex = -1;
      return;
    }
    if (this._activeIndex < 0 || this._activeIndex >= options.length || options[this._activeIndex].disabled) {
      this._activeIndex = options.findIndex(o => !o.disabled);
    }
    this._updateActive();
  }

  private _buildOptionsHTML(options: ZOption[]): string {
    if (options.length === 0) {
      const msg = this.searchable && this._query ? "No results" : "No options";
      return html`<div class="z-select__empty" part="empty">${msg}</div>`;
    }
    // 勾选态读草稿：暂存模式下 `value` 在点「确定」之前不变，直接读它会让面板里的勾
    // 永远停在打开那一刻的样子（勾了没反应）。
    const values = this._draftValues();
    return options.map((opt, i) => {
      const on = this.multiple ? values.includes(opt.value) : opt.value === this.value;
      const cls = [
        "z-select__option",
        on ? "z-select__option--selected" : "",
        // 多选里选中态降级为中性底：蓝底会被读成"这行是高亮项"，与"已勾选"混淆
        this.multiple && on ? "z-select__option--multi" : "",
        opt.disabled ? "z-select__option--disabled" : "",
        i === this._activeIndex ? "z-select__option--active" : "",
      ].filter(Boolean).join(" ");

      const box = this.multiple
        ? html`<span class="z-select__box ${on ? "z-select__box--on" : ""}" part="box">${on
            ? `<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`
            : ""}</span>`
        : "";

      // [WHY] opt.value / opt.label 来自数据源（常见于服务端下发的字典），
      // 不转义时 `"` 可闭合属性注入事件处理器，`<img onerror>` 可注入标签。
      // 同仓库 data-list / menu / detail-form 早已用 escAttr/esc，此处是漏网（[[bug-20261025-xss-injection]]）
      return html`<div class="${cls}" id="${this._uid}-opt-${i}" data-value="${escapeAttr(String(opt.value))}" role="option" tabindex="-1" aria-selected="${on ? "true" : "false"}" aria-disabled="${opt.disabled ? "true" : "false"}">
        ${box}
        ${escapeHtml(String(opt.label ?? ""))}
        ${!this.multiple && on ? html`<span class="z-select__check" part="check"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></span>` : ""}
      </div>`;
    }).join("");
  }

  private _setActiveByElement(el: HTMLElement): void {
    const items = this._floating.panel?.querySelectorAll<HTMLElement>(".z-select__option");
    if (!items) return;
    const idx = Array.from(items).indexOf(el);
    if (idx >= 0) {
      this._activeIndex = idx;
      this._updateActive();
    }
  }

  /**
   * 面板里「持有键盘焦点、并且能承载 activedescendant」的那个元素。
   *
   * 搜索模式是输入框（combobox），非搜索模式是 listbox 自身。两者都在 body 这棵树里，
   * 与选项同树 —— 这是 IDREF 能解析的前提，不是风格选择。
   */
  private _focusOwner(): HTMLElement | null {
    const panel = this._floating.panel;
    if (!panel) return null;
    return this.searchable
      ? panel.querySelector<HTMLElement>(".z-select__search")
      : panel.querySelector<HTMLElement>(".z-select__options");
  }

  private _updateActive(): void {
    if (!this._floating.panel) return;
    const items = this._floating.panel.querySelectorAll<HTMLElement>(".z-select__option");
    items.forEach((item, i) => {
      item.classList.toggle("z-select__option--active", i === this._activeIndex);
    });
    // ── aria-activedescendant：写在**持有焦点的那个元素**上 ──
    //
    // [WHY 不是写在触发器上] 它是个 IDREF，只在**同一棵树**里解析。触发器在 `z-select`
    // 的 shadow 里、面板挂在 `document.body` —— 写在触发器上时 DOM 查得到但 AX 树里
    // 根本不出现（2026-11-15 CDP 无障碍树实测），读屏全程不吭声，而界面上高亮一格格
    // 跳得完全正常。所以焦点必须和选项在同一棵树：搜索模式是面板里的 input（它就是
    // combobox），非搜索模式是 listbox 自己（打开时被 focus，见 _openDropdown）。
    //
    // 反面参照：`z-menu` 的面板与选项都在 body，同一棵树 ⇒ 写上去就生效。
    const owner = this._focusOwner();
    const active = items[this._activeIndex];
    if (owner) {
      if (active?.id) owner.setAttribute("aria-activedescendant", active.id);
      else owner.removeAttribute("aria-activedescendant");
    }
    active?.scrollIntoView({ block: "nearest" });
  }

  private _onDropdownKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const options = this._getFilteredOptions();

    // ── 一维移动：↑↓ / Home / End 交给 L0 ──
    //
    // [WHY 候选集是**全集**、靠 isDisabled 跳过] 与菜单相反：下拉的 `_activeIndex`
    // 必须落在**过滤后全集**的下标空间里，因为它在三处被同时使用 ——
    // `_buildOptionsHTML` 的 `id` 后缀（`aria-activedescendant` 指的就是它）、
    // 勾选态判断、以及 hover 的 `_setActiveByElement`。先滤掉禁用项再算下标，
    // 这三处就会集体错位一格。
    //
    // [WHY 补上 Home/End] 原来只接 ↑↓。500 项的物料下拉里跳到末尾要按 499 下 ——
    // 而同一份键盘帮助文档里写着菜单支持 Home/End。这两键由 `resolveIndex` 直接给出，
    // 不需要在这里各写一条分支。
    const intent = listIntent(ke.key);
    if (intent) {
      e.preventDefault();
      const idx = resolveIndex(options.length, this._activeIndex, intent, {
        isDisabled: (i) => options[i].disabled,
      });
      if (idx >= 0) {
        this._activeIndex = idx;
        this._updateActive();
      }
      return;
    }

    switch (ke.key) {
      case "Enter": {
        e.preventDefault();
        const active = options[this._activeIndex];
        if (active && !active.disabled) {
          this._selectOption(active.value);
        }
        break;
      }
      case "Escape":
        e.preventDefault();
        // 同 trigger 上的说明：Esc 到下拉为止，别再让外层把它读成「退出上一层」
        e.stopPropagation();
        this._closeDropdown();
        break;
      case "Tab":
        // [WHY 暂存模式不关] 面板底部有「确定」，键盘用户得靠 Tab 走过去。这里一关，
        // 提交入口就只剩鼠标可达 —— 一个控件自己把可访问性做没了。
        if (!this._staging()) this._closeDropdown();
        break;
    }
  };

}

defineElement("z-select", ZSelect);
