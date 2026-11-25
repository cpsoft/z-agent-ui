// Test: z-chart 底部缩放条（声明式区间、分类切片、dataIndex 还原、键盘）
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-11-17
//
// [为什么不做「拖拽」的像素级断言] 拖拽换算依赖 clientWidth，而 happy-dom 不排版、
// 量出来恒为 0（dragTo 里有 `W <= 0` 的护栏，会直接返回）。用假的 clientWidth 去测
// 只能验证「我自己写的除法」，抓不到真机上的手感问题。这里改为验证**几何与语义**：
// 切片范围、轴标签、dataIndex 还原、键盘步长 —— 这些才是拖拽最终要改变的东西。

import { describe, it, expect } from "vitest";
import "../../../src/report/chart";

const wait = () => new Promise((r) => setTimeout(r, 0));

/** 12 个分类 c0..c11，值 10..120。 */
const twelve = Array.from({ length: 12 }, (_, i) => ({ label: `c${i}`, value: (i + 1) * 10 }));

function createChart(attrs: Record<string, string>): any {
  const el = document.createElement("z-chart") as any;
  el.animation = false;
  el.setAttribute("type", "bar");
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  const se = document.createElement("z-chart-series") as any;
  se.name = "s";
  se.data = twelve;
  el.appendChild(se);
  document.body.appendChild(el);
  return el;
}

const mount = async (attrs: Record<string, string>) => {
  const el = createChart(attrs);
  // 两次 await：首次 draw 之后 chrome 高度会触发一轮重算收敛
  await wait();
  await wait();
  return el;
};

const axisLabels = (el: any): string[] =>
  Array.from(el.shadowRoot.querySelectorAll(".z-chart__svg text")).map(
    (t: Element) => t.textContent ?? "",
  );

const ghosts = (el: any): Element[] =>
  Array.from(el.shadowRoot.querySelectorAll(".z-chart__overlay [data-m]"));

describe("z-chart 缩放", () => {
  it("zoomable 时渲染缩放条，分类不足 6 个时不渲染", async () => {
    const many = await mount({ zoomable: "" });
    expect(many.shadowRoot.querySelector(".z-chart__zoom")).toBeTruthy();

    // 只有 5 个分类：缩放条没意义，不该出现（也不该占高度）
    const few = document.createElement("z-chart") as any;
    few.animation = false;
    few.setAttribute("type", "bar");
    few.setAttribute("zoomable", "");
    const se = document.createElement("z-chart-series") as any;
    se.name = "s";
    se.data = twelve.slice(0, 5);
    few.appendChild(se);
    document.body.appendChild(few);
    await wait();
    await wait();
    expect(few.shadowRoot.querySelector(".z-chart__zoom")).toBeNull();
  });

  it("zoom=0.25,0.75 只保留 c3..c8 六个分类", async () => {
    const el = await mount({ zoomable: "", zoom: "0.25,0.75" });
    const labels = axisLabels(el);

    // [变异验证] 不切片时 c0 与 c11 都还在轴上；切片错位（比如按 ceil 取左端）会
    // 变成 c4..c9，两条 toContain 同时红。
    expect(labels).toContain("c3");
    expect(labels).toContain("c8");
    expect(labels).not.toContain("c2");
    expect(labels).not.toContain("c9");
    // 6 个分类 ⇒ 6 个命中区
    expect(ghosts(el)).toHaveLength(6);
  });

  it("点切片后的第一个柱，上报的是原始 dataIndex（3）而不是 0", async () => {
    const el = await mount({ zoomable: "", zoom: "0.25,0.75" });
    let payload: any = null;
    el.addEventListener("z-marker-click", (e: CustomEvent) => {
      payload = e.detail;
    });
    const g = ghosts(el)[0];
    expect(g).toBeTruthy();
    g.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(payload).toBeTruthy();
    // 两条必须同时成立：
    //   value 来自切片后的 model（c3 的值为 40，证明切片对了）
    //   dataIndex 带 offset（证明还原对了）
    //
    // [WHY 不能只断言 dataIndex === 3] 那是**假绿**：不切片时第一个 ghost 就是 c0，
    // 而 offset 恒等于 3，`0 + 3` 恰好也等于 3 —— 切片整条坏掉，这条断言照样绿。
    // 用值做交叉校验才能把两件事分开：不切片时 value 是 10，offset 丢失时 dataIndex 是 0。
    expect(payload.value).toBe(40);
    expect(payload.dataIndex).toBe(3);
  });

  it("非法区间（右端小于左端）回落全量，不画成空图", async () => {
    const el = await mount({ zoomable: "", zoom: "0.9,0.1" });
    expect(ghosts(el)).toHaveLength(12);
  });

  it("没有 zoom 属性时仍是全量", async () => {
    const el = await mount({ zoomable: "" });
    expect(ghosts(el)).toHaveLength(12);
  });

  it("右端手柄的 aria-valuenow 反映当前区间，方向键各减 1%", async () => {
    const el = await mount({ zoomable: "" });
    const read = () =>
      Number(
        el.shadowRoot.querySelector('[data-handle="end"]')?.getAttribute("aria-valuenow") ?? -1,
      );

    expect(read()).toBe(100);
    el.shadowRoot
      .querySelector('[data-handle="end"]')
      .dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true, composed: true }));
    await wait();
    await wait();

    // [变异验证] 若方向键被图表主体的「数据点导航」抢走，区间不会变（仍 100）
    expect(read()).toBe(99);
  });

  it("键盘调过之后焦点仍在同一个手柄上（重绘不能把焦点丢给 body）", async () => {
    const el = await mount({ zoomable: "" });
    const end = el.shadowRoot.querySelector('[data-handle="end"]') as HTMLElement;
    end.focus();
    end.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", shiftKey: true, bubbles: true, composed: true }),
    );
    await wait();
    await wait();

    const active = el.shadowRoot.activeElement;
    // 重绘会重建手柄节点，必须把焦点还回去 —— 否则第二下按键无人接收，
    // 用户会觉得「只能调一次」。
    expect(active?.getAttribute("data-handle")).toBe("end");
  });
});

