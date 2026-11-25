import{B as y,e as c,h,p as a}from"./presets-CdaBrvJF.js";/* empty css             */import{a as J}from"./a11y-DJ6wHu5s.js";import"./Button-6M0Me5pu.js";import"./MNumberKeyboard-CypyDMeS.js";import"./MList-i4dayCk_.js";import{C as Wt}from"./copy-DoHMT7Ic.js";import"./Position-D6zl9ryN.js";import{p as ne,l as ie,r as Tt,u as It}from"./overlayManager-BcmTS8Jm.js";import{i as se}from"./shell-DwQ7nMfw.js";import"./vocabulary-DLBU9tdh.js";import"./afterAnimation-DHK-FZ_K.js";function X(i,t=2){if(i==null||i==="")return null;const e=typeof i=="number"?i:Number(String(i).trim());if(String(i).trim()===""||!Number.isFinite(e))return null;const s=Math.max(0,Math.min(6,Math.trunc(t))),n=Math.abs(e).toFixed(s),[o,r=""]=n.split(".");return{negative:e<0,int:o.replace(/\B(?=(\d{3})+(?!\d))/g,","),dec:r}}function Mt(i,t=2,e="¥"){const s=X(i,t);return s?`${s.negative?"-":""}${e}${s.int}${s.dec?"."+s.dec:""}`:""}const oe=`/* ===== m-price ===== */

:host {
  display: inline-block;
  -webkit-tap-highlight-color: transparent;
}

.m-price {
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  color: var(--z-color-price);
  font-family: var(--z-font-sans);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
}

/* 划线价：只换色与线，字号跟随传进来的档位 —— 原价通常比现价小一档，由调用方选 size。 */
.m-price--strike {
  color: var(--z-color-price-muted);
  text-decoration: line-through;
}

.m-price__main {
  display: inline-flex;
  align-items: baseline;
}

.m-price__sign,
.m-price__symbol,
.m-price__dec,
.m-price__suffix {
  font-weight: 500;
}

.m-price__int {
  font-weight: 600;
  letter-spacing: -0.01em;
}

.m-price--sm { font-size: var(--z-font-size-sm); }
.m-price--sm .m-price__symbol,
.m-price--sm .m-price__dec,
.m-price--sm .m-price__suffix { font-size: var(--z-font-size-xs); }

.m-price--md { font-size: var(--z-font-size-lg); }
.m-price--md .m-price__symbol,
.m-price--md .m-price__dec,
.m-price--md .m-price__suffix { font-size: var(--z-font-size-sm); }

.m-price--lg { font-size: var(--z-font-size-2xl); }
.m-price--lg .m-price__symbol,
.m-price--lg .m-price__dec,
.m-price--lg .m-price__suffix { font-size: var(--z-font-size-base); }

.m-price__suffix {
  margin-left: 2px;
  color: var(--z-color-text-secondary);
  font-weight: 400;
}

.m-price__empty {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
}
`;var re=Object.defineProperty,O=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&re(t,e,n),n};const gt=class gt extends y{constructor(){super(...arguments),this.value="",this.currency="¥",this.decimals=2,this.size="md",this.strike=!1,this.suffix="",this.emptyText="--"}render(){const t=X(this.value,this.decimals),e=["m-price",`m-price--${this.size}`,this.strike?"m-price--strike":"",t!=null&&t.negative?"m-price--negative":""].filter(Boolean).join(" ");return t?h`
      <span class="${e}" part="root" aria-label="${c(Mt(this.value,this.decimals,this.currency))}">
        <span class="m-price__main" aria-hidden="true">
          ${t.negative?'<span class="m-price__sign">-</span>':""}
          <span class="m-price__symbol">${c(this.currency)}</span>
          <span class="m-price__int">${t.int}</span>
          ${t.dec?`<span class="m-price__dec">.${t.dec}</span>`:""}
        </span>
        ${this.suffix?`<span class="m-price__suffix" aria-hidden="true">${c(this.suffix)}</span>`:""}
      </span>
    `:h`
        <span class="${e}" part="root" aria-label="${c(this.emptyText)}">
          <span class="m-price__empty" aria-hidden="true">${c(this.emptyText)}</span>
        </span>
      `}get valid(){return X(this.value,this.decimals)!==null}get text(){return Mt(this.value,this.decimals,this.currency)}};gt.styles=oe;let $=gt;O([a({type:String})],$.prototype,"value");O([a({type:String})],$.prototype,"currency");O([a({type:Number})],$.prototype,"decimals");O([a({type:String})],$.prototype,"size");O([a({type:Boolean})],$.prototype,"strike");O([a({type:String})],$.prototype,"suffix");O([a({type:String,attribute:"empty-text"})],$.prototype,"emptyText");customElements.define("m-price",$);const ae=`/* ===== m-checkbox ===== */

:host {
  display: inline-flex;
  -webkit-tap-highlight-color: transparent;
}

.m-checkbox {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-2);
  /* 44px 触控行：勾选是「一次点准」的操作，点在字上或圈上都算。 */
  min-height: var(--z-touch-min);
  padding-right: var(--z-space-2);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
}

/* 无文字（列表里的行首勾选）时只留方块本身，但命中区仍保 44px 见方。 */
.m-checkbox--bare {
  gap: 0;
  padding-right: 0;
  min-width: var(--z-touch-min);
  justify-content: center;
}

.m-checkbox__native {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.m-checkbox__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--z-color-border-control);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-surface);
  color: var(--z-color-primary-text);
  transition: background var(--z-duration-fast) var(--z-ease-standard),
              border-color var(--z-duration-fast) var(--z-ease-standard);
}

.m-checkbox__icon {
  width: 14px;
  height: 14px;
}

.m-checkbox--checked .m-checkbox__box,
.m-checkbox--indeterminate .m-checkbox__box {
  border-color: var(--z-color-primary);
  background: var(--z-color-primary);
}

.m-checkbox__label {
  flex: 1 1 auto;
  min-width: 0;
}

.m-checkbox--disabled {
  color: var(--z-color-text-disabled);
  cursor: default;
}

.m-checkbox--disabled .m-checkbox__box {
  border-color: var(--z-color-border);
  background: var(--z-color-fill-secondary);
  color: var(--z-color-text-disabled);
}

/* 键盘焦点：原生 input 被视觉隐藏，焦点环画到方块上（否则键盘用户看不见自己在哪）。 */
.m-checkbox__native:focus-visible + .m-checkbox__box {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .m-checkbox__box {
    transition: none;
  }
}
`;var ce=Object.defineProperty,V=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&ce(t,e,n),n};const bt=class bt extends y{constructor(){super(...arguments),this.checked=!1,this.disabled=!1,this.indeterminate=!1,this.value="",this.name="",this.label="",this._input=null,this._onClick=t=>{this.disabled||(t.preventDefault(),this.toggle())},this._onKey=t=>{const e=t.key;e!==" "&&e!=="Enter"||(t.preventDefault(),this.toggle())}}render(){const t=this.indeterminate?'<svg class="m-checkbox__icon" viewBox="0 0 14 14" aria-hidden="true"><path d="M3.5 7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>':this.checked?'<svg class="m-checkbox__icon" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 7.2l2.6 2.6L11 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>':"",e=["m-checkbox",this.checked?"m-checkbox--checked":"",this.indeterminate?"m-checkbox--indeterminate":"",this.disabled?"m-checkbox--disabled":"",this.label?"":"m-checkbox--bare"].filter(Boolean).join(" ");return h`
      <label class="${e}" part="root">
        <input
          type="checkbox"
          class="m-checkbox__native"
          name="${c(this.name)}"
          value="${c(this.value)}"
          ${this.checked?"checked":""}
          ${this.disabled?"disabled":""}
          aria-checked="${this.indeterminate?"mixed":J(this.checked)}"
          part="native"
        />
        <span class="m-checkbox__box" part="box">${t}</span>
        <span class="m-checkbox__label" part="label">${this.label?c(this.label):"<slot></slot>"}</span>
      </label>
    `}firstUpdated(){this._input=this.shadowRoot.querySelector(".m-checkbox__native"),this._input&&(this._input.indeterminate=this.indeterminate)}updated(){this._input&&(this._input.checked=this.checked,this._input.indeterminate=this.indeterminate)}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick),this.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.removeEventListener("click",this._onClick),this.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}toggle(){if(this.disabled)return;const t=!this.checked;this.checked=t,this.indeterminate=!1,this.emit("z-change",{checked:t,value:this.value})}};bt.styles=ae;let S=bt;V([a({type:Boolean})],S.prototype,"checked");V([a({type:Boolean})],S.prototype,"disabled");V([a({type:Boolean})],S.prototype,"indeterminate");V([a({type:String})],S.prototype,"value");V([a({type:String})],S.prototype,"name");V([a({type:String})],S.prototype,"label");customElements.define("m-checkbox",S);const le=`/* ===== m-radio ===== */

:host {
  display: inline-flex;
  -webkit-tap-highlight-color: transparent;
}

.m-radio {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-2);
  min-height: var(--z-touch-min);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  line-height: 1.4;
  cursor: pointer;
  user-select: none;
}

.m-radio--bare {
  gap: 0;
  min-width: var(--z-touch-min);
  justify-content: center;
}

.m-radio__native {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.m-radio__dot {
  position: relative;
  flex: none;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--z-color-border-control);
  border-radius: 50%;
  background: var(--z-color-surface);
  transition: border-color var(--z-duration-fast) var(--z-ease-standard);
}

/* 选中：环变主色，中间一颗实心点（用伪元素画，省一个 DOM 节点） */
.m-radio--checked .m-radio__dot {
  border-color: var(--z-color-primary);
}

.m-radio--checked .m-radio__dot::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--z-color-primary);
}

.m-radio__label {
  flex: 1 1 auto;
  min-width: 0;
}

.m-radio--disabled {
  color: var(--z-color-text-disabled);
  cursor: default;
}

.m-radio--disabled .m-radio__dot {
  border-color: var(--z-color-border);
  background: var(--z-color-fill-secondary);
}

.m-radio--disabled.m-radio--checked .m-radio__dot::after {
  background: var(--z-color-text-disabled);
}

.m-radio__native:focus-visible + .m-radio__dot {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .m-radio__dot {
    transition: none;
  }
}
`;var de=Object.defineProperty,ot=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&de(t,e,n),n};const yt=class yt extends y{constructor(){super(...arguments),this.checked=!1,this.disabled=!1,this.value="",this.label="",this._input=null,this._onClick=t=>{this.disabled||(t.preventDefault(),this.select())},this._onKey=t=>{const e=t.key;e!==" "&&e!=="Enter"||(t.preventDefault(),this.select())}}render(){const t=["m-radio",this.checked?"m-radio--checked":"",this.disabled?"m-radio--disabled":"",this.label?"":"m-radio--bare"].filter(Boolean).join(" ");return h`
      <label class="${t}" part="root">
        <input
          type="radio"
          class="m-radio__native"
          value="${c(this.value)}"
          ${this.checked?"checked":""}
          ${this.disabled?"disabled":""}
          part="native"
        />
        <span class="m-radio__dot" part="dot"></span>
        <span class="m-radio__label" part="label">${this.label?c(this.label):"<slot></slot>"}</span>
      </label>
    `}firstUpdated(){this._input=this.shadowRoot.querySelector(".m-radio__native")}updated(){this._input&&(this._input.checked=this.checked)}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick),this.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.removeEventListener("click",this._onClick),this.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}select(){this.disabled||this.checked||(this.checked=!0,this.emit("z-change",{value:this.value}))}};yt.styles=le;let q=yt;ot([a({type:Boolean})],q.prototype,"checked");ot([a({type:Boolean})],q.prototype,"disabled");ot([a({type:String})],q.prototype,"value");ot([a({type:String})],q.prototype,"label");customElements.define("m-radio",q);const he=`/* ===== m-radio-group ===== */

:host {
  display: block;
}

.m-radio-group {
  display: flex;
  gap: var(--z-space-1) var(--z-space-4);
}

.m-radio-group--column {
  flex-direction: column;
  gap: 0;
}

.m-radio-group--row {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
}
`;var pe=Object.defineProperty,vt=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&pe(t,e,n),n};const kt=class kt extends y{constructor(){super(...arguments),this.value="",this.direction="column",this.disabled=!1,this._onItemChange=t=>{const e=t.detail,s=(e==null?void 0:e.value)??"";!s||s===this.value||(this.value=s)}}_items(){return Array.from(this.querySelectorAll("m-radio"))}render(){return h`
      <div class="m-radio-group m-radio-group--${this.direction}" part="root" role="radiogroup">
        <slot></slot>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("z-change",this._onItemChange)}disconnectedCallback(){this.removeEventListener("z-change",this._onItemChange),super.disconnectedCallback()}updated(){this._sync(),Promise.resolve().then(()=>this._sync())}_sync(){for(const t of this._items()){const e=!!this.value&&t.getAttribute("value")===this.value;t.checked!==e&&(t.checked=e),this.disabled&&(t.disabled=!0)}}};kt.styles=he;let K=kt;vt([a({type:String})],K.prototype,"value");vt([a({type:String})],K.prototype,"direction");vt([a({type:Boolean})],K.prototype,"disabled");customElements.define("m-radio-group",K);const ue=`/* ===== m-tabs ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-tabs {
  display: flex;
  gap: var(--z-space-1);
  /* 横滑：页签多于 4 个时按内容宽排，容器自己滚，不压缩文字（压缩会截断「待发货」） */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-surface);
}

