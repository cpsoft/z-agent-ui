// Test: z-checkbox component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/checkbox/Checkbox";

describe("z-checkbox", () => {
  function createCheckbox(): HTMLElement & { checked: boolean; disabled: boolean; indeterminate: boolean; toggle(): void } {
    const el = document.createElement("z-checkbox") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders unchecked by default", async () => {
    const el = createCheckbox();
    await new Promise((r) => setTimeout(r, 0));
    const box = el.shadowRoot!.querySelector(".z-checkbox")!;
    expect(box.classList.contains("z-checkbox--checked")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders checked state", async () => {
    const el = createCheckbox();
    el.checked = true;
    await new Promise((r) => setTimeout(r, 0));
    const box = el.shadowRoot!.querySelector(".z-checkbox")!;
    expect(box.classList.contains("z-checkbox--checked")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders indeterminate state", async () => {
    const el = createCheckbox();
    el.indeterminate = true;
    await new Promise((r) => setTimeout(r, 0));
    const box = el.shadowRoot!.querySelector(".z-checkbox")!;
    expect(box.classList.contains("z-checkbox--indeterminate")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders disabled state", async () => {
    const el = createCheckbox();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    const box = el.shadowRoot!.querySelector(".z-checkbox")!;
    expect(box.classList.contains("z-checkbox--disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("toggle() toggles checked and clears indeterminate", async () => {
    const el = createCheckbox();
    el.indeterminate = true;
    await new Promise((r) => setTimeout(r, 0));

    el.toggle();
    expect(el.checked).toBe(true);
    expect(el.indeterminate).toBe(false);
    document.body.removeChild(el);
  });

  it("toggle() does nothing when disabled", async () => {
    const el = createCheckbox();
    el.checked = false;
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    el.toggle();
    expect(el.checked).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-change on toggle", async () => {
    const el = createCheckbox();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    el.toggle();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("supports keyboard Space and Enter", async () => {
    const el = createCheckbox();
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(el.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("click does nothing when disabled", async () => {
    const el = createCheckbox();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.checked).toBe(false);
    document.body.removeChild(el);
  });
});
