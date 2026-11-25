// Test: DialogStateController（Modal / Drawer 共用状态机）
//
// [为什么补这份] 这个控制器把 Modal 与 Drawer 的 80 行状态机合成一份，注释里列了四条
// 「踩过的坑」（快照顺序、已断开跳过副作用、disconnect 不重置、animationend 校验 target）。
// 但此前**零直接单测**：Modal / Drawer 的用例只验证了组件自己的渲染，四条契约一条也没锁。
// 这四条都属于「错了不报错」的类型 —— 二次入栈的症状是多锁一层滚动、二次 emit 的症状是
// 监听方收到两次关闭，都不会让任何断言变红。
//
// 这里用一个**未注册的自定义元素**当宿主：控制器只依赖 DialogHost 接口，不需要
// customElements.define（也就不需要为每条用例编 tag 名）。

import { afterEach, describe, expect, it } from "vitest";
import {
  DialogStateController,
  type DialogHost,
  type DialogStateOptions,
} from "../../../src/primitives/overlay/dialogState";

const OPTS: DialogStateOptions = {
  overlaySelector: ".overlay",
  panelSelector: ".panel",
  stackIndexVar: "--z-test-stack",
};

class FakeDialog extends HTMLElement {
  open = false;
  closeOnEscape = true;
  portal = false;
  closes = 0;
  events: string[] = [];
  ctrl: DialogStateController;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.renderNow();
    this.ctrl = new DialogStateController(this as unknown as DialogHost, OPTS);
  }

  private renderNow(): void {
    // 与 Modal 的 render 同构：closing 期间保留 DOM 并加退场类
    const closing = this.ctrl?.closing ? " panel--closing" : "";
    this.shadowRoot!.innerHTML = `<div class="overlay"></div><div class="panel${closing}"><button>ok</button></div>`;
  }

  requestUpdate(): void {
    this.renderNow();
    this.ctrl.afterUpdate();
  }

  close(): void {
    this.closes++;
  }

  emit(name: string): void {
    this.events.push(name);
  }

  /** 让退场动画「结束」：事件必须由 .panel 自身派发（控制器会校验 target）。 */
  finishAnimation(): void {
    const panel = this.shadowRoot!.querySelector(".panel")!;
    panel.dispatchEvent(new Event("animationend"));
  }
}

const hosts: FakeDialog[] = [];

// [WHY 必须注册] 按规范，`new (class extends HTMLElement {})()` 在浏览器与 happy-dom
// 里都抛 `Illegal constructor` —— 自定义元素只能由解析器 / createElement 构造。
// 注册一次，之后统一走 createElement。
customElements.define("test-dialog-host", FakeDialog);

function create(): FakeDialog {
  return document.createElement("test-dialog-host") as FakeDialog;
}

function mount(portal = false): FakeDialog {
  const host = create();
  host.portal = portal;
  hosts.push(host);
  document.body.appendChild(host);
  return host;
}

function open(host: FakeDialog): void {
  host.open = true;
  host.requestUpdate();
}

function close(host: FakeDialog): void {
  host.open = false;
  host.requestUpdate();
}

afterEach(() => {
  // 宿主是未注册元素，remove() 不会触发 disconnectedCallback —— 状态机里那一项
  // 得手动出栈，否则下一条用例拿到的是「栈里已经有东西」的层级号。
  for (const h of hosts.splice(0)) {
    h.ctrl.handleDisconnect();
    h.remove();
  }
  document.body.style.overflow = "";
  document.body.innerHTML = "";
});

describe("DialogStateController：打开", () => {
  it("入栈、写层级变量、锁滚动、emit 一次 z-open", () => {
    const host = mount();
    open(host);

    expect(host.events).toEqual(["z-open"]);
    expect(host.style.getPropertyValue("--z-test-stack")).toBe("0");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("重渲染（开着的状态下再 update）不会二次 emit / 二次入栈", () => {
    const host = mount();
    open(host);
    const second = mount();
    open(second); // 第二层：层级号应为 1

    host.requestUpdate(); // 重渲染第一层

    expect(host.events, "二次 emit 会让宿主收到两次 z-open").toEqual(["z-open"]);
    expect(second.style.getPropertyValue("--z-test-stack")).toBe("1");
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("已断开时跳过副作用（show 后立刻移除的元素不该锁住滚动）", () => {
    const host = mount();
    host.remove();
    open(host);

    expect(host.events).toEqual([]);
    expect(document.body.style.overflow).toBe("");
  });
});

describe("DialogStateController：关闭", () => {
  it("出栈、解锁、emit z-close，并进入 closing 态", () => {
    const host = mount();
    open(host);
    close(host);

    expect(host.events).toEqual(["z-open", "z-close"]);
    expect(document.body.style.overflow).toBe("");
    expect(host.ctrl.closing, "closing 为真时 render 才保留 DOM 播退场动画").toBe(true);

    host.finishAnimation();
    expect(host.ctrl.closing).toBe(false);
  });

  it("退场动画由面板内部的元素触发时不结算（target 校验）", () => {
    const host = mount();
    open(host);
    close(host);

    const button = host.shadowRoot!.querySelector("button")!;
    button.dispatchEvent(new Event("animationend", { bubbles: true }));

    expect(host.ctrl.closing, "槽内容自己的动画会把弹窗状态机带偏").toBe(true);
  });

  it("尾随的 update 不会重复 emit z-close", () => {
    const host = mount();
    open(host);
    close(host);
    host.requestUpdate();
    host.requestUpdate();

    expect(host.events.filter((e) => e === "z-close").length).toBe(1);
  });
});

describe("DialogStateController：portal 重挂载", () => {
  it("打开时挪到 body，关闭时按原位置（父节点 + 下一个兄弟）放回", () => {
    const parent = document.createElement("div");
    const before = document.createElement("span");
    const after = document.createElement("span");
    parent.append(before, after);
    document.body.appendChild(parent);

    const host = create();
    hosts.push(host);
    host.portal = true;
    parent.insertBefore(host, after);

    open(host);
    expect(host.parentElement).toBe(document.body);

    close(host);
    expect(host.parentElement).toBe(parent);
    expect(host.nextElementSibling, "放回位置错了 = 弹窗「消失」在原布局里").toBe(after);

    host.finishAnimation();
    parent.remove();
  });

  it("portal=false 时待在原地", () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const host = create();
    hosts.push(host);
    parent.appendChild(host);

    open(host);
    expect(host.parentElement).toBe(parent);
    close(host);
    host.finishAnimation();
    parent.remove();
  });
});

describe("DialogStateController：断开", () => {
  it("开着时被移除会出栈并解锁滚动", () => {
    const host = mount();
    open(host);
    expect(document.body.style.overflow).toBe("hidden");

    host.ctrl.handleDisconnect();
    expect(document.body.style.overflow).toBe("");

    // 清理：让栈里的这一项真的出栈
    host.remove();
  });
});
