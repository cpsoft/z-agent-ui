// Test: z-chart 框选（brushable）—— 与点击、与 tooltip 的指针仲裁
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-11-17
//
// [为什么测的是「仲裁」而不是像素] 框选本身的几何只是一圈矩形（画在哪、多大），
// 出错也很容易看出来。真正难的是**它和已有交互抢同一个指针**：
//   · 点一下柱子 vs 拖出 2px 的框；
//   · 框选结束浏览器必然补一个 click，不清掉就会多报一个 z-marker-click；
//   · 框选期间 tooltip 还在跟指针，两个浮层叠在一起。
// 这三条每一条坏掉都**不报错**，只表现为「多了一次事件」或「浮层乱了」。
import { describe, expect, it } from "vitest";
import "../../../src/report/chart";

const wait = () => new Promise((r) => setTimeout(r, 0));

/** 12 个分类 c0..c11，值 10..120。 */
const twelve = Array.from({ length: 12 }, (_, i) => ({ label: `c${i}`, value: (i + 1) * 10 }));

/** happy-dom 不排版，getBoundingClientRect 恒为 0 —— 这里给绘图区一个确定的盒子。 */
const PLOT = { left: 0, top: 0, right: 400, bottom: 320, width: 400, height: 320, x: 0, y: 0 };

async function mountChart(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-chart") as any;
  el.animation = false;
  el.setAttribute("type", "bar");
  el.setAttribute("width", "400");
  el.setAttribute("height", "320");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  const se = document.createElement("z-chart-series") as any;
  se.name = "s";
  se.data = twelve;
  el.appendChild(se);
  document.body.appendChild(el);
  await wait();
  await wait();

  const plot = el.shadowRoot.querySelector(".z-chart__plot") as HTMLElement;
  plot.getBoundingClientRect = () => PLOT as DOMRect;
  return { el, plot };
}

/** 用 MouseEvent 冒充 PointerEvent：happy-dom 没有 PointerEvent，而我们要的字段都一样。 */
function fire(target: Element, type: string, x: number, y: number) {
  target.dispatchEvent(
    new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, composed: true }),
  );
}

function drag(plot: Element, x0: number, y0: number, x1: number, y1: number) {
  fire(plot, "pointerdown", x0, y0);
  fire(plot, "pointermove", x1, y1);
  fire(plot, "pointerup", x1, y1);
  // 浏览器在 pointerup 之后补的那个 click —— 必须模拟，否则测不到「抑制」这条
  fire(plot, "click", x1, y1);
}

describe("z-chart 框选", () => {
  it("拖出一个框：上报 z-brush，且带命中点与下标区间", async () => {
    const { el, plot } = await mountChart({ brushable: "" });
    let detail: any = null;
    el.addEventListener("z-brush", (e: CustomEvent) => {
      detail = e.detail;
    });

    // 框住画布左半（前 6 根柱大致在这里）
    drag(plot, 0, 0, 200, 320);

    expect(detail).toBeTruthy();
    expect(detail.points.length).toBeGreaterThan(0);
    expect(detail.points.length).toBeLessThan(12);
    // 框的是左半：命中点必须靠左，右半的 c11 不该在内
    expect(detail.indexRange[1]).toBeLessThan(11);
    // 选区矩形是几何事实，顺手钉住（防止「报了事件但框没画出来」）
    expect(detail.w).toBeCloseTo(200, 0);
  });

  it("框选结束后不再额外上报 z-marker-click（浏览器会补一个 click）", async () => {
    const { el, plot } = await mountChart({ brushable: "" });
    let brushes = 0;
    const clicks: any[] = [];
    el.addEventListener("z-brush", () => brushes++);
    el.addEventListener("z-marker-click", (e: CustomEvent) => clicks.push(e.detail));

    fire(plot, "pointerdown", 0, 0);
    fire(plot, "pointermove", 200, 320);
    fire(plot, "pointerup", 200, 320);
    // [WHY click 必须派给某个 ghost] 真实浏览器里 click 的 target 是**松开位置下
    // 最上层的元素** —— 框选时选区是 pointer-events:none，所以落在柱子的命中区上。
    // 第一版把 click 派给了 plot，path 里找不到 [data-m] 自然不 emit，
    // 于是「去掉 _suppressClick」这个变异照样全绿（假绿：断言没复现真实失败路径）。
    const ghost = el.shadowRoot.querySelector(".z-chart__overlay [data-m]")!;
    ghost.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    // [变异验证] 去掉 _suppressClick 的检查后这里会变成 1 —— 宿主会以为用户点了一下柱子。
    expect(brushes).toBe(1);
    expect(clicks).toHaveLength(0);
  });

  it("位移小于阈值按点击处理：不产生选区", async () => {
    const { el, plot } = await mountChart({ brushable: "" });
    let brushes = 0;
    el.addEventListener("z-brush", () => brushes++);

    // 按住后只挪 2px（手抖），再松开
    drag(plot, 100, 100, 102, 100);

    // [变异验证] 去掉阈值判定（按下即框选）时这里是 1，而且每次点击都会闪一下小方框。
    expect(brushes).toBe(0);
    // 选区元素不该显示
    expect((el.shadowRoot.querySelector(".z-chart__brush") as HTMLElement).hidden).toBe(true);
  });

  it("没写 brushable 时拖拽不产生选区（存量页面行为不变）", async () => {
    const { el, plot } = await mountChart();
    let brushes = 0;
    el.addEventListener("z-brush", () => brushes++);

    drag(plot, 0, 0, 200, 320);

    expect(brushes).toBe(0);
    // 没有 brushable 时 click 也不该被抑制（那条路径压根没进入框选）
    expect((el.shadowRoot.querySelector(".z-chart__brush") as HTMLElement).hidden).toBe(true);
  });

  it("选区下标是原始 dataIndex（缩放切片后要还原，与 z-marker-click 同一口径）", async () => {
    // 12 个分类、zoom 0.5,1 只留后 6 个（c6..c11），本地下标 0..5 对应原始 6..11
    const { el, plot } = await mountChart({ brushable: "", zoomable: "", zoom: "0.5,1" });
    let detail: any = null;
    el.addEventListener("z-brush", (e: CustomEvent) => {
      detail = e.detail;
    });

    drag(plot, 0, 0, 400, 320);

    expect(detail).toBeTruthy();
    // [变异验证] 漏掉 `+ this._zoomOffset` 时这里从 6 开始，宿主会去查错位的原始行。
    expect(Math.min(...detail.points.map((p: any) => p.dataIndex))).toBe(6);
    expect(Math.max(...detail.points.map((p: any) => p.dataIndex))).toBe(11);
  });
});

