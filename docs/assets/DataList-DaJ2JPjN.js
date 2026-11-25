import{a as V,e as _,B as I,i as T,b,h as g,j as u,t as D,f as A,g as Y,c as G,k as J,l as N,m as B,n as Z,o as y,d as w,p as l}from"./presets-CdaBrvJF.js";import{C as x}from"./copy-DoHMT7Ic.js";import"./Pagination-D9yYEaKb.js";import"./Input-wCelPXsT.js";import"./Select-Dm4kbGWW.js";import{i as Q}from"./styleInjection-peqqYNO6.js";import{c as X,i as ee,a as te,b as ie}from"./a11y-DJ6wHu5s.js";import"./Position-D6zl9ryN.js";import{F as re}from"./floatingPanel-BYE_1ufg.js";const se=`/* Shadow styles: host + trigger wrapper. Panel styles are injected globally (see Datepicker.ts). */
:host {
  display: inline-flex;
}

.z-datepicker__trigger {
  display: inline-flex;
  /* 清除钮绝对定位在右端，锚点是这个 wrapper */
  position: relative;
  /* [WHY 必须显式撑满] 触发框是个 slot，消费方给它 \`width: 100%\`。但百分比宽度要相对
     「有确定宽度的包含块」才有意义 —— 这个 wrapper 是 inline-flex（宽度 auto），
     于是 input 的 100% 退回它的固有宽度（约 177px，浏览器默认 20 字符），比容器窄 71px。
     加清除钮之前看不出来（10 字符的日期填得下），加了之后最后两位被盖住。
     宿主是 block 100%（筛选格）时这里铺满；宿主是 inline-flex auto（表单）时 100% 解析为 auto，
     与不加这一行等价。 */
  width: 100%;
  box-sizing: border-box;
}

/* 清除入口：覆盖在触发框右端，**不参与布局**。
   触发框是个 slot，宽度由消费方决定（筛选格里是 100%，表单里是 max-width）；
   把叉插进文档流会把它挤窄 —— 表现出来是「日期显示不全」或「叉掉到下一行」。 */
.z-datepicker__clear {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  flex: none;
}

.z-datepicker__clear:hover {
  background: var(--z-color-bg-secondary);
  color: var(--z-color-text);
}
`,ne=`
    .z-datepicker__panel {
      position: fixed;
      z-index: var(--z-z-dropdown);
      padding: var(--z-space-3);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: var(--z-line-height);
      color: var(--z-color-text);
      outline: none;
      user-select: none;
      animation: z-datepicker-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-datepicker__panel--hiding {
      animation: z-datepicker-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-datepicker-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-datepicker-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-datepicker__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--z-space-2);
    }
    .z-datepicker__nav {
      width: 28px;
      height: var(--z-control-h-sm);
      border: none;
      background: transparent;
      border-radius: var(--z-radius-sm);
      color: var(--z-color-text-secondary);
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      transition: background var(--z-transition-fast);
    }
    .z-datepicker__nav:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__label {
      font-weight: var(--z-font-weight-medium);
    }
    .z-datepicker__grid {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .z-datepicker__weekday {
      padding: var(--z-space-1) 0;
      /* [WHY] 紧凑商务风日历（REQ-010）：36 → 32 */
      width: 32px;
      text-align: center;
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      font-weight: var(--z-font-weight-medium);
    }
    .z-datepicker__cell {
      width: 32px;
      height: var(--z-control-h);
      text-align: center;
      vertical-align: middle;
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      font-size: var(--z-font-size-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-datepicker__cell:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__cell--out {
      opacity: 0.4;
    }
    .z-datepicker__cell--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-datepicker__cell--today {
      box-shadow: inset 0 0 0 1px var(--z-color-primary);
    }
    /* ── 区间带（先声明，端点在后覆盖）──
       [WHY] 2026-10-25 报障：原先 --range-in 直接引用原始色板 blue-50，
       亮色几乎看不出（1.14:1）、暗色不翻转成亮白块（日期隐形）。改走 tint 语义层。 */
    .z-datepicker__cell--range-in {
      background: var(--z-color-primary-tint);
      border-radius: 0;
    }
    /* 每行首尾收圆角 —— 跨行的区间在行末断开，读起来是「一条一条」而不是锯齿 */
    .z-datepicker__cell--range-in:first-child {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-datepicker__cell--range-in:last-child {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* [WHY] .z-datepicker__cell:hover 特异性 0,2,0 高于 0,1,0，会把区间底打回灰底 ——
       鼠标划过时选区闪断。用同等特异性（且在后）覆盖回来。 */
    .z-datepicker__cell--range-in:hover {
      background: var(--z-color-primary-tint-hover);
    }
    /* ── 端点（实心，压在区间带之上）──
       [WHY] 端点承载白字，必须走 solid 层：暗色下 --z-color-primary 是亮蓝 #3b82f6，
       白字只有 3.68:1（不达 AA）；solid 明暗同值、恒定 5.17:1。
       端点也可能同时带 --range-in（hover 预览时终点即区间末格），这里靠声明顺序取胜。 */
    .z-datepicker__cell--selected,
    .z-datepicker__cell--range-start,
    .z-datepicker__cell--range-end {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-datepicker__cell--range-start {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-datepicker__cell--range-end {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* 起点落在行末 / 终点落在行首时，同侧没有区间延续（要跨到下一行），
       此时去掉的内侧圆角会让色块直角贴边 → 恢复四角圆，读作「独立的端点」 */
    .z-datepicker__cell--range-start:last-child,
    .z-datepicker__cell--range-end:first-child {
      border-radius: var(--z-radius-sm);
    }
    .z-datepicker__cell--selected:hover,
    .z-datepicker__cell--range-start:hover,
    .z-datepicker__cell--range-end:hover {
      background: var(--z-color-primary-solid-hover);
    }
    .z-datepicker__cell--focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -2px;
    }
    /* ── 快捷区间（issue IKUE1G）──
       一排 chip 放在头区上方：它比日历更常用，放下面会被两行数字挡住。
       [WHY 用 tint 而不是实心] 选中态要与「日历上那个实心端点」区分开：两者同时亮时
       读者要知道「亮的这块是预设，不是我自己选的日期」。 */
    .z-datepicker__presets {
      display: flex;
      flex-wrap: wrap;
      gap: var(--z-space-1);
      margin-bottom: var(--z-space-2);
      padding-bottom: var(--z-space-2);
      border-bottom: 1px solid var(--z-color-border);
    }
    .z-datepicker__preset {
      border: 1px solid var(--z-color-border);
      background: transparent;
      color: var(--z-color-text);
      border-radius: var(--z-radius-full);
      padding: 2px 10px;
      font-size: var(--z-font-size-xs);
      line-height: 1.6;
      cursor: pointer;
      transition: background var(--z-transition-fast), border-color var(--z-transition-fast);
    }
    .z-datepicker__preset:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-datepicker__preset.is-active {
      background: var(--z-color-primary-tint);
      border-color: var(--z-color-primary);
      /* 文字走 primary 而不是 primary-text（那是白字，配 tint 底看不见）；
         tint 是 10% 透明度的主色，一级主色压在上面仍满足可读性 */
      color: var(--z-color-primary);
    }
    .z-datepicker__preset:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      background: transparent;
    }
    /* ── 时间行（precision=minute）──
       [WHY 放在日历下面而不是弹一个独立的时间轮] 「日期 + 时间」是一个值，两次弹层
       意味着中间有一个「日期已定、时间未定」的半截状态，而用户看不出还差一步。
       放在同一块面板里，他看见的是「上面选哪天、下面填几点」。
       [WHY 两个 number input 而不是原生 type=time] 原生控件的面板在 Safari 上
       是一个系统滚轮、Chrome 是另一套，与本页其余输入框不是一套语言；而且它把
       「现在几点」这类语义塞进了系统 UI，宿主无法覆盖。 */
    .z-datepicker__time {
      display: flex;
      align-items: center;
      gap: var(--z-space-2);
      margin-top: var(--z-space-2);
      padding-top: var(--z-space-2);
      border-top: 1px solid var(--z-color-border);
      font-size: var(--z-font-size-sm);
    }
    .z-datepicker__time-label {
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-xs);
    }
    .z-datepicker__time-field {
      width: 48px;
      height: var(--z-control-h-sm);
      padding: 0 var(--z-space-1);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      background: var(--z-color-bg);
      color: var(--z-color-text);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      text-align: center;
      /* 数字框的上下箭头在 48px 宽里会挤掉数字本身 */
      appearance: textfield;
      -moz-appearance: textfield;
    }
    .z-datepicker__time-field::-webkit-outer-spin-button,
    .z-datepicker__time-field::-webkit-inner-spin-button {
      appearance: none;
      margin: 0;
    }
    .z-datepicker__time-field:focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -1px;
    }
    .z-datepicker__time-field.is-invalid {
      border-color: var(--z-color-danger);
    }
    .z-datepicker__time-sep {
      color: var(--z-color-text-secondary);
    }
    .z-datepicker__time-done {
      margin-left: auto;
    }
`;function K(o){const e='<button type="button" class="z-datepicker__time-done" data-time-done>确定</button>';return o.mode==="range"?'<div class="z-datepicker__time" part="time">'+M("start","起",o.time)+M("end","止",o.timeTo)+e+"</div>":'<div class="z-datepicker__time" part="time">'+M("value","时间",o.time)+e+"</div>"}function M(o,e,i){const[t,r]=i.split(":"),s=(n,a,c,d)=>`<input class="z-datepicker__time-field" type="text" inputmode="numeric" maxlength="2" data-time-side="${_(o)}" data-time-part="${n}" value="${_(a)}" aria-label="${_(d)}" title="0–${c}">`;return`<span class="z-datepicker__time-label">${V(e)}</span>`+s("h",t,23,`${e}时`)+'<span class="z-datepicker__time-sep">:</span>'+s("m",r,59,`${e}分`)}function ae(o,e){const i=o.querySelector(`[data-time-side="${e}"][data-time-part="h"]`),t=o.querySelector(`[data-time-side="${e}"][data-time-part="m"]`);if(!i||!t)return null;const r=(a,c)=>{const d=a.value.trim();if(!/^\d{1,2}$/.test(d))return null;const m=Number(d);return m>=0&&m<=c?m:null},s=r(i,23),n=r(t,59);return i.classList.toggle("is-invalid",s===null),t.classList.toggle("is-invalid",n===null),s===null||n===null?null:(i.value=String(s).padStart(2,"0"),t.value=String(n).padStart(2,"0"),`${i.value}:${t.value}`)}const q=new Map,j=new Map;function oe(o,e,i){const t=`${o}|${e}|${i}`,r=q.get(t);if(r)return r;const s=new Intl.DateTimeFormat(o,{year:"numeric",month:"long"}).format(new Date(e,i,1));return q.set(t,s),s}function le(o,e){const i=`${o}|${e}`,t=j.get(i);if(t)return t;const r=new Intl.DateTimeFormat(o,{weekday:"short"}),s=[];for(let n=0;n<7;n++)s.push(r.format(new Date(2026,7,2+e+n)));return j.set(i,s),s}function ce(o){const e=le(o.locale,o.weekStart).map(t=>`<th scope="col" class="${o.prefix}__weekday" part="weekday">${t}</th>`).join("");let i="";for(let t=0;t<42;t+=7){let r="";for(let s=0;s<7;s++)r+=o.cellHTML(o.cells[t+s],o.today);i+=`<tr role="row">${r}</tr>`}return`<table class="${o.prefix}__grid" role="grid" aria-label="${_(o.ariaLabel)}">
      <thead><tr role="row">${e}</tr></thead>
      <tbody>${i}</tbody>
    </table>`}var he=Object.defineProperty,z=(o,e,i,t)=>{for(var r=void 0,s=o.length-1,n;s>=0;s--)(n=o[s])&&(r=n(e,i,r)||r);return r&&he(e,i,r),r};function W(){Q("z-datepicker",ne)}const O=class O extends I{constructor(){super(...arguments),this.mode="single",this.value="",this.start="",this.end="",this.min="",this.max="",this.locale="",this.open=!1,this.precision="day",this.clearable=!1,this.presets="",this.prevMonthLabel=x.prevMonth,this.nextMonthLabel=x.nextMonth,this._floating=new re(this),this._viewYear=0,this._viewMonth=0,this._focusISO=null,this._hoverISO=null,this._pendingStart=null,this._pendingTime="",this._pendingTimeEnd="",this._lastPanelProps="",this._triggerAria=X(()=>{var e;return((e=this.shadowRoot)==null?void 0:e.querySelector('slot[name="trigger"]'))??null},()=>({hasPopup:"dialog",expanded:this.open})),this._onTriggerClick=()=>{this.toggle()},this._onClearClick=e=>{var t,r;const i=((t=e.composedPath)==null?void 0:t.call(e)[0])??e.target;(r=i==null?void 0:i.closest)!=null&&r.call(i,".z-datepicker__clear")&&(e.preventDefault(),e.stopPropagation(),this._clearValue())},this._onHostKey=e=>{var s;const i=e;if(i.key!=="Delete"||this.open||!this.clearable||!(this.mode==="range"?!!(this.start||this.end):!!this.value))return;const r=((s=e.composedPath)==null?void 0:s.call(e)[0])??e.target;ee(r)||(i.preventDefault(),this._clearValue())},this._onPanelClick=e=>{const i=e.target,t=i.closest("[data-preset]");if(t){if(e.preventDefault(),t.disabled)return;this._applyPreset(t.dataset.preset??"");return}const r=i.closest("[data-nav]");if(r){e.preventDefault(),this._navMonth(r.dataset.nav==="next"?1:-1,!1);return}if(i.closest("[data-time-done]")){e.preventDefault(),this._commitTime(),this._closePanel();return}if(i.closest("[data-time-part]"))return;const s=i.closest("[data-iso]");if(!s)return;const n=s.dataset.iso;if(T(n,this.min,this.max)){if(s.classList.contains("z-datepicker__cell--out")){const a=b(n);a&&(this._viewYear=a.getFullYear(),this._viewMonth=a.getMonth())}this._selectISO(n)}},this._onPanelChange=e=>{var t,r;(r=(t=e.target)==null?void 0:t.closest)!=null&&r.call(t,"[data-time-part]")&&this._commitTime()},this._onPanelMouseOver=e=>{if(this.mode!=="range"||!this._pendingStart)return;const i=e.target.closest("[data-iso]");if(!i)return;const t=i.dataset.iso;t!==this._hoverISO&&(this._hoverISO=t,this._repaintPanel())},this._onPanelMouseLeave=()=>{this._hoverISO&&(this._hoverISO=null,this._repaintPanel())},this._onPanelKey=e=>{const i=e,t=this._focusISO;switch(i.key){case"ArrowLeft":e.preventDefault(),this._moveFocus(t,-1);break;case"ArrowRight":e.preventDefault(),this._moveFocus(t,1);break;case"ArrowUp":e.preventDefault(),this._moveFocus(t,-7);break;case"ArrowDown":e.preventDefault(),this._moveFocus(t,7);break;case"Home":e.preventDefault(),this._moveFocusToWeekBoundary(t,!1);break;case"End":e.preventDefault(),this._moveFocusToWeekBoundary(t,!0);break;case"PageUp":e.preventDefault(),i.shiftKey?this._navYear(-1):this._navMonth(-1,!0);break;case"PageDown":e.preventDefault(),i.shiftKey?this._navYear(1):this._navMonth(1,!0);break;case"Enter":case" ":e.preventDefault(),t&&this._isSelectable(t)&&this._selectISO(t);break;case"Escape":e.preventDefault(),this._closePanel();break;case"Tab":this._closePanel();break}}}get _locale(){return this.locale||navigator.language||"en-US"}render(){const e=this.mode==="range"?!!(this.start||this.end):!!this.value,i=this.clearable&&e?`<span class="z-datepicker__clear" part="clear" role="button" tabindex="-1" aria-label="${x.clear}"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>`:"";return g`
      <span
        class="z-datepicker__trigger ${this.open?"z-datepicker__trigger--open":""}"
        part="trigger"
      >
        <slot name="trigger"></slot>
        ${i}
      </span>
    `}connectedCallback(){var e;super.connectedCallback(),W(),(e=this.shadowRoot)==null||e.addEventListener("click",this._onClearClick),this.addEventListener("click",this._onTriggerClick),this.addEventListener("keydown",this._onHostKey)}disconnectedCallback(){var e;this._closePanel(),this._triggerAria.dispose(),(e=this.shadowRoot)==null||e.removeEventListener("click",this._onClearClick),this.removeEventListener("click",this._onTriggerClick),this.removeEventListener("keydown",this._onHostKey),super.disconnectedCallback()}updated(){this._triggerAria.sync(),this.open&&this._floating.panel&&!this._panelPropsCurrent()&&(this._renderPanelTo(this._floating.panel),this._focusCell())}show(){this._openPanel()}close(){this._closePanel()}toggle(){this.open?this._closePanel():this._openPanel()}_clearValue(){if(this.mode==="range"){if(!this.start&&!this.end)return;this.start="",this.end="",this._pendingStart=null,this._pendingTime="",this._pendingTimeEnd="",this._closePanel(),this.emit("z-change",{start:"",end:""});return}this.value&&(this.value="",this._pendingTime="",this._closePanel(),this.emit("z-change",{value:""}))}_getTriggerEl(){const e=this.shadowRoot.querySelector('slot[name="trigger"]'),i=e==null?void 0:e.assignedElements();return i&&i[0]||null}_resolveSeedISO(){return this.value&&b(u(this.value))?u(this.value):this.start&&b(u(this.start))?u(this.start):this.end&&b(u(this.end))?u(this.end):D()}_openPanel(){if(this.open)return;W();const e=b(this._resolveSeedISO())??new Date;this._viewYear=e.getFullYear(),this._viewMonth=e.getMonth(),this._focusISO=A(e),this._pendingStart=this.mode==="range"&&this.start&&!this.end?u(this.start):null,this._hoverISO=null,this._pendingTime="",this._pendingTimeEnd="";const i=this._floating.open({panelClass:"z-datepicker__panel",hidingClass:"z-datepicker__panel--hiding",ariaLabel:"Datepicker",anchor:()=>this.shadowRoot.querySelector(".z-datepicker__trigger"),onOutsideClose:()=>this._closePanel()},t=>this._renderPanelTo(t));i.addEventListener("click",this._onPanelClick),i.addEventListener("mouseover",this._onPanelMouseOver),i.addEventListener("mouseleave",this._onPanelMouseLeave),i.addEventListener("keydown",this._onPanelKey),i.addEventListener("change",this._onPanelChange),this.open=!0,this._focusCell(),this.emit("z-datepicker-open")}_closePanel(){var i;if(!this.open)return;const e=this._floating.panel;e==null||e.removeEventListener("click",this._onPanelClick),e==null||e.removeEventListener("mouseover",this._onPanelMouseOver),e==null||e.removeEventListener("mouseleave",this._onPanelMouseLeave),e==null||e.removeEventListener("keydown",this._onPanelKey),e==null||e.removeEventListener("change",this._onPanelChange),this._floating.close(),this.open=!1,this._hoverISO=null,this._pendingStart=null,this._pendingTime="",this._pendingTimeEnd="",this._focusISO=null,(i=this._getTriggerEl())==null||i.focus(),this.emit("z-datepicker-close")}_panelPropsSnapshot(){return[this.mode,this.value,this.start,this.end,this.min,this.max,this._locale,this.presets,this.precision].join("|")}_panelPropsCurrent(){return this._panelPropsSnapshot()===this._lastPanelProps}_renderPanelTo(e){e.innerHTML=this._renderPanel(),this._lastPanelProps=this._panelPropsSnapshot()}_focusCell(){var i;const e=(i=this._floating.panel)==null?void 0:i.querySelector(".z-datepicker__cell--focus");e==null||e.focus()}_repaintPanel(){const e=this._floating.panel;e&&this._renderPanelTo(e)}_renderPanel(){const e=this._locale,i=Y(e),t=G(this._viewYear,this._viewMonth,i),r=D(),s=oe(e,this._viewYear,this._viewMonth);return g`
      ${this._presetsHTML()}
      <div class="z-datepicker__header" part="header">
        <button type="button" class="z-datepicker__nav" data-nav="prev" part="nav-prev" aria-label="${_(this.prevMonthLabel)}">‹</button>
        <div class="z-datepicker__label" part="label">${s}</div>
        <button type="button" class="z-datepicker__nav" data-nav="next" part="nav-next" aria-label="${_(this.nextMonthLabel)}">›</button>
      </div>
      ${ce({prefix:"z-datepicker",locale:e,weekStart:i,cells:t,today:r,ariaLabel:s,cellHTML:(n,a)=>this._cellHTML(n,a)})}
      ${this._timeHTML()}
    `}_timeHTML(){return this._timed?this.mode==="range"?K({mode:"range",time:this._timeOf(this.start,this._pendingTime,"00:00"),timeTo:this._timeOf(this.end,this._pendingTimeEnd,"23:59")}):K({mode:"single",time:this._timeOf(this.value,this._pendingTime,"00:00"),timeTo:""}):""}_timeOf(e,i,t){return J(e)||i||t}_presetsHTML(){if(this.mode!=="range"||!this.presets.trim())return"";const e=new Date,i=this.presets.split(/[,，]/).map(t=>t.trim()).filter(Boolean).map(t=>{const r=N(t,e);if(!r)return"";const s=B(r,this.min,this.max)!==null,n=Z(t,u(this.start),u(this.end),e,this.min,this.max);return`<button type="button" class="z-datepicker__preset${n?" is-active":""}" data-preset="${_(t)}" aria-pressed="${n?"true":"false"}"`+(s?"":' disabled aria-disabled="true" title="超出可选日期范围"')+`>${V(t)}</button>`}).filter(Boolean).join("");return i?`<div class="z-datepicker__presets" part="presets" role="group" aria-label="快捷区间">${i}</div>`:""}_applyPreset(e){const t=N(e,new Date);if(!t)return;const r=B(t,this.min,this.max);if(!r)return;const s=this._timed?y(r.start,"00:00"):r.start,n=this._timed?y(r.end,"23:59"):r.end;this.start=s,this.end=n,this._pendingStart=null,this._focusISO=r.start,this._hoverISO=null,this.emit("z-change",{start:s,end:n}),this._closePanel()}get _timed(){return this.precision==="minute"}_cellHTML(e,i){const{iso:t,day:r,inMonth:s}=e,n=this.mode==="range",a=["z-datepicker__cell"],c=!s||!T(t,this.min,this.max);s?T(t,this.min,this.max)||a.push("z-datepicker__cell--disabled"):a.push("z-datepicker__cell--out"),t===i&&a.push("z-datepicker__cell--today");let d="false";if(n){this.start&&t===u(this.start)&&(a.push("z-datepicker__cell--range-start"),d="true"),this.end&&t===u(this.end)&&(a.push("z-datepicker__cell--range-end"),d="true");const P=!!(this.start&&this.end&&w(t,u(this.start))>0&&w(t,u(this.end))<0),$=!!(this._pendingStart&&this._hoverISO&&w(t,this._pendingStart)>=0&&w(t,this._hoverISO)<=0);(P||$)&&a.push("z-datepicker__cell--range-in")}else this.value&&t===u(this.value)&&(a.push("z-datepicker__cell--selected"),d="true");const m=t===this._focusISO;return m&&a.push("z-datepicker__cell--focus"),g`<td
      class="${a.join(" ")}"
      role="gridcell"
      data-iso="${t}"
      tabindex="${m?0:-1}"
      aria-selected="${d}"
      aria-disabled="${te(c)}"
      ${t===i?'aria-current="date"':""}
      part="cell"
    >${r}</td>`}_selectISO(e){if(this._focusISO=e,this.mode==="single"){const i=this._timed?y(e,this._timeOf(this.value,this._pendingTime,"00:00")):e;if(this.value!==i&&(this.value=i),this.emit("z-change",{value:i}),!this._timed){this._closePanel();return}this._repaintPanel(),this._focusCell();return}!this.start||this.end?(this.start=this._timed?y(e,this._timeOf("",this._pendingTime,"00:00")):e,this.end="",this._pendingStart=e,this._repaintPanel()):w(e,u(this.start))>=0?(this.end=this._timed?y(e,this._timeOf("",this._pendingTimeEnd,"23:59")):e,this._pendingStart=null,this.emit("z-change",{start:this.start,end:this.end}),this._repaintPanel()):(this.start=this._timed?y(e,this._timeOf("",this._pendingTime,"00:00")):e,this._pendingStart=e,this._repaintPanel()),this._focusCell()}_commitTime(){const e=this._floating.panel;if(!e)return;const i=s=>ae(e,s);if(this.mode==="range"){const s=i("start"),n=i("end");if(s===null||n===null||(this._pendingTime=s,this._pendingTimeEnd=n,!this.start||!this.end))return;const a=y(u(this.start),s),c=y(u(this.end),n);if(a===this.start&&c===this.end)return;this.start=a,this.end=c,this._lastPanelProps=this._panelPropsSnapshot(),this.emit("z-change",{start:a,end:c});return}const t=i("value");if(t===null||(this._pendingTime=t,!u(this.value)))return;const r=y(u(this.value),t);r!==this.value&&(this.value=r,this._lastPanelProps=this._panelPropsSnapshot(),this.emit("z-change",{value:r}))}_isSelectable(e){return b(e)!==null&&T(e,this.min,this.max)}_moveFocus(e,i){if(!e)return;const t=b(e);if(!t)return;const r=new Date(t);r.setDate(r.getDate()+i);const s=A(r);b(s)!==null&&((r.getFullYear()!==this._viewYear||r.getMonth()!==this._viewMonth)&&(this._viewYear=r.getFullYear(),this._viewMonth=r.getMonth()),this._focusISO=s,this._renderPanelTo(this._floating.panel),this._focusCell())}_moveFocusToWeekBoundary(e,i){if(!e)return;const t=b(e);if(!t)return;const r=Y(this._locale),s=(t.getDay()-r+7)%7;this._moveFocus(e,i?6-s:-s)}_navMonth(e,i){var n;let t=this._viewMonth+e,r=this._viewYear;t<0&&(t=11,r-=1),t>11&&(t=0,r+=1),this._viewMonth=t,this._viewYear=r,this._repaintPanel();const s=this._floating.panel;if(s)if(i)this._focusCell();else{const a=e===1?'[data-nav="next"]':'[data-nav="prev"]';(n=s.querySelector(a))==null||n.focus()}}_navYear(e){this._viewYear+=e,this._repaintPanel(),this._focusCell()}};O.styles=se;let f=O;z([l({type:String})],f.prototype,"mode");z([l({type:String})],f.prototype,"value");z([l({type:String})],f.prototype,"start");z([l({type:String})],f.prototype,"end");z([l({type:String})],f.prototype,"min");z([l({type:String})],f.prototype,"max");z([l({type:String})],f.prototype,"locale");z([l({type:Boolean})],f.prototype,"open");z([l({type:String})],f.prototype,"precision");z([l({type:Boolean})],f.prototype,"clearable");z([l({type:String})],f.prototype,"presets");z([l({type:String})],f.prototype,"prevMonthLabel");z([l({type:String})],f.prototype,"nextMonthLabel");customElements.define("z-datepicker",f);const de=`/* ===== z-virtual-list ===== */

:host {
  display: block;
}

.z-vlist {
  position: relative;
  overflow-y: auto;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
}

.z-vlist__space {
  position: relative;
}

/* [WHY] 切片绝对定位 + translateY: 只渲染可视区上下 overscan 行,
   行高由调用方 render 或默认行样式决定 */
.z-vlist__slice {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
}

.z-vlist__row {
  display: flex;
  align-items: center;
  padding: 0 12px;
  box-sizing: border-box;
  border-bottom: 1px solid var(--z-color-gray-100);
  color: var(--z-color-text);
  font-size: var(--z-font-size-sm);
}

.z-vlist__row:last-child {
  border-bottom: none;
}

.z-vlist--empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
}
`;var pe=Object.defineProperty,S=(o,e,i,t)=>{for(var r=void 0,s=o.length-1,n;s>=0;s--)(n=o[s])&&(r=n(e,i,r)||r);return r&&pe(e,i,r),r};const F=class F extends I{constructor(){super(...arguments),this.items=[],this.itemHeight=40,this.height=400,this.overscan=5,this.renderItem=null,this.emptyText=x.empty,this._scroller=null,this._lastSyncKey="",this._onScroll=()=>{this._syncSlice()}}render(){const e=this.items.length;return e===0?g`<div class="z-vlist z-vlist--empty" part="root" style="height:${this.height}px">${_(this.emptyText)}</div>`:g`<div class="z-vlist" part="root" style="height:${this.height}px">
      <div class="z-vlist__space" style="height:${e*this.itemHeight}px">
        <div class="z-vlist__slice"></div>
      </div>
    </div>`}updated(){const e=this.shadowRoot.querySelector(".z-vlist");e&&e!==this._scroller&&(this._scroller=e,e.addEventListener("scroll",this._onScroll)),this._syncSlice()}_syncSlice(){const e=this._scroller,i=e==null?void 0:e.querySelector(".z-vlist__slice");if(!e||!i)return;const t=this.items.length,r=this.itemHeight||1,s=e.scrollTop,n=this.height||e.clientHeight||0,a=Math.max(1,Math.ceil(n/r)),c=Math.floor(s/r);let d=Math.max(0,c-this.overscan),m=Math.min(t,c+a+this.overscan);m-d<a&&(d=Math.max(0,m-a));const P=`${s}|${d}|${m}`;if(P===this._lastSyncKey)return;this._lastSyncKey=P,i.style.transform=`translateY(${d*r}px)`;let $="";for(let C=d;C<m;C++){const R=this.items[C];$+=this.renderItem?this.renderItem(R,C):`<div class="z-vlist__row" style="height:${r}px">${_(String(R))}</div>`}i.innerHTML=$}scrollToIndex(e){const i=this._scroller;i&&(i.scrollTop=e*(this.itemHeight||1),this._syncSlice())}scrollToOffset(e){const i=this._scroller;i&&(i.scrollTop=e,this._syncSlice())}};F.styles=de;let k=F;S([l({attribute:!1})],k.prototype,"items");S([l({type:Number})],k.prototype,"itemHeight");S([l({type:Number})],k.prototype,"height");S([l({type:Number})],k.prototype,"overscan");S([l({attribute:!1})],k.prototype,"renderItem");S([l({type:String,attribute:"empty-text"})],k.prototype,"emptyText");customElements.define("z-virtual-list",k);function L(o,e,i){for(const t of o){if(t.filterable===!1)continue;const r=e[t.key];if(r==null)continue;const s=i[t.key];switch(t.type){case"text":{const n=String(r).trim();if(!n)continue;if(s==null||!String(s).toLowerCase().includes(n.toLowerCase()))return!1;break}case"number":{const{min:n,max:a}=r;if(!n&&!a)continue;if(s==null)return!1;const c=Number(s);if(Number.isNaN(c)||n&&c<Number(n)||a&&c>Number(a))return!1;break}case"date":{const{start:n,end:a}=r;if(!n&&!a)continue;const c=(s instanceof Date?s.toISOString():String(s??"")).slice(0,10);if(!c||n&&c<n||a&&c>a)return!1;break}case"select":{const n=String(r);if(!n)continue;if(String(s??"")!==n)return!1;break}case"boolean":{const n=String(r);if(!n)continue;if(String(s===!0||s==="true"||s===1||s==="1")!==n)return!1;break}}}return!0}function U(o,e,i){for(const{key:t,dir:r}of o){const s=e[t],n=i[t];if(s==null&&n==null)continue;if(s==null)return 1;if(n==null)return-1;const a=s<n?-1:s>n?1:0;if(a!==0)return r==="desc"?-a:a}return 0}function E(o,e,i,t,r){const s=o.find(a=>a.key===i);if(!s)return!1;const n=s.type==="number"&&typeof r=="string"?t==="min"?{...e[i]??{min:"",max:""},min:r}:{...e[i]??{min:"",max:""},max:r}:r;return JSON.stringify(e[i]??"")===JSON.stringify(n)?!1:(e[i]=n,!0)}function ue(o){const e=o.fields.filter(t=>t.filterable!==!1);if(!e.length)return"";const i=e.map(t=>_e(o,t)).join("");return g`
      <div class="z-dl__filterbar" part="filterbar">
        ${i}
        <button type="button" class="z-dl__reset" part="reset">${_(o.texts.resetText)}</button>
      </div>`}function _e(o,e){const i=e.hidden?" z-dl__filter-item--hidden":"",t=`data-key="${v(e.key)}"`,r=`<span class="z-dl__filter-label">${_(e.label)}</span>`,s=o.filters[e.key];switch(e.type){case"number":{const n=s??{min:"",max:""};return g`
          <div class="z-dl__filter-item z-dl__filter-item--number${i}" ${t}>
            ${r}
            <z-input type="number" clearable value="${v(n.min)}" placeholder="${v(o.texts.minPlaceholder)}" ${t} data-bound="min"></z-input>
            <z-input type="number" clearable value="${v(n.max)}" placeholder="${v(o.texts.maxPlaceholder)}" ${t} data-bound="max"></z-input>
          </div>`}case"select":{const n=(e.options??[]).map(a=>`<z-option value="${v(a.value)}">${_(a.label)}</z-option>`).join("");return g`
          <div class="z-dl__filter-item${i}" ${t}>
            ${r}
            <z-select value="${v(s??"")}" ${t} data-bound="">
              <z-option value="">${_(o.texts.allText)}</z-option>
              ${n}
            </z-select>
          </div>`}case"boolean":return g`
          <div class="z-dl__filter-item${i}" ${t}>
            ${r}
            <z-select value="${v(s??"")}" ${t} data-bound="">
              <z-option value="">${_(o.texts.allText)}</z-option>
              <z-option value="true">${_(o.texts.yesText)}</z-option>
              <z-option value="false">${_(o.texts.noText)}</z-option>
            </z-select>
          </div>`;case"date":{const n=s??{start:"",end:""};return g`
          <div class="z-dl__filter-item${i}" ${t}>
            ${r}
            <z-datepicker mode="range" start="${v(n.start)}" end="${v(n.end)}" ${o.locale?`locale="${v(o.locale)}"`:""} ${t} data-bound=""></z-datepicker>
          </div>`}default:return g`
          <div class="z-dl__filter-item${i}" ${t}>
            ${r}
            <z-input clearable value="${v(s??"")}" placeholder="${v(e.label)}" ${t} data-bound=""></z-input>
          </div>`}}function fe(){return g`
      <div class="z-dl__body" part="body">
        <z-report-table editable></z-report-table>
      </div>`}function ge(o){const e=o.showInfo?"show-info":"",i=o.showPageSize?"show-page-size":"";return g`
      <div class="z-dl__footer" part="footer">
        <z-pagination ${e} ${i}></z-pagination>
      </div>`}function v(o){return _(o).replace(/"/g,"&quot;")}const me=`/* ===== z-data-list ===== */

:host {
  display: block;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
}

.z-dl__filterbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 10px 16px;
  border: 1px solid var(--z-color-border);
  border-bottom: none;
  border-radius: var(--z-radius-md) var(--z-radius-md) 0 0;
  background: var(--z-color-surface);
}

.z-dl__filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.z-dl__filter-item--hidden {
  display: none;
}

.z-dl__filter-label {
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  white-space: nowrap;
}

/* [WHY] flex-wrap 定宽: text 160 / number 110 / select 140 / datepicker 240,
   控件 host 为 inline-flex, 宽度直接作用于 host */
.z-dl__filter-item z-input {
  width: 160px;
}

.z-dl__filter-item--number z-input {
  width: 110px;
}

.z-dl__filter-item z-select {
  width: 140px;
}

.z-dl__filter-item z-datepicker {
  width: 240px;
}

/* [WHY] datepicker 触发按钮按内容宽, ::part 强制撑满 host 定宽 */
.z-dl__filter-item z-datepicker::part(trigger) {
  width: 100%;
}

.z-dl__reset {
  margin-left: auto;
  padding: 4px 12px;
  font-family: inherit;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  background: var(--z-color-bg-secondary);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  cursor: pointer;
  transition: color var(--z-transition-fast), border-color var(--z-transition-fast);
}

.z-dl__reset:hover {
  color: var(--z-color-primary);
  border-color: var(--z-color-primary);
}

.z-dl__body {
  border: 1px solid var(--z-color-border);
}

.z-dl__footer {
  display: flex;
  justify-content: flex-end;
  padding: 10px 16px;
  border: 1px solid var(--z-color-border);
  border-top: none;
  border-radius: 0 0 var(--z-radius-md) var(--z-radius-md);
  background: var(--z-color-surface);
}
`;var ve=Object.defineProperty,p=(o,e,i,t)=>{for(var r=void 0,s=o.length-1,n;s>=0;s--)(n=o[s])&&(r=n(e,i,r)||r);return r&&ve(e,i,r),r};const H=class H extends I{constructor(){super(...arguments),this.fields=[],this.items=[],this.filters={},this.pageSizes=[10,20,50,100],this.mode="client",this.page=1,this.pageSize=10,this.totalRecords=0,this.selectable=!1,this.rowKey="",this.loading=!1,this.maxHeight="",this.showInfo=!1,this.showPageSize=!1,this.locale="",this.allText=x.all,this.yesText=x.yes,this.noText=x.no,this.resetText=x.reset,this.minPlaceholder="Min",this.maxPlaceholder="Max",this._filters={},this._sortState=[],this._config=null,this._tableEl=null,this._pagerEl=null,this._nameBinders=new Map,this._lastFiltersRef=null,this._eventsBound=!1,this._onFilterInput=e=>{var n;e.stopPropagation();const i=e.target;if(i.tagName!=="Z-INPUT")return;const t=i.dataset.key;if(!t)return;const r=i.dataset.bound??"",s=String(((n=e.detail)==null?void 0:n.value)??"");E(this.fields,this._filters,t,r,s)&&this._applyFilters()},this._onShadowChange=e=>{e.stopPropagation();const i=e.target,t=e.detail??{},r=i.dataset.key,s=i.tagName;if(s==="Z-INPUT"&&r){const n=String(t.value??"");E(this.fields,this._filters,r,i.dataset.bound??"",n)&&this._applyFilters()}else if(s==="Z-SELECT"&&r)E(this.fields,this._filters,r,"",String(t.value??""))&&this._applyFilters();else if(s==="Z-DATEPICKER"&&r){const n={start:String(t.start??""),end:String(t.end??"")};E(this.fields,this._filters,r,"",n)&&this._applyFilters()}else s==="Z-PAGINATION"&&this._onPagerChange(t)},this._onSizeChange=e=>{e.stopPropagation()},this._onSort=e=>{e.stopPropagation();const i=e.detail??{};if(this._sortState=i.sortState?[...i.sortState]:[],this.mode==="server"){this.emit("z-sort",{sortState:[...this._sortState]});return}const t=this.page!==1;t&&(this.__zui_prop_page=1),this._recompute(),t&&this._emitPageChange(),this.emit("z-sort",{sortState:[...this._sortState]})},this._onColumnVisibility=e=>{var s;e.stopPropagation();const i=e.detail??{},t=i.key;if(!t)return;const r=(s=this.shadowRoot)==null?void 0:s.querySelector(`.z-dl__filter-item[data-key="${CSS.escape(t)}"]`);r==null||r.classList.toggle("z-dl__filter-item--hidden",!i.visible)},this._onConfigChange=e=>{var i;e.stopPropagation(),this._config=((i=e.detail)==null?void 0:i.config)??this._config,this.emit("z-config-change",{config:this._config})},this._onSelectionChange=e=>{var t;e.stopPropagation();const i=((t=e.detail)==null?void 0:t.selectedKeys)??[];this.emit("z-selection-change",{selectedKeys:[...i]})},this._onColumnConfigChange=e=>{e.stopPropagation()},this._onShadowClick=e=>{e.target.closest(".z-dl__reset")&&this.resetFilters()}}resetFilters(){this._filters={},this.shadowRoot.querySelectorAll("[data-key]").forEach(i=>{const t=i.tagName;t==="Z-INPUT"||t==="Z-SELECT"?i.value="":t==="Z-DATEPICKER"&&(i.start="",i.end="")}),this._applyFilters()}getConfig(){return this._config?{...this._config,columns:[...this._config.columns]}:null}applyConfig(e){var i;this._config=e,(i=this._tableEl)==null||i.applyConfig(e)}clearSelection(){var e;(e=this._tableEl)==null||e.clearSelection()}disconnectedCallback(){for(const e of this._nameBinders.values())e.dispose();this._nameBinders.clear(),super.disconnectedCallback()}render(){this.filters!==this._lastFiltersRef&&(this._filters={...this.filters},this._lastFiltersRef=this.filters);const e=ue({fields:this.fields,filters:this._filters,locale:this.locale,texts:{resetText:this.resetText,allText:this.allText,yesText:this.yesText,noText:this.noText,minPlaceholder:this.minPlaceholder,maxPlaceholder:this.maxPlaceholder}}),i=fe(),t=ge({showInfo:this.showInfo,showPageSize:this.showPageSize});return g`
      ${e}
      ${i}
      ${t}
    `}updated(){const e=this._tableEl,i=this.shadowRoot,t=i.querySelector("z-report-table"),r=i.querySelector("z-pagination");if(this._tableEl=t,this._pagerEl=r,this._bindEvents(),t&&(t.columns=this._buildColumns(),t.editable=!0,t.showColumnSelector=!0,t.sortMode="server",t.selectable=this.selectable,t.loading=this.loading,this.rowKey&&(t.rowKey=this.rowKey),this.maxHeight&&(t.maxHeight=this.maxHeight),this.mode==="server"?t.data=this.items:t.data=this._computeSlice(),this._config&&t!==e&&t.applyConfig(this._config),this._syncFilterVisibility()),this._syncFilterNames(),r&&(r.pageSizes=this.pageSizes,r.pageSize=this.pageSize,r.current=this.page,this.mode==="server")){r.totalRecords=this.totalRecords;const s=Math.max(1,Math.ceil((this.totalRecords||0)/this.pageSize));r.total=s;const n=Math.min(Math.max(1,this.page),s);n!==this.page&&(this.__zui_prop_page=n),r.current=n}}_syncFilterNames(){const e=this.shadowRoot;if(!e)return;const i=new Set;for(const t of Array.from(e.querySelectorAll(".z-dl__filter-item"))){const r=t.getAttribute("data-key")??"",s=this.fields.find(n=>n.key===r);if(s)for(const n of Array.from(t.querySelectorAll("z-input,z-select,z-datepicker"))){i.add(n);let a=this._nameBinders.get(n);if(!a){const c=n;a=ie(()=>c,()=>this._filterNameOf(s,c.getAttribute("data-bound"))),this._nameBinders.set(n,a)}a.sync()}}for(const[t,r]of Array.from(this._nameBinders))i.has(t)||(r.dispose(),this._nameBinders.delete(t))}_filterNameOf(e,i){return e.type!=="number"?e.label:`${e.label}${i==="max"?this.maxPlaceholder:this.minPlaceholder}`}_buildColumns(){return this.fields.map(e=>({key:e.key,title:e.label,required:e.required??!1,hidden:e.hidden??!1,sortable:e.sortable??!0,width:e.width,align:e.align,render:e.render}))}_computeSlice(){const e=this.items.filter(c=>L(this.fields,this._filters,c)),i=this._sortState.length?[...e].sort((c,d)=>U(this._sortState,c,d)):e,t=Math.max(1,Math.ceil(i.length/this.pageSize)),r=Math.min(Math.max(1,this.page),t);r!==this.page&&(this.__zui_prop_page=r);const s=(r-1)*this.pageSize,n=i.slice(s,s+this.pageSize),a=this._pagerEl;return a&&(a.totalRecords=i.length,a.total=t,a.current=r),n}_syncFilterVisibility(){const e=this._tableEl;if(!e)return;const i=this.shadowRoot;for(const t of e.columns){const r=i.querySelector(`.z-dl__filter-item[data-key="${CSS.escape(t.key)}"]`);r==null||r.classList.toggle("z-dl__filter-item--hidden",!!t.hidden)}}_bindEvents(){if(this._eventsBound)return;const e=this.shadowRoot;e&&(e.addEventListener("z-input",this._onFilterInput),e.addEventListener("z-change",this._onShadowChange),e.addEventListener("z-size-change",this._onSizeChange),e.addEventListener("z-sort",this._onSort),e.addEventListener("z-column-visibility-change",this._onColumnVisibility),e.addEventListener("z-config-change",this._onConfigChange),e.addEventListener("z-selection-change",this._onSelectionChange),e.addEventListener("z-column-config-change",this._onColumnConfigChange),e.addEventListener("click",this._onShadowClick),this._eventsBound=!0)}_onPagerChange(e){const i=Math.max(1,e.page??1),t=e.pageSize??this.pageSize;i!==this.page&&(this.__zui_prop_page=i),t!==this.pageSize&&(this.__zui_prop_pageSize=t),this.mode==="client"&&this._recompute(),this._emitPageChange()}_applyFilters(){const e=this.page!==1;if(e&&(this.__zui_prop_page=1),this.mode==="server"){this.emit("z-filter-change",{filters:{...this._filters}}),e&&this._emitPageChange();return}this._recompute(),e&&this._emitPageChange(),this.emit("z-filter-change",{filters:{...this._filters}})}_recompute(){const e=this._tableEl;if(!e)return;const i=this.items.filter(d=>L(this.fields,this._filters,d)),t=this._sortState.length?[...i].sort((d,m)=>U(this._sortState,d,m)):i,r=Math.max(1,Math.ceil(t.length/this.pageSize)),s=Math.min(Math.max(1,this.page),r),n=s!==this.page;n&&(this.__zui_prop_page=s);const a=(s-1)*this.pageSize;e.data=t.slice(a,a+this.pageSize);const c=this._pagerEl;c&&(c.totalRecords=t.length,c.total=r,c.current=s),n&&this._emitPageChange()}_emitPageChange(){this.emit("z-page-change",{page:this.page,pageSize:this.pageSize,totalRecords:this.mode==="client"?this._filteredCount():this.totalRecords})}_filteredCount(){return this.items.filter(e=>L(this.fields,this._filters,e)).length}};H.styles=me;let h=H;p([l({type:Array,attribute:!1})],h.prototype,"fields");p([l({type:Array,attribute:!1})],h.prototype,"items");p([l({type:Array,attribute:!1})],h.prototype,"filters");p([l({type:Array,attribute:!1})],h.prototype,"pageSizes");p([l({type:String})],h.prototype,"mode");p([l({type:Number})],h.prototype,"page");p([l({type:Number,attribute:"page-size"})],h.prototype,"pageSize");p([l({type:Number,attribute:"total-records"})],h.prototype,"totalRecords");p([l({type:Boolean})],h.prototype,"selectable");p([l({type:String,attribute:"row-key"})],h.prototype,"rowKey");p([l({type:Boolean})],h.prototype,"loading");p([l({type:String,attribute:"max-height"})],h.prototype,"maxHeight");p([l({type:Boolean,attribute:"show-info"})],h.prototype,"showInfo");p([l({type:Boolean,attribute:"show-page-size"})],h.prototype,"showPageSize");p([l({type:String})],h.prototype,"locale");p([l({type:String,attribute:"all-text"})],h.prototype,"allText");p([l({type:String,attribute:"yes-text"})],h.prototype,"yesText");p([l({type:String,attribute:"no-text"})],h.prototype,"noText");p([l({type:String,attribute:"reset-text"})],h.prototype,"resetText");p([l({type:String,attribute:"min-placeholder"})],h.prototype,"minPlaceholder");p([l({type:String,attribute:"max-placeholder"})],h.prototype,"maxPlaceholder");customElements.define("z-data-list",h);export{oe as g,ce as r};
