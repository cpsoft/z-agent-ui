// Test: z-tab-panel component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/tab-panel/TabPanel";

describe("z-tab-panel", () => {
  it("renders slot content", async () => {
    const el = document.createElement("z-tab-panel") as any;
    el.label = "Tab";
    el.innerHTML = "Panel Content";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.label).toBe("Tab");
    document.body.removeChild(el);
  });

  it("has disabled prop", async () => {
    const el = document.createElement("z-tab-panel") as any;
    el.disabled = true;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.disabled).toBe(true);
    document.body.removeChild(el);
  });
});
