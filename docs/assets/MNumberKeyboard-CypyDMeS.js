import{B as d,e as b,h as l,a as c,p as a}from"./presets-CdaBrvJF.js";import{C as x}from"./copy-DoHMT7Ic.js";import{r as Tt}from"./vocabulary-DLBU9tdh.js";import{e as Pt,o as jt,f as Yt}from"./a11y-DJ6wHu5s.js";import"./Position-D6zl9ryN.js";import{C as Bt}from"./afterAnimation-DHK-FZ_K.js";const Ot=500,Ht=8;class Wt{constructor(t){this._timer=null,this._pos=null,this._boundPointer=!1,this._boundContext=!1,this._fired=!1,this._onMove=n=>{var s,h;if(!this._pos)return;const i=n.clientX-this._pos.x,e=n.clientY-this._pos.y,o=this._opts.moveTolerance??Ht;i*i+e*e>o*o&&(this.cancel(),(h=(s=this._opts).onCancel)==null||h.call(s))},this._onEnd=()=>{var i,e;const n=this._timer!==null;this.cancel(),n&&((e=(i=this._opts).onCancel)==null||e.call(i))},this._onContextMenu=n=>{this._fired&&n.isTrusted&&(n.preventDefault(),n.stopPropagation())},this._opts=t}get fired(){return this._fired}arm(t,n){this.cancel(),this._fired=!1,this._pos={x:t,y:n},this._boundPointer||(this._boundPointer=!0,window.addEventListener("pointermove",this._onMove),window.addEventListener("pointerup",this._onEnd),window.addEventListener("pointercancel",this._onEnd)),this._boundContext||(this._boundContext=!0,window.addEventListener("contextmenu",this._onContextMenu,!0)),this._timer=setTimeout(()=>{this._timer=null,this._fired=!0,this.cancel(),this._opts.onLongPress(t,n)},this._opts.delayMs??Ot)}cancel(){this._timer!=null&&(clearTimeout(this._timer),this._timer=null),this._pos=null,this._unbindPointer()}destroy(){this.cancel(),this._fired=!1,this._boundContext&&(this._boundContext=!1,window.removeEventListener("contextmenu",this._onContextMenu,!0))}_unbindPointer(){this._boundPointer&&(this._boundPointer=!1,window.removeEventListener("pointermove",this._onMove),window.removeEventListener("pointerup",this._onEnd),window.removeEventListener("pointercancel",this._onEnd))}}const Dt=`/* ===== m-navbar ===== */

:host {
  display: block;
  position: relative;
  z-index: 2;
}

.m-navbar {
  display: flex;
  align-items: center;
  height: 48px;
  background: var(--z-color-surface);
  border-bottom: 1px solid var(--z-color-border);
  -webkit-tap-highlight-color: transparent;
}

.m-navbar__left {
  display: flex;
  align-items: center;
  min-width: 44px;
  flex-shrink: 0;
}

.m-navbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--z-color-text);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: opacity var(--z-transition-fast);
}

.m-navbar__back:active {
  opacity: 0.5;
}

.m-navbar__back svg {
  display: block;
}

.m-navbar__title {
  flex: 1;
  text-align: center;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-semibold);
  color: var(--z-color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-navbar__right {
  display: flex;
  align-items: center;
  min-width: 44px;
  flex-shrink: 0;
}
`;var qt=Object.defineProperty,V=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&qt(t,n,e),e};const Mt='<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',nt=class nt extends d{constructor(){super(...arguments),this.title="",this.showBack=!1,this.backLabel="返回",this._onClick=t=>{t.target.closest(".m-navbar__back")&&this.emit("z-back")}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}render(){return l`
      <div class="m-navbar" part="root">
        <div class="m-navbar__left" part="left">
          ${this.showBack?l`<button type="button" class="m-navbar__back" part="back" aria-label="${b(this.backLabel)}">${Mt}</button>`:""}
        </div>
        <div class="m-navbar__title" part="title">${c(this.title)}</div>
        <div class="m-navbar__right" part="right"><slot></slot></div>
      </div>
    `}};nt.styles=Dt;let $=nt;V([a({type:String})],$.prototype,"title");V([a({type:Boolean})],$.prototype,"showBack");V([a({type:String})],$.prototype,"backLabel");customElements.define("m-navbar",$);const At=`/* ===== m-notice-bar ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-notice-bar {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  min-height: var(--z-touch-min-sm);
  padding: var(--z-space-2) var(--z-m-gutter);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: 1.4;
}

/* [WHY 每档同时给底色与前景色] 只给底色时，暗色主题下文字仍是深色，压在深底上看不清。
   四档都成对写，与 m-chip 的 selected 态同一个坑（那里曾写死 white）。

   [WHY 前景色是 \`-strong\` 而不是 \`-text\`] \`--z-color-*-text\` 是**实心底上的白字**
   （\`var(--info-foreground, var(--z-color-white))\`）。压在 \`-soft\` 这种 50 号浅底上，
   对比度约 1.2:1 —— 提示条上的字等于隐形，而结构、脚本、控制台全都正常，
   只有看屏幕才发现。\`-strong\` 是同一语气的深色变体（亮色 #1d4ed8 on #eff6ff ≈ 7.9:1，
   暗色自动换浅），与 alert / badge / tag 的既有写法一致。 */
.m-notice-bar--info {
  background: var(--z-color-info-soft);
  color: var(--z-color-info-strong);
}

.m-notice-bar--success {
  background: var(--z-color-success-soft);
  color: var(--z-color-success-strong);
}

.m-notice-bar--warning {
  background: var(--z-color-warning-soft);
  color: var(--z-color-warning-strong);
}

.m-notice-bar--danger {
  background: var(--z-color-danger-soft);
  color: var(--z-color-danger-strong);
}

.m-notice-bar__icon {
  display: inline-flex;
  flex: 0 0 auto;
}

.m-notice-bar__text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-notice-bar__close {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--z-touch-min-sm);
  height: var(--z-touch-min-sm);
  margin-right: calc(var(--z-space-1) * -1);
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  opacity: 0.7;
  cursor: pointer;
}
`;var Nt=Object.defineProperty,X=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Nt(t,n,e),e};const et=class et extends d{constructor(){super(...arguments),this.text="",this.type="info",this.closable=!1,this._onClick=t=>{const n=t.target.closest("[data-act]");(n==null?void 0:n.dataset.act)==="close"&&this.emit("z-close",{text:this.text})}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}render(){const t=this.closable?l`<button class="m-notice-bar__close" part="close" type="button" data-act="close" aria-label="${x.close}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>`:"";return l`
      <div class="m-notice-bar m-notice-bar--${this.type}" part="root" role="status">
        <span class="m-notice-bar__icon" part="icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.3" />
            <path d="M7 6.2V10" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" />
            <circle cx="7" cy="4.2" r="0.8" fill="currentColor" />
          </svg>
        </span>
        <span class="m-notice-bar__text" part="text"><slot>${c(this.text)}</slot></span>
        ${t}
      </div>
    `}};et.styles=At;let E=et;X([a({type:String})],E.prototype,"text");X([a({type:String})],E.prototype,"type");X([a({type:Boolean})],E.prototype,"closable");customElements.define("m-notice-bar",E);const It=`/* ===== m-search ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-search {
  display: flex;
  align-items: center;
  gap: var(--z-space-3);
  padding: var(--z-space-2) var(--z-m-gutter);
  background: var(--z-color-bg-secondary);
}

.m-search__box {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  gap: var(--z-space-2);
  min-height: var(--z-control-h);
  padding: 0 var(--z-space-3);
  background: var(--z-color-surface);
  border-radius: var(--z-radius-full);
}

.m-search__icon {
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--z-color-text-disabled);
}

.m-search__input {
  flex: 1 1 auto;
  min-width: 0;
  height: var(--z-control-h);
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  /* [WHY 16px] iOS Safari 对 font-size < 16px 的输入框会在聚焦时自动放大页面，
     放大后不会自己缩回去 —— 用户以为页面坏了。这是移动端输入框的硬约束。 */
  font-size: 16px;
  line-height: 1;
  -webkit-appearance: none;
  appearance: none;
}

.m-search__input::placeholder {
  color: var(--z-color-text-placeholder);
}

/* [WHY 去掉原生 search 的清除按钮] 各浏览器自绘的那个叉在暗色主题下是黑的，
   且位置与我们自己的按钮重叠，会出现两个叉。 */
.m-search__input::-webkit-search-cancel-button {
  -webkit-appearance: none;
  appearance: none;
}

.m-search__clear {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--z-touch-min-sm);
  height: var(--z-touch-min-sm);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--z-color-text-disabled);
  cursor: pointer;
}

.m-search__clear[hidden] {
  display: none;
}

/* 框内「搜索」按钮（\`action=\`，issue IKW576 #1）。
 * [WHY 是文字而不是图标] 键盘上那枚键在 iOS 中文输入法下可能不发事件，这枚按钮是
 * **唯一可靠的入口** —— 一个放大镜图标读者会当成「装饰」，一个「搜索」两个字不会。
 * 尺寸取 \`--z-touch-min-sm\`：它比输入区窄得多，但仍要够得着（26px 是宿主实测的下限）。 */
.m-search__submit {
  flex: 0 0 auto;
  min-height: var(--z-touch-min-sm);
  padding: 0 var(--z-space-1);
  border: 0;
  background: transparent;
  color: var(--z-color-primary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  white-space: nowrap;
  cursor: pointer;
}

.m-search__submit:disabled {
  color: var(--z-color-text-disabled);
  cursor: default;
}

.m-search__cancel {
  flex: 0 0 auto;
  min-height: var(--z-touch-min-sm);
  padding: 0 var(--z-space-1);
  border: 0;
  background: transparent;
  color: var(--z-color-primary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  cursor: pointer;
}
`;var Kt=Object.defineProperty,Y=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Kt(t,n,e),e};const it=class it extends d{constructor(){super(...arguments),this.value="",this.placeholder="搜索",this.debounce=200,this.cancel=!1,this.action=!1,this.disabled=!1,this._timer=null,this._onInput=t=>{const n=t.target;if(this._syncClear(n.value),this._clearTimer(),this.debounce<=0){this.emit("z-input",{value:n.value});return}this._timer=setTimeout(()=>{this._timer=null,this.emit("z-input",{value:n.value})},this.debounce)},this._onKeyDown=t=>{const n=t;if(n.key==="Escape"){this._applyValue("");return}n.key==="Enter"&&(n.preventDefault(),this._flush(!0))},this._onClick=t=>{var i;const n=t.target.closest("[data-act]");n&&(n.dataset.act==="clear"?(this._applyValue(""),this.emit("z-clear"),this.emit("z-input",{value:""})):n.dataset.act==="cancel"?this.emit("z-cancel",{value:((i=this._inputOf())==null?void 0:i.value)??""}):n.dataset.act==="search"&&this._flush(!0))}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("input",this._onInput),this.shadowRoot.addEventListener("keydown",this._onKeyDown),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this._clearTimer(),this.shadowRoot.removeEventListener("input",this._onInput),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}updated(){const t=this.shadowRoot.querySelector("input");t&&(document.activeElement!==t&&t.value!==this.value&&(t.value=this.value),this._syncClear(t.value))}_inputOf(){return this.shadowRoot.querySelector("input")}_syncClear(t){const n=this.shadowRoot.querySelector(".m-search__clear");n&&(n.hidden=t.length===0)}_clearTimer(){this._timer&&(clearTimeout(this._timer),this._timer=null)}_flush(t){var i;const n=((i=this._inputOf())==null?void 0:i.value)??"";this._clearTimer(),this.emit("z-input",{value:n}),t&&this.emit("z-search",{value:n})}_applyValue(t){this.value=t;const n=this._inputOf();n&&(n.value=t),this._syncClear(t)}render(){return l`
      <div class="m-search" part="root">
        <div class="m-search__box" part="box">
          <span class="m-search__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
              <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            </svg>
          </span>
          <input
            class="m-search__input"
            part="input"
            type="search"
            enterkeyhint="search"
            autocomplete="off"
            value="${c(this.value)}"
            placeholder="${c(this.placeholder)}"
            ${this.disabled?"disabled":""}
            aria-label="${c(this.placeholder)}"
          />
          ${this.action?l`<button class="m-search__submit" part="submit" type="button" data-act="search" aria-label="搜索" ${this.disabled?"disabled":""}>搜索</button>`:""}
          <button class="m-search__clear" part="clear" type="button" data-act="clear" aria-label="清空" hidden>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6" fill="currentColor" />
              <path d="M4.8 4.8L9.2 9.2M9.2 4.8L4.8 9.2" stroke="var(--z-color-surface)" stroke-width="1.4" stroke-linecap="round" />
            </svg>
          </button>
        </div>
        ${this.cancel?l`<button class="m-search__cancel" part="cancel" type="button" data-act="cancel">取消</button>`:""}
      </div>
    `}};it.styles=It;let f=it;Y([a({type:String})],f.prototype,"value");Y([a({type:String})],f.prototype,"placeholder");Y([a({type:Number})],f.prototype,"debounce");Y([a({type:Boolean})],f.prototype,"cancel");Y([a({type:Boolean})],f.prototype,"action");Y([a({type:Boolean})],f.prototype,"disabled");customElements.define("m-search",f);const Vt=`/* ===== m-grid ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-grid {
  display: grid;
  grid-template-columns: repeat(var(--m-grid-cols, 4), minmax(0, 1fr));
  gap: var(--z-space-3) var(--z-space-1);
  padding: var(--z-space-3) var(--z-space-2);
  background: var(--z-color-surface);
}

.m-grid--framed {
  margin: 0 var(--z-m-gutter) var(--z-space-4);
  border-radius: var(--z-m-radius);
}
`;var Xt=Object.defineProperty,$t=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Xt(t,n,e),e};const ot=class ot extends d{constructor(){super(...arguments),this.columns=4,this.framed=!1}render(){const t=this.columns>0?this.columns:4;return l`
      <div class="m-grid${this.framed?" m-grid--framed":""}" part="root" style="--m-grid-cols:${t}">
        <slot></slot>
      </div>
    `}};ot.styles=Vt;let O=ot;$t([a({type:Number})],O.prototype,"columns");$t([a({type:Boolean})],O.prototype,"framed");customElements.define("m-grid",O);const Ut=`/* ===== m-grid-item ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* [WHY 要居中] 宫格是一行等高的（grid stretch），而项内是 column 布局。
     没有图标的那一格内容只有一行标签，flex-start 会把标签**贴到格子顶部**——
     与有图标的邻居差一整行（实测 42px）。同一行里标签不齐，看起来像布局坏了。 */
  justify-content: center;
  /* [WHY 要撑满 host] \`:host\` 是 block，被宫格 stretch 到行高；而里面这个 div 的高度
     只到内容高度。只写 justify-content: center 是在「36px 的盒子」里居中，
     实际效果为零（实测标签仍在顶部 13px 处，与有图标的邻居差 43px）。 */
  height: 100%;
  box-sizing: border-box;
  gap: var(--z-space-2);
  padding: var(--z-space-2) var(--z-space-1);
  border-radius: var(--z-radius-md);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  cursor: pointer;
  user-select: none;
  /* 触控面积：文字短也要够 44px，否则按不准 */
  min-height: var(--z-touch-min);
  box-sizing: border-box;
  transition: background-color var(--z-transition-fast);
}

.m-grid-item:active {
  background: var(--z-color-fill-secondary);
}

.m-grid-item:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: -2px;
}

.m-grid-item--disabled {
  opacity: 0.45;
  pointer-events: none;
}

.m-grid-item__icon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
  color: var(--z-color-primary);
  font-size: var(--z-font-size-xl);
}

.m-grid-item__badge {
  position: absolute;
  top: -4px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-danger);
  color: var(--z-color-danger-text);
  font-size: 11px;
  line-height: 16px;
  text-align: center;
  box-sizing: border-box;
}

.m-grid-item__label {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
`;var Ft=Object.defineProperty,A=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Ft(t,n,e),e};const rt=class rt extends d{constructor(){super(...arguments),this.label="",this.badge="",this.clickable=!0,this.disabled=!1,this._onClick=()=>this._activate(),this._onKeyDown=t=>{const n=t;n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),this._activate())}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}_activate(){!this.clickable||this.disabled||this.emit("z-click",{label:this.label})}get _hasIconSlot(){return!!this.querySelector('[slot="icon"]')}render(){const t=this.badge?l`<span class="m-grid-item__badge" part="badge">${c(this.badge)}</span>`:"",n=this.clickable?'role="button" tabindex="0"':"",e=this._hasIconSlot||!!this.badge?l`<span class="m-grid-item__icon" part="icon">
          <slot name="icon"></slot>
          ${t}
        </span>`:"";return l`
      <div class="m-grid-item${this.disabled?" m-grid-item--disabled":""}" part="root" ${n}>
        ${e}
        ${this.label?l`<span class="m-grid-item__label" part="label">${c(this.label)}</span>`:""}
      </div>
    `}};rt.styles=Ut;let z=rt;A([a({type:String})],z.prototype,"label");A([a({type:String})],z.prototype,"badge");A([a({type:Boolean})],z.prototype,"clickable");A([a({type:Boolean})],z.prototype,"disabled");customElements.define("m-grid-item",z);const Gt=`/* ===== m-cell-group ===== */

:host {
  display: block;
  margin: 0 var(--z-m-gutter) var(--z-space-4);
}

:host([plain]) {
  margin: 0;
}

.m-cell-group__head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 var(--z-space-1) var(--z-space-2);
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
}

.m-cell-group__heading {
  font-weight: var(--z-font-weight-medium);
}

.m-cell-group__desc {
  color: var(--z-color-text-disabled);
  font-size: var(--z-font-size-xs);
}

.m-cell-group__body {
  overflow: hidden;
  background: var(--z-color-surface);
  border-radius: var(--z-m-radius);
}

:host([plain]) .m-cell-group__body {
  background: transparent;
  border-radius: 0;
}

/* [WHY ::slotted 只能写复合选择器] 分隔线必须由分组统一加：行自己加会漏，
   而漏一行没有任何报错，只是两个条目看起来像一条。这里用相邻兄弟做不到
   （::slotted 不支持组合符），\`not(:first-child)\` 是等价写法。 */
::slotted(m-cell:not(:first-child)) {
  border-top: 1px solid var(--z-color-divider);
}
`;var Jt=Object.defineProperty,U=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Jt(t,n,e),e};const st=class st extends d{constructor(){super(...arguments),this.heading="",this.desc="",this.plain=!1}render(){const t=this.heading||this.desc?l`
          <div class="m-cell-group__head" part="head">
            ${this.heading?l`<span class="m-cell-group__heading" part="heading">${c(this.heading)}</span>`:""}
            ${this.desc?l`<span class="m-cell-group__desc" part="desc">${c(this.desc)}</span>`:""}
          </div>
        `:"";return l`
      <div class="m-cell-group" part="root">
        ${t}
        <div class="m-cell-group__body" part="body"><slot></slot></div>
      </div>
    `}};st.styles=Gt;let S=st;U([a({type:String})],S.prototype,"heading");U([a({type:String})],S.prototype,"desc");U([a({type:Boolean})],S.prototype,"plain");customElements.define("m-cell-group",S);const Qt=`/* ===== m-chip ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
  -webkit-tap-highlight-color: transparent;
}

.m-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--z-control-h);
  padding: 6px 16px;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  line-height: 1;
  border-radius: var(--z-radius-full);
  background: var(--z-color-bg-tertiary);
  color: var(--z-color-text-secondary);
  cursor: pointer;
  user-select: none;
  transition: all var(--z-transition-fast);
  outline: none;
}

.m-chip:active {
  opacity: 0.7;
}

.m-chip:focus-visible {
  box-shadow: 0 0 0 2px var(--z-color-bg), 0 0 0 4px var(--z-color-primary);
}

/* ── Variants (selected state) ── */

.m-chip--default.m-chip--selected {
  background: var(--z-color-inverse);
  /* [WHY 成对] 底走 -inverse、字必须走 -inverse-text：暗色里底色反转成浅色，
     文字若还是 white 就是白压近白（几乎看不见）。这里曾写死 --z-color-white。 */
  color: var(--z-color-inverse-text);
}

.m-chip--primary.m-chip--selected {
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
}

.m-chip--success.m-chip--selected {
  background: var(--z-color-success);
  color: var(--z-color-success-text);
}

.m-chip--danger.m-chip--selected {
  background: var(--z-color-danger);
  color: var(--z-color-danger-text);
}
`;var Zt=Object.defineProperty,F=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Zt(t,n,e),e};const at=class at extends d{constructor(){super(...arguments),this.label="",this.tone="default",this.selected=!1,this._onActivate=()=>{this.emit("z-click",{selected:this.selected})},this._onKeyDown=t=>{const n=t;n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),this._onActivate())}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onActivate),this.shadowRoot.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onActivate),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}attributeChangedCallback(t,n,i){if(t==="variant"){const e=Tt(i);e&&Pt(this,"tone","tone",e);return}super.attributeChangedCallback(t,n,i)}get variant(){return this.getAttribute("variant")??""}set variant(t){t?this.setAttribute("variant",t):this.removeAttribute("variant")}render(){const t=["m-chip",`m-chip--${this.tone}`,this.selected?"m-chip--selected":""].filter(Boolean).join(" "),n=this.label?c(this.label):l`<slot></slot>`;return l`<div class="${t}" part="root" role="button" tabindex="0" aria-pressed="${this.selected?"true":"false"}">${n}</div>`}};at.styles=Qt;let k=at;F([a({type:String})],k.prototype,"label");F([a({type:String})],k.prototype,"tone");F([a({type:Boolean})],k.prototype,"selected");jt(k,"variant");customElements.define("m-chip",k);const tn=`/* ===== m-card ===== */

:host {
  display: block;
}

.m-card {
  background: var(--z-color-surface);
  border-radius: var(--z-radius-md);
  -webkit-tap-highlight-color: transparent;
}

.m-card--sm {
  padding: var(--z-space-3);
}

.m-card--md {
  padding: var(--z-space-4);
}

.m-card--clickable {
  cursor: pointer;
  transition: box-shadow var(--z-transition-normal), opacity var(--z-transition-fast);
}

.m-card--clickable:hover {
  box-shadow: var(--z-shadow-md);
}

.m-card--clickable:active {
  opacity: 0.7;
}
`;var nn=Object.defineProperty,Et=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&nn(t,n,e),e};const K=10,en=800,lt=class lt extends d{constructor(){super(...arguments),this.clickable=!1,this.padding="md",this._lp=new Wt({delayMs:en,moveTolerance:K,onLongPress:()=>this.emit("z-longpress")}),this._moved=!1,this._startX=0,this._startY=0,this._onPointerDown=t=>{this.clickable&&(this._startX=t.clientX,this._startY=t.clientY,this._moved=!1,this._lp.arm(t.clientX,t.clientY))},this._onPointerUp=()=>{if(!this.clickable)return;const t=this._lp.fired;this._lp.cancel();const n=this._moved;this._moved=!1,!t&&!n&&this.emit("z-click")},this._onPointerCancel=()=>{this._lp.cancel(),this._moved=!0},this._onPointerMove=t=>{if(!this.clickable)return;const n=t.clientX-this._startX,i=t.clientY-this._startY;n*n+i*i>K*K&&(this._moved=!0,this._lp.cancel())}}connectedCallback(){super.connectedCallback(),this.addEventListener("pointerdown",this._onPointerDown),this.addEventListener("pointerup",this._onPointerUp),this.addEventListener("pointerleave",this._onPointerCancel),this.addEventListener("pointercancel",this._onPointerCancel),this.addEventListener("pointermove",this._onPointerMove)}disconnectedCallback(){this._lp.destroy(),this.removeEventListener("pointerdown",this._onPointerDown),this.removeEventListener("pointerup",this._onPointerUp),this.removeEventListener("pointerleave",this._onPointerCancel),this.removeEventListener("pointercancel",this._onPointerCancel),this.removeEventListener("pointermove",this._onPointerMove),super.disconnectedCallback()}render(){const t=["m-card",`m-card--${this.padding}`,this.clickable?"m-card--clickable":""].filter(Boolean).join(" ");return l`<div class="${t}" part="root"><slot></slot></div>`}};lt.styles=tn;let H=lt;Et([a({type:Boolean})],H.prototype,"clickable");Et([a({type:String})],H.prototype,"padding");customElements.define("m-card",H);const on=`/* ===== m-collapse ===== */

:host {
  display: block;
}

.m-collapse {
  background: var(--z-color-surface);
  border-bottom: 1px solid var(--z-color-border);
}

.m-collapse__header {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 48px;
  padding: var(--z-space-3) var(--z-space-4);
  border: none;
  background: transparent;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-medium);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--z-transition-fast);
}

.m-collapse__header:active {
  background: var(--z-color-hover);
}

.m-collapse__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-collapse__summary {
  flex-shrink: 0;
  margin-right: var(--z-space-2);
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-normal);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 40%;
}

.m-collapse__arrow {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  transition: transform var(--z-transition-normal);
  color: var(--z-color-text-secondary);
}

.m-collapse__arrow svg {
  width: 16px;
  height: 16px;
}

.m-collapse--expanded .m-collapse__arrow {
  transform: rotate(180deg);
}

.m-collapse__content {
  max-height: 0;
  overflow: hidden;
  transition: max-height var(--z-transition-normal);
}

.m-collapse__body {
  padding: 0 var(--z-space-4) var(--z-space-4);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: var(--z-line-height);
  color: var(--z-color-text);
}
`;var rn=Object.defineProperty,G=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&rn(t,n,e),e};const sn='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',ct=class ct extends d{constructor(){super(...arguments),this.title="",this.expanded=!1,this.summary="",this._tween=new Bt,this._onHeaderClick=t=>{t.target.closest(".m-collapse__header")&&(this.expanded=!this.expanded,this.emit("z-toggle",{expanded:this.expanded}))}}render(){const t=`m-collapse${this.expanded?" m-collapse--expanded":""}`;return l`
      <div class="${t}" part="root">
        <button type="button"
                class="m-collapse__header"
                part="header"
                aria-expanded="${this.expanded?"true":"false"}">
          <span class="m-collapse__title" part="title">${c(this.title)}</span>
          ${this.summary?l`<span class="m-collapse__summary" part="summary">${c(this.summary)}</span>`:""}
          <span class="m-collapse__arrow" part="arrow" aria-hidden="true">${sn}</span>
        </button>
        <div class="m-collapse__content" part="content">
          <div class="m-collapse__body" part="body">
            <slot></slot>
          </div>
        </div>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onHeaderClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onHeaderClick),super.disconnectedCallback()}willUpdate(){const t=this.shadowRoot.querySelector(".m-collapse__body");t&&this._tween.willCollapse(this.expanded,()=>t.scrollHeight)}updated(){const t=this.shadowRoot.querySelector(".m-collapse"),n=this.shadowRoot.querySelector(".m-collapse__content"),i=this.shadowRoot.querySelector(".m-collapse__body"),e=this.shadowRoot.querySelector(".m-collapse__header");!t||!n||!i||(t.classList.toggle("m-collapse--expanded",this.expanded),this._tween.apply(n,this.expanded,()=>i.scrollHeight),Yt(this,n,!this.expanded,e))}};ct.styles=on;let L=ct;G([a({type:String})],L.prototype,"title");G([a({type:Boolean})],L.prototype,"expanded");G([a({type:String})],L.prototype,"summary");customElements.define("m-collapse",L);const an=`/* ===== m-empty ===== */

:host {
  display: block;
}

.m-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: var(--z-space-8);
  text-align: center;
  -webkit-tap-highlight-color: transparent;
}

.m-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  color: var(--z-color-text-disabled);
  margin-bottom: var(--z-space-4);
}

