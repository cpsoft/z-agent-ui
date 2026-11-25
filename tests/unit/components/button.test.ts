// Test: z-button component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/button/Button";

describe("z-button", () => {
  function createButton(): HTMLElement & {
    tone: string;
    appearance: string;
    size: string;
    disabled: boolean;
    loading: boolean;
    buttonType: string;
  } {
    const el = document.createElement("z-button") as any;
    document.body.appendChild(el);
    return el;
  }

  it("默认是 tone=primary + appearance=solid + size=md", async () => {
    const el = createButton();
    await new Promise((r) => setTimeout(r, 0));

    const btn = el.shadowRoot!.querySelector("button")!;
    expect([el.tone, el.appearance]).toEqual(["primary", "solid"]);
    expect(btn.classList.contains("z-button--solid")).toBe(true);
    expect(btn.classList.contains("z-button--md")).toBe(true);
    document.body.removeChild(el);
  });

  it("tone 与 appearance 正交：danger + outline 这种旧词表达不出的组合也能写", async () => {
    const el = createButton();
    el.tone = "danger";
    el.appearance = "outline";
    await new Promise((r) => setTimeout(r, 0));

    const btn = el.shadowRoot!.querySelector("button")!;
    // 语义色落到宿主 attribute（CSS 用它取色），外观落到类名（CSS 用它决定用色方式）
    expect(el.getAttribute("tone")).toBe("danger");
    expect(btn.classList.contains("z-button--outline")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders size classes", async () => {
    const el = createButton();
    el.size = "lg";
    await new Promise((r) => setTimeout(r, 0));

    const btn = el.shadowRoot!.querySelector("button")!;
    expect(btn.classList.contains("z-button--lg")).toBe(true);
    document.body.removeChild(el);
  });

  it("sets aria-disabled when disabled prop is set", async () => {
    const el = createButton();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    const btn = el.shadowRoot!.querySelector("button")!;
    expect(btn.getAttribute("aria-disabled")).toBe("true");
    document.body.removeChild(el);
  });

  it("shows spinner when loading", async () => {
    const el = createButton();
    el.loading = true;
    await new Promise((r) => setTimeout(r, 0));

    const spinner = el.shadowRoot!.querySelector(".z-button__spinner")!;
    expect(spinner).toBeDefined();
    document.body.removeChild(el);
  });

  it("prevents click when disabled", async () => {
    const el = createButton();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-click", handler);

    const btn = el.shadowRoot!.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("emits z-click on click", async () => {
    const el = createButton();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-click", handler);

    const btn = el.shadowRoot!.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("renders slots", async () => {
    const el = createButton();
    el.innerHTML = "Submit";
    await new Promise((r) => setTimeout(r, 0));

    const label = el.shadowRoot!.querySelector(".z-button__label slot")!;
    expect(label).toBeDefined();
    document.body.removeChild(el);
  });

  it("sets type attribute from buttonType prop", async () => {
    const el = createButton();
    el.buttonType = "submit";
    await new Promise((r) => setTimeout(r, 0));

    const btn = el.shadowRoot!.querySelector("button")!;
    expect(btn.getAttribute("type")).toBe("submit");
    document.body.removeChild(el);
  });

  it("prevents click when loading", async () => {
    const el = createButton();
    el.loading = true;
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-click", handler);

    const btn = el.shadowRoot!.querySelector("button")!;
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });
});
