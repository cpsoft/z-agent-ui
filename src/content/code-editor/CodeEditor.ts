// <z-code-editor> 代码编辑器：value 双向，language 定高亮，functions 与 completions 给补全，输入发 z-input。
// [WHY] 代码编辑器 [[REQ-017-code-editor]] [2026-09-25] night-hawk:
// textarea + pre 高亮 overlay 双层。核心约束同 RichText（[[web-components-render-pitfalls]]
// 陷阱 2）：BaseElement 整体替换 shadow.innerHTML → textarea（焦点/选区/IME/撤销栈
// 载体）绝不能进 render 输出，firstUpdated 一次性构建，updated() 重挂载。内部输入
// 直写 __zui_prop_value 绕过渲染循环（slider/RichText 先例），高亮层在 input 时经
// rAF 刷新，composition 期间跳过刷新保护中文 IME。键盘逻辑抽为纯函数导出供单测，
// 规避 happy-dom 合成选区怪癖。
import { BaseElement, html, property, ariaBool, COPY, defineElement } from "../../core/index.js";
import codeEditorCSS from "./code-editor.css?raw";
import { detectLanguage, highlightCode, type CodeLanguage } from "./highlight.js";
import {
  applyCompletion,
  defaultItems,
  filterItems,
  findCallContext,
  getWordPrefix,
  type CompletionItem,
} from "./autocomplete.js";

export interface KeyboardEditResult {
  text: string;
  selStart: number;
  selEnd: number;
}

const OPENERS: Record<string, string> = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
const CLOSERS = new Set([")", "]", "}"]);
const PAIRS = new Set(["()", "[]", "{}", '""', "''", "``"]);
const INDENT = "  ";

/** Tab / Shift+Tab：无选区插两空格；有选区按行整体缩进/反缩进。无可做动作返回 null */
export function indentSelection(text: string, selStart: number, selEnd: number, outdent: boolean): KeyboardEditResult | null {
  if (selStart === selEnd) {
    if (outdent) {
      // 反缩进当前行：删行首至多 2 个空白，光标跟随左移
      const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
      const removed = (/^[ \t]{1,2}/.exec(text.slice(lineStart))?.[0].length) ?? 0;
      if (removed === 0) return null;
      return {
        text: text.slice(0, lineStart) + text.slice(lineStart + removed),
        selStart: Math.max(lineStart, selStart - removed),
        selEnd: Math.max(lineStart, selEnd - removed),
      };
    }
    return { text: text.slice(0, selStart) + INDENT + text.slice(selEnd), selStart: selStart + INDENT.length, selEnd: selStart + INDENT.length };
  }
  // 选区路径：覆盖首行行首到 selEnd 所在行行尾（选区以 \n 结尾时不波及下一行）
  const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
  let end = text.indexOf("\n", selEnd);
  if (end === -1) end = text.length;
  if (selEnd > selStart && text[selEnd - 1] === "\n") end = selEnd - 1;
  const before = text.slice(0, lineStart);
  const after = text.slice(end);
  const lines = text.slice(lineStart, end).split("\n");
  let firstDelta = 0;
  let totalDelta = 0;
  const mapped = lines
    .map((line, i) => {
      if (outdent) {
        const removed = (/^[ \t]{1,2}/.exec(line)?.[0].length) ?? 0;
        if (i === 0) firstDelta = -removed;
        totalDelta -= removed;
        return line.slice(removed);
      }
      if (i === 0) firstDelta = INDENT.length;
      totalDelta += INDENT.length;
      return INDENT + line;
    })
    .join("\n");
  return {
    text: before + mapped + after,
    selStart: Math.max(lineStart, selStart + firstDelta),
    selEnd: Math.max(lineStart, selEnd + totalDelta),
  };
}

/**
 * 括号/引号自动配对与跳过：
 * - 开符号 + 有选区 → 包裹选区
 * - 开符号 + 光标后是行尾/空白/闭符号 → 插入配对，光标居中（词字符后不配对，避免 a"b 歧义）
 * - 输入闭符号且光标后恰为同符号 → 跳过
 * 其余返回 null（走浏览器默认插入）
 */
