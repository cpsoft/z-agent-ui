// Test: z-flow canvas (viewport/pan/zoom/edges/connect/selection/delete)
// Related: [[REQ-013-node-flow-editor]]
// Wiki: wiki/requirements/REQ-013-node-flow-editor.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/flow/Flow";
import "../../../src/flow/FlowNode";
import "../../../src/flow/FlowHandle";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function mockRect(el: Element, left: number, top: number, width: number, height: number): void {
  Object.defineProperty(el, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

function mockSize(el: Element, width: number, height: number): void {
  Object.defineProperty(el, "offsetWidth", { configurable: true, value: width });
  Object.defineProperty(el, "offsetHeight", { configurable: true, value: height });
}

function createFlow(): any {
  const flow = document.createElement("z-flow") as any;
  document.body.appendChild(flow);
  return flow;
}

function addNode(flow: any, id: string, position: string): any {
  const n = document.createElement("z-flow-node") as any;
  n.id = id;
  n.position = position;
  flow.appendChild(n);
  return n;
}

function addHandle(node: any, id: string, type: string): any {
  const h = document.createElement("z-flow-handle") as any;
  h.id = id;
  h.type = type;
  node.appendChild(h);
  return h;
}

function pointer(el: EventTarget, type: string, x: number, y: number): void {
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: x, clientY: y }));
}

describe("z-flow structure", () => {
  it("renders viewport, edges svg, background and slots", async () => {
    const flow = createFlow();
    await wait();
    const shadow = flow.shadowRoot!;
    expect(shadow.querySelector(".z-flow__viewport")).toBeTruthy();
    expect(shadow.querySelector(".z-flow__edges")).toBeTruthy();
    expect(shadow.querySelector(".z-flow__bg--dots")).toBeTruthy();
    expect(shadow.querySelector("slot[name='minimap']")).toBeTruthy();
    expect(shadow.querySelector("slot[name='controls']")).toBeTruthy();
    document.body.removeChild(flow);
  });

  it("supports lines and none backgrounds", async () => {
    const flow = createFlow();
    flow.background = "lines";
    await wait();
    expect(flow.shadowRoot!.querySelector(".z-flow__bg--lines")).toBeTruthy();
    flow.background = "none";
    await wait();
    expect(flow.shadowRoot!.querySelector(".z-flow__bg--none")).toBeTruthy();
    document.body.removeChild(flow);
  });
});

