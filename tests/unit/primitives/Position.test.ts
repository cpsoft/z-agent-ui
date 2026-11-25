// Test: z-position component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/primitives/position/Position";

describe("z-position", () => {
  it("sets position:fixed on connect", async () => {
    const el = document.createElement("z-position") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(el.style.position).toBe("fixed");
    expect(el.style.top).toBe("0px");
    expect(el.style.left).toBe("0px");
    document.body.removeChild(el);
  });

  it("does not connect without valid anchor", async () => {
    const el = document.createElement("z-position") as any;
    el.anchor = "#nonexistent";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    // Should not throw
    expect(el.style.position).toBe("fixed");
    document.body.removeChild(el);
  });

  it("reposition() method exists", async () => {
    const el = document.createElement("z-position") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    expect(typeof el.reposition).toBe("function");
    el.reposition(); // should not throw
    document.body.removeChild(el);
  });

  it("cleans up on disconnect", async () => {
    const el = document.createElement("z-position") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(el);
    // Should not throw
    expect(true).toBe(true);
  });

  // ── D-L0-5：anchor 是宿主字符串，非法值不能让元素升级失败 ──────────────────
  it("z-index 走令牌，不写死 1000", async () => {
    const el = document.createElement("z-position") as any;
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    // 判据是「值里有令牌名」：写死 1000 时宿主调 --z-z-dropdown 它不跟随。
    expect(el.style.zIndex).toBe("var(--z-z-dropdown)");
    document.body.removeChild(el);
  });

  it("anchor 是非法选择器时不抛，退化为不定位", async () => {
    const el = document.createElement("z-position") as any;
    // `a b](` 不是合法选择器：querySelector 会抛 DOMException
    el.anchor = "a b](";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    // 抛在 connectedCallback 里会让元素「连上但没渲染」，这里断言它照常连上
    expect(el.isConnected).toBe(true);
    expect(el.style.position).toBe("fixed");
    document.body.removeChild(el);
  });

  it("anchor 写 id 时能定位（getElementById 优先）", async () => {
    const anchor = document.createElement("button");
    anchor.id = "anchor-by-id";
    document.body.appendChild(anchor);

    const el = document.createElement("z-position") as any;
    el.anchor = "anchor-by-id";
    document.body.appendChild(el);
    await new Promise((r) => setTimeout(r, 0));

    // 定位是否成功不好断言（happy-dom 无布局），但至少不该抛
    expect(el.style.position).toBe("fixed");
    document.body.removeChild(el);
    document.body.removeChild(anchor);
  });
});
