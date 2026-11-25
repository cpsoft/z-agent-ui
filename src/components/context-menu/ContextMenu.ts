// <z-context-menu> 光标坐标处的右键/长按菜单，键盘操作与 z-menu 共用同一套实现。
//
// [WHY] 2026-11-23 C1 缺口：右键菜单此前只有甘特自建的一份（`report/gantt/context-menu.ts`），
// 挂 body、`role="menu"`，但没有焦点管理、没有 aria-activedescendant、方向键完全失效 ——
// 读屏只会念「菜单」，用户按 ↓ 毫无反应。本组件把那 103 行收回来，走 FloatingPanelController，
// 选项模型与键盘导航复用 `menu-panel.ts`（与 z-menu 同一份实现）。
// See: wiki/reference/component-implementation-standard.md
import { BaseElement, property, injectGlobalStyles } from "../../core/index.js";
import { FloatingPanelController, type Placement, FocusTrap } from "../../primitives/index.js";
import { MENU_PANEL_STYLES, MenuNav, readMenuEntries, renderMenuEntries, type MenuEntry } from "../menu/menu-panel.js";
import contextMenuCSS from "./context-menu.css?raw";

/** 选项 id 的自增源：与 z-menu 各自的计数器分开，同页共存时 id 不会撞。 */
let CTX_SEQ = 0;

export interface ContextMenuItem {
  /** 选中后由 `z-pick` 带回的标识 */
  key: string;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}

export class ZContextMenu extends BaseElement {
  static styles = contextMenuCSS;

  /**
   * 菜单项（JS 宿主）。
   *
   * [WHY 还要 `options` 字符串] 纯 HTML 宿主（静态页 / SSR / AI 生成的脚本）配不了
   * 数组属性 —— 只有 `items` 等于把这一半宿主排除在外。两者合并到 `_entries()`，
   * 不存在两套真相。
   */
  @property({ type: Array, attribute: false }) items: ContextMenuItem[] = [];
  /**
   * 字符串入口：`key|Label[|flags]` 逗号分隔，单写 `-` 表示分隔线。
   * `flags` 用 `+` 连接：`danger` / `disabled`，如 `delete|删除|danger`。
   */
  @property({ type: String }) options = "";
  @property({ type: String }) placement: Placement = "bottom-start";
  /** 菜单与光标之间的间距。0 = 左上角正好压住光标（Windows 习惯），2 更易读。 */
  @property({ type: Number }) offset = 2;

  private _floating = new FloatingPanelController(this);
  private _focusTrap: FocusTrap | null = null;
  private _nav: MenuNav | null = null;
  private _uid = "";
  /** 打开前焦点在哪：关闭后要还回去，否则键盘用户被丢到 body。 */
  private _returnFocus: HTMLElement | null = null;
  private _onScroll: ((e: Event) => void) | null = null;

  /** 面板是否打开。 */
  get open(): boolean {
    return this._floating.isOpen;
  }

  connectedCallback(): void {
    super.connectedCallback();
    injectGlobalStyles("z-menu-panel", MENU_PANEL_STYLES);
  }

  disconnectedCallback(): void {
    this.hide();
    super.disconnectedCallback();
  }

  render(): string {
    // 宿主本身不显示任何东西；子元素只作为「声明式选项来源」被读取
    return "";
  }

  /** 选项：`items` 优先，其次 `options` 字符串，最后读 `<z-menu-item>` 子元素。 */
  private _entries(): MenuEntry[] {
    if (this.items.length > 0) {
      return this.items.map((it) => ({
        value: it.key,
        label: it.label,
        disabled: !!it.disabled,
        danger: !!it.danger,
        type: "item" as const,
      }));
    }
    if (this.options) {
      const out: MenuEntry[] = [];
      for (const raw of this.options.split(",")) {
        const token = raw.trim();
        if (!token) continue;
        if (token === "-") {
          out.push({ value: "", label: "", disabled: false, danger: false, type: "divider" });
          continue;
        }
        const [rawKey, rawLabel, rawFlags] = token.split("|");
        const key = rawKey.trim();
        if (!key) continue;
        const flags = (rawFlags ?? "").split("+").map((f) => f.trim());
        out.push({
          value: key,
          label: (rawLabel || key).trim(),
          disabled: flags.includes("disabled"),
          danger: flags.includes("danger"),
          type: "item",
        });
      }
      return out;
    }
    return readMenuEntries(this);
  }

