// <z-login> 登录页：标题、副标题、用户名与密码字段、记住我、注册入口都可配；提交时发 z-login。
import { BaseElement, COPY, html, property, escapeAttr, fieldOf, defineElement } from "../../core/index.js";
import loginCSS from "./login.css?raw";
import "../../components/input/index.js";
import "../../components/button/index.js";
import "../../components/checkbox/index.js";

export class ZLogin extends BaseElement {
  static styles = loginCSS;

  @property({ type: String }) title = "Welcome Back";
  @property({ type: String }) subtitle = "Sign in to your account";
  @property({ type: String }) usernameLabel = COPY.username;
  @property({ type: String }) usernamePlaceholder = "Enter your username";
  @property({ type: String }) passwordLabel = COPY.password;
  @property({ type: String }) passwordPlaceholder = "Enter your password";
  @property({ type: String }) rememberLabel = COPY.rememberMe;
  @property({ type: String }) forgotLabel = COPY.forgotPassword;
  @property({ type: String }) forgotHref = "#";
  @property({ type: String }) submitLabel = COPY.signIn;
  @property({ type: String }) signUpPrompt = "Don't have an account?";
  @property({ type: String }) signUpLabel = COPY.signUp;
  @property({ type: String }) signUpHref = "#";
  /** 必填校验的提示文案（宿主可换成英文）。 */
  @property({ type: String }) requiredMessage = COPY.loginRequired;
  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) showRemember = true;
  @property({ type: Boolean }) showForgot = true;
  @property({ type: Boolean }) showSignUp = true;

  /**
   * 显示错误提示。
   *
   * [WHY `role="alert"`] 这是**提交后才知道**的错误，不是字段旁的静态说明：插入的瞬间
   * 读屏必须主动念出来。2026-11-16 CDP 实测（改之前）：错误节点在无障碍树里是一个
   * `role=generic name=""` 的普通 div —— 提交失败后读屏用户**什么都听不到**，
   * 界面看起来「点了没反应」。`role=alert` 隐含 `aria-live=assertive` + `aria-atomic=true`，
   * 已有节点改文字时同样会播报，所以重复提交也覆盖得到。
   *
   * [WHY 不改成重新渲染] 本组件刻意手工改 DOM：重渲染会把用户的输入清空
   * （见文件顶部注释）。所以这里只动错误节点本身。
   */
  private _showError(msg: string): void {
    const form = this.shadowRoot!.querySelector(".z-login__form");
    if (!form) return;
    const existing = form.querySelector<HTMLElement>(".z-login__error");
    if (existing) {
      // 同一句话重复播报时读屏会静默（内容没变）—— 先清空再写，强制一次变更
      if (existing.textContent === msg) existing.textContent = "";
      existing.textContent = msg;
      return;
    }
    const el = document.createElement("div");
    el.className = "z-login__error";
    el.setAttribute("part", "error");
    el.setAttribute("role", "alert");
    el.textContent = msg;
    form.insertBefore(el, form.firstChild);
  }

  private _clearError(): void {
    const el = this.shadowRoot!.querySelector(".z-login__error");
    if (el) el.remove();
  }

  private _usernameInput: import("../../components/input/index.js").ZInput | null = null;
  private _passwordInput: import("../../components/input/index.js").ZInput | null = null;
  private _rememberCheckbox: import("../../components/checkbox/index.js").ZCheckbox | null = null;

  render(): string {
    return html`
      <div class="z-login" part="root">
        <div class="z-login__card" part="card">
          <div class="z-login__header" part="header">
            <h2 class="z-login__title" part="title">${escapeAttr(this.title)}</h2>
            <p class="z-login__subtitle" part="subtitle">${escapeAttr(this.subtitle)}</p>
          </div>

          <form class="z-login__form" part="form">
            <z-input
              id="login-username"
              type="text"
              label="${escapeAttr(this.usernameLabel)}"
              placeholder="${escapeAttr(this.usernamePlaceholder)}"
              required
              autocomplete="username"
              part="username-field"
            ></z-input>

            <z-input
              id="login-password"
              type="password"
              label="${escapeAttr(this.passwordLabel)}"
              placeholder="${escapeAttr(this.passwordPlaceholder)}"
              required
              autocomplete="current-password"
              part="password-field"
            ></z-input>

            ${this.showRemember || this.showForgot ? html`
              <div class="z-login__options" part="options">
                ${this.showRemember ? html`
                  <z-checkbox id="login-remember" part="remember-checkbox">${escapeAttr(this.rememberLabel)}</z-checkbox>
                ` : html`<span></span>`}
                ${this.showForgot ? html`
                  <a class="z-login__forgot" href="${escapeAttr(this.forgotHref)}" part="forgot-link">${escapeAttr(this.forgotLabel)}</a>
                ` : ""}
              </div>
            ` : ""}

            <z-button
              id="login-submit"
              variant="primary"
              type="submit"
              class="z-login__submit"
              ${this.loading ? "loading" : ""}
              part="submit-btn"
            >${escapeAttr(this.submitLabel)}</z-button>
          </form>

          ${this.showSignUp ? html`
            <div class="z-login__footer" part="footer">
              ${escapeAttr(this.signUpPrompt)} <a href="${escapeAttr(this.signUpHref)}" part="signup-link">${escapeAttr(this.signUpLabel)}</a>
            </div>
          ` : ""}
        </div>
      </div>
    `;
  }

  firstUpdated(): void {
    const root = this.shadowRoot!;
    this._usernameInput = root.querySelector("#login-username");
    this._passwordInput = root.querySelector("#login-password");
    this._rememberCheckbox = root.querySelector("#login-remember");

    root.addEventListener("submit", this._onSubmit);

    // 本地补丁：监听挂在 shadow root 上：performUpdate 的 innerHTML 替换不会移除 root 自身监听
    root.addEventListener("keydown", this._onPasswordKeydown);
    root.addEventListener("z-input", this._onFormInput);
  }

  updated(): void {
    // Sync loading state to the button
    const submitBtn = this.shadowRoot!.querySelector("#login-submit") as import("../../components/button/index.js").ZButton | null;
    if (submitBtn && submitBtn.loading !== this.loading) {
      submitBtn.loading = this.loading;
    }
    // 本地补丁：每次重渲染后刷新字段引用：innerHTML 替换会销毁旧元素，
    // firstUpdated 时缓存引用在挂载后属性更新（React wrapper 设属性）触发重渲染后失效
    const root = this.shadowRoot!;
    this._usernameInput = root.querySelector("#login-username");
    this._passwordInput = root.querySelector("#login-password");
    this._rememberCheckbox = root.querySelector("#login-remember");
  }

  connectedCallback(): void {
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    const root = this.shadowRoot;
    if (root) {
      root.removeEventListener("submit", this._onSubmit);
      root.removeEventListener("keydown", this._onPasswordKeydown);
      root.removeEventListener("z-input", this._onFormInput);
    }
  }

  /** Get current form values. */
  getValues(): { username: string; password: string; remember: boolean } {
    return {
      username: this._usernameInput?.value ?? "",
      password: this._passwordInput?.value ?? "",
      remember: this._rememberCheckbox?.checked ?? false,
    };
  }

  private _onSubmit = (e: Event): void => {
    e.preventDefault();
    if (this.loading) return;

    const values = this.getValues();

    // [WHY 逐字段判定、并给每个空字段标 invalid] 原来只有一句「请填写用户名和密码」：
    //   · 读屏听不到（错误节点没有角色，见 _showError）；
    //   · 两个输入框的 aria-invalid 都还是 "false" —— 用户 Tab 回去也分不清哪个错了；
    //   · 焦点留在原处（实测停在 body），键盘用户得自己找回表单。
    // 现在：缺哪个标哪个，焦点落到第一个缺的字段上，错误文案用 role=alert 播报。
    const missing: HTMLElement[] = [];
    const usernameEmpty = !values.username;
    const passwordEmpty = !values.password;
    if (this._usernameInput) this._usernameInput.invalid = usernameEmpty;
    if (this._passwordInput) this._passwordInput.invalid = passwordEmpty;
    if (usernameEmpty && this._usernameInput) missing.push(this._usernameInput);
    if (passwordEmpty && this._passwordInput) missing.push(this._passwordInput);

    if (missing.length) {
      this._showError(this.requiredMessage);
      // 焦点进到控件内部的字段上（宿主 z-input 自己不可聚焦）
      fieldOf(missing[0])?.focus();
      return;
    }

    this._clearError();
    this.emit("z-login", values);
  };

  /**
   * 用户一动手就把上一次的错误态撤掉。
   *
   * [WHY 监听 z-input 而不是原生 input] 字段是 `z-input`，原生事件在它的影子树里，
   * 只有重派发的 `z-input` 能到本组件（composed）。`z-change` 是失焦才发的，
   * 用它撤错会让「边打边看」的用户一直看到红框。
   */
  private _onFormInput = (e: Event): void => {
    const control = e
      .composedPath()
      .find((n): n is HTMLElement => n instanceof HTMLElement && n.tagName === "Z-INPUT");
    if (!control) return;
    if ((control as unknown as { invalid?: boolean }).invalid) {
      (control as unknown as { invalid: boolean }).invalid = false;
    }
  };

  /**
   * 表单内按 Enter 提交。
   *
   * [WHY 不能无条件接管] 原来只要在组件内按 Enter 就 `_onSubmit(e)`，而
   * `preventDefault()` 同时把**别的元素自己的默认行为**也挡掉了。2026-11-16 实测：
   * 焦点在「忘记密码」链接上按 Enter，`defaultPrevented=true` 且表单被提交 ——
   * 键盘用户**没法激活那个链接**（`#` 之外的真实地址同样打不开），而这正是他们
   * 唯一的进入方式。
   * 现在只认「光标在文本字段里按 Enter」，链接/按钮上的 Enter 原样放行。
   */
  private _onPasswordKeydown = (e: Event): void => {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter") return;
    const origin = ke.composedPath()[0] as Element | null;
    if (origin?.closest?.("a[href], button, z-button")) return;
    this._onSubmit(ke);
  };

}

defineElement("z-login", ZLogin);
