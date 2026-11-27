// <z-rich-text> 富文本：value 为 HTML，toolbar 控制工具条，sanitize 决定是否净化，命令发 z-command。
// [WHY] 富文本编辑器 [[2026-08-11-W19-rich-text]] [2026-08-11] night-hawk:
// v1 用 document.execCommand（弃用但全浏览器支持）。核心约束（本批最大坑）：
// BaseElement 每次渲染整体替换 shadow.innerHTML（[[web-components-render-pitfalls]]
// 陷阱 2）→ 编辑区不能存在于 render 输出中，否则任何属性变更销毁编辑区。
// 方案：render 只输出静态 shell，编辑区 firstUpdated 一次性构建为持久节点，
// updated() 将其重新挂载进新 shell（re-parent 保内容保选区）。内部输入直写
// __zui_prop_value（slider 先例），外部赋值走 setter → requestUpdate → 覆盖
// innerHTML。lastRange 实例级保存选区（mousedown preventDefault 保焦点双保险）。
import { BaseElement, html, property, sanitizeHtml, escapeAttr, ariaBool, deepActiveElement, COPY, t, defineElement } from "../../core/index.js";
import { roveByKey } from "../../primitives/index.js";
import richTextCSS from "./rich-text.css?raw";

export interface ZRichTextToolbarItem {
  id: string;
  label: string;
  command?: string;
  value?: string;
  title?: string;
}

/**
 * 有「开/关」两态的命令 —— 只有它们能写 `aria-pressed`。
 *
 * [WHY 不能给所有按钮都写] `清除格式`（removeFormat）是一次性动作，写 `aria-pressed="false"`
 * 会让读屏把它念成一个「可以按下的开关」，用户按下去期待它保持按下。语义错了比没有更糟：
 * 没有至少是一个普通按钮，错了是一个说谎的开关。
 *
 * `formatBlock`（引用块）也不在里面：它的状态要用 `queryCommandValue` 跟具体块名比，
 * 跨浏览器口径不一，宁可先不给，也不要给一个偶尔为真的值。
 */
const STATEFUL_COMMANDS = new Set([
  "bold",
  "italic",
  "underline",
  "insertUnorderedList",
  "insertOrderedList",
]);

function defaultToolbar(): ZRichTextToolbarItem[] {
  return [
    { id: "bold", label: "B", command: "bold", title: t("bold") },
    { id: "italic", label: "I", command: "italic", title: t("italic") },
    { id: "underline", label: "U", command: "underline", title: t("underline") },
    { id: "ul", label: t("bulletListLabel"), command: "insertUnorderedList", title: t("unorderedList") },
    { id: "ol", label: t("numberedListLabel"), command: "insertOrderedList", title: t("orderedList") },
    { id: "quote", label: t("quoteLabel"), command: "formatBlock", value: "blockquote", title: t("blockquote") },
    { id: "clear", label: t("clearFormatting"), command: "removeFormat", title: t("clearFormatting") },
  ];
}


export class ZRichText extends BaseElement {
  static styles = richTextCSS;

  // [WHY] 全部 attribute:false：属性变更只走 JS setter，attribute→渲染路径
  // 不参与（编辑区持久化前提之一）
  @property({ attribute: false }) value = "";
  @property({ attribute: false }) placeholder = COPY.inputPlaceholder;
  @property({ type: Boolean, attribute: false }) readonly = false;
  @property({ type: Boolean, attribute: false }) disabled = false;
  // null = 默认工具栏；[] = 无工具栏
  @property({ attribute: false }) toolbar: ZRichTextToolbarItem[] | null = null;
  /**
   * 工具条的无障碍名称（`role="toolbar"` 的名字）。
   *
   * [WHY 是公开属性而不是写死 COPY] 库的文案约定是「中文基线 + 宿主可覆盖」
   * （见 core/copy.ts 顶部）。英文宿主必须能把它换成 "Formatting"，否则一块英文界面里
   * 只有一个中文的工具栏名 —— 那是读屏用户唯一能听到的部分。
   */
  @property({ type: String, attribute: "toolbar-label" }) toolbarLabel: string = COPY.formatToolbar;

  // [WHY] 富文本的 value 是 HTML，回填必然走 innerHTML —— 这使它成为库内唯一
  // 「属性值即标记」的组件，也就是存储型 XSS 的入口（业务把用户提交的富文本回填时）。
  // 默认装 sanitizeHtml：剥脚本/事件处理器/危险协议，保留 <b> <ul> <blockquote> 与内联 style
  // （execCommand 会产 style，不能一刀切）。需要原样信任的场景显式传 (h) => h 关闭。
  // 见 [[bug-20261025-xss-injection]]
  @property({ attribute: false })
  sanitize: ((html: string) => string) | null = sanitizeHtml;

