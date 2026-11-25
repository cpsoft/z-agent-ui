import{B as p,h as c,p as s}from"./presets-CdaBrvJF.js";import{i as u}from"./styleInjection-peqqYNO6.js";import"./Position-D6zl9ryN.js";import{F as d}from"./floatingPanel-BYE_1ufg.js";const m=`/* ===== z-tooltip ===== */

:host {
  display: inline-flex;
}
`;var _=Object.defineProperty,n=(l,e,o,z)=>{for(var i=void 0,r=l.length-1,h;r>=0;r--)(h=l[r])&&(i=h(e,o,i)||i);return i&&_(e,o,i),i};const f=`
  .z-tooltip__popup {
    position: fixed;
    z-index: var(--z-z-tooltip);
    max-width: 280px;
    padding: 6px 10px;
    border-radius: var(--z-radius-md);
    /* [WHY] 2026-10-11 [[2026-10-11-theme-mode]]：原 gray-900 底 + white 字在 dark 块 gray 反转后
       变浅底白字（不可读）。改用 text/bg 语义对：亮色 #0f172a/#fff 与原值全等，暗色自动反转为浅底深字。 */
    background: var(--z-color-text);
    color: var(--z-color-bg);
    font-family: var(--z-font-sans);
    font-size: var(--z-font-size-xs);
    line-height: var(--z-line-height);
    pointer-events: none;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--z-anim-fade-duration) ease-out,
                transform var(--z-anim-fade-duration) ease-out;
    word-wrap: break-word;
  }
  .z-tooltip__popup--visible {
    opacity: 1;
    transform: translateY(0);
  }
  .z-tooltip__popup--hiding {
    opacity: 0;
    transform: translateY(2px);
    transition: opacity var(--z-duration-micro) var(--z-ease-exit),
                transform var(--z-duration-micro) var(--z-ease-exit);
  }
`,v=150,a=class a extends p{constructor(){super(...arguments),this.content="",this.placement="top",this.offset=6,this.delay=400,this._floating=new d(this),this._showTimer=null,this._onEnter=()=>{this.content&&(this._clearTimer(),this._showTimer=setTimeout(()=>this._show(),this.delay))},this._onLeave=()=>{this._clearTimer(),this._hide()},this._onFocusIn=()=>{this.content&&(this._clearTimer(),this._show())},this._onFocusOut=()=>{this._clearTimer(),this._hide()}}render(){return c`<slot></slot>`}connectedCallback(){super.connectedCallback(),u("z-tooltip",f),this.addEventListener("mouseenter",this._onEnter),this.addEventListener("mouseleave",this._onLeave),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("focusout",this._onFocusOut)}disconnectedCallback(){this._hide(),this.removeEventListener("mouseenter",this._onEnter),this.removeEventListener("mouseleave",this._onLeave),this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("focusout",this._onFocusOut),super.disconnectedCallback()}_show(){if(this._floating.isOpen||!this.content)return;this._floating.open({panelClass:"z-tooltip__popup",hidingClass:"z-tooltip__popup--hiding",part:"popup",role:"tooltip",tabIndex:!1,anchor:this,placement:this.placement,offset:this.offset},o=>{o.textContent=this.content});const e=this._floating.panel;requestAnimationFrame(()=>{e==null||e.classList.add("z-tooltip__popup--visible")})}_hide(){this._floating.isOpen&&this._floating.close(v)}_clearTimer(){this._showTimer&&(clearTimeout(this._showTimer),this._showTimer=null)}};a.styles=m;let t=a;n([s({type:String})],t.prototype,"content");n([s({type:String})],t.prototype,"placement");n([s({type:Number})],t.prototype,"offset");n([s({type:Number})],t.prototype,"delay");customElements.define("z-tooltip",t);