export function applyBracketPair(text: string, selStart: number, selEnd: number, key: string): KeyboardEditResult | null {
  const next = text[selEnd] ?? "";
  if (OPENERS[key]) {
    const close = OPENERS[key];
    if (selStart !== selEnd) {
      return {
        text: text.slice(0, selStart) + key + text.slice(selStart, selEnd) + close + text.slice(selEnd),
        selStart: selStart + 1,
        selEnd: selEnd + 1,
      };
    }
    if (next === "" || /\s/.test(next) || CLOSERS.has(next) || OPENERS[next]) {
      return { text: text.slice(0, selStart) + key + close + text.slice(selEnd), selStart: selStart + 1, selEnd: selStart + 1 };
    }
    return null;
  }
  if ((CLOSERS.has(key) || key === '"' || key === "'" || key === "`") && selStart === selEnd && next === key) {
    return { text, selStart: selEnd + 1, selEnd: selEnd + 1 };
  }
  return null;
}

/** Backspace 在空括号/引号对中间 → 双删。否则返回 null（默认删除） */
export function deletePairBackward(text: string, selStart: number, selEnd: number): KeyboardEditResult | null {
  if (selStart !== selEnd || selStart === 0) return null;
  const prev = text[selStart - 1];
  const next = text[selStart] ?? "";
  if (!PAIRS.has(prev + next)) return null;
  return {
    text: text.slice(0, selStart - 1) + text.slice(selStart + 1),
    selStart: selStart - 1,
    selEnd: selStart - 1,
  };
}

/** 回车自动缩进：继承当前行行首空白；在空对（如 {}）中间回车产出三行结构。非空选区返回 null（默认替换） */
export function autoIndent(text: string, selStart: number, selEnd: number): KeyboardEditResult | null {
  if (selStart !== selEnd) return null;
  const lineStart = text.lastIndexOf("\n", selStart - 1) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart, selStart))![0];
  const prev = text[selStart - 1] ?? "";
  const next = text[selStart] ?? "";
  if (OPENERS[prev] && next === OPENERS[prev]) {
    const inner = indent + INDENT;
    const insert = "\n" + inner + "\n" + indent;
    return {
      text: text.slice(0, selStart) + insert + text.slice(selStart),
      selStart: selStart + 1 + inner.length,
      selEnd: selStart + 1 + inner.length,
    };
  }
  const insert = "\n" + indent;
  return { text: text.slice(0, selStart) + insert + text.slice(selStart), selStart: selStart + insert.length, selEnd: selStart + insert.length };
}

/**
 * 补全列表的 id 序号。
 *
 * [WHY 只需要「同一棵树里唯一」] 列表与它的承载者（那个 textarea）都长在本组件的
 * shadow root 里，`aria-controls` / `aria-activedescendant` 是 IDREF，只在**同一棵树**
 * 内解析。用递增计数器而不是随机串：同一份快照重放时 id 稳定，真机冒烟可以直接
 * 断言某个 `#id` 存在，不必先把属性读回来再比。
 */
let acListSeq = 0;

export class ZCodeEditor extends BaseElement {
  static styles = codeEditorCSS;

  // [WHY] value 不反射 attribute：代码内容含换行/引号，attribute 回写噪声大（RichText 先例）
  @property({ attribute: false }) value = "";
  @property() language: CodeLanguage = "auto";
  @property({ type: Boolean }) readonly = false;
  @property() placeholder = "";
  @property({ type: Boolean }) wrap = false;
  // [WHY] 回调属性覆盖默认 tokenizer，预留外接高亮器（如 prism）扩展点
  @property({ attribute: false }) highlight?: ((code: string, lang: CodeLanguage) => string) | null = null;
  // [WHY] functions：宿主注册函数元数据（补全 + 参数提示共用）；completions：完全接管补全数据源
  @property({ attribute: false }) functions: CompletionItem[] = [];
  @property({ attribute: false }) completions?: ((code: string, caret: number) => CompletionItem[]) | null = null;

  private _textarea: HTMLTextAreaElement | null = null;
  private _popup: HTMLDivElement | null = null;
  /** 补全列表的 id（同树 IDREF 的目标） */
  private _acListId = `z-ce-ac-${++acListSeq}`;
  private _acItems: CompletionItem[] = [];
  private _acIndex = 0;
  private _acVisible = false;
  private _sigVisible = false;
  private _sig: { item: CompletionItem; paramIndex: number } | null = null;
  private _charWidth = 0;
  private _dirty = false;
  private _composing = false;
  private _refreshPending = false;
  private _rafId = 0;

