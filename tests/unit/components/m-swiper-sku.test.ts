// Test: H5 商城件第二批（m-swiper / m-sku-picker）
// Related: [[REQ-052-h5-swiper-sku]]
// Wiki: wiki/requirements/REQ-052-h5-swiper-sku.md
// Date: 2026-11-24
//
// 这两件是详情页的门槛：缺轮播就放不出商品图集，缺规格弹层就下不了单。
// 断言钉的都是**会静默错**的点：
//   · `items` 用逗号分隔时图片全挂（CDN 裁剪参数自带逗号）
//   · 不可组合的规格没置灰（用户点完才发现下单失败，还不知道是哪个维度的问题）
//   · 没选全就能提交（订单缺一个维度，仓库无法发货）
//   · 库存取商品总数而不是当前组合（超卖）
//   · 数量没跟着库存收紧（选了只剩 1 件的组合还能加到 5）

import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/m-swiper/index.js";
import "../../../src/components/m-sku-picker/index.js";
import type { MSkuPicker, SkuRow } from "../../../src/components/m-sku-picker/index.js";
import type { MSwiper } from "../../../src/components/m-swiper/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const el = document.createElement(tag) as HTMLElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("m-swiper：图片轮播", () => {
  it("`|` 分隔；URL 里的逗号不能把一张图切成两张", async () => {
    const el = mount("m-swiper", {
      items: "a.jpg?x-oss-process=image/resize,w_750|b.jpg|c.jpg",
    }) as MSwiper;
    await tick();
    const imgs = el.shadowRoot!.querySelectorAll("img");
    expect(imgs.length).toBe(3);
    // 逗号在裁剪参数里，切错了第一张会变成 `a.jpg?x-oss-process=image/resize`
    expect(imgs[0].getAttribute("src")).toBe("a.jpg?x-oss-process=image/resize,w_750");
  });

  it("圆点数量等于图数，激活项跟着 current", async () => {
    const el = mount("m-swiper", { items: "a|b|c", current: "1" }) as MSwiper;
    await tick();
    const dots = el.shadowRoot!.querySelectorAll(".m-swiper__dot");
    expect(dots.length).toBe(3);
    expect(dots[1].classList.contains("is-active")).toBe(true);
    expect(dots[1].getAttribute("aria-current")).toBe("true");
    // 非激活的图对读屏隐藏（不然会念三张图的 alt）
    const slides = el.shadowRoot!.querySelectorAll(".m-swiper__slide");
    expect(slides[0].getAttribute("aria-hidden")).toBe("true");
    expect(slides[1].getAttribute("aria-hidden")).toBe("false");
  });

  it("点圆点翻页并发 z-change（带 index）", async () => {
    const el = mount("m-swiper", { items: "a|b|c" }) as MSwiper;
    await tick();
    let got = -1;
    el.addEventListener("z-change", (e) => {
      got = (e as CustomEvent).detail.index;
    });
    (el.shadowRoot!.querySelectorAll(".m-swiper__dot")[2] as HTMLElement).click();
    await tick();
    expect(got).toBe(2);
    expect(el.current).toBe(2);
  });

  it("loop 时越界回绕；关掉则停在边界且不报错", async () => {
    const wrap = mount("m-swiper", { items: "a|b|c" }) as MSwiper;
    await tick();
    wrap.goTo(3);
    expect(wrap.current).toBe(0);
    wrap.goTo(-1);
    expect(wrap.current).toBe(2);

    wrap.remove();
    // 布尔属性是「在即真」：写 loop="false" 也是 true，要用属性赋值
    const pinned = mount("m-swiper", { items: "a|b|c" }) as MSwiper;
    pinned.loop = false;
    await tick();
    pinned.goTo(2);
    expect(pinned.current).toBe(2);
    // 已在最后一张，再往后不该动（loop=false）
    pinned.next();
    expect(pinned.current).toBe(2);
    pinned.goTo(0);
    pinned.prev();
    expect(pinned.current).toBe(0);
  });

  it("indicator=none 不画指示器，number 画页码", async () => {
    const none = mount("m-swiper", { items: "a|b", indicator: "none" }) as MSwiper;
    await tick();
    expect(none.shadowRoot!.querySelector(".m-swiper__dots")).toBeNull();
    expect(none.shadowRoot!.querySelector(".m-swiper__count")).toBeNull();

    none.remove();
    const num = mount("m-swiper", { items: "a|b", indicator: "number", current: "1" }) as MSwiper;
    await tick();
    expect(num.shadowRoot!.querySelector(".m-swiper__count")!.textContent).toBe("2 / 2");
  });

  it("自动播放按间隔前进（只给一张图时不启动）", async () => {
    vi.useFakeTimers();
    const el = document.createElement("m-swiper") as MSwiper;
    el.setAttribute("items", "a|b|c");
    el.setAttribute("autoplay", "1000");
    document.body.appendChild(el);
    expect(el.current).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(el.current).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(el.current).toBe(0); // 两张之后回绕

    const single = document.createElement("m-swiper") as MSwiper;
    single.setAttribute("items", "a");
    single.setAttribute("autoplay", "1000");
    document.body.appendChild(single);
    vi.advanceTimersByTime(5000);
    expect(single.current).toBe(0);
  });

  it("点图发 z-click，点到指示器不发", async () => {
    const el = mount("m-swiper", { items: "a|b" }) as MSwiper;
    await tick();
    const seen: number[] = [];
    el.addEventListener("z-click", (e) => seen.push((e as CustomEvent).detail.index));
    (el.shadowRoot!.querySelector(".m-swiper__img") as HTMLElement).click();
    await tick();
    expect(seen).toEqual([0]);
    (el.shadowRoot!.querySelectorAll(".m-swiper__dot")[1] as HTMLElement).click();
    await tick();
    expect(seen).toEqual([0]);
  });
});

