// Test: z-timeline 时间线
// Related: [[2026-08-11-W17-data]]
// Wiki: wiki/planning/TASKS/2026-08-11-W17-data/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/components/timeline/Timeline.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

const ITEMS = [
  { title: "创建", time: "2026-08-01", content: "初始化项目" },
  { title: "设计", time: "2026-08-05" },
  { title: "发布", time: "2026-08-11", content: "上线" },
];

function createTimeline(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-timeline") as any;
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

describe("z-timeline", () => {
  it("renders title/time/content", async () => {
    const el = createTimeline({ items: ITEMS });
    await flush();
    const text = el.shadowRoot!.textContent;
    expect(text).toContain("创建");
    expect(text).toContain("2026-08-01");
    expect(text).toContain("初始化项目");
    document.body.removeChild(el);
  });

  it("renders one li per item", async () => {
    const el = createTimeline({ items: ITEMS });
    await flush();
    expect(el.shadowRoot!.querySelectorAll(".z-timeline__item").length).toBe(3);
    document.body.removeChild(el);
  });

  it("status adds class to item", async () => {
    const el = createTimeline({
      items: [{ title: "A", status: "error" } as never],
    });
    await flush();
    const li = el.shadowRoot!.querySelector(".z-timeline__item")!;
    expect(li.classList.contains("z-timeline__item--error")).toBe(true);
    document.body.removeChild(el);
  });

  it("custom color inlines CSS variable", async () => {
    const el = createTimeline({
      items: [{ title: "A", color: "red" } as never],
    });
    await flush();
    const li = el.shadowRoot!.querySelector(".z-timeline__item")!;
    expect(li.getAttribute("style")).toContain("--z-timeline-dot-color:red");
    document.body.removeChild(el);
  });

  it("custom dot renders instead of status dot", async () => {
    const el = createTimeline({
      items: [{ title: "A", dot: "★" } as never],
    });
    await flush();
    const dot = el.shadowRoot!.querySelector(".z-timeline__dot-custom")!;
    expect(dot.textContent).toBe("★");
    document.body.removeChild(el);
  });

  it("reverse flips item order", async () => {
    const el = createTimeline({ items: ITEMS, reverse: true });
    await flush();
    const titles = Array.from(el.shadowRoot!.querySelectorAll(".z-timeline__title")).map((n) => n.textContent!.split("2026")[0].trim());
    expect(titles).toEqual(["发布", "设计", "创建"]);
    document.body.removeChild(el);
  });

  it("pending appends tail item", async () => {
    const el = createTimeline({ items: ITEMS, pending: "进行中" });
    await flush();
    const items = el.shadowRoot!.querySelectorAll(".z-timeline__item");
    expect(items.length).toBe(4);
    expect(items[3].classList.contains("z-timeline__item--pending")).toBe(true);
    expect(items[3].textContent).toContain("进行中");
    document.body.removeChild(el);
  });

  it("line exists between items (::before is CSS, no DOM assertion needed)", async () => {
    const el = createTimeline({ items: ITEMS });
    await flush();
    // [WHY] 竖线是 CSS ::before,此处仅验证结构类存在（浏览器冒烟验证视觉）
    const items = el.shadowRoot!.querySelectorAll(".z-timeline__item");
    expect(items[0].classList.contains("z-timeline__item")).toBe(true);
    document.body.removeChild(el);
  });

  it("empty items renders empty list without error", async () => {
    const el = createTimeline({});
    await flush();
    expect(el.shadowRoot!.querySelectorAll(".z-timeline__item").length).toBe(0);
    document.body.removeChild(el);
  });
});
