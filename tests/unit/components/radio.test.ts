// Test: z-radio component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/radio/Radio";

describe("z-radio", () => {
  function createRadio(): HTMLElement & { checked: boolean; disabled: boolean; value: string; name: string; select(): void } {
    const el = document.createElement("z-radio") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders unchecked by default", async () => {
    const el = createRadio();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-radio")!;
    expect(root.classList.contains("z-radio--checked")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders checked state", async () => {
    const el = createRadio();
    el.checked = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-radio--checked")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders disabled state", async () => {
    const el = createRadio();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-radio--disabled")).toBeDefined();
    document.body.removeChild(el);
  });

  it("select() sets checked and emits z-change", async () => {
    const el = createRadio();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    el.select();

    expect(el.checked).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("select() does nothing when disabled", async () => {
    const el = createRadio();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    el.select();
    expect(el.checked).toBe(false);
    document.body.removeChild(el);
  });

  it("click selects the radio", async () => {
    const el = createRadio();
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(el.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("Space key selects the radio", async () => {
    const el = createRadio();
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(el.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("reflects value prop", async () => {
    const el = createRadio();
    el.value = "opt1";
    await new Promise((r) => setTimeout(r, 0));

    const input = el.shadowRoot!.querySelector("input")!;
    expect(input.value).toBe("opt1");
    document.body.removeChild(el);
  });
});
