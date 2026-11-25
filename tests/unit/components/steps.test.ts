// Test: z-steps 步骤条
// Related: [[2026-08-11-W16-nav]]
// Wiki: wiki/planning/TASKS/2026-08-11-W16-nav/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/steps/Steps.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

const DEFAULT_ITEMS = [
  { title: "基本信息" },
  { title: "技术方案", description: "选型与架构" },
  { title: "验收发布" },
];

function createSteps(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-steps") as any;
  for (const [k, v] of Object.entries(props)) {
    if (k === "items") el.items = v as never[];
    else if (typeof v === "boolean") {
      if (v) el.setAttribute(k, "");
    } else {
      el.setAttribute(k, String(v));
    }
  }
  document.body.appendChild(el);
  return el;
}

function items(el: any): HTMLElement[] {
  return Array.from(el.shadowRoot!.querySelectorAll(".z-steps__item")) as HTMLElement[];
}

function itemState(el: any, index: number): string {
  const li = items(el)[index];
  for (const cls of li.classList) {
    if (cls.startsWith("z-steps__item--")) return cls.replace("z-steps__item--", "");
  }
  return "none";
}

describe("z-steps", () => {
  it("renders one item per item with title", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS });
    await flush();
    expect(items(el).length).toBe(3);
    expect(el.shadowRoot!.textContent).toContain("基本信息");
    expect(el.shadowRoot!.textContent).toContain("技术方案");
    document.body.removeChild(el);
  });

  it("current step is process, previous steps finish, next steps wait", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 1 });
    await flush();
    expect(itemState(el, 0)).toBe("finish");
    expect(itemState(el, 1)).toBe("process");
    expect(itemState(el, 2)).toBe("wait");
    document.body.removeChild(el);
  });

  it("current step marker shows icon (not number), wait step shows number", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 0 });
    await flush();
    const currentMarker = items(el)[0].querySelector(".z-steps__marker")!;
    expect(currentMarker.querySelector(".z-steps__icon")).not.toBeNull();
    expect(currentMarker.querySelector(".z-steps__num")).toBeNull();
    const waitMarker = items(el)[1].querySelector(".z-steps__marker")!;
    expect(waitMarker.querySelector(".z-steps__num")?.textContent).toBe("2");
    document.body.removeChild(el);
  });

  it("global status=error makes current step error", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 2, status: "error" });
    await flush();
    expect(itemState(el, 2)).toBe("error");
    document.body.removeChild(el);
  });

  it("per-item status overrides global status", async () => {
    const itemsWithError = [
      { title: "A", status: "error" },
      { title: "B" },
    ] as never[];
    const el = createSteps({ items: itemsWithError, current: 1 });
    await flush();
    expect(itemState(el, 0)).toBe("error"); // 覆盖 finish
    expect(itemState(el, 1)).toBe("process");
    document.body.removeChild(el);
  });

  it("custom icon replaces status icon", async () => {
    const itemsWithIcon = [{ title: "A", icon: "★" }] as never[];
    const el = createSteps({ items: itemsWithIcon, current: 0 });
    await flush();
    const icon = items(el)[0].querySelector(".z-steps__icon")!;
    expect(icon.textContent).toBe("★");
    document.body.removeChild(el);
  });

  it("description renders when provided", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 1 });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-steps__desc")?.textContent).toBe("选型与架构");
    document.body.removeChild(el);
  });

  it("current item has aria-current=step", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 0 });
    await flush();
    expect(items(el)[0].getAttribute("aria-current")).toBe("step");
    expect(items(el)[1].getAttribute("aria-current")).toBeNull();
    document.body.removeChild(el);
  });

  it("vertical direction switches container class", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, direction: "vertical" });
    await flush();
    const root = el.shadowRoot!.querySelector(".z-steps")!;
    expect(root.classList.contains("z-steps--vertical")).toBe(true);
    document.body.removeChild(el);
  });

  it("click emits z-change with index only when clickable", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, clickable: true, current: 0 });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    items(el)[2].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ index: 2, item: DEFAULT_ITEMS[2] });
    // 点击当前步不重复发
    items(el)[0].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("click is ignored when not clickable", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, current: 0 });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    items(el)[1].dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("Enter key selects clickable step", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, clickable: true, current: 0 });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-change", handler);
    items(el)[1].dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.index).toBe(1);
    document.body.removeChild(el);
  });

  it("clickable items are focusable via tabindex", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS, clickable: true });
    await flush();
    expect(items(el)[0].getAttribute("tabindex")).toBe("0");
    expect(items(el)[0].getAttribute("role")).toBe("button");
    document.body.removeChild(el);
  });

  it("non-clickable items are not focusable", async () => {
    const el = createSteps({ items: DEFAULT_ITEMS });
    await flush();
    expect(items(el)[0].getAttribute("tabindex")).toBeNull();
    document.body.removeChild(el);
  });
});
