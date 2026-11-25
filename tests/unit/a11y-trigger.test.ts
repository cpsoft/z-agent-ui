// Test: 浮层触发器语义的落点（core/a11y 的 bindTriggerAria / focusableOf / isEditableElement）
//
// [WHY 单独一份] 这三条是"语义该落在哪一层"的通用判断，被六七个组件共用。
// 组件级测试只能证明"某个组件的某个按钮上有属性"，证明不了机制本身
// （比如"槽内容换了之后旧元素上的属性有没有被清掉"）。
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  TRIGGER_MARK,
  bindTriggerAria,
  focusableOf,
  isEditableElement,
} from "../../src/core/a11y";

/** 造一个和真实组件同形的宿主：shadow 里一个 `<span part="trigger">` 包着具名槽。 */
function makeHost(lightHtml: string): {
  host: HTMLElement;
  root: ShadowRoot;
  wrap: HTMLElement;
} {
  const host = document.createElement("div");
  host.innerHTML = lightHtml;
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<span class="wrap" part="trigger"><slot name="trigger"></slot></span>`;
  return { host, root, wrap: root.querySelector(".wrap") as HTMLElement };
}

describe("focusableOf", () => {
  it("T1 原生按钮自己就是可聚焦件", () => {
    const btn = document.createElement("button");
    expect(focusableOf(btn)).toBe(btn);
  });

  it("T2 壳元素进 shadow 里找：<z-*> 宿主不可聚焦，内部 button 才是", () => {
    const shell = document.createElement("x-shell");
    const root = shell.attachShadow({ mode: "open" });
    root.innerHTML = `<span><button part="button">确认</button></span>`;
    expect(focusableOf(shell)?.tagName).toBe("BUTTON");
  });

  it("T3 tabindex=-1 不算可聚焦（它不在 Tab 序里）", () => {
    // [WHY 单列一条] 这正是本轮修的那个坑的家门口：`tabindex="-1"` 的宿主
    // 会让整棵子树从 Tab 序消失，所以它绝不能当成"可聚焦的触发器"。
    const el = document.createElement("div");
    el.setAttribute("tabindex", "-1");
    expect(focusableOf(el)).toBeNull();
  });

  it("T4 纯文本容器没有可聚焦件", () => {
    const span = document.createElement("span");
    span.textContent = "Pick a date";
    expect(focusableOf(span)).toBeNull();
  });
});

describe("isEditableElement", () => {
  it("U1 普通 input / textarea 是可编辑的", () => {
    expect(isEditableElement(document.createElement("input"))).toBe(true);
    expect(isEditableElement(document.createElement("textarea"))).toBe(true);
  });

  it("U2 readonly / disabled 的输入框不消费编辑键", () => {
    const ro = document.createElement("input");
    ro.readOnly = true;
    const dis = document.createElement("input");
    dis.disabled = true;
    expect(isEditableElement(ro)).toBe(false);
    expect(isEditableElement(dis)).toBe(false);
  });

  it("U3 contenteditable 三种写法都算", () => {
    const a = document.createElement("div");
    a.setAttribute("contenteditable", "");
    const b = document.createElement("div");
    b.setAttribute("contenteditable", "true");
    const c = document.createElement("div");
    c.setAttribute("contenteditable", "plaintext-only");
    expect([a, b, c].map(isEditableElement)).toEqual([true, true, true]);
  });

  it("U4 null 与普通元素都不是", () => {
    expect(isEditableElement(null)).toBe(false);
    expect(isEditableElement(document.createElement("button"))).toBe(false);
  });
});

describe("bindTriggerAria", () => {
  let host: HTMLElement | null = null;

  afterEach(() => {
    host?.remove();
    host = null;
  });

  function bind(h: { root: ShadowRoot }, state: { expanded: boolean; disabled?: boolean }) {
    return bindTriggerAria(
      () => h.root.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      () => ({ hasPopup: "dialog" as const, ...state }),
    );
  }

  it("T5 属性写在槽里那个 button 上，容器上一个都不留", () => {
    const h = makeHost(`<button slot="trigger">打开</button>`);
    host = h.host;
    const binder = bind(h, { expanded: false });
    binder.sync();

    const button = h.host.querySelector("button")!;
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    // 容器上不留 —— 写了也不生效，留着只会让下一个人以为这里已经管了语义
    expect(h.wrap.hasAttribute("aria-haspopup")).toBe(false);
    expect(h.wrap.hasAttribute("aria-expanded")).toBe(false);
  });

  it("T6 槽里放的是自带影子树的壳时，继续往里面找（z-button 那种）", () => {
    const h = makeHost(`<x-shell slot="trigger">打开</x-shell>`);
    host = h.host;
    const shell = h.host.querySelector("x-shell") as HTMLElement;
    shell.attachShadow({ mode: "open" }).innerHTML = `<button part="button">打开</button>`;

    bind(h, { expanded: false }).sync();

    const inner = shell.shadowRoot!.querySelector("button")!;
    expect(inner.getAttribute("aria-haspopup")).toBe("dialog");
    expect(shell.hasAttribute("aria-expanded"), "宿主不可聚焦，写在这里无效").toBe(false);
  });

  it("T7 槽里没有可聚焦件时退回容器（信息不丢，但不假装它生效）", () => {
    const h = makeHost(`<span slot="trigger">只有文字</span>`);
    host = h.host;
    bind(h, { expanded: false }).sync();
    expect(h.wrap.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("T8 expanded 跟着状态走", () => {
    const h = makeHost(`<button slot="trigger">打开</button>`);
    host = h.host;
    let expanded = false;
    const binder = bindTriggerAria(
      () => h.root.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      () => ({ hasPopup: "dialog", expanded }),
    );
    const button = h.host.querySelector("button")!;

    binder.sync();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expanded = true;
    binder.sync();
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("T9 ★ 槽内容换人时，旧元素上的属性必须被清掉", () => {
    // [WHY 这条最容易漏] 换触发器时若只写新的、不清旧的，旧按钮会一直声称
    // 「我有一个对话框，当前已展开」—— 而它已经和这个组件没关系了。
    // 同一个按钮被挪到别处复用（列表重渲染）时，症状是"另一个按钮莫名带着展开态"。
    const h = makeHost(`<button slot="trigger">旧</button>`);
    host = h.host;
    const binder = bind(h, { expanded: false });
    binder.sync();
    const oldBtn = h.host.querySelector("button")!;
    expect(oldBtn.getAttribute("aria-haspopup")).toBe("dialog");

    h.host.innerHTML = `<button slot="trigger">新</button>`;
    binder.sync();

    const newBtn = h.host.querySelector("button")!;
    expect(newBtn.getAttribute("aria-haspopup")).toBe("dialog");
    expect(oldBtn.hasAttribute("aria-haspopup"), "旧触发器上的语义没清干净").toBe(false);
    expect(oldBtn.hasAttribute("aria-expanded")).toBe(false);
  });

  it("T10 只清自己写的那份：作者本来写在触发器上的属性不动", () => {
    // 判据是 TRIGGER_MARK。宿主自己的 aria-haspopup="menu"（比如它自己做菜单项）
    // 不该被这个组件在 dispose 时抹掉。
    const h = makeHost(`<button slot="trigger" aria-haspopup="menu">打开</button>`);
    host = h.host;
    const button = h.host.querySelector("button")!;
    const binder = bind(h, { expanded: false });
    binder.sync();
    expect(button.getAttribute("aria-haspopup"), "组件拥有这个语义，覆盖").toBe("dialog");
    expect(button.hasAttribute(TRIGGER_MARK)).toBe(true);
  });

  it("T11 dispose 摘掉自己写的属性", () => {
    const h = makeHost(`<button slot="trigger">打开</button>`);
    host = h.host;
    const binder = bind(h, { expanded: true });
    binder.sync();
    const button = h.host.querySelector("button")!;
    expect(button.getAttribute("aria-expanded")).toBe("true");

    binder.dispose();
    expect(button.hasAttribute("aria-haspopup")).toBe(false);
    expect(button.hasAttribute("aria-expanded")).toBe(false);
    expect(button.hasAttribute(TRIGGER_MARK)).toBe(false);
  });

  it("T12 disabled=true 写 aria-disabled；回到 false 时清掉", () => {
    const h = makeHost(`<button slot="trigger">打开</button>`);
    host = h.host;
    let disabled = true;
    const binder = bindTriggerAria(
      () => h.root.querySelector<HTMLSlotElement>('slot[name="trigger"]'),
      () => ({ hasPopup: "dialog", expanded: false, disabled }),
    );
    const button = h.host.querySelector("button")!;

    binder.sync();
    expect(button.getAttribute("aria-disabled")).toBe("true");
    disabled = false;
    binder.sync();
    // [WHY 不写 "false"] 触发器自己可能靠原生 disabled 表达；再补一个
    // aria-disabled="false" 会与原生状态打架。
    expect(button.hasAttribute("aria-disabled")).toBe(false);
  });

  it("T13 不带 disabled 字段时完全不碰 aria-disabled", () => {
    const h = makeHost(`<button slot="trigger" aria-disabled="true">打开</button>`);
    host = h.host;
    bind(h, { expanded: false }).sync();
    const button = h.host.querySelector("button")!;
    expect(button.getAttribute("aria-disabled"), "作者写的禁用态被组件吃掉了").toBe("true");
  });
});
