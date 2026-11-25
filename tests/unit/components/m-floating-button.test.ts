// Test: z-m-floating-button —— 定位、无障碍名与点击
// Date: 2026-10-25
//
// 浮动按钮是纯图标（默认 "+"），aria-label 由业务传入；它固定在视口上，
// 若点击区域判定错了（比如监听整个 host 而不是按钮内部），会在按钮周围
// 一片空白处也能触发 —— 用户表现为「莫名跳转」。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-floating-button/MFloatingButton";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-floating-button") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-floating-button", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("默认渲染 + 图标，右下角定位", async () => {
    el = mount();
    await flush();
    const btn = el.shadowRoot.querySelector(".m-floating-button");
    expect(btn.textContent.trim()).toBe("+");
    expect(btn.getAttribute("aria-label")).toBe("+");
    expect(btn.classList.contains("m-floating-button--br")).toBe(true);
  });

  it("position 切换左下角，并与无障碍名一起受控", async () => {
    el = mount({ icon: "＋", position: "bl" });
    await flush();
    const btn = el.shadowRoot.querySelector(".m-floating-button");
    expect(btn.classList.contains("m-floating-button--bl")).toBe(true);
    expect(btn.getAttribute("aria-label")).toBe("＋");
  });

  it("点击按钮派发 z-click", async () => {
    el = mount();
    await flush();
    let fired = 0;
    el.addEventListener("z-click", () => fired++);
    el.shadowRoot.querySelector(".m-floating-button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fired).toBe(1);
  });

  it("图标里的引号不会撑破 aria-label（属性值必须 escapeAttr）", async () => {
    el = mount({ icon: 'a"b' });
    await flush();
    const btn = el.shadowRoot.querySelector(".m-floating-button");
    expect(btn.getAttribute("aria-label")).toBe('a"b');
  });
});
