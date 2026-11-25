import{B as c,e as a,h as p,p as i}from"./presets-CdaBrvJF.js";import{g as m}from"./a11y-DJ6wHu5s.js";import"./Input-wCelPXsT.js";import"./Button-6M0Me5pu.js";import"./Checkbox-PuEiz19l.js";const g=`/* ===== z-login ===== */

:host {
  display: block;
  width: 100%;
}

.z-login {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: var(--z-space-10) var(--z-space-6);
  background: var(--z-color-bg-secondary);
  border-radius: var(--z-radius-lg);
  box-sizing: border-box;
}

.z-login__card {
  box-sizing: border-box;
  width: 100%;
  max-width: 420px;
  padding: var(--z-space-10);
  background: var(--z-color-surface);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-lg);
  box-shadow: var(--z-shadow-md);
  animation: z-login-card-in var(--z-duration-quick) var(--z-ease-enter);
}

.z-login__card *,
.z-login__card *::before,
.z-login__card *::after {
  box-sizing: border-box;
}

@keyframes z-login-card-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Header ── */

.z-login__header {
  text-align: center;
  margin-bottom: var(--z-space-8);
}

.z-login__title {
  font-size: 24px;
  font-weight: var(--z-font-weight-bold);
  color: var(--z-color-text);
  margin: 0 0 var(--z-space-2);
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.z-login__subtitle {
  font-size: var(--z-font-size-md);
  color: var(--z-color-text-secondary);
  margin: 0;
  line-height: var(--z-line-height);
}

/* ── Form ── */

.z-login__form {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-5);
}

.z-login__form z-input {
  max-width: none;
  width: 100%;
}

/* ── Options row ── */

.z-login__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--z-font-size-sm);
  min-height: 44px;
}

.z-login__forgot {
  color: var(--z-color-primary);
  text-decoration: none;
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  transition: color var(--z-transition-fast);
  padding: var(--z-space-1) 0;
}

.z-login__forgot:hover {
  color: var(--z-color-primary-hover);
  text-decoration: underline;
}

.z-login__forgot:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 2px;
  border-radius: var(--z-radius-sm);
}

/* ── Submit button ── */

.z-login__submit {
  width: 100%;
  --z-button-font-size: var(--z-font-size-md);
  --z-button-padding-y: var(--z-space-3);
  --z-button-font-weight: var(--z-font-weight-semibold);
}

/* 本地补丁：上游 Button 为 inline-flex（内容宽度）：宿主 width:100% 但内层按钮仅包住文字，
   点击宿主右侧空白区无任何响应（2026-08-10 zEtl 实测）。::part 命中内层 <button part="button">
   See: wiki/planning/TASKS/20260810-z-agent-ui-sync/ (GAP-7) */
.z-login__submit::part(button) {
  width: 100%;
}

/* ── Footer ── */

.z-login__footer {
  text-align: center;
  margin-top: var(--z-space-6);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
}

.z-login__footer a {
  color: var(--z-color-primary);
  text-decoration: none;
  font-weight: var(--z-font-weight-medium);
  transition: color var(--z-transition-fast);
}

.z-login__footer a:hover {
  color: var(--z-color-primary-hover);
  text-decoration: underline;
}

.z-login__footer a:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 2px;
  border-radius: var(--z-radius-sm);
}

/* ── Error ── */

.z-login__error {
  padding: var(--z-space-3) var(--z-space-4);
  font-size: var(--z-font-size-sm);
  line-height: var(--z-line-height);
  /* [WHY] audit 2026-10-25: 原 6 处裸 hex（含下方暗色块）归入 danger 语义 token */
  color: var(--z-color-danger-strong);
  background: var(--z-color-danger-soft);
  border: 1px solid var(--z-color-danger-border);
  border-radius: var(--z-radius-md);
  animation: z-login-error-in var(--z-duration-fast) var(--z-ease-enter);
}

@keyframes z-login-error-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Dark theme ── */
/* [WHY] 明暗差异已下沉到 tokens.css 的 --z-color-danger-*，此处不再需要覆盖块。
   保留空注释说明位置，便于后人知道这里曾有一份重复定义。 */

/* ── Responsive ── */

@media (max-width: 480px) {
  .z-login {
    padding: var(--z-space-4);
    border-radius: 0;
  }

  .z-login__card {
    padding: var(--z-space-6);
    max-width: 100%;
    border-radius: var(--z-radius-md);
  }

  .z-login__header {
    margin-bottom: var(--z-space-6);
  }
}
`;var z=Object.defineProperty,s=(h,n,t,e)=>{for(var o=void 0,l=h.length-1,d;l>=0;l--)(d=h[l])&&(o=d(n,t,o)||o);return o&&z(n,t,o),o};const u=class u extends c{constructor(){super(...arguments),this.title="Welcome Back",this.subtitle="Sign in to your account",this.usernameLabel="用户名",this.usernamePlaceholder="Enter your username",this.passwordLabel="密码",this.passwordPlaceholder="Enter your password",this.rememberLabel="记住我",this.forgotLabel="忘记密码？",this.forgotHref="#",this.submitLabel="登录",this.signUpPrompt="Don't have an account?",this.signUpLabel="注册",this.signUpHref="#",this.requiredMessage="请填写用户名和密码",this.loading=!1,this.showRemember=!0,this.showForgot=!0,this.showSignUp=!0,this._usernameInput=null,this._passwordInput=null,this._rememberCheckbox=null,this._onSubmit=n=>{var d;if(n.preventDefault(),this.loading)return;const t=this.getValues(),e=[],o=!t.username,l=!t.password;if(this._usernameInput&&(this._usernameInput.invalid=o),this._passwordInput&&(this._passwordInput.invalid=l),o&&this._usernameInput&&e.push(this._usernameInput),l&&this._passwordInput&&e.push(this._passwordInput),e.length){this._showError(this.requiredMessage),(d=m(e[0]))==null||d.focus();return}this._clearError(),this.emit("z-login",t)},this._onFormInput=n=>{const t=n.composedPath().find(e=>e instanceof HTMLElement&&e.tagName==="Z-INPUT");t&&t.invalid&&(t.invalid=!1)},this._onPasswordKeydown=n=>{var o;const t=n;if(t.key!=="Enter")return;const e=t.composedPath()[0];(o=e==null?void 0:e.closest)!=null&&o.call(e,"a[href], button, z-button")||this._onSubmit(t)}}_showError(n){const t=this.shadowRoot.querySelector(".z-login__form");if(!t)return;const e=t.querySelector(".z-login__error");if(e){e.textContent===n&&(e.textContent=""),e.textContent=n;return}const o=document.createElement("div");o.className="z-login__error",o.setAttribute("part","error"),o.setAttribute("role","alert"),o.textContent=n,t.insertBefore(o,t.firstChild)}_clearError(){const n=this.shadowRoot.querySelector(".z-login__error");n&&n.remove()}render(){return p`
      <div class="z-login" part="root">
        <div class="z-login__card" part="card">
          <div class="z-login__header" part="header">
            <h2 class="z-login__title" part="title">${a(this.title)}</h2>
            <p class="z-login__subtitle" part="subtitle">${a(this.subtitle)}</p>
          </div>

          <form class="z-login__form" part="form">
            <z-input
              id="login-username"
              type="text"
              label="${a(this.usernameLabel)}"
              placeholder="${a(this.usernamePlaceholder)}"
              required
              autocomplete="username"
              part="username-field"
            ></z-input>

            <z-input
              id="login-password"
              type="password"
              label="${a(this.passwordLabel)}"
              placeholder="${a(this.passwordPlaceholder)}"
              required
              autocomplete="current-password"
              part="password-field"
            ></z-input>

            ${this.showRemember||this.showForgot?p`
              <div class="z-login__options" part="options">
                ${this.showRemember?p`
                  <z-checkbox id="login-remember" part="remember-checkbox">${a(this.rememberLabel)}</z-checkbox>
                `:p`<span></span>`}
                ${this.showForgot?p`
                  <a class="z-login__forgot" href="${a(this.forgotHref)}" part="forgot-link">${a(this.forgotLabel)}</a>
                `:""}
              </div>
            `:""}

            <z-button
              id="login-submit"
              variant="primary"
              type="submit"
              class="z-login__submit"
              ${this.loading?"loading":""}
              part="submit-btn"
            >${a(this.submitLabel)}</z-button>
          </form>

          ${this.showSignUp?p`
            <div class="z-login__footer" part="footer">
              ${a(this.signUpPrompt)} <a href="${a(this.signUpHref)}" part="signup-link">${a(this.signUpLabel)}</a>
            </div>
          `:""}
        </div>
      </div>
    `}firstUpdated(){const n=this.shadowRoot;this._usernameInput=n.querySelector("#login-username"),this._passwordInput=n.querySelector("#login-password"),this._rememberCheckbox=n.querySelector("#login-remember"),n.addEventListener("submit",this._onSubmit),n.addEventListener("keydown",this._onPasswordKeydown),n.addEventListener("z-input",this._onFormInput)}updated(){const n=this.shadowRoot.querySelector("#login-submit");n&&n.loading!==this.loading&&(n.loading=this.loading);const t=this.shadowRoot;this._usernameInput=t.querySelector("#login-username"),this._passwordInput=t.querySelector("#login-password"),this._rememberCheckbox=t.querySelector("#login-remember")}connectedCallback(){super.connectedCallback()}disconnectedCallback(){const n=this.shadowRoot;n&&(n.removeEventListener("submit",this._onSubmit),n.removeEventListener("keydown",this._onPasswordKeydown),n.removeEventListener("z-input",this._onFormInput))}getValues(){var n,t,e;return{username:((n=this._usernameInput)==null?void 0:n.value)??"",password:((t=this._passwordInput)==null?void 0:t.value)??"",remember:((e=this._rememberCheckbox)==null?void 0:e.checked)??!1}}};u.styles=g;let r=u;s([i({type:String})],r.prototype,"title");s([i({type:String})],r.prototype,"subtitle");s([i({type:String})],r.prototype,"usernameLabel");s([i({type:String})],r.prototype,"usernamePlaceholder");s([i({type:String})],r.prototype,"passwordLabel");s([i({type:String})],r.prototype,"passwordPlaceholder");s([i({type:String})],r.prototype,"rememberLabel");s([i({type:String})],r.prototype,"forgotLabel");s([i({type:String})],r.prototype,"forgotHref");s([i({type:String})],r.prototype,"submitLabel");s([i({type:String})],r.prototype,"signUpPrompt");s([i({type:String})],r.prototype,"signUpLabel");s([i({type:String})],r.prototype,"signUpHref");s([i({type:String})],r.prototype,"requiredMessage");s([i({type:Boolean})],r.prototype,"loading");s([i({type:Boolean})],r.prototype,"showRemember");s([i({type:Boolean})],r.prototype,"showForgot");s([i({type:Boolean})],r.prototype,"showSignUp");customElements.define("z-login",r);
