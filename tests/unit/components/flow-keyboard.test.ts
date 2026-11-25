// Test: z-flow 的键盘路径 —— 焦点游走 / 选择 / 删除 / 移动
// Related: [[REQ-013-node-flow-editor]]
// Date: 2026-11-16
//
// [WHY 单独一份] 2026-11-16 之前 flow 域的所有测试都是「派发 pointer 事件 + 断言结果」，
// 一条真实按键都没有。于是「键盘用户按 Tab 进画布之后什么也做不了」长期没被发现：
// 那时确实有 Delete 分支，但 `_selection` 只由 pointerdown 建立 —— 键盘用户永远进不去。
// 这份测试的每条都用 `page` 级的真实焦点（`document.activeElement`）派发按键，
// 而不是往容器上 dispatch —— 焦点丢了之后往容器派发照样能到监听器，断言永远是绿的
// （z-radio-group 那轮的教训）。

import { describe, it, expect } from "vitest";
import "../../../src/flow/Flow";
import "../../../src/flow/FlowNode";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function mockSize(el: Element, width: number, height: number): void {
  Object.defineProperty(el, "offsetWidth", { configurable: true, value: width });
  Object.defineProperty(el, "offsetHeight", { configurable: true, value: height });
}

interface NodeSpec {
  id: string;
  position: string;
}

/** 2×2 网格：a(0,0) b(200,0) / c(0,120) d(200,120)。 */
function gridSpec(): NodeSpec[] {
  return [
    { id: "a", position: "0,0" },
    { id: "b", position: "200,0" },
    { id: "c", position: "0,120" },
    { id: "d", position: "200,120" },
  ];
}

function createFlow(specs: NodeSpec[] = gridSpec()): any {
  const flow = document.createElement("z-flow") as any;
  document.body.appendChild(flow);
  for (const s of specs) {
    const n = document.createElement("z-flow-node") as any;
    n.id = s.id;
    n.position = s.position;
    flow.appendChild(n);
    mockSize(n, 120, 40);
  }
  return flow;
}

function nodeOf(flow: any, id: string): any {
  return Array.from(flow.querySelectorAll("z-flow-node")).find((n: any) => n.id === id);
}

/**
 * 从**当前真实焦点**派发一次按键，返回是否被消费（preventDefault）。
 *
 * [WHY 返回这个] 「焦点停住了」和「这一键被吃掉」是两件事：画布边缘按 → 既要焦点不动，
 * 也不能吞掉页面滚动。z-table 那轮就是只断言了前者，把到边分支改成返回 -1 后仍然全绿。
 */
function press(key: string, opts: KeyboardEventInit = {}): boolean {
  const target = (document.activeElement as Element) ?? document.body;
  // [WHY cancelable: true] 合成事件默认不可取消，`preventDefault()` 会**静默失效**，
  // 于是「这一键有没有被消费」永远读到 false —— 断言看着在测东西，其实恒绿。
  // 真实浏览器里 keydown 是可取消的，这里必须显式还原。
  const ev = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    composed: true,
    cancelable: true,
    ...opts,
  });
  // dispatchEvent 返回 false ⇔ 某个监听器调了 preventDefault
  return !target.dispatchEvent(ev);
}

function focusedId(): string | null {
  const el = document.activeElement as HTMLElement | null;
  return el && el.tagName === "Z-FLOW-NODE" ? (el as any).id : null;
}

function selectedIds(flow: any): string[] {
  return Array.from(flow.querySelectorAll("z-flow-node"))
    .filter((n: any) => n.selected)
    .map((n: any) => n.id);
}

