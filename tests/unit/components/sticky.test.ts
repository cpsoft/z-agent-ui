// Test: z-sticky —— 吸顶容器
import { describe, it, expect } from "vitest";
import "../../../src/components/sticky/Sticky";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(attrs: Record<string, string> = {}) {
  const el = document.createElement("z-sticky") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);

describe("z-sticky", () => {
  it("默认：sticky / top 0 / 层级 1", async () => {
    const el = await make();
    expect(v(el, "--_pos")).toBe("sticky");
    expect(v(el, "--_top")).toBe("0px");
    expect(v(el, "--_bottom")).toBe("auto");
    expect(v(el, "--_z")).toBe("1");
    el.remove();
  });

  it("offsetTop 生效", async () => {
    const el = await make({ "offset-top": "64" });
    expect(v(el, "--_top")).toBe("64px");
    expect(v(el, "--_bottom")).toBe("auto");
    el.remove();
  });

  it("offsetBottom 生效时改用 bottom，top 置 auto（两者不能同时钉）", async () => {
    const el = await make({ "offset-bottom": "80" });
    expect(v(el, "--_bottom")).toBe("80px");
    expect(v(el, "--_top")).toBe("auto");
    el.remove();
  });

  it("同时给 top 与 bottom 时以 bottom 为准（否则元素被钉在两者之间，看着像错位）", async () => {
    const el = await make({ "offset-top": "20", "offset-bottom": "80" });
    expect(v(el, "--_bottom")).toBe("80px");
    expect(v(el, "--_top")).toBe("auto");
    el.remove();
  });

  it("disabled 改为 static（不是 display:none —— 内容必须还在流里）", async () => {
    const el = await make({ disabled: "" });
    expect(v(el, "--_pos")).toBe("static");
    el.remove();
  });

  it("zIndex 可覆盖，非法值回到 1", async () => {
    const a = await make({ "z-index": "5" });
    expect(v(a, "--_z")).toBe("5");
    a.remove();
    const b = await make({ "z-index": "abc" });
    expect(v(b, "--_z")).toBe("1");
    b.remove();
  });

  it("渲染出 slot 且无包裹层（包裹层会多一层块级盒子，影响 sticky 的包含块）", async () => {
    const el = await make();
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll("div").length).toBe(0);
    el.remove();
  });

  it("改 offset 会重新计算（不是只在首次渲染时算一次）", async () => {
    const el = await make({ "offset-top": "10" });
    expect(v(el, "--_top")).toBe("10px");
    el.offsetTop = 48;
    await tick();
    expect(v(el, "--_top")).toBe("48px");
    el.remove();
  });
});
