// <z-tree> 树容器：装 z-tree-node，multiple 与 cascade 控制多选和级联，选中与展开各发事件。
//
// ── 焦点模型（2026-11-16 重做）──────────────────────────────────────────────
// 走 ARIA APG 的「roving tabindex」：焦点直接落在 treeitem 上，容器本身不进 Tab 序列。
// 之前是「容器 tabindex=0，节点不可聚焦，方向键里对节点调 focus()」—— 三处都不成立：
//   · 节点宿主没有 tabindex ⇒ focus() 静默空转（真浏览器实测：焦点仍在容器上）；
//   · 于是 `document.activeElement` 永远是容器，`indexOf` 恒 -1；
//   · 方向键每次都从 `max(-1+1, 0)` 算出第一项 ⇒ 不管按几下，Enter 都作用在第一个节点。
// 界面上「高亮没变、选中没变」，看起来像按了没反应；实际是**选错了对象**。
//
// 为什么不用「容器 tabindex + aria-activedescendant」（另一种合法写法）：
// 容器在 z-tree 的 shadow 里，而 treeitem 在 z-tree-node 的 shadow 里 ——
// IDREF 跨树不解析，正是 D-L1-7 踩过的那个坑（见 architecture/l1-plan.html §12）。
import { COPY, BaseElement, html, property, escapeAttr, deepActiveElement } from "../../core/index.js";
import { roveByKey, roveTo } from "../../primitives/index.js";
import type { ZTreeNode } from "../tree-node/TreeNode.js";
import treeCSS from "./tree.css?raw";

export class ZTree extends BaseElement {
  static styles = treeCSS;

  @property({ type: Boolean }) multiple = false;
  @property({ type: Boolean }) cascade = false;
  @property({ type: String, attribute: "empty-text" }) emptyText = COPY.empty;

