// <z-tree-node> 树节点：label 文案、level 层级、hasChildren 显示箭头，选中与展开各发事件。
import { BaseElement, html, property, escapeAttr, ariaBool, setContentCollapsed, defineElement } from "../../core/index.js";
import { onAnimationEnd } from "../../primitives/index.js";
import treeNodeCSS from "./tree-node.css?raw";

const CHEVRON_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>`;

export class ZTreeNode extends BaseElement {
  static styles = treeNodeCSS;

  @property({ type: Boolean }) open = false;
  @property({ type: Boolean }) selected = false;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) label = "";
  // [WHY] 计数/状态徽标是**独立的一格**，不能拼进 label 文本：
  // label 是 `flex:1; overflow:hidden; text-overflow:ellipsis` 的可缩略区，
  // 一旦把「（38）」接在名称后面，名称一长就被 ellipsis 整段吃掉 —— 徽标彻底不可见，
  // 而树宽是宿主定的（zWorker 三处门店页都是 260px），长组织名必然触发。
  // See: zWorker wiki/bugs/bug-20261031-org-tree-count-invisible.md
  @property({ type: String }) badge = "";
  @property({ type: Boolean, attribute: "has-children" }) hasChildren = false;
  @property({ type: Number }) level = 0;

  private _prevOpen = false;
  private _closeHeight = 0;
  private _initialRenderDone = false;

  render(): string | null {
    // After first render, visual changes (open/selected/disabled) are handled
    // entirely in updated() via class toggles and animation — no DOM rebuild needed.
    if (this._initialRenderDone) return null;

    const rowCls = "z-tree-node__row";
    const toggleCls = [
      "z-tree-node__toggle",
      !this.hasChildren ? "z-tree-node__toggle--hidden" : "",
    ].filter(Boolean).join(" ");

    // [WHY 这里一行 aria 都没有 —— 它们全在宿主上，见 _syncAria]
    // 原先 `role="treeitem"` 与 aria-level/expanded/selected 都写在这个 row 上，
    // 而 row 住在 tree-node 的 **shadow** 里。于是：
    //   · 焦点根本进不来（它没有 tabindex，而给它加 tabindex 也留不住焦点语义）；
    //   · `z-tree` 的方向键做 `node.focus()`，而节点宿主不可聚焦 ⇒ focus() 空转；
    //   · 就算把焦点硬塞进 row，`document.activeElement` 取到的仍是宿主，
    //     `indexOf` 恒 -1 ⇒ 方向键每次都从第一项重新算起。
    // 现在把「可聚焦的那一层」与「承载 treeitem 的那一层」合并到宿主上。
    return html`
      <div class="z-tree-node" part="root" style="--_tree-level:${this.level}">
        <div class="${rowCls}" part="row">
          <button type="button" class="${toggleCls}" part="toggle" aria-hidden="true">
            ${CHEVRON_SVG}
          </button>
          <span class="z-tree-node__icon" part="icon">
            <slot name="icon"></slot>
          </span>
          <span class="z-tree-node__label" part="label">${escapeAttr(this.label)}</span>
          <span class="z-tree-node__badge" part="badge"${this.badge ? "" : " hidden"}>${escapeAttr(this.badge)}</span>
        </div>
        <div class="z-tree-node__children" part="children" role="group">
          <slot name="children"></slot>
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onRowClick);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onRowClick);
    super.disconnectedCallback();
  }

  willUpdate(): void {
    if (!this.hasChildren) return;
    // Closing: capture content height before DOM is recreated
    if (this._prevOpen && !this.open) {
      const body = this.shadowRoot!.querySelector<HTMLElement>(".z-tree-node__children");
      if (body) {
        this._closeHeight = body.scrollHeight;
      }
    }
  }

  updated(): void {
    this._initialRenderDone = true;

    const root = this.shadowRoot!.querySelector<HTMLElement>(".z-tree-node");
    if (!root) return;

    // [WHY] render() 在首帧后返回 null（性能取舍），所以文本类属性必须在这里回写：
    // 宿主（Vue）复用同一个节点、只换数据时 label/badge 会停在上一次的值 ——
    // 表现为「筛选后门店数不跟着变」。aria-* 早已是这么处理的，这里补齐可见文本。
    const labelEl = this.shadowRoot!.querySelector<HTMLElement>(".z-tree-node__label");
    if (labelEl && labelEl.textContent !== this.label) {
      labelEl.textContent = this.label;
    }
    const badgeEl = this.shadowRoot!.querySelector<HTMLElement>(".z-tree-node__badge");
    if (badgeEl) {
      if (badgeEl.textContent !== this.badge) badgeEl.textContent = this.badge;
      badgeEl.hidden = !this.badge;
    }

    if (this.hasChildren) {
      const children = this.shadowRoot!.querySelector<HTMLElement>(".z-tree-node__children");
      if (children) {
        if (this.open && !this._prevOpen) {
          this._animateOpen(root, children);
        } else if (this._prevOpen && !this.open) {
          this._animateClose(root, children);
        }
      }
    }

    root.classList.toggle("z-tree-node--selected", this.selected);
    root.classList.toggle("z-tree-node--disabled", this.disabled);

    this._syncAria();
    this._prevOpen = this.open;
  }

  /**
   * 把 treeitem 的语义写到**宿主**上（可聚焦、且与 z-tree 的 keydown 同一条链）。
   *
   * [WHY 写在宿主而不是 shadow 里的 row] 见 render() 里的说明。核心一条：
   * ARIA 属性必须挂在**真正持有焦点**的那个元素上，否则 `aria-expanded` /
   * `aria-selected` 只是一串没人读的字符串 —— `aria-activedescendant` 那种
   * 跨 shadow 的 IDREF 更是完全无效（见 wiki/lessons/shadow-boundary-idref.md）。
   *
   * 宿主聚焦时读屏念的名字来自 `aria-label`（从 `label` 取，含徽标计数）。
   * 不用 `aria-labelledby` 指 shadow 里的 `.z-tree-node__label`：那是跨树 IDREF，
   * 解析不到 —— 症状是「节点全都念成『树项目』，名字一个都没有」。
   */
  private _syncAria(): void {
    this.setAttribute("role", "treeitem");
    this.setAttribute("aria-level", String(this.level + 1));
    this.setAttribute("aria-selected", ariaBool(this.selected));
    if (this.disabled) this.setAttribute("aria-disabled", "true");
    else this.removeAttribute("aria-disabled");

    // [WHY 叶子节点不许有 aria-expanded] 只要写了，读屏就会念「已折叠」并暗示
    // 「还能展开」；用户按右方向键却什么都不发生。2026-11-16 实测：demo 里那棵树
    // 的每个叶子在 AX 树里都带 expanded:false —— 之前 ariaBool 那一轮把空串改成
    // "false"，反而把这个错误说得更肯定了。
    if (this.hasChildren) this.setAttribute("aria-expanded", ariaBool(this.open));
    else this.removeAttribute("aria-expanded");

    // 名字：名称 + 徽标计数（视觉上就是一个名称加一个数字，读法一致）
    const name = this.badge ? `${this.label} ${this.badge}` : this.label;
    if (name) this.setAttribute("aria-label", name);
    else this.removeAttribute("aria-label");

    // roving tabindex 的兜底：z-tree 会把「当前停靠项」提升为 0，其余回落到 -1。
    // 单独使用（没有父 z-tree）时也至少有一个节点能进 Tab 序列。
    if (!this.hasAttribute("tabindex")) this.setAttribute("tabindex", "-1");

    // 折叠的分支必须退出无障碍树与 Tab 链（与 accordion-item / m-collapse /
    // property-group 共用 core/a11y.ts 的同一套机制）。
    // [WHY 不能只靠 CSS] 收起用的是 `max-height:0; opacity:0` —— 元素**仍然在
    // 无障碍树里**（2026-11-16 CDP 实测：ignored:false，读屏照念子项），
    // 而 `inert` 顺带挡住 Tab 与点击（子节点宿主带 tabindex，光 aria-hidden 挡不住）。
    // 收起时焦点若在某个子节点上，交回本节点（它自己就是 treeitem）。
    setContentCollapsed(
      this,
      this.shadowRoot!.querySelector(".z-tree-node__children"),
      this.hasChildren && !this.open,
      this,
    );
  }

  private _animateOpen(root: HTMLElement, container: HTMLElement): void {
    root.classList.add("z-tree-node--expanded");
    // Wait a frame so all descendant renders and layout settle before measuring
    requestAnimationFrame(() => {
      container.style.maxHeight = "none";
      const targetHeight = container.scrollHeight;
      // If children still haven't rendered, try one more frame
      if (targetHeight === 0) {
        requestAnimationFrame(() => {
          container.style.maxHeight = "none";
          const h = container.scrollHeight;
          if (h === 0) return;
          this._startOpenAnimation(container, h);
        });
        return;
      }
      this._startOpenAnimation(container, targetHeight);
    });
  }

  private _startOpenAnimation(container: HTMLElement, targetHeight: number): void {
    container.style.maxHeight = "0";
    container.style.opacity = "0";
    container.getBoundingClientRect(); // force reflow
    container.style.transition = "max-height 200ms ease-out, opacity 200ms ease-out";
    container.style.maxHeight = `${targetHeight}px`;
    container.style.opacity = "1";

    // [2026-11-20] 收尾改走 L0 的 `afterAnimation`（issue IKWNJN）：原来这套
    // 「settled 标志 + 自移监听 + setTimeout 兜底」是四份手抄里的一份，且兜底 250ms
    // 与 200ms 的过渡只差 50ms —— 浏览器忙一点兜底就先到，动画被当场掐断。
    this._settleBlock(container, { maxHeight: "none" });
  }

  private _animateClose(root: HTMLElement, container: HTMLElement): void {
    // Start at captured height, no transition
    container.style.transition = "none";
    container.style.maxHeight = `${this._closeHeight}px`;
    container.style.opacity = "1";
    container.getBoundingClientRect(); // force reflow
    // Animate to 0
    container.style.transition = "max-height 150ms ease-in, opacity 100ms ease-in";
    container.style.maxHeight = "0";
    container.style.opacity = "0";
    root.classList.remove("z-tree-node--expanded");

    // 收尾同上；收起态的 maxHeight 归 `""`（内容自适应），与展开态的 `none` 不同
    this._settleBlock(container, { maxHeight: "" });
  }

  /**
   * 过渡结束后的收尾：清掉内联 transition / maxHeight / opacity。
   *
   * [WHY 在这里包一层而不是直接调原语] 三处的**起始**样式不同（展开要 opacity 淡入、
   * 收起要先 `transition:none` 跳到起点），收尾却是同一套 —— 所以只把收尾收进原语。
   *
   * [WHY 传 `property: "max-height"`] 这条过渡同时带动 opacity（两条时长还不一样：
   * 150ms / 100ms）。不筛属性的话，opacity 先结束就会把 maxHeight 一起清掉，
   * 高度动画当场跳到最后。
   */
  private _settleBlock(container: HTMLElement, end: { maxHeight: string }): void {
    onAnimationEnd(container, () => {
      container.style.transition = "";
      container.style.maxHeight = end.maxHeight;
      container.style.opacity = "";
    }, { property: "max-height" });
  }

  private _onRowClick = (e: Event): void => {
    if (this.disabled) return;

    const toggle = (e.target as HTMLElement).closest(".z-tree-node__toggle");
    if (toggle && this.hasChildren) {
      e.stopPropagation();
      this._toggle();
      return;
    }

    const row = (e.target as HTMLElement).closest(".z-tree-node__row");
    if (row) {
      this._select();
    }
  };

  private _toggle(): void {
    this.open = !this.open;
    this.emit("z-toggle", { open: this.open });
  }

  private _select(): void {
    this.emit("z-select", { selected: !this.selected });
  }

}

defineElement("z-tree-node", ZTreeNode);
