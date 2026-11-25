// Test: FloatingPanelController（light-DOM 浮层面板生命周期）
//
// [为什么补这份] 它是 Select / Datepicker / DateRange / TimePicker / Menu / Popover /
// Tooltip 七个组件共用的面板控制器，此前只有 datepicker 的用例间接带到。
// 间接覆盖挡不住两类问题，而这两类都不会报错、单测也不会红：
//   ① **重入**：未 close 就再次 open，旧面板与旧文档监听泄漏（见「重入」两条用例）；
//   ② **外部点击的判定边界**：点在宿主内 / 面板内不该关，点在别处才关。
// 第 ① 类在真机上的表现是「点一次关掉两个面板」，排查时没人会怀疑到控制器。

import { afterEach, describe, expect, it, vi } from "vitest";
import { FloatingPanelController } from "../../../src/primitives/overlay/floatingPanel";

/** 用例里创建的控制器统一回收：文档级 mousedown 监听不摘会跨用例串味。 */
const controllers: FloatingPanelController[] = [];

function controller(host: HTMLElement): FloatingPanelController {
  const c = new FloatingPanelController(host);
  controllers.push(c);
  return c;
}

function setup(): { host: HTMLElement; trigger: HTMLElement } {
  const host = document.createElement("div");
  const trigger = document.createElement("button");
  trigger.textContent = "open";
  host.appendChild(trigger);
  document.body.appendChild(host);
  return { host, trigger };
}

/** 面板移除走 setTimeout 兜底（happy-dom 不触发 animationend），等一个宏任务即可。 */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

function mouseDownOn(el: EventTarget): void {
  el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
}

afterEach(async () => {
  for (const c of controllers.splice(0)) c.close(0);
  await flush();
  document.body.innerHTML = "";
});

describe("FloatingPanelController：开与关", () => {
  it("open 把面板挂到 body，带上 part / role / tabindex，并报告 isOpen", () => {
    const { host, trigger } = setup();
    const c = controller(host);

    const panel = c.open(
      { panelClass: "t-panel", hidingClass: "t-panel--hiding", anchor: () => trigger },
      (p) => (p.textContent = "filled"),
    );

    expect(c.isOpen).toBe(true);
    expect(c.panel).toBe(panel);
    expect(panel.parentElement).toBe(document.body);
    expect(panel.getAttribute("part")).toBe("panel");
    expect(panel.getAttribute("role")).toBe("dialog");
    expect(panel.getAttribute("tabindex")).toBe("-1");
    expect(panel.textContent, "fill 必须在 append 之前执行，否则定位量到的是空尺寸").toBe("filled");

    c.close();
  });

  it("role: null 与 tabIndex: false 可以关掉默认属性", () => {
    const { host, trigger } = setup();
    const c = controller(host);

    const panel = c.open({
      panelClass: "t-panel",
      hidingClass: "t-panel--hiding",
      role: null,
      tabIndex: false,
      anchor: () => trigger,
    });

    expect(panel.hasAttribute("role")).toBe(false);
    expect(panel.hasAttribute("tabindex")).toBe(false);
    c.close();
  });

  it("close 摘掉状态，面板在兜底延迟后从 DOM 移除", async () => {
    const { host, trigger } = setup();
    const c = controller(host);
    const panel = c.open({ panelClass: "t-panel", hidingClass: "h", anchor: () => trigger });

    c.close(0);
    expect(c.isOpen).toBe(false);
    expect(c.panel).toBeNull();
    expect(panel.classList.contains("h"), "退场类要先加上，否则面板是「啪」地消失").toBe(true);

    await flush();
    expect(panel.parentElement).toBeNull();
  });
});

describe("FloatingPanelController：重入", () => {
  it("未 close 就再次 open 时，旧面板被摘掉（body 里只留一个）", () => {
    const { host, trigger } = setup();
    const c = controller(host);

    c.open({ panelClass: "t-panel", hidingClass: "h", anchor: () => trigger });
    const second = c.open({ panelClass: "t-panel", hidingClass: "h", anchor: () => trigger });

    const panels = document.querySelectorAll(".t-panel");
    expect(panels.length).toBe(1);
    expect(panels[0]).toBe(second);
  });

  it("重入后外部点击只回调一次（旧监听没被泄漏）", () => {
    const { host, trigger } = setup();
    const c = controller(host);
    const first = vi.fn();
    const second = vi.fn();

    c.open({
      panelClass: "t-panel",
      hidingClass: "h",
      anchor: () => trigger,
      onOutsideClose: first,
    });
    c.open({
      panelClass: "t-panel",
      hidingClass: "h",
      anchor: () => trigger,
      onOutsideClose: second,
    });

    mouseDownOn(document.body);

    expect(second).toHaveBeenCalledTimes(1);
    expect(
      first,
      "旧回调还活着 = 点了别处会去关一个已不存在（或不相干）的面板",
    ).toHaveBeenCalledTimes(0);
  });
});

describe("FloatingPanelController：外部点击判定", () => {
  it("点在面板内或宿主内都不关", () => {
    const { host, trigger } = setup();
    const c = controller(host);
    const onOutsideClose = vi.fn();
    const panel = c.open({
      panelClass: "t-panel",
      hidingClass: "h",
      anchor: () => trigger,
      onOutsideClose,
    });

    mouseDownOn(panel);
    mouseDownOn(trigger);
    mouseDownOn(host);

    expect(onOutsideClose).toHaveBeenCalledTimes(0);
    c.close();
  });

  it("点在页面别处才关", () => {
    const { host, trigger } = setup();
    const outside = document.createElement("p");
    document.body.appendChild(outside);
    const c = controller(host);
    const onOutsideClose = vi.fn();
    c.open({ panelClass: "t-panel", hidingClass: "h", anchor: () => trigger, onOutsideClose });

    mouseDownOn(outside);

    expect(onOutsideClose).toHaveBeenCalledTimes(1);
    c.close();
  });

  it("不传 onOutsideClose 时不注册文档监听（hover 型浮层自己管关闭）", () => {
    const { host, trigger } = setup();
    const c = controller(host);
    c.open({ panelClass: "t-panel", hidingClass: "h", anchor: () => trigger });

    mouseDownOn(document.body);
    expect(c.isOpen).toBe(true);
    c.close();
  });
});
