import{B as v,h,p as i}from"./presets-CdaBrvJF.js";const z=`:host {
  display: block;
}

.z-card {
  display: flex;
  flex-direction: column;
  background: var(--z-color-surface);
  border-radius: var(--z-radius-lg);
  overflow: hidden;
  transition: box-shadow var(--z-transition-normal), transform var(--z-transition-fast);
}

.z-card--bordered {
  border: 1px solid var(--z-color-border);
}

.z-card--shadow {
  box-shadow: var(--z-shadow-md);
}

/* ── Clickable ── */

.z-card--clickable {
  cursor: pointer;
}

.z-card--clickable:hover {
  box-shadow: var(--z-shadow-lg);
}

.z-card--clickable:active {
  transform: scale(0.98);
}

/* 键盘用户的唯一可见反馈（issue IKXHH9）：\`:focus-visible\` 只在键盘聚焦时出现，
   鼠标点完不留框 —— 与库里其它可点件同一档 outline。 */
.z-card--clickable:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: 2px;
}

.z-card__cover:not(:empty) {
  display: block;
}

.z-card__cover ::slotted(img),
.z-card__cover ::slotted(video) {
  width: 100%;
  display: block;
}

.z-card__header {
  display: flex;
  align-items: center;
  padding: var(--z-space-3) var(--z-space-4);
  border-bottom: 1px solid var(--z-color-border);
  font-weight: var(--z-font-weight-semibold);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-card__header:empty {
  display: none;
}

.z-card__body {
  padding: var(--z-space-4);
  flex: 1;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  line-height: var(--z-line-height);
}

.z-card__footer {
  display: flex;
  align-items: center;
  padding: var(--z-space-3) var(--z-space-4);
  border-top: 1px solid var(--z-color-border);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
}

.z-card__footer:empty {
  display: none;
}
`;var p=Object.defineProperty,c=(l,e,o,s)=>{for(var r=void 0,t=l.length-1,n;t>=0;t--)(n=l[t])&&(r=n(e,o,r)||r);return r&&p(e,o,r),r};const f="button, a[href], input, select, textarea, z-button, [role='button'], [tabindex]",d=class d extends v{constructor(){super(...arguments),this.bordered=!1,this.shadow=!1,this.clickable=!1,this._onClick=e=>{this.clickable&&(this._innerInteractiveOf(e)||this.emit("z-click",{}))},this._onKeyDown=e=>{if(!this.clickable)return;const o=e;o.key!=="Enter"&&o.key!==" "||(o.preventDefault(),this.emit("z-click",{}))}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}_innerInteractiveOf(e){var s,r,t;const o=(s=this.shadowRoot)==null?void 0:s.querySelector(".z-card");for(const n of((r=e.composedPath)==null?void 0:r.call(e))??[]){if(n===o||n===this||n===this.shadowRoot)break;if(n instanceof Element&&((t=n.matches)!=null&&t.call(n,f)))return n}return null}render(){const e=["z-card",this.bordered?"z-card--bordered":"",this.shadow?"z-card--shadow":"",this.clickable?"z-card--clickable":""].filter(Boolean).join(" "),o=this.clickable?h`role="button" tabindex="0"`:"";return h`
      <div class="${e}" part="root" ${o}>
        <div class="z-card__cover" part="cover">
          <slot name="cover"></slot>
        </div>
        <div class="z-card__header" part="header">
          <slot name="header"></slot>
        </div>
        <div class="z-card__body" part="body">
          <slot></slot>
        </div>
        <div class="z-card__footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    `}};d.styles=z;let a=d;c([i({type:Boolean})],a.prototype,"bordered");c([i({type:Boolean})],a.prototype,"shadow");c([i({type:Boolean})],a.prototype,"clickable");customElements.define("z-card",a);
