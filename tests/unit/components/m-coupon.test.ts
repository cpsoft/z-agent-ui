// Test: H5 券类组件 m-coupon
// Related: [[REQ-054-h5-coupon]]
// Wiki: wiki/requirements/REQ-054-h5-coupon.md
// Date: 2026-11-24
//
// 断言钉的都是「会静默错」的点：
//   · 面额上的零（20.00 印成 ¥20.00、19.90 印成 ¥19.9，两种都是错）
//   · 无门槛券印成「满 0 可用」
//   · 失效券还能点出 z-click（用户点「已过期」的券进详情，看到的是「已过期」页）
//   · 点「领取」同时发出 z-click（一次点击两条事件，宿主会同时领券 + 跳详情）

import { afterEach, describe, expect, it } from "vitest";
import "../../../src/components/m-coupon/index.js";
import type { MCoupon } from "../../../src/components/m-coupon/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function mount(attrs: Record<string, string> = {}): MCoupon {
  const el = document.createElement("m-coupon") as MCoupon;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

const q = (el: MCoupon, sel: string) => el.shadowRoot!.querySelector(sel);

afterEach(() => {
  document.body.innerHTML = "";
});

describe("m-coupon：面额", () => {
  it("满减券：¥ + 面额 + 门槛；20.00 印成 20", async () => {
    const el = mount({ value: "20.00", threshold: "99" });
    await tick();
    expect(q(el, ".m-coupon__sym")!.textContent).toBe("¥");
    expect(q(el, ".m-coupon__num")!.textContent).toBe("20");
    expect(q(el, ".m-coupon__cond")!.textContent).toBe("满 99 可用");
  });

  it("带角分的面额不被抹平（19.90 → 19.90）", async () => {
    const el = mount({ value: "19.90", threshold: "0" });
    await tick();
    expect(q(el, ".m-coupon__num")!.textContent).toBe("19.90");
  });

  it("无门槛券不印「满 0 可用」", async () => {
    const el = mount({ value: "5" });
    await tick();
    expect(q(el, ".m-coupon__cond")!.textContent).toBe("无门槛");
  });

  it("折扣券：8.5 折；免运费券：三个字", async () => {
    const off = mount({ kind: "discount", value: "8.5" });
    await tick();
    expect(q(off, ".m-coupon__num")!.textContent).toBe("8.5");
    expect(q(off, ".m-coupon__unit")!.textContent).toBe("折");

    const free = mount({ kind: "freight" });
    await tick();
    expect(q(free, ".m-coupon__word")!.textContent).toBe("免运费");
    expect(q(free, ".m-coupon__num")).toBeNull();
  });
});

describe("m-coupon：状态与事件", () => {
  it("可用：画按钮、aria-disabled=false", async () => {
    const el = mount({ value: "20", threshold: "99", title: "新客专享", action: "立即领取" });
    await tick();
    const btn = q(el, "[part~='action']") as HTMLButtonElement;
    expect(btn.textContent).toBe("立即领取");
    expect(btn.disabled).toBe(false);
    expect(q(el, "[part~='root']")!.getAttribute("aria-disabled")).toBe("false");
  });

  it("已使用 / 已过期：不画按钮，印章写明原因", async () => {
    const used = mount({ value: "20", status: "used", action: "立即领取" });
    await tick();
    expect(q(used, "[part~='action']")).toBeNull();
    expect(q(used, ".m-coupon__stamp")!.textContent).toBe("已使用");
    expect(used.shadowRoot!.querySelector("[part~='root']")!.getAttribute("aria-disabled")).toBe("true");

    const expired = mount({ value: "20", status: "expired" });
    await tick();
    expect(q(expired, ".m-coupon__stamp")!.textContent).toBe("已过期");
  });

  it("点「领取」只发 z-action，不发 z-click（否则会同时领券 + 跳详情）", async () => {
    const el = mount({ value: "20", title: "新人券", action: "立即领取", clickable: "" });
    await tick();
    const events: string[] = [];
    el.addEventListener("z-action", () => events.push("action"));
    el.addEventListener("z-click", () => events.push("click"));
    (q(el, "[part~='action']") as HTMLElement).click();
    await tick();
    expect(events).toEqual(["action"]);
  });

  it("点「领取」的点击不冒到外层容器（券外面套着链接时不会顺带跳走）", async () => {
    const wrap = document.createElement("div");
    document.body.appendChild(wrap);
    const el = document.createElement("m-coupon") as MCoupon;
    el.setAttribute("value", "20");
    el.setAttribute("action", "立即领取");
    wrap.appendChild(el);
    await tick();
    let outer = 0;
    wrap.addEventListener("click", () => outer++);
    (q(el, "[part~='action']") as HTMLElement).click();
    await tick();
    expect(outer).toBe(0);
    // 对照：点券面会冒出去（宿主在整卡上做跳转就是靠这条）
    el.setAttribute("clickable", "");
    await tick();
    (q(el, "[part~='body']") as HTMLElement).click();
    await tick();
    expect(outer).toBe(1);
    wrap.remove();
  });

  it("clickable 时点券面发 z-click；失效券不发", async () => {
    const live = mount({ value: "20", clickable: "" });
    await tick();
    let n = 0;
    live.addEventListener("z-click", () => n++);
    (q(live, "[part~='body']") as HTMLElement).click();
    await tick();
    expect(n).toBe(1);

    live.status = "expired";
    await tick();
    (q(live, "[part~='body']") as HTMLElement).click();
    await tick();
    expect(n).toBe(1);
  });

  it("不可点（没开 clickable）时不发 z-click，即使状态可用", async () => {
    const el = mount({ value: "20" });
    await tick();
    let n = 0;
    el.addEventListener("z-click", () => n++);
    (q(el, "[part~='body']") as HTMLElement).click();
    await tick();
    expect(n).toBe(0);
  });

  it("读屏名称把面额与门槛说完整", async () => {
    const el = mount({ value: "20", threshold: "99", title: "新客专享" });
    await tick();
    expect(q(el, "[part~='root']")!.getAttribute("aria-label")).toBe(
      "优惠券，新客专享，满 99 减 20",
    );
  });
});