  private _editor: HTMLDivElement | null = null;
  private _lastRange: Range | null = null;
  private _debounce: ReturnType<typeof setTimeout> | null = null;
  /** 工具条的 roving 停靠点（渲染时读它，键盘移动时写它） */
  private _rovingIndex = 0;

  private _toolbarItems(): ZRichTextToolbarItem[] {
    return this.toolbar ?? defaultToolbar();
  }

  render(): string {
    const items = this._toolbarItems();
    // [WHY 按钮的可访问名取 title 而不是文本] 默认工具条的文本是 "B" / "I" / "U" ——
    // 那是给眼睛看的缩写，读屏念出来是「B 按钮」。`title` 才是「粗体 / 斜体 / 下划线」。
    // 有文本内容时浏览器不会用 `title` 当名字（它退化成描述），所以必须显式写 `aria-label`。
    const toolbar = items.length
      ? `<div class="z-rt__toolbar" part="toolbar" role="toolbar" aria-label="${escapeAttr(this.toolbarLabel)}">${items
          .map((it, i) => {
            const name = it.title ?? it.label;
            // roving tabindex：整条工具条只占一个 Tab 停靠点，条内用方向键走。
            // [WHY 用 `_rovingIndex` 而不是恒取 0] 属性变化会整块重建工具条；
            // 若停靠点固定在第一格，用户停在「引用」时宿主改一次 value，焦点连同
            // 停靠点一起跳回「粗体」—— 而 `_rovingIndex` 会跟着他走。
            const tab = i === Math.min(this._rovingIndex, items.length - 1) ? "0" : "-1";
            const pressed = it.command && STATEFUL_COMMANDS.has(it.command)
              ? ` aria-pressed="false"`
              : "";
            return `<button type="button" class="z-rt__btn" data-id="${escapeAttr(it.id)}" data-command="${escapeAttr(it.command ?? "")}" data-value="${escapeAttr(it.value ?? "")}" title="${escapeAttr(name)}" aria-label="${escapeAttr(name)}" tabindex="${tab}"${pressed}${this.disabled ? " disabled" : ""}>${escapeAttr(it.label)}</button>`;
          })
          .join("")}</div>`
      : "";
    // [WHY] shell 恒定：toolbar 容器 + content 容器。编辑区不在 render 输出中
    return html`<div class="z-rt${this.disabled ? " z-rt--disabled" : ""}" part="root">${toolbar}<div class="z-rt__content" part="content"></div></div>`;
  }

  /** 编辑区一次性构建（首次渲染后），永不进渲染循环 */
  firstUpdated(): void {
    const content = this.shadowRoot!.querySelector(".z-rt__content");
    if (!content) return;
    const ed = document.createElement("div");
    ed.className = "z-rt__editor";
    // [WHY part 里带 field] 这是 core/a11y.ts 的「字段契约」：容器（z-form-item /
    // z-property-row）靠 `[part~="field"]` 找到控件的**主可聚焦件**，把 label 写成它的
    // aria-label。不带这个令牌时 `fieldOf()` 返回 null，名字永远送不进来 ——
    // 2026-11-16 真机实测：`<z-form-item label="正文"><z-rich-text>` 里的编辑区
    // 在 AX 树里 name 为空，读屏只会念「多行编辑框」。
    // 保留 `editor` 令牌是为了不让既有的 `::part(editor)` 外部样式失效。
    ed.setAttribute("part", "editor field");
    ed.setAttribute("contenteditable", "true");
    ed.setAttribute("role", "textbox");
    ed.setAttribute("aria-multiline", "true");
    ed.dataset.placeholder = this.placeholder;
    // [WHY 还要 aria-placeholder] `data-placeholder` 只喂给 CSS 的 `:empty::before`，
    // 是无障碍树里看不到的**纯视觉**占位符。空编辑区拿到焦点时读屏什么都不说，
    // 用户不知道这是要填什么的地方。aria-placeholder 才是能被称为「占位符」的那个。
    this._syncPlaceholderAttr(ed);
    ed.contentEditable = this.readonly || this.disabled ? "false" : "true";
    content.appendChild(ed);
    this._editor = ed;
    ed.addEventListener("input", this._onInput);
    ed.addEventListener("focus", () => this.emit("z-focus"));
    ed.addEventListener("blur", () => this.emit("z-blur"));
    // [WHY] 选区备份：工具栏 mousedown preventDefault 已保焦点，selectionchange
    // 双保险覆盖外部点击移焦后 exec 的场景
    document.addEventListener("selectionchange", this._onSelectionChange);
  }

