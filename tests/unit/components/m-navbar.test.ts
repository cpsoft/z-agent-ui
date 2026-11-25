// Test: z-m-navbar —— 返回按钮语义、标题转义
// Date: 2026-10-25
//
// 返回按钮是纯图标按钮，没有可见文本，唯一的无障碍名来自 aria-label。
// 早期硬编码英文 "Back"，中文页面里读屏会夹一句英文；改为可配、默认「返回」。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-navbar/MNavbar";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-navbar") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-navbar", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("默认不渲染返回按钮（一级页面）", async () => {
    el = mount({ title: "待办" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-navbar__back")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-navbar__title").textContent).toBe("待办");
  });

  it("showBack 时返回按钮有无障碍名，默认中文「返回」", async () => {
    el = mount({ title: "详情", showBack: true });
    await flush();
    const back = el.shadowRoot.querySelector(".m-navbar__back");
    expect(back).toBeTruthy();
    expect(back.getAttribute("aria-label")).toBe("返回");
  });

  it("backLabel 可覆盖无障碍名（多语言/业务自定义）", async () => {
    el = mount({ title: "详情", showBack: true, backLabel: "返回列表" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-navbar__back").getAttribute("aria-label")).toBe("返回列表");
  });

  it("点返回派发 z-back", async () => {
    el = mount({ title: "详情", showBack: true });
    await flush();
    let fired = 0;
    el.addEventListener("z-back", () => fired++);
    el.shadowRoot.querySelector(".m-navbar__back").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fired).toBe(1);
  });

  it("点标题或右侧插槽不误派发 z-back", async () => {
    el = mount({ title: "详情", showBack: true });
    await flush();
    let fired = 0;
    el.addEventListener("z-back", () => fired++);
    el.shadowRoot.querySelector(".m-navbar__title").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fired).toBe(0);
  });

  it("标题里的标签被转义（标题可能带门店名等外部数据）", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ title: evil });
    await flush();
    const title = el.shadowRoot.querySelector(".m-navbar__title");
    expect(title.querySelector("img")).toBeNull();
    expect(title.textContent).toBe(evil);
  });
});