.m-empty__icon svg {
  width: 80px;
  height: 80px;
}

.m-empty__title {
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-semibold);
  color: var(--z-color-text);
  margin-bottom: var(--z-space-2);
}

.m-empty__description {
  font-family: var(--z-font-sans);
  font-size: 14px;
  color: var(--z-color-gray-500);
  line-height: var(--z-line-height);
}

.m-empty__action {
  margin-top: var(--z-space-4);
}

.m-empty__action:empty {
  display: none;
}
`;var ln=Object.defineProperty,J=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&ln(t,n,e),e};const zt={empty:'<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="20" width="56" height="44" rx="4" stroke="currentColor" stroke-width="2"/><path d="M12 32h56" stroke="currentColor" stroke-width="2"/><path d="M30 48h20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',error:'<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M40 14l28 48H12L40 14z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M40 34v14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="40" cy="54" r="2" fill="currentColor"/></svg>',forbidden:'<svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="26" stroke="currentColor" stroke-width="2"/><path d="M22 22l36 36" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'},dt=class dt extends d{constructor(){super(...arguments),this.type="empty",this.title="",this.description=""}render(){const t=zt[this.type]||zt.empty;return l`
      <div class="m-empty" part="root">
        <div class="m-empty__icon" part="icon">${t}</div>
        ${this.title?l`<div class="m-empty__title" part="title">${c(this.title)}</div>`:""}
        ${this.description?l`<div class="m-empty__description" part="description">${c(this.description)}</div>`:""}
        <div class="m-empty__action" part="action"><slot></slot></div>
      </div>
    `}};dt.styles=an;let R=dt;J([a({type:String})],R.prototype,"type");J([a({type:String})],R.prototype,"title");J([a({type:String})],R.prototype,"description");customElements.define("m-empty",R);const cn=`/* ===== m-tabbar ===== */

