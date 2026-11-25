// Test: z-number-input 数字输入（步进/键盘/min-max 钳制/precision）
// Related: [[2026-08-11-W13-form-basics]]
// Wiki: wiki/planning/TASKS/2026-08-11-W13-form-basics/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/number-input/NumberInput.js";

function createNumberInput(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-number-input") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function clickStep(el: any, up: boolean): void {
  const btn = el.shadowRoot.querySelector(up ? ".z-number-input__step--up" : ".z-number-input__step--down");
  btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-number-input", () => {
  it("renders field with formatted value", async () => {
    const el = createNumberInput({ value: "42" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    expect(field).toBeTruthy();
    expect(field.value).toBe("42");
    expect(el.value).toBe(42);
    document.body.removeChild(el);
  });

  it("renders up/down step buttons", async () => {
    const el = createNumberInput();
    await flush();
    expect(el.shadowRoot.querySelector(".z-number-input__step--up")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".z-number-input__step--down")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("step up button increments by step and emits z-change", async () => {
    const el = createNumberInput({ value: "10", step: "5" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    clickStep(el, true);
    expect(el.value).toBe(15);
    expect(handler.mock.calls[0][0].detail.value).toBe(15);
    document.body.removeChild(el);
  });

  it("step down button decrements by step", async () => {
    const el = createNumberInput({ value: "10", step: "5" });
    await flush();
    clickStep(el, false);
    expect(el.value).toBe(5);
    document.body.removeChild(el);
  });

  it("clamps value to max on step up", async () => {
    const el = createNumberInput({ value: "8", max: "10", step: "5" });
    await flush();
    clickStep(el, true);
    expect(el.value).toBe(10);
    document.body.removeChild(el);
  });

  it("clamps value to min on step down", async () => {
    const el = createNumberInput({ value: "3", min: "0", step: "5" });
    await flush();
    clickStep(el, false);
    expect(el.value).toBe(0);
    document.body.removeChild(el);
  });

  it("keyboard ArrowUp/ArrowDown step the value", async () => {
    const el = createNumberInput({ value: "10" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(el.value).toBe(11);
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(el.value).toBe(10);
    document.body.removeChild(el);
  });

  it("applies precision rounding on commit", async () => {
    const el = createNumberInput({ value: "0.1", step: "0.1", precision: "2" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    field.value = "0.3";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.value).toBe(0.3);
    clickStep(el, true);
    // 0.3 + 0.1 浮点尾差 → precision 归正为 0.4
    expect(el.value).toBe(0.4);
    document.body.removeChild(el);
  });

  it("emits z-input with raw string during typing", async () => {
    const el = createNumberInput({ value: "1" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-input", handler);
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    field.value = "12";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(handler.mock.calls[0][0].detail.value).toBe("12");
    document.body.removeChild(el);
  });

  it("reverts field to value on invalid commit", async () => {
    const el = createNumberInput({ value: "5" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    field.value = "abc";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.value).toBe(5);
    expect(field.value).toBe("5");
    document.body.removeChild(el);
  });

  it("disabled blocks step buttons and keyboard", async () => {
    const el = createNumberInput({ value: "5", disabled: "" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    clickStep(el, true);
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    field.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
    expect(el.value).toBe(5);
    expect(handler).not.toHaveBeenCalled();
    expect(field.disabled).toBe(true);
    document.body.removeChild(el);
  });

  it("emits z-focus / z-blur", async () => {
    const el = createNumberInput();
    await flush();
    const focusHandler = vi.fn();
    const blurHandler = vi.fn();
    el.addEventListener("z-focus", focusHandler);
    el.addEventListener("z-blur", blurHandler);
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(focusHandler).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot.querySelector(".z-number-input--focused")).toBeTruthy();
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(blurHandler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("renders placeholder attribute", async () => {
    const el = createNumberInput({ placeholder: "Enter count" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-number-input__field");
    expect(field.getAttribute("placeholder")).toBe("Enter count");
    document.body.removeChild(el);
  });

  it("step buttons work when clicking inner svg path (regression: browser target is svg)", async () => {
    // [WHY] 回归 [[bug-20260811-step-svg-click]]: 按钮内 svg 使真实浏览器
    // e.target 是 path, classList 判断失效; 必须 closest
    const el = createNumberInput({ value: "5" });
    await flush();
    const path = el.shadowRoot.querySelector(".z-number-input__step--up svg path");
    path.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.value).toBe(6);
    document.body.removeChild(el);
  });

  it("stepUp()/stepDown() programmatic methods work", async () => {
    const el = createNumberInput({ value: "5", step: "2" });
    await flush();
    el.stepUp();
    expect(el.value).toBe(7);
    el.stepDown();
    expect(el.value).toBe(5);
    document.body.removeChild(el);
  });
});
