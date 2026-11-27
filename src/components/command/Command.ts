// [WHY] 命令面板 [[2026-08-11-W18-enterprise]] [2026-08-11] night-hawk:
// shadow overlay 固定居中（top 18%）+ FocusTrap + overlayManager 栈（Esc/滚动锁）。
// 过滤/导航直写列表 DOM 不走 requestUpdate —— 否则每击键重建 input 丢焦点。
// 不绑全局快捷键（应用职责,demo 演示 Ctrl+K wiring）。
import { BaseElement, COPY, html, property, t, escapeAttr, escapeHtml, defineElement } from "../../core/index.js";
import {
  FocusTrap,
  pushOverlay,
  removeOverlay,
  lockScroll,
  unlockScroll,
  listIntent,
  resolveIndex,
} from "../../primitives/index.js";
import commandCSS from "./command.css?raw";

/** 实例序号：同一页可能挂两个命令面板，`id` 撞了 `activedescendant` 会指到别人家。 */
let COMMAND_SEQ = 0;


export interface ZCommandItem {
  id: string;
  label: string;
  keywords?: string[];
  group?: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean;
}

export class ZCommand extends BaseElement {
  static styles = commandCSS;

  @property({ attribute: false }) items: ZCommandItem[] = [];
  @property({ type: String }) placeholder = COPY.commandPlaceholder;
  @property({ type: Boolean }) open = false;

  private _query = "";
  private _activeId: string | null = null;
  private _trap: FocusTrap | null = null;
  private _input: HTMLInputElement | null = null;
  /** 面板独有的 id 前缀（见 COMMAND_SEQ）。 */
  private _uid = "";

  render(): string {
    if (!this.open) return "";
    if (!this._uid) this._uid = `z-command-${++COMMAND_SEQ}`;
    // [WHY input 是 combobox 而不是纯 textbox] 它是「带建议列表的输入框」的载体：
    // `aria-autocomplete="list"` 说明建议来自列表、`aria-controls` 指向那个列表、
    // `aria-activedescendant` 指向列表里**当前高亮的那一项**。
    // 没有这三件，读屏用户打字时只能听到自己的输入 —— 而界面上高亮一直在跳。
    // 与 `z-code-editor` 的补全浮层是同一条规范（那一轮只修了代码编辑器）。
    //
    // `aria-expanded="true"` 在这里**合法**（`role=combobox` 要求它），
    // 与代码编辑器里 `role=textbox` 上刻意不写它不是矛盾：同样的属性在
    // 不同 role 上一个是必需、一个是非法。
    return html`<div class="z-command__overlay" part="overlay">
      <div class="z-command__panel" part="panel" role="dialog" aria-label="${escapeAttr(t("commandPalette"))}">
        <input class="z-command__input" part="input" placeholder="${escapeAttr(this.placeholder)}" value="${escapeAttr(this._query)}"
          aria-label="${escapeAttr(t("commandSearch"))}" role="combobox" aria-expanded="true" aria-autocomplete="list"
          aria-controls="${this._uid}-list" />
        <div class="z-command__list" part="list" id="${this._uid}-list" role="listbox" aria-label="${escapeAttr(t("commandResults"))}"></div>
      </div>
    </div>`;
  }

  updated(): void {
    if (!this.open) return;
    const overlay = this.shadowRoot!.querySelector<HTMLElement>(".z-command__overlay");
    const input = this.shadowRoot!.querySelector<HTMLInputElement>(".z-command__input");
    if (overlay && !overlay.dataset.bound) {
      overlay.dataset.bound = "";
      overlay.addEventListener("click", this._onOverlayClick);
    }
    // [WHY] input 每次 open 周期新建 → 节点引用重绑（[[web-components-render-pitfalls]] 陷阱 2）
    if (input && input !== this._input) {
      this._input = input;
      input.addEventListener("input", this._onInput);
      input.addEventListener("keydown", this._onInputKeydown);
    }
    if (!this._trap) {
      const panel = this.shadowRoot!.querySelector<HTMLElement>(".z-command__panel");
      if (panel) this._trap = new FocusTrap({ container: panel });
    }
    this._syncList();
  }

