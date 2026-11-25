// [WHY] 2026-11-23 菜单面板的选项模型、渲染与一维键盘导航抽成共享行为：
// `z-menu`（元素锚点）与 `z-context-menu`（光标锚点）只有「怎么弹出来」不同，
// 「弹出来之后是什么、怎么用键盘走」是同一件事。此前甘特自建了一份 103 行的
// `div` 菜单，`role="menu"` 却没有焦点管理、没有 aria-activedescendant、
// 方向键完全失效 —— 同一能力两份实现，一份是对的，一份是残缺的。
// See: wiki/reference/component-implementation-standard.md（浮层必须走控制器）
import { listIntent, resolveIndex } from "../../primitives/index.js";
import { escapeAttr, ariaBool } from "../../core/index.js";

/** 菜单项：分隔线也占一个位置，保证「渲染顺序 = 数据顺序」，下标不会错位。 */
export interface MenuEntry {
  value: string;
  label: string;
  disabled: boolean;
  danger: boolean;
  type: "item" | "divider";
}

/**
 * 从 light DOM 的 `<z-menu-item>` 子元素读菜单项。
 *
 * [WHY 跳过 `slot="trigger"`] 触发器也是宿主子元素，之前一律按「非菜单项 = 分隔线」
 * 处理，于是带 light-DOM 触发器的菜单前面永远多一条 4px 横线 —— 谁都看不出它是 bug。
 */
export function readMenuEntries(host: Element): MenuEntry[] {
  return Array.from(host.children)
    .filter((child) => child.getAttribute("slot") !== "trigger")
    .map((child): MenuEntry => {
      if (child.tagName !== "Z-MENU-ITEM") {
        return { value: "", label: "", disabled: false, danger: false, type: "divider" };
      }
      const el = child as HTMLElement & { value: string; disabled: boolean; danger: boolean };
      return {
        value: el.value || el.textContent?.trim() || "",
        label: el.textContent?.trim() || "",
        disabled: !!el.disabled,
        danger: !!el.danger,
        type: "item",
      };
    })
    .filter((entry) => entry.type === "item" || entry.label === "");
}

/**
 * 渲染菜单面板内容。
 *
 * [WHY 每项都要有 id] 高亮是「视觉选中」，读屏靠面板上的 aria-activedescendant
 * 知道现在停在哪一项。没有 id 就只能二选一：要么不播报，要么把焦点搬来搬去。
 */
export function renderMenuEntries(entries: MenuEntry[], uid: string, prefix = "z-menu"): string {
  let out = "";
  let itemIdx = 0;
  for (const entry of entries) {
    if (entry.type === "divider") {
      out += `<div class="${prefix}__divider" role="separator"></div>`;
      continue;
    }
    const cls = [
      `${prefix}__item`,
      entry.disabled ? `${prefix}__item--disabled` : "",
      entry.danger ? `${prefix}__item--danger` : "",
    ]
      .filter(Boolean)
      .join(" ");
    out +=
      `<div class="${cls}" id="${uid}-opt-${itemIdx}" role="menuitem"` +
      ` data-value="${escapeAttr(entry.value)}" data-index="${itemIdx}"` +
      ` data-disabled="${ariaBool(entry.disabled)}" aria-disabled="${ariaBool(entry.disabled)}"` +
      `>${escapeAttr(entry.label)}</div>`;
    itemIdx++;
  }
  return out;
}

/** 一维移动的候选集：可用项。下标空间必须与 `_syncActive` 取元素时一致。 */
export interface MenuNavOptions {
  onPick: (value: string) => void;
  onClose: () => void;
  /** 菜单项类名前缀，与渲染保持同一份，避免两处各写一个字符串。 */
  prefix?: string;
}

/**
 * 面板内的一维键盘导航与高亮。
 *
 * [WHY 单独一个类而不是散在组件里] 两个菜单组件都要这套逻辑，而它的正确性全在
 * 「下标空间一致」这一件事上：`_index` 是**可用项**里的序号，取元素时若按全集
 * 下标取，一有禁用项就整体错位一格，表现为「高亮凭空消失一次」（视觉对、读屏错）。
 */
export class MenuNav {
  private _panel: HTMLElement;
  private _opts: Required<MenuNavOptions>;
  private _index = -1;

  constructor(panel: HTMLElement, opts: MenuNavOptions) {
    this._panel = panel;
    this._opts = { prefix: "z-menu", ...opts };
    panel.addEventListener("keydown", this._onKey);
  }

  /** 打开时调用：高亮落在第一个可用项；全禁用则无高亮（不替宿主决定）。 */
  reset(): void {
    this._index = this._enabled().length > 0 ? 0 : -1;
    this._syncActive();
  }

  destroy(): void {
    this._panel.removeEventListener("keydown", this._onKey);
    this._panel.removeAttribute("aria-activedescendant");
  }

  private _items(): HTMLElement[] {
    return Array.from(this._panel.querySelectorAll<HTMLElement>(`.${this._opts.prefix}__item`));
  }

  private _enabled(): HTMLElement[] {
    return this._items().filter((el) => el.dataset.disabled !== "true");
  }

