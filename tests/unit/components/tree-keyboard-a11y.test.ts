// Test: z-tree and z-tree-node components
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/tree-node/TreeNode";
import "../../../src/components/tree/Tree";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

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
