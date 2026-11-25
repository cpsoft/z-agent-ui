// Test: z-alert component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/alert/Alert";

describe("z-alert", () => {
  function createAlert(): HTMLElement & { variant: string; closable: boolean; title: string; hide(): void; show(): void } {
    const el = document.createElement("z-alert") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders with default variant info", async () => {
    const el = createAlert();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-alert")!;
    expect(root.classList.contains("z-alert--info")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders different variants", async () => {
    const variants = ["success", "warning", "error"];
    for (const v of variants) {
      const el = createAlert();
      el.variant = v;
      await new Promise((r) => setTimeout(r, 0));
      expect(el.shadowRoot!.querySelector(`.z-alert--${v}`)).toBeDefined();
      document.body.removeChild(el);
    }
  });

  it("renders title when set", async () => {
    const el = createAlert();
    el.title = "Notice";
    await new Promise((r) => setTimeout(r, 0));
    const title = el.shadowRoot!.querySelector(".z-alert__title")!;
    expect(title.textContent).toContain("Notice");
    document.body.removeChild(el);
  });

  it("renders close button when closable", async () => {
    const el = createAlert();
    el.closable = true;
    await new Promise((r) => setTimeout(r, 0));
    const close = el.shadowRoot!.querySelector(".z-alert__close")!;
    expect(close).toBeDefined();
    document.body.removeChild(el);
  });

  it("hides on close button click", async () => {
    const el = createAlert();
    el.closable = true;
    await new Promise((r) => setTimeout(r, 0));

    const close = el.shadowRoot!.querySelector(".z-alert__close")! as HTMLElement;
    close.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.hasAttribute("hidden")).toBe(true);
    document.body.removeChild(el);
  });

  it("emits z-alert-close on hide", async () => {
    const el = createAlert();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-alert-close", handler);
    el.hide();

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("show() makes alert visible again", async () => {
    const el = createAlert();
    await new Promise((r) => setTimeout(r, 0));
    el.hide();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.hasAttribute("hidden")).toBe(true);

    el.show();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.hasAttribute("hidden")).toBe(false);
    document.body.removeChild(el);
  });

  it("renders message slot", async () => {
    const el = createAlert();
    el.innerHTML = "Something happened";
    await new Promise((r) => setTimeout(r, 0));
    const msgSlot = el.shadowRoot!.querySelector(".z-alert__message slot")!;
    expect(msgSlot).toBeDefined();
    document.body.removeChild(el);
  });
});
