// Test: z-rate 星级评分（hover 预览/allowHalf/键盘/clearable）
// Related: [[2026-08-11-W13-form-basics]]
// Wiki: wiki/planning/TASKS/2026-08-11-W13-form-basics/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/rate/Rate.js";

function createRate(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-rate") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function star(el: any, idx: number): HTMLElement {
  return el.shadowRoot.querySelectorAll(".z-rate__star")[idx];
}

function fillWidth(el: any, idx: number): string {
  const starEl = star(el, idx);
  return starEl.querySelector(".z-rate__star-fg").style.width;
}

function mockStarRect(el: any): void {
  for (const s of el.shadowRoot.querySelectorAll(".z-rate__star")) {
    s.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 18, bottom: 18, width: 18, height: 18, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect;
  }
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-rate", () => {
  it("renders 5 stars by default", async () => {
    const el = createRate();
    await flush();
    expect(el.shadowRoot.querySelectorAll(".z-rate__star").length).toBe(5);
    document.body.removeChild(el);
  });

  it("honors count attribute", async () => {
    const el = createRate({ count: "3" });
    await flush();
    expect(el.shadowRoot.querySelectorAll(".z-rate__star").length).toBe(3);
    document.body.removeChild(el);
  });

  it("value=3 fills first three stars", async () => {
    const el = createRate({ value: "3" });
    await flush();
    expect(fillWidth(el, 0)).toBe("100%");
    expect(fillWidth(el, 2)).toBe("100%");
    expect(fillWidth(el, 3)).toBe("0%");
    document.body.removeChild(el);
  });

  it("click on star emits z-change with 1-based value", async () => {
    const el = createRate();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    star(el, 2).dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 9 }));
    expect(el.value).toBe(3);
    expect(handler.mock.calls[0][0].detail.value).toBe(3);
    document.body.removeChild(el);
  });

  it("clearable clears value on re-click of same star", async () => {
    const el = createRate({ value: "3", clearable: "" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    star(el, 2).dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 9 }));
    expect(el.value).toBe(0);
    expect(handler.mock.calls[0][0].detail.value).toBe(0);
    document.body.removeChild(el);
  });

  it("allow-half: click left half yields 0.5 step", async () => {
    const el = createRate({ "allow-half": "" });
    await flush();
    mockStarRect(el);
    star(el, 0).dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 5 }));
    expect(el.value).toBe(0.5);
    document.body.removeChild(el);
  });

  it("allow-half: click right half yields whole step", async () => {
    const el = createRate({ "allow-half": "" });
    await flush();
    mockStarRect(el);
    star(el, 0).dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 15 }));
    expect(el.value).toBe(1);
    document.body.removeChild(el);
  });

  it("hover emits z-hover and previews fill", async () => {
    const el = createRate({ value: "0" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-hover", handler);
    star(el, 1).dispatchEvent(new MouseEvent("mouseover", { bubbles: true, clientX: 9 }));
    expect(handler.mock.calls[0][0].detail.value).toBe(2);
    await flush();
    expect(fillWidth(el, 1)).toBe("100%");
    // mouseout 恢复
    star(el, 1).dispatchEvent(new MouseEvent("mouseout", { bubbles: true }));
    await flush();
    expect(fillWidth(el, 1)).toBe("0%");
    document.body.removeChild(el);
  });

  it("keyboard ArrowRight increments by 1", async () => {
    const el = createRate({ value: "2" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    el.shadowRoot.querySelector(".z-rate").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(el.value).toBe(3);
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("keyboard ArrowLeft decrements and End jumps to count", async () => {
    const el = createRate({ value: "3" });
    await flush();
    const root = el.shadowRoot.querySelector(".z-rate");
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(el.value).toBe(2);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(el.value).toBe(5);
    document.body.removeChild(el);
  });

  it("allow-half keyboard steps by 0.5", async () => {
    const el = createRate({ value: "1", "allow-half": "" });
    await flush();
    el.shadowRoot.querySelector(".z-rate").dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(el.value).toBe(1.5);
    document.body.removeChild(el);
  });

  it("has slider role with aria attrs", async () => {
    const el = createRate({ value: "3", label: "Score" });
    await flush();
    const root = el.shadowRoot.querySelector(".z-rate");
    expect(root.getAttribute("role")).toBe("slider");
    expect(root.getAttribute("aria-valuenow")).toBe("3");
    expect(root.getAttribute("aria-valuemax")).toBe("5");
    expect(root.getAttribute("aria-label")).toBe("Score");
    document.body.removeChild(el);
  });

  it("disabled and readonly block interaction", async () => {
    for (const attr of ["disabled", "readonly"]) {
      const el = createRate({ value: "2", [attr]: "" });
      await flush();
      const handler = vi.fn();
      el.addEventListener("z-change", handler);
      star(el, 3).dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 9 }));
      expect(handler).not.toHaveBeenCalled();
      expect(el.value).toBe(2);
      document.body.removeChild(el);
    }
    document.body.innerHTML = "";
  });
});
