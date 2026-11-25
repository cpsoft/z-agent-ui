// Test: z-modal component
// Related: [[REQ-001]] (i18n 文案可配置), [[REQ-011-modal-framework]] (框架组件升级)
// Wiki: wiki/requirements/REQ-001-core-requirements.md, wiki/requirements/REQ-011-modal-framework.md
// Date: 2026-07-16 (基础), 2026-08-11 (框架升级)

import { describe, it, expect, vi } from "vitest";
import "../../../src/components/modal/Modal";
import { ZModal } from "../../../src/components/modal/Modal";

const tick = () => new Promise((r) => setTimeout(r, 0));

// happy-dom 不运行 CSS 动画: 手动派发 animationend 推进退场动画状态机
function dispatchAnimationEnd(el: any): void {
  const panel = el.shadowRoot!.querySelector(".z-modal__panel");
  panel?.dispatchEvent(new Event("animationend"));
}

describe("z-modal", () => {
  function createModal(): HTMLElement & { open: boolean; closeOnOverlay: boolean; closeOnEscape: boolean; size: string; show(): void; close(): void; toggle(): void } {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    return el;
  }

  it("is hidden by default", async () => {
    const el = createModal();
    await new Promise((r) => setTimeout(r, 0));
    const hidden = el.shadowRoot!.querySelector('[part="hidden"]');
    expect(hidden).toBeDefined();
    document.body.removeChild(el);
  });

  it("renders overlay and panel when open", async () => {
    const el = createModal();
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-modal__overlay")).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-modal__panel")).toBeDefined();
    document.body.removeChild(el);
  });

  it("show() sets open to true", async () => {
    const el = createModal();
    el.show();
    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("close() sets open to false", async () => {
    const el = createModal();
    el.open = true;
    el.close();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("toggle() toggles open state", async () => {
    const el = createModal();
    el.toggle();
    expect(el.open).toBe(true);
    el.toggle();
    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("emits z-open when opened", async () => {
    const el = createModal();
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-open", handler);
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("emits z-close when closed", async () => {
    const el = createModal();
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));

    const handler = vi.fn();
    el.addEventListener("z-close", handler);
    el.open = false;
    await new Promise((r) => setTimeout(r, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    document.body.removeChild(el);
  });

  it("close button triggers close", async () => {
    const el = createModal();
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));

    const closeBtn = el.shadowRoot!.querySelector(".z-modal__close") as HTMLElement;
    closeBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("respects custom close-label via attribute", async () => {
    const el = createModal();
    el.open = true;
    el.setAttribute("closelabel", "关闭");
    await new Promise((r) => setTimeout(r, 0));

    const closeBtn = el.shadowRoot!.querySelector(".z-modal__close")!;
    expect(closeBtn.getAttribute("aria-label")).toBe("关闭");
    document.body.removeChild(el);
  });

  it("closes on overlay click when closeOnOverlay is true", async () => {
    const el = createModal();
    el.open = true;
    el.closeOnOverlay = true;
    await new Promise((r) => setTimeout(r, 0));

    const overlay = el.shadowRoot!.querySelector(".z-modal__overlay") as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("does not close on overlay click when closeOnOverlay is false", async () => {
    const el = createModal();
    el.open = true;
    el.closeOnOverlay = false;
    await new Promise((r) => setTimeout(r, 0));

    const overlay = el.shadowRoot!.querySelector(".z-modal__overlay") as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("closeOnEscape: close on Escape key", async () => {
    const el = createModal();
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await new Promise((r) => setTimeout(r, 0));

    expect(el.open).toBe(false);
    document.body.removeChild(el);
  });

  it("renders size class", async () => {
    const el = createModal();
    el.size = "lg";
    el.open = true;
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-modal__panel")).toBeDefined();
    document.body.removeChild(el);
  });
});

// ── 框架升级: title / portal / 堆叠 / 关闭动画 / beforeClose / 编程式 API ──
// See: wiki/requirements/REQ-011-modal-framework.md

describe("z-modal framework: title", () => {
  it("renders title h2 and aria-labelledby pointing at its id", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    el.title = "Confirm";
    await tick();

    const h2 = el.shadowRoot!.querySelector(".z-modal__title")!;
    expect(h2.textContent).toBe("Confirm");
    expect(h2.id).toBeTruthy();
    const panel = el.shadowRoot!.querySelector(".z-modal__panel")!;
    expect(panel.getAttribute("aria-labelledby")).toBe(h2.id);
    document.body.removeChild(el);
  });

  it("no title → no h2 and no aria-labelledby residue", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    expect(el.shadowRoot!.querySelector(".z-modal__title")).toBeNull();
    const panel = el.shadowRoot!.querySelector(".z-modal__panel")!;
    expect(panel.hasAttribute("aria-labelledby")).toBe(false);
    document.body.removeChild(el);
  });

  it("escapes title HTML", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    el.title = "<b>&</b>";
    await tick();

    const h2 = el.shadowRoot!.querySelector(".z-modal__title")!;
    expect(h2.querySelector("b")).toBeNull();
    expect(h2.textContent).toBe("<b>&</b>");
    document.body.removeChild(el);
  });

  it("createElement smoke: title! declaration does not break construction", () => {
    // [[bug-20260810-title-ctor-attr]]: 反射属性字段初始化器会让 createElement 抛错
    const el = document.createElement("z-modal") as any;
    expect(el.title).toBe("");
    expect(el.shadowRoot).toBeDefined();
  });
});

describe("z-modal framework: portal", () => {
  it("re-parents host to body on open and restores on close", async () => {
    const wrapper = document.createElement("div");
    wrapper.style.display = "none";
    document.body.appendChild(wrapper);
    const el = document.createElement("z-modal") as any;
    wrapper.appendChild(el);
    el.portal = true;

    el.open = true;
    await tick();
    expect(el.parentElement).toBe(document.body);
    expect(wrapper.children.length).toBe(0);

    el.close();
    await tick();
    expect(el.parentElement).toBe(wrapper);
    dispatchAnimationEnd(el);
    await tick();
    expect(el.shadowRoot!.querySelector('[part="hidden"]')).toBeDefined();

    document.body.removeChild(wrapper);
  });

  it("portal=false (default) keeps original position", async () => {
    const wrapper = document.createElement("div");
    document.body.appendChild(wrapper);
    const el = document.createElement("z-modal") as any;
    wrapper.appendChild(el);

    el.open = true;
    await tick();
    expect(el.parentElement).toBe(wrapper);

    el.close();
    await tick();
    dispatchAnimationEnd(el);
    document.body.removeChild(wrapper);
  });
});

describe("z-modal framework: stacking", () => {
  it("assigns increasing stack-index, locks scroll until all closed", async () => {
    const m1 = document.createElement("z-modal") as any;
    const m2 = document.createElement("z-modal") as any;
    document.body.appendChild(m1);
    document.body.appendChild(m2);

    m1.open = true;
    await tick();
    m2.open = true;
    await tick();

    expect(m1.style.getPropertyValue("--z-modal-stack-index")).toBe("0");
    expect(m2.style.getPropertyValue("--z-modal-stack-index")).toBe("1");
    expect(document.body.style.overflow).toBe("hidden");

    m1.close();
    m2.close();
    await tick(); // 解锁发生在 requestUpdate 微任务,先等渲染
    expect(document.body.style.overflow).toBe("");

    dispatchAnimationEnd(m1);
    dispatchAnimationEnd(m2);
    document.body.removeChild(m1);
    document.body.removeChild(m2);
  });

  it("Escape only closes the top modal", async () => {
    const m1 = document.createElement("z-modal") as any;
    const m2 = document.createElement("z-modal") as any;
    document.body.appendChild(m1);
    document.body.appendChild(m2);

    m1.open = true;
    await tick();
    m2.open = true;
    await tick();

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    expect(m2.open).toBe(false);
    expect(m1.open).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await tick();
    expect(m1.open).toBe(false);

    dispatchAnimationEnd(m1);
    dispatchAnimationEnd(m2);
    document.body.removeChild(m1);
    document.body.removeChild(m2);
  });
});

describe("z-modal framework: exit animation", () => {
  it("close() flips open synchronously but overlay stays until animationend", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.close();
    expect(el.open).toBe(false);
    await tick();

    expect(el.shadowRoot!.querySelector(".z-modal__overlay--closing")).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-modal__panel--closing")).toBeDefined();

    dispatchAnimationEnd(el);
    await tick();
    expect(el.shadowRoot!.querySelector('[part="hidden"]')).toBeDefined();
    expect(el.shadowRoot!.querySelector(".z-modal__overlay")).toBeNull();
    document.body.removeChild(el);
  });

  it("reopening mid-closing cancels the exit animation", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.close();
    await tick();
    expect(el.shadowRoot!.querySelector(".z-modal__overlay--closing")).toBeDefined();

    el.open = true;
    await tick();
    expect(el.shadowRoot!.querySelector(".z-modal__overlay--closing")).toBeNull();
    expect(el.shadowRoot!.querySelector(".z-modal__overlay")).toBeDefined();

    document.body.removeChild(el);
  });

  it("clicks during closing are inert", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.close();
    await tick();
    const overlay = el.shadowRoot!.querySelector(".z-modal__overlay") as HTMLElement;
    overlay.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await tick();
    expect(el.open).toBe(false);

    dispatchAnimationEnd(el);
    document.body.removeChild(el);
  });
});

describe("z-modal framework: beforeClose", () => {
  it("returning false cancels close", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.beforeClose = () => false;
    el.close();
    expect(el.open).toBe(true);
    document.body.removeChild(el);
  });

  it("returning true allows close", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.beforeClose = () => true;
    el.close();
    expect(el.open).toBe(false);
    await tick();
    dispatchAnimationEnd(el);
    document.body.removeChild(el);
  });

  it("async beforeClose resolves later; false keeps open", async () => {
    const el = document.createElement("z-modal") as any;
    document.body.appendChild(el);
    el.open = true;
    await tick();

    el.beforeClose = () => Promise.resolve(true);
    el.close();
    expect(el.open).toBe(true); // 同步未关闭
    await tick();
    expect(el.open).toBe(false);

    // 重新打开验证 async false 路径
    el.open = true;
    await tick();
    el.beforeClose = () => Promise.resolve(false);
    el.close();
    await tick();
    expect(el.open).toBe(true);

    document.body.removeChild(el);
  });
});

describe("z-modal framework: programmatic API", () => {
  it("ZModal.open() appends to body, renders options, removes after close", async () => {
    const { close, element } = ZModal.open({ title: "Hello", message: "World" });
    expect(element.parentElement).toBe(document.body);
    expect(element.open).toBe(true);
    await tick();

    expect(element.shadowRoot!.querySelector(".z-modal__title")!.textContent).toBe("Hello");
    expect(element.textContent).toContain("World");

    close();
    await tick();
    dispatchAnimationEnd(element);
    await tick();
    expect(element.isConnected).toBe(false);
  });

  it("ZModal.open() escapes string message", async () => {
    const { element } = ZModal.open({ message: "<script>alert(1)</script>" });
    await tick();
    expect(element.querySelector("script")).toBeNull();
    element.close();
    await tick();
    dispatchAnimationEnd(element);
  });

  it("ZModal.confirm() resolves true on OK and removes element", async () => {
    const p = ZModal.confirm({ title: "Sure?", message: "Delete?" });
    await tick();
    const el = document.querySelector("z-modal") as any;
    expect(el).toBeTruthy();

    (el.querySelector(".z-modal__btn--primary") as HTMLElement).click();
    await tick();
    dispatchAnimationEnd(el);
    const result = await p;
    expect(result).toBe(true);
    expect(el.isConnected).toBe(false);
  });

  it("ZModal.confirm() resolves false on Cancel", async () => {
    const p = ZModal.confirm({ message: "Delete?" });
    await tick();
    const el = document.querySelector("z-modal") as any;

    (el.querySelector(".z-modal__btn:not(.z-modal__btn--primary)") as HTMLElement).click();
    await tick();
    dispatchAnimationEnd(el);
    expect(await p).toBe(false);
  });

  it("ZModal.confirm() resolves false on overlay click", async () => {
    const p = ZModal.confirm({ message: "Delete?" });
    await tick();
    const el = document.querySelector("z-modal") as any;

    (el.shadowRoot!.querySelector(".z-modal__overlay") as HTMLElement).dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );
    await tick();
    dispatchAnimationEnd(el);
    expect(await p).toBe(false);
  });

  it("ZModal.confirm() stays pending while beforeClose vetoes; resolves user intent after force close", async () => {
    const p = ZModal.confirm({ message: "Delete?", beforeClose: () => false });
    await tick();
    const el = document.querySelector("z-modal") as any;
    expect(el.open).toBe(true);

    let settled = false;
    p.then(() => { settled = true; });
    (el.querySelector(".z-modal__btn--primary") as HTMLElement).click();
    await tick();
    // veto: 未关闭、promise 保持 pending
    expect(settled).toBe(false);
    expect(el.open).toBe(true);

    el.beforeClose = undefined;
    el.close();
    await tick();
    dispatchAnimationEnd(el);
    // 用户已点 OK（即便曾被 veto 拦截）,按用户意图结算
    expect(await p).toBe(true);
  });

  it("ZModal.alert() resolves after OK", async () => {
    const p = ZModal.alert({ message: "Done", okText: "知道了" });
    await tick();
    const el = document.querySelector("z-modal") as any;

    (el.querySelector(".z-modal__btn--primary") as HTMLElement).click();
    await tick();
    dispatchAnimationEnd(el);
    await p;
    expect(el.isConnected).toBe(false);
  });
});
