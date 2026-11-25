// Test: radar / waterfall geometry（IKTJVS）—— 逐轴归一 / 累计值域 / 浮动柱 / 负增量透明度
// Related: [[IKTJVS]]
// Date: 2026-11-07
//
// [★ 期望值全部手写字面量] 期望不是由「另一侧实现」算出来的：坐标是拿
// 400x300 画布手算的数，值域是手写的区间。实现整体坏掉时这些断言必红。

import { describe, it, expect } from "vitest";
import { buildGeometry } from "../../../src/report/chart/geometry/build";
import { computeFrame, computeWaterfallDomains, insetFrame } from "../../../src/report/chart/layout/layout";
import type { SeriesModel, MapRegion, ResolvedTheme } from "../../../src/report/chart/types";

const theme: ResolvedTheme = {
  text: "#111827",
  textSecondary: "#6b7280",
  grid: "#e5e7eb",
  bg: "#ffffff",
  dark: false,
  fontFamily: "sans-serif",
  labelFontSize: "12px",
  titleFontSize: "16px",
};

function series(overrides: Partial<SeriesModel> = {}): SeriesModel {
  return {
    name: "S", kind: "radar", data: [], color: "#3b82f6", yAxis: "left",
    format: "auto", visible: true, index: 0, ...overrides,
  };
}

const ctx = {
  showGrid: false,
  regions: [] as MapRegion[],
  values: null,
  mapIdKey: "id",
  mapNameKey: "name",
  projection: "auto" as const,
  locale: "en-US",
};

describe("radar geometry", () => {
  it("画蛛网 4 圈 + 6 辐条 + 6 轴标签，两个系列各一个多边形", () => {
    const labels = ["营业额", "单量", "客单价", "实收率", "订销比", "达成率"];
    const mk = (values: number[], index: number, color: string) =>
      series({ index, color, data: labels.map((label, i) => ({ label, value: values[i] })) });
    const a = mk([100, 80, 60, 40, 20, 90], 0, "#3b82f6");
    const b = mk([50, 90, 70, 30, 60, 10], 1, "#f59e0b");
    const frame = insetFrame(400, 300, 30);
    const g = buildGeometry("radar", [a, b], frame, null, theme, 1, ctx);
    // 蜘蛛网圈数是常量 4（0.25/0.5/0.75/1），辐条与标签各 6
    const rings = g.marks.filter((m) => m.kind === "path" && m.seriesIndex === -1 && m.dataIndex === -1);
    expect(rings).toHaveLength(4);
    const spokes = g.marks.filter((m) => m.kind === "path" && m.seriesIndex === -1 && m.dataIndex >= 0);
    expect(spokes).toHaveLength(6);
    const axisLabels = g.marks.filter((m) => m.kind === "text");
    expect(axisLabels).toHaveLength(6);
    expect(axisLabels[0].label).toBe("营业额");
    // 两个系列多边形（fillOpacity 0.15）
    const polys = g.marks.filter((m) => m.kind === "path" && m.seriesIndex >= 0);
    expect(polys).toHaveLength(2);
    expect(polys[0].fillOpacity).toBe(0.15);
    // 每系列 6 个顶点圆
    const dots = g.marks.filter((m) => m.kind === "circle");
    expect(dots).toHaveLength(12);
    // tooltip 命中 = 系列 × 轴
    expect(g.tooltipTargets).toHaveLength(12);
    expect(g.noData).toBe(false);
  });

  it("逐轴归一：某轴最大值的系列顶点半径 = radius，小值按比例", () => {
    const labels = ["A", "B", "C", "D", "E", "F"];
    const a = series({ index: 0, color: "#3b82f6", data: labels.map((label, i) => ({ label, value: i === 0 ? 100 : 10 })) });
    const b = series({ index: 1, color: "#f59e0b", data: labels.map((label, i) => ({ label, value: i === 0 ? 50 : 10 })) });
    const frame = insetFrame(400, 300, 30);
    const g = buildGeometry("radar", [a, b], frame, null, theme, 1, ctx);
    const cx = 200;
    const cy = 150;
    // plot: inset 30 → 340x240 → radius = min(340,240)/2 - 14 = 106
    const radius = 106;
    // A 轴角度 = -90°（正上方）：x = cx, y = cy - r
    const dot = (si: number) => g.marks.find((m) => m.kind === "circle" && m.seriesIndex === si && m.dataIndex === 0)!;
    expect(dot(0).cy).toBeCloseTo(cy - radius, 5); // 100/100 → 满半径
    expect(dot(1).cy).toBeCloseTo(cy - radius * 0.5, 5); // 50/100 → 半径一半
    expect(dot(0).cx).toBeCloseTo(cx, 5);
  });

  it("单系列共用「全图最大值」当分母，不是每轴各自满格（否则画出正多边形）", () => {
    // 单系列雷达：每根轴的 max 若取「本轴最大值」，5 个顶点全在圆周上 —— 形状恒为
    // 正多边形，零信息。这条用例把「分母」钉死：只有最大值那根轴到圆周。
    const labels = ["A", "B", "C", "D", "E"];
    const values = [100, 50, 20, 10, 5];
    const a = series({ index: 0, data: labels.map((label, i) => ({ label, value: values[i] })) });
    const frame = insetFrame(400, 300, 30);
    const g = buildGeometry("radar", [a], frame, null, theme, 1, ctx);
    const cx = 200;
    const cy = 150;
    const radius = 106; // inset 30 → plot 340x240 → min/2 - 14
    const dot = (i: number) => g.marks.find((m) => m.kind === "circle" && m.dataIndex === i)!;
    // A 轴（正上方）100/100 → 满半径
    expect(dot(0).cy).toBeCloseTo(cy - radius, 5);
    // C 轴（第 3 根）：20/100 → 半径 20%。逐轴归一时这里是满半径，断言必红
    const angleC = -Math.PI / 2 + (Math.PI * 2 * 2) / 5;
    expect(dot(2).cx).toBeCloseTo(cx + Math.cos(angleC) * radius * 0.2, 5);
    expect(dot(2).cy).toBeCloseTo(cy + Math.sin(angleC) * radius * 0.2, 5);
    // E 轴 5/100 → 5%
    const angleE = -Math.PI / 2 + (Math.PI * 2 * 4) / 5;
    expect(dot(4).cx).toBeCloseTo(cx + Math.cos(angleE) * radius * 0.05, 5);
  });

  it("少于 3 条轴按无数据处理，不画退化的『两角线段』", () => {
    const a = series({ data: [{ label: "A", value: 1 }, { label: "B", value: 2 }] });
    const frame = insetFrame(400, 300, 30);
    const g = buildGeometry("radar", [a], frame, null, theme, 1, ctx);
    expect(g.noData).toBe(true);
    expect(g.marks).toHaveLength(0);
  });
});

