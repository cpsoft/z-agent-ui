// Test: z-space —— 间距容器
//
// [为什么测 CSS 变量而不是测布局] happy-dom 不算 CSS 布局（`getComputedStyle` 的 gap
// 永远返回空），所以「flex 里真的隔了 16px」在这里**无法验证**。能验证的是它的输入端：
// 属性 → `--_*` 变量。变量对了，剩下的交给浏览器。
// 这类断言的价值在于「映射表写错 / willUpdate 没跑 / 属性没触发更新」都会当场红。
import { describe, it, expect } from "vitest";
import "../../../src/components/space/Space";
import "../../../src/components/flex/Flex";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-space") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);

describe("z-space", () => {
  it("默认：inline-flex / 横向 / md 间距（= --z-space-4）/ start 对齐", async () => {
    const el = await make();
    expect(v(el, "--_display")).toBe("inline-flex");
    expect(v(el, "--_dir")).toBe("row");
    expect(v(el, "--_gap")).toBe("var(--z-space-4)");
    expect(v(el, "--_align")).toBe("flex-start");
    expect(v(el, "--_justify")).toBe("flex-start");
    expect(v(el, "--_wrap")).toBe("nowrap");
    el.remove();
  });

  it("size 三档映射到间距令牌（sm=space-2 / md=space-4 / lg=space-6）", async () => {
    for (const [size, token] of [
      ["sm", "var(--z-space-2)"],
      ["md", "var(--z-space-4)"],
      ["lg", "var(--z-space-6)"],
    ]) {
      const el = await make({ size });
      expect(v(el, "--_gap"), `size=${size}`).toBe(token);
      el.remove();
    }
  });

  it("gap 覆盖 size：纯数字转 px", async () => {
    const el = await make({ size: "lg", gap: "12" });
    expect(v(el, "--_gap")).toBe("12px");
    el.remove();
  });

  it("gap 接受任意 CSS 长度（不维护白名单）", async () => {
    const el = await make({ gap: "var(--z-space-8)" });
    expect(v(el, "--_gap")).toBe("var(--z-space-8)");
    el.gap = "1.5rem";
    await tick();
    expect(v(el, "--_gap")).toBe("1.5rem");
    el.remove();
  });

  it("direction=vertical 换成 column", async () => {
    const el = await make({ direction: "vertical" });
    expect(v(el, "--_dir")).toBe("column");
    el.remove();
  });

  it("block 生效时 display 为 flex；wrap 生效时 flex-wrap 为 wrap", async () => {
    const el = await make({ block: "", wrap: "" });
    expect(v(el, "--_display")).toBe("flex");
    expect(v(el, "--_wrap")).toBe("wrap");
    el.remove();
  });

  it("justify=between / align=end 映射成 CSS 关键字", async () => {
    const el = await make({ justify: "between", align: "end" });
    expect(v(el, "--_justify")).toBe("space-between");
    expect(v(el, "--_align")).toBe("flex-end");
    el.remove();
  });

  it("与 z-flex 共用同一套词汇（end 在两个组件里必须是同一个值）", async () => {
    const space = await make({ align: "end", justify: "around" });
    const flex = document.createElement("z-flex") as any;
    flex.setAttribute("align", "end");
    flex.setAttribute("justify", "around");
    document.body.appendChild(flex);
    await tick();
    expect(v(space, "--_align")).toBe(v(flex, "--_align"));
    expect(v(space, "--_justify")).toBe(v(flex, "--_justify"));
    space.remove();
    flex.remove();
  });

  it("渲染出 slot（容器本身不产生盒子，子节点直接参与布局）", async () => {
    const el = await make();
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
    // 没有多余的包裹层 —— 有包裹层的话 ::slotted 的 flex 属性会失效
    expect(el.shadowRoot!.querySelectorAll("div").length).toBe(0);
    el.remove();
  });
});
