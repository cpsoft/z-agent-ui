// <m-number-keyboard> 金额数字键盘：3×4 键位、金额输入规则内置、extra-key 追加提交键。
//
// [WHY 需要它而不是用 input[type=number]] 手机上调起系统数字键盘时，不同机型、不同输入法
// 给出的键位完全不一样（有的没有小数点，有的把「完成」藏在键盘上沿），而金额输入只有
// 12 个键、规则也就三条。自己画一份的收益不是好看，是**规则由组件保证**：
//   · 只允许一个小数点
//   · 小数最多两位
//   · 「0」之后直接输数字要替换，而不是变成「05」
// 这三条用 `type=number` 时全靠宿主在 change 里修字符串，改一处漏一处 —— 而漏掉的那处
// 表现为「金额能填成 1.2.3」，提交到后端才炸。
//
// [WHY 不自己把输入框推上去] 「键盘弹出时输入框不能被盖住」是页面级的事：谁知道输入框在
// 哪儿、谁该滚、滚多少，只有宿主知道。组件能做的是两件确定性的事：打开时把自身高度
// 通过 `--z-m-keyboard-height` 暴露出来，并在 `z-open` 里带上高度。宿主据此留白或滚动。
import { BaseElement, COPY, html, property } from "../../core/index.js";
import kbCSS from "./m-number-keyboard.css?raw";

/**
 * 金额输入规则：给定当前串与按下的键，返回下一个串。
 *
 * 抽成纯函数是刻意的 —— 这三条规则是组件**唯一**容易悄悄错的地方，而它们与 DOM 无关，
 * 离开渲染就能逐条验证。
 *
 * @param value 当前输入串
 * @param key 按下的键：`"0"`…`"9"` / `"."` / `"backspace"`
 * @param maxIntDigits 整数部分最多几位（0 = 不限）
 * @returns 处理后的串；被规则拒绝时返回原串
 */
export function applyNumberKey(value: string, key: string, maxIntDigits = 0): string {
  if (key === "backspace") return value.slice(0, -1);

  const [intPart = "", decPart] = value.split(".");
  const hasDot = decPart !== undefined;

  if (key === ".") {
    // 已经有了就是重复小数点；空串时补一个 0，避免出现 ".5" 这种不合法写法
    if (hasDot) return value;
    return value === "" ? "0." : `${value}.`;
  }

  if (!/^[0-9]$/.test(key)) return value;

  if (hasDot) {
    // 小数最多两位：第三位开始整键忽略（不是截断，截断会让用户以为按键没反应又按一次）
    if ((decPart ?? "").length >= 2) return value;
    return `${value}${key}`;
  }

  // [WHY 单独处理 "0"] 否则用户先按 0 再按 5 会得到 "05"，而后端一般按数字解析、
  // 前端回显又按字符串 —— 下一次编辑就成了 "05" → "005"。
  if (value === "0") return key;

  if (maxIntDigits > 0 && intPart.length >= maxIntDigits) return value;
  return `${value}${key}`;
}

export class ZMNumberKeyboard extends BaseElement {
  static styles = kbCSS;

  /** 显示/隐藏。受控：宿主写它，组件不自己关。 */
  @property({ type: Boolean }) open = false;

  /** 顶部标题（可选）。不写就不渲染标题行。 */
  @property({ type: String }) title = "";

  /** 当前输入串。宿主写它做回填，组件每次按键后也会写回。 */
  @property({ type: String }) value = "";

  /** 整数部分最多几位，0 = 不限。 */
  @property({ type: Number }) maxIntDigits = 0;

  /** 是否在底部追加一个整宽的操作键（通常是「完成 / 下一步」）。 */
  @property({ type: Boolean }) extraKey = false;

  /** 追加键的文案。 */
  @property({ type: String }) extraKeyText = COPY.confirm;
  /**
   * 小数点键的可访问名。
   *
   * [WHY 需要属性而不是写死 COPY] 英文宿主把其余文案换成英文之后，只剩这一个键还在
   * 念「小数点」—— 而那正是读屏用户唯一能听到它的地方。同 `extraKeyText` 的理由。
   */
  @property({ type: String }) decimalPointText = COPY.decimalPoint;

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    super.disconnectedCallback();
  }

  /** 供宿主/测试调用：等价于点一个键。返回是否真的改变了值。 */
  press(key: string): boolean {
    const next = applyNumberKey(this.value, key, this.maxIntDigits);
    if (key === "backspace") {
      if (next === this.value) return false;
      this.value = next;
      this.emit("z-delete", { value: next });
      return true;
    }
    if (next === this.value) return false;
    this.value = next;
    this.emit("z-input", { value: next });
    return true;
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (btn?.dataset.key !== undefined) {
      this.press(btn.dataset.key);
      return;
    }
    if ((e.target as HTMLElement).closest<HTMLElement>("[data-act='extra']")) {
      this.emit("z-extra", { value: this.value });
    }
  };

  protected updated(): void {
    // 高度给宿主用：它要据此给内容留白，否则键盘会盖住最后一个输入框。
    // [WHY 量自身而不是写死] 键位行数随 extra-key 变，写死的数字总有一天对不上。
    const h = this.getBoundingClientRect().height;
    if (h > 0) this.style.setProperty("--z-m-keyboard-height", `${Math.round(h)}px`);

    if (this.open) this.emit("z-open", { height: h });
  }

  render(): string {
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];
    const grid = keys
      .map((k) => {
        const isDel = k === "backspace";
        const label = isDel
          ? html`<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M8 5.5h10.5a1 1 0 011 1v9a1 1 0 01-1 1H8L3 11l5-5.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M10.5 9l4 4m0-4l-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>`
          : k;
        // 删除键必须有自己的名字：图标对读屏是空的，不写 label 就是「按钮」两个字。
        // 小数点键同理：它的文本是 `.`，读屏念「句点」，在一排数字里分不清是什么。
        const isDot = k === ".";
        const aria = isDel
          ? ` aria-label="${COPY.backspace}"`
          : isDot
            ? ` aria-label="${this.decimalPointText}"`
            : "";
        return html`<button type="button" class="z-m-kb__key${isDel ? " z-m-kb__key--fn" : ""}" part="key" data-key="${k}"${aria}>${label}</button>`;
      })
      .join("");

    return html`
      <div class="z-m-kb${this.open ? " z-m-kb--open" : ""}" part="root">
        ${this.title ? html`<div class="z-m-kb__title" part="title">${this.title}</div>` : ""}
        <div class="z-m-kb__grid" part="grid">${grid}</div>
        ${
          this.extraKey
            ? html`<button type="button" class="z-m-kb__extra" part="extra" data-act="extra">${this.extraKeyText}</button>`
            : ""
        }
      </div>
    `;
  }
}

customElements.define("m-number-keyboard", ZMNumberKeyboard);
