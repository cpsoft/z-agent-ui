// Test: m-swipe-cell —— 左滑行的手势状态机、互斥展开、可拦截关闭、键盘等价路径
// Date: 2026-11-16
//
// [背景] 这个组件把「三个约束」做进了实现：阈值吸附、同时只展开一行、关闭前可拦截。
// 三者都属**界面看起来正常但行为不对**的类型：
//   · 吸附阈值错了 —— 松手后停在半开位置，内容与按钮各露出一半，像是渲染坏了
//   · 互斥失效 —— 两行同时露出「删除」，点错就是删错行
//   · 拦截失效 —— 宿主在 `z-before-close` 里弹确认框，行却已经收回去了，
//     用户点「确定」时按钮已经不见了
//
// [WHY 手势本身不在这里验] happy-dom 没有 Touch/TouchEvent 的完整实现，构造出的
// touch 序列与真机行为差得远（没有原生滚动、没有 passive 语义）。这里的 `_onTouchMove`
// 即使跑通也只证明「函数被调到了」。手指到位的验证放在
// `smoke/smoke-swipe-w23.mjs`（真 Chrome + CDP Input.dispatchTouchEvent）。
// 单测负责**状态机**：位移阈值怎么判定、展开态与 ARIA/焦点怎么同步、谁来关谁。
import { describe, it, expect, afterEach, beforeAll } from "vitest";
import "../../../src/components/m-swipe-cell/MSwipeCell";

const flush = (times = 2): Promise<void> => {
  let p = Promise.resolve();
  for (let i = 0; i < times; i++) p = p.then(() => new Promise<void>((r) => setTimeout(r, 0)));
  return p;
};

interface El extends HTMLElement {
  open: boolean;
  disabled: boolean;
  threshold: number;
  show(focus?: boolean): void;
  close(): boolean;
}

/** 挂一行：内容 + 一个操作按钮。`props` 里可覆盖宿主属性。 */
function mount(props: Record<string, unknown> = {}, actions = 1): El {
  const el = document.createElement("m-swipe-cell") as El;
  Object.assign(el, props);

  const content = document.createElement("div");
  content.className = "row-content";
  content.textContent = "望江店 · 营业中";
  el.appendChild(content);

  for (let i = 0; i < actions; i++) {
    const b = document.createElement("button");
    b.setAttribute("slot", "actions");
    b.textContent = i === 0 ? "删除" : "置顶";
    el.appendChild(b);
  }
  document.body.appendChild(el);
  return el;
}

const contentOf = (el: El): HTMLElement => el.shadowRoot!.querySelector(".z-m-swipe__content")!;
const actionsOf = (el: El): HTMLElement => el.shadowRoot!.querySelector(".z-m-swipe__actions")!;

/**
 * 给 `offsetWidth` 打桩：操作区宽度 = 100。
 *
 * [WHY 必须打桩] happy-dom 不做布局，所有元素 `offsetWidth` 恒为 0；而这个组件的吸附阈值、
 * 位移量都按操作区宽度算 —— 宽度为 0 时整条路径退化成「什么都不会发生」，
 * 测试会全绿但什么都没验到。
 *
 * [WHY 打在 prototype 上而不是某个节点上] 本基类每次属性变化都 `shadow.innerHTML` 重建，
 * 操作区是新节点；打在实例上的桩在第一次 `open` 变化之后就不再生效 —— 而那时正是
 * 要断言的时候（上一版就是这么写的，S7 因此假红）。
 */
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList?.contains("z-m-swipe__actions") ? 100 : 0;
    },
  });
});