  private _syncActive(): void {
    for (const el of this._items()) el.classList.remove(`${this._opts.prefix}__item--active`);
    const active = this._enabled()[this._index];
    if (!active) {
      this._panel.removeAttribute("aria-activedescendant");
      return;
    }
    active.classList.add(`${this._opts.prefix}__item--active`);
    this._panel.setAttribute("aria-activedescendant", active.id);
    this._scrollPanelTo(active);
  }

  /**
   * 让激活项在面板内可见 —— **只滚面板，不动页面**。
   *
   * [WHY 不用 scrollIntoView，2026-11-23 真机实测] `scrollIntoView` 会连带滚动**所有**
   * 可滚祖先，包括 window。而光标型菜单（`z-context-menu`）监听 `window` scroll 来做
   * 「滚动即收起」—— 于是键盘第一次按下 ↑↓，滚动事件就把菜单自己关掉了：
   * 面板从 DOM 消失、用户按方向键毫无反应，而 happy-dom 不实现滚动，单测全绿。
   * 只调面板自身的 `scrollTop` 没有这个副作用。
   */
  private _scrollPanelTo(active: HTMLElement): void {
    const panel = this._panel;
    // 内容不超出高度时不需要滚：绝大多少菜单走到这里就返回了
    if (panel.scrollHeight <= panel.clientHeight) return;
    const top = active.offsetTop;
    const bottom = top + active.offsetHeight;
    if (top < panel.scrollTop) panel.scrollTop = top;
    else if (bottom > panel.scrollTop + panel.clientHeight) {
      panel.scrollTop = bottom - panel.clientHeight;
    }
  }

  private _onKey = (e: Event): void => {
    const ke = e as KeyboardEvent;

    // ── 一维移动：↑↓ / Home / End 交给 L0（←→ 在这里必须是 null，留给子菜单语义） ──
    const intent = listIntent(ke.key);
    if (intent) {
      e.preventDefault();
      const count = this._enabled().length;
      // 全禁用时 resolveIndex 给 -1：这一下已被消费（面板外的容器不该再滚），但没有落点。
      const next = resolveIndex(count, this._index, intent);
      if (next >= 0) {
        this._index = next;
        this._syncActive();
      }
      return;
    }

    switch (ke.key) {
      case "Enter": {
        e.preventDefault();
        const el = this._enabled()[this._index];
        if (el && el.dataset.disabled !== "true") this._opts.onPick(el.dataset.value || "");
        break;
      }
      case "Escape":
        e.preventDefault();
        this._opts.onClose();
        break;
      case "Tab":
        // 菜单不合法的 tab 落点：不拦默认行为（焦点照常离开），只负责收起。
        this._opts.onClose();
        break;
    }
  };
}

/**
 * 菜单面板的公共视觉。light DOM 面板拿不到 shadow 样式，必须注入全局。
 *
 * [WHY 提到这里，而不是各组件各一份] 触发器型与光标型菜单的**面板**长得应当一模一样；
 * 分成两份就是「同一个菜单在两处圆角不同」的起点。两个组件因此共用同一组类名
 * （`z-menu__dropdown` / `z-menu__item`）—— 类名是内部实现，对外的样式入口是 `part`。
 * `__item--danger` 是本轮新增的一档（右键菜单要「删除」）。
 */
export const MENU_PANEL_STYLES = `
  .z-menu__dropdown {
    position: fixed;
    z-index: var(--z-z-dropdown);
    min-width: 160px;
    /* [WHY 限高] 长菜单（十几个项）原本会直接溢出视口底部，滚不到也点不到。
       限高后由面板自己滚，配合 MenuNav 的"只滚面板"才能成立。 */
    max-height: min(320px, calc(100vh - 16px));
    overflow-y: auto;
    padding: 4px;
    background: var(--z-color-popover);
    border: 1px solid var(--z-color-border);
    border-radius: var(--z-radius-md);
    box-shadow: var(--z-shadow-lg);
    font-family: var(--z-font-sans);
    outline: none;
    animation: z-menu-in var(--z-duration-normal) var(--z-ease-enter);
  }
  .z-menu__dropdown--hiding {
    animation: z-menu-out var(--z-duration-micro) var(--z-ease-exit) forwards;
  }
  @keyframes z-menu-in {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes z-menu-out {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.95); }
  }
  .z-menu__item {
    display: flex;
    align-items: center;
    padding: 5px 10px;
    font-size: var(--z-font-size-sm);
    color: var(--z-color-text);
    border-radius: var(--z-radius-sm);
    cursor: pointer;
    user-select: none;
    line-height: var(--z-line-height);
    transition: background var(--z-transition-fast);
  }
  .z-menu__item:hover,
  .z-menu__item--active {
    background: var(--z-color-gray-100);
  }
  .z-menu__item--disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .z-menu__item--disabled:hover {
    background: transparent;
  }
  .z-menu__item--danger {
    color: var(--z-color-danger);
  }
  .z-menu__item--danger:hover,
  .z-menu__item--danger.z-menu__item--active {
    background: var(--z-color-danger-soft);
  }
  .z-menu__divider {
    height: 1px;
    margin: 4px 6px;
    background: var(--z-color-border);
  }
`;