.m-tabs::-webkit-scrollbar {
  display: none;
}

.m-tabs--stretch .m-tabs__btn {
  flex: 1 1 0;
  min-width: 0;
}

.m-tabs__btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-1);
  flex: none;
  /* 44px：见组件头注释 */
  min-height: var(--z-touch-min);
  padding: 0 var(--z-space-3);
  border: 0;
  background: transparent;
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  white-space: nowrap;
  cursor: pointer;
}

.m-tabs__btn.is-active {
  color: var(--z-color-text);
  font-weight: 600;
}

/* 指示条画在按钮内底部，不额外占 DOM —— 横滑时它跟着按钮走，不需要 JS 算位置 */
.m-tabs__btn.is-active::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 24px;
  height: 2px;
  border-radius: 1px;
  background: var(--z-color-primary);
  transform: translateX(-50%);
}

.m-tabs__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--z-color-price);
  color: var(--z-color-primary-text);
  font-size: var(--z-font-size-xs);
  font-weight: 500;
  line-height: 1;
}

.m-tabs__btn:focus-visible {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: -2px;
}

.m-tabs--disabled .m-tabs__btn {
  cursor: default;
  opacity: 0.6;
}
`;var me=Object.defineProperty,rt=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&me(t,e,n),n};function _e(i){return Array.isArray(i)?i.filter(t=>t&&t.key):i.split(",").map(t=>t.trim()).filter(Boolean).map(t=>{const[e,s=e,n=""]=t.split("|").map(o=>o.trim());return{key:e,label:s||e,badge:n}})}const zt=class zt extends y{constructor(){super(...arguments),this.items="",this.active="",this.stretch=!1,this.disabled=!1,this._onClick=t=>{if(this.disabled)return;const e=(t.composedPath()[0]??t.target).closest("[data-key]");e&&this.select(e.dataset.key??"")},this._onKey=t=>{var d;if(this.disabled)return;const e=t.key;if(e!=="ArrowLeft"&&e!=="ArrowRight")return;const s=this._list;if(s.length<2)return;t.preventDefault();const n=this._activeIndex,o=e==="ArrowRight"?(n+1)%s.length:(n-1+s.length)%s.length;this.select(s[o].key);const r=(d=this.shadowRoot)==null?void 0:d.querySelector(`[data-index="${o}"]`);r==null||r.focus()}}get _list(){return _e(this.items)}get _activeIndex(){return Math.max(0,this._list.findIndex(t=>t.key===this.active))}render(){const t=this._list,e=this._activeIndex,s=["m-tabs",this.stretch?"m-tabs--stretch":"",this.disabled?"m-tabs--disabled":""].filter(Boolean).join(" "),n=t.map((o,r)=>{const d=r===e;return h`<button
          type="button"
          class="m-tabs__btn${d?" is-active":""}"
          role="tab"
          id="mtab-${r}"
          data-key="${c(o.key)}"
          data-index="${r}"
          aria-selected="${J(d)}"
          tabindex="${d?"0":"-1"}"
          ${this.disabled?"disabled":""}
          part="tab"
        >
          <span class="m-tabs__label">${c(o.label)}</span>
          ${o.badge!==void 0&&String(o.badge)!==""&&String(o.badge)!=="0"?`<span class="m-tabs__badge" part="badge">${c(String(o.badge))}</span>`:""}
        </button>`}).join("");return h`<div class="${s}" role="tablist" part="root">${n}</div>`}select(t){if(this.disabled)return;const e=this._list,s=e.findIndex(n=>n.key===t);s<0||e[s].key===this.active||(this.active=t,this.emit("z-change",{key:t,index:s}))}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick),this.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.removeEventListener("click",this._onClick),this.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}};zt.styles=ue;let R=zt;rt([a({type:String})],R.prototype,"items");rt([a({type:String})],R.prototype,"active");rt([a({type:Boolean})],R.prototype,"stretch");rt([a({type:Boolean})],R.prototype,"disabled");customElements.define("m-tabs",R);const fe=`/* ===== m-goods-card ===== */

:host {
  display: block;
  /* 两列网格里卡片必须可收缩：价格 / 销量是 nowrap，min-width:auto 会把列撑到溢出 */
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
}

.m-goods-card {
  position: relative;
  display: flex;
  flex-direction: column;
  /* 两列网格里等高：不等高时两张卡的价格行一高一低，扫视时读不出对比 */
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: var(--z-radius-lg);
  background: var(--z-color-surface);
}

.m-goods-card__media {
  position: relative;
  overflow: hidden;
  border-radius: var(--z-radius-lg);
  background: var(--z-color-fill-secondary);
}

.m-goods-card__img {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.m-goods-card__img--empty {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  /* 比 surface 深一档才看得出「这里本该有图」；gray-50 在白色卡片上几乎不可见 */
  background: var(--z-color-gray-100);
}

/* slot 默认 display:inline —— 宽度算 0，塞进去的块级内容会溢出到卡片外 */
slot[name="footer"] {
  display: block;
}

.m-goods-card__mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--z-color-bg-overlay);
  color: var(--z-color-white);
  font-size: var(--z-font-size-sm);
  letter-spacing: 1px;
}

.m-goods-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-1);
  min-width: 0;
  padding: var(--z-space-2) 0 0;
}

.m-goods-card__title {
  margin: 0;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: 500;
  line-height: 1.4;
  /* 两行截断：商品名普遍偏长，一行放不下、三行会把价格顶出可视区 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.m-goods-card__desc {
  margin: 0;
  overflow: hidden;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-goods-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.m-goods-card__tag {
  padding: 0 4px;
  border: 1px solid var(--z-color-danger-border);
  border-radius: var(--z-radius-sm);
  color: var(--z-color-price);
  font-size: var(--z-font-size-xs);
  line-height: 16px;
}

.m-goods-card__foot {
  display: flex;
  /* 一行放不下就换行：149px 宽的两列卡片里「¥19.90 ¥25 已售 1200 +」放不下一行，
     不换行时三者叠在一起（价格压着销量，读起来像掉字）。换行后销量与加购键落到第二行。 */
  flex-wrap: wrap;
  align-items: flex-end;
  gap: var(--z-space-1);
  row-gap: 2px;
  margin-top: auto;
}

.m-goods-card__prices {
  display: flex;
  /* 价格与划线价也是一样：窄卡里允许分成两行，别互相压 */
  flex-wrap: wrap;
  align-items: baseline;
  gap: 6px;
  row-gap: 0;
  min-width: 0;
}

.m-goods-card__price {
  color: var(--z-color-price);
  font-family: var(--z-font-sans);
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
  white-space: nowrap;
}

.m-goods-card__price .sym,
.m-goods-card__price .dec { font-size: var(--z-font-size-xs); font-weight: 500; }
.m-goods-card__price .int { font-size: var(--z-font-size-lg); font-weight: 600; }

.m-goods-card__price--sm .int { font-size: var(--z-font-size-base); }

.m-goods-card__origin {
  color: var(--z-color-price-muted);
  font-size: var(--z-font-size-xs);
  text-decoration: line-through;
  white-space: nowrap;
}

.m-goods-card__sales {
  margin-left: auto;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  white-space: nowrap;
}

.m-goods-card__add {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin-left: auto;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
  cursor: pointer;
}

/* 视觉 28px，命中区 44px：小圆点直接当点击目标太小，加购点不中是转化损失 */
.m-goods-card__add::before {
  content: "";
  position: absolute;
  inset: -8px;
}

.m-goods-card__add:active {
  opacity: 0.88;
}

.m-goods-card__add:focus-visible {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: 2px;
}

/* ── row：购物车 / 订单行 ── */
.m-goods-card--row {
  flex-direction: row;
  align-items: stretch;
  gap: var(--z-space-3);
}

.m-goods-card--row .m-goods-card__media {
  flex: none;
  width: 88px;
  border-radius: var(--z-radius-md);
}

.m-goods-card--row .m-goods-card__img {
  height: 88px;
  aspect-ratio: auto;
}

.m-goods-card--row .m-goods-card__body {
  flex: 1 1 auto;
  padding: 0;
}

