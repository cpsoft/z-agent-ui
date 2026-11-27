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

// ── 横向柱图 ─────────────────────────────────────────────────────

describe("横向柱图 direction=horizontal", () => {
  it("柱厚（height）对每个分类恒定，且等于分类槽宽 × 0.8", () => {
    const s = [seriesOf(0, [10, 20, 30], { labels: ["c0", "c1", "c2"] })];
    const { model, frame } = drawCartesian("bar", s, { horizontal: true });
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];

    expect(rects).toHaveLength(3);
    const slot = (frame.plot.height / 3) * 0.8;
    // [变异验证] 若 direction 未被几何层接收（isH 恒 false），这三个 height 会等于
    // 各自的柱长（10/20/30 比例），第一条断言立刻红。
    for (const r of rects) expect(r.height!).toBeCloseTo(slot, 1);
  });

  it("分类沿 y 轴按等间距排布", () => {
    const s = [seriesOf(0, [10, 20, 30], { labels: ["c0", "c1", "c2"] })];
    const { model, frame } = drawCartesian("bar", s, { horizontal: true });
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];
    const step = frame.plot.height / 3;

    expect(rects[1].y! - rects[0].y!).toBeCloseTo(step, 1);
    expect(rects[2].y! - rects[1].y!).toBeCloseTo(step, 1);
  });

  it("柱长（width）与值成正比，且都从值 0 的位置起画", () => {
    const s = [seriesOf(0, [10, 20, 30], { labels: ["c0", "c1", "c2"] })];
    const { model, frame } = drawCartesian("bar", s, { horizontal: true });
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];

    // [变异验证] 这是「横向」的核心：width 承载值。竖向实现下 width 恒为槽宽（三者相等），
    // 比例断言会红。
    expect(rects[1].width! / rects[0].width!).toBeCloseTo(2, 2);
    expect(rects[2].width! / rects[0].width!).toBeCloseTo(3, 2);
    // 值域从 0 起（min >= 0 时 yDomain 是 [0, max*1.05]），所以柱子左端都贴在 plot 左边
    for (const r of rects) expect(r.x!).toBeCloseTo(frame.plot.x, 1);
  });

  it("负值柱从基线向左长，不越过基线", () => {
    const s = [seriesOf(0, [-10, 20], { labels: ["neg", "pos"] })];
    const { model, frame, domains } = drawCartesian("bar", s, { horizontal: true });
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];
    // 基线位置由值域算（含 5% 内边距），不假设某个具体 domain
    const [d0, d1] = domains.leftDomain;
    const baseX = frame.plot.x + ((0 - d0) / (d1 - d0)) * frame.plot.width;

    const neg = rects[0];
    const pos = rects[1];
    // [变异验证] 基线方向写反（负柱向右长）时 neg.x 会等于 baseX 而不是它的左侧
    expect(neg.x!).toBeLessThan(baseX - 1);
    expect(neg.x! + neg.width!).toBeCloseTo(baseX, 0);
    expect(pos.x!).toBeCloseTo(baseX, 0);
  });

  it("labels 标注移到柱右端（左对齐），不再压在柱顶", () => {
    const s = [seriesOf(0, [10, 20], { labels: ["a", "b"] })];
    const { model } = drawCartesian("bar", s, { horizontal: true, ctx: { labels: true } });
    const texts = model.marks.filter((m: Mark) => m.kind === "text" && m.seriesIndex === 0) as Mark[];

    expect(texts).toHaveLength(2);
    // [变异验证] 沿用竖向标注时 textAnchor 是 middle、cy 在柱顶上方 —— 两条都会红
    for (const t of texts) expect(t.textAnchor).toBe("start");
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];
    expect(texts[0].cx!).toBeGreaterThan(rects[0].x! + rects[0].width! - 1);
  });

  it("标记线与柱子一起转为竖线", () => {
    const s = [seriesOf(0, [10, 20], { labels: ["a", "b"] })];
    const { model } = drawCartesian("bar", s, { horizontal: true, ctx: { markline: 15 } });
    const ref = model.marks.find(
      (m: Mark) => m.kind === "path" && m.seriesIndex === -1 && String(m.d).includes(" L "),
    ) as Mark | undefined;

    expect(ref).toBeDefined();
    const [x1, y1, x2, y2] = nums(ref!.d);
    // [变异验证] 参考线没跟着转时是横线（y1 === y2），这里断言的是 x1 === x2
    expect(x1).toBeCloseTo(x2, 2);
    expect(y1).not.toBeCloseTo(y2, 2);
  });

  it("横向可与堆积共存（不互斥）", () => {
    const series = [
      seriesOf(0, [10, 20], { labels: ["c0", "c1"] }),
      seriesOf(1, [5, 8], { labels: ["c0", "c1"] }),
    ];
    const axes = {};
    const domains = computeDomains(series, axes, "stacked", undefined, { horizontal: true });
    const frame = computeFrame(400, 300, domains, axes, "zh-CN", 12);
    const model = buildGeometry("bar", series, frame, domains, theme, 1, baseCtx({ stack: "stacked" }));
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];

    // 堆积时同一分类共用一根柱的位置：横向下「同一根柱」意味着 **y 相同**（同一行），
    // 而 x 是累积方向上的偏移。比 x 相等会写成「并排」的断言 —— 那是另一回事。
    const a = rects.find((r: Mark) => r.seriesIndex === 0 && r.dataIndex === 0)!;
    const b = rects.find((r: Mark) => r.seriesIndex === 1 && r.dataIndex === 0)!;
    expect(a.y).toBeCloseTo(b.y!, 1);
    expect(a.height!).toBeCloseTo(b.height!, 1);
    // 第二段接着第一段的末端，中间没有缝
    expect(a.x! + a.width!).toBeCloseTo(b.x!, 1);
  });

  it("非分类轴时回落竖向（不画成 n 根等长横条）", () => {
    const s = [seriesOf(0, [10, 20], { kind: "bar", x: [1, 2] })];
    const { domains } = drawCartesian("bar", s, { horizontal: true });
    // 没有 label ⇒ 强制 value 轴，横向语义不成立，layout 层回落
    expect(domains.xKind).toBe("value");
    expect(domains.horizontal).toBe(false);
  });
});