describe("z-flow viewport", () => {
  it("applies viewport transform", async () => {
    const flow = createFlow();
    await wait();
    flow.setViewport({ x: 100, y: 50, zoom: 1.5 });
    const vp = flow.shadowRoot!.querySelector(".z-flow__viewport") as HTMLElement;
    expect(vp.style.transform).toBe("translate(100px, 50px) scale(1.5)");
    document.body.removeChild(flow);
  });

  it("clamps zoom to min/max", async () => {
    const flow = createFlow();
    await wait();
    flow.setViewport({ x: 0, y: 0, zoom: 10 });
    expect(flow.viewport.zoom).toBe(2);
    flow.setViewport({ x: 0, y: 0, zoom: 0.01 });
    expect(flow.viewport.zoom).toBe(0.5);
    document.body.removeChild(flow);
  });

  it("emits z-viewport-change on setViewport", async () => {
    const flow = createFlow();
    await wait();
    const detail = await new Promise<any>((resolve) => {
      flow.addEventListener("z-viewport-change", (e: Event) => resolve((e as CustomEvent).detail));
      flow.setViewport({ x: 10, y: 20, zoom: 1.2 });
    });
    expect(detail).toEqual({ x: 10, y: 20, zoom: 1.2 });
    document.body.removeChild(flow);
  });

  it("pans viewport on empty-area drag", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    await wait();
    pointer(flow, "pointerdown", 100, 100);
    pointer(window, "pointermove", 150, 120);
    pointer(window, "pointerup", 150, 120);
    expect(flow.viewport.x).toBe(50);
    expect(flow.viewport.y).toBe(20);
    document.body.removeChild(flow);
  });

  // [WHY] happy-dom 的 WheelEvent 构造忽略 clientX/clientY（返回 undefined），
  // 需 defineProperty 补上；真实浏览器直接可用。修饰键同理（恒 false）。
  function wheel(
    flow: any,
    x: number,
    y: number,
    deltaY: number,
    mods: { ctrlKey?: boolean } = {},
  ): WheelEvent {
    const e = new WheelEvent("wheel", { bubbles: true, cancelable: true, deltaY });
    Object.defineProperty(e, "clientX", { value: x });
    Object.defineProperty(e, "clientY", { value: y });
    if (mods.ctrlKey) Object.defineProperty(e, "ctrlKey", { value: true });
    flow.dispatchEvent(e);
    return e;
  }

  it("zooms toward cursor on ctrl+wheel", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    await wait();
    wheel(flow, 400, 300, -100, { ctrlKey: true });
    const vp = flow.viewport;
    expect(vp.zoom).toBeCloseTo(1.1);
    // 光标锚点：光标下的 flow 坐标缩放前后不变
    expect((400 - vp.x) / vp.zoom).toBeCloseTo(400);
    expect((300 - vp.y) / vp.zoom).toBeCloseTo(300);
    document.body.removeChild(flow);
  });

  // 基础行为契约：普通滚轮 = 滚动。画布不能把页面滚动吃掉 ——
  // 与 z-gantt 同一条判据（primitives/wheel-zoom），此前这里却是「滚轮即缩放」。
  it("plain wheel neither zooms nor swallows page scroll", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    await wait();
    const before = { ...flow.viewport };
    const e = wheel(flow, 400, 300, -100);
    expect(flow.viewport).toEqual(before);
    expect(e.defaultPrevented).toBe(false);
    document.body.removeChild(flow);
  });

  it("clamps wheel zoom at max", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    await wait();
    wheel(flow, 400, 300, -10000, { ctrlKey: true });
    expect(flow.viewport.zoom).toBe(2);
    document.body.removeChild(flow);
  });

  it("fitView computes centered viewport", async () => {
    const flow = createFlow();
    Object.defineProperty(flow, "clientWidth", { configurable: true, value: 800 });
    Object.defineProperty(flow, "clientHeight", { configurable: true, value: 600 });
    const a = addNode(flow, "a", "0,0");
    mockSize(a, 200, 100);
    const b = addNode(flow, "b", "300,0");
    mockSize(b, 200, 100);
    await wait();
    flow.fitView();
    const vp = flow.viewport;
    expect(vp.zoom).toBeCloseTo(1.44, 1);
    expect(vp.x).toBeCloseTo(40, 1);
    expect(vp.y).toBeCloseTo(228, 1);
    document.body.removeChild(flow);
  });
});

