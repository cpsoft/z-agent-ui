// Test: z-context-menu 光标锚点菜单 —— 解析、键盘、选中、焦点归还、滚动收起
// Related: architecture/component-gap-audit.html §03（缺件 z-context-menu）
// Wiki: wiki/reference/component-implementation-standard.md（浮层必须走控制器）
// Date: 2026-11-23
//
// [WHY 这条要有] 甘特那份自建菜单 `role="menu"` 却没有焦点管理、没有 activedescendant、
// 方向键完全失效 —— 界面上看着是个菜单，读屏和键盘用户都用不了。本测试钉住的是
// 「看得见的部分」与「用得了的部分」一致：高亮项 = activedescendant = Enter 作用的那一项。

import { describe, it, expect, afterEach, vi } from "vitest";
import "../../../src/components/context-menu/index.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createMenu(attrs: Record<string, string> = {}, items?: unknown): any {
  const el = document.createElement("z-context-menu") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (items) el.items = items;
  document.body.appendChild(el);
  return el;
}

const panel = (): HTMLElement | null => document.querySelector(".z-menu__dropdown");
const rows = (): HTMLElement[] => Array.from(document.querySelectorAll<HTMLElement>(".z-menu__item"));
const activeIdx = (): number => rows().findIndex((el) => el.classList.contains("z-menu__item--active"));

afterEach(() => {
  panel()?.remove();
  document.querySelectorAll("z-context-menu").forEach((el) => el.remove());
});

describe("z-context-menu 打开与解析", () => {
  it("options 字符串按序渲染，danger 与分隔线各自成型", async () => {
    const menu = createMenu({ options: "rename|重命名,-,delete|删除|danger" });
    await flush();
    menu.showAt(120, 80);
    await flush();

    expect(panel(), "没打开").not.toBeNull();
    expect(panel()!.getAttribute("role")).toBe("menu");
    expect(rows().map((el) => el.textContent)).toEqual(["重命名", "删除"]);
    expect(rows()[1].classList.contains("z-menu__item--danger")).toBe(true);
    expect(panel()!.querySelector('[role="separator"]'), "`-` 应渲染成分隔线").not.toBeNull();
  });

  it("items 数组优先于 options，且 disabled 落到 aria-disabled", async () => {
    const menu = createMenu({ options: "a|甲" }, [
      { key: "x", label: "X" },
      { key: "y", label: "Y", disabled: true },
    ]);
    await flush();
    menu.showAt(10, 10);
    await flush();

    expect(rows().map((el) => el.textContent)).toEqual(["X", "Y"]);
    expect(rows()[1].getAttribute("aria-disabled")).toBe("true");
  });

  it("没有可用项时不弹空面板（点不掉的不该出现）", async () => {
    const menu = createMenu();
    await flush();
    menu.showAt(10, 10);
    await flush();
    expect(panel()).toBeNull();
  });

  it("按坐标定位：offset 只影响 y（光标左上角对齐菜单）", async () => {
    const menu = createMenu({ options: "a|甲", offset: "2" });
    await flush();
    menu.showAt(120, 80);
    await flush();
    expect(panel()!.style.left).toBe("120px");
    expect(panel()!.style.top).toBe("82px");
  });
});

describe("z-context-menu 选中", () => {
  it("点击项 emit z-pick 带 key 并收起", async () => {
    const menu = createMenu({ options: "rename|重命名,delete|删除|danger" });
    await flush();
    const picked: string[] = [];
    menu.addEventListener("z-pick", (e: Event) => picked.push((e as CustomEvent).detail.key));

    menu.showAt(20, 20);
    await flush();
    rows()[1].click();
    await flush();

    expect(picked).toEqual(["delete"]);
    expect(menu.open).toBe(false);
  });

  it("disabled 项点了不 emit，菜单保持打开", async () => {
    const menu = createMenu({}, [{ key: "x", label: "X", disabled: true }]);
    await flush();
    const picked: string[] = [];
    menu.addEventListener("z-pick", (e: Event) => picked.push((e as CustomEvent).detail.key));

    menu.showAt(20, 20);
    await flush();
    rows()[0].click();
    await flush();

    expect(picked).toEqual([]);
    expect(menu.open).toBe(true);
  });
});

