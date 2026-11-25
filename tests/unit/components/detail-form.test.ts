// Test: z-detail-form（schema 驱动渲染、create/edit/view 三模式、值同步不重渲染、聚合 z-change、validate/getValues/reset/setFieldValue、group/columns/disabled/footer slot）
// Related: [[REQ-009]]
// Wiki: wiki/requirements/REQ-009-detail-form.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/app/detail-form/DetailForm";
import "../../../src/components/button/Button";

const flush = () => new Promise((r) => setTimeout(r, 0));

const ALL_FIELDS = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "age", label: "Age", type: "number", defaultValue: 18 },
  { name: "pass", label: "Password", type: "password" },
  { name: "email", label: "Email", type: "email" },
  { name: "bio", label: "Bio", type: "textarea" },
  {
    name: "city",
    label: "City",
    type: "select",
    options: [
      { value: "sh", label: "Shanghai" },
      { value: "bj", label: "Beijing" },
    ],
  },
  { name: "active", label: "Active", type: "boolean" },
  { name: "dob", label: "DOB", type: "date" },
];

function createForm(fields: any[] = ALL_FIELDS, value?: Record<string, unknown>, mode?: string): any {
  const el = document.createElement("z-detail-form") as any;
  el.fields = fields;
  if (value !== undefined) el.value = value;
  if (mode !== undefined) el.mode = mode;
  document.body.appendChild(el);
  return el;
}

