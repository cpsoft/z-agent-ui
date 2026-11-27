// Test: 新增图表类型（横向柱 / funnel / heatmap / scatter / gauge / treemap / sankey / boxplot）的几何正确性
// Related: [[bug-20261110-chart-kind-gap]]
// Wiki: wiki/planning/TASKS/
// Date: 2026-11-17
//
// [为什么断言硬编码坐标而不是「传了参数不报错」] 这些几何的错误**全部是静默的**：
// 横向没转过去只是柱子竖着画、负值柱长到基线另一侧、漏斗下宽没接上一层、仪表盘
// 指针角度算反 —— 没有一处会抛异常。jsdom 不排版、截图只能靠肉眼，所以只能把
// 纯函数拉出来，对着算出来的像素值断言。
//
// [为什么断言「比例」而不是「绝对像素」] 绝对像素把字号估算（estimateTextWidth）
// 也锁进了测试：哪天字体度量调整，这些测试会一起红，但它们本该关心的是几何关系。
// 比例断言在「方向没转」「比例用错」时照样会红（见每条用例的变异说明）。
import { describe, expect, it } from "vitest";
// @ts-expect-error 纯构建产物，没有 d.ts（只在测试里用）
import { buildGeometry } from "../../../src/report/chart/geometry/build.js";
// @ts-expect-error 同上
import { computeDomains, computeFrame, insetFrame } from "../../../src/report/chart/layout/layout.js";

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

type Mark = {
  kind: string;
  seriesIndex: number;
  dataIndex: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  r?: number;
  d?: string;
  color: string;
  label?: string;
  textAnchor?: string;
  visible: boolean;
};

function baseCtx(extra: Record<string, unknown> = {}) {
  return {
    showGrid: true,
    stack: "none",
    regions: [],
    values: null,
    mapIdKey: "id",
    mapNameKey: "name",
    projection: "none",
    locale: "zh-CN",
    ...extra,
  };
}

function seriesOf(
  index: number,
  values: number[],
  opts: { name?: string; labels?: string[]; kind?: string; x?: number[] } = {},
) {
  return {
    name: opts.name ?? `s${index}`,
    kind: opts.kind ?? "bar",
    color: "#3b82f6",
    yAxis: "left",
    format: "auto",
    visible: true,
    index,
    data: values.map((v, i) => {
      const point: Record<string, unknown> = { value: v };
      if (opts.labels) point.label = opts.labels[i];
      if (opts.x) point.x = opts.x[i];
      return point;
    }),
  };
}

