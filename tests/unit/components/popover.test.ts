// Test: z-popover component
// Date: 2026-07-16

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/popover/Popover";

describe("z-popover", () => {
  function createPopover(): any {
    const el = document.createElement("z-popover") as any;
    el.innerHTML = '<button slot="trigger">Open</button><div>Popover content</div>';
    document.body.appendChild(el);
    return el;
  }

  it("renders hidden by default", async () => {
    const el = createPopover();
    await new Promise((r) => setTimeout(r, 0));
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("toggles open on click when trigger is click", async () => {
    const el = createPopover();
    el.trigger = "click";
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(true);

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("show() and close() methods work", async () => {
    const el = createPopover();
    await new Promise((r) => setTimeout(r, 0));

    el.show();
    expect(el.open).toBe(true);

    el.close();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("toggle() toggles state", async () => {
    const el = createPopover();
    await new Promise((r) => setTimeout(r, 0));

    el.toggle();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-popover-open and z-popover-close", async () => {
    const el = createPopover();
    await new Promise((r) => setTimeout(r, 0));

    const openHandler = vi.fn();
    const closeHandler = vi.fn();
    el.addEventListener("z-popover-open", openHandler);
    el.addEventListener("z-popover-close", closeHandler);

    el.show();
    await new Promise((r) => setTimeout(r, 0));
    expect(openHandler).toHaveBeenCalled();

    el.close();
    await new Promise((r) => setTimeout(r, 0));
    expect(closeHandler).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("closes on document click outside when trigger is click", async () => {
    const el = createPopover();
    el.trigger = "click";
    await new Promise((r) => setTimeout(r, 0));

    el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("aria-haspopup / aria-expanded 落在槽里那个可聚焦件上，不在容器上", async () => {
    // [WHY 这条曾经断言的是容器] 旧写法把两个属性写在 `.z-popover__trigger` 这个
    // `<span>` 上 —— 那是个 slot 容器，不可聚焦、没有 role，无障碍树里根本不出现
    // （2026-11-16 CDP 实测：塞进去的按钮 `role=button` 但 `hasPopup` / `expanded`
    // 两个属性都不存在）。断言「span 上有属性」等于断言了一个**从不生效**的状态。
    const el = createPopover();
    await new Promise((r) => setTimeout(r, 0));

    const trigger = el.shadowRoot!.querySelector(".z-popover__trigger")!;
    const button = el.querySelector('button[slot="trigger"]')!;
    expect(button.getAttribute("aria-haspopup")).toBe("true");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-haspopup"), "容器上不该再有这一份").toBeNull();
    document.body.removeChild(el);
  });
});
