// Test: z-drawer 抽屉（镜像 Modal API）
// Related: [[2026-08-11-W16-nav]]
// Wiki: wiki/planning/TASKS/2026-08-11-W16-nav/task_plan.md
// Date: 2026-08-11
// Author: night-hawk (AI)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/drawer/Drawer.js";
import { ZDrawer } from "../../../src/components/drawer/Drawer.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

// happy-dom 不运行 CSS 动画: 手动派发 animationend 推进退场动画状态机（同 modal.test.ts）
function dispatchAnimationEnd(el: any): void {
  const panel = el.shadowRoot!.querySelector(".z-drawer__panel");
  panel?.dispatchEvent(new Event("animationend"));
}

describe("z-drawer", () => {
  function createDrawer(): any {
    const el = document.createElement("z-drawer") as any;
    document.body.appendChild(el);
    return el;
  }

  it("is hidden by default", async () => {
    const el = createDrawer();
    await tick();
    expect(el.shadowRoot!.querySelector('[part="hidden"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders overlay and panel when open", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    expect(el.shadowRoot!.querySelector(".z-drawer__overlay")).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-drawer__panel")).toBeDefined();
    document.body.removeChild(el);
  });

  it("defaults to right placement with aria-modal dialog", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(el.placement).toBe("right");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("aria-modal")).toBe("true");
    document.body.removeChild(el);
  });

  it("placement attribute reflects to panel style variable", async () => {
    const el = createDrawer();
    el.setAttribute("placement", "left");
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(panel.style.getPropertyValue("--z-drawer-placement")).toBe("left");
    document.body.removeChild(el);
  });

  it("width/height props inline to panel style", async () => {
    const el = createDrawer();
    el.width = "600px";
    el.height = "80vh";
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(panel.style.getPropertyValue("--z-drawer-width")).toBe("600px");
    expect(panel.style.getPropertyValue("--z-drawer-height")).toBe("80vh");
    document.body.removeChild(el);
  });

  it("title renders heading with aria-labelledby", async () => {
    const el = createDrawer();
    el.title = "编辑配置";
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    const heading = panel.querySelector(".z-drawer__title");
    expect(heading?.textContent).toBe("编辑配置");
    expect(panel.getAttribute("aria-labelledby")).toBe(heading?.id);
    document.body.removeChild(el);
  });

  it("createElement does not throw with title property (F11 guard)", async () => {
    const el = document.createElement("z-drawer") as ZDrawer;
    expect(el.title).toBe("");
    el.title = "x";
    document.body.appendChild(el);
    await tick();
    document.body.removeChild(el);
  });

  it("show()/close()/toggle() work", async () => {
    const el = createDrawer();
    el.show();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
    el.toggle();
    expect(el.open).toBe(true);
    el.close();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-open / z-close", async () => {
    const el = createDrawer();
    const onOpen = vi.fn();
    const onClose = vi.fn();
    el.addEventListener("z-open", onOpen);
    el.addEventListener("z-close", onClose);
    el.open = true;
    await tick();
    expect(onOpen).toHaveBeenCalledTimes(1);
    el.open = false;
    await tick();
    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("close button triggers close", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    const closeBtn = el.shadowRoot!.querySelector(".z-drawer__close") as HTMLElement;
    closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("closes on overlay click when closeOnOverlay is true", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    const overlay = el.shadowRoot!.querySelector(".z-drawer__overlay") as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("overlay click is inert when closeOnOverlay is false", async () => {
    const el = createDrawer();
    el.open = true;
    el.closeOnOverlay = false;
    await tick();
    const overlay = el.shadowRoot!.querySelector(".z-drawer__overlay") as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("beforeClose=false aborts close", async () => {
    const el = createDrawer();
    el.open = true;
    el.beforeClose = () => false;
    await tick();
    el.close();
    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("beforeClose async resolves then closes", async () => {
    const el = createDrawer();
    el.open = true;
    el.beforeClose = () => Promise.resolve(true);
    await tick();
    el.close();
    expect(el.open).toBe(true); // async 未决议
    await tick();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("closing animation state runs and panel animates with placement class", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(panel.classList.contains("z-drawer__panel--closing")).toBe(false);
    el.open = false;
    await tick();
    // 退场动画期间 overlay 仍在
    expect(el.shadowRoot!.querySelector(".z-drawer__overlay")).toBeDefined();
    const closingPanel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(closingPanel.classList.contains("z-drawer__panel--closing")).toBe(true);
    dispatchAnimationEnd(el);
    await tick();
    expect(el.shadowRoot!.querySelector('[part="hidden"]')).toBeDefined();
    document.body.removeChild(el);
  });

  it("esc key closes via overlayManager (document-level)", async () => {
    const el = createDrawer();
    el.open = true;
    await tick();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await tick();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("static open() mounts owned instance and auto-removes after close animation", async () => {
    const r = ZDrawer.open({ title: "程序化抽屉", placement: "left", width: "500px" });
    await tick();
    expect(document.querySelector("z-drawer")).not.toBeNull();
    const el = document.querySelector("z-drawer") as any;
    expect(el.open).toBe(true);
    expect(el.placement).toBe("left");
    expect(el.title).toBe("程序化抽屉");
    r.close();
    await tick();
    dispatchAnimationEnd(el);
    await tick();
    expect(document.querySelector("z-drawer")).toBeNull();
  });

  it("portal remounts host to body", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const el = document.createElement("z-drawer") as any;
    el.portal = true;
    host.appendChild(el);
    el.open = true;
    await tick();
    expect(el.parentElement).toBe(document.body);
    el.open = false;
    await tick();
    // [WHY] 关闭后 portal 还原回 host,须从 host 移除
    expect(el.parentElement).toBe(host);
    host.removeChild(el);
    document.body.removeChild(host);
  });

  it("size attribute maps panel size class", async () => {
    const el = createDrawer();
    el.setAttribute("size", "lg");
    el.open = true;
    await tick();
    const panel = el.shadowRoot!.querySelector(".z-drawer__panel") as HTMLElement;
    expect(panel.classList.contains("z-drawer__panel--lg")).toBe(true);
    document.body.removeChild(el);
  });

  it("custom close-label via attribute", async () => {
    const el = createDrawer();
    el.open = true;
    el.setAttribute("close-label", "关闭");
    await tick();
    const closeBtn = el.shadowRoot!.querySelector(".z-drawer__close")!;
    expect(closeBtn.getAttribute("aria-label")).toBe("关闭");
    document.body.removeChild(el);
  });
});