/** 取 d 里的全部数字（含小数与负号）。 */
function nums(d = ""): number[] {
  return (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

function drawCartesian(
  type: string,
  series: ReturnType<typeof seriesOf>[],
  opts: { horizontal?: boolean; xKind?: string; ctx?: Record<string, unknown> } = {},
) {
  const axes = {};
  const domains = computeDomains(series, axes, "none", undefined, {
    horizontal: opts.horizontal,
    xKind: opts.xKind,
  });
  const frame = computeFrame(400, 300, domains, axes, "zh-CN", 12);
  const model = buildGeometry(type, series, frame, domains, theme, 1, baseCtx(opts.ctx));
  return { model, frame, domains };
}

function drawInset(type: string, series: ReturnType<typeof seriesOf>[], ctx: Record<string, unknown> = {}, inset = 10) {
  const frame = insetFrame(400, 320, inset);
  const model = buildGeometry(type, series, frame, null, theme, 1, baseCtx(ctx));
  return { model, frame };
}

describe("箱线图 boxplot", () => {
  it("5 个系列才画，少于 5 个走空态", () => {
    const four = [
      seriesOf(0, [1, 2], { labels: ["c0", "c1"] }),
      seriesOf(1, [3, 4], { labels: ["c0", "c1"] }),
      seriesOf(2, [5, 6], { labels: ["c0", "c1"] }),
      seriesOf(3, [7, 8], { labels: ["c0", "c1"] }),
    ];
    const empty = drawCartesian("boxplot", four);
    expect(empty.model.noData).toBe(true);

    const five = [...four, seriesOf(4, [9, 10], { labels: ["c0", "c1"] })];
    const { model } = drawCartesian("boxplot", five);
    // [变异验证] 若按「猜 3 个系列」实现，four 会画出箱子而这里的第一条断言红
    expect(model.noData).toBe(false);
    expect(model.tooltipTargets).toHaveLength(2);
    for (const t of model.tooltipTargets) expect(t.values).toHaveLength(5);
  });

  it("箱体夹在 Q1..Q3 之间，中位线与须同处一列", () => {
    const series = [
      seriesOf(0, [10, 12], { labels: ["c0", "c1"] }), // min
      seriesOf(1, [20, 22], { labels: ["c0", "c1"] }), // q1
      seriesOf(2, [30, 32], { labels: ["c0", "c1"] }), // med
      seriesOf(3, [40, 42], { labels: ["c0", "c1"] }), // q3
      seriesOf(4, [50, 52], { labels: ["c0", "c1"] }), // max
    ];
    const { model } = drawCartesian("boxplot", series);
    const paths = model.marks.filter((m: Mark) => m.kind === "path") as Mark[];

    // 每个分类 3 条 path：箱体、中位线、须
    expect(paths).toHaveLength(6);
    const box = paths[0];
    const med = paths[1];
    const n = nums(box.d);
    const boxTop = n[1];
    const boxBottom = n[5];
    const medY = nums(med.d)[1];

    expect(boxBottom).toBeGreaterThan(boxTop);
    expect(medY).toBeGreaterThan(boxTop);
    expect(medY).toBeLessThan(boxBottom);
  });
});

// ── 2026-11-17 实测补的两处（页面卡片层接入后才暴露）────────────────

describe("heatmap 轴标签按可用宽度抽稀", () => {
  // 这两条来自真机：8 个时段列挤在半宽卡片里，每列 28px 而「08-10」要 30px+，
  // 渲染出来是「08-1008-102…」连成一条。根因是热力的列刻度在 extra.ts 里直接生成，
  // 不经过 computeFrame 的抽稀路径（笛卡尔轴才有那条）。
  const cols = ["08-10", "10-12", "12-14", "14-16", "16-18", "18-20", "20-22", "22-24"];
  const mk = () => [seriesOf(0, [10, 20, 30, 40, 50, 60, 70, 80], { name: "上午单量", labels: cols })];
  const bottomTicks = (w: number) => {
    const frame = insetFrame(w, 320, 6);
    const m = buildGeometry("heatmap", mk(), frame, null, theme, 1, baseCtx({ labels: true }));
    return m.axes.find((a: { position: string }) => a.position === "bottom").ticks;
  };

  it("宽容器不抽稀：8 列全画", () => {
    expect(bottomTicks(900)).toHaveLength(8);
  });

  it("窄容器跳着画（否则标签连成一串）", () => {
    const ticks = bottomTicks(240);
    // [变异判据] 把 colStep 去掉（fix 成 1）时这里会是 8 —— 正是实测看到的形态。
    expect(ticks.length).toBeLessThan(8);
    expect(ticks.length).toBeGreaterThan(0);
  });
});

describe("treemap 块内文字按块宽做预算", () => {
  it("块放不下完整名字时截断并补省略号，而不是写出块外被 SVG 裁掉", () => {
    // 12 字店名 ≈ 144px；8 块二分切分在 200px 宽的图里最大块也只有 ~100px。
    const labels = Array.from({ length: 8 }, (_, i) => `拱宸桥直营旗舰店第${i}号`);
    const series = [seriesOf(0, [8200, 7600, 7100, 6500, 5900, 5300, 4800, 4300], { labels })];
    const frame = insetFrame(200, 320, 6);
    const model = buildGeometry("treemap", series, frame, null, theme, 1, baseCtx({}));
    const texts = model.marks.filter((m: Mark) => m.kind === "text" && m.seriesIndex === 0);
    // 名字行（字号 12）与数值行（字号 10）分开看：数值行的正确行为是
    // 「完整 → 只留数值 → 不写」三档降级，它本来就不该出现省略号。
    const nameTexts = texts.filter((t: Mark & { fontSize?: number }) => t.fontSize !== 10);

    expect(nameTexts.length).toBeGreaterThan(0);
    // [变异判据] 去掉 fitLabel（恢复成原样输出 String(p.label)）时这条红。
    for (const t of nameTexts) {
      expect(t.label.endsWith("…")).toBe(true);
      expect(t.label.includes("旗舰店第")).toBe(false);
    }
  });
});

// ── 命中区外扩量（2026-11-17 真实密度实测）────────────────────────
//
// 缺省 4px 外扩是为小圆点设计的。柱图密集后它变成错的：534 根柱在 280px 高里
// 槽距 0.52px、柱厚 0.42px，外扩 4px 后每根命中区 8.4px ⇒ 覆盖相邻 16 根的中心，
// 指针落在哪儿都只命中最后绘制的那几根。真机表现是「tooltip 的店名跟鼠标下的柱子
// 无关」—— 不报错、不缺口，只有点得出来。
describe("命中区外扩量不越过邻柱中心", () => {
  const many = (n: number) =>
    [seriesOf(0, Array.from({ length: n }, (_, i) => 8200 - i * 11), {
      labels: Array.from({ length: n }, (_, i) => `拱宸桥直营旗舰店第${i}号`),
    })];

  const padOf = (n: number, horizontal = true) => {
    const { model } = drawCartesian("bar", many(n), { horizontal });
    const t = model.tooltipTargets[0] as { pad?: number };
    return t.pad ?? 4;
  };

  it("6 根柱照旧用缺省 4px（柱宽够，外扩是为了好点）", () => {
    expect(padOf(6)).toBe(4);
  });

  it("534 根柱外扩收窄到不足 0.1px", () => {
    // 槽距 = plot.height / 534 ≈ 0.52，柱厚 = 0.52 * 0.8 ≈ 0.42 ⇒ 空隙 0.1，一半 0.05。
    // [变异判据] 去掉 hitPad（回退成全局 4）时这里会是 4。
    expect(padOf(534)).toBeLessThan(0.1);
  });

  it("竖向也一样（柱宽 0.73px 时不能沿用 4px）", () => {
    expect(padOf(534, false)).toBeLessThan(0.1);
  });

  it("外扩后仍不跨到自己那一格之外", () => {
    const n = 534;
    const { model, frame } = drawCartesian("bar", many(n), { horizontal: true });
    const step = frame.plot.height / n;
    const t = model.tooltipTargets[0] as { y: number; h: number; pad?: number };
    const pad = t.pad ?? 4;
    // 命中区上边界不得越过上一根柱的中心线（这里是第一根，检查下边界即可代表同一件事）
    expect(t.y + t.h + pad).toBeLessThan(t.y + step + 0.01);
  });
});

// ── 气泡第三维（2026-11-17）────────────────────────────────────
describe("scatter 的第三维：半径", () => {
  const bubbles = (rs: Array<number | undefined>) => {
    const s = seriesOf(0, rs.map((_, i) => 100 - i * 10), {
      labels: rs.map((_, i) => `p${i}`),
      // kind 必须显式给 scatter：seriesOf 默认 bar，几何会走柱图分支，
      // circle 数为 0 —— 那是「测试自己的前提没建好」，不是被测逻辑错。
      kind: "scatter",
      x: rs.map((_, i) => i * 10),
    });
    // seriesOf 只产 {label, value}；r 手动挂上去（等价于 normalize 保留 rec.r 的结果）
    if (s.data) rs.forEach((r, i) => { if (r !== undefined && s.data[i]) s.data[i].r = r; });
    const { model } = drawCartesian("scatter", [s], { xKind: "value" });
    return model.marks.filter((m: Mark) => m.kind === "circle") as Mark[];
  };

  it("没有 r 时半径固定 4（存量散点一字不变）", () => {
    const cs = bubbles([undefined, undefined, undefined]);
    expect(cs.map((c) => c.r)).toEqual([4, 4, 4]);
  });

  it("有 r 时大小随 r 变", () => {
    const cs = bubbles([10, 50, 100]);
    expect(cs[0].r!).toBeLessThan(cs[2].r!);
    expect(cs[1].r!).toBeGreaterThan(cs[0].r!);
  });

  it("半径按**面积**映射：中间档落在 11.5 而不是线性的 10", () => {
    // [WHY 用三点而不是两点] 两点时最小值必然映射到 R_MIN、最大值到 R_MAX，
    // 中间没有任何自由度可测（早先写成「4 倍 → 2 倍」时算出来是 18000，因为分母是 0）。
    //
    // 手算：t = (√200 − √100) / (√400 − √100) = 4.142 / 10 = 0.4142
    //       半径 = 4 + 0.4142 × (22 − 4) = 11.46
    // 若改成线性插值，t = (200−100)/(400−100) = 0.333 ⇒ 半径 10.0。
    // 差值 1.46px，阈值卡在 10.8 把两者分开。
    const cs = bubbles([100, 200, 400]);
    expect(cs[1].r!).toBeCloseTo(11.46, 1);
    expect(cs[1].r!).toBeGreaterThan(10.8);
  });

  it("第三维的名字进 tooltip（否则读者只能猜大小代表什么）", () => {
    const s = seriesOf(0, [10, 20], {
      labels: ["a", "b"],
      kind: "scatter",
      x: [0, 10],
    });
    s.data![0].r = 5;
    s.data![1].r = 9;
    (s as { sizeTitle?: string }).sizeTitle = "订单量";
    const { model } = drawCartesian("scatter", [s], { xKind: "value" });
    const t = model.tooltipTargets[0] as { values: Array<{ name: string; value: number }> };
    const hit = t.values.find((v) => v.name === "订单量");
    expect(hit).toBeTruthy();
    expect(hit!.value).toBe(5);
  });
});

// ── 饼图多环（2026-11-17）────────────────────────────────────
describe("pie / donut 多环", () => {
  const ring = (index: number, values: number[], labels: string[], name: string) =>
    seriesOf(index, values, { labels, kind: "pie", name });

  const draw = (series: ReturnType<typeof seriesOf>[], type = "donut") => {
    const frame = insetFrame(400, 320, 8);
    return buildGeometry(type, series, frame, null, theme, 1, baseCtx({}));
  };

  it("两个系列 = 两环，扇区数相加", () => {
    const m = draw([
      ring(0, [60, 40], ["茶饮", "烘焙"], "品类"),
      ring(1, [30, 30, 20, 20], ["奶茶", "果茶", "面包", "蛋糕"], "细分"),
    ]);
    const paths = m.marks.filter((x: Mark) => x.kind === "path");
    // [变异判据] 只画 series[0]（旧实现）时这里是 2
    expect(paths).toHaveLength(6);
  });

  it("内环的扇区在几何上更靠近圆心", () => {
    const m = draw([
      ring(0, [60, 40], ["茶饮", "烘焙"], "品类"),
      ring(1, [30, 30, 20, 20], ["奶茶", "果茶", "面包", "蛋糕"], "细分"),
    ]);
    const paths = m.marks.filter((x: Mark) => x.kind === "path") as Mark[];
    // arcPath 的 d 里第一个坐标是外弧起点：内环系列的 path 全在 seriesIndex=0
    const innerMax = Math.max(...paths.filter((p) => p.seriesIndex === 0).map((p) => maxAbs(p.d!)));
    const outerMax = Math.max(...paths.filter((p) => p.seriesIndex === 1).map((p) => maxAbs(p.d!)));
    // 内环外径 = R/2，外环外径 = R ⇒ 坐标绝对值（相对画布原点）必然更大
    expect(innerMax).toBeLessThan(outerMax);
  });

  it("图例带环名前缀，否则两环同名扇区分不清", () => {
    const m = draw([
      ring(0, [60, 40], ["茶饮", "烘焙"], "品类"),
      ring(1, [30, 70], ["茶饮", "烘焙"], "细分"),
    ]);
    const names = m.legend.map((l) => l.name);
    expect(names).toContain("品类 · 茶饮");
    expect(names).toContain("细分 · 茶饮");
  });

  it("内外环不共用同一套颜色（外环从内环之后取色）", () => {
    const m = draw([
      ring(0, [60, 40], ["A", "B"], "品类"),
      ring(1, [30, 70], ["A", "B"], "细分"),
    ]);
    const paths = m.marks.filter((x: Mark) => x.kind === "path") as Mark[];
    const inner0 = paths.filter((p) => p.seriesIndex === 0).map((p) => p.color);
    const outer0 = paths.filter((p) => p.seriesIndex === 1).map((p) => p.color);
    // [变异判据] 去掉 colorCursor（每环都从 CATEGORICAL[0] 取）时两者相同 ——
    // 那会让「细分·A」与「品类·A」同色，读者误以为它们相等。
    expect(inner0[0]).not.toBe(outer0[0]);
  });

  it("单系列仍然是单环，且 donut 中心写总计", () => {
    const m = draw([ring(0, [60, 40], ["A", "B"], "销售额")]);
    expect(m.marks.filter((x: Mark) => x.kind === "path")).toHaveLength(2);
    const texts = m.marks.filter((x: Mark) => x.kind === "text") as Mark[];
    expect(texts).toHaveLength(1);
    expect(texts[0].label).toBe("100");
  });
});

/** d 字符串里所有数字的最大绝对值（半径参数也含在内，够用来比较两个环的大小）。 */
function maxAbs(d: string): number {
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  return nums.length ? Math.max(...nums.map(Math.abs)) : 0;
}
