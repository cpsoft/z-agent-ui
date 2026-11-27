import { afterEach, describe, expect, it } from "vitest";
import { BaseElement, ContextConsumer, defineElement, html } from "../../../src/core/index.js";
import { FORM_CONTEXT, type FormContextValue } from "../../../src/components/form/index.js";

class TestFormConsumer extends BaseElement {
  ctx = this.addController(
    new ContextConsumer<FormContextValue>(this, { context: FORM_CONTEXT }),
  );

  render(): string {
    const v = this.ctx.value;
    return html`<span class="state">${v ? `${v.disabled}|${v.readonly}|${v.controlSize}` : "none"}</span>`;
  }
}

defineElement("z-test-form-consumer", TestFormConsumer);

describe("z-form ContextProvider (FORM_CONTEXT)", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("向深层子控件下发 disabled / readonly / controlSize 并在属性变化时响应式更新", async () => {
    const form = document.createElement("z-form") as any;
    const wrapper = document.createElement("div");
    const consumer = document.createElement("z-test-form-consumer") as TestFormConsumer;
    wrapper.appendChild(consumer);
    form.appendChild(wrapper);
    document.body.appendChild(form);
    await Promise.resolve();
    await Promise.resolve();

    expect(consumer.ctx.value).toEqual({ disabled: false, readonly: false, controlSize: "md" });
    expect(consumer.shadowRoot?.querySelector(".state")?.textContent).toBe("false|false|md");

    form.disabled = true;
    form.controlSize = "sm";
    await Promise.resolve();
    await Promise.resolve();

    expect(consumer.ctx.value).toEqual({ disabled: true, readonly: false, controlSize: "sm" });
    expect(consumer.shadowRoot?.querySelector(".state")?.textContent).toBe("true|false|sm");
  });
});
