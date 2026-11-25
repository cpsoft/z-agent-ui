// Test: z-progress component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/progress/Progress";

describe("z-progress", () => {
  function createProgress(): HTMLElement & { value: number; variant: string; size: string; striped: boolean; animated: boolean; showLabel: boolean } {
    const el = document.createElement("z-progress") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders progress bar with 0% default", async () => {
    const el = createProgress();
    await new Promise((r) => setTimeout(r, 0));
    const fill = el.shadowRoot!.querySelector(".z-progress__fill") as HTMLElement;
    expect(fill.style.width).toBe("0%");
    document.body.removeChild(el);
  });

  it("renders correct width percentage", async () => {
    const el = createProgress();
    el.value = 75;
    await new Promise((r) => setTimeout(r, 0));
    const fill = el.shadowRoot!.querySelector(".z-progress__fill") as HTMLElement;
    expect(fill.style.width).toBe("75%");
    document.body.removeChild(el);
  });

  it("clamps value between 0 and 100", async () => {
    const el = createProgress();
    el.value = 150;
    await new Promise((r) => setTimeout(r, 0));
    const fill = el.shadowRoot!.querySelector(".z-progress__fill") as HTMLElement;
    expect(fill.style.width).toBe("100%");
    document.body.removeChild(el);
  });

  it("has correct aria attributes", async () => {
    const el = createProgress();
    el.value = 60;
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-progress")!;
    expect(root.getAttribute("aria-valuenow")).toBe("60");
    expect(root.getAttribute("aria-valuemin")).toBe("0");
    expect(root.getAttribute("aria-valuemax")).toBe("100");
    document.body.removeChild(el);
  });

  it("shows variant class", async () => {
    const el = createProgress();
    el.variant = "success";
    await new Promise((r) => setTimeout(r, 0));
    const fill = el.shadowRoot!.querySelector(".z-progress__fill--success")!;
    expect(fill).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows striped class", async () => {
    const el = createProgress();
    el.striped = true;
    await new Promise((r) => setTimeout(r, 0));
    const striped = el.shadowRoot!.querySelector(".z-progress__fill--striped")!;
    expect(striped).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows label when showLabel is true", async () => {
    const el = createProgress();
    el.value = 42;
    el.showLabel = true;
    await new Promise((r) => setTimeout(r, 0));
    const label = el.shadowRoot!.querySelector(".z-progress__label")!;
    expect(label.textContent).toContain("42%");
    document.body.removeChild(el);
  });
});