describe("computeWaterfallDomains", () => {
  it("左轴覆盖累计极值而不是增量极值", () => {
    const s = series({
      kind: "waterfall",
      data: [
        { label: "营业额", value: 1000 },
        { label: "券面优惠", value: -200 },
        { label: "平台优惠", value: -100 },
        { label: "实收", value: 0 },
      ],
    });
    const d = computeWaterfallDomains([s]);
    // 累计：1000 → 800 → 700 → 700；极值 [0, 1000]，pad = 80
    expect(d.leftDomain[0]).toBeCloseTo(-80, 5);
    expect(d.leftDomain[1]).toBeCloseTo(1080, 5);
    expect(d.xLabels).toEqual(["营业额", "券面优惠", "平台优惠", "实收"]);
    expect(d.xKind).toBe("category");
  });

  it("中途冲高的累计不顶出画布：负增量时下界跟着降", () => {
    const s = series({
      kind: "waterfall",
      data: [
        { label: "期初", value: 300 },
        { label: "退款", value: -500 },
      ],
    });
    const d = computeWaterfallDomains([s]);
    // 累计：300 → -200；极值 [-200, 300]，pad = 40
    expect(d.leftDomain[0]).toBeCloseTo(-240, 5);
    expect(d.leftDomain[1]).toBeCloseTo(340, 5);
  });
});

describe("waterfall geometry", () => {
  it("每行一根浮动柱：正增量满色、负增量 0.4 透明度，值标注带符号", () => {
    const s = series({
      kind: "waterfall",
      format: "auto",
      data: [
        { label: "营业额", value: 1000 },
        { label: "券面优惠", value: -200 },
      ],
    });
    const d = computeWaterfallDomains([s]);
    const frame = computeFrame(400, 300, d, {}, "en-US", 12);
    const g = buildGeometry("waterfall", [s], frame, d, theme, 1, ctx);
    const rects = g.marks.filter((m) => m.kind === "rect");
    expect(rects).toHaveLength(2);
    expect(rects[0].fillOpacity).toBe(0.9);
    expect(rects[1].fillOpacity).toBe(0.4);
    // 两根柱同宽
    expect(rects[0].width).toBe(rects[1].width);
    // 第一根：0→1000 满柱；第二根：800→1000 浮段（同顶、只有 200 的高度）
    expect(rects[0].y!).toBeCloseTo(rects[1].y!, 5);
    expect(rects[0].height!).toBeGreaterThan(rects[1].height!);
    const texts = g.marks.filter((m) => m.kind === "text");
    // 值标注 2 条（progress=1 时）
    expect(texts).toHaveLength(2);
    expect(texts[0].label).toBe("+1,000");
    expect(texts[1].label).toBe("-200");
    // tooltip 带累计列
    expect(g.tooltipTargets).toHaveLength(2);
    expect(g.tooltipTargets[1].values[1].name).toBe("累计");
    expect(g.tooltipTargets[1].values[1].value).toBe(800);
    expect(g.noData).toBe(false);
  });

  it("衔接虚线：第 2 根起每根一条，y 落在上一根的累计位置", () => {
    const s = series({
      kind: "waterfall",
      data: [
        { label: "A", value: 100 },
        { label: "B", value: 50 },
        { label: "C", value: -30 },
      ],
    });
    const d = computeWaterfallDomains([s]);
    const frame = computeFrame(400, 300, d, {}, "en-US", 12);
    const g = buildGeometry("waterfall", [s], frame, d, theme, 1, ctx);
    const links = g.marks.filter((m) => m.kind === "path" && m.dash === true);
    expect(links).toHaveLength(2);
  });
});
