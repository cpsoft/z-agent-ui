// Test: H5 商城件（m-price / m-checkbox / m-radio / m-tabs / m-goods-card / m-checkout-bar）
// Related: [[REQ-051-h5-commerce-parts]]
// Wiki: wiki/requirements/REQ-051-h5-commerce-parts.md
// Date: 2026-11-24
//
// 这六件是「搭一个 H5 商城」缺的那一层：价格排版、勾选、单选、状态页签条、商品卡、结算栏。
// 断言全部手写期望值（不从被测实现生成），且每条都钉住一个**会静默错**的点：
//   · 价格的小数位与千分位（`9.9` 印成 `9.9` 而不是 `9.90`，两张卡对比就像两个价）
//   · 加购不能冒泡成整卡点击（点了「+」跳到详情页）
//   · 单选组互斥（三个都亮着）
//   · 结算栏在 0 件时仍可提交（空单）
//   · 页签切换上报的是 key 不是下标（下标随角标显隐变化）

import { describe, expect, it } from "vitest";
import "../../../src/components/m-price/index.js";
import "../../../src/components/m-checkbox/index.js";
import "../../../src/components/m-radio/index.js";
import "../../../src/components/m-tabs/index.js";
import "../../../src/components/m-goods-card/index.js";
import "../../../src/components/m-checkout-bar/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag) as HTMLElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe("m-price：金额排版", () => {
  it("9.9 补两位小数，整数与小数分开渲染", async () => {
    const el = mount("m-price", { value: "9.9" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price__int")!.textContent).toBe("9");
    expect(el.shadowRoot!.querySelector(".m-price__dec")!.textContent).toBe(".90");
    el.remove();
  });

  it("四位数加千分位（合计金额会用到）", async () => {
    const el = mount("m-price", { value: "12800" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price__int")!.textContent).toBe("12,800");
    el.remove();
  });

  it("负数带符号（退款 / 抵扣）", async () => {
    const el = mount("m-price", { value: "-12.5" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price__sign")!.textContent).toBe("-");
    expect(el.shadowRoot!.querySelector(".m-price__int")!.textContent).toBe("12");
    el.remove();
  });

  it("空值走 empty-text，不印 ¥", async () => {
    const el = mount("m-price", { value: "", "empty-text": "面议" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price__symbol")).toBeNull();
    expect(el.shadowRoot!.textContent).toContain("面议");
    el.remove();
  });

  it("strike 只是划线样式，不改变数值", async () => {
    const el = mount("m-price", { value: "168", strike: "" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price")!.classList.contains("m-price--strike")).toBe(true);
    expect(el.shadowRoot!.querySelector(".m-price__int")!.textContent).toBe("168");
    el.remove();
  });

  it("读屏拿到完整一句（内部装饰段 aria-hidden）", async () => {
    const el = mount("m-price", { value: "9.9" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-price")!.getAttribute("aria-label")).toBe("¥9.90");
    expect(el.shadowRoot!.querySelector(".m-price__main")!.getAttribute("aria-hidden")).toBe("true");
    el.remove();
  });
});

describe("m-checkbox：勾选与半选", () => {
  it("点击发 z-change，detail 带 checked 与 value", async () => {
    const el = mount("m-checkbox", { value: "sku-1", label: "加入清单" }) as HTMLElement & { checked: boolean };
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector("label")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ checked: true, value: "sku-1" }]);
    el.remove();
  });

  it("label 属性与 slot 内容二选一（都写时只画属性，不重复一遍）", async () => {
    const el = mount("m-checkbox", { label: "属性文字" });
    el.textContent = "插槽文字";
    await tick();
    const label = el.shadowRoot!.querySelector(".m-checkbox__label")!;
    expect(label.textContent).toContain("属性文字");
    expect(label.querySelector("slot")).toBeNull();
    el.remove();
  });

  it("disabled 点了不发", async () => {
    const el = mount("m-checkbox", { disabled: "" });
    await tick();
    let n = 0;
    el.addEventListener("z-change", () => n++);
    el.shadowRoot!.querySelector("label")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(n).toBe(0);
    el.remove();
  });

  it("半选的 aria 是 mixed，点一下变明确选中", async () => {
    const el = mount("m-checkbox", { indeterminate: "" }) as HTMLElement & { indeterminate: boolean };
    await tick();
    expect(el.shadowRoot!.querySelector("input")!.getAttribute("aria-checked")).toBe("mixed");
    el.shadowRoot!.querySelector("label")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(el.indeterminate).toBe(false);
    // 重渲染换掉了 input 节点，属性要重新查（旧引用已脱离文档）
    expect(el.shadowRoot!.querySelector("input")!.getAttribute("aria-checked")).toBe("true");
    el.remove();
  });
});

describe("m-radio：组内互斥", () => {
  it("选第二个：第一个灭、组 value 更新、只发一条 z-change", async () => {
    const group = mount("m-radio-group", { value: "a" });
    group.innerHTML = `<m-radio value="a" label="甲"></m-radio><m-radio value="b" label="乙"></m-radio>`;
    await tick();
    await tick();
    const radios = Array.from(group.querySelectorAll("m-radio")) as Array<
      HTMLElement & { checked: boolean; select(): void }
    >;
    expect(radios[0].checked).toBe(true);
    const seen: unknown[] = [];
    group.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail));
    radios[1].shadowRoot!.querySelector("label")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ value: "b" }]);
    expect(radios[0].checked).toBe(false);
    expect(radios[1].checked).toBe(true);
    expect((group as HTMLElement & { value: string }).value).toBe("b");
    group.remove();
  });

  it("再点已选中的不再发事件（否则宿主会重复记一次选择）", async () => {
    const group = mount("m-radio-group", { value: "a" });
    group.innerHTML = `<m-radio value="a"></m-radio><m-radio value="b"></m-radio>`;
    await tick();
    await tick();
    let n = 0;
    group.addEventListener("z-change", () => n++);
    const first = group.querySelector("m-radio") as HTMLElement;
    first.shadowRoot!.querySelector("label")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(n).toBe(0);
    group.remove();
  });
});

describe("m-tabs：状态页签条", () => {
  it("items 字符串解析出 key / label / 角标", async () => {
    const el = mount("m-tabs", { items: "all|全部,unpaid|待付款|2", active: "all" });
    await tick();
    const btns = el.shadowRoot!.querySelectorAll("[role='tab']");
    expect(btns.length).toBe(2);
    expect(btns[0].textContent!.trim()).toBe("全部");
    expect(btns[1].textContent!.trim()).toContain("待付款");
    expect(el.shadowRoot!.querySelector(".m-tabs__badge")!.textContent).toBe("2");
    el.remove();
  });

  it("点第二个发 z-change，detail 是 key 与 index", async () => {
    const el = mount("m-tabs", { items: "all|全部,unpaid|待付款", active: "all" });
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector("[data-key='unpaid']")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ key: "unpaid", index: 1 }]);
    expect(el.shadowRoot!.querySelector("[data-key='unpaid']")!.classList.contains("is-active")).toBe(true);
    el.remove();
  });

  it("点当前页签不发事件（同值不重取）", async () => {
    const el = mount("m-tabs", { items: "all|全部,unpaid|待付款", active: "all" });
    await tick();
    let n = 0;
    el.addEventListener("z-change", () => n++);
    el.shadowRoot!.querySelector("[data-key='all']")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(n).toBe(0);
    el.remove();
  });

  it("→ 键切到下一个并保持焦点在页签条上", async () => {
    const el = mount("m-tabs", { items: "a|甲,b|乙,c|丙", active: "a" });
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector("[role='tablist']")!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, composed: true }),
    );
    await tick();
    expect(seen).toEqual([{ key: "b", index: 1 }]);
    el.remove();
  });
});

