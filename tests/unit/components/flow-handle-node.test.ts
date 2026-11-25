// Test: z-flow-handle and z-flow-node components
// Related: [[REQ-013-node-flow-editor]]
// Wiki: wiki/requirements/REQ-013-node-flow-editor.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/flow/FlowNode";
import "../../../src/flow/FlowHandle";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function createNode(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-flow-node") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function collectEvents(el: HTMLElement): string[] {
  const names: string[] = [];
  ["z-node-dragstart", "z-node-dragmove", "z-node-dragend", "z-node-click", "z-connect-start"].forEach(
    (n) => el.addEventListener(n, (() => names.push(n)) as EventListener),
  );
  return names;
}

function drag(el: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
  el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: from.x, clientY: from.y }));
  window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: to.x, clientY: to.y }));
  window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: to.x, clientY: to.y }));
}

describe("z-flow-node", () => {
  it("applies position to host style", async () => {
    const el = createNode({ position: "100,50" });
    await wait();
    expect(el.style.left).toBe("100px");
    expect(el.style.top).toBe("50px");
    document.body.removeChild(el);
  });

  it("falls back to 0,0 for malformed position", async () => {
    const el = createNode({ position: "oops" });
    await wait();
    expect(el.style.left).toBe("0px");
    document.body.removeChild(el);
  });

  it("renders type variant classes", async () => {
    const el = createNode({ type: "input" });
    await wait();
    const box = el.shadowRoot!.querySelector(".z-flow-node__box")!;
    expect(box.classList.contains("z-flow-node__box--input")).toBe(true);
    document.body.removeChild(el);
  });

  it("commits position on drag end (commit-on-end)", async () => {
    const el = createNode({ id: "a", position: "100,50" });
    const events = collectEvents(el);
    await wait();
    drag(el, { x: 10, y: 10 }, { x: 30, y: 20 });
    await wait();
    expect(el.position).toBe("120,60");
    expect(el.style.left).toBe("120px");
    expect(events).toEqual(["z-node-dragstart", "z-node-dragmove", "z-node-dragend"]);
    expect(events.includes("z-node-click")).toBe(false);
    document.body.removeChild(el);
  });

  it("emits click instead of drag for stationary pointer", async () => {
    const el = createNode({ id: "a", position: "100,50" });
    const events = collectEvents(el);
    await wait();
    drag(el, { x: 10, y: 10 }, { x: 10, y: 10 });
    await wait();
    expect(el.position).toBe("100,50");
    // 零位移时 dragmove 仍发出，阈值只决定 click 与 dragend 的分流
    expect(events).toEqual(["z-node-dragstart", "z-node-dragmove", "z-node-click"]);
    document.body.removeChild(el);
  });

  it("does not drag when draggable is false", async () => {
    const el = createNode({ id: "a", position: "100,50" });
    el.draggable = false;
    const events = collectEvents(el);
    await wait();
    drag(el, { x: 10, y: 10 }, { x: 50, y: 50 });
    await wait();
    expect(el.position).toBe("100,50");
    expect(events).toEqual([]);
    document.body.removeChild(el);
  });

  it("does not drag when ancestor flow is not editable", async () => {
    const flow = document.createElement("z-flow") as any;
    flow.editable = false;
    document.body.appendChild(flow);
    const el = document.createElement("z-flow-node") as any;
    el.id = "a";
    el.position = "100,50";
    flow.appendChild(el);
    await wait();
    drag(el, { x: 10, y: 10 }, { x: 50, y: 50 });
    await wait();
    expect(el.position).toBe("100,50");
    document.body.removeChild(flow);
  });

  it("removes window listeners after drag", async () => {
    const el = createNode({ id: "a", position: "100,50" });
    await wait();
    const spy = vi.spyOn(window, "removeEventListener");
    drag(el, { x: 10, y: 10 }, { x: 30, y: 20 });
    expect(spy).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(spy).toHaveBeenCalledWith("pointerup", expect.any(Function));
    spy.mockRestore();
    document.body.removeChild(el);
  });
});

describe("z-flow-handle", () => {
  it("emits z-connect-start with source node id on pointerdown", async () => {
    const node = createNode({ id: "a" });
    const handle = document.createElement("z-flow-handle") as any;
    handle.id = "out";
    handle.type = "source";
    node.appendChild(handle);
    await wait();

    const detail = await new Promise<any>((resolve) => {
      handle.addEventListener("z-connect-start", (e: Event) => resolve((e as CustomEvent).detail));
      handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 5, clientY: 5 }));
    });
    expect(detail.sourceId).toBe("a");
    expect(detail.sourceHandle).toBe("out");
    expect(detail.handle).toBe(handle);
    document.body.removeChild(node);
  });

  it("does not emit when connectable is false", async () => {
    const node = createNode({ id: "a" });
    const handle = document.createElement("z-flow-handle") as any;
    handle.connectable = false;
    node.appendChild(handle);
    await wait();

    let fired = false;
    handle.addEventListener("z-connect-start", () => (fired = true));
    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(fired).toBe(false);
    document.body.removeChild(node);
  });

  it("does not emit outside a flow-node", async () => {
    const handle = document.createElement("z-flow-handle") as any;
    document.body.appendChild(handle);
    await wait();
    let fired = false;
    handle.addEventListener("z-connect-start", () => (fired = true));
    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(fired).toBe(false);
    document.body.removeChild(handle);
  });

  it("handle pointerdown does not start node drag", async () => {
    const node = createNode({ id: "a", position: "100,50" });
    const handle = document.createElement("z-flow-handle") as any;
    node.appendChild(handle);
    await wait();

    const events = collectEvents(node);
    handle.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 5, clientY: 5 }));
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 30, clientY: 30 }));
    window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    await wait();
    expect(events).toEqual(["z-connect-start"]);
    expect(node.position).toBe("100,50");
    document.body.removeChild(node);
  });
});
