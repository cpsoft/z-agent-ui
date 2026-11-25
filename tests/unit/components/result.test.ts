// Test: z-result 结果页
// Related: [[2026-08-11-W17-data]]
// Wiki: wiki/planning/TASKS/2026-08-11-W17-data/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import "../../../src/components/result/Result.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createResult(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-result") as any;
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

describe("z-result", () => {
  it("renders title and subtitle", async () => {
    const el = createResult({ title: "提交成功", subtitle: "感谢您的反馈" });
    await flush();
    expect(el.shadowRoot!.textContent).toContain("提交成功");
    expect(el.shadowRoot!.textContent).toContain("感谢您的反馈");
    document.body.removeChild(el);
  });

  it("default status is info with root class", async () => {
    const el = createResult({});
    await flush();
    const root = el.shadowRoot!.querySelector(".z-result")!;
    expect(root.classList.contains("z-result--info")).toBe(true);
    document.body.removeChild(el);
  });

  it("status attribute switches class", async () => {
    const el = createResult({ status: "success" });
    await flush();
    const root = el.shadowRoot!.querySelector(".z-result")!;
    expect(root.classList.contains("z-result--success")).toBe(true);
    document.body.removeChild(el);
  });

  it("each status renders an SVG icon", async () => {
    for (const s of ["success", "error", "info", "warning"]) {
      const el = createResult({ status: s });
      await flush();
      expect(el.shadowRoot!.querySelector(".z-result__icon svg")).not.toBeNull();
      document.body.removeChild(el);
    }
  });

  it("icon and actions slots present", async () => {
    const el = createResult({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-result__icon slot[name='icon']")).not.toBeNull();
    expect(el.shadowRoot!.querySelector(".z-result__actions slot[name='actions']")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("no title renders no title element", async () => {
    const el = createResult({});
    await flush();
    expect(el.shadowRoot!.querySelector(".z-result__title")).toBeNull();
    document.body.removeChild(el);
  });

  it("title escapes HTML", async () => {
    const el = createResult({ title: "<b>XSS</b>" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-result__title")?.textContent).toBe("<b>XSS</b>");
    expect(el.shadowRoot!.querySelector(".z-result__title b")).toBeNull();
    document.body.removeChild(el);
  });
});
