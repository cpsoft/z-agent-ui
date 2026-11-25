// 表单字段的「名称」与「错误态」：跨 shadow 边界时唯一还能生效的两条路。
//
// [WHY 需要这个文件 —— 一条被误以为已经做完的 a11y]
// 2026-11-15 实测：库里的 `aria-label` 有 109 处、`aria-describedby` 9 处，
// 看起来无障碍早就做过了。但**表单字段一个名字都没有**：
//
//   <z-form-item label="邮箱" required>
//     <z-input placeholder="user@example.com"></z-input>
//   </z-form-item>
//
// 读屏看到的是一个「没有名称的编辑框」——`label` 是 `z-form-item` 里的一个
// `<span>`，它与槽里的控件之间**没有任何关联**：既不是 `<label for>`，也不是
// `aria-labelledby`。而 `placeholder` 只在字段为空且部分读屏器才会被念出来，
// 不能当名字用。
//
// 为什么不能「补一条 aria-labelledby 指过去」：IDREF（`aria-labelledby` /
// `aria-describedby` / `for`）**只在同一个 tree 内解析**。`z-form-item` 的
// label 在它自己的 shadow root 里，控件是 light DOM 的槽内容，两个 id 在
// 对方的树里都查不到。旧代码 `FormItem._setError()` 就踩了这一条：
// 它给控件设了 `aria-describedby="z-form-item-error"`，而那个 id 在
// form-item 的 shadow 内 —— **永远解析不到**，还会顺手覆盖掉控件自己算好的
// describedby（z-input 的 hint/error 就这样被顶掉了）。
//
// 能跨过去的只有「把文字送进控件，由控件写在**自己的**可聚焦件上」：
//   · 名称 → 内部可聚焦件的 `aria-label`
//   · 错误态 → 内部可聚焦件的 `aria-invalid`
// 于是本文件只做这一件事：找到控件的**主可聚焦件**并在它上面读/写这两个属性。
//
// [为什么靠 part 找而不是靠标签名] 七个表单控件内部的可聚焦件分别是
// `<input>`（input / number-input / checkbox / radio / switch）、`<textarea>`、
// `<button role=combobox>`（select）。标签名各不相同，`part` 是这个库里
// **唯一稳定的约定**：主可聚焦件一律是 `part="field" | "native" | "trigger"`。
// 这条约定由 `tests/unit/a11y-guard.test.ts` 的 A5 守住。

/**
 * 主可聚焦件的 part 名单。新增表单控件时必须复用其中一个，否则 a11y 守卫会红。
 *
 * [WHY 用 `~=` 而不是 `=`] `part` 的值是一个**空格分隔的令牌列表**，`~=` 才是列表里的
 * 「有一个是它」。用 `=` 的话 `part="editor field"` 匹配不到 —— 组件为了保住既有的
 * `::part(editor)` / `::part(textarea)` 外部样式入口，只能写多令牌，
 * 而 2026-11-16 之前那版 `=` 会让它**静默地**不算字段（`fieldOf()` 返回 null，
 * `z-form-item` 的名字永远送不进去，界面上毫无异常）。
 */
export const FIELD_PART_SELECTOR = '[part~="field"],[part~="native"],[part~="trigger"]';

/**
 * 布尔 → ARIA 令牌（`"true"` / `"false"`）。
 *
 * [WHY 不能直接写 `aria-expanded="${this.open}"`] 模板插值把 `false` 变成**空串**，
 * 于是产出 `aria-expanded=""`。空值在 ARIA 里不表示 false，它表示「没有值 / 未知」——
 * 读屏不会说「已折叠」，而是什么都不说。界面上一切正常，只有用读屏的人发现
 * 「这个开关/页签/下拉说不出自己是开的还是关的」。
 *
 * 2026-11-15 实测：库里 12 个组件、15 处这么写过（menu / tabs / button / checkbox /
 * tree-node / popover / popconfirm / datepicker / date-range / time-picker / rate /
 * menu-item）。守卫 `aria-value-guard` 现在会在**渲染结果**上抓这个：凡是 `aria-*`
 * 的值是空串就红 —— 静态扫源码查不出来（`${this.open}` 长得和 `${this.label}` 一样）。
 */
export const ariaBool = (v: unknown): "true" | "false" => (v ? "true" : "false");

/** 标记「这个字段名是本模块（而非控件作者）写上去的」，便于收尾时只清自己写的那条。 */
export const NAME_MARK = "data-z-field-name";

