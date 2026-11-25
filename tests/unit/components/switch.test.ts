// Test: z-switch component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/switch/Switch";

describe("z-switch", () => {
  function createSwitch(): HTMLElement & { checked: boolean; disabled: boolean; size: string; toggle(): void } {
    const el = document.createElement("z-switch") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders unchecked by default", async () => {
    const el = createSwitch();
    await new Promise((r) => setTimeout(r, 0));
    const sw = el.shadowRoot!.querySelector(".z-switch")!;
    expect(sw.classList.contains("z-switch--checked")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders checked state", async () => {
    const el = createSwitch();
    el.checked = true;
    await new Promise((r) => setTimeout(r, 0));
    const sw = el.shadowRoot!.querySelector(".z-switch")!;
    expect(sw.classList.contains("z-switch--checked")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders default size md", async () => {
    const el = createSwitch();
    await new Promise((r) => setTimeout(r, 0));
    const sw = el.shadowRoot!.querySelector(".z-switch")!;
    expect(sw.classList.contains("z-switch--md")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders sm size", async () => {
    const el = createSwitch();
    el.size = "sm";
    await new Promise((r) => setTimeout(r, 0));
    const sw = el.shadowRoot!.querySelector(".z-switch")!;
    expect(sw.classList.contains("z-switch--sm")).toBe(true);
    document.body.removeChild(el);
  });

  it("toggle() toggles checked", async () => {
    const el = createSwitch();
    await new Promise((r) => setTimeout(r, 0));
    el.toggle();
    expect(el.checked).toBe(true);
    el.toggle();
    expect(el.checked).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-change on toggle", async () => {
    const el = createSwitch();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    el.toggle();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.checked).toBe(true);
    document.body.removeChild(el);
  });

  it("does not toggle when disabled", async () => {
    const el = createSwitch();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    el.toggle();
    expect(el.checked).toBe(false);
    document.body.removeChild(el);
  });

  it("renders disabled state", async () => {
    const el = createSwitch();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    const sw = el.shadowRoot!.querySelector(".z-switch")!;
    expect(sw.classList.contains("z-switch--disabled")).toBe(true);
    document.body.removeChild(el);
  });
});
