// Test: z-virtual-list 虚拟列表（固定高度切片/滚动直写/scrollToIndex/空态）
// Related: [[2026-08-11-W18-enterprise]]
// Wiki: wiki/planning/TASKS/2026-08-11-W18-enterprise/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/virtual-list/VirtualList.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

const ITEMS = Array.from({ length: 100 }, (_, i) => `item-${i}`);

function createList(items: unknown[] = ITEMS, props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-virtual-list") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  el.items = items; // attribute:false
  document.body.appendChild(el);
  return el;
}

function sliceHtml(el: any): string {
  return el.shadowRoot!.querySelector(".z-vlist__slice")?.innerHTML ?? "";
}

describe("z-virtual-list", () => {
  it("renders spacer with total height", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    const space = el.shadowRoot!.querySelector(".z-vlist__space");
    expect(space).not.toBeNull();
    expect(space!.style.height).toBe("4000px");
    document.body.removeChild(el);
  });

  it("renders initial slice rows", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    // 可视 10 行 + 上下各 0 overscan = 10 行
    expect(sliceHtml(el).match(/z-vlist__row/g)).toHaveLength(10);
    expect(sliceHtml(el)).toContain("item-0");
    expect(sliceHtml(el)).not.toContain("item-10");
    document.body.removeChild(el);
  });

  it("overscan adds extra rows below (top clamped at 0)", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 3 });
    await flush();
    // 可视 10 行 + 下方 overscan 3（上方 overscan 被 0 顶住）= 13 行
    expect(sliceHtml(el).match(/z-vlist__row/g)).toHaveLength(13);
    document.body.removeChild(el);
  });

  it("scroll writes slice directly without re-render", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    const scroller = el.shadowRoot!.querySelector(".z-vlist");
    scroller.scrollTop = 400; // 滚 10 行
    scroller.dispatchEvent(new Event("scroll"));
    await flush();
    const html = sliceHtml(el);
    expect(html).toContain("item-10");
    expect(html).not.toContain("item-0");
    document.body.removeChild(el);
  });

  it("bottom clamp: slice never exceeds items", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 10 });
    await flush();
    const scroller = el.shadowRoot!.querySelector(".z-vlist");
    scroller.scrollTop = 100000;
    scroller.dispatchEvent(new Event("scroll"));
    await flush();
    const html = sliceHtml(el);
    expect(html).toContain("item-99");
    expect(html.match(/z-vlist__row/g)).toHaveLength(10);
    document.body.removeChild(el);
  });

  it("custom render callback used for rows", async () => {
    const render = vi.fn((item: unknown) => `<div class="custom-row">R:${item}</div>`);
    const el = createList(["a", "b"]);
    el.renderItem = render;
    await flush();
    expect(sliceHtml(el)).toContain("R:a");
    expect(render).toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("empty state with empty-text", async () => {
    // [WHY] 显式 kebab 属性（[[multiword-attribute-kebab]]）
    const el = createList([], { "empty-text": "空空如也" });
    await flush();
    const empty = el.shadowRoot!.querySelector(".z-vlist--empty");
    expect(empty).not.toBeNull();
    expect(empty!.textContent).toContain("空空如也");
    document.body.removeChild(el);
  });

  it("scrollToIndex positions and syncs slice", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    el.scrollToIndex(50);
    await flush();
    const scroller = el.shadowRoot!.querySelector(".z-vlist");
    expect(scroller.scrollTop).toBe(2000);
    expect(sliceHtml(el)).toContain("item-50");
    document.body.removeChild(el);
  });

  it("scrollToOffset sets scrollTop", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    el.scrollToOffset(800);
    await flush();
    const scroller = el.shadowRoot!.querySelector(".z-vlist");
    expect(scroller.scrollTop).toBe(800);
    expect(sliceHtml(el)).toContain("item-20");
    document.body.removeChild(el);
  });

  it("items change re-syncs slice after render", async () => {
    const el = createList(ITEMS, { itemHeight: 40, height: 400, overscan: 0 });
    await flush();
    el.items = ["only"];
    await flush();
    expect(sliceHtml(el)).toContain("only");
    expect(el.shadowRoot!.querySelector(".z-vlist__space").style.height).toBe("40px");
    document.body.removeChild(el);
  });
});
