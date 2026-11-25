// Test: z-input component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/input/Input";

describe("z-input", () => {
  function createInput(): HTMLElement & { value: string; type: string; label: string; error: string; hint: string; disabled: boolean; readonly: boolean; required: boolean; clearable: boolean; multiline: boolean; placeholder: string; clear(): void; focus(): void; blur(): void; select(): void } {
    const el = document.createElement("z-input") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders an input element", async () => {
    const el = createInput();
    await new Promise((r) => setTimeout(r, 0));
    const field = el.shadowRoot!.querySelector("input");
    expect(field).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders a textarea when multiline", async () => {
    const el = createInput();
    el.multiline = true;
    await new Promise((r) => setTimeout(r, 0));
    const field = el.shadowRoot!.querySelector("textarea");
    expect(field).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows label when label prop is set", async () => {
    const el = createInput();
    el.label = "Username";
    await new Promise((r) => setTimeout(r, 0));
    const label = el.shadowRoot!.querySelector(".z-input__label");
    expect(label).toBeDefined();
    expect(label!.textContent).toContain("Username");
    document.body.removeChild(el);
  });

  it("shows required indicator when required", async () => {
    const el = createInput();
    el.label = "Field";
    el.required = true;
    await new Promise((r) => setTimeout(r, 0));
    const star = el.shadowRoot!.querySelector(".z-input__required");
    expect(star).toBeDefined();
    document.body.removeChild(el);
  });

  it("shows error message when error prop is set", async () => {
    const el = createInput();
    el.error = "Invalid value";
    await new Promise((r) => setTimeout(r, 0));
    const err = el.shadowRoot!.querySelector(".z-input__error");
    expect(err).toBeDefined();
    expect(err!.textContent).toContain("Invalid value");
    document.body.removeChild(el);
  });

  it("shows hint when hint is set and no error", async () => {
    const el = createInput();
    el.hint = "Enter your name";
    await new Promise((r) => setTimeout(r, 0));
    const hint = el.shadowRoot!.querySelector(".z-input__hint");
    expect(hint).toBeDefined();
    document.body.removeChild(el);
  });

  it("hides hint when error is shown", async () => {
    const el = createInput();
    el.hint = "Help text";
    el.error = "Error!";
    await new Promise((r) => setTimeout(r, 0));
    const hint = el.shadowRoot!.querySelector(".z-input__hint");
    expect(hint).toBeNull();
    document.body.removeChild(el);
  });

  it("syncs value to inner field", async () => {
    const el = createInput();
    el.value = "hello";
    await new Promise((r) => setTimeout(r, 0));
    const field = el.shadowRoot!.querySelector("input")!;
    expect(field.value).toBe("hello");
    document.body.removeChild(el);
  });

  it("renders clear button when clearable and has value", async () => {
    const el = createInput();
    el.clearable = true;
    el.value = "text";
    await new Promise((r) => setTimeout(r, 0));
    const clear = el.shadowRoot!.querySelector(".z-input__clear");
    expect(clear).toBeDefined();
    document.body.removeChild(el);
  });

  it("clear() resets value", async () => {
    const el = createInput();
    el.value = "text";
    await new Promise((r) => setTimeout(r, 0));
    el.clear();
    expect(el.value).toBe("");
    document.body.removeChild(el);
  });

  it("emits z-input on typing", async () => {
    const el = createInput();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-input", handler);

    const field = el.shadowRoot!.querySelector("input")! as HTMLInputElement;
    field.value = "new";
    field.dispatchEvent(new Event("input", { bubbles: true }));

    expect(handler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("emits z-focus and z-blur", async () => {
    const el = createInput();
    await new Promise((r) => setTimeout(r, 0));

    const focusHandler = vi.fn();
    const blurHandler = vi.fn();
    el.addEventListener("z-focus", focusHandler);
    el.addEventListener("z-blur", blurHandler);

    el.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(focusHandler).toHaveBeenCalled();

    el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    expect(blurHandler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("renders disabled state", async () => {
    const el = createInput();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    const wrapper = el.shadowRoot!.querySelector(".z-input__wrapper")!;
    expect(wrapper.classList.contains("z-input--disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders readonly state", async () => {
    const el = createInput();
    el.readonly = true;
    await new Promise((r) => setTimeout(r, 0));
    const wrapper = el.shadowRoot!.querySelector(".z-input__wrapper")!;
    expect(wrapper.classList.contains("z-input--readonly")).toBe(true);
    document.body.removeChild(el);
  });

  // Related: Gitee IKRAOT —— 原生日期时间类型 + min/max/step 透传
  describe("native date-time types (IKRAOT)", () => {
    it.each(["date", "month", "datetime-local", "time"] as const)(
      "renders type=%s as a native input",
      async (type) => {
        const el = createInput();
        el.type = type;
        await new Promise((r) => setTimeout(r, 0));
        const field = el.shadowRoot!.querySelector("input")!;
        // 断言原生 type 而不是只断言属性存在：被 app 层改写成 text 就取不到日期选择器
        expect(field.type).toBe(type);
        document.body.removeChild(el);
      },
    );

    it("passes min/max/step through to the field", async () => {
      const el = createInput() as any;
      el.type = "date";
      el.min = "2026-01-01";
      el.max = "2026-12-31";
      el.step = "7";
      await new Promise((r) => setTimeout(r, 0));
      const field = el.shadowRoot!.querySelector("input")!;
      expect(field.getAttribute("min")).toBe("2026-01-01");
      expect(field.getAttribute("max")).toBe("2026-12-31");
      expect(field.getAttribute("step")).toBe("7");
      document.body.removeChild(el);
    });

    it("accepts step=any for number fields", async () => {
      const el = createInput() as any;
      el.type = "number";
      el.step = "any";
      await new Promise((r) => setTimeout(r, 0));
      const field = el.shadowRoot!.querySelector("input")!;
      // [WHY] 属性若声明成 number，`any` 会被转成 NaN 或直接丢弃 —— 这条锁住"用 string"的决定
      expect(field.getAttribute("step")).toBe("any");
      document.body.removeChild(el);
    });

    it("does not emit min/max/step on textarea", async () => {
      const el = createInput() as any;
      el.multiline = true;
      el.min = "1";
      el.max = "9";
      el.step = "2";
      await new Promise((r) => setTimeout(r, 0));
      const area = el.shadowRoot!.querySelector("textarea")!;
      expect(area.hasAttribute("min")).toBe(false);
      expect(area.hasAttribute("max")).toBe(false);
      expect(area.hasAttribute("step")).toBe(false);
      document.body.removeChild(el);
    });

    it("renders a non-string value as text", async () => {
      const el = createInput() as any;
      el.type = "date";
      // [WHY] 脚本层常把 Date / number 直接绑到 value。
      // 注意：这条只保证"绑定后能正常渲染"，不防 escapeAttr 的回归 ——
      // @property({type: String}) 的 setter 已经把值转成字符串了，
      // 所以就算 escapeAttr 改回只收 string 这条也不会红。
      // escapeAttr 本身的行为由 tests/unit/core/template.test.ts 守。
      expect(() => { el.value = 1729000000000 as any; }).not.toThrow();
      await new Promise((r) => setTimeout(r, 0));
      const field = el.shadowRoot!.querySelector("input")!;
      expect(field.getAttribute("value")).toBe("1729000000000");
      document.body.removeChild(el);
    });
  });
});

// ── 必填星号：视觉记号，不是名字的一部分（2026-11-16）─────────────────────
//
// [WHY] `required` 的视觉记号 `*` 原来裸写在 `<label for>` 里面 —— 而 `<label>`
// 正是这个字段的**可访问名来源**。真机 CDP 实测（改之前）：`name="用户名*"`，
// 读屏念「用户名 星号 编辑框」。语义上「必填」已经由原生 `required` 属性带给
// 无障碍树（实测 AX `required=true`），这个星号纯属噪声。
describe("z-input required 标记", () => {
  it("星号不进无障碍名（required 由属性表达，不靠字体里的符号）", async () => {
    const el = document.createElement("z-input") as any;
    el.label = "用户名";
    el.required = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const label = el.shadowRoot!.querySelector(".z-input__label") as HTMLElement;
    const star = label.querySelector(".z-input__required") as HTMLElement;
    expect(star, "前置：视觉星号还在（不能被删掉）").toBeTruthy();
    expect(star.getAttribute("aria-hidden"), "留着它 = 读屏念「用户名 星号」").toBe("true");
    // 语义仍在：原生 required 才是无障碍树的来源
    expect((el.shadowRoot!.querySelector(".z-input__field") as HTMLInputElement).required).toBe(true);
    document.body.removeChild(el);
  });
});
