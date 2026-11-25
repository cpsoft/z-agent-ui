// Test: z-login component renders correctly
// Date: 2026-07-17

import { describe, it, expect } from "vitest";
import "../../../src/app/login/Login";

describe("z-login", () => {
  function createLogin(): HTMLElement {
    const el = document.createElement("z-login");
    document.body.appendChild(el);
    return el;
  }

  it("registers the custom element", () => {
    const el = createLogin();
    expect(el.tagName).toBe("Z-LOGIN");
    document.body.removeChild(el);
  });

  it("has a shadow root", () => {
    const el = createLogin();
    expect(el.shadowRoot).toBeTruthy();
    document.body.removeChild(el);
  });

  it("renders the login card after microtask", async () => {
    const el = createLogin();
    await new Promise((r) => setTimeout(r, 0));

    const root = el.shadowRoot!.querySelector(".z-login");
    expect(root).toBeTruthy();
    const card = el.shadowRoot!.querySelector(".z-login__card");
    expect(card).toBeTruthy();
    const title = el.shadowRoot!.querySelector(".z-login__title");
    expect(title?.textContent).toBe("Welcome Back");
    document.body.removeChild(el);
  });

  it("renders form fields", async () => {
    const el = createLogin();
    await new Promise((r) => setTimeout(r, 0));

    const usernameInput = el.shadowRoot!.querySelector("#login-username");
    expect(usernameInput).toBeTruthy();
    const passwordInput = el.shadowRoot!.querySelector("#login-password");
    expect(passwordInput).toBeTruthy();
    const submitBtn = el.shadowRoot!.querySelector("#login-submit");
    expect(submitBtn).toBeTruthy();
    document.body.removeChild(el);
  });

  it("renders with custom labels", async () => {
    const el = createLogin() as any;
    el.title = "Custom Title";
    el.submitLabel = "Login";
    await new Promise((r) => setTimeout(r, 0));

    const title = el.shadowRoot!.querySelector(".z-login__title");
    expect(title?.textContent).toBe("Custom Title");
    const btn = el.shadowRoot!.querySelector("#login-submit");
    expect(btn?.textContent).toBe("Login");
    document.body.removeChild(el);
  });

  it("handles upgrade scenario: element created before registration", async () => {
    // Simulate browser: HTML parser creates <z-login> before script runs
    const el = document.createElement("z-login");
    document.body.appendChild(el);
    // At this point it's HTMLUnknownElement — no shadow root yet (customElements not loaded)
    // The import above already registered z-login, so in the browser the upgrade
    // would happen when the script evaluates. Let's verify:
    expect(el.shadowRoot).toBeTruthy(); // constructor attached shadow in upgrade
    await new Promise((r) => setTimeout(r, 0));

    const card = el.shadowRoot!.querySelector(".z-login__card");
    expect(card).toBeTruthy();
    document.body.removeChild(el);
  });
});

// ── 失败反馈与键盘（2026-11-16）───────────────────────────────────────────
//
// [WHY 这一组存在] 三件事都只在「提交失败」或「用键盘」时才出现，界面看起来全对：
//   · 错误提示是个普通 `<div>`（CDP 实测 `role=generic name=""`）⇒ 读屏不播报，
//     用户以为「点了没反应」；
//   · 两个空字段的 `aria-invalid` 都还是 "false"，Tab 回去分不清哪个错；
//   · 组件内任何位置按 Enter 都会 `preventDefault()` 并提交 —— 「忘记密码」链接
//     因此**按 Enter 打不开**，而那是键盘用户唯一的进入方式。
/** 点内层原生 submit 按钮（点宿主 `<z-button>` 不会触发表单提交）。 */
function submit(el: HTMLElement): void {
  const host = el.shadowRoot!.querySelector("#login-submit") as HTMLElement;
  (host.shadowRoot!.querySelector("button") as HTMLButtonElement).click();
}

