// Test: z-flow shared pure functions (parsePosition/getBezierPath/rectsOverlap/clamp)
// Related: [[REQ-013-node-flow-editor]]
// Wiki: wiki/requirements/REQ-013-node-flow-editor.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import {
  parsePosition,
  getBezier,
  getBezierPath,
  rectsOverlap,
  clamp,
  formatPosition,
} from "../../../src/flow/shared";

describe("parsePosition", () => {
  it("parses x,y", () => {
    expect(parsePosition("120,80")).toEqual({ x: 120, y: 80 });
  });

  it("parses negative coordinates", () => {
    expect(parsePosition("-10,-20")).toEqual({ x: -10, y: -20 });
  });

  it("parses float coordinates", () => {
    expect(parsePosition("1.5,2.5")).toEqual({ x: 1.5, y: 2.5 });
  });

  it("rejects malformed input", () => {
    expect(parsePosition("120")).toBeNull();
    expect(parsePosition("a,b")).toBeNull();
    expect(parsePosition("120,")).toBeNull();
    expect(parsePosition("")).toBeNull();
  });
});

describe("getBezierPath", () => {
  it("produces cubic bezier with rightward control points", () => {
    expect(getBezierPath(0, 0, 200, 0)).toBe("M 0 0 C 100 0, 100 0, 200 0");
  });

  // [WHY] 控制点沿把手所在边法线外延（默认 source right / target left）：
  // 目标在左时控制点仍按法线外延而非折向目标，曲线先外扩再折返
  // See: wiki/bugs/bug-20260811-bezier-perpendicular.md
  it("extends control points along handle normal for leftward edges", () => {
    expect(getBezierPath(200, 0, 0, 0)).toBe("M 200 0 C 300 0, -100 0, 0 0");
  });

  it("keeps minimum control point offset when nodes are close", () => {
    expect(getBezierPath(0, 0, 10, 0)).toBe("M 0 0 C 50 0, -40 0, 10 0");
  });

  it("exits vertically from bottom handle and enters vertically into top handle", () => {
    expect(getBezierPath(0, 0, 0, 200, "bottom", "top")).toBe("M 0 0 C 0 100, 0 100, 0 200");
  });

  it("exits vertically from top handle", () => {
    expect(getBezierPath(0, 200, 0, 0, "top", "bottom")).toBe("M 0 200 C 0 100, 0 100, 0 0");
  });

  it("mixes vertical source and horizontal target", () => {
    expect(getBezierPath(0, 0, 200, 0, "bottom", "left")).toBe("M 0 0 C 0 50, 100 0, 200 0");
  });

  it("keeps perpendicular tangent at source and target for every handle side", () => {
    // 法线：(top/right/bottom/left) → (0,-1)/(1,0)/(0,1)/(-1,0)
    const normals: Record<"top" | "right" | "bottom" | "left", [number, number]> = {
      top: [0, -1],
      right: [1, 0],
      bottom: [0, 1],
      left: [-1, 0],
    };
    for (const [side, [nx, ny]] of Object.entries(normals) as Array<["top" | "right" | "bottom" | "left", [number, number]]>) {
      const b = getBezier(0, 0, 200, 200, side, side);
      // 源端：控制点沿法线外延 → (c1 - P0)·n > 0，且与边正交分量不漂移
      expect(b.c1.x * nx + b.c1.y * ny).toBeGreaterThan(0);
      expect(b.c1.x * -ny + b.c1.y * nx).toBe(0);
      // 目标端：控制点沿法线外延 → (c2 - P3)·n > 0（曲线从外侧垂直进入），正交分量不漂移
      expect((b.c2.x - 200) * nx + (b.c2.y - 200) * ny).toBeGreaterThan(0);
      expect((b.c2.x - 200) * -ny + (b.c2.y - 200) * nx).toBe(0);
    }
  });
});

describe("rectsOverlap", () => {
  it("detects overlap", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  it("detects containment as overlap", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 20, h: 20 }, { x: 5, y: 5, w: 5, h: 5 })).toBe(true);
  });

  it("rejects disjoint rects", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 10, h: 10 })).toBe(false);
  });

  it("treats edge touching as non-overlap", () => {
    expect(rectsOverlap({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
  });
});

describe("clamp", () => {
  it("clamps within range", () => {
    expect(clamp(1.5, 0.5, 2)).toBe(1.5);
    expect(clamp(0.1, 0.5, 2)).toBe(0.5);
    expect(clamp(5, 0.5, 2)).toBe(2);
  });
});

describe("formatPosition", () => {
  it("formats x,y string", () => {
    expect(formatPosition({ x: 10, y: 20 })).toBe("10,20");
  });
});
