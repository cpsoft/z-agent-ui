// Test: 原生控件 disabled/checked 属性真实生效（?attr= 字面属性修复）
// Related: [[bug-20260810-q-attr-literal-disabled]]
// Wiki: wiki/bugs/bug-20260810-q-attr-literal-disabled.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../src/components/switch/Switch";
import "../../src/components/accordion-item/AccordionItem";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("regression: q-attr literal disabled", () => {
  it("z-switch disabled reflects to native input disabled attribute", async () => {
    const el = document.createElement("z-switch") as any;
    document.body.appendChild(el);
    await flush();

    el.disabled = true;
    await flush();
    // [WHY] 每次重渲染后 innerHTML 重建，需重新查询（陷阱见 lesson 2）
    const input = el.shadowRoot!.querySelector(".z-switch__native")!;
    expect(input.hasAttribute("disabled")).toBe(true);
    expect(input.getAttribute("disabled")).toBe("");

    el.disabled = false;
    await flush();
    expect(el.shadowRoot!.querySelector(".z-switch__native")!.hasAttribute("disabled")).toBe(false);
    document.body.removeChild(el);
  });

  it("z-switch checked reflects to native input checked attribute", async () => {
    const el = document.createElement("z-switch") as any;
    document.body.appendChild(el);
    await flush();

    el.checked = true;
    await flush();
    expect(el.shadowRoot!.querySelector(".z-switch__native")!.hasAttribute("checked")).toBe(true);

    el.checked = false;
    await flush();
    expect(el.shadowRoot!.querySelector(".z-switch__native")!.hasAttribute("checked")).toBe(false);
    document.body.removeChild(el);
  });

  it("z-switch aria-checked is explicit true/false", async () => {
    const el = document.createElement("z-switch") as any;
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot!.querySelector(".z-switch__native")!.getAttribute("aria-checked")).toBe("false");
    el.checked = true;
    await flush();
    expect(el.shadowRoot!.querySelector(".z-switch__native")!.getAttribute("aria-checked")).toBe("true");
    document.body.removeChild(el);
  });

  it("z-accordion-item disabled reflects to header button disabled attribute", async () => {
    const el = document.createElement("z-accordion-item") as any;
    el.title = "t";
    document.body.appendChild(el);
    await flush();

    el.disabled = true;
    await flush();
    expect(el.shadowRoot!.querySelector("button")!.hasAttribute("disabled")).toBe(true);

    el.disabled = false;
    await flush();
    expect(el.shadowRoot!.querySelector("button")!.hasAttribute("disabled")).toBe(false);
    document.body.removeChild(el);
  });
});
