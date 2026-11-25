// 堆积 / 叠加的**端到端**验证：真元素 → Chart 的属性 → BuildContext → 几何 → SVG。
//
// [为什么还要这一层，geometry 测试不是已经覆盖了吗] 那一层直接调 buildGeometry，
// 证明的是「几何算得对」；它绕过了 Chart.ts 里那句 `stack: this.stackMode()`。
// 而真实的失效点恰恰在那里：属性名写错、忘了塞进 ctx、drawKey 没带上导致改了不重绘 ——
// 三者都不报错，画面只是保持并排。jsdom 里 z-chart 能真的画出 shadow SVG（显式给
// width/height 走 resolveSize 的确定分支），所以这一段可以测，不用靠肉眼。
import { afterEach, describe, expect, it } from "vitest";
import "../../src/report/chart/Chart.js";
import "../../src/report/chart/ChartSeries.js";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function makeChart(opts: {
  stack?: string;
  series: { name: string; type?: string; values: number[] }[];
}): HTMLElement {
  const el = document.createElement("z-chart");
  el.setAttribute("type", "bar");
  el.setAttribute("width", "400");
  el.setAttribute("height", "300");
  el.setAttribute("legend", "false");
  // 关掉入场动画：动画期间几何是「部分长成」的中间态，断言会锁在进度上
  // （Boolean 属性按存在性解析，写 animation="false" 反而是开，只能走 property）
  (el as unknown as { animation: boolean }).animation = false;
  if (opts.stack !== undefined) el.setAttribute("stack", opts.stack);
  for (const s of opts.series) {
    const node = document.createElement("z-chart-series") as HTMLElement & { data: unknown };
    node.setAttribute("name", s.name);
    if (s.type) node.setAttribute("type", s.type);
    node.data = s.values.map((v, i) => ({ label: `c${i}`, value: v }));
    el.append(node);
  }
  document.body.append(el);
  return el;
}

const wait = () => new Promise((r) => setTimeout(r, 80));

function boxes(el: HTMLElement): Box[] {
  const svg = el.shadowRoot?.querySelector(".z-chart__svg");
  if (!svg) return [];
  return Array.from(svg.querySelectorAll("rect")).map((r) => ({
    x: Number(r.getAttribute("x")),
    y: Number(r.getAttribute("y")),
    w: Number(r.getAttribute("width")),
    h: Number(r.getAttribute("height")),
  }));
}

const paths = (el: HTMLElement) => el.shadowRoot?.querySelectorAll(".z-chart__svg path") ?? [];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("stack 属性真的驱动了几何", () => {
  it("stacked：两根柱共用一个槽位，第二段接在第一段顶部", async () => {
    const el = makeChart({
      stack: "stacked",
      series: [{ name: "a", values: [10] }, { name: "b", values: [5] }],
    });
    await wait();
    const [first, second] = boxes(el);
    expect(first.x).toBeCloseTo(second.x, 1);
    expect(first.w).toBeCloseTo(second.w, 1);
    expect(second.y + second.h).toBeCloseTo(first.y, 1);
  });

  it("none（缺省）：两根柱横向并排，互不叠加", async () => {
    const el = makeChart({
      series: [{ name: "a", values: [10] }, { name: "b", values: [5] }],
    });
    await wait();
    const [first, second] = boxes(el);
    expect(second.x).toBeGreaterThan(first.x + first.w - 0.01);
    // 并排时第二根也从基线长起：底部对齐
    expect(second.y + second.h).toBeCloseTo(first.y + first.h, 1);
  });

  it("percent：每个分类内两段之和等于整摞高度（30/70 → 3:7）", async () => {
    const el = makeChart({
      stack: "percent",
      series: [{ name: "a", values: [30] }, { name: "b", values: [70] }],
    });
    await wait();
    const [first, second] = boxes(el);
    expect(second.y + second.h).toBeCloseTo(first.y, 1);
    expect(first.h / second.h).toBeCloseTo(3 / 7, 2);
  });

  it("非法 stack 值 → 按并排渲染（渲染层不抛错，也不整张图消失）", async () => {
    const el = makeChart({
      stack: "STRANGE",
      series: [{ name: "a", values: [10] }, { name: "b", values: [5] }],
    });
    await wait();
    const [first, second] = boxes(el);
    expect(second.x).toBeGreaterThan(first.x + first.w - 0.01);
  });

  it("切换 stack 属性会重绘（drawKey 必须带上 stack，否则改了不生效）", async () => {
    const el = makeChart({
      stack: "none",
      series: [{ name: "a", values: [10] }, { name: "b", values: [5] }],
    });
    await wait();
    const before = boxes(el);
    expect(before[1].x).toBeGreaterThan(before[0].x + before[0].w - 0.01); // 并排

    el.setAttribute("stack", "stacked");
    await wait();

    const after = boxes(el);
    expect(after[1].x).toBeCloseTo(after[0].x, 1); // 堆叠
    expect(after[1].y + after[1].h).toBeCloseTo(after[0].y, 1);
  });

  it("只有一根柱子时 percent 不生效（否则整根柱子恒为 100%）", async () => {
    const el = makeChart({ stack: "percent", series: [{ name: "a", values: [42] }] });
    await wait();
    const [only] = boxes(el);
    // 单系列 → 按未堆积处理，值域仍是 0–(42*1.05)，柱子高度占比 1/1.05
    expect(only.h).toBeGreaterThan(0);
    const plain = makeChart({ series: [{ name: "a", values: [42] }] });
    await wait();
    expect(only.h).toBeCloseTo(boxes(plain)[0].h, 1);
  });
});

describe("叠加：per-series type 驱动柱线共存", () => {
  it("第二个系列设 type=line → 出现折线路径", async () => {
    const el = makeChart({
      series: [
        { name: "a", values: [10, 20] },
        { name: "b", type: "line", values: [5, 6] },
      ],
    });
    await wait();
    expect(paths(el).length).toBeGreaterThan(0);
    expect(boxes(el).length).toBe(2); // 两个分类的柱子
  });

  it("两个系列都是 bar → 没有折线路径", async () => {
    const el = makeChart({
      series: [{ name: "a", values: [10, 20] }, { name: "b", values: [5, 6] }],
    });
    await wait();
    expect(paths(el).length).toBe(0);
  });
});