/**
 * 控件内部的主可聚焦件。
 *
 * [WHY 返回 null 而不是抛错] 控件刚挂上、影子树还没渲染时一定会拿到 null，
 * 那是一次正常的时序而不是缺陷 —— 调用方（form-item）会在控件重渲染后再来一次。
 */
export function fieldOf(control: Element | null): HTMLElement | null {
  if (!control) return null;
  const root = control.shadowRoot;
  if (!root) return null;
  return root.querySelector(FIELD_PART_SELECTOR) as HTMLElement | null;
}

const hasText = (v: string | null | undefined): v is string => !!v && v.trim().length > 0;

/**
 * 槽里**真正**承载内容的元素 —— 穿透 `<slot>` 占位。
 *
 * [WHY 需要穿透] `<slot>` 是可以嵌套的：`z-detail-form` 为了让每个字段可被单独覆盖，
 * 渲染的是
 *
 * ```html
 * <z-property-row label="门店名">
 *   <span slot="label">门店名</span>
 *   <slot name="field-shop"></slot>   <!-- 覆盖位，默认空 -->
 *   <z-input data-field="shop"></z-input>
 * </z-property-row>
 * ```
 *
 * 而 `z-property-row` 的默认槽把 **`<slot>` 本身**和 `<z-input>` 都分配进去了，
 * 排在前面的是那个空的 `<slot>`。于是「槽里第一个元素」拿到的是一个占位符：
 * `fieldOf(<slot>)` 恒为 null（它没有影子树），名字写不进去 —— 而代码看起来
 * 「找到槽内容了」。2026-11-16 CDP 实测：`z-detail-form` 三个字段的 AX `name` 全是空串。
 *
 * [WHY 返回非 slot 的第一个而不是「找带 data-field 的」] 覆盖位里放的也是控件，
 * 它同样该有自己的名字；规则只描述**结构**（占位符要跳过），不假定控件的属性。
 */
export function slottedControl(slot: HTMLSlotElement | null | undefined): Element | null {
  return firstNonSlot(slot?.assignedElements?.() ?? []);
}

/** 深度上限：正常模板嵌套不会超过几层，纯粹防环。 */
const SLOT_DEPTH_LIMIT = 8;

function firstNonSlot(nodes: Element[], depth = 0): Element | null {
  if (depth > SLOT_DEPTH_LIMIT) return null;
  for (const node of nodes) {
    // 用 tagName 而不是 `instanceof HTMLSlotElement`：后者依赖全局构造器存在，
    // 在 happy-dom / SSR 之类的环境里可能拿不到，而 tagName 一定在。
    if (node.tagName === "SLOT") {
      const inner = firstNonSlot(
        (node as HTMLSlotElement).assignedElements?.() ?? [],
        depth + 1,
      );
      if (inner) return inner;
      continue;
    }
    return node;
  }
  return null;
}

/**
 * 控件是否**已经**有可访问名称（此时不许再被外部 label 覆盖）。
 *
 * 三种来源都算「有」：
 *   1. 宿主写在控件上的 `aria-label` / `aria-labelledby`（显式指定，优先级最高）
 *   2. 控件自己的 `label` 属性 —— z-input / z-textarea 会渲染 `<label for>` 并关联字段
 *   3. 内部可聚焦件被 `<label>` 包着且有文字 —— z-checkbox / z-radio / z-switch 的常见写法
 *      (`<z-checkbox>我已阅读并同意</z-checkbox>`)，这类名称来自 slot 文本
 */
export function hasOwnAccessibleName(control: Element): boolean {
  if (!control) return false;
  if (hasText(control.getAttribute("aria-label"))) return true;
  if (hasText(control.getAttribute("aria-labelledby"))) return true;
  if (hasText(control.getAttribute("label"))) return true;

  const field = fieldOf(control);
  if (!field) return false;
  if (hasText(field.getAttribute("aria-label"))) return true;
  if (hasText(field.getAttribute("aria-labelledby"))) return true;
  // [WHY 要算上 slot 里的文字] z-checkbox / z-radio / z-switch 的写法是
  // `<z-checkbox>我已阅读并同意</z-checkbox>`：文字在 **light DOM**（会被分配进
  // shadow 里的 `<slot>`），`wrap.textContent` 读到的是空的 —— 只看它就会误判成
  // 「没有名称」，于是把外层的 label 注入进去，覆盖掉用户真正想要的文字。
  const wrap = field.closest("label");
  if (wrap) {
    if (hasText(wrap.textContent)) return true;
    if (wrap.querySelector("slot") && hasText(control.textContent)) return true;
  }
  return false;
}

