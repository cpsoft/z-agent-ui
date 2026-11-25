// 长按原语（issue IKWNJO）。
//
// [WHY 重点在「什么情况下**不该**触发」] 到时长就回调这件事，两处手写实现都做对了。
// 出问题的是另外三条：动了还在计时（滚动途中弹菜单）、被系统打断仍触发、
// 原生右键菜单与自定义菜单叠成两个。所以每条用例都成对写。
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  LongPressController,
  LONG_PRESS_DELAY_MS,
  LONG_PRESS_MOVE_TOLERANCE,
} from "../../src/primitives/long-press/index.js";

const created: LongPressController[] = [];

function make(opts: Partial<ConstructorParameters<typeof LongPressController>[0]> = {}) {
  const hits: Array<{ x: number; y: number }> = [];
  const cancels: number[] = [];
  const lp = new LongPressController({
    delayMs: 20,
    onLongPress: (x, y) => hits.push({ x, y }),
    onCancel: () => cancels.push(1),
    ...opts,
  });
  created.push(lp);
  return { lp, hits, cancels };
}

function ptr(type: string, x: number, y: number): PointerEvent {
  return new PointerEvent(type, { clientX: x, clientY: y, bubbles: true });
}

function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

afterEach(() => {
  for (const lp of created.splice(0)) lp.destroy();
});

describe("LongPressController：到时长才算", () => {
  it("按住不动到时长发回调，坐标是按下那一点", async () => {
    const { lp, hits } = make();
    lp.arm(120, 340);
    await wait(40);
    expect(hits).toEqual([{ x: 120, y: 340 }]);
    expect(lp.fired).toBe(true);
  });

  it("没到时长就抬起：不触发，且算「取消」", async () => {
    const { lp, hits, cancels } = make({ delayMs: 80 });
    lp.arm(0, 0);
    window.dispatchEvent(ptr("pointerup", 0, 0));
    await wait(120);
    // 计时器被清掉 —— 否则松手之后菜单还会弹出来
    expect(hits).toEqual([]);
    expect(cancels.length).toBe(1);
    expect(lp.fired).toBe(false);
  });
});

describe("LongPressController：移动容忍用欧氏距离", () => {
  it("横着挪 6px（< 8）仍然有效", async () => {
    const { lp, hits } = make({ delayMs: 40 });
    lp.arm(100, 100);
    window.dispatchEvent(ptr("pointermove", 106, 100));
    await wait(60);
    expect(hits.length).toBe(1);
  });

  it("斜着挪 6+6（欧氏 8.49 > 8）取消 —— 矩形判据在这里会误判成有效", async () => {
    const { lp, hits, cancels } = make({ delayMs: 40 });
    lp.arm(100, 100);
    window.dispatchEvent(ptr("pointermove", 106, 106));
    await wait(60);
    // 用矩形判据（|dx|>8 || |dy|>8）时两个方向都是 6，会判成「没动」⇒ 仍然弹菜单。
    // 这正是 gantt（欧氏）与 MCard（矩形）当年结论不同的那一点。
    expect(hits).toEqual([]);
    expect(cancels.length).toBe(1);
  });
});

describe("LongPressController：被系统打断", () => {
  it("pointercancel（触屏滚动）取消且不触发", async () => {
    const { lp, hits, cancels } = make({ delayMs: 40 });
    lp.arm(10, 10);
    window.dispatchEvent(ptr("pointercancel", 10, 10));
    await wait(60);
    // 不接 cancel 的后果：手指已经开始滚列表了，菜单照弹
    expect(hits).toEqual([]);
    expect(cancels.length).toBe(1);
  });
});

describe("LongPressController：右键菜单的归属", () => {
  // [测不到的那一半] `isTrusted` 在 jsdom / happy-dom 里恒为 false —— 真实浏览器里
  // 原生 contextmenu 才是 true。所以「吃掉原生菜单」这条只能真机验证；这里守的是
  // 另一半：**代码合成的事件必须放行**。gantt 的长按正是「长按 → 合成一个 contextmenu
  // → 冒泡进主链路」，吃掉它等于长按白按（第一版就是这样，gantt 用例当场红）。
  it("合成的事件不吃：长按后宿主自己派发的 contextmenu 必须能走到它的处理链", async () => {
    const { lp } = make({ delayMs: 20 });
    lp.arm(5, 5);
    await wait(40);
    expect(lp.fired).toBe(true);
    let reached = false;
    const host = document.createElement("div");
    host.addEventListener("contextmenu", () => {
      reached = true;
    });
    document.body.append(host);
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    host.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
    expect(reached).toBe(true);
    host.remove();
  });

  it("没触发时不干预 contextmenu（快速右键点击要靠原生菜单）", () => {
    const { lp } = make({ delayMs: 80 });
    lp.arm(5, 5);
    window.dispatchEvent(ptr("pointerup", 5, 5)); // 按下就抬起 = 普通右键
    const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    window.dispatchEvent(e);
    expect(e.defaultPrevented).toBe(false);
  });
});

describe("LongPressController：状态语义", () => {
  it("cancel() 不重置 fired —— 调用方要先读再 cancel", async () => {
    const { lp } = make({ delayMs: 20 });
    lp.arm(0, 0);
    await wait(40);
    expect(lp.fired).toBe(true);
    lp.cancel();
    // 若这里被重置，MCard 的 `pointerup` 就永远读到 false ⇒ 长按之后又派发 z-click
    expect(lp.fired).toBe(true);
  });

  it("arm() 会重置 fired（下一轮重新开始）", async () => {
    const { lp } = make({ delayMs: 20 });
    lp.arm(0, 0);
    await wait(40);
    lp.arm(0, 0);
    expect(lp.fired).toBe(false);
  });

  it("destroy() 连 fired 一起清（元素卸载后重连不该继承上一轮）", async () => {
    const { lp } = make({ delayMs: 20 });
    lp.arm(0, 0);
    await wait(40);
    lp.destroy();
    expect(lp.fired).toBe(false);
  });

  it("触发后不再响应移动（监听已摘）", async () => {
    const { lp, cancels } = make({ delayMs: 20 });
    lp.arm(0, 0);
    await wait(40);
    window.dispatchEvent(ptr("pointermove", 999, 999));
    // 已触发的那一轮结束后，移动不该再报「取消」
    expect(cancels).toEqual([]);
  });

  it("cancel 摘 pointer 三个监听，但**保留** contextmenu（它要等 pointerup 之后才来）", () => {
    const off = vi.spyOn(window, "removeEventListener");
    const on = vi.spyOn(window, "addEventListener");
    const { lp } = make();
    lp.arm(0, 0);
    lp.cancel();
    const removed = off.mock.calls.map((c) => c[0]);
    expect(removed).toContain("pointermove");
    expect(removed).toContain("pointerup");
    expect(removed).toContain("pointercancel");
    expect(removed).not.toContain("contextmenu");
    off.mockRestore();
    on.mockRestore();
  });

  it("destroy 才把 contextmenu 一起摘掉（元素卸载后不该再拦任何人的右键）", () => {
    const off = vi.spyOn(window, "removeEventListener");
    const { lp } = make();
    lp.arm(0, 0);
    lp.destroy();
    expect(off.mock.calls.map((c) => c[0])).toContain("contextmenu");
    off.mockRestore();
  });
});

describe("缺省值", () => {
  it("与系统长按一致：500ms / 8px", () => {
    expect(LONG_PRESS_DELAY_MS).toBe(500);
    expect(LONG_PRESS_MOVE_TOLERANCE).toBe(8);
  });
});
