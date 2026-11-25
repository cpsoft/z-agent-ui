// Test: Core @property decorator
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import { property, applyPropertyMeta } from "../../../src/core/decorators";

let counter = 0;
function register<T extends CustomElementConstructor>(ctor: T, name?: string): string {
  const tag = name ?? `test-el-${++counter}`;
  try { customElements.define(tag, ctor); } catch { /* already defined */ }
  return tag;
}

describe("@property decorator", () => {
  it("stores metadata on prototype", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      label = "";
    }
    register(TestEl);
    const proto = TestEl.prototype as any;
    expect(proto.__zui_protoPropertyMeta).toBeDefined();
    expect(proto.__zui_protoPropertyMeta.length).toBe(1);
    expect(proto.__zui_protoPropertyMeta[0].key).toBe("label");
    expect(proto.__zui_protoPropertyMeta[0].type).toBe(String);
  });

  it("defaults type to String when no options given", () => {
    class TestEl extends HTMLElement {
      @property()
      name = "";
    }
    register(TestEl);
    const meta = (TestEl.prototype as any).__zui_protoPropertyMeta[0];
    expect(meta.type).toBe(String);
  });

  it("auto-generates attribute name from property key", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      camelCase = "";
    }
    register(TestEl);
    const meta = (TestEl.prototype as any).__zui_protoPropertyMeta[0];
    // [2026-10-25] 规范名改为 kebab-case（原 "camelcase"）。理由：HTML/Vue 里写
    // `camel-case="x"` 是自然写法，扁平名会让这类多词静态属性**静默失效**
    // （[[bug-20260902-ce-kebab-attr-miss]]）。扁平名作为兼容别名继续被观察，见下一条。
    expect(meta.attribute).toBe("camel-case");
  });

  it("扁平名仍作为兼容别名被观察（既有模板不静默失效）", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      camelCase = "";
    }
    register(TestEl);
    const observed = TestEl.observedAttributes;
    expect(observed).toContain("camel-case");
    expect(observed).toContain("camelcase");
  });

  it("显式 attribute 不产生别名（作者选的名字就是唯一名字）", () => {
    class TestEl extends HTMLElement {
      @property({ type: String, attribute: "custom" })
      camelCase = "";
    }
    register(TestEl);
    expect(TestEl.observedAttributes).toEqual(["custom"]);
  });

  it("respects explicit attribute name", () => {
    class TestEl extends HTMLElement {
      @property({ type: String, attribute: "custom-attr" })
      myProp = "";
    }
    register(TestEl);
    const meta = (TestEl.prototype as any).__zui_protoPropertyMeta[0];
    expect(meta.attribute).toBe("custom-attr");
  });

  it("attribute: false prevents HTML attribute binding", () => {
    class TestEl extends HTMLElement {
      @property({ type: Array, attribute: false })
      items: string[] = [];
    }
    register(TestEl);
    const meta = (TestEl.prototype as any).__zui_protoPropertyMeta[0];
    expect(meta.attribute).toBe(false);
  });

  it("reflect defaults to true", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      val = "";
    }
    register(TestEl);
    const meta = (TestEl.prototype as any).__zui_protoPropertyMeta[0];
    expect(meta.reflect).toBe(true);
  });
});

describe("applyPropertyMeta", () => {
  function makeEl<T extends CustomElementConstructor>(ctor: T, tag?: string): HTMLElement {
    const t = register(ctor, tag);
    return document.createElement(t);
  }

  it("defines getter/setter on instance for string property", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      label = "default";
    }
    const el = makeEl(TestEl);
    applyPropertyMeta(el, TestEl as Function);

    expect((el as any).label).toBe("default");
    (el as any).label = "new";
    expect((el as any).label).toBe("new");
  });

  it("reflects string value to attribute", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      label = "";
    }
    const el = makeEl(TestEl);
    applyPropertyMeta(el, TestEl as Function);

    (el as any).label = "hello";
    expect(el.getAttribute("label")).toBe("hello");
    (el as any).label = "world";
    expect(el.getAttribute("label")).toBe("world");
  });

  it("converts boolean attribute from presence", () => {
    class TestEl extends HTMLElement {
      @property({ type: Boolean })
      disabled = false;
    }
    const el = makeEl(TestEl);
    el.setAttribute("disabled", "");
    applyPropertyMeta(el, TestEl as Function);

    expect((el as any).disabled).toBe(true);
  });

  it("converts number attribute", () => {
    class TestEl extends HTMLElement {
      @property({ type: Number })
      count = 0;
    }
    const el = makeEl(TestEl);
    el.setAttribute("count", "42");
    applyPropertyMeta(el, TestEl as Function);

    expect((el as any).count).toBe(42);
  });

  it("HTML attribute takes priority over class field default", () => {
    class TestEl extends HTMLElement {
      @property({ type: String })
      name = "default";
    }
    const el = makeEl(TestEl);
    el.setAttribute("name", "attr-value");
    applyPropertyMeta(el, TestEl as Function);

    expect((el as any).name).toBe("attr-value");
  });

  it("removes attribute for falsy boolean", () => {
    class TestEl extends HTMLElement {
      @property({ type: Boolean })
      active = false;
    }
    const el = makeEl(TestEl);
    applyPropertyMeta(el, TestEl as Function);

    (el as any).active = true;
    expect(el.hasAttribute("active")).toBe(true);

    (el as any).active = false;
    expect(el.hasAttribute("active")).toBe(false);
  });

  it("does not reflect when reflect: false", () => {
    class TestEl extends HTMLElement {
      @property({ type: String, reflect: false })
      secret = "";
    }
    const el = makeEl(TestEl);
    applyPropertyMeta(el, TestEl as Function);
    (el as any).secret = "hidden";
    expect(el.hasAttribute("secret")).toBe(false);
  });

  it("ignores attribute when attribute: false", () => {
    class TestEl extends HTMLElement {
      @property({ type: Array, attribute: false })
      data: string[] = [];
    }
    const el = makeEl(TestEl);
    applyPropertyMeta(el, TestEl as Function);
    expect(el.hasAttribute("data")).toBe(false);
  });
});
