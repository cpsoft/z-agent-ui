import{B as H,e as s,a as z,h as l,p as e}from"./presets-CdaBrvJF.js";import{C as I}from"./copy-DoHMT7Ic.js";const F={xs:"var(--z-control-h-xs)",sm:"var(--z-input-height)",md:"var(--z-control-h)",lg:"var(--z-control-h-lg)"};function O(h){return F[h]??F.sm}const j=`/* ===== z-input ===== */

:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  width: 100%;
  max-width: 320px;
}

/* ── Label ── */

.z-input__label {
  display: block;
  margin-bottom: var(--z-input-label-gap);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  color: var(--z-color-text);
  user-select: none;
}

.z-input__required {
  color: var(--z-color-danger);
  margin-left: 2px;
}

/* ── Wrapper ── */

.z-input__wrapper {
  display: flex;
  align-items: center;
  gap: 0;
  /* [WHY box-sizing: border-box 是 B3b 修的一处真缺陷] 之前是默认的 content-box：
     \`height: var(--z-input-height)\` 写 28，实际渲染 **30** —— 多出来的是上下 1px 边框。
     而 select / pagination 是 border-box（28）。于是同一表单里并排放一个输入框和一个
     选择框，本来就差 2px，谁也没说得出为什么。box-sizing 在这里的意义是让
     「令牌值 = 实际盒高」这句话成立；视觉上输入框会矮 2px，那 2px 是收回了多算的边框。 */
  box-sizing: border-box;
  /* \`--_h\` 由组件按 size 写入（缺省值保住宿主对 --z-input-height 的覆写） */
  height: var(--_h, var(--z-input-height));
  border: var(--z-input-border-width) solid var(--z-color-border-control);
  border-radius: var(--z-input-radius);
  background-color: var(--z-color-bg);
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
  overflow: hidden;
}

.z-input__wrapper:hover:not(.z-input--disabled):not(.z-input--focused) {
  border-color: var(--z-color-border-control-hover);
}

.z-input--focused .z-input__wrapper {
  border-color: var(--z-color-primary);
  /* [WHY] 聚焦光环对齐主色 #2563eb（REQ-010） */
  box-shadow: var(--z-focus-ring);
}

.z-input--error .z-input__wrapper {
  border-color: var(--z-color-danger);
}

/* [WHY] z-form-item 校验钩子：只换边框色、不新增任何 DOM 行
   （error 行出现会撑高 host → blur 校验时按钮被推移 → click 丢失）。
   2026-11-15 起用 \`invalid\` 属性而不是 \`data-invalid\`：前者同时驱动
   字段上的 aria-invalid（读屏要知道「现在非法」），视觉与语义同源。
   见 FormItem.ts _setError 注释 */
:host([invalid]) .z-input__wrapper {
  border-color: var(--z-color-danger);
}

.z-input--error.z-input--focused .z-input__wrapper {
  box-shadow: var(--z-focus-ring-error);
}

.z-input--disabled .z-input__wrapper {
  opacity: 0.5;
  background-color: var(--z-color-bg-secondary);
  cursor: not-allowed;
}

.z-input--readonly .z-input__wrapper {
  background-color: var(--z-color-bg-secondary);
}

/* ── Prefix / Suffix ── */

.z-input__prefix,
.z-input__suffix {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 var(--z-input-padding-x);
  color: var(--z-color-text-secondary);
  font-size: var(--z-input-font-size);
  flex-shrink: 0;
}

.z-input__prefix:empty,
.z-input__suffix:empty {
  display: none;
}

.z-input__prefix {
  padding-right: 0;
}

.z-input__suffix {
  padding-left: 0;
}

/* ── Field ── */

.z-input__field {
  flex: 1;
  height: 100%;
  width: 100%;
  border: none;
  outline: none;
  padding: 0 var(--z-input-padding-x);
  font-family: var(--z-font-sans);
  font-size: var(--z-input-font-size);
  color: var(--z-color-text);
  background: transparent;
  line-height: var(--z-line-height);
}

.z-input__field::placeholder {
  color: var(--z-color-text-placeholder);
}

.z-input__field:disabled {
  cursor: not-allowed;
  color: var(--z-color-text-disabled);
}

/* textarea */
.z-input__field[style*="textarea"],
textarea.z-input__field {
  height: auto;
  min-height: 80px;
  padding-top: var(--z-input-padding-y);
  padding-bottom: var(--z-input-padding-y);
  resize: vertical;
}

/* ── Clear button ── */

.z-input__clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: var(--z-color-track);
  color: var(--z-color-text-secondary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transition: background var(--z-transition-fast);
}

.z-input__clear:hover {
  background: var(--z-color-track-strong);
  color: var(--z-color-text);
}

/* ── Hint / Error ── */

.z-input__hint,
.z-input__error {
  margin-top: var(--z-input-message-gap);
  font-family: var(--z-font-sans);
  font-size: var(--z-input-message-font-size);
  line-height: var(--z-line-height);
}

.z-input__hint {
  color: var(--z-color-text-secondary);
}

.z-input__error {
  color: var(--z-color-danger);
}
`;var A=Object.defineProperty,i=(h,t,o,p)=>{for(var a=void 0,r=h.length-1,u;r>=0;r--)(u=h[r])&&(a=u(t,o,a)||a);return a&&A(t,o,a),a};const g=class g extends H{constructor(){super(...arguments),this.type="text",this.value="",this.placeholder="",this.label="",this.error="",this.hint="",this.disabled=!1,this.readonly=!1,this.required=!1,this.clearable=!1,this.multiline=!1,this.pattern="",this.autocomplete="",this.min="",this.max="",this.step="",this.clearLabel=I.clearInput,this.size="sm",this.invalid=!1,this._focused=!1,this._onInput=()=>{const t=this._getField();t&&(this.__zui_prop_value=t.value,this._updateClearButton(),this.emit("z-input",{value:t.value}))},this._onChange=()=>{const t=this._getField();t&&(this.__zui_prop_value=t.value,this._updateClearButton(),this.emit("z-change",{value:t.value}))},this._onFocusIn=()=>{this._focused=!0;const t=this.shadowRoot.querySelector(".z-input__wrapper");t&&t.classList.add("z-input--focused"),this.emit("z-focus")},this._onFocusOut=()=>{this._focused=!1;const t=this.shadowRoot.querySelector(".z-input__wrapper");t&&t.classList.remove("z-input--focused"),this.emit("z-blur")},this._onClick=t=>{t.target.classList.contains("z-input__clear")&&this.clear()}}willUpdate(){this.style.setProperty("--_h",O(this.size))}render(){const{type:t,value:o,placeholder:p,label:a,error:r,hint:u,disabled:_,readonly:f,required:v,clearable:E,multiline:d,maxlength:b,minlength:y,pattern:m,autocomplete:x,min:w,max:$,step:C}=this,c=!!r,L=c||this.invalid,B=E&&((o==null?void 0:o.length)??0)>0&&!_&&!f,S=[u&&!c?"z-input-hint":"",c?"z-input-error":""].filter(Boolean),q=[this._focused?"z-input--focused":"",_?"z-input--disabled":"",c?"z-input--error":"",f?"z-input--readonly":""].filter(Boolean).join(" "),k=['id="z-input-field"',`type="${d?"":t}"`,`name="${s(this.getAttribute("name")??"")}"`,p?`placeholder="${s(p)}"`:"",_?"disabled":"",f?"readonly":"",v?"required":"",b!=null?`maxlength="${b}"`:"",y!=null?`minlength="${y}"`:"",!d&&w?`min="${s(w)}"`:"",!d&&$?`max="${s($)}"`:"",!d&&C?`step="${s(C)}"`:"",m?`pattern="${s(m)}"`:"",x?`autocomplete="${s(x)}"`:"",`aria-invalid="${L?"true":"false"}"`,S.length?`aria-describedby="${S.join(" ")}"`:""].filter(Boolean).join(" "),R=d?l`<textarea class="z-input__field" ${k} part="field">${z(o)}</textarea>`:l`<input class="z-input__field" ${k} value="${s(o)}" part="field" />`;return l`
      ${a?l`<label class="z-input__label" for="z-input-field" part="label">${z(a)}${v?l`<span class="z-input__required" aria-hidden="true">*</span>`:""}</label>`:""}
      <div class="z-input__wrapper ${q}" part="wrapper">
        <span class="z-input__prefix" part="prefix"><slot name="prefix"></slot></span>
        ${R}
        <span class="z-input__suffix" part="suffix">
          <slot name="suffix"></slot>
          ${B?l`<button type="button" class="z-input__clear" part="clear" tabindex="-1" aria-label="${s(this.clearLabel)}">&times;</button>`:""}
        </span>
      </div>
      ${u&&!c?l`<span class="z-input__hint" id="z-input-hint" part="hint">${z(u)}</span>`:""}
      ${r?l`<span class="z-input__error" id="z-input-error" part="error">${z(r)}</span>`:""}
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("focusout",this._onFocusOut),this.shadowRoot.addEventListener("input",this._onInput),this.shadowRoot.addEventListener("change",this._onChange),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("focusout",this._onFocusOut),this.shadowRoot.removeEventListener("input",this._onInput),this.shadowRoot.removeEventListener("change",this._onChange),this.shadowRoot.removeEventListener("click",this._onClick)}firstUpdated(){this._syncFieldValue()}updated(){this._syncFieldValue()}focus(){var t;(t=this._getField())==null||t.focus()}blur(){var t;(t=this._getField())==null||t.blur()}select(){var t;(t=this._getField())==null||t.select()}clear(){this.value="",this.emit("z-input",{value:""}),this.emit("z-change",{value:""})}_getField(){return this.shadowRoot.querySelector(".z-input__field")}_syncFieldValue(){const t=this._getField();t&&t.value!==this.value&&(t.value=this.value)}_updateClearButton(){var a;const t=this.shadowRoot.querySelector(".z-input__suffix");if(!t)return;const o=t.querySelector(".z-input__clear"),p=this.clearable&&(((a=this.value)==null?void 0:a.length)??0)>0&&!this.disabled&&!this.readonly;if(p&&!o){const r=document.createElement("button");r.type="button",r.className="z-input__clear",r.setAttribute("part","clear"),r.tabIndex=-1,r.setAttribute("aria-label",this.clearLabel),r.textContent="×",t.appendChild(r)}else!p&&o&&o.remove()}};g.styles=j;let n=g;i([e({type:String})],n.prototype,"type");i([e({type:String})],n.prototype,"value");i([e({type:String})],n.prototype,"placeholder");i([e({type:String})],n.prototype,"label");i([e({type:String})],n.prototype,"error");i([e({type:String})],n.prototype,"hint");i([e({type:Boolean})],n.prototype,"disabled");i([e({type:Boolean})],n.prototype,"readonly");i([e({type:Boolean})],n.prototype,"required");i([e({type:Boolean})],n.prototype,"clearable");i([e({type:Boolean})],n.prototype,"multiline");i([e({type:Number})],n.prototype,"maxlength");i([e({type:Number})],n.prototype,"minlength");i([e({type:String})],n.prototype,"pattern");i([e({type:String})],n.prototype,"autocomplete");i([e({type:String})],n.prototype,"min");i([e({type:String})],n.prototype,"max");i([e({type:String})],n.prototype,"step");i([e({type:String})],n.prototype,"clearLabel");i([e({type:String})],n.prototype,"size");i([e({type:Boolean})],n.prototype,"invalid");customElements.define("z-input",n);export{O as c};
