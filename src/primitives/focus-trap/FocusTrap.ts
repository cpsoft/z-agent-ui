const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export interface FocusTrapOptions {
  container: HTMLElement;
  autoFocus?: boolean;
}

export class FocusTrap {
  private _container: HTMLElement;
  private _previousFocus: HTMLElement | null = null;
  private _onKeyDown: (e: KeyboardEvent) => void;

  constructor(options: FocusTrapOptions) {
    this._container = options.container;
    this._onKeyDown = this._handleKeyDown.bind(this);

    this._container.addEventListener("keydown", this._onKeyDown);

    if (options.autoFocus !== false) {
      this._trapFocus();
    }
  }

  activate(): void {
    this._trapFocus();
  }

  deactivate(): void {
    this._container.removeEventListener("keydown", this._onKeyDown);
    this._restoreFocus();
  }

  destroy(): void {
    this.deactivate();
  }

  private _getFocusable(): HTMLElement[] {
    // [WHY 两个判据取或] `offsetParent === null` 在浏览器里对应**两种**截然不同的情形：
    //   ① 元素或祖先 `display:none` —— 确实不可聚焦，应当跳过；
    //   ② 元素**自身**是 `position: fixed` —— 它是可见的，跳过它是错的
    //      （抽屉里那种 fixed 悬浮提交条、对话内 fixed 的关闭钮都属于这一类）。
    // 加 `getClientRects().length` 把 ② 救回来：可见的 fixed 元素有排版盒。
    //
    // [⚠ 本仓单测覆盖不到「过滤」这一步] 实测 happy-dom 的 `offsetParent` 返回 **undefined**
    // （不是 null），`undefined !== null` 恒为真 ⇒ 过滤在测试环境里**完全不起作用**，
    // 隐藏元素也会被当成可聚焦。所以 tests/unit/primitives/FocusTrap.test.ts 全绿只说明
    // Tab 循环逻辑对，不说明可见性过滤对；那一条只能在真浏览器里验。
    const visible = (el: HTMLElement) => el.offsetParent !== null || el.getClientRects().length > 0;

    // [WHY 要往嵌套的 shadow 里走] 容器里常见「最后一个可聚焦件是 z-button / z-input」。
    // 宿主自己不匹配 FOCUSABLE（它没有 tabindex，内部才是 `<button>`），于是它既不在
    // 列表里、按 Tab 从它内部的按钮出去时也匹配不到 `last` ⇒ preventDefault 不执行，
    // **焦点从对话框漏到页面上**。用原生 `<button>` 当末尾时恰好不漏，所以 demo 里
    // 看着一切正常 —— 这类「换个写法就坏」的缺陷只能靠下钻进 shadow 覆盖住。
    const collect = (root: ParentNode): HTMLElement[] => {
      const found: HTMLElement[] = [];
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
        if (el.shadowRoot) found.push(...collect(el.shadowRoot));
        if (el.matches(FOCUSABLE) && visible(el)) found.push(el);
      }
      return found;
    };
    return collect(this._container);
  }

  /**
   * 当前**真正**持有焦点的元素，穿透 shadow 边界。
   *
   * [WHY] `document.activeElement` 对「焦点在自定义元素内部」的情形返回的是**宿主**。
   * 直接用它做两件事都错：
   *   · 存成回焦目标 → 关掉对话框后调 `host.focus()`，而宿主默认不可聚焦
   *     ⇒ 焦点掉到 `<body>`，键盘用户回到页面开头（Tab 要重新按几十下）
   *   · 和 `first` / `last` 比较 → 永不相等，末项 Tab 时不 preventDefault
   *     ⇒ 焦点从对话框里漏出去（用 z-button 当关闭钮时就会漏，用原生 button 时正好不漏，
   *        所以「demo 里看着没问题」）
   * 逐层下钻拿到最内层节点，两处判断都回到同一个真实焦点上。
   */
  private _deepActive(): HTMLElement | null {
    let el = document.activeElement as HTMLElement | null;
    // 深度上限：正常 DOM 不会嵌套这么多层 shadow，纯粹防环
    for (let guard = 0; el && guard < 16; guard++) {
      const inner = (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot?.activeElement;
      if (!inner) break;
      el = inner as HTMLElement;
    }
    return el;
  }

  private _trapFocus(): void {
    this._previousFocus = this._deepActive();
    const focusable = this._getFocusable();
    if (focusable.length > 0) {
      const first = focusable[0];
      // If the current focus isn't inside the container, move to first
      if (!this._container.contains(document.activeElement)) {
        first.focus();
      }
    }
  }

  private _restoreFocus(): void {
    const prev = this._previousFocus;
    this._previousFocus = null;
    // [WHY 用 isConnected 而不是 body.contains] 焦点目标可能在 shadow 里，
    // `document.body.contains(node)` 对它同样为 false（虽然它其实还在文档里）。
    if (prev && prev.isConnected) prev.focus();
  }

  private _handleKeyDown(e: KeyboardEvent): void {
    if (e.key !== "Tab") return;

    const focusable = this._getFocusable();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    // 两个判据用两把尺子，不能混：
    //   · 「当前焦点在不在容器里」看宿主链（document.activeElement，被 shadow 重定向过才落得进 contain）
    //   · 「是不是第一/最后一个可聚焦件」看最内层真实节点（否则末项是 z-button 时永不相等 ⇒ 漏出去）
    const activeHost = document.activeElement;
    const activeDeep = this._deepActive();
    const outside = !this._container.contains(activeHost);

    if (e.shiftKey) {
      if (activeDeep === first || outside) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (activeDeep === last || outside) {
        e.preventDefault();
        first.focus();
      }
    }
  }
}
