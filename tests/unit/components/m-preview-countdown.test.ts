// Test: H5 商城件第三批（m-image-preview / m-countdown）
// Related: [[REQ-053-h5-image-preview-countdown]]
// Wiki: wiki/requirements/REQ-053-h5-image-preview-countdown.md
// Date: 2026-11-24
//
// 断言钉的点：
//   · 切图后计数与轨道位移要跟着变（不然「翻到第 3 张还写着 1 / 5」）
//   · 拖动结束补发的那一次 click 不能当「单击关闭」（不然每次滑动都退出查看）
//   · 缩放态单击不关闭（用户正在看细节，一点就退等于白放大）
//   · 倒计时必须用「目标时间 - 现在」重算，而不是每秒减一（切后台回来会停在旧数）
//   · z-end 只发一次；暂停时数字不动

import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/m-image-preview/index.js";
import "../../../src/components/m-countdown/index.js";
import type { MImagePreview } from "../../../src/components/m-image-preview/index.js";
import type { MCountdown } from "../../../src/components/m-countdown/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag) as HTMLElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function touch(el: Element, type: string, points: Array<[number, number]>): void {
  const ev = new TouchEvent(type, { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "touches", {
    value: points.map(([clientX, clientY]) => ({ clientX, clientY })),
  });
  el.dispatchEvent(ev);
}

/** happy-dom 没有布局：把视口宽度钉成 300，横滑阈值才有意义。 */
function stubWidth(el: Element, width: number, height = 600): void {
  Object.defineProperty(el, "offsetWidth", { value: width, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: height, configurable: true });
}

afterEach(() => {
  document.body.innerHTML = "";
  document.body.style.overflow = "";
  vi.useRealTimers();
});

describe("m-image-preview：大图查看", () => {
  it("不显示时什么都不画，打开后渲染全部图与计数", async () => {
    const el = mount("m-image-preview", { items: "a|b|c" }) as MImagePreview;
    await tick();
    expect(el.shadowRoot!.querySelector(".mpv")).toBeNull();

    el.open(1);
    await tick();
    expect(el.shadowRoot!.querySelectorAll(".mpv__img").length).toBe(3);
    expect(el.shadowRoot!.querySelector(".mpv__count")!.textContent).toBe("2 / 3");
    // 打开要锁页面滚动，关掉要还回去
    expect(document.body.style.overflow).toBe("hidden");
    el.close();
    await tick();
    expect(document.body.style.overflow).toBe("");
  });

  it("next / prev 回绕，goTo 越界按 loop 处理，并发 z-change", async () => {
    const el = mount("m-image-preview", { items: "a|b|c" }) as MImagePreview;
    el.open(0);
    await tick();
    const seen: number[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail.index));

    el.prev();
    await tick();
    expect(el.current).toBe(2); // loop 回绕到末张
    el.next();
    await tick();
    expect(el.current).toBe(0);
    el.goTo(2);
    await tick();
    expect(seen).toEqual([2, 0, 2]);

    el.loop = false;
    el.goTo(3);
    await tick();
    expect(el.current).toBe(2); // 关掉回绕就停在边界
  });

  it("单击关闭；关闭按钮关闭；拖动结束的 click 不关", async () => {
    const el = mount("m-image-preview", { items: "a|b|c" }) as MImagePreview;
    el.open(0);
    await tick();
    const stage = el.shadowRoot!.querySelector(".mpv__stage")!;
    stubWidth(stage, 300);

    // 横滑一次：翻到第 2 张，且松手后补的 click 不能把查看器关掉
    touch(stage, "touchstart", [[200, 300]]);
    touch(stage, "touchmove", [[80, 300]]);
    touch(stage, "touchend", []);
    expect(el.current).toBe(1);
    (el.shadowRoot!.querySelector(".mpv__img") as HTMLElement).click();
    await tick();
    expect(el.visible).toBe(true);

    // 真正单击（没有拖动过）才关闭
    (el.shadowRoot!.querySelector(".mpv__img") as HTMLElement).click();
    await tick();
    expect(el.visible).toBe(false);

    el.open(0);
    await tick();
    (el.shadowRoot!.querySelector("[part~='close']") as HTMLElement).click();
    await tick();
    expect(el.visible).toBe(false);
  });

  it("双指捏合放大；缩放态单击不关闭，单指拖动变平移而不翻页", async () => {
    const el = mount("m-image-preview", { items: "a|b|c" }) as MImagePreview;
    el.open(0);
    await tick();
    const stage = el.shadowRoot!.querySelector(".mpv__stage")!;
    stubWidth(stage, 300);
    const img = el.shadowRoot!.querySelector("[data-img]") as HTMLElement;

    touch(stage, "touchstart", [[100, 300], [200, 300]]);
    touch(stage, "touchmove", [[50, 300], [250, 300]]); // 间距 100 → 200
    touch(stage, "touchend", []);
    expect(el.zoom).toBeCloseTo(2, 1);
    expect(img.style.transform).toContain("scale(2)");

    // 缩放态：单击不关，拖动也不翻页
    img.click();
    await tick();
    expect(el.visible).toBe(true);
    touch(stage, "touchstart", [[200, 300]]);
    touch(stage, "touchmove", [[80, 300]]);
    touch(stage, "touchend", []);
    expect(el.current).toBe(0);
  });

  it("捏合回弹：缩放不足 1.05 倍时归位", async () => {
    const el = mount("m-image-preview", { items: "a|b" }) as MImagePreview;
    el.open(0);
    await tick();
    const stage = el.shadowRoot!.querySelector(".mpv__stage")!;
    stubWidth(stage, 300);
    touch(stage, "touchstart", [[100, 300], [200, 300]]);
    touch(stage, "touchmove", [[98, 300], [202, 300]]); // 100 → 104 ≈ 1.04 倍
    expect(el.zoom).toBeCloseTo(1.04, 2);
    touch(stage, "touchend", []);
    expect(el.zoom).toBe(1);
  });

  it("Esc 关闭（走 overlayManager 的栈）", async () => {
    const el = mount("m-image-preview", { items: "a|b" }) as MImagePreview;
    el.open(0);
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    expect(el.visible).toBe(false);
  });

  it("←/→ 翻页", async () => {
    const el = mount("m-image-preview", { items: "a|b|c" }) as MImagePreview;
    el.open(0);
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
    await tick();
    expect(el.current).toBe(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
    await tick();
    expect(el.current).toBe(0);
  });
});

