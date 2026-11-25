// `z-menu` 的交互链路：打开 / 切换 / 选中 / 关闭。
//
// [为什么单独一个文件] 原来的 menu.test.ts（69 行）只断言静态标记与属性默认值，
// **一次点击都没有** —— 于是「点触发器打不开」这个 bug 一路绿到线上，
// 是 2026-10-25 学员在 demo 里点「Actions」发现没反应才暴露的。
//
// [回归锁] 第一条用例用**带 slot="trigger" 的光 DOM 子元素**当触发器，
// 这正是 demo 的写法（<z-button slot="trigger">）。旧实现用 trigger.contains(e.target) 判断，
// 而 slot 分配节点不是 span 的 DOM 后代 ⇒ 永远返回 false ⇒ 点了没反应。
// 注意不要在测试里用 computedPath 去模拟浏览器：happy-dom 的 composedPath 不含插槽节点。

import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../src/components/menu-item/MenuItem";
import "../../../src/components/menu/Menu";

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function makeMenu(opts: { disabledItem?: boolean } = {}): any {
  const menu = document.createElement("z-menu") as any;

  const trigger = document.createElement("button");
  trigger.setAttribute("slot", "trigger");
  trigger.textContent = "Actions";
  menu.appendChild(trigger);

  for (const [value, label] of [
    ["edit", "Edit"],
    ["duplicate", "Duplicate"],
    ["delete", "Delete"],
  ]) {
    const item = document.createElement("z-menu-item") as any;
    item.value = value;
    item.textContent = label;
    if (opts.disabledItem && value === "delete") item.disabled = true;
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  return menu;
}

const panel = () => document.querySelector(".z-menu__dropdown");
const items = () => Array.from(document.querySelectorAll<HTMLElement>(".z-menu__dropdown .z-menu__item"));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("z-menu 交互", () => {
  it("点插槽触发器能打开（回归：旧实现 contains 判定恒 false）", async () => {
    const menu = makeMenu();
    await tick();

    (menu.querySelector("button") as HTMLElement).click();
    await tick();

    expect(menu.open).toBe(true);
    expect(panel()).not.toBeNull();
    expect(items().map((el) => el.textContent)).toEqual(["Edit", "Duplicate", "Delete"]);
  });

  it("再点一次触发器收起（切换而不是只能开）", async () => {
    const menu = makeMenu();
    await tick();
    const trigger = menu.querySelector("button") as HTMLElement;

    trigger.click();
    await tick();
    expect(menu.open).toBe(true);

    trigger.click();
    await tick();
    expect(menu.open).toBe(false);
  });

  it("点触发器内部嵌套元素也能打开（trigger 不是直接子元素时同样有效）", async () => {
    const menu = document.createElement("z-menu") as any;
    const wrap = document.createElement("span");
    wrap.setAttribute("slot", "trigger");
    const inner = document.createElement("b");
    inner.textContent = "Actions";
    wrap.appendChild(inner);
    menu.appendChild(wrap);
    const item = document.createElement("z-menu-item") as any;
    item.value = "x";
    item.textContent = "X";
    menu.appendChild(item);
    document.body.appendChild(menu);
    await tick();

    inner.click();
    await tick();
    expect(menu.open).toBe(true);
  });

  it("选中菜单项：emit z-select 带 value，并自动收起", async () => {
    const menu = makeMenu();
    await tick();
    const onSelect = vi.fn();
    menu.addEventListener("z-select", onSelect);

    (menu.querySelector("button") as HTMLElement).click();
    await tick();
    items()[1].click(); // Duplicate
    await tick();

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls[0][0] as CustomEvent).detail).toEqual({ value: "duplicate" });
    expect(menu.open).toBe(false);
    // 收起是带动画的：面板先加 hiding 类，再由 animationend/timeout 移除
    expect(panel()?.classList.contains("z-menu__dropdown--hiding")).toBe(true);
  });

  it("disabled 的菜单项点了不 emit", async () => {
    const menu = makeMenu({ disabledItem: true });
    await tick();
    const onSelect = vi.fn();
    menu.addEventListener("z-select", onSelect);

    (menu.querySelector("button") as HTMLElement).click();
    await tick();
    expect(items()[2].dataset.disabled).toBe("true");

    items()[2].click();
    await tick();

    expect(onSelect).not.toHaveBeenCalled();
    expect(menu.open).toBe(true);
  });

  it("点外部关闭，且不会误伤面板内部点击", async () => {
    const menu = makeMenu();
    await tick();
    (menu.querySelector("button") as HTMLElement).click();
    await tick();
    expect(menu.open).toBe(true);

    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    await tick();
    expect(menu.open).toBe(false);
  });

  it("disabled 的整个菜单点触发器不打开", async () => {
    const menu = makeMenu();
    menu.disabled = true;
    await tick();

    (menu.querySelector("button") as HTMLElement).click();
    await tick();
    expect(menu.open).toBe(false);
    expect(panel()).toBeNull();
  });

  it("Escape 关闭并复位 open", async () => {
    const menu = makeMenu();
    await tick();
    (menu.querySelector("button") as HTMLElement).click();
    await tick();

    panel()!.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();

    expect(menu.open).toBe(false);
  });
});

