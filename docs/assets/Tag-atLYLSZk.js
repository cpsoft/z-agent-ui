import{B as d,e as b,h as g,p as r}from"./presets-CdaBrvJF.js";import{r as u}from"./vocabulary-DLBU9tdh.js";import{e as h,o as v}from"./a11y-DJ6wHu5s.js";import{C as z}from"./copy-DoHMT7Ic.js";const f=`:host {
  display: inline-flex;
  vertical-align: middle;
}

.z-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-1);
  border-radius: var(--z-radius-full);
  font-family: var(--z-font-sans);
  font-weight: var(--z-font-weight-medium);
  line-height: 1;
  white-space: nowrap;
  user-select: none;
  transition: all var(--z-transition-fast);
}

.z-tag--md {
  padding: 2px 10px;
  font-size: var(--z-font-size-xs);
}

.z-tag--sm {
  padding: 1px 8px;
  font-size: 10px;
}

/* ── Variants ── */
.z-tag--default {
  background: var(--z-color-bg-tertiary);
  color: var(--z-color-gray-700);
}

/* [WHY] 2026-10-25：底与字原先直接引用原始色板（blue-50 底 + blue-700 字）。
   蓝/绿/黄/红阶不在暗色块覆盖范围 ⇒ 暗色下是「亮白底 + 深色字」，两者都脱离主题。
   改走 soft / strong 语义对：亮色深底深字、暗色淡底亮字，四种变体一次对齐。 */
.z-tag--primary {
  background: var(--z-color-primary-soft);
  color: var(--z-color-primary-strong);
}

.z-tag--success {
  background: var(--z-color-success-soft);
  color: var(--z-color-success-strong);
}

.z-tag--warning {
  background: var(--z-color-warning-soft);
  color: var(--z-color-warning-strong);
}

.z-tag--danger {
  background: var(--z-color-danger-soft);
  color: var(--z-color-danger-strong);
}

/* ── Disabled ── */
.z-tag[disabled] {
  opacity: 0.5;
  pointer-events: none;
}

/* ── Close button ── */
.z-tag__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity var(--z-transition-fast), background var(--z-transition-fast);
  margin-left: 2px;
}

.z-tag__close:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.1);
}

.z-tag__close svg {
  width: 10px;
  height: 10px;
  stroke: currentColor;
}
`;var m=Object.defineProperty,o=(c,n,a,s)=>{for(var t=void 0,i=c.length-1,p;i>=0;i--)(p=c[i])&&(t=p(n,a,t)||t);return t&&m(n,a,t),t};const y='<svg viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke-width="1.5" stroke-linecap="round"/></svg>',l=class l extends d{constructor(){super(...arguments),this.tone="default",this.size="md",this.closable=!1,this.disabled=!1,this.removeLabel=z.remove,this._onClick=n=>{n.target.closest(".z-tag__close")&&!this.disabled&&(n.stopPropagation(),this.emit("z-tag-close"))}}attributeChangedCallback(n,a,s){if(n==="variant"){const t=u(s);t&&h(this,"tone","tone",t);return}super.attributeChangedCallback(n,a,s)}get variant(){return this.getAttribute("variant")??""}set variant(n){n?this.setAttribute("variant",n):this.removeAttribute("variant")}render(){const n=`z-tag z-tag--${this.tone} z-tag--${this.size}`;return g`
      <span class="${n}" part="root" aria-disabled="${this.disabled?"true":"false"}" role="status">
        <span class="z-tag__label" part="label">
          <slot></slot>
        </span>
        ${this.closable?g`
          <button type="button" class="z-tag__close" part="close" aria-label="${b(this.removeLabel)}">
            ${y}
          </button>
        `:""}
      </span>
    `}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}};l.styles=f;let e=l;o([r({type:String})],e.prototype,"tone");o([r({type:String})],e.prototype,"size");o([r({type:Boolean})],e.prototype,"closable");o([r({type:Boolean})],e.prototype,"disabled");o([r({type:String})],e.prototype,"removeLabel");v(e,"variant");customElements.define("z-tag",e);
