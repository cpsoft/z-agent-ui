// Test: z-login integration test — simulates complex.html page load order
// Date: 2026-07-17

import { describe, it, expect } from "vitest";
import "../../../src/theme/index";
import "../../../src/app/login/Login";

describe("z-login integration", () => {
  it("renders when created before registration (upgrade path)", async () => {
    // Simulate the browser: element exists in DOM before registration
    // (In real page, HTML parser creates <z-login> before <script> runs)
    
    // First: theme tokens should be available
    const cs = getComputedStyle(document.documentElement);
    expect(cs.getPropertyValue("--z-color-bg-secondary")).toBeTruthy();
    
    // login already imported above, so component is registered.
    // Now create an element as if it was upgraded.
    const el = document.createElement("z-login");
    document.body.appendChild(el);
    
    // Should have shadow root immediately (constructor runs on create)
    expect(el.shadowRoot).toBeTruthy();
    
    // Wait for microtask render
    await new Promise(r => setTimeout(r, 0));
    
    const shadowHTML = el.shadowRoot!.innerHTML;
    expect(shadowHTML.length).toBeGreaterThan(200);
    
    // Check key elements
    const card = el.shadowRoot!.querySelector(".z-login__card");
    expect(card).toBeTruthy();
    
    const title = el.shadowRoot!.querySelector(".z-login__title");
    expect(title?.textContent).toBeTruthy();
    
    const form = el.shadowRoot!.querySelector(".z-login__form");
    expect(form).toBeTruthy();
    
    const username = el.shadowRoot!.querySelector("#login-username");
    expect(username).toBeTruthy();
    
    const password = el.shadowRoot!.querySelector("#login-password");
    expect(password).toBeTruthy();
    
    const submit = el.shadowRoot!.querySelector("#login-submit");
    expect(submit).toBeTruthy();
    
    document.body.removeChild(el);
  });
});
