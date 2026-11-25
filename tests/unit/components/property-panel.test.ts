// Test: z-property-panel（columns 映射、disabled/readonly 级联与快照恢复、MutationObserver）
// Related: [[REQ-008]]
// Wiki: wiki/requirements/REQ-008-property-panel.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/property/panel/PropertyPanel";
import "../../../src/property/group/PropertyGroup";
import "../../../src/property/row/PropertyRow";
import "../../../src/components/switch/Switch";

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("z-property-panel", () => {
  function createPanel(innerHTML = ""): any {
    const el = document.createElement("z-property-panel") as any;
    el.innerHTML = innerHTML;
    document.body.appendChild(el);
    return el;
  }

  const BASIC_CONTROLS = `
    <input type="text" class="native-input">
    <select class="native-select"><option>1</option></select>
    <button type="button" class="native-btn">Go</button>
    <z-switch></z-switch>
    <z-property-row><input type="text" class="row-input"></z-property-row>
    <z-property-group title="g"></z-property-group>
  `;

  it("renders part=root grid div", async () => {
    const el = createPanel();
    await flush();
    const root = el.shadowRoot!.querySelector(".z-property-panel")!;
    expect(root.getAttribute("part")).toBe("root");
    document.body.removeChild(el);
  });

  it("columns default 1 maps to repeat(1, minmax(0, 1fr))", async () => {
    const el = createPanel();
    await flush();
    expect(el.style.getPropertyValue("--_z-property-cols")).toBe("repeat(1, minmax(0, 1fr))");
    document.body.removeChild(el);
  });

  it("columns=2 maps to two columns", async () => {
    const el = createPanel();
    el.columns = "2";
    await flush();
    expect(el.style.getPropertyValue("--_z-property-cols")).toBe("repeat(2, minmax(0, 1fr))");
    document.body.removeChild(el);
  });

  it("columns=auto uses auto-fill 160px", async () => {
    const el = createPanel();
    el.columns = "auto";
    await flush();
    expect(el.style.getPropertyValue("--_z-property-cols")).toBe("repeat(auto-fill, minmax(160px, 1fr))");
    document.body.removeChild(el);
  });

  it("columns=9 clamps to 6", async () => {
    const el = createPanel();
    el.columns = "9";
    await flush();
    expect(el.style.getPropertyValue("--_z-property-cols")).toBe("repeat(6, minmax(0, 1fr))");
    document.body.removeChild(el);
  });

  it("disabled cascades to form controls, rows and groups", async () => {
    const el = createPanel(BASIC_CONTROLS);
    await flush();
    el.disabled = true;
    await flush();
    await flush();

    expect(el.querySelector(".native-input")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector(".native-select")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector(".native-btn")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector("z-switch")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector("z-property-row")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector("z-property-group")!.hasAttribute("disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("un-disable restores, keeping controls that were already disabled", async () => {
    const el = createPanel(BASIC_CONTROLS);
    const alreadyDisabled = document.createElement("input") as HTMLInputElement;
    alreadyDisabled.className = "already-disabled";
    alreadyDisabled.setAttribute("disabled", "");
    el.appendChild(alreadyDisabled);
    await flush();

    el.disabled = true;
    await flush();
    expect(el.querySelector(".already-disabled")!.hasAttribute("disabled")).toBe(true);

    el.disabled = false;
    await flush();
    expect(el.querySelector(".native-input")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector("z-switch")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector("z-property-row")!.hasAttribute("disabled")).toBe(false);
    // 原先就 disabled 的控件保留
    expect(el.querySelector(".already-disabled")!.hasAttribute("disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("readonly: textual controls readonly, switch/row inert, group untouched", async () => {
    const el = createPanel(BASIC_CONTROLS);
    await flush();
    el.readonly = true;
    await flush();

    expect(el.querySelector(".native-input")!.hasAttribute("readonly")).toBe(true);
    expect(el.querySelector(".row-input")!.hasAttribute("readonly")).toBe(true);
    expect(el.querySelector("z-switch")!.hasAttribute("inert")).toBe(true);
    expect(el.querySelector("z-property-row")!.hasAttribute("inert")).toBe(true);
    expect(el.querySelector("z-property-group")!.hasAttribute("inert")).toBe(false);
    expect(el.querySelector("z-property-group")!.hasAttribute("readonly")).toBe(false);

    el.readonly = false;
    await flush();
    expect(el.querySelector(".native-input")!.hasAttribute("readonly")).toBe(false);
    expect(el.querySelector("z-switch")!.hasAttribute("inert")).toBe(false);
    expect(el.querySelector("z-property-row")!.hasAttribute("inert")).toBe(false);
    document.body.removeChild(el);
  });

  it("mutation observer disables controls appended after connect", async () => {
    const el = createPanel(BASIC_CONTROLS);
    await flush();
    el.disabled = true;
    await flush();

    const late = document.createElement("input") as HTMLInputElement;
    late.className = "late-input";
    el.appendChild(late);
    await flush();

    expect(late.hasAttribute("disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("disabled and readonly combined apply and restore both", async () => {
    const el = createPanel(BASIC_CONTROLS);
    await flush();
    el.disabled = true;
    el.readonly = true;
    await flush();

    expect(el.querySelector(".native-input")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector(".native-input")!.hasAttribute("readonly")).toBe(true);
    expect(el.querySelector("z-switch")!.hasAttribute("disabled")).toBe(true);
    expect(el.querySelector("z-switch")!.hasAttribute("inert")).toBe(true);

    el.disabled = false;
    el.readonly = false;
    await flush();
    expect(el.querySelector(".native-input")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector(".native-input")!.hasAttribute("readonly")).toBe(false);
    expect(el.querySelector("z-switch")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector("z-switch")!.hasAttribute("inert")).toBe(false);
    document.body.removeChild(el);
  });

  it("disconnectedCallback restores saved states", async () => {
    const el = createPanel(BASIC_CONTROLS);
    await flush();
    el.disabled = true;
    await flush();

    document.body.removeChild(el);
    await flush();

    expect(el.querySelector(".native-input")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector("z-switch")!.hasAttribute("disabled")).toBe(false);
    expect(el.querySelector("z-property-row")!.hasAttribute("disabled")).toBe(false);
  });
});
