// [WHY] 2026-10-25 系统审计：浮层面板生命周期改由 FloatingPanelController 统一承载
// （原手写 body.appendChild + FloatingPosition + 文档 mousedown + animationend 清理）。
// [WHY] 2026-11-23 选项模型 / 面板渲染 / 一维键盘导航抽到 menu-panel.ts，与 z-context-menu 共用：
// 两份菜单此前各写一套激活项算法，写法一漂移就是「一个菜单能用键盘、另一个不能」。
// See: wiki/reference/component-implementation-standard.md
import { BaseElement, html, property, injectGlobalStyles, bindTriggerAria, defineElement } from "../../core/index.js";
import { FloatingPanelController, type Placement, FocusTrap } from "../../primitives/index.js";
import { MENU_PANEL_STYLES, MenuNav, readMenuEntries, renderMenuEntries } from "./menu-panel.js";

import menuCSS from "./menu.css?raw";

/** 选项 id 的自增源：面板每次打开重建，id 需要跨实例唯一（同页两个菜单各指各的）。 */
let MENU_SEQ = 0;

export class ZMenu extends BaseElement {
  static styles = menuCSS;
  @property({ type: Boolean }) open = false;
  @property({ type: String }) placement: Placement = "bottom-start";
  @property({ type: Number }) offset = 4;
  @property({ type: Boolean }) disabled = false;

  private _floating = this.addController(new FloatingPanelController(this));
  private _focusTrap: FocusTrap | null = null;
  private _nav: MenuNav | null = null;
  /** 面板独有的 id 前缀：同页可能有两个菜单，选项 id 撞了 activedescendant 会指到别人家。 */
  private _uid = "";