// ── 键盘等价（2026-11-17）────────────────────────────────────
//
// 框选是**唯一**能把一段数据交给宿主的操作。只有指针意味着键盘与读屏用户完全用不了
// 下钻/联动 —— 那不是体验差一点，是功能对他们不存在。
//
// 交互是自己定的（ECharts 没有先例）：Shift+方向键扩展，Enter 提交，Esc 取消。
// 不自动提交是因为键盘没有「松开鼠标」那一刻。
describe("z-chart 框选的键盘等价", () => {
  const key = (el: Element, k: string, shift = false) =>
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, shiftKey: shift, bubbles: true, composed: true }));

  it("Shift+→ 两次后 Enter：上报 3 个点（锚点 + 两步）", async () => {
    const { el } = await mountChart({ brushable: "" });
    const got: any[] = [];
    el.addEventListener("z-brush", (e: CustomEvent) => got.push(e.detail));

    key(el, "ArrowRight", true);
    key(el, "ArrowRight", true);
    key(el, "Enter");

    expect(got).toHaveLength(1);
    expect(got[0].points).toHaveLength(3);
    expect(got[0].indexRange).toEqual([0, 2]);
  });

  it("扩展过程中不提前上报（否则宿主收到一串半成品选区）", async () => {
    const { el } = await mountChart({ brushable: "" });
    let n = 0;
    el.addEventListener("z-brush", () => n++);
    key(el, "ArrowRight", true);
    key(el, "ArrowRight", true);
    key(el, "ArrowRight", true);
    // [变异判据] 改成「每次方向键都 emit」时这里是 3
    expect(n).toBe(0);
  });

  it("Esc 撤销后 Enter 不再上报", async () => {
    const { el } = await mountChart({ brushable: "" });
    let n = 0;
    el.addEventListener("z-brush", () => n++);
    key(el, "ArrowRight", true);
    key(el, "Escape");
    key(el, "Enter");
    expect(n).toBe(0);
  });

  it("不按 Shift 的方向键仍是「逐个看数据点」，不产生选区", async () => {
    const { el } = await mountChart({ brushable: "" });
    let n = 0;
    el.addEventListener("z-brush", () => n++);
    key(el, "ArrowRight");
    key(el, "ArrowRight");
    key(el, "Enter");
    expect(n).toBe(0);
  });

  it("没开 brushable 时 Shift+方向键不拦截（不影响原有的键盘导航）", async () => {
    const { el } = await mountChart({});
    let n = 0;
    el.addEventListener("z-brush", () => n++);
    key(el, "ArrowRight", true);
    key(el, "Enter");
    expect(n).toBe(0);
  });

  it("上报的 dataIndex 同样带 zoom 偏移（与鼠标框选同口径）", async () => {
    // 12 个分类、初始只看 25%~75%（下标 3..8），框第 1、2 个可见点 ⇒ 全量下标 3、4
    const { el } = await mountChart({ brushable: "", zoomable: "", zoom: "0.25,0.75" });
    const got: any[] = [];
    el.addEventListener("z-brush", (e: CustomEvent) => got.push(e.detail));
    key(el, "ArrowRight", true);
    key(el, "Enter");
    expect(got).toHaveLength(1);
    // [变异判据] 漏掉 `+ _zoomOffset` 时这里是 [0] —— 宿主拿它查原始行会前移 3 行
    expect(got[0].indexRange).toEqual([3, 4]);
  });
});
