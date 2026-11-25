import { COPY, BaseElement, composedContains, deepActiveElement, html, property, escapeAttr } from "../../core/index.js";
import columnSelectorCSS from "./column-selector.css?raw";

// ═══════════════════════════════════════════════════════════
// z-column-selector: 列显隐选择器(独立组件)
// [WHY] 从 z-report-table 工具栏抽出: 不强制固定在表格工具栏内,
// 页面任意位置可摆放, 通过 for="表格id" / target 属性 / 内嵌自动绑定关联表格。
// 内嵌模式(表格 shadow 内渲染)自动绑定宿主, 表格重建 shadow 时实例被重建,
// open 由宿主表格 columnSelectorOpen 镜像经 open 属性 seed, 实例重建不 emit → 无环。
// See: wiki/requirements/REQ-015-column-selector.md
// ═══════════════════════════════════════════════════════════

// [WHY] duck-type 列数据源契约: 组件零 import 反向依赖 z-report-table,
// 仅要求 columns 数组 + toggleColumn 方法, 任何满足契约的宿主表格均可绑定
interface ColumnSource {
  columns: ColumnItem[];
  toggleColumn: (key: string) => void;
}

interface ColumnItem {
  key: string;
  title: string;
  required?: boolean;
  hidden?: boolean;
}

function looksLikeTable(el: unknown): boolean {
  if (!el || typeof el !== "object") return false;
  return (el as { tagName?: string }).tagName === "Z-REPORT-TABLE";
}

/** 下拉容器 id 的自增序号：`aria-controls` 是 IDREF，同一 shadow 里两个选择器
 *  不能撞 id（一个页面完全可以放两个，比如主表 + 明细表）。 */
let COL_SEL_SEQ = 0;

// [WHY] 可用数据源 = 目标元素 + columns 数组 + toggleColumn 方法。
// columns 由宿主在挂载后才赋值的场景(框架/演示)里 target 元素先于 source 就绪,
// 触发器只需 target 元素, 下拉列清单需 source, 两者解耦见 [[REQ-015-column-selector]]
function isUsableSource(el: unknown): boolean {
  if (!looksLikeTable(el)) return false;
  const e = el as { columns?: unknown; toggleColumn?: unknown };
  return Array.isArray(e.columns) && typeof e.toggleColumn === "function";
}

export class ZColumnSelector extends BaseElement {
  static styles = columnSelectorCSS;

  // [WHY] open 为 Boolean 反射(存在即开): 宿主表格经 open 属性 seed 每次重建,
  // 程序赋值/重建开局不 emit, 仅用户操作翻转后 emit z-open/z-close
  @property({ type: Boolean }) open = false;
  // [WHY] i18n: 文案属性化, 见 [[REQ-001]]; 内嵌时宿主表格透传同名属性
  @property({ type: String }) columnsText = COPY.columns;
  @property({ type: String }) requiredColumnText = COPY.requiredField;
  // [WHY 默认纯图标] 带文字的胶囊按钮在表格工具栏里太重（2026-10-26 反馈
  // 「列选择的按钮太大太难看了」）。默认渲染 24px 图标钮，与工具栏同高；
  // 文案仍作为 aria-label + title 存在 —— 可发现性不能靠"猜图标"。
  // 需要文字的老宿主写 `showlabel` 即可复原。
  @property({ type: Boolean }) showLabel = false;
  @property({ type: String }) for = "";
  // [WHY] 编程式直绑: shadow DOM 嵌套场景 document.getElementById 取不到, 用 target 属性
  @property({ attribute: false }) target: Element | null = null;

