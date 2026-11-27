// 跨应用切换器（2026-11-05）
//
// [WHY 提到公共组件] 四个宿主此前各写一套：zWorker / zagent 是「品牌名可点 → 下拉」，
// zEtl 是品牌名 + 前端硬编码的 emoji 表，zPlatform 干脆没有入口。同一批用户在同一天
// 会在四个系统之间跳，切换入口的位置、图标、点击手感各不相同 —— 属于「看起来各自都
// 能用，合起来不像一个产品」。契约（zauth 下发 icon/kind）已在 2026-11-05 统一，
// 本组件收掉 UI 层。
//
// 职责边界（有意划死）：
//   - 组件**不取数**。各宿主的清单接口路径与鉴权方式不同（/me/sso-apps、
//     /x/portal/apps、/api/portal/apps），且 zWorker 侧还带退避重试与 focus 补拉。
//     把这些搬进组件等于在组件里塞四套 iframe 判断，还要把宿主的 token 逻辑搬进来。
//   - 组件**不导航**。只派发 `z-switch`，宿主自己决定整页跳转 / 换票 / 新窗口。
//   - 组件**不弹 toast**。url 缺失时照样派发（detail.url 为空），由宿主提示。
//     组件吞掉事件会让「点了没反应」变得无法归因。
//
// 用法：
//   <z-app-switcher label="zWorker" current="zworker" .apps=${list}
//                   @z-switch=${(e) => (location.href = e.detail.url)} />
//   清单项形状：{ app, name?, icon?, url? }（与 zauth /portal/apps 一致）
import { BaseElement, html, property, COPY, defineElement } from "../../core/index.js";
import { resolveIndex } from "../../primitives/index.js";
import appSwitcherCSS from "./app-switcher.css?raw";
import { APP_ICONS, initialOf } from "./app-icons.js";

/**
 * HTML 转义（文本与属性共用一个实现）。
 *
 * [WHY 不用 core 的 escapeHtml/escapeAttr] 本组件要落到四份 vendored 副本上，而它们的
 * 基线不同：zagent 那份是 2026-08-23 的，**既没有 escapeHtml 也没有 escapeAttr**；
 * escapeAttr 本身是上游 2026-10-26 才加的。从 core 导入会让最老的那份在运行时
 * `undefined is not a function` —— 而且是在渲染时才炸。组件对副本的依赖收敛到
 * `BaseElement / html / property` 这三样四份都有的东西，比要求四份同时升级更可靠。
 *
 * 五个字符全转义后，同一个函数即可安全用于文本节点与带引号的属性值。
 */
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
function esc(value: string): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c]);
}

export interface AppSwitcherItem {
  app: string;
  name?: string;
  icon?: string;
  url?: string;
}

export class ZAppSwitcher extends BaseElement {
  static styles = appSwitcherCSS;

  /** 品牌名（触发钮上的文字）。 */
  @property({ type: String }) label = "";
  /** 当前应用码：菜单里对应项置灰并标「当前」，且不派发切换事件。 */
  @property({ type: String }) current = "";
  /**
   * 可切换应用清单。宿主一律用 property 传入（Vue 的 `:apps`、React 的 ref）。
   *
   * [WHY attribute: false] 与库内 15 处数组属性同一口径（chart.values、flow.edges、
   * timeline.items … 全部这么写）。不关掉 attribute 通道就会踩两次：
   *   ① 装饰器默认 reflect，数组反射成 attribute 就是 `[object Object]`；
   *   ② attributeChangedCallback 又把这个字符串写回 property —— 宿主传进来的数组
   *      被自己的 attribute 覆盖，下拉恒空。
   *      （② 的根因 2026-11-15 已在 BaseElement 修掉：两处共用 decorators 的
   *      `convertFromAttribute`，Array/Object 走 JSON 解析。`attribute: false` 因此只剩
   *      ① 与「数组属性的入口只有 property」这条 API 约定，不再是为了绕 bug。）
   * 实测路径：Vue 模板 `<z-app-switcher :apps="list">` 命中 `'apps' in el` 走 property，
   * 值当时是对的，下一帧就只剩字符串。这类「首屏对、随后变空」最难查。
   *
   * [WHY _items() 仍容忍字符串] 防御：调用方直接赋字符串（`el.apps = '[...]'`）时不至于
   * 渲染成空下拉，改为就地解析。
   */
  @property({ type: Array, attribute: false }) apps: AppSwitcherItem[] = [];
  /**
   * 面板的名字（`role="menu"` 的 `aria-label`）。
   *
   * [WHY 升成属性] 原先写死成中文常量，英文宿主换不掉 —— 而这是读屏进入面板时
   * 唯一听到的定位信息。同 `formatToolbar` 的处置（2026-11-16）。
   */
  @property({ type: String }) menuLabel = COPY.switchApp;
  /** 「当前」徽标文字。它同时进可访问名（读屏念「zWorker 当前」），所以也要能换。 */
  @property({ type: String }) currentLabel = COPY.currentApp;

