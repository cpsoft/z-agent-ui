// Test: z-empty 空状态
// Related: [[2026-08-11-W17-data]]
// Wiki: wiki/planning/TASKS/2026-08-11-W17-data/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/components/empty/Empty.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createEmpty(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-empty") as any;
  for (const [k, v] of Object.entries(props)) {
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  return el;
}

describe("z-empty", () => {
  it("renders description", async () => {
    const el = createEmpty({ description: "暂无数据" });
    await flush();
    expect(el.shadowRoot!.textContent).toContain("暂无数据");
    document.body.removeChild(el);
  });

  it("default preset renders inline SVG", async () => {
    const el = createEmpty({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__image svg")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("preset selection swaps icon", async () => {
    const el = createEmpty({ image: "search" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__image svg")).not.toBeNull();
    // 未知 preset 回退 default 不抛错
    const el2 = createEmpty({ image: "unknown" });
    await flush();
    expect(el2.shadowRoot!.querySelector(".z-empty__image svg")).not.toBeNull();
    document.body.removeChild(el);
    document.body.removeChild(el2);
  });

  it("actions slot is present", async () => {
    const el = createEmpty({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__actions slot[name='actions']")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("image slot is present", async () => {
    const el = createEmpty({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__image slot[name='image']")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("empty description hides description element", async () => {
    const el = createEmpty({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__description")).toBeNull();
    document.body.removeChild(el);
  });
});

// ── 2026-11-23：与 z-m-empty 对齐的三态 ──────────────────────────
// [WHY 这批断言要有] PC 与移动两套空态此前是两套 API（PC 只有 image preset，移动才有 type）。
// 合并的方向是「PC 补 type/title」，而老写法 `image="search"` 必须一个字节都不变 ——
// 所以下面既测新语义，也测老 API 的优先级。
describe("z-empty 三态（2026-11-23 与 m-empty 对齐）", () => {
  it("type 决定默认插图", async () => {
    for (const [type, preset] of [
      ["empty", "default"],
      ["error", "error"],
      ["forbidden", "forbidden"],
    ] as const) {
      const el = createEmpty({ type });
      await flush();
      expect(el.shadowRoot!.querySelector(".z-empty__image")!.getAttribute("data-preset")).toBe(preset);
      document.body.removeChild(el);
    }
  });

  it("image 显式给了就压过 type（老写法零行为变化）", async () => {
    const el = createEmpty({ type: "error", image: "search" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__image")!.getAttribute("data-preset")).toBe("search");
    document.body.removeChild(el);
  });

  it("title 渲染，空则不渲染", async () => {
    const el = createEmpty({ title: "查询失败" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__title")!.textContent).toBe("查询失败");
    document.body.removeChild(el);

    const el2 = createEmpty({});
    await flush();
    expect(el2.shadowRoot!.querySelector(".z-empty__title")).toBeNull();
    document.body.removeChild(el2);
  });

  it("type 同时反映到根 class，供换肤与宿主选择器使用", async () => {
    const el = createEmpty({ type: "forbidden" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty")!.classList.contains("z-empty--forbidden")).toBe(true);
    document.body.removeChild(el);
  });

  it("未知 type 回落 default 插图，不抛错", async () => {
    const el = createEmpty({ type: "wat" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-empty__image")!.getAttribute("data-preset")).toBe("default");
    expect(el.shadowRoot!.querySelector(".z-empty__image svg")).not.toBeNull();
    document.body.removeChild(el);
  });
});