const MATRIX: SkuRow[] = [
  { specs: { 颜色: "米白", 尺码: "250ml" }, price: 128, stock: 3 },
  { specs: { 颜色: "米白", 尺码: "500ml" }, price: 198, stock: 0 },
  { specs: { 颜色: "岩灰", 尺码: "500ml" }, price: 208, stock: 1 },
];

describe("m-sku-picker：规格选择", () => {
  it("不显示时只画一个不占位的空盒", async () => {
    const el = mount("m-sku-picker", { groups: "颜色:米白" }) as MSkuPicker;
    await tick();
    expect(el.shadowRoot!.querySelector(".m-sku__panel")).toBeNull();
  });

  it("`groups` 字符串解析出组与选项，标题与选项值都在", async () => {
    const el = mount("m-sku-picker", {
      visible: "",
      groups: "颜色:米白,岩灰|尺码:250ml,500ml",
    }) as MSkuPicker;
    el.visible = true;
    await tick();
    const names = [...el.shadowRoot!.querySelectorAll(".m-sku__name")].map((n) => n.textContent);
    expect(names).toEqual(["颜色", "尺码"]);
    const opts = [...el.shadowRoot!.querySelectorAll(".m-sku__opt")].map((o) => o.textContent);
    expect(opts).toEqual(["米白", "岩灰", "250ml", "500ml"]);
  });

  it("没选全时按钮不可点、文案提示还缺哪个维度", async () => {
    const el = mount("m-sku-picker", {
      groups: "颜色:米白,岩灰|尺码:250ml,500ml",
      stock: "9",
    }) as MSkuPicker;
    el.visible = true;
    await tick();
    const btn = el.shadowRoot!.querySelector(".m-sku__confirm") as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent!.trim()).toBe("请选择规格");
    expect(el.shadowRoot!.querySelector(".m-sku__picked")!.textContent).toBe("请选择 颜色 / 尺码");

    (el.shadowRoot!.querySelectorAll(".m-sku__opt")[0] as HTMLElement).click();
    await tick();
    expect(el.shadowRoot!.querySelector(".m-sku__picked")!.textContent).toBe("请选择 尺码");
  });

  it("选全后上报 selected 与 qty，按钮恢复可点", async () => {
    const el = mount("m-sku-picker", {
      groups: "颜色:米白,岩灰|尺码:250ml,500ml",
      stock: "9",
      confirmText: "立即购买",
    }) as MSkuPicker;
    el.visible = true;
    await tick();
    const changes: Array<Record<string, unknown>> = [];
    el.addEventListener("z-change", (e) => changes.push((e as CustomEvent).detail));

    (el.shadowRoot!.querySelectorAll(".m-sku__opt")[0] as HTMLElement).click();
    (el.shadowRoot!.querySelectorAll(".m-sku__opt")[2] as HTMLElement).click();
    await tick();

    expect(changes.at(-1)).toMatchObject({
      selected: { 颜色: "米白", 尺码: "250ml" },
      complete: true,
    });
    const btn = el.shadowRoot!.querySelector(".m-sku__confirm") as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent!.trim()).toBe("立即购买");
  });

  it("SKU 矩阵：无货的组合置灰，选中它旁边那个也不能把它带活", async () => {
    const el = mount("m-sku-picker") as MSkuPicker;
    el.groups = "颜色:米白,岩灰|尺码:250ml,500ml";
    el.skus = MATRIX;
    el.visible = true;
    await tick();

    const opt = (group: string, value: string): HTMLButtonElement =>
      el.shadowRoot!.querySelector(`[data-group="${group}"][data-value="${value}"]`) as HTMLButtonElement;

    // 未选任何规格时：500ml 有货（岩灰那行），所以可点
    expect(opt("尺码", "500ml").disabled).toBe(false);
    // 选中米白后，500ml 那一行库存为 0 —— 必须置灰
    opt("颜色", "米白").click();
    await tick();
    expect(opt("尺码", "500ml").disabled).toBe(true);
    expect(opt("尺码", "250ml").disabled).toBe(false);
  });

  it("库存与价格取当前组合那一行，数量上限跟着库存", async () => {
    const el = mount("m-sku-picker") as MSkuPicker;
    el.groups = "颜色:米白,岩灰|尺码:250ml,500ml";
    el.skus = MATRIX;
    el.price = "0";
    el.visible = true;
    await tick();

    (el.shadowRoot!.querySelector('[data-value="岩灰"]') as HTMLElement).click();
    (el.shadowRoot!.querySelector('[data-value="500ml"]') as HTMLElement).click();
    await tick();

    // 岩灰 / 500ml 库存 1，价格 208（不是兜底价 0）
    expect(el.shadowRoot!.querySelector(".m-sku__stock")!.textContent).toBe("库存 1 件");
    const priceInt = el.shadowRoot!.querySelector("m-price")!.shadowRoot!.querySelector(".m-price__int");
    expect(priceInt!.textContent).toBe("208");
    // 数量被夹到 1：不能给只剩 1 件的组合加到 5
    el.qty = 5;
    await tick();
    expect(el.shadowRoot!.querySelector("m-stepper")!.getAttribute("max")).toBe("1");
  });

  it("选到无货组合时按钮不可点（库存 0）", async () => {
    const el = mount("m-sku-picker") as MSkuPicker;
    el.groups = "颜色:米白,岩灰|尺码:250ml,500ml";
    el.skus = MATRIX;
    el.visible = true;
    await tick();
    // 直接走 API：绕过置灰（宿主预填的历史选择可能就是无货组合）
    el.select("颜色", "米白");
    el.select("尺码", "500ml");
    await tick();
    expect(el.shadowRoot!.querySelector(".m-sku__confirm")!.hasAttribute("disabled")).toBe(true);
  });

  it("没选全时上报的库存是 null，不是 -1（宿主会把它印成「库存 -1 件」）", async () => {
    const el = mount("m-sku-picker") as MSkuPicker;
    el.groups = "颜色:米白,岩灰|尺码:250ml";
    el.skus = MATRIX;
    el.visible = true;
    await tick();
    const seen: Array<Record<string, unknown>> = [];
    el.addEventListener("z-change", (e) => seen.push((e as CustomEvent).detail));
    el.select("颜色", "米白");
    await tick();
    expect(seen.at(-1)).toMatchObject({ complete: false, stock: null });
    el.select("尺码", "250ml");
    await tick();
    expect(seen.at(-1)).toMatchObject({ complete: true, stock: 3 });
  });

  it("确认发出 z-confirm 并关闭；点遮罩关闭，点面板不关闭", async () => {
    const el = mount("m-sku-picker", { groups: "颜色:米白", stock: "5" }) as MSkuPicker;
    el.visible = true;
    await tick();
    (el.shadowRoot!.querySelector(".m-sku__opt") as HTMLElement).click();
    await tick();

    let confirmed: Record<string, unknown> | null = null;
    el.addEventListener("z-confirm", (e) => {
      confirmed = (e as CustomEvent).detail;
    });
    (el.shadowRoot!.querySelector(".m-sku__confirm") as HTMLElement).click();
    await tick();
    expect(confirmed).toMatchObject({ selected: { 颜色: "米白" }, qty: 1, complete: true });
    expect(el.visible).toBe(false);

    el.visible = true;
    await tick();
    (el.shadowRoot!.querySelector(".m-sku__panel") as HTMLElement).click();
    await tick();
    expect(el.visible).toBe(true);
    (el.shadowRoot!.querySelector(".m-sku__overlay") as HTMLElement).click();
    await tick();
    expect(el.visible).toBe(false);
  });

  it("hideQty 不画数量行；origin 画划线价", async () => {
    const el = mount("m-sku-picker", {
      groups: "颜色:米白",
      stock: "5",
      origin: "168",
      hideQty: "",
    }) as MSkuPicker;
    el.visible = true;
    await tick();
    expect(el.shadowRoot!.querySelector("m-stepper")).toBeNull();
    expect(el.shadowRoot!.querySelectorAll("m-price").length).toBe(2);
    expect(el.shadowRoot!.querySelectorAll("m-price")[1].hasAttribute("strike")).toBe(true);
  });

  it("没有 groups 时从 skus 反推规格组", async () => {
    const el = mount("m-sku-picker") as MSkuPicker;
    el.skus = MATRIX;
    el.visible = true;
    await tick();
    const names = [...el.shadowRoot!.querySelectorAll(".m-sku__name")].map((n) => n.textContent);
    expect(names).toEqual(["颜色", "尺码"]);
    const opts = [...el.shadowRoot!.querySelectorAll(".m-sku__opt")].map((o) => o.textContent);
    // 去重后按出现顺序：米白 / 岩灰 / 250ml / 500ml
    expect(opts).toEqual(["米白", "岩灰", "250ml", "500ml"]);
  });
});
