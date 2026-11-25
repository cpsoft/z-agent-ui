// Test: z-tag component
// Related: [[REQ-001]] (i18n 文案可配置)
// Wiki: wiki/requirements/REQ-001-core-requirements.md
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/tag/Tag";

describe("z-tag", () => {
  function createTag(): any {
    const el = document.createElement("z-tag") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders with default variant", async () => {
    const el = createTag();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-tag")!;
    expect(root.classList.contains("z-tag--default")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders different variants", async () => {
    const el = createTag();
    el.variant = "danger";
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-tag--danger")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders close button when closable", async () => {
    const el = createTag();
    el.closable = true;
    await new Promise((r) => setTimeout(r, 0));
    const close = el.shadowRoot!.querySelector(".z-tag__close")!;
    expect(close).toBeDefined();
    document.body.removeChild(el);
  });

  it("respects custom remove-label via attribute", async () => {
    const el = createTag();
    el.closable = true;
    el.setAttribute("removelabel", "移除");
    await new Promise((r) => setTimeout(r, 0));
    const close = el.shadowRoot!.querySelector(".z-tag__close")!;
    expect(close.getAttribute("aria-label")).toBe("移除");
    document.body.removeChild(el);
  });

  it("emits z-tag-close on close button click", async () => {
    const el = createTag();
    el.closable = true;
    el.innerHTML = "Tag";
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-tag-close", handler);

    const close = el.shadowRoot!.querySelector(".z-tag__close") as HTMLElement;
    close.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("does not emit z-tag-close when disabled", async () => {
    const el = createTag();
    el.closable = true;
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-tag-close", handler);

    const close = el.shadowRoot!.querySelector(".z-tag__close") as HTMLElement;
    close.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("renders label slot element", async () => {
    const el = createTag();
    await new Promise((r) => setTimeout(r, 0));
    const slot = el.shadowRoot!.querySelector(".z-tag__label slot")!;
    expect(slot).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders size sm", async () => {
    const el = createTag();
    el.size = "sm";
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-tag--sm")).toBeDefined();
    document.body.removeChild(el);
  });
});
