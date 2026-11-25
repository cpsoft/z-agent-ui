// Test: 连线临时边从 bottom 把手拖出时垂直离开节点侧边
// Related: [[bug-20260811-bezier-perpendicular]]
// Wiki: wiki/bugs/bug-20260811-bezier-perpendicular.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../src/flow/Flow";
import "../../src/flow/FlowNode";
import "../../src/flow/FlowHandle";

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

describe("z-flow temp edge perpendicular exit ([[bug-20260811-bezier-perpendicular]])", () => {
  it("temp edge leaves vertically from a bottom handle", async () => {
    const flow = document.createElement("z-flow") as any;
    document.body.appendChild(flow);
    mockRect(flow, 0, 0, 800, 600);
    const node = document.createElement("z-flow-node") as any;
    node.id = "a";
    node.position = "100,100";
    flow.appendChild(node);
    mockRect(node, 100, 100, 200, 100);
    const handle = document.createElement("z-flow-handle") as any;
    handle.id = "out";
    handle.type = "source";
    handle.position = "bottom";
    node.appendChild(handle);
    mockRect(handle, 194, 244, 12, 12);
    await wait();

    // 状态机：bottom 把手 pointerdown → 拖到右下
    handle.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: 200, clientY: 250 }),
    );
    window.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: 300, clientY: 400 }),
    );
    const temp = flow.shadowRoot!.querySelector(".z-flow__temp-edge")!;
    const d = temp.getAttribute("d")!;
    const m = d.match(/^M ([\d.]+) ([\d.]+) C ([\d.]+) ([\d.]+),/);
    expect(m).toBeTruthy();
    // 源端 (200,250) 控制点必须垂直向下：(c1.x === sx) && (c1.y > sy)
    expect(+m![3]).toBe(+m![1]);
    expect(+m![4]).toBeGreaterThan(+m![2]);
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 300, clientY: 400 }));
    document.body.removeChild(flow);
  });
});
