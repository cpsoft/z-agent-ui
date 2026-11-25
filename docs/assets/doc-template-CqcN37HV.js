import{B as at,e as i,h as w,p as d}from"./presets-CdaBrvJF.js";/* empty css             */import{t as Pt}from"./a11y-DJ6wHu5s.js";import"./Button-6M0Me5pu.js";import{c as Nt}from"./Input-wCelPXsT.js";import{C as B}from"./copy-DoHMT7Ic.js";import{x as Dt}from"./marked.esm-CfNX39EO.js";import{m as Mt}from"./shell-DwQ7nMfw.js";const jt=`/* ===== z-search-bar ===== */
/* 桌面搜索框：外壳沿用 z-input 的边框/圆角/焦点光晕口径，密度走 --_h（由 size 写入）。 */
:host {
  display: inline-block;
  vertical-align: middle;
}

.z-sb {
  display: flex;
  align-items: center;
  gap: 6px;
  /* [WHY border-box] 与 z-input 同一条：content-box 下同名高度会比其他控件胖 2px，
     并排放进工具栏就对不齐（input.css 里是 2026 修过的同一个坑）。 */
  box-sizing: border-box;
  height: var(--_h, var(--z-input-height));
  padding: 0 var(--z-input-padding-x);
  border: var(--z-input-border-width) solid var(--z-color-border-control);
  border-radius: var(--z-input-radius);
  background-color: var(--z-color-bg);
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
}

.z-sb:hover:not(.z-sb--disabled):not(:focus-within) {
  border-color: var(--z-color-border-control-hover);
}

/* 焦点在里面的 input 上，光晕要画在外壳上 —— 这是「组合控件」与单输入框唯一的外壳差异 */
.z-sb:focus-within {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-sb--disabled {
  background-color: var(--z-color-bg-secondary);
  cursor: not-allowed;
}

.z-sb__icon {
  display: inline-flex;
  flex: none;
  color: var(--z-color-text-secondary);
}

.z-sb--disabled .z-sb__icon {
  color: var(--z-color-text-disabled);
}

.z-sb__input {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-sb__input::placeholder {
  color: var(--z-color-text-placeholder);
}

.z-sb__input:disabled {
  cursor: not-allowed;
  color: var(--z-color-text-disabled);
}

/* 原生 type=search 的取消按钮与自绘的清空按钮会并排出现两个，关掉原生的 */
.z-sb__input::-webkit-search-cancel-button,
.z-sb__input::-webkit-search-decoration {
  -webkit-appearance: none;
  appearance: none;
}

.z-sb__clear {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  border-radius: var(--z-radius-full);
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  transition: color var(--z-transition-fast);
}

.z-sb__clear[hidden] {
  display: none;
}

.z-sb__clear:hover {
  color: var(--z-color-text);
}

.z-sb__clear:focus-visible {
  outline: none;
  box-shadow: var(--z-focus-ring);
}
`;var Kt=Object.defineProperty,M=(n,t,e,o)=>{for(var a=void 0,r=n.length-1,l;r>=0;r--)(l=n[r])&&(a=l(t,e,a)||a);return a&&Kt(t,e,a),a};const yt=class yt extends at{constructor(){super(...arguments),this.value="",this.placeholder="搜索",this.debounce=200,this.disabled=!1,this.clearable=!0,this.size="sm",this.label="",this.clearLabel=B.clearInput,this._timer=null,this._onInput=t=>{const e=t.target;if(this._syncClear(e.value),this._clearTimer(),this.debounce<=0){this.emit("z-input",{value:e.value});return}this._timer=setTimeout(()=>{this._timer=null,this.emit("z-input",{value:e.value})},this.debounce)},this._onKeyDown=t=>{const e=t;if(e.key==="Escape"){this._clear();return}e.key==="Enter"&&(e.preventDefault(),this._flush(!0))},this._onClick=t=>{const e=t.target.closest("[data-act]");(e==null?void 0:e.dataset.act)==="clear"&&this._clear()}}willUpdate(){this.style.setProperty("--_h",Nt(this.size))}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("input",this._onInput),this.shadowRoot.addEventListener("keydown",this._onKeyDown),this.shadowRoot.addEventListener("click",this._onClick)}disconnectedCallback(){this._clearTimer(),this.shadowRoot.removeEventListener("input",this._onInput),this.shadowRoot.removeEventListener("keydown",this._onKeyDown),this.shadowRoot.removeEventListener("click",this._onClick),super.disconnectedCallback()}updated(){const t=this._inputOf();t&&(document.activeElement!==t&&t.value!==this.value&&(t.value=this.value),this._syncClear(t.value))}focus(t){var e;(e=this._inputOf())==null||e.focus(t)}_inputOf(){return this.shadowRoot.querySelector("input")}_syncClear(t){const e=this.shadowRoot.querySelector(".z-sb__clear");e&&(e.hidden=!this.clearable||t.length===0||this.disabled)}_clearTimer(){this._timer&&(clearTimeout(this._timer),this._timer=null)}_flush(t){var o;const e=((o=this._inputOf())==null?void 0:o.value)??"";this._clearTimer(),this.emit("z-input",{value:e}),t&&this.emit("z-search",{value:e})}_clear(){var e;this._clearTimer(),this.value="";const t=this._inputOf();t&&(t.value=""),this._syncClear(""),this.emit("z-clear"),this.emit("z-input",{value:""}),(e=this._inputOf())==null||e.focus()}render(){const t=this.label||this.placeholder;return w`
      <div class="z-sb${this.disabled?" z-sb--disabled":""}" part="root">
        <span class="z-sb__icon" part="icon" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" />
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </span>
        <input
          class="z-sb__input"
          part="input"
          type="search"
          enterkeyhint="search"
          autocomplete="off"
          value="${i(this.value)}"
          placeholder="${i(this.placeholder)}"
          aria-label="${i(t)}"
          ${this.disabled?"disabled":""}
        />
        <button
          class="z-sb__clear"
          part="clear"
          type="button"
          data-act="clear"
          aria-label="${i(this.clearLabel)}"
          hidden
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6" fill="currentColor" />
            <path d="M4.8 4.8L9.2 9.2M9.2 4.8L4.8 9.2" stroke="var(--z-color-bg)" stroke-width="1.4" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    `}};yt.styles=jt;let F=yt;M([d({type:String})],F.prototype,"value");M([d({type:String})],F.prototype,"placeholder");M([d({type:Number})],F.prototype,"debounce");M([d({type:Boolean})],F.prototype,"disabled");M([d({type:Boolean})],F.prototype,"clearable");M([d({type:String})],F.prototype,"size");M([d({type:String})],F.prototype,"label");M([d({type:String})],F.prototype,"clearLabel");customElements.define("z-search-bar",F);const qt=794,Wt=1123;function D(n){return Math.round(n*96/25.4)}const P={bodyFont:'"PingFang SC", "Microsoft YaHei", SimSun, serif',headingFont:'"PingFang SC", "Microsoft YaHei", SimHei, sans-serif',bodyFontSize:"小四",headingFontSize:"三号",lineHeight:1.8,paragraphSpacing:0,firstLineIndent:"2ch",marginTop:20,marginBottom:20,marginLeft:18,marginRight:18,headerText:"",footerText:""},et={初号:42,小初:36,一号:26,小一:24,二号:22,小二:18,三号:16,小三:15,四号:14,小四:12,五号:10.5,小五:9,六号:7.5,小六:6.5},Ct=Object.keys(et);function tt(n,t=""){if(!n)return t;const e=n.trim();if(!e)return t;if(et[e]!==void 0)return`${et[e]}pt`;if(/^[\d.]+(pt|px|em|rem|%|ch)$/i.test(e))return e;const o=Number(e);return!Number.isNaN(o)&&o>0?`${o/2}pt`:e}function Ut(n,t="2ch"){if(!n)return t;const e=n.trim();if(!e)return t;if(/[\d.]+(pt|px|em|rem|ch)$/i.test(e))return e;const o=Number(e);return!Number.isNaN(o)&&o>0?`${o}pt`:e}function G(n){const t=et[n.headingFontSize]??(Number.parseFloat(tt(n.headingFontSize,"16pt"))||16);return[`--z-doc-body-font:${n.bodyFont}`,`--z-doc-heading-font:${n.headingFont}`,`--z-doc-body-size:${tt(n.bodyFontSize,"12pt")}`,`--z-doc-heading-size:${tt(n.headingFontSize,"16pt")}`,`--z-doc-heading-size-1:${t}pt`,`--z-doc-heading-size-2:${t-1}pt`,`--z-doc-heading-size-3:${t-2}pt`,`--z-doc-heading-size-4:${t-3}pt`,`--z-doc-line-height:${n.lineHeight}`,`--z-doc-para-spacing:${n.paragraphSpacing}pt`,`--z-doc-indent:${Ut(n.firstLineIndent)}`,`--z-doc-margin-top:${D(n.marginTop)}px`,`--z-doc-margin-bottom:${D(n.marginBottom)}px`,`--z-doc-margin-left:${D(n.marginLeft)}px`,`--z-doc-margin-right:${D(n.marginRight)}px`].join(";")}function rt(n){if(!n)return{...P};try{const t=JSON.parse(n);return{...P,...t}}catch{return{...P}}}function V(n){return n==null?"":String(n)}const ut=/\{\{\s*([\w.-]+)\s*\}\}/g,Yt=/data-placeholder\s*=\s*"([^"]+)"/g,Jt=/<(\w+)([^>]*\sdata-placeholder\s*=\s*"([^"]+)"[^>]*)>[\s\S]*?<\/\1>/g;function j(n,t,e=!1){return n?n.replace(ut,(a,r)=>Object.prototype.hasOwnProperty.call(t,r)&&t[r]!=null?V(t[r]):e?`{{${r}}}`:"").replace(Jt,(a,r,l,s)=>Object.prototype.hasOwnProperty.call(t,s)&&t[s]!=null?V(t[s]):e?a:""):""}function Zt(n,t=""){var a,r,l;const e=[],o=s=>{if(s){for(const c of s.matchAll(ut))e.includes(c[1])||e.push(c[1]);for(const c of s.matchAll(Yt))e.includes(c[1])||e.push(c[1])}};if(n)for(const s of n)o(s.text),o(s.left),o(s.right),(a=s.items)==null||a.forEach(o),s.dataKey&&!e.includes(s.dataKey)&&e.push(s.dataKey),(r=s.columns)==null||r.forEach(c=>o(c.label)),(l=s.rows)==null||l.forEach(c=>c.forEach(o));return o(t),e}function Gt(n){if(!n||typeof n!="object")return!1;const t=n.type;return t==="heading"||t==="paragraph"||t==="table"||t==="list"||t==="signature"}function gt(n){if(!n)return null;const t=n.trim();if(!t.startsWith("[")&&!t.startsWith("{"))return null;try{const e=JSON.parse(t),o=Array.isArray(e)?e:e==null?void 0:e.blocks;if(!Array.isArray(o))return null;const a=o.filter(Gt);return a.length?a:null}catch{return null}}function Xt(n){const t=gt(n);if(t)return{kind:"blocks",blocks:t,body:n};const e=(n??"").trim();return/<([a-z][\w-]*)(\s[^>]*)?>[\s\S]*<\/\1>/i.test(e)||/<(br|hr|img|table|input)\b[^>]*\/?>/i.test(e)?{kind:"html",blocks:null,body:n}:{kind:"markdown",blocks:null,body:n}}function Vt(n){return n?` style="text-align:${n}"`:""}function J(n){const t=[];return n.fontFamily&&t.push(`font-family:${n.fontFamily}`),n.fontSize&&t.push(`font-size:${tt(n.fontSize,"")}`),n.color&&t.push(`color:${n.color}`),n.bold&&t.push("font-weight:700"),n.align&&t.push(`text-align:${n.align}`),t.length?` style="${t.join(";")}"`:""}function Et(n){if(!n.some(e=>e.width))return"";const t=n.reduce((e,o)=>e+(typeof o.width=="number"&&o.width>0?o.width:0),0);return`<colgroup>${n.map(e=>typeof e.width=="number"&&e.width>0&&t>0?`<col style="width:${(e.width/t*100).toFixed(2)}%" />`:"<col />").join("")}</colgroup>`}function pt(n,t){return n.replace(ut,(e,o)=>{const a=t==null?void 0:t(o),r=a?i(a):`{{${o}}}`;return`<span class="z-doc-ph" data-ph="${o}" contenteditable="false">${r}</span>`})}function Qt(n,t){const e=n.columns??[];let o=[];if(n.dataKey){const s=t[n.dataKey];if(typeof s=="string")return j(s,t);Array.isArray(s)&&(o=s.map(c=>{if(Array.isArray(c))return c.map(g=>V(g));const p=c;return e.map(g=>V(p[g.key]))}))}else o=n.rows??[];let a=e;if(a.length===0){if(o.length===0)return"";const s=Math.max(...o.map(c=>c.length));a=Array.from({length:s},(c,p)=>({key:String(p),label:""}))}const r=`<thead><tr>${a.map(s=>`<th>${j(i(s.label),t)}</th>`).join("")}</tr></thead>`,l=o.map(s=>`<tr>${a.map((c,p)=>`<td>${j(V(s[p]),t)}</td>`).join("")}</tr>`).join("");return`<table class="z-doc-table"${Vt(n.align)}>${Et(a)}${r}<tbody>${l}</tbody></table>`}function te(n,t){const e=n.columns??[],o=n.rows??[];if(e.length===0)return"";const a=`<thead><tr>${e.map(l=>`<th>${pt(i(l.label)||i(l.key),t)}</th>`).join("")}</tr></thead>`,r=o.map((l,s)=>`<tr>${e.map((c,p)=>`<td data-row="${s}" data-col="${p}">${pt(i(l[p]??""),t)}</td>`).join("")}</tr>`).join("");return`<table class="z-doc-table z-doc-table--editable">${Et(e)}${a}<tbody>${r}</tbody></table>`}function Lt(n,t,e){const o=t===null,a=t??{},r=l=>o?pt(j(i(l),a,!0),e):j(i(l),a,!1);switch(n.type){case"heading":{const l=n.level??1,s=r(n.text??"");return`<h${l} class="z-doc-heading z-doc-heading--${l}"${J(n)}>${s}</h${l}>`}case"paragraph":{const l=n.text??"";if(o)return`<p class="z-doc-para"${J(n)}>${r(l)}</p>`;const s=l.trim().match(/^\{\{\s*([\w.-]+)\s*\}\}$/);if(s){const p=a[s[1]];if(typeof p=="string"&&/<table[\s>]/i.test(p))return p}const c=r(l);return`<p class="z-doc-para"${J(n)}>${c||"&nbsp;"}</p>`}case"list":{const l=(n.items??[]).map(c=>`<li>${r(c)}</li>`).join("");if(!l)return"";const s=n.ordered?"ol":"ul";return`<${s} class="z-doc-list"${J(n)}>${l}</${s}>`}case"table":return o?te(n,e):Qt(n,a);case"signature":return`<div class="z-doc-signature"${J(n)}><span>${r(n.left??"")}</span><span>${r(n.right??"")}</span></div>`;default:return""}}function lt(n,t={}){const e=Xt(n);if(e.kind==="blocks")return(e.blocks??[]).map(o=>Lt(o,t)).join("");if(e.kind==="markdown"){const o=Dt.parse(e.body,{async:!1});return j(o,t,!1)}return j(e.body,t,!1)}function wt(){return`b${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`}function W(n){return n.replace(/<span class="z-doc-ph"[^>]*data-ph="([^"]+)"[^>]*>[\s\S]*?<\/span>/g,"{{$1}}").replace(/<br\s*\/?>/gi,"").trim()}const ee=`/* ===== z-doc-template-manager: 模板列表 ===== */

:host {
  display: block;
}

.z-dtm {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-3);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-dtm__toolbar,
.z-dtm__footer {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
}

.z-dtm__spacer {
  flex: 1;
}

.z-dtm__title {
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-semibold);
}

