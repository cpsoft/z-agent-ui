// Test: z-m-tabbar —— 受控切换、不重复派发、文案转义与键盘
// Date: 2026-10-25
//
// 受控组件的核心契约：点「当前项」不派发事件（否则宿主会重复拉数据 / 重复 push 路由），
// active 只由宿主改。另外 label / badge 来自配置，必须转义；data-key 是属性值，要用 escapeAttr。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-tabbar/MTabbar";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const ITEMS = [
  { key: "todo", label: "待办", badge: 3 },
  { key: "board", label: "看板" },
  { key: "me", label: "我的" },
];

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-tabbar") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-tabbar", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("按 items 渲染标签与角标，active 项带 active 类与 aria-selected", async () => {
    el = mount({ items: ITEMS, active: "board" });
    await flush();
    const tabs = el.shadowRoot.querySelectorAll(".m-tabbar__item");
    expect(tabs.length).toBe(3);
    expect(tabs[0].textContent).toContain("待办");
    expect(tabs[0].querySelector(".m-tabbar__badge").textContent).toBe("3");
    expect(tabs[1].classList.contains("m-tabbar__item--active")).toBe(true);
    expect(tabs[1].getAttribute("aria-selected")).toBe("true");
    expect(tabs[0].getAttribute("aria-selected")).toBe("false");
  });

  it("点击其它项：更新 active 并派发 z-change（带 key 与整项）", async () => {
    el = mount({ items: ITEMS, active: "todo" });
    await flush();
    let detail: any = null;
    el.addEventListener("z-change", (e: CustomEvent) => (detail = e.detail));
    el.shadowRoot.querySelectorAll(".m-tabbar__item")[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(detail.key).toBe("me");
    expect(detail.item.label).toBe("我的");
    expect(el.active).toBe("me");
  });

  it("点击当前项不派发（受控：避免宿主重复拉数据）", async () => {
    el = mount({ items: ITEMS, active: "todo" });
    await flush();
    let fired = 0;
    el.addEventListener("z-change", () => fired++);
    el.shadowRoot.querySelectorAll(".m-tabbar__item")[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fired).toBe(0);
  });

  it("label 与 badge 里的标签被转义", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ items: [{ key: "x", label: evil, badge: evil }], active: "" });
    await flush();
    const tab = el.shadowRoot.querySelector(".m-tabbar__item");
    expect(tab.querySelector("img")).toBeNull();
    expect(tab.querySelector(".m-tabbar__label").textContent).toBe(evil);
  });

  it("key 里带引号时 data-key 仍完好（属性值必须 escapeAttr）", async () => {
    el = mount({ items: [{ key: 'a"b', label: "x" }], active: "" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-tabbar__item").dataset.key).toBe('a"b');
  });

  it("回车可激活（role=tab 需要键盘路径）", async () => {
    el = mount({ items: ITEMS, active: "todo" });
    await flush();
    let detail: any = null;
    el.addEventListener("z-change", (e: CustomEvent) => (detail = e.detail));
    const second = el.shadowRoot.querySelectorAll(".m-tabbar__item")[1];
    second.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(detail.key).toBe("board");
  });
});
