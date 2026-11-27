// <m-tabs> 顶部页签条：横滑或均分，可带角标；切换只上报 key，内容由宿主重画。
//
// [WHY 不用 z-tabs] 两者语义不同，不是「同一件东西的移动版」：
//   · `z-tabs` 是**页签组**：子元素 `<z-tab-panel>` 是内容，切页签翻 class 不重取；
//   · 手机上的「全部 / 待付款 / 待发货」是**筛选器**：切一次要按新状态重新取数，
//     面板常驻等于同时挂着 4 个列表（每个都在取数、都在滚）。
// 这一条只要导航条，`active` 用 key（订单状态码）而不是下标 —— 下标会随角标显隐变化。
//
// 触控：按钮高 44px。单据类页面的页签是高频点击目标，36px 时容易点到隔壁。
import { BaseElement, ariaBool, escapeAttr, html, property, defineElement } from "../../core/index.js";
import mTabsCSS from "./m-tabs.css?raw";

export interface MTabItem {
  key: string;
  label: string;
  /** 角标数字（「待付款 2」）。0 / 空 不画。 */
  badge?: number | string;
}

/**
 * `items` 的字符串形态：`key|label|badge`，逗号分隔。
 * 与 `z-segmented` / `z-context-menu` 的 HTML 宿主约定一致（都吃 `a|A,b|B`）。
 */
function parseItems(raw: string | MTabItem[]): MTabItem[] {
  if (Array.isArray(raw)) return raw.filter((i) => i && i.key);
  return raw
    .split(",")
    .map((seg) => seg.trim())
    .filter(Boolean)
    .map((seg) => {
      const [key, label = key, badge = ""] = seg.split("|").map((s) => s.trim());
      return { key, label: label || key, badge };
    });
}

export class MTabs extends BaseElement {
  static styles = mTabsCSS;

  @property({ type: String }) items: string | MTabItem[] = "";
  @property({ type: String }) active = "";
  /** 均分宽度（3–5 个页签时更好看）；关掉则按内容宽 + 横滑。 */
  @property({ type: Boolean }) stretch = false;
  /** 打开后只能由脚本改，点不动（如「下单中」）。 */
  @property({ type: Boolean }) disabled = false;

  private get _list(): MTabItem[] {
    return parseItems(this.items);
  }

  private get _activeIndex(): number {
    return Math.max(0, this._list.findIndex((i) => i.key === this.active));
  }

  render(): string {
    const list = this._list;
    const activeIdx = this._activeIndex;
    const cls = ["m-tabs", this.stretch ? "m-tabs--stretch" : "", this.disabled ? "m-tabs--disabled" : ""]
      .filter(Boolean)
      .join(" ");
    const btns = list
      .map((it, i) => {
        const on = i === activeIdx;
        return html`<button
          type="button"
          class="m-tabs__btn${on ? " is-active" : ""}"
          role="tab"
          id="mtab-${i}"
          data-key="${escapeAttr(it.key)}"
          data-index="${i}"
          aria-selected="${ariaBool(on)}"
          tabindex="${on ? "0" : "-1"}"
          ${this.disabled ? "disabled" : ""}
          part="tab"
        >
          <span class="m-tabs__label">${escapeAttr(it.label)}</span>
          ${it.badge !== undefined && String(it.badge) !== "" && String(it.badge) !== "0"
            ? `<span class="m-tabs__badge" part="badge">${escapeAttr(String(it.badge))}</span>`
            : ""}
        </button>`;
      })
      .join("");
    return html`<div class="${cls}" role="tablist" part="root">${btns}</div>`;
  }

  /** 点一个页签（宿主也可调）：与点击同一条路径，事件只发一次。 */
  select(key: string): void {
    if (this.disabled) return;
    const list = this._list;
    const idx = list.findIndex((i) => i.key === key);
    if (idx < 0 || list[idx].key === this.active) return;
    this.active = key;
    this.emit("z-change", { key, index: idx });
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

  private _onClick = (e: Event): void => {
    if (this.disabled) return;
    // 监听挂在宿主上 ⇒ 跨 shadow 边界时 `e.target` 已被重定向成宿主，closest 恒 null
    const btn = ((e.composedPath()[0] ?? e.target) as HTMLElement).closest("[data-key]") as HTMLElement | null;
    if (!btn) return;
    this.select(btn.dataset.key ?? "");
  };

  /** ←/→ 在页签间移动（与 z-tabs 同一套键盘语义）。 */
  private _onKey = (e: Event): void => {
    if (this.disabled) return;
    const key = (e as KeyboardEvent).key;
    if (key !== "ArrowLeft" && key !== "ArrowRight") return;
    const list = this._list;
    if (list.length < 2) return;
    e.preventDefault();
    const cur = this._activeIndex;
    const next = key === "ArrowRight" ? (cur + 1) % list.length : (cur - 1 + list.length) % list.length;
    this.select(list[next].key);
    // 重渲染换掉了按钮，焦点要放回新的激活项（否则键盘用户按一次就丢焦点）
    const el = this.shadowRoot?.querySelector(`[data-index="${next}"]`) as HTMLElement | null;
    el?.focus();
  };
}

defineElement("m-tabs", MTabs);