:host {
  display: block;
}

.m-tabbar {
  display: flex;
  height: 56px;
  background: var(--z-color-surface);
  border-top: 1px solid var(--z-color-border);
  padding-bottom: env(safe-area-inset-bottom);
  -webkit-tap-highlight-color: transparent;
}

.m-tabbar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  transition: color var(--z-transition-fast);
}

.m-tabbar__item--active {
  color: var(--z-color-primary);
}

.m-tabbar__icon-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.m-tabbar__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 20px;
  font-size: 20px;
  line-height: 1;
}

.m-tabbar__icon svg {
  width: 20px;
  height: 20px;
}

.m-tabbar__label {
  font-family: var(--z-font-sans);
  font-size: 12px;
  line-height: 1;
  text-align: center;
}

.m-tabbar__badge {
  position: absolute;
  top: -4px;
  right: -8px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--z-font-sans);
  font-size: 10px;
  font-weight: var(--z-font-weight-medium);
  line-height: 1;
  color: var(--z-color-white);
  background: var(--z-color-danger);
  border-radius: var(--z-radius-full);
}
`;var dn=Object.defineProperty,St=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&dn(t,n,e),e};const ht=class ht extends d{constructor(){super(...arguments),this.items=[],this.active="",this._onClick=t=>{this._activate(t.target.closest("[data-key]"))},this._onKeyDown=t=>{const n=t;n.key!=="Enter"&&n.key!==" "||(n.preventDefault(),this._activate(t.target.closest("[data-key]")))}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}_activate(t){const n=t==null?void 0:t.dataset.key;if(!n||n===this.active)return;const i=this.items.find(e=>e.key===n);i&&(this.active=n,this.emit("z-change",{key:n,item:i}))}render(){const t=this.items.map(n=>{const i=n.key===this.active,e=["m-tabbar__item",i?"m-tabbar__item--active":""].filter(Boolean).join(" ");return l`
        <div class="${e}" data-key="${b(n.key)}" part="item" role="tab" tabindex="0" aria-selected="${i?"true":"false"}">
          <span class="m-tabbar__icon-wrap" part="icon-wrap">
            <span class="m-tabbar__icon" part="icon">${n.icon||""}</span>
            ${n.badge?l`<span class="m-tabbar__badge" part="badge">${c(String(n.badge))}</span>`:""}
          </span>
          <span class="m-tabbar__label" part="label">${c(n.label||"")}</span>
        </div>
      `});return l`<div class="m-tabbar" part="root" role="tablist">${t}</div>`}};ht.styles=cn;let W=ht;St([a({type:Array})],W.prototype,"items");St([a({type:String})],W.prototype,"active");customElements.define("m-tabbar",W);const hn=`/* ===== m-floating-button ===== */

:host {
  /* [WHY] fixed 定位脱离文档流，避开被祖先 transform/overflow 裁剪 */
  position: fixed;
  z-index: 100;
  width: 56px;
  height: 56px;
  -webkit-tap-highlight-color: transparent;
}

:host([position="br"]) {
  right: var(--z-space-6);
  /* [WHY] bottom 留 80px + safe-area，避免被 TabBar 遮挡 */
  bottom: calc(80px + env(safe-area-inset-bottom));
}

:host([position="bl"]) {
  left: var(--z-space-6);
  bottom: calc(80px + env(safe-area-inset-bottom));
}

.m-floating-button {
  width: 56px;
  height: 56px;
  border: none;
  border-radius: var(--z-radius-full);
  background: var(--z-color-primary);
  color: var(--z-color-primary-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xl);
  font-weight: var(--z-font-weight-normal);
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--z-shadow-lg);
  transition: transform var(--z-transition-fast), background var(--z-transition-fast);
  -webkit-tap-highlight-color: transparent;
}

.m-floating-button:hover {
  background: var(--z-color-primary-hover);
}

.m-floating-button:active {
  transform: scale(0.9);
  background: var(--z-color-primary-active);
}

.m-floating-button__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}
`;var pn=Object.defineProperty,Lt=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&pn(t,n,e),e};const pt=class pt extends d{constructor(){super(...arguments),this.icon="+",this.position="br",this._onClick=t=>{t.target.closest(".m-floating-button")&&this.emit("z-click")}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}render(){const t=`m-floating-button m-floating-button--${this.position}`;return l`
      <button type="button"
              class="${t}"
              part="root"
              aria-label="${b(this.icon)}">
        <span class="m-floating-button__icon" part="icon">${c(this.icon)}</span>
      </button>
    `}};pt.styles=hn;let D=pt;Lt([a({type:String})],D.prototype,"icon");Lt([a({type:String})],D.prototype,"position");customElements.define("m-floating-button",D);const un=`/* ===== m-action-bar ===== */

/*
  [fixed 的三个失效原因 —— 都会「看起来只是没贴底」而不报错]
    1. 任一祖先有 \`transform\` / \`filter\` / \`perspective\`：fixed 改成相对该祖先定位。
       页面切换动画（\`transform: translateX(...)\`）最容易踩。
    2. 祖先有 \`contain: paint\`。
    3. 页面没有给底部留出空间（\`padding-bottom\`）—— 这不是失效，是**内容被盖住**，
       表现为「列表最后一行点不到」。使用方要自己留 \`--z-touch-min\` + 安全区的高度。
*/
/*
  [为什么连 \`left/right/bottom\` 也走变量，而不是用 \`:host([inline])\` 属性选择器]
  属性选择器依赖 attribute 反射，而 \`position\` 已经走变量了 —— 两条路径一旦不同步，
  会出现「position 变成 static 了但 left/right 还钉着 0」这种半生效状态，
  表现是操作条缩成一条窄条贴在左边。全部走变量只有一个入口。
*/
:host {
  position: var(--_pos, fixed);
  left: var(--_left, 0);
  right: var(--_right, 0);
  bottom: var(--_bottom, 0);
  z-index: var(--z-z-dropdown);
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  /* 左右留白 + 纵向留白；底部额外加安全区（令牌本身在 PC 上是 0px） */
  padding: var(--z-space-2) var(--z-space-4);
  padding-bottom: var(--_padb, calc(var(--z-space-2) + var(--z-safe-bottom)));
  min-height: var(--_minh, calc(var(--z-touch-min) + var(--z-space-4)));
  border-radius: var(--_radius, 0);
  box-sizing: border-box;
  background: var(--z-color-bg);
  border-top: 1px solid var(--_border, var(--z-color-border));
  -webkit-tap-highlight-color: transparent;
}

