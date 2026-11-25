import { applyPropertyMeta, convertFromAttribute, metaAliases } from "./decorators.js";

export interface UpdateContext {
  /** True on the very first render. */
  isFirst: boolean;
}

/**
 * 重建前后的焦点记忆（issue IKQP29）。
 *
 * [WHY 需要这个] `performUpdate` 用 `shadow.innerHTML = ...` **整体重建**，输入框连同
 * 焦点、光标、输入法组合态一起被换掉。筛选框的 `input` 事件回调里就调 `requestUpdate`，
 * 于是「敲一个字符 → 重绘 → 焦点丢失 → 后续字符落在已脱离文档的节点上」，
 * 用户看到的是「输入框只有一个字符、后面敲的全丢」。而 `value` 是对的、元素也在、
 * 监听每轮都重绑 —— DOM 断言全绿，只有真浏览器逐字符输入才暴露。
 *
 * 找回用的是**稳定标识**（`data-field` / `id` / `name`），不是「第几个 input」：
 * 重建后节点顺序可能变（条件渲染、列表增删），按序号找回会聚焦到**错误的元素**上，
 * 比不找回更难排查。认不出标识就不恢复。
 */
interface FocusMemo {
  /** 找回用的选择器；空串表示认不出，放弃恢复。 */
  key: string;
  start: number | null;
  end: number | null;
  dir: "forward" | "backward" | "none" | null;
}

export abstract class BaseElement extends HTMLElement {
  // [WHY 这里没有 observedAttributes] 2026-11-14 删掉了两个「看起来在生效、实际从未被读」的机制：
  // 本类曾有一个 `static get observedAttributes()` 返回 `__observedAttributes`，以及
  // `connectedCallback` 里的 `registerObservedAttributes()` 去填那个字段。
  // 实际上：`@property` 装饰器在**类定义期**就给子类 ctor 装了 observedAttributes 的 getter
  // （见 decorators.ts 的 `__zui_observedRegistered`），子类一律命中那份，本类的 getter 被遮蔽；
  // 没有 `@property` 的子类两个版本都得到空列表 —— 行为完全相同。
  // 更要紧的是它填的是 `key.toLowerCase()`（扁平名），而规范名是 kebab：
  // 谁要是让它真的生效，多词属性会立刻退回 [[bug-20260902-ce-kebab-attr-miss]] 那个坑。
  // 结论：observedAttributes 的唯一来源是装饰器，由 tests/unit/core/decorators.test.ts 钉住。

  /**
   * Component styles — injected once into shadow root on first render.
   *
   * 可以是**一份或几份**（数组按换行拼接）。后者是给「一个视图要装两套样式」用的：
   * 运行期产出的 DOM（如 `form preview=` 的结果表）两端共用一份 `.css`，而视图自己的
   * 样式仍归自己 —— 两份各自 `import ... ?raw` 再拼，比复制一份样式进两个文件安全。
   *
   * [WHY 必须在基类里拼而不是在子类写 `[a, b]`] 这里原先只声明 `string`，而拼接用的是
   * `${styles}` —— 传数组会得到 `"css1,css2"`（`Array.prototype.toString` 用逗号连）。
   * 那个逗号在 CSS 顶层是语法错误，后一份样式整段失效，而页面看起来「只是某一块没样式」。
   */
  static styles?: string | readonly string[];