describe("z-flow edges", () => {
  it("renders bezier paths from edges data", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    const a = addNode(flow, "a", "100,100");
    mockRect(a, 100, 100, 200, 100);
    const b = addNode(flow, "b", "400,100");
    mockRect(b, 400, 100, 200, 100);
    const ha = addHandle(a, "out", "source");
    mockRect(ha, 294, 144, 12, 12);
    const hb = addHandle(b, "in", "target");
    // [WHY] position 属性同时决定把手物理位置与曲线进入侧；mock 几何在节点左侧，
    // 属性须一致（[[bug-20260811-bezier-perpendicular]]）
    hb.position = "left";
    mockRect(hb, 394, 144, 12, 12);
    flow.edges = [
      { id: "e1", source: "a", sourceHandle: "out", target: "b", targetHandle: "in", label: "pass", animated: true },
    ];
    await wait();
    const path = flow.shadowRoot!.querySelector("path.z-flow__edge-path")!;
    // 源点 (300,150) 目标 (400,150)，控制点 x = 300+50 = 350
    expect(path.getAttribute("d")).toBe("M 300 150 C 350 150, 350 150, 400 150");
    expect(path.classList.contains("z-flow__edge-path--animated")).toBe(true);
    expect(path.getAttribute("marker-end")).toContain("url(#z-flow-arrow-");
    const label = flow.shadowRoot!.querySelector(".z-flow__edge-label")!;
    expect(label.textContent).toBe("pass");
    document.body.removeChild(flow);
  });

  // [WHY] 回归 [[bug-20260811-bezier-perpendicular]]：bottom 把手曲线必须
  // 垂直离开节点侧边（控制点沿把手法线），不再水平斜切
  // See: wiki/bugs/bug-20260811-bezier-perpendicular.md
  it("exits vertically from a bottom handle", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    const a = addNode(flow, "a", "100,100");
    mockRect(a, 100, 100, 200, 100);
    const b = addNode(flow, "b", "400,100");
    mockRect(b, 400, 100, 200, 100);
    const ha = addHandle(a, "out", "source");
    ha.position = "bottom";
    mockRect(ha, 194, 244, 12, 12);
    const hb = addHandle(b, "in", "target");
    hb.position = "left";
    mockRect(hb, 394, 144, 12, 12);
    flow.edges = [{ id: "e1", source: "a", sourceHandle: "out", target: "b", targetHandle: "in" }];
    await wait();
    const path = flow.shadowRoot!.querySelector("path.z-flow__edge-path")!;
    // 源点 (200,250) bottom：控制点 (200,300) 垂直向下，c1.x 不漂移
    expect(path.getAttribute("d")).toBe("M 200 250 C 200 300, 300 150, 400 150");
    document.body.removeChild(flow);
  });

  it("skips edges whose nodes are missing", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    const a = addNode(flow, "a", "100,100");
    mockRect(a, 100, 100, 200, 100);
    flow.edges = [
      { id: "e1", source: "a", target: "missing" },
      { id: "e2", source: "missing", target: "a" },
    ];
    await wait();
    expect(flow.shadowRoot!.querySelectorAll("path.z-flow__edge-path").length).toBe(0);
    document.body.removeChild(flow);
  });

  it("refreshEdges updates paths synchronously", async () => {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    const a = addNode(flow, "a", "100,100");
    mockRect(a, 100, 100, 200, 100);
    const b = addNode(flow, "b", "400,100");
    mockRect(b, 400, 100, 200, 100);
    await wait();
    flow.edges = [{ id: "e1", source: "a", target: "b" }];
    flow.refreshEdges();
    expect(flow.shadowRoot!.querySelectorAll("path.z-flow__edge-path").length).toBe(1);
    // 移动节点后同步重算
    b.position = "200,100";
    mockRect(b, 200, 100, 200, 100);
    flow.refreshEdges();
    expect(flow.shadowRoot!.querySelector("path.z-flow__edge-path")!.getAttribute("d")).toContain("200");
    document.body.removeChild(flow);
  });
});

