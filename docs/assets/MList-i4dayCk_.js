import{B as u,a as p,h as s,p as i}from"./presets-CdaBrvJF.js";const f=`/* ===== m-cell ===== */

:host {
  display: block;
  -webkit-tap-highlight-color: transparent;
}

.m-cell {
  display: flex;
  align-items: center;
  gap: var(--z-space-3);
  /* [WHY min-height 用 token] 44px 是可点下限，48px 是「一行加说明也放得下」的舒适值。
     写死 px 会让 compact 密度下所有手机端行高一起失效。 */
  min-height: var(--z-m-row-h);
  padding: var(--z-space-2) var(--z-m-gutter);
  background: var(--z-color-surface);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-base);
  box-sizing: border-box;
}

/* 分隔线放在宿主上：这样分组里的相邻行不会出现「两条线叠成一条粗线」 */
:host([divider]) .m-cell {
  border-bottom: 1px solid var(--z-color-divider);
}

.m-cell--clickable {
  cursor: pointer;
  user-select: none;
  transition: background-color var(--z-transition-fast);
}

/* [WHY 用 :active 而不是 :hover] 手机上没有 hover 态；hover 在触控设备上会在
   抬起后残留，看起来像「点过的那行一直亮着」。 */
.m-cell--clickable:active {
  background: var(--z-color-fill-secondary);
}

.m-cell--clickable:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: -2px;
}

.m-cell__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.m-cell__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.m-cell__desc {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  line-height: 1.4;
}

.m-cell__value {
  display: flex;
  flex: 0 1 auto;
  align-items: center;
  gap: var(--z-space-2);
  max-width: 60%;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  text-align: right;
}

.m-cell__arrow {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  color: var(--z-color-text-disabled);
}
`;var b=Object.defineProperty,a=(c,e,t,h)=>{for(var n=void 0,l=c.length-1,d;l>=0;l--)(d=c[l])&&(n=d(e,t,n)||n);return n&&b(e,t,n),n};const v=class v extends u{constructor(){super(...arguments),this.label="",this.value="",this.desc="",this.arrow=!1,this.clickable=!1,this.divider=!1,this._onClick=()=>{this.clickable&&this.emit("z-click",{label:this.label,value:this.value})},this._onKeyDown=e=>{if(!this.clickable)return;const t=e;t.key!=="Enter"&&t.key!==" "||(t.preventDefault(),this._onClick())}}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}render(){const e=this.value?p(this.value):"",t=this.desc?s`<span class="m-cell__desc" part="desc">${p(this.desc)}</span>`:"",h=this.arrow?s`<span class="m-cell__arrow" part="arrow" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 3.5L10.5 8L6 12.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>`:"",n=this.clickable?s`role="button" tabindex="0"`:"";return s`
      <div class="m-cell${this.clickable?" m-cell--clickable":""}" part="root" ${n}>
        <slot name="prefix"></slot>
        <div class="m-cell__main">
          <span class="m-cell__label" part="label">${p(this.label)}</span>
          ${t}
        </div>
        <div class="m-cell__value" part="value"><slot>${e}</slot></div>
        ${h}
      </div>
    `}};v.styles=f;let r=v;a([i({type:String})],r.prototype,"label");a([i({type:String})],r.prototype,"value");a([i({type:String})],r.prototype,"desc");a([i({type:Boolean})],r.prototype,"arrow");a([i({type:Boolean})],r.prototype,"clickable");a([i({type:Boolean})],r.prototype,"divider");customElements.define("m-cell",r);const g=`/* ===== m-list ===== */

:host {
  display: block;
}

.m-list {
  width: 100%;
}

.m-list__sentinel {
  width: 100%;
  height: 1px;
  /* [WHY] 哨兵元素极小：作为 IntersectionObserver 的锚点，不影响视觉布局 */
  pointer-events: none;
}

.m-list__footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-2);
  min-height: 44px;
  padding: var(--z-space-3) var(--z-space-4);
  color: var(--z-color-text-secondary);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  -webkit-tap-highlight-color: transparent;
}

.m-list__footer--error {
  color: var(--z-color-danger);
  flex-wrap: wrap;
}

.m-list__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--z-color-gray-200);
  border-top-color: var(--z-color-primary);
  border-radius: 50%;
  animation: m-list-spin var(--z-duration-loop-fast) var(--z-ease-linear) infinite;
}

.m-list__text {
  line-height: 1.5;
}

.m-list__retry {
  border: none;
  background: transparent;
  color: var(--z-color-primary);
  font: inherit;
  font-size: var(--z-font-size-sm);
  padding: var(--z-space-1) var(--z-space-2);
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  -webkit-tap-highlight-color: transparent;
}

.m-list__retry:active {
  opacity: 0.7;
}

@keyframes m-list-spin {
  to { transform: rotate(360deg); }
}
`;var y=Object.defineProperty,m=(c,e,t,h)=>{for(var n=void 0,l=c.length-1,d;l>=0;l--)(d=c[l])&&(n=d(e,t,n)||n);return n&&y(e,t,n),n};const _=class _ extends u{constructor(){super(...arguments),this.loading=!1,this.finished=!1,this.error="",this._observer=null,this._scrollHandler=null,this._scrollTarget=null,this._debounceTimer=null,this._onRetryClick=()=>{this.emit("z-loadmore")}}connectedCallback(){super.connectedCallback(),"IntersectionObserver"in window?this._initObserver():this._setupScrollFallback()}disconnectedCallback(){this._cleanup(),super.disconnectedCallback()}updated(){const e=this.shadowRoot.querySelector(".m-list__retry");if(e&&e.addEventListener("click",this._onRetryClick),this._observer){const t=this.shadowRoot.querySelector(".m-list__sentinel");t&&(this._observer.disconnect(),!this.loading&&!this.finished&&!this.error&&this._observer.observe(t))}}_initObserver(){this._observer=new IntersectionObserver(e=>{const t=e[0];t&&t.isIntersecting&&!this.loading&&!this.finished&&!this.error&&this.emit("z-loadmore")},{root:null,rootMargin:"20px",threshold:0})}_setupScrollFallback(){const e=this._findScrollParent();e?this._scrollTarget=e:this._scrollTarget=document.scrollingElement||document.documentElement,this._scrollHandler=()=>{this._debounceTimer&&clearTimeout(this._debounceTimer),this._debounceTimer=setTimeout(()=>{if(this.loading||this.finished||this.error)return;const t=this.shadowRoot.querySelector(".m-list__sentinel");if(!t)return;t.getBoundingClientRect().top<=(window.innerHeight||document.documentElement.clientHeight)+20&&this.emit("z-loadmore")},200)},this._scrollTarget.addEventListener("scroll",this._scrollHandler,{passive:!0})}_findScrollParent(){let e=this.parentElement;for(;e;){const t=getComputedStyle(e);if(/(auto|scroll|overlay)/.test(t.overflowY))return e;e=e.parentElement}return null}_cleanup(){this._observer&&(this._observer.disconnect(),this._observer=null),this._scrollHandler&&this._scrollTarget&&(this._scrollTarget.removeEventListener("scroll",this._scrollHandler),this._scrollHandler=null,this._scrollTarget=null),this._debounceTimer&&(clearTimeout(this._debounceTimer),this._debounceTimer=null)}render(){let e="";return this.error?e=s`
        <div class="m-list__footer m-list__footer--error" part="footer">
          <span class="m-list__text">${p(this.error)}</span>
          <button type="button" class="m-list__retry" part="retry">点击重试</button>
        </div>
      `:this.loading?e=s`
        <div class="m-list__footer" part="footer">
          <span class="m-list__spinner" aria-hidden="true"></span>
          <span class="m-list__text">加载中...</span>
        </div>
      `:this.finished&&(e=s`
        <div class="m-list__footer" part="footer">
          <span class="m-list__text">没有更多了</span>
        </div>
      `),s`
      <div class="m-list" part="root">
        <slot></slot>
        <div class="m-list__sentinel" part="sentinel" aria-hidden="true"></div>
        ${e}
      </div>
    `}};_.styles=g;let o=_;m([i({type:Boolean})],o.prototype,"loading");m([i({type:Boolean})],o.prototype,"finished");m([i({type:String})],o.prototype,"error");customElements.define("m-list",o);