  updated(): void {
    const ed = this._editor;
    if (!ed) return;
    // [WHY] re-parent：渲染整体替换 innerHTML 后编辑区被摘下，重新挂载进新
    // content 容器（同一节点，内容/选区/撤销栈不丢）
    const content = this.shadowRoot!.querySelector(".z-rt__content");
    if (content && ed.parentElement !== content) content.appendChild(ed);
    ed.contentEditable = this.readonly || this.disabled ? "false" : "true";
    ed.dataset.placeholder = this.placeholder;
    this._syncPlaceholderAttr(ed);
    // [WHY] 外部赋值覆盖；内部输入直写 store 与 innerHTML 一致 → 不覆盖
    if (ed.innerHTML !== this.value) {
      const next = this.sanitize ? this.sanitize(this.value) : this.value;
      if (next !== ed.innerHTML) ed.innerHTML = next;
    }
    // toolbar 按钮每次渲染重建 → 事件重绑；mousedown preventDefault 防移焦
    const tb = this.shadowRoot!.querySelector<HTMLElement>(".z-rt__toolbar");
    if (tb) {
      tb.addEventListener("mousedown", (e) => e.preventDefault());
      tb.addEventListener("click", this._onToolbarClick);
      tb.addEventListener("keydown", this._onToolbarKeydown);
      // 重建后按钮的 aria-pressed 回到初始 "false"，要按当前选区重新算一次
      this._syncPressed();
    }
  }

  /**
   * 占位符也要进无障碍树。
   *
   * [WHY] 可见占位符走 CSS `:empty::before { content: attr(data-placeholder) }`，
   * 那只是绘制 —— AX 树里没有任何东西。空编辑区拿到焦点时读屏只说「多行编辑框」。
   * `aria-placeholder` 才是会被念出来的那条；只在有内容时才有意义，空串时移除
   * （空值在 ARIA 里不是「没有」而是「有但为空」，会盖掉继承）。
   */
  private _syncPlaceholderAttr(ed: HTMLElement): void {
    if (this.placeholder) ed.setAttribute("aria-placeholder", this.placeholder);
    else ed.removeAttribute("aria-placeholder");
  }

  /**
   * 把「已按下」同步到工具条按钮上。
   *
   * [WHY 需要它] `aria-pressed` 不是渲染一次就完的状态：加粗是**选区属性**，
   * 光标一挪就变。原来这里连这个属性都没有，读屏只能念「粗体 按钮」，
   * 用户按下去之后无法知道它到底生效了没有 —— 而加粗在视觉上要盯着字重看才分辨得出。
   *
   * `queryCommandState` 是弃用 API，但它是唯一能在 execCommand 体系里读回状态的接口
   * （这套编辑器本来就建在 execCommand 上）。取不到就当未知：**不写**而不是写 false，
   * 免得把「读不到」伪装成「没加粗」。
   */
  private _syncPressed(): void {
    const tb = this.shadowRoot?.querySelector(".z-rt__toolbar");
    if (!tb) return;
    const canQuery = typeof (document as any).queryCommandState === "function";
    for (const btn of Array.from(tb.querySelectorAll<HTMLButtonElement>(".z-rt__btn"))) {
      const cmd = btn.dataset.command ?? "";
      if (!STATEFUL_COMMANDS.has(cmd)) continue;
      if (!canQuery) continue;
      let on: boolean;
      try {
        on = !!(document as any).queryCommandState(cmd);
      } catch {
        continue;
      }
      btn.setAttribute("aria-pressed", ariaBool(on));
    }
  }

