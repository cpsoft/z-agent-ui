// Test: z-tree and z-tree-node components
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/tree-node/TreeNode";
import "../../../src/components/tree/Tree";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe("z-tree-node", () => {
  function createNode(): any {
    const el = document.createElement("z-tree-node") as any;
    el.label = "Node A";
    document.body.appendChild(el);
    return el;
  }

  it("renders label", async () => {
    const el = createNode();
    await wait();
    const label = el.shadowRoot!.querySelector(".z-tree-node__label")!;
    expect(label.textContent).toContain("Node A");
    document.body.removeChild(el);
  });

  it("renders collapsed by default", async () => {
    const el = createNode();
    await wait();
    const root = el.shadowRoot!.querySelector(".z-tree-node")!;
    expect(root.classList.contains("z-tree-node--expanded")).toBe(false);
    document.body.removeChild(el);
  });

  it("shows toggle button when has-children is true", async () => {
    const el = createNode();
    el.hasChildren = true;
    await wait();
    const toggle = el.shadowRoot!.querySelector(".z-tree-node__toggle")!;
    expect(toggle.classList.contains("z-tree-node__toggle--hidden")).toBe(false);
    document.body.removeChild(el);
  });

  it("hides toggle button when has-children is false", async () => {
    const el = createNode();
    await wait();
    const toggle = el.shadowRoot!.querySelector(".z-tree-node__toggle")!;
    expect(toggle.classList.contains("z-tree-node__toggle--hidden")).toBe(true);
    document.body.removeChild(el);
  });

  it("expands on toggle click", async () => {
    const el = createNode();
    el.hasChildren = true;
    await wait();

    const toggle = el.shadowRoot!.querySelector(".z-tree-node__toggle")!;
    (toggle as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(el.open).toBe(true);
    const root = el.shadowRoot!.querySelector(".z-tree-node")!;
    expect(root.classList.contains("z-tree-node--expanded")).toBe(true);
    document.body.removeChild(el);
  });

  it("does not toggle when disabled", async () => {
    const el = createNode();
    el.hasChildren = true;
    el.disabled = true;
    await wait();

    const toggle = el.shadowRoot!.querySelector(".z-tree-node__toggle")!;
    (toggle as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-toggle on expand", async () => {
    const el = createNode();
    el.hasChildren = true;
    await wait();

    const handler = vi.fn();
    el.addEventListener("z-toggle", handler);

    const toggle = el.shadowRoot!.querySelector(".z-tree-node__toggle")!;
    (toggle as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.open).toBe(true);
    document.body.removeChild(el);
  });

  it("emits z-select on row click", async () => {
    const el = createNode();
    await wait();

    const handler = vi.fn();
    el.addEventListener("z-select", handler);

    const row = el.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(handler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("does not emit z-select when disabled", async () => {
    const el = createNode();
    el.disabled = true;
    await wait();

    const handler = vi.fn();
    el.addEventListener("z-select", handler);

    const row = el.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("applies selected class when selected is true", async () => {
    const el = createNode();
    el.selected = true;
    await wait();
    const root = el.shadowRoot!.querySelector(".z-tree-node")!;
    expect(root.classList.contains("z-tree-node--selected")).toBe(true);
    document.body.removeChild(el);
  });

  // [WHY 断言在宿主上而不是 shadow 里的 row] 2026-11-16 改：treeitem 的语义整体搬到
  // 宿主（可聚焦的那一层），因为 row 在 shadow 里 ⇒ 节点不可聚焦、`document.activeElement`
  // 取到的永远是宿主，方向键「当前项」恒算成第一项。这里同时反向钉住 row 上不许再有
  // treeitem —— 否则读屏会遇到「树项目套树项目」，念两遍。
  it("has aria-level based on level property", async () => {
    const el = createNode();
    el.level = 2;
    await wait();
    expect(el.getAttribute("role")).toBe("treeitem");
    expect(el.getAttribute("aria-level")).toBe("3"); // level + 1
    const row = el.shadowRoot!.querySelector(".z-tree-node__row")!;
    expect(row.getAttribute("role"), "row 不该再是 treeitem").toBeNull();
    expect(row.getAttribute("aria-level"), "row 上不该再有 aria-level").toBeNull();
    document.body.removeChild(el);
  });

  // [WHY] 计数/徽标必须是独立节点：拼进 label 文本时会被 text-overflow:ellipsis 整段吃掉
  // （宿主树宽 260px + 长组织名）。这三条断言锁住「独立盒子 + 空值不占位 + 属性回写」。
  // See: zWorker wiki/bugs/bug-20261031-org-tree-count-invisible.md
  it("renders badge as a separate node, not inside the label text", async () => {
    const el = createNode();
    el.badge = "38";
    await wait();
    const label = el.shadowRoot!.querySelector(".z-tree-node__label")!;
    const badge = el.shadowRoot!.querySelector(".z-tree-node__badge")!;
    expect(label.textContent).toBe("Node A");
    expect(badge.textContent).toBe("38");
    expect(badge.hasAttribute("hidden")).toBe(false);
    document.body.removeChild(el);
  });

  it("hides the badge when it is empty", async () => {
    const el = createNode();
    await wait();
    const badge = el.shadowRoot!.querySelector(".z-tree-node__badge")! as HTMLElement;
    expect(badge.hidden).toBe(true);
    document.body.removeChild(el);
  });

  it("syncs label and badge text after the first render", async () => {
    const el = createNode();
    await wait();
    el.label = "Renamed";
    el.badge = "7";
    await wait();
    expect(el.shadowRoot!.querySelector(".z-tree-node__label")!.textContent).toBe("Renamed");
    const badge = el.shadowRoot!.querySelector(".z-tree-node__badge")! as HTMLElement;
    expect(badge.textContent).toBe("7");
    expect(badge.hidden).toBe(false);
    document.body.removeChild(el);
  });
});

describe("z-tree", () => {
  function createTree(): any {
    const el = document.createElement("z-tree") as any;
    document.body.appendChild(el);
    return el;
  }

  function createNode(label: string, hasChildren = false): any {
    const node = document.createElement("z-tree-node") as any;
    node.label = label;
    node.hasChildren = hasChildren;
    return node;
  }

  it("renders empty text when no children", async () => {
    const el = createTree();
    await wait();
    const empty = el.shadowRoot!.querySelector(".z-tree__empty")!;
    expect((empty as HTMLElement).style.display).not.toBe("none");
    document.body.removeChild(el);
  });

  it("hides empty text when children are present", async () => {
    const el = createTree();
    el.appendChild(createNode("Item 1"));
    await wait();
    const empty = el.shadowRoot!.querySelector(".z-tree__empty")!;
    expect((empty as HTMLElement).style.display).toBe("none");
    document.body.removeChild(el);
  });

  // [WHY] 2026-09-10 [[bug-20260910-tree-empty-state-visible]]：真实浏览器中框架先插入宿主、后插槽内容
  // （zWorker 门店组织树 Vue 渲染即此序），首帧 empty 可见后无触发点隐藏。happy-dom 不自动派发
  // slotchange，手动派发模拟节点晚挂载；见 [[web-components-render-pitfalls]] 陷阱 7。
  it("hides empty text when children attach after first render", async () => {
    const el = createTree();
    await wait();
    const empty = el.shadowRoot!.querySelector(".z-tree__empty") as HTMLElement;
    expect(empty.style.display).not.toBe("none");
    el.appendChild(createNode("Item 1"));
    el.shadowRoot!.querySelector("slot")!.dispatchEvent(new Event("slotchange"));
    expect(empty.style.display).toBe("none");
    document.body.removeChild(el);
  });

  it("supports custom empty text via property", async () => {
    const el = createTree();
    el.emptyText = "Nothing here";
    await wait();
    const empty = el.shadowRoot!.querySelector(".z-tree__empty")!;
    expect(empty.textContent).toContain("Nothing here");
    document.body.removeChild(el);
  });

  it("reads empty-text attribute on initial render", async () => {
    const el = document.createElement("z-tree") as any;
    el.setAttribute("empty-text", "Custom Empty");
    document.body.appendChild(el);
    await wait();
    const empty = el.shadowRoot!.querySelector(".z-tree__empty")!;
    expect(empty.textContent).toContain("Custom Empty");
    document.body.removeChild(el);
  });

  it("clears selection on single-select mode", async () => {
    const el = createTree();
    const a = createNode("A");
    const b = createNode("B");
    el.appendChild(a);
    el.appendChild(b);
    await wait();

    a.selected = true;
    await wait();

    const row = b.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(a.selected).toBe(false);
    expect(b.selected).toBe(true);
    document.body.removeChild(el);
  });

  it("allows multiple selection when multiple is true", async () => {
    const el = createTree();
    el.multiple = true;
    const a = createNode("A");
    const b = createNode("B");
    el.appendChild(a);
    el.appendChild(b);
    await wait();

    const rowA = a.shadowRoot!.querySelector(".z-tree-node__row")!;
    (rowA as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    const rowB = b.shadowRoot!.querySelector(".z-tree-node__row")!;
    (rowB as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(a.selected).toBe(true);
    expect(b.selected).toBe(true);
    document.body.removeChild(el);
  });

  it("deselects node on second click in single mode", async () => {
    const el = createTree();
    const a = createNode("A");
    el.appendChild(a);
    await wait();

    a.selected = true;
    await wait();

    const row = a.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(a.selected).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-change on selection", async () => {
    const el = createTree();
    el.appendChild(createNode("A"));
    await wait();

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    const node = el.querySelector("z-tree-node")!;
    const row = node.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.selected.length).toBe(1);
    document.body.removeChild(el);
  });

  it("does not select disabled nodes", async () => {
    const el = createTree();
    const a = createNode("A");
    a.disabled = true;
    el.appendChild(a);
    await wait();

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    const row = a.shadowRoot!.querySelector(".z-tree-node__row")!;
    (row as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await wait();

    expect(handler).not.toHaveBeenCalled();
    expect(a.selected).toBe(false);
    document.body.removeChild(el);
  });

  it("renders with role tree", async () => {
    const el = createTree();
    await wait();
    const root = el.shadowRoot!.querySelector('[role="tree"]')!;
    expect(root).toBeDefined();
    document.body.removeChild(el);
  });
});

// ── 键盘导航（2026-11-16）──────────────────────────────────────────────────
//
// 这一组存在的理由：改造前 `z-tree` 的 `_onKeyDown` **看起来**是完整的（方向键、
// 左右展开收起、Enter 全都有），但一条键盘测试都没有。真机实测发现它整体是空转：
// 节点宿主不可聚焦 ⇒ `node.focus()` 静默失败 ⇒ `document.activeElement` 永远是
// 容器 ⇒ `indexOf` 恒 -1 ⇒ 不管按几下，Enter 都作用在**第一个**节点。
// 界面上「高亮没变、选中没变」，像按了没反应；实际是选错了对象。
//
// 所以这里的判据必须是**「第 N 项」而不是「某一项」**：只断言「按下后有节点被选中」
// 的话，恒第一项也能绿（这正是它坏了两年的原因）。
describe("z-tree 键盘导航", () => {
  /** 建一棵：A(a1, a2) / B / C —— 三层、带一个折叠分支。 */
  function makeTree(): any {
    const el = document.createElement("z-tree") as any;
    el.innerHTML = `
      <z-tree-node label="A" has-children>
        <z-tree-node slot="children" label="a1" level="1"></z-tree-node>
        <z-tree-node slot="children" label="a2" level="1"></z-tree-node>
      </z-tree-node>
      <z-tree-node label="B"></z-tree-node>
      <z-tree-node label="C"></z-tree-node>`;
    document.body.appendChild(el);
    return el;
  }

  const nodeOf = (tree: any, label: string): any =>
    Array.from(tree.querySelectorAll("z-tree-node") as NodeListOf<any>).find((n) => n.label === label);

  const press = (tree: any, key: string): void => {
    tree.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, composed: true }));
  };

  it("K1 只有第一个可见节点进 Tab 序列（roving）", async () => {
    const tree = makeTree();
    await wait();
    const stops = Array.from(tree.querySelectorAll("z-tree-node") as NodeListOf<any>)
      .filter((n) => n.getAttribute("tabindex") === "0")
      .map((n) => n.label);
    // 折叠时只有 A / B / C 可见；a1 a2 在收起的分支里，不该是 Tab 落点
    expect(stops).toEqual(["A"]);
    expect(nodeOf(tree, "a1").getAttribute("tabindex")).toBe("-1");
    document.body.removeChild(tree);
  });

  it("K2 方向键把焦点真的移到下一个节点上", async () => {
    const tree = makeTree();
    await wait();
    const a = nodeOf(tree, "A");
    a.focus();
    await wait();
    expect(document.activeElement, "宿主必须可聚焦：否则 node.focus() 静默空转").toBe(a);

    press(tree, "ArrowDown");
    await wait();
    expect(document.activeElement).toBe(nodeOf(tree, "B"));
    expect(nodeOf(tree, "B").getAttribute("tabindex")).toBe("0");
    expect(nodeOf(tree, "A").getAttribute("tabindex")).toBe("-1");
    document.body.removeChild(tree);
  });

  it("K3 ★ Enter 作用在**当前**节点，而不是恒第一项", async () => {
    const tree = makeTree();
    await wait();
    // 焦点移到 B（第二项）再按 Enter —— 这是改造前必然失败的判据
    nodeOf(tree, "B").focus();
    await wait();
    press(tree, "Enter");
    await wait();

    const selected = Array.from(tree.querySelectorAll("z-tree-node") as NodeListOf<any>)
      .filter((n) => n.selected)
      .map((n) => n.label);
    expect(selected, "按 Enter 选中的必须是焦点所在的 B，不是第一项 A").toEqual(["B"]);
    document.body.removeChild(tree);
  });

  it("K4 单选树：键盘连续选中会取代上一项（与鼠标同一条出口）", async () => {
    const tree = makeTree();
    await wait();
    nodeOf(tree, "B").focus();
    await wait();
    press(tree, "Enter");
    await wait();
    nodeOf(tree, "C").focus();
    await wait();
    press(tree, "Enter");
    await wait();

    const selected = Array.from(tree.querySelectorAll("z-tree-node") as NodeListOf<any>)
      .filter((n) => n.selected)
      .map((n) => n.label);
    // 改造前键盘直写 `node.selected = !node.selected`，绕过 _clearSelection ⇒ 会是 ["A","B","C"]
    expect(selected, "单选树同时选中多个 = 键盘绕过了鼠标那条规则").toEqual(["C"]);
    document.body.removeChild(tree);
  });

  it("K5 多选 + cascade：键盘选中父级会连动后代", async () => {
    const tree = makeTree();
    tree.multiple = true;
    tree.cascade = true;
    await wait();
    const a = nodeOf(tree, "A");
    a.focus();
    await wait();
    press(tree, "Enter");
    await wait();

    expect(a.selected).toBe(true);
    expect(nodeOf(tree, "a1").selected, "cascade 没生效：键盘走的是另一条路").toBe(true);
    expect(nodeOf(tree, "a2").selected).toBe(true);
    document.body.removeChild(tree);
  });

  it("K6 右方向键：展开当前节点 → 再按进第一个子节点", async () => {
    const tree = makeTree();
    await wait();
    const a = nodeOf(tree, "A");
    a.focus();
    await wait();

    press(tree, "ArrowRight");
    await wait();
    expect(a.open, "右方向键应先展开").toBe(true);
    expect(document.activeElement, "展开后焦点仍留在 A").toBe(a);

    press(tree, "ArrowRight");
    await wait();
    expect(document.activeElement, "已展开时右方向键进第一个子节点").toBe(nodeOf(tree, "a1"));
    document.body.removeChild(tree);
  });

  it("K7 左方向键：收起当前节点 → 再按退回父级", async () => {
    const tree = makeTree();
    await wait();
    const a = nodeOf(tree, "A");
    a.open = true;
    await wait();

    const a1 = nodeOf(tree, "a1");
    a1.focus();
    await wait();

    press(tree, "ArrowLeft");
    await wait();
    expect(document.activeElement, "自己已收起（a1 无子节点）⇒ 应退回父级 A").toBe(a);

    press(tree, "ArrowLeft");
    await wait();
    expect(a.open, "父级已展开 ⇒ 这一次才收起它").toBe(false);
    document.body.removeChild(tree);
  });

  it("K8 Home / End 到首尾可见节点", async () => {
    const tree = makeTree();
    await wait();
    nodeOf(tree, "B").focus();
    await wait();

    press(tree, "End");
    await wait();
    expect(document.activeElement).toBe(nodeOf(tree, "C"));

    press(tree, "Home");
    await wait();
    expect(document.activeElement).toBe(nodeOf(tree, "A"));
    document.body.removeChild(tree);
  });

  it("K9 键盘展开也要发 z-expand（与点箭头同一条出口）", async () => {
    const tree = makeTree();
    await wait();
    const handler = vi.fn();
    tree.addEventListener("z-expand", handler);

    nodeOf(tree, "A").focus();
    await wait();
    press(tree, "ArrowRight");
    await wait();

    // 改造前键盘直写 `node.open = true`：宿主收不到 z-expand，埋点/懒加载全都不触发
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.open).toBe(true);
    document.body.removeChild(tree);
  });

  it("K10 方向键跳过禁用节点", async () => {
    const tree = makeTree();
    await wait();
    nodeOf(tree, "B").disabled = true;
    await wait();

    nodeOf(tree, "A").focus();
    await wait();
    press(tree, "ArrowDown");
    await wait();
    expect(document.activeElement, "禁用的 B 不该拿到焦点").toBe(nodeOf(tree, "C"));
    document.body.removeChild(tree);
  });

  /**
   * K11：树被嵌在**一层 shadow 里**（真实宿主的常见形态）时，当前项仍算得对。
   *
   * [WHY 必须单独有这一条 —— 它是唯一能区分两种实现的判据] 改造时我把
   * `deepActiveElement()` 换回 `document.activeElement` 做过变异：**41 条全绿**。
   * 因为平铺场景下焦点就在 light DOM 的节点宿主上，两者恰好相等 ——
   * 断言分不出优劣，而真实宿主（Vue 里再包一层自定义元素 / 编辑器面板）里
   * 焦点落进 shadow，`document.activeElement` 拿到的是**外层宿主**，
   * `indexOf` 恒 -1 ⇒ 又退回「Enter 永远选中第一项」。
   * 所以这条必须让树住进 shadow 里，否则它守的东西在测试里根本不存在。
   */
  it("K11 ★ 树住进 shadow 时，方向键与 Enter 仍对着当前项", async () => {
    const outer = document.createElement("div");
    document.body.appendChild(outer);
    const shadow = outer.attachShadow({ mode: "open" });
    const tree = document.createElement("z-tree") as any;
    tree.innerHTML = `
      <z-tree-node label="A"></z-tree-node>
      <z-tree-node label="B"></z-tree-node>
      <z-tree-node label="C"></z-tree-node>`;
    shadow.appendChild(tree);
    await wait();

    const nodes = Array.from(tree.querySelectorAll("z-tree-node") as NodeListOf<any>);
    const nodeOf2 = (label: string): any => nodes.find((n) => n.label === label);

    nodeOf2("B").focus();
    await wait();
    // 前置：确认这棵树确实“住在 shadow 里”，否则这条用例退化成 K3
    expect(document.activeElement, "焦点在 shadow 内时，document 看到的是外层宿主").toBe(outer);
    expect(shadow.activeElement).toBe(nodeOf2("B"));

    press(tree, "Enter");
    await wait();
    expect(nodes.filter((n) => n.selected).map((n) => n.label), "又选中了第一项 = 没穿透 shadow").toEqual(["B"]);

    press(tree, "ArrowDown");
    await wait();
    expect(shadow.activeElement).toBe(nodeOf2("C"));
    document.body.removeChild(outer);
  });
});

// ── 无障碍树（2026-11-16）──────────────────────────────────────────────────
//
// [WHY 这几条必须存在] 折叠用的是 `max-height:0; opacity:0`，2026-11-16 用 CDP 取
// 全量 AX 树实测：收起分支的子项 `ignored:false` —— 读屏照念。界面上它们确实看不见，
// 所以只靠肉眼看 demo 永远发现不了。
describe("z-tree 无障碍语义", () => {
  it("A1 叶子节点不许有 aria-expanded（否则读屏会说「已折叠」暗示可展开）", async () => {
    const el = document.createElement("z-tree-node") as any;
    el.label = "leaf";
    document.body.appendChild(el);
    await wait();
    expect(el.getAttribute("aria-expanded")).toBeNull();
    document.body.removeChild(el);
  });

  it("A2 有子节点时 aria-expanded 跟随 open", async () => {
    const el = document.createElement("z-tree-node") as any;
    el.label = "branch";
    el.hasChildren = true;
    document.body.appendChild(el);
    await wait();
    expect(el.getAttribute("aria-expanded")).toBe("false");

    el.open = true;
    await wait();
    expect(el.getAttribute("aria-expanded")).toBe("true");
    document.body.removeChild(el);
  });

  it("A3 收起的分支交给 aria-hidden + inert 挡住（CSS 折叠挡不住读屏与 Tab）", async () => {
    const el = document.createElement("z-tree-node") as any;
    el.label = "branch";
    el.hasChildren = true;
    el.innerHTML = `<z-tree-node slot="children" label="child"></z-tree-node>`;
    document.body.appendChild(el);
    await wait();

    const group = el.shadowRoot!.querySelector(".z-tree-node__children")!;
    expect(group.getAttribute("aria-hidden")).toBe("true");
    expect(group.hasAttribute("inert")).toBe(true);

    el.open = true;
    await wait();
    expect(group.hasAttribute("aria-hidden"), "展开后要让子项回到无障碍树").toBe(false);
    expect(group.hasAttribute("inert")).toBe(false);
    document.body.removeChild(el);
  });

  it("A4 名字来自 label（aria-label 写在宿主上，不是跨树的 aria-labelledby）", async () => {
    const el = document.createElement("z-tree-node") as any;
    el.label = "技术部";
    el.badge = "38";
    document.body.appendChild(el);
    await wait();
    expect(el.getAttribute("aria-label")).toBe("技术部 38");
    expect(el.getAttribute("aria-labelledby"), "跨 shadow 的 IDREF 解析不到").toBeNull();
    document.body.removeChild(el);
  });

  it("A5 实际有子节点但漏写 has-children 时自动补正", async () => {
    const el = document.createElement("z-tree") as any;
    el.innerHTML = `
      <z-tree-node label="父">
        <z-tree-node slot="children" label="子" level="1"></z-tree-node>
      </z-tree-node>`;
    document.body.appendChild(el);
    await wait();

    const parent = el.querySelector("z-tree-node") as any;
    // 漏写时子节点被 CSS 折叠、箭头不出现，界面上像一棵只有一层的树，且永远展不开
    expect(parent.hasChildren, "有子节点就该是 true，不该依赖作者手写第二份真相").toBe(true);
    document.body.removeChild(el);
  });

  it("A6 多选树在容器上标 aria-multiselectable", async () => {
    const el = document.createElement("z-tree") as any;
    document.body.appendChild(el);
    await wait();
    expect(el.shadowRoot!.querySelector('[role="tree"]')!.getAttribute("aria-multiselectable")).toBeNull();

    el.multiple = true;
    await wait();
    expect(el.shadowRoot!.querySelector('[role="tree"]')!.getAttribute("aria-multiselectable")).toBe("true");
    document.body.removeChild(el);
  });
});
