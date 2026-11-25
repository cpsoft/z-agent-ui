// Test: 单选控件的选中项回显 —— z-select 必须自带 z-option 注册
// Related: [[2026-10-27-value-map-and-drill]] / src/components/select/index.ts / src/page/mount.ts
// Wiki: wiki/reference/pagedef-filters.md
// Date: 2026-10-27
//
// 缺陷形态：`Select.ts` 只 `import type { ZOption }`（类型擦除后没有任何注册动作）。
// 宿主单独引 `z-agent-ui/select` 时，页面上是：
//   `<z-select value="on"><z-option value="on">上架在售</z-option></z-select>`
// 而 z-option 没升级 ⇒ `option.value` 是 undefined ⇒ `value="on"` 匹配不到任何项
// ⇒ **默认值不回显**（控件停在占位符）、点选项拿到空值。
// 界面完好、不报错、不 lint —— 只在「配了 options / default」的筛选控件上出现。
//
// 断言用渲染结果（shadow 里的 value 文本），不是「注册表里有没有这个名字」：
// 只查 customElements.get 的话，「注册了但回显仍坏」也照样绿。

import { afterEach, describe, expect, it } from "vitest";
// 只引 select（模拟宿主只引这一个）：z-option 必须被它一起带进来
import "../../src/components/select/index.js";

function tick(ms = 0): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-select 的选中项回显", () => {
  it("单独引 select 也能让 value 对应的文案显示出来（z-option 已注册）", async () => {
    expect(customElements.get("z-option")).toBeTruthy();

    const sel = document.createElement("z-select");
    sel.setAttribute("value", "on");
    sel.innerHTML = '<z-option value="">—</z-option><z-option value="on">上架在售</z-option><z-option value="off">已下架</z-option>';
    document.body.appendChild(sel);
    await tick(30);

    const shown = sel.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim();
    expect(shown).toBe("上架在售");
    // 正控：没配 value 时应该是占位符，而不是把第一项当成选中
    const blank = document.createElement("z-select");
    blank.innerHTML = '<z-option value="on">上架在售</z-option>';
    document.body.appendChild(blank);
    await tick(30);
    expect(blank.shadowRoot?.querySelector('[part="value"]')?.textContent?.trim()).toBe("Select...");
  });
});