  /**
   * 工具条内的方向键（ARIA APG toolbar 模式）。
   *
   * [WHY 必须做，而不是「按钮本来就能 Tab」] 七个按钮在 Tab 序列里就是七个停靠点：
   * 想从编辑区走到工具条后面那块内容，得穿过整条工具条。APG 的做法是工具条整体
   * 一个停靠点 + 条内方向键。这在这里尤其重要 —— 编辑器本身是个大目标区，
   * 键盘用户进出它的次数远多于其他控件。
   */
  private _onToolbarKeydown = (e: KeyboardEvent): void => {
    const tb = e.currentTarget as HTMLElement;
    const btns = Array.from(tb.querySelectorAll<HTMLButtonElement>(".z-rt__btn")).filter((b) => !b.disabled);
    if (btns.length === 0) return;
    // [WHY 必须穿透 shadow 取焦点] 按钮住在本组件的 shadow 里，`document.activeElement`
    // 拿到的是**宿主** `<z-rich-text>` —— `indexOf` 恒 -1，于是每一击方向键都从第一格
    // 重新开始（2026-11-16 真机冒烟实测：ArrowRight 之后焦点还在「粗体」上，
    // 停靠点也仍是 0-1-1-…）。这正是 z-tree 上踩过的同一个坑，见 core/a11y.ts。
    //
    // 移动本身交给 L0：工具条是「一维 + 水平 + 回绕」，与表头行是同一种移动。
    // 这里只剩两件上层的事：取当前项（要穿透 shadow），以及记录 `_rovingIndex`。
    const active = deepActiveElement() as HTMLButtonElement | null;
    const at = active ? btns.indexOf(active) : -1;
    const target = roveByKey(btns, at >= 0 ? btns[at] : null, e.key, { axis: "horizontal" });
    if (!target) return;
    e.preventDefault();
    // [WHY 还要记 `_rovingIndex`] 属性变化会整块重建工具条（render() 重跑），
    // 谁带 `tabindex="0"` 是渲染时算的；不记下来，下一次重渲染停靠点跳回「粗体」，
    // 而用户的焦点还停在「斜体」—— 于是 Tab 离开再回来会落到另一个按钮上。
    this._rovingIndex = btns.indexOf(target);
  };

  private _onInput = (): void => {
    const ed = this._editor;
    if (!ed) return;
    // [WHY] 清空后浏览器常留 <br>，:empty 占位符失效 → 归一为空串
    if ((ed.textContent ?? "").trim() === "") ed.innerHTML = "";
    this._syncValue();
  };

  private _onSelectionChange = (): void => {
    const ed = this._editor;
    if (!ed) return;
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    if (ed.contains(sel.anchorNode)) {
      this._lastRange = sel.getRangeAt(0).cloneRange();
      // 选区一变，「加粗中是哪一段」就变了 —— 按钮的 aria-pressed 要跟着走
      this._syncPressed();
    }
  };

  private _onToolbarClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>(".z-rt__btn");
    if (!btn || btn.hasAttribute("disabled")) return;
    const command = btn.dataset.command;
    if (command) this.exec(command, btn.dataset.value || undefined);
    else this.emit("z-command", { id: btn.dataset.id });
  };

  /** 直写 store + z-change（内部路径不触发渲染循环）；exec 等命令路径立即发 */
  private _syncValue(immediate = false): void {
    const ed = this._editor;
    const html = ed ? ed.innerHTML : "";
    (this as any).__zui_prop_value = html;
    if (immediate) {
      if (this._debounce) clearTimeout(this._debounce);
      this._debounce = null;
      this.emit("z-change", { value: html });
      return;
    }
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => {
      this._debounce = null;
      this.emit("z-change", { value: html });
    }, 150);
  }

  exec(command: string, value?: string): void {
    const ed = this._editor;
    if (!ed || this.readonly || this.disabled) return;
    ed.focus();
    // [WHY] 恢复备份选区（工具栏 preventDefault 后选区本就在编辑器内，双保险）
    if (this._lastRange) {
      const sel = document.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this._lastRange);
      }
    }
    if (typeof (document as any).execCommand === "function") {
      try {
        (document as any).execCommand(command, false, value);
      } catch {
        // [WHY] 部分命令在无选区/无内容时可能抛异常，忽略
      }
    }
    // 命令执行后状态位变了（加粗切到「已按下」）；selectionchange 在 DOM 变更后
    // 未必同步触发，这里直接补一次，免得键盘用户听到的还是旧状态
    this._syncPressed();
    this._syncValue(true);
  }

  getHTML(): string {
    return this._editor?.innerHTML ?? this.value;
  }

  getText(): string {
    return this._editor?.innerText ?? "";
  }

  focus(): void {
    this._editor?.focus();
    if (this._lastRange) {
      const sel = document.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(this._lastRange);
      }
    }
  }

  disconnectedCallback(): void {
    if (this._debounce) clearTimeout(this._debounce);
    document.removeEventListener("selectionchange", this._onSelectionChange);
    super.disconnectedCallback();
  }
}

defineElement("z-rich-text", ZRichText);
