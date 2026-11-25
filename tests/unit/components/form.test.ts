// Test: z-form 表单容器（聚合校验/提交/值 API/事件）
// Related: [[2026-08-11-W14-form]]
// Wiki: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/form/Form.js";

class FakeControl extends HTMLElement {
  value: unknown = "";
  checked = false;
  static get observedAttributes(): string[] {
    return ["value"];
  }
  attributeChangedCallback(name: string, _old: string | null, val: string | null): void {
    if (name === "value" && val !== null) this.value = val;
  }
  emit(name: string, detail: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { bubbles: true, composed: true, detail }),
    );
  }
}
if (!customElements.get("z-fake-control")) {
  customElements.define("z-fake-control", FakeControl);
}

function createForm(): any {
  const el = document.createElement("z-form") as any;
  document.body.appendChild(el);
  el.innerHTML = `
    <z-form-item name="email" required required-message="Email required">
      <z-fake-control></z-fake-control>
    </z-form-item>
    <z-form-item name="age">
      <z-fake-control value="20"></z-fake-control>
    </z-form-item>
    <z-form-item>
      <z-fake-control value="ignored"></z-fake-control>
    </z-form-item>
  `;
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function controlOf(el: any, name: string): any {
  const item = Array.from(el.querySelectorAll("z-form-item")).find(
    (i: any) => i.getAttribute("name") === name,
  );
  return (item as any).control;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-form", () => {
  it("renders form with slot", async () => {
    const el = createForm();
    await flush();
    const form = el.shadowRoot.querySelector("form");
    expect(form).toBeTruthy();
    expect(form.getAttribute("novalidate")).not.toBeNull();
    expect(el.querySelectorAll("z-form-item").length).toBe(3);
    document.body.removeChild(el);
  });

  it("getValues aggregates named items, skips unnamed", async () => {
    const el = createForm();
    await flush();
    const values = el.getValues();
    expect(values).toEqual({ email: "", age: "20" });
    expect(Object.prototype.hasOwnProperty.call(values, "unnamed")).toBe(false);
    document.body.removeChild(el);
  });

  it("setValues distributes to matching items", async () => {
    const el = createForm();
    await flush();
    el.setValues({ email: "a@b.com", age: "30", unknown: "x" });
    expect(controlOf(el, "email").value).toBe("a@b.com");
    expect(controlOf(el, "age").value).toBe("30");
    document.body.removeChild(el);
  });

  it("validate aggregates all items", async () => {
    const el = createForm();
    await flush();
    expect(el.validate()).toBe(false);
    controlOf(el, "email").value = "a@b.com";
    expect(el.validate()).toBe(true);
    document.body.removeChild(el);
  });

  it("errors maps item name to message", async () => {
    const el = createForm();
    await flush();
    el.validate();
    expect(el.errors).toEqual({ email: "Email required" });
    document.body.removeChild(el);
  });

  it("submit valid emits z-submit with values", async () => {
    const el = createForm();
    await flush();
    controlOf(el, "email").value = "a@b.com";
    const handler = vi.fn();
    el.addEventListener("z-submit", handler);
    el.submit();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.valid).toBe(true);
    expect(handler.mock.calls[0][0].detail.values).toEqual({ email: "a@b.com", age: "20" });
    document.body.removeChild(el);
  });

  it("submit invalid emits z-invalid with errors", async () => {
    const el = createForm();
    await flush();
    const submit = vi.fn();
    const invalid = vi.fn();
    el.addEventListener("z-submit", submit);
    el.addEventListener("z-invalid", invalid);
    el.submit();
    expect(submit).not.toHaveBeenCalled();
    expect(invalid).toHaveBeenCalledTimes(1);
    expect(invalid.mock.calls[0][0].detail.valid).toBe(false);
    expect(invalid.mock.calls[0][0].detail.errors).toEqual({ email: "Email required" });
    document.body.removeChild(el);
  });

  it("reset resets items to initial and emits form-level z-reset", async () => {
    const el = createForm();
    await flush();
    controlOf(el, "email").value = "changed@x.com";
    const handler = vi.fn();
    el.addEventListener("z-reset", handler);
    el.reset();
    expect(controlOf(el, "email").value).toBe("");
    // [WHY] item 级 z-reset（detail 带 name）与 form 聚合 z-reset（detail 空）并存；
    // form 聚合由 reset() 统一发出
    const calls = handler.mock.calls.map((c: any) => c[0]);
    const formLevel = calls.filter((c: any) => !c.detail);
    expect(formLevel.length).toBe(1);
    document.body.removeChild(el);
  });

  it("validate-on-change validates when item changes", async () => {
    const el = createForm();
    el.setAttribute("validate-on-change", "");
    await flush();
    const email = controlOf(el, "email");
    email.value = "";
    email.emit("z-change", { value: "" });
    expect(el.errors.email).toBeTruthy();
    document.body.removeChild(el);
  });

  it("emits aggregate z-change with values/field/value", async () => {
    const el = createForm();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const email = controlOf(el, "email");
    email.value = "new@x.com";
    email.emit("z-change", { value: "new@x.com" });
    // [WHY] form host 会同时收到 form-item 转发（detail 无 values）与聚合事件，
    // 聚合事件以 detail.values 为准
    const details = handler.mock.calls.map((c: any) => c[0].detail);
    const agg = details.find((d: any) => d.values);
    expect(agg).toBeTruthy();
    expect(agg.field).toBe("email");
    expect(agg.value).toBe("new@x.com");
    expect(agg.values).toEqual({ email: "new@x.com", age: "20" });
    document.body.removeChild(el);
  });

  it("native form submit event triggers custom submit flow", async () => {
    const el = createForm();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-invalid", handler);
    const form = el.shadowRoot.querySelector("form");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("async rules in item make form validate() async", async () => {
    const el = createForm();
    await flush();
    controlOf(el, "email").value = "a@b.com";
    const ageItem = Array.from(el.querySelectorAll("z-form-item")).find(
      (i: any) => i.getAttribute("name") === "age",
    ) as any;
    ageItem.rules = [(v) => Promise.resolve(v === "20" ? true : "wrong")];
    const result = el.validate();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(true);
    document.body.removeChild(el);
  });
});