// ── 键盘导航 ─────────────────────────────────────────────────────────────────
//
// [为什么单开一组] 这一份交互测试写了八条，**一条方向键都没有** —— 于是「按 ↑↓
// 高亮不动」「Home/End 不存在」「跳过禁用项时高亮错位一格」三种缺陷都能一直绿。
// 2026-11-16 把一维移动交给 L0 的 `listIntent` + `resolveIndex` 之后补上这组，
// 它们锁的是「降级回手写算法时会不会被发现」。
//
// 高亮的判据用 `aria-activedescendant` 而不是 `--active` 类：那个属性是读屏
// 唯一能知道「现在停在哪」的东西，两者不一致时视觉看着对、读屏念的是另一项。

describe("z-menu 键盘", () => {
  const activeIndex = (): number =>
    items().findIndex((el) => el.classList.contains("z-menu__item--active"));

  const activeDescendant = (): string | null => panel()!.getAttribute("aria-activedescendant");

  function press(key: string): boolean {
    // cancelable 才能观察 preventDefault：返回 false = 这一键被消费了
    return panel()!.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
    );
  }

  async function openMenu(opts: { disabledItem?: boolean } = {}): Promise<any> {
    const menu = makeMenu(opts);
    await tick();
    (menu.querySelector("button") as HTMLElement).click();
    await tick();
    return menu;
  }

  it("M1 ↓↑ 在项间移动并绕回，且消费掉按键（不再滚页面）", async () => {
    const menu = await openMenu();
    expect(activeIndex()).toBe(0);

    expect(press("ArrowDown"), "↓ 必须 preventDefault，否则页面跟着滚").toBe(false);
    expect(activeIndex()).toBe(1);
    press("ArrowDown");
    expect(activeIndex()).toBe(2);
    press("ArrowDown");
    expect(activeIndex(), "末项 ↓ 绕回首项").toBe(0);
    press("ArrowUp");
    expect(activeIndex(), "首项 ↑ 绕到末项").toBe(2);

    expect(menu.open).toBe(true);
  });

  it("M2 Home / End 直达首尾", async () => {
    await openMenu();
    press("ArrowDown");
    press("ArrowDown");
    expect(activeIndex()).toBe(2);

    press("Home");
    expect(activeIndex()).toBe(0);
    press("End");
    expect(activeIndex()).toBe(2);
  });

  it("M3 ★ 跳过禁用项，且 aria-activedescendant 与视觉高亮是同一项", async () => {
    // [WHY 这条最容易写错] 菜单的 `_activeIndex` 是**可用项**里的序号，
    // 而取元素时若按全集下标取，禁用项一出现就整体错位一格 ——
    // 高亮跳到禁用项上、`--active` 却加不上（被 data-disabled 挡住），
    // 于是「高亮凭空消失一次」。两个判据必须同时断言，只看类名会漏掉 IDREF 那一半。
    await openMenu({ disabledItem: true });
    expect(items()[2].dataset.disabled).toBe("true");

    press("ArrowDown");
    expect(activeIndex()).toBe(1);
    expect(activeDescendant()).toBe(items()[1].id);

    press("ArrowUp");
    expect(activeIndex()).toBe(0);

    // ★ 末个**可用**项是 items[1]，不是 items[2]：若按全集算下标，这里会指到禁用项
    press("End");
    expect(activeDescendant()).toBe(items()[1].id);
    expect(items()[1].classList.contains("z-menu__item--active")).toBe(true);
    expect(items()[2].classList.contains("z-menu__item--active")).toBe(false);
  });

  it("M4 Enter 选中**当前高亮项**，不是第一项", async () => {
    // [WHY] 这是「当前项算法」的验收：早先树里每一份实现都用
    // `document.activeElement` 求下标，拿到 -1 后被 `max(idx,0)` 抹平成 0，
    // 于是不管按几下 ↓，Enter 都作用在第一项 —— 界面上完全看不出异常。
    const menu = await openMenu();
    const picked: string[] = [];
    menu.addEventListener("z-select", (e: Event) => picked.push((e as CustomEvent).detail.value));

    press("ArrowDown");
    press("ArrowDown");
    expect(activeIndex()).toBe(2);
    press("Enter");
    await tick();

    expect(picked).toEqual(["delete"]);
    expect(menu.open).toBe(false);
  });

  it("M5 全部项禁用时 ↓ 不炸、不产生高亮（这一键仍被消费）", async () => {
    // [WHY 必须在**打开之前**就全禁用] 打开时 `_openDropdown` 会挑第一个可用项当高亮；
    // 打开后再禁，残留的 activedescendant 是上一轮设的，测到的就不是「无可用项」那条路。
    const menu = makeMenu({ disabledItem: true });
    await tick();
    for (const el of Array.from(menu.querySelectorAll("z-menu-item")) as any[]) el.disabled = true;
    await tick();
    (menu.querySelector("button") as HTMLElement).click();
    await tick();

    expect(panel()).not.toBeNull();
    expect(panel()!.hasAttribute("aria-activedescendant")).toBe(false);
    expect(items().some((el) => el.classList.contains("z-menu__item--active"))).toBe(false);
    expect(press("ArrowDown"), "无落点也仍要消费，否则面板外的容器会跟着滚").toBe(false);
    expect(menu.open).toBe(true);
  });

  it("M6 ←→ 不归菜单的一维移动管（留给子菜单语义）", async () => {
    await openMenu();
    expect(activeIndex()).toBe(0);
    expect(press("ArrowRight"), "←→ 不该被 preventDefault").toBe(true);
    expect(activeIndex()).toBe(0);
  });
});
