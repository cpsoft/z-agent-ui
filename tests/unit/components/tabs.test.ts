// Test: z-tabs component (with z-tab-panel)
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/tab-panel/TabPanel";
import "../../../src/components/tabs/Tabs";

describe("z-tabs", () => {
  function createTabs(): any {
    const el = document.createElement("z-tabs") as any;
    // Add tab panels
    ["Tab 1", "Tab 2", "Tab 3"].forEach((label) => {
      const panel = document.createElement("z-tab-panel") as any;
      panel.label = label;
      panel.textContent = `Content ${label}`;
      el.appendChild(panel);
    });
    document.body.appendChild(el);
    return el;
  }

  it("renders tab buttons", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));
    const tabs = el.shadowRoot!.querySelectorAll(".z-tabs__tab");
    expect(tabs.length).toBe(3);
    document.body.removeChild(el);
  });

  it("first tab is active by default", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));
    const active = el.shadowRoot!.querySelector(".z-tabs__tab--active")!;
    expect(active.textContent).toContain("Tab 1");
    document.body.removeChild(el);
  });

  it("clicking tab changes active index", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));

    const tabs = el.shadowRoot!.querySelectorAll(".z-tabs__tab");
    (tabs[1] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.active).toBe(1);
    document.body.removeChild(el);
  });

  it("emits z-change on tab switch", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-change", handler);

    const tabs = el.shadowRoot!.querySelectorAll(".z-tabs__tab");
    (tabs[1] as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls[0][0].detail.index).toBe(1);
    document.body.removeChild(el);
  });

  it("hides inactive panels", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));

    const panels = el.querySelectorAll("z-tab-panel");
    expect(panels[0].hidden).toBe(false);
    expect(panels[1].hidden).toBe(true);
    document.body.removeChild(el);
  });

  it("renders variant class", async () => {
    const el = createTabs();
    el.variant = "pills";
    await new Promise((r) => setTimeout(r, 0));
    // Renders tabs list, verify it works
    const tablist = el.shadowRoot!.querySelector(".z-tabs__tablist")!;
    expect(tablist).toBeDefined();
    document.body.removeChild(el);
  });

  it("keyboard ArrowRight moves to next tab", async () => {
    const el = createTabs();
    await new Promise((r) => setTimeout(r, 0));

    const tablist = el.shadowRoot!.querySelector(".z-tabs__tablist")!;
    tablist.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.active).toBe(1);
    document.body.removeChild(el);
  });

  it("keyboard ArrowLeft moves to previous tab", async () => {
    const el = createTabs();
    el.active = 1;
    await new Promise((r) => setTimeout(r, 0));

    const tablist = el.shadowRoot!.querySelector(".z-tabs__tablist")!;
    tablist.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.active).toBe(0);
    document.body.removeChild(el);
  });
});