  render(): string {
    // [WHY] shell 恒定：gutter + body(highlight pre + textarea 占位)。textarea 不在输出中
    const cls = ["z-ce"];
    if (this.readonly) cls.push("z-ce--readonly");
    if (this.wrap) cls.push("z-ce--wrap");
    return html`<div class="${cls.join(" ")}" part="root"><div class="z-ce__gutter" part="gutter" aria-hidden="true"></div><div class="z-ce__body"><pre class="z-ce__highlight" part="highlight" aria-hidden="true"><code></code></pre></div></div>`;
  }

  /** textarea 一次性构建（首次渲染后），永不进渲染循环 */
  firstUpdated(): void {
    const body = this.shadowRoot!.querySelector(".z-ce__body");
    if (!body) return;
    const ta = document.createElement("textarea");
    ta.className = "z-ce__textarea";
    // [WHY part 里带 field] core/a11y.ts 的字段契约：`z-form-item` / `z-property-row`
    // 靠 `[part~="field"]` 找主可聚焦件，把 label 写成它的 aria-label。只写
    // `part="textarea"` 时 `fieldOf()` 返回 null —— 2026-11-16 真机实测：
    // `<z-form-item label="代码"><z-code-editor>` 的文本域在 AX 树里 name 为空。
    // 保留 `textarea` 令牌是为了不让外部 `::part(textarea)` 样式失效。
    ta.setAttribute("part", "textarea field");
    // [WHY 补全要 declare 成「自动补全列表」] 否则这个浮层在无障碍树里是一堆裸 div：
    // 打字时它冒出来、方向键在里头走，读屏全程一个字都不说 —— 而视觉上光标确实
    // 在一条条建议上跳。`aria-autocomplete` 让读屏知道「会有建议随输入更新」，
    // `aria-controls` + `aria-activedescendant` 才把「当前是哪一条」这条信息接上。
    ta.setAttribute("aria-autocomplete", "list");
    ta.setAttribute("aria-controls", this._acListId);
    ta.spellcheck = false;
    ta.setAttribute("autocapitalize", "off");
    ta.setAttribute("autocomplete", "off");
    ta.setAttribute("autocorrect", "off");
    ta.value = this.value;
    body.appendChild(ta);
    this._textarea = ta;
    ta.addEventListener("input", this._onInput);
    ta.addEventListener("keydown", this._onKeydown);
    ta.addEventListener("scroll", this._onScroll);
    ta.addEventListener("focus", () => this.emit("z-focus"));
    ta.addEventListener("blur", this._onBlur);
    ta.addEventListener("compositionstart", () => {
      this._composing = true;
    });
    ta.addEventListener("compositionend", () => {
      this._composing = false;
      // [WHY] composition 期间挂起的刷新在组字结束后补刷一次
      if (this._refreshPending) {
        this._refreshPending = false;
        this._scheduleRefresh();
      }
      this._updateAutocomplete();
    });
    // 补全/参数提示浮层（与 textarea 同为持久节点，updated() 一并重挂载）
    const popup = document.createElement("div");
    popup.className = "z-ce__popup";
    popup.setAttribute("part", "popup");
    popup.id = this._acListId;
    popup.addEventListener("mousedown", (e) => {
      // [WHY] preventDefault 保住 textarea 焦点，否则 blur 先行隐藏浮层
      e.preventDefault();
      const item = (e.target as HTMLElement).closest<HTMLElement>(".z-ce__item");
      if (item) this._acceptCompletion(Number(item.dataset.idx));
    });
    body.appendChild(popup);
    this._popup = popup;
  }

  updated(): void {
    const ta = this._textarea;
    if (!ta) return;
    // [WHY] re-parent：渲染整体替换 innerHTML 后 textarea 被摘下，重新挂载进新
    // body 容器（同一节点：内容/选区/焦点/撤销栈不丢）
    const body = this.shadowRoot!.querySelector(".z-ce__body");
    if (body && ta.parentElement !== body) body.appendChild(ta);
    // [WHY] 补全浮层同为持久节点，一并重挂载
    if (this._popup && body && this._popup.parentElement !== body) body.appendChild(this._popup);
    ta.readOnly = this.readonly;
    ta.placeholder = this.placeholder;
    // [WHY] wrap=off 关闭软换行保证水平滚动；wrap 类隐藏 gutter（REQ-017）
    ta.setAttribute("wrap", this.wrap ? "soft" : "off");
    // [WHY] 外部赋值覆盖；内部输入直写 store 与 ta.value 一致 → 不覆盖（防抖动选区）
    if (ta.value !== this.value) ta.value = this.value;
    this._refresh();
  }

