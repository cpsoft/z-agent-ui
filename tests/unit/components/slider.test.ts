// Test: z-slider 滑杆（拖拽直写/键盘/垂直/marks/a11y）
// Related: [[2026-08-11-W13-form-basics]]
// Wiki: wiki/planning/TASKS/2026-08-11-W13-form-basics/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/slider/Slider.js";

function createSlider(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-slider") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function mockRect(el: HTMLElement, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({
      left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0,
      toJSON: () => ({}),
    }) as DOMRect;
}

function thumb(el: any): HTMLElement {
  return el.shadowRoot.querySelector(".z-slider__thumb");
}

function drag(el: any, fromX: number, toX: number): void {
  const t = thumb(el);
  t.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: fromX, clientY: 10 }));
  document.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: toX, clientY: 10 }));
  document.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-slider", () => {
  it("renders track, fill and thumb", async () => {
    const el = createSlider({ value: "50" });
    await flush();
    expect(el.shadowRoot.querySelector(".z-slider__track")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-slider__fill")).toBeTruthy();
    expect(thumb(el)).toBeTruthy();
    document.body.removeChild(el);
  });

  it("thumb has role=slider with aria min/max/now", async () => {
    const el = createSlider({ value: "30", min: "0", max: "100" });
    await flush();
    const t = thumb(el);
    expect(t.getAttribute("role")).toBe("slider");
    expect(t.getAttribute("aria-valuemin")).toBe("0");
    expect(t.getAttribute("aria-valuemax")).toBe("100");
    expect(t.getAttribute("aria-valuenow")).toBe("30");
    document.body.removeChild(el);
  });

  it("fill width reflects value percent", async () => {
    const el = createSlider({ value: "50" });
    await flush();
    const fill = el.shadowRoot.querySelector(".z-slider__fill");
    expect(fill.style.width).toBe("50%");
    document.body.removeChild(el);
  });

  it("keyboard ArrowRight increments by step and emits z-change", async () => {
    const el = createSlider({ value: "10", step: "5" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(el.value).toBe(15);
    expect(handler.mock.calls[0][0].detail.value).toBe(15);
    document.body.removeChild(el);
  });

  it("keyboard ArrowLeft decrements", async () => {
    const el = createSlider({ value: "10" });
    await flush();
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(el.value).toBe(9);
    document.body.removeChild(el);
  });

  it("Home/End jump to min/max", async () => {
    const el = createSlider({ value: "50", min: "0", max: "100" });
    await flush();
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(el.value).toBe(0);
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));
    expect(el.value).toBe(100);
    document.body.removeChild(el);
  });

  it("PageUp/PageDown step by 10x", async () => {
    const el = createSlider({ value: "50", step: "1" });
    await flush();
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "PageUp", bubbles: true }));
    expect(el.value).toBe(60);
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
    expect(el.value).toBe(50);
    document.body.removeChild(el);
  });

  it("drag emits z-input during move and z-change on release", async () => {
    const el = createSlider({ value: "0", min: "0", max: "100", step: "1" });
    await flush();
    mockRect(el.shadowRoot.querySelector(".z-slider"), 100, 20);
    const inputHandler = vi.fn();
    const changeHandler = vi.fn();
    el.addEventListener("z-input", inputHandler);
    el.addEventListener("z-change", changeHandler);
    drag(el, 0, 50);
    expect(inputHandler.mock.calls[0][0].detail.value).toBe(50);
    expect(changeHandler).toHaveBeenCalledTimes(1);
    expect(changeHandler.mock.calls[0][0].detail.value).toBe(50);
    expect(el.value).toBe(50);
    expect(thumb(el).getAttribute("aria-valuenow")).toBe("50");
    document.body.removeChild(el);
  });

  it("drag steps to nearest step boundary", async () => {
    const el = createSlider({ value: "0", min: "0", max: "10", step: "5" });
    await flush();
    mockRect(el.shadowRoot.querySelector(".z-slider"), 100, 20);
    drag(el, 0, 52); // 52% of 10 → 5.2 → 取整到 1 步 → 5
    expect(el.value).toBe(5);
    document.body.removeChild(el);
  });

  it("vertical mode applies class and orientation", async () => {
    const el = createSlider({ vertical: "" });
    await flush();
    expect(el.shadowRoot.querySelector(".z-slider--vertical")).toBeTruthy();
    expect(thumb(el).getAttribute("aria-orientation")).toBe("vertical");
    document.body.removeChild(el);
  });

  it("show-tooltip renders value bubble", async () => {
    const el = createSlider({ value: "25", "show-tooltip": "" });
    await flush();
    const tooltip = el.shadowRoot.querySelector(".z-slider__tooltip");
    expect(tooltip).toBeTruthy();
    expect(tooltip.textContent).toBe("25");
    document.body.removeChild(el);
  });

  it("marks render with positions", async () => {
    const el = createSlider({ value: "0", min: "0", max: "100" });
    await flush();
    el.marks = [{ value: 0, label: "Low" }, { value: 100, label: "High" }];
    await flush();
    const marks = el.shadowRoot.querySelectorAll(".z-slider__mark");
    expect(marks.length).toBe(2);
    expect(marks[0].querySelector(".z-slider__mark-label").textContent).toBe("Low");
    expect(marks[1].style.left).toBe("100%");
    document.body.removeChild(el);
  });

  it("disabled blocks interaction and sets tabindex -1", async () => {
    const el = createSlider({ value: "50", disabled: "" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    expect(thumb(el).getAttribute("tabindex")).toBe("-1");
    thumb(el).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    expect(el.value).toBe(50);
    document.body.removeChild(el);
  });

  it("does not allow value beyond max via drag", async () => {
    const el = createSlider({ value: "0", min: "0", max: "10", step: "1" });
    await flush();
    mockRect(el.shadowRoot.querySelector(".z-slider"), 100, 20);
    drag(el, 0, 500); // 越界 → 钳制 10
    expect(el.value).toBe(10);
    document.body.removeChild(el);
  });
});
