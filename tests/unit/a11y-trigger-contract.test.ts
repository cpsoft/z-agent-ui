// Test: 六个浮层组件的触发器语义落点（契约测试）
//
// [WHY 需要这一条而不是各组件各写一遍] 这六处曾经是**同一个缺陷复制了六份**：
// `aria-haspopup` / `aria-expanded` 写在 `<span part="trigger">` 这个 slot 容器上，
// 而容器不可聚焦、没有 role —— 无障碍树里根本不出现（2026-11-16 CDP 实测）。
// 修法收在一个 `bindTriggerAria` 里，但"每个组件都调了它"这件事只能靠这种契约测试守：
// 将来新加一个浮层组件、忘了接绑定，界面上一切正常，只有用读屏的人发现
// "这个按钮说不出自己有弹出层"。
import { describe, it, expect, afterEach } from "vitest";

import "../../src/components/popover/Popover.ts";
import "../../src/components/popconfirm/Popconfirm.ts";
import "../../src/components/menu/Menu.ts";
import "../../src/components/datepicker/Datepicker.ts";
import "../../src/components/time-picker/TimePicker.ts";
import "../../src/components/date-range/DateRange.ts";

/** 每个组件：标签、塞进槽里的按钮怎么写、期望的 haspopup 值。 */
const CASES: { tag: string; slotAttr: string; hasPopup: string }[] = [
  { tag: "z-popover", slotAttr: 'slot="trigger"', hasPopup: "true" },
  { tag: "z-popconfirm", slotAttr: "", hasPopup: "dialog" },
  { tag: "z-menu", slotAttr: 'slot="trigger"', hasPopup: "menu" },
  { tag: "z-datepicker", slotAttr: 'slot="trigger"', hasPopup: "dialog" },
  { tag: "z-time-picker", slotAttr: 'slot="trigger"', hasPopup: "dialog" },
  { tag: "z-date-range", slotAttr: 'slot="trigger"', hasPopup: "dialog" },
];

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("浮层触发器的 aria 契约", () => {
  const made: HTMLElement[] = [];

  afterEach(() => {
    for (const el of made) el.remove();
    made.length = 0;
  });

  for (const c of CASES) {
    it(`${c.tag}：haspopup/expanded 在消费者塞的按钮上，容器上一个不留`, async () => {
      const el = document.createElement(c.tag);
      el.innerHTML = `<button ${c.slotAttr}>触发</button>`;
      document.body.appendChild(el);
      made.push(el);
      await flush();

      const trigger = el.querySelector("button")!;
      expect(trigger.getAttribute("aria-haspopup"), "按钮上必须能读出「有弹出层」").toBe(c.hasPopup);
      expect(trigger.getAttribute("aria-expanded"), "折叠态要说 false，不能说空").toBe("false");

      const wrap = el.shadowRoot!.querySelector('[part="trigger"]')!;
      expect(wrap.getAttribute("aria-haspopup"), "容器上留着只会让人以为这里已经管了").toBeNull();
      expect(wrap.getAttribute("aria-expanded")).toBeNull();
    });
  }

  it("打开之后 aria-expanded 跟着变（以 z-popover 为例）", async () => {
    const el = document.createElement("z-popover") as HTMLElement & { open: boolean };
    el.innerHTML = `<button slot="trigger">触发</button>`;
    document.body.appendChild(el);
    made.push(el);
    await flush();

    const trigger = el.querySelector("button")!;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    el.open = true;
    await flush();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  it("槽里换成 `<z-button>` 时属性要进到它内部的 button 上", async () => {
    const btn = await import("../../src/components/button/Button.ts");
    void btn;
    const el = document.createElement("z-popover");
    el.innerHTML = `<z-button slot="trigger">触发</z-button>`;
    document.body.appendChild(el);
    made.push(el);
    await flush();
    await flush();

    const shell = el.querySelector("z-button")!;
    const inner = shell.shadowRoot?.querySelector("button");
    expect(inner, "z-button 内部应有原生 button").toBeTruthy();
    expect(
      inner!.getAttribute("aria-haspopup"),
      "宿主不可聚焦，写它不会生效；必须进到内层 button",
    ).toBe("true");
    expect(shell.hasAttribute("aria-expanded")).toBe(false);
  });
});
