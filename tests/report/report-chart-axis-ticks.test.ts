// 类别轴标签抽稀（vendor 补丁 2026-10-23）：标签比槽宽长时必须跳着画，
// 否则 17 个 `2026-10-16` 在 450px 里会全部压在一起。
//
// [为什么测真元素而不是只测 thinCategoryTicks] 单独测那个函数只能证明「步长算得对」，
// 证明不了它被接进 computeFrame、也证明不了抽稀后位置仍然对齐真实分类。
// 后者是个真会犯的错：positionXTicks 原来按**数组下标**排位置，抽稀后第 6 个分类
// 会被画到第 2 个槽位上 —— 图上标签与柱子整体错位，不报错、看着像数据错。
import { afterEach, describe, expect, it } from "vitest";
import "../../src/report/chart/Chart.js";
import "../../src/report/chart/ChartSeries.js";

function makeChart(labels: string[]): HTMLElement {
  const el = document.createElement("z-chart");
  el.setAttribute("type", "bar");
  el.setAttribute("width", "400");
  el.setAttribute("height", "300");
  el.setAttribute("legend", "false");
  (el as unknown as { animation: boolean }).animation = false;
  const s = document.createElement("z-chart-series") as HTMLElement & { data: unknown };
  s.setAttribute("name", "a");
  s.data = labels.map((label, i) => ({ label, value: 10 + i }));
  el.append(s);
  document.body.append(el);
  return el;
}

const wait = () => new Promise((r) => setTimeout(r, 80));

/** 柱子的包围盒（按 x 排序后即分类顺序） */
function bars(el: HTMLElement): { x: number; w: number; bottom: number }[] {
  const svg = el.shadowRoot?.querySelector(".z-chart__svg");
  if (!svg) return [];
  return Array.from(svg.querySelectorAll("rect"))
    .map((r) => ({
      x: Number(r.getAttribute("x")),
      w: Number(r.getAttribute("width")),
      bottom: Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
    }))
    .sort((a, b) => a.x - b.x);
}

/** X 轴刻度文本（在柱子底部之下那一条） */
function xLabels(el: HTMLElement): { text: string; x: number }[] {
  const svg = el.shadowRoot?.querySelector(".z-chart__svg");
  const bs = bars(el);
  if (!svg || bs.length === 0) return [];
  const bottom = Math.max(...bs.map((b) => b.bottom));
  return Array.from(svg.querySelectorAll("text"))
    .filter((t) => Number(t.getAttribute("y")) > bottom + 5)
    .map((t) => ({ text: t.textContent ?? "", x: Number(t.getAttribute("x")) }))
    .sort((a, b) => a.x - b.x);
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("类别轴标签抽稀", () => {
  it("20 个长日期标签：不会 20 个全画（否则必然压字）", async () => {
    const labels = Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const el = makeChart(labels);
    await wait();
    const drawn = xLabels(el);
    expect(drawn.length).toBeGreaterThan(1); // 不能把轴抽成空的
    expect(drawn.length).toBeLessThan(labels.length);
    // 画出来的必须都是真实分类，不能是拼接/截断出来的字符串
    for (const t of drawn) expect(labels).toContain(t.text);
  });

  it("抽稀后标签仍对齐自己的柱子（不能按下标重排）", async () => {
    const labels = Array.from({ length: 20 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const el = makeChart(labels);
    await wait();
    const bs = bars(el);
    expect(bs).toHaveLength(20);
    for (const t of xLabels(el)) {
      // 每个标签的正下方必须是「它自己那个分类」的柱子中心
      const nearest = bs
        .map((b, i) => ({ i, d: Math.abs(b.x + b.w / 2 - t.x) }))
        .sort((a, b) => a.d - b.d)[0];
      expect(labels[nearest.i]).toBe(t.text);
      expect(nearest.d).toBeLessThan(bs[0].w / 2 + 2); // 误差小于半个柱宽
    }
  });

  it("同样 20 个分类，单字符标签一个都不抽（判据是宽度，不是个数）", async () => {
    // 对照组的变量只有标签宽度：分类数仍是 20，槽宽也一样（约 18.4px），
    // 单字符只要 12×0.6=7.2px，加留白 15.2 < 18.4 ⇒ 步长为 1，全部画出来。
    // 若把判据写成「分类数 > N 就抽」，这条会红。
    const labels = "abcdefghijklmnopqrst".split("");
    const el = makeChart(labels);
    await wait();
    expect(xLabels(el).map((t) => t.text)).toEqual(labels);
  });

  it("只有 3 个分类：一个都不能少", async () => {
    const el = makeChart(["甲", "乙", "丙"]);
    await wait();
    expect(xLabels(el).map((t) => t.text)).toEqual(["甲", "乙", "丙"]);
  });
});
