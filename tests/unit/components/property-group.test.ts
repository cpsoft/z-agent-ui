// Test: z-property-group（默认展开、点击折叠 + z-toggle、disabled、collapsible、aria-expanded）
// Related: [[REQ-008]]
// Wiki: wiki/requirements/REQ-008-property-panel.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/property/group/PropertyGroup";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("z-property-group", () => {
  function createGroup(): any {
    const el = document.createElement("z-property-group") as any;
    el.title = "基础属性";
    el.innerHTML = `<div class="row-content">内容</div>`;
    document.body.appendChild(el);
    return el;
  }

  it("opens by default with no first-render animation state", async () => {
    const el = createGroup();
    await flush();
    const root = el.shadowRoot!.querySelector(".z-property-group")!;
    expect(root.classList.contains("z-property-group--open")).toBe(true);
    const content = el.shadowRoot!.querySelector(".z-property-group__content")!;
    // [WHY] 首帧不得把测量值写死进内联 maxHeight（旧代码在插槽子元素未布局时
    // scrollHeight=0 → maxHeight=20px，展开内容被截断，见 bug-20260811-group-first-render-truncation）
    expect(content.style.maxHeight).toBe("");
    expect(el.hasAttribute("span")).toBe(true);
    document.body.removeChild(el);
  });

  it("toggles open and emits z-toggle on header click", async () => {
    const el = createGroup();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-toggle", handler);

    const header = el.shadowRoot!.querySelector(".z-property-group__header")!;
    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(el.open).toBe(false);
    expect(handler.mock.calls[0][0].detail.open).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-property-group")!.classList.contains("z-property-group--open")).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-property-group__header")!.getAttribute("aria-expanded")).toBe("false");

    // [WHY] 重渲染后 innerHTML 已重建，旧 header 已脱离 DOM，需重新查询再点击
    const header2 = el.shadowRoot!.querySelector(".z-property-group__header")!;
    (header2 as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.open).toBe(true);
    expect(handler.mock.calls[1][0].detail.open).toBe(true);
    expect(el.shadowRoot!.querySelector(".z-property-group__header")!.getAttribute("aria-expanded")).toBe("true");
    document.body.removeChild(el);
  });

  it("disabled group: header button is natively disabled and click does nothing", async () => {
    const el = createGroup();
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-toggle", handler);
    el.disabled = true;
    await flush();

    const header = el.shadowRoot!.querySelector(".z-property-group__header")!;
    expect(header.tagName).toBe("BUTTON");
    expect(header.hasAttribute("disabled")).toBe(true);

    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.open).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("collapsible=false: no button/chevron, content always shown, open ignored", async () => {
    const el = createGroup();
    el.open = false;
    el.collapsible = false;
    await flush();

    const header = el.shadowRoot!.querySelector(".z-property-group__header")!;
    expect(header.tagName).toBe("DIV");
    expect(header.hasAttribute("aria-expanded")).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-property-group__icon")).toBeNull();

    (header as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.open).toBe(false);

    const root = el.shadowRoot!.querySelector(".z-property-group")!;
    expect(root.classList.contains("z-property-group--open")).toBe(true);
    document.body.removeChild(el);
  });

  it("renders title property and title slot overrides it", async () => {
    const el = createGroup();
    await flush();
    expect(el.shadowRoot!.querySelector(".z-property-group__title")!.textContent).toContain("基础属性");

    el.innerHTML = `<span slot="title">slot-title</span>`;
    await flush();
    const slot = el.shadowRoot!.querySelector('slot[name="title"]')! as HTMLSlotElement;
    // [WHY] 具名槽位内容被投影，不在 shadow 侧 textContent 里，须用 assignedNodes 断言
    expect(slot.assignedNodes().some((n) => n.textContent === "slot-title")).toBe(true);
    document.body.removeChild(el);
  });

  it("programmatic open toggle re-renders class and aria-expanded", async () => {
    const el = createGroup();
    await flush();
    el.open = false;
    await flush();
    expect(el.shadowRoot!.querySelector(".z-property-group")!.classList.contains("z-property-group--open")).toBe(false);
    expect(el.shadowRoot!.querySelector(".z-property-group__header")!.getAttribute("aria-expanded")).toBe("false");

    el.open = true;
    await flush();
    // [WHY] innerHTML 重建，类状态须在重建后的新元素上断言
    expect(el.shadowRoot!.querySelector(".z-property-group")!.classList.contains("z-property-group--open")).toBe(true);
    expect(el.shadowRoot!.querySelector(".z-property-group__header")!.getAttribute("aria-expanded")).toBe("true");
    document.body.removeChild(el);
  });

  it("reflects span attribute (default true)", async () => {
    const el = createGroup();
    await flush();
    expect(el.hasAttribute("span")).toBe(true);
    el.span = false;
    await flush();
    expect(el.hasAttribute("span")).toBe(false);
    document.body.removeChild(el);
  });
});
