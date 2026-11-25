// Test: z-flow-minimap and z-flow-controls components
// Related: [[REQ-013-node-flow-editor]]
// Wiki: wiki/requirements/REQ-013-node-flow-editor.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/flow/Flow";
import "../../../src/flow/FlowMinimap";
import "../../../src/flow/FlowControls";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe("z-flow-minimap", () => {
  it("renders node rects from data", async () => {
    const mm = document.createElement("z-flow-minimap") as any;
    mm.data = [
      { id: "a", x: 0, y: 0, w: 200, h: 100 },
      { id: "b", x: 300, y: 0, w: 200, h: 100 },
    ];
    document.body.appendChild(mm);
    await wait();
    const nodes = mm.shadowRoot!.querySelectorAll(".z-flow-minimap__node");
    expect(nodes.length).toBe(2);
    expect(nodes[0].getAttribute("data-node-id")).toBe("a");
    document.body.removeChild(mm);
  });

  it("renders viewport window rect", async () => {
    const mm = document.createElement("z-flow-minimap") as any;
    mm.data = [{ id: "a", x: 0, y: 0, w: 200, h: 100 }];
    mm.viewport = { x: -50, y: -20, zoom: 1, width: 800, height: 600 };
    document.body.appendChild(mm);
    await wait();
    const win = mm.shadowRoot!.querySelector(".z-flow-minimap__viewport")!;
    // scale=0.8（PAD=10），窗口 800x600 → 640x480，裁剪到小地图边界 (180,120)
    // [2026-10-24] 内容改为在小地图内**居中**（原来贴 PAD 左上，与画布 fitView 的居中不一致）：
    // 可用高 = 120-2*10 = 100，内容高 = 100*0.8 = 80，剩余 20 上下各分 10
    // ⇒ 内容起点 y 从 10 变 20，viewport 窗口 y = 20 + (20/1)*0.8 = 36。
    // x 方向内容撑满可用宽（200*0.8 = 160 = 180-2*10），剩余 0，故 x 不变。
    expect(win.getAttribute("x")).toBe("50");
    expect(win.getAttribute("y")).toBe("36");
    expect(win.getAttribute("width")).toBe("130");
    // 窗口起点下移到 36 后，可裁到小地图底边 120 ⇒ 高 = 120-36 = 84（旧值 94 对应 y=26）
    expect(win.getAttribute("height")).toBe("84");
    document.body.removeChild(mm);
  });

  it("emits navigate with flow coordinates on click", async () => {
    const mm = document.createElement("z-flow-minimap") as any;
    mm.data = [{ id: "a", x: 0, y: 0, w: 200, h: 100 }];
    document.body.appendChild(mm);
    await wait();
    Object.defineProperty(mm.shadowRoot!.querySelector("svg"), "getBoundingClientRect", {
      configurable: true,
      value: () => ({ left: 10, top: 10, width: 180, height: 120 }),
    });
    const detail = await new Promise<any>((resolve) => {
      mm.addEventListener("z-minimap-navigate", (e: Event) => resolve((e as CustomEvent).detail));
      mm.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 190, clientY: 70 }));
    });
    // 点击小地图右下区域（超出节点 bbox 的部分按 scale 换算）
    expect(detail.x).toBeGreaterThan(0);
    expect(detail.y).toBeGreaterThan(0);
    document.body.removeChild(mm);
  });

  it("renders empty svg without data", async () => {
    const mm = document.createElement("z-flow-minimap") as any;
    document.body.appendChild(mm);
    await wait();
    expect(mm.shadowRoot!.querySelectorAll(".z-flow-minimap__node").length).toBe(0);
    document.body.removeChild(mm);
  });
});

describe("z-flow-minimap inside flow", () => {
  it("receives node data from flow", async () => {
    const flow = document.createElement("z-flow") as any;
    const mm = document.createElement("z-flow-minimap") as any;
    mm.setAttribute("slot", "minimap");
    flow.appendChild(mm);
    document.body.appendChild(flow);
    const a = document.createElement("z-flow-node") as any;
    a.id = "a";
    a.position = "100,50";
    flow.appendChild(a);
    await wait();
    expect(mm.data.length).toBe(1);
    expect(mm.data[0].id).toBe("a");
    expect(mm.viewport.width).toBeDefined();
    document.body.removeChild(flow);
  });
});

describe("z-flow-controls", () => {
  it("renders three buttons", async () => {
    const c = document.createElement("z-flow-controls") as any;
    document.body.appendChild(c);
    await wait();
    const btns = c.shadowRoot!.querySelectorAll(".z-flow-controls__btn");
    expect(btns.length).toBe(3);
    expect(btns[0].getAttribute("data-action")).toBe("zoom-in");
    expect(btns[2].getAttribute("data-action")).toBe("fit-view");
    document.body.removeChild(c);
  });

  it("emits control events on button click", async () => {
    const c = document.createElement("z-flow-controls") as any;
    document.body.appendChild(c);
    await wait();
    const fired: string[] = [];
    ["z-control-zoom-in", "z-control-zoom-out", "z-control-fit-view"].forEach((n) =>
      c.addEventListener(n, () => fired.push(n)),
    );
    const buttons = Array.from(c.shadowRoot!.querySelectorAll(".z-flow-controls__btn")) as HTMLElement[];
    buttons[0].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    buttons[1].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    buttons[2].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(fired).toEqual(["z-control-zoom-in", "z-control-zoom-out", "z-control-fit-view"]);
    document.body.removeChild(c);
  });

  it("drives flow zoom when slotted into flow", async () => {
    const flow = document.createElement("z-flow") as any;
    Object.defineProperty(flow, "clientWidth", { configurable: true, value: 800 });
    Object.defineProperty(flow, "clientHeight", { configurable: true, value: 600 });
    const c = document.createElement("z-flow-controls") as any;
    c.setAttribute("slot", "controls");
    flow.appendChild(c);
    document.body.appendChild(flow);
    await wait();
    const zoomIn = c.shadowRoot!.querySelector('[data-action="zoom-in"]') as HTMLElement;
    zoomIn.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(flow.viewport.zoom).toBeCloseTo(1.2);
    const fit = c.shadowRoot!.querySelector('[data-action="fit-view"]') as HTMLElement;
    fit.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    expect(flow.viewport.zoom).toBe(1);
    document.body.removeChild(flow);
  });
});
