import{B as p,h as a,e as d,p as i}from"./presets-CdaBrvJF.js";import{a as b}from"./a11y-DJ6wHu5s.js";const k=`/* ===== z-checkbox ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
  outline: none;
}

.z-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-2);
  cursor: pointer;
  user-select: none;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  outline: none;
}

.z-checkbox--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.z-checkbox:focus-visible .z-checkbox__box {
  box-shadow: var(--z-focus-ring-contrast);
}

/* ── Native input (hidden) ── */

.z-checkbox__native {
  position: absolute;
  width: 0; height: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Visual box ── */

.z-checkbox__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--z-color-border-control);
  border-radius: 3px;
  background: var(--z-color-bg);
  transition: all var(--z-transition-fast);
  flex-shrink: 0;
}

.z-checkbox--checked .z-checkbox__box,
.z-checkbox--indeterminate .z-checkbox__box {
  background: var(--z-color-primary);
  border-color: var(--z-color-primary);
  color: var(--z-color-primary-text);
}

.z-checkbox__icon {
  width: 12px;
  height: 12px;
}

/* ── Label ── */

.z-checkbox__label {
  line-height: var(--z-line-height);
}

.z-checkbox__label:empty {
  display: none;
}
`;var x=Object.defineProperty,o=(l,e,c,v)=>{for(var t=void 0,s=l.length-1,h;s>=0;s--)(h=l[s])&&(t=h(e,c,t)||t);return t&&x(e,c,t),t};const r=class r extends p{constructor(){super(...arguments),this.checked=!1,this.disabled=!1,this.indeterminate=!1,this.value="on",this.name="",this.invalid=!1,this._input=null,this._onClick=e=>{this.disabled||(e.preventDefault(),this.toggle())},this._onKey=e=>{(e.key===" "||e.key==="Enter")&&(e.preventDefault(),this.toggle())}}render(){const e=this.indeterminate?a`<svg class="z-checkbox__icon" viewBox="0 0 12 12" part="icon"><rect x="2" y="5" width="8" height="2" rx="0.5" fill="currentColor"/></svg>`:this.checked?a`<svg class="z-checkbox__icon" viewBox="0 0 12 12" part="icon"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`:"",c=["z-checkbox",this.checked?"z-checkbox--checked":"",this.indeterminate?"z-checkbox--indeterminate":"",this.disabled?"z-checkbox--disabled":""].filter(Boolean).join(" ");return a`
      <label class="${c}" part="root">
        <input
          type="checkbox"
          class="z-checkbox__native"
          name="${d(this.name)}"
          value="${d(this.value)}"
          ${this.checked?"checked":""}
          ${this.disabled?"disabled":""}
          aria-checked="${this.indeterminate?"mixed":b(this.checked)}"
          ${this.invalid?'aria-invalid="true"':""}
          part="native"
        />
        <span class="z-checkbox__box" part="box">${e}</span>
        <span class="z-checkbox__label" part="label"><slot></slot></span>
      </label>
    `}firstUpdated(){this._input=this.shadowRoot.querySelector(".z-checkbox__native"),this._input.indeterminate=this.indeterminate}updated(){this._input&&(this._input.checked=this.checked,this._input.indeterminate=this.indeterminate)}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick),this.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.removeEventListener("click",this._onClick),this.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}toggle(){this.disabled||(this.checked=!this.checked,this.indeterminate=!1,this.emit("z-change",{checked:this.checked}))}};r.styles=k;let n=r;o([i({type:Boolean})],n.prototype,"checked");o([i({type:Boolean})],n.prototype,"disabled");o([i({type:Boolean})],n.prototype,"indeterminate");o([i({type:String})],n.prototype,"value");o([i({type:String})],n.prototype,"name");o([i({type:Boolean})],n.prototype,"invalid");customElements.define("z-checkbox",n);
