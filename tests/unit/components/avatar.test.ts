// Test: z-avatar component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/components/avatar/Avatar";

describe("z-avatar", () => {
  function createAvatar(): HTMLElement & { src: string; alt: string; size: string; shape: string; initials: string } {
    const el = document.createElement("z-avatar") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders default circle, md size", async () => {
    const el = createAvatar();
    await new Promise((r) => setTimeout(r, 0));
    const root = el.shadowRoot!.querySelector(".z-avatar")!;
    expect(root.classList.contains("z-avatar--circle")).toBe(true);
    expect(root.classList.contains("z-avatar--md")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders square shape", async () => {
    const el = createAvatar();
    el.shape = "square";
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-avatar--square")).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders image when src is set", async () => {
    const el = createAvatar();
    el.src = "https://example.com/avatar.png";
    el.alt = "User";
    await new Promise((r) => setTimeout(r, 0));

    const img = el.shadowRoot!.querySelector("img")!;
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toBe("https://example.com/avatar.png");
    document.body.removeChild(el);
  });

  it("renders initials when no src", async () => {
    const el = createAvatar();
    el.initials = "JD";
    await new Promise((r) => setTimeout(r, 0));

    const fallback = el.shadowRoot!.querySelector(".z-avatar__fallback")!;
    expect(fallback.textContent).toContain("JD");
    document.body.removeChild(el);
  });

  it("falls back to initials on image error", async () => {
    const el = createAvatar();
    el.src = "bad-url";
    el.initials = "XX";
    await new Promise((r) => setTimeout(r, 0));

    const img = el.shadowRoot!.querySelector("img")!;
    img.dispatchEvent(new ErrorEvent("error"));
    await new Promise((r) => setTimeout(r, 0));

    const fallback = el.shadowRoot!.querySelector(".z-avatar__fallback")!;
    expect(fallback.textContent).toContain("XX");
    document.body.removeChild(el);
  });

  it("truncates initials to 2 characters", async () => {
    const el = createAvatar();
    el.initials = "ABCDEF";
    await new Promise((r) => setTimeout(r, 0));

    const fallback = el.shadowRoot!.querySelector(".z-avatar__fallback")!;
    expect(fallback.textContent).toContain("AB");
    document.body.removeChild(el);
  });
});
