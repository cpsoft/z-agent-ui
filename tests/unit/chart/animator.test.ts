// Test: chart animator — play/cancel、reduced-motion、ease
// Related: [[REQ-005-charts]]
// Wiki: wiki/requirements/REQ-005-charts.md
// Date: 2026-08-09
// Author: AI

import { describe, it, expect, vi, afterEach } from "vitest";
import { Animator, easeOutCubic, prefersReducedMotion } from "../../../src/report/chart/animator/animator";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubRafLoop(stopAfter?: number): () => void {
  let now = 0;
  let calls = 0;
  vi.stubGlobal("performance", { now: () => now });
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    calls += 1;
    if (stopAfter !== undefined && calls > stopAfter) return calls;
    now += 100;
    cb(now);
    return calls;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return () => {
    calls = 0;
  };
}

describe("Animator", () => {
  it("plays to completion with monotonic eased frames ending at 1", () => {
    stubRafLoop();
    const frames: number[] = [];
    const a = new Animator();
    a.play(400, (t) => frames.push(t));
    expect(frames.length).toBeGreaterThan(1);
    expect(frames[frames.length - 1]).toBe(1);
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i]).toBeGreaterThanOrEqual(frames[i - 1]);
    }
    for (const f of frames) {
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThanOrEqual(1);
    }
  });

  it("cancel stops frame emission", () => {
    stubRafLoop(2);
    const frames: number[] = [];
    const a = new Animator();
    a.play(400, (t) => frames.push(t));
    const before = frames.length;
    a.cancel();
    expect(frames.length).toBe(before);
    expect(() => a.cancel()).not.toThrow();
  });

  it("restarts on second play", () => {
    const reset = stubRafLoop(4);
    const frames: number[] = [];
    const a = new Animator();
    a.play(400, (t) => frames.push(t));
    const before = frames.length;
    reset();
    a.play(400, (t) => frames.push(t));
    expect(frames.length).toBeGreaterThan(before);
  });
});

describe("easeOutCubic", () => {
  it("maps 0→0 and 1→1 and is increasing", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.5));
    expect(easeOutCubic(0.5)).toBeLessThan(easeOutCubic(0.75));
  });
});

describe("prefersReducedMotion", () => {
  it("returns false when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns true when reduced motion is requested", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false by default", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });
});
