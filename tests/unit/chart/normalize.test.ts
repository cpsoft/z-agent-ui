// Test: chart data normalize — 4 种数据形态自动识别、kind 解析
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import { normalizeSeries, detectXKind } from "../../../src/report/chart/data/normalize";
import type { RawSeries } from "../../../src/report/chart/data/normalize";

function raw(overrides: Partial<RawSeries> = {}): RawSeries {
  return { name: "", type: "auto", data: [], color: "", yAxis: "left", format: "", visible: true, index: 0, ...overrides };
}

describe("normalizeSeries", () => {
  it("accepts number[] with indexed labels", () => {
    const [s] = normalizeSeries([raw({ data: [10, 20] })], "bar");
    expect(s.data).toEqual([
      { x: 0, label: "1", value: 10 },
      { x: 1, label: "2", value: 20 },
    ]);
  });

  it("accepts {value}[]", () => {
    const [s] = normalizeSeries([raw({ data: [{ value: 5 }, { value: 6 }] })], "bar");
    expect(s.data.map((p) => p.value)).toEqual([5, 6]);
  });

  it("accepts {label, value}[]", () => {
    const [s] = normalizeSeries([raw({ data: [{ label: "Jan", value: 3 }] })], "bar");
    expect(s.data[0]).toEqual({ label: "Jan", value: 3 });
  });

  it("accepts {x, y}[] and {date, value}[]", () => {
    const [s1] = normalizeSeries([raw({ data: [{ x: 10, y: 1 }, { x: 20, y: 2 }] })], "line");
    expect(s1.data[0].x).toBe(10);
    const [s2] = normalizeSeries([raw({ data: [{ date: "2026-01-01", value: 1 }] })], "line");
    expect(s2.data[0].x).toBe(Date.parse("2026-01-01"));
  });

  it("skips non-numeric entries", () => {
    const [s] = normalizeSeries([raw({ data: [{ value: 1 }, { value: "nope" }] })], "bar");
    expect(s.data).toHaveLength(1);
  });

  it("resolves series kind from chart type and override", () => {
    expect(normalizeSeries([raw({})], "area")[0].kind).toBe("area");
    expect(normalizeSeries([raw({})], "donut")[0].kind).toBe("pie");
    expect(normalizeSeries([raw({ type: "line" })], "bar")[0].kind).toBe("line");
    expect(normalizeSeries([raw({ type: "auto" })], "sparkline")[0].kind).toBe("sparkline");
  });

  it("defaults name and normalizes yAxis", () => {
    const [s] = normalizeSeries([raw({ yAxis: "right" })], "bar");
    expect(s.name).toBe("Series 1");
    expect(s.yAxis).toBe("right");
  });
});

describe("detectXKind", () => {
  it("detects category when any point has a label", () => {
    expect(detectXKind([[{ value: 1 }], [{ label: "a", value: 2 }]], "auto")).toBe("category");
  });

  it("detects value for plain numeric x", () => {
    expect(detectXKind([[{ x: 1, value: 2 }]], "auto")).toBe("value");
  });

  it("respects forced kind", () => {
    expect(detectXKind([[{ value: 1 }]], "time")).toBe("time");
  });
});

// ── label 与 x 共存（2026-11-17）────────────────────────────────
//
// 早先 toPoints 里两者是 if / else if 链：`有 label 就不再看 x`。柱/折线（只有 label）
// 与散点（只有 x）都看不出问题，但散点**两者都需要**（x 定横轴、label 当 tooltip），
// 于是 x 被静默丢掉 —— collectXValues 拿到空 ⇒ xDomain 退回 [0,1] ⇒ 所有点挤在一条
// 竖线上。类型检查、单测、组件装配全绿，只有真机截图才看出来。
describe("normalizeSeries: label 与 x 不是互斥的", () => {
  it("同时给出 label 与 x 时两个都留下", () => {
    const [s] = normalizeSeries([raw({ data: [{ x: 8200, value: 120, label: "西湖店" }] })], "scatter");
    // [变异判据] 恢复成 if/else if 链时 x 是 undefined，这条红
    expect(s.data[0].x).toBe(8200);
    expect(s.data[0].label).toBe("西湖店");
  });

  it("只有 label 时不补 x（分类轴形态，一字不变）", () => {
    const [s] = normalizeSeries([raw({ data: [{ label: "Jan", value: 3 }] })], "bar");
    expect(s.data[0].x).toBeUndefined();
    expect(s.data[0].label).toBe("Jan");
  });

  it("只有 x 时不补 label（数值轴形态，一字不变）", () => {
    const [s] = normalizeSeries([raw({ data: [{ x: 5, value: 3 }] })], "scatter");
    expect(s.data[0].x).toBe(5);
    expect(s.data[0].label).toBeUndefined();
  });

  it("markgap 的缺数点同样保留 x", () => {
    // 用 line 而不是 scatter：gap 点只对**连线**有意义（scatter 缺数就是不画点，
    // normalize 也只对 line 产出 gap）。数值轴上的折线（时间轴缺失某天）是这个分支
    // 真实的服务对象。
    const [s] = normalizeSeries(
      [raw({ data: [{ x: 8200, value: null, label: "西湖店" }] })],
      "line",
      { markgap: true },
    );
    expect(s.data[0].gap).toBe(true);
    expect(s.data[0].x).toBe(8200);
    expect(s.data[0].label).toBe("西湖店");
  });
});
