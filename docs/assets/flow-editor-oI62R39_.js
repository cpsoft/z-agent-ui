import{e as V,B as M,p as h,h as D}from"./presets-CdaBrvJF.js";/* empty css             */import{d as ot}from"./a11y-DJ6wHu5s.js";import"./Position-D6zl9ryN.js";import{P as it}from"./PointerDragSession-D3R9IvJB.js";import"./Button-6M0Me5pu.js";import"./Checkbox-PuEiz19l.js";import{m as st}from"./shell-DwQ7nMfw.js";const rt=16,at=800;function lt(n,t){return t===1?n*rt:t===2?n*at:n}function dt(n){if(!n.ctrlKey&&!n.metaKey||!n.deltaY)return null;const t=n.deltaMode??0;return{direction:n.deltaY<0?1:-1,deltaPixels:lt(n.deltaY,t),rawDeltaY:n.deltaY,deltaMode:t}}function S(n){const t=n.split(",");if(t.length!==2||t[0]===""||t[1]==="")return null;const e=Number(t[0]),o=Number(t[1]);return!Number.isFinite(e)||!Number.isFinite(o)?null:{x:e,y:o}}function $(n,t,e){return Math.min(e,Math.max(t,n))}const j={top:{x:0,y:-1},right:{x:1,y:0},bottom:{x:0,y:1},left:{x:-1,y:0}};function Z(n,t,e,o,i="right",s="left"){const r=J(n,t,e,o,i,s);return`M ${n} ${t} C ${r.c1.x} ${r.c1.y}, ${r.c2.x} ${r.c2.y}, ${e} ${o}`}function J(n,t,e,o,i="right",s="left"){const r=Math.max(50,Math.abs(e-n)*.5),a=Math.max(50,Math.abs(o-t)*.5),l=j[i],p=j[s],c={x:n+r*l.x,y:t+a*l.y},u={x:e+r*p.x,y:o+a*p.y},d={x:(n+3*c.x+3*u.x+e)/8,y:(t+3*c.y+3*u.y+o)/8};return{c1:c,c2:u,mid:d}}function ct(n,t){return n.x<t.x+t.w&&n.x+n.w>t.x&&n.y<t.y+t.h&&n.y+n.h>t.y}function Q(n){return`${n.x},${n.y}`}function P(n){const t=S(n.position)??{x:0,y:0};return{x:t.x,y:t.y,w:n.offsetWidth||0,h:n.offsetHeight||0}}function ht(n,t,e,o){return{x:(n-e.left-o.x)/o.zoom,y:(t-e.top-o.y)/o.zoom}}function O(n,t,e,o){const i=S(n.position)??{x:0,y:0},s=(d,w)=>{const E=parseFloat(d);return Number.isFinite(E)?E:w},r=t===n.id?{x:s(n.style.left,i.x),y:s(n.style.top,i.y)}:i,a=n.getBoundingClientRect(),l=n.offsetWidth>0&&a.width>0?a.width/n.offsetWidth:1,p=(d,w)=>({x:(d-a.left)/l,y:(w-a.top)/l});let c=null;const u=Array.from(n.querySelectorAll("z-flow-handle"));if(e&&(c=u.find(d=>d.id===e)??null),!c&&o==="source"&&(c=u.find(d=>d.type==="source")??null),!c&&o==="target"&&(c=u.find(d=>d.type==="target")??null),c){const d=c.getBoundingClientRect(),w=p(d.left+d.width/2,d.top+d.height/2);return{x:r.x+w.x,y:r.y+w.y,pos:c.position}}return o==="source"?{x:r.x+n.offsetWidth,y:r.y+n.offsetHeight/2,pos:"right"}:{x:r.x,y:r.y+n.offsetHeight/2,pos:"left"}}function pt(n){const t=[];for(const e of n.edges){const o=n.resolveNode(e.source),i=n.resolveNode(e.target),s=o?O(o,n.draggingNodeId,e.sourceHandle,"source"):null,r=i?O(i,n.draggingNodeId,e.targetHandle,"target"):null;if(!s||!r)continue;const a=J(s.x,s.y,r.x,r.y,s.pos,r.pos);t.push({id:e.id,d:`M ${s.x} ${s.y} C ${a.c1.x} ${a.c1.y}, ${a.c2.x} ${a.c2.y}, ${r.x} ${r.y}`,animated:!!e.animated,dashed:!!e.dashed,selected:n.selectedEdges.has(e.id),label:e.label??"",lx:a.mid.x,ly:a.mid.y})}return t}function ut(n){const t=n.showEdgeArrow?`<defs><marker id="${n.markerId}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke"></path></marker></defs>`:"",e=n.showEdgeArrow?` marker-end="url(#${n.markerId})"`:"",o=n.geometries.map(s=>{const r=["z-flow__edge-path"];s.animated&&r.push("z-flow__edge-path--animated"),s.dashed&&r.push("z-flow__edge-path--dashed"),s.selected&&r.push("z-flow__edge-path--selected");const a=s.label?`<text class="z-flow__edge-label" x="${s.lx}" y="${s.ly}">${V(s.label)}</text>`:"";return`<path class="${r.join(" ")}" d="${s.d}"${e} data-edge-id="${V(s.id)}" data-zui-edge=""></path>`+a}).join(""),i=n.tempEdgeD?`<path class="z-flow__temp-edge" d="${n.tempEdgeD}"></path>`:'<path class="z-flow__temp-edge" hidden=""></path>';return t+o+i}const ft=`:host {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid var(--z-flow-handle-border, var(--z-color-primary));
  border-radius: 50%;
  background: var(--z-flow-handle-bg, var(--z-color-bg));
  cursor: crosshair;
  touch-action: none;
  z-index: 1;
}

:host([position="left"]) {
  left: -6px;
  right: auto;
}

:host([position="top"]) {
  top: -6px;
  bottom: auto;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

:host([position="bottom"]) {
  bottom: -6px;
  top: auto;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
}

:host(.z-flow-handle--disabled) {
  cursor: not-allowed;
  border-color: var(--z-flow-handle-border-disabled, var(--z-color-border));
}

:host(:hover) {
  box-shadow: 0 0 0 4px var(--z-flow-handle-ring, var(--z-color-primary-soft));
}
`;var gt=Object.defineProperty,A=(n,t,e,o)=>{for(var i=void 0,s=n.length-1,r;s>=0;s--)(r=n[s])&&(i=r(t,e,i)||i);return i&&gt(t,e,i),i};const X=class X extends M{constructor(){super(...arguments),this.id="",this.type="source",this.position="right",this.connectable=!0,this._onPointerDown=t=>{if(!this.connectable||t.button!==0)return;const e=this.closest("z-flow-node");e&&this.emit("z-connect-start",{sourceId:e.id,sourceHandle:this.id,handle:this})}}connectedCallback(){super.connectedCallback(),this.addEventListener("pointerdown",this._onPointerDown)}disconnectedCallback(){this.removeEventListener("pointerdown",this._onPointerDown),super.disconnectedCallback()}render(){return""}updated(){this.classList.toggle("z-flow-handle--disabled",!this.connectable)}};X.styles=ft;let b=X;A([h({type:String})],b.prototype,"id");A([h({type:String})],b.prototype,"type");A([h({type:String})],b.prototype,"position");A([h({type:Boolean})],b.prototype,"connectable");customElements.define("z-flow-handle",b);const _t=`:host {
  position: absolute;
  display: block;
  touch-action: none;
  user-select: none;
  cursor: grab;
  z-index: 1;
  /* [WHY] 配合 flow.css .z-flow__nodes { pointer-events: none }，恢复节点指针命中
     （pointer-events 会被父层继承） */
  pointer-events: auto;
}

:host(.z-flow-node--dragging) {
  cursor: grabbing;
  z-index: 2;
}

/*
  [WHY :focus-visible 而非 :focus] 鼠标点节点也会 focus（点击后焦点要在节点上，
  否则随后的 Delete 到不了画布），用 :focus 会让每个被点过的节点都留一圈键盘环。
  [WHY outline 而非 box-shadow] 选中的节点已经用 box-shadow 画了 ring，再叠一层
  两者会互相覆盖 —— box-shadow 一次只能有一条声明生效。
*/
:host(:focus-visible) {
  outline: 2px solid var(--z-color-primary);
  outline-offset: 2px;
  border-radius: var(--z-flow-node-radius, 8px);
}

:host(.z-flow-node--no-drag) {
  cursor: default;
}

.z-flow-node__box {
  box-sizing: border-box;
  min-width: 120px;
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--z-flow-node-border, var(--z-color-border));
  border-radius: var(--z-flow-node-radius, 8px);
  background: var(--z-flow-node-bg, var(--z-color-bg));
  box-shadow: var(--z-flow-node-shadow, 0 1px 3px rgba(15, 23, 42, 0.08));
  color: var(--z-color-text);
  font-size: 13px;
  line-height: 1.5;
  transition: box-shadow var(--z-transition-fast);
}

.z-flow-node__box--input,
.z-flow-node__box--output {
  border-radius: 16px;
}

.z-flow-node__box--input {
  border-color: var(--z-flow-node-border-input, var(--z-color-blue-300));
}

.z-flow-node__box--output {
  border-color: var(--z-flow-node-border-output, var(--z-color-green-300));
}

.z-flow-node__box--selected {
  border-color: var(--z-color-primary);
  box-shadow: 0 0 0 2px var(--z-flow-node-selected-ring, var(--z-color-primary-soft));
}

/* [WHY] 状态类特异性必须高于基础类，否则静默失效（css-specificity-override lesson） */
.z-flow-node__box--selected.z-flow-node__box--input,
.z-flow-node__box--selected.z-flow-node__box--output {
  border-color: var(--z-color-primary);
}
`;var mt=Object.defineProperty,x=(n,t,e,o)=>{for(var i=void 0,s=n.length-1,r;s>=0;s--)(r=n[s])&&(i=r(t,e,i)||i);return i&&mt(t,e,i),i};const R=class R extends M{constructor(){super(...arguments),this.id="",this.position="0,0",this.type="default",this.draggable=!0,this.selectable=!0,this.connectable=!0,this.deletable=!0,this.selected=!1,this._dragging=!1,this._dragMoved=!1,this._dragStartClient={x:0,y:0},this._dragStartPos={x:0,y:0},this._lastPos={x:0,y:0},this._pointerDownShift=!1,this._onPointerDown=t=>{if(t.button!==0||!this.draggable)return;const e=this.closest("z-flow");e&&!e.editable||t.composedPath().some(o=>o instanceof b)||(t.preventDefault(),this._dragging=!0,this._dragMoved=!1,this._pointerDownShift=t.shiftKey,this._dragStartClient={x:t.clientX,y:t.clientY},this._dragStartPos=S(this.position)??{x:0,y:0},this._lastPos={...this._dragStartPos},this.classList.add("z-flow-node--dragging"),window.addEventListener("pointermove",this._onDragMove),window.addEventListener("pointerup",this._onDragUp),window.addEventListener("pointercancel",this._onDragUp),this.emit("z-node-dragstart",{id:this.id,position:{...this._dragStartPos}}))},this._onDragMove=t=>{if(!this._dragging)return;const e=t.clientX-this._dragStartClient.x,o=t.clientY-this._dragStartClient.y;Math.abs(e)+Math.abs(o)>2&&(this._dragMoved=!0),this._lastPos=this._snap({x:this._dragStartPos.x+e/this._zoom,y:this._dragStartPos.y+o/this._zoom}),this.style.left=`${this._lastPos.x}px`,this.style.top=`${this._lastPos.y}px`,this.emit("z-node-dragmove",{id:this.id,position:{...this._lastPos}})},this._onDragUp=()=>{this._dragging&&(this._dragging=!1,this.classList.remove("z-flow-node--dragging"),this._endDragListeners(),this.isConnected&&(this._dragMoved?(this.position=Q(this._lastPos),this.emit("z-node-dragend",{id:this.id,position:{...this._lastPos}})):this.emit("z-node-click",{id:this.id,position:{...this._lastPos},shiftKey:this._pointerDownShift})))}}connectedCallback(){super.connectedCallback(),this.setAttribute("role","option"),this.addEventListener("pointerdown",this._onPointerDown)}disconnectedCallback(){this.removeEventListener("pointerdown",this._onPointerDown),this._endDragListeners(),super.disconnectedCallback()}render(){const t=["z-flow-node__box"];return this.selected&&t.push("z-flow-node__box--selected"),(this.type==="input"||this.type==="output")&&t.push(`z-flow-node__box--${this.type}`),D`
      <div class="${t.join(" ")}" part="node">
        <slot></slot>
      </div>
    `}updated(){const t=S(this.position)??{x:0,y:0};this.style.left=`${t.x}px`,this.style.top=`${t.y}px`,this.classList.toggle("z-flow-node--no-drag",!this.draggable),this.setAttribute("aria-selected",String(this.selected))}get _zoom(){var e;const t=this.closest("z-flow");return((e=t==null?void 0:t.viewport)==null?void 0:e.zoom)??1}get _snapInfo(){const t=this.closest("z-flow");return{snap:!!(t!=null&&t.snapToGrid),size:(t==null?void 0:t.snapSize)??20}}_snap(t){const e=this._snapInfo;return!e.snap||e.size<=0?t:{x:Math.round(t.x/e.size)*e.size,y:Math.round(t.y/e.size)*e.size}}_endDragListeners(){window.removeEventListener("pointermove",this._onDragMove),window.removeEventListener("pointerup",this._onDragUp),window.removeEventListener("pointercancel",this._onDragUp)}};R.styles=_t;let m=R;x([h({type:String})],m.prototype,"id");x([h({type:String})],m.prototype,"position");x([h({type:String})],m.prototype,"type");x([h({type:Boolean})],m.prototype,"draggable");x([h({type:Boolean})],m.prototype,"selectable");x([h({type:Boolean})],m.prototype,"connectable");x([h({type:Boolean})],m.prototype,"deletable");x([h({type:Boolean,reflect:!1})],m.prototype,"selected");customElements.define("z-flow-node",m);const wt=`:host {
  position: absolute;
  top: 12px;
  right: 12px;
  display: block;
  border-radius: 6px;
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  z-index: 20;
  /* [WHY] flow 覆盖层 pointer-events:none，槽内元素继承后点击穿透（真实浏览器实测发现） */
  pointer-events: auto;
}

.z-flow-minimap__svg {
  display: block;
}

.z-flow-minimap__bg {
  fill: var(--z-flow-minimap-bg, var(--z-color-bg));
  stroke: var(--z-flow-minimap-border, var(--z-color-border));
  stroke-width: 1;
}

.z-flow-minimap__node {
  fill: var(--z-flow-minimap-node, var(--z-color-blue-400));
}

.z-flow-minimap__viewport {
  fill: var(--z-flow-minimap-window-bg, rgba(59, 130, 246, 0.12));
  stroke: var(--z-color-primary);
  stroke-width: 1;
}
`;var vt=Object.defineProperty,H=(n,t,e,o)=>{for(var i=void 0,s=n.length-1,r;s>=0;s--)(r=n[s])&&(i=r(t,e,i)||i);return i&&vt(t,e,i),i};const k=10,q=class q extends M{constructor(){super(...arguments),this.data=[],this.viewport={x:0,y:0,zoom:1,width:0,height:0},this.width=180,this.height=120,this._scale=1,this._originX=0,this._originY=0,this._onClick=t=>{var l;const e=(l=this.shadowRoot)==null?void 0:l.querySelector("svg");if(!e||!this.data.length)return;const o=e.getBoundingClientRect(),i=t.clientX-o.left,s=t.clientY-o.top,r=(i-this._originX)/this._scale,a=(s-this._originY)/this._scale;r<0||a<0||this.emit("z-minimap-navigate",{x:r,y:a})}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("click",this._onClick),super.disconnectedCallback()}render(){const{data:t,width:e,height:o,viewport:i}=this;if(!t.length)return D`<svg width="${e}" height="${o}" class="z-flow-minimap__svg"></svg>`;let s=1/0,r=1/0,a=-1/0,l=-1/0;for(const _ of t)s=Math.min(s,_.x),r=Math.min(r,_.y),a=Math.max(a,_.x+_.w),l=Math.max(l,_.y+_.h);const p=a-s,c=l-r,u=p>0&&c>0?Math.min((e-k*2)/p,(o-k*2)/c):1;this._scale=u>0?u:1,this._originX=k+(e-k*2-p*this._scale)/2-s*this._scale,this._originY=k+(o-k*2-c*this._scale)/2-r*this._scale;const d=t.map(_=>`<rect class="z-flow-minimap__node" x="${this._originX+_.x*this._scale}" y="${this._originY+_.y*this._scale}" width="${Math.max(2,_.w*this._scale)}" height="${Math.max(2,_.h*this._scale)}" data-node-id="${V(_.id)}"></rect>`).join(""),w=this._originX+-i.x/i.zoom*this._scale,E=this._originY+-i.y/i.zoom*this._scale,z=i.width/i.zoom*this._scale,nt=i.height/i.zoom*this._scale,I=this._clipRect(w,E,z,nt,e,o);return D`
      <svg width="${e}" height="${o}" class="z-flow-minimap__svg" part="root">
        <rect class="z-flow-minimap__bg" width="${e}" height="${o}" rx="4"></rect>
        ${d}
        <rect class="z-flow-minimap__viewport" x="${I.x}" y="${I.y}" width="${I.w}" height="${I.h}"></rect>
      </svg>
    `}_clipRect(t,e,o,i,s,r){const a=Math.max(0,Math.min(t,s)),l=Math.max(0,Math.min(e,r)),p=Math.max(0,Math.min(o,s-a)),c=Math.max(0,Math.min(i,r-l));return{x:a,y:l,w:p,h:c}}};q.styles=wt;let y=q;H([h({type:Array,attribute:!1})],y.prototype,"data");H([h({type:Object,attribute:!1})],y.prototype,"viewport");H([h({type:Number})],y.prototype,"width");H([h({type:Number})],y.prototype,"height");customElements.define("z-flow-minimap",y);const bt=`:host {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: block;
  z-index: 20;
  /* [WHY] flow 覆盖层 pointer-events:none，槽内元素继承后按钮点击失效（真实浏览器实测发现） */
  pointer-events: auto;
}

.z-flow-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  border-radius: 6px;
  background: var(--z-flow-controls-bg, var(--z-color-bg));
  border: 1px solid var(--z-flow-controls-border, var(--z-color-border));
  box-shadow: 0 1px 6px rgba(15, 23, 42, 0.12);
}

.z-flow-controls__btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--z-color-text-secondary);
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
}

.z-flow-controls__btn:hover {
  background: var(--z-flow-controls-btn-hover, rgba(15, 23, 42, 0.06));
  color: var(--z-color-text);
}

.z-flow-controls__btn:active {
  background: var(--z-flow-controls-btn-active, rgba(15, 23, 42, 0.12));
}
`,zt=["zoom-in","zoom-out","fit-view"],W=class W extends M{constructor(){super(...arguments),this._onClick=t=>{var s,r;let o=this._pathOf(t).find(a=>{var l;return a instanceof Element&&((l=a.classList)==null?void 0:l.contains("z-flow-controls__btn"))})??null;if(o||(o=((r=(s=t.target)==null?void 0:s.closest)==null?void 0:r.call(s,".z-flow-controls__btn"))??null),!o)return;const i=o.getAttribute("data-action");!i||!zt.includes(i)||this.emit(`z-control-${i}`,{})}}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("click",this._onClick),super.disconnectedCallback()}render(){return D`
      <div class="z-flow-controls" part="root">
        <button type="button" class="z-flow-controls__btn" data-action="zoom-in" aria-label="放大">+</button>
        <button type="button" class="z-flow-controls__btn" data-action="zoom-out" aria-label="缩小">−</button>
        <button type="button" class="z-flow-controls__btn" data-action="fit-view" aria-label="适应视图">⛶</button>
      </div>
    `}_pathOf(t){try{return t.composedPath()}catch{return[t.target]}}};W.styles=bt;let B=W;customElements.define("z-flow-controls",B);function tt(n){try{return n.composedPath()}catch{return[n.target]}}function et(n){if(tt(n).some(o=>o instanceof HTMLInputElement||o instanceof HTMLTextAreaElement||o instanceof HTMLSelectElement))return!0;const e=n.target;return!!(e&&e.closest&&e.closest("input, textarea, select, [contenteditable='true']"))}function yt(n,t,e,o){return{...n,x:t.vpX+(e-t.startX),y:t.vpY+(o-t.startY)}}function xt(n,t,e,o,i,s){const r=$(n.zoom*o,i,s);return{x:t-(t-n.x)*(r/n.zoom),y:e-(e-n.y)*(r/n.zoom),zoom:r}}function Et(n,t,e,o){const i=dt(t);if(!i)return null;const s=Math.pow(1.1,-i.deltaPixels/100*o.zoomSpeed);return xt(n,t.clientX-e.left,t.clientY-e.top,s,o.minZoom,o.maxZoom)}function St(n,t,e,o,i){return{left:Math.min(n,e)-i.left,top:Math.min(t,o)-i.top,width:Math.abs(e-n),height:Math.abs(o-t)}}function kt(n,t){const e=t.zoom;return{x:(n.left-t.x)/e,y:(n.top-t.y)/e,w:n.width/e,h:n.height/e}}function Ct(n,t){return n.filter(e=>e.selectable&&ct(t,P(e))).map(e=>e.id)}function Lt(n,t,e,o,i,s){if(!n.length||!t||!e)return null;let r=1/0,a=1/0,l=-1/0,p=-1/0;for(const z of n)r=Math.min(r,z.x),a=Math.min(a,z.y),l=Math.max(l,z.x+z.w),p=Math.max(p,z.y+z.h);const c=l-r,u=p-a,d=$(Math.min((t-o*2)/c,(e-o*2)/u),i,s),w=c*d,E=u*d;return{x:w+o*2<=t?(t-w)/2-r*d:o-r*d,y:E+o*2<=e?(e-E)/2-a*d:o-a*d,zoom:d}}function Nt(n,t,e,o){return{x:-n.x+t/2,y:-n.y+e/2,zoom:o}}function $t(n,t,e){return!n||!t||n.type!=="target"||t.id===e||t.connectable===!1?null:{nodeId:t.id,handleId:n.id||""}}function Dt(n,t){return n.some(e=>e.source===t.source&&(e.sourceHandle??"")===(t.sourceHandle??"")&&e.target===t.target&&(e.targetHandle??"")===(t.targetHandle??""))}function Mt(n){var o,i;if(n.button!==0)return{kind:"ignored"};const t=tt(n);if(t.some(s=>s instanceof m||s instanceof b||s instanceof y||s instanceof B))return{kind:"ignored"};const e=t.find(s=>{var r;return s instanceof SVGPathElement&&((r=s.classList)==null?void 0:r.contains("z-flow__edge-path"))})??((i=(o=n.target)==null?void 0:o.classList)!=null&&i.contains("z-flow__edge-path")?n.target:null);return e?{kind:"edge",edgeId:e.getAttribute("data-edge-id")??""}:et(n)?{kind:"editing"}:{kind:"pan"}}function It(n){var e;try{for(const o of n.composedPath())if(o instanceof b)return o}catch{}if(typeof document.elementFromPoint=="function"){const o=document.elementFromPoint(n.clientX,n.clientY);if(o){const i=(e=o.closest)==null?void 0:e.call(o,"z-flow-handle");if(i)return i}}const t=n.target;if(t!=null&&t.closest){const o=t.closest("z-flow-handle");if(o)return o}return null}function Pt(n,t,e,o){o?t.has(e)?t.delete(e):t.add(e):(n.clear(),t.clear(),t.add(e))}function Bt(n,t,e){const o=n.x+n.w/2,i=n.y+n.h/2;let s=null,r=1/0;for(const a of t){const l=a.rect.x+a.rect.w/2-o,p=a.rect.y+a.rect.h/2-i;let c,u;if(e==="right"){if(!(l>0))continue;c=l,u=Math.abs(p)}else if(e==="left"){if(!(l<0))continue;c=-l,u=Math.abs(p)}else if(e==="down"){if(!(p>0))continue;c=p,u=Math.abs(l)}else{if(!(p<0))continue;c=-p,u=Math.abs(l)}const d=c+u*2;d<r&&(r=d,s=a.id)}return s}function U(n,t,e){if(!e)return[t];const o=new Set(n);return o.has(t)?o.delete(t):o.add(t),[...o]}function At(n,t){for(const e of n)e.selected=t.has(e.id)}function Ht(n){let t=n.edges,e=!1;if(n.selection.size){const o=n.nodes.filter(i=>n.selection.has(i.id)&&i.deletable);if(o.forEach(i=>i.remove()),o.forEach(i=>n.selection.delete(i.id)),o.length){const i=new Set(o.map(s=>s.id));t=t.filter(s=>!i.has(s.source)&&!i.has(s.target)),e=!0}}if(n.selectedEdges.size){const o=new Set(n.selectedEdges);t=t.filter(i=>!o.has(i.id)),n.selectedEdges.clear(),e=!0}return{edges:t,changed:e}}function Vt(n,t,e,o,i){if(n&&(n.style.transform=`translate(${Math.round(e.x)}px, ${Math.round(e.y)}px) scale(${e.zoom})`,t&&o!=="none")){const r=(i||20)*e.zoom;t.style.backgroundPosition=`${e.x}px ${e.y}px`,t.style.backgroundSize=`${r}px ${r}px`}}function Ot(n,t){let e=n==null?void 0:n.querySelector(".z-flow__box-select");return e||(e=document.createElement("div"),e.className="z-flow__box-select",n==null||n.appendChild(e)),e.style.left=`${t.left}px`,e.style.top=`${t.top}px`,e.style.width=`${t.width}px`,e.style.height=`${t.height}px`,e.removeAttribute("hidden"),e}function F(n){const t=n==null?void 0:n.querySelector(".z-flow__box-select");t&&t.setAttribute("hidden","")}function G(n,t,e){const o=n==null?void 0:n.querySelector(".z-flow__temp-edge");o&&(e&&t?(o.removeAttribute("hidden"),o.setAttribute("d",t)):o.setAttribute("hidden",""))}function Yt(n,t,e){const o=n.querySelectorAll("z-flow-minimap");if(!o.length)return;const i=t.map(r=>{const a=r,l=S(a.position)??{x:0,y:0};return{id:a.id,x:l.x,y:l.y,w:a.offsetWidth||0,h:a.offsetHeight||0}}),s={...e,width:n.clientWidth,height:n.clientHeight};o.forEach(r=>{r.data=i,r.viewport=s})}class Tt{constructor(t){this.host=t,this._panState=null,this._panSession=null,this._connecting=null,this._tempEdgeStart=null,this._tempEdgeD=null,this._lastBox=null,this._edgeSeq=0,this.onPointerDown=e=>{var r;const o=Mt(e);if(o.kind==="ignored"||o.kind==="editing")return;if(o.kind==="edge"){this.host.selectEdge(o.edgeId,e.shiftKey);return}this.host.focusHost();const i=this.host.viewport(),s={startX:e.clientX,startY:e.clientY,vpX:i.x,vpY:i.y,shift:e.shiftKey,moved:!1};this._panState=s,(r=this._panSession)==null||r.abort(),this._panSession=new it({onMove:a=>this._panMove(s,a),onEnd:a=>this._panEnd(s,a.moved),onCancel:()=>{this._panState=null,F(this.host.root())}}),this._panSession.begin(e)},this.onConnectStart=e=>{if(!this.host.isEditable()||this._connecting)return;const o=e.detail;if(!(o!=null&&o.handle))return;const i=this.host.nodeById(o.sourceId);if(!i||i.connectable===!1)return;const s=O(i,this.host.draggingNodeId(),o.sourceHandle,"source");s&&(this._connecting={sourceId:o.sourceId,sourceHandle:o.sourceHandle},this._tempEdgeStart=s,this._tempEdgeD=Z(s.x,s.y,s.x,s.y,s.pos),G(this.host.root(),this._tempEdgeD,!0),window.addEventListener("pointermove",this.onConnectMove),window.addEventListener("pointerup",this.onConnectUp),window.addEventListener("pointercancel",this.onConnectCancel),window.addEventListener("keydown",this.onConnectKey))},this.onConnectMove=e=>{var s;if(!this._connecting||!this._tempEdgeStart)return;const o=ht(e.clientX,e.clientY,this.host.rect(),this.host.viewport());this._tempEdgeD=Z(this._tempEdgeStart.x,this._tempEdgeStart.y,o.x,o.y,this._tempEdgeStart.pos);const i=(s=this.host.root())==null?void 0:s.querySelector(".z-flow__temp-edge");i&&(i.removeAttribute("hidden"),i.setAttribute("d",this._tempEdgeD))},this.onConnectUp=e=>{const o=this._connecting;if(!o)return;const i=It(e),s=(i==null?void 0:i.closest("z-flow-node"))??null,r=$t(i,s,o.sourceId);if(!r){this._endConnect(!1);return}const a={source:o.sourceId,sourceHandle:o.sourceHandle,target:r.nodeId,targetHandle:r.handleId};if(Dt(this.host.edges(),a)){this._endConnect(!1);return}if(!this.host.dispatchConnect(a)){this._endConnect(!1);return}this.host.addEdge({id:`edge-${++this._edgeSeq}`,...a}),this._endConnect(!0)},this.onConnectCancel=()=>{this._connecting&&this._endConnect(!1)},this.onConnectKey=e=>{e.key==="Escape"&&this._endConnect(!1)}}get tempEdgeD(){return this._tempEdgeD}get panState(){return this._panState}_panMove(t,e){this._panState&&(t.moved=e.moved,t.shift&&this.host.isEditable()?(this._lastBox=St(t.startX,t.startY,e.x,e.y,this.host.rect()),Ot(this.host.root(),this._lastBox)):this.host.commitViewport(yt(this.host.viewport(),t,e.x,e.y)))}_panEnd(t,e){this._panState=null,this._panSession=null,F(this.host.root()),t.shift&&this.host.isEditable()&&e?this._lastBox&&this.host.select(Ct(this.host.nodes(),kt(this._lastBox,this.host.viewport())),!0):!e&&!t.shift&&this.host.select([],!1)}_endConnect(t){this._endConnectListeners(),this._connecting=null,this._tempEdgeStart=null,this._tempEdgeD=null,G(this.host.root(),null,!1),t&&this.host.emitFlowChange(),this.host.emitConnectEnd(t)}_endConnectListeners(){window.removeEventListener("pointermove",this.onConnectMove),window.removeEventListener("pointerup",this.onConnectUp),window.removeEventListener("pointercancel",this.onConnectCancel),window.removeEventListener("keydown",this.onConnectKey)}dispose(){var t;(t=this._panSession)==null||t.dispose(),this._panSession=null,this._endConnectListeners(),this._panState=null,this._connecting=null,this._tempEdgeStart=null,this._tempEdgeD=null}}const Xt=`:host {
  display: block;
  position: relative;
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background: var(--z-flow-bg, var(--z-color-bg));
  border: 1px solid var(--z-flow-border, var(--z-color-border));
  border-radius: var(--z-flow-radius, 8px);
  color: var(--z-color-text);
  outline: none;
}

:host(:focus-visible) {
  border-color: var(--z-color-primary);
}

.z-flow__viewport {
  position: absolute;
  inset: 0;
  transform-origin: 0 0;
  will-change: transform;
}

.z-flow__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.z-flow__bg--dots {
  background-image: radial-gradient(
    var(--z-flow-bg-dot, var(--z-color-border-soft)) 1px,
    transparent 1px
  );
  background-size: 20px 20px;
}

.z-flow__bg--lines {
  background-image:
    linear-gradient(var(--z-flow-bg-dot, var(--z-color-border-soft)) 1px, transparent 1px),
    linear-gradient(90deg, var(--z-flow-bg-dot, var(--z-color-border-soft)) 1px, transparent 1px);
  background-size: 20px 20px;
}

.z-flow__edges {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.z-flow__edge-path {
  fill: none;
  stroke: var(--z-flow-edge-color, var(--z-color-border));
  stroke-width: 1.5;
  pointer-events: visibleStroke;
  cursor: pointer;
}

/* [WHY] 状态类特异性必须高于基础类（css-specificity-override lesson） */
.z-flow__edge-path--selected.z-flow__edge-path {
  stroke: var(--z-color-primary);
  stroke-width: 2;
}

/* [2026-10-20] 静态虚线：表达「上游节点未配置 / 数据流未定型」。
   与 --animated（流动虚线 = 加载中）区分开。放在 --animated 之前：
   两者同时命中时动画那套胜出，视觉上不打架。 */
.z-flow__edge-path--dashed.z-flow__edge-path {
  stroke-dasharray: 5 4;
}

.z-flow__edge-path--animated.z-flow__edge-path {
  stroke-dasharray: 6 4;
  animation: z-flow-dash var(--z-duration-loop-fast) var(--z-ease-linear) infinite;
}

@keyframes z-flow-dash {
  to {
    stroke-dashoffset: -10;
  }
}

@media (prefers-reduced-motion: reduce) {
  .z-flow__edge-path--animated.z-flow__edge-path {
    animation: none;
  }
}

.z-flow__edge-label {
  fill: var(--z-flow-edge-label, var(--z-color-text-secondary));
  font-size: 12px;
  pointer-events: none;
}

.z-flow__temp-edge {
  fill: none;
  stroke: var(--z-color-primary);
  stroke-width: 2;
  stroke-dasharray: 6 4;
  pointer-events: none;
}

.z-flow__nodes {
  position: absolute;
  inset: 0;
  /* [WHY] nodes 层覆盖全画布（inset:0）且缺 pointer-events 规则，位于 edges svg 之上，
     边 path 永远收不到指针事件——边点击选中/删除在真实浏览器不可用（实测发现）。
     置 none 后点击穿透到边层；节点自身由 node.css :host { pointer-events: auto } 恢复
     See: wiki/requirements/REQ-013-node-flow-editor.md */
  pointer-events: none;
}

.z-flow__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.z-flow__box-select {
  position: absolute;
  border: 1px dashed var(--z-color-primary);
  background: var(--z-flow-box-select-bg, rgba(59, 130, 246, 0.1));
  pointer-events: none;
  z-index: 10;
}

.z-flow__box-select[hidden] {
  display: none;
}
`;var Rt=Object.defineProperty,v=(n,t,e,o)=>{for(var i=void 0,s=n.length-1,r;s>=0;s--)(r=n[s])&&(i=r(t,e,i)||i);return i&&Rt(t,e,i),i};let qt=0;const Wt={ArrowUp:{dx:0,dy:-1,dir:"up"},ArrowDown:{dx:0,dy:1,dir:"down"},ArrowLeft:{dx:-1,dy:0,dir:"left"},ArrowRight:{dx:1,dy:0,dir:"right"}},Kt=10,K=class K extends M{constructor(){super(...arguments),this.edges=[],this.minZoom=.5,this.maxZoom=2,this.zoomSpeed=1,this.fitViewPadding=40,this.fitViewOnInit=!1,this.background="dots",this.editable=!0,this.showEdgeArrow=!0,this._markerId=`z-flow-arrow-${++qt}`,this._draggingNodeId=null,this.snapToGrid=!1,this.snapSize=20,this._viewport={x:0,y:0,zoom:1},this._viewportEl=null,this._bgEl=null,this._selection=new Set,this._selectedEdges=new Set,this._edgesScheduled=!1,this._viewportEmitPending=!1,this._observer=null,this._resizeObserver=null,this._sizeObserved=new WeakSet,this._gestures=new Tt({isEditable:()=>this.editable,root:()=>this.shadowRoot,rect:()=>this.getBoundingClientRect(),viewport:()=>this._viewport,commitViewport:t=>this._commitViewport(t),nodes:()=>this._getNodes(),nodeById:t=>this._nodeById(t),draggingNodeId:()=>this._draggingNodeId,select:(t,e)=>this._setSelection(t,e),selectEdge:(t,e)=>this._onEdgePointerDown(t,e),edges:()=>this.edges,addEdge:t=>{this.edges=[...this.edges,t]},dispatchConnect:t=>this._dispatchConnect(t),emitFlowChange:()=>{this.isConnected&&this.emit("z-flow-change",this.getData())},emitConnectEnd:t=>this.emit("z-connect-end",{success:t}),focusHost:()=>this._focusNode(this._currentNode(this._getNodes())??this._getNodes()[0])}),this._onWheel=t=>{const e=Et(this._viewport,t,this.getBoundingClientRect(),this);e&&(t.preventDefault(),this._commitViewport(e))},this._onZoomIn=()=>{this.setViewport({...this._viewport,zoom:$(this._viewport.zoom*1.2,this.minZoom,this.maxZoom)})},this._onZoomOut=()=>{this.setViewport({...this._viewport,zoom:$(this._viewport.zoom/1.2,this.minZoom,this.maxZoom)})},this._onFitView=()=>{this.fitView()},this._onPointerDown=t=>this._gestures.onPointerDown(t),this._onConnectStart=t=>this._gestures.onConnectStart(t),this._onNodeClick=t=>{if(!this.editable)return;const e=t.detail,o=this._nodeById(e==null?void 0:e.id);!o||!o.selectable||(this._focusNode(o),this._setSelection(U(this._selection,o.id,!!e.shiftKey),!1))},this._onEdgePointerDown=(t,e)=>{this.editable&&(Pt(this._selection,this._selectedEdges,t,e),this._applySelectionChange())},this._onKeyDown=t=>{if(et(t))return;const e=this._getNodes();if(e.length===0)return;const o=t.key,i=Wt[o];if(i){if(t.shiftKey){if(!this.editable)return;this._nudgeNodes(i)&&t.preventDefault();return}const l=this._neighborInDirection(e,i.dir);if(!l)return;t.preventDefault(),this._focusNode(l);return}if(o==="Home"||o==="End"){t.preventDefault(),this._focusNode(o==="Home"?e[0]:e[e.length-1]);return}if((o==="Enter"||o===" ")&&this.editable){const l=this._currentNode(e);if(!l||!l.selectable)return;t.preventDefault(),this._setSelection(U(this._selection,l.id,t.shiftKey),!1);return}if(o!=="Delete"&&o!=="Backspace"||!this.editable||!this._selection.size&&!this._selectedEdges.size)return;t.preventDefault();const s=this._currentNode(e),r=s?e.indexOf(s):-1,a=Ht({nodes:e,selection:this._selection,selectedEdges:this._selectedEdges,edges:this.edges});if(a.changed&&(this.edges=a.edges,this.emit("z-flow-selection-change",{nodeIds:[...this._selection],edgeIds:[...this._selectedEdges]}),this.emit("z-flow-change",this.getData()),r>=0)){const l=this._getNodes(),p=l[Math.min(r,l.length-1)];p&&this._focusNode(p)}},this._onFocusIn=t=>{const e=t.target;!e||e.tagName!=="Z-FLOW-NODE"||this._syncTabStops(e)},this._onNodeDragMove=t=>{var e;this._draggingNodeId=((e=t.detail)==null?void 0:e.id)??null,this.refreshEdges()},this._onNodeDragEnd=()=>{this._draggingNodeId=null,this.isConnected&&this.emit("z-flow-change",this.getData())},this._onMinimapNavigate=t=>{const e=t.detail;e&&this.setViewport(Nt(e,this.clientWidth,this.clientHeight,this._viewport.zoom))}}get viewport(){return{...this._viewport}}get _panState(){return this._gestures.panState}connectedCallback(){super.connectedCallback(),this.setAttribute("role","group"),this.setAttribute("aria-label","流程图"),this.addEventListener("pointerdown",this._onPointerDown),this.addEventListener("keydown",this._onKeyDown),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("wheel",this._onWheel,{passive:!1}),this.addEventListener("z-connect-start",this._onConnectStart),this.addEventListener("z-node-dragmove",this._onNodeDragMove),this.addEventListener("z-node-dragend",this._onNodeDragEnd),this.addEventListener("z-node-click",this._onNodeClick),this.addEventListener("z-minimap-navigate",this._onMinimapNavigate),this.addEventListener("z-control-zoom-in",this._onZoomIn),this.addEventListener("z-control-zoom-out",this._onZoomOut),this.addEventListener("z-control-fit-view",this._onFitView),this._observer=new MutationObserver(()=>{this._syncTabStops(),this.scheduleEdges()}),this._observer.observe(this,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["position","id","type"],characterData:!0}),"ResizeObserver"in window&&(this._resizeObserver=new ResizeObserver(()=>this.scheduleEdges()),this._resizeObserver.observe(this)),this._syncTabStops()}disconnectedCallback(){var t,e;this.removeEventListener("pointerdown",this._onPointerDown),this.removeEventListener("keydown",this._onKeyDown),this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("wheel",this._onWheel),this.removeEventListener("z-connect-start",this._onConnectStart),this.removeEventListener("z-node-dragmove",this._onNodeDragMove),this.removeEventListener("z-node-dragend",this._onNodeDragEnd),this.removeEventListener("z-node-click",this._onNodeClick),this.removeEventListener("z-minimap-navigate",this._onMinimapNavigate),this.removeEventListener("z-control-zoom-in",this._onZoomIn),this.removeEventListener("z-control-zoom-out",this._onZoomOut),this.removeEventListener("z-control-fit-view",this._onFitView),(t=this._observer)==null||t.disconnect(),(e=this._resizeObserver)==null||e.disconnect(),this._gestures.dispose(),super.disconnectedCallback()}render(){return D`
      <div class="z-flow__bg z-flow__bg--${this.background}" part="background"></div>
      <div class="z-flow__viewport" part="viewport">
        <svg class="z-flow__edges" part="edges">${this._edgesSvgHtml()}</svg>
        <div
          class="z-flow__nodes"
          part="nodes"
          role="listbox"
          aria-label="画布节点"
          aria-multiselectable="true"
        ><slot></slot></div>
      </div>
      <div class="z-flow__overlay" part="overlay">
        <slot name="minimap"></slot>
        <slot name="controls"></slot>
        <div class="z-flow__box-select" hidden=""></div>
      </div>
    `}firstUpdated(){this._viewportEl=this.shadowRoot.querySelector(".z-flow__viewport"),this._bgEl=this.shadowRoot.querySelector(".z-flow__bg"),this._applyViewport(),this.fitViewOnInit&&this.fitView()}updated(){this._viewportEl=this.shadowRoot.querySelector(".z-flow__viewport"),this._bgEl=this.shadowRoot.querySelector(".z-flow__bg"),this._applyViewport(),this._syncMinimap(),this.scheduleEdges()}setViewport(t){this._commitViewport({x:t.x,y:t.y,zoom:$(t.zoom,this.minZoom,this.maxZoom)})}fitView(){const t=Lt(this._getNodes().map(P),this.clientWidth,this.clientHeight,this.fitViewPadding,this.minZoom,this.maxZoom);this.setViewport(t??{x:0,y:0,zoom:1})}refreshEdges(){var e;this._observeNodeSizes();const t=(e=this.shadowRoot)==null?void 0:e.querySelector(".z-flow__edges");t&&(t.innerHTML=this._edgesSvgHtml()),this._syncMinimap()}_observeNodeSizes(){const t=this._resizeObserver;if(t)for(const e of this._getNodes())this._sizeObserved.has(e)||(this._sizeObserved.add(e),t.observe(e))}getData(){return{nodes:this._getNodes().map(e=>({id:e.id,position:S(e.position)??{x:0,y:0},type:e.type})),edges:[...this.edges]}}scheduleEdges(){this._edgesScheduled||(this._edgesScheduled=!0,setTimeout(()=>{this._edgesScheduled=!1,this.isConnected&&this.refreshEdges()},0))}_applyViewport(){Vt(this._viewportEl,this._bgEl,this._viewport,this.background,this.snapSize)}_syncMinimap(){Yt(this,this._getNodes(),this._viewport)}_commitViewport(t){this._viewport=t,this._applyViewport(),this._syncMinimap(),this._emitViewportChange()}_emitViewportChange(){this._viewportEmitPending||(this._viewportEmitPending=!0,queueMicrotask(()=>{this._viewportEmitPending=!1,this.isConnected&&this.emit("z-viewport-change",{...this._viewport})}))}_dispatchConnect(t){const e=new CustomEvent("z-connect",{detail:t,bubbles:!0,composed:!0,cancelable:!0});return this.dispatchEvent(e),!e.defaultPrevented}_setSelection(t,e){e||(this._selection.clear(),this._selectedEdges.clear()),t.forEach(o=>this._selection.add(o)),this._applySelectionChange()}_applySelectionChange(){At(this._getNodes(),this._selection),this.refreshEdges(),this.emit("z-flow-selection-change",{nodeIds:[...this._selection],edgeIds:[...this._selectedEdges]})}_currentNode(t){const e=ot();return e?t.find(o=>o===e)??null:null}_neighborInDirection(t,e){const o=this._currentNode(t);if(!o)return e==="up"||e==="left"?t[t.length-1]:t[0];const i=Bt(P(o),t.filter(s=>s!==o).map(s=>({id:s.id,rect:P(s)})),e);return i?t.find(s=>s.id===i)??null:null}_nudgeNodes(t){const e=this._getNodes(),o=this._currentNode(e),i=e.filter(a=>this._selection.has(a.id)),s=i.length?i:o?[o]:[];if(s.length===0)return!1;const r=this.snapToGrid?Math.max(1,this.snapSize):Kt;for(const a of s){const l=S(a.position)??{x:0,y:0};a.position=Q({x:l.x+t.dx*r,y:l.y+t.dy*r})}return this.refreshEdges(),this.emit("z-flow-change",this.getData()),!0}_syncTabStops(t){const e=this._getNodes();if(e.length===0)return;const o=(t&&e.includes(t)?t:null)??this._currentNode(e)??e.find(i=>i.getAttribute("tabindex")==="0")??e[0];for(const i of e)i.setAttribute("tabindex",i===o?"0":"-1")}_focusNode(t){t&&(this._syncTabStops(t),t.focus({preventScroll:!0}))}_getNodes(){return Array.from(this.querySelectorAll("z-flow-node"))}_nodeById(t){return this._getNodes().find(e=>e.id===t)??null}_edgesSvgHtml(){return ut({markerId:this._markerId,showEdgeArrow:this.showEdgeArrow,tempEdgeD:this._gestures.tempEdgeD,geometries:pt({edges:this.edges,selectedEdges:this._selectedEdges,resolveNode:t=>this._nodeById(t),draggingNodeId:this._draggingNodeId})})}};K.styles=Xt;let f=K;v([h({type:Array,attribute:!1})],f.prototype,"edges");v([h({type:Number})],f.prototype,"minZoom");v([h({type:Number})],f.prototype,"maxZoom");v([h({type:Number})],f.prototype,"zoomSpeed");v([h({type:Number})],f.prototype,"fitViewPadding");v([h({type:Boolean})],f.prototype,"fitViewOnInit");v([h({type:String})],f.prototype,"background");v([h({type:Boolean})],f.prototype,"editable");v([h({type:Boolean})],f.prototype,"showEdgeArrow");v([h({type:Boolean})],f.prototype,"snapToGrid");v([h({type:Number})],f.prototype,"snapSize");customElements.define("z-flow",f);st();const g=document.getElementById("flow");g.edges=[{id:"e-start-review",source:"n-start",target:"n-review",label:"提交"},{id:"e-review-approve",source:"n-review",target:"n-approve",label:"通过",animated:!0},{id:"e-review-reject",source:"n-review",sourceHandle:"reject",target:"n-notify",label:"驳回通知"},{id:"e-approve-end",source:"n-approve",target:"n-end",label:"归档"}];const C=document.getElementById("event-log"),jt=["z-connect","z-connect-end","z-flow-change","z-flow-selection-change","z-viewport-change","z-node-click","z-node-dragstart","z-node-dragend","z-minimap-navigate","z-control-zoom-in","z-control-zoom-out","z-control-fit-view"];function L(n,t){const e=document.createElement("div");e.className="demo-log__line";const o=new Date().toLocaleTimeString("zh-CN",{hour12:!1}),i=t==null?"":` ${JSON.stringify(t)}`;for(e.textContent=`${o} ${n}${i}`,C.appendChild(e);C.children.length>100;)C.removeChild(C.firstChild);C.scrollTop=C.scrollHeight}jt.forEach(n=>g.addEventListener(n,t=>L(n,t.detail)));g.addEventListener("z-connect",n=>{g.blockConnect&&n.preventDefault()});g.addEventListener("z-connect-end",n=>{n.detail.success||L("z-connect-blocked",null)});document.getElementById("opt-editable").addEventListener("z-change",n=>{g.editable=n.detail.checked,L("editable → "+g.editable,null)});document.getElementById("opt-block").addEventListener("z-change",n=>{g.blockConnect=n.detail.checked,L("blockConnect → "+g.blockConnect,null)});document.getElementById("fit-view").addEventListener("click",()=>g.fitView());let N=0;const Zt={default:'<span class="flow-node__icon flow-node__icon--blue">◇</span>',input:'<span class="flow-node__icon flow-node__icon--green">▶</span>',output:'<span class="flow-node__icon flow-node__icon--green">■</span>'},Ut={default:"处理节点",input:"输入节点",output:"输出节点"};function Y(n){N+=1;const t=`n-new-${N}`,e=document.createElement("z-flow-node");e.id=t,e.type=n,e.position=`${N%4*80+80},${Math.floor(N/4)*120+500}`;const o=n==="input"?'<z-flow-handle type="source"></z-flow-handle>':n==="output"?'<z-flow-handle type="target" position="left"></z-flow-handle>':'<z-flow-handle type="target" position="left"></z-flow-handle><z-flow-handle type="source"></z-flow-handle>';e.innerHTML=`<div class="flow-node">${Zt[n]}<span class="flow-node__label">${Ut[n]} ${N}</span></div>${o}`,g.appendChild(e),L("node added → "+t,null)}document.getElementById("add-default").addEventListener("click",()=>Y("default"));document.getElementById("add-input").addEventListener("click",()=>Y("input"));document.getElementById("add-output").addEventListener("click",()=>Y("output"));const Ft=document.getElementById("json-out");function T(){Ft.textContent=JSON.stringify(g.getData(),null,2)}document.getElementById("export").addEventListener("click",()=>{T(),L("exported",null)});T();g.addEventListener("z-flow-change",T);
