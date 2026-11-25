import{B as g,h as c,p as l,e as b}from"./presets-CdaBrvJF.js";/* empty css             */import{t as R}from"./a11y-DJ6wHu5s.js";import"./Button-6M0Me5pu.js";import"./Card-D_PXomyA.js";import"./Badge-DbBfhcO2.js";import{C as k}from"./copy-DoHMT7Ic.js";import"./Position-D6zl9ryN.js";import{r as D,g as L,a as N,s as T,b as $}from"./roving-DMg3clv6.js";import{m as A}from"./shell-DwQ7nMfw.js";import"./vocabulary-DLBU9tdh.js";const W=`/* ===== z-app-shell（[[REQ-012]] 后台布局骨架） ===== */

:host {
  display: grid;
  /* [WHY] 本地补丁（2026-10-11，对齐 zWorker frontend/src/z-agent-ui 副本）：列轨道必须
     minmax(0,1fr) —— 无显式列定义时隐式轨道按 max-content 撑开，宽内容（nowrap 表头 +
     不换行操作列的宽表格）会把整个壳层撑出视口；:host overflow:hidden 裁切后页面无滚动条、
     内容右侧被截断（zEtl 数据集页 1280px 视口实测：表格 min-content 1291px 把 main 撑到
     1667px、header 1855px）。修后 z-table wrapper 的 overflow-x:auto 内部滚动恢复生效。
     See: VENDOR-NOTE 本地补丁表 */
  grid-template-columns: minmax(0, 1fr);
  /* [WHY] 行布局：header 自适应 / body 占满余高 / footer 自适应；grid 轨道不可动画，折叠动画由槽内 z-sidebar 宽度过渡承担（findings F1） */
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100vh;
  overflow: hidden;
  background: var(--z-app-shell-main-bg);
  color: var(--z-app-shell-text);
  font-family: var(--z-font-sans);
}

.z-app-shell__header {
  min-height: var(--z-app-shell-header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--z-space-4);
  background: var(--z-app-shell-header-bg);
  border-bottom: 1px solid var(--z-app-shell-header-border);
  z-index: 1;
}

.z-app-shell__body {
  display: flex;
  min-height: 0;
}

.z-app-shell__sidebar {
  /* [WHY] auto 跟随槽内 z-sidebar 的动画宽度；min-width:0 防 nowrap 内容把区域撑破 */
  flex: 0 0 auto;
  min-width: 0;
  overflow: hidden;
}

.z-app-shell__main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  background: var(--z-app-shell-main-bg);
}

.z-app-shell__footer {
  display: flex;
  align-items: center;
  padding: 0 var(--z-space-4);
  border-top: 1px solid var(--z-app-shell-header-border);
}
`;var Y=Object.defineProperty,I=(s,e,t,r)=>{for(var n=void 0,a=s.length-1,o;a>=0;a--)(o=s[a])&&(n=o(e,t,n)||n);return n&&Y(e,t,n),n};const v=class v extends g{constructor(){super(...arguments),this.collapsed=!1,this._sidebarSlot=null,this._onToggle=()=>{this.collapsed=!this.collapsed,this.emit("z-collapse-change",{collapsed:this.collapsed})},this._onSlotChange=e=>{this._syncElements(e.target.assignedElements())}}connectedCallback(){super.connectedCallback(),this.addEventListener("z-sidebar-toggle",this._onToggle)}disconnectedCallback(){this.removeEventListener("z-sidebar-toggle",this._onToggle),super.disconnectedCallback()}render(){return c`
      <header class="z-app-shell__header" part="header">
        <slot name="header"></slot>
      </header>
      <div class="z-app-shell__body" part="body">
        <div class="z-app-shell__sidebar" part="sidebar">
          <slot name="sidebar"></slot>
        </div>
        <main class="z-app-shell__main" part="main">
          <slot name="main"><slot></slot></slot>
        </main>
      </div>
      <footer class="z-app-shell__footer" part="footer">
        <slot name="footer"></slot>
      </footer>
    `}updated(){this._bindSlotChange(),this._syncSidebar()}_bindSlotChange(){const e=this.shadowRoot.querySelector('slot[name="sidebar"]');!e||e===this._sidebarSlot||(this._sidebarSlot=e,e.addEventListener("slotchange",this._onSlotChange))}_syncSidebar(){const e=this._sidebarSlot;e&&this._syncElements(e.assignedElements())}_syncElements(e){for(const t of e){if(t.tagName.toLowerCase()!=="z-sidebar")continue;const r=t;r.collapsed!==this.collapsed&&(r.collapsed=this.collapsed)}}};v.styles=W;let m=v;I([l({type:Boolean})],m.prototype,"collapsed");customElements.define("z-app-shell",m);const O=`/* ===== z-sidebar（[[REQ-012]] 后台布局骨架） ===== */

:host {
  /* [WHY] 宽度由自身表达（含折叠动画），app-shell 侧边栏区域 auto 跟随，避免双重宽度控制 */
  display: block;
  height: 100%;
  width: var(--z-app-shell-sidebar-width);
  transition: width var(--z-app-shell-transition);
}

:host([collapsed]) {
  width: var(--z-app-shell-sidebar-collapsed-width);
}

.z-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--z-app-shell-sidebar-bg);
  border-right: 1px solid var(--z-app-shell-sidebar-border);
  /* [WHY 用侧栏专属文字色] 宿主（shadcn 系）的 \`--sidebar-foreground\` 与页面
     \`--foreground\` 常常是反的（深色侧栏 + 浅字）。继承页面文字色会让侧栏文字与底板同色。
     issue IKIDAI */
  color: var(--z-app-shell-sidebar-text);
  font-family: var(--z-font-sans);
}

.z-sidebar__content {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  /* [WHY] 折叠窄条时文本单行裁剪，避免横向撑破 */
  white-space: nowrap;
}

.z-sidebar__footer {
  flex: 0 0 auto;
  padding: var(--z-space-2);
  border-top: 1px solid var(--z-app-shell-sidebar-border);
  white-space: nowrap;
  overflow: hidden;
}
`;var j=Object.defineProperty,q=(s,e,t,r)=>{for(var n=void 0,a=s.length-1,o;a>=0;a--)(o=s[a])&&(n=o(e,t,n)||n);return n&&j(e,t,n),n};const y=class y extends g{constructor(){super(...arguments),this.collapsed=!1}render(){return c`
      <aside class="z-sidebar" part="root">
        <div class="z-sidebar__content" part="content">
          <slot></slot>
        </div>
        <div class="z-sidebar__footer" part="footer">
          <slot name="footer"></slot>
        </div>
      </aside>
    `}};y.styles=O;let f=y;q([l({type:Boolean})],f.prototype,"collapsed");customElements.define("z-sidebar",f);const P=`/* ===== z-breadcrumb（[[REQ-012]] 后台布局骨架） ===== */

:host {
  display: block;
}

.z-breadcrumb {
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
}

.z-breadcrumb__list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--z-space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.z-breadcrumb__link {
  color: var(--z-color-text-secondary);
  text-decoration: none;
  transition: color var(--z-transition-fast);
}

.z-breadcrumb__link:hover {
  color: var(--z-color-primary);
  text-decoration: underline;
}

.z-breadcrumb__current {
  color: var(--z-color-text);
  font-weight: var(--z-font-weight-medium);
}

.z-breadcrumb__sep {
  color: var(--z-color-text-disabled);
  user-select: none;
}
`;var Q=Object.defineProperty,E=(s,e,t,r)=>{for(var n=void 0,a=s.length-1,o;a>=0;a--)(o=s[a])&&(n=o(e,t,n)||n);return n&&Q(e,t,n),n};const x=class x extends g{constructor(){super(...arguments),this.items=[],this.separator="/",this._navEl=null,this._onClick=e=>{const t=e.target.closest("a[part='link']");if(!t)return;const r=Number(t.dataset.index),n=this.items[r];n&&this.emit("z-select",{item:n,index:r})}}render(){const e=this.items,t=[];return e.forEach((r,n)=>{const a=n===e.length-1,o=b(r.label),h=n>0?`<span class="z-breadcrumb__sep" part="separator" aria-hidden="true">${b(this.separator)}</span>`:"";let d;a?d=`<span class="z-breadcrumb__current" part="current" aria-current="page">${o}</span>`:r.href?d=`<a class="z-breadcrumb__link" part="link" href="${b(r.href)}" data-index="${n}">${o}</a>`:d=`<span class="z-breadcrumb__text">${o}</span>`,t.push(`<li part="item">${h}${d}</li>`)}),c`<nav class="z-breadcrumb" part="root" aria-label="breadcrumb"><ol class="z-breadcrumb__list" part="list">${t.join("")}</ol></nav>`}updated(){const e=this.shadowRoot.querySelector(".z-breadcrumb");!e||e===this._navEl||(this._navEl=e,e.addEventListener("click",this._onClick))}};x.styles=P;let _=x;E([l({type:Array,attribute:!1})],_.prototype,"items");E([l({type:String})],_.prototype,"separator");customElements.define("z-breadcrumb",_);const F=`/* ===== z-table ===== */

:host {
  display: block;
  width: 100%;
}

.z-table__wrapper {
  overflow-x: auto;
  border-radius: var(--z-radius-md);
}

.z-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  line-height: var(--z-line-height);
}

/* ── Header ── */

.z-table__th {
  /* [WHY] 紧凑商务风表头（REQ-010）：12/16 → 6/12 */
  padding: 6px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--z-color-text-secondary);
  background: var(--z-color-bg-secondary);
  border-bottom: 2px solid var(--z-color-border);
  white-space: nowrap;
  user-select: none;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-table__th--sortable {
  cursor: pointer;
}

.z-table__th--sortable:hover {
  background: var(--z-color-hover);
  color: var(--z-color-text);
}

.z-table__th--sorted {
  color: var(--z-color-primary);
}

/* ── Sort icon ── */

.z-table__sort-icon {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 4px;
  vertical-align: middle;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
}

.z-table__th--sorted-asc .z-table__sort-icon {
  border-bottom: 5px solid var(--z-color-primary);
  border-top: none;
}

.z-table__th--sorted-desc .z-table__sort-icon {
  border-top: 5px solid var(--z-color-primary);
  border-bottom: none;
}

.z-table__th--sortable:not(.z-table__th--sorted) .z-table__sort-icon {
  border-top: 5px solid var(--z-color-gray-300);
  border-bottom: none;
}

/* ── Body cells ── */

.z-table__td {
  /* [WHY] 紧凑商务风单元格（REQ-010）：12/16 → 8/12 */
  padding: 8px 12px;
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-bg);
  transition: background var(--z-transition-fast);
}

.z-table__row:last-child .z-table__td {
  border-bottom: none;
}

/* ── Alignment ── */

.z-table__cell--center {
  text-align: center;
}

.z-table__cell--right {
  text-align: right;
}

/* ── Button group in cells ── */

/* [WHY] 操作列常用: 按钮/图标按钮水平排列并垂直居中, 见 [[REQ-001]] */
.z-table__btn-group {
  display: inline-flex;
  align-items: center;
  gap: var(--z-space-2);
}

.z-table__btn-group z-button {
  line-height: 0;
}

/* ── Striped ── */

.z-table--striped .z-table__row:nth-child(even) .z-table__td {
  background: var(--z-color-bg-secondary);
}

/* ── Bordered ── */

.z-table--bordered {
  border: 1px solid var(--z-color-border);
}

.z-table--bordered .z-table__th {
  border: 1px solid var(--z-color-border);
}

.z-table--bordered .z-table__td {
  border: 1px solid var(--z-color-border);
}

/* ── Small size ── */

.z-table--sm .z-table__th,
.z-table--sm .z-table__td {
  padding: var(--z-space-1-5) var(--z-space-3);
  font-size: var(--z-font-size-xs);
}

/* ── States ── */

.z-table__empty-cell,
.z-table__loading-cell {
  padding: var(--z-space-8) var(--z-space-4);
  text-align: center;
  color: var(--z-color-text-secondary);
}

.z-table--loading .z-table__body {
  opacity: 0.6;
  pointer-events: none;
}

/* ── Row hover ── */

.z-table__row:hover .z-table__td {
  background: var(--z-color-hover-subtle);
}

.z-table--striped .z-table__row:hover .z-table__td {
  background: var(--z-color-hover);
}

/* ── 键盘焦点 ── */
/* [WHY 必须有这一条] 表头与单元格现在都能通过 Tab / 方向键到达，但浏览器对
   \`<td>\` / \`<th>\` 的默认焦点圈在表格里几乎看不见（内层表格线把它切掉一半）。
   没有可见焦点时，键盘用户会以为「按了没反应」—— 而实际上焦点已经在动了。
   outline-offset 用负值：表格边框贴着单元格，正的偏移会画到相邻单元格上。 */
.z-table__th:focus-visible,
.z-table__td:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: -2px;
}
`;var V=Object.defineProperty,p=(s,e,t,r)=>{for(var n=void 0,a=s.length-1,o;a>=0;a--)(o=s[a])&&(n=o(e,t,n)||n);return n&&V(e,t,n),n};const w=class w extends g{constructor(){super(...arguments),this.columns=[],this.data=[],this.sortKey="",this.sortDir="asc",this.striped=!1,this.bordered=!1,this.size="md",this.loading=!1,this.emptyText=k.empty,this.loadingText=k.loading,this._refocusThKey=null,this._onHeadKey=e=>{const t=e,r=t.target.closest(".z-table__th--sortable");if(r){if(t.key==="Enter"||t.key===" "){if(!r.dataset.key)return;t.preventDefault(),this._sortBy(r.dataset.key);return}D(this._sortableHeads(),r,t.key,{wrap:!1,axis:"horizontal"})&&t.preventDefault()}},this._onCellKey=e=>{const t=e,r=L(t.key,t);if(!r)return;const n=t.target.closest(".z-table__td");if(!n)return;const a={row:Number(n.dataset.row),col:Number(n.dataset.col)};if(Number.isNaN(a.row)||Number.isNaN(a.col))return;const o=Array.from(this.shadowRoot.querySelectorAll(".z-table__td[data-row]")),h={rows:Math.max(...o.map(z=>Number(z.dataset.row)))+1,cols:this.columns.length},d=N(a,r,h);if(t.preventDefault(),T(d,a))return;const u=o.find(z=>Number(z.dataset.row)===d.row&&Number(z.dataset.col)===d.col);$(u??null,o)},this._onHeadClick=e=>{const t=e.target.closest(".z-table__th--sortable");if(!t)return;const r=t.dataset.key;r&&this._sortBy(r)}}render(){const e=["z-table",this.striped?"z-table--striped":"",this.bordered?"z-table--bordered":"",`z-table--${this.size}`,this.loading?"z-table--loading":""].filter(Boolean).join(" "),t=this._getSortedData();return c`
      <div class="z-table__wrapper" part="wrapper">
        <table class="${e}" part="table">
          <thead class="z-table__head" part="head">
            <tr>${this._renderHeaders()}</tr>
          </thead>
          <tbody class="z-table__body" part="body">
            ${this.loading?c`<tr class="z-table__loading-row"><td colspan="${this.columns.length||1}" class="z-table__loading-cell" part="loading">${b(this.loadingText)}</td></tr>`:t.length===0?c`<tr class="z-table__empty-row"><td colspan="${this.columns.length||1}" class="z-table__empty-cell" part="empty">${b(this.emptyText)}</td></tr>`:t.map((r,n)=>this._renderRow(r,n)).join("")}
          </tbody>
        </table>
      </div>
    `}updated(){const e=this.shadowRoot.querySelector(".z-table__head");e&&!e.__sortBound&&(e.addEventListener("click",this._onHeadClick),e.addEventListener("keydown",this._onHeadKey),e.__sortBound=!0);const t=this.shadowRoot.querySelector(".z-table__body");t&&!t.__navBound&&(t.addEventListener("keydown",this._onCellKey),t.__navBound=!0),this._restoreHeadFocus()}_restoreHeadFocus(){const e=this._refocusThKey;if(!e)return;this._refocusThKey=null;const t=this.shadowRoot.querySelector(`.z-table__th[data-key="${e}"]`);t&&$(t,this._sortableHeads())}_sortableHeads(){return Array.from(this.shadowRoot.querySelectorAll(".z-table__th--sortable"))}_sortBy(e){this._refocusThKey=e,this.sortKey===e?this.sortDir=this.sortDir==="asc"?"desc":"asc":(this.sortKey=e,this.sortDir="asc"),this.emit("z-sort",{key:this.sortKey,dir:this.sortDir})}_renderHeaders(){let e=!0;return this.columns.map(t=>{const r=!!t.sortable&&e;return r&&(e=!1),this._renderHeader(t,r)}).join("")}_renderHeader(e,t=!1){const r=this.sortKey===e.key,n=e.align??"left",a=e.sortable?"z-table__th--sortable":"",o=r?`z-table__th--sorted z-table__th--sorted-${this.sortDir}`:"",h=`z-table__cell--${n}`,d=e.width?` style="width:${e.width}"`:"",u=r?this.sortDir==="asc"?"ascending":"descending":e.sortable?"none":null;return c`
      <th class="z-table__th ${a} ${o} ${h}"${d} data-key="${e.key}" part="header-cell" scope="col"
        ${u?`aria-sort="${u}"`:""}${e.sortable?` tabindex="${t?"0":"-1"}"`:""}>
        ${b(e.header)}
        ${e.sortable?c`<span class="z-table__sort-icon" part="sort-icon" aria-hidden="true"></span>`:""}
      </th>
    `}_renderRow(e,t){const r=this.columns.map((n,a)=>{const o=`z-table__cell--${n.align??"left"}`,h=n.render?n.render(e[n.key],e,t):b(e[n.key]);return c`<td class="z-table__td ${o}" part="cell" data-row="${t}" data-col="${a}"${t===0&&a===0?' tabindex="0"':' tabindex="-1"'}>${h}</td>`}).join("");return c`<tr class="z-table__row" part="row">${r}</tr>`}_getSortedData(){return!this.sortKey||!this.data.length?this.data:[...this.data].sort((e,t)=>{const r=e[this.sortKey],n=t[this.sortKey];if(r==null&&n==null)return 0;if(r==null)return 1;if(n==null)return-1;const a=r<n?-1:r>n?1:0;return this.sortDir==="desc"?-a:a})}};w.styles=F;let i=w;p([l({type:Array,attribute:!1})],i.prototype,"columns");p([l({type:Array,attribute:!1})],i.prototype,"data");p([l({type:String})],i.prototype,"sortKey");p([l({type:String})],i.prototype,"sortDir");p([l({type:Boolean})],i.prototype,"striped");p([l({type:Boolean})],i.prototype,"bordered");p([l({type:String})],i.prototype,"size");p([l({type:Boolean})],i.prototype,"loading");p([l({type:String})],i.prototype,"emptyText");p([l({type:String})],i.prototype,"loadingText");customElements.define("z-table",i);R.init();A();const S=document.getElementById("crumb");S.items=[{label:"首页",href:"#dashboard"},{label:"业务管理"},{label:"仪表盘"}];S.addEventListener("z-select",s=>{console.log("breadcrumb select:",s.detail)});const C=document.getElementById("orders-table"),M={已完成:"success",处理中:"warning",草稿:"default"};C.columns=[{key:"no",header:"订单号"},{key:"customer",header:"客户"},{key:"amount",header:"金额",align:"right"},{key:"status",header:"状态",align:"center",render:s=>`<z-badge tone="${M[s]||"default"}">${s}</z-badge>`}];C.data=[{no:"SO-2026-0811-001",customer:"华东装备",amount:"¥ 128,000",status:"已完成"},{no:"SO-2026-0811-002",customer:"北方重工",amount:"¥ 56,400",status:"处理中"},{no:"SO-2026-0811-003",customer:"南方精机",amount:"¥ 89,200",status:"草稿"}];const H=document.getElementById("shell"),B=document.getElementById("collapse-btn-footer"),K=()=>{H.dispatchEvent(new CustomEvent("z-sidebar-toggle",{bubbles:!0,composed:!0}))};document.getElementById("collapse-btn").addEventListener("z-click",K);B.addEventListener("z-click",K);H.addEventListener("z-collapse-change",s=>{B.textContent=s.detail.collapsed?"展开菜单":"收起菜单"});document.querySelectorAll(".demo-menu__link").forEach(s=>{s.addEventListener("click",()=>{document.querySelectorAll(".demo-menu__link").forEach(e=>e.classList.remove("active")),s.classList.add("active")})});
