// Test: z-typography —— 标题 / 正文 / 省略 / 复制
import { describe, it, expect, vi } from "vitest";
import "../../../src/components/typography/Typography";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(attrs: Record<string, string> = {}, text = "内容") {
  const el = document.createElement("z-typography") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.textContent = text;
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);
const root = (el: any) => el.shadowRoot!.querySelector(".z-typography")!;

describe("z-typography", () => {
  it("默认 body：用 <p> 标签（不是 div —— 屏幕阅读器靠标题标签跳转）", async () => {
    const el = await make();
    expect(root(el).tagName).toBe("P");
    expect(v(el, "--_size")).toBe("var(--z-font-size-base)");
    expect(v(el, "--_weight")).toBe("400");
    el.remove();
  });

  it("h1..h5 各自映射到对应的语义标签与字号令牌", async () => {
    const cases: Array<[string, string, string]> = [
      ["h1", "H1", "var(--z-font-size-2xl)"],
      ["h2", "H2", "var(--z-font-size-xl)"],
      ["h3", "H3", "var(--z-font-size-lg)"],
      ["h4", "H4", "var(--z-font-size-base)"],
      ["h5", "H5", "var(--z-font-size-sm)"],
    ];
    for (const [scale, tag, size] of cases) {
      const el = await make({ scale });
      expect(root(el).tagName, scale).toBe(tag);
      expect(v(el, "--_size"), scale).toBe(size);
      el.remove();
    }
  });

  it("标题字重 600/700，正文 400", async () => {
    expect(v(await make({ scale: "h1" }), "--_weight")).toBe("700");
    const h3 = await make({ scale: "h3" });
    expect(v(h3, "--_weight")).toBe("600");
    h3.remove();
  });

  it("strong 覆盖 scale 的字重（body + strong 是常见组合）", async () => {
    const el = await make({ scale: "body", strong: "" });
    expect(v(el, "--_weight")).toBe("700");
    el.remove();
  });

  it("未知 scale 兜底 body（不产生非法类名）", async () => {
    const el = await make({ scale: "h9" });
    expect(root(el).classList.contains("z-typography--body")).toBe(true);
    expect(v(el, "--_size")).toBe("var(--z-font-size-base)");
    el.remove();
  });

  it("ellipsis 加单行省略类", async () => {
    const el = await make({ ellipsis: "" });
    expect(root(el).classList.contains("z-typography--ellipsis")).toBe(true);
    el.remove();
  });

  it("lines=3 走多行省略，且不再带单行类（两者不能叠加）", async () => {
    const el = await make({ ellipsis: "", lines: "3" });
    expect(root(el).classList.contains("z-typography--clamp")).toBe(true);
    expect(root(el).classList.contains("z-typography--ellipsis")).toBe(false);
    expect(v(el, "--_lines")).toBe("3");
    el.remove();
  });

  it("lines 非法值归零（0 = 不限，而不是显示 0 行）", async () => {
    for (const bad of ["0", "-2", "abc"]) {
      const el = await make({ lines: bad });
      expect(v(el, "--_lines"), bad).toBe("0");
      expect(root(el).classList.contains("z-typography--clamp")).toBe(false);
      el.remove();
    }
  });

  it("copyable 渲染复制按钮且只在开启时出现", async () => {
    const plain = await make();
    expect(plain.shadowRoot!.querySelector(".z-typography__copy")).toBeNull();
    plain.remove();

    const el = await make({ copyable: "" });
    const btn = el.shadowRoot!.querySelector(".z-typography__copy") as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute("aria-label")).toBe("复制");
    expect(btn.type).toBe("button");
    el.remove();
  });

  it("点击复制：写入剪贴板并 emit z-copy（带文本 detail）", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const el = await make({ copyable: "" }, "门店编号 A-102");
    let detail: any = null;
    el.addEventListener("z-copy", (e: any) => (detail = e.detail));
    (el.shadowRoot!.querySelector(".z-typography__copy") as HTMLButtonElement).click();
    await tick();

    expect(writeText).toHaveBeenCalledWith("门店编号 A-102");
    expect(detail).toEqual({ text: "门店编号 A-102" });
    el.remove();
  });

  it("剪贴板被拒时不抛错，事件照发（让宿主决定怎么提示）", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    const el = await make({ copyable: "" }, "x");
    let fired = false;
    el.addEventListener("z-copy", () => (fired = true));
    (el.shadowRoot!.querySelector(".z-typography__copy") as HTMLButtonElement).click();
    await tick();
    expect(fired).toBe(true);
    el.remove();
  });
});
