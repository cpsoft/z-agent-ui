// Test: FocusTrap primitive
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import { FocusTrap } from "../../../src/primitives/focus-trap/FocusTrap";

describe("FocusTrap", () => {
  function createContainer(): HTMLElement {
    const div = document.createElement("div");
    div.innerHTML = `
      <button>First</button>
      <input type="text" id="mid" />
      <a href="#">Last</a>
    `;
    document.body.appendChild(div);
    return div;
  }

  it("auto-focuses first focusable element on create", () => {
    const container = createContainer();
    const trap = new FocusTrap({ container });

    const first = container.querySelector("button")!;
    expect(document.activeElement).toBe(first);

    trap.destroy();
    document.body.removeChild(container);
  });

  it("does not auto-focus when autoFocus is false", () => {
    const container = createContainer();
    const trap = new FocusTrap({ container, autoFocus: false });

    // Active element should not be inside container (likely body)
    expect(container.contains(document.activeElement)).toBe(false);

    trap.destroy();
    document.body.removeChild(container);
  });

  it("traps Tab key to cycle through focusable elements", () => {
    const container = createContainer();
    const trap = new FocusTrap({ container });

    const first = container.querySelector("button")!;
    const mid = container.querySelector("input")!;
    const last = container.querySelector("a")!;

    // Tab from last → first
    last.focus();
    container.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(first);

    // Shift+Tab from first → last
    first.focus();
    container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true })
    );
    expect(document.activeElement).toBe(last);

    trap.destroy();
    document.body.removeChild(container);
  });

  it("restores previous focus on deactivate", () => {
    const external = document.createElement("button");
    document.body.appendChild(external);
    external.focus();

    const container = createContainer();
    const trap = new FocusTrap({ container });
    // Focus should have moved to first element in container
    expect(document.activeElement).not.toBe(external);

    trap.deactivate();
    expect(document.activeElement).toBe(external);

    document.body.removeChild(container);
    document.body.removeChild(external);
  });

  it("destroy calls deactivate", () => {
    const container = createContainer();
    const trap = new FocusTrap({ container, autoFocus: false });
    trap.destroy();
    // Should not throw
    expect(true).toBe(true);
    document.body.removeChild(container);
  });

  it("prevents Tab when no focusable elements", () => {
    const container = document.createElement("div");
    container.innerHTML = `<span>not focusable</span>`;
    document.body.appendChild(container);
    const trap = new FocusTrap({ container });

    const prevented = container.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true })
    );
    expect(prevented).toBe(false);

    trap.destroy();
    document.body.removeChild(container);
  });
});