/* [WHY 搜索框不再参与这条规则] 它现在是 z-search-bar，边框/高度/焦点光晕由组件自己
   按统一口径画；这里再写一遍就是两层边框叠出来的双线。只留宽度对齐工具栏。 */
.z-dtm__select {
  height: var(--z-input-height);
  padding: var(--z-input-padding-y) var(--z-input-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-input-font-size);
  outline: none;
}

.z-dtm__search {
  width: 200px;
}

.z-dtm__select:focus {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

/* ── 按钮 ───────────────────────────────────────────── */
.z-dtm__btn {
  height: var(--z-input-height);
  padding: var(--z-button-padding-y) var(--z-button-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-button-radius);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-button-font-size);
  font-weight: var(--z-button-font-weight);
  cursor: pointer;
  transition: var(--z-button-transition);
}

.z-dtm__btn:hover {
  border-color: var(--z-color-border-hover);
  background: var(--z-color-bg-secondary);
}

.z-dtm__btn--primary {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

.z-dtm__btn--primary:hover {
  background: var(--z-color-primary-solid-hover);
  border-color: var(--z-color-primary-solid-hover);
}

.z-dtm__btn--danger {
  color: var(--z-color-danger);
  border-color: color-mix(in srgb, var(--z-color-danger) 40%, transparent);
}

.z-dtm__btn--danger:hover {
  background: var(--z-color-danger-solid);
  border-color: var(--z-color-danger-solid);
  color: var(--z-color-danger-text);
}

/* ── 表格 ───────────────────────────────────────────── */
.z-dtm__list {
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  overflow: auto;
}

.z-dtm__table {
  width: 100%;
  border-collapse: collapse;
}

.z-dtm__table th {
  padding: var(--z-space-2) var(--z-space-3);
  text-align: left;
  font-weight: var(--z-font-weight-semibold);
  color: var(--z-color-text-secondary);
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-bg-secondary);
  white-space: nowrap;
}

.z-dtm__th--ops {
  text-align: right;
}

.z-dtm__row:hover {
  background: var(--z-color-bg-secondary);
}

.z-dtm__row--active {
  background: color-mix(in srgb, var(--z-color-primary) 8%, transparent);
}

.z-dtm__cell {
  padding: var(--z-space-2) var(--z-space-3);
  border-bottom: 1px solid var(--z-color-border);
  vertical-align: middle;
}

.z-dtm__cell--desc {
  color: var(--z-color-text-secondary);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-dtm__cell--time {
  color: var(--z-color-text-secondary);
  white-space: nowrap;
}

.z-dtm__cell--ops {
  text-align: right;
  white-space: nowrap;
}

.z-dtm__cell--ops .z-dtm__btn {
  margin-left: var(--z-space-1);
}

.z-dtm__name {
  font-weight: var(--z-font-weight-medium);
}

.z-dtm__badge {
  display: inline-block;
  margin-left: var(--z-space-2);
  padding: 1px 6px;
  border-radius: var(--z-radius-sm);
  background: color-mix(in srgb, var(--z-color-primary) 12%, transparent);
  color: var(--z-color-primary);
  font-size: var(--z-font-size-xs);
  line-height: 16px;
}

.z-dtm__state {
  padding: var(--z-space-8);
  text-align: center;
  color: var(--z-color-text-secondary);
}

.z-dtm__error {
  padding: var(--z-space-2) var(--z-space-3);
  border: 1px solid color-mix(in srgb, var(--z-color-danger) 40%, transparent);
  border-radius: var(--z-radius-md);
  background: var(--z-color-danger-soft);
  color: var(--z-color-danger-strong);
}

/* ── 分页 ───────────────────────────────────────────── */
.z-dtm__total {
  color: var(--z-color-text-secondary);
}

.z-dtm__page {
  min-width: 28px;
  height: var(--z-input-height);
  padding: 0 var(--z-space-2);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-font-size-sm);
  cursor: pointer;
  transition: var(--z-transition-fast);
}

