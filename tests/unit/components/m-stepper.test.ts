// Test: m-stepper —— 边界、浮点、空写保护
// Date: 2026-11-09
//
// [背景] 步进器在数量/份数字段上直接用，三条错法都会造成实际损失：
//   ① 到边界不置灰 → 用户一直点，以为没生效；
//   ② 到边界继续发 change → 宿主要拿它写库，就是一批**空写**；
//   ③ 0.1 + 0.2 = 0.30000000000000004 → 数量字段上的浮点噪声是资损口径。
//
// ★ 这里有一层容易测漏的防线：「到界不发事件」有**两层** ——
//   ① 渲染期把按钮置灰；② 逻辑层 `if (next === prev) return`。
//   `disabled` 的按钮**根本不派发 click**，所以只写 `click()` 两次只能测到第 ① 层；
//   把 ② 删掉测试照样绿（做过变异验证，确实绿）。下面用「手动解开 disabled 再点」
//   来测第 ② 层。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-stepper/MStepper";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-stepper") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

const btn = (el: any, act: string): HTMLButtonElement =>
  el.shadowRoot.querySelector(`[data-act='${act}']`);

describe("m-stepper", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("点上界：值 +1 并发 z-change（带 prev）", async () => {
    el = mount({ value: 3, min: 0, max: 9 });
    await flush();
    const hits = collect(el, "z-change");
    btn(el, "plus").click();
    expect(hits).toEqual([{ value: 4, prev: 3 }]);
    expect(el.value).toBe(4);
  });

  it("到上界后按钮置灰", async () => {
    el = mount({ value: 8, min: 0, max: 9 });
    await flush();
    btn(el, "plus").click();
    await flush();
    expect(el.value).toBe(9);
    expect(btn(el, "plus").disabled).toBe(true);
  });

  it("到上界后即使按钮可用也不发事件（逻辑层防空写）", async () => {
    el = mount({ value: 9, min: 0, max: 9 });
    await flush();
    const hits = collect(el, "z-change");
    const plus = btn(el, "plus");
    expect(plus.disabled, "渲染期就该置灰").toBe(true);
    // 解开第 ① 层，单独验证第 ② 层
    plus.disabled = false;
    plus.click();
    expect(hits, "值没变就不该上报（宿主要拿它写库）").toHaveLength(0);
  });

  it("到下界同理", async () => {
    el = mount({ value: 0, min: 0, max: 9 });
    await flush();
    const hits = collect(el, "z-change");
    const minus = btn(el, "minus");
    expect(minus.disabled).toBe(true);
    minus.disabled = false;
    minus.click();
    expect(hits).toHaveLength(0);
  });

  it("小数步长不产生浮点噪声（0.1 + 0.2 不能是 0.30000000000000004）", async () => {
    el = mount({ value: 0.1, min: 0, max: 5, step: 0.1 });
    await flush();
    const hits = collect(el, "z-change");
    btn(el, "plus").click();
    btn(el, "plus").click();
    btn(el, "plus").click();
    expect(hits.map((h) => h.value)).toEqual([0.2, 0.3, 0.4]);
    for (const h of hits) expect(String(h.value)).not.toContain("0000000");
  });

  it("跨过 max 时夹到 max，不是超出去", async () => {
    el = mount({ value: 8, min: 0, max: 9, step: 5 });
    await flush();
    const hits = collect(el, "z-change");
    btn(el, "plus").click();
    expect(hits).toEqual([{ value: 9, prev: 8 }]);
  });

  it("跨过 min 时夹到 min", async () => {
    el = mount({ value: 2, min: 0, max: 9, step: 5 });
    await flush();
    const hits = collect(el, "z-change");
    btn(el, "minus").click();
    expect(hits).toEqual([{ value: 0, prev: 2 }]);
  });

  it("不设 max 时不会禁用加号（可以一直加）", async () => {
    el = mount({ value: 99, min: 0 });
    await flush();
    expect(btn(el, "plus").disabled).toBe(false);
  });

  it("disabled 时点了什么都不发，两个按钮都置灰", async () => {
    el = mount({ value: 3, min: 0, max: 9, disabled: true });
    await flush();
    const hits = collect(el, "z-change");
    btn(el, "plus").click();
    btn(el, "minus").click();
    expect(hits).toEqual([]);
    expect(btn(el, "plus").disabled).toBe(true);
    expect(btn(el, "minus").disabled).toBe(true);
  });
});