  private _open = false;
  private _focusAfterUpdate: "first" | "trigger" | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // shadowRoot 在 constructor 里就建好了，且 innerHTML 整体替换不影响 root 上的监听
    this.shadowRoot?.addEventListener("click", this._onClick);
    // 点外部关闭：面板在 shadow 内，宿主文档上的点击只有组件自己知道是否落在自己身上
    document.addEventListener("mousedown", this._onDocDown, true);
    // Esc / 方向键：keydown 是 composed，从 shadow 内按钮冒泡到 host
    this.addEventListener("keydown", this._onKeydown);
  }

  disconnectedCallback(): void {
    this.shadowRoot?.removeEventListener("click", this._onClick);
    document.removeEventListener("mousedown", this._onDocDown, true);
    this.removeEventListener("keydown", this._onKeydown);
    super.disconnectedCallback();
  }

  /** 归一化清单：字符串（JSON）、非数组、缺 app 的项都就地丢掉。 */
  private _items(): AppSwitcherItem[] {
    const raw = this.apps as unknown;
    let list: unknown = raw;
    if (typeof raw === "string") {
      try {
        list = JSON.parse(raw);
      } catch {
        return [];
      }
    }
    if (!Array.isArray(list)) return [];
    return list.filter(
      (x): x is AppSwitcherItem =>
        !!x && typeof x === "object" && typeof (x as AppSwitcherItem).app === "string" && !!(x as AppSwitcherItem).app,
    );
  }

  private _isCurrent(item: AppSwitcherItem): boolean {
    const cur = (this.current || "").trim().toLowerCase();
    return !!cur && item.app.trim().toLowerCase() === cur;
  }

  private _nameOf(item: AppSwitcherItem): string {
    return (item.name || "").trim() || item.app;
  }

  private _iconHtml(iconName: string | undefined, fallbackText: string): string {
    const body = iconName ? APP_ICONS[iconName.trim()] : undefined;
    if (body) {
      return `<svg class="z-app-switcher__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
        aria-hidden="true" focusable="false">${body}</svg>`;
    }
    // 未知/未上报图标 → 名称首字（不画空白，见 app-icons.ts 的说明）
    return `<span class="z-app-switcher__icon z-app-switcher__icon--text" aria-hidden="true">${esc(
      initialOf(fallbackText),
    )}</span>`;
  }

  private _closeRestoreFocus(): void {
    this._open = false;
    this._focusAfterUpdate = "trigger";
    this.requestUpdate();
  }

  private _toggle(): void {
    const switchable = this._items().filter((i) => !this._isCurrent(i));
    if (!switchable.length) return; // 无可切应用：品牌名只是纯标题，不出空面板
    this._open = !this._open;
    this._focusAfterUpdate = this._open ? "first" : "trigger";
    this.requestUpdate();
  }

  private _pick(app: string): void {
    const item = this._items().find((i) => i.app === app);
    if (!item || this._isCurrent(item)) return;
    this._open = false;
    this._focusAfterUpdate = null;
    this.requestUpdate();
    // url 可能为空（应用注册了但没配入口）—— 照样派发，由宿主决定提示文案
    this.emit("z-switch", { app: item.app, name: this._nameOf(item), icon: item.icon || "", url: item.url || "" });
  }

  private _onClick = (e: Event): void => {
    const t = e.target as HTMLElement | null;
    if (t?.closest?.('[data-role="trigger"]')) {
      this._toggle();
      return;
    }
    const item = t?.closest?.("[data-app]") as HTMLElement | null;
    if (item?.dataset.app) this._pick(item.dataset.app);
  };

  private _onDocDown = (e: Event): void => {
    if (!this._open) return;
    const path = (e as MouseEvent).composedPath?.() ?? [];
    if (path.includes(this)) return;
    this._closeRestoreFocus();
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    // [WHY Tab 也要关] 面板在 shadow 里、不是模态，Tab 会正常离开组件 —— 但原来
    // 什么都不做，于是**焦点走了、面板还开着**，`aria-expanded` 一直挂着 "true"。
    // 2026-11-16 真机实测：在菜单项上按 Tab 后 `_open=true`、`expanded="true"`、
    // 面板仍在 DOM 里，而焦点已到 body —— 键盘用户回头看到一块没人管的浮层，
    // 读屏以为它还是展开的。这里**不** preventDefault：Tab 该去哪去哪，也不把焦点
    // 拽回触发钮（那会让人永远出不去）。
    if (e.key === "Tab" && this._open) {
      this._open = false;
      this._focusAfterUpdate = null;
      this.requestUpdate();
      return;
    }
    if (e.key === "Escape" && this._open) {
      e.stopPropagation();
      this._closeRestoreFocus();
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!this._open) {
        // 触发钮上按方向键应当展开并把焦点带进面板（原生 button 不会这么做）
        if ((e.target as HTMLElement)?.closest?.('[data-role="trigger"]')) {
          e.preventDefault();
          this._toggle();
        }
        return;
      }
      e.preventDefault();
      this._move(e.key === "ArrowDown" ? 1 : -1);
    }
  };

  private _move(step: 1 | -1): void {
    const sr = this.shadowRoot;
    if (!sr) return;
    const focusable = Array.from(sr.querySelectorAll<HTMLElement>('[data-role="item"]:not([disabled])'));
    if (!focusable.length) return;
    const at = focusable.indexOf(sr.activeElement as HTMLElement);
    // 越界回绕（按到底不该「没反应」），且焦点不在面板内时**顺着方向**进场：
    // ↓ 落到第一项、↑ 落到末项 —— 手写的 `at < 0 ? 0 : …` 两个方向都到第一项，
    // 用户在触发钮上按 ↑ 想「往上翻到最后一个应用」，结果跳到第一个。
    // 下标算术交给 L0（与树、菜单、下拉、单选组共用同一份边界策略）。
    const next = resolveIndex(focusable.length, at, step > 0 ? "next" : "prev");
    if (next < 0) return;
    focusable[next].focus();
  }

  updated(): void {
    const want = this._focusAfterUpdate;
    this._focusAfterUpdate = null;
    if (!want) return;
    const sr = this.shadowRoot;
    if (!sr) return;
    if (want === "trigger") {
      sr.querySelector<HTMLElement>('[data-role="trigger"]')?.focus();
    } else {
      sr.querySelector<HTMLElement>('[data-role="item"]:not([disabled])')?.focus();
    }
  }

  render(): string {
    const items = this._items();
    const switchable = items.filter((i) => !this._isCurrent(i));
    const canSwitch = switchable.length > 0;
    const brandIcon = items.find((i) => this._isCurrent(i))?.icon;

    const trigger = html`
      <button
        type="button"
        class="z-app-switcher__trigger${canSwitch ? " is-switchable" : ""}"
        part="trigger"
        data-role="trigger"
        aria-haspopup="menu"
        aria-expanded="${this._open ? "true" : "false"}"
        ${canSwitch ? "" : "disabled"}
      >
        ${this._iconHtml(brandIcon || "grid", this.label)}
        <span class="z-app-switcher__label">${esc(this.label)}</span>
        ${canSwitch ? '<span class="z-app-switcher__caret" aria-hidden="true">▾</span>' : ""}
      </button>
    `;

    if (!this._open) {
      return html`<div class="z-app-switcher" part="root">${trigger}</div>`;
    }

    const rows = items.map((it) => {
      const cur = this._isCurrent(it);
      const name = this._nameOf(it);
      return html`
        <button
          type="button"
          class="z-app-switcher__item${cur ? " is-current" : ""}"
          role="menuitem"
          data-role="item"
          data-app="${esc(it.app)}"
          aria-current="${cur ? "true" : "false"}"
          ${cur ? 'aria-disabled="true"' : ""}
        >
          ${this._iconHtml(it.icon, name)}
          <span class="z-app-switcher__item-name">${esc(name)}</span>
          ${cur ? `<span class="z-app-switcher__item-flag">${esc(this.currentLabel)}</span>` : ""}
        </button>
      `;
    });

    return html`
      <div class="z-app-switcher" part="root">
        ${trigger}
        <div class="z-app-switcher__menu" part="menu" role="menu" aria-label="${esc(this.menuLabel)}">${rows}</div>
      </div>
    `;
  }
}

defineElement("z-app-switcher", ZAppSwitcher);