// ── 数值 / 时间轴缩放（2026-11-17）────────────────────────────────
//
// 分类轴的缩放是「切片」（下标真的变了 → 有 _zoomOffset），数值轴是「收窄值域」
// （数据不动 → dataIndex 不变）。两条路径的失效形态完全不同，所以分开钉。
describe("z-chart 数值轴缩放", () => {
  // 12 个点，x = 0,10,…,110。
  const valued = Array.from({ length: 12 }, (_, i) => ({ x: i * 10, value: (i + 1) * 10 }));

  async function mountValue(attrs: Record<string, string>): Promise<any> {
    const el = document.createElement("z-chart") as any;
    el.animation = false;
    el.setAttribute("type", "line");
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    const ax = document.createElement("z-chart-axis");
    ax.setAttribute("position", "bottom");
    ax.setAttribute("type", "value");
    el.appendChild(ax);
    const se = document.createElement("z-chart-series") as any;
    se.name = "s";
    se.data = valued;
    el.appendChild(se);
    document.body.appendChild(el);
    await wait();
    await wait();
    return el;
  }

  const circles = (el: any): number[] =>
    Array.from(el.shadowRoot.querySelectorAll(".z-chart__svg circle")).map((c: Element) =>
      Number(c.getAttribute("cx")),
    );

  it("全量 12 个点：12 个命中区、12 个圆点", async () => {
    const el = await mountValue({ zoomable: "" });
    expect(ghosts(el)).toHaveLength(12);
    expect(circles(el)).toHaveLength(12);
  });

  it("zoom=0,0.5 只留值域前半段的点（x ≤ 55 共 6 个）", async () => {
    const el = await mountValue({ zoomable: "", zoom: "0,0.5" });
    // [变异验证] 不做域过滤时这里是 12 —— 那正是「只处理分类轴」的原实现。
    expect(ghosts(el)).toHaveLength(6);
    expect(circles(el)).toHaveLength(6);
  });

  it("留下的点铺满画布，而不是挤在左半边", async () => {
    const el = await mountValue({ zoomable: "", zoom: "0,0.5" });
    const cxs = circles(el);
    const spread = Math.max(...cxs) - Math.min(...cxs);

    // 这条钉的是「值域真的收窄了」：只过滤点而不改 domains 时，6 个点仍按
    // [0,110] 的全量域定位，只能覆盖左半张图（spread ≈ 160）。
    // 收窄到 [0,55] 后铺满约 320px。阈值取 260 落在两者之间。
    expect(spread).toBeGreaterThan(260);
  });

  it("dataIndex 保持原值（数值轴不是切片，没有 offset 可补）", async () => {
    const el = await mountValue({ zoomable: "", zoom: "0,0.5" });
    let payload: any = null;
    el.addEventListener("z-marker-click", (e: CustomEvent) => {
      payload = e.detail;
    });
    ghosts(el)[0].dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));

    expect(payload).toBeTruthy();
    // 视野内第一个点仍是原始的第 0 个（x=0），值 10。
    // 若有人把数值轴也写成切片，dataIndex 还是 0 但值会变成别的 —— 用值交叉校验。
    expect(payload.dataIndex).toBe(0);
    expect(payload.value).toBe(10);
  });
});
