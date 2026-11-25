// <z-search-bar> 桌面搜索框：输入防抖后上报 z-input，回车立即结算并发 z-search。
//
// [WHY 不直接用 z-input] `z-input` 的 `z-change` 是**逐键**的。搜索框每敲一个字打一次
// 接口，是列表页最常见的性能事故；防抖是搜索框的语义，不是输入框的语义。
// 移动端 `m-search` 早就是这条契约（debounce / z-input / z-search / z-clear），本组件
// 把同一份契约搬到桌面：**事件名与含义逐条对齐，DOM 与状态机各自实现**。
// 与「分页合并」同一个判据：共享行为不共享 DOM —— 触摸端 44px 高、桌面端 28px 紧凑，
// 硬合并会让其中一边的密度失真。
//
// [WHY 输入期间不改 this.value] 赋值会触发重渲染 → shadow 重建 → 输入框丢焦点与输入法
// 组合态（中文一个词没组完就没了）。只在清空/外部赋值时回写属性，等价于 `m-search`。
import { BaseElement, COPY, controlHeight, escapeAttr, html, property, type ControlSize } from "../../core/index.js";
import searchBarCSS from "./search-bar.css?raw";

export class ZSearchBar extends BaseElement {
  static styles = searchBarCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = "搜索";
  /** 防抖时长（ms）。0 = 逐键上报（仅本地筛选时用）。 */
  @property({ type: Number }) debounce = 200;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) clearable = true;
  @property({ type: String }) size: ControlSize = "sm";
  /**
   * 可访问名。缺省取 placeholder。
   *
   * [WHY 要能单独给] placeholder 一敲字就消失，读屏用户失去「这个框搜什么」的唯一线索；
   * 只有 placeholder 时它同时也充当 label，但业务词往往不够描述（「搜索」）。
   */
  @property({ type: String }) label = "";
  @property({ type: String }) clearLabel = COPY.clearInput;

  private _timer: ReturnType<typeof setTimeout> | null = null;

  protected willUpdate(): void {
    this.style.setProperty("--_h", controlHeight(this.size));
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("input", this._onInput);
    this.shadowRoot!.addEventListener("keydown", this._onKeyDown);
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this._clearTimer();
    this.shadowRoot!.removeEventListener("input", this._onInput);
    this.shadowRoot!.removeEventListener("keydown", this._onKeyDown);
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  updated(): void {
    const input = this._inputOf();
    if (!input) return;
    // 只在「不是用户正在打字的那个框」时回写，否则每敲一个字都重置光标
    if (document.activeElement !== input && input.value !== this.value) input.value = this.value;
    this._syncClear(input.value);
  }

  /** 把焦点送进输入框（工具栏里的快捷键、打开弹层后聚焦用）。 */
  override focus(options?: FocusOptions): void {
    this._inputOf()?.focus(options);
  }

  private _inputOf(): HTMLInputElement | null {
    return this.shadowRoot!.querySelector("input");
  }

  private _syncClear(v: string): void {
    const btn = this.shadowRoot!.querySelector<HTMLElement>(".z-sb__clear");
    if (btn) btn.hidden = !this.clearable || v.length === 0 || this.disabled;
  }

  private _clearTimer(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

  /** 就地结算防抖：先发 `z-input`，需要时再发 `z-search`（回车与清空走同一条路）。 */
  private _flush(emitSearch: boolean): void {
    const v = this._inputOf()?.value ?? "";
    this._clearTimer();
    this.emit("z-input", { value: v });
    if (emitSearch) this.emit("z-search", { value: v });
  }

  private _onInput = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    this._syncClear(input.value);
    this._clearTimer();
    if (this.debounce <= 0) {
      this.emit("z-input", { value: input.value });
      return;
    }
    this._timer = setTimeout(() => {
      this._timer = null;
      this.emit("z-input", { value: input.value });
    }, this.debounce);
  };

  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key === "Escape") {
      // [WHY Esc 也要发事件] m-search 的 Esc 只改自身、不通知宿主，宿主的关键字还停在
      // 旧值上 —— 桌面端能看见列表没跟着清，这是明显的 bug。清空一律走 `_clear()`。
      this._clear();
      return;
    }
    // 回车立刻结算：用户按了确认，还在等 200ms 才发就是「点了没反应」
    if (ke.key === "Enter") {
      ke.preventDefault();
      this._flush(true);
    }
  };

  private _onClick = (e: Event): void => {
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-act]");
    if (target?.dataset.act === "clear") this._clear();
  };

  /** 清空：属性和 DOM 一起改（用户要看到框变空），并发 `z-clear` + `z-input`。 */
  private _clear(): void {
    this._clearTimer();
    this.value = "";
    const input = this._inputOf();
    if (input) input.value = "";
    this._syncClear("");
    this.emit("z-clear");
    this.emit("z-input", { value: "" });
    this._inputOf()?.focus();
  }

  render(): string {
    const name = this.label || this.placeholder;
    return html`
      <div class="z-sb${this.disabled ? " z-sb--disabled" : ""}" part="root">
        <span class="z-sb__icon" part="icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <input
          class="z-sb__input"
          part="input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          value="${escapeAttr(this.value)}"
          placeholder="${escapeAttr(this.placeholder)}"
          aria-label="${escapeAttr(name)}"
          ${this.disabled ? "disabled" : ""}
        />
        <button
          class="z-sb__clear"
          part="clear"
          type="button"
          data-act="clear"
          aria-label="${escapeAttr(this.clearLabel)}"
          hidden
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path d="M4.8 4.8L9.2 9.2M9.2 4.8L4.8 9.2" stroke="var(--z-color-bg)" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `;
  }
}

customElements.define("z-search-bar", ZSearchBar);
