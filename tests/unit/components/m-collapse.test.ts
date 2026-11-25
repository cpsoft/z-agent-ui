// Test: z-m-collapse —— 展开/收起与 aria-expanded
// Date: 2026-10-25
//
// 折叠面板的高度动画在 happy-dom 里测不了（无布局，scrollHeight 恒 0），
// 但**状态与事件**可以测，而它们才是宿主的契约：aria-expanded 不同步时读屏会把
// 已展开的面板念成「已折叠」，这是之前 AccordionItem 踩过的同一类问题。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-collapse/MCollapse";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-collapse") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-collapse", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("默认收起：aria-expanded=false，根节点没有 expanded 类", async () => {
    el = mount({ title: "更多" });
    await flush();
    const header = el.shadowRoot.querySelector(".m-collapse__header");
    expect(header.getAttribute("aria-expanded")).toBe("false");
    expect(el.shadowRoot.querySelector(".m-collapse").classList.contains("m-collapse--expanded")).toBe(false);
  });

  it("点头部展开：状态、类名、aria 同步更新，并派发 z-toggle", async () => {
    el = mount({ title: "更多" });
    await flush();
    let detail: any = null;
    el.addEventListener("z-toggle", (e: CustomEvent) => (detail = e.detail));

    el.shadowRoot.querySelector(".m-collapse__header").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();

    expect(el.expanded).toBe(true);
    expect(detail).toEqual({ expanded: true });
    expect(el.shadowRoot.querySelector(".m-collapse__header").getAttribute("aria-expanded")).toBe("true");
    expect(el.shadowRoot.querySelector(".m-collapse").classList.contains("m-collapse--expanded")).toBe(true);
  });

  it("再点一次收起（往返后状态回到初始，不残留）", async () => {
    el = mount({ title: "更多", expanded: true });
    await flush();
    const header = () => el.shadowRoot.querySelector(".m-collapse__header");
    expect(header().getAttribute("aria-expanded")).toBe("true");

    header().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.expanded).toBe(false);
    expect(header().getAttribute("aria-expanded")).toBe("false");
  });

  it("summary 存在时渲染在标题旁，为空时不渲染空节点", async () => {
    el = mount({ title: "明细", summary: "共 3 项" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-collapse__summary").textContent).toBe("共 3 项");

    el.summary = "";
    await flush();
    expect(el.shadowRoot.querySelector(".m-collapse__summary")).toBeNull();
  });

  it("标题/摘要里的标签被转义", async () => {
    const evil = `<img src=x onerror=alert(1)>`;
    el = mount({ title: evil, summary: evil });
    await flush();
    expect(el.shadowRoot.querySelector(".m-collapse__title").querySelector("img")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-collapse__title").textContent).toBe(evil);
  });

  it("点内容区不切换（只有头部是开关）", async () => {
    el = mount({ title: "更多" });
    await flush();
    el.shadowRoot.querySelector(".m-collapse__content").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.expanded).toBe(false);
  });
});
