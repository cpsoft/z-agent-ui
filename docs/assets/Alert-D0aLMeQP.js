import{B as g,h as o,e as v,p as s}from"./presets-CdaBrvJF.js";import{r as u}from"./vocabulary-DLBU9tdh.js";import{e as f,o as z}from"./a11y-DJ6wHu5s.js";import{C as b}from"./copy-DoHMT7Ic.js";const k=`:host {
  display: block;
}

:host([hidden]) {
  display: none;
}

.z-alert {
  display: flex;
  align-items: flex-start;
  gap: var(--z-space-3);
  padding: var(--z-space-3) var(--z-space-4);
  border-radius: var(--z-radius-md);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: var(--z-line-height);
  border-left: 3px solid;
}

/* [WHY] 2026-10-25 demo 优化时暴露：原实现 info 用 blue-50/blue-800（primitive，暗色不跟随）
   且边框用 --z-color-primary —— 换肤后出现「绿边框 + 蓝背景 + 蓝色硬编码图标」三色错配。
   统一为「soft 底 + 语义色描边 + strong 字」，图标走 currentColor（见 Alert.ts 的 accent 变量）。 */
.z-alert--info {
  --alert-accent: var(--z-color-info);
  background: var(--z-color-info-soft);
  border-color: var(--z-color-info);
  color: var(--z-color-info-strong);
}

.z-alert--success {
  --alert-accent: var(--z-color-success);
  background: var(--z-color-success-soft);
  border-color: var(--z-color-success);
  color: var(--z-color-success-strong);
}

.z-alert--warning {
  --alert-accent: var(--z-color-warning);
  background: var(--z-color-warning-soft);
  border-color: var(--z-color-warning);
  color: var(--z-color-warning-strong);
}

.z-alert--danger {
  --alert-accent: var(--z-color-danger);
  background: var(--z-color-danger-soft);
  border-color: var(--z-color-danger);
  color: var(--z-color-danger-strong);
}

.z-alert__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-top: 1px;
  /* 图标颜色跟随 variant 语义色，不再由 SVG 内的硬编码 stroke 决定 */
  color: var(--alert-accent, currentColor);
}

.z-alert__content {
  flex: 1;
  min-width: 0;
}

.z-alert__title {
  font-weight: var(--z-font-weight-semibold);
  margin-bottom: 2px;
}

.z-alert__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity var(--z-transition-fast), background var(--z-transition-fast);
  margin-top: 1px;
}

.z-alert__close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.08);
}

.z-alert__close svg {
  width: 14px;
  height: 14px;
}
`;var m=Object.defineProperty,i=(d,t,n,a)=>{for(var e=void 0,l=d.length-1,h;l>=0;l--)(h=d[l])&&(e=h(t,n,e)||e);return e&&m(t,n,e),e};const p={info:'<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 7v4M8 5h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',success:'<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',warning:'<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><path d="M1 14L8 2l7 12H1z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 7v3M8 12h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',danger:'<svg viewBox="0 0 16 16" width="16" height="16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M8 5v4M8 11h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'},_='<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M3 3l8 8M11 3l-8 8"/></svg>',c=class c extends g{constructor(){super(...arguments),this.tone="info",this.closable=!1,this.closeLabel=b.closeAlert,this._visible=!0,this._onClick=t=>{t.target.closest(".z-alert__close")&&this.hide()}}attributeChangedCallback(t,n,a){if(t==="variant"){const e=u(a);e&&e!=="default"&&e!=="primary"&&f(this,"tone","tone",e);return}super.attributeChangedCallback(t,n,a)}get variant(){return this.getAttribute("variant")??""}set variant(t){t?this.setAttribute("variant",t):this.removeAttribute("variant")}render(){if(!this._visible)return this.setAttribute("hidden",""),o`<div style="display:none" part="hidden"></div>`;this.removeAttribute("hidden");const t=p[this.tone]??p.info;return o`
      <div class="z-alert z-alert--${this.tone}" part="root" role="alert">
        <span class="z-alert__icon" part="icon">
          <slot name="icon">${t}</slot>
        </span>
        <div class="z-alert__content">
          ${this.title?o`<div class="z-alert__title" part="title">${v(this.title)}</div>`:""}
          <div class="z-alert__message" part="message">
            <slot></slot>
          </div>
        </div>
        ${this.closable?o`
          <button type="button" class="z-alert__close" part="close" aria-label="${v(this.closeLabel)}">
            ${_}
          </button>
        `:""}
      </div>
    `}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}show(){this._visible=!0,this.requestUpdate()}hide(){this._visible=!1,this.emit("z-alert-close"),this.requestUpdate()}};c.styles=k;let r=c;i([s({type:String})],r.prototype,"tone");i([s({type:Boolean})],r.prototype,"closable");i([s({type:String})],r.prototype,"title");i([s({type:String})],r.prototype,"closeLabel");z(r,"variant");customElements.define("z-alert",r);
