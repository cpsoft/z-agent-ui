// Test: z-m-chip —— 受控选中态、键盘操作与文案转义
// Date: 2026-10-25
//
// 两个真实风险：
//   1. 标签文本来自接口（门店名 / 分类名 / 客户名），html`` 不自动转义 ⇒ 未转义即注入。
//   2. 元素声明了 role="button" + tabindex="0" 却没有 keydown ⇒ 读屏宣布「这是按钮」，
//      键盘用户按回车却没反应。这比不写 role 更糟（给了承诺却做不到）。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "../../../src/components/m-chip/MChip";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-chip") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-chip", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("渲染 label 与 variant 类名", async () => {
    el = mount({ label: "全部门店", variant: "primary" });
    await flush();
    const root = el.shadowRoot.querySelector(".m-chip");
    expect(root.textContent).toBe("全部门店");
    expect(root.classList.contains("m-chip--primary")).toBe(true);
  });

  it("selected 同时反映到类名与 aria-pressed（读屏要能知道是否选中）", async () => {
    el = mount({ label: "A", selected: true });
    await flush();
    const root = el.shadowRoot.querySelector(".m-chip");
    expect(root.classList.contains("m-chip--selected")).toBe(true);
    expect(root.getAttribute("aria-pressed")).toBe("true");
  });

  it("label 里的标签被转义（注入防护）", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ label: evil });
    await flush();
    const root = el.shadowRoot.querySelector(".m-chip");
    expect(root.querySelector("img")).toBeNull();
    expect(root.textContent).toBe(evil);
  });

  it("点击派发 z-click，detail 携带当前选中态", async () => {
    el = mount({ label: "A", selected: false });
    await flush();
    let detail: any = null;
    el.addEventListener("z-click", (e: CustomEvent) => (detail = e.detail));
    el.shadowRoot.querySelector(".m-chip").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(detail).toEqual({ selected: false });
  });

  it("回车与空格都能激活，空格要拦掉默认滚动", async () => {
    el = mount({ label: "A" });
    await flush();
    let fired = 0;
    el.addEventListener("z-click", () => fired++);
    const root = el.shadowRoot.querySelector(".m-chip");

    root.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const space = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    root.dispatchEvent(space);

    expect(fired).toBe(2);
    expect(space.defaultPrevented).toBe(true);
  });

  it("其它键不激活（避免 Tab / 方向键误触发）", async () => {
    el = mount({ label: "A" });
    await flush();
    let fired = 0;
    el.addEventListener("z-click", () => fired++);
    el.shadowRoot.querySelector(".m-chip").dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(fired).toBe(0);
  });

  it("label 为空时渲染插槽（允许图标 + 文本的复合内容）", async () => {
    el = document.createElement("m-chip") as any;
    el.innerHTML = "<b>自定义</b>";
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot.querySelectorAll("slot").length).toBe(1);
  });
});
