// Test: ClickOutside primitive
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import { ClickOutside } from "../../../src/primitives/click-outside/ClickOutside";

describe("ClickOutside", () => {
  it("calls handler on outside mousedown", () => {
    const handler = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);

    const c = new ClickOutside({ element: el, handler });
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);

    c.destroy();
    document.body.removeChild(el);
  });

  it("does not call handler when clicking inside element", () => {
    const handler = vi.fn();
    const el = document.createElement("div");
    const child = document.createElement("button");
    el.appendChild(child);
    document.body.appendChild(el);

    const c = new ClickOutside({ element: el, handler });
    child.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    c.destroy();
    document.body.removeChild(el);
  });

  it("respects ignore selector", () => {
    const handler = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);

    const ignored = document.createElement("div");
    ignored.className = "ignored";
    document.body.appendChild(ignored);

    const c = new ClickOutside({ element: el, handler, ignore: ".ignored" });
    ignored.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();

    c.destroy();
    document.body.removeChild(el);
    document.body.removeChild(ignored);
  });

  it("destroy removes event listeners", () => {
    const handler = vi.fn();
    const el = document.createElement("div");
    document.body.appendChild(el);

    const c = new ClickOutside({ element: el, handler });
    c.destroy();

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();

    document.body.removeChild(el);
  });
});
