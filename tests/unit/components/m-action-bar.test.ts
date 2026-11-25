// Test: m-action-bar —— 移动端底部操作条
import { describe, it, expect } from "vitest";
import "../../../src/components/m-action-bar/MActionBar";

const tick = () => new Promise((r) => setTimeout(r, 0));

async function make(attrs: Record<string, string> = {}) {
  const el = document.createElement("m-action-bar") as any;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.innerHTML = '<button slot="left">取消</button><button>保存</button>';
  document.body.appendChild(el);
  await tick();
  return el;
}

const v = (el: any, name: string) => el.style.getPropertyValue(name);

describe("m-action-bar", () => {
  it("默认固定贴底，四边复位到 0", async () => {
    const el = await make();
    expect(v(el, "--_pos")).toBe("fixed");
    expect(v(el, "--_left")).toBe("0");
    expect(v(el, "--_right")).toBe("0");
    expect(v(el, "--_bottom")).toBe("0");
    el.remove();
  });

  it("默认避让安全区（底部 padding 里带 --z-safe-bottom）", async () => {
    const el = await make();
    expect(v(el, "--_padb")).toContain("--z-safe-bottom");
    el.remove();
  });

  it("inline 模式：static + 四边 auto + 不再避让安全区", async () => {
    const el = await make({ inline: "" });
    expect(v(el, "--_pos")).toBe("static");
    expect(v(el, "--_left")).toBe("auto");
    expect(v(el, "--_right")).toBe("auto");
    expect(v(el, "--_bottom")).toBe("auto");
    // 内联模式不在屏幕底部，安全区无意义 —— 留着会凭空多出一截空白
    expect(v(el, "--_padb")).not.toContain("--z-safe-bottom");
    el.remove();
  });

  it("borderless 去掉上边框", async () => {
    const el = await make({ borderless: "" });
    expect(v(el, "--_border")).toBe("none");
    el.remove();
  });

  it("align 四档映射到 justify-content", async () => {
    for (const [align, expected] of [
      ["start", "flex-start"],
      ["center", "center"],
      ["end", "flex-end"],
      ["between", "space-between"],
    ]) {
      const el = await make({ align });
      expect(v(el, "--_justify"), align).toBe(expected);
      el.remove();
    }
  });

  it("未知 align 回落到 end（主操作靠右是移动端的默认）", async () => {
    const el = await make({ align: "middle" });
    expect(v(el, "--_justify")).toBe("flex-end");
    el.remove();
  });

  it("渲染两个 slot：左侧次要操作 + 主操作组", async () => {
    const el = await make();
    expect(el.shadowRoot!.querySelector('slot[name="left"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector("slot:not([name])")).not.toBeNull();
    el.remove();
  });

  it("改属性会重新计算（不是只在首次渲染时算一次）", async () => {
    const el = await make();
    expect(v(el, "--_pos")).toBe("fixed");
    el.inline = true;
    await tick();
    expect(v(el, "--_pos")).toBe("static");
    expect(v(el, "--_bottom")).toBe("auto");
    el.remove();
  });
});