.z-m-action-bar__left {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  flex: 0 0 auto;
}

.z-m-action-bar__left:empty {
  display: none;
}

/*
  主区域：按钮组。
  \`flex: 1\` + \`justify-content\` —— 对齐方式由 \`align\` 属性决定，
  默认 end（主操作靠右，拇指最容易够到）。
*/
.z-m-action-bar__main {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  flex: 1 1 auto;
  justify-content: var(--_justify, flex-end);
  min-width: 0;
}

/* 触控目标下限：iOS HIG / Material 都要求 44px。按钮自己没设高度时由这里兜底。 */
::slotted(*) {
  min-height: var(--z-touch-min-sm);
}
`;var mn=Object.defineProperty,Q=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&mn(t,n,e),e};const kt={start:"flex-start",center:"center",end:"flex-end",between:"space-between"},ut=class ut extends d{constructor(){super(...arguments),this.inline=!1,this.borderless=!1,this.align="end"}willUpdate(){const t=this.style;t.setProperty("--_pos",this.inline?"static":"fixed"),t.setProperty("--_justify",kt[this.align]??kt.end),t.setProperty("--_border",this.borderless?"none":"var(--z-color-border)"),t.setProperty("--_left",this.inline?"auto":"0"),t.setProperty("--_right",this.inline?"auto":"0"),t.setProperty("--_bottom",this.inline?"auto":"0"),t.setProperty("--_padb",this.inline?"var(--z-space-2)":"calc(var(--z-space-2) + var(--z-safe-bottom))"),t.setProperty("--_minh",this.inline?"var(--z-touch-min)":"calc(var(--z-touch-min) + var(--z-space-4))"),t.setProperty("--_radius",this.inline?"var(--z-radius-md)":"0")}render(){return l`
      <div class="z-m-action-bar__left" part="left"><slot name="left"></slot></div>
      <div class="z-m-action-bar__main" part="main"><slot></slot></div>
    `}};ut.styles=un;let T=ut;Q([a({type:Boolean})],T.prototype,"inline");Q([a({type:Boolean})],T.prototype,"borderless");Q([a({type:String})],T.prototype,"align");customElements.define("m-action-bar",T);const fn=`/* ===== m-action-sheet ===== */

:host {
  /* [WHY] 防止 overflow 容器裁剪：整个组件 fixed 定位脱离文档流 */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-z-modal);
  -webkit-tap-highlight-color: transparent;
  /* [WHY] 2026-09-17 [[bug-20260917-m-action-sheet-blocks-click]] 移动端整页无法点击根因：
     host 是 fixed 全屏盒子，隐藏态（shadow 内 display:none）host 本身仍拦截 hit-test，
     透明盖住整个页面吃掉所有触摸（TabBar/列表全部点不动）。修复：host 穿透，
     overlay 显示态自身 pointer-events:auto 接管（子元素可覆盖父级 none，标准行为）。
     对照 z-modal 的 :host{display:contents} 同理。 */
  pointer-events: none;
}

.m-action-sheet__overlay {
  pointer-events: auto;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--z-color-bg-overlay);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: m-action-sheet-fade-in var(--z-anim-duration-normal);
}

.m-action-sheet__overlay--closing {
  animation: m-action-sheet-fade-out var(--z-anim-duration-normal);
}

.m-action-sheet__panel {
  width: 100%;
  background: var(--z-color-bg-secondary);
  border-radius: var(--z-radius-lg) var(--z-radius-lg) 0 0;
  padding-bottom: env(safe-area-inset-bottom);
  animation: m-action-sheet-slide-up var(--z-anim-duration-normal);
  box-shadow: var(--z-shadow-lg);
  max-height: 80vh;
  overflow-y: auto;
}

.m-action-sheet__panel--closing {
  animation: m-action-sheet-slide-down var(--z-anim-duration-normal);
}

.m-action-sheet__title {
  padding: var(--z-space-4) var(--z-space-4) var(--z-space-3);
  text-align: center;
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-normal);
  border-bottom: 1px solid var(--z-color-border);
}

.m-action-sheet__list {
  display: flex;
  flex-direction: column;
}

.m-action-sheet__item {
  border: none;
  background: var(--z-color-popover);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-normal);
  min-height: 48px;
  padding: var(--z-space-3) var(--z-space-4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--z-transition-fast);
  border-bottom: 1px solid var(--z-color-border);
}

.m-action-sheet__item:active {
  background: var(--z-color-hover);
}

.m-action-sheet__item--danger {
  color: var(--z-color-danger);
}

.m-action-sheet__cancel {
  margin-top: var(--z-space-2);
  border: none;
  background: var(--z-color-popover);
  color: var(--z-color-primary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-medium);
  min-height: 48px;
  width: 100%;
  padding: var(--z-space-3) var(--z-space-4);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background var(--z-transition-fast);
}

.m-action-sheet__cancel:active {
  background: var(--z-color-hover);
}

@keyframes m-action-sheet-fade-in {
  from { background: rgba(0, 0, 0, 0); }
  to { background: var(--z-color-bg-overlay); }
}

@keyframes m-action-sheet-fade-out {
  from { background: var(--z-color-bg-overlay); }
  to { background: rgba(0, 0, 0, 0); }
}

@keyframes m-action-sheet-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes m-action-sheet-slide-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
`;var vn=Object.defineProperty,Z=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&vn(t,n,e),e};const mt=class mt extends d{constructor(){super(...arguments),this.visible=!1,this.actions=[],this._wasVisible=!1,this._closing=!1,this._onOverlayClick=t=>{this.visible&&t.target===t.currentTarget&&this._close()},this._onCancelClick=()=>{this._close()},this._onItemClick=t=>{const n=t.currentTarget,i=Number(n.dataset.index),e=this.actions[i];e&&(this.emit("z-select",{value:e.value,action:e}),this._close())}}render(){if(!this.visible&&!this._closing)return l`<div style="display:none" part="hidden"></div>`;const t=this._closing?" m-action-sheet__overlay--closing":"",n=this._closing?" m-action-sheet__panel--closing":"",i=this.actions.map((e,o)=>l`
        <button type="button"
                class="m-action-sheet__item${e.danger?" m-action-sheet__item--danger":""}"
                part="item"
                data-index="${o}">
          ${c(e.label)}
        </button>
      `).join("");return l`
      <div class="m-action-sheet__overlay${t}" part="overlay">
        <div class="m-action-sheet__panel${n}" part="panel" role="dialog" aria-modal="true">
          ${this.title?l`<div class="m-action-sheet__title" part="title">${c(this.title)}</div>`:""}
          <div class="m-action-sheet__list" part="list">${i}</div>
          <button type="button" class="m-action-sheet__cancel" part="cancel">取消</button>
        </div>
      </div>
    `}updated(){const t=this._wasVisible;this._wasVisible=this.visible;const n=this.shadowRoot.querySelector(".m-action-sheet__overlay");n&&n.addEventListener("click",this._onOverlayClick);const i=this.shadowRoot.querySelector(".m-action-sheet__cancel");if(i&&i.addEventListener("click",this._onCancelClick),this.shadowRoot.querySelectorAll(".m-action-sheet__item").forEach(o=>{o.addEventListener("click",this._onItemClick)}),this.visible&&!t?this.emit("z-action-sheet-open"):!this.visible&&t&&(this._closing=!0,this.requestUpdate()),this._closing){const o=this.shadowRoot.querySelector(".m-action-sheet__panel");if(o){const s=h=>{h.target===o&&(o.removeEventListener("animationend",s),this._closing=!1,this.requestUpdate())};o.addEventListener("animationend",s)}}}_close(){this.emit("z-action-sheet-close"),this.visible=!1}};mt.styles=fn;let P=mt;Z([a({type:Boolean})],P.prototype,"visible");Z([a({type:String})],P.prototype,"title");Z([a({attribute:!1})],P.prototype,"actions");customElements.define("m-action-sheet",P);const _n=`/* ===== m-pull-refresh ===== */

:host {
  display: block;
  position: relative;
  overflow: hidden;
  height: 100%;
}

.m-pull-refresh {
  position: relative;
  height: 100%;
  overflow: hidden;
}

.m-pull-refresh__scroller {
  position: relative;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  transition: transform var(--z-transition-normal);
  will-change: transform;
}

.m-pull-refresh__indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-2);
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  /* [WHY] 初始隐藏在顶部外（-threshold），下拉时进入可视区域 */
  transform: translateY(-60px);
  transition: transform var(--z-transition-normal);
  pointer-events: none;
  z-index: 1;
}

.m-pull-refresh__spinner {
  display: none;
  width: 16px;
  height: 16px;
  border: 2px solid var(--z-color-gray-200);
  border-top-color: var(--z-color-primary);
  border-radius: 50%;
  animation: m-pull-refresh-spin var(--z-duration-loop-fast) var(--z-ease-linear) infinite;
}

.m-pull-refresh__arrow {
  width: 16px;
  height: 16px;
  stroke: var(--z-color-text-secondary);
  transition: transform var(--z-transition-fast);
}

.m-pull-refresh__text {
  line-height: 1;
  white-space: nowrap;
}

@keyframes m-pull-refresh-spin {
  to { transform: rotate(360deg); }
}
`;var bn=Object.defineProperty,Rt=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&bn(t,n,e),e};const ft=class ft extends d{constructor(){super(...arguments),this.refreshing=!1,this.threshold=60,this._startY=0,this._deltaY=0,this._pulling=!1,this._pullDistance=0,this._scroller=null,this._scrollRoot=null,this._onTouchStart=t=>{if(this.refreshing)return;const n=t.touches[0];this._scrollRoot=this._findScrollRoot(),this._startY=n.clientY,this._pulling=!0,this._scroller&&(this._scroller.style.transition="none")},this._onTouchMove=t=>{if(!this._pulling||this.refreshing)return;const n=t.touches[0];if(this._deltaY=n.clientY-this._startY,this._deltaY<=0||!this._atTop())return;t.preventDefault();const i=this._deltaY>this.threshold?.3:.5;this._pullDistance=this._deltaY*i,this._setTranslate(this._pullDistance,!1)},this._onTouchEnd=()=>{this._pulling&&(this._pulling=!1,this._scroller&&(this._scroller.style.transition="transform var(--z-transition-normal)"),this._pullDistance>=this.threshold?(this._setTranslate(this.threshold,!0),this.emit("z-refresh")):this._setTranslate(0,!1),this._pullDistance=0,this._deltaY=0)}}connectedCallback(){super.connectedCallback(),this._bindScroller()}disconnectedCallback(){this._unbindScroller(),super.disconnectedCallback()}updated(){this._bindScroller(),this.refreshing?this._setTranslate(this.threshold,!0):this._pulling||this._setTranslate(0,!1)}_bindScroller(){const t=this.shadowRoot.querySelector(".m-pull-refresh__scroller");!t||t===this._scroller||(this._unbindScroller(),this._scroller=t,t.addEventListener("touchstart",this._onTouchStart,{passive:!1}),t.addEventListener("touchmove",this._onTouchMove,{passive:!1}),t.addEventListener("touchend",this._onTouchEnd),t.addEventListener("touchcancel",this._onTouchEnd))}_unbindScroller(){this._scroller&&(this._scroller.removeEventListener("touchstart",this._onTouchStart),this._scroller.removeEventListener("touchmove",this._onTouchMove),this._scroller.removeEventListener("touchend",this._onTouchEnd),this._scroller.removeEventListener("touchcancel",this._onTouchEnd),this._scroller=null)}_setTranslate(t,n){this._scroller&&(this._scroller.style.transform=`translateY(${t}px)`);const i=this.shadowRoot.querySelector(".m-pull-refresh__indicator");if(i){i.style.transform=`translateY(${t-this.threshold}px)`;const e=i.querySelector(".m-pull-refresh__arrow"),o=i.querySelector(".m-pull-refresh__spinner"),s=i.querySelector(".m-pull-refresh__text");if(n)e&&(e.style.display="none"),o&&(o.style.display="inline-block"),s&&(s.textContent="刷新中...");else if(e&&(e.style.display="inline-block"),o&&(o.style.display="none"),s&&(s.textContent=t>=this.threshold&&this._pulling?"释放刷新":"下拉刷新"),e){const h=Math.min(t/this.threshold*180,180);e.style.transform=`rotate(${h}deg)`}}}_findScrollRoot(){const t=this._scroller;if(t&&t.scrollHeight>t.clientHeight+1)return t;let n=this.parentElement;for(;n;){const i=getComputedStyle(n).overflowY;if((i==="auto"||i==="scroll")&&n.scrollHeight>n.clientHeight+1)return n;n=n.parentElement}return document.scrollingElement??document.documentElement}_atTop(){var t;return(((t=this._scrollRoot)==null?void 0:t.scrollTop)??0)<=0}render(){return l`
      <div class="m-pull-refresh" part="root">
        <div class="m-pull-refresh__indicator" part="indicator" aria-hidden="true">
          <span class="m-pull-refresh__spinner" aria-hidden="true"></span>
          <svg class="m-pull-refresh__arrow" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3v10M4 7l4-4 4 4"/>
          </svg>
          <span class="m-pull-refresh__text">下拉刷新</span>
        </div>
        <div class="m-pull-refresh__scroller" part="scroller">
          <slot></slot>
        </div>
      </div>
    `}};ft.styles=_n;let q=ft;Rt([a({type:Boolean})],q.prototype,"refreshing");Rt([a({type:Number})],q.prototype,"threshold");customElements.define("m-pull-refresh",q);const gn=`/* ===== m-stepper ===== */

