// 柱形组合参数的**几何级**验证（M10）。
//
// [为什么直接打 vendor 的 dist 产物，而不是只测我们自己的纯函数]
// stack 的语义全部落在坐标上：「第二段柱子从第一段的顶开始画」「百分比堆积每类的
// 两段高度加起来正好占满绘图区」「负值往基线下方长」。这些都不是「传了参数没报错」
// 能证明的 —— 恰恰是报错与否看不出差别的那类改动（props 被静默丢弃时，界面只是
// 变回并排，不抛任何错）。而 jsdom 不排版、截图又只能靠肉眼，所以只能把几何函数
// 单独拉出来，对着**硬编码的坐标断言**跑。
//
// 打 dist 而不是 src：src 是 TS 且带 .js 后缀的相对导入，vitest 能过但 tsc 不能；
// 而 dist 正是运行时真正加载的那份 —— 断言它才有意义（改 src 忘了 build 时，这里会红）。
import { describe, expect, it } from "vitest";
// @ts-expect-error 纯构建产物，没有 d.ts（只在测试里用；若哪天 vendor 补了声明，
// 这条指令会报「unused」——正好提醒把它去掉）
import { buildGeometry } from "../../src/report/chart/geometry/build.js";
// @ts-expect-error 同上
import { computeDomains, computeFrame } from "../../src/report/chart/layout/layout.js";

const theme = {
  text: "#000",
  textSecondary: "#666",
  grid: "#eee",
  bg: "#fff",
  dark: false,
  fontFamily: "sans-serif",
  labelFontSize: "12px",
  titleFontSize: "16px",
};

function seriesOf(index: number, values: number[], kind = "bar") {
  return {
    name: `s${index}`,
    kind,
    color: "#3b82f6",
    yAxis: "left",
    format: "auto",
    visible: true,
    index,
    data: values.map((v, i) => ({ label: `c${i}`, value: v })),
  };
}

function draw(stack: string, rows: number[][], kind = "bar") {
  const series = rows.map((v, i) => seriesOf(i, v, kind));
  const axes = {};
  const domains = computeDomains(series, axes, stack);
  const frame = computeFrame(400, 300, domains, axes, "zh-CN", 12);
  const model = buildGeometry("bar", series, frame, domains, theme, 1, {
    showGrid: true,
    stack,
    regions: [],
    values: null,
    mapIdKey: "id",
    mapNameKey: "name",
    projection: "none",
    locale: "zh-CN",
  });
  const rects = model.marks.filter((m: { kind: string }) => m.kind === "rect");
  const at = (seriesIndex: number, dataIndex: number) =>
    rects.find((r: { seriesIndex: number; dataIndex: number }) => r.seriesIndex === seriesIndex && r.dataIndex === dataIndex);
  return { model, domains, frame, rects, at };
}

describe("并排（stack=none）行为不变", () => {
  it("两个系列在同一个分类上横向错开，宽度相同", () => {
    const { at } = draw("none", [[10, 20], [5, 5]]);
    const a = at(0, 0);
    const b = at(1, 0);
    expect(a.width).toBeCloseTo(b.width, 5);
    expect(b.x).toBeGreaterThan(a.x);
  });

  it("值域按单系列最大值定（不被累加）", () => {
    const { domains } = draw("none", [[10, 20], [5, 5]]);
    // 20 * 1.05 = 21；若误按堆积算会是 (20+5)*1.05
    expect(domains.leftDomain[0]).toBe(0);
    expect(domains.leftDomain[1]).toBeCloseTo(21, 5);
  });
});

