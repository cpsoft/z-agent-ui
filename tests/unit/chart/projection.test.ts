// Test: chart map projection — 经纬度检测、投影数学、fitToFrame
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect } from "vitest";
import {
  detectProjection,
  projectPoint,
  ringProjected,
  fitToFrame,
  applyTransform,
} from "../../../src/report/chart/map/projection";
import type { MapRegion } from "../../../src/report/chart/types";

function region(rings: number[][][]): MapRegion {
  return { id: "r", name: "R", rings };
}

describe("detectProjection", () => {
  it("detects lon/lat coordinates as geographic", () => {
    expect(detectProjection([[116.4, 39.9], [0, 0]])).toBe("geographic");
  });

  it("detects large coordinates as projected", () => {
    expect(detectProjection([[512345, 4469876]])).toBe("projected");
  });
});

describe("projectPoint", () => {
  it("equirectangular flips latitude sign", () => {
    expect(projectPoint(10, 20, "equirectangular")).toEqual([10, -20]);
  });

  it("mercator clamps latitude and transforms", () => {
    const [x, y] = projectPoint(0, 0, "mercator");
    expect(x).toBe(0);
    expect(Math.abs(y)).toBeLessThan(1e-9);
    const [, y90] = projectPoint(0, 90, "mercator");
    const [, yClamped] = projectPoint(0, 90.5, "mercator");
    expect(yClamped).toBe(y90);
    expect(Number.isFinite(y90)).toBe(true);
  });

  it("ringProjected applies projection to every point", () => {
    const out = ringProjected([[1, 2], [3, 4]], "equirectangular");
    expect(out).toEqual([[1, -2], [3, -4]]);
  });
});

describe("fitToFrame", () => {
  it("scales uniformly and centers in plot", () => {
    const regions = [region([[[0, 0], [10, 0], [10, 10], [0, 10]]])];
    const t = fitToFrame(regions, { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(t.sx).toBe(10);
    expect(t.sy).toBe(10);
    const [x, y] = applyTransform([[0, 0]], t)[0];
    expect(x).toBe(0);
    expect(y).toBe(0);
    const [x2] = applyTransform([[10, 10]], t)[0];
    expect(x2).toBe(100);
  });

  it("letterboxes non-square aspect", () => {
    const regions = [region([[[0, 0], [20, 0], [20, 10], [0, 10]]])];
    const t = fitToFrame(regions, { x: 0, y: 0, width: 100, height: 100 }, 0);
    expect(t.sx).toBe(5);
    expect(t.sx).toBe(t.sy);
  });

  it("applies padding", () => {
    const regions = [region([[[0, 0], [10, 0], [10, 10], [0, 10]]])];
    const t = fitToFrame(regions, { x: 0, y: 0, width: 100, height: 100 }, 0.1);
    expect(t.sx).toBeLessThan(10);
  });

  it("handles empty regions", () => {
    const t = fitToFrame([], { x: 0, y: 0, width: 100, height: 100 });
    expect(t.sx).toBe(1);
    expect(t.ox).toBe(0);
  });
});
