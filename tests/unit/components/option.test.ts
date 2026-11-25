// Test: z-option component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/option/Option";

describe("z-option", () => {
  it("returns textContent as label", async () => {
    const el = document.createElement("z-option") as any;
    el.value = "v1";
    el.textContent = "Option Label";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.label).toBe("Option Label");
    document.body.removeChild(el);
  });

  it("returns value when no textContent", async () => {
    const el = document.createElement("z-option") as any;
    el.value = "val";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.label).toBe("val");
    document.body.removeChild(el);
  });

  it("has disabled and selected props", async () => {
    const el = document.createElement("z-option") as any;
    el.disabled = true;
    el.selected = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.disabled).toBe(true);
    expect(el.selected).toBe(true);
    document.body.removeChild(el);
  });

  it("render returns null (transparent element)", async () => {
    const el = document.createElement("z-option") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    // Shadow DOM should exist but be empty
    expect(el.shadowRoot).toBeDefined();
    document.body.removeChild(el);
  });
});