/**
 * 把外部 label 的文字送到控件内部可聚焦件上。
 *
 * 只在控件**没有**自己的名称时写。判断「是不是我上次写的」用 {@link NAME_MARK}：
 * 没有这个标记的话，第一轮写进去的 `aria-label` 会让第二轮误判成「控件自己有名」，
 * 于是 label 改了文字却永远不更新。
 */
export function syncFieldName(control: Element | null, label: string): void {
  const field = fieldOf(control);
  if (!control || !field) return;
  const mine = field.hasAttribute(NAME_MARK);

  if (!hasText(label)) {
    if (mine) clearFieldName(control);
    return;
  }
  if (!mine && hasOwnAccessibleName(control)) return;
  if (field.getAttribute("aria-label") === label) return;

  field.setAttribute("aria-label", label);
  field.setAttribute(NAME_MARK, "");
}

/** 撤掉 {@link syncFieldName} 写下的那条 `aria-label`（控件作者自己写的不动）。 */
export function clearFieldName(control: Element | null): void {
  const field = fieldOf(control);
  if (!field || !field.hasAttribute(NAME_MARK)) return;
  field.removeAttribute("aria-label");
  field.removeAttribute(NAME_MARK);
}

/**
 * 把容器 label 持续喂给槽内控件，并在控件重渲染后补回去。
 *
 * [WHY 需要「持续」而不是写一次] 控件重渲染会整体替换自己的影子树，注入到
 * `part="field"` 上的那条 `aria-label` 跟着消失。症状是「首屏有名字，改了一次值之后
 * 读屏又不念了」—— 界面上完全正常，只有用读屏的人发现名字没了。
 *
 * [WHY 抽成函数] 这是同一个判据的第二个使用者：`z-form-item`（表单）与本轮补上的
 * `z-property-row`（属性面板）。两处都需要「同步一次 + 监听影子树 childList + 重渲染后
 * 回填」，只有「控件从哪来」「label 从哪来」不同 —— 那就把这两件事作为入参，其余共用。
 *
 * @param getControl 惰性取槽内控件（拿不到返回 null，会在下次 sync 时重试）
 * @param getLabel 惰性取标签文字（改 label 后下一次 sync 会更新名字）
 */
export interface FieldNameBinder {
  /** 同步一次名字；控件或影子树还没就绪时自动跳过，下次调用重试 */
  sync(): void;
  /** 断开观察器（组件 disconnectedCallback 里调用） */
  dispose(): void;
}

export function bindFieldName(
  getControl: () => Element | null,
  getLabel: () => string,
): FieldNameBinder {
  let observer: MutationObserver | null = null;
  let named: Element | null = null;

  /**
   * 控件每重渲染一次，影子树里的字段节点就换一个 —— 注入的 `aria-label` 随之消失。
   * 只观察 `childList`：重渲染 = 整块 `innerHTML` 替换，一次 childList 就够；
   * 观察 `attributes` 会被我们自己写 aria-label 的动作反复触发。
   */
  const watch = (control: Element): void => {
    observer?.disconnect();
    observer = null;
    const root = control.shadowRoot;
    // 影子树未就绪：不认领这个控件，留给下一次 sync 重试
    if (!root) {
      named = null;
      return;
    }
    named = control;
    observer = new MutationObserver(() => syncFieldName(getControl(), getLabel()));
    observer.observe(root, { childList: true });
  };

  const sync = (): void => {
    const control = getControl();
    if (!control) return;
    syncFieldName(control, getLabel());
    // [WHY 还要判 `!observer`] 控件影子树还没建起来时第一次会挂空（watch 里直接返回），
    // 只比 `named` 的话第二次就不会再试 —— 观察器永久缺失，而名字当时是写上了的，
    // 症状要等控件重渲染一次才出现。
    if (named !== control || !observer) watch(control);
  };

  return {
    sync,
    dispose(): void {
      observer?.disconnect();
      observer = null;
      named = null;
    },
  };
}