describe("z-context-menu 键盘", () => {
  const press = (key: string): boolean =>
    panel()!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

  it("焦点进面板，初始高亮第一项且 aria 指得到", async () => {
    const menu = createMenu({ options: "a|甲,b|乙" });
    await flush();
    menu.showAt(20, 20);
    await flush();

    expect(panel()!.contains(document.activeElement)).toBe(true);
    expect(activeIdx()).toBe(0);
    expect(panel()!.getAttribute("aria-activedescendant")).toBe(rows()[0].id);
  });

  it("↓ 跳过禁用项，Enter 选中当前高亮项（不是第一项）", async () => {
    const menu = createMenu({}, [
      { key: "x", label: "X" },
      { key: "y", label: "Y", disabled: true },
      { key: "z", label: "Z" },
    ]);
    await flush();
    const picked: string[] = [];
    menu.addEventListener("z-pick", (e: Event) => picked.push((e as CustomEvent).detail.key));

    menu.showAt(20, 20);
    await flush();

    expect(press("ArrowDown"), "↓ 必须被消费，否则页面跟着滚").toBe(false);
    expect(activeIdx()).toBe(2);
    expect(panel()!.getAttribute("aria-activedescendant")).toBe(rows()[2].id);

    press("Enter");
    await flush();
    expect(picked).toEqual(["z"]);
  });

  it("Esc 收起，并把焦点还给打开前的元素", async () => {
    const host = document.createElement("button");
    document.body.appendChild(host);
    host.focus();

    const menu = createMenu({ options: "a|甲" });
    await flush();
    menu.showAt(20, 20);
    await flush();
    expect(document.activeElement).toBe(panel());

    press("Escape");
    await flush();

    expect(menu.open).toBe(false);
    expect(document.activeElement, "关闭后焦点落在 body = 键盘用户被丢掉").toBe(host);
    host.remove();
  });
});

describe("z-context-menu 意外关闭", () => {
  it("页面滚动即收起（光标锚点没有可跟随的位置）", async () => {
    const menu = createMenu({ options: "a|甲" });
    await flush();
    menu.showAt(20, 20);
    await flush();
    expect(menu.open).toBe(true);

    window.dispatchEvent(new Event("scroll"));
    await flush();
    expect(menu.open).toBe(false);
  });

  it("宿主被移除时面板一并摘掉（不留孤儿浮层）", async () => {
    const menu = createMenu({ options: "a|甲" });
    await flush();
    menu.showAt(20, 20);
    await flush();
    expect(panel()).not.toBeNull();

    menu.remove();
    document.body.appendChild(menu); // 触发 disconnected → connected，确认不炸
    // 退场动画在 happy-dom 里不派 animationend，控制器有 200ms 兜底移除
    await new Promise((r) => setTimeout(r, 260));
    expect(panel(), "宿主移除后仍留着孤儿浮层").toBeNull();
    menu.remove();
  });
});

// ── 菜单不得因自身导航而滚动页面 ────────────────────────
//
// [WHY 这条断言是必需的，2026-11-23 真机实测] `MenuNav` 曾经用
// `active.scrollIntoView({ block: "nearest" })` 保证激活项可见。它会滚动**所有**
// 可滚祖先，包括 window —— 而本组件监听 window scroll 做「滚动即收起」。
// 于是**键盘第一次按 ↑↓，菜单就把自己关掉**：面板从 DOM 消失、再按也没反应。
// happy-dom 不实现滚动，所以这条在单测里必须靠 spy 才有意义：
// 修复前 `scrollIntoView` 被调用 ⇒ 红；修复后只改面板自身 scrollTop ⇒ 绿。
describe("菜单导航不得滚动页面", () => {
  it("按方向键时不得调用 scrollIntoView（宿主会把它当成用户滚动而收起菜单）", async () => {
    const spy = vi.spyOn(Element.prototype, "scrollIntoView");
    try {
      const menu = document.createElement("z-context-menu") as any;
      menu.setAttribute("options", "a|甲,-,b|乙");
      document.body.appendChild(menu);
      await flush();
      menu.showAt(10, 10);
      await flush();

      const panel = document.querySelector('[part="menu"]') as HTMLElement;
      expect(panel, "面板应已挂载").toBeTruthy();
      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await flush();
      panel.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      await flush();

      expect(
        spy,
        "scrollIntoView 会连带滚 window，触发宿主的「滚动即收起」⇒ 菜单一按方向键就消失",
      ).not.toHaveBeenCalled();
      menu.hide();
      menu.remove();
    } finally {
      spy.mockRestore();
    }
  });

  it("面板限高并自滚：长菜单不再溢出视口", async () => {
    const menu = document.createElement("z-context-menu") as any;
    menu.setAttribute("options", Array.from({ length: 20 }, (_, i) => `k${i}|项${i}`).join(","));
    document.body.appendChild(menu);
    await flush();
    menu.showAt(10, 10);
    await flush();
    const panel = document.querySelector('[part="menu"]') as HTMLElement;
    // 样式来自 injectGlobalStyles 注入的全局表，happy-dom 会把声明原样保留
    const sheetText = Array.from(document.querySelectorAll("style"))
      .map((s) => s.textContent || "")
      .join("\n");
    expect(sheetText).toContain("max-height");
    expect(sheetText).toContain("overflow-y: auto");
    menu.hide();
    menu.remove();
  });
});
