// Test: z-segmented 分段控件 —— 选中态、事件、键盘、禁用、焦点恢复
// Related: architecture/component-gap-audit.html §03（M3 SegmentedButton / iOS Picker(.segmented) 对齐）
// Wiki: architecture/component-gap-audit.html
// Date: 2026-11-23
//
// [WHY 这条要有] 分段控件此前用 `z-tabs` 顶替，而 tabs 的 aria 是 tablist —— 读屏报「标签页」
// 但页面上没有面板。新组件必须钉住两件事：**语义是 radiogroup**、**键盘是移动即选中**。
// 另外 `BaseElement` 每次更新重建 shadow，焦点会掉到 body —— 这条最容易被当成「浏览器问题」放过。

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/segmented/index.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createSegmented(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-segmented") as any;
  el.items = props.items ?? [
    { value: "day", label: "日" },
    { value: "week", label: "周" },
    { value: "month", label: "月" },
  ];
  for (const [k, v] of Object.entries(props)) {
    if (k === "items") continue;
    if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else if (typeof v !== "object") {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  return el;
}

const items = (el: any): HTMLElement[] => Array.from(el.shadowRoot.querySelectorAll(".z-seg__item"));
const checked = (el: any): string[] =>
  items(el)
    .filter((b) => b.getAttribute("aria-checked") === "true")
    .map((b) => b.getAttribute("data-value")!);

describe("z-segmented", () => {
  it("渲染 items，只有 value 命中的段是选中态", async () => {
    const el = createSegmented({ value: "week" });
    await flush();
    expect(items(el)).toHaveLength(3);
    expect(checked(el)).toEqual(["week"]);
    document.body.removeChild(el);
  });

  it("语义是 radiogroup 而不是 tablist（顶替 tabs 时踩过）", async () => {
    const el = createSegmented({});
    await flush();
    const root = el.shadowRoot.querySelector(".z-seg")!;
    expect(root.getAttribute("role")).toBe("radiogroup");
    expect(items(el).every((b) => b.getAttribute("role") === "radio")).toBe(true);
    document.body.removeChild(el);
  });

  it("value 未匹配任何 item 时全不选中（不替宿主选第一项）", async () => {
    const el = createSegmented({ value: "nope" });
    await flush();
    expect(checked(el)).toEqual([]);
    document.body.removeChild(el);
  });

  it("点击切换并发出 z-change", async () => {
    const el = createSegmented({ value: "day" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);

    items(el)[2].click();
    await flush();

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail).toEqual({ value: "month" });
    expect(el.value).toBe("month");
    expect(checked(el)).toEqual(["month"]);
    document.body.removeChild(el);
  });

  it("点已选中的段不发事件（避免宿主重复取数）", async () => {
    const el = createSegmented({ value: "day" });
    await flush();
    const spy = vi.fn();
    el.addEventListener("z-change", spy);
    items(el)[0].click();
    await flush();
    expect(spy).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("→ / ← 移动并选中，焦点跟着走（APG radio group）", async () => {
    const el = createSegmented({ value: "day" });
    await flush();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flush();
    expect(el.value).toBe("week");
    expect(el.shadowRoot.activeElement?.getAttribute("data-value")).toBe("week");

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await flush();
    expect(el.value).toBe("day");
    document.body.removeChild(el);
  });

  it("禁用的段不参与键盘导航，点了也不变", async () => {
    const el = createSegmented({
      value: "day",
      items: [
        { value: "day", label: "日" },
        { value: "week", label: "周", disabled: true },
        { value: "month", label: "月" },
      ],
    });
    await flush();

    el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flush();
    expect(el.value).toBe("month");

    // 点被禁用的第二段（week）：值必须停在 month
    items(el)[1].click();
    await flush();
    expect(el.value).toBe("month");
    document.body.removeChild(el);
  });

  it("整组 disabled 时全部置灰且不可切换", async () => {
    const el = createSegmented({ value: "day", disabled: true });
    await flush();
    expect(items(el).every((b) => b.hasAttribute("disabled"))).toBe(true);
    document.body.removeChild(el);
  });

  it("full 加等分类，aria-label 转发到内层 radiogroup", async () => {
    const el = createSegmented({ full: true });
    el.setAttribute("aria-label", "视图");
    await flush();
    const root = el.shadowRoot.querySelector(".z-seg")!;
    expect(root.classList.contains("z-seg--full")).toBe(true);
    expect(root.getAttribute("aria-label")).toBe("视图");
    document.body.removeChild(el);
  });
});

// ── HTML 入口：options 字符串 ────────────────────────────────
// [WHY 这条要有] `items` 是数组（attribute:false），纯 HTML 宿主配不了。
// 若只有数组入口，这个组件对「静态页 / SSR / AI 生成的页面脚本」这一半宿主不可用 ——
// 而它们恰恰是最不可能写 JS 的那批。
describe("z-segmented options 字符串入口", () => {
  it("`value|label` 逗号分隔，label 省略时与 value 同文", async () => {
    const el = document.createElement("z-segmented") as any;
    el.setAttribute("options", "day|日,week,month|月");
    el.setAttribute("value", "week");
    document.body.appendChild(el);
    await flush();

    const btns = items(el);
    expect(btns.map((b) => b.textContent)).toEqual(["日", "week", "月"]);
    expect(checked(el)).toEqual(["week"]);
    document.body.removeChild(el);
  });

  it("label 里可以带竖线（只按第一个 | 切）", async () => {
    const el = document.createElement("z-segmented") as any;
    el.setAttribute("options", "a|A|B");
    document.body.appendChild(el);
    await flush();
    expect(items(el)[0].textContent).toBe("A|B");
    document.body.removeChild(el);
  });

  it("items 与 options 并存时以 items 为准（不出现两套真相）", async () => {
    const el = document.createElement("z-segmented") as any;
    el.setAttribute("options", "x|X,y|Y");
    el.items = [{ value: "a", label: "A" }];
    document.body.appendChild(el);
    await flush();
    expect(items(el)).toHaveLength(1);
    expect(items(el)[0].textContent).toBe("A");
    document.body.removeChild(el);
  });
});