.z-dtm__page:hover:not(:disabled) {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.z-dtm__page--active {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

.z-dtm__page:disabled {
  color: var(--z-color-text-disabled);
  cursor: not-allowed;
}`;var ne=Object.defineProperty,y=(n,t,e,o)=>{for(var a=void 0,r=n.length-1,l;r>=0;r--)(l=n[r])&&(a=l(t,e,a)||a);return a&&ne(t,e,a),a};const vt=class vt extends at{constructor(){super(...arguments),this.dataSource=null,this.pageSize=10,this.category="",this.categories=[],this.selectedId="",this.titleText="文档模板",this.searchPlaceholder="搜索模板名称",this.newText="新建模板",this.allCategoryText="全部分类",this.nameLabel="模板名称",this.categoryLabel="分类",this.descriptionLabel="描述",this.updatedLabel="更新时间",this.defaultText="默认",this.actionsLabel="操作",this.editText="编辑",this.deleteText="删除",this.emptyText="暂无模板",this.loadingText=B.loading,this.totalText="共 {total} 条",this.prevText=B.prevPage,this.nextText=B.nextPage,this.confirmDeleteText="确定删除该模板？",this._items=[],this._total=0,this._page=1,this._keyword="",this._loading=!1,this._error="",this._eventsBound=!1,this._dataSourcePrimed=!1,this._onClick=t=>{const e=t.target,o=e.closest("[data-page]");if(o&&!o.hasAttribute("disabled")){const c=Number(o.dataset.page);c>=1&&c<=this._pageCount&&this.refresh(c);return}const a=e.closest("[data-action]");if(!a)return;const r=a.dataset.action,l=a.dataset.id??"",s=this._items.find(c=>c.id===l);if(r==="create")this.emit("z-create",{category:this.category||void 0});else if(r==="edit"&&s)this.selectedId=s.id,this.emit("z-edit",{template:s}),this.requestUpdate();else if(r==="delete"&&s){if(typeof window<"u"&&window.confirm&&!window.confirm(this.confirmDeleteText))return;this.removeTemplate(l)}},this._onChange=t=>{const e=t.target;e.classList.contains("z-dtm__select")&&(this.category=e.value,this.refresh(1))},this._onInput=t=>{t.target.tagName==="Z-SEARCH-BAR"&&(this._keyword=t.detail.value,this.refresh(1))}}connectedCallback(){super.connectedCallback(),this.dataSource&&(this._dataSourcePrimed=!0,this.refresh())}updated(){this._bindEvents(),!this._dataSourcePrimed&&this.dataSource&&(this._dataSourcePrimed=!0,this.refresh(1))}async refresh(t=this._page){const e=this.dataSource;if(e){this._page=t,this._loading=!0,this._error="",this.requestUpdate();try{const o={page:this._page,size:this.pageSize,keyword:this._keyword||void 0,category:this.category||void 0},a=await e.list(o);this._items=a.data??[],this._total=a.total??0,this.emit("z-refresh",{total:this._total,page:this._page})}catch(o){this._error=o instanceof Error?o.message:String(o),this.emit("z-error",{error:o})}finally{this._loading=!1,this.requestUpdate()}}}async removeTemplate(t){const e=this.dataSource;if(e)try{await e.remove(t),this.selectedId===t&&(this.selectedId=""),await this.refresh()}catch(o){this._error=o instanceof Error?o.message:String(o),this.emit("z-error",{error:o}),this.requestUpdate()}}get _pageCount(){return Math.max(1,Math.ceil(this._total/this.pageSize))}render(){const t=this._items.map(a=>{const r=a.id===this.selectedId?" z-dtm__row--active":"";return w`
          <tr class="z-dtm__row${r}" data-id="${i(a.id)}" part="row">
            <td class="z-dtm__cell z-dtm__cell--name">
              <span class="z-dtm__name">${i(a.name)}</span>
              ${a.isDefault?`<span class="z-dtm__badge" part="default-badge">${i(this.defaultText)}</span>`:""}
            </td>
            <td class="z-dtm__cell">${i(a.category??"")}</td>
            <td class="z-dtm__cell z-dtm__cell--desc">${i(a.description??"")}</td>
            <td class="z-dtm__cell z-dtm__cell--time">${i(a.updatedAt??"")}</td>
            <td class="z-dtm__cell z-dtm__cell--ops">
              <button type="button" class="z-dtm__btn" data-action="edit" data-id="${i(a.id)}">${i(this.editText)}</button>
              <button type="button" class="z-dtm__btn z-dtm__btn--danger" data-action="delete" data-id="${i(a.id)}">${i(this.deleteText)}</button>
            </td>
          </tr>`}).join(""),e=this._loading?`<div class="z-dtm__state">${i(this.loadingText)}</div>`:this._items.length===0?`<div class="z-dtm__state">${i(this.emptyText)}</div>`:w`
          <table class="z-dtm__table" part="table">
            <thead>
              <tr>
                <th>${i(this.nameLabel)}</th>
                <th>${i(this.categoryLabel)}</th>
                <th>${i(this.descriptionLabel)}</th>
                <th>${i(this.updatedLabel)}</th>
                <th class="z-dtm__th--ops">${i(this.actionsLabel)}</th>
              </tr>
            </thead>
            <tbody>${t}</tbody>
          </table>`,o=Array.from({length:this._pageCount},(a,r)=>r+1).map(a=>`<button type="button" class="z-dtm__page${a===this._page?" z-dtm__page--active":""}" data-page="${a}">${a}</button>`).join("");return w`
      <div class="z-dtm" part="root">
        <div class="z-dtm__toolbar" part="toolbar">
          <span class="z-dtm__title">${i(this.titleText)}</span>
          <!-- [WHY 换成 z-search-bar] 原来是原生 input + 这里手写 250ms 防抖 + 手写 aria，
               与 m-search 的契约（防抖 / z-input / z-search / z-clear）是两份实现。
               组件自带清空按钮与 Esc 清空，本文件不再持有定时器。 -->
          <z-search-bar class="z-dtm__search" part="search"
                        placeholder="${i(this.searchPlaceholder)}"
                        value="${i(this._keyword)}"
                        debounce="250"></z-search-bar>
          ${this.categories.length?w`<select class="z-dtm__select" part="category-filter" aria-label="${i(this.categoryLabel)}">
                <option value=""${this.category?"":" selected"}>${i(this.allCategoryText)}</option>
                ${this.categories.map(a=>`<option value="${i(a)}"${a===this.category?" selected":""}>${i(a)}</option>`).join("")}
              </select>`:""}
          <span class="z-dtm__spacer"></span>
          <button type="button" class="z-dtm__btn z-dtm__btn--primary" data-action="create" part="create-button">
            ${i(this.newText)}
          </button>
        </div>

        ${this._error?`<div class="z-dtm__error" part="error">${i(this._error)}</div>`:""}
        <div class="z-dtm__list" part="list">${e}</div>

        <div class="z-dtm__footer" part="footer">
          <span class="z-dtm__total">${i(this.totalText.replace("{total}",String(this._total)))}</span>
          <span class="z-dtm__spacer"></span>
          <button type="button" class="z-dtm__page" data-page="${this._page-1}"${this._page<=1?" disabled":""}>
            ${i(this.prevText)}
          </button>
          ${o}
          <button type="button" class="z-dtm__page" data-page="${this._page+1}"${this._page>=this._pageCount?" disabled":""}>
            ${i(this.nextText)}
          </button>
        </div>
      </div>`}_bindEvents(){if(this._eventsBound)return;const t=this.shadowRoot;t&&(t.addEventListener("click",this._onClick),t.addEventListener("change",this._onChange),t.addEventListener("z-input",this._onInput),this._eventsBound=!0)}};vt.styles=ee;let b=vt;y([d({type:Object,attribute:!1})],b.prototype,"dataSource");y([d({type:Number})],b.prototype,"pageSize");y([d({type:String})],b.prototype,"category");y([d({type:Array,attribute:!1})],b.prototype,"categories");y([d({type:String})],b.prototype,"selectedId");y([d({type:String})],b.prototype,"titleText");y([d({type:String})],b.prototype,"searchPlaceholder");y([d({type:String})],b.prototype,"newText");y([d({type:String})],b.prototype,"allCategoryText");y([d({type:String})],b.prototype,"nameLabel");y([d({type:String})],b.prototype,"categoryLabel");y([d({type:String})],b.prototype,"descriptionLabel");y([d({type:String})],b.prototype,"updatedLabel");y([d({type:String})],b.prototype,"defaultText");y([d({type:String})],b.prototype,"actionsLabel");y([d({type:String})],b.prototype,"editText");y([d({type:String})],b.prototype,"deleteText");y([d({type:String})],b.prototype,"emptyText");y([d({type:String})],b.prototype,"loadingText");y([d({type:String})],b.prototype,"totalText");y([d({type:String})],b.prototype,"prevText");y([d({type:String})],b.prototype,"nextText");y([d({type:String})],b.prototype,"confirmDeleteText");customElements.define("z-doc-template-manager",b);function mt(n){return Math.min(2,Math.max(.5,n||1))}function dt(n,t,e){if(!n||!t)return;const o=mt(e);if(o===1){n.style.transform="",n.style.height="";return}n.style.transform=`scale(${o})`,!(t.offsetHeight<=0)&&(n.style.height=`${Math.ceil(t.offsetHeight*o)}px`)}function ht(n,t){n.setAttribute("style",G(t))}function It(n){var a,r;const t=((a=n.headerText)==null?void 0:a.trim())??"",e=((r=n.footerText)==null?void 0:r.trim())??"",o=document.createElement("div");return o.className="z-dte__page z-doc-paper z-doc-paper--sized z-doc-paper--hf",o.setAttribute("part","page"),o.innerHTML=(t?`<div class="z-doc-page-head">${i(t)}</div>`:"")+'<div class="z-doc-page-body"></div>'+(e?`<div class="z-doc-page-foot">${i(e)}</div>`:""),o}function kt(n,t){if(!n)return;const e=Array.from(n.querySelectorAll(".z-dte__block"));if(e.length===0)return;const o=e[0].closest(".z-dte__page");if(!o||o.clientHeight<=0)return;const a=getComputedStyle(o),r=o.clientHeight-(Number.parseFloat(a.paddingTop)||0)-(Number.parseFloat(a.paddingBottom)||0),l=T=>{const k=o.querySelector(T);if(!k)return 0;const A=getComputedStyle(k);return k.offsetHeight+(Number.parseFloat(A.marginTop)||0)+(Number.parseFloat(A.marginBottom)||0)},s=r-l(".z-doc-page-head")-l(".z-doc-page-foot")-2;if(s<60)return;const c=e.map(T=>T.offsetHeight),p=[[]],g=new Set;let m=0;for(let T=0;T<e.length;T++){const k=c[T];if(k>s){p[p.length-1].length>0&&(p.push([]),m=0),g.add(p.length-1),p[p.length-1].push(T),p.push([]),m=0;continue}m>0&&m+k>s&&(p.push([]),m=0),p[p.length-1].push(T),m+=k}for(;p.length>1&&p[p.length-1].length===0;)p.pop();const f=Array.from(n.querySelectorAll(":scope > .z-dte__page"));if(f.length===p.length&&e.every((T,k)=>{const A=p.findIndex(K=>K.includes(k));return f.indexOf(T.closest(".z-dte__page"))===A})){f.forEach((T,k)=>T.classList.toggle("z-dte__page--tall",g.has(k)));return}const L=oe(n),R=document.createDocumentFragment();p.forEach((T,k)=>{const A=It(t);g.has(k)&&A.classList.add("z-dte__page--tall");const K=A.querySelector(".z-doc-page-body");for(const U of T)K.appendChild(e[U]);R.appendChild(A)}),n.replaceChildren(R),ae(n,L)}function oe(n){const t=document.getSelection();if(!t||t.rangeCount===0)return null;const e=t.getRangeAt(0),o=e.startContainer,a=o.nodeType===1?o:o.parentElement,r=a==null?void 0:a.closest("[data-block-id]");if(!r||!n.contains(r))return null;const l=p=>{var g;return p.nodeType===3?p.length:((g=p.textContent)==null?void 0:g.length)??0};let s=0;const c=p=>{if(p===o)return p.nodeType===3?s+=e.startOffset:Array.from(p.childNodes).slice(0,e.startOffset).forEach(g=>s+=l(g)),!0;for(const g of Array.from(p.childNodes))if(c(g))return!0;return s+=l(p),!1};return c(r),{blockId:r.dataset.blockId,offset:s}}function ae(n,t){if(!t||!n)return;const e=n.querySelector(`[data-block-id="${CSS.escape(t.blockId)}"]`);if(!e)return;let o=t.offset,a=null;const r=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);for(let c=r.nextNode();c;c=r.nextNode()){const p=c.length;if(o<=p){a={node:c,offset:o};break}o-=p}const l=document.getSelection();if(!l)return;const s=document.createRange();a?s.setStart(a.node,a.offset):(s.selectNodeContents(e),s.collapse(!1)),s.collapse(!0),l.removeAllRanges(),l.addRange(s)}function At(n,t){var l;const e=n.filter(s=>s.type==="table"),o=e.find(s=>s.key===t),a=(l=o==null?void 0:o.fields)!=null&&l.length?o.fields:e.flatMap(s=>s.fields??[]),r=[];for(const s of a)r.some(c=>c.key===s.key)||r.push(s);return r}function re(n,t,e){const o=e.closest("[data-block-id]");if(!o)return;const a=n.find(l=>l.id===o.dataset.blockId);if(!a)return;if(e.dataset.editable==="text"){a.text=W(e.innerHTML);return}if(e.tagName==="LI"){const l=Array.from(o.querySelectorAll("li")).map(s=>W(s.innerHTML));a.items=l;return}if(e.tagName==="TH"){const l=t.closest("th");if(!l||!a.columns)return;const s=Array.from(o.querySelectorAll("th")).indexOf(l);if(s<0||!a.columns[s])return;a.columns[s].label=W(l.innerHTML);return}if(e.tagName==="TD"){const l=t.closest("td");if(!l)return;const s=Number(l.dataset.row),c=Number(l.dataset.col);for(a.rows=a.rows??[];a.rows.length<=s;)a.rows.push([]);a.rows[s]||(a.rows[s]=[]),a.rows[s][c]=W(l.innerHTML);return}const r=Array.from(o.querySelectorAll(".z-doc-signature > span"));r.length===2&&(a.left=W(r[0].innerHTML),a.right=W(r[1].innerHTML))}function ie(n,t,e){const o=e.type==="number"?Number(e.value):e.value,r=typeof n[t]=="number"?Number(o):o;return{...n,[t]:r}}function se(n,t,e){var l;const o=t.dataset.table;if(!o)return!1;const a=Number(t.dataset.col),r=Number.isInteger(a)?(l=n.columns)==null?void 0:l[a]:void 0;if(o==="dataKey")n.dataKey=t.value.trim()||void 0;else if(o==="columnKey"&&r){const s=r.key;r.key=t.value||r.key;const c=At(e,n.dataKey).find(p=>p.key===r.key);c&&(!r.label||r.label===s)&&(r.label=c.label)}else if(o==="columnLabel"&&r)r.label=t.value;else if(o==="columnWidth"&&r){const s=Number(t.value);r.width=s>0?s:void 0}else return!1;return!0}function le(n,t,e){n[t]=e.type==="checkbox"?e.checked:e.value||void 0}const X=`/* ===== z-doc-template: 纸张 / 文档版式（编辑器画布 + 预览 + 打印三端共用） ===== */
/* [WHY] 文档一律黑字白纸，不跟随应用暗色主题：预览/打印/导出三端观感一致（issue IKICYW 验收 3）
   排版配置经 --z-doc-* 自定义属性下发（formatConfigToStyle），此处只消费不定义 */

:host {
  display: block;
}

/* ── A4 纸张 ─────────────────────────────────────────── */
/* [WHY] 几何以整数 px 锁定（A4@96dpi = 794×1123，见 types.ts PAPER_*_PX）：
   mm 是分数 px（793.7），浏览器缩放下亚像素取整抖动 → 折行漂移、排版随缩放改变。
   页边距经 --z-doc-margin-* 下发（formatConfigToStyle，px 整数），默认 76/76/68/68px
   （= 20/20/18/18mm） */
.z-doc-paper {
  width: 794px;
  min-height: 1123px;
  box-sizing: border-box;
  padding: var(--z-doc-margin-top, 76px) var(--z-doc-margin-right, 68px) var(--z-doc-margin-bottom, 76px)
    var(--z-doc-margin-left, 68px);
  background: #ffffff;
  color: #000000;
  border: 1px solid var(--z-color-border);
  border-radius: 2px;
  box-shadow: var(--z-shadow-md);
  overflow: hidden;
}

.z-doc-paper--sized {
  min-height: 0;
  /* [WHY] 完整 A4 高度：内容容量 = 1123px - 页边距(padding)，与分页器页容量
     (innerH = 1123 - 上下边距) 严格一致。旧版 height 里再减上下边距，在 border-box
     下等于边距扣两次，每页底部超填被 overflow:hidden 裁掉
     （2026-09-25 线上实撞「内容被 A4 底边截断且无第二页」） */
  height: 1123px;
  overflow: hidden;
}

/* [WHY] 带页眉/页脚的纸张：三段纵向布局，正文区弹性占满（页眉页脚不入分页流） */
.z-doc-paper--hf {
  display: flex;
  flex-direction: column;
}

.z-doc-page-head,
.z-doc-page-foot {
  flex: 0 0 auto;
  font-size: 9pt;
  line-height: 1.4;
  color: #333333;
  text-align: center;
}

.z-doc-page-head {
  padding-bottom: 8px;
  border-bottom: 1px solid #999999;
  margin-bottom: 19px;
}

.z-doc-page-foot {
  padding-top: 8px;
  border-top: 1px solid #999999;
  margin-top: 19px;
}

.z-doc-page-body {
  flex: 1 0 auto;
}

.z-doc-body {
  font-family: var(--z-doc-body-font, "PingFang SC", "Microsoft YaHei", serif);
  font-size: var(--z-doc-body-size, 12pt);
  line-height: var(--z-doc-line-height, 1.8);
  color: #000000;
}

/* ── 块 ─────────────────────────────────────────────── */
.z-doc-heading {
  font-family: var(--z-doc-heading-font, "PingFang SC", "Microsoft YaHei", sans-serif);
  font-weight: 700;
  margin: 0 0 calc(var(--z-doc-para-spacing, 0pt) + 6pt);
  line-height: 1.4;
}

.z-doc-heading--1 { font-size: var(--z-doc-heading-size-1, 16pt); text-align: center; }
.z-doc-heading--2 { font-size: var(--z-doc-heading-size-2, 15pt); }
.z-doc-heading--3 { font-size: var(--z-doc-heading-size-3, 14pt); }
.z-doc-heading--4 { font-size: var(--z-doc-heading-size-4, 13pt); }

.z-doc-para {
  margin: 0 0 var(--z-doc-para-spacing, 0pt);
  text-indent: var(--z-doc-indent, 2ch);
  text-align: justify;
  white-space: pre-wrap;
  word-break: break-word;
}

.z-doc-list {
  margin: 0 0 var(--z-doc-para-spacing, 0pt);
  padding-left: 2.5em;
}

.z-doc-list li {
  margin: 0;
}

/* ── 表格 ───────────────────────────────────────────── */
.z-doc-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  margin: 0 0 calc(var(--z-doc-para-spacing, 0pt) + 4pt);
  font-size: inherit;
}

/* [WHY] 占位符整块注入的外来表格（如 product_table）可能带超宽内联样式, 兜底不溢出纸张 */
.z-doc-body table {
  max-width: 100%;
}

.z-doc-table th,
.z-doc-table td {
  border: 1px solid #000000;
  padding: 4pt 6pt;
  text-align: left;
  vertical-align: top;
  word-break: break-word;
}

.z-doc-table th {
  font-weight: 600;
  text-align: center;
  background: #f1f5f9;
}

/* ── 签名区（右对齐块） ───────────────────────────────── */
.z-doc-signature {
  display: flex;
  justify-content: flex-end;
  gap: 48pt;
  margin-top: calc(var(--z-doc-para-spacing, 0pt) + 24pt);
  text-align: right;
}

/* ── 编辑器态 ───────────────────────────────────────── */
.z-doc-ph {
  display: inline-block;
  padding: 0 3px;
  border: 1px dashed var(--z-color-primary);
  border-radius: 3px;
  background: color-mix(in srgb, var(--z-color-primary) 12%, transparent);
  color: var(--z-color-primary);
  font-size: 0.92em;
  cursor: pointer;
  user-select: none;
  /* [WHY] 芯片是 inline-block 块容器, text-indent 为继承属性：段落的首行缩进
     (--z-doc-indent, 默认 2ch) 会在芯片内部再缩进一次, 视觉上文字靠右、左侧留空
     （2026-09-25 实撞）。首行缩进是段落行盒的语义, 不属于芯片, 就地重置为 0 */
  text-indent: 0;
}

.z-doc-table--editable td {
  cursor: text;
}

/* ── 打印 ───────────────────────────────────────────── */
@media print {
  :host {
    display: block;
  }
}`,de=`/* ===== z-doc-template-editor: 块编辑器（左画布 + 右面板） ===== */

:host {
  display: block;
}

.z-dte {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-3);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

/* ── 工具栏 ─────────────────────────────────────────── */
.z-dte__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--z-space-2);
  padding: var(--z-space-2) var(--z-space-3);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
}