.m-goods-card--out .m-goods-card__title,
.m-goods-card--out .m-goods-card__price {
  color: var(--z-color-text-disabled);
}
`;var ve=Object.defineProperty,k=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&ve(t,e,n),n};function ge(i){return Array.isArray(i)?i.filter(Boolean):i.split(/[,，|]/).map(t=>t.trim()).filter(Boolean)}const xt=class xt extends y{constructor(){super(...arguments),this.value="",this.title="",this.desc="",this.image="",this.price="",this.origin="",this.decimals=2,this.tags="",this.sales="",this.mode="grid",this.noAdd=!1,this.soldOut=!1,this._onClick=t=>{if((t.composedPath()[0]??t.target).closest("[part~='add']")){if(t.stopPropagation(),this.soldOut)return;this.emit("z-add",{value:this.value});return}this.emit("z-click",{value:this.value})}}_priceHtml(t,e,s){const n=X(t,this.decimals);return n?`<span class="m-goods-card__${e} m-goods-card__${e}--${s}">
      ${n.negative?"-":""}<span class="sym">¥</span><span class="int">${n.int}</span>${n.dec?`<span class="dec">.${n.dec}</span>`:""}
    </span>`:""}render(){const t=ge(this.tags),e=this.image?`<img class="m-goods-card__img" src="${c(this.image)}" alt="" loading="lazy" decoding="async" />`:'<span class="m-goods-card__img m-goods-card__img--empty" aria-hidden="true"></span>';return h`
      <div
        class="m-goods-card m-goods-card--${this.mode}${this.soldOut?" m-goods-card--out":""}"
        part="root"
        role="group"
        ${this.title?`aria-label="${c(this.title)}"`:""}
      >
        <div class="m-goods-card__media" part="media">
          ${e}
          ${this.soldOut?'<span class="m-goods-card__mask">已售罄</span>':""}
        </div>
        <div class="m-goods-card__body" part="body">
          <p class="m-goods-card__title" part="title">${c(this.title)}</p>
          ${this.desc?`<p class="m-goods-card__desc">${c(this.desc)}</p>`:""}
          ${t.length?`<div class="m-goods-card__tags">${t.map(s=>`<span class="m-goods-card__tag">${c(s)}</span>`).join("")}</div>`:""}
          <div class="m-goods-card__foot">
            <div class="m-goods-card__prices">
              ${this._priceHtml(this.price,"price","md")}
              ${this.origin!==""?this._priceHtml(this.origin,"origin","sm"):""}
            </div>
            ${this.sales?`<span class="m-goods-card__sales">${c(this.sales)}</span>`:""}
            ${this.noAdd||this.soldOut?"":`<button class="m-goods-card__add" type="button" aria-label="加入购物车" part="add" data-own-act="add">
                   <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                 </button>`}
          </div>
          <slot name="footer"></slot>
        </div>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("click",this._onClick),super.disconnectedCallback()}};xt.styles=fe;let p=xt;k([a({type:String})],p.prototype,"value");k([a({type:String})],p.prototype,"title");k([a({type:String})],p.prototype,"desc");k([a({type:String})],p.prototype,"image");k([a({type:String})],p.prototype,"price");k([a({type:String})],p.prototype,"origin");k([a({type:Number})],p.prototype,"decimals");k([a({type:String})],p.prototype,"tags");k([a({type:String})],p.prototype,"sales");k([a({type:String})],p.prototype,"mode");k([a({type:Boolean})],p.prototype,"noAdd");k([a({type:Boolean,attribute:"sold-out"})],p.prototype,"soldOut");customElements.define("m-goods-card",p);const be=`/* ===== m-checkout-bar ===== */

/*
  贴底与 m-action-bar 同一套约束（那三条失效原因见 action-bar.css 头部的说明）：
  祖先有 transform / contain:paint 会让 fixed 失效；页面要自己给底部留出空间。
  这里额外提供 \`inline\`：嵌进弹层或卡片时改成普通流。
*/
:host {
  position: var(--_pos, fixed);
  left: var(--_left, 0);
  right: var(--_right, 0);
  bottom: var(--_bottom, 0);
  z-index: var(--z-z-dropdown);
  display: block;
  -webkit-tap-highlight-color: transparent;
}

:host([inline]) {
  --_pos: static;
  --_left: auto;
  --_right: auto;
  --_bottom: auto;
}

.m-checkout-bar {
  display: flex;
  align-items: center;
  gap: var(--z-space-3);
  min-height: calc(var(--z-touch-min) + var(--z-space-4));
  padding: var(--z-space-2) var(--z-space-4);
  padding-bottom: calc(var(--z-space-2) + var(--z-safe-bottom));
  box-sizing: border-box;
  border-top: 1px solid var(--z-color-border);
  background: var(--z-color-bg);
}

.m-checkout-bar--inline {
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-lg);
}

/* ── 全选 ── */
.m-checkout-bar__check {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-2);
  flex: none;
  /* 44px 命中：与 m-checkbox 同一个下限 */
  min-height: var(--z-touch-min);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  cursor: pointer;
}

.m-checkout-bar__box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: 1.5px solid var(--z-color-border-control);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-surface);
  color: var(--z-color-primary-text);
}

.m-checkout-bar__check.is-on .m-checkout-bar__box {
  border-color: var(--z-color-primary);
  background: var(--z-color-primary);
}

/* ── 合计 ── */
.m-checkout-bar__sum {
  display: flex;
  align-items: baseline;
  gap: var(--z-space-1);
  flex: 1 1 auto;
  /* 窄屏先把「共 N 件」收掉、再压金额的两端留白：宁可少一句，也不能让合计溢出压住按钮 */
  min-width: 0;
  overflow: hidden;
  justify-content: flex-end;
}

/* inline 形态通常嵌在卡片里（宽度比贴底时更紧）：件数与「合计」二字都省掉，
   只留金额 —— 宁可少两个字，也不能让金额被裁或压住按钮 */
.m-checkout-bar--inline .m-checkout-bar__count,
.m-checkout-bar--inline .m-checkout-bar__label {
  display: none;
}

.m-checkout-bar__label {
  flex: none;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  white-space: nowrap;
}

.m-checkout-bar__amount {
  flex: none;
  color: var(--z-color-price);
  font-family: var(--z-font-sans);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}

.m-checkout-bar__amount .sym,
.m-checkout-bar__amount .dec {
  font-size: var(--z-font-size-sm);
  font-weight: 500;
}

.m-checkout-bar__amount .int {
  font-size: var(--z-font-size-xl);
}

.m-checkout-bar__amount--empty {
  color: var(--z-color-text-secondary);
  font-weight: 400;
}

.m-checkout-bar__count {
  flex: 0 1 auto;
  overflow: hidden;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── 主按钮 ── */
.m-checkout-bar__submit {
  flex: none;
  min-width: 104px;
  min-height: var(--z-touch-min);
  padding: 0 var(--z-space-5);
  border: 0;
  border-radius: 999px;
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  font-weight: 500;
  cursor: pointer;
}

.m-checkout-bar__submit:disabled {
  background: var(--z-color-fill-secondary);
  color: var(--z-color-text-disabled);
  cursor: default;
}

.m-checkout-bar__submit:focus-visible,
.m-checkout-bar__check:focus-visible {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: 2px;
}

.m-checkout-bar--disabled .m-checkout-bar__check {
  color: var(--z-color-text-disabled);
  cursor: default;
}
`;var ye=Object.defineProperty,E=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&ye(t,e,n),n};const wt=class wt extends y{constructor(){super(...arguments),this.checked=!1,this.indeterminate=!1,this.count=0,this.total="",this.decimals=2,this.disabled=!1,this.submitText="去结算",this.checkText="全选",this.inline=!1,this.noCheck=!1,this._onClick=t=>{var s;const e=(s=(t.composedPath()[0]??t.target).closest("[data-act]"))==null?void 0:s.getAttribute("data-act");if(e){if(e==="check"){if(this.disabled)return;const n=!this.checked;this.checked=n,this.indeterminate=!1,this.emit("z-check-all",{checked:n});return}this.count<=0||this.disabled||this.emit("z-submit",{count:this.count,total:this.total})}}}render(){const t=X(this.total,this.decimals),e=t!==null,s=!this.disabled&&this.count>0,n=["m-checkout-bar",this.inline?"m-checkout-bar--inline":"",this.disabled?"m-checkout-bar--disabled":""].filter(Boolean).join(" "),o=this.indeterminate?'<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3.5 7h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>':this.checked?'<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><path d="M3 7.2l2.6 2.6L11 4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>':"";return h`
      <div class="${n}" part="root" role="group" aria-label="结算">
        ${this.noCheck?"":`<button
               class="m-checkout-bar__check${this.checked||this.indeterminate?" is-on":""}"
               type="button"
               data-act="check"
               aria-pressed="${J(this.checked)}"
               ${this.disabled?"disabled":""}
               part="check"
             >
               <span class="m-checkout-bar__box" aria-hidden="true">${o}</span>
               <span class="m-checkout-bar__check-text">${c(this.checkText)}</span>
             </button>`}
        <div class="m-checkout-bar__sum" part="sum">
          <span class="m-checkout-bar__label">合计</span>
          ${e?`<span class="m-checkout-bar__amount" aria-label="${c(`${t.negative?"-":""}¥${t.int}${t.dec?"."+t.dec:""}`)}">
                 <span aria-hidden="true">${t.negative?"-":""}<span class="sym">¥</span><span class="int">${t.int}</span>${t.dec?`<span class="dec">.${t.dec}</span>`:""}</span>
               </span>`:'<span class="m-checkout-bar__amount m-checkout-bar__amount--empty">--</span>'}
          ${this.count>0?`<span class="m-checkout-bar__count">共 ${this.count} 件</span>`:""}
        </div>
        <button
          class="m-checkout-bar__submit"
          type="button"
          data-act="submit"
          ${s?"":"disabled"}
          part="submit"
        >${c(this.submitText)}</button>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("click",this._onClick),super.disconnectedCallback()}};wt.styles=be;let v=wt;E([a({type:Boolean})],v.prototype,"checked");E([a({type:Boolean})],v.prototype,"indeterminate");E([a({type:Number})],v.prototype,"count");E([a({type:String})],v.prototype,"total");E([a({type:Number})],v.prototype,"decimals");E([a({type:Boolean})],v.prototype,"disabled");E([a({type:String,attribute:"submit-text"})],v.prototype,"submitText");E([a({type:String,attribute:"check-text"})],v.prototype,"checkText");E([a({type:Boolean})],v.prototype,"inline");E([a({type:Boolean,attribute:"no-check"})],v.prototype,"noCheck");customElements.define("m-checkout-bar",v);const ke=`/* ===== m-swiper ===== */

:host {
  display: block;
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
}

.m-swiper {
  position: relative;
  overflow: hidden;
  /* 不写 height 时按 4:3 撑开：写死像素在 320~430 的屏宽上都别扭 */
  aspect-ratio: 4 / 3;
  border-radius: var(--z-m-radius);
  background: var(--z-color-fill-secondary);
  touch-action: pan-y;
}

/* 给了 height 就用它，不再看 aspect-ratio */
.m-swiper--fixed {
  aspect-ratio: auto;
  height: var(--m-swiper-h);
}

.m-swiper__viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.m-swiper__track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform var(--z-anim-duration-normal) var(--z-ease-standard);
}

/* 拖动跟手时不要过渡，否则每帧都从上一帧追过来，手感像拖着橡皮筋 */
.m-swiper.is-dragging .m-swiper__track {
  transition: none;
}

.m-swiper__slide {
  position: relative;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.m-swiper__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-drag: none;
  user-select: none;
}

.m-swiper__dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--z-space-2);
  display: flex;
  justify-content: center;
  gap: var(--z-space-1);
  pointer-events: none;
}

.m-swiper__dot {
  /* 视觉 6px，命中区 24px —— 圆点本身就小，靠 padding 撑出可点范围 */
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.m-swiper__dot::after {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-bg-secondary);
  opacity: 0.6;
  transition: width var(--z-anim-duration-fast) var(--z-ease-standard), opacity var(--z-anim-duration-fast);
}