  private _resolveLang(code: string): CodeLanguage {
    return this.language === "auto" ? detectLanguage(code) : this.language;
  }

  /** 重建高亮层与行号 gutter，并同步滚动位置 */
  private _refresh(): void {
    const ta = this._textarea;
    if (!ta) return;
    const shadow = this.shadowRoot!;
    const codeEl = shadow.querySelector(".z-ce__highlight code");
    if (codeEl) {
      const fn = this.highlight ?? highlightCode;
      // [WHY] 尾部补 \n：末行与 textarea 的可滚动高度一致，滚到底不留缝
      codeEl.innerHTML = fn(this.value, this._resolveLang(this.value)) + "\n";
    }
    const gutter = shadow.querySelector(".z-ce__gutter");
    if (gutter) {
      const count = this.value.split("\n").length;
      const cur = gutter.childElementCount;
      if (cur !== count) {
        let out = "";
        for (let i = 1; i <= count; i++) out += `<span>${i}</span>`;
        gutter.innerHTML = out;
      }
      gutter.scrollTop = ta.scrollTop;
    }
    const pre = shadow.querySelector<HTMLElement>(".z-ce__highlight");
    if (pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
  }

  // [WHY] rAF 合并连续击键的高亮重建；composition 期间挂起（ime 稳定），end 后补刷
  private _scheduleRefresh(): void {
    if (this._composing) {
      this._refreshPending = true;
      return;
    }
    cancelAnimationFrame(this._rafId);
    this._rafId = requestAnimationFrame(() => {
      this._rafId = 0;
      this._refresh();
    });
  }

  private _onInput = (): void => {
    const ta = this._textarea;
    if (!ta) return;
    // [WHY] 内部路径直写私有存储，不走 setter → 不触发渲染循环（slider/RichText 先例）
    (this as any)["__zui_prop_value"] = ta.value;
    this._dirty = true;
    this.emit("z-input", { value: ta.value });
    this._scheduleRefresh();
    // [WHY] 组字期间不动浮层（IME 稳定），compositionend 统一补一次
    if (!this._composing) this._updateAutocomplete();
  };

  /** 输入后的浮层决策：括号内优先参数提示，否则按词前缀自动弹补全 */
  private _updateAutocomplete(): void {
    this._updateSignature();
    if (!this._sigVisible) this._showCompletions(false);
  }

  private _onScroll = (): void => {
    const ta = this._textarea;
    if (!ta) return;
    // [WHY] 滚动即隐藏浮层：v1 不做滚动跟随，避免错位
    this._hidePopup();
    const shadow = this.shadowRoot!;
    const pre = shadow.querySelector<HTMLElement>(".z-ce__highlight");
    if (pre) {
      pre.scrollTop = ta.scrollTop;
      pre.scrollLeft = ta.scrollLeft;
    }
    const gutter = shadow.querySelector<HTMLElement>(".z-ce__gutter");
    if (gutter) gutter.scrollTop = ta.scrollTop;
  };

  private _onBlur = (): void => {
    this.emit("z-blur");
    this._hidePopup();
    // [WHY] z-change 语义 = 失焦提交（REQ-017）：仅在输入发生过（dirty）时发一次
    if (this._dirty) {
      this._dirty = false;
      this.emit("z-change", { value: this._textarea?.value ?? this.value });
    }
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    const ta = this._textarea;
    if (!ta || this.readonly || e.isComposing) return;
    // [WHY] 补全浮层键盘优先于编辑键：导航/接受/关闭；Ctrl+Space 强制弹出
    if (e.key === "Escape" && (this._acVisible || this._sigVisible)) {
      e.preventDefault();
      this._hidePopup();
      return;
    }
    if (this._acVisible) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._navigateAc(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        this._navigateAc(-1);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        this._acceptCompletion();
        return;
      }
    }
    if (e.ctrlKey && !e.metaKey && !e.altKey && (e.key === " " || e.code === "Space")) {
      e.preventDefault();
      this._showCompletions(true);
      return;
    }
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    let res: KeyboardEditResult | null = null;
    if (e.key === "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      res = indentSelection(ta.value, start, end, e.shiftKey);
    } else if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      res = autoIndent(ta.value, start, end);
    } else if (e.key === "Backspace" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      res = deletePairBackward(ta.value, start, end);
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      res = applyBracketPair(ta.value, start, end, e.key);
    }
    if (!res) return;
    e.preventDefault();
    // [WHY] 手动改 value 会截断浏览器原生撤销栈——v1 已知边界，后续可引入 undo 命令栈
    ta.value = res.text;
    ta.selectionStart = res.selStart;
    ta.selectionEnd = res.selEnd;
    this._onInput();
  };

  // ── 自动补全 / 参数提示浮层 ──────────────────────────────

  /** 补全数据源：completions 回调完全接管，否则 functions 注册表 + 内置（关键字+文档词） */
  private _resolveItems(): CompletionItem[] {
    const ta = this._textarea!;
    if (this.completions) return this.completions(ta.value, ta.selectionStart ?? 0) ?? [];
    return [...this.functions, ...defaultItems(ta.value, this._resolveLang(ta.value))];
  }

  private _showCompletions(force: boolean): void {
    const ta = this._textarea;
    if (!ta || this.readonly) {
      this._hidePopup();
      return;
    }
    const caret = ta.selectionStart ?? 0;
    const prefix = getWordPrefix(ta.value, caret);
    const items = filterItems(this._resolveItems(), prefix);
    if (!force && (items.length === 0 || !prefix)) {
      this._hidePopup();
      return;
    }
    this._acItems = items;
    this._acIndex = 0;
    this._acVisible = true;
    this._sigVisible = false;
    const popup = this._popup!;
    popup.className = "z-ce__popup";
    // 列表语义（与承载者同一棵树，IDREF 才解析得到）
    popup.setAttribute("role", "listbox");
    popup.setAttribute("aria-label", COPY.suggestions);
    popup.innerHTML = items
      .map(
        (it, i) =>
          `<div class="z-ce__item${i === 0 ? " z-ce__item--active" : ""}" role="option" id="${this._acOptionId(i)}" aria-selected="${ariaBool(i === 0)}" data-idx="${i}"><span class="z-ce__item-label">${it.label}</span>${it.detail ? `<span class="z-ce__item-detail">${it.detail}</span>` : ""}${it.kind ? `<span class="z-ce__item-kind">${it.kind}</span>` : ""}</div>`
      )
      .join("");
    this._placePopup();
    this._syncActiveDescendant();
  }

  /** 第 i 条建议的 DOM id —— `aria-activedescendant` 的目标，必须在同一棵树里 */
  private _acOptionId(i: number): string {
    return `${this._acListId}-opt-${i}`;
  }

  /**
   * 把「当前高亮的是哪一条」写进无障碍树。
   *
   * [WHY 这是这套补全能不能被读屏用起来的**全部**] 高亮原本只体现为
   * `.z-ce__item--active` 一个 class —— 那是纯视觉的。方向键在建议之间移动时，
   * 读屏没有任何可读的东西（焦点始终在 textarea 上，不会进到列表里）。
   * `aria-activedescendant` 是「焦点不动、但当前项在别处」的唯一表达方式。
   *
   * 列表关闭时必须**删掉**：留着指向一个 `display:none` 的节点，读屏会念一个
   * 已经不在的建议名，而用户按回车却什么也没插进去。
   */
  private _syncActiveDescendant(): void {
    const ta = this._textarea;
    if (!ta) return;
    if (this._acVisible && this._acItems.length > 0) {
      ta.setAttribute("aria-activedescendant", this._acOptionId(this._acIndex));
    } else {
      ta.removeAttribute("aria-activedescendant");
    }
  }

  private _updateSignature(): void {
    const ta = this._textarea;
    if (!ta) return;
    const ctx = findCallContext(ta.value, ta.selectionStart ?? 0);
    const item = ctx ? this._resolveItems().find((i) => i.label === ctx.name && i.params?.length) : undefined;
    if (!ctx || !item) {
      this._sig = null;
      if (this._sigVisible) this._hidePopup();
      return;
    }
    this._sig = { item, paramIndex: Math.min(ctx.paramIndex, Math.max(0, item.params!.length - 1)) };
    this._sigVisible = true;
    this._acVisible = false;
    const popup = this._popup!;
    popup.className = "z-ce__popup z-ce__popup--sig";
    // [WHY 这里换成 tooltip 而不是沿用 listbox] 参数提示是「告诉你这个函数要几个参数」，
    // 不是一个可以上下选的列表。留成 listbox 会让读屏说「列表，2 项」，
    // 而按方向键什么都不会选。tooltip 是它的真实语义。
    // 它故意不进 `aria-describedby`：内容随每次击键变化，挂上去会让读屏反复念
    // 整条签名，比不说话更糟。
    popup.setAttribute("role", "tooltip");
    popup.removeAttribute("aria-label");
    const params = item.params!.map(
      (p, i) => `<span class="z-ce__sig-param${i === this._sig!.paramIndex ? " z-ce__sig-param--active" : ""}">${p}</span>`
    );
    popup.innerHTML = `<div class="z-ce__sig"><span class="z-ce__sig-name">${item.label}</span>(${params.join('<span class="z-ce__sig-sep">, </span>')})</div>${item.desc ? `<div class="z-ce__sig-desc">${item.desc}</div>` : ""}`;
    this._placePopup();
    // 刚把补全列表换掉了，承载者上的 activedescendant 必须一起撤
    this._syncActiveDescendant();
  }

  private _navigateAc(delta: number): void {
    const n = this._acItems.length;
    if (!n) return;
    this._acIndex = Math.min(n - 1, Math.max(0, this._acIndex + delta));
    const popup = this._popup!;
    popup.querySelectorAll(".z-ce__item").forEach((el, i) => {
      const on = i === this._acIndex;
      el.classList.toggle("z-ce__item--active", on);
      // 高亮的**语义**要和视觉一起走，否则读屏与眼睛是两套真相
      el.setAttribute("aria-selected", ariaBool(on));
      if (on) {
        const item = el as HTMLElement;
        if (item.offsetTop < popup.scrollTop) popup.scrollTop = item.offsetTop;
        else if (item.offsetTop + item.offsetHeight > popup.scrollTop + popup.clientHeight) {
          popup.scrollTop = item.offsetTop + item.offsetHeight - popup.clientHeight;
        }
      }
    });
    this._syncActiveDescendant();
  }

  private _acceptCompletion(idx = this._acIndex): void {
    const ta = this._textarea;
    const item = this._acItems[idx];
    if (!ta || !item) return;
    const res = applyCompletion(ta.value, ta.selectionStart ?? 0, item);
    ta.value = res.text;
    ta.selectionStart = res.selStart;
    ta.selectionEnd = res.selEnd;
    this._hidePopup();
    // [WHY] 走统一输入路径：写 store/发事件/刷新；函数项落在括号内自动弹参数提示
    this._onInput();
  }

  private _hidePopup(): void {
    this._acVisible = false;
    this._sigVisible = false;
    this._acItems = [];
    if (this._popup) this._popup.style.display = "none";
    // 指向一个已经隐藏的节点 = 读屏念一条不存在的建议；必须一起撤
    this._syncActiveDescendant();
  }

  // [WHY] 光标像素定位：monospace 下字符等宽，canvas 量一次字宽；按行列与 scrollTop
  // 推算光标位置，底部放不下翻转到光标行上方（happy-dom 无 canvas，量宽退化为 8px）
  private _placePopup(): void {
    const ta = this._textarea;
    const popup = this._popup;
    const body = this.shadowRoot?.querySelector<HTMLElement>(".z-ce__body");
    if (!ta || !popup || !body) return;
    if (!this._charWidth) {
      const cs = getComputedStyle(ta);
      const ctx = document.createElement("canvas").getContext("2d");
      this._charWidth = ctx ? ctx.measureText("0".repeat(100)).width / 100 : 8;
      if (!this._charWidth || Number.isNaN(this._charWidth)) this._charWidth = 8;
      void cs;
    }
    const before = ta.value.slice(0, ta.selectionStart ?? 0);
    const lineIdx = (before.match(/\n/g) || []).length;
    const col = before.length - (before.lastIndexOf("\n") + 1);
    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 21;
    const lineTop = 10 + lineIdx * lineHeight - ta.scrollTop;
    let top = lineTop + lineHeight + 2;
    if (top + popup.offsetHeight > body.clientHeight && lineTop - popup.offsetHeight - 2 > 0) {
      top = lineTop - popup.offsetHeight - 2;
    }
    const left = Math.min(12 + Math.max(0, col) * this._charWidth - ta.scrollLeft, Math.max(4, body.clientWidth - popup.offsetWidth - 4));
    popup.style.display = "block";
    popup.style.left = `${Math.max(4, left)}px`;
    popup.style.top = `${Math.max(2, top)}px`;
  }

  disconnectedCallback(): void {
    cancelAnimationFrame(this._rafId);
    super.disconnectedCallback();
  }
}

defineElement("z-code-editor", ZCodeEditor);
