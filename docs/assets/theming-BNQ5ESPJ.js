import{B as x,h as z,p as c}from"./presets-CdaBrvJF.js";/* empty css             */import{i as _,t as p}from"./shell-DwQ7nMfw.js";import{e as E,o as $,t as m}from"./a11y-DJ6wHu5s.js";import"./Button-6M0Me5pu.js";import"./Badge-DbBfhcO2.js";import"./Card-D_PXomyA.js";import"./Input-wCelPXsT.js";import"./Select-Dm4kbGWW.js";import"./Checkbox-PuEiz19l.js";import"./Switch-BDiqwL0_.js";import"./Tag-atLYLSZk.js";import"./Alert-D0aLMeQP.js";import{r as w}from"./vocabulary-DLBU9tdh.js";import"./copy-DoHMT7Ic.js";import"./styleInjection-peqqYNO6.js";import"./Position-D6zl9ryN.js";import"./floatingPanel-BYE_1ufg.js";import"./roving-DMg3clv6.js";const S=`:host {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  width: 100%;
}

.z-progress {
  flex: 1;
}

.z-progress__track {
  width: 100%;
  overflow: hidden;
  background: var(--z-color-track);
  border-radius: var(--z-radius-full);
}

.z-progress__fill {
  height: 100%;
  border-radius: var(--z-radius-full);
  transition: width var(--z-transition-normal);
  min-width: 0;
}

/* ── Sizes ── */
.z-progress--sm .z-progress__track { height: 4px; }
.z-progress--md .z-progress__track { height: 8px; }

/* ── Variants ── */
.z-progress__fill--default { background: var(--z-color-primary); }
.z-progress__fill--success { background: var(--z-color-success); }
.z-progress__fill--warning { background: var(--z-color-warning); }
.z-progress__fill--danger { background: var(--z-color-danger); }

/* ── Striped ── */
.z-progress__fill--striped {
  background-image: linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.15) 50%,
    rgba(255, 255, 255, 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1em 1em;
}

.z-progress__fill--animated {
  /* motion-check-ignore: 1s 是条纹流动的固有节奏。并入 loop-slow(1500) 慢 50%，
     条纹会从「流动」变「卡顿」—— 这是 REQ-039 D4 明确判为不可接受的一处。 */
  animation: z-progress-stripes 1s linear infinite;
}

@keyframes z-progress-stripes {
  0% { background-position: 1em 0; }
  100% { background-position: 0 0; }
}

/* ── Label ── */
.z-progress__label {
  flex-shrink: 0;
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  min-width: 2.5em;
  text-align: right;
}
`;var A=Object.defineProperty,g=(r,t,a,s)=>{for(var n=void 0,e=r.length-1,o;e>=0;e--)(o=r[e])&&(n=o(t,a,n)||n);return n&&A(t,a,n),n};const y=class y extends x{constructor(){super(...arguments),this.value=0,this.tone="default",this.size="md",this.striped=!1,this.animated=!1,this.showLabel=!1}attributeChangedCallback(t,a,s){if(t==="variant"){const n=w(s);n&&E(this,"tone","tone",n);return}super.attributeChangedCallback(t,a,s)}get variant(){return this.getAttribute("variant")??""}set variant(t){t?this.setAttribute("variant",t):this.removeAttribute("variant")}render(){const t=Math.max(0,Math.min(100,this.value)),a=[`z-progress__fill--${this.tone}`,this.striped?"z-progress__fill--striped":"",this.animated&&this.striped?"z-progress__fill--animated":""].filter(Boolean).join(" ");return z`
      <div class="z-progress z-progress--${this.size}" part="root" role="progressbar"
           aria-valuenow="${t}" aria-valuemin="0" aria-valuemax="100">
        <div class="z-progress__track" part="track">
          <div class="z-progress__fill ${a}" part="fill"
               style="width:${t}%"></div>
        </div>
        ${this.showLabel?z`<span class="z-progress__label" part="label">${t}%</span>`:""}
      </div>
    `}};y.styles=S;let l=y;g([c({type:Number})],l.prototype,"value");g([c({type:String})],l.prototype,"tone");g([c({type:String})],l.prototype,"size");g([c({type:Boolean})],l.prototype,"striped");g([c({type:Boolean})],l.prototype,"animated");g([c({type:Boolean})],l.prototype,"showLabel");$(l,"variant");customElements.define("z-progress",l);_();const f=[{key:"blue",label:"Blue",swatch:"#2563eb",light:{p:"#2563eb",h:"#1d4ed8",a:"#1e40af",soft:"#eff6ff",ring:"rgba(37,99,235,0.15)"},dark:{p:"#3b82f6",h:"#60a5fa",a:"#93c5fd",soft:"rgba(59,130,246,0.16)",ring:"rgba(96,165,250,0.28)"}},{key:"violet",label:"Violet",swatch:"#7c3aed",light:{p:"#7c3aed",h:"#6d28d9",a:"#5b21b6",soft:"#f5f3ff",ring:"rgba(124,58,237,0.15)"},dark:{p:"#a78bfa",h:"#c4b5fd",a:"#ddd6fe",soft:"rgba(167,139,250,0.18)",ring:"rgba(167,139,250,0.3)"}},{key:"emerald",label:"Emerald",swatch:"#059669",light:{p:"#059669",h:"#047857",a:"#065f46",soft:"#ecfdf5",ring:"rgba(5,150,105,0.15)"},dark:{p:"#34d399",h:"#6ee7b7",a:"#a7f3d0",soft:"rgba(52,211,153,0.18)",ring:"rgba(52,211,153,0.3)"}},{key:"rose",label:"Rose",swatch:"#e11d48",light:{p:"#e11d48",h:"#be123c",a:"#9f1239",soft:"#fff1f2",ring:"rgba(225,29,72,0.15)"},dark:{p:"#fb7185",h:"#fda4af",a:"#fecdd3",soft:"rgba(251,113,133,0.18)",ring:"rgba(251,113,133,0.3)"}},{key:"amber",label:"Amber",swatch:"#d97706",light:{p:"#d97706",h:"#b45309",a:"#92400e",soft:"#fffbeb",ring:"rgba(217,119,6,0.15)"},dark:{p:"#fbbf24",h:"#fcd34d",a:"#fde68a",soft:"rgba(251,191,36,0.18)",ring:"rgba(251,191,36,0.3)"}}],C={compact:{sm:"2px",md:"4px",lg:"6px"},default:{sm:"4px",md:"8px",lg:"12px"},relaxed:{sm:"6px",md:"12px",lg:"16px"}},B={compact:{h:"26px",py:"4px",px:"10px",inputPy:"4px"},default:{h:"28px",py:"5px",px:"12px",inputPy:"5px"},relaxed:{h:"32px",py:"7px",px:"14px",inputPy:"6px"}},i={palette:"blue",radius:"default",density:"default"},h=document.createElement("style");h.id="demo-theme-override";document.head.appendChild(h);function d(){const r=f.find(e=>e.key===i.palette)??f[0],t=C[i.radius],a=B[i.density],s=e=>`
      --z-color-primary: ${e.p};
      --z-color-primary-hover: ${e.h};
      --z-color-primary-active: ${e.a};
      --z-color-primary-soft: ${e.soft};
      --z-color-primary-text: var(--z-color-white);
      --z-focus-ring-color: ${e.ring};
      --z-radius-sm: ${t.sm};
      --z-radius-md: ${t.md};
      --z-radius-lg: ${t.lg};
      --z-input-height: ${a.h};
      --z-input-padding-y: ${a.inputPy};
      --z-input-padding-x: ${a.px};
      --z-button-padding-y: ${a.py};
      --z-button-padding-x: ${a.px};
    `;h.textContent=`:root, [data-theme="light"] { ${s(r.light)} }
[data-theme="dark"] { ${s(r.dark)} }`,document.querySelectorAll(".theming-swatch").forEach(e=>{e.setAttribute("aria-pressed",String(e.dataset.key===i.palette))}),["radius","density"].forEach(e=>{document.querySelectorAll(`#${e}-group button`).forEach(o=>{o.setAttribute("aria-pressed",String(o.dataset.key===i[e]))})}),document.querySelectorAll("#appearance-group button").forEach(e=>{e.setAttribute("aria-pressed",String(e.dataset.key===m.theme))}),I()}const L=document.getElementById("palette-group");for(const r of f){const t=document.createElement("button");t.type="button",t.className="theming-swatch",t.dataset.key=r.key,t.title=r.label,t.setAttribute("aria-label",r.label),t.setAttribute("aria-pressed","false"),t.style.setProperty("--swatch",r.swatch),t.addEventListener("click",()=>{i.palette=r.key,d()}),L.appendChild(t)}function u(r,t,a,s){const n=document.getElementById(r);n.innerHTML="";for(const e of t){const o=document.createElement("button");o.type="button",o.dataset.key=e.key,o.textContent=e.label,o.setAttribute("aria-pressed",String(e.key===a)),o.addEventListener("click",()=>s(e.key)),n.appendChild(o)}}function b(){u("radius-group",[{key:"compact",label:p("theming.compact")},{key:"default",label:p("theming.default")},{key:"relaxed",label:p("theming.relaxed")}],i.radius,r=>{i.radius=r,d()}),u("density-group",[{key:"compact",label:p("theming.compact")},{key:"default",label:p("theming.default")},{key:"relaxed",label:p("theming.relaxed")}],i.density,r=>{i.density=r,d()}),u("appearance-group",[{key:"light",label:p("common.light")},{key:"dark",label:p("common.dark")}],m.theme,r=>{m.theme!==r&&m.toggle(),d()})}const T=["--z-color-primary","--z-color-primary-hover","--z-color-primary-soft","--z-radius-md","--z-input-height","--z-color-bg","--z-color-border","--z-color-text","--z-focus-ring-color"];function I(){const r=getComputedStyle(document.documentElement),t=document.getElementById("token-rows");t.innerHTML=T.map(a=>{const s=r.getPropertyValue(a).trim(),e=/^(#|rgb|hsl|color-mix)/.test(s)?`<span class="theming-chip" style="background:var(${a})"></span>`:"";return`<tr><td>${a}</td><td>${s||"—"}</td><td>${e}</td></tr>`}).join("")}b();d();var k;(k=document.getElementById("lang-toggle"))==null||k.addEventListener("z-click",()=>{setTimeout(()=>{b(),d()},0)});var v;(v=document.getElementById("theme-toggle"))==null||v.addEventListener("z-click",()=>{setTimeout(()=>{b(),d()},0)});
