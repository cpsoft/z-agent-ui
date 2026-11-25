// Test: `z-select` 的键盘导航（选项间移动 + aria-activedescendant）
//
// [为什么单独一个文件] 2026-11-16 之前 `z-select` 的键盘只有一条用例
// （`keyboard navigation works on filtered options`），它验的是「过滤后 ↓ 能高亮第二项」。
// 三条真实缺陷都活在那一条的缝里：
//   · **没有 Home / End** —— 500 项的物料下拉里跳到末尾要按 499 下，
//     而同一份键盘帮助里菜单是支持的；
//   · **跳禁用项的算法是手写 `do…while`** —— 全禁用时靠外面一句
//     `if (enabled.length === 0) break` 兜住，那是第二份真相；
//   · **activedescendant 必须写在持有焦点的那个元素上** —— 写在触发器上时
//     DOM 查得到、AX 树里根本没有（2026-11-15 CDP 实测），而高亮一格格跳得完全正常。
//
// 高亮判据用 `aria-activedescendant` 而不是 `--active` 类：两者不一致时
// 视觉看着对、读屏念的是另一项，而后者只有这一个属性会暴露。

import { afterEach, describe, expect, it } from "vitest";
import "../../../src/components/option/Option";
import "../../../src/components/select/Select";

type Spec = [value: string, label: string, disabled?: boolean];

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function dropdown(): HTMLElement {
  const all = document.querySelectorAll<HTMLElement>(".z-select__dropdown");
  return all[all.length - 1];
}

function options(): HTMLElement[] {
  return Array.from(dropdown().querySelectorAll<HTMLElement>(".z-select__option"));
}

function listbox(): HTMLElement {
  return dropdown().querySelector<HTMLElement>(".z-select__options")!;
}

function activeIndex(): number {
  return options().findIndex((el) => el.classList.contains("z-select__option--active"));
}

/** 派发到面板上（组件的 keydown 监听挂在面板，不是 listbox 上）。 */
function press(key: string): boolean {
  return dropdown().dispatchEvent(
    new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
  );
}

async function openSelect(specs: Spec[]): Promise<any> {
  const el = document.createElement("z-select") as any;
  for (const [value, label, disabled] of specs) {
    const opt = document.createElement("z-option") as any;
    opt.value = value;
    opt.textContent = label;
    if (disabled) opt.disabled = true;
    el.appendChild(opt);
  }
  document.body.appendChild(el);
  await tick();

  (el.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement).click();
  await tick();
  return el;
}

