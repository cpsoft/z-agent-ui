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
