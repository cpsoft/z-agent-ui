// Test: z-property-row（label 属性/槽位、span 整行、parts）
// Related: [[REQ-008]]
// Wiki: wiki/requirements/REQ-008-property-panel.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/property/row/PropertyRow";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("z-property-row", () => {
  function createRow(): any {
    const el = document.createElement("z-property-row") as any;
    document.body.appendChild(el);
    return el;
  }

  it("renders label property as fallback text", async () => {
    const el = createRow();
    el.label = "宽度";
    await flush();
    const label = el.shadowRoot!.querySelector(".z-property-row__label")!;
    expect(label.textContent).toContain("宽度");
    document.body.removeChild(el);
  });

  it("label slot overrides label property", async () => {
    const el = createRow();
    el.label = "fallback";
    el.innerHTML = `<span slot="label">slot-label</span>`;
    await flush();
    const slot = el.shadowRoot!.querySelector('slot[name="label"]')! as HTMLSlotElement;
    // [WHY] 具名槽位内容被投影，不在 shadow 侧 textContent 里，须用 assignedNodes 断言
    expect(slot.assignedNodes().some((n) => n.textContent === "slot-label")).toBe(true);
    document.body.removeChild(el);
  });

  it("preserves slotted control in light DOM", async () => {
    const el = createRow();
    el.innerHTML = `<input class="my-control" type="text">`;
    await flush();
    const control = el.querySelector(".my-control")!;
    expect(control).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-property-row__control")!.querySelector("slot")).toBeDefined();
    document.body.removeChild(el);
  });

  it("reflects span attribute", async () => {
    const el = createRow();
    await flush();
    expect(el.hasAttribute("span")).toBe(false);
    el.span = true;
    await flush();
    expect(el.hasAttribute("span")).toBe(true);
    el.span = false;
    await flush();
    expect(el.hasAttribute("span")).toBe(false);
    document.body.removeChild(el);
  });

  it("exposes root/label/control parts", async () => {
    const el = createRow();
    await flush();
    const root = el.shadowRoot!.querySelector(".z-property-row")!;
    expect(root.getAttribute("part")).toBe("root");
    expect(el.shadowRoot!.querySelector(".z-property-row__label")!.getAttribute("part")).toBe("label");
    expect(el.shadowRoot!.querySelector(".z-property-row__control")!.getAttribute("part")).toBe("control");
    document.body.removeChild(el);
  });
});
