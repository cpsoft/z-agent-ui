// <m-search> 搜索框：输入防抖（debounce）后才上报 z-input，回车立即结算并发 z-search。
// [WHY] 移动端搜索框：与 z-input 不是一件事 —— 它的输入**必须**防抖后才上报，
// 而 z-input 的 z-change 是逐键的。列表页每敲一个字就打一次接口，是 H5 最常见的性能事故。
//
// [WHY 不清空 this.value] 赋值会触发 requestUpdate → shadow 重建 → input 丢焦点与输入法
// 组合态，用户打字时输入法会被打断（中文尤其明显，一个词没组完就没了）。
// 所以输入期间只在 DOM 上同步「清空按钮」的显隐，属性值只在清空/外部赋值时变。
import { BaseElement, escapeHtml, html, property } from "../../core/index.js";
import mSearchCSS from "./m-search.css?raw";

export class MSearch extends BaseElement {
  static styles = mSearchCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) placeholder = "搜索";
  /** 防抖时长（ms）。0 = 不防抖（逐键上报，仅在本地筛选时用） */
  @property({ type: Number }) debounce = 200;
  /** 右侧「取消」入口 */
  @property({ type: Boolean }) cancel = false;
  /**
   * 框内那枚「搜索」按钮（issue IKW576 #1）。
   *
   * [WHY 必须有一个不依赖键盘的入口] iOS 中文输入法下，软键盘的「搜索 / 前往」键
   * **可能根本不发 keydown** —— 输入法把那次按键吞掉当成上屏确认。于是「回车提交」
   * 这条唯一入口在真机上时灵时不灵，而页面看上去完全正常（框能输入、能清空）。
   * 这不是兜底，是主入口：键盘那条留着，但不能只有它。
   *
   * 缺省 false：存量用法（含 demo）不加这枚按钮，右侧那 44px 留给输入区。
   */
  @property({ type: Boolean }) action = false;
  @property({ type: Boolean }) disabled = false;

  private _timer: ReturnType<typeof setTimeout> | null = null;

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
    const input = this.shadowRoot!.querySelector("input");
    if (!input) return;
    // [WHY] 只在「不是用户正在打字的那个框」时回写，否则每敲一个字都会重置光标
    if (document.activeElement !== input && input.value !== this.value) input.value = this.value;
    this._syncClear(input.value);
  }

  private _inputOf(): HTMLInputElement | null {
    return this.shadowRoot!.querySelector("input");
  }

  private _syncClear(v: string): void {
    const btn = this.shadowRoot!.querySelector(".m-search__clear") as HTMLElement | null;
    if (btn) btn.hidden = v.length === 0;
  }

  private _clearTimer(): void {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }

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
      this._applyValue("");
      return;
    }
    // 回车立刻结算，不等防抖：用户按了确认，还在等 200ms 才发就是「点了没反应」
    if (ke.key === "Enter") {
      ke.preventDefault();
      this._flush(true);
    }
  };

  private _onClick = (e: Event): void => {
    const t = (e.target as HTMLElement).closest("[data-act]") as HTMLElement | null;
    if (!t) return;
    if (t.dataset.act === "clear") {
      this._applyValue("");
      this.emit("z-clear");
      this.emit("z-input", { value: "" });
    } else if (t.dataset.act === "cancel") {
      this.emit("z-cancel", { value: this._inputOf()?.value ?? "" });
    } else if (t.dataset.act === "search") {
      // 与回车完全同一条路径（`_flush(true)`）：防抖定时器就地结算，
      // 先发 `z-input` 再发 `z-search`。两条路各写一遍会有个「按钮发的少了 z-input」
      // 这种只在某一端出现的差异。
      this._flush(true);
    }
  };

  /** 清空/外部赋值：属性和 DOM 一起改（这里必须重渲染，用户要看到框变空） */
  private _applyValue(v: string): void {
    this.value = v;
    const input = this._inputOf();
    if (input) input.value = v;
    this._syncClear(v);
  }

  render(): string {
    return html`
      <div class="m-search" part="root">
        <div class="m-search__box" part="box">
          <span class="m-search__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <input
            class="m-search__input"
            part="input"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            value="${escapeHtml(this.value)}"
            placeholder="${escapeHtml(this.placeholder)}"
            ${this.disabled ? "disabled" : ""}
            aria-label="${escapeHtml(this.placeholder)}"
          />
          ${this.action
            ? html`<button class="m-search__submit" part="submit" type="button" data-act="search" aria-label="搜索" ${this.disabled ? "disabled" : ""}>搜索</button>`
            : ""}
          <button class="m-search__clear" part="clear" type="button" data-act="clear" aria-label="清空" hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="currentColor" />
              <path d="M4.8 4.8L9.2 9.2M9.2 4.8L4.8 9.2" stroke="var(--z-color-surface)" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        ${this.cancel ? html`<button class="m-search__cancel" part="cancel" type="button" data-act="cancel">取消</button>` : ""}
      </div>
    `;
  }
}

customElements.define("m-search", MSearch);
