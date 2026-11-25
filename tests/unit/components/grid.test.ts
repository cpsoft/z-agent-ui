// Test: z-grid / z-grid-col —— 12 栅格
//
// [为什么 span 的响应式要单独测 parseSpan] 它是纯函数，也是「12 × 4 个 class vs 一个 CSS 变量」
// 这个选择的关键：只要 `"xs:12 sm:6 md:4"` 能正确拆成四个变量，CSS 那侧就只是四条 @media。
// 拆错（比如把 `xs:` 当成一个独立断点）不会报错，只会让某个断点静默失效。
import { describe, it, expect } from "vitest";
import "../../../src/components/grid/Grid";
import "../../../src/components/grid/GridCol";
import { parseSpan } from "../../../src/components/grid/GridCol";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(tag: string, attrs: Record<string, string> = {}) {
  const el = document.createElement(tag) as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);

describe("parseSpan", () => {
  it("单值 = 基准", () => {
    expect(parseSpan("6")).toEqual({ base: 6, bp: {} });
  });

  it("xs 就是基准，不占独立断点变量", () => {
    expect(parseSpan("xs:12 sm:6")).toEqual({ base: 12, bp: { sm: 6 } });
  });

  it("多个断点 + 逗号分隔都认", () => {
    expect(parseSpan("xs:12, sm:6 md:4 lg:3 xl:2")).toEqual({
      base: 12,
      bp: { sm: 6, md: 4, lg: 3, xl: 2 },
    });
  });

  it("非法分片静默忽略（一个写错的 class 不该炸掉整页）", () => {
    expect(parseSpan("abc 6 xx:3 0")).toEqual({ base: 1, bp: {} });
  });

  it("空值回到 12 列（整行）", () => {
    expect(parseSpan("")).toEqual({ base: 12, bp: {} });
  });
});

describe("z-grid", () => {
  it("默认 12 列、间距取 --z-space-4", async () => {
    const el = await make("z-grid");
    expect(v(el, "--_cols")).toBe("12");
    expect(v(el, "--_gap")).toBe("var(--z-space-4)");
    expect(v(el, "--_align")).toBe("stretch");
    el.remove();
  });

  it("cols 可改（例如 24 栅格）", async () => {
    const el = await make("z-grid", { cols: "24" });
    expect(v(el, "--_cols")).toBe("24");
    el.remove();
  });

  it("非法 cols 兜底 12（repeat(0,1fr) 是无效值，会让整条声明被丢弃）", async () => {
    for (const bad of ["0", "-3", "abc"]) {
      const el = await make("z-grid", { cols: bad });
      expect(v(el, "--_cols"), `cols=${bad}`).toBe("12");
      el.remove();
    }
  });

  it("gap 纯数字转 px", async () => {
    const el = await make("z-grid", { gap: "24" });
    expect(v(el, "--_gap")).toBe("24px");
    el.remove();
  });

  it("渲染出 slot 且无包裹层（grid item 必须是使用方的直接子节点）", async () => {
    const el = await make("z-grid");
    expect(el.shadowRoot!.querySelector("slot")).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll("div").length).toBe(0);
    el.remove();
  });
});

describe("z-grid-col", () => {
  it("默认跨 12 列（整行）", async () => {
    const el = await make("z-grid-col");
    expect(v(el, "--_span")).toBe("12");
    el.remove();
  });

  it("span=6 跨半行", async () => {
    const el = await make("z-grid-col", { span: "6" });
    expect(v(el, "--_span")).toBe("6");
    el.remove();
  });

  it("响应式：每个断点写一个独立变量", async () => {
    const el = await make("z-grid-col", { span: "xs:12 sm:6 md:4 lg:3" });
    expect(v(el, "--_span")).toBe("12");
    expect(v(el, "--_span-sm")).toBe("6");
    expect(v(el, "--_span-md")).toBe("4");
    expect(v(el, "--_span-lg")).toBe("3");
    // 没写的断点不能留残值 —— 否则改了 span 之后，旧值会一直压在新值上面
    expect(v(el, "--_span-xl")).toBe("");
    el.remove();
  });

  it("改 span 会清掉不再出现的断点变量", async () => {
    const el = await make("z-grid-col", { span: "sm:6 md:4" });
    expect(v(el, "--_span-sm")).toBe("6");
    el.span = "8";
    await tick();
    expect(v(el, "--_span")).toBe("8");
    expect(v(el, "--_span-sm")).toBe("");
    expect(v(el, "--_span-md")).toBe("");
    el.remove();
  });

  it("offset=2 时起始列是 3（offset 是「空几列」，列号从 1 起）", async () => {
    const el = await make("z-grid-col", { offset: "2" });
    expect(v(el, "--_start")).toBe("3");
    el.remove();
  });

  it("offset=0 时不设 --_start（保持 auto，让浏览器自动排）", async () => {
    const el = await make("z-grid-col", { offset: "0" });
    expect(v(el, "--_start")).toBe("");
    el.remove();
  });
});