  /**
   * `aria-haspopup` / `aria-expanded` 要写在**消费者塞进来的那个可聚焦件**上。
   * 写在下面这个 `<span>` 槽容器上无障碍树不承认（2026-11-16 CDP 实测：
   * 塞进去的按钮 `role=button` 但没有 `hasPopup` / `expanded` 属性，span 在树里不出现）。
   */
  private _triggerAria = bindTriggerAria(
    () => this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]') ?? null,
    () => ({ hasPopup: "menu", expanded: this.open }),
  );

  render(): string {
    return html`
      <span class="z-menu__trigger" part="trigger">
        <slot name="trigger"></slot>
      </span>
      <div style="display:none"><slot></slot></div>
    `;
  }

  updated(): void {
    this._triggerAria.sync();
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectGlobalStyles("z-menu-panel", MENU_PANEL_STYLES);
    this.addEventListener("click", this._onHostClick);
  }

  disconnectedCallback(): void {
    this._closeDropdown();
    this._triggerAria.dispose();
    // [WHY] 关闭动画期间 open 已为 false，_closeDropdown 会提前返回；此处兜底摘除面板与监听，
    // 避免宿主被移除后 body 上残留浮层（审计 2026-10-25）
    this._floating.close(0);
    this.removeEventListener("click", this._onHostClick);
    super.disconnectedCallback();
  }

  /**
   * 判断事件是否来自「触发器」。
   *
   * [WHY] 不能用 `trigger.contains(e.target)`：触发器内容是 `<slot name="trigger">` 的**分配节点**，
   * 它们属于宿主 light DOM，并不是 span 的 DOM 后代 —— contains() 走 DOM 树，返回 false，
   * 于是「点 z-button 触发」完全没反应（2026-10-25 学员报障：demo 里菜单按钮点了不动）。
   *
   * [WHY] 也不用 `composedPath()` 或 `assignedSlot` 去补：happy-dom 两者都不可靠
   * （实测 composedPath 只有 [BUTTON, Z-MENU, …] 不含 SPAN，assignedSlot 直接是 null），
   * 只按浏览器行为写，单测就会永远绿、线下真实点击却是坏的 —— 那正是这个 bug 溜进来的方式。
   *
   * 判据落在**数据**上而不是渲染树：谁声明了 `slot="trigger"`，谁的点击就算点触发器。
   * 浏览器里点 z-button 内部时 target 会被重定向到 z-button（z-menu 的 light DOM 子节点），
   * 所以这条在真实环境同样成立；`trigger.contains` 只兜底「触发器槽是空的时候点那个 span」。
   */
  private _isFromTrigger(e: Event): boolean {
    const trigger = this.shadowRoot!.querySelector<HTMLElement>(".z-menu__trigger");
    if (!trigger) return false;

    const target = e.target as Node | null;
    if (!target) return false;
    if (trigger.contains(target)) return true;

    return Array.from(this.children).some(
      (child) =>
        child.getAttribute("slot") === "trigger" &&
        (child === target || child.contains(target)),
    );
  }

  private _onHostClick = (e: Event): void => {
    if (this.disabled) return;
    if (!this._isFromTrigger(e)) return;

    // 点触发器 = 切换（重新点击收起）。点外部由 mousedown 捕获负责关闭，
    // 点触发器自身落在宿主内不会被它关掉，所以收起必须在这里处理。
    if (this.open) this._closeDropdown();
    else this._openDropdown();
  };

  private _openDropdown(): void {
    if (this.open) return;

    const entries = readMenuEntries(this);
    this._uid = `z-menu-${++MENU_SEQ}`;

    const dd = this._floating.open(
      {
        panelClass: "z-menu__dropdown",
        hidingClass: "z-menu__dropdown--hiding",
        part: "dropdown",
        role: "menu",
        // [WHY] anchor 用 getter：open 触发重渲染替换 shadow 内 trigger，持旧引用滚动时定位读全 0（2026-09-10）
        // See: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
        anchor: () => this.shadowRoot!.querySelector<HTMLElement>(".z-menu__trigger"),
        placement: this.placement,
        offset: this.offset,
        onOutsideClose: () => this._closeDropdown(),
      },
      (panel) => {
        panel.innerHTML = renderMenuEntries(entries, this._uid);
      },
    );

    dd.addEventListener("click", (e) => {
      const itemEl = (e.target as HTMLElement).closest<HTMLElement>(".z-menu__item");
      if (!itemEl || itemEl.dataset.disabled === "true") return;
      this._selectItem(itemEl.dataset.value || "");
    });

    this._focusTrap = new FocusTrap({ container: dd });

    // [WHY] 必须显式把焦点搬进面板 —— 这是本组件键盘全死的根因。
    // 面板里的项是 `role="menuitem"` 的 div，不是可聚焦元素；FocusTrap 只会在
    // 「容器里有可聚焦件」时才抢焦点，于是焦点留在触发器上。而方向键 / Esc 的监听
    // 挂在**面板**上，焦点不在面板里 ⇒ keydown 根本不经过它，
    // 表现就是「菜单能点开、按什么键都没反应」，且界面上完全看不出异常。
    // 面板自带 tabindex="-1"（FloatingPanelController 给的），可以直接接焦点。
    dd.focus();

    // 激活项算法与两个菜单共用一份（menu-panel.ts），避免「一个能用键盘、一个不能」
    this._nav = new MenuNav(dd, {
      onPick: (value) => this._selectItem(value),
      onClose: () => this._closeDropdown(),
    });
    this._nav.reset();

    this.open = true;
    this.emit("z-menu-open");
  }

  private _closeDropdown(): void {
    if (!this.open) return;

    this._focusTrap?.destroy();
    this._focusTrap = null;
    this._nav?.destroy();
    this._nav = null;
    // [WHY] 控制器负责定位销毁 / 外部监听解绑 / hiding 动画与面板移除
    this._floating.close();

    this.open = false;
    this.emit("z-menu-close");
  }

  private _selectItem(value: string): void {
    this.emit("z-select", { value });
    this._closeDropdown();
  }

}

defineElement("z-menu", ZMenu);
