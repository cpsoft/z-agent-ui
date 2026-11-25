// Test: z-select 展开/收起时 trigger 必须保住焦点，Esc 只关下拉不外溢
// Related: [[bug-20261105-bind-field-select-blur]]
// Wiki: wiki/bugs/20261105-bind-field-select-blur.md
// Date: 2026-11-05
//
// 症状：页面编辑器右栏「绑定字段」点了下拉，控件立刻失焦；接着按 Esc 不但没关下拉，
// 反而把选中从控件挪到了外层容器（属性面板整块换掉）。
//
// 根因两条：
//   1. `performUpdate` 用 `shadow.innerHTML` 重建，mousedown 刚聚焦的 trigger 被换掉；
//      焦点记忆只认 data-field / id / name，trigger 三样都没有 ⇒ 焦点掉到 body。
//   2. Esc 只在组件内收起下拉，没拦冒泡，外层（编辑器 window）又执行了一遍「回到上一级」。
//
// 这两条都用**同一个事件**能验出来：焦点丢了，Esc 就落不到组件上；拦不住冒泡，外层就会响。
//
// 2026-11-15 补：焦点模型从「留在触发器」改成「进入 listbox」（跨 shadow 的
// aria-activedescendant 无效，见 wiki/lessons/shadow-boundary-idref.md）。
// 用例的第一条判据跟着改，但它防的东西没变 —— 焦点不许掉到 body。

import { afterEach, describe, expect, it } from "vitest";
import "../../../src/components/option/Option";
import "../../../src/components/select/Select";

type El = HTMLElement & { value: string; open: boolean };

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function create(): El {
  const el = document.createElement("z-select") as El;
  for (const [v, label] of [
    ["date", "date"],
    ["cat", "cat"],
  ]) {
    const opt = document.createElement("z-option") as HTMLElement & { value: string };
    opt.value = v;
    opt.textContent = label;
    el.appendChild(opt);
  }
  document.body.appendChild(el);
  return el;
}

const triggerOf = (el: HTMLElement): HTMLElement =>
  el.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;

function click(el: Element | null | undefined): void {
  el?.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true }));
}

const hosts: HTMLElement[] = [];
afterEach(() => {
  hosts.splice(0).forEach((h) => h.remove());
});

describe("z-select 焦点与 Esc（bug-20261105）", () => {
  it("展开下拉后焦点进入列表，没掉到 body", async () => {
    const el = create();
    hosts.push(el);
    await tick();

    const before = triggerOf(el);
    before.focus();
    // trigger 要带稳定标识，重建后基类才找得回来
    expect(before.getAttribute("data-focus-key")).toBe("trigger");

    click(before);
    await tick();

    expect(el.open).toBe(true);
    // [WHY 这条判据 2026-11-15 变了] 原断言是「焦点仍在 trigger 上」，那是**旧焦点模型**：
    // 焦点留在触发器、方向键光标靠触发器上的 `aria-activedescendant` 表达。但触发器在
    // shadow 里、弹层在 body，IDREF 跨树解析不到（CDP 无障碍树实测该属性不出现），
    // 读屏全程不吭声。所以改成焦点进 listbox —— 承载者与选项同树，activedescendant 才生效。
    //
    // 但这条用例要防的**缺陷本身没变**：trigger 被重建后焦点掉到 body（bug-20261105）。
    // 判据跟着模型换，防线不能撤：焦点必须在面板列表里，而不是 document.body。
    const active = document.activeElement as HTMLElement | null;
    expect(active, "展开后焦点掉到 body 了 —— bug-20261105 复现").not.toBe(document.body);
    expect(active?.getAttribute("role"), "焦点应落在面板的 listbox 上").toBe("listbox");
    expect(active?.getAttribute("aria-activedescendant"), "listbox 要能指出当前停在哪一项").toBeTruthy();
    // 顺带锁住「触发器的稳定标识还在」：关闭时要靠 data-focus-key 把焦点送回去
    expect(triggerOf(el).getAttribute("data-focus-key")).toBe("trigger");
  });

  it("Esc 收起下拉，且不再往外层冒泡", async () => {
    const el = create();
    hosts.push(el);
    await tick();

    let outer = 0;
    const onOuterKey = (): void => {
      outer += 1;
    };
    // 模拟页面编辑器的 window keydown（Esc = 回到上一级）
    window.addEventListener("keydown", onOuterKey);

    const trigger = triggerOf(el);
    trigger.focus();
    click(trigger);
    await tick();
    expect(el.open).toBe(true);

    // 从展开态的新 trigger 发（旧节点已脱离文档）
    triggerOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    await tick();

    expect(el.open).toBe(false);
    // 不拦冒泡时这一条是 1：外层会把同一下 Esc 执行成「退出上一层」
    expect(outer).toBe(0);

    window.removeEventListener("keydown", onOuterKey);
  });
});
