// Test: z-app-nav（[[REQ-040-app-nav]] 统一应用导航）
// Date: 2026-11-17
//
// 断言口径：只钉「宿主能观察到的事实」（DOM 结构、可访问名、派发什么事件、哪个是高亮），
// 不钉具体类名组合与像素。每条都写过变异：把实现改坏时它必须红，否则就是假绿。
import { describe, it, expect, beforeEach } from "vitest";
import "../../../src/app/app-nav/AppNav";
import type { ZAppNav, AppNavItem } from "../../../src/app/app-nav/AppNav";

const ITEMS: AppNavItem[] = [
  { path: "/", title: "首页", icon: "home" },
  { path: "/datasources", title: "数据源", icon: "database", group: "数据接入", order: 10 },
  { path: "/datasets", title: "数据集", icon: "layers", group: "数据准备", order: 10 },
  { path: "/tasks", title: "任务", icon: "task", group: "数据准备", order: 40 },
  { path: "/pages", title: "页面报表", icon: "chart", group: "数据分析", order: 10 },
];

function mount(props: { items?: unknown; active?: string; collapsed?: boolean } = {}): ZAppNav {
  const el = document.createElement("z-app-nav") as ZAppNav;
  if (props.items !== undefined) (el as any).items = props.items;
  el.active = props.active ?? "";
  el.collapsed = !!props.collapsed;
  document.body.appendChild(el);
  return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const nav = (el: ZAppNav) => el.shadowRoot!.querySelector(".z-app-nav")!;
const groupTitles = (el: ZAppNav) =>
  Array.from(el.shadowRoot!.querySelectorAll(".z-app-nav__group-title")).map((n) => n.textContent!.trim());
const buttons = (el: ZAppNav) =>
  Array.from(el.shadowRoot!.querySelectorAll("[data-path]")) as HTMLButtonElement[];
const current = (el: ZAppNav) =>
  buttons(el).filter((b) => b.getAttribute("aria-current") === "page").map((b) => b.dataset.path);

describe("z-app-nav", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("无分组条目排在最前，分组按 items 顺序出现", async () => {
    const el = mount({ items: ITEMS });
    await tick();
    // 首页没有 group：它必须落在第一个 .z-app-nav__list 里，且在数据接入之前
    const firstList = el.shadowRoot!.querySelector(".z-app-nav__list")!;
    expect(Array.from(firstList.querySelectorAll("[data-path]")).map((b) => (b as HTMLElement).dataset.path)).toEqual([
      "/",
    ]);
    expect(groupTitles(el)).toEqual(["数据接入", "数据准备", "数据分析"]);
  });

  it("组顺序取 items 输入顺序，不被组内 order 改写", async () => {
    const el = mount({
      items: [
        { path: "/a", title: "A", group: "接入" },
        { path: "/b", title: "B", group: "准备", order: 10 },
        { path: "/c", title: "C", group: "分析" },
        { path: "/d", title: "D", group: "准备", order: 40 },
      ],
    });
    await tick();
    // 变异：先全局按 order 排序再分桶 ⇒ 变成「接入 / 分析 / 准备」（真机截图里就是这样乱的）
    expect(groupTitles(el)).toEqual(["接入", "准备", "分析"]);
    // 组内仍按 order 排（这是一个独立的排序需求，不能为了组顺序把它一起去掉）
    const inPrep = Array.from(el.shadowRoot!.querySelectorAll('[data-group="准备"] [data-path]')).map(
      (b) => (b as HTMLElement).dataset.path,
    );
    expect(inPrep).toEqual(["/b", "/d"]);
  });

  it("分组标题取自 items[].group，不从路径拼", async () => {
    const el = mount({ items: [{ path: "/x/y", title: "自定义标题", group: "运营中心" }] });
    await tick();
    // 变异：把标题改成按 path 段拼（"x / y"）即红
    expect(groupTitles(el)).toEqual(["运营中心"]);
  });

  it("选中态只由 active 决定：点击不改高亮", async () => {
    const el = mount({ items: ITEMS, active: "/datasets" });
    await tick();
    expect(current(el)).toEqual(["/datasets"]);
    buttons(el)
      .find((b) => b.dataset.path === "/pages")!
      .click();
    await tick();
    // 点完仍是 /datasets —— 组件不自己记选中态（变异：点击后本地置 active 即红）
    expect(current(el)).toEqual(["/datasets"]);
    el.active = "/pages";
    await tick();
    expect(current(el)).toEqual(["/pages"]);
  });

  it("点击派发 z-navigate，detail 带 path 与整条登记", async () => {
    const el = mount({ items: ITEMS });
    await tick();
    const seen: any[] = [];
    el.addEventListener("z-navigate", (e) => seen.push((e as CustomEvent).detail));
    buttons(el)
      .find((b) => b.dataset.path === "/tasks")!
      .click();
    expect(seen).toHaveLength(1);
    expect(seen[0].path).toBe("/tasks");
    expect(seen[0].item.title).toBe("任务");
  });

  it("disabled 项仍渲染但不派发", async () => {
    const el = mount({ items: [{ path: "/x", title: "停用页", disabled: true }] });
    await tick();
    const hit = buttons(el).find((b) => b.dataset.path === "/x")!;
    // 灰条要看得见（不是不渲染），否则用户以为「我这里少了一项」
    expect(hit.getAttribute("aria-disabled")).toBe("true");
    const seen: any[] = [];
    el.addEventListener("z-navigate", (e) => seen.push(e));
    hit.click();
    expect(seen).toHaveLength(0);
  });

  it("收起态：文字不可见但可访问名保留 title", async () => {
    const el = mount({ items: ITEMS, collapsed: true });
    await tick();
    for (const b of buttons(el)) {
      const title = b.getAttribute("title")!;
      // 变异：删掉 aria-label 即红 —— 收起后文字被裁剪，读屏就只剩「按钮」
      expect(b.getAttribute("aria-label")).toBe(title);
    }
    // 文字节点仍在 DOM 里（被裁剪而非移除），否则 aria-label 是唯一来源且无法回滚
    expect(el.shadowRoot!.querySelectorAll(".z-app-nav__text").length).toBe(ITEMS.length);
  });

  it("组件不自己定宽：收起/展开的宽度归宿主容器与 token", () => {
    const css = ZAppNavStyles() || "";
    // 只查 `:host` 这一段。图标/徽标那几处 20px、18px 是**图标尺寸**，不是布局宽度，
    // 一并禁掉会把「统一图标大小」也判成违规（第一版就这么写，结果它红在自己的图标上）。
    const host = css.match(/:host\s*\{([^}]*)\}/);
    expect(host, ":host 段必须存在（display 等基础排版在这里）").toBeTruthy();
    // 变异：往 :host 里加 `width: 220px` 即红 —— 那正是 zEtl 当年弃用 z-sidebar 的原因
    // （「它的宽度是单一令牌 220px」），组件自己锁死宽度等于把宿主的两栏布局判死刑。
    expect(host![1]).not.toMatch(/\bwidth\s*:/);
  });

  it("非法条目被丢弃，空清单给可断言标记", async () => {
    const el = mount({ items: [{ path: "", title: "空地址" }, { title: "没地址" }, "x", null] });
    await tick();
    expect(buttons(el)).toHaveLength(0);
    // 不是「暂无菜单」文案：空清单几乎总是传参错，给标记让人去查
    expect(nav(el).hasAttribute("data-empty")).toBe(true);
  });

  it("badge 渲染成文本，数字与字符串都可以", async () => {
    const el = mount({ items: [{ path: "/a", title: "A", badge: 3 }, { path: "/b", title: "B", badge: "新" }] });
    await tick();
    const badges = Array.from(el.shadowRoot!.querySelectorAll(".z-app-nav__badge")).map((n) => n.textContent);
    expect(badges).toEqual(["3", "新"]);
  });

  it("图标名未知时回落标题首字，不画空白", async () => {
    const el = mount({ items: [{ path: "/a", title: "门店", icon: "no-such-icon" }] });
    await tick();
    expect(el.shadowRoot!.querySelector(".z-app-nav__initial")!.textContent).toBe("门");
  });
});

/** 读组件自带样式（静态字段），供「不写死宽度」那条断言使用。 */
function ZAppNavStyles(): string {
  const el = document.createElement("z-app-nav") as unknown as { constructor: { styles?: string } };
  return el.constructor.styles ?? "";
}
