// <m-picker> 底部选择器：open 控制弹出，options 给选项，确认发 z-confirm、取消发 z-cancel。
// [WHY] 底部选择器：移动端「点一行 → 从底部选一个值」是最高频的录入路径（分类、门店、状态）。
// 用原生 <select> 的问题不是难看，而是它在 iOS 上是系统弹层、在 Android 是另一种弹层，
// 两端的「取消/确定」语义与键盘行为都不一致，页面上没法统一。
//
// [WHY 草稿值] 选中即生效会让「滑了一下又取消」变成一次真实的写入。这里把草稿留在
// `_draft`，只有确认才上报 z-confirm；取消/点遮罩一律丢弃。
import { COPY, BaseElement, escapeHtml, html, property } from "../../core/index.js";
import mPickerCSS from "./m-picker.css?raw";

export interface MPickerOption {
  label: string;
  value: string;
}

export class MPicker extends BaseElement {
  static styles = mPickerCSS;

  @property({ type: Boolean }) open = false;
  /** 面板标题（不用 `title`：它是 HTMLElement 的原生反射属性，会在构造期触发 setAttribute） */
  @property({ type: String }) heading = "";
  // [WHY attribute:false] 对象数组无法用字符串属性表达，只能走 property
  @property({ attribute: false }) options: MPickerOption[] = [];
  @property({ type: String }) value = "";
  @property({ type: String, attribute: "confirm-text" }) confirmText = COPY.confirm;
  @property({ type: String, attribute: "cancel-text" }) cancelText = COPY.cancel;

  private _draft = "";
  private _wasOpen = false;
  private _closing = false;
  /** 草稿是否已经从 `value` 抄过。
   *
   *  [WHY 需要这个标志] 抄草稿的动作在 `updated()` 里，而基类的顺序是
   *  **先 render 再 updated** —— 所以「从关到开」的那一帧，render 跑的时候 `_draft`
   *  还是上一轮的（首次是空串）。结果是**每次打开面板都没有选中标记**，
   *  用户看不到当前值是什么，只能凭记忆。render 里用这个标志决定回退到 `value`，
   *  就不用为了补这一帧再排一次渲染（会闪一下）。 */
  private _draftSynced = false;

  updated(): void {
    // [WHY 先取旧值再覆盖] 下面「关了就播退场动画」要用的是**这一帧之前**的开关态。
    // 先把 _wasOpen 写成 this.open 再去判断它，条件恒假 —— 面板会直接消失，没有动画。
    const wasOpen = this._wasOpen;
    this._wasOpen = this.open;
    // 打开的那一帧把当前值抄进草稿；之后草稿只听用户点选
    if (this.open && !wasOpen) {
      this._draft = this.value;
      this._draftSynced = true;
    }

    const overlay = this.shadowRoot!.querySelector(".m-picker__overlay");
    if (overlay) overlay.addEventListener("click", this._onOverlayClick);
    this.shadowRoot!.querySelectorAll(".m-picker__option").forEach((el) => {
      el.addEventListener("click", this._onOptionClick);
    });
    const confirm = this.shadowRoot!.querySelector("[data-act='confirm']");
    if (confirm) confirm.addEventListener("click", this._onConfirm);
    const cancel = this.shadowRoot!.querySelector("[data-act='cancel']");
    if (cancel) cancel.addEventListener("click", this._onCancel);

    if (!this.open && wasOpen && !this._closing) {
      // 退场动画：先滑下去再撤 DOM（与 m-action-sheet 同一套状态机）
      this._closing = true;
      this.requestUpdate();
    }
    if (this._closing) {
      const panel = this.shadowRoot!.querySelector(".m-picker__panel");
      if (panel) {
        const onEnd = (e: Event): void => {
          if (e.target !== panel) return;
          panel.removeEventListener("animationend", onEnd);
          this._closing = false;
          this.requestUpdate();
        };
        panel.addEventListener("animationend", onEnd);
      }
    }
  }

  private _close(): void {
    this.open = false;
  }

  private _onOverlayClick = (e: Event): void => {
    // 只有点在遮罩本身（空白处）才算取消；点面板内部冒泡上来不算
    if (e.target === e.currentTarget) this._onCancel();
  };

  private _onOptionClick = (e: Event): void => {
    const el = e.currentTarget as HTMLElement;
    this._draft = el.dataset.value ?? "";
    this.requestUpdate();
  };

  private _onConfirm = (): void => {
    const opt = this.options.find((o) => o.value === this._draft);
    this.emit("z-confirm", { value: this._draft, label: opt?.label ?? "" });
    this._close();
  };

  private _onCancel = (): void => {
    this._draft = this.value;
    this.emit("z-cancel", { value: this.value });
    this._close();
  };

  render(): string {
    if (!this.open && !this._closing) return html`<div style="display:none" part="hidden"></div>`;

    // 首帧（还没抄过草稿）退回 `value`：见 `_draftSynced` 的说明
    const draft = this._draftSynced ? this._draft : this.value;

    const items = this.options
      .map((o) => {
        const on = o.value === draft;
        return html`
          <button
            type="button"
            class="m-picker__option${on ? " m-picker__option--on" : ""}"
            part="option"
            data-value="${escapeHtml(o.value)}"
            aria-pressed="${on ? "true" : "false"}"
          >
            <span class="m-picker__label">${escapeHtml(o.label)}</span>
            ${on
              ? html`<span class="m-picker__check" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>`
              : ""}
          </button>
        `;
      })
      .join("");

    return html`
      <div class="m-picker__overlay${this._closing ? " m-picker__overlay--closing" : ""}" part="overlay">
        <div class="m-picker__panel${this._closing ? " m-picker__panel--closing" : ""}" part="panel" role="dialog" aria-modal="true">
          <div class="m-picker__head" part="head">
            <button class="m-picker__act" part="cancel" type="button" data-act="cancel">${escapeHtml(this.cancelText)}</button>
            <span class="m-picker__title" part="title">${escapeHtml(this.heading)}</span>
            <button class="m-picker__act m-picker__act--primary" part="confirm" type="button" data-act="confirm">
              ${escapeHtml(this.confirmText)}
            </button>
          </div>
          <div class="m-picker__list" part="list" role="listbox">${items}</div>
        </div>
      </div>
    `;
  }
}

customElements.define("m-picker", MPicker);
