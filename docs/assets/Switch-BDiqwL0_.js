import{B as d,e as l,h as p,p as i}from"./presets-CdaBrvJF.js";const z=`/* ===== z-switch ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
  outline: none;
}

.z-switch {
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

.z-switch--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.z-switch:focus-visible .z-switch__track {
  box-shadow: var(--z-focus-ring-contrast);
}

/* ── Native input ── */

.z-switch__native {
  position: absolute;
  width: 0; height: 0;
  opacity: 0;
  pointer-events: none;
}

/* ── Track ── */

.z-switch__track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 36px;
  height: 20px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-track-strong);
  transition: background var(--z-transition-fast);
  flex-shrink: 0;
}

.z-switch--checked .z-switch__track {
  background: var(--z-color-primary);
}

.z-switch--sm .z-switch__track {
  width: 28px;
  height: 16px;
}

/* ── Thumb ── */

.z-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--z-color-white);
  box-shadow: var(--z-shadow-sm);
  transition: transform var(--z-transition-fast);
}

.z-switch--checked .z-switch__thumb {
  transform: translateX(16px);
}

.z-switch--sm .z-switch__thumb {
  width: 12px;
  height: 12px;
}

.z-switch--sm.z-switch--checked .z-switch__thumb {
  transform: translateX(12px);
}

/* ── Label ── */

.z-switch__label {
  line-height: var(--z-line-height);
}

.z-switch__label:empty {
  display: none;
}
`;var u=Object.defineProperty,s=(r,n,h,k)=>{for(var e=void 0,a=r.length-1,o;a>=0;a--)(o=r[a])&&(e=o(n,h,e)||e);return e&&u(n,h,e),e};const c=class c extends d{constructor(){super(...arguments),this.checked=!1,this.disabled=!1,this.size="md",this.value="on",this.name="",this.invalid=!1,this._onClick=n=>{this.disabled||(n.preventDefault(),this.toggle())},this._onKey=n=>{(n.key===" "||n.key==="Enter")&&(n.preventDefault(),this.toggle())}}render(){const n=["z-switch",this.checked?"z-switch--checked":"",this.disabled?"z-switch--disabled":"",`z-switch--${this.size}`].filter(Boolean).join(" ");return p`
      <label class="${n}" part="root">
        <input
          type="checkbox"
          class="z-switch__native"
          name="${l(this.name)}"
          value="${l(this.value)}"
          ${this.checked?"checked":""}
          ${this.disabled?"disabled":""}
          role="switch"
          aria-checked="${this.checked?"true":"false"}"
          ${this.invalid?'aria-invalid="true"':""}
          part="native"
        />
        <span class="z-switch__track" part="track">
          <span class="z-switch__thumb" part="thumb"></span>
        </span>
        <span class="z-switch__label" part="label"><slot></slot></span>
      </label>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick),this.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.removeEventListener("click",this._onClick),this.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}toggle(){this.disabled||(this.checked=!this.checked,this.emit("z-change",{checked:this.checked}))}};c.styles=z;let t=c;s([i({type:Boolean})],t.prototype,"checked");s([i({type:Boolean})],t.prototype,"disabled");s([i({type:String})],t.prototype,"size");s([i({type:String})],t.prototype,"value");s([i({type:String})],t.prototype,"name");s([i({type:Boolean})],t.prototype,"invalid");customElements.define("z-switch",t);