.m-swiper__dot.is-active::after {
  width: 16px;
  opacity: 1;
}

.m-swiper__dot:focus-visible::after {
  outline: 2px solid var(--z-focus-ring-color);
  outline-offset: 2px;
}

.m-swiper__count {
  position: absolute;
  right: var(--z-space-3);
  bottom: var(--z-space-3);
  padding: 2px var(--z-space-2);
  border-radius: var(--z-radius-full);
  background: var(--z-color-bg-overlay);
  color: var(--z-color-inverse-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
}
`;var ze=Object.defineProperty,M=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&ze(t,e,n),n};const ct=6,xe=.2;function jt(i){return(Array.isArray(i)?i:String(i).split("|")).map(e=>String(e).trim()).filter(Boolean)}const $t=class $t extends y{constructor(){super(...arguments),this.items="",this.alt="",this.current=0,this.autoplay=0,this.loop=!0,this.indicator="dots",this.height="",this.label="图片轮播",this._prevIndex=-1,this._dragging=!1,this._fromDrag=!1,this._axis="none",this._startX=0,this._startY=0,this._deltaX=0,this._snap=()=>{var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".m-swiper__track");t&&this._translate(t,-this._index*this._vw,!0)},this._onTouchStart=t=>{if(this._list.length<2)return;const e=t.touches[0];e&&(this._dragging=!0,this._axis="none",this._startX=e.clientX,this._startY=e.clientY,this._deltaX=0,this._stopAuto())},this._onTouchMove=t=>{var _;if(!this._dragging)return;const e=t,s=e.touches[0];if(!s)return;const n=s.clientX-this._startX,o=s.clientY-this._startY;if(this._axis==="none"){if(Math.abs(n)<ct&&Math.abs(o)<ct)return;if(Math.abs(o)>=Math.abs(n)){this._dragging=!1,this._restartAuto();return}this._axis="x",(_=this.shadowRoot.querySelector(".m-swiper"))==null||_.classList.add("is-dragging")}e.preventDefault();let r=n;const d=this._index;!this.loop&&(d===0&&n>0||d===this._list.length-1&&n<0)&&(r=n/3),this._deltaX=r;const m=this.shadowRoot.querySelector(".m-swiper__track");m&&this._translate(m,-d*this._vw+r,!1)},this._onTouchEnd=()=>{var n;if(!this._dragging)return;this._dragging=!1,(n=this.shadowRoot.querySelector(".m-swiper"))==null||n.classList.remove("is-dragging");const t=this._deltaX,e=this._vw*xe,s=this._index;this._fromDrag=Math.abs(t)>=e,t<=-e?this.goTo(s+1):t>=e&&this.goTo(s-1),this._index===s&&(this._fromDrag=!1,this._snap()),this._restartAuto()},this._onClick=t=>{const e=t.target.closest("[data-goto]");if(e){this.goTo(Number(e.dataset.goto));return}if(!this._dragging){if(Math.abs(this._deltaX)>ct){this._deltaX=0;return}this.emit("z-click",{index:this._index})}},this._onKey=t=>{const e=t.key;e!=="ArrowLeft"&&e!=="ArrowRight"||(t.preventDefault(),e==="ArrowRight"?this.next():this.prev())}}get _list(){return jt(this.items)}get _alts(){return jt(this.alt)}get _index(){const t=this._list.length;return t===0?0:Math.min(t-1,Math.max(0,Math.trunc(this.current)||0))}get _vw(){var t,e;return((e=(t=this.shadowRoot)==null?void 0:t.querySelector(".m-swiper__viewport"))==null?void 0:e.offsetWidth)??0}render(){const t=this._list,e=this._alts,s=this._index,n=t.map((m,_)=>h`<div class="m-swiper__slide" part="slide" aria-hidden="${J(_!==s)}">
          <img class="m-swiper__img" src="${c(m)}" alt="${c(e[_]??"")}"
            loading="${_===0?"eager":"lazy"}" decoding="async" draggable="false" />
        </div>`).join(""),o=this.indicator==="dots"&&t.length>1?`<div class="m-swiper__dots" part="indicator">${t.map((m,_)=>`<button type="button" class="m-swiper__dot${_===s?" is-active":""}" data-goto="${_}"
                  aria-label="第 ${_+1} 张" aria-current="${J(_===s)}" part="dot"></button>`).join("")}</div>`:"",r=this.indicator==="number"&&t.length>1?`<div class="m-swiper__count" part="indicator">${s+1} / ${t.length}</div>`:"",d=["m-swiper",this.height?"m-swiper--fixed":"",this._dragging?"is-dragging":""].filter(Boolean).join(" ");return h`
      <div class="${d}" part="root" role="group" aria-roledescription="轮播"
        aria-label="${c(this.label)}"
        ${this.height?`style="--m-swiper-h:${c(this.height)}"`:""}>
        <div class="m-swiper__viewport" part="viewport">
          <div class="m-swiper__track">${n}</div>
        </div>
        ${o}${r}
      </div>
    `}connectedCallback(){super.connectedCallback();const t=this.shadowRoot;t.addEventListener("touchstart",this._onTouchStart,{passive:!0}),t.addEventListener("touchmove",this._onTouchMove,{passive:!1}),t.addEventListener("touchend",this._onTouchEnd),t.addEventListener("touchcancel",this._onTouchEnd),t.addEventListener("click",this._onClick),t.addEventListener("keydown",this._onKey),window.addEventListener("resize",this._snap),this._restartAuto()}disconnectedCallback(){const t=this.shadowRoot;t.removeEventListener("touchstart",this._onTouchStart),t.removeEventListener("touchmove",this._onTouchMove),t.removeEventListener("touchend",this._onTouchEnd),t.removeEventListener("touchcancel",this._onTouchEnd),t.removeEventListener("click",this._onClick),t.removeEventListener("keydown",this._onKey),window.removeEventListener("resize",this._snap),this._stopAuto(),super.disconnectedCallback()}updated(){const t=this.shadowRoot.querySelector(".m-swiper__track");if(!t)return;const e=this._index;if(this._fromDrag){this._fromDrag=!1,this._prevIndex=e,this._translate(t,-e*this._vw,!0);return}if(this._prevIndex===e||this._prevIndex<0){this._translate(t,-e*this._vw,!1),this._prevIndex=e;return}this._translate(t,-this._prevIndex*this._vw,!1),this._prevIndex=e,t.offsetWidth,this._translate(t,-e*this._vw,!0)}goTo(t,e={}){const s=this._list.length;if(s<2)return;let n=t;if(n<0||n>=s){if(!this.loop)return;n=(n+s)%s}n!==this._index&&(this.current=n,e.silent||this.emit("z-change",{index:n}),this._restartAuto())}next(){this.goTo(this._index+1)}prev(){this.goTo(this._index-1)}_translate(t,e,s){t.style.transition=s?"":"none",t.style.transform=`translate3d(${e}px, 0, 0)`}_restartAuto(){this._stopAuto(),!(!this.autoplay||this._list.length<2)&&(typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches||(this._timer=window.setInterval(()=>{this._dragging||this.goTo(this._index+1,{silent:!1})},Math.max(1e3,this.autoplay))))}_stopAuto(){this._timer!==void 0&&(window.clearInterval(this._timer),this._timer=void 0)}};$t.styles=ke;let x=$t;M([a({type:String,attribute:"items",reflect:!1})],x.prototype,"items");M([a({type:String,attribute:"alt",reflect:!1})],x.prototype,"alt");M([a({type:Number})],x.prototype,"current");M([a({type:Number})],x.prototype,"autoplay");M([a({type:Boolean})],x.prototype,"loop");M([a({type:String})],x.prototype,"indicator");M([a({type:String})],x.prototype,"height");M([a({type:String})],x.prototype,"label");customElements.define("m-swiper",x);const we=`/* ===== m-sku-picker ===== */

:host {
  position: fixed;
  inset: 0;
  z-index: var(--z-z-modal);
  -webkit-tap-highlight-color: transparent;
  /* 隐藏态整块不能挡触摸：host 是 fixed 全屏盒子，不透传会吃掉整页点击 */
  pointer-events: none;
}

.m-sku__overlay {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  background: var(--z-color-bg-overlay);
  animation: m-sku-fade-in var(--z-anim-duration-fast) var(--z-ease-standard);
}

.m-sku__panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 85vh;
  background: var(--z-color-bg-secondary);
  border-radius: var(--z-radius-lg) var(--z-radius-lg) 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  box-shadow: var(--z-shadow-lg);
  outline: none;
  animation: m-sku-slide-up var(--z-anim-duration-normal) var(--z-ease-standard);
}

.m-sku__head {
  position: relative;
  display: flex;
  gap: var(--z-space-3);
  padding: var(--z-space-4);
  border-bottom: 1px solid var(--z-color-border);
}

.m-sku__media {
  flex: none;
  width: 88px;
  height: 88px;
  overflow: hidden;
  border-radius: var(--z-radius-md);
  background: var(--z-color-gray-100);
}

.m-sku__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.m-sku__img--empty {
  background: var(--z-color-gray-100);
}

.m-sku__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--z-space-1);
  /* 价格与已选文案都可能很长，必须可收缩，否则把关闭按钮挤出屏幕 */
  flex: 1 1 auto;
  min-width: 0;
  padding-right: 36px;
}

.m-sku__picked,
.m-sku__stock {
  margin: 0;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: 1.4;
  color: var(--z-color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.m-sku__stock {
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-placeholder);
}

.m-sku__close {
  position: absolute;
  top: var(--z-space-1);
  right: var(--z-space-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--z-touch-min);
  height: var(--z-touch-min);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
}

.m-sku__body {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-4);
  /* 规格一多就得自己滚；min-height:0 缺了会把 foot 顶出面板 */
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--z-space-4);
  -webkit-overflow-scrolling: touch;
}

.m-sku__group {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-2);
}

.m-sku__name {
  margin: 0;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  font-weight: var(--z-font-weight-medium);
  line-height: 1.4;
}

.m-sku__opts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--z-space-2);
}

.m-sku__opt {
  min-height: 36px;
  padding: 0 var(--z-space-4);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-full);
  background: var(--z-color-fill-secondary);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: 1.2;
  cursor: pointer;
  transition: background var(--z-anim-duration-fast) var(--z-ease-standard),
    border-color var(--z-anim-duration-fast) var(--z-ease-standard);
}

.m-sku__opt.is-active {
  border-color: var(--z-color-primary);
  background: var(--z-color-primary-soft);
  color: var(--z-color-primary);
  font-weight: var(--z-font-weight-medium);
}

/* 不可选：降价透明度而不是纯灰 —— 灰字在白底上会被读成「已禁用但可以点」 */
.m-sku__opt:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.m-sku__foot {
  display: flex;
  align-items: center;
  gap: var(--z-space-3);
  padding: var(--z-space-3) var(--z-space-4);
  border-top: 1px solid var(--z-color-border);
}

.m-sku__qty {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  flex: none;
}

.m-sku__qty-label {
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  white-space: nowrap;
}

.m-sku__confirm {
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--z-touch-min);
  padding: 0 var(--z-space-4);
  border: none;
  border-radius: var(--z-radius-full);
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  font-weight: var(--z-font-weight-medium);
  cursor: pointer;
}

