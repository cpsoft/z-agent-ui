// Test: 基础行为的一致性 —— 同一个手势送进不同控件，结论必须相同
//
// [WHY 单独一个文件] flow.test.ts 与 gantt.test.ts 各自能证明「我这个控件这么做了」，
// 但证明不了「两个控件一样」：它们互不相干地绿着，恰恰是分叉能长期存活的原因。
// 2026-11-20 之前的实况就是如此 —— z-flow 普通滚轮即缩放、z-gantt 要 Ctrl+滚轮，
// 两边的用例都是绿的，谁也没错，用户却遇到「同一个滚轮换块地方意思就变了」。
//
// 所以这里把**同一个事件**送给两个控件，用一次断言同时看两边的结论。
// 单个控件回退时它会红，这就是它比两份局部用例多出来的那点价值。
import { describe, it, expect } from "vitest";
import "../../src/flow/Flow";
import "../../src/flow/FlowNode";
import "../../src/report/gantt/Gantt";

function wait(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function cleanup(...els: Element[]): void {
  for (const el of els) el.parentElement?.removeChild(el);
}

// happy-dom 的 WheelEvent 构造会丢掉 deltaY / clientX / ctrlKey，必须 defineProperty 补
function wheelOn(el: Element, init: WheelEventInit): WheelEvent {
  const e = new WheelEvent("wheel", { bubbles: true, cancelable: true });
  for (const [k, v] of Object.entries(init)) {
    Object.defineProperty(e, k, { value: v, configurable: true });
  }
  el.dispatchEvent(e);
  return e;
}

function makeFlow(): any {
  const flow = document.createElement("z-flow") as any;
  document.body.appendChild(flow);
  Object.defineProperty(flow, "getBoundingClientRect", {
    configurable: true,
    value: () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
  return flow;
}

function makeGantt(): any {
  const g = document.createElement("z-gantt") as any;
  g.today = "2026-09-15";
  g.data = {
    tasks: [{ id: "a", name: "Alpha", start_date: "2026-09-01", end_date: "2026-09-05" }],
    dependencies: [],
  };
  document.body.appendChild(g);
  return g;
}

/** 两个控件各自的「缩放进度」，只用于判断有没有变，不掺具体数值口径。 */
function zoomState(flow: any, gantt: any): [number, number] {
  return [flow.viewport.zoom, gantt.dayWidth];
}

describe("基础行为一致性：滚轮", () => {
  it("普通滚轮：两边都不缩放，也都放行页面滚动", async () => {
    const flow = makeFlow();
    const gantt = makeGantt();
    await wait();
    const before = zoomState(flow, gantt);

    const ef = wheelOn(flow, { deltaY: -100, clientX: 400, clientY: 300 });
    const eg = wheelOn(gantt, { deltaY: -100, clientX: 400, clientY: 100 });
    await wait();

    // 一次断言看两边：只有一边回退时，这一条就红
    expect(zoomState(flow, gantt)).toEqual(before);
    expect([ef.defaultPrevented, eg.defaultPrevented]).toEqual([false, false]);
    cleanup(flow, gantt);
  });

  it("Ctrl+滚轮：两边都缩放，且都拦下默认行为", async () => {
    const flow = makeFlow();
    const gantt = makeGantt();
    await wait();
    const [z0, d0] = zoomState(flow, gantt);

    const ef = wheelOn(flow, { deltaY: -100, clientX: 400, clientY: 300, ctrlKey: true });
    const eg = wheelOn(gantt, { deltaY: -100, clientX: 400, clientY: 100, ctrlKey: true });
    await wait();

    const [z1, d1] = zoomState(flow, gantt);
    expect(z1).toBeGreaterThan(z0);
    expect(d1).toBeGreaterThan(d0);
    expect([ef.defaultPrevented, eg.defaultPrevented]).toEqual([true, true]);
    cleanup(flow, gantt);
  });

  // 触控板捏合 = 浏览器合成的 ctrlKey + 极小 deltaY。两个控件都必须认，
  // 否则触控板用户在其中一个里根本放不大 —— 而滚轮用户测不出来。
  it("触控板捏合：两边都按缩放处理", async () => {
    const flow = makeFlow();
    const gantt = makeGantt();
    await wait();
    const [z0, d0] = zoomState(flow, gantt);

    wheelOn(flow, { deltaY: -3, clientX: 400, clientY: 300, ctrlKey: true });
    wheelOn(gantt, { deltaY: -3, clientX: 400, clientY: 100, ctrlKey: true });
    await wait();

    const [z1, d1] = zoomState(flow, gantt);
    expect(z1).toBeGreaterThan(z0);
    expect(d1).toBeGreaterThan(d0);
    cleanup(flow, gantt);
  });
});