const THREE: Spec[] = [
  ["a", "Apple"],
  ["b", "Banana"],
  ["c", "Cherry"],
];

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-select 键盘导航", () => {
  it("S1 ↓↑ 在选项间移动并绕回，且消费掉按键", async () => {
    const el = await openSelect(THREE);
    expect(activeIndex(), "打开时高亮落在第一个可用项").toBe(0);

    expect(press("ArrowDown"), "↓ 必须 preventDefault，否则页面跟着滚").toBe(false);
    expect(activeIndex()).toBe(1);
    press("ArrowDown");
    expect(activeIndex()).toBe(2);
    press("ArrowDown");
    expect(activeIndex(), "末项 ↓ 绕回首项").toBe(0);
    press("ArrowUp");
    expect(activeIndex(), "首项 ↑ 绕到末项").toBe(2);

    expect(el.open).toBe(true);
  });

  it("S2 ★ Home / End 直达首尾（2026-11-16 新补的能力）", async () => {
    // [WHY 单独立一条] 这两键以前**根本不存在**：`switch` 里只有 ↓↑EnterEscTab。
    // 缺了不影响功能、只影响用键盘的人 —— 于是它不会被任何「功能测试」发现。
    const el = await openSelect([
      ["1", "One"],
      ["2", "Two"],
      ["3", "Three"],
      ["4", "Four"],
      ["5", "Five"],
      ["6", "Six"],
    ]);
    expect(activeIndex()).toBe(0);

    expect(press("End")).toBe(false);
    expect(activeIndex()).toBe(5);
    press("Home");
    expect(activeIndex()).toBe(0);
    press("End");
    press("ArrowDown");
    expect(activeIndex(), "末项再 ↓ 绕回").toBe(0);

    expect(el.open).toBe(true);
  });

  it("S3 ★ 跳过禁用项（下标必须与全集对齐）", async () => {
    // [WHY 这条是 `isDisabled` 存在的理由] 下拉的 `_activeIndex` 同时是
    // `id` 后缀、勾选态依据、hover 落点 —— 所以**不能**先滤掉禁用项再算下标。
    // 手写的 `do…while` 做法在这里是对的，但它在下标回绕 + 全禁用两处各有隐患；
    // 换成 `resolveIndex({ isDisabled })` 后行为等价、边界收敛到一处。
    await openSelect([
      ["a", "Apple"],
      ["b", "Banana", true],
      ["c", "Cherry"],
      ["d", "Date"],
    ]);
    expect(options()[1].classList.contains("z-select__option--disabled")).toBe(true);

    press("ArrowDown");
    expect(activeIndex(), "跳过第 2 项（禁用），落在第 3 项").toBe(2);
    press("ArrowDown");
    expect(activeIndex()).toBe(3);
    press("ArrowDown");
    expect(activeIndex(), "回绕到首项").toBe(0);
    press("ArrowUp");
    expect(activeIndex(), "首项 ↑ 绕到末项（末项可用）").toBe(3);
    press("End");
    expect(activeIndex()).toBe(3);
  });

  it("S4 ★ Home / End 也跳禁用项（首项禁用时落第一个可用项）", async () => {
    await openSelect([
      ["a", "Apple", true],
      ["b", "Banana"],
      ["c", "Cherry"],
      ["d", "Date", true],
    ]);

    press("End");
    expect(activeIndex(), "末项禁用 ⇒ 落在倒数第二个可用项").toBe(2);
    press("Home");
    expect(activeIndex(), "首项禁用 ⇒ 落在第一个可用项").toBe(1);
  });

  it("S5 ★ aria-activedescendant 写在**持有焦点的那个元素**上", async () => {
    // 非搜索模式：焦点进 listbox，IDREF 必须与选项同树才解析得到。
    // 触发器在 z-select 的 shadow 里、面板挂在 body —— 写在触发器上会「查得到但不生效」。
    const el = await openSelect(THREE);
    expect(listbox().getAttribute("tabindex")).toBe("-1");
    expect(listbox().getAttribute("aria-activedescendant")).toBe(options()[0].id);

    press("ArrowDown");
    expect(listbox().getAttribute("aria-activedescendant")).toBe(options()[1].id);
    expect(
      (el.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement).hasAttribute(
        "aria-activedescendant",
      ),
      "触发器上不该有 IDREF —— 跨 shadow 不解析",
    ).toBe(false);
  });

  it("S6 全部选项禁用时 ↓ 不炸、不产生高亮（按键仍被消费）", async () => {
    const el = await openSelect([
      ["a", "Apple", true],
      ["b", "Banana", true],
    ]);
    expect(activeIndex(), "一个可用项都没有 ⇒ 无高亮").toBe(-1);
    expect(listbox().hasAttribute("aria-activedescendant")).toBe(false);

    expect(press("ArrowDown"), "无落点也仍要消费").toBe(false);
    expect(activeIndex()).toBe(-1);
    expect(el.open).toBe(true);
  });

  it("S7 ←→ 不归下拉的一维移动管（不吞键）", async () => {
    await openSelect(THREE);
    expect(press("ArrowRight")).toBe(true);
    expect(activeIndex()).toBe(0);
    expect(press("ArrowLeft")).toBe(true);
    expect(activeIndex()).toBe(0);
  });
});

// ── 清空 / 删标签的键盘路径 ────────────────────────────────────────────────
//
// [为什么单列一组] 清除钮与标签上的 ✕ 都是 `tabindex="-1"`（触发器本身已经是
// Tab 停靠点，再塞进去用户要按两次 Tab 才能过这一个筛选格）。代价是**键盘用户
// 完全没有清空路径**：下拉的值不是能选中再删掉的文本。
// 于是补两条约定键：`Delete` = 删掉这个值，`Backspace` = 退掉最后一个标签。