/**
 * 折叠容器的「收起即不可达」。
 *
 * [WHY 这是一个共用工具而不是各组件各写一遍] 库里三处折叠（`z-accordion-item` /
 * `m-collapse` / `z-property-group`）用的是**同一个**实现：高度动画 + `max-height: 0`
 * + `overflow: hidden`。它们也就有同一个缺陷 —— 2026-11-16 真机实测：
 *
 * ```
 * accordion-item : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
 * m-collapse     : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
 * property-group : focusedWhenCollapsed=true  contentAriaHidden=null  contentInert=null
 * ```
 *
 * 也就是说收起之后里面的 `<input>` **照样能 Tab 聚焦**，而且还在无障碍树里
 * （CDP 里 `ignored: false`，读屏照念）。使用者看到的是「按 Tab 焦点消失了」——
 * 其实焦点正停在那个高 0 像素的输入框里，再按几下才出得来。属性面板最糟：
 * 一屏全是输入框，键盘用户基本无法穿过一个收起的对照组。
 *
 * `max-height` / `overflow` 只影响**绘制**，不影响可聚焦性与无障碍树。能把这两样
 * 一起去掉的只有两个属性：`inert`（挡焦点与点击）+ `aria-hidden`（挡读屏）。
 *
 * [WHY 还要把焦点搬走] 若收起那一刻焦点正在内容里（用户 Tab 进去、再点表头收起），
 * 给祖先设 `aria-hidden` 会被浏览器拒绝（"Blocked aria-hidden on an element because
 * its descendant retained focus"）—— 警告只出现在控制台，界面上看不出来，那个
 * `aria-hidden` 就等于没设。所以先把焦点交还给表头，再设属性。
 *
 * @param host 组件宿主，用来判断「焦点还在不在我这里面」
 * @param content 要隐藏的内容容器
 * @param collapsed 是否处于收起态
 * @param revealFocus 收起时接住焦点的元素（通常是表头按钮）
 */
export function setContentCollapsed(
  host: HTMLElement,
  content: Element | null,
  collapsed: boolean,
  revealFocus?: HTMLElement | null,
): void {
  if (!content) return;

  if (!collapsed) {
    content.removeAttribute("aria-hidden");
    content.removeAttribute("inert");
    return;
  }

  // 焦点必须在设 aria-hidden 之前搬走，否则浏览器会拒绝这条 aria-hidden
  const active = deepActiveElement();
  if (active && active !== revealFocus && host.contains(active)) {
    revealFocus?.focus();
  }

  content.setAttribute("aria-hidden", "true");
  content.setAttribute("inert", "");
}

/**
 * 当前**真正**持有焦点的元素，穿透 shadow 边界逐层下钻。
 *
 * [WHY 不能用 `document.activeElement` 就完事] 焦点落进 shadow 之后，
 * `document.activeElement` 返回的是**宿主**，不是真正拿到焦点的那个节点。
 * 拿它做两件事都会错，而且错得很安静：
 *   · 和一组候选元素比 `indexOf` → 永远 -1，于是「当前停在第几个」恒算成 0，
 *     方向键看起来在动（界面有高亮），实际每次都从第一项重新开始；
 *   · 判断「焦点还在不在我这个控件里」→ 嵌了两层 shadow 时永远为 false。
 *
 * 这个函数原先只长在 `FocusTrap` 里（那里踩的是「末项 Tab 漏出对话框」）。
 * 2026-11-16 在 `z-tree` 上踩到同一个坑的第二处 —— 同一个判据第二次被需要，
 * 就该提出来，而不是复制一份带注释的私有方法。
 */
