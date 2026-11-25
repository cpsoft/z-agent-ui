// Test: m-grid / m-grid-item —— 列数传递、图标的空态、禁用项
// Date: 2026-11-09
//
// [背景] 宫格看着简单，但有两处「看不出来」的坑，都是本轮实测才发现的：
//   ① 没有图标时，图标容器（40×40 + 浅底）照样渲染 —— 截图里像图标加载失败；
//   ② 宫格行是 stretch 等高的，项内 column 布局用 flex-start 会把单行标签顶到格子上沿，
//      与有图标的邻居差一整行。只写 justify-content 还不够（div 高度没撑满 host）。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-grid/MGrid";
import "../../../src/components/m-grid-item/MGridItem";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(tag: string, props: Record<string, unknown> = {}): any {
  const el = document.createElement(tag) as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe("m-grid", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("列数通过 --m-grid-cols 传给 CSS（任意列数都成立，不是只支持 3/4）", async () => {
    el = mount("m-grid", { columns: 5 });
    await flush();
    const root = el.shadowRoot.querySelector(".m-grid");
    expect(root.style.getPropertyValue("--m-grid-cols")).toBe("5");
  });

  it("列数非法（0 / 负数）时退回 4，而不是渲染成 0 列不可见", async () => {
    el = mount("m-grid", { columns: 0 });
    await flush();
    expect(el.shadowRoot.querySelector(".m-grid").style.getPropertyValue("--m-grid-cols")).toBe("4");
  });

  it("framed 时带边框变体 class", async () => {
    el = mount("m-grid", { framed: true });
    await flush();
    expect(el.shadowRoot.querySelector(".m-grid").className).toContain("m-grid--framed");
  });
});

describe("m-grid-item", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("没有图标也没有角标时不留图标方块（留了就像图标加载失败）", async () => {
    el = mount("m-grid-item", { label: "报损" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-grid-item__icon")).toBeNull();
    expect(el.shadowRoot.textContent).toContain("报损");
  });

  it("给了 slot=icon 就渲染图标容器", async () => {
    el = document.createElement("m-grid-item") as any;
    el.label = "盘点";
    el.innerHTML = '<svg slot="icon"></svg>';
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot.querySelector(".m-grid-item__icon")).not.toBeNull();
  });

  it("只有角标没有图标时，容器仍要在（角标是绝对定位在它里面的）", async () => {
    el = mount("m-grid-item", { label: "任务", badge: "3" });
    await flush();
    const box = el.shadowRoot.querySelector(".m-grid-item__icon");
    expect(box, "角标必须有定位父级").not.toBeNull();
    expect(box.querySelector(".m-grid-item__badge").textContent).toBe("3");
  });

  it("disabled 不发 z-click", async () => {
    el = mount("m-grid-item", { label: "禁用", disabled: true });
    await flush();
    const hits = collect(el, "z-click");
    el.shadowRoot.querySelector(".m-grid-item").click();
    expect(hits).toEqual([]);
  });

  it("正常项点击发 z-click，payload 带 label", async () => {
    el = mount("m-grid-item", { label: "今日任务" });
    await flush();
    const hits = collect(el, "z-click");
    el.shadowRoot.querySelector(".m-grid-item").click();
    expect(hits).toEqual([{ label: "今日任务" }]);
  });

  it("键盘 Enter 也能触发（role=button 必须有键盘路径）", async () => {
    el = mount("m-grid-item", { label: "盘点" });
    await flush();
    const hits = collect(el, "z-click");
    el.shadowRoot
      .querySelector(".m-grid-item")
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(hits).toHaveLength(1);
  });

  it("clickable=false 时不声明 role=button，也不响应点击", async () => {
    el = mount("m-grid-item", { label: "纯展示", clickable: false });
    await flush();
    const root = el.shadowRoot.querySelector(".m-grid-item");
    expect(root.getAttribute("role")).toBeNull();
    const hits = collect(el, "z-click");
    root.click();
    expect(hits).toEqual([]);
  });
});
