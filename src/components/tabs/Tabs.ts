// <z-tabs> 标签栏：active 定当前页签、tab-style 定样式（下划线/胶囊/卡片），切换发 z-change。
import {
  BaseElement,
  html,
  property,
  escapeAttr,
  observeLegacyAttribute,
  ariaBool,
} from "../../core/index.js";
import tabsCSS from "./tabs.css?raw";
import type { ZTabPanel } from "../tab-panel/TabPanel.js";

/** id 前缀的自增源：同页多个 z-tabs 时 `aria-controls` 不能互相指错。 */
let TABS_SEQ = 0;

export class ZTabs extends BaseElement {  static styles = tabsCSS;

  @property({ type: Number }) active = 0;
  /**
   * 样式：下划线 / 胶囊 / 卡片（组件局部概念，不进 tone/appearance 词表）。
   *
   * [WHY 旧名 variant 是死属性] 2026-11-15 审计实测：`variant` 声明了却**从没被用** ——
   * 模板里没有拼 `z-tabs--${variant}`，CSS 里 `.z-tabs--pills` 那几条规则永远匹配不到。
   * 也就是说 `<z-tabs variant="pills">` 一直是静默无效的。这次改名同时把它接上：
   * 样式选择器改成 `:host([tab-style="…"])`，attribute 反射就能命中。
   */
  @property({ type: String }) tabStyle: "underline" | "pills" | "cards" = "underline";

