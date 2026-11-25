// Test: z-watermark 水印（canvas dataURL 平铺 / 防篡改 / 无 canvas 守卫）
// Related: [[2026-08-11-W18-enterprise]]
// Wiki: wiki/planning/TASKS/2026-08-11-W18-enterprise/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/watermark/Watermark.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

// [WHY] happy-dom 无 canvas 2D: mock 原型方法（chart.test.ts IO mock 先例）
function mockCanvas(): void {
  const proto = HTMLCanvasElement.prototype as any;
  proto.getContext = () => ({
    font: "",
    fillStyle: "",
    textAlign: "",
    textBaseline: "",
    measureText: () => ({ width: 100 }),
    translate: () => {},
    rotate: () => {},
    fillText: () => {},
  });
  proto.toDataURL = () => "data:image/png;base64,mock";
}

function createWatermark(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-watermark") as any;
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

function wm(el: any): HTMLElement | null {
  return el.shadowRoot!.querySelector(".z-watermark");
}

describe("z-watermark", () => {
  it("renders watermark layer without canvas (guard)", async () => {
    const el = createWatermark({ content: "机密" });
    await flush();
    const div = wm(el);
    expect(div).not.toBeNull();
    expect(div!.style.backgroundImage).toBe("");
    document.body.removeChild(el);
  });

  it("draws tiled background with canvas mock", async () => {
    mockCanvas();
    const el = createWatermark({ content: "机密", color: "rgba(0,0,0,0.1)", fontSize: 20, gap: 120 });
    await flush();
    const div = wm(el)!;
    // tileW = measureText(100) + gap(120) = 220
    expect(div.style.backgroundImage).toContain("data:image/png;base64,mock");
    expect(div.style.backgroundSize).toBe("220px 140px");
    document.body.removeChild(el);
  });

  it("param change redraws tile", async () => {
    mockCanvas();
    const el = createWatermark({ content: "A", gap: 50 });
    await flush();
    expect(wm(el)!.style.backgroundSize).toBe("150px 66px");
    el.setAttribute("gap", "200");
    await flush();
    expect(wm(el)!.style.backgroundSize).toBe("300px 216px");
    document.body.removeChild(el);
  });

  it("re-draw skipped when params unchanged (no loop)", async () => {
    mockCanvas();
    const el = createWatermark({ content: "A" });
    await flush();
    const draw = vi.spyOn(el, "_draw");
    el.setAttribute("fontSize", "16");
    await flush();
    expect(draw).not.toHaveBeenCalled();
    document.body.removeChild(el);
  });

  it("MutationObserver re-adds removed watermark layer", async () => {
    mockCanvas();
    const el = createWatermark({ content: "A" });
    await flush();
    const root = el.shadowRoot!;
    root.querySelector(".z-watermark")!.remove();
    await flush();
    expect(root.querySelector(".z-watermark")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("disconnect cleans observer without error", async () => {
    mockCanvas();
    const el = createWatermark({ content: "A" });
    await flush();
    expect(() => document.body.removeChild(el)).not.toThrow();
  });
});
