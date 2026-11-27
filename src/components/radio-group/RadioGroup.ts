// <z-radio-group> 单选组：统一收子级 z-radio 的选中，value 即选中值，orientation 定横排或竖排。
import { BaseElement, escapeAttr, html, property, defineElement } from "../../core/index.js";
import { listIntent, resolveIndex } from "../../primitives/index.js";
import { ZRadio } from "../radio/Radio.js";
import radioGroupCSS from "./radio-group.css?raw";

export class ZRadioGroup extends BaseElement {
  static styles = radioGroupCSS;

  @property({ type: String }) value = "";
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) name = "";
  @property({ type: String }) orientation: "horizontal" | "vertical" = "vertical";

  render(): string {
    const cls = [
      "z-radio-group",
      `z-radio-group--${this.orientation}`,
    ].join(" ");

    // [WHY 把宿主上的 aria-label / aria-labelledby 抄到内层] `role="radiogroup"` 在内层 div 上，
    // 宿主自己的 `aria-label` **不参与**那个 role 的命名计算（读屏只认带 role 的那个节点）。
    // 于是 `<z-radio-group aria-label="忽略原因">` 读出来是一句「单选按钮组」，用户不知道在选什么。
    // 页面渲染器（`page/render.ts` 的 `field type=radio`）只能把名字写在宿主上，所以由组件转发。
    const labelled = [
      this.getAttribute("aria-label") ? `aria-label="${escapeAttr(this.getAttribute("aria-label") ?? "")}"` : "",
      this.getAttribute("aria-labelledby")
        ? `aria-labelledby="${escapeAttr(this.getAttribute("aria-labelledby") ?? "")}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class="${cls}" part="root" role="radiogroup" aria-orientation="${this.orientation}"${labelled ? ` ${labelled}` : ""}>
        <slot></slot>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-change", this._onRadioChange);
    this.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-change", this._onRadioChange);
    this.removeEventListener("keydown", this._onKey);
    super.disconnectedCallback();
  }

  firstUpdated(): void {
    this._syncRadios();
  }

  updated(): void {
    this._syncRadios();
  }

  private _syncRadios(): void {
    const radios = this._getRadios();
    radios.forEach((radio) => {
      if (this.disabled) radio.disabled = true;
      radio.name = this.name;
      radio.checked = radio.value === this.value;
    });
  }

  private _getRadios(): ZRadio[] {
    return Array.from(this.querySelectorAll("z-radio")) as ZRadio[];
  }

  private _onRadioChange = (e: Event): void => {
    const radio = e.target as ZRadio;
    if (radio.tagName !== "Z-RADIO") return;
    e.stopPropagation();
    this.value = radio.value;
    this._syncRadios();
    this.emit("z-change", { value: this.value });
  };

  /**
   * 方向键移动并选中所到项（ARIA APG radio group 模式）。
   *
   * [WHY 方向轴由 orientation 定，而不是四向全认] 单选组的 ↑↓ 与 ←→ 是**同一件事**：
   * 在列表里挪一格。四向全认会让横排组里的 ↑ 也换选项 —— 而用户此时想的是滚动页面。
   * 所以把「沿哪个轴」交给 `listIntent` 的 `axis`，两套键位一次写清楚。
   *
   * 候选集先滤掉禁用项（禁用的 radio 本来也不该被选中），因此 `resolveIndex`
   * 不需要 `isDisabled`：下标空间就是可用项空间。
   */
  private _onKey = (e: Event): void => {
    const intent = listIntent((e as KeyboardEvent).key, {
      axis: this.orientation === "horizontal" ? "horizontal" : "vertical",
    });
    if (!intent) return;

    const radios = this._getRadios().filter((r) => !r.disabled);
    if (radios.length === 0) return;

    // 一个都没选中时 currentIndex = -1：↓ 落第一项、↑ 落末项（顺着按键方向进场）
    const currentIndex = radios.findIndex((r) => r.checked);
    const next = resolveIndex(radios.length, currentIndex, intent);
    if (next < 0) return;

    e.preventDefault();
    const target = radios[next];
    target.select();
    // [WHY 焦点必须跟着走，不是可选优化] APG 的 radio group 是「移动即选中 + 焦点跟随」。
    // 只改 `checked` 的话：① 下一次方向键不再从这一项出发（`findIndex(checked)` 是对的，
    // 但用户的焦点停在旧项上，视觉与事实不一致）；② 更硬的后果 —— `select()` 会让
    // `z-radio` 重渲染（`shadow.innerHTML` 整块替换），**光标所在的原生 input 被换掉**，
    // 焦点掉到 `<body>`，此后任何按键都不再冒泡到本组：真机实测「按 ↓ 选中第二项后再按 ↓
    // 什么都不发生」，键盘用户只能选一次。2026-11-16 冒烟 `smoke-kbd-w30` 抓到。
    target.focus();
  };
}

defineElement("z-radio-group", ZRadioGroup);