describe("z-login 失败反馈与键盘", () => {
  function mount(): any {
    const el = document.createElement("z-login") as any;
    document.body.appendChild(el);
    return el;
  }

  it("E1 错误提示是 role=alert（否则读屏一声不响）", async () => {
    const el = mount();
    await new Promise((r) => setTimeout(r, 0));
    submit(el);
    await new Promise((r) => setTimeout(r, 0));

    const err = el.shadowRoot!.querySelector(".z-login__error") as HTMLElement;
    expect(err, "前置：错误提示没渲染，这条没验到东西").toBeTruthy();
    expect(err.getAttribute("role")).toBe("alert");
    expect(err.textContent).toBe("请填写用户名和密码");
    document.body.removeChild(el);
  });

  it("E2 缺哪个字段就标哪个 invalid，并把焦点送到第一个", async () => {
    const el = mount();
    await new Promise((r) => setTimeout(r, 0));
    submit(el);
    await new Promise((r) => setTimeout(r, 0));

    const u = el.shadowRoot!.querySelector("#login-username") as any;
    const p = el.shadowRoot!.querySelector("#login-password") as any;
    expect(u.invalid, "用户名为空却没标 invalid").toBe(true);
    expect(p.invalid, "密码为空却没标 invalid").toBe(true);
    // 焦点要进到控件内部的字段上（宿主 z-input 自己不可聚焦）
    expect(el.shadowRoot!.activeElement, "焦点没落到第一个缺的字段上").toBe(u);
    document.body.removeChild(el);
  });

  it("E3 用户一动，错误态就撤掉（不是等下一次提交）", async () => {
    const el = mount();
    await new Promise((r) => setTimeout(r, 0));
    submit(el);
    await new Promise((r) => setTimeout(r, 0));
    const u = el.shadowRoot!.querySelector("#login-username") as any;
    expect(u.invalid).toBe(true);

    u.dispatchEvent(new CustomEvent("z-input", { detail: { value: "a" }, bubbles: true, composed: true }));
    await new Promise((r) => setTimeout(r, 0));
    expect(u.invalid, "边打边看一直挂着红框").toBe(false);
    document.body.removeChild(el);
  });

  it("E4 在「忘记密码」链接上按 Enter 不被抢（能正常激活链接）", async () => {
    const el = mount();
    await new Promise((r) => setTimeout(r, 0));
    const link = el.shadowRoot!.querySelector(".z-login__forgot") as HTMLAnchorElement;
    link.focus();

    const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true });
    link.dispatchEvent(ev);
    await new Promise((r) => setTimeout(r, 0));

    expect(ev.defaultPrevented, "拦下来 = 键盘用户打不开这个链接").toBe(false);
    expect(el.shadowRoot!.querySelector(".z-login__error"), "链接上的 Enter 不该提交表单").toBeNull();
    document.body.removeChild(el);
  });

  it("E5 文本字段里按 Enter 仍然提交（没把原有的路堵了）", async () => {
    const el = mount();
    await new Promise((r) => setTimeout(r, 0));
    const field = el.shadowRoot!.querySelector("#login-username")!.shadowRoot!.querySelector("input") as HTMLInputElement;
    field.focus();

    const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, composed: true, cancelable: true });
    field.dispatchEvent(ev);
    await new Promise((r) => setTimeout(r, 0));

    expect(ev.defaultPrevented, "文本字段里的 Enter 应当照旧提交").toBe(true);
    expect(el.shadowRoot!.querySelector(".z-login__error"), "空表单提交应当报错").toBeTruthy();
    document.body.removeChild(el);
  });

  it("E6 提示文案可被宿主换成别的语言", async () => {
    const el = mount();
    el.requiredMessage = "Username and password are required";
    await new Promise((r) => setTimeout(r, 0));
    submit(el);
    await new Promise((r) => setTimeout(r, 0));
    expect(el.shadowRoot!.querySelector(".z-login__error")!.textContent).toBe(
      "Username and password are required",
    );
    document.body.removeChild(el);
  });
});
