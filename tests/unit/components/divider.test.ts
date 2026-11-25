// Test: z-divider component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/divider/Divider";

describe("z-divider", () => {
  it("renders horizontal by default", async () => {
    const el = document.createElement("z-divider") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-divider")!;
    expect(root.classList.contains("z-divider--horizontal")).toBe(true);
    expect(root.getAttribute("aria-orientation")).toBe("horizontal");
    document.body.removeChild(el);
  });

  it("renders vertical orientation", async () => {
    const el = document.createElement("z-divider") as any;
    el.orientation = "vertical";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-divider--vertical")).toBeDefined();
    document.body.removeChild(el);
  });

  it("has role separator", async () => {
    const el = document.createElement("z-divider") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-divider")!;
    expect(root.getAttribute("role")).toBe("separator");
    document.body.removeChild(el);
  });

  it("renders label slot element", async () => {
    const el = document.createElement("z-divider") as any;
    el.innerHTML = "OR";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const label = el.shadowRoot!.querySelector(".z-divider__label")!;
    expect(label.querySelector("slot")).toBeDefined();
    document.body.removeChild(el);
  });
});
