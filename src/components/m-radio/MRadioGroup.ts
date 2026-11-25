// <m-radio-group> 单选组：管互斥、管方向、管「组这一层」的变更事件。
//
// 组只做三件事：① 按 `value` 把子项对齐；② 收到子项 `z-change` 时改自己的 `value`
// （顺带让其它子项灭掉）；③ 把事件抬成 `z-change { value }` 给宿主。
// 不参与表单提交 —— 手机上支付方式、配送时间这类选择都是「点完立刻进下一步」，
// 要走表单请用 `z-radio-group`。
import { BaseElement, html, property } from "../../core/index.js";
import type { MRadio } from "./MRadio.js";
import mRadioGroupCSS from "./m-radio-group.css?raw";

export class MRadioGroup extends BaseElement {
  static styles = mRadioGroupCSS;

  @property({ type: String }) value = "";
  @property({ type: String }) direction: "row" | "column" = "column";
  @property({ type: Boolean }) disabled = false;

  private _items(): MRadio[] {
    return Array.from(this.querySelectorAll("m-radio")) as MRadio[];
  }

  render(): string {
    return html`
      <div class="m-radio-group m-radio-group--${this.direction}" part="root" role="radiogroup">
        <slot></slot>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-change", this._onItemChange);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-change", this._onItemChange);
    super.disconnectedCallback();
  }

  updated(): void {
    // 子项可能还没升级完（同一批解析时 slot 内容早于自定义元素定义），下一个微任务再对齐一次
    this._sync();
    void Promise.resolve().then(() => this._sync());
  }

  /** 把子项的 checked 对齐到当前 value；禁用态跟着组走。 */
  private _sync(): void {
    for (const item of this._items()) {
      const on = !!this.value && item.getAttribute("value") === this.value;
      if (item.checked !== on) item.checked = on;
      if (this.disabled) item.disabled = true;
    }
  }

  /**
   * 子项的 `z-change` 冒泡到组，组只做一件事：把 `value` 跟上。
   *
   * [WHY 组不再转发一条] 转发会让宿主在组上监听到两条同名事件（子项那条 + 组那条），
   * 同一次选择被记两次；而两条的 detail 本来就一样（都是 `{ value }`），
   * 所以让子项那条直接冒泡上去就够了。
   */
  private _onItemChange = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { value?: string } | undefined;
    const value = detail?.value ?? "";
    if (!value || value === this.value) return;
    this.value = value;
  };
}

customElements.define("m-radio-group", MRadioGroup);