:host {
  display: inline-flex;
  -webkit-tap-highlight-color: transparent;
}

.m-stepper {
  display: inline-flex;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--z-color-border-control);
  border-radius: var(--z-radius-md);
  background: var(--z-color-surface);
}

.m-stepper--disabled {
  opacity: 0.5;
}

.m-stepper__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* [WHY 44px] 触控下限。这里不能沿用 --z-control-h（36px）：
     两个按钮挨着，36px 时手指很容易一次按到两个或按到中间的数字上。 */
  width: var(--z-touch-min);
  height: var(--z-touch-min-sm);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--z-color-text);
  cursor: pointer;
}

.m-stepper__btn:active:not(:disabled) {
  background: var(--z-color-fill-secondary);
}

.m-stepper__btn:disabled {
  color: var(--z-color-text-disabled);
  cursor: default;
}

.m-stepper__value {
  min-width: 40px;
  padding: 0 var(--z-space-1);
  border-right: 1px solid var(--z-color-border-control);
  border-left: 1px solid var(--z-color-border-control);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  line-height: var(--z-touch-min-sm);
  text-align: center;
  font-variant-numeric: tabular-nums;
}
`;var yn=Object.defineProperty,M=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&yn(t,n,e),e};const vt=class vt extends d{constructor(){super(...arguments),this.value=0,this.min=0,this.step=1,this.disabled=!1,this._onClick=t=>{if(this.disabled)return;const n=t.target.closest("[data-act]");if(!n)return;const i=this.value,e=this._clamp(n.dataset.act==="plus"?i+this.step:i-this.step);e!==i&&(this.value=e,this.emit("z-change",{value:e,prev:i}))}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}get _precision(){const t=String(this.step),n=t.indexOf(".");return n<0?0:t.length-n-1}_clamp(t){const n=this.min??Number.NEGATIVE_INFINITY,i=this.max??Number.POSITIVE_INFINITY,e=Number(t.toFixed(this._precision));return Math.min(i,Math.max(n,e))}_atMin(){return this.min!==void 0&&this.value<=this.min}_atMax(){return this.max!==void 0&&this.value>=this.max}render(){const t=this.disabled||this._atMin(),n=this.disabled||this._atMax();return l`
      <div class="m-stepper${this.disabled?" m-stepper--disabled":""}" part="root">
        <button
          class="m-stepper__btn"
          part="minus"
          type="button"
          data-act="minus"
          aria-label="减少"
          ${t?"disabled":""}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
        <span class="m-stepper__value" part="value" role="status" aria-live="polite">${String(this.value)}</span>
        <button
          class="m-stepper__btn"
          part="plus"
          type="button"
          data-act="plus"
          aria-label="增加"
          ${n?"disabled":""}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 7H11M7 3V11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `}};vt.styles=gn;let g=vt;M([a({type:Number})],g.prototype,"value");M([a({type:Number})],g.prototype,"min");M([a({type:Number})],g.prototype,"max");M([a({type:Number})],g.prototype,"step");M([a({type:Boolean})],g.prototype,"disabled");customElements.define("m-stepper",g);const xn=`/* ===== m-picker ===== */

:host {
  -webkit-tap-highlight-color: transparent;
}

.m-picker__overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-z-modal);
  display: flex;
  align-items: flex-end;
  background: var(--z-color-bg-overlay);
  animation: m-picker-fade-in var(--z-anim-duration-fast) ease-out;
}

.m-picker__overlay--closing {
  animation: m-picker-fade-out var(--z-anim-duration-fast) ease-in forwards;
}

.m-picker__panel {
  width: 100%;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  background: var(--z-color-surface);
  border-radius: var(--z-radius-lg) var(--z-radius-lg) 0 0;
  animation: m-picker-slide-up var(--z-anim-duration-normal) ease-out;
}

.m-picker__panel--closing {
  animation: m-picker-slide-down var(--z-anim-duration-normal) ease-in forwards;
}

.m-picker__head {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  padding: var(--z-space-2) var(--z-space-3);
  border-bottom: 1px solid var(--z-color-divider);
}

.m-picker__title {
  flex: 1 1 auto;
  overflow: hidden;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  font-weight: var(--z-font-weight-medium);
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-picker__act {
  flex: 0 0 auto;
  min-width: var(--z-touch-min);
  min-height: var(--z-touch-min-sm);
  padding: 0 var(--z-space-2);
  border: 0;
  background: transparent;
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  cursor: pointer;
}

.m-picker__act--primary {
  color: var(--z-color-primary);
  font-weight: var(--z-font-weight-medium);
}

.m-picker__list {
  flex: 1 1 auto;
  overflow-y: auto;
  /* [WHY 惯性滚动 + 边界不穿透] iOS 上内层滚动到顶会继续滚动外层页面，
     看起来像「面板自己跳走了」。 */
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding-bottom: var(--z-safe-bottom);
}

.m-picker__option {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-1);
  width: 100%;
  min-height: var(--z-touch-min);
  padding: var(--z-space-2) var(--z-m-gutter);
  border: 0;
  background: transparent;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  cursor: pointer;
}

.m-picker__option:active {
  background: var(--z-color-fill-secondary);
}

.m-picker__option--on {
  color: var(--z-color-primary);
  font-weight: var(--z-font-weight-medium);
}

.m-picker__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-picker__check {
  display: inline-flex;
  flex: 0 0 auto;
}

@keyframes m-picker-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes m-picker-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes m-picker-slide-up {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

@keyframes m-picker-slide-down {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}
`;var zn=Object.defineProperty,B=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&zn(t,n,e),e};const _t=class _t extends d{constructor(){super(...arguments),this.open=!1,this.heading="",this.options=[],this.value="",this.confirmText=x.confirm,this.cancelText=x.cancel,this._draft="",this._wasOpen=!1,this._closing=!1,this._draftSynced=!1,this._onOverlayClick=t=>{t.target===t.currentTarget&&this._onCancel()},this._onOptionClick=t=>{const n=t.currentTarget;this._draft=n.dataset.value??"",this.requestUpdate()},this._onConfirm=()=>{const t=this.options.find(n=>n.value===this._draft);this.emit("z-confirm",{value:this._draft,label:(t==null?void 0:t.label)??""}),this._close()},this._onCancel=()=>{this._draft=this.value,this.emit("z-cancel",{value:this.value}),this._close()}}updated(){const t=this._wasOpen;this._wasOpen=this.open,this.open&&!t&&(this._draft=this.value,this._draftSynced=!0);const n=this.shadowRoot.querySelector(".m-picker__overlay");n&&n.addEventListener("click",this._onOverlayClick),this.shadowRoot.querySelectorAll(".m-picker__option").forEach(o=>{o.addEventListener("click",this._onOptionClick)});const i=this.shadowRoot.querySelector("[data-act='confirm']");i&&i.addEventListener("click",this._onConfirm);const e=this.shadowRoot.querySelector("[data-act='cancel']");if(e&&e.addEventListener("click",this._onCancel),!this.open&&t&&!this._closing&&(this._closing=!0,this.requestUpdate()),this._closing){const o=this.shadowRoot.querySelector(".m-picker__panel");if(o){const s=h=>{h.target===o&&(o.removeEventListener("animationend",s),this._closing=!1,this.requestUpdate())};o.addEventListener("animationend",s)}}}_close(){this.open=!1}render(){if(!this.open&&!this._closing)return l`<div style="display:none" part="hidden"></div>`;const t=this._draftSynced?this._draft:this.value,n=this.options.map(i=>{const e=i.value===t;return l`
          <button
            type="button"
            class="m-picker__option${e?" m-picker__option--on":""}"
            part="option"
            data-value="${c(i.value)}"
            aria-pressed="${e?"true":"false"}"
          >
            <span class="m-picker__label">${c(i.label)}</span>
            ${e?l`<span class="m-picker__check" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7.5L5.5 10.5L11.5 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>`:""}
          </button>
        `}).join("");return l`
      <div class="m-picker__overlay${this._closing?" m-picker__overlay--closing":""}" part="overlay">
        <div class="m-picker__panel${this._closing?" m-picker__panel--closing":""}" part="panel" role="dialog" aria-modal="true">
          <div class="m-picker__head" part="head">
            <button class="m-picker__act" part="cancel" type="button" data-act="cancel">${c(this.cancelText)}</button>
            <span class="m-picker__title" part="title">${c(this.heading)}</span>
            <button class="m-picker__act m-picker__act--primary" part="confirm" type="button" data-act="confirm">
              ${c(this.confirmText)}
            </button>
          </div>
          <div class="m-picker__list" part="list" role="listbox">${n}</div>
        </div>
      </div>
    `}};_t.styles=xn;let v=_t;B([a({type:Boolean})],v.prototype,"open");B([a({type:String})],v.prototype,"heading");B([a({attribute:!1})],v.prototype,"options");B([a({type:String})],v.prototype,"value");B([a({type:String,attribute:"confirm-text"})],v.prototype,"confirmText");B([a({type:String,attribute:"cancel-text"})],v.prototype,"cancelText");customElements.define("m-picker",v);const kn=`/* ===== m-uploader ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-uploader {
  display: grid;
  /* [WHY 固定 4 列 + 1:1] 缩略图必须是正方形宫格：按内容自适应时，
     竖拍和横拍的照片会让同一行的格子高度不一致，看起来像排版错乱。 */
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--z-space-2);
}

.m-uploader__tile {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  aspect-ratio: 1;
  border: 1px solid var(--z-color-border-control);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
}

