// Test: z-spinner component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/spinner/Spinner";

describe("z-spinner", () => {
  it("renders with border variant, md size by default", async () => {
    const el = document.createElement("z-spinner") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-spinner")!;
    expect(root.classList.contains("z-spinner--border")).toBe(true);
    expect(root.classList.contains("z-spinner--md")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders grow variant", async () => {
    const el = document.createElement("z-spinner") as any;
    el.variant = "grow";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-spinner--grow")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders dots variant with three dots", async () => {
    const el = document.createElement("z-spinner") as any;
    el.variant = "dots";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const dots = el.shadowRoot!.querySelectorAll(".z-spinner__dot");
    expect(dots.length).toBe(3);
    document.body.removeChild(el);
  });

  it("renders sm size", async () => {
    const el = document.createElement("z-spinner") as any;
    el.size = "sm";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-spinner--sm")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders lg size", async () => {
    const el = document.createElement("z-spinner") as any;
    el.size = "lg";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-spinner--lg")).toBeDefined();
    document.body.removeChild(el);
  });

  it("has aria-hidden", async () => {
    const el = document.createElement("z-spinner") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector('[aria-hidden="true"]')).toBeDefined();
    document.body.removeChild(el);
  });
});