  private _eventsBound = false;
  /**
   * 刚被勾选的列 key —— 重渲染后要把焦点放回同一个复选框。
   *
   * [WHY 必须自己记、自己恢复] 勾选会调 `source.toggleColumn()`，宿主表格随即
   * `requestUpdate`，本组件也跟着整体重建 shadow（BaseElement 换 innerHTML）——
   * **焦点所在的 `<input>` 被换成新节点，焦点掉到 `<body>`**。
   * 2026-11-16 真机实测：`shadowRoot.activeElement` 由 checkbox 变成 null，
   * `document.activeElement` 变成 BODY。鼠标用户看不出（手还在原位），
   * 键盘用户勾一列就要重新 Tab 回选择器 —— 而「连续勾几列」正是它的主要用法。
   * 作者此前注意到这个现象（`_onDocKeydown` 的注释写了「勾选触发重渲染后 focus
   * 落回 body」），但只把 Escape 改成了 document 级监听，没管焦点本身。
   */
  private _pendingFocusKey: string | null = null;
  /**
   * Escape 关闭后要把焦点交还触发器。
   *
   * [WHY 与 `_pendingFocusKey` 分开] 那个是「勾选后回到同一个复选框」，只在面板
   * **还开着**时有意义；这个是「关掉面板」，面板已经没了，唯一的去处是打开它的按钮。
   * 2026-11-16 实测：焦点停在复选框上按 Escape，`deepActiveElement()` 变成 `body`。
   */
  private _pendingReturnFocus = false;
  private _uid = `z-colsel-${++COL_SEL_SEQ}`;
  private _docBound = false;
  private _retryTimer: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    if (!this._docBound) {
      document.addEventListener("mousedown", this._onDocMouseDown);
      document.addEventListener("keydown", this._onDocKeydown);
      this._docBound = true;
    }
  }

  disconnectedCallback(): void {
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }
    if (this._docBound) {
      document.removeEventListener("mousedown", this._onDocMouseDown);
      document.removeEventListener("keydown", this._onDocKeydown);
      this._docBound = false;
    }
    super.disconnectedCallback();
  }

  // ── 数据源解析: target → for → 内嵌宿主自动绑定 ────────

  // [WHY] 目标元素只校验 tagName: 表格元素先于 columns 赋值存在(演示/框架先
  // appendChild 后设属性), 触发器以目标元素就绪为条件即可先行渲染
  private _targetElement(): Element | null {
    if (this.target && looksLikeTable(this.target)) return this.target;
    if (this.for) {
      const el = document.getElementById(this.for);
      if (el && looksLikeTable(el)) return el;
    }
    return this._findAncestorTable();
  }

  // [WHY] 内嵌自动绑定: 沿 parentNode 上溯, 遇 ShadowRoot 取其 host,
  // 命中的 z-report-table 即宿主(tagName 校验即可, 宿主渲染本组件时 columns 必已就绪)
  private _findAncestorTable(): Element | null {
    let n: Node | null = this.parentNode;
    while (n) {
      if (n instanceof ShadowRoot) {
        const host = n.host;
        if (looksLikeTable(host)) return host;
        n = host.parentNode;
      } else {
        if (looksLikeTable(n)) return n as Element;
        n = n.parentNode;
      }
    }
    return null;
  }

  // [WHY] for 指向的元素尚未进入 DOM 时(选择器先于表格挂载)低频重试解析,
  // 命中即停; 已断开连接或不再声明 for 即不再调度
  private _scheduleSourceRetry(): void {
    if (this._retryTimer) return;
    this._retryTimer = setTimeout(() => {
      this._retryTimer = null;
      if (!this.isConnected || !this.for) return;
      this.requestUpdate();
    }, 250);
  }

  private _getSource(): ColumnSource | null {
    const target = this._targetElement();
    if (target && isUsableSource(target)) return target as unknown as ColumnSource;
    return null;
  }

  // ── User-driven open 翻转: 唯一 emit z-open/z-close 的路径 ──

  private _setOpenByUser(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.emit(open ? "z-column-selector-open" : "z-column-selector-close");
  }

  // [WHY] 外部点击关闭: 不能用 host.contains(e.target), composed 事件 target 被
  // retarget 成外层宿主, contains 恒 false → 误关。composedPath 保留完整路径,
  // 见 [[bug-20260813-report-table-click-outside]]。内嵌模式点宿主表格其它区域
  // 不关(表格内自然交互, 与列选择器原实现语义一致); 外部绑定模式表格本身算外部。
  private _onDocMouseDown = (e: MouseEvent): void => {
    if (!this.open) return;
    const path = e.composedPath() as EventTarget[];
    if (path.includes(this)) return;
    // [WHY] 内嵌语义仅当目标来自祖先链上的宿主表格: 外部绑定时点被绑表格算外部点击
    const host = this._findAncestorTable();
    if (host && path.includes(host as EventTarget)) return;
    this._setOpenByUser(false);
  };

  // [WHY] Escape 在 document 级监听: 勾选触发本组件重渲染后 focus 落回 body
  // (innerHTML 重建移除焦点节点), shadow 级 keydown 收不到 → 下拉无法关闭;
  // 全局监听 + open 守卫与 dropdown 交互习惯一致, 见 smoke-rpt-ikd6l8 Escape 步骤
  private _onDocKeydown = (e: KeyboardEvent): void => {
    if (e.key === "Escape" && this.open) {
      // [WHY 先判「焦点在不在我这儿」] 关闭会整体重建 shadow，焦点所在的复选框被换掉，
      // 焦点掉到 body。Escape 的语义是「退出这个面板」，退出后要回到打开它的按钮；
      // 但焦点本来就在别处时（面板开着、用户跑去点别处）不许把焦点抢过来。
      const inside = this._focusWithin();
      this._setOpenByUser(false);
      if (inside) this._pendingReturnFocus = true;
    }
  };

  /** 焦点是否落在本组件内部（含 shadow 深层）。 */
  private _focusWithin(): boolean {
    return composedContains(this, deepActiveElement());
  }

  // ── Render ─────────────────────────────────────────────

  render(): string {
    const target = this._targetElement();
    // [WHY] 无目标元素不渲染: 未绑定/for 未命中的组件不留无用触发器(绑定方式见文件头注释)
    if (!target) {
      // [WHY] for 已声明但表格元素尚未挂载: 低频重试到命中为止(触发器出现依赖目标元素)
      if (this.for) this._scheduleSourceRetry();
      return "";
    }
    // [WHY] 目标元素已命中即可渲染触发器: 宿主表格 columns 后置赋值(演示/框架
    // 先挂载后设属性)期间触发器保持可见, 下拉项在 source 就绪后随每次渲染刷新
    const source = isUsableSource(target) ? (target as unknown as ColumnSource) : null;
    const ddId = `${this._uid}-dropdown`;
    const items = (source?.columns ?? []).map((col) => html`
      <label class="z-colsel__item ${col.required ? "z-colsel__item--required" : ""}"
             part="column-selector-item"
             ${col.required ? `title="${escapeAttr(this.requiredColumnText)}"` : ""}>
        <input type="checkbox" class="z-colsel__checkbox"
               data-key="${escapeAttr(col.key)}"
               ${!col.hidden || col.required ? "checked" : ""}
               ${col.required ? "disabled" : ""}
               part="column-selector-checkbox" />
        <span class="z-colsel__label">${escapeAttr(col.title)}</span>
        ${col.required
          ? html`<svg class="z-colsel__lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
          : ""}
      </label>
    `).join("");

    return html`
      <div class="z-colsel ${this.open ? "z-colsel--open" : ""} ${this.showLabel ? "z-colsel--label" : ""}" part="column-selector">
        <button type="button" class="z-colsel__trigger" part="column-selector-trigger"
                title="${escapeAttr(this.columnsText)}" aria-label="${escapeAttr(this.columnsText)}"
                aria-expanded="${this.open ? "true" : "false"}"
                aria-controls="${ddId}">
          <!-- [WHY 用"表格分栏"图标而不是竖排三点] 三点图标读作「更多操作」，放在表格右上角
               会让用户以为打开的是行操作菜单。这张是表格 + 竖向分栏，语义直给"列"。 -->
          <svg class="z-colsel__icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>
          ${this.showLabel ? html`<span class="z-colsel__text">${escapeAttr(this.columnsText)}</span>` : ""}
        </button>
        ${this.open
          ? html`<div class="z-colsel__dropdown" part="column-selector-dropdown"
                   id="${ddId}" role="group" aria-label="${escapeAttr(this.columnsText)}">${items}</div>`
          : ""}
      </div>
    `;
  }

  updated(): void {
    this._bindEvents();
    this._restoreFocus();
    this._returnFocusToTrigger();
  }

  /** Escape 关掉面板后把焦点交还触发器。 */
  private _returnFocusToTrigger(): void {
    if (!this._pendingReturnFocus) return;
    this._pendingReturnFocus = false;
    // 期间被重新打开（外部把 open 又设回来）就别抢：面板开着时焦点该在面板里
    if (this.open) return;
    this.shadowRoot?.querySelector<HTMLButtonElement>(".z-colsel__trigger")?.focus();
  }

  /** 把焦点放回刚勾选的那个复选框（按 data-key 找回，不依赖节点引用）。 */
  private _restoreFocus(): void {
    const key = this._pendingFocusKey;
    if (!key) return;
    this._pendingFocusKey = null;
    // 下拉已关（勾选后宿主关掉了它）时不用恢复：焦点本该回触发器
    if (!this.open) return;
    const boxes = this.shadowRoot?.querySelectorAll<HTMLInputElement>(".z-colsel__checkbox");
    for (const cb of Array.from(boxes ?? [])) {
      if (cb.dataset.key === key) {
        cb.focus();
        return;
      }
    }
  }

  // ── Event binding ──────────────────────────────────────

  // [WHY] BaseElement 每次渲染整体替换 shadow innerHTML, 事件一律 shadow 级委托一次绑定,
  // 见 [[web-components-render-pitfalls]]; 实例随宿主重建而新建, 旧实例随之废弃无泄漏
  private _bindEvents(): void {
    if (this._eventsBound) return;
    const shadow = this.shadowRoot as unknown as HTMLElement;
    if (!shadow) return;
    shadow.addEventListener("click", this._onShadowClick as unknown as EventListener);
    shadow.addEventListener("change", this._onShadowChange);
    this._eventsBound = true;
  }

  private _onShadowClick = (e: Event): void => {
    const trigger = (e.target as HTMLElement).closest(".z-colsel__trigger");
    if (!trigger) return;
    // [WHY] 阻止继续冒泡到宿主表格 shadow/页面: 触发器点击由本组件消费
    e.stopPropagation();
    this._setOpenByUser(!this.open);
  };

  private _onShadowChange = (e: Event): void => {
    const cb = e.target as HTMLInputElement;
    if (!cb.classList.contains("z-colsel__checkbox")) return;
    const source = this._getSource();
    if (!source) return;
    const key = cb.dataset.key!;
    const col = source.columns.find((c) => c.key === key);
    // [WHY] required 字段复选框 disabled, 此处双重保护; 勾选动作委托源表格
    // toggleColumn(key): 翻转 shared 引用 col.hidden → 宿主表格 requestUpdate +
    // z-config-change 快照持久化流程不变, 见 [[REQ-014]]
    if (!col || col.required) return;
    source.toggleColumn(key);
    this.emit("z-column-visibility-change", { key, visible: !col.hidden });
    // [WHY] 外部直绑(非内嵌)时宿主表格重建不波及本组件, 需自行重渲染刷新勾选态
    // 重渲染会换掉所有复选框节点 ⇒ 焦点掉到 body，记下 key 让 updated() 放回去
    this._pendingFocusKey = key;
    this.requestUpdate();
  };
}

customElements.define("z-column-selector", ZColumnSelector);