  private _filtered(): ZCommandItem[] {
    const q = this._query.trim().toLowerCase();
    if (!q) return this.items;
    return this.items.filter(
      (it) =>
        it.label.toLowerCase().includes(q) ||
        (it.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    );
  }

  /** 过滤结果 → 分组行 → 直写列表（不 requestUpdate,保 input 焦点） */
  private _syncList(): void {
    const list = this.shadowRoot!.querySelector<HTMLElement>(".z-command__list");
    if (!list) return;
    const filtered = this._filtered();
    if (filtered.length > 0 && !filtered.some((it) => it.id === this._activeId)) {
      this._activeId = filtered.find((it) => !it.disabled)?.id ?? null;
    }
    const groups: { name: string; items: ZCommandItem[] }[] = [];
    for (const it of filtered) {
      const g = it.group ?? "";
      const last = groups[groups.length - 1];
      if (!last || last.name !== g) groups.push({ name: g, items: [it] });
      else last.items.push(it);
    }
    const rows: string[] = [];
    let optIdx = 0;
    let activeElId: string | null = null;
    for (const g of groups) {
      // [WHY 分组标题是 presentation] listbox 的直接子元素只能是 option（或 group）。
      // 一个普通 div 夹在中间会打断「列表项」的连续性 —— 读屏在选项之间念一句裸文本，
      // 而 `aria-activedescendant` 的序号语义也会变得难以理解。
      if (g.name) rows.push(`<div class="z-command__group" role="presentation">${escapeAttr(g.name)}</div>`);
      for (const it of g.items) {
        const id = `${this._uid}-opt-${optIdx++}`;
        const active = it.id === this._activeId;
        if (active) activeElId = id;
        rows.push(
          `<div class="z-command__item${active ? " z-command__item--active" : ""}" id="${id}" role="option"` +
            ` aria-selected="${active ? "true" : "false"}"` +
            ` data-id="${escapeAttr(it.id)}" data-disabled="${it.disabled ? "1" : ""}"${it.disabled ? ' aria-disabled="true"' : ""}>` +
            (it.icon ? `<span class="z-command__icon">${it.icon}</span>` : "") +
            `<span class="z-command__label">${escapeAttr(it.label)}</span>` +
            (it.shortcut ? `<span class="z-command__shortcut">${escapeAttr(it.shortcut)}</span>` : "") +
            `</div>`
        );
      }
    }
    list.innerHTML = rows.join("") || `<div class="z-command__empty" role="presentation">${escapeHtml(t("noMatches"))}</div>`;
    list.querySelector(".z-command__item--active")?.scrollIntoView({ block: "nearest" });

    // [WHY 每次重建都要重写这一条] 列表是 `innerHTML` 直写的（不走 requestUpdate），
    // 选项的 `id` 每次都是新生成的 —— 不重写就指向一个已经不存在的节点，
    // 读屏会念「列表项」而不是当前项的名字，而视觉上高亮完全正常。
    const input = this.shadowRoot!.querySelector<HTMLInputElement>(".z-command__input");
    if (input) {
      if (activeElId) input.setAttribute("aria-activedescendant", activeElId);
      else input.removeAttribute("aria-activedescendant");
    }
  }

  private _onInput = (e: Event): void => {
    this._query = (e.target as HTMLInputElement).value;
    this._activeId = null;
    this._syncList();
  };

  private _onInputKeydown = (e: KeyboardEvent): void => {
    const key = e.key;

    // [WHY 一维移动交给 L0] 原来是手写取模（`idx >= len-1 ? 0 : idx+1` /
    // `idx <= 0 ? len-1 : idx-1`），且**只认 ↑↓** —— 命令面板动辄几十条，
    // 想跳到末条只能一路按下去。树的「可见节点序」、菜单的「可用项序」、
    // 下拉的「全集序」在 L0 里已经是同一套边界策略，这里没有理由再写第四份。
    //
    // 候选集是「可用项」（过滤后的 `!disabled`），与 `_activeId` 的查找口径一致。
    const intent = listIntent(key);
    if (intent) {
      e.preventDefault();
      const enabled = this._filtered().filter((it) => !it.disabled);
      if (enabled.length === 0) return;
      const at = enabled.findIndex((it) => it.id === this._activeId);
      const next = resolveIndex(enabled.length, at, intent);
      if (next < 0) return;
      this._activeId = enabled[next].id;
      this._syncList();
      return;
    }

    if (key === "Enter") {
      e.preventDefault();
      const item = this._filtered().find((it) => it.id === this._activeId && !it.disabled);
      if (item) this._select(item);
    } else if (key === "Escape") {
      // [WHY] Esc 由 overlayManager 文档级 handler 调 close(); 这里仅防默认（清输入/关窗行为）
      e.preventDefault();
    }
  };

  private _onOverlayClick = (e: Event): void => {
    // 点遮罩本体（非面板内）关闭
    if (e.target === e.currentTarget) {
      this.close();
      return;
    }
    const row = (e.target as HTMLElement).closest<HTMLElement>(".z-command__item");
    if (row && row.dataset.disabled !== "1") {
      const item = this.items.find((it) => it.id === row.dataset.id);
      if (item) this._select(item);
    }
  };

  private _select(item: ZCommandItem): void {
    this.emit("z-select", { item });
    this.close();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this._query = "";
    this._activeId = null;
    pushOverlay(this);
    lockScroll();
    this.requestUpdate();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this._activeId = null;
    this._trap?.destroy();
    this._trap = null;
    this._input = null;
    removeOverlay(this);
    unlockScroll();
    this.requestUpdate();
  }

  toggle(): void {
    this.open ? this.close() : this.show();
  }

  get closeOnEscape(): boolean {
    return this.open;
  }

  disconnectedCallback(): void {
    if (this.open) {
      this.open = false;
      this._trap?.destroy();
      this._trap = null;
      removeOverlay(this);
      unlockScroll();
    }
    super.disconnectedCallback();
  }
}

defineElement("z-command", ZCommand);