export function deepActiveElement(): HTMLElement | null {
  let el = document.activeElement as HTMLElement | null;
  // 深度上限：正常 DOM 不会嵌套这么多层 shadow，纯粹防环
  for (let guard = 0; el && guard < 16; guard++) {
    let inner: Element | null = null;
    try {
      inner = (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot?.activeElement ?? null;
    } catch {
      // [WHY try/catch 在这里不是防御式编程] happy-dom 的 `ShadowRoot.activeElement`
      // 实现是「取 document 的 _activeElement 再对它调 getRootNode()」——文档当前
      // **没有焦点**时 `_activeElement` 是 undefined，getter 直接抛 TypeError。
      // 真浏览器只返回 null。兜住它，调用方才不用为了跑测试而写两套分支。
      inner = null;
    }
    if (!inner) break;
    el = inner as HTMLElement;
  }
  return el;
}

/**
 * `ancestor` 是否包含 `node` —— **穿透 shadow 边界**。
 *
 * [WHY 不能直接用 `ancestor.contains(node)`] 2026-11-16 实测（Chrome 141）：
 * 宿主对**自己影子树里的**节点调 `contains()` 返回 **false**。
 *
 * ```
 * z-column-selector.contains(shadowRoot 里的 checkbox) === false
 * deepActiveElement() === 那个 checkbox
 * ```
 *
 * 于是「焦点还在我这儿吗」这个最常见的判据，只要组件用了 shadow，
 * 就恒等于 false —— 症状是「该收的没收 / 该还的焦点没还」，DOM 里毫无痕迹。
 * 正确做法是逐层 `getRootNode()`：影子根把 `host` 当作上一层，
 * 一路爬到 document 才叫真的不在。
 */
export function composedContains(ancestor: Element | null, node: Node | null): boolean {
  if (!ancestor || !node) return false;
  let cur: Node | null = node;
  for (let guard = 0; cur && guard < 16; guard++) {
    if (cur === ancestor) return true;
    const root = cur.getRootNode();
    cur = root instanceof ShadowRoot ? root.host : (root as Node).parentNode;
  }
  return false;
}

/** 原生可聚焦件。与 `FocusTrap` 的名单一致；`tabindex="-1"` 不算（它不在 Tab 序里）。 */const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/**
 * 这个元素会不会**自己消费** `Delete` / `Backspace` / `Enter` 这类编辑键。
 *
 * [WHY 需要它] `z-datepicker` 想支持「按 Delete 清空值」，但它的触发器是消费者塞进槽里的
 * 东西 —— 可能是 `<z-button>`，也可能是可编辑的 `<z-input>`。后者里 Delete 是删字符，
 * 抢过来就等于把一个能正常打字的输入框弄坏。判断依据只能是元素本身：
 * 可编辑的 `input` / `textarea`（没有 `readonly` / `disabled`）与 `contenteditable`。
 *
 * 与 `flow/flow-interaction.ts` 的 `isEditingTarget(e)` 的分工：那个看**事件的
 * composedPath**（判断「这一击落在编辑区里吗」），这个看**当前焦点元素本身**
 * （判断「现在按下的这个键归谁」）。场景不同，判据也不同，不是重复实现。
 */
export function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return !el.readOnly && !el.disabled;
  }
  const editable = el.getAttribute("contenteditable");
  return editable === "" || editable === "true" || editable === "plaintext-only";
}

/**
 * 一个元素背后**真正**持有键盘焦点的那一个，逐层穿透 shadow。
 *
 * [WHY 需要这一层] `aria-haspopup` / `aria-expanded` / `aria-disabled` 只有写在
 * **可聚焦件**上才对读屏有意义。而槽里放的东西通常是一层壳：
 * `<z-button>` 的宿主不可聚焦，真正拿到焦点的是它影子树里的 `<button part="button">`。
 * 往宿主写 `aria-expanded` 与往一个 `<span>` 写是同一个结果 —— 无障碍树里不成立。
 *
 * 与 `fieldOf()` 的分工：那个认 `part="field|native|trigger"` 这套**本库内部约定**，
 * 只覆盖表单控件；这个按**浏览器口径**找（原生标签 / tabindex / contenteditable），
 * 连用户自己塞的 `<button>`、`<a>`、`<input>` 都能认出来。触发器槽里放什么由消费者决定，
 * 所以这里只能按浏览器口径走。
 */