/** 模拟 z-input 原生 change：z-input 的 _onChange 同步 prop 并发 z-change {value} */
function typeIn(input: any, text: string): void {
  const field = input.shadowRoot!.querySelector(".z-input__field") as HTMLInputElement;
  field.value = text;
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

describe("z-detail-form", () => {
  it("default: empty panel with root/extra/footer parts", async () => {
    const el = createForm([]);
    await flush();
    expect(el.shadowRoot!.querySelector("z-property-panel")).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[part="root"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[part="extra"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[part="footer"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it("renders all 8 field types as the right controls", async () => {
    const el = createForm();
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="name"]')!.tagName).toBe("Z-INPUT");
    expect(shadow.querySelector('[data-field="name"]')!.getAttribute("type")).toBe("text");
    expect(shadow.querySelector('[data-field="age"]')!.getAttribute("type")).toBe("number");
    expect(shadow.querySelector('[data-field="age"]')!.getAttribute("value")).toBe("18");
    expect(shadow.querySelector('[data-field="pass"]')!.getAttribute("type")).toBe("password");
    expect(shadow.querySelector('[data-field="email"]')!.getAttribute("type")).toBe("email");
    expect(shadow.querySelector('[data-field="bio"]')!.hasAttribute("multiline")).toBe(true);
    const select = shadow.querySelector('[data-field="city"]')!;
    expect(select.tagName).toBe("Z-SELECT");
    expect(select.querySelectorAll("z-option").length).toBe(2);
    expect(select.querySelector("z-option")!.getAttribute("value")).toBe("sh");
    expect(shadow.querySelector('[data-field="active"]')!.tagName).toBe("Z-SWITCH");
    const date = shadow.querySelector('[data-field="dob"]')!;
    expect(date.tagName).toBe("Z-DATEPICKER");
    expect(date.getAttribute("mode")).toBe("single");
    document.body.removeChild(el);
  });

  it("create mode ignores value, uses defaultValue", async () => {
    const el = createForm(undefined, { name: "X", age: 99 }, "create");
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="name"]')!.getAttribute("value")).toBe("");
    expect(shadow.querySelector('[data-field="age"]')!.getAttribute("value")).toBe("18");
    document.body.removeChild(el);
  });

  it("edit mode prefills from value; missing keys fall back to defaultValue", async () => {
    const el = createForm(undefined, { name: "Alice", active: false }, "edit");
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="name"]')!.getAttribute("value")).toBe("Alice");
    expect(shadow.querySelector('[data-field="age"]')!.getAttribute("value")).toBe("18");
    const sw = shadow.querySelector('[data-field="active"]')!;
    expect(sw.hasAttribute("checked")).toBe(false);
    document.body.removeChild(el);
  });

  it("view mode renders static text: option label, boolean text, localized date, dash", async () => {
    const el = createForm(undefined, {
      name: "Alice",
      city: "sh",
      active: true,
      dob: "2026-08-11",
      bio: "",
    }, "view");
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="name"]')).toBeNull();
    const statics = Array.from(shadow.querySelectorAll(".z-detail-form__static")).map((s) => s.textContent);
    expect(statics).toContain("Alice");
    expect(statics).toContain("Shanghai");
    expect(statics).toContain("Yes");
    expect(statics).toContain(new Date("2026-08-11T00:00:00").toLocaleDateString());
    expect(statics).toContain("—");
    document.body.removeChild(el);
  });

  it("invalid mode falls back to create", async () => {
    const el = createForm(undefined, undefined, "bogus");
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="name"]')!.tagName).toBe("Z-INPUT");
    expect(shadow.querySelector(".z-detail-form__static")).toBeNull();
    document.body.removeChild(el);
  });

  it("aggregates z-change with {values, field, value} and does not re-render", async () => {
    const el = createForm(undefined, undefined, "edit");
    await flush();
    const listener = vi.fn();
    el.addEventListener("z-change", listener);

    const input = el.shadowRoot!.querySelector('[data-field="name"]') as any;
    const inputRef = input;
    typeIn(input, "Alice");
    await flush();
    expect(listener).toHaveBeenCalledTimes(1);
    let detail = listener.mock.calls[0][0].detail;
    expect(detail.field).toBe("name");
    expect(detail.value).toBe("Alice");
    expect(detail.values.name).toBe("Alice");

    const select = el.shadowRoot!.querySelector('[data-field="city"]') as any;
    select.value = "bj";
    select.dispatchEvent(new CustomEvent("z-change", { bubbles: true, composed: true, detail: { value: "bj" } }));
    await flush();
    expect(listener).toHaveBeenCalledTimes(2);
    detail = listener.mock.calls[1][0].detail;
    expect(detail.field).toBe("city");
    expect(detail.values.city).toBe("bj");

    const sw = el.shadowRoot!.querySelector('[data-field="active"]') as any;
    sw.checked = true;
    sw.dispatchEvent(new CustomEvent("z-change", { bubbles: true, composed: true, detail: { checked: true } }));
    await flush();
    expect(listener).toHaveBeenCalledTimes(3);
    detail = listener.mock.calls[2][0].detail;
    expect(detail.field).toBe("active");
    expect(detail.values.active).toBe(true);

    // 变化后不重渲染：控件值保持、shadow 元素引用不变
    expect(el.shadowRoot!.querySelector('[data-field="name"]')).toBe(inputRef);
    expect((el.shadowRoot!.querySelector('[data-field="name"]') as any).value).toBe("Alice");
    document.body.removeChild(el);
  });

  it("external value re-set re-prefills untouched fields only", async () => {
    const el = createForm(undefined, { name: "A", city: "sh" }, "edit");
    await flush();
    typeIn(el.shadowRoot!.querySelector('[data-field="name"]') as any, "typed");
    await flush();
    el.value = { name: "Y", city: "bj" };
    await flush();
    const shadow = el.shadowRoot!;
    expect((shadow.querySelector('[data-field="name"]') as any).value).toBe("typed");
    expect((shadow.querySelector('[data-field="city"]') as any).value).toBe("bj");
    document.body.removeChild(el);
  });

  it("reset() clears edits back to value/defaultValue", async () => {
    const el = createForm(undefined, { name: "A" }, "edit");
    await flush();
    typeIn(el.shadowRoot!.querySelector('[data-field="name"]') as any, "typed");
    await flush();
    el.reset();
    await flush();
    expect((el.shadowRoot!.querySelector('[data-field="name"]') as any).value).toBe("A");
    document.body.removeChild(el);
  });

  it("setFieldValue updates control, emits z-change, marks touched", async () => {
    const el = createForm(undefined, { name: "A" }, "edit");
    await flush();
    const listener = vi.fn();
    el.addEventListener("z-change", listener);
    el.setFieldValue("name", "Z");
    await flush();
    expect((el.shadowRoot!.querySelector('[data-field="name"]') as any).value).toBe("Z");
    const detail = listener.mock.calls[0][0].detail;
    expect(detail.field).toBe("name");
    expect(detail.value).toBe("Z");
    expect(detail.values.name).toBe("Z");
    // 触碰后外部重设不再覆盖
    el.value = { name: "Y" };
    await flush();
    expect((el.shadowRoot!.querySelector('[data-field="name"]') as any).value).toBe("Z");
    document.body.removeChild(el);
  });

  it("getValues coerces number/boolean; empty number stays empty string", async () => {
    const el = createForm(undefined, undefined, "edit");
    await flush();
    const age = el.shadowRoot!.querySelector('[data-field="age"]') as any;
    typeIn(age, "42");
    const active = el.shadowRoot!.querySelector('[data-field="active"]') as any;
    active.checked = true;
    active.dispatchEvent(new CustomEvent("z-change", { bubbles: true, composed: true, detail: { checked: true } }));
    await flush();
    const values = el.getValues();
    expect(values.age).toBe(42);
    expect(values.active).toBe(true);
    expect(values.name).toBe("");
    typeIn(age, "");
    await flush();
    expect(el.getValues().age).toBe("");
    document.body.removeChild(el);
  });

  it("validate() flags empty required fields and writes control error; boolean required ignored", async () => {
    const fields = [
      { name: "name", type: "text", required: true },
      { name: "flag", type: "boolean", required: true },
    ];
    const el = createForm(fields, undefined, "edit");
    await flush();
    let result = el.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe("This field is required");
    expect(result.errors.flag).toBeUndefined();
    expect(el.shadowRoot!.querySelector('[data-field="name"]')!.hasAttribute("error")).toBe(true);

    typeIn(el.shadowRoot!.querySelector('[data-field="name"]') as any, "filled");
    await flush();
    result = el.validate();
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
    document.body.removeChild(el);
  });

  it("field-level and global disabled apply to generated controls", async () => {
    const fields = [
      { name: "a", type: "text" },
      { name: "b", type: "text", disabled: true },
    ];
    const el = createForm(fields);
    await flush();
    const shadow = el.shadowRoot!;
    expect(shadow.querySelector('[data-field="a"]')!.hasAttribute("disabled")).toBe(false);
    expect(shadow.querySelector('[data-field="b"]')!.hasAttribute("disabled")).toBe(true);
    el.disabled = true;
    await flush();
    expect(shadow.querySelector('[data-field="a"]')!.hasAttribute("disabled")).toBe(true);
    expect(shadow.querySelector("z-property-panel")!.hasAttribute("disabled")).toBe(true);
    document.body.removeChild(el);
  });

  it("field-<name> slot override is projected and excluded from aggregation", async () => {
    const el = createForm(undefined, { name: "initial" }, "edit");
    await flush();
    const slot = el.shadowRoot!.querySelector('slot[name="field-name"]') as HTMLSlotElement;
    expect(slot).not.toBeNull();
    const override = document.createElement("z-input") as any;
    override.setAttribute("slot", "field-name");
    el.appendChild(override);
    override.value = "custom";
    override.dispatchEvent(new CustomEvent("z-change", { bubbles: true, composed: true, detail: { value: "custom" } }));
    await flush();
    // 覆盖控件不参与聚合：values 仍是原初始值
    expect(el.getValues().name).toBe("initial");
    document.body.removeChild(el);
  });

  it("columns pass through to the inner property panel", async () => {
    const el = createForm();
    el.columns = "2";
    await flush();
    const panel = el.shadowRoot!.querySelector("z-property-panel") as any;
    expect(panel.style.getPropertyValue("--_z-property-cols")).toBe("repeat(2, minmax(0, 1fr))");
    document.body.removeChild(el);
  });

  it("groups fields by first-appearance order; ungrouped fields are bare rows", async () => {
    const fields = [
      { name: "a", type: "text", group: "Basic" },
      { name: "b", type: "text" },
      { name: "c", type: "text", group: "Advanced" },
      { name: "d", type: "text", group: "Basic" },
    ];
    const el = createForm(fields);
    await flush();
    const shadow = el.shadowRoot!;
    const groups = shadow.querySelectorAll("z-property-group");
    expect(groups.length).toBe(2);
    expect(groups[0].getAttribute("title")).toBe("Basic");
    expect(groups[1].getAttribute("title")).toBe("Advanced");
    expect(groups[0].querySelector('[data-field="a"]')).not.toBeNull();
    expect(groups[0].querySelector('[data-field="d"]')).not.toBeNull();
    expect(groups[1].querySelector('[data-field="c"]')).not.toBeNull();
    const bareRow = shadow.querySelector("z-property-panel > z-property-row");
    expect(bareRow).not.toBeNull();
    expect(bareRow!.querySelector('[data-field="b"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it("footer slot projects light-DOM content; its interactions do not aggregate", async () => {
    const el = createForm();
    await flush();
    const btn = document.createElement("z-button") as any;
    btn.setAttribute("slot", "footer");
    btn.textContent = "Save";
    el.appendChild(btn);
    await flush();
    const slot = el.shadowRoot!.querySelector('.z-detail-form__footer slot[name="footer"]') as HTMLSlotElement;
    expect(slot.assignedElements()).toContain(btn);
    const listener = vi.fn();
    el.addEventListener("z-change", listener);
    btn.dispatchEvent(new CustomEvent("z-click", { bubbles: true, composed: true }));
    await flush();
    expect(listener).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("labelWidth sets the --z-property-label-width inline var", async () => {
    const el = createForm();
    el.labelWidth = "120px";
    await flush();
    expect(el.style.getPropertyValue("--z-property-label-width")).toBe("120px");
    document.body.removeChild(el);
  });

  it("escapes labels and option labels (no element injection)", async () => {
    const fields = [
      { name: "x", type: "select", label: "<b>&</b>", options: [{ value: "1", label: "A<B>&C" }] },
    ];
    const el = createForm(fields);
    await flush();
    const row = el.shadowRoot!.querySelector("z-property-row")!;
    const labelSlot = row.querySelector('[slot="label"]')!;
    expect(labelSlot.textContent).toBe("<b>&</b>");
    expect(labelSlot.querySelector("b")).toBeNull();
    const option = el.shadowRoot!.querySelector("z-option")!;
    expect(option.textContent).toBe("A<B>&C");
    expect(option.querySelector("b")).toBeNull();
    document.body.removeChild(el);
  });
});

// ── 字段的可访问名（2026-11-16）──────────────────────────────────────────
//
// [WHY 这一组存在] 本组件把每一行交给 `z-property-row`，后者负责把 label 写成控件的
// `aria-label`（IDREF 跨 shadow 不解析，这是唯一还能走的办法）。而本组件为了让单字段
// 可覆盖，在行里先渲染了一个 `<slot name="field-xxx">` 占位、再渲染真控件 ——
// `z-property-row` 原来取「默认槽里第一个元素」，拿到的正是那个**空占位符**：
// `fieldOf(<slot>)` 恒为 null（它没有影子树），名字静默地送不进去。
// 真机 CDP 实测（改之前）：三个字段的 AX `name` 全是空串，读屏只念「编辑框」。
// 这组用例盯的就是「容器穿透占位符，落到真正的控件上」。
describe("z-detail-form 字段名", () => {
  it("A1 每个字段的控件都拿到了自己的标签（不是空占位槽）", async () => {
    const { fieldOf } = await import("../../../src/core/a11y.js");
    const el = createForm(
      [
        { name: "shop", label: "门店名", type: "text", required: true },
        { name: "note", label: "备注", type: "textarea" },
      ],
      undefined,
      "edit",
    );
    await flush();

    for (const [name, label] of [["shop", "门店名"], ["note", "备注"]]) {
      const control = el.shadowRoot!.querySelector(`[data-field="${name}"]`);
      expect(control, `字段 ${name} 的控件没渲染出来`).toBeTruthy();
      const field = fieldOf(control);
      expect(field, `字段 ${name}：控件影子树里没有主可聚焦件`).toBeTruthy();
      expect(field!.getAttribute("aria-label"), `字段 ${name} 在读屏里没有名字`).toBe(label);
    }
    document.body.removeChild(el);
  });

  it("A2 名字不会被行里的占位槽截胡", async () => {
    const el = createForm([{ name: "shop", label: "门店名", type: "text" }], undefined, "edit");
    await flush();

    const row = el.shadowRoot!.querySelector("z-property-row")!;
    const defaultSlot = row.shadowRoot!.querySelector("slot:not([name])") as HTMLSlotElement;
    // 前提：默认槽的第一个被分配元素确实是占位 `<slot>`（结构没变，这条才有意义）
    expect(defaultSlot.assignedElements()[0].tagName).toBe("SLOT");
    // 而占位符自己不该被写上任何名字（它不可聚焦，写了也没人念）
    expect(defaultSlot.assignedElements()[0].hasAttribute("aria-label")).toBe(false);
    document.body.removeChild(el);
  });
});