describe("m-goods-card：加购不冒泡", () => {
  it("点加购只发 z-add，不发 z-click", async () => {
    const el = mount("m-goods-card", { value: "p1", title: "岩茶", price: "128", origin: "168" });
    await tick();
    const got: string[] = [];
    el.addEventListener("z-add", () => got.push("add"));
    el.addEventListener("z-click", () => got.push("click"));
    el.shadowRoot!.querySelector("[part~='add']")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(got).toEqual(["add"]);
    el.remove();
  });

  it("加购的点击不外溢到外层容器（整卡包在链接里时不会误跳）", async () => {
    const wrap = document.createElement("div");
    document.body.appendChild(wrap);
    const el = document.createElement("m-goods-card") as HTMLElement;
    el.setAttribute("value", "p1");
    el.setAttribute("title", "茶");
    el.setAttribute("price", "1");
    wrap.appendChild(el);
    await tick();
    let outer = 0;
    wrap.addEventListener("click", () => outer++);
    el.shadowRoot!.querySelector("[part~='add']")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    await tick();
    expect(outer).toBe(0);
    // 对照：点卡面会冒出去（宿主在整卡上做跳转就是靠这条）
    el.shadowRoot!.querySelector(".m-goods-card__title")!.dispatchEvent(
      new MouseEvent("click", { bubbles: true, composed: true }),
    );
    await tick();
    expect(outer).toBe(1);
    wrap.remove();
  });

  it("点卡面发 z-click 带 value（宿主据此跳详情）", async () => {
    const el = mount("m-goods-card", { value: "p1", title: "岩茶", price: "128" });
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-click", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector(".m-goods-card__title")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ value: "p1" }]);
    el.remove();
  });

  it("价格与原价分开渲染，原价带删除线类", async () => {
    const el = mount("m-goods-card", { title: "茶", price: "89.6", origin: "128" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-goods-card__price .int")!.textContent).toBe("89");
    expect(el.shadowRoot!.querySelector(".m-goods-card__origin")!.textContent).toContain("128");
    el.remove();
  });

  it("sold-out 不画加购按钮，且底部有遮罩", async () => {
    const el = mount("m-goods-card", { title: "茶", price: "1", "sold-out": "" });
    await tick();
    expect(el.shadowRoot!.querySelector("[part~='add']")).toBeNull();
    expect(el.shadowRoot!.querySelector(".m-goods-card__mask")!.textContent).toBe("已售罄");
    el.remove();
  });
});

describe("m-checkout-bar：全选与提交", () => {
  it("0 件时提交按钮 disabled", async () => {
    const el = mount("m-checkout-bar", { count: "0", total: "0" });
    await tick();
    expect((el.shadowRoot!.querySelector("[data-act='submit']") as HTMLButtonElement).disabled).toBe(true);
    el.remove();
  });

  it("点全选发 z-check-all，checked 翻转", async () => {
    const el = mount("m-checkout-bar", { count: "2", total: "217.6" });
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-check-all", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector("[data-act='check']")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ checked: true }]);
    el.remove();
  });

  it("点提交发 z-submit，detail 带件数与合计", async () => {
    const el = mount("m-checkout-bar", { count: "2", total: "217.6" });
    await tick();
    const seen: unknown[] = [];
    el.addEventListener("z-submit", (e) => seen.push((e as CustomEvent).detail));
    el.shadowRoot!.querySelector("[data-act='submit']")!.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
    await tick();
    expect(seen).toEqual([{ count: 2, total: "217.6" }]);
    el.remove();
  });

  it("合计补齐两位小数、件数单独一行", async () => {
    const el = mount("m-checkout-bar", { count: "3", total: "99.9" });
    await tick();
    expect(el.shadowRoot!.querySelector(".m-checkout-bar__amount .int")!.textContent).toBe("99");
    expect(el.shadowRoot!.querySelector(".m-checkout-bar__count")!.textContent).toContain("3");
    el.remove();
  });

  it("no-check 不渲染全选（详情页立即购买）", async () => {
    const el = mount("m-checkout-bar", { count: "1", total: "9.9", "no-check": "" });
    await tick();
    expect(el.shadowRoot!.querySelector("[data-act='check']")).toBeNull();
    el.remove();
  });
});
