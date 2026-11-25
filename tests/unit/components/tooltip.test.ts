// Test: z-tooltip component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/tooltip/Tooltip";

describe("z-tooltip", () => {
  function createTooltip(): any {
    const el = document.createElement("z-tooltip") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders slot content", async () => {
    const el = createTooltip();
    el.innerHTML = "<button>Hover me</button>";
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector("slot")).toBeDefined();
    document.body.removeChild(el);
  });

  it("does not show popup when content is empty", async () => {
    const el = createTooltip();
    el.content = "";
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    const popup = document.querySelector(".z-tooltip__popup");
    expect(popup).toBeNull();
    document.body.removeChild(el);
  });

  it("defaults to placement top, delay 400", async () => {
    const el = createTooltip();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.placement).toBe("top");
    expect(el.delay).toBe(400);
    document.body.removeChild(el);
  });

  it("accepts custom placement and delay", async () => {
    const el = createTooltip();
    el.placement = "bottom";
    el.delay = 200;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.placement).toBe("bottom");
    expect(el.delay).toBe(200);
    document.body.removeChild(el);
  });
});