describe("z-flow 键盘：结构与停靠点", () => {
  it("K1 宿主一个 tabindex 都不能有，节点 set 是 listbox/option 对", async () => {
    const flow = createFlow();
    await wait();
    // ★ [WHY 断言「没有」而不是「等于 -1」] 2026-11-16 真机实测（Chrome 141）：
    // shadow 宿主带 tabindex="-1" 时，**整棵子树从顺序焦点导航里消失** ——
    // light DOM 里放原生 <button> 都按不到。规范没这条、AX 树也查不出
    // （focusable 仍为 true），只有真按 Tab 才暴露。这条断言就是那个约束的看门人：
    // 谁把 tabindex 加回来，真机上整个画布就再也进不去了。
    expect(flow.hasAttribute("tabindex"), "宿主不能有 tabindex，-1 会让子树从 Tab 序消失").toBe(false);
    expect(flow.getAttribute("role")).toBe("group");
    expect(flow.getAttribute("aria-label")).toBe("流程图");

    const list = flow.shadowRoot.querySelector(".z-flow__nodes");
    expect(list.getAttribute("role")).toBe("listbox");
    expect(list.getAttribute("aria-multiselectable")).toBe("true");
    // 若节点仍是 generic，aria-selected 会被无障碍树忽略 —— role 是它的前提
    expect(nodeOf(flow, "a").getAttribute("role")).toBe("option");
    document.body.removeChild(flow);
  });

  it("K2 整张画布只有一个 tabindex=0 的节点", async () => {
    const flow = createFlow();
    await wait();
    const stops = Array.from(flow.querySelectorAll("z-flow-node")).filter(
      (n: any) => n.getAttribute("tabindex") === "0",
    );
    expect(stops.length).toBe(1);
    expect((stops[0] as any).id).toBe("a");
    document.body.removeChild(flow);
  });

  it("K3 焦点落到某节点后，落点跟着它走（鼠标点完再 Tab 回来不回第一项）", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "c").focus();
    await wait();
    expect(focusedId()).toBe("c");
    expect(nodeOf(flow, "c").getAttribute("tabindex")).toBe("0");
    expect(nodeOf(flow, "a").getAttribute("tabindex")).toBe("-1");
    document.body.removeChild(flow);
  });
});

describe("z-flow 键盘：焦点游走", () => {
  it("K4 方向键走几何最近邻，不是 DOM 下一项", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "a").focus();
    await wait();

    expect(press("ArrowRight")).toBe(true);
    expect(focusedId(), "a 的右边是 b").toBe("b");

    press("ArrowDown");
    expect(focusedId(), "b 的下方是 d").toBe("d");

    press("ArrowLeft");
    expect(focusedId(), "d 的左边是 c").toBe("c");

    press("ArrowUp");
    expect(focusedId(), "c 的上方是 a").toBe("a");
    document.body.removeChild(flow);
  });

  it("K5 该方向没有邻居时不消费按键（不吞页面滚动）", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "b").focus();
    await wait();
    // b 在最右列：右边什么都没有
    expect(press("ArrowRight")).toBe(false);
    expect(focusedId()).toBe("b");
    // 反向自检：同一次会话里有邻居的方向必须消费
    expect(press("ArrowLeft")).toBe(true);
    expect(focusedId()).toBe("a");
    document.body.removeChild(flow);
  });

  it("K6 副轴加权：明显偏下方的节点不该被「右」选中", async () => {
    // a(0,0)；mid(160,0) 正右方；diag(40,200) 主轴更近但几乎在正下方。
    // 只按主轴比距离，diag 的主轴 60 < mid 的 160 ⇒ 按 → 会跳到下方那张卡上。
    const flow = createFlow([
      { id: "a", position: "0,0" },
      { id: "mid", position: "160,0" },
      { id: "diag", position: "40,200" },
    ]);
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowRight");
    expect(focusedId(), "「右边」应该优先同行的那张").toBe("mid");

    // 但它并没有被屏蔽：下方用 ↓ 仍然可达（加权只影响排序，不改变可达性）
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowDown");
    expect(focusedId()).toBe("diag");
    document.body.removeChild(flow);
  });

  it("K6b 中等偏斜（37°）也输给同行 —— 这条才锁得住加权系数", async () => {
    // a(0,0)；same-row(160,0) 正右方；slight(80,60) 右下方 37°。
    // 若副轴只按 1 倍计（main + cross），slight 得分 140 < 160 ⇒ 焦点会斜过去；
    // 按 2 倍计则 200 > 160 ⇒ 同行项胜出。两条用例分别锁「副轴参与排序」与「加权强度」。
    const flow = createFlow([
      { id: "a", position: "0,0" },
      { id: "same-row", position: "160,0" },
      { id: "slight", position: "80,60" },
    ]);
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowRight");
    expect(focusedId()).toBe("same-row");
    document.body.removeChild(flow);
  });

  it("K7 Home / End 落在 DOM 首尾，且只留一个停靠点", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "c").focus();
    await wait();

    press("End");
    expect(focusedId()).toBe("d");
    press("Home");
    expect(focusedId()).toBe("a");

    const stops = Array.from(flow.querySelectorAll("z-flow-node")).filter(
      (n: any) => n.getAttribute("tabindex") === "0",
    );
    expect(stops.length).toBe(1);
    document.body.removeChild(flow);
  });

  it("K8 焦点不在任何节点上时，方向键顺方向进场", async () => {
    const flow = createFlow();
    await wait();
    flow.focus();
    await wait();
    expect(focusedId()).toBe(null);
    press("ArrowDown");
    expect(focusedId(), "↓ 从第一个进场").toBe("a");

    flow.focus();
    await wait();
    press("ArrowUp");
    expect(focusedId(), "↑ 从最后一个进场").toBe("d");
    document.body.removeChild(flow);
  });
});

