// Test: m-cell / m-cell-group —— 可点行的事件与键盘路径、分组的标题
// Date: 2026-11-09
//
// [背景] 这两个组件落地时没有任何测试，也没有示例页。cell 是移动端最基础的一行，
// 它的「点不点得动」直接决定列表页有没有交互 —— 而 `clickable` 漏写时页面完全正常，
// 只是点了没反应，没有任何报错。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-cell/MCell";
import "../../../src/components/m-cell-group/MCellGroup";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(tag: string, props: Record<string, unknown> = {}): any {
  const el = document.createElement(tag) as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

/** 收集某个自定义事件的全部 detail。 */
function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe("m-cell", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("clickable 才发 z-click，payload 带 label 与 value", async () => {
    el = mount("m-cell", { label: "门店名称", value: "西湖店", clickable: true });
    await flush();
    const hits = collect(el, "z-click");
    el.shadowRoot.querySelector(".m-cell").click();
    expect(hits).toEqual([{ label: "门店名称", value: "西湖店" }]);
  });

  it("不可点的行不发事件（否则列表里每一行都成了按钮）", async () => {
    el = mount("m-cell", { label: "只读" });
    await flush();
    const hits = collect(el, "z-click");
    el.shadowRoot.querySelector(".m-cell").click();
    expect(hits).toEqual([]);
  });

  it("键盘 Enter / 空格等同点击；普通字符键不算", async () => {
    el = mount("m-cell", { label: "可点", clickable: true });
    await flush();
    const hits = collect(el, "z-click");
    const root = el.shadowRoot.querySelector(".m-cell");
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
    expect(hits, "普通字符键不该触发").toHaveLength(0);
    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    root.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(hits).toHaveLength(2);
  });

  it("可点的行要可聚焦（role=button 却没有 tabindex = 键盘够不到）", async () => {
    el = mount("m-cell", { label: "x", clickable: true });
    await flush();
    const root = el.shadowRoot.querySelector(".m-cell");
    expect(root.getAttribute("role")).toBe("button");
    expect(root.getAttribute("tabindex")).toBe("0");
  });

  it("不可点的行不该声明成 button（读屏会宣布它可以点）", async () => {
    el = mount("m-cell", { label: "只读" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-cell").getAttribute("role")).toBeNull();
  });
});

describe("m-cell-group", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("标题与说明各自渲染，子项走默认 slot", async () => {
    el = mount("m-cell-group", { heading: "门店设置", desc: "修改后生效" });
    await flush();
    const html = el.shadowRoot.innerHTML;
    expect(html).toContain("门店设置");
    expect(html).toContain("修改后生效");
    expect(el.shadowRoot.querySelector("slot:not([name])")).not.toBeNull();
  });

  it("没有标题时不留一条空白标题栏", async () => {
    el = mount("m-cell-group");
    await flush();
    // 空标题栏会占掉 40px，把第一行内容压下去，看起来像「少了一块」
    expect(el.shadowRoot.querySelector(".m-cell-group__head")).toBeNull();
  });
});