describe("z-select 清空与删标签", () => {
  /** 造一个已选值、未打开的下拉，焦点落在触发器上。 */
  async function closedSelect(opts: {
    specs: Spec[];
    multiple?: boolean;
    clearable?: boolean;
    value: string;
  }): Promise<any> {
    const el = document.createElement("z-select") as any;
    for (const [value, label, disabled] of opts.specs) {
      const opt = document.createElement("z-option") as any;
      opt.value = value;
      opt.textContent = label;
      if (disabled) opt.disabled = true;
      el.appendChild(opt);
    }
    el.multiple = !!opts.multiple;
    el.clearable = !!opts.clearable;
    el.value = opts.value;
    document.body.appendChild(el);
    await tick();
    return el;
  }

  /**
   * 从触发器上派发按键。
   *
   * [WHY `composed: true` 不能省] 组件的 keydown 监听挂在**宿主**上，而触发器等在
   * shadow 里。合成事件的 `composed` 默认是 `false`，不出影子边界 ⇒ 宿主永远收不到，
   * 而断言"没被消费"恰好会通过 —— 一个恒绿的假通过。真实按键是 composed 的。
   */
  function pressOnTrigger(el: any, key: string): boolean {
    const trigger = el.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement;
    return trigger.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, composed: true }),
    );
  }

  it("S8 单选 + clearable：Delete 清空并发 z-change", async () => {
    const el = await closedSelect({ specs: THREE, clearable: true, value: "b" });
    const seen: any[] = [];
    el.addEventListener("z-change", (e: CustomEvent) => seen.push(e.detail));

    expect(pressOnTrigger(el, "Delete"), "要消费掉 —— 否则浏览器/外层会拿它做别的事").toBe(false);
    expect(el.value).toBe("");
    expect(seen, "清空必须沿「值变化」这一条出口通知宿主").toEqual([{ value: "" }]);
  });

  it("S9 没有 clearable 时 Delete 不清空、也不消费", async () => {
    // 判据是「作者有没有给清空入口」。没有清除钮，键盘也不该能清 —— 否则
    // 键盘用户能到达一个鼠标用户到不了的状态。
    const el = await closedSelect({ specs: THREE, value: "b" });
    expect(pressOnTrigger(el, "Delete")).toBe(true);
    expect(el.value).toBe("b");
  });

  it("S10 多选：Backspace 退掉最后一个标签", async () => {
    const el = await closedSelect({
      specs: THREE,
      multiple: true,
      value: "a,c",
    });
    const seen: any[] = [];
    el.addEventListener("z-change", (e: CustomEvent) => seen.push(e.detail));

    expect(pressOnTrigger(el, "Backspace")).toBe(false);
    expect(el.value, "只退一个，顺序以值为准").toBe("a");
    expect(seen[0].values).toEqual(["a"]);
  });

  it("S11 多选删空后 Backspace 不再消费（让焦点能正常退出）", async () => {
    const el = await closedSelect({ specs: THREE, multiple: true, value: "a" });
    expect(pressOnTrigger(el, "Backspace")).toBe(false);
    expect(el.value).toBe("");
    // 已经空了：这一下不该被吞掉，否则用户在空下拉上按退格毫无反馈
    expect(pressOnTrigger(el, "Backspace")).toBe(true);
  });

  it("S12 打开状态下 Delete 不清空（面板里的键归面板）", async () => {
    const el = await closedSelect({ specs: THREE, clearable: true, value: "b" });
    (el.shadowRoot!.querySelector(".z-select__trigger") as HTMLElement).click();
    await tick();
    expect(el.open).toBe(true);
    pressOnTrigger(el, "Delete");
    expect(el.value).toBe("b");
  });

  it("S13 单选上按 Backspace 不做任何事（那是文本框的键）", async () => {
    const el = await closedSelect({ specs: THREE, clearable: true, value: "b" });
    expect(pressOnTrigger(el, "Backspace")).toBe(true);
    expect(el.value).toBe("b");
  });
});