describe("堆积（stack=stacked）", () => {
  it("第二段从第一段的顶端接着画（不是从 0 重画）", () => {
    const { at } = draw("stacked", [[10, 20], [5, 5]]);
    const first = at(0, 0);
    const second = at(1, 0);
    expect(second.y + second.height).toBeCloseTo(first.y, 4);
  });

  it("两段同一分类共用一个槽位（横坐标相同，不再左右并排）", () => {
    const { at } = draw("stacked", [[10, 20], [5, 5]]);
    expect(at(1, 0).x).toBeCloseTo(at(0, 0).x, 4);
    expect(at(1, 0).width).toBeCloseTo(at(0, 0).width, 4);
  });

  it("值域按「每类合计」定：max(10+5, 20+5)=25 → 26.25", () => {
    const { domains } = draw("stacked", [[10, 20], [5, 5]]);
    expect(domains.leftDomain[1]).toBeCloseTo(26.25, 4);
  });

  it("负值往基线下方长（正负分开累积，不是代数和）", () => {
    const { at, frame, domains } = draw("stacked", [[10], [-5]]);
    const pos = at(0, 0);
    const neg = at(1, 0);
    // 基线 = 值 0 在绘图区里的 y（值域跨零，所以不是绘图区底边）
    const [d0, d1] = domains.leftDomain;
    const base = frame.plot.y + frame.plot.height - ((0 - d0) / (d1 - d0)) * frame.plot.height;
    expect(pos.y + pos.height).toBeCloseTo(base, 4);
    expect(neg.y).toBeCloseTo(base, 4);
    expect(neg.height).toBeGreaterThan(0);
    // 代数和的话第二根会画在 10 之上、且只有 5 高；分开累积则是往下的 -5
    expect(neg.y).toBeGreaterThan(pos.y);
  });
});

describe("百分比堆积（stack=percent）", () => {
  it("每个分类内两段高度加起来正好占满绘图区", () => {
    const { at, frame } = draw("percent", [[30, 70], [70, 30]]);
    for (const i of [0, 1]) {
      const h0 = at(0, i).height;
      const h1 = at(1, i).height;
      expect(h0 + h1).toBeCloseTo(frame.plot.height, 3);
    }
  });

  it("值域恰好 [0,100]（不加 5% 内边距，整摞才填满高度）", () => {
    const { domains } = draw("percent", [[30, 70], [70, 30]]);
    expect(domains.leftDomain[0]).toBe(0);
    expect(domains.leftDomain[1]).toBe(100);
  });

  it("份额图：30/70 的高度比就是 3:7", () => {
    const { at } = draw("percent", [[30, 70], [70, 30]]);
    const h0 = at(0, 0).height;
    const h1 = at(1, 0).height;
    expect(h0 / h1).toBeCloseTo(3 / 7, 3);
  });
});

describe("单系列保护", () => {
  it("只有一根柱子时堆积退化成并排（percent 否则会变成 100% 的等高条）", () => {
    const stacked = draw("percent", [[30, 70]]);
    const plain = draw("none", [[30, 70]]);
    expect(stacked.at(0, 0).height).toBeCloseTo(plain.at(0, 0).height, 4);
    expect(stacked.domains.leftDomain[1]).toBeCloseTo(plain.domains.leftDomain[1], 4);
  });
});

describe("叠加：柱图里混入折线系列（vendor 原本就支持 per-series type）", () => {
  it("bar 系列画矩形、line 系列画路径，两者共存", () => {
    const series = [seriesOf(0, [10, 20], "bar"), seriesOf(1, [5, 6], "line")];
    const axes = {};
    const domains = computeDomains(series, axes, "none");
    const frame = computeFrame(400, 300, domains, axes, "zh-CN", 12);
    const model = buildGeometry("bar", series, frame, domains, theme, 1, {
      showGrid: true,
      stack: "none",
      regions: [],
      values: null,
      mapIdKey: "id",
      mapNameKey: "name",
      projection: "none",
      locale: "zh-CN",
    });
    const kinds = new Set(model.marks.map((m: { kind: string }) => m.kind));
    expect(kinds.has("rect")).toBe(true);
    expect(kinds.has("path")).toBe(true);
    // 折线系列不参与「并排槽位」计算：它的数据点仍然落在分类中心附近
    expect(model.tooltipTargets.length).toBe(4);
  });
});
