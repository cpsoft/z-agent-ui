// Test: z-search-bar 桌面搜索框 —— 防抖、回车结算、清空、禁用、外部赋值回写
// Related: architecture/component-gap-audit.html §03（缺件 z-search-bar）
// Wiki: wiki/reference/component-implementation-standard.md
// Date: 2026-11-23
//
// [WHY 这条要有] 搜索框最容易被写成「每敲一个字发一次请求」，而单测里 input 事件是手动
// 派的、没有真实节奏，所以「防抖到底防没防」只能靠假定时器把时间轴摆出来验。
// 另一半是「回车不许等」：按了确认还慢 200ms，用户看到的就是点了没反应。

import { describe, it, expect } from "vitest";
import "../../../src/components/search-bar/index.js";

/** 渲染调度走 queueMicrotask：两个微任务足够跨过 requestUpdate → render → updated。 */
async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/** 真实等待：防抖测的是时间轴，不用假定时器（假定时器会把这里的 wait 一起冻住）。 */
function wait(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function createBar(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-search-bar") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

const inputOf = (el: any): HTMLInputElement => el.shadowRoot.querySelector(".z-sb__input");
const clearOf = (el: any): HTMLButtonElement => el.shadowRoot.querySelector(".z-sb__clear");

function type(el: any, value: string): void {
  const input = inputOf(el);
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
}

function key(el: any, k: string): void {
  inputOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, composed: true, cancelable: true }));
}

function cleanup(): void {
  document.querySelectorAll("z-search-bar").forEach((el) => el.remove());
}

describe("z-search-bar 零配置", () => {
  it("不配任何属性就能用：type=search、默认占位、aria 有名字", async () => {
    const bar = createBar();
    await flush();
    const input = inputOf(bar);
    expect(input.getAttribute("type")).toBe("search");
    expect(input.getAttribute("placeholder")).toBe("搜索");
    expect(input.getAttribute("aria-label"), "只有 placeholder 时它同时充当 label").toBe("搜索");
  });

  it("label 覆盖 aria-label（占位符一敲字就消失，名字不能跟着消失）", async () => {
    const bar = createBar({ label: "搜索模板" });
    await flush();
    expect(inputOf(bar).getAttribute("aria-label")).toBe("搜索模板");
    cleanup();
  });
});

describe("z-search-bar 上报节奏", () => {
  it("连续输入只上报一次（防抖期间不逐键发）", async () => {
    const bar = createBar({ debounce: "30" });
    await flush();
    const events: string[] = [];
    bar.addEventListener("z-input", (e: Event) => events.push((e as CustomEvent).detail.value));

    type(bar, "a");
    type(bar, "ab");
    type(bar, "abc");
    expect(events, "防抖窗口内不该有上报").toEqual([]);

    await wait(60);
    expect(events).toEqual(["abc"]);
    cleanup();
  });

  it("回车立即结算：z-input 与 z-search 顺序固定，且不等防抖", async () => {
    const bar = createBar({ debounce: "60" });
    await flush();
    const seen: string[] = [];
    bar.addEventListener("z-input", () => seen.push("input"));
    bar.addEventListener("z-search", (e: Event) => seen.push(`search:${(e as CustomEvent).detail.value}`));

    type(bar, "abc");
    key(bar, "Enter");

    expect(seen, "回车不走定时器，事件当场就发").toEqual(["input", "search:abc"]);
    // 定时器已被就地结算，等过防抖窗口也不能冒出第二条
    await wait(130);
    expect(seen).toEqual(["input", "search:abc"]);
    cleanup();
  });

  it("debounce=0 时逐键上报（本地筛选场景）", async () => {
    const bar = createBar({ debounce: "0" });
    await flush();
    const events: string[] = [];
    bar.addEventListener("z-input", (e: Event) => events.push((e as CustomEvent).detail.value));

    type(bar, "a");
    type(bar, "ab");
    expect(events).toEqual(["a", "ab"]);
    cleanup();
  });
});

describe("z-search-bar 清空", () => {
  it("Esc 清空并发 z-clear + z-input 空值（宿主的关键字不能还停在旧值）", async () => {
    const bar = createBar();
    await flush();
    const seen: string[] = [];
    bar.addEventListener("z-clear", () => seen.push("clear"));
    bar.addEventListener("z-input", (e: Event) => seen.push(`input:${(e as CustomEvent).detail.value}`));

    type(bar, "abc");
    key(bar, "Escape");
    await flush();

    expect(seen).toEqual(["clear", "input:"]);
    expect(inputOf(bar).value).toBe("");
    expect(bar.value).toBe("");
    cleanup();
  });

  it("清空按钮随内容显隐，点击后清空", async () => {
    const bar = createBar();
    await flush();
    expect(clearOf(bar).hidden, "空值时清空按钮必须藏起来").toBe(true);

    type(bar, "abc");
    expect(clearOf(bar).hidden).toBe(false);

    clearOf(bar).click();
    await flush();
    expect(inputOf(bar).value).toBe("");
    expect(clearOf(bar).hidden).toBe(true);
    cleanup();
  });

  it("clearable=false 时不出现清空按钮", async () => {
    const bar = createBar();
    // [WHY 用属性赋值而不是 clearable="false"] 全库 Boolean 属性是「存在即真」
    // （convertFromAttribute: value !== null），写 "false" 反而是**打开** ——
    // z-input 的 clearable 是同一个坑。
    bar.clearable = false;
    await flush();
    type(bar, "abc");
    expect(clearOf(bar).hidden).toBe(true);
    cleanup();
  });
});

describe("z-search-bar 禁用与外部赋值", () => {
  it("disabled 时输入框禁用、清空按钮不出现", async () => {
    const bar = createBar({ disabled: "" });
    await flush();
    expect(inputOf(bar).disabled).toBe(true);
    type(bar, "abc");
    expect(clearOf(bar).hidden).toBe(true);
    cleanup();
  });

  it("外部改 value 会回写到输入框", async () => {
    const bar = createBar();
    await flush();
    bar.value = "预设";
    await flush();
    expect(inputOf(bar).value).toBe("预设");
    cleanup();
  });

  it("size 落到 --_h 上（与其它控件同一条高度口径）", async () => {
    const bar = createBar({ size: "lg" });
    await flush();
    expect(bar.style.getPropertyValue("--_h")).toBe("var(--z-control-h-lg)");
    cleanup();
  });
});
