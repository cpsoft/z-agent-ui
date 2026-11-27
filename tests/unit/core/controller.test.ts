import { afterEach, describe, expect, it, vi } from "vitest";
import { BaseElement, defineElement, html, property, type ReactiveController } from "../../../src/core/index.js";
import { FloatingPanelController } from "../../../src/primitives/index.js";

class TestControllerHost extends BaseElement {
  @property({ type: Number }) count = 0;

  render(): string {
    return html`<span>${this.count}</span>`;
  }
}

defineElement("z-test-controller-host", TestControllerHost);

describe("ReactiveController 生命周期协议", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("按序触发 hostConnected / hostUpdate / hostUpdated / hostDisconnected", async () => {
    const calls: string[] = [];
    const ctrl: ReactiveController = {
      hostConnected: () => calls.push("connected"),
      hostUpdate: () => calls.push("update"),
      hostUpdated: () => calls.push("updated"),
      hostDisconnected: () => calls.push("disconnected"),
    };

    const el = document.createElement("z-test-controller-host") as TestControllerHost;
    expect(el.addController(ctrl)).toBe(ctrl);
    document.body.appendChild(el);
    await Promise.resolve();

    expect(calls).toEqual(["connected", "update", "updated"]);

    el.count = 1;
    await Promise.resolve();
    expect(calls).toEqual(["connected", "update", "updated", "update", "updated"]);

    el.remove();
    expect(calls).toEqual(["connected", "update", "updated", "update", "updated", "disconnected"]);
  });

  it("宿主已连接时动态 addController 立即触发 hostConnected；removeController 后不再收到钩子", async () => {
    const el = document.createElement("z-test-controller-host") as TestControllerHost;
    document.body.appendChild(el);
    await Promise.resolve();

    const hostConnected = vi.fn();
    const hostUpdated = vi.fn();
    const hostDisconnected = vi.fn();
    const ctrl: ReactiveController = { hostConnected, hostUpdated, hostDisconnected };

    el.addController(ctrl);
    expect(hostConnected).toHaveBeenCalledTimes(1);

    el.count = 2;
    await Promise.resolve();
    expect(hostUpdated).toHaveBeenCalledTimes(1);

    el.removeController(ctrl);
    el.count = 3;
    await Promise.resolve();
    el.remove();

    expect(hostUpdated).toHaveBeenCalledTimes(1);
    expect(hostDisconnected).not.toHaveBeenCalled();
  });

  it("FloatingPanelController 注册为控制器后，宿主移除时自动清理残留浮层", () => {
    const el = document.createElement("z-test-controller-host") as TestControllerHost;
    const floating = el.addController(new FloatingPanelController(el));
    document.body.appendChild(el);

    const panel = floating.open({
      panelClass: "test-panel",
      hidingClass: "test-panel--hiding",
      anchor: el,
    });
    expect(document.body.contains(panel)).toBe(true);
    expect(floating.isOpen).toBe(true);

    // 不手工调 floating.close()，直接移除宿主
    el.remove();
    expect(floating.isOpen).toBe(false);
    expect(document.body.contains(panel)).toBe(false);
  });
});