describe("z-flow connect", () => {
  function connectFlow(): { flow: any; a: any; b: any; ha: any; hb: any } {
    const flow = createFlow();
    mockRect(flow, 0, 0, 800, 600);
    const a = addNode(flow, "a", "100,100");
    mockRect(a, 100, 100, 200, 100);
    const b = addNode(flow, "b", "400,100");
    mockRect(b, 400, 100, 200, 100);
    const ha = addHandle(a, "out", "source");
    mockRect(ha, 294, 144, 12, 12);
    const hb = addHandle(b, "in", "target");
    mockRect(hb, 394, 144, 12, 12);
    return { flow, a, b, ha, hb };
  }

  it("adds edge on valid connect", async () => {
    const { flow, ha, hb } = connectFlow();
    const changes: any[] = [];
    flow.addEventListener("z-flow-change", (e: Event) => changes.push((e as CustomEvent).detail));
    pointer(ha, "pointerdown", 300, 150);
    pointer(window, "pointermove", 500, 200);
    pointer(hb, "pointerup", 400, 150);
    await wait();
    expect(flow.edges).toHaveLength(1);
    expect(flow.edges[0].source).toBe("a");
    expect(flow.edges[0].sourceHandle).toBe("out");
    expect(flow.edges[0].target).toBe("b");
    expect(flow.edges[0].targetHandle).toBe("in");
    expect(changes).toHaveLength(1);
    expect(changes[0].edges).toHaveLength(1);
    document.body.removeChild(flow);
  });

  it("rejects connect to non-handle area", async () => {
    const { flow, ha, a } = connectFlow();
    let end: any = null;
    flow.addEventListener("z-connect-end", (e: Event) => (end = (e as CustomEvent).detail));
    pointer(ha, "pointerdown", 300, 150);
    pointer(a, "pointerup", 150, 150);
    expect(flow.edges).toHaveLength(0);
    expect(end.success).toBe(false);
    document.body.removeChild(flow);
  });

  it("rejects self-loop connect", async () => {
    const { flow, ha } = connectFlow();
    pointer(ha, "pointerdown", 300, 150);
    pointer(ha, "pointerup", 300, 150);
    expect(flow.edges).toHaveLength(0);
    document.body.removeChild(flow);
  });

  it("rejects duplicate edges", async () => {
    const { flow, ha, hb } = connectFlow();
    pointer(ha, "pointerdown", 300, 150);
    pointer(hb, "pointerup", 400, 150);
    await wait();
    pointer(ha, "pointerdown", 300, 150);
    pointer(hb, "pointerup", 400, 150);
    expect(flow.edges).toHaveLength(1);
    document.body.removeChild(flow);
  });

  it("rejects connect to non-connectable node", async () => {
    const { flow, ha, b, hb } = connectFlow();
    b.connectable = false;
    await wait();
    pointer(ha, "pointerdown", 300, 150);
    pointer(hb, "pointerup", 400, 150);
    expect(flow.edges).toHaveLength(0);
    document.body.removeChild(flow);
  });

  it("respects z-connect preventDefault", async () => {
    const { flow, ha, hb } = connectFlow();
    flow.addEventListener("z-connect", (e: Event) => e.preventDefault());
    pointer(ha, "pointerdown", 300, 150);
    pointer(hb, "pointerup", 400, 150);
    expect(flow.edges).toHaveLength(0);
    document.body.removeChild(flow);
  });

  it("emits z-connect with pending edge before adding", async () => {
    const { flow, ha, hb } = connectFlow();
    const pending = await new Promise<any>((resolve) => {
      flow.addEventListener("z-connect", (e: Event) => resolve((e as CustomEvent).detail));
      pointer(ha, "pointerdown", 300, 150);
      pointer(hb, "pointerup", 400, 150);
    });
    expect(pending).toEqual({ source: "a", sourceHandle: "out", target: "b", targetHandle: "in" });
    document.body.removeChild(flow);
  });

  it("cancels connect on Escape", async () => {
    const { flow, ha } = connectFlow();
    await wait();
    pointer(ha, "pointerdown", 300, 150);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(flow.edges).toHaveLength(0);
    const temp = flow.shadowRoot!.querySelector(".z-flow__temp-edge")!;
    expect(temp.hasAttribute("hidden")).toBe(true);
    document.body.removeChild(flow);
  });

  it("does not start connect when not editable", async () => {
    const { flow, ha } = connectFlow();
    flow.editable = false;
    await wait();
    pointer(ha, "pointerdown", 300, 150);
    const temp = flow.shadowRoot!.querySelector(".z-flow__temp-edge")!;
    expect(temp.hasAttribute("hidden")).toBe(true);
    document.body.removeChild(flow);
  });
});

