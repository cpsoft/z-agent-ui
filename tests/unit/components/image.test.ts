// Test: z-image 图片（fit/lazy/fallback/preview 灯箱/缩放）
// Related: [[2026-08-11-W17-data]]
// Wiki: wiki/planning/TASKS/2026-08-11-W17-data/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/image/Image.js";

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
}

function createImage(props: Record<string, unknown> = {}): any {
  const el = document.createElement("z-image") as any;
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

function img(el: any): HTMLImageElement | null {
  return el.shadowRoot!.querySelector(".z-image__img");
}

describe("z-image", () => {
  it("renders img with src/alt/fit", async () => {
    const el = createImage({ src: "a.png", alt: "A", fit: "contain" });
    await flush();
    const i = img(el);
    expect(i).not.toBeNull();
    expect(i!.getAttribute("src")).toBe("a.png");
    expect(i!.getAttribute("alt")).toBe("A");
    expect(i!.style.objectFit).toBe("contain");
    document.body.removeChild(el);
  });

  it("load event sets loaded and emits z-load", async () => {
    const el = createImage({ src: "a.png" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-load", handler);
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(el._loaded).toBe(true);
    document.body.removeChild(el);
  });

  it("error event emits z-error and shows fallback", async () => {
    const el = createImage({ src: "bad.png", fallback: "加载失败" });
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-error", handler);
    img(el)!.dispatchEvent(new Event("error"));
    await flush();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.querySelector(".z-image__fallback")?.textContent).toContain("加载失败");
    expect(img(el)).toBeNull();
    document.body.removeChild(el);
  });

  it("placeholder shown before load", async () => {
    const el = createImage({ src: "a.png", placeholder: "加载中…" });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__placeholder")?.textContent).toContain("加载中…");
    document.body.removeChild(el);
  });

  it("fit attribute maps to object-fit", async () => {
    const el = createImage({ fit: "cover" });
    await flush();
    expect(img(el)!.style.objectFit).toBe("cover");
    document.body.removeChild(el);
  });

  it("lazy with no IO loads immediately (guard)", async () => {
    (globalThis as any).IntersectionObserver = undefined;
    const el = createImage({ src: "a.png", lazy: true });
    await flush();
    expect(img(el)).not.toBeNull();
    document.body.removeChild(el);
  });

  it("lazy with IO keeps placeholder until intersect then loads", async () => {
    let callback: IntersectionObserverCallback | null = null;
    (globalThis as any).IntersectionObserver = class {
      constructor(cb: IntersectionObserverCallback) {
        callback = cb;
      }
      observe(): void {}
      disconnect(): void {}
      unobserve(): void {}
    };
    const el = createImage({ src: "a.png", lazy: true, placeholder: "加载中…" });
    await flush();
    // IO 未触发前: 占位而非真实 img
    expect(img(el)).toBeNull();
    expect(el.shadowRoot!.querySelector(".z-image__placeholder")).not.toBeNull();
    expect(callback).not.toBeNull();
    // 触发 intersect → 换真实 img
    callback!([{ isIntersecting: true } as never], null as never);
    await flush();
    expect(img(el)).not.toBeNull();
    document.body.removeChild(el);
    (globalThis as any).IntersectionObserver = undefined;
  });

  it("preview button appears after load", async () => {
    const el = createImage({ src: "a.png", preview: true });
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__preview-btn")).toBeNull();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__preview-btn")).not.toBeNull();
    document.body.removeChild(el);
  });

  it("preview opens lightbox with overlayManager and emits z-click", async () => {
    const el = createImage({ src: "a.png", preview: true });
    await flush();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    const handler = vi.fn();
    el.addEventListener("z-click", handler);
    el.shadowRoot!.querySelector(".z-image__preview-btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__box")).not.toBeNull();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe("hidden");
    document.body.removeChild(el);
  });

  it("lightbox closes on box click and unlocks scroll", async () => {
    const el = createImage({ src: "a.png", preview: true });
    await flush();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    el.shadowRoot!.querySelector(".z-image__preview-btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    el.shadowRoot!.querySelector(".z-image__box")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__box")).toBeNull();
    expect(document.body.style.overflow).not.toBe("hidden");
    document.body.removeChild(el);
  });

  it("Esc via overlayManager closes lightbox", async () => {
    const el = createImage({ src: "a.png", preview: true });
    await flush();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    el.shadowRoot!.querySelector(".z-image__preview-btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(el.shadowRoot!.querySelector(".z-image__box")).toBeNull();
    document.body.removeChild(el);
  });

  it("+/-/0 keys zoom the lightbox image", async () => {
    const el = createImage({ src: "a.png", preview: true, zoom: true });
    await flush();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    el.shadowRoot!.querySelector(".z-image__preview-btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "+", bubbles: true }));
    await flush();
    expect(el._zoomLevel).toBe(1.5);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "-", bubbles: true }));
    await flush();
    expect(el._zoomLevel).toBe(1);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "0", bubbles: true }));
    await flush();
    expect(el._zoomLevel).toBe(1);
    document.body.removeChild(el);
  });

  it("disconnect while box open cleans overlay stack", async () => {
    const el = createImage({ src: "a.png", preview: true });
    await flush();
    img(el)!.dispatchEvent(new Event("load"));
    await flush();
    el.shadowRoot!.querySelector(".z-image__preview-btn")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await flush();
    document.body.removeChild(el);
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
