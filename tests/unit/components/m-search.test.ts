// Test: m-search —— 防抖、回车结算、清空
// Date: 2026-11-09
//
// [背景] 搜索框是移动端最容易做错的一个控件，三种错法都很安静：
//   ① 不防抖 → 每敲一个字发一次请求；
//   ② 回车还要等防抖 → 用户按了确认却要再等 200ms，体感是「点了没反应」；
//   ③ 清空按钮常显 → 空输入时那 44px 的按钮正好盖住输入区右半边。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-search/MSearch";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-search") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

function type(el: any, value: string): void {
  const input = el.shadowRoot.querySelector("input");
  input.value = value;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("m-search", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("防抖：连续输入只结算最后一次", async () => {
    el = mount({ debounce: 40 });
    await flush();
    const hits = collect(el, "z-input");
    for (const v of ["西", "西湖", "西湖店"]) type(el, v);
    expect(hits, "防抖期间不该逐字上报").toHaveLength(0);
    await sleep(80);
    expect(hits).toEqual([{ value: "西湖店" }]);
  });

  it("debounce=0 时不延迟（同步发）", async () => {
    el = mount({ debounce: 0 });
    await flush();
    const hits = collect(el, "z-input");
    type(el, "abc");
    expect(hits).toEqual([{ value: "abc" }]);
  });

  it("回车立即结算并发 z-search，不等防抖", async () => {
    el = mount({ debounce: 5000 });
    await flush();
    const inputs = collect(el, "z-input");
    const searches = collect(el, "z-search");
    const input = el.shadowRoot.querySelector("input");
    type(el, "西湖");
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    // 没有等 5s：回车必须自己把定时器结算掉
    expect(inputs).toEqual([{ value: "西湖" }]);
    expect(searches).toEqual([{ value: "西湖" }]);
  });

  it("清空按钮：值置空 + 发 z-clear 与一条空 z-input", async () => {
    el = mount();
    await flush();
    const clears = collect(el, "z-clear");
    const inputs = collect(el, "z-input");
    type(el, "abc");
    el.shadowRoot.querySelector("[data-act='clear']").click();
    expect(el.value).toBe("");
    expect(el.shadowRoot.querySelector("input").value).toBe("");
    expect(clears).toHaveLength(1);
    expect(inputs.at(-1)).toEqual({ value: "" });
  });

  it("没内容时清空按钮是隐藏的（否则 44px 的空白按钮挡住输入）", async () => {
    el = mount();
    await flush();
    expect(el.shadowRoot.querySelector(".m-search__clear").hidden).toBe(true);
  });

  it("有内容时清空按钮显示出来", async () => {
    el = mount();
    await flush();
    type(el, "x");
    expect(el.shadowRoot.querySelector(".m-search__clear").hidden).toBe(false);
  });

  it("Escape 清空（移动端外接键盘与桌面浏览器的常规手势）", async () => {
    el = mount({ debounce: 0 });
    await flush();
    type(el, "abc");
    el.shadowRoot
      .querySelector("input")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect(el.value).toBe("");
  });

  it("disabled 时输入框带 disabled（点了不弹键盘）", async () => {
    el = mount({ disabled: true });
    await flush();
    expect(el.shadowRoot.querySelector("input").disabled).toBe(true);
  });

  // ── 框内「搜索」按钮（action=，issue IKW576 #1）──
  //
  // [WHY 单独一组] 这枚按钮存在的理由不是「顺手」：iOS 中文输入法下软键盘的
  // 「搜索 / 前往」键可能**根本不发 keydown**（被输入法当成上屏确认吞掉）。
  // 那时它是页面上唯一能提交的入口 —— 而它坏掉的样子与「功能正常」在截图上一样。
  describe("action=：不依赖软键盘的提交入口", () => {
    it("不写 action 时不渲染这枚按钮（右侧 44px 全留给输入区）", async () => {
      el = mount();
      await flush();
      expect(el.shadowRoot.querySelector(".m-search__submit")).toBeNull();
    });

    it("action=yes 时渲染，且带 aria-label 与 part（宿主可单独换样式）", async () => {
      el = mount({ action: true });
      await flush();
      const btn = el.shadowRoot.querySelector(".m-search__submit") as HTMLElement;
      expect(btn).not.toBeNull();
      expect(btn.getAttribute("aria-label")).toBe("搜索");
      expect(btn.getAttribute("part")).toBe("submit");
      expect(btn.textContent?.trim()).toBe("搜索");
    });

    it("点它 = 按回车：先结算防抖（z-input），再发 z-search", async () => {
      // [WHY 断言顺序而不只是「都发过」] 宿主通常只监听 z-search；少了 z-input
      // 时输入框与数据里的关键字会不一致（清空按钮的显隐也看 z-input 之后的渲染）。
      el = mount({ action: true, debounce: 5000 });
      await flush();
      const order: string[] = [];
      el.addEventListener("z-input", (e: any) => order.push(`input:${e.detail.value}`));
      el.addEventListener("z-search", (e: any) => order.push(`search:${e.detail.value}`));
      type(el, "西湖店");
      (el.shadowRoot.querySelector(".m-search__submit") as HTMLElement).click();
      // 没有等 5s：按钮必须自己把定时器结算掉（与回车同一条 `_flush(true)`）
      expect(order).toEqual(["input:西湖店", "search:西湖店"]);
    });

    it("disabled 时按钮也是 disabled（点得动但不该发事件）", async () => {
      el = mount({ action: true, disabled: true });
      await flush();
      expect((el.shadowRoot.querySelector(".m-search__submit") as HTMLButtonElement).disabled).toBe(true);
    });

    it("按钮不常显依赖内容：空框时它也在（否则「想搜空值清条件」没有入口）", async () => {
      el = mount({ action: true });
      await flush();
      const btn = el.shadowRoot.querySelector(".m-search__submit") as HTMLElement;
      expect(btn.hidden).toBe(false);
    });
  });
});
