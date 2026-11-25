// Test: z-breadcrumb component
// Related: [[REQ-012]]
// Wiki: wiki/requirements/REQ-012-admin-layout.md
// Date: 2026-08-11
// Author: AI

import { describe, it, expect } from "vitest";
import "../../../src/components/breadcrumb/Breadcrumb";

const flush = () => new Promise((r) => setTimeout(r, 0));

function create(items: unknown[], separator?: string) {
  const el = document.createElement("z-breadcrumb") as any;
  el.items = items;
  if (separator !== undefined) el.separator = separator;
  document.body.appendChild(el);
  return el;
}

describe("z-breadcrumb", () => {
  it("renders nav with aria-label and ol list", async () => {
    const el = create([{ label: "Home" }]);
    await flush();

    const nav = el.shadowRoot!.querySelector("nav")!;
    expect(nav.getAttribute("aria-label")).toBe("breadcrumb");
    expect(nav.querySelector("ol")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders default separator between items", async () => {
    const el = create([{ label: "Home" }, { label: "System" }]);
    await flush();

    const seps = el.shadowRoot!.querySelectorAll(".z-breadcrumb__sep");
    expect(seps.length).toBe(1);
    expect(seps[0].textContent).toBe("/");
    document.body.removeChild(el);
  });

  it("renders custom separator", async () => {
    const el = create([{ label: "Home" }, { label: "System" }], ">");
    await flush();

    const sep = el.shadowRoot!.querySelector(".z-breadcrumb__sep")!;
    expect(sep.textContent).toBe(">");
    document.body.removeChild(el);
  });

  it("marks last item with aria-current=page and renders it as span", async () => {
    const el = create([{ label: "Home", href: "#/" }, { label: "Users" }]);
    await flush();

    const current = el.shadowRoot!.querySelector('[part="current"]')!;
    expect(current.getAttribute("aria-current")).toBe("page");
    expect(current.tagName).toBe("SPAN");
    const lastLi = el.shadowRoot!.querySelectorAll("li")[1];
    expect(lastLi.querySelector('[part="link"]')).toBeNull();
    expect(lastLi.querySelector('[part="current"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it("renders href items as anchor links", async () => {
    const el = create([{ label: "Home", href: "#/home" }, { label: "Users" }]);
    await flush();

    const link = el.shadowRoot!.querySelector('[part="link"]')!;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("#/home");
    document.body.removeChild(el);
  });

  it("emits z-select with item and index on non-current item click", async () => {
    const el = create([{ label: "Home", href: "#/" }, { label: "System", href: "#/sys" }, { label: "Users" }]);
    await flush();

    let detail: any = null;
    el.addEventListener("z-select", (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    const links = el.shadowRoot!.querySelectorAll('[part="link"]');
    links[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(detail).toEqual({ item: { label: "System", href: "#/sys" }, index: 1 });
    document.body.removeChild(el);
  });

  it("does not emit z-select when clicking current item", async () => {
    const el = create([{ label: "Home", href: "#/" }, { label: "Users" }]);
    await flush();

    let count = 0;
    el.addEventListener("z-select", () => count++);
    const current = el.shadowRoot!.querySelector('[part="current"]')!;
    current.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(count).toBe(0);
    document.body.removeChild(el);
  });

  it("renders non-last item without href as plain span without aria-current", async () => {
    const el = create([{ label: "Home" }, { label: "Section" }, { label: "Users" }]);
    await flush();

    const spans = el.shadowRoot!.querySelectorAll('[part="current"]');
    expect(spans.length).toBe(1);
    expect(spans[0].textContent).toBe("Users");
    document.body.removeChild(el);
  });

  it("escapes label and href content", async () => {
    const el = create([{ label: "<script>alert(1)</script>", href: '#"' }, { label: "End" }]);
    await flush();

    const link = el.shadowRoot!.querySelector('[part="link"]')!;
    expect(link.innerHTML).not.toContain("<script>");
    expect(link.textContent).toBe("<script>alert(1)</script>");
    expect(link.getAttribute("href")).toBe('#"');
    document.body.removeChild(el);
  });

  it("renders empty state without crash for empty items", async () => {
    const el = create([]);
    await flush();

    expect(el.shadowRoot!.querySelector("ol")).toBeDefined();
    expect(el.shadowRoot!.querySelectorAll("li").length).toBe(0);
    document.body.removeChild(el);
  });
});