describe("z-flow selection and delete", () => {
  it("selects node on click and reports selection", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    const selection = await new Promise<any>((resolve) => {
      flow.addEventListener("z-flow-selection-change", (e: Event) => resolve((e as CustomEvent).detail));
      pointer(a, "pointerdown", 110, 60);
      pointer(window, "pointerup", 110, 60);
    });
    expect(selection.nodeIds).toEqual(["a"]);
    expect(a.selected).toBe(true);
    document.body.removeChild(flow);
  });

  it("toggles selection with shift+click", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    const b = addNode(flow, "b", "300,50");
    await wait();
    pointer(a, "pointerdown", 110, 60);
    pointer(window, "pointerup", 110, 60);
    await wait();
    b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 310, clientY: 60, shiftKey: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, shiftKey: true }));
    await wait();
    expect(a.selected).toBe(true);
    expect(b.selected).toBe(true);
    document.body.removeChild(flow);
  });

  it("clears selection on empty-area click", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    await wait();
    pointer(a, "pointerdown", 110, 60);
    pointer(window, "pointerup", 110, 60);
    await wait();
    expect(a.selected).toBe(true);
    pointer(flow, "pointerdown", 500, 400);
    pointer(window, "pointerup", 500, 400);
    await wait();
    expect(a.selected).toBe(false);
    document.body.removeChild(flow);
  });

  // [WHY] 真实浏览器：minimap pointerdown 冒泡被当背景手势 → pointerup 清空选择 +
  // _syncMinimap 重渲染小地图 → Chrome 丢弃后续 click，小地图点击失效。
  // flow 必须忽略来自自身 UI 控件的按压（real-browser-only，happy-dom 不 hit-test）
  it("pointerdown on minimap does not clear selection or start pan", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    await wait();
    pointer(a, "pointerdown", 110, 60);
    pointer(window, "pointerup", 110, 60);
    await wait();
    expect(a.selected).toBe(true);
    const mm = document.createElement("z-flow-minimap") as any;
    flow.appendChild(mm);
    pointer(mm, "pointerdown", 600, 300);
    pointer(window, "pointerup", 600, 300);
    await wait();
    expect(a.selected).toBe(true);
    expect(flow._panState).toBeNull();
    document.body.removeChild(flow);
  });

  // [WHY] HTML 解析出的属性必须存活到升级后（真实浏览器 id 反射属性在构造期
  // 被字段初始化器覆盖为 ""，见 field-initializer-clobbers-attribute lesson）
  it("HTML-parsed id/position attributes survive upgrade", async () => {
    const flow = createFlow();
    flow.innerHTML = '<z-flow-node id="parsed" position="10,20"></z-flow-node>';
    const node = flow.querySelector("z-flow-node") as any;
    await wait();
    expect(node.id).toBe("parsed");
    expect(node.position).toBe("10,20");
    expect(node.getAttribute("id")).toBe("parsed");
    document.body.removeChild(flow);
  });

  it("box-selects nodes with shift+drag", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,100");
    mockSize(a, 200, 100);
    const b = addNode(flow, "b", "400,100");
    mockSize(b, 200, 100);
    await wait();
    flow.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 50, clientY: 50, shiftKey: true }),
    );
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 700, clientY: 300, shiftKey: true }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, shiftKey: true }));
    expect(a.selected).toBe(true);
    expect(b.selected).toBe(true);
    document.body.removeChild(flow);
  });

  it("deletes selected node and connected edges on Delete", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    const b = addNode(flow, "b", "300,50");
    flow.edges = [{ id: "e1", source: "a", target: "b" }];
    await wait();
    pointer(a, "pointerdown", 110, 60);
    pointer(window, "pointerup", 110, 60);
    await wait();
    expect(a.selected).toBe(true);
    flow.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    await wait();
    expect(flow.querySelector("z-flow-node")).toBe(b);
    expect(flow.edges).toEqual([]);
    document.body.removeChild(flow);
  });

  it("deletes selected edge on Delete", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    const b = addNode(flow, "b", "300,50");
    flow.edges = [{ id: "e1", source: "a", target: "b" }];
    await wait();
    const path = flow.shadowRoot!.querySelector("path.z-flow__edge-path")!;
    path.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
    await wait();
    flow.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true }));
    expect(flow.edges).toEqual([]);
    document.body.removeChild(flow);
  });

  it("ignores Delete while editing input", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    flow.edges = [{ id: "e1", source: "a", target: "a" }];
    await wait();
    pointer(a, "pointerdown", 110, 60);
    pointer(window, "pointerup", 110, 60);
    await wait();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true, composed: true }));
    expect(flow.querySelector("z-flow-node")).toBe(a);
    document.body.removeChild(input);
    document.body.removeChild(flow);
  });

  it("emits z-flow-change on node drag end", async () => {
    const flow = createFlow();
    const a = addNode(flow, "a", "100,50");
    const detail = await new Promise<any>((resolve) => {
      flow.addEventListener("z-flow-change", (e: Event) => resolve((e as CustomEvent).detail));
      pointer(a, "pointerdown", 110, 60);
      pointer(window, "pointermove", 150, 100);
      pointer(window, "pointerup", 150, 100);
    });
    expect(detail.nodes).toEqual([{ id: "a", position: { x: 140, y: 90 }, type: "default" }]);
    document.body.removeChild(flow);
  });
});