.z-dte__btn {
  height: var(--z-input-height);
  padding: var(--z-button-padding-y) var(--z-button-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-button-radius);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-button-font-size);
  cursor: pointer;
  transition: var(--z-transition-fast);
}

.z-dte__btn:hover:not(:disabled) {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.z-dte__btn:disabled {
  color: var(--z-color-text-disabled);
  cursor: not-allowed;
}

.z-dte__zoom-pct {
  min-width: 56px;
}

.z-dte__sep {
  width: 1px;
  height: 18px;
  background: var(--z-color-border);
}

.z-dte__multi {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--z-color-text-secondary);
  cursor: pointer;
}

/* ── 主体布局 ───────────────────────────────────────── */
.z-dte__main {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--z-space-3);
  align-items: start;
}

@media (max-width: 900px) {
  .z-dte__main {
    grid-template-columns: 1fr;
  }
}

.z-dte__canvas-wrap {
  display: flex;
  /* [WHY] 纸张 794px 固定宽, 窄容器时靠横向滚动而非压缩纸张：画布不再 width:100%
     随容器伸缩（随容器变宽=排版重排, 2026-09-26 实撞「随页面缩放改变排版」）。
     margin auto 居中：比 justify-content:center 安全（后者在溢出时左端不可滚达） */
  justify-content: flex-start;
  overflow-x: auto;
  padding: var(--z-space-4);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
  /* [WHY] 不设 max-height 内滚（2026-09-25 线上实撞）：70vh + overflow:auto 把
     纸张在视口 70% 处剪断, macOS 浮层滚动条平时不可见 → 用户看到的是「内容被
     A4 底边截断且无第二页」而非可滚动区域。编辑器画布随内容自然长高,
     整页滚动；分页是预览 tab 的职责, 编辑视图只保证内容全可见 */
}

/* [WHY] 缩放包装层：transform 等比挂此层, 不污染容器/纸张内联样式 */
.z-dte__scale {
  margin: 0 auto;
  transform-origin: top center;
  flex: 0 0 auto;
}

/* [WHY] 逐页独立 A4 纸张容器（Word 式多页, 2026-09-26 用户需求）：每页 = 完整
   .z-doc-paper（794×1123px + 页边距 padding + 每页页眉页脚）, 容器只负责纵向堆叠
   与页间距。CSS 变量（页边距/字体）挂容器经继承到达每页纸张 */
.z-dte__canvas {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 794px;
}

.z-dte__page {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column; /* 页眉/正文/页脚三段（.z-doc-paper--hf 同款, 兜底） */
}

/* [WHY] 单块高过整页（超长表格）：Word 做文本级跨页切分, 块模型无法拆,
   退化为该页增高容纳（不裁内容）; 其余页保持精确 A4 高 */
.z-dte__page--tall {
  height: auto !important;
  min-height: 1123px;
}

.z-dte__empty {
  padding: 48px 0;
  text-align: center;
  color: var(--z-color-text-disabled);
}

/* ── 块 ────────────────────────────────────────────── */
.z-dte__block {
  position: relative;
  padding: 2px 4px 2px 28px;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
}

.z-dte__block:hover {
  border-color: var(--z-color-border);
}

.z-dte__block--selected {
  border-color: var(--z-color-primary);
  background: color-mix(in srgb, var(--z-color-primary) 4%, transparent);
}

.z-dte__block--picked {
  background: color-mix(in srgb, var(--z-color-primary) 8%, transparent);
}

.z-dte__handle {
  position: absolute;
  top: 2px;
  left: 2px;
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  transition: opacity var(--z-transition-fast);
}

.z-dte__block:hover .z-dte__handle,
.z-dte__block--selected .z-dte__handle {
  opacity: 1;
}

.z-dte__idx {
  min-width: 14px;
  text-align: center;
  font-size: 10px;
  color: var(--z-color-text-disabled);
}

.z-dte__mini {
  width: 16px;
  height: 16px;
  padding: 0;
  border: 1px solid var(--z-color-border);
  border-radius: 3px;
  background: var(--z-color-bg);
  color: var(--z-color-text-secondary);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
}

.z-dte__mini:hover {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.z-dte__mini--danger:hover {
  border-color: var(--z-color-danger);
  color: var(--z-color-danger);
}

.z-dte__body {
  outline: none;
}

.z-dte__body [contenteditable="true"] {
  outline: none;
  min-width: 8px;
}

.z-dte__body [contenteditable="true"]:focus {
  background: color-mix(in srgb, var(--z-color-primary) 6%, transparent);
}

/* ── 右侧面板 ───────────────────────────────────────── */
.z-dte__aside {
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  overflow: hidden;
}

.z-dte__tabs {
  display: flex;
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-bg-secondary);
}

.z-dte__tab {
  flex: 1;
  padding: var(--z-space-2) 0;
  border: none;
  background: transparent;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  cursor: pointer;
}

.z-dte__tab--active {
  color: var(--z-color-primary);
  font-weight: var(--z-font-weight-medium);
  box-shadow: inset 0 -2px 0 var(--z-color-primary);
}

.z-dte__panel {
  padding: var(--z-space-3);
  max-height: 62vh;
  overflow: auto;
}

.z-dte__group {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-2);
}

.z-dte__group-name {
  color: var(--z-color-text-secondary);
  font-weight: var(--z-font-weight-semibold);
  text-transform: uppercase;
  font-size: var(--z-font-size-xs);
}

.z-dte__sub {
  margin-top: var(--z-space-2);
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
}

/* 表格配置面板：列定义行（字段下拉 / 表头 / 列宽 / 删列）与行操作 */
.z-dte__cols {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-1);
}

.z-dte__col-row {
  display: grid;
  grid-template-columns: 1fr 1fr 56px 20px;
  align-items: center;
  gap: var(--z-space-1);
}

.z-dte__col-row select,
.z-dte__col-row input {
  height: var(--z-input-height);
  min-width: 0;
  padding: var(--z-input-padding-y) var(--z-input-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-input-font-size);
  outline: none;
}

.z-dte__col-row select:focus,
.z-dte__col-row input:focus {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-dte__col-row .z-dte__mini {
  width: 20px;
  height: 20px;
}

.z-dte__row-ops {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  flex-wrap: wrap;
}

.z-dte__field {
  display: grid;
  grid-template-columns: 88px 1fr;
  align-items: center;
  gap: var(--z-space-2);
}

.z-dte__field > span {
  color: var(--z-color-text-secondary);
}

/* 页边距四联输入（上/下/左/右） */
.z-dte__margin-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--z-space-1);
}

.z-dte__field input[type="text"],
.z-dte__field input[type="number"],
.z-dte__field select {
  height: var(--z-input-height);
  padding: var(--z-input-padding-y) var(--z-input-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-input-font-size);
  outline: none;
  min-width: 0;
}

.z-dte__field input[type="color"] {
  width: 40px;
  height: var(--z-input-height);
  padding: 0;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg);
}

.z-dte__field input:focus,
.z-dte__field select:focus {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-dte__hint {
  padding: var(--z-space-3) 0;
  text-align: center;
  color: var(--z-color-text-secondary);
}

/* ── 占位符面板 ─────────────────────────────────────── */
.z-dte__ph-list {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-2);
}

.z-dte__ph {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  padding: var(--z-space-2);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  cursor: grab;
}

.z-dte__ph:hover {
  border-color: var(--z-color-primary);
}

.z-dte__ph-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.z-dte__ph-key {
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-xs);
  color: var(--z-color-primary);
}

.z-dte__ph-label {
  color: var(--z-color-text);
}