// ── scatter ─────────────────────────────────────────────────────

describe("散点图 scatter", () => {
  it("xKind 被强制为 value，即使点上带 label", () => {
    const s = [seriesOf(0, [10, 20], { kind: "scatter", labels: ["a", "b"], x: [1, 2] })];
    const { domains } = drawCartesian("scatter", s, { xKind: "value" });
    // [变异验证] 去掉 opts.xKind，computeDomains 会因为「有 label」判成 category，这里红
    expect(domains.xKind).toBe("value");
  });

  it("每个点一个圆，半径固定，命中区按点取", () => {
    const s = [seriesOf(0, [10, 20, 30], { kind: "scatter", x: [1, 2, 3] })];
    const { model } = drawCartesian("scatter", s, { xKind: "value" });
    const circles = model.marks.filter((m: Mark) => m.kind === "circle") as Mark[];

    expect(circles).toHaveLength(3);
    for (const c of circles) expect(c.r).toBe(4);
    expect(model.tooltipTargets).toHaveLength(3);
    // x 递增 ⇒ 圆点 x 严格递增（若判成分类轴，三点等距但 y 相同，看不出问题；
    // 这里用「x 间距与数值差成正比」兜住）
    expect(circles[1].cx! - circles[0].cx!).toBeCloseTo(circles[2].cx! - circles[1].cx!, 1);
  });
});

// ── funnel ──────────────────────────────────────────────────────

describe("漏斗图 funnel", () => {
  it("每层一个梯形，上宽与值成比例", () => {
    const s = [seriesOf(0, [100, 50, 25], { labels: ["曝光", "点击", "下单"] })];
    const { model } = drawInset("funnel", s);
    const paths = model.marks.filter((m: Mark) => m.kind === "path") as Mark[];

    expect(paths).toHaveLength(3);
    const widthOf = (p: Mark) => {
      const n = nums(p.d);
      return n[2] - n[0];
    };
    const w0 = widthOf(paths[0]);
    const w1 = widthOf(paths[1]);
    const w2 = widthOf(paths[2]);

    // [变异验证] 若宽度没按值归一（全部等宽），这三个比例都会是 1
    expect(w1 / w0).toBeCloseTo(0.5, 1);
    expect(w2 / w0).toBeCloseTo(0.25, 1);
  });

  it("最后一层下宽收到自己上宽（矩形收口，不是继续收窄）", () => {
    const s = [seriesOf(0, [100, 50], { labels: ["a", "b"] })];
    const { model } = drawInset("funnel", s);
    const paths = model.marks.filter((m: Mark) => m.kind === "path") as Mark[];
    const n = nums(paths[1].d);
    const wTop = n[2] - n[0];
    const wBottom = n[4] - n[6];

    expect(wBottom).toBeCloseTo(wTop, 1);
  });

  it("阶段名与数值都画在图外，命中区数量等于层数", () => {
    const s = [seriesOf(0, [100, 50], { labels: ["a", "b"] })];
    const { model, frame } = drawInset("funnel", s);
    expect(model.tooltipTargets).toHaveLength(2);
    for (const t of model.tooltipTargets) {
      expect(t.y).toBeGreaterThanOrEqual(frame.plot.y - 0.5);
      expect(t.values).toHaveLength(2);
    }
  });
});