/* 不可点：主色降透明度而不是换浅灰底 —— 浅灰按钮在白面板上看着像一行文字，
   用户不知道这里本该有个按钮 */
.m-sku__confirm:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

@keyframes m-sku-fade-in {
  from {
    background: transparent;
  }
}

@keyframes m-sku-slide-up {
  from {
    transform: translateY(100%);
  }
}
`;var $e=Object.defineProperty,z=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&$e(t,e,n),n};function Ee(i){return Array.isArray(i)?i.filter(t=>t&&t.key):String(i).split("|").map(t=>t.trim()).filter(Boolean).map(t=>{const e=t.indexOf(":"),s=(e<0?t:t.slice(0,e)).trim(),o=(e<0?"":t.slice(e+1)).split(/[,，]/).map(r=>r.trim()).filter(Boolean);return{key:s,label:s,options:o}})}function Se(i){if(i&&typeof i=="object")return{...i};const t={};for(const e of String(i).split("|")){const s=e.indexOf("=");if(s<0)continue;const n=e.slice(0,s).trim(),o=e.slice(s+1).trim();n&&o&&(t[n]=o)}return t}function Le(i){return typeof i=="string"?i:i.value}function Ce(i){return typeof i=="string"?i:i.label??i.value}const Et=class Et extends y{constructor(){super(...arguments),this.visible=!1,this.title="选择规格",this.image="",this.price="",this.origin="",this.stock=0,this.groups="",this.skus=[],this.selected="",this.qty=1,this.confirmText="加入购物车",this.hideQty=!1,this._wasVisible=!1,this._onClick=t=>{var n;const e=t.target;if((n=e.classList)!=null&&n.contains("m-sku__overlay")){this.close();return}if(e.closest("[part~='close']")){this.close();return}if(e.closest("[part~='confirm']")){if(!this._complete||this._stock===0)return;this.emit("z-confirm",this._detail()),this.close();return}const s=e.closest("[data-group]");if(s){if(s.disabled)return;this.select(s.dataset.group??"",s.dataset.value??"")}},this._onStepper=t=>{const e=t.detail,s=e==null?void 0:e.value;typeof s=="number"&&s!==this.qty&&(this.qty=s,this.emit("z-change",this._detail()))},this._onKey=t=>{t.key==="Escape"&&(t.preventDefault(),this.close())}}get _groups(){if(this.groups)return Ee(this.groups);const t=[],e=new Map;for(const s of this.skus)for(const[n,o]of Object.entries(s.specs??{})){e.has(n)||(e.set(n,[]),t.push(n));const r=e.get(n);r.includes(o)||r.push(o)}return t.map(s=>({key:s,label:s,options:e.get(s)??[]}))}get _selectedMap(){return Se(this.selected)}get _complete(){const t=this._selectedMap;return this._groups.every(e=>!!(t[e.key]??"").trim())}get _currentSku(){if(!this.skus.length||!this._complete)return;const t=this._selectedMap;return this.skus.find(e=>Object.keys(t).every(s=>{var n;return((n=e.specs)==null?void 0:n[s])===t[s]}))}get _price(){const t=this._currentSku;return(t==null?void 0:t.price)??this.price}get _stock(){var t;return this.skus.length?this._complete?Math.max(0,Math.trunc(((t=this._currentSku)==null?void 0:t.stock)??0)):-1:Math.max(0,Math.trunc(this.stock))}_usable(t,e){const s=this._selectedMap;if(s[t.key]===e||!this.skus.length)return!0;const n={...s,[t.key]:e};return this.skus.some(o=>(o.stock??0)<=0?!1:Object.entries(n).every(([r,d])=>{var m;return!d||((m=o.specs)==null?void 0:m[r])===d}))}render(){var Bt;if(!this.visible)return h`<div style="display:none" part="hidden"></div>`;const t=this._groups,e=this._selectedMap,s=this._stock,n=s>=0?s:void 0,o=Math.max(1,Math.min(this.qty,n??this.qty)),r=this._complete,d=r?t.map(f=>e[f.key]).join(" · "):`请选择 ${t.filter(f=>!(e[f.key]??"").trim()).map(f=>f.label??f.key).join(" / ")}`,m=((Bt=this._currentSku)==null?void 0:Bt.image)||this.image,_=!r||s===0,Gt=t.map(f=>{const te=f.options.map(tt=>{const at=Le(tt),At=e[f.key]===at,ee=!(typeof tt=="object"&&!!tt.disabled)&&this._usable(f,at);return`<button type="button" class="m-sku__opt${At?" is-active":""}"
              data-group="${c(f.key)}" data-value="${c(at)}"
              aria-pressed="${At?"true":"false"}" ${ee?"":"disabled"}
              part="option">${c(Ce(tt))}</button>`}).join("");return`<section class="m-sku__group">
          <h4 class="m-sku__name">${c(f.label??f.key)}</h4>
          <div class="m-sku__opts">${te}</div>
        </section>`}).join("");return h`
      <div class="m-sku__overlay" part="overlay">
        <div class="m-sku__panel" part="panel" role="dialog" aria-modal="true"
          aria-label="${c(this.title)}" tabindex="-1">
          <header class="m-sku__head">
            <div class="m-sku__media" part="media">
              ${m?`<img class="m-sku__img" src="${c(m)}" alt="" />`:'<span class="m-sku__img m-sku__img--empty" aria-hidden="true"></span>'}
            </div>
            <div class="m-sku__info">
              <m-price value="${c(String(this._price))}" size="lg" part="price"></m-price>
              ${this.origin!==""?`<m-price value="${c(String(this.origin))}" size="sm" strike></m-price>`:""}
              <p class="m-sku__picked" part="picked">${r?`已选：${c(d)}`:c(d)}</p>
              ${s>=0?`<p class="m-sku__stock">库存 ${s} 件</p>`:""}
            </div>
            <button type="button" class="m-sku__close" part="close" aria-label="${Wt.close}">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </button>
          </header>
          <div class="m-sku__body" part="body">${Gt}</div>
          <footer class="m-sku__foot" part="foot">
            ${this.hideQty?"":`<div class="m-sku__qty">
                   <span class="m-sku__qty-label">数量</span>
                   <m-stepper value="${o}" min="1" ${n!==void 0?`max="${n}"`:""}></m-stepper>
                 </div>`}
            <button type="button" class="m-sku__confirm" part="confirm" ${_?"disabled":""}>
              ${c(r?this.confirmText:"请选择规格")}
            </button>
          </footer>
        </div>
      </div>
    `}updated(){const t=this.shadowRoot.querySelector(".m-sku__panel"),e=this.visible&&!this._wasVisible;this._wasVisible=this.visible,t&&e&&t.focus({preventScroll:!0})}connectedCallback(){super.connectedCallback();const t=this.shadowRoot;t.addEventListener("click",this._onClick),t.addEventListener("keydown",this._onKey),t.addEventListener("z-change",this._onStepper)}disconnectedCallback(){const t=this.shadowRoot;t.removeEventListener("click",this._onClick),t.removeEventListener("keydown",this._onKey),t.removeEventListener("z-change",this._onStepper),super.disconnectedCallback()}open(){this.visible||(this.visible=!0,this.emit("z-open",{}))}close(){this.visible&&(this.visible=!1,this.emit("z-close",{selected:this._selectedMap,qty:this.qty}))}select(t,e){if(!this._groups.find(o=>o.key===t))return;const n=this._selectedMap;n[t]!==e&&(n[t]=e,this.selected=n,this._syncQty(),this.emit("z-change",this._detail()))}_syncQty(){const t=this._resolve();this.qty=t.qty}_resolve(){const t=this._stock,e=t>=0?t:Number.POSITIVE_INFINITY;return{selected:this._selectedMap,qty:Math.max(1,Math.min(this.qty,e)),stock:t<0?null:t,price:this._price,complete:this._complete,sku:this._currentSku}}_detail(){return this._resolve()}};Et.styles=we;let u=Et;z([a({type:Boolean})],u.prototype,"visible");z([a({type:String})],u.prototype,"title");z([a({type:String})],u.prototype,"image");z([a({type:String})],u.prototype,"price");z([a({type:String})],u.prototype,"origin");z([a({type:Number})],u.prototype,"stock");z([a({type:String,attribute:"groups",reflect:!1})],u.prototype,"groups");z([a({attribute:!1})],u.prototype,"skus");z([a({type:String,attribute:"selected",reflect:!1})],u.prototype,"selected");z([a({type:Number})],u.prototype,"qty");z([a({type:String})],u.prototype,"confirmText");z([a({type:Boolean})],u.prototype,"hideQty");customElements.define("m-sku-picker",u);const Be=`/* ===== m-image-preview ===== */

:host {
  position: fixed;
  inset: 0;
  z-index: var(--z-z-popover);
  -webkit-tap-highlight-color: transparent;
  /* 隐藏态不能挡触摸：host 是 fixed 全屏盒子 */
  pointer-events: none;
}

.mpv {
  pointer-events: auto;
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  /* 看图器在明暗两套主题里都是黑底：gray-900 在暗色主题下会变成近白，
     图片放上去反而糊成一团 */
  background: var(--z-color-black);
  touch-action: none;
  animation: mpv-fade-in var(--z-anim-duration-fast) var(--z-ease-standard);
}

.mpv__stage {
  flex: 1 1 auto;
  position: relative;
  overflow: hidden;
  /* 下滑关闭时整块跟手（由 JS 写 --mpv-dy） */
  transform: translate3d(0, var(--mpv-dy, 0px), 0);
}

.mpv__track {
  display: flex;
  height: 100%;
  will-change: transform;
  transition: transform var(--z-anim-duration-normal) var(--z-ease-standard);
}

.mpv__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.mpv__img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  -webkit-user-drag: none;
  user-select: none;
  will-change: transform;
}

.mpv__count {
  position: absolute;
  top: calc(env(safe-area-inset-top) + var(--z-space-3));
  left: 50%;
  transform: translateX(-50%);
  /* 不画胶囊底：叠在纯黑上等于看不见，只剩一圈糊边 */
  color: var(--z-color-white);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.mpv__close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + var(--z-space-1));
  right: var(--z-space-1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--z-touch-min);
  height: var(--z-touch-min);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--z-color-white);
  cursor: pointer;
}

.mpv__close:focus-visible {
  outline: 2px solid var(--z-color-white);
  outline-offset: -4px;
  border-radius: var(--z-radius-full);
}

