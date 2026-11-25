import{B as g,h as p,p as c}from"./presets-CdaBrvJF.js";import{r as z}from"./vocabulary-DLBU9tdh.js";import{e as b,o as f}from"./a11y-DJ6wHu5s.js";const u=`/* ===== z-badge ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
}

.z-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--z-font-sans);
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  border-radius: var(--z-radius-full);
  transition: background var(--z-transition-fast);
}

/* ── Sizes ── */

.z-badge--sm {
  font-size: 10px;
  padding: 2px 6px;
}

.z-badge--md {
  font-size: 12px;
  padding: 2px 10px;
}

/* ── Variants ── */

.z-badge--default {
  background: var(--z-color-bg-tertiary);
  color: var(--z-color-text);
}

.z-badge--primary {
  background: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

/* [WHY] audit 2026-10-25: soft 底 + strong 字全部走 token，暗色不再需要在组件内写第二套
   （原 #d1fae5/#047857 等 6 处裸 hex 已归入 --z-color-{success,warning,danger}-{soft,strong}） */
.z-badge--success {
  background: var(--z-color-success-soft);
  color: var(--z-color-success-strong);
}

.z-badge--warning {
  background: var(--z-color-warning-soft);
  color: var(--z-color-warning-strong);
}

.z-badge--danger {
  background: var(--z-color-danger-soft);
  color: var(--z-color-danger-strong);
}
`;var v=Object.defineProperty,d=(i,n,e,a)=>{for(var t=void 0,o=i.length-1,l;o>=0;o--)(l=i[o])&&(t=l(n,e,t)||t);return t&&v(n,e,t),t};const s=class s extends g{constructor(){super(...arguments),this.tone="default",this.size="md"}attributeChangedCallback(n,e,a){if(n==="variant"){const t=z(a);t&&b(this,"tone","tone",t);return}super.attributeChangedCallback(n,e,a)}get variant(){return this.getAttribute("variant")??""}set variant(n){n?this.setAttribute("variant",n):this.removeAttribute("variant")}render(){const n=["z-badge",`z-badge--${this.tone}`,`z-badge--${this.size}`].join(" ");return p`<span class="${n}" part="root"><slot></slot></span>`}};s.styles=u;let r=s;d([c({type:String})],r.prototype,"tone");d([c({type:String})],r.prototype,"size");f(r,"variant");customElements.define("z-badge",r);
