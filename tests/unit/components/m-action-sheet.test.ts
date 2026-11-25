// Test: z-m-action-sheet —— 开关状态机、事件顺序、遮罩点击边界
// Date: 2026-10-25
//
// 关闭是一条**有动画的状态机**（visible=false 之后还要滑出再隐藏），所以断言不能只看
// visible。这里钉住顺序：先派 z-select 再派 z-action-sheet-close；退场期间面板仍在 DOM 且带 closing 类；
// animationend 之后才真正移除。另外遮罩点击必须判 target===currentTarget，
// 否则点面板内部会顺着冒泡关闭面板（选中动作永远点不到）。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-action-sheet/MActionSheet";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const ACTIONS = [
  { label: "编辑", value: "edit" },
  { label: "删除", value: "del", danger: true },
];

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-action-sheet") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-action-sheet", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("visible=false 时不渲染面板（只是占位节点，不拦截点击）", async () => {
    el = mount({ actions: ACTIONS });
    await flush();
    expect(el.shadowRoot.querySelector(".m-action-sheet__panel")).toBeNull();
    expect(el.shadowRoot.querySelector('[part="hidden"]')).toBeTruthy();
  });

  it("visible=true 渲染标题与动作项，并派发 z-action-sheet-open", async () => {
    el = mount({ actions: ACTIONS, title: "更多操作" });
    let opened = 0;
    el.addEventListener("z-action-sheet-open", () => opened++);
    el.visible = true;
    await flush();

    expect(opened).toBe(1);
    expect(el.shadowRoot.querySelector(".m-action-sheet__title").textContent).toBe("更多操作");
    const items = el.shadowRoot.querySelectorAll(".m-action-sheet__item");
    expect(items.length).toBe(2);
    expect(items[1].classList.contains("m-action-sheet__item--danger")).toBe(true);
  });

  it("点动作项：先 z-select 再 z-action-sheet-close，随后进入退场态", async () => {
    el = mount({ actions: ACTIONS, visible: true });
    await flush();
    const order: string[] = [];
    let detail: any = null;
    el.addEventListener("z-select", (e: CustomEvent) => {
      order.push("select");
      detail = e.detail;
    });
    el.addEventListener("z-action-sheet-close", () => order.push("close"));

    el.shadowRoot.querySelectorAll(".m-action-sheet__item")[1].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await flush();

    expect(order).toEqual(["select", "close"]);
    expect(detail.value).toBe("del");
    expect(el.visible).toBe(false);
    // 退场：面板还在，且带 closing 类（等 animationend 才移除）
    const panel = el.shadowRoot.querySelector(".m-action-sheet__panel");
    expect(panel.classList.contains("m-action-sheet__panel--closing")).toBe(true);
  });

  it("animationend 之后面板真正移除", async () => {
    el = mount({ actions: ACTIONS, visible: true });
    await flush();
    el.shadowRoot.querySelectorAll(".m-action-sheet__item")[0].dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await flush();

    const panel = el.shadowRoot.querySelector(".m-action-sheet__panel");
    panel.dispatchEvent(new Event("animationend", { bubbles: true }));
    await flush();

    expect(el.shadowRoot.querySelector(".m-action-sheet__panel")).toBeNull();
  });

  it("点取消按钮关闭", async () => {
    el = mount({ actions: ACTIONS, visible: true });
    await flush();
    let closed = 0;
    el.addEventListener("z-action-sheet-close", () => closed++);
    el.shadowRoot.querySelector(".m-action-sheet__cancel").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(closed).toBe(1);
  });

  it("点遮罩空白处关闭，点面板内部不关闭", async () => {
    el = mount({ actions: ACTIONS, visible: true });
    await flush();
    let closed = 0;
    el.addEventListener("z-action-sheet-close", () => closed++);

    el.shadowRoot.querySelector(".m-action-sheet__panel").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(closed).toBe(0);

    el.shadowRoot.querySelector(".m-action-sheet__overlay").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(closed).toBe(1);
  });

  it("标题与动作文案里的标签被转义", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ visible: true, title: evil, actions: [{ label: evil, value: "x" }] });
    await flush();
    expect(el.shadowRoot.querySelector(".m-action-sheet__title").querySelector("img")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-action-sheet__item").querySelector("img")).toBeNull();
  });
});