.z-dte__ph-sample {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}`;function Z(n,t,e){return`<button type="button" class="z-dte__btn" data-op="${t}"${n?" disabled":""}>${i(e)}</button>`}function ct(n,t,e){return`<button type="button" class="z-dte__tab${n===t?" z-dte__tab--active":""}" data-tab="${t}">${i(e)}</button>`}function ce(n,t){return w`
      <div class="z-dte" part="root">
        <div class="z-dte__toolbar" part="toolbar">
          ${Z(t.readonly,"add-heading",n.addHeadingText)}
          ${Z(t.readonly,"add-paragraph",n.addParagraphText)}
          ${Z(t.readonly,"add-table",n.addTableText)}
          ${Z(t.readonly,"add-list",n.addListText)}
          ${Z(t.readonly,"add-signature",n.addSignatureText)}
          <span class="z-dte__sep"></span>
          <label class="z-dte__multi">
            <input type="checkbox" class="z-dte__multi-cb" part="multi-select"${t.multi?" checked":""} />
            ${i(n.multiSelectText)}
          </label>
          <span class="z-dte__sep"></span>
          <button type="button" class="z-dte__btn" data-op="zoom-out" title="${i(n.zoomOutText)}" aria-label="${i(n.zoomOutText)}">−</button>
          <button type="button" class="z-dte__btn z-dte__zoom-pct" data-op="zoom-reset" title="${i(n.zoomResetText)}" aria-label="${i(n.zoomResetText)}">${Math.round(mt(t.zoom)*100)}%</button>
          <button type="button" class="z-dte__btn" data-op="zoom-in" title="${i(n.zoomInText)}" aria-label="${i(n.zoomInText)}">＋</button>
        </div>
        <div class="z-dte__main">
          <div class="z-dte__canvas-wrap" part="canvas-wrap">
            <!-- [WHY] 画布由 firstUpdated 一次性创建（不进渲染循环）, 见文件头注释：
                若把持久节点写进 render 输出, 每次重渲染都会多出一个新节点（旧节点被
                重新挂回 → 重复累积）, z-rich-text 同款约束 -->
          </div>
          <aside class="z-dte__aside" part="aside">
            <div class="z-dte__tabs" part="panel-tabs">
              ${ct(t.panel,"props",n.propertiesTabText)}
              ${ct(t.panel,"placeholders",n.placeholdersTabText)}
              ${ct(t.panel,"typography",n.typographyTabText)}
            </div>
            <div class="z-dte__panel" part="panel">${he(n,t)}</div>
          </aside>
        </div>
      </div>`}function pe(n,t,e,o){const a=t.pickedIds.has(e.id),l=["z-dte__block",e.id===t.selectedId?"z-dte__block--selected":"",a?"z-dte__block--picked":""].filter(Boolean).join(" "),s=t.readonly?"":' contenteditable="true"',c=Lt(e,null,t.labelOf),p=e.type==="paragraph"||e.type==="heading"?c.replace(/^<(h\d|p)([^>]*)>/,`<$1$2 data-editable="text"${s}>`):c.replace(/<li>/g,`<li${s} data-editable="list-item">`).replace(/<span>/g,`<span${s} data-editable="signature">`).replace(/<th>/g,`<th${s} data-editable="th">`).replace(/<td /g,`<td${s} data-editable="td" `);return w`
      <div class="${l}" data-block-id="${i(e.id)}" draggable="${t.readonly?"false":"true"}" part="block">
        <div class="z-dte__handle" part="block-handle">
          ${t.multi?`<input type="checkbox" class="z-dte__pick" data-op="pick"${a?" checked":""} />`:""}
          <span class="z-dte__idx">${o+1}</span>
          <button type="button" class="z-dte__mini" data-op="up" title="${i(n.moveUpText)}" aria-label="${i(n.moveUpText)}">↑</button>
          <button type="button" class="z-dte__mini" data-op="down" title="${i(n.moveDownText)}" aria-label="${i(n.moveDownText)}">↓</button>
          <button type="button" class="z-dte__mini z-dte__mini--danger" data-op="remove" title="${i(n.removeText)}" aria-label="${i(n.removeText)}">✕</button>
        </div>
        <div class="z-dte__body" part="block-body">${p}</div>
      </div>`}function he(n,t){return t.panel==="placeholders"?me(n,t):t.panel==="typography"?fe(n,t):ue(n,t)}function ue(n,t){const e=t.blocks.find(l=>l.id===t.selectedId);if(!e)return'<div class="z-dte__hint">—</div>';const o=e.align??"",a=[`<option value=""${e.fontSize?"":" selected"}>—</option>`].concat(Ct.map(l=>`<option value="${l}"${e.fontSize===l?" selected":""}>${l}</option>`)).join("");let r="";return(e.type==="paragraph"||e.type==="heading")&&(r=w`
        <label class="z-dte__field">
          <span>${i(n.fontFamilyText)}</span>
          <input type="text" data-prop="fontFamily" value="${i(e.fontFamily??"")}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.indentText)}</span>
          <input type="checkbox" data-prop="indent"${e.indent?" checked":""} />
        </label>`),e.type==="table"&&(r+=ge(n,t,e)),w`
      <div class="z-dte__group">
        <div class="z-dte__group-name">${i(e.type)}</div>
        <label class="z-dte__field">
          <span>${i(n.alignText)}</span>
          <select data-prop="align">
            <option value=""${o===""?" selected":""}>—</option>
            <option value="left"${o==="left"?" selected":""}>${i(n.alignLeftText)}</option>
            <option value="center"${o==="center"?" selected":""}>${i(n.alignCenterText)}</option>
            <option value="right"${o==="right"?" selected":""}>${i(n.alignRightText)}</option>
          </select>
        </label>
        <label class="z-dte__field">
          <span>${i(n.fontSizeText)}</span>
          <select data-prop="fontSize">${a}</select>
        </label>
        <label class="z-dte__field">
          <span>${i(n.colorText)}</span>
          <input type="color" data-prop="color" value="${i(e.color||"#000000")}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.boldText)}</span>
          <input type="checkbox" data-prop="bold"${e.bold?" checked":""} />
        </label>
        ${r}
      </div>`}function ge(n,t,e){var p;const o=e.columns??[],a=t.placeholders.filter(g=>g.type==="table"),r=At(t.placeholders,e.dataKey),l=g=>{const m=r.some($=>$.key===g);return(g&&!m?`<option value="${i(g)}" selected>${i(g)} · ${i(n.undefinedFieldText)}</option>`:`<option value=""${g?"":" selected"}>—</option>`)+r.map($=>`<option value="${i($.key)}"${$.key===g?" selected":""}>${i($.label||$.key)}</option>`).join("")},s=o.map((g,m)=>w`
          <div class="z-dte__col-row">
            <select data-table="columnKey" data-col="${m}" title="${i(n.columnKeyText)}">${l(g.key)}</select>
            <input
              type="text"
              data-table="columnLabel"
              data-col="${m}"
              value="${i(g.label)}"
              title="${i(n.columnLabelText)}"
            />
            <input
              type="number"
              min="10"
              data-table="columnWidth"
              data-col="${m}"
              value="${g.width??""}"
              title="${i(n.columnWidthText)}"
            />
            <button
              type="button"
              class="z-dte__mini z-dte__mini--danger"
              data-op="remove-column"
              data-col="${m}"
              title="${i(n.removeColumnText)}"
              aria-label="${i(n.removeColumnText)}"
              ${t.readonly?"disabled":""}
            >✕</button>
          </div>`).join(""),c=e.dataKey?"":w`
          <div class="z-dte__sub">${i(n.staticRowText)} · ${((p=e.rows)==null?void 0:p.length)??0}</div>
          <div class="z-dte__row-ops">
            <button type="button" class="z-dte__btn" data-op="add-row" ${t.readonly?"disabled":""}>
              ${i(n.addRowText)}
            </button>
            <button type="button" class="z-dte__btn" data-op="remove-row" ${t.readonly?"disabled":""}>
              ${i(n.removeRowText)}
            </button>
          </div>`;return w`
      <div class="z-dte__sub">${i(n.tableConfigText)}</div>
      <label class="z-dte__field">
        <span>${i(n.dataKeyText)}</span>
        <input
          type="text"
          data-table="dataKey"
          list="z-dte-table-keys"
          value="${i(e.dataKey??"")}"
          placeholder="${i(n.dataKeyHintText)}"
        />
      </label>
      <datalist id="z-dte-table-keys">
        ${a.map(g=>`<option value="${i(g.key)}">${i(g.label)}</option>`).join("")}
      </datalist>
      <div class="z-dte__cols">${s}</div>
      <div class="z-dte__row-ops">
        <button type="button" class="z-dte__btn" data-op="add-column" ${t.readonly?"disabled":""}>
          ${i(n.addColumnText)}
        </button>
      </div>
      ${r.length===0?`<div class="z-dte__sub">${i(n.noTableFieldText)}</div>`:""}
      ${c}`}function me(n,t){return t.placeholders.length===0?`<div class="z-dte__hint">${i(n.noPlaceholderText)}</div>`:`<div class="z-dte__ph-list">${t.placeholders.map(e=>w`
          <div class="z-dte__ph" draggable="true" data-ph-key="${i(e.key)}" part="placeholder-item">
            <div class="z-dte__ph-info">
              <span class="z-dte__ph-key">{{${i(e.key)}}}</span>
              <span class="z-dte__ph-label">${i(e.label)}</span>
              ${e.sample?`<span class="z-dte__ph-sample">${i(e.sample)}</span>`:""}
            </div>
            <button type="button" class="z-dte__btn" data-op="insert-ph" data-key="${i(e.key)}"${t.readonly?" disabled":""}>
              ${i(n.insertText)}
            </button>
          </div>`).join("")}</div>`}function fe(n,t){const e=t.cfg,o=r=>[`<option value=""${r?"":" selected"}>—</option>`].concat(Ct.map(l=>`<option value="${l}"${r===l?" selected":""}>${l}</option>`)).join(""),a=[1,1.5,1.8,2].map(r=>`<option value="${r}"${e.lineHeight===r?" selected":""}>${r.toFixed(1)}</option>`).join("");return w`
      <div class="z-dte__group">
        <label class="z-dte__field">
          <span>${i(n.bodyFontText)}</span>
          <input type="text" data-cfg="bodyFont" value="${i(e.bodyFont)}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.headingFontText)}</span>
          <input type="text" data-cfg="headingFont" value="${i(e.headingFont)}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.bodySizeText)}</span>
          <select data-cfg="bodyFontSize">${o(e.bodyFontSize)}</select>
        </label>
        <label class="z-dte__field">
          <span>${i(n.headingSizeText)}</span>
          <select data-cfg="headingFontSize">${o(e.headingFontSize)}</select>
        </label>
        <label class="z-dte__field">
          <span>${i(n.lineHeightText)}</span>
          <select data-cfg="lineHeight">${a}</select>
        </label>
        <label class="z-dte__field">
          <span>${i(n.paraSpacingText)}</span>
          <input type="number" min="0" step="1" data-cfg="paragraphSpacing" value="${e.paragraphSpacing}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.firstIndentText)}</span>
          <input type="text" data-cfg="firstLineIndent" value="${i(e.firstLineIndent)}" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.pageMarginText)}</span>
          <span class="z-dte__margin-row">
            <input type="number" min="0" max="60" step="1" data-cfg="marginTop" value="${e.marginTop??20}" title="上" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginBottom" value="${e.marginBottom??20}" title="下" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginLeft" value="${e.marginLeft??18}" title="左" />
            <input type="number" min="0" max="60" step="1" data-cfg="marginRight" value="${e.marginRight??18}" title="右" />
          </span>
        </label>
        <label class="z-dte__field">
          <span>${i(n.headerTextText)}</span>
          <input type="text" data-cfg="headerText" value="${i(e.headerText??"")}" placeholder="每页顶部, 留空不显示" />
        </label>
        <label class="z-dte__field">
          <span>${i(n.footerTextText)}</span>
          <input type="text" data-cfg="footerText" value="${i(e.footerText??"")}" placeholder="每页底部, 留空不显示" />
        </label>
      </div>`}var be=Object.defineProperty,u=(n,t,e,o)=>{for(var a=void 0,r=n.length-1,l;r>=0;r--)(l=n[r])&&(a=l(t,e,a)||a);return a&&be(t,e,a),a};const xt=class xt extends at{constructor(){super(...arguments),this.content="",this.formatConfig="",this.placeholders=[],this.readonly=!1,this.zoom=1,this.addHeadingText="标题",this.addParagraphText="段落",this.addTableText="表格",this.addListText="列表",this.addSignatureText="签名区",this.moveUpText="上移",this.moveDownText="下移",this.removeText="删除",this.multiSelectText="多选",this.propertiesTabText="属性",this.placeholdersTabText="占位符",this.typographyTabText="排版",this.insertText="插入",this.noPlaceholderText="宿主未注入占位符定义",this.emptyText="点击上方按钮添加区块",this.alignText="对齐",this.alignLeftText="左",this.alignCenterText="中",this.alignRightText="右",this.fontFamilyText="字体",this.fontSizeText="字号",this.colorText="颜色",this.boldText="加粗",this.indentText="首行缩进",this.removeIndentText="取消缩进",this.zoomOutText=B.zoomOut,this.zoomInText=B.zoomIn,this.zoomResetText=B.zoomReset,this.columnWidthText="列宽 (pt)",this.tableConfigText="表格配置",this.dataKeyText="数据键 (dataKey)",this.dataKeyHintText="留空 = 静态表格（手填行数据）",this.columnKeyText="字段",this.columnLabelText="表头",this.addColumnText="加列",this.removeColumnText="删列",this.undefinedFieldText="未定义",this.noTableFieldText="宿主未注入 table 类型占位符定义",this.staticRowText="静态行",this.addRowText="加行",this.removeRowText="删末行",this.bodyFontText="正文字体",this.headingFontText="标题字体",this.bodySizeText="正文字号",this.headingSizeText="标题字号",this.lineHeightText="行距",this.paraSpacingText="段间距 (pt)",this.firstIndentText="首行缩进 (2ch / 24pt)",this.pageMarginText="页边距 (mm)",this.headerTextText="页眉",this.footerTextText="页脚",this.pageBreakText="第 {page} 页",this._blocks=[],this._cfg={...P},this._selectedId="",this._pickedIds=new Set,this._multi=!1,this._panel="props",this._pagesWrap=null,this._scaleEl=null,this._canvasDirty=!0,this._dragId="",this._emitTimer=null,this._lastHydrated="",this._lastPhRef=null,this._resizeObs=null,this._pageLayoutTimer=null,this._labelOf=t=>{var e;return(e=this.placeholders.find(o=>o.key===t))==null?void 0:e.label}}connectedCallback(){super.connectedCallback(),this._hydrateFromProps()}willUpdate(){this._hydrateFromProps()}_hydrateFromProps(){const t=this._lastPhRef!==this.placeholders,e=`${this.content}||${this.formatConfig}`;e===this._lastHydrated&&!t||(this._lastHydrated=e,this._lastPhRef=this.placeholders,this._blocks=gt(this.content)??[],this._cfg=rt(this.formatConfig),this._canvasDirty=!0)}_view(){return{readonly:this.readonly,blocks:this._blocks,selectedId:this._selectedId,pickedIds:this._pickedIds,multi:this._multi,panel:this._panel,cfg:this._cfg,placeholders:this.placeholders,labelOf:this._labelOf,zoom:this.zoom}}render(){return ce(this,this._view())}firstUpdated(){const t=this.shadowRoot.querySelector(".z-dte__canvas-wrap");if(!t)return;const e=document.createElement("div");e.className="z-dte__scale",t.appendChild(e),this._scaleEl=e;const o=document.createElement("div");o.className="z-dte__canvas z-doc-body",o.setAttribute("part","canvas"),e.appendChild(o),this._pagesWrap=o,typeof ResizeObserver<"u"&&(this._resizeObs=new ResizeObserver(()=>dt(this._scaleEl,this._pagesWrap,this.zoom)),this._resizeObs.observe(o)),this._renderCanvas()}updated(){this._bindEvents();const t=this.shadowRoot.querySelector(".z-dte__canvas-wrap"),e=this._pagesWrap,o=this._scaleEl;e&&o&&e.parentElement!==o&&o.appendChild(e),o&&t&&o.parentElement!==t&&t.appendChild(o),e&&this._canvasDirty?this._renderCanvas():e&&ht(e,this._cfg),kt(e,this._cfg),dt(o,e,this.zoom)}_schedulePageLayout(){this._pageLayoutTimer&&clearTimeout(this._pageLayoutTimer),this._pageLayoutTimer=setTimeout(()=>{this._pageLayoutTimer=null,kt(this._pagesWrap,this._cfg),dt(this._scaleEl,this._pagesWrap,this.zoom)},400)}_renderCanvas(){const t=this._pagesWrap;if(!t)return;if(this._canvasDirty=!1,ht(t,this._cfg),this._blocks.length===0){t.innerHTML=`<div class="z-dte__empty">${i(this.emptyText)}</div>`;return}const e=It(this._cfg),o=this._view();e.querySelector(".z-doc-page-body").innerHTML=this._blocks.map((a,r)=>pe(this,o,a,r)).join("");for(const a of e.querySelectorAll(".z-doc-ph"))a.setAttribute("draggable","false");t.replaceChildren(e)}getBlocks(){return this._blocks.map(t=>({...t}))}getContent(){return JSON.stringify(this._blocks)}getFormatConfig(){return{...this._cfg}}getFormatConfigJSON(){return JSON.stringify(this._cfg)}extractPlaceholderKeys(){return Zt(this._blocks,this.content.startsWith("[")?"":this.content)}getUndefinedPlaceholderKeys(){const t=new Set(this.placeholders.map(e=>e.key));return this.extractPlaceholderKeys().filter(e=>!t.has(e))}_scheduleEmit(t=!1){if(this._emitTimer&&clearTimeout(this._emitTimer),t){this._emitTimer=null,this.emit("z-change",{content:this.getContent(),formatConfig:this.getFormatConfigJSON()});return}this._emitTimer=setTimeout(()=>{this._emitTimer=null,this.emit("z-change",{content:this.getContent(),formatConfig:this.getFormatConfigJSON()})},150)}disconnectedCallback(){var t;this._emitTimer&&clearTimeout(this._emitTimer),this._pageLayoutTimer&&clearTimeout(this._pageLayoutTimer),(t=this._resizeObs)==null||t.disconnect(),this._resizeObs=null,super.disconnectedCallback()}};xt.styles=X+de;let h=xt;u([d({type:String,attribute:!1})],h.prototype,"content");u([d({type:String,attribute:!1})],h.prototype,"formatConfig");u([d({type:Array,attribute:!1})],h.prototype,"placeholders");u([d({type:Boolean})],h.prototype,"readonly");u([d({type:Number})],h.prototype,"zoom");u([d({type:String})],h.prototype,"addHeadingText");u([d({type:String})],h.prototype,"addParagraphText");u([d({type:String})],h.prototype,"addTableText");u([d({type:String})],h.prototype,"addListText");u([d({type:String})],h.prototype,"addSignatureText");u([d({type:String})],h.prototype,"moveUpText");u([d({type:String})],h.prototype,"moveDownText");u([d({type:String})],h.prototype,"removeText");u([d({type:String})],h.prototype,"multiSelectText");u([d({type:String})],h.prototype,"propertiesTabText");u([d({type:String})],h.prototype,"placeholdersTabText");u([d({type:String})],h.prototype,"typographyTabText");u([d({type:String})],h.prototype,"insertText");u([d({type:String})],h.prototype,"noPlaceholderText");u([d({type:String})],h.prototype,"emptyText");u([d({type:String})],h.prototype,"alignText");u([d({type:String})],h.prototype,"alignLeftText");u([d({type:String})],h.prototype,"alignCenterText");u([d({type:String})],h.prototype,"alignRightText");u([d({type:String})],h.prototype,"fontFamilyText");u([d({type:String})],h.prototype,"fontSizeText");u([d({type:String})],h.prototype,"colorText");u([d({type:String})],h.prototype,"boldText");u([d({type:String})],h.prototype,"indentText");u([d({type:String})],h.prototype,"removeIndentText");u([d({type:String})],h.prototype,"zoomOutText");u([d({type:String})],h.prototype,"zoomInText");u([d({type:String})],h.prototype,"zoomResetText");u([d({type:String})],h.prototype,"columnWidthText");u([d({type:String})],h.prototype,"tableConfigText");u([d({type:String})],h.prototype,"dataKeyText");u([d({type:String})],h.prototype,"dataKeyHintText");u([d({type:String})],h.prototype,"columnKeyText");u([d({type:String})],h.prototype,"columnLabelText");u([d({type:String})],h.prototype,"addColumnText");u([d({type:String})],h.prototype,"removeColumnText");u([d({type:String})],h.prototype,"undefinedFieldText");u([d({type:String})],h.prototype,"noTableFieldText");u([d({type:String})],h.prototype,"staticRowText");u([d({type:String})],h.prototype,"addRowText");u([d({type:String})],h.prototype,"removeRowText");u([d({type:String})],h.prototype,"bodyFontText");u([d({type:String})],h.prototype,"headingFontText");u([d({type:String})],h.prototype,"bodySizeText");u([d({type:String})],h.prototype,"headingSizeText");u([d({type:String})],h.prototype,"lineHeightText");u([d({type:String})],h.prototype,"paraSpacingText");u([d({type:String})],h.prototype,"firstIndentText");u([d({type:String})],h.prototype,"pageMarginText");u([d({type:String})],h.prototype,"headerTextText");u([d({type:String})],h.prototype,"footerTextText");u([d({type:String})],h.prototype,"pageBreakText");class ze extends h{constructor(){super(...arguments),this._eventsBound=!1,this._onClick=t=>{const e=t.target,o=e.closest("[data-tab]");if(o){this._panel=o.dataset.tab,this.requestUpdate();return}const a=e.closest("[data-op]");if(a){const s=a.dataset.op,c=a.closest("[data-block-id]"),p=(c==null?void 0:c.dataset.blockId)??this._selectedId;if(s==="zoom-in"||s==="zoom-out"||s==="zoom-reset"){const g=mt(this.zoom);if(s==="zoom-reset")this.zoom=1;else{const m=Math.min(2,Math.max(.5,Math.round((g+(s==="zoom-in"?.1:-.1))*10)/10));this.zoom=m}this.zoom!==g&&this.requestUpdate();return}if(s==="pick")return;if(s==="insert-ph"){this.insertPlaceholder(a.dataset.key);return}if(s==="add-column"){this.addTableColumn(p);return}if(s==="remove-column"){this.removeTableColumn(p,Number(a.dataset.col));return}if(s==="add-row"){this.addTableRow(p);return}if(s==="remove-row"){this.removeTableRow(p);return}if(s.startsWith("add-")){this.addBlock(s.replace("add-",""));return}s==="up"?this.moveBlock(p,-1):s==="down"?this.moveBlock(p,1):s==="remove"&&this.removeBlock(p);return}const r=e.closest(".z-doc-ph");if(r){const s=r.closest("[data-block-id]");s&&this._select(s.dataset.blockId),this.emit("z-placeholder-click",{key:r.dataset.ph});return}const l=e.closest("[data-block-id]");l&&this._select(l.dataset.blockId)},this._onInput=t=>{const e=t.target,o=e.closest("[data-editable]");o&&(o.hasAttribute("contenteditable")||o.getAttribute("contenteditable")==="true")&&(this._syncBlockFromDom(e,o),this._scheduleEmit(),this._schedulePageLayout())},this._onChange=t=>{var s;const e=t.target,o=e;if(e.classList.contains("z-dte__multi-cb")){this._multi=o.checked,this._multi||this._pickedIds.clear(),this._canvasDirty=!0,this.requestUpdate();return}if(e.classList.contains("z-dte__pick")){const c=(s=e.closest("[data-block-id]"))==null?void 0:s.dataset.blockId;if(!c)return;o.checked?this._pickedIds.add(c):this._pickedIds.delete(c);return}const a=o.dataset.cfg;if(a){this._cfg=ie(this._cfg,a,o),this._pagesWrap&&ht(this._pagesWrap,this._cfg),this._schedulePageLayout(),this._scheduleEmit(!0);return}const r=this._blocks.find(c=>c.id===this._selectedId);if(!r)return;if(o.dataset.table){if(!se(r,o,this.placeholders))return;this._canvasDirty=!0,this._scheduleEmit(!0),this.requestUpdate();return}const l=o.dataset.prop;l&&(le(r,l,o),this._canvasDirty=!0,this.requestUpdate())},this._onDragStart=t=>{var r,l;const e=t.target,o=e.closest("[data-ph-key]");if(o){this._dragId="",(r=t.dataTransfer)==null||r.setData("text/z-doc-ph",o.dataset.phKey);return}const a=e.closest("[data-block-id]");a&&(this._dragId=a.dataset.blockId,(l=t.dataTransfer)==null||l.setData("text/z-doc-block",this._dragId))},this._onDragOver=t=>{const e=t.target;(e.closest("[data-block-id]")||e.closest("[data-ph-key]"))&&t.preventDefault()},this._onDrop=t=>{var g,m;const e=t.target,o=(g=t.dataTransfer)==null?void 0:g.getData("text/z-doc-ph"),a=e.closest("[data-block-id]");if(o){t.preventDefault();const f=a==null?void 0:a.querySelector("[data-editable]");f?(this._insertIntoEditable(f,o),this._syncBlockFromDom(f,f)):this.insertPlaceholder(o);return}const r=this._dragId||((m=t.dataTransfer)==null?void 0:m.getData("text/z-doc-block"));if(!r||!a)return;t.preventDefault();const l=a.dataset.blockId;if(r===l)return;const s=this._blocks.findIndex(f=>f.id===r),c=this._blocks.findIndex(f=>f.id===l);if(s<0||c<0)return;const[p]=this._blocks.splice(s,1);this._blocks.splice(c,0,p),this._dragId="",this._canvasDirty=!0,this._scheduleEmit(!0)}}_bindEvents(){if(this._eventsBound)return;const t=this.shadowRoot;t&&(t.addEventListener("click",this._onClick),t.addEventListener("change",this._onChange),t.addEventListener("input",this._onInput),t.addEventListener("dragstart",this._onDragStart),t.addEventListener("dragover",this._onDragOver),t.addEventListener("drop",this._onDrop),this._eventsBound=!0)}_select(t){if(this._selectedId===t)return;this._selectedId=t,this._pickedIds.clear();const e=this._pagesWrap;e&&e.querySelectorAll(".z-dte__block").forEach(o=>{const a=o.dataset.blockId===t;o.classList.toggle("z-dte__block--selected",a)}),this.emit("z-block-select",{block:this._blocks.find(o=>o.id===t)??null}),this.requestUpdate()}_syncBlockFromDom(t,e){re(this._blocks,t,e)}_insertIntoEditable(t,e){const o=this._labelOf(e),a=o?i(o):`{{${i(e)}}}`,r=`<span class="z-doc-ph" data-ph="${i(e)}" contenteditable="false" draggable="false">${a}</span>`,l=document.getSelection();if(l&&l.rangeCount>0){const s=l.getRangeAt(0);if(t.contains(s.commonAncestorContainer)){s.deleteContents();const c=s.createContextualFragment(r);s.insertNode(c),s.collapse(!1),l.removeAllRanges(),l.addRange(s);return}}t.insertAdjacentHTML("beforeend",r)}insertPlaceholder(t){var a;if(this.readonly)return;const e=this._blocks.find(r=>r.id===this._selectedId),o=(a=this._pagesWrap)==null?void 0:a.querySelector(`[data-block-id="${this._selectedId}"] [data-editable]`);if(e&&o&&(e.type==="paragraph"||e.type==="heading"))this._insertIntoEditable(o,t),this._syncBlockFromDom(o,o);else{const r={id:wt(),type:"paragraph",text:`{{${t}}}`};this._blocks.push(r),this._selectedId=r.id,this._canvasDirty=!0}this._scheduleEmit(!0),this.requestUpdate()}addBlock(t){const e={id:wt(),type:t};return t==="heading"?(e.level=1,e.text=""):t==="paragraph"?e.text="":t==="list"?(e.items=[""],e.ordered=!1):t==="table"?(e.columns=[{key:"col1",label:"列1",width:60},{key:"col2",label:"列2",width:60}],e.rows=[["",""]]):t==="signature"&&(e.left="甲方（签章）：",e.right="乙方（签章）："),this._blocks.push(e),this._selectedId=e.id,this._canvasDirty=!0,this._scheduleEmit(!0),this.requestUpdate(),e}addTableColumn(t){const e=this._tableBlock(t);if(!e)return;e.columns=e.columns??[];const o=e.columns.length+1;e.columns.push({key:`col${o}`,label:`列${o}`,width:60});for(const a of e.rows??[])for(;a.length<e.columns.length;)a.push("");this._afterTableMutate(e)}removeTableColumn(t,e){const o=this._tableBlock(t);if(!(!(o!=null&&o.columns)||o.columns.length<=1)&&!(e<0||e>=o.columns.length)){o.columns.splice(e,1);for(const a of o.rows??[])a.splice(e,1);this._afterTableMutate(o)}}addTableRow(t){var o;const e=this._tableBlock(t);e&&(e.rows=e.rows??[],e.rows.push(Array.from({length:((o=e.columns)==null?void 0:o.length)??0},()=>"")),this._afterTableMutate(e))}removeTableRow(t){const e=this._tableBlock(t);!(e!=null&&e.rows)||e.rows.length<=1||(e.rows.pop(),this._afterTableMutate(e))}_tableBlock(t){const e=this._blocks.find(o=>o.id===t);return e&&e.type==="table"?e:null}_afterTableMutate(t){this._selectedId=t.id,this._canvasDirty=!0,this._scheduleEmit(!0),this.requestUpdate()}moveBlock(t,e){const o=this._blocks.findIndex(l=>l.id===t),a=o+e;if(o<0||a<0||a>=this._blocks.length)return;const[r]=this._blocks.splice(o,1);this._blocks.splice(a,0,r),this._canvasDirty=!0,this._scheduleEmit(!0),this.requestUpdate()}removeBlock(t){if(this.readonly)return;const e=this._pickedIds.size>1&&this._pickedIds.has(t)?Array.from(this._pickedIds):[t];this._blocks=this._blocks.filter(o=>!e.includes(o.id)),e.forEach(o=>this._pickedIds.delete(o)),e.includes(this._selectedId)&&(this._selectedId=""),this._canvasDirty=!0,this._scheduleEmit(!0),this.requestUpdate()}loadTemplate(t){this.content=t.content,this.formatConfig=t.formatConfig,this._blocks=gt(t.content)??[],this._cfg=rt(t.formatConfig),this._selectedId="",this._pickedIds.clear(),this._lastHydrated=`${this.content}||${this.formatConfig}`,this._canvasDirty=!0,this.requestUpdate()}}customElements.define("z-doc-template-editor",ze);const _e=`/* ===== z-doc-preview: A4 分页预览 + 打印/导出工具栏 ===== */

