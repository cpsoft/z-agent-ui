// Test: z-flex —— flex 布局原语
import { describe, it, expect } from "vitest";
import "../../../src/components/flex/Flex";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-flex") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);

describe("z-flex", () => {
  it("默认：块级 flex / 横向 / 无间距 / stretch 对齐", async () => {
    const el = await make();
    expect(v(el, "--_display")).toBe("flex");
    expect(v(el, "--_dir")).toBe("row");
    expect(v(el, "--_gap")).toBe("0");
    expect(v(el, "--_align")).toBe("stretch");
    expect(v(el, "--_justify")).toBe("flex-start");
    expect(v(el, "--_wrap")).toBe("nowrap");
    el.remove();
  });

  it("四种 direction 原样下发（原语不做语义猜测）", async () => {
    for (const dir of ["row", "column", "row-reverse", "column-reverse"]) {
      const el = await make({ direction: dir });
      expect(v(el, "--_dir"), dir).toBe(dir);
      el.remove();
    }
  });

  it("gap 纯数字转 px，CSS 值原样保留", async () => {
    const a = await make({ gap: "16" });
    expect(v(a, "--_gap")).toBe("16px");
    a.remove();

    const b = await make({ gap: "var(--z-space-3)" });
    expect(v(b, "--_gap")).toBe("var(--z-space-3)");
    b.remove();
  });

  it("justify 六档 + align 五档都映射到合法 CSS 关键字", async () => {
    const cases: Array<[string, string, string]> = [
      ["justify", "start", "flex-start"],
      ["justify", "center", "center"],
      ["justify", "end", "flex-end"],
      ["justify", "between", "space-between"],
      ["justify", "around", "space-around"],
      ["justify", "evenly", "space-evenly"],
      ["align", "start", "flex-start"],
      ["align", "center", "center"],
      ["align", "end", "flex-end"],
      ["align", "baseline", "baseline"],
      ["align", "stretch", "stretch"],
    ];
    for (const [prop, value, expected] of cases) {
      const el = await make({ [prop]: value });
      expect(v(el, prop === "justify" ? "--_justify" : "--_align"), `${prop}=${value}`).toBe(
        expected,
      );
      el.remove();
    }
  });

  it("inline 生效时 display 变 inline-flex", async () => {
    const el = await make({ inline: "" });
    expect(v(el, "--_display")).toBe("inline-flex");
    el.remove();
  });

  it("wrap 生效时 flex-wrap 变 wrap", async () => {
    const el = await make({ wrap: "" });
    expect(v(el, "--_wrap")).toBe("wrap");
    el.remove();
  });

  it("未知词汇回落到默认值（不产生非法 CSS 关键字）", async () => {
    const el = await make({ justify: "middle", align: "middle" });
    expect(v(el, "--_justify")).toBe("flex-start");
    expect(v(el, "--_align")).toBe("stretch");
    el.remove();
  });

  it("改属性会重新计算（不是只在首次渲染时算一次）", async () => {
    const el = await make({ direction: "column", gap: "8" });
    expect(v(el, "--_dir")).toBe("column");
    el.direction = "row";
    el.gap = "24";
    await tick();
    expect(v(el, "--_dir")).toBe("row");
    expect(v(el, "--_gap")).toBe("24px");
    el.remove();
  });

  it("渲染出 slot，且没有包裹层", async () => {
    const el = await make();
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll("div").length).toBe(0);
    el.remove();
  });
});
