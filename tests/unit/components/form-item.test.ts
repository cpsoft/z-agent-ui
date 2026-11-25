// Test: z-form-item 字段容器（校验规则/trigger/事件转发/值 API）
// Related: [[2026-08-11-W14-form]]
// Wiki: wiki/planning/TASKS/2026-08-11-W14-form/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi, afterEach } from "vitest";
import "../../../src/components/form-item/FormItem.js";
import "../../../src/components/input/Input.js";
import "../../../src/components/switch/Switch.js";

// [WHY] 假控件：可控的 z-change 发射器（校验机制不依赖控件内部实现，
// 从元素自身 .value/.checked 取值 — DetailForm 先例，故假控件即可全覆盖）
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

function createItem(props: Record<string, string | number | boolean> = {}, controlValue = "abc"): any {
  const el = document.createElement("z-form-item") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  el.innerHTML = `<z-fake-control value="${controlValue}"></z-fake-control>`;
  return el;
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-form-item", () => {
  it("renders label, required mark and no error by default", async () => {
    const el = createItem({ name: "email", label: "Email", required: true });
    await flush();
    expect(el.shadowRoot.querySelector(".z-form-item__label").textContent).toContain("Email");
    expect(el.shadowRoot.querySelector(".z-form-item__required")).toBeTruthy();
    // [WHY] error 行始终占位（布局稳定，见 FormItem.ts render 注释）
    expect(el.shadowRoot.querySelector(".z-form-item__error--hidden")).toBeTruthy();
    expect(el.error).toBe("");
    document.body.removeChild(el);
  });

  it("getValue reads slotted control .value", async () => {
    const el = createItem({ name: "email" }, "user@x.com");
    await flush();
    expect(el.getValue()).toBe("user@x.com");
    document.body.removeChild(el);
  });

  it("getValue reads .checked for switch controls", async () => {
    const el = document.createElement("z-form-item") as any;
    el.setAttribute("name", "agree");
    document.body.appendChild(el);
    el.innerHTML = `<z-switch></z-switch>`;
    await flush();
    const control = el.control as any;
    control.checked = true;
    expect(el.getValue()).toBe(true);
    document.body.removeChild(el);
  });

  it("forwards control z-change with item marker (aggregate is detail.item tagged)", async () => {
    const el = createItem({ name: "email" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    const control = el.control as any;
    control.value = "new@x.com";
    control.emit("z-change", { value: "new@x.com" });
    // [WHY] 同节点双发可辨识：控件原始事件（无 item）+ 转发事件（有 item），
    // 消费方以 detail.item 为准（light DOM 组合无法像 DetailForm 用 shadow 隔离）
    const details = handler.mock.calls.map((c: any) => c[0].detail);
    const forwarded = details.find((d: any) => d.item === el);
    expect(forwarded).toBeTruthy();
    expect(forwarded.name).toBe("email");
    expect(forwarded.value).toBe("new@x.com");
    document.body.removeChild(el);
  });

  it("required empty value fails validate with requiredMessage", async () => {
    const el = createItem({ name: "email", required: true, "required-message": "Email is required" });
    await flush();
    const control = el.control as any;
    control.value = "";
    expect(el.validate()).toBe(false);
    expect(el.error).toBe("Email is required");
    await flush();
    // error 区域 role=alert + 非法态落到控件上
    // [WHY] 不设 error 属性：z-input 类控件会重渲染渲染自身错误行 → 布局增高 →
    // blur 校验把按钮推走 → click 丢失（见 FormItem.ts _setError 注释）
    expect(el.shadowRoot.querySelector(".z-form-item__error").getAttribute("role")).toBe("alert");
    // 假控件没有 invalid 属性 → 退回 data-invalid 属性钩子（宿主自写控件的兼容路径）
    expect(control.hasAttribute("data-invalid")).toBe(true);
    // [WHY 这里刻意断言「不再写 aria-describedby」] 旧实现写过
    // `aria-describedby="z-form-item-error"`，而那个 id 在本组件 shadow 内、控件在
    // light DOM —— 跨 shadow 的 IDREF 永远解析不到，还会顶掉控件自己算好的关联。
    expect(control.hasAttribute("aria-describedby")).toBe(false);
    document.body.removeChild(el);
  });

  it("required non-empty value passes and clears error", async () => {
    const el = createItem({ name: "email", required: true });
    await flush();
    expect(el.validate()).toBe(true);
    expect(el.error).toBe("");
    expect(el.shadowRoot.querySelector(".z-form-item__error--hidden")).toBeTruthy();
    document.body.removeChild(el);
  });

  it("min/max validate numeric value", async () => {
    const el = createItem({ name: "age", min: 18, max: 65 });
    await flush();
    const control = el.control as any;
    control.value = "10";
    expect(el.validate()).toBe(false);
    control.value = "30";
    expect(el.validate()).toBe(true);
    control.value = "80";
    expect(el.validate()).toBe(false);
    document.body.removeChild(el);
  });

  it("minlength/maxlength validate string length", async () => {
    const el = createItem({ name: "code", minlength: 3, maxlength: 5 });
    await flush();
    const control = el.control as any;
    control.value = "ab";
    expect(el.validate()).toBe(false);
    control.value = "abcde";
    expect(el.validate()).toBe(true);
    control.value = "abcdef";
    expect(el.validate()).toBe(false);
    document.body.removeChild(el);
  });

  it("pattern validates string", async () => {
    const el = createItem({ name: "phone", pattern: "^\\d{3}-\\d{4}$" });
    await flush();
    const control = el.control as any;
    control.value = "123-4567";
    expect(el.validate()).toBe(true);
    control.value = "1234";
    expect(el.validate()).toBe(false);
    document.body.removeChild(el);
  });

  it("invalid pattern regex is skipped without throwing", async () => {
    const el = createItem({ name: "x", pattern: "[" });
    await flush();
    expect(el.validate()).toBe(true);
    document.body.removeChild(el);
  });

  it("rules array validators run; string return is error", async () => {
    const el = createItem({ name: "tag" });
    el.rules = [(v) => (String(v).length > 2 ? true : "too short")];
    await flush();
    const control = el.control as any;
    control.value = "ab";
    expect(el.validate()).toBe(false);
    expect(el.error).toBe("too short");
    control.value = "abcd";
    expect(el.validate()).toBe(true);
    document.body.removeChild(el);
  });

  it("async rules return Promise<boolean>", async () => {
    const el = createItem({ name: "name" });
    el.rules = [(v) => Promise.resolve(String(v) === "ok" ? true : "not ok")];
    await flush();
    const control = el.control as any;
    control.value = "bad";
    const result = el.validate();
    expect(result).toBeInstanceOf(Promise);
    expect(await result).toBe(false);
    control.value = "ok";
    expect(await el.validate()).toBe(true);
    document.body.removeChild(el);
  });

  it("trigger=submit: control change does not validate, explicit validate() does", async () => {
    const el = createItem({ name: "email", required: true, trigger: "submit" });
    await flush();
    const control = el.control as any;
    control.value = "";
    control.emit("z-change", { value: "" });
    expect(el.error).toBe(""); // 未校验
    expect(el.validate()).toBe(false);
    expect(el.error).toBeTruthy();
    document.body.removeChild(el);
  });

  it("trigger=blur: z-blur triggers validation", async () => {
    const el = createItem({ name: "email", required: true, trigger: "blur" });
    await flush();
    const control = el.control as any;
    control.value = "";
    control.emit("z-blur", {});
    expect(el.error).toBeTruthy();
    document.body.removeChild(el);
  });

  it("setValue writes control and validates", async () => {
    const el = createItem({ name: "email", required: true });
    await flush();
    el.setValue("new@x.com");
    expect(el.control.value).toBe("new@x.com");
    expect(el.getValue()).toBe("new@x.com");
    document.body.removeChild(el);
  });

  it("reset restores initial value and clears error", async () => {
    const el = createItem({ name: "email", required: true }, "init@x.com");
    await flush();
    const control = el.control as any;
    control.value = "";
    expect(el.validate()).toBe(false);
    el.reset();
    expect(control.value).toBe("init@x.com");
    expect(el.error).toBe("");
    document.body.removeChild(el);
  });

  it("works with real z-input control end to end", async () => {
    const el = document.createElement("z-form-item") as any;
    el.setAttribute("name", "user");
    el.setAttribute("required", "");
    document.body.appendChild(el);
    el.innerHTML = `<z-input></z-input>`;
    await flush();
    const control = el.control as any;
    const field = control.shadowRoot.querySelector("input");
    field.value = "";
    field.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.error).toBeTruthy();
    // 真 z-input 有 invalid 属性 ⇒ 走语义路径：非法态落在内部 input 上（读屏读得到），
    // 不再依赖只有本库 CSS 认识的 data-invalid
    expect(control.invalid).toBe(true);
    // [WHY 重新查一次字段] `invalid` 是 @property，写它会让控件重渲染，
    // 旧 `field` 引用指向的是已被替换掉的节点 —— 在它上面断言 `aria-invalid`
    // 会永远读到重渲染之前的旧值（"false"），这条断言就白写了。
    await flush();
    const next = control.shadowRoot.querySelector("input");
    expect(next).not.toBe(field);
    expect(next.getAttribute("aria-invalid")).toBe("true");
    document.body.removeChild(el);
  });
});
