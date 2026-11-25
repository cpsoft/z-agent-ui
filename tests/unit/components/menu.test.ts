// Test: z-menu component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/menu-item/MenuItem";
import "../../../src/components/menu/Menu";

describe("z-menu", () => {
  function createMenu(): any {
    const el = document.createElement("z-menu") as any;
    ["Edit", "Delete", "Share"].forEach((label) => {
      const item = document.createElement("z-menu-item") as any;
      item.value = label.toLowerCase();
      item.textContent = label;
      el.appendChild(item);
    });
    document.body.appendChild(el);
    return el;
  }

  it("renders trigger slot and hidden slot", async () => {
    const el = createMenu();
    await new Promise((r) => setTimeout(r, 0));
    const trigger = el.shadowRoot!.querySelector(".z-menu__trigger")!;
    expect(trigger).toBeDefined();
    document.body.removeChild(el);
  });

  it("does not open when disabled", async () => {
    const el = createMenu();
    el.disabled = true;
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("has aria attributes on trigger", async () => {
    const el = createMenu();
    await new Promise((r) => setTimeout(r, 0));
    const trigger = el.shadowRoot!.querySelector(".z-menu__trigger")!;
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    // [WHY "false" 而不是 ""] 模板插值把 false 变成空串，原来这条断言就写着 `""` ——
    // 它把缺陷当成了规格：`aria-expanded=""` 在 ARIA 里是「未知」，读屏不会说「已折叠」。
    // 2026-11-15 加了 ariaBool() 之后这里是 "false"；空串由 aria-value-guard 兜住。
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    document.body.removeChild(el);
  });

  it("has default placement bottom-start", async () => {
    const el = createMenu();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.placement).toBe("bottom-start");
    expect(el.offset).toBe(4);
    document.body.removeChild(el);
  });

  it("open property reflects state", async () => {
    const el = createMenu();
    await new Promise((r) => setTimeout(r, 0));

    el.open = true;
    expect(el.open).toBe(true);

    el.open = false;
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });
});
