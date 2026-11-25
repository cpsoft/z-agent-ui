// Test: m-picker —— 确认/取消、草稿回滚、遮罩手势
// Date: 2026-11-09
//
// [背景] 选择器是「一改就错」的典型：用户点开、改了几次、又取消 —— 值必须回到上次提交的那个。
// 草稿不回滚的后果是「我明明取消了，值却变了」，而重开面板才看得出。
// 另有一条易漏：未打开时不该把面板留在 DOM 里（只靠 CSS 藏的话，Tab 能走进隐藏按钮）。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-picker/MPicker";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const OPTIONS = [
  { value: "hz", label: "杭州" },
  { value: "nb", label: "宁波" },
  { value: "wz", label: "温州" },
];

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-picker") as any;
  Object.assign(el, { options: OPTIONS, ...props });
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

const option = (el: any, v: string): HTMLElement =>
  el.shadowRoot.querySelector(`[data-value='${v}']`);

describe("m-picker", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("未打开时不出面板（不能只靠 CSS 藏，不然 Tab 能走进隐藏的按钮）", async () => {
    el = mount();
    await flush();
    expect(el.shadowRoot.querySelector(".m-picker__panel")).toBeNull();
  });

  it("打开后列出全部选项，已提交值带选中标记", async () => {
    el = mount({ open: true, value: "nb" });
    await flush();
    expect(el.shadowRoot.querySelectorAll(".m-picker__option")).toHaveLength(3);
    expect(el.shadowRoot.querySelector(".m-picker__option--on").getAttribute("data-value")).toBe("nb");
  });

  it("选中后确定：发 z-confirm，payload 同时给 value 与 label", async () => {
    el = mount({ open: true });
    await flush();
    const hits = collect(el, "z-confirm");
    option(el, "nb").click();
    el.shadowRoot.querySelector("[data-act='confirm']").click();
    expect(hits).toEqual([{ value: "nb", label: "宁波" }]);
    expect(el.open).toBe(false);
  });

  it("取消不改值：草稿回滚到已提交值", async () => {
    el = mount({ open: true, value: "hz" });
    await flush();
    const cancels = collect(el, "z-cancel");
    option(el, "nb").click();
    el.shadowRoot.querySelector("[data-act='cancel']").click();
    expect(cancels).toEqual([{ value: "hz" }]);
    // 再打开时草稿必须是已提交值，不能残留上次点了没确定的「宁波」
    el.open = true;
    await flush();
    expect(el.shadowRoot.querySelector(".m-picker__option--on").getAttribute("data-value")).toBe("hz");
  });

  it("遮罩空白处点击 = 取消（移动端常规手势）", async () => {
    el = mount({ open: true, value: "hz" });
    await flush();
    const cancels = collect(el, "z-cancel");
    el.shadowRoot.querySelector(".m-picker__overlay").click();
    expect(cancels).toHaveLength(1);
  });

  it("点面板内部不会误判成「点遮罩」", async () => {
    el = mount({ open: true });
    await flush();
    const cancels = collect(el, "z-cancel");
    el.shadowRoot.querySelector(".m-picker__panel").click();
    expect(cancels, "面板内的点击冒泡到遮罩，但它不是遮罩本身").toHaveLength(0);
  });

  it("确定按钮文案可配（默认中文「确定」）", async () => {
    el = mount({ open: true, confirmText: "就用它" });
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='confirm']").textContent.trim()).toBe("就用它");
  });

  it("选项文案被转义（城市名可能来自后端）", async () => {
    el = document.createElement("m-picker") as any;
    Object.assign(el, { options: [{ value: "x", label: "<b>加粗</b>" }], open: true });
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot.querySelector("[data-value='x']").textContent).toContain("<b>加粗</b>");
    expect(el.shadowRoot.querySelector("[data-value='x'] b")).toBeNull();
  });
});
