// Test: ThemeController.init() 注入设计 token, 外部项目开箱即用
// Related: [[bug-20260810-external-css-tokens]]
// Wiki: wiki/bugs/bug-20260810-external-css-tokens.md
// Date: 2026-08-10
// Author: night-hawk (AI)

import { describe, it, expect } from "vitest";
import { ThemeController } from "../../src/theme/ThemeController";

describe("ThemeController", () => {
  it("injects design tokens into document.head on init", () => {
    const c = new ThemeController();
    c.init();
    const style = document.getElementById("zui-theme-tokens") as HTMLStyleElement | null;
    expect(style).toBeTruthy();
    expect(style!.textContent).toContain("--z-color-primary");
    expect(style!.textContent).toContain("--z-space-1");
  });

  it("injects tokens only once across multiple inits", () => {
    const c = new ThemeController();
    c.init();
    c.init();
    c.init();
    const styles = document.querySelectorAll("#zui-theme-tokens");
    expect(styles.length).toBe(1);
  });

  it("sets data-theme attribute on document root", () => {
    const c = new ThemeController();
    c.init();
    expect(document.documentElement.getAttribute("data-theme")).toMatch(/^light|dark$/);
  });

  it("toggles theme and dispatches z-theme-change", () => {
    const c = new ThemeController();
    c.init();
    const before = c.theme;
    let received = "";
    document.addEventListener("z-theme-change", (e: Event) => {
      received = (e as CustomEvent).detail;
    });
    c.toggle();
    expect(c.theme).not.toBe(before);
    expect(received).toBe(c.theme);
    expect(document.documentElement.getAttribute("data-theme")).toBe(c.theme);
  });
});
