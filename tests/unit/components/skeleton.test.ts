// Test: z-skeleton component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/skeleton/Skeleton";

describe("z-skeleton", () => {
  it("renders with text variant by default", async () => {
    const el = document.createElement("z-skeleton") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    const root = el.shadowRoot!.querySelector(".z-skeleton")!;
    expect(root.classList.contains("z-skeleton--text")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders circle variant", async () => {
    const el = document.createElement("z-skeleton") as any;
    el.variant = "circle";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-skeleton--circle")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders rect variant", async () => {
    const el = document.createElement("z-skeleton") as any;
    el.variant = "rect";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-skeleton--rect")).toBeDefined();
    document.body.removeChild(el);
  });

  it("is animated by default", async () => {
    const el = document.createElement("z-skeleton") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-skeleton--animated")).toBeDefined();
    document.body.removeChild(el);
  });

  it("can disable animation", async () => {
    const el = document.createElement("z-skeleton") as any;
    el.animated = false;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-skeleton--animated")).toBeNull();
    document.body.removeChild(el);
  });

  it("sets custom CSS properties for width/height", async () => {
    const el = document.createElement("z-skeleton") as any;
    el.width = "200px";
    el.height = "20px";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.style.getPropertyValue("--_sk-w")).toBe("200px");
    expect(el.style.getPropertyValue("--_sk-h")).toBe("20px");
    document.body.removeChild(el);
  });

  it("has aria-hidden", async () => {
    const el = document.createElement("z-skeleton") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector('[aria-hidden="true"]')).toBeDefined();
    document.body.removeChild(el);
  });
});
