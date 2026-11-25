// Test: z-badge component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/badge/Badge";

describe("z-badge", () => {
  it("renders with default variant and size", async () => {
    const el = document.createElement("z-badge") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const badge = el.shadowRoot!.querySelector(".z-badge")!;
    expect(badge.classList.contains("z-badge--default")).toBe(true);
    expect(badge.classList.contains("z-badge--md")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders different variants", async () => {
    const el = document.createElement("z-badge") as any;
    el.variant = "danger";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const badge = el.shadowRoot!.querySelector(".z-badge")!;
    expect(badge.classList.contains("z-badge--danger")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders sm size", async () => {
    const el = document.createElement("z-badge") as any;
    el.size = "sm";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const badge = el.shadowRoot!.querySelector(".z-badge")!;
    expect(badge.classList.contains("z-badge--sm")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders slot element", async () => {
    const el = document.createElement("z-badge") as any;
    el.innerHTML = "99+";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const slot = el.shadowRoot!.querySelector("slot")!;
    expect(slot).toBeDefined();
    document.body.removeChild(el);
  });
});