  private __updatePending = false;
  private __hasRendered = false;
  /** 输入法组合态：组合期间不重建（见 performUpdate 的说明）。 */
  private __composing = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    applyPropertyMeta(this, this.constructor as Function);
    // 重新挂载时重置：组合态可能在元素移除期间没收到 compositionend
    this.__composing = false;
    this.requestUpdate();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnectedCallback(): void {}

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    const metaList = (this.constructor as any).__zui_propertyMeta as
      | Array<{ key: string; attribute: string | false; attributeExplicit?: boolean; type: Function }>
      | undefined;
    if (!metaList) return;
    for (const meta of metaList) {
      // [WHY 按别名匹配而不是单一名字] 规范名是 kebab（closeLabel → close-label），
      // 但库内手工模板与既有页面写的是扁平名（closelabel）。两者都要能驱动属性，
      // 否则写法不对的那一边会**静默退回默认值**（[[bug-20260902-ce-kebab-attr-miss]]）。
      if (meta.attribute === false) continue;
      if (!metaAliases(meta).includes(name)) continue;
      // [WHY 走 decorators 的转换函数而不是在这里再写一遍] 2026-11-15 实测缺陷：
      // 这里原先只认 Boolean / Number，其余一律 `value ?? ""`，于是 Array / Object 属性
      // **在元素升级之后**被 setAttribute 就退化成字符串（`items.map is not a function`，
      // 组件渲染成 0 高，而宿主只看到「这个组件不显示」）。初始装载走的是
      // decorators 里那份会 JSON.parse 的实现，所以「写在标记里正常、运行时改就坏」
      // —— 同一个转换写两遍必然分叉。现在两处共用一份。
      const converted = convertFromAttribute(value, meta.type as never);
      // [WHY] 私有键必须与 decorators.ts 的 __zui_prop_ 前缀一致，否则 attribute→property 同步失效
      (this as any)[`__zui_prop_${meta.key}`] = converted;
      this.requestUpdate();
      return;
    }
  }

  requestUpdate(): void {
    if (this.__updatePending) return;
    this.__updatePending = true;
    queueMicrotask(() => {
      this.__updatePending = false;
      this.performUpdate();
    });
  }

  protected performUpdate(): void {
    // [WHY 组合期间不重建] 整块 innerHTML 替换会终止输入法会话：中文/日文输入到一半
    // 重绘，拼音候选框消失、已上屏的部分也可能被打断。焦点恢复只能救「英文逐字符」，
    // 救不了 IME 组合态 —— 所以这一类必须在**开始之前**就避开。
    // 组合结束时 `compositionend` 会重新 requestUpdate，不丢更新。
    if (this.__composing) return;

    const ctx: UpdateContext = { isFirst: !this.__hasRendered };
    (this as any).willUpdate?.(ctx);

    const rendered = this.render();
    const shadow = this.shadowRoot!;
    if (typeof rendered === "string") {
      const declared = (this.constructor as typeof BaseElement).styles;
      const styles = Array.isArray(declared) ? declared.join("\n") : declared;
      const styleTag = styles ? `<style>${styles}</style>` : "";
      const memo = this.__memoFocus();
      shadow.innerHTML = styleTag + rendered;
      this.__restoreFocus(memo);
    }

    if (ctx.isFirst) {
      this.__hasRendered = true;
      this.__watchComposition();
      (this as any).firstUpdated?.();
    }
    // [CONTRACT] 子类 updated 钩子**不传参**（无 lit 式 changed Map——本基类不追踪旧值）。
    // 需要响应属性变化时在子类内自行比对旧值（见 DocTemplateManager._dataSourcePrimed）。
    // lit 风格 `updated(changed: Map)` 签名会在运行时 TypeError。
    (this as any).updated?.();
    (this as any).updateComplete?.();
  }

  /** 首帧后挂一次组合态监听（惰性挂：子类 override connectedCallback 也不会漏）。 */
  private __watchComposition(): void {
    const sr = this.shadowRoot;
    if (!sr) return;

    /**
     * [★ 只认「自己 shadow 内」的组合事件]（issue IKTYCG，补丁来自宿主 zEtl 实战）
     *
     * 监听挂在 shadowRoot 的 capture 阶段，而 **slot 分配进来的 light DOM 内容的事件
     * 同样会经过这里**。对 `<z-app-shell>` 这种包裹整个应用的壳组件，意味着页面里任何
     * 一个输入框（哪怕是浮在弹窗上的智能体面板）在中文输入法「确认文字」时都会触发
     * `requestUpdate()` → `shadow.innerHTML` 整体重建 → slot 重新分配 → light DOM 里的
     * 弹窗经历 disconnect/connect → 入场动画重播 → 用户看到**每确认一个字整屏闪一下**。
     *
     * 判据用 `composedPath()[0]` 的 root node：自己在 shadow 内建的输入框根节点就是本
     * shadowRoot；slot 内容的根节点是外层文档（或其外层 shadowRoot），必须忽略。
     *
     * [WHY 修在这里而不是让宿主各打各的补丁] 这个缺陷对**任何包裹型壳组件**都成立，
     * 宿主侧补丁只能一份份抄，且每次同步上游都要记得重放（zEtl 已经抄过一次，
     * 记录在它的 VENDOR-NOTE 里）。修在基类，所有宿主零成本受益。
     *
     * [⚠ 本仓单测覆盖不到这一条] 实测 happy-dom **不模拟** slot 内容事件的 capture
     * 路径穿越：在 light DOM 的 input 上派发 `compositionend`（bubbles + composed），
     * 挂在 shadowRoot 上的 capture 监听 **收到 0 次**（不是 isOwn 拦下的，是根本没到）。
     * 所以本仓写不了能区分「有/无这个补丁」的用例 —— 与其放一条恒绿的假测试，
     * 不如把限制写清楚：判据本身在真机验证（zEtl 的 bug 记录
     * `bug-20261102-agent-typing-flicker` 有症状与复现），本仓只保证不破坏正常路径
     * （shadow 内输入框仍能触发补 update，由 `__composing` 相关行为间接覆盖）。
     */
    const isOwn = (e: Event): boolean => {
      const target = e.composedPath()[0] as Node | undefined;
      return !!target && typeof target.getRootNode === "function" && target.getRootNode() === sr;
    };

    sr.addEventListener(
      "compositionstart",
      (e) => {
        if (!isOwn(e)) return;
        this.__composing = true;
      },
      true,
    );
    sr.addEventListener(
      "compositionend",
      (e) => {
        if (!isOwn(e)) return;
        this.__composing = false;
        // 组合期间被跳过的更新在这里补上（否则状态改了、DOM 永远停在旧内容）
        this.requestUpdate();
      },
      true,
    );
  }

  /** 重建前记录焦点与选区；没有再重建后找回。 */
  private __memoFocus(): FocusMemo | null {
    const sr = this.shadowRoot;
    // [WHY 先判 isConnected] 宿主已脱离文档时读焦点没有意义；而某些 DOM 实现
    // （happy-dom）在断开状态下 `shadowRoot.activeElement` 的 getter 会直接抛
    // `getRootNode` of undefined —— 那会把 performUpdate 打断在重建之前，
    // 于是 `updated()` 不执行、栈索引/滚动锁这类副作用全部静默丢失。
    // 单测里表现为一堆「与焦点无关」的 modal 用例同时红。
    if (!sr || !this.isConnected) return null;
    let active: Element | null = null;
    try {
      active = sr.activeElement;
    } catch {
      return null;
    }
    if (!(active instanceof HTMLElement)) return null;
    const key = focusKeyOf(active);
    if (!key) return null;
    const input = active as HTMLInputElement;
    return {
      key,
      start: typeof input.selectionStart === "number" ? input.selectionStart : null,
      end: typeof input.selectionEnd === "number" ? input.selectionEnd : null,
      dir: (input.selectionDirection ?? null) as FocusMemo["dir"],
    };
  }

  private __restoreFocus(memo: FocusMemo | null): void {
    if (!memo) return;
    // [WHY try/catch] `focusKeyOf` 承认的 id 不保证是**合法选择器**：`id="1a"` 会拼出 `#1a`，
    // `querySelector` 抛 SyntaxError。而这个调用点位于 `shadow.innerHTML = ...` **之后**、
    // `updated()` **之前** —— 一抛就把首帧后的所有副作用（栈索引、滚动锁、事件重绑）全跳过，
    // 用户看到的是「组件渲染出来了，但点了没反应」，与本函数毫无字面关系，极难归因。
    // 找不回焦点只是「光标跳到开头」，代价远小于把整帧的后处理打断。
    let el: HTMLElement | null = null;
    try {
      el = (this.shadowRoot?.querySelector(memo.key) as HTMLElement | null) ?? null;
    } catch {
      return;
    }
    if (!el) return;
    // preventScroll：重建后瞬间滚动回原来的位置会「页面跳动」，长表单尤其明显
    el.focus({ preventScroll: true });
    if (memo.start === null) return;
    const input = el as HTMLInputElement;
    if (typeof input.setSelectionRange !== "function") return;
    try {
      input.setSelectionRange(memo.start, memo.end ?? memo.start, memo.dir ?? "none");
    } catch {
      // number / email 等 type 不支持选区，忽略即可（焦点已经找回，这是主要收益）
    }
  }

  /** Override to return the component template (<code>html`...`</code>). */
  render(): string | null {
    return null;
  }

  /**
   * Dispatch a custom event and return it.
   *
   * [WHY 返回事件对象] 可取消的事件（`cancelable: true`）需要调用方读到
   * `defaultPrevented` 才知道宿主拦没拦 —— 返回 void 时只能用 `new CustomEvent` 手写
   * dispatchEvent，而清单生成器只认 `this.emit(...)`，那条事件就从清单里消失了
   * （z-print 的 `z-before-print` 正是这样漏登记的）。返回事件让两条路统一。
   */
  emit<T = unknown>(name: string, detail?: T, options?: CustomEventInit): CustomEvent<T> {
    const ev = new CustomEvent<T>(name, {
      detail: detail as T,
      bubbles: true,
      composed: true,
      ...options,
    });
    this.dispatchEvent(ev);
    return ev;
  }
}

