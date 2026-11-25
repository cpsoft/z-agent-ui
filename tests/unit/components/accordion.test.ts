// Test: z-accordion and z-accordion-item components
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/accordion-item/AccordionItem";
import "../../../src/components/accordion/Accordion";

describe("z-accordion-item", () => {
  function createItem(): any {
    const el = document.createElement("z-accordion-item") as any;
    el.title = "Section Title";
    el.innerHTML = "Section content";
    document.body.appendChild(el);
    return el;
  }

  it("renders closed by default", async () => {
    const el = createItem();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-accordion-item")!;
    expect(root.classList.contains("z-accordion-item--open")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders title", async () => {
    const el = createItem();
    await new Promise((r) => setTimeout(r, 0));
    const title = el.shadowRoot!.querySelector(".z-accordion-item__title")!;
    expect(title.textContent).toContain("Section Title");
    document.body.removeChild(el);
  });

  it("opens on header click", async () => {
    const el = createItem();
    await new Promise((r) => setTimeout(r, 0));

    const header = el.shadowRoot!.querySelector(".z-accordion-item__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("does not open when disabled", async () => {
    const el = createItem();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    const header = el.shadowRoot!.querySelector(".z-accordion-item__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-toggle on toggle", async () => {
    const el = createItem();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-toggle", handler);

    const header = el.shadowRoot!.querySelector(".z-accordion-item__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.open).toBe(true);
    document.body.removeChild(el);
  });

  it("renders disabled header button with aria-expanded", async () => {
    const el = createItem();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));
    const btn = el.shadowRoot!.querySelector("button")!;
    // [WHY] aria-expanded 显式 "false"（空串对读屏器无效），见 bug-20260810-q-attr-literal-disabled
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    expect(btn.hasAttribute("disabled")).toBe(true);
    document.body.removeChild(el);
  });
});

describe("z-accordion", () => {
  function createAccordion(): any {
    const el = document.createElement("z-accordion") as any;
    ["A", "B", "C"].forEach((t) => {
      const item = document.createElement("z-accordion-item") as any;
      item.title = `Item ${t}`;
      item.textContent = `Content ${t}`;
      el.appendChild(item);
    });
    document.body.appendChild(el);
    return el;
  }

  it("allows multiple items open when multiple is true", async () => {
    const el = createAccordion();
    el.multiple = true;
    await new Promise((r) => setTimeout(r, 0));

    const items = el.querySelectorAll("z-accordion-item");
    items[0].open = true;
    items[1].open = true;
    await new Promise((r) => setTimeout(r, 0));

    expect(items[0].open).toBe(true);
    expect(items[1].open).toBe(true);
    document.body.removeChild(el);
  });

  it("closes other items when multiple is false and one opens", async () => {
    const el = createAccordion();
    el.multiple = false;
    await new Promise((r) => setTimeout(r, 0));

    const items = el.querySelectorAll("z-accordion-item");
    items[0].open = true;
    await new Promise((r) => setTimeout(r, 0));

    // Click header of item 1 (it's closed, so toggle will open it)
    const header = items[1].shadowRoot!.querySelector(".z-accordion-item__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(items[0].open).toBe(false);
    expect(items[1].open).toBe(true);
    document.body.removeChild(el);
  });

  it("emits z-change with open indices", async () => {
    const el = createAccordion();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    const items = el.querySelectorAll("z-accordion-item");
    const header = items[0].shadowRoot!.querySelector(".z-accordion-item__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("adds bordered class when bordered is true", async () => {
    const el = createAccordion();
    el.bordered = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-accordion--bordered")).toBeDefined();
    document.body.removeChild(el);
  });
});