@keyframes mpv-fade-in {
  from {
    opacity: 0;
  }
}
`;var Ae=Object.defineProperty,Z=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&Ae(t,e,n),n};const qt=6,Te=.2,Ie=80,Rt=3;function Ot(i){return(Array.isArray(i)?i:String(i).split("|")).map(e=>String(e).trim()).filter(Boolean)}const St=class St extends y{constructor(){super(...arguments),this.items="",this.alt="",this.current=0,this.visible=!1,this.label="查看大图",this.loop=!0,this._wasVisible=!1,this._prevIndex=-1,this._scale=1,this._tx=0,this._ty=0,this._ox=50,this._oy=50,this._startX=0,this._startY=0,this._dx=0,this._dy=0,this._axis="none",this._pinchFrom=0,this._pinchScale=1,this._touching=!1,this._moved=!1,this._movedAt=0,this._onTouchStart=t=>{const e=t;this._touching=!0,this._moved=!1,this._dx=0,this._dy=0,this._axis="none";const s=e.touches[0];s&&(this._startX=s.clientX,this._startY=s.clientY,e.touches.length>=2&&(this._pinchFrom=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY),this._pinchScale=this._scale))},this._onTouchMove=t=>{const e=t;if(!this._touching)return;if(e.touches.length>=2&&this._pinchFrom>0){e.preventDefault();const r=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);this._scale=Math.max(1,Math.min(Rt,this._pinchScale*r/this._pinchFrom)),this._moved=!0,this._movedAt=Date.now(),this._applyZoom();return}const s=e.touches[0];if(!s)return;const n=s.clientX-this._startX,o=s.clientY-this._startY;if(this._axis==="none"){if(Math.abs(n)<qt&&Math.abs(o)<qt)return;this._scale>1?this._axis="pan":Math.abs(o)>Math.abs(n)?this._axis="v":this._axis="h"}if(this._scale>1){e.preventDefault();const r=this._clampPan(this._tx+n,this._ty+o);this._tx=r.x,this._ty=r.y,this._dx=n,this._dy=o,this._moved=!0,this._movedAt=Date.now(),this._applyZoom();return}if(this._axis==="h"){e.preventDefault(),this._dx=n,this._moved=!0,this._movedAt=Date.now();const r=this.shadowRoot.querySelector(".mpv__track");if(r){const d=!this.loop&&this._index===0&&n>0||!this.loop&&this._index===this._list.length-1&&n<0;this._moveTrack(r,-this._index*this._vw+(d?n/3:n),!1)}}else if(this._axis==="v"){e.preventDefault(),this._dy=o,this._moved=!0;const r=this.shadowRoot.querySelector(".mpv");r&&r.style.setProperty("--mpv-dy",`${o}px`)}},this._onTouchEnd=()=>{var e,s;if(!this._touching)return;this._touching=!1;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".mpv");if(t==null||t.style.removeProperty("--mpv-dy"),this._scale>1){this._scale<1.05&&(this._resetZoom(),this._applyZoom());return}if(this._axis==="v"&&Math.abs(this._dy)>Ie){this.close();return}if(this._axis==="h"){const n=this._vw*Te,o=this._index;if(this._dx<=-n?this.goTo(o+1):this._dx>=n&&this.goTo(o-1),this._index===o){const r=(s=this.shadowRoot)==null?void 0:s.querySelector(".mpv__track");r&&this._moveTrack(r,-this._index*this._vw,!0)}}},this._onClick=t=>{if(t.target.closest("[part~='close']")){this.close();return}if(this._moved&&Date.now()-this._movedAt<700){this._moved=!1;return}this._scale>1||this.close()},this._onKey=t=>{this.visible&&(t.key==="ArrowLeft"?(t.preventDefault(),this.prev()):t.key==="ArrowRight"?(t.preventDefault(),this.next()):t.key==="+"||t.key==="="?(t.preventDefault(),this._scale=Math.min(Rt,this._scale+.5),this._applyZoom()):t.key==="-"?(t.preventDefault(),this._scale=Math.max(1,this._scale-.5),this._scale===1&&this._resetZoom(),this._applyZoom()):t.key==="0"&&(this._resetZoom(),this._applyZoom()))},this._onResize=()=>{var e;const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".mpv__track");t&&this._moveTrack(t,-this._index*this._vw,!1),this._applyZoom()}}get _list(){return Ot(this.items)}get _alts(){return Ot(this.alt)}get _index(){const t=this._list.length;return t===0?0:Math.min(t-1,Math.max(0,Math.trunc(this.current)||0))}get zoom(){return this._scale}get closeOnEscape(){return this.visible}render(){if(!this.visible)return h`<div style="display:none" part="hidden"></div>`;const t=this._list,e=this._alts,s=this._index,n=t.map((o,r)=>`<div class="mpv__slide" part="slide" data-slide="${r}">
          <img class="mpv__img" src="${c(o)}" alt="${c(e[r]??"")}"
            draggable="false" data-img="${r}" />
        </div>`).join("");return h`
      <div class="mpv" part="root" role="dialog" aria-modal="true"
        aria-label="${c(this.label)}">
        <div class="mpv__stage" part="stage">
          <div class="mpv__track" part="track">${n}</div>
        </div>
        <div class="mpv__count" part="count">${s+1} / ${t.length}</div>
        <button type="button" class="mpv__close" part="close" aria-label="${Wt.close}">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `}updated(){const t=this.visible&&!this._wasVisible,e=!this.visible&&this._wasVisible;if(this._wasVisible=this.visible,t?(this._resetZoom(),ne(this),ie(),document.addEventListener("keydown",this._onKey),this.emit("z-open",{index:this._index})):e&&(Tt(this),It(),document.removeEventListener("keydown",this._onKey)),!this.visible)return;const s=this.shadowRoot.querySelector(".mpv__track");if(!s)return;const n=this._index;this._prevIndex!==n&&this._prevIndex>=0?(this._moveTrack(s,-this._prevIndex*this._vw,!1),s.offsetWidth,this._moveTrack(s,-n*this._vw,!0)):this._moveTrack(s,-n*this._vw,!1),this._prevIndex=n,this._applyZoom()}connectedCallback(){super.connectedCallback();const t=this.shadowRoot;t.addEventListener("touchstart",this._onTouchStart,{passive:!0}),t.addEventListener("touchmove",this._onTouchMove,{passive:!1}),t.addEventListener("touchend",this._onTouchEnd),t.addEventListener("touchcancel",this._onTouchEnd),t.addEventListener("click",this._onClick),window.addEventListener("resize",this._onResize)}disconnectedCallback(){const t=this.shadowRoot;t.removeEventListener("touchstart",this._onTouchStart),t.removeEventListener("touchmove",this._onTouchMove),t.removeEventListener("touchend",this._onTouchEnd),t.removeEventListener("touchcancel",this._onTouchEnd),t.removeEventListener("click",this._onClick),window.removeEventListener("resize",this._onResize),this.visible&&(Tt(this),It(),document.removeEventListener("keydown",this._onKey)),super.disconnectedCallback()}open(t){typeof t=="number"&&(this.current=t),!this.visible&&(this.visible=!0)}close(){this.visible&&(this.visible=!1,this.emit("z-close",{index:this._index}))}goTo(t){const e=this._list.length;if(e<2)return;let s=t;if(s<0||s>=e){if(!this.loop)return;s=(s+e)%e}s!==this._index&&(this.current=s,this.emit("z-change",{index:s}))}next(){this.goTo(this._index+1)}prev(){this.goTo(this._index-1)}get _vw(){var t,e;return((e=(t=this.shadowRoot)==null?void 0:t.querySelector(".mpv__stage"))==null?void 0:e.offsetWidth)??0}_moveTrack(t,e,s){t.style.transition=s?"":"none",t.style.transform=`translate3d(${e}px, 0, 0)`}_resetZoom(){this._scale=1,this._tx=0,this._ty=0,this._ox=50,this._oy=50,this._axis="none"}_applyZoom(){const t=this.shadowRoot;if(!t)return;t.querySelectorAll("[data-img]").forEach((s,n)=>{if(n!==this._index){s.style.transform="";return}s.style.transform=this._scale===1&&this._tx===0&&this._ty===0?"":`translate3d(${this._tx}px, ${this._ty}px, 0) scale(${this._scale})`,s.style.transformOrigin=`${this._ox}% ${this._oy}%`})}_clampPan(t,e){var m;const s=(m=this.shadowRoot)==null?void 0:m.querySelector(".mpv__stage"),n=(s==null?void 0:s.offsetWidth)??0,o=(s==null?void 0:s.offsetHeight)??0,r=n*(this._scale-1)/2,d=o*(this._scale-1)/2;return{x:Math.max(-r,Math.min(r,t)),y:Math.max(-d,Math.min(d,e))}}};St.styles=Be;let L=St;Z([a({type:String,attribute:"items",reflect:!1})],L.prototype,"items");Z([a({type:String,attribute:"alt",reflect:!1})],L.prototype,"alt");Z([a({type:Number})],L.prototype,"current");Z([a({type:Boolean})],L.prototype,"visible");Z([a({type:String})],L.prototype,"label");Z([a({type:Boolean})],L.prototype,"loop");customElements.define("m-image-preview",L);const Me=`/* ===== m-countdown ===== */

:host {
  display: inline-block;
}

.m-countdown {
  display: inline-flex;
  align-items: baseline;
  gap: var(--z-space-1);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: 1.4;
  /* 等宽数字：少了这一条，每到 1→0 / 9→0 整块文字就左右抖一下 */
  font-variant-numeric: tabular-nums;
}

.m-countdown__label {
  color: var(--z-color-text-secondary);
}

.m-countdown__head {
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
}

.m-countdown__clock {
  letter-spacing: 0.5px;
}
`;var je=Object.defineProperty,G=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&je(t,e,n),n};function B(i){return i<10?`0${i}`:String(i)}function qe(i){const t=String(i).trim();if(!t)return Number.NaN;if(/^\d+$/.test(t))return Number(t);const e=/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(t);return e?new Date(Number(e[1]),Number(e[2])-1,Number(e[3]),Number(e[4]??0),Number(e[5]??0),Number(e[6]??0)).getTime():Date.parse(t)}const Lt=class Lt extends y{constructor(){super(...arguments),this.deadline="",this.seconds=0,this.format="hms",this.paused=!1,this.label="",this._anchorMs=0,this._anchorSec=0,this._ended=!1,this._lastKey="",this._tick=()=>{if(this.remaining<=0){this._finish();return}this.requestUpdate()},this._onVisibility=()=>{document.hidden?this._stop():this._start()}}get _targetMs(){const t=qe(this.deadline);return Number.isFinite(t)?t:(this._anchorSec!==this.seconds&&(this._anchorSec=this.seconds,this._anchorMs=Date.now()+Math.max(0,this.seconds)*1e3),this._anchorMs)}get remaining(){const t=this._targetMs-Date.now();return t>0?Math.ceil(t/1e3):0}connectedCallback(){super.connectedCallback(),document.addEventListener("visibilitychange",this._onVisibility),this._start()}disconnectedCallback(){this._stop(),document.removeEventListener("visibilitychange",this._onVisibility),super.disconnectedCallback()}updated(){const t=`${this.deadline}|${this.seconds}|${this.paused}`;t!==this._lastKey&&(this._lastKey=t,this.remaining>0&&(this._ended=!1),this._start())}render(){const t=this.remaining,{head:e,clock:s}=this._split(t);return h`
      <div class="m-countdown" part="root" role="timer" aria-live="off"
        aria-label="${c(this.label?`${this.label} ${s}`:s)}">
        ${this.label?`<span class="m-countdown__label" part="label">${c(this.label)}</span>`:""}
        ${e?`<span class="m-countdown__head" part="day">${e}</span>`:""}
        <span class="m-countdown__clock" part="clock">${s}</span>
      </div>
    `}_split(t){const e=Math.max(0,Math.trunc(t)),s=Math.floor(e/86400),n=Math.floor(e%86400/3600),o=Math.floor(e%3600/60),r=e%60;return this.format==="ms"?{head:"",clock:`${B(Math.floor(e/60))}:${B(r)}`}:this.format==="dhms"?{head:s>0?`${s} 天`:"",clock:`${B(n)}:${B(o)}:${B(r)}`}:{head:"",clock:`${B(Math.floor(e/3600))}:${B(o)}:${B(r)}`}}_start(){if(this._stop(),!(this.paused||!this.isConnected)){if(this.remaining<=0){this._finish();return}this._timer=window.setInterval(this._tick,1e3)}}_stop(){this._timer!==void 0&&(window.clearInterval(this._timer),this._timer=void 0)}_finish(){this._stop(),this.requestUpdate(),!this._ended&&(this._ended=!0,this.emit("z-end",{}))}};Lt.styles=Me;let I=Lt;G([a({type:String})],I.prototype,"deadline");G([a({type:Number})],I.prototype,"seconds");G([a({type:String})],I.prototype,"format");G([a({type:Boolean})],I.prototype,"paused");G([a({type:String})],I.prototype,"label");customElements.define("m-countdown",I);const Re=`/* ===== m-coupon ===== */