describe("z-flow 键盘：选择与删除", () => {
  it("K9 Enter 选中焦点节点，aria-selected 同步", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "b").focus();
    await wait();

    expect(press("Enter")).toBe(true);
    expect(selectedIds(flow)).toEqual(["b"]);
    // aria-selected 写在 updated() 里（不在 observedAttributes，避免选择变化触发二次渲染），
    // 所以属性更新落在一个渲染周期之后 —— 断言属性必须等一拍，读 `selected` 才同步。
    await wait();
    expect(nodeOf(flow, "b").getAttribute("aria-selected")).toBe("true");
    expect(nodeOf(flow, "a").getAttribute("aria-selected")).toBe("false");
    document.body.removeChild(flow);
  });

  it("K10 Shift+Enter 在选中集里切换（多选）", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("Enter");
    nodeOf(flow, "c").focus();
    await wait();
    press("Enter", { shiftKey: true });
    expect(selectedIds(flow).sort()).toEqual(["a", "c"]);

    // 再来一次：已在该集合里 ⇒ 反选掉，其它保留
    press("Enter", { shiftKey: true });
    expect(selectedIds(flow)).toEqual(["a"]);
    document.body.removeChild(flow);
  });

  it("K11 空格与 Enter 同义（两种习惯都支持）", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "d").focus();
    await wait();
    expect(press(" ")).toBe(true);
    expect(selectedIds(flow)).toEqual(["d"]);
    document.body.removeChild(flow);
  });

  it("K12 删掉焦点节点后焦点落到下一个，第二次 Delete 仍然有效", async () => {
    const flow = createFlow([
      { id: "a", position: "0,0" },
      { id: "b", position: "200,0" },
      { id: "c", position: "400,0" },
    ]);
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("Enter");
    press("Delete");
    await wait();
    expect(Array.from(flow.querySelectorAll("z-flow-node")).map((n: any) => n.id)).toEqual(["b", "c"]);
    // [WHY 这条是核心] 节点被 remove() 时焦点掉到 <body>，若不补焦点，
    // 第二次 Delete 根本不冒泡到画布 —— **键盘用户只能删一次**
    expect(focusedId(), "删完焦点要落在下一个节点上").toBe("b");

    press("Enter");
    press("Delete");
    await wait();
    expect(Array.from(flow.querySelectorAll("z-flow-node")).map((n: any) => n.id)).toEqual(["c"]);
    document.body.removeChild(flow);
  });

  it("K13 删完最后一个节点后不留悬空焦点陷阱", async () => {
    const flow = createFlow([{ id: "solo", position: "0,0" }]);
    await wait();
    nodeOf(flow, "solo").focus();
    await wait();
    press("Enter");
    press("Delete");
    await wait();
    expect(flow.querySelectorAll("z-flow-node").length).toBe(0);
    // 没有可操作内容了：焦点落回 body 是预期。宿主不能当兜底（它不能有 tabindex，
    // 见 K1），所以这里**不**断言「焦点回到画布」——那正是我第一版写错的地方。
    expect(focusedId()).toBe(null);
    document.body.removeChild(flow);
  });
});

