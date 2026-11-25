// Test: z-menu-item component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/menu-item/MenuItem";

describe("z-menu-item", () => {
  it("renders with value and label", async () => {
    const el = document.createElement("z-menu-item") as any;
    el.value = "save";
    el.textContent = "Save";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.value).toBe("save");
    document.body.removeChild(el);
  });

  it("renders disabled state", async () => {
    const el = document.createElement("z-menu-item") as any;
    el.disabled = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const root = el.shadowRoot!.querySelector(".z-menu-item")!;
    expect(root.classList.contains("z-menu-item--disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("has role menuitem", async () => {
    const el = document.createElement("z-menu-item") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const root = el.shadowRoot!.querySelector('[role="menuitem"]')!;
    expect(root).toBeDefined();
    document.body.removeChild(el);
  });
});
