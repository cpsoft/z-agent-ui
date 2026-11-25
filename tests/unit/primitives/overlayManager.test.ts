// Test: overlay 栈 / Esc / 滚动锁（L0 原语，此前零直接单测）
//
// [为什么补这份] 2026-11-14 盘 L0 自验收时发现：`core` + `primitives` 里被 L1 采用最多的
// 两个原语之一就是这个模块（overlayManager 撑起 Modal / Drawer / Command / Image 的
// Esc 与滚动锁），但它没有任何**直接**测试 —— 只有 modal / drawer 的用例间接踩到。
// 间接覆盖的问题在于：它只能证明「某个组件在某条路径上没崩」，证明不了
// 「栈顶语义」「计数锁的配对」这些**边界**，而这两处一旦错，症状是
// 「关掉一个弹窗后页面再也滚不动」这种没人会想到去查 Esc 栈的故障。
//
// 注意：本模块是模块级单例状态。每个用例结束必须把栈和锁清回 0，
// 否则下一条用例在脏状态上跑，会得到「有时红有时绿」。

import { afterEach, describe, expect, it } from "vitest";
import {
  lockScroll,
  pushOverlay,
  removeOverlay,
  unlockScroll,
  type ZOverlayLike,
} from "../../../src/primitives/overlay/overlayManager";

interface Fake extends ZOverlayLike {
  closes: number;
}

function fake(closeOnEscape = true): Fake {
  const o: Fake = {
    closes: 0,
    closeOnEscape,
    close() {
      o.closes++;
    },
  };
  return o;
}

function pressEscape(): void {
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
}

const pushed: Fake[] = [];

function push(o: Fake): number {
  pushed.push(o);
  return pushOverlay(o);
}

afterEach(() => {
  for (const o of pushed.splice(0)) removeOverlay(o);
  // 锁计数是模块级的，用例里的 lock 不一定配对（有的用例故意不配对）
  for (let i = 0; i < 10; i++) unlockScroll();
  document.body.style.overflow = "";
});

describe("overlayManager：Esc 只作用于栈顶", () => {
  it("两层叠加时，Esc 只关最上面那层", () => {
    const a = fake();
    const b = fake();
    push(a);
    push(b);

    pressEscape();

    expect(b.closes).toBe(1);
    expect(a.closes, "下层被一起关掉 = 栈语义失效，用户会丢掉正在填的表单").toBe(0);
  });

  it("栈顶声明 closeOnEscape=false 时，Esc 不穿透去关下层", () => {
    const a = fake();
    const b = fake(false);
    push(a);
    push(b);

    pressEscape();

    expect(b.closes).toBe(0);
    expect(a.closes, "穿透会让「不允许 Esc 关闭」的浮层失去意义").toBe(0);
  });

  it("栈顶出栈后，Esc 作用到新的栈顶", () => {
    const a = fake();
    const b = fake();
    push(a);
    push(b);
    removeOverlay(b);

    pressEscape();

    expect(a.closes).toBe(1);
    expect(b.closes).toBe(0);
  });

  it("非 Escape 键不触发关闭", () => {
    const a = fake();
    push(a);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(a.closes).toBe(0);
  });
});

describe("overlayManager：入栈返回的层级号", () => {
  it("依次入栈得到 0 / 1 / 2", () => {
    expect(push(fake())).toBe(0);
    expect(push(fake())).toBe(1);
    expect(push(fake())).toBe(2);
  });

  it("移除中间一层后，新入栈的层级号按当前深度给（不是原编号 +1）", () => {
    push(fake()); // 0
    const mid = fake();
    push(mid); // 1
    push(fake()); // 2
    removeOverlay(mid);

    // 深度剩 2 ⇒ 下一层拿 2。这是现有语义（stack.length - 1），
    // 组件把它写进 --z-*-stack-index 当 z-index 偏移，靠的是「相对当前深度」而不是历史编号。
    expect(push(fake())).toBe(2);
  });

  it("重复出栈同一个对象不会抛，也不影响其它层", () => {
    const a = fake();
    const b = fake();
    push(a);
    push(b);
    removeOverlay(b);
    expect(() => removeOverlay(b)).not.toThrow();
    expect(() => removeOverlay(fake())).not.toThrow();

    pressEscape();
    expect(a.closes).toBe(1);
  });
});

describe("overlayManager：滚动锁是计数锁", () => {
  it("首个加锁记录原值并置 hidden，末个解锁还原原值", () => {
    document.body.style.overflow = "auto";

    lockScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockScroll();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("嵌套时只有最后一层解锁才还原（内层先关不会放开滚动）", () => {
    document.body.style.overflow = "scroll";
    lockScroll();
    lockScroll();

    unlockScroll();
    expect(document.body.style.overflow, "两层还开着就放开滚动 = 背景跟着弹窗一起滚").toBe(
      "hidden",
    );

    unlockScroll();
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("多余的 unlock 不会把计数压成负数（否则下一次 lock 读不到正确的原值）", () => {
    document.body.style.overflow = "auto";
    unlockScroll();
    unlockScroll();

    lockScroll();
    expect(document.body.style.overflow).toBe("hidden");
    unlockScroll();
    expect(document.body.style.overflow).toBe("auto");
  });
});
