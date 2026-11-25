import { describe, expect, it } from "vitest";
import { wheelZoomIntent } from "../../src/primitives/wheel-zoom/index.js";

/**
 * [WHY] 这些用例守的不是「能不能缩放」，而是「什么手势算缩放」——
 * 后者一旦分叉，就是「同一个滚轮在画布上缩放、在甘特上滚动」那类问题。
 * 每一条都能被对应的一行变异打死（见各 it 的注释）。
 */
// [WHY 手动补字段] happy-dom 的 WheelEvent 构造器把修饰键与 delta 全丢掉
// （构造完 ctrlKey 恒 false、deltaY 恒 0），与 flow.test.ts / gantt.test.ts 同一处理。
// 不补的话「Ctrl + 滚轮」这条用例拿到的是普通滚轮事件，测试会以错误的方式变红。
function wheel(init: WheelEventInit): WheelEvent {
  const e = new WheelEvent("wheel", { bubbles: true, cancelable: true });
  for (const [k, v] of Object.entries(init)) {
    Object.defineProperty(e, k, { value: v, configurable: true });
  }
  return e;
}

describe("wheelZoomIntent", () => {
  // 变异：去掉 `if (!e.ctrlKey && !e.metaKey) return null;` ⇒ 本组三条全红
  it("普通滚轮不构成缩放（控件必须放行，让页面滚）", () => {
    expect(wheelZoomIntent(wheel({ deltaY: -100 }))).toBeNull();
    expect(wheelZoomIntent(wheel({ deltaY: 100 }))).toBeNull();
  });

  it("Ctrl + 滚轮向上 = 放大，向下 = 缩小", () => {
    expect(wheelZoomIntent(wheel({ deltaY: -100, ctrlKey: true }))?.direction).toBe(1);
    expect(wheelZoomIntent(wheel({ deltaY: 100, ctrlKey: true }))?.direction).toBe(-1);
  });

  // 变异：把 metaKey 从判据里去掉 ⇒ 这条红（Mac 上 ⌘+滚轮会变成滚页面）
  it("⌘ + 滚轮同 Ctrl（Mac 上没有 Ctrl 的习惯）", () => {
    expect(wheelZoomIntent(wheel({ deltaY: -100, metaKey: true }))?.direction).toBe(1);
    expect(wheelZoomIntent(wheel({ deltaY: 100, metaKey: true }))?.direction).toBe(-1);
  });

  // 触控板捏合被浏览器合成为 ctrlKey=true + 极小 deltaY（Chrome 约 ±1~±10），
  // 不能因为「幅度太小」被当成无效手势 —— 否则触控板用户完全放不大缩小。
  it("触控板捏合（合成 ctrlKey + 小 deltaY）照常识别为缩放", () => {
    expect(wheelZoomIntent(wheel({ deltaY: -3, ctrlKey: true }))?.direction).toBe(1);
    expect(wheelZoomIntent(wheel({ deltaY: 3, ctrlKey: true }))?.direction).toBe(-1);
  });

  // 变异：去掉 `if (!e.deltaY) return null;` ⇒ 这条红（横向滑动会被当成缩小）
  it("deltaY 为 0（纯横向滑动）+ 修饰键 ⇒ 不缩放", () => {
    expect(wheelZoomIntent(wheel({ deltaY: 0, deltaX: 60, ctrlKey: true }))).toBeNull();
  });

  it("只按 Shift / Alt 不算缩放", () => {
    expect(wheelZoomIntent(wheel({ deltaY: -100, shiftKey: true }))).toBeNull();
    expect(wheelZoomIntent(wheel({ deltaY: -100, altKey: true }))).toBeNull();
  });

  // 幅度必须交出去且已归一：连续缩放的调用方（画布）直接拿它算因子
  it("幅度归一成像素：deltaMode=0 原样，deltaMode=1 按行折算", () => {
    // Chrome 鼠标滚轮：像素单位，-100 就是一格
    expect(wheelZoomIntent(wheel({ deltaY: -100, ctrlKey: true }))?.deltaPixels).toBe(-100);
    // Firefox 鼠标滚轮：行单位，-3 行 ⇒ -48px（与 Chrome 的一格同量级）
    const ff = wheelZoomIntent(wheel({ deltaY: -3, deltaMode: 1, ctrlKey: true }));
    expect(ff?.deltaPixels).toBe(-48);
    expect(ff?.deltaMode).toBe(1);
    expect(ff?.rawDeltaY).toBe(-3);
  });

  // 变异：删掉 deltaMode 折算（直接返回 deltaY）⇒ 这条红。
  // 这正是 issue IKWNJP 点名的「两处都没处理」—— 不折算则 Firefox 里缩放几乎不动。
  it("同一格滚轮在两种 deltaMode 下幅度同量级（不随浏览器变脸）", () => {
    const chrome = wheelZoomIntent(wheel({ deltaY: -100, deltaMode: 0, ctrlKey: true }));
    const firefox = wheelZoomIntent(wheel({ deltaY: -6, deltaMode: 1, ctrlKey: true }));
    const ratio = Math.abs((chrome?.deltaPixels ?? 0) / (firefox?.deltaPixels ?? 1));
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.3);
  });
});