describe("m-countdown：倒计时", () => {
  it("按目标时间算剩余，每秒降一格，到点发一次 z-end", async () => {
    vi.useFakeTimers();
    const el = document.createElement("m-countdown") as MCountdown;
    el.deadline = new Date(Date.now() + 3000).toISOString();
    document.body.appendChild(el);
    await Promise.resolve();
    expect(el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("00:00:03");

    let ends = 0;
    el.addEventListener("z-end", () => ends++);
    vi.advanceTimersByTime(1000);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("00:00:02");

    vi.advanceTimersByTime(5000);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.remaining).toBe(0);
    expect(el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("00:00:00");
    expect(ends).toBe(1);
  });

  it("活动延长时间后能再次报结束（z-end 的门闩要重置）", async () => {
    vi.useFakeTimers();
    const el = document.createElement("m-countdown") as MCountdown;
    el.deadline = new Date(Date.now() + 1000).toISOString();
    document.body.appendChild(el);
    await Promise.resolve();
    let ends = 0;
    el.addEventListener("z-end", () => ends++);
    vi.advanceTimersByTime(3000);
    await vi.advanceTimersByTimeAsync(0);
    expect(ends).toBe(1);

    el.deadline = new Date(Date.now() + 2000).toISOString();
    await vi.advanceTimersByTimeAsync(0);
    expect(el.remaining).toBe(2);
    vi.advanceTimersByTime(4000);
    await vi.advanceTimersByTimeAsync(0);
    expect(ends).toBe(2);
  });

  it("切后台再回来按真实时间重算，不是「每秒减一」", async () => {
    vi.useFakeTimers();
    const el = document.createElement("m-countdown") as MCountdown;
    el.deadline = new Date(Date.now() + 60000).toISOString();
    document.body.appendChild(el);
    await Promise.resolve();
    // 模拟被节流：时间跳了 30 秒但一次 tick 都没跑
    vi.setSystemTime(Date.now() + 30000);
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(el.remaining).toBe(30);
  });

  it("format=ms / dhms 的拆法", async () => {
    const ms = mount("m-countdown", { seconds: "90", format: "ms" }) as MCountdown;
    await tick();
    expect(ms.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("01:30");

    const day = mount("m-countdown", { seconds: "90000", format: "dhms" }) as MCountdown;
    await tick();
    expect(day.shadowRoot!.querySelector(".m-countdown__head")!.textContent).toBe("1 天");
    expect(day.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("01:00:00");
  });

  it("hms 超过 24 小时照实显示小时数", async () => {
    const el = mount("m-countdown", { seconds: "176400" }) as MCountdown; // 49 小时
    await tick();
    expect(el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe("49:00:00");
  });

  it("paused 时数字不动", async () => {
    vi.useFakeTimers();
    const el = document.createElement("m-countdown") as MCountdown;
    el.seconds = 10;
    el.paused = true;
    document.body.appendChild(el);
    await Promise.resolve();
    const before = el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent;
    vi.advanceTimersByTime(3000);
    await vi.advanceTimersByTimeAsync(0);
    expect(el.shadowRoot!.querySelector(".m-countdown__clock")!.textContent).toBe(before);
  });

  it("label 前缀与读屏名称", async () => {
    const el = mount("m-countdown", { seconds: "65", label: "距结束" }) as MCountdown;
    await tick();
    expect(el.shadowRoot!.querySelector(".m-countdown__label")!.textContent).toBe("距结束");
    const root = el.shadowRoot!.querySelector(".m-countdown")!;
    expect(root.getAttribute("aria-live")).toBe("off");
    expect(root.getAttribute("aria-label")).toBe("距结束 00:01:05");
  });
});
