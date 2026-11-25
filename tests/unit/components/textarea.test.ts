// Test: z-textarea 独立多行输入（autosize/counter/resize 策略）
// Related: [[2026-08-11-W13-form-basics]]
// Wiki: wiki/planning/TASKS/2026-08-11-W13-form-basics/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/textarea/Textarea.js";

function createTextarea(attrs: Record<string, string> = {}): any {
  const el = document.createElement("z-textarea") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-textarea", () => {
  it("renders a textarea field with initial value", async () => {
    const el = createTextarea({ value: "hello" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field).toBeTruthy();
    expect(field.value).toBe("hello");
    document.body.removeChild(el);
  });

  it("reflects placeholder and rows attributes", async () => {
    const el = createTextarea({ placeholder: "Type here", rows: "5" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.getAttribute("placeholder")).toBe("Type here");
    expect(field.getAttribute("rows")).toBe("5");
    document.body.removeChild(el);
  });

  it("emits z-input with raw value while typing and updates property", async () => {
    const el = createTextarea();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-input", handler);
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    field.value = "abc";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(handler.mock.calls[0][0].detail.value).toBe("abc");
    expect(el.value).toBe("abc");
    document.body.removeChild(el);
  });

  it("emits z-change on change event", async () => {
    const el = createTextarea();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    field.value = "new";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(handler.mock.calls[0][0].detail.value).toBe("new");
    document.body.removeChild(el);
  });

  it("sets disabled attribute on field and blocks interaction state", async () => {
    const el = createTextarea({ disabled: "" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.disabled).toBe(true);
    expect(el.shadowRoot.querySelector(".z-textarea--disabled")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("supports readonly state", async () => {
    const el = createTextarea({ readonly: "" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.readOnly).toBe(true);
    expect(el.shadowRoot.querySelector(".z-textarea--readonly")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("applies maxlength attribute to field", async () => {
    const el = createTextarea({ maxlength: "10" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.getAttribute("maxlength")).toBe("10");
    document.body.removeChild(el);
  });

  it("shows counter with length when counter + maxlength set", async () => {
    const el = createTextarea({ counter: "", maxlength: "10", value: "abc" });
    await flush();
    const counter = el.shadowRoot.querySelector(".z-textarea__counter");
    expect(counter).toBeTruthy();
    expect(counter.textContent).toBe("3/10");
    // typing updates counter without re-render
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    field.value = "abcd";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(counter.textContent).toBe("4/10");
    document.body.removeChild(el);
  });

  it("autosize grows height via scrollHeight on input", async () => {
    const el = createTextarea({ autosize: "" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    Object.defineProperty(field, "scrollHeight", { value: 120, configurable: true });
    field.value = "line1\nline2";
    field.dispatchEvent(new Event("input", { bubbles: true }));
    expect(field.style.height).toBe("120px");
    document.body.removeChild(el);
  });

  it("resize strategy maps to CSS class", async () => {
    const el = createTextarea({ resize: "none" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.classList.contains("z-textarea__field--resize-none")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders label, error (role=alert) and hint", async () => {
    const el = createTextarea({ label: "Notes", error: "Required", hint: "Optional" });
    await flush();
    expect(el.shadowRoot.querySelector(".z-textarea__label").textContent).toBe("Notes");
    const err = el.shadowRoot.querySelector(".z-textarea__error");
    expect(err).toBeTruthy();
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent).toBe("Required");
    // error 优先于 hint 显示
    expect(el.shadowRoot.querySelector(".z-textarea__hint")).toBeFalsy();
    document.body.removeChild(el);
  });

  it("emits z-focus / z-blur", async () => {
    const el = createTextarea();
    await flush();
    const focusHandler = vi.fn();
    const blurHandler = vi.fn();
    el.addEventListener("z-focus", focusHandler);
    el.addEventListener("z-blur", blurHandler);
    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(focusHandler).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot.querySelector(".z-textarea--focused")).toBeTruthy();
    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(blurHandler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("escapes HTML in value", async () => {
    const el = createTextarea({ value: "<script>alert(1)</script>" });
    await flush();
    const field = el.shadowRoot.querySelector(".z-textarea__field");
    expect(field.value).toBe("<script>alert(1)</script>");
    expect(el.shadowRoot.innerHTML.includes("<script>")).toBe(false);
    document.body.removeChild(el);
  });

  it("clear() resets value and emits z-input + z-change", async () => {
    const el = createTextarea({ value: "x" });
    await flush();
    const inputHandler = vi.fn();
    const changeHandler = vi.fn();
    el.addEventListener("z-input", inputHandler);
    el.addEventListener("z-change", changeHandler);
    el.clear();
    expect(el.value).toBe("");
    expect(inputHandler).toHaveBeenCalledTimes(1);
    expect(changeHandler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });
});
