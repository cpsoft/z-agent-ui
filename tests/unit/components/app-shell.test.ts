// Test: z-app-shell component
// Related: [[REQ-012]]
// Wiki: wiki/requirements/REQ-012-admin-layout.md
// Date: 2026-08-11
// Author: AI

import { describe, it, expect } from "vitest";
import "../../../src/app/app-shell/AppShell";
import "../../../src/components/sidebar/Sidebar";

const flush = () => new Promise((r) => setTimeout(r, 0));

function create(inner = "") {
  const el = document.createElement("z-app-shell") as any;
  el.innerHTML = inner;
  document.body.appendChild(el);
  return el;
}

describe("z-app-shell", () => {
  it("renders header, body, sidebar, main and footer regions", async () => {
    const el = create();
    await flush();

    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[part="header"]')).toBeDefined();
    expect(shadow.querySelector('[part="body"]')).toBeDefined();
    expect(shadow.querySelector('[part="sidebar"]')).toBeDefined();
    expect(shadow.querySelector('[part="main"]')).toBeDefined();
    expect(shadow.querySelector('[part="footer"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("provides named slots for header, sidebar, main and footer", async () => {
    const el = create(`
      <header slot="header">Brand</header>
      <nav slot="sidebar">Menu</nav>
      <main slot="main">Content</main>
      <footer slot="footer">Footer</footer>
    `);
    await flush();

    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('slot[name="header"]')).toBeDefined();
    expect(shadow.querySelector('slot[name="sidebar"]')).toBeDefined();
    expect(shadow.querySelector('slot[name="main"]')).toBeDefined();
    expect(shadow.querySelector('slot[name="footer"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("main slot falls back to default slot content", async () => {
    const el = create("<div>Default content</div>");
    await flush();

    const mainSlot = el.shadowRoot!.querySelector('slot[name="main"]')!;
    const assigned = (mainSlot as HTMLSlotElement).assignedNodes();
    expect(assigned.length).toBe(0); // named slot gets nothing from default content
    const fallbackSlot = mainSlot.querySelector("slot")!;
    expect((fallbackSlot as HTMLSlotElement).assignedNodes().length).toBe(1);
    document.body.removeChild(el);
  });

  it("reflects collapsed attribute", async () => {
    const el = create();
    await flush();

    el.collapsed = true;
    await flush();
    expect(el.hasAttribute("collapsed")).toBe(true);

    el.collapsed = false;
    await flush();
    expect(el.hasAttribute("collapsed")).toBe(false);
    document.body.removeChild(el);
  });

  it("flips collapsed on z-sidebar-toggle from inside", async () => {
    const el = create();
    await flush();

    const btn = document.createElement("button");
    el.appendChild(btn);
    btn.dispatchEvent(new CustomEvent("z-sidebar-toggle", { bubbles: true, composed: true }));
    await flush();
    expect(el.collapsed).toBe(true);

    btn.dispatchEvent(new CustomEvent("z-sidebar-toggle", { bubbles: true, composed: true }));
    await flush();
    expect(el.collapsed).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-collapse-change with collapsed detail on toggle", async () => {
    const el = create();
    await flush();

    let detail: any = null;
    el.addEventListener("z-collapse-change", (e: Event) => {
      detail = (e as CustomEvent).detail;
    });
    el.dispatchEvent(new CustomEvent("z-sidebar-toggle", { bubbles: true, composed: true }));

    expect(detail).toEqual({ collapsed: true });
    document.body.removeChild(el);
  });

  it("syncs collapsed to slotted z-sidebar", async () => {
    const el = create('<z-sidebar slot="sidebar"><nav>Menu</nav></z-sidebar>');
    await flush();

    const sidebar = el.querySelector("z-sidebar");
    expect(sidebar!.collapsed).toBe(false);

    el.collapsed = true;
    await flush();
    expect(sidebar!.collapsed).toBe(true);
    expect(sidebar!.hasAttribute("collapsed")).toBe(true);
    document.body.removeChild(el);
  });

  it("re-syncs collapsed to a newly slotted z-sidebar after slotchange", async () => {
    const el = create();
    await flush();
    el.collapsed = true;

    const sidebar = document.createElement("z-sidebar");
    sidebar.setAttribute("slot", "sidebar");
    el.appendChild(sidebar);
    const slot = el.shadowRoot!.querySelector('slot[name="sidebar"]')!;
    slot.dispatchEvent(new Event("slotchange"));
    await flush();

    expect(sidebar.collapsed).toBe(true);
    document.body.removeChild(el);
  });

  it("does not crash without sidebar slot content", async () => {
    const el = create('<header slot="header">Header</header><div slot="main">Main</div>');
    await flush();
    el.collapsed = true;
    await flush();

    expect(el.shadowRoot!.querySelector('[part="sidebar"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("does not touch non-z-sidebar sidebar slot content", async () => {
    const el = create('<nav slot="sidebar">Raw menu</nav>');
    await flush();
    el.collapsed = true;
    await flush();

    const nav = el.querySelector("nav")!;
    expect(nav.hasAttribute("collapsed")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders empty shell without crash", async () => {
    const el = create();
    await flush();

    expect(el.shadowRoot!.querySelector('[part="body"]')).toBeDefined();
    document.body.removeChild(el);
  });
});