.m-uploader__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 视频缩略图：与照片共用同一个 1:1 格子。\`object-fit: cover\` 的理由与照片一样 ——
   竖拍视频的首帧直接塞进方格会被拉伸变形，看起来像「图坏了」。 */
.m-uploader__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 播放角标：不给它的话，视频那格与照片长得一模一样，用户点开才知道是视频。
   位置压在右下角避开删除按钮（右上角）。 */
.m-uploader__play {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--z-radius-full);
  background: rgba(0, 0, 0, 0.55);
  color: var(--z-color-white);
  pointer-events: none;
}

.m-uploader__name {
  padding: var(--z-space-1);
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  line-height: 1.3;
  text-align: center;
  word-break: break-all;
}

.m-uploader__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: var(--z-radius-full);
  background: rgba(0, 0, 0, 0.55);
  color: var(--z-color-white);
  cursor: pointer;
}

.m-uploader__add {
  flex-direction: column;
  gap: 2px;
  border-style: dashed;
  background: transparent;
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  cursor: pointer;
}

.m-uploader__add:active {
  background: var(--z-color-fill-secondary);
}

.m-uploader__add-label {
  line-height: 1;
}

/* 拍照入口（\`capture=\` 开着时出来的两个格子之一）：这一组里的主操作，给它主色。
   相册那条留虚线灰（次要来源）—— 两个一样重的入口，用户每次都要先读字再选。 */
.m-uploader__add--shot {
  border-style: solid;
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.m-uploader__add--shot:active {
  background: var(--z-color-primary-soft);
}
`;function wn(r,t,n){const i=Math.max(r,t);if(!(n>0)||i<=n)return null;const e=n/i;return{width:Math.max(1,Math.round(r*e)),height:Math.max(1,Math.round(t*e))}}async function Cn(r,t){const n=Math.floor(t.maxEdge);if(!(n>0)||!r.type.startsWith("image/")||/^image\/(gif|svg\+xml)$/.test(r.type))return r;let i="";try{i=URL.createObjectURL(r);const e=await $n(i),o=wn(e.naturalWidth||e.width,e.naturalHeight||e.height,n);if(!o)return r;const s=document.createElement("canvas");s.width=o.width,s.height=o.height;const h=s.getContext("2d");if(!h)return r;h.drawImage(e,0,0,o.width,o.height);const y=await En(s,t.quality??.82);return!y||y.size>=r.size?r:new File([y],Sn(r.name),{type:y.type||"image/jpeg",lastModified:r.lastModified})}catch{return r}finally{i&&URL.revokeObjectURL(i)}}function $n(r){return new Promise((t,n)=>{const i=new Image;i.onload=()=>t(i),i.onerror=()=>n(new Error("decode failed")),i.src=r})}function En(r,t){return new Promise(n=>{if(typeof r.toBlob!="function"){n(null);return}r.toBlob(i=>n(i),"image/jpeg",t)})}function Sn(r){const t=r.lastIndexOf(".");return`${t>0?r.slice(0,t):r}.jpg`}var Ln=Object.defineProperty,m=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Ln(t,n,e),e};const bt=class bt extends d{constructor(){super(...arguments),this.files=[],this.accept="image/*",this.multiple=!1,this.max=9,this.disabled=!1,this.addLabel="上传",this.capture="",this.maxEdge=0,this.quality=.82,this.maxSize=0,this._onClick=t=>{if(this.disabled)return;const n=t.target.closest("[data-act]");if(!n)return;const i=n.dataset.act;i==="add"||i==="album"?this._pick("album"):i==="shot"?this._pick("camera"):i==="remove"&&this.emit("z-remove",{index:Number(n.dataset.index)})},this._onChange=t=>{const n=t.target;if(!n.classList.contains("m-uploader__file"))return;const i=n.dataset.src==="camera"?"camera":"album",e=Array.from(n.files??[]);if(n.value="",!e.length)return;const o=this.maxSize>0?e.filter(I=>I.size>this.maxSize):[],s=o.length?e.filter(I=>!o.includes(I)):e;if(o.length&&this.emit("z-reject",{files:o,reason:"size",limit:this.maxSize}),!s.length)return;const h=Math.max(0,this.max-this.files.length),y=this.multiple&&i==="album"?s.slice(0,h):s.slice(0,Math.min(1,h));y.length&&this._emitPicked(y,i)}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("change",this._onChange)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("change",this._onChange),super.disconnectedCallback()}get _camera(){const t=(this.capture||"").trim().toLowerCase();return t==="off"||t==="false"||t==="none"?!1:t!==""||this.hasAttribute("capture")}get _facing(){const t=(this.capture||"").trim().toLowerCase();return t==="user"||t==="front"?"user":"environment"}get _mediaKind(){const t=(this.accept||"").split(",").map(e=>e.trim().toLowerCase()).filter(Boolean);if(!t.length)return"image";const n=t.some(e=>e.startsWith("video/")),i=t.some(e=>e.startsWith("image/"));return n&&!i?"video":"image"}_pick(t){var i;(i=this.shadowRoot.querySelector(`input[data-src="${t}"]`)??this.shadowRoot.querySelector("input[type=file]"))==null||i.click()}async _emitPicked(t,n){const i=[];for(const e of t)i.push(this.maxEdge>0?await Cn(e,{maxEdge:this.maxEdge,quality:this.quality}):e);this.emit("z-select",{files:i,source:n})}render(){const t=this.files.length>=this.max,n=this.files.map((e,o)=>{const s=e.url?e.type==="video"?l`<video
                  class="m-uploader__video"
                  src="${b(e.url)}"
                  ${e.poster?l`poster="${b(e.poster)}"`:""}
                  muted
                  playsinline
                  preload="metadata"
                  role="img"
                  aria-label="视频：${b(e.name??"")}"
                ></video>
                <span class="m-uploader__play" aria-hidden="true">
                  <svg width="9" height="11" viewBox="0 0 10 12" fill="currentColor">
                    <path d="M1 1.3c0-.9 1-1.5 1.8-1L9 5.1c.8.5.8 1.6 0 2.1L2.8 11.7c-.8.5-1.8-.1-1.8-1z" />
                  </svg>
                </span>`:l`<img class="m-uploader__img" src="${b(e.url)}" alt="${b(e.name??"")}" />`:l`<span class="m-uploader__name">${c(e.name??"已选择")}</span>`;return l`
          <div class="m-uploader__tile" part="tile">
            ${s}
            ${this.disabled?"":l`<button class="m-uploader__remove" part="remove" type="button" data-act="remove" data-index="${o}" aria-label="删除">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
                  </svg>
                </button>`}
          </div>
        `}).join(""),i=t||this.disabled?"":this._camera?this._cameraEntries():this._singleEntry();return l`
      <div class="m-uploader" part="root">
        ${n}${i}
        <input
          class="m-uploader__file"
          type="file"
          data-src="album"
          accept="${c(this.accept)}"
          ${this.multiple?"multiple":""}
          hidden
          aria-hidden="true"
          tabindex="-1"
        />
        ${this._camera?l`<input
              class="m-uploader__file"
              type="file"
              data-src="camera"
              accept="${c(this.accept)}"
              capture="${c(this._facing)}"
              hidden
              aria-hidden="true"
              tabindex="-1"
            />`:""}
      </div>
    `}_singleEntry(){return l`
      <button class="m-uploader__tile m-uploader__add" part="add" type="button" data-act="add">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4V16M4 10H16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
        </svg>
        <span class="m-uploader__add-label">${c(this.addLabel)}</span>
      </button>
    `}_cameraEntries(){const t=this._mediaKind==="video",n=t?l`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="6.5" width="12.5" height="11" rx="2.2" stroke="currentColor" stroke-width="1.5" />
          <path d="M15 11.2 20 8.7c.7-.3 1.5.2 1.5 1v4.6c0 .8-.8 1.3-1.5 1L15 12.8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>`:l`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 8.5A2 2 0 0 1 5 6.5h2.2l1.1-1.6a1.5 1.5 0 0 1 1.2-.6h5a1.5 1.5 0 0 1 1.2.6l1.1 1.6H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          <circle cx="12" cy="13" r="3.4" stroke="currentColor" stroke-width="1.5" />
        </svg>`;return l`
      <button class="m-uploader__tile m-uploader__add m-uploader__add--shot" part="shot" type="button" data-act="shot">
        ${n}
        <span class="m-uploader__add-label">${t?"录像":"拍照"}</span>
      </button>
      <button class="m-uploader__tile m-uploader__add" part="album" type="button" data-act="album">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="14" rx="2" stroke="currentColor" stroke-width="1.5" />
          <circle cx="9" cy="10" r="1.6" stroke="currentColor" stroke-width="1.3" />
          <path d="M4 16.5 9.6 12l4 3.4 2.6-2 3.8 3.1" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
        </svg>
        <span class="m-uploader__add-label">相册</span>
      </button>
    `}};bt.styles=kn;let p=bt;m([a({attribute:!1})],p.prototype,"files");m([a({type:String})],p.prototype,"accept");m([a({type:Boolean})],p.prototype,"multiple");m([a({type:Number})],p.prototype,"max");m([a({type:Boolean})],p.prototype,"disabled");m([a({type:String,attribute:"add-label"})],p.prototype,"addLabel");m([a({type:String})],p.prototype,"capture");m([a({type:Number,attribute:"max-edge"})],p.prototype,"maxEdge");m([a({type:Number})],p.prototype,"quality");m([a({type:Number,attribute:"max-size"})],p.prototype,"maxSize");customElements.define("m-uploader",p);const Rn=`/* ===== m-swipe-cell ===== */

/*
 * 两层结构：
 *   .z-m-swipe__content  内容层（跟着手指平移，背景不透明 —— 它要盖住操作区）
 *   .z-m-swipe__actions  操作层（绝对定位在右侧，平时被内容层压住）
 *
 * [WHY 用 translate3d 而不是 left/right] 位移走合成层，不触发重排：一行 56px 的
 * 列表里逐帧改 left 会让整个列表参与 layout，移动端的掉帧是从这里来的。
 */

:host {
  display: block;
  position: relative;
  overflow: hidden;
  /* 手势区不吃浏览器的点击高亮，否则按下时整行闪一下灰 */
  -webkit-tap-highlight-color: transparent;
}

.z-m-swipe__content {
  position: relative;
  /* 必须高于操作层：它靠「盖住」来隐藏右侧按钮，而不是靠 display:none */
  z-index: 1;
  background: var(--z-color-surface);
  transition: transform var(--z-transition-normal) cubic-bezier(0.22, 0.61, 0.36, 1);
  will-change: transform;
  /* 内容层本身要能接键盘焦点（左滑的键盘等价入口） */
  outline: none;
}

/* 拖动中关掉过渡，位移才跟手；松手时由 JS 摘掉这个属性，过渡自然接上 */
:host([dragging]) .z-m-swipe__content {
  transition: none;
}

/*
 * [WHY 焦点框画在内侧] 内容层是满宽的，外描边会被 host 的 overflow:hidden 切掉一半 ——
 * 看起来像「左边有框、右边没有」，比没有焦点框更让人困惑。
 */
.z-m-swipe__content:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: -2px;
}

.z-m-swipe__actions {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  display: flex;
  /* 操作区不参与布局宽度：它的宽度由按钮自己撑开，内容层按需平移过去 */
  z-index: 0;
}

/*
 * 宿主放进来的按钮：撑满行高、至少满足触摸下限。
 *
 * [WHY 用 ::slotted 定这些而不是让宿主自己写] 宿主只需要决定「是什么操作、什么颜色」，
 * 「多高、多宽、怎么对齐」是组件契约的一部分 —— 放开会让每处左滑的按钮形状都不一样，
 * 而它们的视觉位置恰好紧挨着，不一致一眼就能看出来。
 */
.z-m-swipe__actions ::slotted(*) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 72px;
  height: 100%;
  min-height: var(--z-m-row-h);
  padding: 0 var(--z-space-4);
  border: 0;
  border-radius: 0;
  background: var(--z-color-danger);
  color: var(--z-color-white);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  cursor: pointer;
}

/*
 * [WHY 没有「第一个红、其余灰」这条规则] 本来写了 \`::slotted(*:not(:first-child))\`，
 * 结果**两个按钮都是灰的**：\`:first-child\` 判的是它在 light DOM 里的位置，而第一行
 * 放的是 \`m-cell\`（内容），按钮是第 2、3 个子元素，于是全都命中 \`:not(:first-child)\`。
 * 而 \`::slotted\` 又不支持兄弟选择器，选不出「第一个按钮」。
 *
 * 更根本的是：第二个按钮该是什么颜色本来就取决于它是什么操作（「置顶」是中性、
 * 「取消」也是中性、但「强制删除」又该是红的）—— 这个判断只有宿主有。所以这里
 * 只给一个安全默认（全部危险色），配色交给宿主。
 */
`;var Tn=Object.defineProperty,tt=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&Tn(t,n,e),e};let _=null;const wt=6;function Ct(r){if(!r)return 0;const t=/translate3d\((-?[\d.]+)px/.exec(r.style.transform);return t?Number(t[1]):0}const gt=class gt extends d{constructor(){super(...arguments),this.open=!1,this.disabled=!1,this.threshold=.3,this._dragging=!1,this._startX=0,this._startY=0,this._startOffset=0,this._axis="none",this._actionWidth=0,this._lastX=0,this._focusTarget=null,this._onTouchStart=t=>{if(this.disabled)return;const n=t;n.touches.length===1&&(this._measure(),!(this._actionWidth<=0)&&(this._startX=n.touches[0].clientX,this._startY=n.touches[0].clientY,this._startOffset=this.open?-this._actionWidth:0,this._axis="none"))},this._onTouchMove=t=>{if(this.disabled||this._actionWidth<=0)return;const n=t;if(n.touches.length!==1)return;const i=n.touches[0].clientX-this._startX,e=n.touches[0].clientY-this._startY;if(this._axis==="none"){if(Math.abs(i)<wt&&Math.abs(e)<wt)return;this._axis=Math.abs(i)>Math.abs(e)?"x":"y"}if(this._axis!=="x")return;n.preventDefault();let o=this._startOffset+i;o<-this._actionWidth&&(o=-this._actionWidth-(-o-this._actionWidth)/3),o>0&&(o=o/3),this._follow(o)},this._onTouchEnd=()=>{if(this.disabled)return;if(this._axis!=="x"){this._axis="none";return}this._axis="none",this._dragging=!1,this.toggleAttribute("dragging",!1);const t=Ct(this._content),n=this._actionWidth;if(this.open){Math.abs(t)<n*(1-this.threshold)?this.close()||this._slideTo(t,-n):this._slideTo(t,-n);return}Math.abs(t)>n*this.threshold?this.show():this._slideTo(t,0)},this._onContentClick=t=>{var n;this.open&&((n=this._actions)!=null&&n.contains(t.target)||this.close()&&t.stopPropagation())},this._onKeyDown=t=>{if(this.disabled)return;const n=t;if(!this.open){(n.key==="Enter"||n.key==="ArrowLeft")&&(n.preventDefault(),this.show(!0));return}(n.key==="Escape"||n.key==="ArrowRight"||n.key==="Enter")&&(n.preventDefault(),this.close()&&(this._focusTarget="content"))}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("touchstart",this._onTouchStart,{passive:!0}),this.shadowRoot.addEventListener("touchmove",this._onTouchMove,{passive:!1}),this.shadowRoot.addEventListener("touchend",this._onTouchEnd),this.shadowRoot.addEventListener("touchcancel",this._onTouchEnd),this.shadowRoot.addEventListener("keydown",this._onKeyDown),this.shadowRoot.addEventListener("click",this._onContentClick,!0)}disconnectedCallback(){this.shadowRoot.removeEventListener("touchstart",this._onTouchStart),this.shadowRoot.removeEventListener("touchmove",this._onTouchMove),this.shadowRoot.removeEventListener("touchend",this._onTouchEnd),this.shadowRoot.removeEventListener("touchcancel",this._onTouchEnd),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),this.shadowRoot.removeEventListener("click",this._onContentClick,!0),_===this&&(_=null),super.disconnectedCallback()}close(){return this.open?this.emit("z-before-close",{reason:"close"},{cancelable:!0}).defaultPrevented?!1:(this.open=!1,!0):!0}show(t=!1){this.disabled||this.open||(_==null||_.close(),this.open=!0,t&&(this._focusTarget="action"))}get _content(){return this.shadowRoot.querySelector(".z-m-swipe__content")}get _actions(){return this.shadowRoot.querySelector(".z-m-swipe__actions")}_measure(){var t;return this._actionWidth=((t=this._actions)==null?void 0:t.offsetWidth)??0,this._actionWidth}_slideTo(t,n){const i=this._content;if(!i)return;const e=s=>s===0?"":`translate3d(${s}px, 0, 0)`;if(t===n){i.style.transition="",i.style.transform=e(n);return}i.style.transition="none",i.style.transform=e(t),(typeof requestAnimationFrame=="function"?requestAnimationFrame:s=>setTimeout(()=>s(0),16))(()=>{const s=this._content;s&&(s.style.transition="",s.style.transform=e(n))})}_follow(t){const n=this._content;n&&(this._dragging=!0,this.toggleAttribute("dragging",!0),n.style.transition="none",n.style.transform=t===0?"":`translate3d(${t}px, 0, 0)`)}willUpdate(){this._lastX=Ct(this._content)}updated(){var e;const t=this._content,n=this._actions;if(!t||!n)return;if(!!this.querySelector('[slot="actions"]')&&!this.disabled?t.setAttribute("tabindex","0"):t.removeAttribute("tabindex"),this.open?n.removeAttribute("inert"):n.setAttribute("inert",""),!this._dragging){const o=this._measure();this._slideTo(this._lastX,this.open?-o:0)}if(this.open?(_=this,this.emit("z-swipe-open",{width:this._actionWidth})):_===this&&(_=null,this.emit("z-swipe-close",{})),this._focusTarget){const o=this._focusTarget==="content"?t:this.querySelector('[slot="actions"]');this._focusTarget=null,(e=o==null?void 0:o.focus)==null||e.call(o)}}render(){return l`
      <div class="z-m-swipe__content" part="content"><slot></slot></div>
      <div class="z-m-swipe__actions" part="actions" role="group" aria-label="${x.rowActions}">
        <slot name="actions"></slot>
      </div>
    `}};gt.styles=Rn;let j=gt;tt([a({type:Boolean})],j.prototype,"open");tt([a({type:Boolean})],j.prototype,"disabled");tt([a({type:Number})],j.prototype,"threshold");customElements.define("m-swipe-cell",j);const Pn=`/* ===== m-index-bar ===== */

/*
 * 布局：body 占满宽度，索引条叠在它右侧。
 *
 * [WHY 用 flex + sticky + 负 margin，而不是 absolute] 索引条要**跟着视口**待着，
 * 而不是跟着内容跑到屏幕外。absolute 相对宿主定位，宿主高度等于全部内容高度，
 * 滚到第三屏时索引条早就出了视口。sticky 才能做到「内容在滚、索引条停住」；
 * 负 margin 让它不占宽度 —— 索引条是浮在内容上的，不该把行挤窄。
 */
:host {
  display: flex;
  align-items: flex-start;
  position: relative;
  -webkit-tap-highlight-color: transparent;
}

.z-m-index-bar__body {
  flex: 1 1 auto;
  /* [WHY min-width 0] flex 子项默认 min-width:auto，长内容会把 body 撑得比容器还宽，
     索引条随即被挤出视口。 */
  min-width: 0;
  /*
   * [WHY 右侧留 20px] 索引条是**叠在**内容上的浮层（负 margin）。不留白时，行右端的值
   * 文案（「12 单」「128 单」）会被字母压住 —— 实测「7 单」只剩「7」，而列表本身
   * 看起来是正常的，只有对着截图才看得出来。20px 是索引条宽度减去行内已有 padding 后的余量。
   */
  padding-right: 20px;
}

.z-m-index-bar__rail {
  position: sticky;
  /*
   * [WHY 用 50% 而不是 50vh] 这里最容易踩的坑：索引条的父容器通常是
   * \`max-height + overflow-y:auto\` 的列表，而 **overflow 的容器会裁剪 sticky 子元素**。
   * 用 50vh（= 450px）定位时，索引条被推到容器外面，容器裁掉它 —— 视觉上它还在
   * 原来的位置附近（被后面兄弟元素盖住），实际点上去命中的是**后面的元素**：
   * 表现为「点字母没反应」，而 elementFromPoint 一看命中的是别的组件。
   * 50% 是相对 containing block（可滚动的那层）算的，永远落在容器内。
   */
  top: 50%;
  transform: translateY(-50%);
  /* 叠到内容上：宽度由字母撑开，负 margin 抵消它的占位。
     [WHY -26px 而不是 -22px] 负得不够时，索引条会占掉列表 4px 宽、并被推到内容里；
     字母于是压在右侧的值文案上（「7 单」后面直接是「A」）。负满自身宽度才能完全叠在最右缘。 */
  margin-left: -26px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 3px;
  border-radius: 12px;
  /* [WHY 92% 而不是 72%] 索引条是浮在列表内容上的半透明底；太淡时白色字母背景压不住
     下面的行文字，字母与业务文案混在一起。 */
  background: color-mix(in srgb, var(--z-color-surface) 92%, transparent);
  /* 索引条本身不接指针事件以外的滚动，滚轮划过时应当滚页面 */
  touch-action: none;
}

.z-m-index-bar__item {
  appearance: none;
  border: 0;
  padding: 0;
  margin: 0;
  width: 20px;
  /* [WHY 10px 字号 + 16px 行高] 索引条常见 26 项，44px 的触摸下限在这里不成立
     （26 × 44 = 1144px）。它的可点性靠**滑动**而不是精确点中某一项 ——
     真正需要精确点击的场合，用户会改用搜索。 */
  height: 16px;
  line-height: 16px;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  font-weight: var(--z-font-weight-medium);
  color: var(--z-color-text-secondary);
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  user-select: none;
}

/* 当前分组：与「点上去」的视觉反馈同一套，避免出现两种「选中」样式 */
.z-m-index-bar__item[aria-current="true"] {
  color: var(--z-color-primary);
  background: var(--z-color-primary-soft);
}

.z-m-index-bar__item:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: 1px;
}

/*
 * 气泡：滑动索引条时手指会盖住它，所以把「当前在哪」搬到屏幕中央。
 * [WHY fixed 而不是跟随索引条] 手指按着索引条的时候，气泡放在它旁边就会被手挡住 ——
 * 这正是这个气泡存在的理由。
 */
.z-m-index-bar__bubble {
  position: fixed;
  left: 50%;
  top: 50%;
  display: none;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin: -32px 0 0 -32px;
  border-radius: var(--z-radius-lg);
  background: color-mix(in srgb, var(--z-color-text) 78%, transparent);
  color: var(--z-color-bg);
  font-family: var(--z-font-sans);
  font-size: 30px;
  font-weight: var(--z-font-weight-medium);
  pointer-events: none;
  z-index: var(--z-z-tooltip);
}

.z-m-index-bar__bubble[data-visible] {
  display: flex;
}
`;var jn=Object.defineProperty,N=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&jn(t,n,e),e};function Yn(r,t,n){if(n<=0||r.height<=0)return-1;const i=r.height/n,e=Math.floor((t-r.top)/i);return Math.max(0,Math.min(n-1,e))}const yt=class yt extends d{constructor(){super(...arguments),this.indexes="",this.active="",this.hideBubble=!1,this.railLabel="快速定位",this._scrollTarget=null,this._jumpLock=0,this._lockPos=-1,this._onScrollBound=null,this._sliding=!1,this._bubbleTimer=null,this._onRailClick=t=>{const n=t.target.closest("[data-idx]");n!=null&&n.dataset.idx&&this._jumpTo(n.dataset.idx)},this._onRailTouchStart=t=>{const n=t;!this.shadowRoot.querySelector(".z-m-index-bar__rail")||n.touches.length!==1||(this._sliding=!0,this._handleRailY(n.touches[0].clientY))},this._onRailTouchMove=t=>{if(!this._sliding)return;const n=t;n.touches.length===1&&(n.preventDefault(),this._handleRailY(n.touches[0].clientY))},this._onRailTouchEnd=()=>{this._sliding=!1}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onRailClick),this.shadowRoot.addEventListener("touchstart",this._onRailTouchStart,{passive:!0}),this.shadowRoot.addEventListener("touchmove",this._onRailTouchMove,{passive:!1}),this.shadowRoot.addEventListener("touchend",this._onRailTouchEnd)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onRailClick),this.shadowRoot.removeEventListener("touchstart",this._onRailTouchStart),this.shadowRoot.removeEventListener("touchmove",this._onRailTouchMove),this.shadowRoot.removeEventListener("touchend",this._onRailTouchEnd),this._detachScroll(),this._bubbleTimer!==null&&clearTimeout(this._bubbleTimer),super.disconnectedCallback()}_indexes(){const t=this.indexes.split(",").map(i=>i.trim()).filter(Boolean);if(t.length)return t;const n=[];for(const i of Array.from(this.querySelectorAll("[data-index]"))){const e=i.dataset.index??"";e&&!n.includes(e)&&n.push(e)}return n}_groupOf(t){return this.querySelector(`[data-index="${t}"]`)}_scrollParent(){const t=getComputedStyle(this);if(/(auto|scroll)/.test(t.overflowY)&&this.scrollHeight>this.clientHeight)return this;let n=this.parentElement;for(;n;){const i=getComputedStyle(n);if(/(auto|scroll)/.test(i.overflowY)&&n.scrollHeight>n.clientHeight)return n;n=n.parentElement}return window}_scrollEl(){const t=this._scrollTarget;return t&&t!==window?t:null}_attachScroll(){const t=this._scrollParent();this._scrollTarget!==t&&(this._detachScroll(),this._scrollTarget=t,this._onScrollBound=()=>this._syncActiveFromScroll(),t.addEventListener("scroll",this._onScrollBound,{passive:!0}))}_detachScroll(){!this._scrollTarget||!this._onScrollBound||(this._scrollTarget.removeEventListener("scroll",this._onScrollBound),this._scrollTarget=null,this._onScrollBound=null)}_jumpTo(t){const n=this._groupOf(t);if(!n)return;this._jumpLock=Date.now()+600,this._lockPos=-1,this._attachScroll();const i=this._scrollEl();if(i){const e=n.getBoundingClientRect().top-i.getBoundingClientRect().top-i.clientTop+i.scrollTop;i.scrollTo({top:e,behavior:"smooth"})}else{const e=n.getBoundingClientRect().top+window.scrollY;window.scrollTo({top:e,behavior:"smooth"})}t!==this.active&&(this.active=t,this.emit("z-index-change",{index:t}))}_syncActiveFromScroll(){var e,o;if(Date.now()<this._jumpLock){const s=((e=this._scrollEl())==null?void 0:e.scrollTop)??window.scrollY;if(s===this._lockPos)this._jumpLock=0;else{this._lockPos=s;return}}const t=this._indexes();if(!t.length)return;const n=((o=this._scrollEl())==null?void 0:o.getBoundingClientRect().top)??0;let i=t[0];for(const s of t){const h=this._groupOf(s);h&&h.getBoundingClientRect().top-n<=1&&(i=s)}i!==this.active&&(this.active=i,this.emit("z-index-change",{index:i}))}_showBubble(t){if(this.hideBubble)return;const n=this.shadowRoot.querySelector(".z-m-index-bar__bubble");n&&(n.textContent=t,n.setAttribute("data-visible",""),this._bubbleTimer!==null&&clearTimeout(this._bubbleTimer),this._bubbleTimer=window.setTimeout(()=>n.removeAttribute("data-visible"),600))}_handleRailY(t){const n=this.shadowRoot.querySelector(".z-m-index-bar__rail");if(!n)return;const i=this._indexes(),e=n.getBoundingClientRect(),o=Yn(e,t,i.length);if(o<0)return;const s=i[o];this._showBubble(s),this._jumpTo(s)}updated(){this._attachScroll()}render(){const t=this._indexes(),n=t.length?l`<div class="z-m-index-bar__rail" part="rail" role="navigation" aria-label="${this.railLabel}">
          ${t.map(e=>l`<button type="button" class="z-m-index-bar__item" part="item" data-idx="${e}"${this.active===e?' aria-current="true"':""}>${e}</button>`).join("")}
        </div>`:"",i=this.hideBubble?"":l`<div class="z-m-index-bar__bubble" part="bubble" aria-hidden="true"></div>`;return l`
      <div class="z-m-index-bar__body" part="body"><slot></slot></div>
      ${n}${i}
    `}};yt.styles=Pn;let w=yt;N([a({type:String})],w.prototype,"indexes");N([a({type:String})],w.prototype,"active");N([a({type:Boolean})],w.prototype,"hideBubble");N([a({type:String})],w.prototype,"railLabel");customElements.define("m-index-bar",w);const Bn=`/* ===== m-number-keyboard ===== */

/*
 * 固定在视口底部的键盘。
 *
 * [WHY 用 :host([open]) 控制显隐而不是 display:none 切换类] open 是 @property（默认反射），
 * 宿主直接写 \`el.open = true\` 就能出来 —— 类的增删要靠组件自己的 updated 去同步，
 * 多一条会漂移的路径。
 *
 * [WHY 收起时用 visibility 而不是 display:none] 高度测量需要在收起态也能取到值
 * （宿主拿 --z-m-keyboard-height 留白时可能还没打开过键盘）。display:none 的元素
 * 尺寸恒为 0，那条路径就退化成「留白 0，一打开就盖住输入框」。
 */
:host {
  display: block;
  /* 安全区：全面屏底部的横条压住最后一排键就点不准了 */
  --_safe: var(--z-safe-bottom);
  -webkit-tap-highlight-color: transparent;
}

.z-m-kb {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--z-z-modal);
  box-sizing: border-box;
  padding: var(--z-space-2) var(--z-space-2) calc(var(--z-space-2) + var(--_safe));
  background: var(--z-color-bg-secondary);
  border-top: 1px solid var(--z-color-border);
  transform: translateY(100%);
  visibility: hidden;
  transition:
    transform var(--z-transition-normal) cubic-bezier(0.22, 0.61, 0.36, 1),
  /* [WHY visibility 要跟 transform 一起过渡] 只切 transform 的话，收起的键盘仍可被 Tab 到
     —— 它只是被移出视口，DOM 里还在。visibility:hidden 会把它从焦序里摘掉，
     而 delay 让「滑出」这段动画能播完。 */
    visibility 0s linear var(--z-transition-normal);
}

.z-m-kb--open {
  transform: translateY(0);
  visibility: visible;
  transition:
    transform var(--z-transition-normal) cubic-bezier(0.22, 0.61, 0.36, 1),
    visibility 0s linear 0s;
}

.z-m-kb__title {
  padding: 0 var(--z-space-2) var(--z-space-2);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  text-align: center;
}

/*
 * 3 列网格。
 *
 * [WHY gap 用 6px 而不是 8~12px] 12 个键 + 间距必须塞进 375px 宽的屏幕且每键 ≥44px
 * 触摸下限：(375 - 2×8 - 2×6) / 3 ≈ 115px，够。间距再大就只是浪费手指的移动距离。
 */
.z-m-kb__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.z-m-kb__key {
  appearance: none;
  box-sizing: border-box;
  /* 触摸下限：低于 44px 的键在真机上「点三次中两次」 */
  min-height: 44px;
  border: 0;
  border-radius: var(--z-radius-md);
  background: var(--z-color-surface);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  /* 数字键要大：20px 让它在拇指下也能一眼确认按的是哪个 */
  font-size: 20px;
  font-weight: var(--z-font-weight-medium);
  cursor: pointer;
  transition: background var(--z-transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.z-m-kb__key:active {
  background: var(--z-color-bg-secondary);
}

.z-m-kb__key:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: -2px;
}

/* 退格键：功能键，比数字轻一档，避免和「0」抢注意力 */
.z-m-kb__key--fn {
  background: var(--z-color-bg);
  color: var(--z-color-text-secondary);
}

.z-m-kb__extra {
  appearance: none;
  box-sizing: border-box;
  width: 100%;
  min-height: 44px;
  margin-top: 6px;
  border: 0;
  border-radius: var(--z-radius-md);
  background: var(--z-color-primary);
  color: var(--z-color-white);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  font-weight: var(--z-font-weight-medium);
  cursor: pointer;
}

.z-m-kb__extra:focus-visible {
  outline: 2px solid var(--z-color-primary-strong);
  outline-offset: 2px;
}
`;var On=Object.defineProperty,C=(r,t,n,i)=>{for(var e=void 0,o=r.length-1,s;o>=0;o--)(s=r[o])&&(e=s(t,n,e)||e);return e&&On(t,n,e),e};function Hn(r,t,n=0){if(t==="backspace")return r.slice(0,-1);const[i="",e]=r.split("."),o=e!==void 0;return t==="."?o?r:r===""?"0.":`${r}.`:/^[0-9]$/.test(t)?o?(e??"").length>=2?r:`${r}${t}`:r==="0"?t:n>0&&i.length>=n?r:`${r}${t}`:r}const xt=class xt extends d{constructor(){super(...arguments),this.open=!1,this.title="",this.value="",this.maxIntDigits=0,this.extraKey=!1,this.extraKeyText=x.confirm,this.decimalPointText=x.decimalPoint,this._onClick=t=>{const n=t.target.closest("[data-key]");if((n==null?void 0:n.dataset.key)!==void 0){this.press(n.dataset.key);return}t.target.closest("[data-act='extra']")&&this.emit("z-extra",{value:this.value})}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}press(t){const n=Hn(this.value,t,this.maxIntDigits);return t==="backspace"?n===this.value?!1:(this.value=n,this.emit("z-delete",{value:n}),!0):n===this.value?!1:(this.value=n,this.emit("z-input",{value:n}),!0)}updated(){const t=this.getBoundingClientRect().height;t>0&&this.style.setProperty("--z-m-keyboard-height",`${Math.round(t)}px`),this.open&&this.emit("z-open",{height:t})}render(){const n=["1","2","3","4","5","6","7","8","9",".","0","backspace"].map(i=>{const e=i==="backspace",o=e?l`<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M8 5.5h10.5a1 1 0 011 1v9a1 1 0 01-1 1H8L3 11l5-5.5z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              <path d="M10.5 9l4 4m0-4l-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>`:i,h=e?` aria-label="${x.backspace}"`:i==="."?` aria-label="${this.decimalPointText}"`:"";return l`<button type="button" class="z-m-kb__key${e?" z-m-kb__key--fn":""}" part="key" data-key="${i}"${h}>${o}</button>`}).join("");return l`
      <div class="z-m-kb${this.open?" z-m-kb--open":""}" part="root">
        ${this.title?l`<div class="z-m-kb__title" part="title">${this.title}</div>`:""}
        <div class="z-m-kb__grid" part="grid">${n}</div>
        ${this.extraKey?l`<button type="button" class="z-m-kb__extra" part="extra" data-act="extra">${this.extraKeyText}</button>`:""}
      </div>
    `}};xt.styles=Bn;let u=xt;C([a({type:Boolean})],u.prototype,"open");C([a({type:String})],u.prototype,"title");C([a({type:String})],u.prototype,"value");C([a({type:Number})],u.prototype,"maxIntDigits");C([a({type:Boolean})],u.prototype,"extraKey");C([a({type:String})],u.prototype,"extraKeyText");C([a({type:String})],u.prototype,"decimalPointText");customElements.define("m-number-keyboard",u);