  private _mo: MutationObserver | null = null;
  /** 本实例的 id 前缀：同页多个 z-tabs 时，aria-controls / id 不能撞。 */
  private _uid = `z-tabs-${++TABS_SEQ}`;
  /**
   * 「这次的 active 变化来自键盘/点击，重渲染后要把焦点放回选中的页签」。
   *
   * [WHY 需要它] render() 每次都用新节点重建整个 tablist，正在聚焦的那个 `<button>`
   * 随之被换掉 —— 浏览器把焦点退给 `<body>`。于是按 → 之后：页签换了一个、**焦点没了**，
   * 再按 → 落到的还是原来那个按钮（它已不存在），键盘用户会以为方向键只生效一次。
   */
  private _focusActiveTab = false;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] 2026-08-13：React 侧 panel label 变化（如「实体（0）」→「实体（3）」）不会触发
    // z-tabs 自身属性变化，lit 不会自动重建 tablist。用 MutationObserver 监听 children
    // 属性/增删，变化时 requestUpdate 重建 tab 按钮（本体管理页 Tab 计数联动）。
    this._mo = new MutationObserver(() => this.requestUpdate());
    this._mo.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ["label", "disabled"] });
  }

  disconnectedCallback(): void {
    this._mo?.disconnect();
    this._mo = null;
    super.disconnectedCallback();
  }

  /** 兼容读：旧名 `variant` 仍生效（此前它其实什么都不做）。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      if (value === "underline" || value === "pills" || value === "cards") this.tabStyle = value;
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }

  /** @deprecated 旧名 `variant` 的 JS 属性兼容层。 */
  get variant(): string {
    return this.getAttribute("variant") ?? "";
  }
  set variant(value: string) {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const panels = this._getPanels();
    const tabs = panels.map((panel, i) => ({
      label: panel.getAttribute("label") || panel.label || `Tab ${i + 1}`,
      disabled: panel.hasAttribute("disabled") || panel.disabled,
      index: i,
    }));

    const tablist = html`
      <div class="z-tabs__tablist z-tabs__tablist--${this.tabStyle}" role="tablist" part="tablist">
        ${tabs.map((tab) => {
          const isActive = tab.index === this.active && !tab.disabled;
          const tabCls = [
            "z-tabs__tab",
            isActive ? "z-tabs__tab--active" : "",
            tab.disabled ? "z-tabs__tab--disabled" : "",
          ].filter(Boolean).join(" ");

          return html`
            <button
              type="button"
              class="${tabCls}"
              role="tab"
              id="${this._uid}-tab-${tab.index}"
              aria-controls="${this._uid}-panel-${tab.index}"
              data-index="${tab.index}"
              aria-selected="${ariaBool(isActive)}"
              ${tab.disabled ? "disabled" : ""}
              tabindex="${isActive ? 0 : -1}"
              part="tab"
            >${escapeAttr(tab.label)}</button>
          `;
        }).join("")}
      </div>
    `;

    return html`${tablist}<div class="z-tabs__panels" part="panels"><slot></slot></div>`;
  }

  updated(): void {
    // Sync panel visibility + aria 关系
    const panels = this._getPanels();
    panels.forEach((panel, i) => {
      panel.hidden = i !== this.active;
      // [WHY 在宿主元素上补 role/id] 面板是宿主自己写的 `<z-tab-panel>`（light DOM），
      // 关系必须挂在它身上，不能挂在内部包一层。`aria-controls` 是 IDREF ——
      // 跨 shadow 解析不到（同 2026-11-15 那次 a11y 收口的核心判据），而 tab 在
      // 本组件的 shadow 里、panel 在 light DOM：**唯一能连上的写法是让 panel 带上 id
      // 与 role="tabpanel"**，由 tab 指过去。之前两边都没有 id，这条关系等于不存在，
      // 读屏只会念「页签，1/3」，念不出它控制的是哪块内容。
      panel.id = `${this._uid}-panel-${i}`;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", `${this._uid}-tab-${i}`);
    });

    // Bind tablist click
    const tablist = this.shadowRoot!.querySelector(".z-tabs__tablist");
    if (tablist && !(tablist as any).__eventsSetup) {
      tablist.addEventListener("click", this._onTabClick);
      tablist.addEventListener("keydown", this._onTabKey);
      (tablist as any).__eventsSetup = true;
    }

    // [WHY 重渲染后回焦] 见 _focusActiveTab 的注释：换选中项会重建按钮，焦点掉回 body。
    if (this._focusActiveTab) {
      this._focusActiveTab = false;
      this.shadowRoot!.querySelector<HTMLElement>(".z-tabs__tab--active")?.focus();
    }

    // Move indicator
    requestAnimationFrame(() => {
      const activeTab = this.shadowRoot!.querySelector(".z-tabs__tab--active") as HTMLElement;
      if (activeTab && tablist) {
        this.style.setProperty("--z-tabs-indicator-left", `${activeTab.offsetLeft}px`);
        this.style.setProperty("--z-tabs-indicator-width", `${activeTab.offsetWidth}px`);
      }
    });
  }

  private _getPanels(): ZTabPanel[] {
    return Array.from(this.querySelectorAll<ZTabPanel>("z-tab-panel"));
  }

  private _activateTab(index: number): void {
    const panels = this._getPanels();
    if (index < 0 || index >= panels.length) return;
    if (panels[index].disabled) return;

    const prev = this.active;
    // 只有「真的换了页签」才会重渲染（同值赋值 BaseElement 会跳过），也才需要回焦
    if (index !== prev) this._focusActiveTab = true;
    this.active = index;
    this.emit("z-change", { index, previous: prev });
  }

  private _onTabClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".z-tabs__tab");
    if (!btn || btn.hasAttribute("disabled")) return;
    const index = Number(btn.dataset.index);
    if (!isNaN(index)) this._activateTab(index);
  };

  private _onTabKey = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (!["ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(ke.key)) return;

    const tabs = this._getTabs();
    const enabled = tabs.filter((t) => !t.hasAttribute("disabled"));
    const current = tabs.findIndex((t) => t.classList.contains("z-tabs__tab--active"));

    let next = current;
    switch (ke.key) {
      case "ArrowRight":
        next = this._nextEnabled(tabs, current, 1);
        break;
      case "ArrowLeft":
        next = this._nextEnabled(tabs, current, -1);
        break;
      case "Home":
        next = enabled.length > 0 ? tabs.indexOf(enabled[0]) : current;
        break;
      case "End":
        next = enabled.length > 0 ? tabs.indexOf(enabled[enabled.length - 1]) : current;
        break;
      case "Enter":
      case " ":
        ke.preventDefault();
        if (current >= 0) this._activateTab(current);
        return;
    }

    if (next !== current && next >= 0) {
      ke.preventDefault();
      this._activateTab(next);
    }
  };

  private _nextEnabled(tabs: HTMLElement[], current: number, dir: number): number {
    const len = tabs.length;
    for (let i = 1; i < len; i++) {
      const idx = (current + dir * i + len) % len;
      if (!tabs[idx].hasAttribute("disabled")) return idx;
    }
    return current;
  }

  private _getTabs(): HTMLElement[] {
    return Array.from(this.shadowRoot!.querySelectorAll<HTMLElement>(".z-tabs__tab"));
  }

}

observeLegacyAttribute(ZTabs, "variant");

customElements.define("z-tabs", ZTabs);
