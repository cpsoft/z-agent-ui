// <z-segmented> 分段控件：items 给选项，value 定选中，切换发 z-change。
//
// [WHY 2026-11-23 新增] 两端都有标准件（M3 `SegmentedButton` / iOS `Picker(.segmented)`），
// 本库此前只能用 `z-tabs` 顶替 —— 但语义不同：tabs 切**内容面板**，segmented 切**同一份内容的
// 呈现参数**（日/周/月、全部/进行中/已完成、图表/表格）。
// 用 tabs 顶替的代价是 aria 语义错（tablist 却没有 panel）、每处手写选中态。
// See: architecture/component-gap-audit.html §03 第一档「自家代码已证明需求」
//
// [WHY 用 radiogroup 而不是 tablist] APG 的分工：tablist 配 tabpanel（切内容），
// radiogroup 配同质选项（切值）。分段控件的每一段都是一个**取值**，不是一块面板 ——
// 用 tablist 会让读屏报「1 个标签页，未选中任何面板」，而页面上根本没有面板。
import { BaseElement, escapeAttr, html, property, controlHeight, type ControlSize, defineElement } from "../../core/index.js";
import { listIntent, resolveIndex } from "../../primitives/index.js";
import segmentedCSS from "./segmented.css?raw";

export interface SegmentedItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export class ZSegmented extends BaseElement {
  static styles = segmentedCSS;

  @property({ type: Array, attribute: false }) items: SegmentedItem[] = [];
  /**
   * HTML 入口：`"day|日,week|周,month|月"`（`|` 前是 value，后可省 = 与 value 同文）。
   *
   * [WHY 需要两个入口] `items` 是数组，只能 JS 赋值。纯 HTML 宿主（静态页、SSR、AI 生成的
   * 页面脚本）配不了 —— 那等于这个组件对一半宿主不可用。文案是 attribute 契约的一部分，
   * 所以补一条字符串入口：**`items` 优先，未给时解析 `options`**，两者合并到同一个内部结构，
   * 不存在两套真相。
   */
  @property({ type: String }) options = "";
  /** 当前值。未匹配到任何 item 时，所有段都是未选中态（不强行选第一项 —— 那会替宿主做决定）。 */
  @property({ type: String }) value = "";
  @property({ type: String }) size: ControlSize = "md";
  @property({ type: Boolean }) disabled = false;
  /** 撑满父容器宽度，各段等分。默认按内容宽。 */
  @property({ type: Boolean }) full = false;

  /**
   * 重渲染后要把焦点送回哪一段。
   *
   * [WHY 需要它] `BaseElement` 每次更新整块替换 `shadow.innerHTML`（见
   * [[web-components-render-pitfalls]] 陷阱②）：点一下第二段，按钮节点被重建，焦点掉到 body。
   * 键盘用户每切一次就得重新 Tab 回来。空串 = 本次渲染与交互无关，初始渲染绝不抢焦点。
   */
  private _refocus = "";

  protected willUpdate(): void {
    // 与 z-pagination 同一条高度口径（xs 24 / sm 28 / md 32 / lg 36，随密度缩放）
    this.style.setProperty("--_h", controlHeight(this.size));
  }

  /** 解析后的选项：`items` 优先，其次 `options` 字符串。所有渲染与键盘逻辑只读它。 */
  private _entries(): SegmentedItem[] {
    if (this.items.length > 0) return this.items;
    if (!this.options) return [];
    return this.options
      .split(",")
      .map((pair) => {
        const [rawValue, ...rest] = pair.split("|");
        const value = rawValue.trim();
        return { value, label: (rest.join("|") || value).trim() };
      })
      .filter((it) => it.value.length > 0);
  }

  render(): string {
    // [WHY 转发宿主 aria-label 到内层] `role="radiogroup"` 在内层 div 上，宿主自己挂的
    // aria-label 不参与那个 role 的命名计算 —— 与 `z-radio-group` 同一个坑。
    const labelled = [
      this.getAttribute("aria-label") ? `aria-label="${escapeAttr(this.getAttribute("aria-label") ?? "")}"` : "",
      this.getAttribute("aria-labelledby")
        ? `aria-labelledby="${escapeAttr(this.getAttribute("aria-labelledby") ?? "")}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const btns = this._entries()
      .map((it) => {
        const on = it.value === this.value;
        const off = this.disabled || !!it.disabled;
        return (
          `<button type="button" class="z-seg__item" part="item" role="radio"` +
          ` data-value="${escapeAttr(it.value)}" aria-checked="${on}"` +
          ` tabindex="${on ? "0" : "-1"}"${off ? " disabled" : ""}>${escapeAttr(it.label)}</button>`
        );
      })
      .join("");

    return html`
      <div class="z-seg${this.full ? " z-seg--full" : ""}" part="root" role="radiogroup"
           aria-orientation="horizontal"${labelled ? ` ${labelled}` : ""}>${btns}</div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("click", this._onClick);
    this.addEventListener("keydown", this._onKey);
  }

  disconnectedCallback(): void {
    this.removeEventListener("click", this._onClick);
    this.removeEventListener("keydown", this._onKey);
    super.disconnectedCallback();
  }

  updated(): void {
    if (!this._refocus) return;
    const want = this._refocus;
    this._refocus = "";
    // [WHY 不用 `[data-value="${CSS.escape(want)}"]`] `CSS.escape` 在 happy-dom 里没有实现，
    // 而 value 来自宿主（可能是 `1/2`、`a b` 这类需要转义的串）。遍历比对不依赖任何转义规则。
    const el = Array.from(this.shadowRoot?.querySelectorAll<HTMLElement>("[data-value]") ?? []).find(
      (n) => n.getAttribute("data-value") === want,
    );
    el?.focus();
  }

  private _onClick = (e: Event): void => {
    // 同 m-tabs：宿主上的监听拿到的 target 是宿主自己，得从 composedPath 取内层节点
    const btn = ((e.composedPath()[0] ?? e.target) as HTMLElement | null)?.closest?.("[data-value]") as HTMLElement | null;
    if (!btn || btn.hasAttribute("disabled")) return;
    this._select(btn.getAttribute("data-value") ?? "");
  };

  /**
   * 方向键移动并选中所到项（APG radio group 模式：移动即选中 + 焦点跟随）。
   *
   * [WHY 只认 ←→] 分段控件恒为横排，↑↓ 在这个场景里是「滚动页面」。
   * 与 `z-radio-group` 同一条判断：轴由布局决定，不四向全认。
   */
  private _onKey = (e: Event): void => {
    const intent = listIntent((e as KeyboardEvent).key, { axis: "horizontal" });
    if (!intent) return;

    const usable = this._entries().filter((it) => !it.disabled && !this.disabled);
    if (usable.length === 0) return;

    // 当前没选中（或选中的项被禁用）时 currentIndex = -1：→ 落第一项、← 落末项
    const currentIndex = usable.findIndex((it) => it.value === this.value);
    const next = resolveIndex(usable.length, currentIndex, intent);
    if (next < 0) return;

    e.preventDefault();
    this._select(usable[next].value);
  };

  private _select(value: string): void {
    if (!value || value === this.value) return;
    this.value = value;
    this._refocus = value;
    this.emit("z-change", { value });
    this.requestUpdate();
  }
}

defineElement("z-segmented", ZSegmented);
