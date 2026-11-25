// Test: z-m-empty —— 三种语义、文案转义与插槽
// Date: 2026-10-25
//
// 空状态文案大量来自接口错误信息（"加载失败：xxx"），这些串里可能带用户可控内容，
// 必须转义。另外 title/description 为空时不能渲染空节点占位（会撑出多余间距）。
import { describe, it, expect, afterEach } from "vitest";
import "../../../src/components/m-empty/MEmpty";

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function mount(props: Record<string, unknown> = {}): any {
  const el = document.createElement("m-empty") as any;
  Object.assign(el, props);
  document.body.appendChild(el);
  return el;
}

describe("m-empty", () => {
  let el: any;

  afterEach(() => {
    if (el && el.parentNode) document.body.removeChild(el);
  });

  it("默认是 empty 语义：有图标，无标题/无描述时不渲染空节点", async () => {
    el = mount();
    await flush();
    expect(el.shadowRoot.querySelector(".m-empty__icon svg")).toBeTruthy();
    expect(el.shadowRoot.querySelector(".m-empty__title")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-empty__description")).toBeNull();
  });

  it("title 与 description 正常渲染", async () => {
    el = mount({ title: "暂无数据", description: "换个筛选条件试试" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-empty__title").textContent).toBe("暂无数据");
    expect(el.shadowRoot.querySelector(".m-empty__description").textContent).toBe("换个筛选条件试试");
  });

  it("文案里的标签被转义（接口错误串直出会注入）", async () => {
    const evil = `<script>alert(1)</script>`;
    el = mount({ title: evil, description: evil });
    await flush();
    expect(el.shadowRoot.querySelector(".m-empty__title").querySelector("script")).toBeNull();
    expect(el.shadowRoot.querySelector(".m-empty__title").textContent).toBe(evil);
  });

  it("type 切换换图标（empty / error / forbidden 三套）", async () => {
    el = mount({ type: "empty" });
    await flush();
    const emptyIcon = el.shadowRoot.querySelector(".m-empty__icon").innerHTML;

    el.type = "forbidden";
    await flush();
    const forbiddenIcon = el.shadowRoot.querySelector(".m-empty__icon").innerHTML;

    expect(emptyIcon).not.toBe(forbiddenIcon);
    expect(forbiddenIcon).toContain("circle");
  });

  it("未知 type 回落 empty（不渲染空图标）", async () => {
    el = mount({ type: "not-a-type" });
    await flush();
    expect(el.shadowRoot.querySelector(".m-empty__icon svg")).toBeTruthy();
  });

  it("默认插槽渲染在 action 区（放「重试」按钮）", async () => {
    el = document.createElement("m-empty") as any;
    el.innerHTML = "<button>重试</button>";
    document.body.appendChild(el);
    await flush();
    expect(el.shadowRoot.querySelector(".m-empty__action slot")).toBeTruthy();
    expect(el.querySelector("button").textContent).toBe("重试");
  });
});
