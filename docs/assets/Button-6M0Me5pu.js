import{B as v,h as c,p as a}from"./presets-CdaBrvJF.js";import{e as p,a as u,o as z}from"./a11y-DJ6wHu5s.js";const g=`/* ===== z-button ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
}

/* [WHY 满宽变体 2026-10-30] \`z-button\` 的内部按钮是 inline-flex、宽度由内容决定，
   宿主设了 width:100% 也只会在左侧缩成一个小按钮（页面上「＋ 加一项」「页签」这类
   整行按钮需要撑满）。\`:host([block])\` 是**纯 CSS 属性选择**，不新增 JS 属性 ——
   属性存在即生效，模板里写 \`block\` 就行。 */
:host([block]) {
  display: flex;
  width: 100%;
}
:host([block]) .z-button {
  width: 100%;
}

.z-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-button-gap);
  padding: var(--z-button-padding-y) var(--z-button-padding-x);
  font-family: var(--z-font-sans);
  font-size: var(--z-button-font-size);
  font-weight: var(--z-button-font-weight);
  line-height: var(--z-line-height);
  border: var(--z-button-border-width) solid transparent;
  border-radius: var(--z-button-radius);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: var(--z-button-transition);
  outline: none;
}

.z-button:focus-visible {
  box-shadow: var(--z-focus-ring-contrast);
}

.z-button:disabled,
.z-button[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

/* ── 语义色（tone）：只定义变量 ──
   [WHY 拆成「变量 + 用法」两层] 旧的 \`--primary / --secondary / --outline / --ghost / --danger\`
   把**颜色**和**外观**混在一个词里：\`outline\` 说的是描边，\`danger\` 说的是语义。
   于是「红色的描边按钮」这种组合压根写不出来 —— 只能再加一个 variant 值。
   拆开之后 tone 决定色、appearance 决定用色方式，组合是开放的。 */

:host {
  --btn-solid-bg: var(--z-color-primary-solid);
  --btn-solid-bg-hover: var(--z-color-primary-solid-hover);
  --btn-solid-bg-active: var(--z-color-primary-solid-active);
  --btn-solid-fg: var(--z-color-primary-text);
  --btn-solid-border: var(--z-color-primary-solid);
  --btn-solid-border-hover: var(--z-color-primary-solid-hover);
  --btn-accent: var(--z-color-primary);
  --btn-soft: var(--z-color-primary-soft);
}

/* 中性实心（旧的 secondary）：底与描边都走容器色，不参与语义色 */
:host([tone="default"]) {
  --btn-solid-bg: var(--z-color-bg-secondary);
  --btn-solid-bg-hover: var(--z-color-hover);
  --btn-solid-bg-active: var(--z-color-hover);
  --btn-solid-fg: var(--z-color-text);
  --btn-solid-border: var(--z-color-border);
  --btn-solid-border-hover: var(--z-color-border-hover);
}

:host([tone="danger"]) {
  --btn-solid-bg: var(--z-color-danger-solid);
  --btn-solid-bg-hover: var(--z-color-danger-solid-hover);
  /* danger 没有 solid-active 令牌：悬停态即按下态（与拆分前的行为一致） */
  --btn-solid-bg-active: var(--z-color-danger-solid-hover);
  --btn-solid-fg: var(--z-color-danger-text);
  --btn-solid-border: var(--z-color-danger-solid);
  --btn-solid-border-hover: var(--z-color-danger-solid-hover);
  --btn-accent: var(--z-color-danger);
  --btn-soft: var(--z-color-danger-soft);
}

/* ── 外观（appearance）：只决定「怎么用这些颜色」 ── */

.z-button--solid {
  color: var(--btn-solid-fg);
  background-color: var(--btn-solid-bg);
  border-color: var(--btn-solid-border);
}
.z-button--solid:hover:not(:disabled) {
  background-color: var(--btn-solid-bg-hover);
  border-color: var(--btn-solid-border-hover);
}
.z-button--solid:active:not(:disabled) {
  /* [WHY 带 fallback] \`--btn-solid-bg-active\` 是组件局部钩子，不是全局令牌；
     某些 tone 没有「按下」档（danger），兜底到悬停色，避免 var() 解析失败导致背景消失 */
  background-color: var(--btn-solid-bg-active, var(--btn-solid-bg-hover));
  border-color: var(--btn-solid-bg-active, var(--btn-solid-border-hover));
}

.z-button--outline {
  color: var(--btn-accent);
  background-color: transparent;
  border-color: var(--btn-accent);
}
.z-button--outline:hover:not(:disabled) {
  /* [WHY] 不能直接引用 blue-50：不在暗色覆盖范围，暗色 hover 会闪出一块亮白 */
  background-color: var(--btn-soft);
}

.z-button--ghost {
  color: var(--z-color-text);
  background-color: transparent;
  border-color: transparent;
}
.z-button--ghost:hover:not(:disabled) {
  background-color: var(--z-color-bg-secondary);
}

.z-button--soft {
  color: var(--btn-accent);
  background-color: var(--btn-soft);
  border-color: transparent;
}

.z-button--link {
  color: var(--btn-accent);
  background-color: transparent;
  border-color: transparent;
  padding-inline: 0;
}
.z-button--link:hover:not(:disabled) {
  text-decoration: underline;
}

/* ── Sizes ── */

.z-button--sm {
  --z-button-font-size: var(--z-font-size-xs);
  --z-button-padding-y: var(--z-space-1);
  --z-button-padding-x: var(--z-space-3);
  --z-button-gap: var(--z-space-1);
}

.z-button--md {
  /* uses defaults */
}

.z-button--lg {
  --z-button-font-size: var(--z-font-size-md);
  --z-button-padding-y: var(--z-space-3);
  --z-button-padding-x: var(--z-space-5);
  --z-button-gap: var(--z-space-3);
}

/* ── Slots ── */

.z-button__prefix,
.z-button__suffix {
  display: inline-flex;
  align-items: center;
}
.z-button__prefix:empty,
.z-button__suffix:empty {
  display: none;
}

/* ── Spinner ── */

.z-button__spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: z-spin var(--z-duration-loop-fast) var(--z-ease-linear) infinite;
}

@keyframes z-spin {
  to { transform: rotate(360deg); }
}
`;var h=Object.defineProperty,i=(b,n,o,e)=>{for(var t=void 0,s=b.length-1,l;s>=0;s--)(l=b[s])&&(t=l(n,o,t)||t);return t&&h(n,o,t),t};const f={primary:["primary","solid"],secondary:["default","solid"],outline:["primary","outline"],ghost:["primary","ghost"],danger:["danger","solid"]},d=class d extends v{constructor(){super(...arguments),this.tone="primary",this.appearance="solid",this.size="md",this.disabled=!1,this.loading=!1,this.buttonType="button",this._onClick=n=>{if(this.disabled||this.loading){n.preventDefault(),n.stopPropagation();return}if(this.buttonType==="submit"||this.buttonType==="reset"){const o=this.closest("form");o&&this.buttonType==="submit"?(n.preventDefault(),o.requestSubmit()):o&&this.buttonType==="reset"&&(n.preventDefault(),o.reset())}this.emit("z-click")}}attributeChangedCallback(n,o,e){if(n==="variant"){const t=e?f[e]:void 0;t&&(p(this,"tone","tone",t[0]),p(this,"appearance","appearance",t[1]));return}super.attributeChangedCallback(n,o,e)}get variant(){return this.getAttribute("variant")??""}set variant(n){n?this.setAttribute("variant",n):this.removeAttribute("variant")}render(){const{appearance:n,size:o,disabled:e,loading:t,buttonType:s}=this,l=e||t;return c`
      <button
        class="z-button z-button--${n} z-button--${o}"
        type="${s}"
        ${l?"disabled":""}
        aria-disabled="${u(l)}"
        aria-busy="${u(t)}"
        part="button"
      >
        ${t?c`<span class="z-button__spinner" part="spinner"></span>`:""}
        <span class="z-button__prefix" part="prefix"><slot name="prefix"></slot></span>
        <span class="z-button__label" part="label"><slot></slot></span>
        <span class="z-button__suffix" part="suffix"><slot name="suffix"></slot></span>
      </button>
    `}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick)}};d.styles=g;let r=d;i([a({type:String})],r.prototype,"tone");i([a({type:String})],r.prototype,"appearance");i([a({type:String})],r.prototype,"size");i([a({type:Boolean})],r.prototype,"disabled");i([a({type:Boolean})],r.prototype,"loading");i([a({type:String,attribute:"type"})],r.prototype,"buttonType");z(r,"variant");customElements.define("z-button",r);
