// Test: z-card component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/card/Card";

describe("z-card", () => {
  it("renders with default props", async () => {
    const el = document.createElement("z-card") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-card")!;
    expect(root).toBeDefined();
    document.body.removeChild(el);
  });

  it("adds bordered class when bordered is true", async () => {
    const el = document.createElement("z-card") as any;
    el.bordered = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-card--bordered")).toBeDefined();
    document.body.removeChild(el);
  });

  it("adds shadow class when shadow is true", async () => {
    const el = document.createElement("z-card") as any;
    el.shadow = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-card--shadow")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders default slot", async () => {
    const el = document.createElement("z-card") as any;
    el.innerHTML = "Card body content";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const body = el.shadowRoot!.querySelector(".z-card__body")!;
    expect(body).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders named slots", async () => {
    const el = document.createElement("z-card") as any;
    el.innerHTML = `
      <span slot="header">Header</span>
      <span slot="footer">Footer</span>
      Default content
    `;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    const header = el.shadowRoot!.querySelector(".z-card__header")!;
    const footer = el.shadowRoot!.querySelector(".z-card__footer")!;
    expect(header).toBeDefined();
    expect(footer).toBeDefined();
    document.body.removeChild(el);
  });
});