:host {
  display: block;
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
}

/*
  缺口颜色：券边缘的半圆是「与页面同色的圆」盖上去的（CSS 无法真的挖洞），
  所以底色不是 \`--z-color-bg\` 时要覆盖 --m-coupon-cut。
*/
.m-coupon {
  /* 缺口要跟**页面**同色（卡片是 surface、页面是 bg-secondary），填 surface 就会
     在白卡边缘留两个白点。 */
  --m-coupon-cut: var(--z-color-bg-secondary);
  /* 面额区宽度：缺口位置与它对齐，两处必须用同一个值，写死两次迟早错位 */
  --m-coupon-face: 84px;
  position: relative;
  display: flex;
  align-items: stretch;
  min-height: 88px;
  overflow: hidden;
  border-radius: var(--z-radius-md);
  background: var(--z-color-surface);
  box-shadow: var(--z-shadow-sm);
}

.m-coupon.is-clickable {
  cursor: pointer;
}

.m-coupon__face {
  flex: none;
  width: var(--m-coupon-face);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--z-space-2) var(--z-space-1);
  background: var(--z-color-danger-soft);
  color: var(--z-color-price);
  text-align: center;
}

.m-coupon__amount {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 1px;
}

.m-coupon__sym {
  font-size: var(--z-font-size-sm);
}

.m-coupon__num {
  font-family: var(--z-font-sans);
  /* 面额是这张券的主角，必须压过标题 —— 用 2xl 而不是再往上，否则「¥1,280」会溢出 */
  font-size: var(--z-font-size-2xl);
  font-weight: var(--z-font-weight-semibold);
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.m-coupon__unit {
  font-size: var(--z-font-size-sm);
}

.m-coupon__word {
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-lg);
  font-weight: var(--z-font-weight-semibold);
}

.m-coupon__cond {
  color: var(--z-color-price);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  line-height: 1.3;
}

.m-coupon__body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  /* 说明文字可能很长，必须可收缩，否则把操作区挤出卡片 */
  flex: 1 1 auto;
  min-width: 0;
  padding: var(--z-space-3);
  border-left: 1px dashed var(--z-color-border);
}

