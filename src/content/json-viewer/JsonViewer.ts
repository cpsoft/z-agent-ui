// [WHY] JSON 查看器 [[2026-08-11-W18-enterprise]] [2026-08-11] night-hawk:
// span 语法高亮递归渲染 + 展开/折叠（path 集合）+ z-copy + 行号。
// 只读 v1：无编辑、无流式解析（超大 JSON 由调用方截断）。
import { BaseElement, html, property, escapeAttr, escapeHtml, t, defineElement } from "../../core/index.js";
import jsonViewerCSS from "./json-viewer.css?raw";


export class ZJsonViewer extends BaseElement {
  static styles = jsonViewerCSS;

  @property({ attribute: false }) data: unknown = null;
  // [WHY] collapsed 是「默认折叠深度阈值」: 0 = 全部展开（非布尔,注意命名）
  @property({ type: Number }) collapsed = 0;
  @property({ type: Number }) maxDepth = 10;
  @property({ type: Boolean }) copyable = false;
  // [WHY] 多词属性显式 kebab（[[multiword-attribute-kebab]]）
  @property({ type: Boolean, attribute: "show-line-numbers" }) showLineNumbers = false;

  private _collapsedSet = new Set<string>();
  private _values = new Map<string, unknown>();
  private _row = 0;
  private _lines: string[] = [];

  render(): string {
    this._row = 0;
    this._lines = [];
    this._renderValue(this.data, "", 0);
    const rows = this._lines.map(
      (l) => `<div class="z-jv__row">${this.showLineNumbers ? `<span class="z-jv__line-no" aria-hidden="true">${this._lineNo()}</span>` : ""}${l}</div>`
    ).join("");
    return html`<div class="z-jv" part="root">${rows || `<div class="z-jv__empty">null</div>`}</div>`;
  }

  /**
   * 展开/折叠开关的 HTML。
   *
   * [WHY 用原生 `<button>` 而不是 `<span role="button">`] 原来写的是
   * `<span role="button" aria-expanded>` —— 它**自称按钮，却做不到按钮的基本能力**：
   * 没有 `tabindex` ⇒ 键盘永远聚焦不到；没有可访问名 ⇒ 读屏念的是内容 `▸`／`▾`，
   * 一个三角形符号。而 `aria-expanded` 写在一个不可达的元素上，等于没写。
   * 换成原生 `button` 之后，可聚焦、Enter/Space、role 三件事一次到位，
   * 不需要再手写 `role` 与键盘分支（少一处可能写错的地方）。
   *
   * [WHY 名字里带 path] 读屏用户在折叠态下只听到「展开 按钮」，不知道自己展开的是哪一层。
   * path 是这棵树里唯一能定位"你在哪"的信息（根容器給「根」）。
   */
  private _toggleHtml(path: string, expanded: boolean): string {
    const label = path || t("rootNode");
    const name = `${expanded ? t("collapse") : t("expand")} ${label}`;
    // data-focus-key：requestUpdate 会整体重建 shadow，开关节点被换掉 ⇒ 焦点掉到 <body>，
    // 于是**键盘只能展开一次**（与 z-radio-group 那轮同一个形态）。BaseElement 在重建后
    // 按这个 key 把焦点找回来；path 含引号/反斜杠时该机制会安全放弃（返回空选择器）。
    return (
      `<button type="button" class="z-jv__toggle" data-path="${escapeAttr(path)}"` +
      ` data-focus-key="jv-toggle:${escapeAttr(path)}"` +
      ` aria-expanded="${expanded ? "true" : "false"}" aria-label="${escapeAttr(name)}">` +
      `${expanded ? "▾" : "▸"}</button>`
    );
  }

  private _lineNo(): string {
    // [WHY] 行号须在 wrapper 展开前取号（渲染期间递增,展示行号 = 物理行,1 起）
    this._row++;
    return String(this._row);
  }

  private _rowLine(inner: string): void {
    this._lines.push(inner);
  }

  private _renderValue(value: unknown, path: string, depth: number): void {
    if (value === null) {
      this._rowLine(this._leaf(`<span class="z-jv__null">null</span>`, path, "null"));
      return;
    }
    // [WHY] 直接对 value 做 typeof（不先存局部变量）: 存进变量后 TS 无法再收窄 value 本体
    if (typeof value === "string") {
      this._rowLine(this._leaf(`<span class="z-jv__string">"${escapeAttr(value)}"</span>`, path, value));
      return;
    }
    if (typeof value === "number") {
      this._rowLine(this._leaf(`<span class="z-jv__number">${String(value)}</span>`, path, value));
      return;
    }
    if (typeof value === "boolean") {
      this._rowLine(this._leaf(`<span class="z-jv__boolean">${String(value)}</span>`, path, value));
      return;
    }
    if (Array.isArray(value)) {
      this._renderContainer(value as unknown[], path, depth, "[", "]");
      return;
    }
    if (typeof value === "object") {
      this._renderContainer(Object.keys(value as Record<string, unknown>), path, depth, "{", "}", value as Record<string, unknown>);
      return;
    }
    this._rowLine(this._leaf(`<span class="z-jv__null">${escapeAttr(String(value))}</span>`, path, value));
  }

