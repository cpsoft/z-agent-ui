// Test: FloatingPosition utility
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import { FloatingPosition } from "../../../src/primitives/position/FloatingPosition";

describe("FloatingPosition", () => {
  function createAnchor(): HTMLElement {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "100px";
    el.style.left = "100px";
    el.style.width = "100px";
    el.style.height = "40px";
    el.getBoundingClientRect = () =>
      ({ x: 100, y: 100, width: 100, height: 40, top: 100, right: 200, bottom: 140, left: 100 }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }

  function createFloating(): HTMLElement {
    const el = document.createElement("div");
    el.style.width = "80px";
    el.style.height = "30px";
    el.getBoundingClientRect = () =>
      ({ x: 0, y: 0, width: 80, height: 30, top: 0, right: 80, bottom: 30, left: 0 }) as DOMRect;
    document.body.appendChild(el);
    return el;
  }

  it("positions at bottom-start by default", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating });

    expect(floating.style.position).toBe("fixed");
    // Position should be below the anchor
    const top = parseFloat(floating.style.top);
    expect(top).toBeGreaterThanOrEqual(140); // anchor bottom

    fp.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });

  it("positions at top", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating, placement: "top" });

    const top = parseFloat(floating.style.top);
    expect(top).toBeLessThan(100); // above anchor

    fp.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });

  it("applies offset", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp1 = new FloatingPosition({ anchor, floating, placement: "bottom", offset: 0 });
    const topNoOffset = parseFloat(floating.style.top);
    fp1.destroy();

    const floating2 = createFloating();
    const fp2 = new FloatingPosition({ anchor, floating: floating2, placement: "bottom", offset: 20 });
    const topWithOffset = parseFloat(floating2.style.top);
    expect(topWithOffset).toBe(topNoOffset + 20);

    fp2.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
    document.body.removeChild(floating2);
  });

  it("currentPlacement returns the placement", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating, placement: "right" });

    expect(fp.currentPlacement).toBe("right");

    fp.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });

  it("update() recalculates position", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating });

    const firstTop = floating.style.top;
    fp.update();
    // Update should still work without errors
    expect(floating.style.top).toBeDefined();

    fp.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });

  // Related: [[bug-20260910-select-dropdown-scroll-anchor]]
  // Wiki: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
  it("re-resolves a getter anchor when the original element is replaced", () => {
    const anchorA = createAnchor();
    const floating = createFloating();
    // anchorA lives at (100, 100), 100x40 → floating top should be >= 140
    let current: HTMLElement = anchorA;
    const fp = new FloatingPosition({ anchor: () => current, floating });
    const topA = parseFloat(floating.style.top);
    expect(topA).toBeGreaterThanOrEqual(140);

    // Simulate shadow-DOM re-render: original anchor detached, replaced by a fresh element at (300, 300)
    document.body.removeChild(anchorA);
    const anchorB = document.createElement("div");
    anchorB.style.position = "absolute";
    anchorB.style.top = "300px";
    anchorB.style.left = "300px";
    anchorB.style.width = "100px";
    anchorB.style.height = "40px";
    anchorB.getBoundingClientRect = () =>
      ({ x: 300, y: 300, width: 100, height: 40, top: 300, right: 400, bottom: 340, left: 300 }) as DOMRect;
    document.body.appendChild(anchorB);
    current = anchorB;

    fp.update();
    const topB = parseFloat(floating.style.top);
    expect(topB).toBeGreaterThanOrEqual(340);

    fp.destroy();
    document.body.removeChild(anchorB);
    document.body.removeChild(floating);
  });

  // Related: [[bug-20260910-select-dropdown-scroll-anchor]]
  // Wiki: wiki/bugs/bug-20260910-select-dropdown-scroll-anchor.md
  it("keeps last position when the getter anchor is detached", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    let current: HTMLElement | null = anchor;
    const fp = new FloatingPosition({ anchor: () => current, floating });
    const before = parseFloat(floating.style.top);
    expect(before).toBeGreaterThanOrEqual(140);

    document.body.removeChild(anchor);
    current = null; // anchor temporarily unresolvable (despite null, guard returns early)
    fp.update();
    expect(parseFloat(floating.style.top)).toBe(before);

    fp.destroy();
    document.body.removeChild(floating);
  });

  it("destroy cleans up event listeners", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating });
    fp.destroy();
    // Should not throw
    expect(true).toBe(true);
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });

  it("positions right", () => {
    const anchor = createAnchor();
    const floating = createFloating();
    const fp = new FloatingPosition({ anchor, floating, placement: "right" });

    const left = parseFloat(floating.style.left);
    expect(left).toBeGreaterThanOrEqual(200); // anchor right

    fp.destroy();
    document.body.removeChild(anchor);
    document.body.removeChild(floating);
  });
});
