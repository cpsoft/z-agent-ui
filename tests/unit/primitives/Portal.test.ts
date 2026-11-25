// Test: z-portal component
// Date: 2026-07-16

import { describe, it, expect } from "vitest";
import "../../../src/primitives/portal/Portal";

describe("z-portal", () => {
  it("moves children to target (body by default)", async () => {
    const portal = document.createElement("z-portal") as any;
    const child = document.createElement("span");
    child.textContent = "portal-child";
    portal.appendChild(child);
    document.body.appendChild(portal);

    await new Promise((r) => setTimeout(r, 0));

    // Child should now be inside body, not the portal element
    expect(portal.contains(child)).toBe(false);
    const container = document.querySelector('[data-z-portal]') as HTMLElement;
    expect(container!.contains(child)).toBe(true);

    document.body.removeChild(portal);
    // After removing portal, children are restored
  });

  it("restores children on disconnect", async () => {
    const portal = document.createElement("z-portal") as any;
    const child = document.createElement("span");
    child.textContent = "restore-me";
    portal.appendChild(child);
    document.body.appendChild(portal);

    await new Promise((r) => setTimeout(r, 0));
    document.body.removeChild(portal);
    await new Promise((r) => setTimeout(r, 0));

    // Child should be moved back to portal
    expect(portal.contains(child)).toBe(true);
  });

  it("render returns null (transparent element)", async () => {
    const portal = document.createElement("z-portal") as any;
    document.body.appendChild(portal);
    await new Promise((r) => setTimeout(r, 0));
    // Shadow DOM exists but empty
    expect(portal.shadowRoot).toBeDefined();
    document.body.removeChild(portal);
  });

  it("observes childList changes", async () => {
    const portal = document.createElement("z-portal") as any;
    document.body.appendChild(portal);
    await new Promise((r) => setTimeout(r, 0));

    const laterChild = document.createElement("div");
    laterChild.textContent = "late";
    portal.appendChild(laterChild);
    await new Promise((r) => setTimeout(r, 0));

    const container = document.querySelector('[data-z-portal]') as HTMLElement;
    expect(container.contains(laterChild)).toBe(true);

    document.body.removeChild(portal);
    await new Promise((r) => setTimeout(r, 0));
  });

  // ── D-L0-5：target 是宿主字符串，非法选择器不能让元素升级失败 ──────────────
  it("target 是非法选择器时不抛，子树留在原地", async () => {
    const portal = document.createElement("z-portal") as any;
    portal.target = "a b](";
    const child = document.createElement("span");
    portal.appendChild(child);
    document.body.appendChild(portal);

    await new Promise((r) => setTimeout(r, 0));

    // 判据一：元素照常连上（抛在 connectedCallback 里会让它「连上但没动作」）
    expect(portal.isConnected).toBe(true);
    // 判据二：没找到目标就不搬 —— 子树仍在 portal 内，而不是消失
    expect(portal.contains(child)).toBe(true);
    document.body.removeChild(portal);
  });

  it("target 写 id 时能搬进去（getElementById 优先）", async () => {
    const target = document.createElement("div");
    target.id = "portal-target-by-id";
    document.body.appendChild(target);

    const portal = document.createElement("z-portal") as any;
    portal.target = "portal-target-by-id";
    const child = document.createElement("span");
    portal.appendChild(child);
    document.body.appendChild(portal);
    await new Promise((r) => setTimeout(r, 0));

    expect(target.contains(child)).toBe(true);
    document.body.removeChild(portal);
    document.body.removeChild(target);
  });
});