// ── heatmap ─────────────────────────────────────────────────────

describe("热力图 heatmap", () => {
  it("格子数 = 行数 × 列数，缺格不画", () => {
    const series = [
      seriesOf(0, [1, 2, 3], { name: "杭州", labels: ["周一", "周二", "周三"] }),
      seriesOf(1, [4, 5], { name: "上海", labels: ["周一", "周二"] }),
    ];
    const { model } = drawInset("heatmap", series);
    // seriesIndex >= 0 才是数据格；-1 是色阶图例的装饰块（见 extra.ts 的注释）
    const cells = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex >= 0) as Mark[];

    // 2 行 × 3 列 = 6 个坐标，上海缺周三 ⇒ 5 个格子
    expect(cells).toHaveLength(5);
    expect(model.axes).toHaveLength(2);
  });

  it("颜色按值分档：最大值与最小值不同色", () => {
    const series = [
      seriesOf(0, [1, 100], { name: "r0", labels: ["c0", "c1"] }),
    ];
    const { model } = drawInset("heatmap", series);
    const cells = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex >= 0) as Mark[];

    // [变异验证] 若颜色没接量化器（全用同一色），这里红
    expect(cells[0].color).not.toBe(cells[1].color);
  });

  it("色阶图例 7 段等宽，两端标出值域端点", () => {
    const series = [seriesOf(0, [10, 900], { name: "r0", labels: ["c0", "c1"] })];
    const { model } = drawInset("heatmap", series);
    const segs = model.marks.filter((m: Mark) => m.kind === "rect" && m.seriesIndex < 0) as Mark[];

    expect(segs).toHaveLength(7);
    const w0 = segs[0].width!;
    for (const s of segs) expect(s.width!).toBeCloseTo(w0, 1);
    // 递增排布（左低右高）
    for (let i = 1; i < segs.length; i++) expect(segs[i].x!).toBeGreaterThan(segs[i - 1].x!);

    const labels = model.marks
      .filter((m: Mark) => m.kind === "text" && m.seriesIndex < 0)
      .map((m: Mark) => m.label);
    // [变异验证] 端点若写成「桶边界」或干脆没写，这两条红
    expect(labels).toContain("10");
    expect(labels).toContain("900");
  });

  it("格内数值按格子底色选前景色（浅底深字 / 深底白字，两个主题共四条断言）", () => {
    const series = [seriesOf(0, [1, 900], { name: "r0", labels: ["c0", "c1"] })];
    const frame = insetFrame(400, 320, 10);
    const run = (dark: boolean) =>
      buildGeometry("heatmap", series, frame, null, { ...theme, dark }, 1, baseCtx({ labels: true }));

    const textAt = (model: { marks: Mark[] }, i: number) =>
      model.marks.find((m: Mark) => m.kind === "text" && m.seriesIndex === 0 && m.dataIndex === i)!.color;

    // 浅色主题用 SEQUENTIAL_LIGHT（浅→深）：低值落在最浅底 #eff6ff ⇒ 深字；高值落在最深底 ⇒ 白字。
    // 深色主题用 SEQUENTIAL_DARK（深→浅）：同一个低值落在最深底 ⇒ 白字；高值落在最浅底 ⇒ 深字。
    //
    // [变异验证] 四个期望值方向两两相反，任何「按主题判」「按档位序号判」「写死一种色」
    // 的退化都会让其中至少两条红。本文件真踩过 `theme.dark ? idx >= 3 : idx >= 3` 这个
    // 两边相同的写法 —— 那次四条里红了两条。
    expect(textAt(run(false), 0)).toBe("#0f172a");
    expect(textAt(run(false), 1)).toBe("#ffffff");
    expect(textAt(run(true), 0)).toBe("#ffffff");
    expect(textAt(run(true), 1)).toBe("#0f172a");
  });

  it("行标签进左轴、列标签进底轴", () => {
    const series = [seriesOf(0, [1, 2], { name: "杭州", labels: ["周一", "周二"] })];
    const { model } = drawInset("heatmap", series);
    const bottom = model.axes.find((a: { position: string }) => a.position === "bottom")!;
    const left = model.axes.find((a: { position: string }) => a.position === "left")!;

    expect(bottom.ticks.map((t: { label: string }) => t.label)).toEqual(["周一", "周二"]);
    expect(left.ticks.map((t: { label: string }) => t.label)).toEqual(["杭州"]);
  });
});