:host {
  display: block;
}

.z-docp {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-3);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-docp__toolbar {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
}

.z-docp__title {
  font-size: var(--z-font-size-md);
  font-weight: var(--z-font-weight-semibold);
}

.z-docp__spacer {
  flex: 1;
}

.z-docp__error {
  color: var(--z-color-danger);
  font-size: var(--z-font-size-xs);
}

.z-docp__btn {
  height: var(--z-input-height);
  padding: var(--z-button-padding-y) var(--z-button-padding-x);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-button-radius);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-size: var(--z-button-font-size);
  cursor: pointer;
  transition: var(--z-transition-fast);
}

.z-docp__btn:hover:not(:disabled) {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.z-docp__btn--primary {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

.z-docp__btn--primary:hover:not(:disabled) {
  background: var(--z-color-primary-solid-hover);
  border-color: var(--z-color-primary-solid-hover);
  color: var(--z-color-primary-text);
}

.z-docp__zoom-pct {
  min-width: 56px;
}

.z-docp__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── 纸张堆叠 ───────────────────────────────────────── */
.z-docp__pages {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--z-space-5);
  padding: var(--z-space-4);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
  /* [WHY] 不设 max-height 内滚（2026-09-25 实撞）：78vh + overflow:auto 把第 2 页
     藏在折叠线以下且 macOS 浮层滚动条不可见 → 用户看到「没有第二页」。
     纸张堆叠随内容长高, 整页滚动, 页序自然可见 */
}

.z-docp__page {
  position: relative;
}

/* [WHY] 缩放经 transform: scale 等比视觉缩放（不触发重排, 折行/分页保持 100% 布局）:
   包装层高度由 _compensateScale 按视觉高度撑回, 保证 z>1 时末页可滚到、z<1 无空白 */
.z-docp__scale {
  transform-origin: top center;
}

.z-docp__page-no {
  margin-top: var(--z-space-2);
  text-align: center;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
}

.z-docp__empty {
  padding: var(--z-space-10);
  text-align: center;
  color: var(--z-color-text-secondary);
}`;var ye=Object.defineProperty,v=(n,t,e,o)=>{for(var a=void 0,r=n.length-1,l;r>=0;r--)(l=n[r])&&(a=l(t,e,a)||a);return a&&ye(t,e,a),a};const $t=class $t extends at{constructor(){super(...arguments),this.content="",this.formatConfig="",this.data={},this.template=null,this.renderAdapter=null,this.exportName="document",this.showToolbar=!0,this.zoom=1,this.previewText="文档预览",this.printText="打印",this.exportText="导出 docx",this.generateText="生成文档",this.emptyText="暂无内容",this.exportingText="导出中...",this.exportFailedText="导出失败",this.noAdapterText="未注入导出适配器",this.pageText="第 {page} 页 / 共 {total} 页",this.zoomOutText=B.zoomOut,this.zoomInText=B.zoomIn,this.zoomResetText=B.zoomReset,this._pages=[],this._exporting=!1,this._error="",this._eventsBound=!1,this._lastKey="",this._onClick=t=>{const e=t.target.closest("[data-op]");if(!e)return;const o=e.dataset.op;o==="generate"?this.generate():o==="print"?this.print():o==="export"?this.exportDocx():o==="zoom-in"?this._zoomStep(.1):o==="zoom-out"?this._zoomStep(-.1):o==="zoom-reset"&&this._clampedZoom()!==1&&(this.zoom=1,this.requestUpdate())}}willUpdate(){const t=`${this.content}||${this.formatConfig}||${JSON.stringify(this.data??{})}`;t!==this._lastKey&&(this._lastKey=t,this._recompute())}_cfg(){return rt(this.formatConfig)}_recompute(){const t=this._cfg(),e=lt(this.content,this.data??{});this._pages=this._paginate(e,t)}_paginate(t,e){const o=G(e);if(!t.trim())return[];const a=D(e.marginTop??20),r=D(e.marginBottom??20),l=D(e.marginLeft??18),s=D(e.marginRight??18),c=Math.max(40,qt-l-s),p=Math.max(60,Wt-a-r),g=this._measureHF(e,o,c),m=document.createElement("div");m.setAttribute("style",`position:absolute;left:-9999px;top:0;width:${c}px;${o};font-family:var(--z-doc-body-font);font-size:var(--z-doc-body-size);line-height:var(--z-doc-line-height);`),m.className="z-doc-body";const f=document.createElement("div");f.style.cssText=`position:absolute;left:-9999px;top:0;width:${p}px;height:0;`,document.body.appendChild(m),document.body.appendChild(f),m.innerHTML=`<style>${X}</style>${t}`;const $=f.getBoundingClientRect().width;f.remove();const L=Array.from(m.children).filter(S=>S.tagName!=="STYLE"),R=L.map(S=>S.getBoundingClientRect().top);let T=0;if(L.length){const S=L[L.length-1],q=Number.parseFloat(getComputedStyle(S).marginBottom)||0;T=S.getBoundingClientRect().bottom+q-R[0]}const k=R.map(S=>Math.max(0,S-R[0])),A=k.map((S,q)=>Math.max(0,(q+1<L.length?k[q+1]:T)-S));if(m.remove(),$<=0||!L.length||A.every(S=>S<=0))return[{html:t,overflow:!0}];const K=Math.max(10,($-g)*.97),U=[];let Q=[],Y=0;const st=S=>{Q.length&&U.push({html:Q.join(""),overflow:S}),Q=[],Y=0};return L.forEach((S,q)=>{const Tt=A[q];Y>0&&Y+Tt>K&&st(!1),Q.push(S.outerHTML),Y+=Tt,Y>K&&st(!0)}),st(!1),U.length?U:[{html:t,overflow:!0}]}_measureHF(t,e,o){var g,m;const a=(g=t.headerText)==null?void 0:g.trim(),r=(m=t.footerText)==null?void 0:m.trim();if(!a&&!r)return 0;const l=(a?`<div class="z-doc-page-head">${i(a)}</div>`:"")+(r?`<div class="z-doc-page-foot">${i(r)}</div>`:""),s=document.createElement("div");s.setAttribute("style",`position:absolute;left:-9999px;top:0;width:${o}px;${e};font-family:var(--z-doc-body-font);`),s.className="z-doc-paper",s.innerHTML=`<style>${X}</style>${l}`,document.body.appendChild(s);const c=Array.from(s.children).filter(f=>f.tagName!=="STYLE");let p=0;if(c.length){const f=c[c.length-1],$=Number.parseFloat(getComputedStyle(f).marginBottom)||0;p=f.getBoundingClientRect().bottom+$-c[0].getBoundingClientRect().top}return s.remove(),Math.max(0,p)}render(){var g,m;this._pages.length===0&&!this._lastKey&&this._recompute();const t=this._cfg(),e=G(t),o=((g=t.headerText)==null?void 0:g.trim())??"",a=((m=t.footerText)==null?void 0:m.trim())??"",r=o?`<div class="z-doc-page-head">${i(o)}</div>`:"",l=a?`<div class="z-doc-page-foot">${i(a)}</div>`:"",s=o||a?" z-doc-paper--hf":"",c=this._pages.length?this._pages.map((f,$)=>w`
              <div class="z-docp__page" part="page" data-page="${$+1}">
                <div class="z-docp__scale" style="${this._scaleStyle()}">
                  <div class="${f.overflow?"z-doc-paper":"z-doc-paper z-doc-paper--sized"}${s} z-doc-body" part="paper" style="${i(e)}">${r}<div class="z-doc-page-body">${f.html}</div>${l}</div>
                </div>
                <div class="z-docp__page-no">${i(this.pageText.replace("{page}",String($+1)).replace("{total}",String(this._pages.length)))}</div>
              </div>`).join(""):`<div class="z-docp__empty" part="empty">${i(this.emptyText)}</div>`,p=`${Math.round(this._clampedZoom()*100)}%`;return w`
      <div class="z-docp" part="root">
        ${this.showToolbar?w`<div class="z-docp__toolbar" part="toolbar">
              <span class="z-docp__title">${i(this.previewText)}</span>
              <span class="z-docp__spacer"></span>
              ${this._error?`<span class="z-docp__error">${i(this._error)}</span>`:""}
              <button type="button" class="z-docp__btn" data-op="zoom-out" part="zoom-out-button" title="${i(this.zoomOutText)}" aria-label="${i(this.zoomOutText)}">−</button>
              <button type="button" class="z-docp__btn z-docp__zoom-pct" data-op="zoom-reset" part="zoom-reset-button" title="${i(this.zoomResetText)}" aria-label="${i(this.zoomResetText)}">${i(p)}</button>
              <button type="button" class="z-docp__btn" data-op="zoom-in" part="zoom-in-button" title="${i(this.zoomInText)}" aria-label="${i(this.zoomInText)}">＋</button>
              <button type="button" class="z-docp__btn" data-op="generate" part="generate-button">${i(this.generateText)}</button>
              <button type="button" class="z-docp__btn" data-op="print" part="print-button">${i(this.printText)}</button>
              <button type="button" class="z-docp__btn z-docp__btn--primary" data-op="export" part="export-button"${this._exporting?" disabled":""}>
                ${i(this._exporting?this.exportingText:this.exportText)}
              </button>
            </div>`:""}
        <div class="z-docp__pages" part="pages">${c}</div>
      </div>`}_clampedZoom(){return Math.min(2,Math.max(.5,this.zoom||1))}_scaleStyle(){const t=this._clampedZoom();return t===1?"":`transform: scale(${t});`}_zoomStep(t){const e=Math.min(2,Math.max(.5,Math.round((this._clampedZoom()+t)*10)/10));e!==this._clampedZoom()&&(this.zoom=e,this.requestUpdate())}_compensateScale(){const t=this.shadowRoot;if(!t)return;const e=this._clampedZoom();t.querySelectorAll(".z-docp__scale").forEach(o=>{const a=o.firstElementChild;a&&(a.offsetHeight<=0||(o.style.height=e===1?"":`${Math.ceil(a.offsetHeight*e)}px`))})}updated(){this._bindEvents(),this._compensateScale()}generate(){var e;this._recompute(),this.requestUpdate();const t={content:this.content,data:this.data??{}};this.emit("z-generate",t),(e=this.onGenerate)==null||e.call(this,t)}setData(t){this.data=t,this._recompute(),this.requestUpdate()}getDocumentHtml(){const t=G(this._cfg()),e=this._pages.length?this._pages.map(o=>o.html).join(""):lt(this.content,this.data??{});return`<div class="z-doc-body" style="${i(t)}">${e}</div>`}print(){var m,f,$,L;const t=window.open("","_blank","width=900,height=1200");if(!t){this._error="window.open blocked",this.requestUpdate();return}const e=this._cfg(),o=i(G(e)),a=((m=e.headerText)==null?void 0:m.trim())??"",r=((f=e.footerText)==null?void 0:f.trim())??"",l=a?`<div class="z-doc-page-head">${i(a)}</div>`:"",s=r?`<div class="z-doc-page-foot">${i(r)}</div>`:"",c=a||r?" z-doc-paper--hf":"",p=R=>`<div class="z-doc-paper${c} z-doc-body" style="${o}">${l}<div class="z-doc-page-body">${R}</div>${s}</div>`,g=this._pages.length?this._pages.map(R=>`<div class="z-doc-page">${p(R.html)}</div>`).join(""):`<div class="z-doc-page">${p(lt(this.content,this.data??{}))}</div>`;t.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" />
<title>${i((($=this.template)==null?void 0:$.name)??this.exportName)}</title>
<style>${X}
  body { margin: 0; background: #fff; }
  .z-doc-paper { box-shadow: none; border: none; min-height: 0; margin: 0; }
  .z-doc-page { page-break-after: always; break-after: page; }
  .z-doc-page:last-child { page-break-after: auto; break-after: auto; }
  @page { size: A4; margin: 0; }
</style></head><body>${g}</body></html>`),t.document.close(),t.focus(),t.print(),this.emit("z-print"),(L=this.onPrint)==null||L.call(this)}async exportDocx(){var t,e,o;if(!this.renderAdapter||!this.template)return this._error=this.noAdapterText,this.requestUpdate(),this.emit("z-export",{blob:null,error:this.noAdapterText}),(t=this.onExport)==null||t.call(this,{blob:null,error:this.noAdapterText}),null;this._exporting=!0,this._error="",this.requestUpdate();try{const a=await this.renderAdapter.renderDocx(this.template,this.data??{});return this._download(a),this.emit("z-export",{blob:a}),(e=this.onExport)==null||e.call(this,{blob:a}),a}catch(a){const r=a instanceof Error?a.message:String(a);return this._error=`${this.exportFailedText}: ${r}`,this.emit("z-export",{blob:null,error:r}),(o=this.onExport)==null||o.call(this,{blob:null,error:r}),null}finally{this._exporting=!1,this.requestUpdate()}}_download(t){const e=URL.createObjectURL(t),o=document.createElement("a");o.href=e,o.download=`${this.exportName}.docx`,document.body.appendChild(o),o.click(),o.remove(),URL.revokeObjectURL(e)}_bindEvents(){if(this._eventsBound)return;const t=this.shadowRoot;t&&(t.addEventListener("click",this._onClick),this._eventsBound=!0)}};$t.styles=X+_e;let z=$t;v([d({type:String,attribute:!1})],z.prototype,"content");v([d({type:String,attribute:!1})],z.prototype,"formatConfig");v([d({type:Object,attribute:!1})],z.prototype,"data");v([d({type:Object,attribute:!1})],z.prototype,"template");v([d({type:Object,attribute:!1})],z.prototype,"renderAdapter");v([d({type:String})],z.prototype,"exportName");v([d({type:Boolean})],z.prototype,"showToolbar");v([d({type:Number})],z.prototype,"zoom");v([d({type:String})],z.prototype,"previewText");v([d({type:String})],z.prototype,"printText");v([d({type:String})],z.prototype,"exportText");v([d({type:String})],z.prototype,"generateText");v([d({type:String})],z.prototype,"emptyText");v([d({type:String})],z.prototype,"exportingText");v([d({type:String})],z.prototype,"exportFailedText");v([d({type:String})],z.prototype,"noAdapterText");v([d({type:String})],z.prototype,"pageText");v([d({type:String})],z.prototype,"zoomOutText");v([d({type:String})],z.prototype,"zoomInText");v([d({type:String})],z.prototype,"zoomResetText");v([d({type:Object,attribute:!1})],z.prototype,"onGenerate");v([d({type:Object,attribute:!1})],z.prototype,"onPrint");v([d({type:Object,attribute:!1})],z.prototype,"onExport");customElements.define("z-doc-preview",z);Pt.init();Mt();const St=document.getElementById("log"),C=n=>St.textContent=`${new Date().toLocaleTimeString()}  ${n}
`+St.textContent,Ht=[{key:"partyA",label:"甲方名称",type:"text",sample:"金华数字化改造有限公司"},{key:"partyB",label:"乙方名称",type:"text",sample:"浙江智造科技有限公司"},{key:"amount",label:"合同金额",type:"number",sample:"128000.00"},{key:"signDate",label:"签署日期",type:"date",sample:"2026-09-24"},{key:"period",label:"服务期限",type:"text",sample:"12 个月"},{key:"items",label:"标的明细表",type:"table",sample:"结构行数据 / HTML 片段",fields:[{key:"name",label:"项目名称"},{key:"qty",label:"数量"},{key:"price",label:"单价(元)"},{key:"amount",label:"金额(元)"}]}],ve=n=>JSON.stringify([{id:"b1",type:"heading",level:1,text:n},{id:"b2",type:"paragraph",align:"right",text:"合同编号：{{contractNo}}"},{id:"b3",type:"paragraph",text:"甲方（委托方）：{{partyA}}"},{id:"b4",type:"paragraph",text:"乙方（受托方）：{{partyB}}"},{id:"b5",type:"paragraph",text:"经双方友好协商，就数字化改造服务事宜达成如下约定，合同金额为人民币 {{amount}} 元，服务期限 {{period}}。"},{id:"b6",type:"table",dataKey:"items",columns:[{key:"name",label:"项目名称",width:180},{key:"qty",label:"数量",width:60},{key:"price",label:"单价(元)",width:100}],rows:[["","",""]]},{id:"b7",type:"list",ordered:!0,items:["甲方按合同金额 30% 支付预付款；","项目验收后 15 个工作日内结清尾款；","乙方提供为期 {{period}} 的运维支持。"]},{id:"b8",type:"paragraph",text:"本协议自双方签署之日起生效，签署日期：{{signDate}}。"},{id:"b9",type:"signature",left:"甲方（签章）：",right:"乙方（签章）："}]);let Ot=3;const O=[{id:"t1",name:"数字化改造服务合同",description:"标准服务合同模板（含标的明细表）",category:"合同",content:ve("数字化改造服务合同"),formatConfig:JSON.stringify(P),isDefault:!0,updatedAt:"2026-09-20 10:12"},{id:"t2",name:"项目验收通知函",description:"验收结果通知（无表格）",category:"通知函",content:JSON.stringify([{id:"c1",type:"heading",level:1,text:"项目验收通知函"},{id:"c2",type:"paragraph",text:"{{partyA}}："},{id:"c3",type:"paragraph",text:"贵司委托的数字化改造项目已于 {{signDate}} 完成验收，服务期限 {{period}}。"},{id:"c4",type:"signature",left:"",right:"{{partyB}}"}]),formatConfig:JSON.stringify({...P,lineHeight:1.5}),isDefault:!1,updatedAt:"2026-09-18 16:40"},{id:"t3",name:"HTML 降级内容模板",description:"content 直接存 HTML（渲染优先级降级链路）",category:"报价单",content:"<h1>报价单</h1><p>客户：{{partyA}}</p><table><thead><tr><th>项目</th><th>金额</th></tr></thead><tbody><tr><td>软件开发</td><td>{{amount}}</td></tr></tbody></table>",formatConfig:JSON.stringify(P),isDefault:!1,updatedAt:"2026-09-15 09:05"}],ft={async list({page:n,size:t,keyword:e,category:o}){let a=O.slice();return e&&(a=a.filter(r=>r.name.includes(e))),o&&(a=a.filter(r=>r.category===o)),{data:a.slice((n-1)*t,n*t),total:a.length}},async get(n){return O.find(t=>t.id===n)},async create(n){const t={formatConfig:JSON.stringify(P),isDefault:!1,content:"[]",...n,id:`t${Ot++}`};return O.push(t),t},async update(n,t){const e=O.findIndex(o=>o.id===n);O[e]={...O[e],...t}},async remove(n){const t=O.findIndex(e=>e.id===n);O.splice(t,1)}},xe={async renderDocx(n,t){return C(`renderDocx → ${n.name}（${Object.keys(t).length} 个数据键）`),new Blob([`mock docx for ${n.name}
${JSON.stringify(t,null,2)}`],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}},N=document.getElementById("mgr"),x=document.getElementById("editor"),I=document.getElementById("preview"),bt=document.getElementById("edit-status"),nt=document.getElementById("data-fields");JSON.stringify(P);let E=null,_={};N.dataSource=ft;N.categories=["合同","通知函","报价单"];N.addEventListener("z-edit",n=>{E=n.detail.template,x.loadTemplate(E),I.template=E,bt.textContent=`编辑中：${E.name}`,zt(),C(`z-edit: ${E.name}`)});N.addEventListener("z-create",async n=>{const t=await ft.create({name:`新建模板 ${Ot}`,category:n.detail.category,content:"[]"});await N.refresh(1),E=t,x.loadTemplate(t),I.template=t,bt.textContent=`新建：${t.name}`,C(`z-create: ${t.name}`)});N.addEventListener("z-error",n=>{var t;return C(`z-error: ${((t=n.detail.error)==null?void 0:t.message)??n.detail.error}`)});N.addEventListener("z-refresh",n=>C(`z-refresh: 共 ${n.detail.total} 条`));x.placeholders=Ht;x.addEventListener("z-change",()=>zt());x.addEventListener("z-placeholder-click",n=>C(`z-placeholder-click: {{${n.detail.key}}}`));x.addEventListener("z-block-select",n=>{const t=n.detail.block;t&&C(`z-block-select: ${t.type}`)});I.renderAdapter=xe;I.template=O[0];I.addEventListener("z-generate",()=>C("z-generate"));I.addEventListener("z-print",()=>C("z-print"));I.addEventListener("z-export",n=>C(n.detail.error?`z-export 失败: ${n.detail.error}`:"z-export 成功"));function zt(){I.content=x.getContent(),I.formatConfig=x.getFormatConfigJSON(),it(x.extractPlaceholderKeys())}const H=n=>String(n??"").replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t]),_t=n=>Ht.find(t=>t.key===n),ot=n=>{var t;return((t=_t(n))==null?void 0:t.type)==="table"};function Ft(n){var e,o;const t=x.getBlocks().find(a=>a.type==="table"&&a.dataKey===n);return(e=t==null?void 0:t.columns)!=null&&e.length?t.columns.map(a=>({key:a.key,label:a.label||a.key})):(((o=_t(n))==null?void 0:o.fields)??[]).map(a=>({key:a.key,label:a.label||a.key}))}const $e={items:{name:["需求调研与方案设计","系统开发与联调","上线部署与培训"],qty:["1","1","1"],price:["28000","76000","24000"],amount:["28000","76000","24000"]}};function Rt(n,t=!1){const e=Ft(n),o=$e[n]??{},a=Array.isArray(_[n]),r=a?_[n]:[],l=t?3:a?r.length:3;_[n]=Array.from({length:l},(s,c)=>{var g,m;const p={};for(const f of e)p[f.key]=t||!a?((g=o[f.key])==null?void 0:g[c])??"":((m=r[c])==null?void 0:m[f.key])??"";return p})}function it(n){const t={};for(const e of n){const o=_[e];t[e]=Array.isArray(o)||typeof o=="string"?o:""}_=t;for(const e of n)ot(e)&&Rt(e);n.length===0?nt.innerHTML='<span class="demo-log">当前模板未使用占位符</span>':nt.innerHTML=n.map(e=>{const o=_t(e),a=o?`${o.label} (${e})`:e;return ot(e)?Te(e,a):`<label>${a}<z-input data-key="${e}" value="${H(_[e])}" placeholder="${H(o==null?void 0:o.sample)}"></z-input></label>`}).join(""),I.setData(Bt())}function Te(n,t){const e=Ft(n);if(e.length===0)return`<div class="demo-table-cfg"><b>${H(t)}</b><span class="demo-log">该表未配置展示字段：在编辑器属性面板「字段」下拉里选</span></div>`;const a=(Array.isArray(_[n])?_[n]:[]).map((r,l)=>`<tr>${e.map(s=>`<td><z-input data-row="${l}" data-col-key="${H(s.key)}" value="${H(r[s.key])}"></z-input></td>`).join("")}<td><z-button data-tbl-op="remove-row" data-tbl-key="${H(n)}" data-row="${l}" size="sm" appearance="ghost" title="删行">✕</z-button></td></tr>`).join("");return`<div class="demo-table-cfg" data-tbl="${H(n)}">
        <div class="demo-row">
          <b>${H(t)}</b>
          <span class="demo-log">列取自编辑器里该表配置的展示字段</span>
          <z-button data-tbl-op="add-row" data-tbl-key="${H(n)}" size="sm" appearance="outline">加行</z-button>
        </div>
        <table class="demo-table-edit">
          <thead><tr>${e.map(r=>`<th>${H(r.label)}<span>${H(r.key)}</span></th>`).join("")}<th></th></tr></thead>
          <tbody>${a}</tbody>
        </table>
      </div>`}function Bt(){return{..._}}nt.addEventListener("z-input",n=>{const t=n.target.closest("z-input");if(t){if(t.dataset.colKey){const e=t.closest("[data-tbl]").dataset.tbl,o=Number(t.dataset.row);for(Array.isArray(_[e])||(_[e]=[]);_[e].length<=o;)_[e].push({});_[e][o][t.dataset.colKey]=n.detail.value}else if(t.dataset.key)_[t.dataset.key]=n.detail.value;else return;I.setData(Bt())}});nt.addEventListener("z-click",n=>{const t=n.target.closest("z-button[data-tbl-op]");if(!t)return;const e=t.dataset.tblKey;Array.isArray(_[e])||(_[e]=[]),t.dataset.tblOp==="add-row"?_[e].push({}):_[e].splice(Number(t.dataset.row),1),it(x.extractPlaceholderKeys())});document.getElementById("btn-save").addEventListener("z-click",async()=>{if(!E){C("请先在列表中选择模板");return}await ft.update(E.id,{content:x.getContent(),formatConfig:x.getFormatConfigJSON(),updatedAt:new Date().toLocaleString()}),await N.refresh(),C(`已保存：${E.name}`)});document.getElementById("btn-keys").addEventListener("z-click",()=>{const n=x.extractPlaceholderKeys(),t=x.getUndefinedPlaceholderKeys();C(`占位符 key: [${n.join(", ")}]${t.length?` · 未定义: [${t.join(", ")}]`:""}`)});document.getElementById("btn-sample").addEventListener("z-click",()=>{const n={partyA:"金华数字化改造有限公司",partyB:"浙江智造科技有限公司",amount:"128000.00",signDate:"2026-09-24",period:"12 个月",contractNo:"HT-2026-0924"};for(const[e,o]of Object.entries(n))e in _&&(_[e]=o);const t=x.extractPlaceholderKeys();for(const e of t)ot(e)&&Rt(e,!0);it(t),C("已填充示例数据")});document.getElementById("btn-clear").addEventListener("z-click",()=>{_={};const n=x.extractPlaceholderKeys();for(const t of n)ot(t)&&(_[t]=[]);it(n),C("已清空数据")});(async()=>(await N.refresh(1),E=O[0],x.loadTemplate(E),I.template=E,bt.textContent=`编辑中：${E.name}`,zt(),C(`初始化完成：${O.length} 个模板 · 排版默认行距 ${rt(x.getFormatConfigJSON()).lineHeight}`)))();
