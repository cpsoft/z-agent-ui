// Test: m-notice-bar —— 四档语气、关闭语义
// Date: 2026-11-09
//
// [背景] 这个组件的四档配色写错过：`color` 用了 `--z-color-*-text`（那是**实心底上的白字**），
// 压在 `-soft` 浅底上对比度约 1.2:1 —— 提示条上的字等于隐形，而结构/脚本/控制台全正常。
// 配色本身由 `theme-token-guard` + `page-m-view-contrast` 守（后者已扩到全库 CSS），
// 这里守的是**行为**：class 有没有按语气给对、关闭是不是只上报不自己隐藏。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-notice-bar/MNoticeBar";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-notice-bar") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe("m-notice-bar", () => {
  let el: any;

  afterEach(() => {
    if (el?.parentNode) document.body.removeChild(el);
    el = null;
  });

  it("四档语气各走自己的 class（配色靠它，写错就是白字配浅底）", async () => {
    for (const type of ["info", "success", "warning", "danger"]) {
      el = mount({ text: "t", type });
      await flush();
      expect(el.shadowRoot.querySelector(".m-notice-bar").className).toContain(`m-notice-bar--${type}`);
      document.body.removeChild(el);
      el = null;
    }
  });

  it("缺省是 info（不写 type 时不至于落成没有配色的裸条）", async () => {
    el = mount({ text: "t" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-notice-bar").className).toContain("m-notice-bar--info");
  });

  it("文本被转义（提示内容常含门店名等外部数据）", async () => {
    el = mount({ text: '<img src=x onerror="alert(1)">' });
    await flush();
    expect(el.shadowRoot.querySelector(".m-notice-bar__text").textContent).toContain("<img");
    expect(el.shadowRoot.querySelector(".m-notice-bar__text img")).toBeNull();
  });

  it("closable 才有关闭按钮；点了发 z-close 但不自己消失", async () => {
    el = mount({ text: "待审核", closable: true });
    await flush();
    const hits = collect(el, "z-close");
    el.shadowRoot.querySelector("[data-act='close']").click();
    expect(hits).toEqual([{ text: "待审核" }]);
    // 组件不自己隐藏：隐藏与否由宿主决定（它可能还要记一条「已读」）
    expect(el.isConnected).toBe(true);
  });

  it("不可关闭时没有关闭按钮", async () => {
    el = mount({ text: "只读提示" });
    await flush();
    expect(el.shadowRoot.querySelector("[data-act='close']")).toBeNull();
  });

  it("role=status：读屏会把新出现的提示读出来", async () => {
    el = mount({ text: "盘点截止" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-notice-bar").getAttribute("role")).toBe("status");
  });
});