.m-coupon__title,
.m-coupon__desc,
.m-coupon__valid {
  margin: 0;
  font-family: var(--z-font-sans);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.m-coupon__title {
  color: var(--z-color-text);
  font-size: var(--z-font-size-base);
  font-weight: var(--z-font-weight-medium);
}

.m-coupon__desc {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
}

/* 有效期允许折行（不截断）：到期日被裁成「2026-11-01 至 2…」等于没写 */
.m-coupon__valid {
  color: var(--z-color-text-placeholder);
  font-size: var(--z-font-size-xs);
}

.m-coupon__side {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: var(--z-space-2);
}

.m-coupon__action {
  min-height: 32px;
  padding: 0 var(--z-space-2);
  border: none;
  border-radius: var(--z-radius-full);
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  white-space: nowrap;
  cursor: pointer;
}

.m-coupon__action:active {
  opacity: 0.88;
}

/* 已用 / 已过期：不画按钮，盖一枚斜印章 —— 券还在列表里，
   用户要能一眼看出「这张为什么不能用」 */
.m-coupon__stamp {
  padding: 2px var(--z-space-2);
  border: 1px solid var(--z-color-text-disabled);
  border-radius: var(--z-radius-sm);
  color: var(--z-color-text-disabled);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  white-space: nowrap;
  transform: rotate(-16deg);
}

/* 失效态整体降饱和（缺口不动：它是「挖掉」的部分，跟着变灰就是一块脏点） */
.m-coupon.is-dead .m-coupon__face {
  background: var(--z-color-fill-secondary);
  color: var(--z-color-text-disabled);
}

.m-coupon.is-dead .m-coupon__cond,
.m-coupon.is-dead .m-coupon__title {
  color: var(--z-color-text-secondary);
}

.m-coupon__cut {
  position: absolute;
  left: var(--m-coupon-face);
  width: 12px;
  height: 12px;
  border-radius: var(--z-radius-full);
  background: var(--m-coupon-cut);
  transform: translateX(-50%);
  pointer-events: none;
}

.m-coupon__cut--top {
  top: -6px;
}

.m-coupon__cut--bottom {
  bottom: -6px;
}
`;var Oe=Object.defineProperty,C=(i,t,e,s)=>{for(var n=void 0,o=i.length-1,r;o>=0;o--)(r=i[o])&&(n=r(t,e,n)||n);return n&&Oe(t,e,n),n};function U(i,t){const e=X(i,2);if(!e)return"";if(t)return e.dec==="00"?e.int:`${e.int}.${e.dec}`;const s=e.dec.replace(/0+$/,"");return s?`${e.int}.${s}`:e.int}const Ct=class Ct extends y{constructor(){super(...arguments),this.kind="amount",this.value="",this.threshold="0",this.title="",this.desc="",this.valid="",this.status="available",this.action="",this.clickable=!1,this._onClick=t=>{if((t.composedPath()[0]??t.target).closest("[part~='action']")){if(t.stopPropagation(),!this._usable)return;this.emit("z-action",{kind:this.kind,value:this.value,title:this.title});return}!this.clickable||!this._usable||this.emit("z-click",{kind:this.kind,value:this.value,title:this.title})}}get _usable(){return this.status==="available"}get _stamp(){return this.status==="used"?"已使用":this.status==="expired"?"已过期":""}_face(){if(this.kind==="freight")return'<div class="m-coupon__amount"><span class="m-coupon__word">免运费</span></div>';const t=c(U(this.value,this.kind==="amount"));return`<div class="m-coupon__amount">${this.kind==="discount"?`<span class="m-coupon__num">${t}</span><span class="m-coupon__unit">折</span>`:`<span class="m-coupon__sym">¥</span><span class="m-coupon__num">${t}</span>`}</div>`}_cond(){const t=Number(this.threshold);return!Number.isFinite(t)||t<=0?"无门槛":`满 ${U(t,!0)} 可用`}render(){const t=["m-coupon",`m-coupon--${this.kind}`,this._usable?"is-usable":"is-dead",this.clickable?"is-clickable":""].filter(Boolean).join(" "),e=["优惠券",this.title,this.kind==="freight"?"免运费":this.kind==="discount"?`${U(this.value,!1)} 折`:`满 ${U(this.threshold,!0)} 减 ${U(this.value,!0)}`,this._usable?"":this._stamp].filter(Boolean).join("，");return h`
      <div class="${t}" part="root" role="group" aria-label="${c(e)}"
        aria-disabled="${this._usable?"false":"true"}">
        <div class="m-coupon__face" part="face">
          ${this._face()}
          <div class="m-coupon__cond" part="condition">${c(this._cond())}</div>
        </div>
        <div class="m-coupon__body" part="body">
          <p class="m-coupon__title" part="title">${c(this.title)}</p>
          ${this.desc?`<p class="m-coupon__desc">${c(this.desc)}</p>`:""}
          ${this.valid?`<p class="m-coupon__valid">${c(this.valid)}</p>`:""}
        </div>
        <div class="m-coupon__side" part="side">
          ${this._usable?this.action?`<button type="button" class="m-coupon__action" part="action" data-own-act="coupon">${c(this.action)}</button>`:'<slot name="side"></slot>':`<span class="m-coupon__stamp" part="stamp">${this._stamp}</span>`}
        </div>
        <span class="m-coupon__cut m-coupon__cut--top" aria-hidden="true"></span>
        <span class="m-coupon__cut m-coupon__cut--bottom" aria-hidden="true"></span>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("click",this._onClick),super.disconnectedCallback()}};Ct.styles=Re;let b=Ct;C([a({type:String})],b.prototype,"kind");C([a({type:String})],b.prototype,"value");C([a({type:String})],b.prototype,"threshold");C([a({type:String})],b.prototype,"title");C([a({type:String})],b.prototype,"desc");C([a({type:String})],b.prototype,"valid");C([a({type:String})],b.prototype,"status");C([a({type:String})],b.prototype,"action");C([a({type:Boolean})],b.prototype,"clickable");customElements.define("m-coupon",b);const Qt=new URLSearchParams(location.search);Qt.get("view")==="screen"&&document.documentElement.setAttribute("data-screen","");const A=Qt.get("only");var Nt,Dt,Xt,Kt;if(A){document.documentElement.setAttribute("data-solo",A);const i=Array.from(document.querySelectorAll(".h5kit-phone")),t=i.find(e=>e.dataset.tag===A||e.querySelector(`[data-tag="${A}"]`));for(const e of i){const s=e===t;if(e.hidden=!s,!!s){if(e.dataset.tag===A){(Nt=e.querySelector("m-navbar"))==null||Nt.setAttribute("title",A);const n=e.querySelector(".h5kit-sec__t");n&&(n.textContent=((Dt=n.textContent)==null?void 0:Dt.replace(/^m-[a-z0-9-]+\s*·\s*/,"").trim())??"");continue}for(const n of e.querySelectorAll(".h5kit-sec")){if(n.hidden=n.dataset.tag!==A,n.hidden)continue;const o=n.querySelector(".h5kit-sec__t");if(o){const r=((Xt=o.textContent)==null?void 0:Xt.replace(/^m-[a-z0-9-]+\s*·\s*/,"").trim())??"";o.textContent=r,o.hidden=r.length===0}}(Kt=e.querySelector("m-navbar"))==null||Kt.setAttribute("title",A)}}}const Jt=document.documentElement.hasAttribute("data-screen");function Pe(i){const t=i?document.querySelector(`#k-${CSS.escape(i)}, [data-tag="${CSS.escape(i)}"]`):null;if(!Jt){t?t.scrollIntoView({block:"start",behavior:"smooth"}):window.scrollTo({top:0,behavior:"smooth"});return}const e=Array.from(document.querySelectorAll(".h5kit-phone")),s=(t==null?void 0:t.closest(".h5kit-phone"))??e[0];for(const r of e)r.toggleAttribute("data-current",r===s);const n=s==null?void 0:s.querySelector(".h5kit-phone__scroll");if(!n)return;if(!t){n.scrollTo({top:0,behavior:"smooth"});return}const o=t.getBoundingClientRect().top-n.getBoundingClientRect().top+n.scrollTop;n.scrollTo({top:Math.max(0,o),behavior:"smooth"})}var Yt;Jt&&((Yt=document.querySelector(".h5kit-phone"))==null||Yt.setAttribute("data-current",""));window.addEventListener("message",i=>{if(i.origin!==location.origin)return;const t=i.data;(t==null?void 0:t.type)==="h5-show"&&Pe(t.tag??"")});const H=document.getElementById("log");function l(i,t){const e=H.querySelector(".h5kit-log__empty");e&&e.remove();const s=document.createElement("div");for(s.className="h5kit-log__item",s.innerHTML=`<b>${i}</b> ${JSON.stringify(t)}`,H.prepend(s);H.children.length>40;)H.lastElementChild.remove()}document.getElementById("clear").addEventListener("click",()=>{H.innerHTML='<span class="h5kit-log__empty">点一下左边任意控件…</span>'});function Ne(i,t){for(const e of i.composedPath())if(e instanceof HTMLElement&&e.tagName.toLowerCase()===t)return e;return null}document.querySelectorAll("m-navbar").forEach(i=>{i.addEventListener("z-back",()=>l("m-navbar z-back",{}))});const Pt=document.getElementById("notice");Pt.addEventListener("z-close",i=>{l("m-notice-bar z-close",i.detail),Pt.remove()});const Q=document.getElementById("search");Q.addEventListener("z-input",i=>{const{value:t}=i.detail;l("m-search z-input",{value:t}),Q.value!==t&&(Q.value=t)});Q.addEventListener("z-search",i=>l("m-search z-search",i.detail));Q.addEventListener("z-clear",()=>l("m-search z-clear",{}));document.querySelectorAll("m-grid-item").forEach(i=>{i.addEventListener("z-click",t=>{var e;l("m-grid-item z-click",{label:(e=Ne(t,"m-grid-item"))==null?void 0:e.label})})});document.querySelectorAll("m-cell").forEach(i=>{i.addEventListener("z-click",t=>{l("m-cell z-click",t.detail),i.id==="pickCell"&&(Y.open=!0),i.id==="amountCell"&&(g.open=!0)})});const et=document.getElementById("chips");et==null||et.addEventListener("z-click",i=>{const t=i.target.closest("m-chip");if(t){l("m-chip z-click",{label:t.getAttribute("label")});for(const e of et.querySelectorAll("m-chip"))e.removeAttribute("selected");t.setAttribute("selected","")}});for(const i of document.querySelectorAll("m-card"))for(const t of["z-click","z-longpress"])i.addEventListener(t,()=>{var s;const e=((s=i.querySelector(".ex-card-hd"))==null?void 0:s.textContent)??"卡片";l(`m-card ${t}`,{title:e,...t==="z-longpress"?{hold:"800ms"}:{}})});var Vt;(Vt=document.querySelector("m-collapse"))==null||Vt.addEventListener("z-toggle",i=>{l("m-collapse z-toggle",i.detail)});var Zt;(Zt=document.querySelector("m-list"))==null||Zt.addEventListener("z-loadmore",()=>{l("m-list z-loadmore",{})});const De=[{key:"home",label:"首页"},{key:"order",label:"订单",badge:12},{key:"stock",label:"库存"},{key:"me",label:"我的"}],F=document.getElementById("tabbar");F&&(F.setAttribute("items",JSON.stringify(De)),F.setAttribute("active","home"),F.addEventListener("z-change",i=>{const t=i.detail.key;l("m-tabbar z-change",{key:t}),F.setAttribute("active",t)}));var Ut;(Ut=document.getElementById("fab"))==null||Ut.addEventListener("z-click",()=>{l("m-floating-button z-click",{})});const nt=document.getElementById("refresh");nt&&nt.addEventListener("z-refresh",()=>{l("m-pull-refresh z-refresh",{}),nt.setAttribute("refreshing",""),window.setTimeout(()=>nt.removeAttribute("refreshing"),900)});const w=document.getElementById("sheet");var Ft;(Ft=document.getElementById("sheetOpen"))==null||Ft.addEventListener("click",()=>{if(!w)return;const i=[{label:"修改数量",value:"qty"},{label:"复制门店",value:"copy"},{label:"删除门店",value:"remove",danger:!0}];w.actions=i,w.setAttribute("visible",""),l("m-action-sheet open",{actions:i.length})});w==null||w.addEventListener("z-select",i=>{l("m-action-sheet z-select",i.detail)});w==null||w.addEventListener("z-action-sheet-close",()=>{w.removeAttribute("visible")});const Xe=[document.getElementById("step1"),document.getElementById("step2")];Xe.forEach(i=>{i.addEventListener("z-change",t=>{const e=t.detail;l(`m-stepper z-change #${i.id}`,e),!Number.isInteger(e.value)&&String(e.value).length>6&&l("⚠️ 浮点噪声",{raw:String(e.value)})})});const Y=document.getElementById("picker");Y.options=[{value:"hz",label:"杭州"},{value:"nb",label:"宁波"},{value:"wz",label:"温州"}];Y.value="";Y.addEventListener("z-confirm",i=>{const t=i.detail;l("m-picker z-confirm",t),Y.value=t.value,document.getElementById("pickCell").value=t.label});Y.addEventListener("z-cancel",i=>l("m-picker z-cancel",i.detail));document.querySelectorAll("m-swipe-cell").forEach(i=>{const t=i.id==="sw1";for(const e of["z-swipe-open","z-swipe-close","z-before-close"])i.addEventListener(e,s=>{if(e==="z-before-close"&&t&&(s.preventDefault(),!i.hasAttribute("data-confirmed"))){i.setAttribute("data-confirmed",""),l("m-swipe-cell z-before-close 已拦截",{willCloseIn:"1s"}),setTimeout(()=>{i.removeAttribute("data-confirmed"),i.close()},1e3);return}l(`m-swipe-cell ${e}`,{})});i.addEventListener("click",e=>{var n;const s=e.target.closest("[slot='actions']");s&&l("m-swipe-cell 操作",{label:(n=s.textContent)==null?void 0:n.trim(),row:s.dataset.tag})})});var Ht;(Ht=document.getElementById("ib"))==null||Ht.addEventListener("z-index-change",i=>{l("m-index-bar z-index-change",i.detail)});const g=document.getElementById("kb"),st=document.getElementById("amountCell");g==null||g.addEventListener("z-input",i=>{const t=i.detail;st&&(st.value=t.value),l("m-number-keyboard z-input",t)});g==null||g.addEventListener("z-delete",i=>{const t=i.detail;st&&(st.value=t.value||"0.00"),l("m-number-keyboard z-delete",t)});g==null||g.addEventListener("z-extra",i=>{l("m-number-keyboard z-extra（确定）",i.detail),g&&(g.open=!1)});const j=document.getElementById("up");j.addEventListener("z-select",i=>{const{files:t}=i.detail;l("m-uploader z-select",{count:t.length,names:t.map(e=>e.name)}),j.files=[...j.files,...t.map(e=>({name:e.name,url:e.url??""}))].slice(0,j.max)});j.addEventListener("z-remove",i=>{const{index:t}=i.detail;l("m-uploader z-remove",{index:t}),j.files=j.files.filter((e,s)=>s!==t)});const T=document.getElementById("up-shot"),ft=new Map;T.addEventListener("z-select",i=>{const{files:t,source:e}=i.detail;l("m-uploader z-select（拍摄）",{source:e,count:t.length,names:t.map(n=>n.name),kb:t.reduce((n,o)=>n+o.size,0)/1024});const s=t.map(n=>{const o=URL.createObjectURL(n);return ft.set(o,o),{name:n.name,url:o}});T.files=[...T.files,...s].slice(0,T.max)});T.addEventListener("z-remove",i=>{const{index:t}=i.detail,e=T.files[t];e!=null&&e.url&&ft.has(e.url)&&(URL.revokeObjectURL(e.url),ft.delete(e.url)),T.files=T.files.filter((s,n)=>n!==t)});const W=document.getElementById("up-video");W.addEventListener("z-select",i=>{const{files:t,source:e}=i.detail;l("m-uploader z-select（录像）",{source:e,sizeMB:+(t.reduce((s,n)=>s+n.size,0)/1048576).toFixed(1)}),W.files=[...W.files,...t.map(s=>({name:s.name,url:URL.createObjectURL(s),type:"video"}))].slice(0,W.max)});W.addEventListener("z-reject",i=>{const{files:t,limit:e}=i.detail;l("m-uploader z-reject（超限）",{names:t.map(s=>s.name),limitMB:+(e/1048576).toFixed(0)})});const lt=document.getElementById("ck1");lt==null||lt.addEventListener("z-change",i=>l("m-checkbox z-change",i.detail));const dt=document.getElementById("pay");dt==null||dt.addEventListener("z-change",i=>l("m-radio-group z-change",i.detail));const ht=document.getElementById("otabs");ht==null||ht.addEventListener("z-change",i=>l("m-tabs z-change",i.detail));document.querySelectorAll("m-goods-card").forEach(i=>{i.addEventListener("z-click",t=>l("m-goods-card z-click",t.detail)),i.addEventListener("z-add",t=>l("m-goods-card z-add",t.detail))});const N=document.getElementById("cbar");N==null||N.addEventListener("z-check-all",i=>l("m-checkout-bar z-check-all",i.detail));N==null||N.addEventListener("z-submit",i=>l("m-checkout-bar z-submit",i.detail));const pt=document.getElementById("bnr");pt==null||pt.addEventListener("z-change",i=>l("m-swiper z-change",i.detail));const P=document.getElementById("sku"),ut=document.getElementById("skuCell");P&&(P.groups="颜色:米白,岩灰|尺码:250ml,500ml",P.skus=[{specs:{颜色:"米白",尺码:"250ml"},price:128,stock:6},{specs:{颜色:"米白",尺码:"500ml"},price:198,stock:0},{specs:{颜色:"岩灰",尺码:"250ml"},price:138,stock:2},{specs:{颜色:"岩灰",尺码:"500ml"},price:208,stock:1}],ut==null||ut.addEventListener("z-click",()=>P.open()),P.addEventListener("z-change",i=>l("m-sku-picker z-change",i.detail)),P.addEventListener("z-confirm",i=>l("m-sku-picker z-confirm",i.detail)));const it=document.getElementById("mpv");it&&(document.querySelectorAll(".mpv-thumb").forEach(i=>{i.addEventListener("click",()=>it.open(Number(i.dataset.idx??0)))}),it.addEventListener("z-change",i=>l("m-image-preview z-change",i.detail)),it.addEventListener("z-close",i=>l("m-image-preview z-close",i.detail)));const mt=document.getElementById("cdEnd");mt==null||mt.addEventListener("z-end",()=>l("m-countdown z-end",{id:"cdEnd"}));const D=document.getElementById("cp1");D==null||D.addEventListener("z-action",i=>l("m-coupon z-action",i.detail));D==null||D.addEventListener("z-click",i=>l("m-coupon z-click",i.detail));const _t=document.getElementById("cp3");_t==null||_t.addEventListener("z-click",i=>l("m-coupon z-click",i.detail));se();