export function focusableOf(el: Element | null, depth = 0): HTMLElement | null {
  if (!el || depth > 6) return null;
  if (el.matches(FOCUSABLE_SELECTOR)) return el as HTMLElement;

  const root = (el as HTMLElement & { shadowRoot?: ShadowRoot | null }).shadowRoot;
  if (!root) return null;

  // 影子树里的第一层：直接可聚焦件 / 再一层壳（`part="button"` 这类）
  const direct = root.querySelector(FOCUSABLE_SELECTOR);
  if (direct) return direct as HTMLElement;

  for (const child of root.children) {
    const found = focusableOf(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** 浮层触发器上那两个属性的状态。 */
export interface TriggerAriaState {
  /** `aria-haspopup` 的值：dialog / menu / listbox / true */
  hasPopup: "dialog" | "menu" | "listbox" | "true";
  expanded: boolean;
  /**
   * 触发器是否不可用。只在 `true` 时写 `aria-disabled`，`false` 时**不写** ——
   * 控件自己可能已经靠原生 `disabled` 表达了，这里再补一个 `aria-disabled="false"`
   * 会与原生状态打架（原生 disabled 的控件既不可聚焦也不可激活，
   * 而 `aria-disabled="false"` 是在说「可以用」）。
   */
  disabled?: boolean;
}

/** 标记「这两个属性是本模块写的」，换触发器时只清自己写上去的那份。 */
export const TRIGGER_MARK = "data-z-trigger-aria";

export interface TriggerAriaBinder {
  sync(): void;
  dispose(): void;
}

/**
 * 把 `aria-haspopup` / `aria-expanded` 送到**真正可聚焦的触发器**上，并在 `open`
 * 变化、槽内容变化时同步。
 *
 * [WHY 需要这个工具 —— 第三次踩同一个坑] 2026-11-16 实测（CDP `getFullAXTree`）：
 * 库里六个浮层组件的触发器都是
 *
 * ```html
 * <span class="z-popover__trigger" part="trigger"
 *       aria-haspopup="true" aria-expanded="false"><slot name="trigger"></slot></span>
 * ```
 *
 * 塞进去的按钮在无障碍树里 `role=button, name="..."`，而 `hasPopup` / `expanded`
 * **两个属性都不存在**；那个 `<span>` 本身在树里根本不出现。也就是说这六处的
 * 「有弹出层」「已展开」从来没被读屏念出来过 —— DOM 里读得到，语义上不存在。
 *
 * 同一个形态已经出现过三次：`z-flow-node` 的 `aria-selected`（无 role ⇒ 被忽略）、
 * `z-json-viewer` 的展开开关（`<span role="button">` 不可聚焦）、以及这里的六个触发器。
 * 共同点都是「属性写在**容器**上，而容器的语义不被无障碍树承认」。
 * 所以这次不再逐个组件手写，而是做成一条可复用的绑定。
 *
 * [WHY 找不到可聚焦件时退回容器] 消费者可能往槽里塞纯文本（虽然那本来就用不了键盘）。
 * 这时保持原状：属性留在容器上无效，但至少 DOM 里留了痕，将来浏览器若承认 generic
 * 上的 haspopup 就自动生效；而「什么都不写」会让这类用法彻底失去信息。
 */
export function bindTriggerAria(
  getSlot: () => HTMLSlotElement | null,
  getState: () => TriggerAriaState,
): TriggerAriaBinder {
  let written: HTMLElement | null = null;
  let boundSlot: HTMLSlotElement | null = null;

  const clear = (el: HTMLElement | null): void => {
    if (!el || !el.hasAttribute(TRIGGER_MARK)) return;
    el.removeAttribute("aria-haspopup");
    el.removeAttribute("aria-expanded");
    el.removeAttribute("aria-disabled");
    el.removeAttribute(TRIGGER_MARK);
  };

  const sync = (): void => {
    const slot = getSlot();
    if (slot && slot !== boundSlot) {
      slot.addEventListener("slotchange", sync);
      boundSlot = slot;
    }
    const state = getState();
    // 退化目标：找不到可聚焦件时写在槽的容器上（见函数注释最后一段）
    const target =
      focusableOf(slottedControl(slot)) ?? (slot?.parentElement as HTMLElement | null) ?? null;
    if (target !== written) {
      clear(written);
      written = target;
    }
    if (!target) return;
    target.setAttribute("aria-haspopup", state.hasPopup);
    target.setAttribute("aria-expanded", ariaBool(state.expanded));
    // [WHY 三态而不是布尔] `undefined` = 这个组件不管禁用态，别碰触发器上作者自己写的；
    // `false` = 明确要启用，此时把之前写上去的那条摘掉；
    // `true` = 写 `aria-disabled="true"`（可达可念、不可激活，与库里的口径一致）。
    // 只判真假两态的话，一个不关心禁用的组件会顺手抹掉 `z-button` 的禁用语义。
    if (state.disabled === true) target.setAttribute("aria-disabled", "true");
    else if (state.disabled === false) target.removeAttribute("aria-disabled");
    target.setAttribute(TRIGGER_MARK, "");
  };

  return {
    sync,
    dispose(): void {
      boundSlot?.removeEventListener("slotchange", sync);
      boundSlot = null;
      clear(written);
      written = null;
    },
  };
}