  /**
   * 在视口坐标处弹出。
   *
   * [WHY 显式拒绝空菜单] 空面板会留在屏幕上、点不掉也看不出是什么。甘特那份是
   * `if (!actions.length) return`，语义保留。
   */
  showAt(x: number, y: number): void {
    const entries = this._entries();
    if (!entries.some((e) => e.type === "item")) return;

    // 重入：先拆掉上一份（含它的监听与导航）
    this._teardownPanel();

    this._uid = `z-ctx-${++CTX_SEQ}`;
    const active = document.activeElement;
    this._returnFocus = active instanceof HTMLElement && active !== document.body ? active : null;

    const panel = this._floating.open(
      {
        panelClass: "z-menu__dropdown",
        hidingClass: "z-menu__dropdown--hiding",
        part: "menu",
        role: "menu",
        ariaLabel: this.getAttribute("aria-label"),
        point: { x, y },
        placement: this.placement,
        offset: this.offset,
        onOutsideClose: () => this.hide(),
      },
      (el) => {
        el.innerHTML = renderMenuEntries(entries, this._uid);
      },
    );

    panel.addEventListener("click", this._onPanelClick);

    this._focusTrap = new FocusTrap({ container: panel });
    // 与 z-menu 同一条：焦点不进面板，面板上的 keydown 就永远收不到。
    //
    // [WHY preventScroll] 防御性：宿主若把面板开在视口边缘，浏览器会为了让焦点可见
    // 而滚动视口；那次滚动会被下面注册的「滚动即收起」当成用户滚动。
    // 注意它**不是**本次「菜单一按方向键就关掉」的根因 —— 那个在 `MenuNav._syncActive()`
    // 的 `scrollIntoView`（每次高亮切换都滚 window）。两处都已处理，别只留一处。
    panel.focus({ preventScroll: true });

    this._nav = new MenuNav(panel, {
      onPick: (key) => this._pick(key),
      onClose: () => this.hide(),
    });
    this._nav.reset();

    // [WHY 滚动即收起] 光标锚点没有「跟着元素走」的正确位置；重新定位只会让菜单
    // 悬在一块已经滚走的内容上。收起是右键菜单的通行行为，也避免面板与内容脱节。
    this._onScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (target && panel.contains(target)) return;
      this.hide();
    };
    window.addEventListener("scroll", this._onScroll, true);

    this.emit("z-open");
  }

  /** 收起菜单；焦点回到打开前的元素（若仍在文档里）。 */
  hide(): void {
    if (!this._floating.isOpen) return;
    this._teardownPanel();
    const back = this._returnFocus;
    this._returnFocus = null;
    if (back && back.isConnected) back.focus();
    this.emit("z-close");
  }

  private _onPanelClick = (e: Event): void => {
    const itemEl = (e.target as HTMLElement).closest<HTMLElement>(".z-menu__item");
    if (!itemEl || itemEl.dataset.disabled === "true") return;
    this._pick(itemEl.dataset.value || "");
  };

  private _pick(key: string): void {
    this.hide();
    this.emit("z-pick", { key });
  }

  /** 摘掉导航/焦点陷阱/滚动监听并关闭面板（不触发焦点恢复与事件）。 */
  private _teardownPanel(): void {
    const panel = this._floating.panel;
    if (panel) panel.removeEventListener("click", this._onPanelClick);
    this._nav?.destroy();
    this._nav = null;
    this._focusTrap?.destroy();
    this._focusTrap = null;
    if (this._onScroll) {
      window.removeEventListener("scroll", this._onScroll, true);
      this._onScroll = null;
    }
    this._floating.close();
  }
}

customElements.define("z-context-menu", ZContextMenu);