/**
 * 焦点元素的稳定标识，只用于「重建后找回同一个控件」。
 *
 * 优先级：`data-focus-key`（组件自证件）> `data-field`（筛选框/表单项）> `id` > `name`。
 * 不用「标签 + 序号」：重建后节点顺序会变（条件渲染、列表增删），按序号找回会聚焦到
 * **错误的元素**上 —— 那比不恢复更难排查。含引号/反斜杠的值直接放弃（选择器会失效）。
 *
 * [★ 四条全落空 = 焦点**不会**恢复，且没有任何提示]（issue IKXHHB）所以带内部可聚焦件的
 * 组件要自己给一个：`z-input` 的字段恒有 `id="z-input-field"`（影子树内唯一，够用）。
 * 新组件没有业务标识时，渲染里补 `data-focus-key="<实例内稳定值>"` —— 别指望宿主写 name。
 */
function focusKeyOf(el: HTMLElement): string {
  // [WHY 新增 data-focus-key 2026-11-05] 有些可聚焦件本身没有业务标识（下拉的 trigger、
  // 浮层的关闭钮）：它们既不是表单字段，也不该凭空占一个 id。`data-field` / `id` / `name`
  // 三条都落空时焦点就**不会恢复**，而 `shadow.innerHTML = ...` 会把 mousedown 刚聚焦的
  // 那个节点换掉 —— 表现正是「点开下拉，焦点掉到 body」。这类件用显式的 key 声明自己即可。
  // See: wiki/bugs/20261105-bind-field-select-blur.md
  const focusKey = el.dataset?.focusKey;
  if (focusKey && !/[\\"]/.test(focusKey)) return `[data-focus-key="${focusKey}"]`;
  const field = (el as HTMLElement).dataset?.field;
  if (field && !/[\\"]/.test(field)) return `[data-field="${field}"]`;
  if (el.id && !/[\\"#]/.test(el.id)) return `#${el.id}`;
  const name = el.getAttribute("name");
  if (name && !/[\\"]/.test(name)) return `[name="${name}"]`;
  return "";
}