  private _renderContainer(
    keysOrArray: unknown[],
    path: string,
    depth: number,
    openBrace: string,
    closeBrace: string,
    obj?: Record<string, unknown>
  ): void {
    const isArray = openBrace === "[";
    const n = keysOrArray.length;
    // [WHY] collapsed: 默认折叠深度阈值（0 = 不自动折叠）; maxDepth: 超深强制折叠
    const isCollapsed =
      this._collapsedSet.has(path) ||
      depth >= this.maxDepth ||
      (this.collapsed > 0 && depth >= this.collapsed);
    const indent = depth + 1;

    // [WHY] 空容器无内容可展开,内联渲染不带 toggle
    if (n === 0) {
      this._rowLine(`<span class="z-jv__brace">${openBrace}${closeBrace}</span>`);
      return;
    }

    if (isCollapsed) {
      this._rowLine(
        this._toggleHtml(path, false) +
        `<span class="z-jv__brace">${openBrace}</span>` +
        `<span class="z-jv__count">${escapeHtml(t("itemsShort", { count: n }))}</span>` +
        `<span class="z-jv__brace">${closeBrace}</span>`
      );
      return;
    }

    this._rowLine(
      this._toggleHtml(path, true) +
      `<span class="z-jv__brace">${openBrace}</span>`
    );
    for (let i = 0; i < n; i++) {
      const key = isArray ? String(i) : (keysOrArray[i] as string);
      const childPath = path ? `${path}.${key}` : key;
      const keySpan = isArray
        ? `<span class="z-jv__index">${key}</span><span class="z-jv__colon">: </span>`
        : `<span class="z-jv__key">"${escapeAttr(key)}"</span><span class="z-jv__colon">: </span>`;
      const child = obj ? obj[key] : (keysOrArray[i]);
      const childLines = this._collect(child, childPath, indent);
      childLines[0] = keySpan + childLines[0];
      for (const line of childLines) this._rowLine(line);
    }
    this._rowLine(`<span class="z-jv__brace">${closeBrace}</span>`);
  }

  /** 收集子值行（带缩进）,第一行由调用方加 key 前缀 */
  private _collect(value: unknown, path: string, depth: number): string[] {
    const saved = this._lines;
    this._lines = [];
    this._renderValue(value, path, depth);
    const out = this._lines;
    this._lines = saved;
    return out.map((l) => `<span class="z-jv__pad" style="--pad:${depth}"></span>${l}`);
  }

  private _leaf(htmlStr: string, path: string, value: unknown): string {
    if (this.copyable) this._values.set(path, value);
    const copy = this.copyable
      ? `<button type="button" class="z-jv__copy" data-copy="${path}" aria-label="${escapeAttr(t("copyPath", { path }))}"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg></button>`
      : "";
    return htmlStr + copy;
  }

  private _onClick = (e: Event): void => {
    const target = e.target as HTMLElement;
    const toggle = target.closest<HTMLElement>(".z-jv__toggle");
    if (toggle) {
      const p = toggle.dataset.path ?? "";
      if (this._collapsedSet.has(p)) this._collapsedSet.delete(p);
      else this._collapsedSet.add(p);
      this.requestUpdate();
      return;
    }
    if (this.copyable) {
      const copy = target.closest<HTMLElement>(".z-jv__copy");
      if (copy) {
        const p = copy.dataset.copy ?? "";
        this.emit("z-copy", { path: p, value: this._values.get(p) });
      }
    }
  };

  updated(): void {
    const root = this.shadowRoot!.querySelector(".z-jv");
    if (root) root.addEventListener("click", this._onClick);
  }

  private _collectPaths(value: unknown, path: string, out: string[]): void {
    if (value === null || typeof value !== "object") return;
    out.push(path);
    if (Array.isArray(value)) {
      value.forEach((v, i) => this._collectPaths(v, path ? `${path}[${i}]` : `[${i}]`, out));
    } else {
      for (const k of Object.keys(value as Record<string, unknown>)) {
        this._collectPaths((value as Record<string, unknown>)[k], path ? `${path}.${k}` : k, out);
      }
    }
  }

  expandAll(): void {
    this._collapsedSet.clear();
    this.requestUpdate();
  }

  collapseAll(): void {
    const paths: string[] = [];
    this._collectPaths(this.data, "", paths);
    this._collapsedSet = new Set(paths);
    this.requestUpdate();
  }
}

defineElement("z-json-viewer", ZJsonViewer);