// ── gauge ───────────────────────────────────────────────────────

describe("仪表盘 gauge", () => {
  it("值弧终点落在上半圆，且 50% 时正对上方", () => {
    const s = [seriesOf(0, [50], { labels: ["达成率"] })];
    const { model } = drawInset("gauge", s, { gaugeMin: 0, gaugeMax: 100 }, 12);
    const paths = model.marks.filter((m: Mark) => m.kind === "path") as Mark[];
    // paths[0] = 底环（π → 2π），paths[1] = 值弧
    //
    // [WHY 从底环反推圆心与半径而不是照抄实现里的公式] `M x0 y0 A r r 0 large sweep x1 y1`
    // 里已经含有 x0/y0/r/x1，用它们算出的圆心与半径是**图形自洽性**的判据；照抄
    // `cy = plot.y + plot.height * 0.66` 会让「公式改了但图画歪了」这类错漏过去。
    const base = nums(paths[0].d);
    const x0 = base[0];
    const y0 = base[1];
    const r = base[2];
    const x1 = base[base.length - 2];
    const cx = (x0 + x1) / 2;
    const cy = y0;

    const arc = nums(paths[1].d);
    const endX = arc[arc.length - 2];
    const endY = arc[arc.length - 1];
    // [变异验证] 角度算反（走下半圆 / sweep 反了）时 endY 会 > cy，这里红
    expect(endX).toBeCloseTo(cx, 0);
    expect(endY).toBeCloseTo(cy - r, 0);
  });

  it("缺少可用点时退化为空态而不是画一条满弧", () => {
    const s = [{ ...seriesOf(0, []), data: [] }];
    const { model } = drawInset("gauge", s, { gaugeMin: 0, gaugeMax: 100 }, 12);
    expect(model.noData).toBe(true);
    expect(model.marks).toHaveLength(0);
  });
});

// ── treemap ─────────────────────────────────────────────────────

describe("矩形树 treemap", () => {
  it("块面积占满画布，最大块落在左上角", () => {
    const s = [seriesOf(0, [50, 30, 20], { labels: ["A", "B", "C"] })];
    const { model, frame } = drawInset("treemap", s);
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];

    expect(rects).toHaveLength(3);
    const area = (r: Mark) => r.width! * r.height!;
    const sorted = [...rects].sort((a, b) => area(b) - area(a));
    expect(area(sorted[0])).toBeGreaterThan(area(sorted[1]));

    // 排序后最大块由 splitTreemap 先落位 ⇒ 它的左上角最靠 plot 原点
    expect(sorted[0].x!).toBeCloseTo(frame.plot.x + 1.5, 0);
    expect(sorted[0].y!).toBeCloseTo(frame.plot.y + 1.5, 0);

    // 面积和有内缩损耗（每块 3px），但不应少于一成
    const sum = rects.reduce((acc: number, r: Mark) => acc + area(r), 0);
    const total = frame.plot.width * frame.plot.height;
    expect(sum).toBeGreaterThan(total * 0.75);
  });
});

// ── sankey ──────────────────────────────────────────────────────

describe("桑基图 sankey", () => {
  it("按箭头拆出节点与流带", () => {
    const s = [seriesOf(0, [60, 40, 30], { labels: ["门店A→外卖", "门店A→堂食", "门店B→外卖"] })];
    const { model } = drawInset("sankey", s);
    // 来源去重 = 2（门店A/门店B），去向去重 = 2（外卖/堂食）⇒ 4 个节点矩形
    const rects = model.marks.filter((m: Mark) => m.kind === "rect") as Mark[];
    const bands = model.marks.filter((m: Mark) => m.kind === "path") as Mark[];

    expect(rects).toHaveLength(4);
    expect(bands).toHaveLength(3);
    expect(model.tooltipTargets).toHaveLength(3);
  });

  it("标签没有分隔符时不画流带（不猜一对节点）", () => {
    const s = [seriesOf(0, [60], { labels: ["门店A"] })];
    const { model } = drawInset("sankey", s);
    expect(model.noData).toBe(true);
  });
});

// ── boxplot ─────────────────────────────────────────────────────