  render(): string {
    // [WHY 容器没有 tabindex] 焦点属于 treeitem（roving），容器只是分组与视觉边界。
    // 保留 tabindex=0 会多出一个停在「列表头」的 Tab 站 —— 那一站上方向键无事可做。
    return html`
      <div class="z-tree" part="root" role="tree"${this.multiple ? ' aria-multiselectable="true"' : ""}>
        <slot></slot>
        <div class="z-tree__empty" part="empty" aria-hidden="true">
          ${escapeAttr(this.emptyText)}
        </div>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("z-toggle", this._onNodeToggle);
    this.addEventListener("z-select", this._onNodeSelect);
    this.addEventListener("keydown", this._onKeyDown);
    this.addEventListener("focusin", this._onFocusIn);
    this._updateEmptyState();
  }

  disconnectedCallback(): void {
    this.removeEventListener("z-toggle", this._onNodeToggle);
    this.removeEventListener("z-select", this._onNodeSelect);
    this.removeEventListener("keydown", this._onKeyDown);
    this.removeEventListener("focusin", this._onFocusIn);
    super.disconnectedCallback();
  }

  updated(): void {
    this._bindSlotChange();
    this._updateEmptyState();
    this._adoptOrphanChildren();
    this._syncTabStops();
  }

  // [WHY] 2026-09-10 [[bug-20260910-tree-empty-state-visible]]：子节点晚于首帧挂载（框架先插入宿主、后插槽内容）时
  // empty 占位不会及时隐藏——connectedCallback/updated 之外没有触发点。按 [[web-components-render-pitfalls]] 陷阱 2
  // （每次渲染整体替换 shadow，监听须按节点引用重绑）绑 default slot 的 slotchange；
  // 陷阱 7：回调只改 style.display，绝不 requestUpdate（否则重分配再触发 slotchange 会死循环）。
  private _bindSlotChange(): void {
    const slot = this.shadowRoot!.querySelector<HTMLSlotElement>("slot");
    if (!slot || slot === this._slot) return;
    this._slot = slot;
    slot.addEventListener("slotchange", this._onSlotChange);
  }

  private _onSlotChange = (): void => {
    this._updateEmptyState();
    this._adoptOrphanChildren();
    this._syncTabStops();
  };

  private _slot: HTMLSlotElement | null = null;

  /**
   * 把「实际有子节点但没写 has-children」的节点补正。
   *
   * [WHY 值得自动修] `has-children` 是手写的第二份真相。漏写时箭头不出现、节点永远
   * 展不开，而**界面上一点报错都没有**（子节点被 CSS 折叠，看起来就像这棵树只有一层）。
   * 反过来 `has-children` 写多了只是多一个转不开的箭头 —— 所以只做「有子节点 ⇒ true」
   * 这一个方向的修正。
   *
   * 延迟加载的树不受影响：它的 `has-children` 本来就写了 true（子节点还没插入）。
   */
  private _adoptOrphanChildren(): void {
    for (const node of this._getNodes()) {
      if (node.hasChildren) continue;
      if (this._getChildren(node).length > 0) node.hasChildren = true;
    }
  }

  private _getNodes(): ZTreeNode[] {
    return Array.from(this.querySelectorAll<ZTreeNode>("z-tree-node"));
  }

  private _getTopLevelNodes(): ZTreeNode[] {
    return Array.from(this.children).filter(
      (c): c is ZTreeNode => c.tagName === "Z-TREE-NODE",
    );
  }

  /**
   * 某个节点的直接子节点。
   *
   * [WHY 不用 `slot.assignedElements()`] 原来的写法查 `slot[name='children']` 再取
   * 分配结果。真浏览器里没问题，但它把「谁是子节点」交给 **slot 分配**这一层间接机制：
   *   · happy-dom 不做 slot 分配 ⇒ `assignedElements()` 恒空 ⇒ cascade 与「可见节点」
   *     在测试里全部失效（实测 2026-11-16：K5/K6/K7/A5 一起红，而它们看起来像四个 bug）；
   *   · 更实际的问题：`assignedElements()` 只在**组件已升级并渲染过**之后才有值，
   *     首帧调用会拿到空数组 —— 那正是 `_adoptOrphanChildren` 运行的时刻。
   * 直接读 DOM 父子关系：结构就是真相，没有第二层可以不同步。
   */
  private _getChildren(parent: ZTreeNode): ZTreeNode[] {
    return Array.from(parent.children).filter(
      (c): c is ZTreeNode => c.tagName === "Z-TREE-NODE",
    );
  }

  private _getAllDescendants(parent: ZTreeNode): ZTreeNode[] {
    const result: ZTreeNode[] = [];
    const children = this._getChildren(parent);
    for (const child of children) {
      result.push(child);
      result.push(...this._getAllDescendants(child));
    }
    return result;
  }

  private _getParentOf(node: ZTreeNode): ZTreeNode | null {
    // light DOM 里的父节点就是「承载它的那个 z-tree-node」（子节点带 slot="children"）
    const parent = node.parentElement;
    return parent && parent.tagName === "Z-TREE-NODE" ? (parent as ZTreeNode) : null;
  }

  private _onNodeToggle = (e: Event): void => {
    e.stopPropagation();
    const node = (e.target as ZTreeNode);
    this.emit("z-expand", { node, open: node.open });
    // 展开/收起改变了「可见节点集合」，roving 的落点要跟着重算 —— 否则收起后
    // 焦点停在已经不可见的节点上，下一次方向键从 stale 的索引出发。
    this._syncTabStops();
  };

  private _onNodeSelect = (e: Event): void => {
    e.stopPropagation();
    this._toggleSelect(e.target as ZTreeNode);
  };

  /**
   * 选中/取消一个节点 —— **鼠标与键盘的唯一出口**。
   *
   * [WHY 必须合并] 原先键盘 Enter 走的是 `node.selected = !node.selected`，
   * 绕过了这里的三条规则：单选要清掉其它节点、多选要连动后代（cascade）、以及
   * `z-change` 的载荷。于是同一个树，**点一下只能选一个，按 Enter 却能选中一片**；
   * 而这两条路径在界面上看起来都对（底色都变蓝了）。这类分叉只能靠单一出口消除。
   */
  private _toggleSelect(node: ZTreeNode): void {
    if (!node || node.disabled) return;

    if (this.multiple) {
      node.selected = !node.selected;
      if (this.cascade) this._cascadeSelection(node, node.selected);
    } else if (!node.selected) {
      this._clearSelection();
      node.selected = true;
    } else {
      node.selected = false;
    }

    this.emit("z-change", { selected: this._getSelectedNodes() });
  }

  private _cascadeSelection(node: ZTreeNode, selected: boolean): void {
    for (const child of this._getAllDescendants(node)) {
      child.selected = selected;
    }
  }

  private _clearSelection(): void {
    for (const node of this._getNodes()) {
      node.selected = false;
    }
  }

  private _updateEmptyState(): void {
    const emptyEl = this.shadowRoot!.querySelector<HTMLElement>(".z-tree__empty");
    if (!emptyEl) return;
    const hasNodes = this._getTopLevelNodes().length > 0;
    emptyEl.style.display = hasNodes ? "none" : "";
  }

  private _getSelectedNodes(): ZTreeNode[] {
    return this._getNodes().filter((n) => n.selected);
  }

  private _getVisibleNodes(): ZTreeNode[] {
    const result: ZTreeNode[] = [];
    const walk = (nodes: ZTreeNode[]): void => {
      for (const node of nodes) {
        result.push(node);
        if (node.open && node.hasChildren) {
          walk(this._getChildren(node));
        }
      }
    };
    walk(this._getTopLevelNodes());
    return result;
  }

  /** 可见且未禁用的节点 —— roving 的候选集，也是方向键的行走范围。 */
  private _focusables(): ZTreeNode[] {
    return this._getVisibleNodes().filter((n) => !n.disabled);
  }

  /**
   * roving tabindex：候选集中恰好一个节点 `tabindex=0`，其余 `-1`。
   *
   * [WHY 用「已聚焦的节点」优先] 展开/收起会让候选集变化（收起时焦点要退回父级）。
   * 始终让**当前焦点所在**的那个保持 0，Tab 离开再回来才会回到原处，而不是每次
   * 都从树顶开始 —— 后者在 260px 宽、几十行的组织树上是灾难。
   */
  private _syncTabStops(): void {
    const focusables = this._focusables();
    if (focusables.length === 0) {
      for (const node of this._getNodes()) node.setAttribute("tabindex", "-1");
      return;
    }
    const active = deepActiveElement();
    let stop = focusables.find((n) => n === active);
    if (!stop) {
      // 焦点不在树上时保留上一次的落点（若它还在候选集里），否则回落到第一个
      stop = focusables.find((n) => n.getAttribute("tabindex") === "0") ?? focusables[0];
    }
    roveTo(stop, this._getNodes(), { focus: false });
  }

  /**
   * 焦点落进某个节点时，把 roving 落点跟过去。
   *
   * [WHY 需要这一条] 用鼠标点行、或者宿主代码 `node.focus()`，都不会经过 keydown；
   * 若不在这里同步，下一次 Tab 回到树里会跳到「上一个落点」，用户觉得点哪都不算数。
   */
  private _onFocusIn = (e: Event): void => {
    const node = e.target as ZTreeNode;
    if (node.tagName !== "Z-TREE-NODE") return;
    if (!this._focusables().includes(node)) return;
    roveTo(node, this._getNodes(), { focus: false });
  };

  private _focusNode(node: ZTreeNode | undefined): void {
    if (!node) return;
    roveTo(node, this._getNodes());
  }

  /**
   * 键盘事件作用的对象 —— 「当前项」的唯一算法。
   *
   * 两层回落：
   *   ① 真实焦点（穿透 shadow）—— 鼠标点到哪、Tab 停在哪，就跟到哪；
   *   ② 候选集第一项 —— 首次进树 / 焦点已不在树上。
   *
   * [WHY 没有「自己记住上一项」这一层] 试过，然后删了：它会把「聚焦失败」
   * 掩盖成「聚焦成功」—— 节点若因不可见而 `focus()` 无效，用户看不到任何焦点环，
   * 而下一次按 Enter 却选中了它。宁可回落到第一项（看得见的那个）。
   * 原先这里只有「`document.activeElement` 直接 `indexOf`」，取不到就是 -1，
   * 而 -1 在下面被 `max(idx, 0)` 悄悄抹平成 0 —— 缺陷因此完全静默。
   */
  private _currentNode(focusables: ZTreeNode[]): ZTreeNode {
    const active = deepActiveElement();
    if (active && focusables.includes(active as ZTreeNode)) return active as ZTreeNode;
    return focusables[0];
  }

  /**
   * 键盘导航（ARIA APG tree 模式）。
   *
   * 关键差异不在键位多寡，而在**当前项的算法**：必须用 `_currentNode()`（穿透 shadow），
   * 而不是 `document.activeElement` 直接比较 —— 后者在嵌套 shadow 里恒为 -1，
   * 所有「基于当前项」的键位都退化成第一项。
   *
   * 一维移动（↑↓ / Home / End）交给 L0 的 `roveByKey`：树在键盘眼里就是一条
   * 「扁平化的可见节点序」，与表头行、工具条是同一种移动，只是候选集怎么算不同。
   * ← → 不能交给它 —— 那两个键在树里有领域语义（展开/收起、进出层级），
   * 所以这里用 `axis: "vertical"`，让 L0 主动放弃这两个键。
   */
  private _onKeyDown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    const focusables = this._focusables();
    if (focusables.length === 0) return;

    const current = this._currentNode(focusables);

    switch (ke.key) {
      case "ArrowRight": {
        e.preventDefault();
        if (current.hasChildren && !current.open) {
          this._setOpen(current, true);
        } else if (current.open) {
          // 已展开 → 进第一个子节点（APG）；没有可进的子节点就原地不动
          const first = this._getChildren(current).find((c) => !c.disabled);
          this._focusNode(first);
        }
        return;
      }
      case "ArrowLeft": {
        e.preventDefault();
        if (current.open) {
          this._setOpen(current, false);
        } else {
          // 已收起 → 退回父节点（APG）
          const parent = this._getParentOf(current);
          if (parent && !parent.disabled) this._focusNode(parent);
        }
        return;
      }
      case "Enter":
      case " ": {
        e.preventDefault();
        this._toggleSelect(current);
        return;
      }
    }

    // 树到边停住、不环绕：从最后一行按 ↓ 跳回第一行，用户会以为看漏了一屏。
    if (roveByKey(focusables, current, ke.key, { wrap: false, axis: "vertical" })) {
      ke.preventDefault();
    }
  };

  /**
   * 键盘触发的展开/收起。
   *
   * [WHY 不能只写 `node.open = x`] 鼠标路径是 `TreeNode._toggle()` → 发 `z-toggle`
   * → 本类监听后发 `z-expand`。键盘若直接改属性，宿主就收不到 `z-expand` ——
   * 「点箭头会记日志、按方向键不会」，宿主很难察觉，通常表现为埋点数据少一半。
   */
  private _setOpen(node: ZTreeNode, open: boolean): void {
    if (node.open === open) return;
    node.open = open;
    this.emit("z-expand", { node, open });
    this._syncTabStops();
  }

}

customElements.define("z-tree", ZTree);