describe("z-flow 键盘：移动节点", () => {
  it("K14 Shift+→ 移动焦点节点并提交一次（emit 而非逐帧）", async () => {
    const flow = createFlow();
    await wait();
    const changes: string[] = [];
    flow.addEventListener("z-flow-change", (e: any) => changes.push(e.detail.nodes[0].position));
    nodeOf(flow, "a").focus();
    await wait();

    expect(press("ArrowRight", { shiftKey: true })).toBe(true);
    expect(nodeOf(flow, "a").position).toBe("10,0");
    press("ArrowRight", { shiftKey: true });
    expect(nodeOf(flow, "a").position).toBe("20,0");
    expect(changes.length, "每按一次提交一次，但一次只提交一次").toBe(2);

    press("ArrowDown", { shiftKey: true });
    expect(nodeOf(flow, "a").position).toBe("20,10");
    document.body.removeChild(flow);
  });

  it("K15 有选中时整组移动，没选中时只动焦点那个", async () => {
    const flow = createFlow();
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("Enter");
    nodeOf(flow, "b").focus();
    await wait();
    press("Enter", { shiftKey: true });
    expect(selectedIds(flow).sort()).toEqual(["a", "b"]);

    press("ArrowDown", { shiftKey: true });
    expect(nodeOf(flow, "a").position).toBe("0,10");
    expect(nodeOf(flow, "b").position).toBe("200,10");
    expect(nodeOf(flow, "c").position, "没选中的不动").toBe("0,120");
    document.body.removeChild(flow);
  });

  it("K16 开了吸附时步长跟随 snapSize（键盘与鼠标结果一致）", async () => {
    const flow = createFlow();
    flow.snapToGrid = true;
    flow.snapSize = 25;
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowRight", { shiftKey: true });
    expect(nodeOf(flow, "a").position, "吸附开启时键盘挪过的节点也要落在网格上").toBe("25,0");
    document.body.removeChild(flow);
  });

  it("K17 节点的位置变化会重算边", async () => {
    const flow = createFlow([
      { id: "a", position: "0,0" },
      { id: "b", position: "200,0" },
    ]);
    flow.edges = [{ id: "e1", source: "a", target: "b" }];
    await wait();
    flow.refreshEdges();
    const before = flow.shadowRoot.querySelector(".z-flow__edge-path")?.getAttribute("d");
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowDown", { shiftKey: true });
    press("ArrowDown", { shiftKey: true });
    await wait();
    const after = flow.shadowRoot.querySelector(".z-flow__edge-path")?.getAttribute("d");
    expect(before).toBeTruthy();
    expect(after, "节点挪了，边必须跟着走").not.toBe(before);
    document.body.removeChild(flow);
  });
});

describe("z-flow 键盘：只读画布", () => {
  it("K18 editable=false 时仍可浏览（方向键、Home/End、焦点）", async () => {
    const flow = createFlow();
    flow.editable = false;
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    press("ArrowRight");
    expect(focusedId()).toBe("b");
    press("End");
    expect(focusedId()).toBe("d");
    document.body.removeChild(flow);
  });

  it("K19 editable=false 时不能选中、不能删除、不能移动", async () => {
    const flow = createFlow();
    flow.editable = false;
    await wait();
    nodeOf(flow, "a").focus();
    await wait();
    expect(press("Enter")).toBe(false);
    expect(selectedIds(flow)).toEqual([]);
    expect(press("Delete")).toBe(false);
    expect(press("ArrowRight", { shiftKey: true })).toBe(false);
    expect(nodeOf(flow, "a").position).toBe("0,0");
    expect(flow.querySelectorAll("z-flow-node").length).toBe(4);
    document.body.removeChild(flow);
  });

  it("K20 焦点在节点内的输入框里时，方向键属于输入框", async () => {
    const flow = createFlow();
    await wait();
    const node = nodeOf(flow, "a");
    const input = document.createElement("input");
    node.appendChild(input);
    node.focus();
    await wait();
    input.focus();
    await wait();
    expect(press("ArrowRight")).toBe(false);
    expect(focusedId()).toBe(null);
    document.body.removeChild(flow);
  });
});
