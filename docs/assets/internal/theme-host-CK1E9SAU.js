import{B as z,e as x,h as c,p as u}from"../presets-CdaBrvJF.js";import{a as E,o as A}from"../a11y-DJ6wHu5s.js";import"../Button-6M0Me5pu.js";import"../Input-wCelPXsT.js";import"../Select-Dm4kbGWW.js";import"../Checkbox-PuEiz19l.js";import"../Switch-BDiqwL0_.js";import"../Card-D_PXomyA.js";import"../Badge-DbBfhcO2.js";import"../Alert-D0aLMeQP.js";import"../Pagination-D9yYEaKb.js";import"../Tooltip-CEiGPTba.js";import"../copy-DoHMT7Ic.js";import"../styleInjection-peqqYNO6.js";import"../Position-D6zl9ryN.js";import"../floatingPanel-BYE_1ufg.js";import"../roving-DMg3clv6.js";import"../vocabulary-DLBU9tdh.js";import"../PointerDragSession-D3R9IvJB.js";const $=`/* ===== z-tabs ===== */

:host {
  display: block;
}

/* ── Tablist ── */

.z-tabs__tablist {
  display: flex;
  gap: 0;
  border-bottom: 2px solid var(--z-color-border);
  position: relative;
  overflow-x: auto;
  scrollbar-width: none;
}

.z-tabs__tablist::-webkit-scrollbar {
  display: none;
}

/* ── Tab button ── */

.z-tabs__tab {
  display: inline-flex;
  align-items: center;
  padding: var(--z-space-2) var(--z-space-4);
  border: none;
  background: none;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: 500;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
  outline: none;
  transition: color var(--z-transition-fast);
  position: relative;
}

.z-tabs__tab:hover:not(:disabled) {
  color: var(--z-color-text);
}

.z-tabs__tab--active {
  color: var(--z-color-primary);
}

.z-tabs__tab:focus-visible {
  border-radius: var(--z-radius-sm);
  box-shadow: var(--z-focus-ring-contrast);
}

.z-tabs__tab--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── Panels ── */

.z-tabs__panels {
  padding-top: var(--z-space-4);
}

/* ── Variant: underline (default) ── */

:host([tab-style="underline"]) .z-tabs__tablist::after {
  content: "";
  position: absolute;
  bottom: -2px;
  left: var(--z-tabs-indicator-left, 0);
  width: var(--z-tabs-indicator-width, 0);
  height: 2px;
  background: var(--z-color-primary);
  transition: left var(--z-transition-normal), width var(--z-transition-normal);
}

/* ── Variant: pills ── */

:host([tab-style="pills"]) .z-tabs__tablist {
  border-bottom: none;
  gap: var(--z-space-2);
}

:host([tab-style="pills"]) .z-tabs__tab {
  border-radius: var(--z-radius-full);
  padding: var(--z-space-1-5) var(--z-space-4);
}

:host([tab-style="pills"]) .z-tabs__tab:hover:not(:disabled) {
  background: var(--z-color-hover);
}

:host([tab-style="pills"]) .z-tabs__tab--active {
  background: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

/* ── Variant: cards ── */

:host([tab-style="cards"]) .z-tabs__tablist {
  border-bottom: none;
  gap: 0;
}

:host([tab-style="cards"]) .z-tabs__tab {
  border: 1px solid var(--z-color-border);
  border-bottom: none;
  border-radius: var(--z-radius-md) var(--z-radius-md) 0 0;
  background: var(--z-color-bg-secondary);
  margin-bottom: -1px;
}

:host([tab-style="cards"]) .z-tabs__tab:hover:not(:disabled) {
  background: var(--z-color-bg);
}

:host([tab-style="cards"]) .z-tabs__tab--active {
  background: var(--z-color-bg);
  color: var(--z-color-text);
  border-bottom-color: var(--z-color-bg);
}

:host([tab-style="cards"]) .z-tabs__panels {
  border: 1px solid var(--z-color-border);
  border-top: none;
  border-radius: 0 0 var(--z-radius-md) var(--z-radius-md);
  padding: var(--z-space-4);
}
`;var S=Object.defineProperty,g=(i,n,e,s)=>{for(var t=void 0,a=i.length-1,r;a>=0;a--)(r=i[a])&&(t=r(n,e,t)||t);return t&&S(n,e,t),t};let C=0;const _=class _ extends z{constructor(){super(...arguments),this.active=0,this.tabStyle="underline",this._mo=null,this._uid=`z-tabs-${++C}`,this._focusActiveTab=!1,this._onTabClick=n=>{const e=n.target.closest(".z-tabs__tab");if(!e||e.hasAttribute("disabled"))return;const s=Number(e.dataset.index);isNaN(s)||this._activateTab(s)},this._onTabKey=n=>{const e=n;if(!["ArrowLeft","ArrowRight","Home","End","Enter"," "].includes(e.key))return;const s=this._getTabs(),t=s.filter(h=>!h.hasAttribute("disabled")),a=s.findIndex(h=>h.classList.contains("z-tabs__tab--active"));let r=a;switch(e.key){case"ArrowRight":r=this._nextEnabled(s,a,1);break;case"ArrowLeft":r=this._nextEnabled(s,a,-1);break;case"Home":r=t.length>0?s.indexOf(t[0]):a;break;case"End":r=t.length>0?s.indexOf(t[t.length-1]):a;break;case"Enter":case" ":e.preventDefault(),a>=0&&this._activateTab(a);return}r!==a&&r>=0&&(e.preventDefault(),this._activateTab(r))}}connectedCallback(){super.connectedCallback(),this._mo=new MutationObserver(()=>this.requestUpdate()),this._mo.observe(this,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["label","disabled"]})}disconnectedCallback(){var n;(n=this._mo)==null||n.disconnect(),this._mo=null,super.disconnectedCallback()}attributeChangedCallback(n,e,s){if(n==="variant"){(s==="underline"||s==="pills"||s==="cards")&&(this.tabStyle=s);return}super.attributeChangedCallback(n,e,s)}get variant(){return this.getAttribute("variant")??""}set variant(n){n?this.setAttribute("variant",n):this.removeAttribute("variant")}render(){const e=this._getPanels().map((t,a)=>({label:t.getAttribute("label")||t.label||`Tab ${a+1}`,disabled:t.hasAttribute("disabled")||t.disabled,index:a})),s=c`
      <div class="z-tabs__tablist z-tabs__tablist--${this.tabStyle}" role="tablist" part="tablist">
        ${e.map(t=>{const a=t.index===this.active&&!t.disabled,r=["z-tabs__tab",a?"z-tabs__tab--active":"",t.disabled?"z-tabs__tab--disabled":""].filter(Boolean).join(" ");return c`
            <button
              type="button"
              class="${r}"
              role="tab"
              id="${this._uid}-tab-${t.index}"
              aria-controls="${this._uid}-panel-${t.index}"
              data-index="${t.index}"
              aria-selected="${E(a)}"
              ${t.disabled?"disabled":""}
              tabindex="${a?0:-1}"
              part="tab"
            >${x(t.label)}</button>
          `}).join("")}
      </div>
    `;return c`${s}<div class="z-tabs__panels" part="panels"><slot></slot></div>`}updated(){var s;this._getPanels().forEach((t,a)=>{t.hidden=a!==this.active,t.id=`${this._uid}-panel-${a}`,t.setAttribute("role","tabpanel"),t.setAttribute("aria-labelledby",`${this._uid}-tab-${a}`)});const e=this.shadowRoot.querySelector(".z-tabs__tablist");e&&!e.__eventsSetup&&(e.addEventListener("click",this._onTabClick),e.addEventListener("keydown",this._onTabKey),e.__eventsSetup=!0),this._focusActiveTab&&(this._focusActiveTab=!1,(s=this.shadowRoot.querySelector(".z-tabs__tab--active"))==null||s.focus()),requestAnimationFrame(()=>{const t=this.shadowRoot.querySelector(".z-tabs__tab--active");t&&e&&(this.style.setProperty("--z-tabs-indicator-left",`${t.offsetLeft}px`),this.style.setProperty("--z-tabs-indicator-width",`${t.offsetWidth}px`))})}_getPanels(){return Array.from(this.querySelectorAll("z-tab-panel"))}_activateTab(n){const e=this._getPanels();if(n<0||n>=e.length||e[n].disabled)return;const s=this.active;n!==s&&(this._focusActiveTab=!0),this.active=n,this.emit("z-change",{index:n,previous:s})}_nextEnabled(n,e,s){const t=n.length;for(let a=1;a<t;a++){const r=(e+s*a+t)%t;if(!n[r].hasAttribute("disabled"))return r}return e}_getTabs(){return Array.from(this.shadowRoot.querySelectorAll(".z-tabs__tab"))}};_.styles=$;let l=_;g([u({type:Number})],l.prototype,"active");g([u({type:String})],l.prototype,"tabStyle");A(l,"variant");customElements.define("z-tabs",l);const T=`/* ===== z-tab-panel ===== */

:host {
  display: block;
}

:host([hidden]) {
  display: none;
}
`;var L=Object.defineProperty,k=(i,n,e,s)=>{for(var t=void 0,a=i.length-1,r;a>=0;a--)(r=i[a])&&(t=r(n,e,t)||t);return t&&L(n,e,t),t};const f=class f extends z{constructor(){super(...arguments),this.label="",this.disabled=!1}render(){return c`<slot></slot>`}};f.styles=T;let b=f;k([u({type:String})],b.prototype,"label");k([u({type:Boolean})],b.prototype,"disabled");customElements.define("z-tab-panel",b);const o=document.documentElement,B=document.getElementById("host-theme"),y=document.getElementById("sw-host"),m=document.getElementById("sw-dark"),w=document.getElementById("sw-channel"),p=document.getElementById("sw-density");y.addEventListener("change",()=>{B.media=y.checked?"all":"not all"});m.addEventListener("change",()=>{const i=m.checked;w.value==="class"?(o.dataset.theme=i?"":"light",o.classList.toggle("dark",i)):(o.classList.remove("dark"),o.dataset.theme=i?"dark":"light")});w.addEventListener("change",()=>{m.dispatchEvent(new Event("change"))});p.addEventListener("change",()=>{p.value==="default"?delete o.dataset.density:o.dataset.density=p.value});const v=document.createElement("z-report-table");v.columns=[{key:"store",title:"门店",width:160},{key:"qty",title:"销量",align:"right",numeric:!0},{key:"amount",title:"销售额",align:"right",numeric:!0,format:{formatType:"number",thousands:!0}},{key:"rate",title:"达成率",align:"right",numeric:!0,format:{formatType:"percent",decimalPlaces:1}}];v.data=[{store:"西湖店",qty:1284,amount:52340,rate:.9362},{store:"拱宸桥店",qty:966,amount:41820,rate:.8712},{store:"滨江店",qty:1471,amount:60215,rate:1.0124},{store:"余杭店",qty:702,amount:28960,rate:.7418}];document.getElementById("tbl").appendChild(v);const d=document.createElement("z-pagination");d.total=7;d.current=1;d.pageSize=20;d.totalRecords=128;d.showInfo=!0;document.getElementById("pg").appendChild(d);
