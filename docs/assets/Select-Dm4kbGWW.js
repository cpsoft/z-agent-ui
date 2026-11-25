import{B as y,p as l,a as v,e as h,h as u}from"./presets-CdaBrvJF.js";import{i as w}from"./styleInjection-peqqYNO6.js";import{c as k}from"./Input-wCelPXsT.js";import{C as O}from"./copy-DoHMT7Ic.js";import"./Position-D6zl9ryN.js";import{F as L}from"./floatingPanel-BYE_1ufg.js";import{l as D,c as S}from"./roving-DMg3clv6.js";const $='a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';class T{constructor(e){this._previousFocus=null,this._container=e.container,this._onKeyDown=this._handleKeyDown.bind(this),this._container.addEventListener("keydown",this._onKeyDown),e.autoFocus!==!1&&this._trapFocus()}activate(){this._trapFocus()}deactivate(){this._container.removeEventListener("keydown",this._onKeyDown),this._restoreFocus()}destroy(){this.deactivate()}_getFocusable(){const e=s=>s.offsetParent!==null||s.getClientRects().length>0,t=s=>{const o=[];for(const n of Array.from(s.querySelectorAll("*")))n.shadowRoot&&o.push(...t(n.shadowRoot)),n.matches($)&&e(n)&&o.push(n);return o};return t(this._container)}_deepActive(){var t;let e=document.activeElement;for(let s=0;e&&s<16;s++){const o=(t=e.shadowRoot)==null?void 0:t.activeElement;if(!o)break;e=o}return e}_trapFocus(){this._previousFocus=this._deepActive();const e=this._getFocusable();if(e.length>0){const t=e[0];this._container.contains(document.activeElement)||t.focus()}}_restoreFocus(){const e=this._previousFocus;this._previousFocus=null,e&&e.isConnected&&e.focus()}_handleKeyDown(e){if(e.key!=="Tab")return;const t=this._getFocusable();if(t.length===0){e.preventDefault();return}const s=t[0],o=t[t.length-1],n=document.activeElement,i=this._deepActive(),r=!this._container.contains(n);e.shiftKey?(i===s||r)&&(e.preventDefault(),o.focus()):(i===o||r)&&(e.preventDefault(),s.focus())}}var C=Object.defineProperty,z=(p,e,t,s)=>{for(var o=void 0,n=p.length-1,i;n>=0;n--)(i=p[n])&&(o=i(e,t,o)||o);return o&&C(e,t,o),o};class g extends y{constructor(){super(...arguments),this.value="",this.disabled=!1,this.selected=!1}get label(){var e;return((e=this.textContent)==null?void 0:e.trim())||this.value}render(){return null}}z([l({type:String})],g.prototype,"value");z([l({type:Boolean})],g.prototype,"disabled");z([l({type:Boolean,attribute:!1})],g.prototype,"selected");customElements.define("z-option",g);const E=`
    .z-select__dropdown {
      position: fixed;
      z-index: var(--z-z-dropdown);
      max-height: 280px;
      /* [WHY 面板不再自己滚，改由选项区滚] 面板是「搜索框 + 选项 + 底栏」三段；
         让面板整体滚动会把底栏（暂存模式的「确定」，唯一提交口）推到滚动区之外
         （issue IKXGGI）。flex 列 + 选项区 flex:1 之后，底栏恒在面板底部，
         选项在剩余高度里滚，谁都不会压住谁。 */
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--z-color-popover);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      padding: var(--z-space-1);
      outline: none;
      animation: z-select-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-select__dropdown--hiding {
      animation: z-select-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-select-in {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-select-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.96); }
    }
    .z-select__search {
      display: block;
      box-sizing: border-box;
      width: 100%;
      margin-bottom: var(--z-space-1);
      height: var(--z-input-height);
      padding: 0 var(--z-input-padding-x);
      font-family: var(--z-font-sans);
      font-size: var(--z-input-font-size);
      color: var(--z-color-text);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      outline: none;
      transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
    }
    .z-select__search:focus {
      border-color: var(--z-color-primary);
      /* [WHY] 聚焦光环对齐主色 #2563eb（REQ-010） */
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .z-select__search::placeholder {
      color: var(--z-color-text-disabled);
    }
    /* [WHY 聚焦不画框] 非搜索模式下 listbox 自己持有焦点，但「当前停在第几项」已经由
       --active 的背景色表达。再叠一圈浏览器默认焦点框就是两个高亮打架 —— 而且那圈框
       会绕着整个列表（280px 高），看起来像「整块被选中了」。
       （注：这个字符串是 JS 模板字面量，注释里不能出现反引号，否则会提前闭合） */
    /* [WHY 选项区才是滚动容器] 见 z-select__dropdown 的注释：底栏必须常驻，
       所以把滚动下移一层。min-height 0 是 flex 子项能小于内容高度的前提，
       少了它选项区会把面板撑过 max-height。 */
    .z-select__options {
      flex: 1 1 auto;
      min-height: 0;
      overflow-y: auto;
    }
    .z-select__options:focus,
    .z-select__options:focus-visible {
      outline: none;
    }
    .z-select__option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      /* [WHY] 紧凑商务风下拉选项（REQ-010）：8/12 → 6/10 */
      padding: 6px 10px;
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      color: var(--z-color-text);
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      user-select: none;
      transition: background var(--z-transition-fast);
    }
    .z-select__option:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-select__option--active {
      /* [WHY] blue-50 不在暗色覆盖范围 → 暗色下激活项是一块亮白；改语义 soft */
      background: var(--z-color-primary-soft);
      color: var(--z-color-primary-strong);
    }
    .z-select__option--selected {
      font-weight: var(--z-font-weight-medium);
    }
    /* 多选选中态：只加中性底 + 左侧勾选框，不用蓝色高亮
       （蓝底读起来像"当前焦点行"，而多选里同时可以有多行"已选"） */
    .z-select__option--multi {
      background: var(--z-color-bg-secondary);
    }
    .z-select__box {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      margin-right: var(--z-space-2);
      border: 1px solid var(--z-color-border);
      border-radius: 3px;
      background: var(--z-color-bg);
      color: #fff;
      flex-shrink: 0;
    }
    .z-select__box--on {
      border-color: var(--z-color-primary);
      background: var(--z-color-primary);
    }
    .z-select__option--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-select__check {
      display: flex;
      align-items: center;
      color: var(--z-color-primary);
      flex-shrink: 0;
      margin-left: var(--z-space-2);
    }
    .z-select__empty {
      padding: var(--z-space-3);
      text-align: center;
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-sm);
    }
    .z-select__loading {
      padding: var(--z-space-3);
      text-align: center;
      color: var(--z-color-text-secondary);
      font-size: var(--z-font-size-sm);
    }
    /* 暂存模式（commit-on-confirm）的底部操作条：左计数、右「清空 / 确定」 */
    .z-select__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--z-space-2);
      margin-top: var(--z-space-1);
      padding: var(--z-space-2) var(--z-space-2) var(--z-space-1);
      border-top: 1px solid var(--z-color-border);
      /* 面板用的是「搜索框 / 选项 / 底栏」三段 flex：底栏不参与滚动，恒在面板底部
         （issue IKXGGI：8 个选项就把它挤出可视区，用户找不到「确定」）。 */
      flex: 0 0 auto;
    }
    .z-select__count {
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      white-space: nowrap;
    }
    .z-select__footer-actions {
      display: inline-flex;
      gap: var(--z-space-2);
      flex-shrink: 0;
    }
    .z-select__btn {
      height: 26px;
      padding: 0 10px;
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      line-height: 1;
      color: var(--z-color-text);
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      transition: background var(--z-transition-fast);
    }
    .z-select__btn:hover:not(:disabled) {
      background: var(--z-color-bg-secondary);
    }
    .z-select__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .z-select__btn--primary {
      color: #fff;
      background: var(--z-color-primary);
      border-color: var(--z-color-primary);
    }
    .z-select__btn--primary:hover:not(:disabled) {
      background: var(--z-color-primary-strong);
    }
`,A=`/* ===== z-select ===== */

:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  width: 100%;
  max-width: 320px;
  /* 占位符色的组件钩子。它原先只在页面层（\`page-view-block.css\`）定义，
     组件自己只有一句带 fallback 的引用 —— 组件库独立发布后，那个定义处不在了，
     使用者看到的就是 fallback 色。在这里给出自己的默认值，页面要覆写照样能覆写。 */
  --z-select-placeholder-color: var(--z-color-text-disabled);
}

/* ── Trigger ── */

.z-select__trigger {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  width: 100%;
  height: var(--_h, var(--z-input-height));
  padding: 0 var(--z-input-padding-x);
  font-family: var(--z-font-sans);
  font-size: var(--z-input-font-size);
  color: var(--z-color-text);
  background: var(--z-color-bg);
  border: var(--z-input-border-width) solid var(--z-color-border-control);
  border-radius: var(--z-input-radius);
  cursor: pointer;
  user-select: none;
  text-align: left;
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
}

.z-select__trigger:hover:not(:disabled) {
  border-color: var(--z-color-border-control-hover);
}

.z-select__trigger:focus-visible {
  outline: none;
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-select__trigger--open {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-select__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--z-color-bg-secondary);
}

/* ── Value ── */

.z-select__value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-select__placeholder {
  /* [WHY 留一个出口] 默认仍是 disabled 灰（表单里一行能靠 label 认出字段，占位只是提示）。
     但筛选栏的 bare 模式把字段名整个下沉到占位里，那里必须是可读的正文色，
     而占位在组件的 shadow 树内、外部选择器够不着 —— 只能由宿主设变量进来。 */
  color: var(--z-select-placeholder-color, var(--z-color-text-disabled));
}

/* ── 多选标签（方案 B） ── */

/* 标签把左内边距吃掉一点，否则第一个标签看起来像多缩进了一格 */
.z-select__trigger--multi {
  padding-left: var(--z-space-1);
}

.z-select__tags {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  /* 不换行：trigger 固定 36px 高，换行会把控件撑高、与旁边的输入框错位 */
  flex-wrap: nowrap;
}

.z-select__tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  /* [WHY flex:none] 允许压缩的结果是窄容器里每个标签各剩一个字（实测「原」「包」「耗」），
     比折叠更糟：用户既读不出内容，也看不出还有几项。宁可让超出的整块被容器裁掉。 */
  flex: none;
  padding: 1px 2px 1px 5px;
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg-secondary);
  color: var(--z-color-text);
  font-size: var(--z-font-size-xs);
  line-height: 1.5;
  white-space: nowrap;
}

.z-select__tag-label {
  /* inline 元素上 overflow / text-overflow 不生效，必须成为 flex item 才吃得住 */
  display: block;
  min-width: 0;
  max-width: 5.5em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.z-select__tag-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  border-radius: 2px;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  flex: none;
}

.z-select__tag-x:hover {
  background: var(--z-color-border);
  color: var(--z-color-text);
}

.z-select__tag--more {
  padding: 1px 5px;
  color: var(--z-color-text-secondary);
  cursor: default;
}

/* ── 整框清除 ── */

/* [WHY 加一条竖线] 多选时框里有两种叉：标签上的（去一项）和整框的（全清）。
   只靠大小/间距区分，在 168px 里三个叉挨在一起，点错就是把整个筛选清掉。
   一条 1px 分隔线是这里最便宜的消歧手段。 */
.z-select__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 12px;
  min-height: 16px;
  margin-left: 3px;
  padding-left: 6px;
  border-left: 1px solid var(--z-color-border-control);
  color: var(--z-color-text-secondary);
  cursor: pointer;
  flex: none;
}

.z-select__clear:hover {
  color: var(--z-color-text);
}

/* ── Chevron ── */

.z-select__chevron {
  display: flex;
  align-items: center;
  color: var(--z-color-text-secondary);
  transition: transform var(--z-transition-fast);
  flex-shrink: 0;
}

.z-select__chevron--open {
  transform: rotate(180deg);
}

/* Dropdown/option/empty styles are injected to document.head */
/* by injectDropdownStyles() since the dropdown lives in light DOM. */
`;var B=Object.defineProperty,d=(p,e,t,s)=>{for(var o=void 0,n=p.length-1,i;n>=0;n--)(i=p[n])&&(o=i(e,t,o)||o);return o&&B(e,t,o),o};const I=300;function q(){w("z-select",E)}const m="Select...";let F=0;const b=class b extends y{constructor(){super(...arguments),this.size="sm",this.value="",this.placeholder=m,this.disabled=!1,this.invalid=!1,this.open=!1,this.name="",this.searchable=!1,this.searchMode="frontend",this.searchPlaceholder="Search...",this.loading=!1,this.multiple=!1,this.clearable=!1,this.commitOnConfirm=!1,this.maxTags=2,this.remoteMethod=null,this._floating=new L(this),this._focusTrap=null,this._activeIndex=-1,this._query="",this._uid=`z-select-${++F}`,this._draft=null,this._searchTimer=null,this._optionsObserver=null,this._onTriggerClick=e=>{var o,n,i;if(this.disabled)return;const t=((o=e.composedPath)==null?void 0:o.call(e)[0])??e.target,s=(n=t==null?void 0:t.closest)==null?void 0:n.call(t,".z-select__tag-x");if(s){this._removeValue(s.getAttribute("data-value")??"");return}if((i=t==null?void 0:t.closest)!=null&&i.call(t,".z-select__clear")){this._clearValue();return}this.open?this._closeDropdown():this._openDropdown()},this._onTriggerKey=e=>{const t=e;if(t.key==="ArrowDown"||t.key==="ArrowUp")e.preventDefault(),this.open?this._floating.panel&&this._onDropdownKey(t):this._openDropdown();else if(t.key==="Enter"&&this.open)e.preventDefault(),this._onDropdownKey(t);else if(t.key==="Escape")e.stopPropagation(),this._closeDropdown();else if(t.key==="Delete"&&!this.open){if(this.multiple||!this.clearable||!this.value)return;e.preventDefault(),this._clearValue()}else if(t.key==="Backspace"&&this.multiple&&!this.open){const s=this._selectedValues();if(!s.length)return;e.preventDefault(),this._removeValue(s[s.length-1])}},this._onSearchInput=e=>{const t=e.target;this._query=t.value,this.searchMode==="backend"?this._scheduleRemoteSearch():this._renderOptionList()},this._onDropdownKey=e=>{const t=e,s=this._getFilteredOptions(),o=D(t.key);if(o){e.preventDefault();const n=S(s.length,this._activeIndex,o,{isDisabled:i=>s[i].disabled});n>=0&&(this._activeIndex=n,this._updateActive());return}switch(t.key){case"Enter":{e.preventDefault();const n=s[this._activeIndex];n&&!n.disabled&&this._selectOption(n.value);break}case"Escape":e.preventDefault(),e.stopPropagation(),this._closeDropdown();break;case"Tab":this._staging()||this._closeDropdown();break}}}willUpdate(){this.style.setProperty("--_h",k(this.size))}render(){var c;const e=this._getSelectedOption(),t=this._selectedValues(),s=((c=this._optionByValue(""))==null?void 0:c.label)??"",o=this.multiple?t.length>0:!!e,n=this.clearable&&o&&!this.disabled&&!this.multiple?`<span class="z-select__clear" part="clear" role="button" tabindex="-1" aria-label="${O.clear}"><svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>`:"",i=this.multiple?t.length?`<span class="z-select__tags" part="value">${this._renderTags(t)}</span>`:`<span class="z-select__value z-select__placeholder" part="value">${v(this._authoredPlaceholder()||s||this.placeholder)}</span>`:`<span class="z-select__value${e?"":" z-select__placeholder"}" part="value">${v(String(e?e.label:this.placeholder))}</span>`,r=!this.multiple&&e?` title="${h(String(e.label))}"`:"";return u`
      <button
        type="button"
        class="z-select__trigger ${this.open?"z-select__trigger--open":""}${this.multiple?" z-select__trigger--multi":""}"
        ${this.disabled?"disabled":""}
        aria-expanded="${this.open?"true":"false"}"
        aria-haspopup="listbox"
        ${this.invalid?'aria-invalid="true"':""}
        ${r}
        part="trigger"
        data-focus-key="trigger"
      >
        ${i}${n}
        <span class="z-select__chevron ${this.open?"z-select__chevron--open":""}" part="chevron" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </button>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("click",this._onTriggerClick),this.addEventListener("keydown",this._onTriggerKey)}disconnectedCallback(){this._closeDropdown(),this.removeEventListener("click",this._onTriggerClick),this.removeEventListener("keydown",this._onTriggerKey),super.disconnectedCallback()}updated(){this._floating.panel&&this._renderOptionList()}_getOptions(){return Array.from(this.querySelectorAll("z-option"))}_getSelectedOption(){if(this.value)return this._getOptions().find(e=>e.value===this.value&&!e.disabled)}_selectedValues(){return!this.multiple||!this.value?[]:this.value.split(",").map(e=>e.trim()).filter(Boolean)}_staging(){return this.multiple&&this.commitOnConfirm}_draftValues(){return this._draft??this._selectedValues()}_renderTags(e){const t=this.maxTags>0?this.maxTags:e.length,s=e.slice(0,t),o=e.length-s.length,n=s.map(i=>{var c;const r=((c=this._optionByValue(i))==null?void 0:c.label)??i;return`<span class="z-select__tag" title="${h(r)}"><span class="z-select__tag-label">${v(r)}</span><span class="z-select__tag-x" role="button" tabindex="-1" data-value="${h(i)}" aria-label="移除 ${h(r)}"><svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true"><path d="M1.6 1.6l4.8 4.8M6.4 1.6L1.6 6.4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></span></span>`});if(o>0){const i=e.slice(t).map(r=>{var c;return((c=this._optionByValue(r))==null?void 0:c.label)??r});n.push(`<span class="z-select__tag z-select__tag--more" title="${h(i.join("、"))}">+${o}</span>`)}return n.join("")}_optionByValue(e){return this._getOptions().find(t=>t.value===e)}_authoredPlaceholder(){return this.placeholder===m?"":this.placeholder}_getFilteredOptions(){const e=this._getOptions();if(!this.searchable||!this._query)return e;const t=this._query.toLowerCase();return e.filter(s=>s.label.toLowerCase().includes(t)||s.value.toLowerCase().includes(t))}_removeValue(e){const t=this._selectedValues().filter(s=>s!==e);t.length!==this._selectedValues().length&&(this.value=t.join(","),this._staging()&&(this._draft=t.slice()),this.open&&this._renderOptionList(),this.emit("z-change",{values:t.slice(),value:this.value}))}_clearValue(){this.value&&(this.value="",this._staging()&&(this._draft=[]),this.open&&this._renderOptionList(),this.emit("z-change",this.multiple?{values:[],value:""}:{value:""}))}_openDropdown(){var o,n,i;if(this.open)return;q(),this._query="",this._clearSearchTimer(),this.loading=!1;const e=this.shadowRoot.querySelector(".z-select__trigger"),t=this._floating.open({panelClass:"z-select__dropdown",hidingClass:"z-select__dropdown--hiding",part:"dropdown",role:null,tabIndex:!1,anchor:()=>this.shadowRoot.querySelector(".z-select__trigger"),onOutsideClose:()=>this._closeDropdown()},r=>{const c=this.searchable?u`<input type="text" class="z-select__search" part="search" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="${this._uid}-listbox" placeholder="${h(this.searchPlaceholder)}" aria-label="${h(this.searchPlaceholder)}" autocomplete="off" />`:"",_=this._staging()?'<div class="z-select__footer" part="footer"><span class="z-select__count" part="count"></span><span class="z-select__footer-actions"><button type="button" class="z-select__btn" data-act="reset">清空</button><button type="button" class="z-select__btn z-select__btn--primary" data-act="confirm">确定</button></span></div>':"",f=this._authoredPlaceholder()||this.placeholder,x=f?` aria-label="${h(f)}"`:"";r.innerHTML=`${c}<div class="z-select__options" role="listbox" id="${this._uid}-listbox" tabindex="-1"${x}></div>${_}`});t.addEventListener("click",r=>{const c=r.target.closest("[data-act]");if(c){c.dataset.act==="confirm"?this._commitDraft():c.dataset.act==="reset"&&this._resetDraft();return}const _=r.target.closest(".z-select__option");if(!_)return;const f=_.dataset.value;f!==void 0&&!_.classList.contains("z-select__option--disabled")&&this._selectOption(f)}),t.addEventListener("mouseover",r=>{const c=r.target.closest(".z-select__option");c&&this._setActiveByElement(c)}),(o=t.querySelector(".z-select__search"))==null||o.addEventListener("input",this._onSearchInput);const s=e.getBoundingClientRect();t.style.minWidth=`${this._staging()?Math.max(s.width,240):s.width}px`,this._focusTrap=new T({container:t}),this.open=!0,this._staging()&&(this._draft=this._selectedValues()),this._activeIndex=this._getOptions().findIndex(r=>r.value===this.value&&!r.disabled),this._renderOptionList(),this._floating.reposition(),this._observeOptions(),t.addEventListener("keydown",this._onDropdownKey),this.searchable||((i=(n=this._floating.panel)==null?void 0:n.querySelector(".z-select__options"))==null||i.focus(),this._updateActive()),this.emit("z-select-open")}_closeDropdown(){var t,s,o;if(!this.open)return;this._clearSearchTimer(),(t=this._optionsObserver)==null||t.disconnect(),this._optionsObserver=null,(s=this._focusTrap)==null||s.destroy(),this._focusTrap=null,(o=this._floating.panel)==null||o.removeEventListener("keydown",this._onDropdownKey),this._floating.close(),this.open=!1,this._activeIndex=-1,this._draft=null;const e=this.shadowRoot.querySelector(".z-select__trigger");e==null||e.focus(),this.emit("z-select-close")}_selectOption(e){if(this._staging()){const t=this._draft??this._selectedValues();if(e==="")t.length=0;else{const s=t.indexOf(e);s>=0?t.splice(s,1):t.push(e)}this._draft=t,this._renderOptionList();return}if(this.multiple){const t=e===""?[]:this._selectedValues();if(e!==""){const s=t.indexOf(e);s>=0?t.splice(s,1):t.push(e)}this.value=t.join(","),this._renderOptionList(),this.emit("z-change",{values:t.slice(),value:this.value});return}if(this.value===e){this._closeDropdown();return}this.value=e,this._closeDropdown(),this.emit("z-change",{value:e})}_commitDraft(){const e=(this._draft??[]).slice(),t=e.join(",")!==this.value;this._closeDropdown(),t&&(this.value=e.join(","),this.emit("z-change",{values:e.slice(),value:this.value}))}_resetDraft(){var e;(e=this._draft)!=null&&e.length&&(this._draft=[],this._renderOptionList())}_updateFooter(){const e=this._floating.panel;if(!e)return;const t=e.querySelector(".z-select__count");if(!t)return;const s=(this._draft??[]).length;t.textContent=s>0?`已选 ${s} 项`:"未选择";const o=e.querySelector('[data-act="reset"]');o&&(o.disabled=s===0)}_clearSearchTimer(){this._searchTimer!==null&&(window.clearTimeout(this._searchTimer),this._searchTimer=null)}_scheduleRemoteSearch(){this._clearSearchTimer(),this._searchTimer=window.setTimeout(()=>{this._searchTimer=null,this._runRemoteSearch()},I)}_runRemoteSearch(){const e=this._query,t=this.remoteMethod?this.remoteMethod(e):void 0;t&&typeof t.then=="function"&&(this.loading=!0,t.then(s=>{!this.open||this._query!==e||!Array.isArray(s)||this._applyRemoteOptions(s)}).catch(()=>{}).finally(()=>{this.open&&this._query===e&&(this.loading=!1)})),this.emit("z-search",{query:e})}_applyRemoteOptions(e){this._getOptions().forEach(t=>t.remove());for(const t of e){const s=document.createElement("z-option");s.value=t.value,s.textContent=t.label,t.disabled&&(s.disabled=!0),this.appendChild(s)}this._renderOptionList()}_observeOptions(){this._optionsObserver||(this._optionsObserver=new MutationObserver(()=>{this.open&&this._renderOptionList()}),this._optionsObserver.observe(this,{childList:!0}))}_renderOptionList(){if(!this._floating.panel)return;const e=this._floating.panel.querySelector(".z-select__options");if(!e)return;if(this.loading){e.innerHTML=u`<div class="z-select__loading" part="loading">Loading...</div>`,this._activeIndex=-1,this._updateFooter();return}const t=this._getFilteredOptions();if(e.innerHTML=this._buildOptionsHTML(t),this._updateFooter(),t.length===0){this._activeIndex=-1;return}(this._activeIndex<0||this._activeIndex>=t.length||t[this._activeIndex].disabled)&&(this._activeIndex=t.findIndex(s=>!s.disabled)),this._updateActive()}_buildOptionsHTML(e){if(e.length===0){const s=this.searchable&&this._query?"No results":"No options";return u`<div class="z-select__empty" part="empty">${s}</div>`}const t=this._draftValues();return e.map((s,o)=>{const n=this.multiple?t.includes(s.value):s.value===this.value,i=["z-select__option",n?"z-select__option--selected":"",this.multiple&&n?"z-select__option--multi":"",s.disabled?"z-select__option--disabled":"",o===this._activeIndex?"z-select__option--active":""].filter(Boolean).join(" "),r=this.multiple?u`<span class="z-select__box ${n?"z-select__box--on":""}" part="box">${n?'<svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>':""}</span>`:"";return u`<div class="${i}" id="${this._uid}-opt-${o}" data-value="${h(String(s.value))}" role="option" tabindex="-1" aria-selected="${n?"true":"false"}" aria-disabled="${s.disabled?"true":"false"}">
        ${r}
        ${v(String(s.label??""))}
        ${!this.multiple&&n?u`<span class="z-select__check" part="check"><svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg></span>`:""}
      </div>`}).join("")}_setActiveByElement(e){var o;const t=(o=this._floating.panel)==null?void 0:o.querySelectorAll(".z-select__option");if(!t)return;const s=Array.from(t).indexOf(e);s>=0&&(this._activeIndex=s,this._updateActive())}_focusOwner(){const e=this._floating.panel;return e?this.searchable?e.querySelector(".z-select__search"):e.querySelector(".z-select__options"):null}_updateActive(){if(!this._floating.panel)return;const e=this._floating.panel.querySelectorAll(".z-select__option");e.forEach((o,n)=>{o.classList.toggle("z-select__option--active",n===this._activeIndex)});const t=this._focusOwner(),s=e[this._activeIndex];t&&(s!=null&&s.id?t.setAttribute("aria-activedescendant",s.id):t.removeAttribute("aria-activedescendant")),s==null||s.scrollIntoView({block:"nearest"})}};b.styles=A;let a=b;d([l({type:String})],a.prototype,"size");d([l({type:String})],a.prototype,"value");d([l({type:String})],a.prototype,"placeholder");d([l({type:Boolean})],a.prototype,"disabled");d([l({type:Boolean})],a.prototype,"invalid");d([l({type:Boolean})],a.prototype,"open");d([l({type:String})],a.prototype,"name");d([l({type:Boolean})],a.prototype,"searchable");d([l({type:String,attribute:"search-mode"})],a.prototype,"searchMode");d([l({type:String,attribute:"search-placeholder"})],a.prototype,"searchPlaceholder");d([l({type:Boolean})],a.prototype,"loading");d([l({type:Boolean})],a.prototype,"multiple");d([l({type:Boolean})],a.prototype,"clearable");d([l({type:Boolean,attribute:"commit-on-confirm"})],a.prototype,"commitOnConfirm");d([l({type:Number,attribute:"max-tags"})],a.prototype,"maxTags");customElements.define("z-select",a);export{T as F};