/** 读回内容层当前的位移（px）。 */
function currentX(el: El): number {
  const m = /translate3d\((-?[\d.]+)px/.exec(contentOf(el).style.transform);
  return m ? Number(m[1]) : 0;
}

function collect(el: HTMLElement, name: string): any[] {
  const out: any[] = [];
  el.addEventListener(name, (e) => out.push((e as CustomEvent).detail));
  return out;
}

describe("m-swipe-cell", () => {
  const hosts: El[] = [];
  const track = (el: El): El => (hosts.push(el), el);

  afterEach(() => {
    hosts.splice(0).forEach((h) => h.remove());
  });

  it("S1 没有 actions 时内容区不进 Tab 序列；有 actions 才可聚焦", async () => {
    const bare = track(mount({}, 0));
    const withActions = track(mount());
    await flush();

    expect(contentOf(bare).hasAttribute("tabindex"), "无操作区的行不该多一个键盘停靠点").toBe(false);
    expect(contentOf(withActions).getAttribute("tabindex")).toBe("0");
  });

  it("S2 disabled 时不给键盘路径，键盘也不展开", async () => {
    const el = track(mount({ disabled: true }));
    await flush();
    expect(contentOf(el).hasAttribute("tabindex")).toBe(false);

    contentOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();
    expect(el.open, "disabled 的行被 Enter 展开了").toBe(false);
  });

  it("S3 Enter 展开：open 反射成属性、发 z-swipe-open、焦点进入第一个操作按钮", async () => {
    const el = track(mount());
    await flush();
    const opened = collect(el, "z-swipe-open");

    contentOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await flush();

    expect(el.open).toBe(true);
    expect(el.hasAttribute("open"), "open 要反射成属性（宿主 CSS 靠 :host([open])）").toBe(true);
    expect(opened.length, "z-swipe-open 应发一次").toBe(1);
    // 展开 = 内容层让开整个操作区宽度，不是「让开一半」
    await flush();
    expect(currentX(el), "展开后内容层应整体平移一个操作区宽度").toBe(-100);
    // [WHY 这条是键盘路径的核心] 只展开不送焦点 = 键盘用户看得见按钮却摸不到
    expect(document.activeElement?.textContent).toBe("删除");
  });

  it("S4 Escape 收起并回焦内容区；ArrowRight 同样收起", async () => {
    const el = track(mount());
    await flush();

    el.show();
    await flush();
    expect(el.open).toBe(true);

    contentOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
    // [WHY 断 shadowRoot.activeElement] 内容层在影子树里，document.activeElement 对
    // shadow 内的焦点只会返回**宿主**（z-m-swipe-cell）—— 只断 document 那一层，
    // 「焦点回到宿主」和「焦点回到内容层」分不出来。
    expect(el.shadowRoot!.activeElement, "收起后焦点应回到内容区").toBe(contentOf(el));

    el.show();
    await flush();
    contentOf(el).dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flush();
    expect(el.open).toBe(false);
  });

  it("S5 同时只展开一行：打开 B 会收起 A", async () => {
    const a = track(mount());
    const b = track(mount());
    await flush();

    a.show();
    await flush();
    expect(a.open).toBe(true);

    b.show();
    await flush();
    expect(b.open).toBe(true);
    expect(a.open, "两行同时露出操作按钮 —— 用户会点错删除").toBe(false);
  });

  it("S6 z-before-close 可拦截：宿主不拦才真的收起，拦下就停在展开态", async () => {
    const el = track(mount());
    await flush();
    el.show();
    await flush();

    let veto = true;
    el.addEventListener("z-before-close", (e) => {
      if (veto) e.preventDefault();
    });

    expect(el.close(), "被拦截时 close() 应返回 false").toBe(false);
    expect(el.open, "宿主拦下了，行却已经收起 —— 确认框里的按钮就点不到了").toBe(true);

    veto = false;
    expect(el.close(), "不拦时应真的收起").toBe(true);
    expect(el.open).toBe(false);
  });

  it("S7 收起时操作区 inert（读屏不该念出视觉上不存在的按钮），展开时解除", async () => {
    const el = track(mount());
    await flush();

    // 首次渲染就是收起态
    expect(actionsOf(el).hasAttribute("inert"), "收起时操作区必须 inert").toBe(true);

    el.show();
    await flush();
    expect(actionsOf(el).hasAttribute("inert"), "展开后操作区要可读可点").toBe(false);

    el.close();
    await flush();
    expect(actionsOf(el).hasAttribute("inert")).toBe(true);
    expect(currentX(el), "收起后内容层要回到原位（否则露出半截按钮）").toBe(0);
  });

  it("S8 展开时点内容区会收起，且不把这次点击放给行内组件", async () => {
    const el = track(mount());
    await flush();
    el.show();
    await flush();

    let rowClicked = 0;
    el.querySelector(".row-content")!.addEventListener("click", () => (rowClicked += 1));

    contentOf(el).click();
    await flush();

    expect(el.open, "展开了还让点击穿透，用户点一下不知道发生了什么").toBe(false);
    expect(rowClicked, "收起的那一下不该同时触发行本身的点击").toBe(0);
  });

  it("S9 展开时点操作区里的按钮不收起（那是用户要按的）", async () => {
    const el = track(mount());
    await flush();
    el.show();
    await flush();

    el.querySelector<HTMLElement>('[slot="actions"]')!.click();
    await flush();
    expect(el.open, "点删除按钮的行内点击不该先把自己收起来").toBe(true);
  });
});
