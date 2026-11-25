// Test: z-sidebar component
// Related: [[REQ-012]]
// Wiki: wiki/requirements/REQ-012-admin-layout.md
// Date: 2026-08-11
// Author: AI

import { describe, it, expect } from "vitest";
import "../../../src/components/sidebar/Sidebar";

const flush = () => new Promise((r) => setTimeout(r, 0));

function create(inner = "") {
  const el = document.createElement("z-sidebar") as any;
  el.innerHTML = inner;
  document.body.appendChild(el);
  return el;
}

describe("z-sidebar", () => {
  it("renders aside root with content and footer parts", async () => {
    const el = create();
    await flush();

    expect(el.shadowRoot!.querySelector('[part="root"]')!.tagName).toBe("ASIDE");
    expect(el.shadowRoot!.querySelector('[part="content"]')).toBeDefined();
    expect(el.shadowRoot!.querySelector('[part="footer"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("provides default slot for menu content", async () => {
    const el = create("<nav>Menu</nav>");
    await flush();

    const slot = el.shadowRoot!.querySelector('[part="content"] slot')!;
    const assigned = (slot as HTMLSlotElement).assignedNodes();
    expect(assigned.length).toBe(1);
    expect((assigned[0] as HTMLElement).textContent).toBe("Menu");
    document.body.removeChild(el);
  });

  it("provides footer slot", async () => {
    const el = create('<div slot="footer">Footer</div>');
    await flush();

    const slot = el.shadowRoot!.querySelector('[part="footer"] slot')!;
    const assigned = (slot as HTMLSlotElement).assignedNodes();
    expect(assigned.length).toBe(1);
    expect((assigned[0] as HTMLElement).textContent).toBe("Footer");
    document.body.removeChild(el);
  });

  it("reflects collapsed attribute", async () => {
    const el = create();
    await flush();

    el.collapsed = true;
    await flush();
    expect(el.hasAttribute("collapsed")).toBe(true);
    expect(el.getAttribute("collapsed")).toBe("");

    el.setAttribute("collapsed", "");
    await flush();
    expect(el.collapsed).toBe(true);
    document.body.removeChild(el);
  });

  it("has collapsed attr on host when collapsed", async () => {
    const el = create();
    el.collapsed = true;
    await flush();

    expect(el.shadowRoot!.querySelector('[part="root"]')).toBeDefined();
    expect(el.hasAttribute("collapsed")).toBe(true);
    document.body.removeChild(el);
  });

  it("uses collapsed width token variables in stylesheet", async () => {
    const el = create();
    await flush();

    const css = el.shadowRoot!.querySelector("style")!.textContent!;
    expect(css).toContain("--z-app-shell-sidebar-width");
    expect(css).toContain("--z-app-shell-sidebar-collapsed-width");
    document.body.removeChild(el);
  });

  it("keeps content scrollable and overflow hidden", async () => {
    const el = create("<nav>Menu</nav>");
    await flush();

    const css = el.shadowRoot!.querySelector("style")!.textContent!;
    expect(css).toContain("overflow-y: auto");
    expect(css).toContain("white-space: nowrap");
    document.body.removeChild(el);
  });

  it("works standalone without app-shell", async () => {
    const el = create("<nav>Menu</nav>");
    el.collapsed = true;
    await flush();

    expect(el.hasAttribute("collapsed")).toBe(true);
    expect(el.shadowRoot!.querySelector('[part="content"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders with empty content without crash", async () => {
    const el = create();
    await flush();

    expect(el.shadowRoot!.querySelector('[part="content"] slot')).toBeDefined();
    document.body.removeChild(el);
  });
});
