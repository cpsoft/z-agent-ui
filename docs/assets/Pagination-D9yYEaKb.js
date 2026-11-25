import{B as q,e as m,h as g,p as d}from"./presets-CdaBrvJF.js";import{h as Tt,d as At,o as $t}from"./a11y-DJ6wHu5s.js";import{C as w}from"./copy-DoHMT7Ic.js";import"./Position-D6zl9ryN.js";import{r as Et,g as Ot,a as Rt,s as Mt,b as U}from"./roving-DMg3clv6.js";import{P as Nt}from"./PointerDragSession-D3R9IvJB.js";import{c as Lt}from"./Input-wCelPXsT.js";function Wt(r){return Number.isFinite(r)?Number(r.toPrecision(12)):r}const Dt=`/* ===== z-column-selector ===== */

:host {
  display: inline-block;
  position: relative;
}

.z-colsel__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  /* [WHY 24px 正方形 + 透明边框] 这是表格工具栏里的**动作**，不是表单控件：
     表单控件要靠边框说明"这里能输入"，工具栏按钮靠图标和 hover 反馈即可。
     带边框的胶囊放在右上角会比表头还抢眼 —— 2026-10-26 反馈「太大太难看」正是这个。
     尺寸跟 --z-control-h-xs 走（默认 24 / 紧凑 22），与工具栏同一节奏。
     透明边框是给 hover 预留位置，避免悬停时按钮跳动 1px。 */
  box-sizing: border-box;
  height: var(--z-control-h-xs);
  min-width: var(--z-control-h-xs);
  padding: 0;
  color: var(--z-color-text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  cursor: pointer;
  line-height: 1;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-colsel__trigger:hover {
  background: var(--z-color-hover-subtle);
  color: var(--z-color-text);
}

/* 展开态用实一档的反馈底：下拉开着却看不出"是它打开的"，用户会以为点空了 */
.z-colsel__trigger[aria-expanded="true"] {
  background: var(--z-color-hover);
  color: var(--z-color-text);
}

.z-colsel__icon {
  display: block;
  flex: none;
}

/* 需要文字的宿主（showlabel）：左右留白 + 常规字号 */
.z-colsel--label .z-colsel__trigger {
  padding: 0 8px;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
}

.z-colsel__text {
  white-space: nowrap;
}

/* [WHY] 键盘可达性: 触发按钮需可见焦点环, 见 [[REQ-001]] 无障碍要求 */
.z-colsel__trigger:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 1px;
}

.z-colsel__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  /* [WHY] 字段较多时多列展示: min-width 保底 2 列(小屏不超视口), max-width 不超过 1/3 屏幕 */
  /* [WHY] border-box: 让 max-width 计入 padding, 总宽严格不超过 1/3 视口 */
  box-sizing: border-box;
  min-width: min(300px, 90vw);
  max-width: 33.333vw;
  max-height: 280px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
  gap: 2px 8px;
  background: var(--z-color-popover);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  box-shadow: var(--z-shadow-lg);
  z-index: 100;
  padding: var(--z-space-1) 6px;
  /* [WHY] 自然交互: 下拉以淡入+轻微位移进入, 150ms 符合微交互时长规范 */
  animation: z-colsel-in var(--z-duration-fast) var(--z-ease-standard);
  transform-origin: top right;
}

@keyframes z-colsel-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.z-colsel__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  /* [WHY] 网格内超长标题单行截断, 完整文本以悬浮 title 呈现 */
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--z-font-size-xs);
  font-family: var(--z-font-sans);
  color: var(--z-color-text);
  cursor: pointer;
  user-select: none;
  transition: background var(--z-transition-fast);
}

.z-colsel__item:hover {
  background: var(--z-color-hover-subtle);
}

/* [WHY] required 字段: 不可取消勾选, 置灰提示; hover 不高亮 */
.z-colsel__item--required,
.z-colsel__item--required:hover {
  cursor: default;
  background: transparent;
  color: var(--z-color-text-secondary);
}

.z-colsel__checkbox {
  width: 14px;
  height: 14px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--z-color-primary);
  flex-shrink: 0;
}

.z-colsel__checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* [WHY] 键盘可达性: 复选框需可见焦点环 */
.z-colsel__checkbox:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 1px;
}

.z-colsel__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.z-colsel__lock {
  color: var(--z-color-text-disabled);
  margin-left: auto;
  flex-shrink: 0;
}

/* [WHY] reduced-motion: 关闭下拉进入动画降速 */
@media (prefers-reduced-motion: reduce) {
  .z-colsel__dropdown {
    animation: none;
  }
}
`;var Ht=Object.defineProperty,N=(r,t,n,e)=>{for(var o=void 0,s=r.length-1,i;s>=0;s--)(i=r[s])&&(o=i(t,n,o)||o);return o&&Ht(t,n,o),o};function D(r){return!r||typeof r!="object"?!1:r.tagName==="Z-REPORT-TABLE"}let It=0;function nt(r){if(!D(r))return!1;const t=r;return Array.isArray(t.columns)&&typeof t.toggleColumn=="function"}const J=class J extends q{constructor(){super(...arguments),this.open=!1,this.columnsText=w.columns,this.requiredColumnText=w.requiredField,this.showLabel=!1,this.for="",this.target=null,this._eventsBound=!1,this._pendingFocusKey=null,this._pendingReturnFocus=!1,this._uid=`z-colsel-${++It}`,this._docBound=!1,this._retryTimer=null,this._onDocMouseDown=t=>{if(!this.open)return;const n=t.composedPath();if(n.includes(this))return;const e=this._findAncestorTable();e&&n.includes(e)||this._setOpenByUser(!1)},this._onDocKeydown=t=>{if(t.key==="Escape"&&this.open){const n=this._focusWithin();this._setOpenByUser(!1),n&&(this._pendingReturnFocus=!0)}},this._onShadowClick=t=>{t.target.closest(".z-colsel__trigger")&&(t.stopPropagation(),this._setOpenByUser(!this.open))},this._onShadowChange=t=>{const n=t.target;if(!n.classList.contains("z-colsel__checkbox"))return;const e=this._getSource();if(!e)return;const o=n.dataset.key,s=e.columns.find(i=>i.key===o);!s||s.required||(e.toggleColumn(o),this.emit("z-column-visibility-change",{key:o,visible:!s.hidden}),this._pendingFocusKey=o,this.requestUpdate())}}connectedCallback(){super.connectedCallback(),this._docBound||(document.addEventListener("mousedown",this._onDocMouseDown),document.addEventListener("keydown",this._onDocKeydown),this._docBound=!0)}disconnectedCallback(){this._retryTimer&&(clearTimeout(this._retryTimer),this._retryTimer=null),this._docBound&&(document.removeEventListener("mousedown",this._onDocMouseDown),document.removeEventListener("keydown",this._onDocKeydown),this._docBound=!1),super.disconnectedCallback()}_targetElement(){if(this.target&&D(this.target))return this.target;if(this.for){const t=document.getElementById(this.for);if(t&&D(t))return t}return this._findAncestorTable()}_findAncestorTable(){let t=this.parentNode;for(;t;)if(t instanceof ShadowRoot){const n=t.host;if(D(n))return n;t=n.parentNode}else{if(D(t))return t;t=t.parentNode}return null}_scheduleSourceRetry(){this._retryTimer||(this._retryTimer=setTimeout(()=>{this._retryTimer=null,!(!this.isConnected||!this.for)&&this.requestUpdate()},250))}_getSource(){const t=this._targetElement();return t&&nt(t)?t:null}_setOpenByUser(t){this.open!==t&&(this.open=t,this.emit(t?"z-column-selector-open":"z-column-selector-close"))}_focusWithin(){return Tt(this,At())}render(){const t=this._targetElement();if(!t)return this.for&&this._scheduleSourceRetry(),"";const n=nt(t)?t:null,e=`${this._uid}-dropdown`,o=((n==null?void 0:n.columns)??[]).map(s=>g`
      <label class="z-colsel__item ${s.required?"z-colsel__item--required":""}"
             part="column-selector-item"
             ${s.required?`title="${m(this.requiredColumnText)}"`:""}>
        <input type="checkbox" class="z-colsel__checkbox"
               data-key="${m(s.key)}"
               ${!s.hidden||s.required?"checked":""}
               ${s.required?"disabled":""}
               part="column-selector-checkbox" />
        <span class="z-colsel__label">${m(s.title)}</span>
        ${s.required?g`<svg class="z-colsel__lock" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`:""}
      </label>
    `).join("");return g`
      <div class="z-colsel ${this.open?"z-colsel--open":""} ${this.showLabel?"z-colsel--label":""}" part="column-selector">
        <button type="button" class="z-colsel__trigger" part="column-selector-trigger"
                title="${m(this.columnsText)}" aria-label="${m(this.columnsText)}"
                aria-expanded="${this.open?"true":"false"}"
                aria-controls="${e}">
          <!-- [WHY 用"表格分栏"图标而不是竖排三点] 三点图标读作「更多操作」，放在表格右上角
               会让用户以为打开的是行操作菜单。这张是表格 + 竖向分栏，语义直给"列"。 -->
          <svg class="z-colsel__icon" width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>
          ${this.showLabel?g`<span class="z-colsel__text">${m(this.columnsText)}</span>`:""}
        </button>
        ${this.open?g`<div class="z-colsel__dropdown" part="column-selector-dropdown"
                   id="${e}" role="group" aria-label="${m(this.columnsText)}">${o}</div>`:""}
      </div>
    `}updated(){this._bindEvents(),this._restoreFocus(),this._returnFocusToTrigger()}_returnFocusToTrigger(){var t,n;this._pendingReturnFocus&&(this._pendingReturnFocus=!1,!this.open&&((n=(t=this.shadowRoot)==null?void 0:t.querySelector(".z-colsel__trigger"))==null||n.focus()))}_restoreFocus(){var e;const t=this._pendingFocusKey;if(!t||(this._pendingFocusKey=null,!this.open))return;const n=(e=this.shadowRoot)==null?void 0:e.querySelectorAll(".z-colsel__checkbox");for(const o of Array.from(n??[]))if(o.dataset.key===t){o.focus();return}}_bindEvents(){if(this._eventsBound)return;const t=this.shadowRoot;t&&(t.addEventListener("click",this._onShadowClick),t.addEventListener("change",this._onShadowChange),this._eventsBound=!0)}};J.styles=Dt;let $=J;N([d({type:Boolean})],$.prototype,"open");N([d({type:String})],$.prototype,"columnsText");N([d({type:String})],$.prototype,"requiredColumnText");N([d({type:Boolean})],$.prototype,"showLabel");N([d({type:String})],$.prototype,"for");N([d({attribute:!1})],$.prototype,"target");customElements.define("z-column-selector",$);const Ft=`/* [WHY] 2026-10-25 系统审计：从 report-table.css（672 行）按区块拆出，原文件超 600 行硬上限。
   拼接顺序见 ReportTable.ts 的 static styles，三段顺序与原文件一致（等价性已 diff 验证）。 */

/* ===== z-report-table ===== */

:host {
  /* [WHY 纵向 flex] 卡片给了高度时（\`height=\` 或编辑器里拖过），表格要在**卡片里**滚，
     而不是按内容铺开再把底部（合计行 / 分页条）挤出卡片被 \`overflow:hidden\` 裁掉。
     flex 列 + wrapper \`flex:1\` 让「表体」吃掉剩余高度 —— 父容器高度 auto 时行为不变。 */
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  /* 表头工具列宽度。与 ReportTable.ts 的 \`TOOLS_COL_WIDTH\` 同源，改一处必须改另一处 ——
     两处不一致时右冻结列会与工具列重叠（不是留缝，是叠住）。 */
  --z-rpt-tools-w: 32px;
}

/* ── Toolbar ── */

/* ── 工具列（表头最右一格：列选择器）──
   [WHY 不再是独立一行] 原来是一个 24px 图标 + 4px 间距 = 每张表固定付 28px 纵向空间，
   而宽表本来就要横滚，纵向每多一层都挤掉表体可见行数（issue IKQUWH）。
   现在它是表头的**最后一格**：不占行，也不会像「浮在表头右上」那样压住数值列（右对齐）的标题。
   宽度与 \`TOOLS_COL_WIDTH\`（ReportTable.ts）必须一致，理由见那边的注释。 */
.z-rpt__th--tools,
.z-rpt__td--tools,
.z-rpt__tf--tools {
  position: sticky;
  right: 0;
  z-index: 5;
  width: var(--z-rpt-tools-w);
  min-width: var(--z-rpt-tools-w);
  max-width: var(--z-rpt-tools-w);
  padding: 0;
  text-align: center;
  vertical-align: middle;
  /* 横滚时工具列下面会滑过其他列，背景必须不透明；inherit 让它跟随行的斑马纹/选中底色 */
  background: inherit;
}

.z-rpt__head .z-rpt__th--tools {
  background: var(--z-color-bg-secondary);
}

/* 横滚中工具格是「浮起来」的（sticky），给它一道左阴影，让「这是一层浮层」看得出来 ——
   与右冻结列的 ::after 同一手法。滚到最右时工具格回到原位，阴影消失。 */
.z-rpt__wrapper--scrolled-right .z-rpt__th--tools::before {
  content: "";
  position: absolute;
  top: 0;
  left: -8px;
  bottom: 0;
  width: 8px;
  pointer-events: none;
  background: linear-gradient(to left, rgba(0, 0, 0, 0.06), transparent);
}

/* [WHY] 列选择器已抽为独立组件 z-column-selector 自带样式, 见 [[REQ-015-column-selector]] */

/* ── Table wrapper ── */

.z-rpt__wrapper {
  position: relative;
  overflow-x: auto;
  /* 表体吃掉剩余高度：卡片给固定高度时滚动发生在这里（表头/合计行才可能 sticky），
     高度不受限时（卡片 auto）这一条不起作用，行为与旧版一致。 */
  flex: 1 1 auto;
  min-height: 0;
  border-radius: var(--z-radius-md);
  /* [WHY] 横向滚动条常驻：WebKit 靠下面定制的 ::-webkit-scrollbar 就不再走 overlay 自动隐藏，
     Firefox 没有该伪元素，只能靠 scrollbar-width/color 两个标准属性，**两者缺一不可**。
     [2026-10-26] 主题语义化重构（3681bbb）曾把这两行连带删掉，注释却仍写着「Firefox 走
     scrollbar-width/color」—— 注释比代码可信时最难查，故由
     tests/unit/report-table-scrollbar.test.ts 逐字守住。
     色值取 --z-color-track-strong，与 WebKit 的 thumb 同源，避免两个引擎滑块深浅不一。 */
  scrollbar-width: thin;
  scrollbar-color: var(--z-color-track-strong) transparent;
}

.z-rpt {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-family: var(--z-font-sans);
  /* [WHY] 用字号 token（默认 13px）而非字面量：密度档下要能一起缩到 12px。
     line-height 早已是 --z-line-height，字号却是写死的 —— 两者不同步时，
     行盒只跟 line-height 走，字数变多行距反而看着变宽。 */
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  line-height: var(--z-line-height);
  table-layout: fixed;
}

/* ── Header ── */

.z-rpt__head .z-rpt__th {
  /* [WHY] sticky: wrapper 纵向滚动时表头吸附顶部; sticky 同样为绝对定位子元素
     (resize handle) 建立包含块, 不影响拖拽, 见 [[bug-20260717-rpt-header-sticky]] */
  position: sticky;
  top: 0;
  z-index: 3;
  padding: var(--z-space-1-5) var(--z-space-3);
  /* [WHY] 中文报表习惯: 表头默认居中, 显式指定对齐的列跟随 */
  text-align: center;
  font-weight: 600;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  background: var(--z-color-bg-secondary);
  /* [WHY] 商务严谨: 2px 表头分隔线强化报表头部层级 */
  border-bottom: 2px solid var(--z-color-border);
  white-space: nowrap;
  user-select: none;
  box-sizing: border-box;
  vertical-align: middle;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

/* ── Sortable ── */

.z-rpt__th--sortable {
  cursor: pointer;
}

.z-rpt__th--sortable:hover {
  background: var(--z-color-hover);
  color: var(--z-color-text);
}

.z-rpt__th--sorted {
  color: var(--z-color-primary);
}

/* ── Sort icon (SVG chevron) ── */

.z-rpt__sort-icon {
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
  line-height: 0;
}

.z-rpt__sort-chevron {
  display: none;
  transition: color var(--z-transition-fast), transform var(--z-transition-fast);
}

/* 未排序: 显示淡色降序占位, hover 加深提示可排序 */
.z-rpt__th--sortable:not(.z-rpt__th--sorted) .z-rpt__sort-chevron--desc {
  display: inline-block;
  color: var(--z-color-gray-300);
}

.z-rpt__th--sortable:not(.z-rpt__th--sorted):hover .z-rpt__sort-chevron--desc {
  color: var(--z-color-gray-500);
}

.z-rpt__th--sorted-asc .z-rpt__sort-chevron--asc {
  display: inline-block;
  color: var(--z-color-primary);
}

.z-rpt__th--sorted-desc .z-rpt__sort-chevron--desc {
  display: inline-block;
  color: var(--z-color-primary);
}

/* ── Multi-sort order badge ── */

.z-rpt__sort-order {
  display: inline-block;
  width: 16px;
  height: 16px;
  margin-left: 2px;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: var(--z-color-white);
  /* [WHY] 10px 白字压 primary：暗色下 3.68 严重不够，走 solid 层（5.17） */
  background: var(--z-color-primary-solid);
  border-radius: 50%;
  vertical-align: middle;
}

/* ── Editable: column config dropdown ── */

.z-rpt__th-config {
  position: relative;
  display: inline-block;
  margin-left: 4px;
  vertical-align: middle;
}

.z-rpt__th-config-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-rpt__th-config-btn:hover {
  background: var(--z-color-hover-strong);
  color: var(--z-color-text);
}

.z-rpt__th-config-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  /* [WHY] 240px: 容纳列格式区块(48px 标签 + 6 枚分段按钮), 对齐/冻结/合计不变 */
  min-width: 240px;
  padding: 6px;
  background: var(--z-color-bg);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  box-shadow: var(--z-shadow-lg);
  z-index: 100;
  animation: z-rpt-dropdown-in var(--z-duration-fast) var(--z-ease-standard);
  transform-origin: top right;
}

/* [WHY] 表头配置菜单入场动画(列选择器规则已随独立组件迁移, keyframes 仅此处引用) */
@keyframes z-rpt-dropdown-in {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.z-rpt__th-config-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px;
}

.z-rpt__th-config-align,
/* [WHY] 编辑态冻结按钮: 与对齐按钮同形(分段小按钮), 仅图标不同, 见 [[2026-08-10-rpt-freeze]] */
.z-rpt__th-config-fix {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-rpt__th-config-align:hover,
.z-rpt__th-config-fix:hover {
  background: var(--z-color-hover-subtle);
  color: var(--z-color-text);
}

.z-rpt__th-config-align--active,
.z-rpt__th-config-fix--active {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

/* [WHY] 冻结行与对齐行分组: 细分隔线区分两组功能 */
.z-rpt__th-config-row--fix {
  border-top: 1px solid var(--z-color-border);
  padding-top: 4px;
  margin-top: 4px;
}

.z-rpt__th-config-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: var(--z-font-size-xs);
  font-family: var(--z-font-sans);
  color: var(--z-color-text);
  cursor: pointer;
  user-select: none;
}

.z-rpt__th-config-item input[type="checkbox"] {
  width: 13px;
  height: 13px;
  margin: 0;
  accent-color: var(--z-color-primary);
}

/* ── Column format (小数位/千分位) ── */

/* [WHY] 格式区块与合计行分组: 细分隔线区分"外观/布局"与"数据格式"两组功能 */
.z-rpt__th-config-row--fmt {
  border-top: 1px solid var(--z-color-border);
  padding-top: 6px;
  margin-top: 6px;
  align-items: flex-start;
}

.z-rpt__th-config-fmt-label {
  flex: none;
  width: 44px;
  padding-top: 4px;
  font-size: 12px;
  font-family: var(--z-font-sans);
  color: var(--z-color-text-secondary);
}

.z-rpt__th-config-fmt-seg {
  flex: 1;
  display: flex;
  gap: 4px;
  min-width: 0;
}

/* [WHY] 分段按钮: 与对齐/冻结按钮同形同态, 选中项主色描边, 见 [[2026-08-10-rpt-freeze]] */
.z-rpt__th-config-fmt {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  min-width: 0;
  padding: 0 2px;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: var(--z-color-text-secondary);
  font-size: 12px;
  font-family: var(--z-font-sans);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-rpt__th-config-fmt:hover {
  background: var(--z-color-hover-subtle);
  color: var(--z-color-text);
}

.z-rpt__th-config-fmt--active {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

/* ── Editable: column reorder ── */

.z-rpt__th--draggable {
  cursor: grab;
}

.z-rpt__th--draggable:active {
  cursor: grabbing;
}

/* [WHY] 拖拽落点反馈: 左侧 3px 主色竖线指示插入位置 */
.z-rpt__th--drag-over {
  box-shadow: inset 3px 0 0 var(--z-color-primary);
}

/* ── Resize handle ── */

.z-rpt__resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 6px;
  cursor: col-resize;
  z-index: 1;
  touch-action: none;
}

.z-rpt__resize-handle::after {
  content: "";
  position: absolute;
  top: 30%;
  bottom: 30%;
  right: 0;
  width: 1px;
  background: var(--z-color-border);
  transition: background var(--z-transition-fast), width var(--z-transition-fast);
}

.z-rpt__resize-handle:hover::after,
/* [WHY] 自然交互: 拖拽过程中保持分隔线高亮, 反馈"正在调整列宽" */
.z-rpt--resizing .z-rpt__resize-handle::after {
  width: 2px;
  background: var(--z-color-primary);
}


/* ── 列口径角标（tip）：见 ReportTable._renderHeaderTip ──
   ? 用伪元素画：文本节点会让 th.textContent 变成「物料编码?」，
   全仓按列名匹配的分支（列设置 / 测试 / 校验脚本）会静默失效。 */
.z-rpt__th-tip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  border: 1px solid var(--z-color-gray-400);
  border-radius: 50%;
  color: var(--z-color-gray-400);
  cursor: help;
  transition: color var(--z-transition-fast), border-color var(--z-transition-fast);
}

.z-rpt__th-tip::before {
  content: "?";
  font-family: var(--z-font-sans);
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
}

/* [WHY 悬停整格也点亮角标] 12px 的点太小，用户会先悬停列名；
   整格 hover 时角标跟着变色，才形成「这里有个可以问的东西」的引导。 */
.z-rpt__th-tip:hover,
.z-rpt__th--sortable:hover .z-rpt__th-tip {
  color: var(--z-color-primary);
  border-color: var(--z-color-primary);
}

.z-rpt--sm .z-rpt__th-tip {
  width: 11px;
  height: 11px;
}

/* 口径说明的读屏副本：不占位不可见，仅供表头 aria-describedby 引用 */
.z-rpt__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* [WHY] 横向滚动条必须常驻可见 —— macOS / 触控板默认是覆盖式滚动条，不滚动时完全隐藏，
   宽表右侧列被切时用户看不出「右边还有内容」（生产截图里状态胶囊被裁一半即此类误判）。
   WebKit 一旦定制 ::-webkit-scrollbar 就不再走 overlay 自动隐藏；Firefox 走
   scrollbar-width/color。高度 10px + 透明轨道，不占视觉重量但始终在场。 */
.z-rpt__wrapper::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}
.z-rpt__wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.z-rpt__wrapper::-webkit-scrollbar-thumb {
  background: var(--z-color-track-strong);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: content-box;
}
.z-rpt__wrapper::-webkit-scrollbar-thumb:hover {
  /* [保留 primitive] 滑块本体是 \`-track-strong\`（gray-300），hover 再深一档 = gray-400；
     语义层没有「比轨道再深一档」的角色。若强行复用 -track-strong，hover 将**没有反馈**
     （同色）。标准 3.1 允许此降级，原因即本条注释。 */
  background: var(--z-color-gray-400);
  background-clip: content-box;
}

/* ── 键盘焦点（2026-11-16）────────────────────────────────
   [WHY 必须有这一条] 表头与单元格现在都能通过 Tab / 方向键到达，但浏览器对
   \`<td>\` / \`<th>\` 的默认焦点圈在表格里几乎看不见（内层表格线把它切掉一半）。
   没有可见焦点时，键盘用户会以为「按了没反应」—— 而焦点其实已经在动了。
   outline-offset 取负值：表格边框贴着单元格，正偏移会画到相邻单元格上。
   与 \`z-table\` 的同一处样式保持逐像素一致（两张表手感必须一样）。 */
.z-rpt__th:focus-visible,
.z-rpt__td:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: -2px;
}
`,Kt=`/* 分组表头（\`col group=\`，issue IKX0CE P1-5）单独一册。
   [WHY 不留在 report-table.css] 那个文件卡在行数基线上（只减不增），而这条能力要
   两行表头的 sticky 偏移、组间竖线、组头底色三组规则。混进去就得为了腾地方删别的
   注释，而那些注释都在解释「为什么是这样」——比这册文件更难复原。 */

/* ── 分组表头（\`col group=\`，issue IKX0CE P1-5）──

   两行表头：组头行在上、列名行在下。两行都是 \`position: sticky\`，所以 \`top\` 必须错开 ——
   都写 \`top: 0\` 就会在同一处重叠（纵向滚动时组头压住列名，整张表看起来「没有列名」）。

   [WHY 用定高而不是 JS 量出来再回写] 组头行是单行 \`nowrap\` 文本，高度只由
   \`--z-rpt-group-row-h\` 一处决定；量一遍再回写会多一次强制布局，而且首帧会跳。
   两行之间只差这一个偏移，值得用一个变量把它锁住。 */
.z-rpt--grouped {
  --z-rpt-group-row-h: 28px;
}
.z-rpt__headrow--group .z-rpt__th {
  top: 0;
  height: var(--z-rpt-group-row-h);
  padding-block: 0;
  /* 组头下面的线是「组内继续」，不该是 2px 的强分隔 —— 强分隔属于列名行 */
  border-bottom: 1px solid var(--z-color-border);
  color: var(--z-color-text);
  background: var(--z-color-bg-tertiary);
}
.z-rpt__headrow--cols .z-rpt__th {
  top: var(--z-rpt-group-row-h);
}
/* 组与组之间一条竖线：没有它，30 天的组头和隔壁「合计」组头连成一片，只能靠猜 */
.z-rpt__th--group {
  border-left: 1px solid var(--z-color-border);
  text-overflow: ellipsis;
  overflow: hidden;
}
.z-rpt__headrow--group > .z-rpt__th--group:first-of-type {
  border-left: none;
}

/* ── 组头色相（\`col group-tone=\`）──

   三件事一起做，只做一半会显得脏：
   1. 组头底色（12% 色相压在 tertiary 上）+ 文字同色相 —— 让「这一组到哪儿为止」一眼可数；
   2. 组间竖线跟着色相（55%）—— 纯灰线在彩底之间会消失；
   3. 字重 600 —— 组名是「分类标签」不是数据，靠颜色之外还得靠重量站住。

   [WHY 独立一套色相名而不是 dangerously 那套语义色] 这两个问题不一样：
   分类色回答「它属于哪一组」（订货组是紫的，跟好坏无关），语义色回答「要不要处理」。
   把订货组染成 danger，等于整张表在报警。zWorker 业绩页的 \`g-sales/g-order/ratio-col\`
   也是这个分法（蓝 / 紫 / 青），不随数据变化。

   [WHY color-mix 而不是另存一组 12% 的浅色变量] 主题切换（深色）时底色必须跟着
   \`--z-color-bg-tertiary\` 走；把 mix 写死成浅色 hex，深色主题下组头会变成一块亮斑。 */
.z-rpt__th--group[data-group-tone] {
  color: var(--z-rpt-grp);
  font-weight: 600;
  background: color-mix(in srgb, var(--z-rpt-grp) 12%, var(--z-color-bg-tertiary));
}
/* 色相变量挂在 \`[data-group-tone]\` 本身、不再限定组头格：组内列名格也要解析到它
   （见下面「组色贯穿整块表头」）。只限定 \`--group\` 会让列名格 background 里那个
   \`var(--z-rpt-grp)\` 落空 —— 整条声明失效，底色静默变回灰底，而没有任何报错。 */
.z-rpt__th[data-group-tone="blue"] {
  --z-rpt-grp: var(--z-color-blue-600);
}
.z-rpt__th[data-group-tone="purple"] {
  --z-rpt-grp: var(--z-color-purple-500);
}
.z-rpt__th[data-group-tone="green"] {
  --z-rpt-grp: var(--z-color-green-600);
}
.z-rpt__th[data-group-tone="yellow"] {
  --z-rpt-grp: var(--z-color-yellow-700);
}
.z-rpt__th[data-group-tone="red"] {
  --z-rpt-grp: var(--z-color-red-600);
}
.z-rpt__th[data-group-tone="gray"] {
  --z-rpt-grp: var(--z-color-gray-600);
}

/* ── 组色贯穿整块表头（2026-11-23）──

   组头一格染 12% 时，下面 5~8 个列名格还是灰底 —— 色带在组头下沿就断了，28 列的表里
   「这一组从哪儿到哪儿」又退回靠猜。zWorker 原版是单层表头（每个 \`thead th\` 都带组色底），
   这里两行，就把列名行按组继承。

   [WHY 与组头同一个浓度、而不是更淡一档] 试过 8%：深色主题下 tertiary 是 #334155，
   8% 的紫只把 R 从 0.200 抬到 0.236 —— 肉眼分不出，等于没做。同浓度才是「一个块」：
   组头行靠字重 600 + 同色相文字与列名行区分，不靠底色深浅。
   [WHY 只染底不染字] 列名染色会让人以为「这一列有问题」；原版也只有组名前缀上色
   （\`.th-grp.sales\`），列名本体是默认色。 */
.z-rpt__headrow--cols .z-rpt__th[data-group-tone] {
  background: color-mix(in srgb, var(--z-rpt-grp) 12%, var(--z-color-bg-tertiary));
}

/* 组边界：组头行的组格与列名行的组首列是**同一条线**，宽度与浓度必须一致，
   否则竖线在两行之间断成两截，看着像两处独立的错位。 */
.z-rpt__th--group[data-group-tone],
.z-rpt__th--group-start[data-group-tone] {
  border-left: 2px solid color-mix(in srgb, var(--z-rpt-grp) 55%, transparent);
}
/* 与组头行同一条规矩：首组的左边不画线（左边是跨两行的日期格，画上去就是双线） */
.z-rpt__headrow--cols > .z-rpt__th--group-start:first-child {
  border-left: none;
}

`,Pt=`/* 列渲染产出的类 —— 只补 \`format=badge\` 与 \`format=progress\`（issue IKUE1E / IKUC2E）。
 *
 * [WHY 单独一个文件，而不是写进 page-view.css]
 * 每个组件（BaseElement）都 \`attachShadow\`，样式按 **shadow root** 隔离。
 * 表格单元格是 \`<z-report-table>\` 在自己的 shadow 里渲染的，因此
 * \`page-view.css\` 里的规则**一条都进不来** —— 而 \`page-view.css\` 实际只被
 * PageEditor 引入（编辑器画布用）。运行时页面上，\`format=badge\` 的
 * \`is-badge\` 从来没有任何样式，这正是「写了等于没写」的真正原因。
 *
 * [2026-11-18 补上 .is-danger 等纯语义色] 原先这里写着「那是 \`tone=\` 用的，表格侧从建表
 * 起就没有过它们，补上会改变存量观感」。那句话在当时是对的（\`tone=\` 只有九个业务语义，
 * 表格里根本没输出过这些 class）；issue IKUZL3 之后渲染器真的开始往单元格里写
 * \`is-danger\`，于是「有 class 没样式」变成了新的静默失效。详见下面「单元格里的语义色」。
 */

/* ── 胶囊（format=badge）── */
/*
 * [WHY 必须有底色] 只给圆角与内边距时，胶囊与纯文本在视觉上几乎没差别，
 * 读者会以为「这列没配格式」。中性底兜住「没写 badge-tone」的列。
 */
.is-badge {
  display: inline-block;
  padding: 0 6px;
  border-radius: var(--z-radius-sm);
  font-size: var(--z-font-size-xs);
  line-height: 18px;
  background: var(--z-color-bg-secondary);
  color: var(--z-color-text-secondary);
  /* 状态列是「已订 / 未订」这类双字词，不能被表格的 nowrap 或省略号截掉 */
  white-space: nowrap;
}

/* 按值配色（\`badge-tone=[0:danger, 1:muted]\`）。色名白名单在 render-data.ts，
   这里只负责「已经被允许的这五个色名长什么样」。 */
.is-badge.is-danger {
  color: var(--z-color-danger-strong);
  background: var(--z-color-danger-soft);
}

.is-badge.is-warning {
  color: var(--z-color-warning-strong);
  background: var(--z-color-warning-soft);
}

.is-badge.is-success {
  color: var(--z-color-success-strong);
  background: var(--z-color-success-soft);
}

.is-badge.is-muted {
  color: var(--z-color-text-secondary);
  background: var(--z-color-bg-secondary);
}

.is-badge.is-primary {
  color: var(--z-color-primary-strong);
  background: var(--z-color-primary-soft);
}

/* ── 并进同一个格子的徽标组（issue IKUXAD）── */
/*
 * \`col 任务 "任务名" badges=[异议, 作废]\` —— 被点名的列渲染在这个容器里，
 * 跟在主值后面。容器用 inline-flex 而不是 inline-block：胶囊之间要有间隙，
 * 且窄列时允许换行（宁可多占一行，也不要把最后一个胶囊截掉半个字）。
 *
 * \`vertical-align: middle\` 是为了与主文本的基线对齐 —— 默认 baseline 会把胶囊
 * 压到字的下缘，看起来像下划线。
 */
.zp-cell__badges {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

/* ── 行底色（\`row-tone-field\` + \`row-tone=\`，issue IKUZL4）──
 *
 * class 由 \`rowToneClassOf\`（page/render/format.ts）按行取值给出，白名单就是
 * \`tone\` 那五个色名 —— 值来自数据，不做白名单就是一条「数据 → class 属性」的注入通道。
 *
 * [WHY 染 td 而不是染 tr] 冻结列的 td 自己带 \`position: sticky\` 与背景（横向滚动时要
 * 盖住后面的列），tr 的背景在它下面看不见 —— 只染 tr 的结果是「非冻结列变色、冻结列还是白的」。
 * 同理 \`> \` 直接子选择器：嵌套表（子表卡）的内层 td 不该跟着外层的行色走。
 *
 * [WHY 用 soft 而不是 strong] 整行是阅读区域，\`-strong\` 是给实心小色块用的，
 * 铺在 42 行上会让整张表变成照片底片，反而看不出那一行是被标记的那一行。 */
.z-rpt__row.is-danger > .z-rpt__td {
  background: var(--z-color-danger-soft);
}

.z-rpt__row.is-warning > .z-rpt__td {
  background: var(--z-color-warning-soft);
}

.z-rpt__row.is-success > .z-rpt__td {
  background: var(--z-color-success-soft);
}

.z-rpt__row.is-muted > .z-rpt__td {
  background: var(--z-color-bg-secondary);
}

.z-rpt__row.is-primary > .z-rpt__td {
  background: var(--z-color-primary-soft);
}

/* ── 单元格里的语义色（\`col … tone=\`）──
 *
 * [2026-11-18 补，推翻本文件开头那条「暂不定义」的决定] 那条写于 2026-11，理由是
 * 「表格侧从建表起就没有过它们，顺手补上会改变存量观感」。之后 \`tone=\` 放开了阈值与
 * 恒色写法（issue IKUZL3），\`render-data.ts\` 会真的往单元格里输出 \`is-danger\` 这类 class
 * —— 但**一条样式都没有**。于是「逾期 13 天标红」在 PC 表格里是灰的，在 KPI 卡里是红的：
 * 同一个属性、同一份脚本，两块屏两种结果，而页面不报错。
 * 一个 class 有名字没有样式，等于写了个错别字：不报错、不生效。
 *
 * 只给字色，不给底色：整格的底色属于 \`row-tone\`（见上式），两者叠在一起会变成
 * 「红底红字」。这也与 page-view.css 对 \`td .is-*\` 的口径一致（那边显式清掉了背景）。 */
.z-rpt__td .is-danger {
  color: var(--z-color-danger-strong);
}

.z-rpt__td .is-warning {
  color: var(--z-color-warning-strong);
}

.z-rpt__td .is-success {
  color: var(--z-color-success-strong);
}

.z-rpt__td .is-muted {
  color: var(--z-color-text-secondary);
}

.z-rpt__td .is-primary {
  color: var(--z-color-primary-strong);
}

/* 方向色（\`tone=vs:\` / \`tone=sign\`，issue IKXCXD）：高于基线 \`is-up\`、低于基线 \`is-down\`。
 *
 * [WHY 与 page-view-base.css 重复一份] 表格单元格在 \`<z-report-table>\` 的 shadow 里，
 * page-view.css 进不来（同 \`is-badge\` 的理由）。两份不同步的症状是
 * 「KPI 卡里有颜色、表格里是灰的」—— 而同一份脚本、同一个 \`tone\`。
 * 契约由 \`tests/unit/page-semantic-class-coverage.test.ts\` 守住：渲染层能产出的每个
 * \`is-*\`，在表格与页面两份样式里都必须至少有一条选择器。
 *
 * 只给字色：方向不是「要处理」，整格铺底色会把「这一列涨了」画成一块红。 */
.z-rpt__td .is-up {
  color: var(--z-color-data-up);
}

.z-rpt__td .is-down {
  color: var(--z-color-data-down);
}
/* ── 进度条（format=progress）── */
/*
 * 条与文字并排而非叠放：叠在条上的数字在填充过半时会被色块压住读不出来。
 * 轨道定宽而不是百分比：列宽是用户可调的，百分比宽度会让同一页不同表格
 * 的条看起来长短不一，反而更像数据不一致。
 */
.zpg-progress {
  display: inline-flex;
  align-items: center;
  /* [★ 2026-11-11 从 flex-end 改成 flex-start，督导配送日页实测] 整块右对齐时，
     轨道的**右端**被右侧文字推着走 —— 而「0 / 3」比「19 / 29」窄 5 个字符，
     同一列九行里条的左端能差 20px，看上去像是条没渲完、行与行错位。
     左对齐 + 轨道定宽 + 文字定宽，三个左端同时钉在列左边界，任何人一眼都齐。 */
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
}

.zpg-progress__track {
  position: relative;
  flex: 0 0 auto;
  /* 56 → 72：线框稿给的是 78px，56px 上 10% 的差别只有 5px，读不出「谁更缺」 */
  width: 72px;
  height: 6px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-bg-secondary);
  /* 0% 只剩空轨：卡片底色与轨道底色几乎同值，看起来就是「这格没画条」。
     一道内描边让「有条但为 0」与「根本没有条（分母缺失）」能区分开。 */
  box-shadow: inset 0 0 0 1px var(--z-color-border);
  overflow: hidden;
}

.zpg-progress__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--z-color-primary);
  /* 同一列各行的条宽不同，没有过渡时重渲染会「跳」一下 */
  transition: width var(--z-transition-quick);
}

.zpg-progress__text {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  /* 定宽 + 右对齐：轨道左端已经固定了，文字这一段再按内容宽度走的话，
     「0 / 3」与「19 / 29」的右端会各自为政，一列数字看着像没对齐。 */
  min-width: 4.2em;
  text-align: right;
}

/* ── 行内控件（\`col ui=switch|stepper|button|action\`，issue IKUXAB）──
 *
 * [WHY 样式必须写在这个文件] 单元格 HTML 是在 \`<z-report-table>\` 的 shadow 里渲染的，
 * \`page-view.css\` 的规则一条都进不来（同 \`is-badge\` / \`is-progress\` 的理由）。
 *
 * 三件事刻意不做：不加过渡（表格滚动时几百个控件同时动会卡，也没有信息量）；
 * 不套 \`z-switch\` 组件（表格一行一个实例，且它在 shadow 里还要再开一层 shadow）；
 * 不给 hover 以外的反馈音效/动画 —— 改值成不成由 \`is-pending\` 与重渲染后的真实值说话。
 */
.zp-cellctl {
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
}

/* 开关：轨道 + 圆钮，尺寸刻意比表单里的小一号（表格行高只有 36px） */
.zp-cellctl--switch {
  position: relative;
  width: 34px;
  height: 18px;
  padding: 0;
  border: 0;
  border-radius: var(--z-radius-full);
  background: var(--z-color-border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.zp-cellctl--switch.is-on {
  background: var(--z-color-primary);
}

.zp-cellctl__knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-surface);
}

.zp-cellctl--switch.is-on .zp-cellctl__knob {
  left: 18px;
}

/* 步进器：两个按钮夹一个数字，数字用等宽数字避免宽度抖动 */
.zp-cellctl--stepper {
  gap: 2px;
}

.zp-cellctl__step {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-surface);
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  line-height: 1;
  cursor: pointer;
}

.zp-cellctl__val {
  min-width: 26px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--z-color-text);
}

/* 按钮：行内次按钮（写值）/ 主按钮（去那一行）外观只差字重与底色 */
.zp-cellctl--button,
.zp-cellctl--action {
  min-height: 24px;
  padding: 0 8px;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-surface);
  color: var(--z-color-primary);
  cursor: pointer;
  white-space: nowrap;
}

.zp-cellctl--action {
  font-weight: var(--z-font-weight-medium);
}

/* 图标版行内动作（issue IKWNGS）：方形、无内边距 —— 一行两枚动作时文字列放不下。
   尺寸跟 svg 走（14px），\`line-height: 0\` 去掉行盒的额外上下留白，否则按钮比 24px 更高。 */
.zp-cellctl--action.zp-cellctl--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  padding: 0;
  line-height: 0;
}

.zp-cellctl--button:hover,
.zp-cellctl--action:hover {
  background: var(--z-color-bg-secondary);
}

.zp-cellctl:focus-visible {
  outline: none;
  box-shadow: var(--z-focus-ring);
}

/* 就地输入（\`ui=text|number\`，issue IKWNGS）：看上去像一格文字，点进去才是输入框。
   [WHY 不画成标准 input] 一列 200 行全带边框，表格会变成一片网格；这里的语义是
   「这一格可以改」，不是「这里有个表单字段」。所以常态透明底、无边框，hover/focus 才显形。
   宽度用 \`ch\` 而不是固定 px：一列数字的宽度本来就跟位数走。 */
.zp-cellctl--input {
  box-sizing: border-box;
  width: 100%;
  min-width: 4ch;
  min-height: 24px;
  padding: 0 4px;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: inherit;
}

.zp-cellctl--input:hover {
  border-color: var(--z-color-border);
}

/* 聚焦时必须有可见边框：\`focus-visible\` 只在键盘下来，鼠标点进来也要看得出「在改哪一格」 */
.zp-cellctl--input:focus {
  border-color: var(--z-color-primary);
  background: var(--z-color-surface);
  outline: none;
}

.zp-cellctl--input.zp-cellctl--num {
  text-align: right;
  /* 数字等宽：一列金额上下对不齐比没有输入框更显眼 */
  font-variant-numeric: tabular-nums;
}

/* 已上报、等宿主回写：半透明 + 不吃点击（连点会连发一串写入） */
.zp-cellctl.is-pending {
  opacity: 0.45;
  pointer-events: none;
}

/* 草稿态（\`card edit=yes\`，issue IKX0CE P1-6）：改过、但还没交出去。
 *
 * [WHY 不复用 is-pending] 两者的收尾人不同：pending 等**宿主**写回，草稿等**用户**提交。
 * 借过来用就得连 \`pointer-events: none\` 一起借 —— 而草稿态下用户必须能接着改。
 */
.zp-cellctl.is-dirty {
  border-color: var(--z-color-warning);
  background: var(--z-color-warning-soft);
}

/* 行级标记：一格里改了东西，整行左侧要能扫出来（宽表 20 列，只标一格等于没标） */
.z-rpt__row.is-dirty > .z-rpt__td {
  background: var(--z-color-warning-soft);
}

/* 待删（勾选后点了「删除所选」）：留着这一行、画删除线。
 *
 * [WHY 不当场挪走] 提交之前它还在数据里 —— 挪走了用户就看不到自己要删的是哪几行，
 * 而写失败时也没人能把它挪回来（页面不写库）。 */
.z-rpt__row.is-deleted > .z-rpt__td {
  color: var(--z-color-text-secondary);
  text-decoration: line-through;
  background: var(--z-color-danger-soft);
}
`,Yt=`/* [WHY] 2026-10-25 系统审计：report-table.css 的 Body cells / Footer / Alignment / Variants /
   States / Loading / Hover / Selected 区块（原 L349-532）。 */

/* ── Body cells ── */

.z-rpt__td {
  /* [WHY] 走 spacing token 而不是字面量 6px/12px：这是「密度档」（[data-density]）唯一能穿透
     到表格的接缝。写死时字号会跟密度变、行高不变 —— 文字变小而行没变矮，观感反而更松，
     且与同步缩小的按钮（28→26）不一致。默认档 --z-space-1-5=6px / --z-space-3=12px，
     与原字面量**逐像素相同**，故本次替换对默认观感零影响。 */
  padding: var(--z-space-1-5) var(--z-space-3);
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-bg);
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: background var(--z-transition-fast);
}

.z-rpt__row:last-child .z-rpt__td {
  border-bottom: none;
}

/* ── Footer ── */

.z-rpt__foot .z-rpt__tf {
  /* [WHY 贴底] 与表头同理，反方向：maxHeight 让 wrapper 内部滚动时，合计行是
     「滚到底才用得上」的信息 —— 不固定的话它正好在滚到底时已经滚出视野。
     用 sticky 而不是把 tfoot 移出表格：移出去就没有列宽对齐了（table-layout: fixed 靠同一张表算宽）。 */
  position: sticky;
  bottom: 0;
  z-index: 3;
  /* 同 .z-rpt__td：合计行也要跟着密度档收放，否则最后一行会比明细行高出一截 */
  padding: var(--z-space-1-5) var(--z-space-3);
  font-weight: 700;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  background: var(--z-color-bg-secondary);
  /* [WHY] 商务严谨: 2px 顶边框强化合计行与明细的视觉分隔 */
  border-top: 2px solid var(--z-color-border);
  border-bottom: none;
  white-space: nowrap;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── Footer checkbox spacer ── */

.z-rpt__tf--checkbox {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 0;
}

/* ── Alignment ── */

/* [WHY] 中文报表习惯: 表头默认居中, 显式指定对齐的列覆盖 */
.z-rpt__head .z-rpt__th.z-rpt__cell--left {
  text-align: left;
}

.z-rpt__head .z-rpt__th.z-rpt__cell--right {
  text-align: right;
}

.z-rpt__cell--center {
  text-align: center;
}

.z-rpt__cell--right {
  text-align: right;
  /* [WHY] 商务严谨: 数字列等宽数字字形, 报表数据滚动/排序时不抖动 */
  font-variant-numeric: tabular-nums;
}

/* ── Striped ── */

.z-rpt--striped .z-rpt__row:nth-child(even) .z-rpt__td {
  background: var(--z-color-bg-secondary);
}

/* ── Bordered ── */

.z-rpt--bordered {
  border: 1px solid var(--z-color-border);
}

.z-rpt--bordered .z-rpt__th {
  border: 1px solid var(--z-color-border);
}

.z-rpt--bordered .z-rpt__td {
  border: 1px solid var(--z-color-border);
}

.z-rpt--bordered .z-rpt__tf {
  border: 1px solid var(--z-color-border);
}

/* ── Three-line table (三线表, 中文报表习惯) ── */

/* [WHY] 中文报表惯例: 顶线/表头下线/底线 2px 粗线, 明细行保持细横线, 无竖线 */
.z-rpt--lines {
  border-top: 2px solid var(--z-color-text);
  border-bottom: 2px solid var(--z-color-text);
}

.z-rpt--lines .z-rpt__th {
  border-bottom: 2px solid var(--z-color-text);
}

.z-rpt--lines .z-rpt__tf {
  border-top: 2px solid var(--z-color-text);
}

/* ── Small size ── */

.z-rpt--sm .z-rpt__th,
.z-rpt--sm .z-rpt__td,
.z-rpt--sm .z-rpt__tf {
  padding: 4px 8px;
  font-size: var(--z-font-size-xs);
}

/* ── States ── */

.z-rpt__empty-cell {
  padding: var(--z-space-6) var(--z-space-4);
  text-align: center;
  color: var(--z-color-text-secondary);
}

.z-rpt__empty-icon {
  display: block;
  margin: 0 auto var(--z-space-2);
  color: var(--z-color-gray-300);
}

/* ── Loading overlay ── */

.z-rpt--loading {
  opacity: 0.55;
  pointer-events: none;
}

.z-rpt__loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-2);
  z-index: 5;
  background: color-mix(in srgb, var(--z-color-bg) 78%, transparent);
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  pointer-events: auto;
}

.z-rpt__spinner {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border: 2px solid var(--z-color-border);
  border-top-color: var(--z-color-primary);
  border-radius: 50%;
  /* motion-check-ignore: 800ms 无对应档位。并入 loop-fast(600) 会让表格内的转圈快 25%，
     并入 loop-slow(1500) 慢一倍 —— 两者都是可感知的视觉变更，不是「归位」。
     要统一节奏需先做视觉评审（REQ-039 D4）。 */
  animation: z-rpt-spin 0.8s linear infinite;
}

@keyframes z-rpt-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Row hover ── */

.z-rpt__row:hover .z-rpt__td {
  background: var(--z-color-hover-subtle);
}

.z-rpt--striped .z-rpt__row:hover .z-rpt__td {
  background: var(--z-color-hover);
}

/* ── Selected row ── */

.z-rpt__row--selected .z-rpt__td {
  /* [WHY] 原先直接引用 blue-50/blue-100：暗色下整行变成亮白，行内文字（近白）隐形。
     选中行是「要被注视的选区」→ 走 tint（比 soft 实一档），hover 再加一档。 */
  background: var(--z-color-primary-tint) !important;
}

.z-rpt__row--selected:hover .z-rpt__td {
  background: var(--z-color-primary-tint-hover) !important;
}


/* ── 分组：小计行 / 总计行 / 折叠按钮 ── */

/* 父级小计行：浅主色底 + 加粗（分组表的视觉锚点：一眼看出这行是汇总不是明细）
   [配色别乱挑] 底色用 primary-soft（浅色底纹），文字用 primary（主色本身）。
   反过来用 primary-text（那是**实心主色底**上的白字）会得到约 1.1 的对比度：
   小计行整行看不见，而 DOM 与单测全都正常。 */
.z-rpt__row--group .z-rpt__td {
  background: var(--z-color-primary-soft);
  font-weight: 600;
  color: var(--z-color-primary);
}

/* 总计行：灰底 + 更粗 + 上边框，与「某个组的小计」明确区分 */
.z-rpt__row--total .z-rpt__td {
  background: var(--z-color-bg-secondary);
  font-weight: 700;
  border-top: 2px solid var(--z-color-border);
}

/* [WHY 总计行也贴底] 它是「全表合计」，与 tfoot 的列汇总同属表尾信息。
   不固定的话，表体一滚就只剩下看不见的合计 —— 而分组表的 total 恰恰是分页时
   唯一能看到总数的行（它不参与分页）。
   [WHY 让出 --z-rpt-foot-h] tfoot 与 total 行可能同时存在（列汇总 + 分组总计）：
   两者都 bottom:0 会叠成一坨。tfoot 先贴底，总计行叠在它上面，高度由 JS 量出。 */
.z-rpt__row--total .z-rpt__td {
  position: sticky;
  bottom: var(--z-rpt-foot-h, 0px);
  z-index: 2;
}

/* 折叠按钮：16px 定宽，避免「有子级」与「无子级」两行的文字起点差一个字符 */
.z-rpt__toggle {
  width: 16px;
  margin-right: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--z-color-text-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}

.z-rpt__toggle:hover {
  color: var(--z-color-primary);
}

.z-rpt__toggle:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: 1px;
}

/* ── 分页 ── */

/* [WHY 放在 wrapper 外] wrapper 是滚动容器（maxHeight 时 overflow-y:auto）；
   分页条放进去会跟着表体一起滚走 —— 翻页按钮正是「滚到底才想起来用」的东西。 */
.z-rpt__pager {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 2px 2px;
  font-size: 12px;
  color: var(--z-color-text-secondary);
}

.z-rpt__pager-btns {
  display: flex;
  gap: 6px;
}

/* 右侧一组：每页行数下拉 + 翻页按钮。两者都要贴右，且窄表下不许换行把分页条撑高。 */
.z-rpt__pager-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.z-rpt__pager-size {
  display: inline-flex;
  align-items: center;
}

/* 高度与 .z-rpt__pager-btn 对齐（26px）：两件并排的东西差 2px 就会显得没对齐。 */
.z-rpt__pager-size select {
  height: 26px;
  padding: 0 4px;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.z-rpt__pager-size select:hover {
  border-color: var(--z-color-primary);
}

.z-rpt__pager-btn {
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.z-rpt__pager-btn:hover:not(:disabled) {
  border-color: var(--z-color-primary);
  color: var(--z-color-primary);
}

.z-rpt__pager-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
`,Bt=`/* [WHY] 2026-10-25 系统审计：report-table.css 的 Fixed columns / Checkbox column / Dark theme
   区块（原 L533-672）。 */

/* ── Fixed columns ── */

.z-rpt__th--fixed-left,
.z-rpt__th--fixed-right,
.z-rpt__td--fixed-left,
.z-rpt__td--fixed-right,
/* [WHY] 合计行固定列: 与表头/表体同阶梯(z-index 2), 水平滚动时合计行与冻结列对齐,
   见 [[bug-20260810-rpt-header-overlap]] 遗留 */
.z-rpt__tf--fixed-left,
.z-rpt__tf--fixed-right {
  position: sticky;
  z-index: 2;
}

/* [WHY] 冻结表头 z-index 提权: .z-rpt__head .z-rpt__th(0,2,0) 的 z-index:3 会覆盖
   (0,1,0) 的 z-index:4, 水平滚动时普通表头(同为 3 且 DOM 靠后)盖住冻结表头。
   此处 (0,3,0) 保证冻结表头恒在普通表头之上, 见 [[bug-20260810-rpt-header-overlap]] */
.z-rpt__head .z-rpt__th--fixed-left,
.z-rpt__head .z-rpt__th--fixed-right {
  position: sticky;
  z-index: 4;
}

/* [WHY] 表头工具格同样要提权，而且是**跨行**才暴露：分组表头下工具格 \`rowspan=2\` 落在
   第一行，列名行（第二行）的格子按 DOM 顺序画在它之后 —— 同为 z-index:3 时工具格被压住，
   卡片右边缘的图标格下半截露出被横滚过去的列名（IKXFXX 补记 2）。
   [WHY 写成三元 (0,3,0)] 只写 \`.z-rpt__head .z-rpt__th--tools\` 与 \`.z-rpt__head .z-rpt__th\`
   特异性打平，谁赢只取决于两个 CSS 文件合并的先后 —— 实测那条共享规则里的 z-index:5
   就是这样被吃掉的（计算值仍是 3）。多挂一个类名，结论与顺序无关。 */
.z-rpt__head .z-rpt__th.z-rpt__th--tools {
  z-index: 5;
}

.z-rpt__th--fixed-left,
.z-rpt__td--fixed-left,
.z-rpt__tf--fixed-left {
  left: 0;
}

.z-rpt__th--fixed-right,
.z-rpt__td--fixed-right,
.z-rpt__tf--fixed-right {
  right: 0;
}

/* Shadow for fixed columns — 仅在实际滚动时出现, 交互自然 */
.z-rpt__th--fixed-left::before,
.z-rpt__td--fixed-left::before {
  content: "";
  position: absolute;
  top: 0;
  right: -8px;
  bottom: 0;
  width: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--z-transition-fast);
  background: linear-gradient(to right, rgba(0,0,0,0.06), transparent);
}

.z-rpt__th--fixed-right::after,
.z-rpt__td--fixed-right::after {
  content: "";
  position: absolute;
  top: 0;
  left: -8px;
  bottom: 0;
  width: 8px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--z-transition-fast);
  background: linear-gradient(to left, rgba(0,0,0,0.06), transparent);
}

.z-rpt__wrapper--scrolled-left .z-rpt__th--fixed-left::before,
.z-rpt__wrapper--scrolled-left .z-rpt__td--fixed-left::before,
.z-rpt__wrapper--scrolled-right .z-rpt__th--fixed-right::after,
.z-rpt__wrapper--scrolled-right .z-rpt__td--fixed-right::after {
  opacity: 1;
}

/* ── Checkbox column ── */

.z-rpt__th--checkbox,
.z-rpt__td--checkbox {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  padding: 0;
  text-align: center;
  vertical-align: middle;
}

.z-rpt__select-all,
.z-rpt__row-checkbox {
  width: 16px;
  height: 16px;
  margin: 0;
  cursor: pointer;
  accent-color: var(--z-color-primary);
  vertical-align: middle;
}

/* [WHY] 键盘可达性: 复选框需可见焦点环 */
.z-rpt__select-all:focus-visible,
.z-rpt__row-checkbox:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 1px;
}

/* [WHY] reduced-motion: 旋转指示器动画降速 */
@media (prefers-reduced-motion: reduce) {
  .z-rpt__spinner {
    animation-duration: 1.6s;
  }
}

/* ── Dark theme ── */
/*
 * [WHY 这里原来有 6 条覆盖，现在删掉] 表头 / 可排序表头 hover / 行 hover / 斑马纹 /
 * 斑马行 hover / 表尾，各有一条 \`[data-theme="dark"]\` 把底改成 gray-200/300。删的理由：
 *   1. **只认 \`[data-theme="dark"]\`**。宿主按 shadcn 惯例用 \`.dark\` class 切暗色时，
 *      这 6 条一条都不生效 —— 暗色下表格是近白表头 + 近白斑马纹，而亮色那套规则
 *      又是 gray-50，看上去像「暗色主题没做完」。
 *   2. 值绑在 gray 阶上，宿主换中性色时跟着不动。
 *   3. 亮暗两套各写一遍，实际上已经不一致：亮色行 hover 是 gray-50，暗色是 gray-200，
 *      中间跳过一档。
 * 现在这几个角色都由语义 token 表达（分带 -bg-secondary / 行 hover -hover-subtle /
 * 压灰面的 hover -hover），它们走 gray 阶、在 .dark 里随整阶反转自动适配。
 *
 * 唯一的视觉变化：暗色下分带与 hover 各**浅一档**（#334155 → #1e293b，层级关系不变，
 * 每一档仍然相差一级）。要恢复原来的对比强度，宿主给 \`--muted\` 设 #334155 即可。
 *
 * 选中行保留：暗色要的不是 tint(.28) 而是更收敛的 soft(.16)，这是刻意的暗色微调。
 * 选择器补 \`.dark\`，与 tokens.css 的双通道保持一致。
 */
[data-theme="dark"] .z-rpt__row--selected .z-rpt__td,
.dark .z-rpt__row--selected .z-rpt__td {
  background: var(--z-color-primary-soft) !important;
}

[data-theme="dark"] .z-rpt__row--selected:hover .z-rpt__td,
.dark .z-rpt__row--selected:hover .z-rpt__td {
  background: var(--z-color-primary-soft) !important;
}
`,Ut={width:120};function j(r){if(r==null||r==="")return 0;if(typeof r=="number")return Number.isFinite(r)?r:0;const t=String(r).match(/^(\d+(?:\.\d+)?)px$/);return t?parseFloat(t[1]):0}function jt(r){return{widthPx:j(r.width)||Ut.width,align:r.align,renderer:r.cellTag?{kind:"tag",tag:r.cellTag}:{kind:"text"}}}function ht(r,t,n){return n&&r[n]!=null?String(r[n]):String(t)}function qt(r,t){const{open:n,texts:e}=t,o=r.align??"",s={left:'<path d="M4 6h16 M4 12h10 M4 18h13"/>',center:'<path d="M4 6h16 M7 12h10 M4 18h16"/>',right:'<path d="M4 6h16 M10 12h10 M7 18h13"/>'},i={left:e.alignLeftText,center:e.alignCenterText,right:e.alignRightText},l=["left","center","right"].map(_=>{const y=o===_?" z-rpt__th-config-align--active":"";return g`
        <button type="button" class="z-rpt__th-config-align${y}" data-align="${_}"
                title="${m(i[_])}" aria-label="${m(i[_])}" aria-pressed="${y?"true":"false"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${s[_]}</svg>
        </button>`}).join(""),a=r.fixed??"none",c={none:'<rect x="6" y="4" width="12" height="16" rx="1"/>',left:'<path d="M5 4v16"/><rect x="8" y="4" width="12" height="16" rx="1"/>',right:'<rect x="4" y="4" width="12" height="16" rx="1"/><path d="M19 4v16"/>'},u={none:e.pinNoneText,left:e.pinLeftText,right:e.pinRightText},p=["none","left","right"].map(_=>{const y=a===_?" z-rpt__th-config-fix--active":"";return g`
        <button type="button" class="z-rpt__th-config-fix${y}" data-fix="${_}"
                title="${m(u[_])}" aria-label="${m(u[_])}" aria-pressed="${y?"true":"false"}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${c[_]}</svg>
        </button>`}).join(""),b=r.numeric?Gt(t.format,e):"";return g`
      <span class="z-rpt__th-config ${n?"z-rpt__th-config--open":""}">
        <button type="button" class="z-rpt__th-config-btn" part="column-config-trigger"
                aria-haspopup="menu" aria-expanded="${n?"true":"false"}" title="${m(e.columnSettingsText)}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </button>
        ${n?g`<div class="z-rpt__th-config-menu" part="column-config-menu">
              <div class="z-rpt__th-config-row">${l}</div>
              <div class="z-rpt__th-config-row z-rpt__th-config-row--fix">${p}</div>
              <label class="z-rpt__th-config-row z-rpt__th-config-item">
                <input type="checkbox" class="z-rpt__th-config-footer" data-key="${r.key}"
                       ${r.showFooter!==!1?"checked":""} part="column-config-footer" />
                <span>${m(e.footerToggleText)}</span>
              </label>
              ${b}
            </div>`:""}
      </span>
    `}function Gt(r,t){const n=r??{},e=n.formatType??"number",o=["number","percent"].map(c=>{const u=e===c?" z-rpt__th-config-fmt--active":"",p=c==="number"?t.numberText:t.percentText;return g`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-type${u}"
                data-format-type="${c}" title="${m(t.formatTypeText)}: ${m(p)}"
                aria-pressed="${u?"true":"false"}">${m(p)}</button>`}).join(""),s=n.decimalPlaces,i=["auto","0","1","2","3","4"].map(c=>{const u=(c==="auto"?s===void 0:s===Number(c))?" z-rpt__th-config-fmt--active":"",p=c==="auto"?t.autoText:c;return g`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-dec${u}"
                data-dec="${c}" title="${m(t.decimalPlacesText)}: ${m(p)}"
                aria-pressed="${u?"true":"false"}">${m(p)}</button>`}).join(""),l=n.thousands===!0,a=["off","on"].map(c=>{const u=c==="on"===l?" z-rpt__th-config-fmt--active":"",p=c==="on"?"开":"关";return g`
        <button type="button" class="z-rpt__th-config-fmt z-rpt__th-config-thou${u}"
                data-thou="${c}" title="${m(t.thousandsText)}: ${p}"
                aria-pressed="${u?"true":"false"}">${p}</button>`}).join("");return g`
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${m(t.formatTypeText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${o}</span>
      </div>
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${m(t.decimalPlacesText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${i}</span>
      </div>
      <div class="z-rpt__th-config-row z-rpt__th-config-row--fmt">
        <span class="z-rpt__th-config-fmt-label">${m(t.thousandsText)}</span>
        <span class="z-rpt__th-config-fmt-seg">${a}</span>
      </div>`}function Xt(r,t){const n=r.closest("th[data-key]"),e=(n==null?void 0:n.dataset.key)??null;t.setConfigOpen(t.getConfigOpen()===e?null:e),t.update()}function Vt(r,t){const n=r.closest("th[data-key]"),e=n==null?void 0:n.dataset.key,o=r.dataset.fix;if(!e||!o)return;const s=t.columns.find(i=>i.key===e);s&&(s.fixed=o==="none"||s.fixed===o?void 0:o,t.setConfigOpen(null),t.update(),t.emit("z-column-config-change",{key:e,align:s.align??null,showFooter:s.showFooter!==!1,fixed:s.fixed??null}),t.emitConfigChange())}function Qt(r,t){const n=r.closest("th[data-key]"),e=n==null?void 0:n.dataset.key,o=r.dataset.align;if(!e||!o)return;const s=t.columns.find(i=>i.key===e);s&&(s.align=s.align===o?void 0:o,t.setConfigOpen(null),t.update(),t.emit("z-column-config-change",{key:e,align:s.align??null,showFooter:s.showFooter!==!1}),t.emitConfigChange())}function Jt(r,t){const n=r.closest("th[data-key]"),e=n==null?void 0:n.dataset.key,o=r.dataset.formatType;if(!e||!o)return;const s={...t.colFormats[e]??{}};o==="number"?delete s.formatType:s.formatType=o,G(e,s,t)}function Zt(r,t){const n=r.closest("th[data-key]"),e=n==null?void 0:n.dataset.key,o=r.dataset.dec;if(!e||!o)return;const s={...t.colFormats[e]??{}};o==="auto"?delete s.decimalPlaces:s.decimalPlaces=Number(o),G(e,s,t)}function te(r,t){const n=r.closest("th[data-key]"),e=n==null?void 0:n.dataset.key,o=r.dataset.thou;if(!e||!o)return;const s={...t.colFormats[e]??{}};o==="on"?s.thousands=!0:delete s.thousands,G(e,s,t)}function G(r,t,n){if(Object.keys(t).length===0){const e={...n.colFormats};delete e[r],n.setColFormats(e)}else n.setColFormats({...n.colFormats,[r]:t});n.setConfigOpen(null),n.update(),n.emit("z-column-format-change",{key:r,format:t})}function ee(r,t){const n=r.closest(".z-rpt__th-config-btn");if(n)return Xt(n,t),!0;const e=r.closest(".z-rpt__th-config-align");if(e)return Qt(e,t),!0;const o=r.closest(".z-rpt__th-config-fix");if(o)return Vt(o,t),!0;const s=r.closest(".z-rpt__th-config-type");if(s)return Jt(s,t),!0;const i=r.closest(".z-rpt__th-config-dec");if(i)return Zt(i,t),!0;const l=r.closest(".z-rpt__th-config-thou");return l?(te(l,t),!0):!1}function ne(r,t){return{columns:r.columns.map(n=>({key:n.key,hidden:n.hidden,align:n.align??null,showFooter:n.showFooter,fixed:n.fixed??null,width:t.get(n.key)??null})),sortState:[...r.sortState],striped:r.striped,bordered:r.bordered,size:r.size,variant:r.lines?"lines":"default"}}function re(r,t,n){if(!n||!Array.isArray(n.columns))return;typeof n.striped=="boolean"&&(r.striped=n.striped),typeof n.bordered=="boolean"&&(r.bordered=n.bordered),(n.size==="sm"||n.size==="md")&&(r.size=n.size),typeof n.lines=="boolean"?r.lines=n.lines:n.variant==="lines"?r.lines=!0:n.variant==="default"&&(r.lines=!1);const e=new Map(r.columns.map(i=>[i.key,i])),o=[],s=new Set;for(const i of n.columns){const l=e.get(i.key);!l||s.has(i.key)||(s.add(i.key),l.hidden=i.hidden,l.align=i.align??void 0,l.showFooter=i.showFooter,l.fixed=i.fixed==="left"||i.fixed==="right"?i.fixed:void 0,i.width!=null&&t.set(i.key,i.width),o.push(l))}for(const i of r.columns)s.has(i.key)||o.push(i);r.columns=o,Array.isArray(n.sortState)&&(r.sortState=[...n.sortState]),r.requestUpdate()}const gt={AVG:{name:"AVG",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"求平均值"},COLLECT_LIST:{name:"COLLECT_LIST",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"收集为列表"},COLLECT_SET:{name:"COLLECT_SET",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"去重收集为列表"},COUNT:{name:"COUNT",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"计数（统计非空行数）"},COUNT_DISTINCT:{name:"COUNT_DISTINCT",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"去重计数"},MAX:{name:"MAX",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"最大值"},MIN:{name:"MIN",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"最小值"},PERCENTILE:{name:"PERCENTILE",category:"聚合",minArgs:2,maxArgs:2,agg:!0,unsupported:!0,desc:"百分位（暂不支持 MySQL 后端执行）"},SUM:{name:"SUM",category:"聚合",minArgs:1,maxArgs:1,agg:!0,unsupported:!1,desc:"求和"},XIRR:{name:"XIRR",category:"聚合",minArgs:2,maxArgs:-1,agg:!0,unsupported:!0,desc:"现金流内部收益率（暂不支持 MySQL 后端执行）"},ABS:{name:"ABS",category:"数学",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"绝对值"},CEIL:{name:"CEIL",category:"数学",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"向上取整"},FLOOR:{name:"FLOOR",category:"数学",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"向下取整"},GREATEST:{name:"GREATEST",category:"数学",minArgs:2,maxArgs:-1,agg:!1,unsupported:!1,desc:"取最大值（多参数）"},LEAST:{name:"LEAST",category:"数学",minArgs:2,maxArgs:-1,agg:!1,unsupported:!1,desc:"取最小值（多参数）"},LENGTH:{name:"LENGTH",category:"数学",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"字符串长度（字符数）"},LOG:{name:"LOG",category:"数学",minArgs:1,maxArgs:2,agg:!1,unsupported:!1,desc:"对数（可带底数）"},POW:{name:"POW",category:"数学",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"幂运算"},RAND:{name:"RAND",category:"数学",minArgs:0,maxArgs:0,agg:!1,unsupported:!1,desc:"随机数"},ROUND:{name:"ROUND",category:"数学",minArgs:1,maxArgs:2,agg:!1,unsupported:!1,desc:"四舍五入（可带小数位）"},SQRT:{name:"SQRT",category:"数学",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"平方根"},BASE64:{name:"BASE64",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"Base64 编码"},CONCAT:{name:"CONCAT",category:"字符串",minArgs:1,maxArgs:-1,agg:!1,unsupported:!1,desc:"拼接字符串"},CONCAT_WS:{name:"CONCAT_WS",category:"字符串",minArgs:2,maxArgs:-1,agg:!1,unsupported:!1,desc:"带分隔符拼接（首参为分隔符）"},INSTR:{name:"INSTR",category:"字符串",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"子串首次出现位置"},LOWER:{name:"LOWER",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"转小写"},REGEXP_EXTRACT:{name:"REGEXP_EXTRACT",category:"字符串",minArgs:2,maxArgs:3,agg:!1,unsupported:!1,desc:"正则提取（可带组号）"},REGEXP_REPLACE:{name:"REGEXP_REPLACE",category:"字符串",minArgs:3,maxArgs:3,agg:!1,unsupported:!1,desc:"正则替换"},REPEAT:{name:"REPEAT",category:"字符串",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"重复字符串"},REVERSE:{name:"REVERSE",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"反转字符串"},SPLIT:{name:"SPLIT",category:"字符串",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"按分隔符分割为数组（JSON）"},SUBSTR:{name:"SUBSTR",category:"字符串",minArgs:2,maxArgs:3,agg:!1,unsupported:!1,desc:"截取子串"},TRIM:{name:"TRIM",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"去首尾空白"},UNBASE64:{name:"UNBASE64",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"Base64 解码"},UPPER:{name:"UPPER",category:"字符串",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"转大写"},ADD_MONTHS:{name:"ADD_MONTHS",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"加月数"},CURRENT_DATE:{name:"CURRENT_DATE",category:"日期时间",minArgs:0,maxArgs:0,agg:!1,unsupported:!1,desc:"当前日期"},DATEDIFF:{name:"DATEDIFF",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"日期差（天）"},DATE_ADD:{name:"DATE_ADD",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"加天数"},DATE_SUB:{name:"DATE_SUB",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"减天数"},DATE_TRUNC:{name:"DATE_TRUNC",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"按粒度截断（gran, date）"},DAYOFMONTH:{name:"DAYOFMONTH",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"日（1-31）"},DAYOFWEEK:{name:"DAYOFWEEK",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"星期几（1=周日）"},FROM_UNIXTIME:{name:"FROM_UNIXTIME",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"时间戳转日期时间"},HOUR:{name:"HOUR",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"小时（0-23）"},LASTING_DAYS_TO_DATE:{name:"LASTING_DAYS_TO_DATE",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"距今持续天数"},LAST_DAY:{name:"LAST_DAY",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"月末日期"},MINUTEDIFF:{name:"MINUTEDIFF",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"分钟差"},MONTH:{name:"MONTH",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"月（1-12）"},MONTHS_BETWEEN:{name:"MONTHS_BETWEEN",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"月差"},NOW:{name:"NOW",category:"日期时间",minArgs:0,maxArgs:0,agg:!1,unsupported:!1,desc:"当前日期时间"},QUARTER:{name:"QUARTER",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"季度（1-4）"},SECONDDIFF:{name:"SECONDDIFF",category:"日期时间",minArgs:2,maxArgs:2,agg:!1,unsupported:!1,desc:"秒差"},TO_DATE:{name:"TO_DATE",category:"日期时间",minArgs:1,maxArgs:2,agg:!1,unsupported:!1,desc:"转日期（可带格式）"},WEEKOFYEAR:{name:"WEEKOFYEAR",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"周数（1-53）"},YEAR:{name:"YEAR",category:"日期时间",minArgs:1,maxArgs:1,agg:!1,unsupported:!1,desc:"年"},CASE_WHEN:{name:"CASE_WHEN",category:"逻辑",minArgs:3,maxArgs:-1,agg:!1,unsupported:!1,desc:"条件分支（cond, then, ..., else）"},COALESCE:{name:"COALESCE",category:"逻辑",minArgs:1,maxArgs:-1,agg:!1,unsupported:!1,desc:"取首个非空值"},IF:{name:"IF",category:"逻辑",minArgs:3,maxArgs:3,agg:!1,unsupported:!1,desc:"条件判断（cond, 真值, 假值）"},EXPLODE:{name:"EXPLODE",category:"其他",minArgs:1,maxArgs:1,agg:!1,unsupported:!0,desc:"行转列（暂不支持 MySQL 后端执行）"},SEQUENCE:{name:"SEQUENCE",category:"其他",minArgs:2,maxArgs:3,agg:!1,unsupported:!0,desc:"生成序列（暂不支持 MySQL 后端执行）"},SORT_ARRAY:{name:"SORT_ARRAY",category:"其他",minArgs:1,maxArgs:1,agg:!1,unsupported:!0,desc:"数组排序（暂不支持 MySQL 后端执行）"}};function ft(r){return gt[r.toUpperCase()]}function oe(r){const t=[],n=new Set,e=/\[([^\[\]]*)\]/g;let o;for(;o=e.exec(r);){const s=o[1].trim();s&&!n.has(s)&&(n.add(s),t.push(s))}return t}const se=[">=","<=","!=","<>","==",">","<","="];function Y(r){return r==="_"||r>="A"&&r<="Z"||r>="a"&&r<="z"}function P(r){return Y(r)||r>="0"&&r<="9"}function X(r){let t=0;const n=r.length;for(;t<n;){const e=r[t];if(e==="'"||e==='"'){const o=e;for(t++;t<n;){if(r[t]==="\\"&&t+1<n){t+=2;continue}if(r[t]===o){if(o==="'"&&t+1<n&&r[t+1]==="'"){t+=2;continue}t++;break}t++}}else if(e==="["){const o=r.indexOf("]",t);if(o<0)return!1;t=o+1}else if(Y(e)){let o=t;for(;t<n&&P(r[t]);)t++;const s=r.slice(o,t);let i=t;for(;i<n&&(r[i]===" "||r[i]==="	"||r[i]===`
`||r[i]==="\r");)i++;if(i<n&&r[i]==="("){const l=ft(s);if(l&&l.agg)return!0}}else t++}return!1}function ie(r){let t=!1,n=!1,e=!1,o=0;const s=r.length;for(;o<s;){const i=r[o];if(i==="'"||i==='"'){const l=i;for(o++;o<s;){if(r[o]==="\\"&&o+1<s){o+=2;continue}if(r[o]===l){if(l==="'"&&o+1<s&&r[o+1]==="'"){o+=2;continue}o++;break}o++}}else if(i==="["){const l=r.indexOf("]",o);if(l<0)return null;o=l+1}else if(Y(i)){const l=o;for(;o<s&&P(r[o]);)o++;const a=r.slice(l,o).toUpperCase();let c=o;for(;c<s&&(r[c]===" "||r[c]==="	"||r[c]===`
`||r[c]==="\r");)c++;if(c<s&&r[c]==="("){const u=ft(a);if(u&&u.agg)if(a==="SUM"||a==="COUNT")t=!0;else if(a==="MIN")n=!0;else if(a==="MAX")e=!0;else return null}}else o++}return t&&(n||e)||n&&e?null:t?"sum":n?"min":e?"max":null}function k(r){if(typeof r=="number")return Number.isFinite(r)?r:null;if(typeof r=="string"){const t=r.trim();return t===""||isNaN(Number(t))?null:Number(t)}return null}function R(r){return r===null?!1:typeof r=="number"?r!==0:r!==""&&r!=="0"}function rt(r,t,n){const e=k(r),o=k(t);if(e===null||o===null)return null;switch(n){case"+":return e+o;case"-":return e-o;case"*":return e*o;case"/":return o===0?null:e/o;case"%":return o===0?null:e%o;default:return null}}function ae(r,t,n){if(r===null||t===null)return null;const e=k(r),o=k(t);let s;if(e!==null&&o!==null)s=e<o?-1:e>o?1:0;else{const i=String(r),l=String(t);s=i<l?-1:i>l?1:0}switch(n){case">":return s>0?1:0;case"<":return s<0?1:0;case">=":return s>=0?1:0;case"<=":return s<=0?1:0;case"=":case"==":return s===0?1:0;case"!=":case"<>":return s!==0?1:0;default:return null}}function le(r,t){return r!==null&&!R(r)||t!==null&&!R(t)?0:r===null||t===null?null:1}function ce(r,t){return R(r)||R(t)?1:r===null||t===null?null:0}function A(r){if(r===null)return null;if(typeof r=="number"){if(r>1e11){const e=new Date(r);return isNaN(e.getTime())?null:e}if(r>1e8){const e=new Date(r*1e3);return isNaN(e.getTime())?null:e}if(Number.isInteger(r)&&r>=10000101&&r<=99991231){const e=String(r),o=new Date(Number(e.slice(0,4)),Number(e.slice(4,6))-1,Number(e.slice(6,8)));return isNaN(o.getTime())?null:o}return null}const t=r.trim();if(t==="")return null;const n=new Date(t.replace(/-/g,"/"));return isNaN(n.getTime())?null:n}function K(r){const t=n=>String(n).padStart(2,"0");return`${r.getFullYear()}-${t(r.getMonth()+1)}-${t(r.getDate())}`}function pe(r){const t=n=>String(n).padStart(2,"0");return`${K(r)} ${t(r.getHours())}:${t(r.getMinutes())}:${t(r.getSeconds())}`}function de(r){const t=new Date(r.getFullYear(),r.getMonth(),r.getDate()),n=(t.getTime()+3*864e5)/864e5,e=new Date(t.getFullYear(),0,1);return Math.floor((n-e.getDay()/7)/7)+1}function ue(r,t){const n=gt[r.toUpperCase()];if(!n||n.unsupported||t.length<n.minArgs||n.maxArgs>=0&&t.length>n.maxArgs)return null;switch(n.name){case"ABS":{const e=k(t[0]);return e===null?null:Math.abs(e)}case"CEIL":{const e=k(t[0]);return e===null?null:Math.ceil(e)}case"FLOOR":{const e=k(t[0]);return e===null?null:Math.floor(e)}case"ROUND":{const e=k(t[0]);if(e===null)return null;if(t.length===1)return Math.round(e);const o=k(t[1]);if(o===null)return null;const s=Math.pow(10,Math.trunc(o));return Math.round(e*s)/s}case"SQRT":{const e=k(t[0]);return e===null||e<0?null:Math.sqrt(e)}case"POW":{const e=k(t[0]),o=k(t[1]);return e===null||o===null?null:Math.pow(e,o)}case"GREATEST":case"LEAST":{const e=t.map(k);if(e.some(s=>s===null))return null;const o=e;return n.name==="GREATEST"?Math.max(...o):Math.min(...o)}case"LENGTH":return t[0]===null?null:String(t[0]).length;case"LOG":{const e=k(t[0]);if(e===null||e<=0)return null;if(t.length===1)return Math.log(e);const o=k(t[1]);return o===null||o<=0||o===1?null:Math.log(e)/Math.log(o)}case"CONCAT":return t.some(e=>e===null)?null:t.map(String).join("");case"CONCAT_WS":{const e=t[0];return e===null?null:t.slice(1).filter(o=>o!==null).map(String).join(String(e))}case"LOWER":return t[0]===null?null:String(t[0]).toLowerCase();case"UPPER":return t[0]===null?null:String(t[0]).toUpperCase();case"TRIM":return t[0]===null?null:String(t[0]).trim();case"REVERSE":return t[0]===null?null:[...String(t[0])].reverse().join("");case"REPEAT":{if(t[0]===null)return null;const e=k(t[1]);return e===null?null:String(t[0]).repeat(Math.max(0,Math.trunc(e)))}case"SUBSTR":{if(t[0]===null)return null;const e=String(t[0]),o=k(t[1]);if(o===null)return null;let s=Math.trunc(o)-1;if(s<0&&(s=Math.max(0,e.length+s+1)),t.length===2)return e.slice(s)||null;const i=k(t[2]);return i===null?null:e.slice(s,s+Math.max(0,Math.trunc(i)))||null}case"INSTR":return t[0]===null||t[1]===null?null:String(t[0]).indexOf(String(t[1]))+1;case"IF":return R(t[0])?t[1]:t[2];case"COALESCE":{for(const e of t)if(e!==null)return e;return null}case"CASE_WHEN":{for(let e=0;e+1<t.length;e+=2)if(R(t[e]))return t[e+1];return t[t.length-1]??null}case"YEAR":{const e=A(t[0]);return e?e.getFullYear():null}case"MONTH":{const e=A(t[0]);return e?e.getMonth()+1:null}case"QUARTER":{const e=A(t[0]);return e?Math.floor(e.getMonth()/3)+1:null}case"DAYOFMONTH":{const e=A(t[0]);return e?e.getDate():null}case"DAYOFWEEK":{const e=A(t[0]);return e?e.getDay()+1:null}case"WEEKOFYEAR":{const e=A(t[0]);return e?de(e):null}case"HOUR":{const e=A(t[0]);return e?e.getHours():null}case"DATEDIFF":{const e=A(t[0]),o=A(t[1]);if(!e||!o)return null;const s=new Date(e.getFullYear(),e.getMonth(),e.getDate()),i=new Date(o.getFullYear(),o.getMonth(),o.getDate());return Math.round((s.getTime()-i.getTime())/864e5)}case"DATE_ADD":case"DATE_SUB":{const e=A(t[0]);if(!e)return null;const o=k(t[1]);if(o===null)return null;const s=new Date(e);return s.setDate(s.getDate()+(n.name==="DATE_ADD"?Math.trunc(o):-Math.trunc(o))),K(s)}case"TO_DATE":{const e=A(t[0]);return e?K(e):null}case"LASTING_DAYS_TO_DATE":{const e=A(t[0]);if(!e)return null;const o=new Date,s=new Date(e.getFullYear(),e.getMonth(),e.getDate()),i=new Date(o.getFullYear(),o.getMonth(),o.getDate());return Math.round((i.getTime()-s.getTime())/864e5)}case"NOW":case"CURRENT_DATE":{const e=new Date;return n.name==="CURRENT_DATE"?K(e):pe(e)}case"SUM":case"AVG":case"MAX":case"MIN":case"COUNT_DISTINCT":return t.length===1?t[0]:null;case"COUNT":return t.length===1?t[0]===null?0:1:null;default:return null}}class he{constructor(t,n){this.pos=0,this.src=t,this.env=n}skipWS(){for(;this.pos<this.src.length;){const t=this.src[this.pos];if(t===" "||t==="	"||t===`
`||t==="\r")this.pos++;else return}}peek(){return this.pos<this.src.length?this.src[this.pos]:""}eof(){return this.skipWS(),this.pos>=this.src.length}consumeKeyword(t){this.skipWS();const n=this.src.slice(this.pos);return n.length>=t.length&&n.slice(0,t.length).toLowerCase()===t.toLowerCase()&&(n.length===t.length||!P(n[t.length]))?(this.pos+=t.length,!0):!1}consumeCmpOp(){for(const t of se)if(this.src.slice(this.pos,this.pos+t.length)===t)return this.pos+=t.length,t;return null}evalOr(){let t=this.evalAnd();for(;;)if(this.skipWS(),this.consumeKeyword("OR"))t=ce(t,this.evalAnd());else return t}evalAnd(){let t=this.evalNot();for(;;)if(this.skipWS(),this.consumeKeyword("AND"))t=le(t,this.evalNot());else return t}evalNot(){if(this.skipWS(),this.consumeKeyword("NOT")){const t=this.evalNot();return t===null?null:R(t)?0:1}return this.evalCmp()}evalCmp(){let t=this.evalAdd();for(;;){this.skipWS();const n=this.consumeCmpOp();if(!n)return t;t=ae(t,this.evalAdd(),n)}}evalAdd(){let t=this.evalMul();for(;;){this.skipWS();const n=this.peek();if(n==="+"||n==="-"){this.pos++,t=rt(t,this.evalMul(),n);continue}return t}}evalMul(){let t=this.evalUnary();for(;;){this.skipWS();const n=this.peek();if(n==="*"||n==="/"||n==="%"){this.pos++,t=rt(t,this.evalUnary(),n);continue}return t}}evalUnary(){this.skipWS();const t=this.peek();if(t==="-"||t==="+"){this.pos++;const n=this.evalUnary(),e=k(n);return e===null?null:t==="-"?-e:e}return this.evalPrimary()}evalPrimary(){if(this.skipWS(),this.pos>=this.src.length)return null;const t=this.src[this.pos];if(t==="["){const n=this.src.indexOf("]",this.pos);if(n<0)return null;const e=this.src.slice(this.pos+1,n).trim();return this.pos=n+1,e&&Object.prototype.hasOwnProperty.call(this.env,e)?this.env[e]:null}if(t==="'"||t==='"')return this.parseString();if(t==="("){this.pos++;const n=this.evalOr();return this.skipWS(),this.peek()!==")"?null:(this.pos++,n)}return t>="0"&&t<="9"||t==="."?this.parseNumber():Y(t)?this.parseCall():null}parseNumber(){const n=/^[0-9]*\.?[0-9]+([eE][+-]?[0-9]+)?/.exec(this.src.slice(this.pos));return n?(this.pos+=n[0].length,Number(n[0])):null}parseString(){const t=this.src[this.pos];this.pos++;let n="";for(;this.pos<this.src.length;){const e=this.src[this.pos];if(e==="\\"&&this.pos+1<this.src.length){n+=this.src[this.pos+1],this.pos+=2;continue}if(e===t){if(this.pos++,t==="'"&&this.pos<this.src.length&&this.src[this.pos]==="'"){n+="'",this.pos++;continue}return n}n+=e,this.pos++}return null}parseCall(){const t=this.pos;for(;this.pos<this.src.length&&P(this.src[this.pos]);)this.pos++;const n=this.src.slice(t,this.pos);if(this.skipWS(),this.peek()!=="(")return null;this.pos++;const e=[];if(this.skipWS(),this.peek()===")")this.pos++;else for(;;){if(e.push(this.evalOr()),this.skipWS(),this.peek()===","){this.pos++;continue}if(this.peek()===")"){this.pos++;break}return null}return ue(n,e)}}function ge(r,t){if(r.trim()==="")return null;const n=new he(r,t),e=n.evalOr();return n.eof()?e:null}function _t(r){const t=(r??"sum").trim();return t==="distinct"?"countDistinct":t}function V(r,t){const n=t.filter(e=>typeof e=="number");if(n.length===0)return null;switch(r){case"sum":case"count":{const e=n.reduce((o,s)=>o+s,0);return r==="sum"?Wt(e):e}case"min":return Math.min(...n);case"max":return Math.max(...n);default:return null}}function mt(r,t){const n=ie(r.expr);return n?V(n,t):null}const ot=r=>{if(typeof r=="number")return Number.isFinite(r)?r:null;if(r==null)return null;const t=Number(r);return Number.isFinite(t)?t:null};function fe(r,t){const n=r.dims,e={key:"",depth:0,value:null,children:[],subtotal:{}},o=s=>{var i,l;if(s.depth===n.length){for(const a of r.measures)s.subtotal[a.key]=ot((i=s.leaf)==null?void 0:i[a.key]);for(const a of r.computedFields??[])s.subtotal[a.key]=ot((l=s.leaf)==null?void 0:l[a.key]);return}for(const a of s.children)o(a);for(const a of r.measures)s.subtotal[a.key]=V(_t(a.agg),s.children.map(c=>c.subtotal[a.key]));for(const a of r.computedFields??[])a.expr.includes("[")&&X(a.expr)?s.subtotal[a.key]=mt(a,s.children.map(c=>c.subtotal[a.key])):s.subtotal[a.key]=zt(a,s.subtotal)};for(let s=0;s<t.length;s++){const i=t[s];let l=e;for(let a=0;a<n.length;a++){const c=i[n[a]],u=typeof c=="string"||typeof c=="number"?c:null;let p=l.children.find(b=>b.value===u);p||(p={key:l.key?`${l.key}\0${String(u)}`:String(u),depth:a+1,value:u,children:[],subtotal:{}},l.children.push(p)),l=p}l.leaf=i,l.leafIndex=s}return o(e),e}function _e(r,t,n={}){const e=r.dims;if(e.length===0||t.length===0)return[];const o=n.collapsed??new Set,s=n.subtotal??r.showSubtotal??!0,i=n.grandTotal??r.showGrandTotal??!0,l=fe(r,t),a=[],c=p=>{const b={};for(let y=0;y<e.length;y++)b[e[y]]="";const _=p.key.split("\0");for(let y=0;y<_.length&&y<e.length;y++)b[e[y]]=_[y];return b},u=p=>{if(p.depth===e.length){a.push({kind:"leaf",depth:p.depth,rowKey:`L:${p.key}`,groupKey:p.key,hasChildren:!1,sourceIndex:p.leafIndex??-1,values:{...p.leaf??{}}});return}if(s&&a.push({kind:"group",depth:p.depth,rowKey:`G:${p.key}`,groupKey:p.key,hasChildren:p.children.length>0,sourceIndex:-1,values:{...c(p),...p.subtotal}}),!o.has(p.key))for(const b of p.children)u(b)};for(const p of l.children)u(p);if(i){const p={};for(let _=0;_<e.length;_++)p[e[_]]=_===0?"总计":"";const b={};for(const _ of r.measures)b[_.key]=V(_t(_.agg),l.children.map(y=>y.subtotal[_.key]));for(const _ of r.computedFields??[])_.expr.includes("[")&&X(_.expr)?b[_.key]=mt(_,l.children.map(y=>y.subtotal[_.key])):b[_.key]=zt(_,b);a.push({kind:"total",depth:-1,rowKey:"TOTAL",groupKey:"TOTAL",hasChildren:!1,sourceIndex:-1,values:{...p,...b}})}return a}const st=/[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|[+\-*/()]|\s|./g,me=new Set(["+","-","*","/","(",")"]);function ze(r,t){const n=[];let e;for(st.lastIndex=0;e=st.exec(r);){const c=e[0];if(!/^\s$/.test(c)){if(me.has(c))n.push(c);else if(/^[0-9]/.test(c))n.push(Number(c));else if(/^[A-Za-z_]/.test(c)){const u=t[c];if(typeof u!="number")return null;n.push(u)}}}if(n.length===0)return null;let o=0;const s=()=>n[o],i=()=>{let c=l();for(;s()==="+"||s()==="-";){const u=s();o++;const p=l();c=u==="+"?c+p:c-p}return c},l=()=>{let c=a();for(;s()==="*"||s()==="/";){const u=s();o++;const p=a();c=u==="*"?c*p:c/p}return c},a=()=>{const c=s();if(c==="("){o++;const u=i();if(s()!==")")throw new Error("syntax");return o++,u}if(typeof c=="number")return o++,c;throw new Error("syntax")};try{const c=i();return o!==n.length?null:Number.isFinite(c)?c:null}catch{return null}}function zt(r,t){if(!r.expr.includes("["))return ze(r.expr,t);if(X(r.expr))return null;for(const e of oe(r.expr))if(!Object.prototype.hasOwnProperty.call(t,e))return null;const n=ge(r.expr,t);return typeof n=="number"?n:null}function be(r,t=""){return r.map((n,e)=>({kind:"data",values:n,key:t&&n[t]!=null?String(n[t]):String(e),depth:0,groupKey:"",hasChildren:!1,sourceIndex:e}))}function ye(r,t,n=new Set){return _e(r,t,{collapsed:n}).map(e=>({kind:e.kind==="leaf"?"data":e.kind,values:e.values,key:e.rowKey,depth:e.kind==="total"?0:e.depth,groupKey:e.groupKey,hasChildren:e.hasChildren,sourceIndex:e.kind==="leaf"?e.sourceIndex:-1}))}function xe(r,t,n){const e=r.find(a=>a.kind==="total")??null,o=r.filter(a=>a.kind!=="total");if(!(t>0))return{rows:o,total:e,page:1,pageCount:1,totalRows:o.length};const s=ve(o,t),i=Math.max(1,s.length),l=Math.min(Math.max(1,Math.trunc(n)||1),i);return{rows:s[l-1]??[],total:e,page:l,pageCount:i,totalRows:o.length}}function ve(r,t){const n=we(r),e=[];let o=[];for(const s of n)o.length&&o.length+s.length>t&&(e.push(o),o=[]),o.push(...s);return o.length&&e.push(o),e}function we(r){if(!r.some(o=>o.kind==="group"))return r.map(o=>[o]);const n=[];let e=null;for(const o of r){if(o.kind==="group"&&o.depth===1){e&&n.push(e),e=[o];continue}e?e.push(o):e=[o]}return e&&n.push(e),n}function it(r,t){return t.has(r.key)?t.get(r.key):jt(r).widthPx}function ke(r,t){return t.has(r.key)?t.get(r.key)+"px":r.width==null||r.width===""?"":typeof r.width=="number"?`${r.width}px`:String(r.width)}function Se(r,t,n,e=0){const o=new Map,s=new Map;let i=0;t&&(i=40);for(const a of r)a.fixed==="left"&&(o.set(a.key,i),i+=it(a,n));let l=e;for(let a=r.length-1;a>=0;a--){const c=r[a];c.fixed==="right"&&(s.set(c.key,l),l+=it(c,n))}return{left:o,right:s}}function at(r,t,n){return n==="server"||!t.length||!r.length?r:[...r].sort((e,o)=>{for(const{key:s,dir:i}of t){const l=e[s],a=o[s];if(l==null&&a==null)continue;if(l==null)return i==="asc"?-1:1;if(a==null)return i==="asc"?1:-1;const c=typeof l=="number"?l:Number(l),u=typeof a=="number"?a:Number(a);let p;if(!Number.isNaN(c)&&!Number.isNaN(u))p=c===u?0:c<u?-1:1;else{const b=String(l),_=String(a);p=b===_?0:b<_?-1:1}if(p!==0)return i==="desc"?-p:p}return 0})}function bt(r){return`z-rpt-tip-${m(r)}`}function Ce(r){return r.tip?g`<z-tooltip class="z-rpt__tip" content="${m(r.tip)}" placement="bottom" offset="6" delay="120"><span class="z-rpt__th-tip" part="header-tip" aria-hidden="true"></span></z-tooltip>`:""}function Te(r){const t=r.filter(n=>n.tip);return t.length?g`<div class="z-rpt__tip-defs" part="tip-defs">${t.map(n=>g`<span class="z-rpt__sr-only" id="${bt(n.key)}">${m(n.tip)}</span>`).join("")}</div>`:""}function Ae(r=1){return g`
      <th class="z-rpt__th z-rpt__th--checkbox z-rpt__th--fixed-left" part="header-cell"${r>1?g` rowspan="${r}"`:""}>
        <input type="checkbox" class="z-rpt__select-all" part="select-all" />
      </th>
    `}function $e(r,t){return g`<tr class="z-rpt__empty-row"><td colspan="${r}" class="z-rpt__empty-cell" part="empty">
                  <svg class="z-rpt__empty-icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>
                  <span class="z-rpt__empty-text">${m(t)}</span>
                </td></tr>`}function Ee(r,t,n=!1,e=0,o={}){const{sortState:s,editable:i,columnWidths:l,leftOffsets:a,rightOffsets:c}=t,u=i||t.resizable,p=s.findIndex(Ct=>Ct.key===r.key),b=p!==-1,_=b?s[p].dir:"",y=r.fixed?`z-rpt__th--fixed-${r.fixed}`:"",x=r.sortable?"z-rpt__th--sortable":"",z=b?`z-rpt__th--sorted z-rpt__th--sorted-${_}`:"",v=r.align?`z-rpt__cell--${r.align}`:"",C=r.resizable!==!1&&u?"z-rpt__th--resizable":"",H=i?"z-rpt__th--draggable":"",O=o.groupStart?"z-rpt__th--group-start":"",L=(o.name??"").trim(),B=L?` data-group-tone="${m(L)}"`:"",M=ke(r,l),E=[];M&&E.push(`width:${M}`),r.fixed==="left"&&a.has(r.key)&&E.push(`left:${a.get(r.key)}px`),r.fixed==="right"&&c.has(r.key)&&E.push(`right:${c.get(r.key)}px`);const I=E.length?` style="${E.join(";")}"`:"",W=b?_==="asc"?"ascending":"descending":r.sortable?"none":null,F=r.sortable?` tabindex="${n?"0":"-1"}"`:"",et=r.tip?bt(r.key):"",St=et?` aria-describedby="${et}"`:"";return g`
      <th class="z-rpt__th ${x} ${z} ${v} ${y} ${C} ${H} ${O}"
          ${I} data-key="${r.key}" part="header-cell" scope="col"${St}${B}
          ${e>1?`rowspan="${e}" `:""}${W?`aria-sort="${W}"`:""}${F}>
        <span class="z-rpt__th-content">${m(r.title)}</span>${Ce(r)}
        ${r.sortable?g`<span class="z-rpt__sort-icon" part="sort-icon" aria-hidden="true">
              <svg class="z-rpt__sort-chevron z-rpt__sort-chevron--asc" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
              <svg class="z-rpt__sort-chevron z-rpt__sort-chevron--desc" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
            </span>
            ${s.length>1&&b?g`<span class="z-rpt__sort-order">${p+1}</span>`:""}`:""}
        ${i?qt(r,{open:t.configOpen===r.key,format:t.colFormats[r.key],texts:t.texts}):""}
        ${r.resizable!==!1&&u?g`<span class="z-rpt__resize-handle" data-key="${r.key}" part="resize-handle"></span>`:""}
      </th>
    `}function Oe(r){const t=[];for(const n of r){const e=(n.group??"").trim();if(!e){t.push({kind:"single",col:n});continue}const o=t[t.length-1];o&&o.kind==="group"&&o.title===e?o.cols.push(n):t.push({kind:"group",title:e,cols:[n]})}return t}function yt(r){for(const t of r.cols){const n=(t.groupTone??"").trim();if(n)return n}return""}function Re(r,t){const n=r.cols[0],e=r.cols.every(p=>p.fixed==="left"),o=r.cols.every(p=>p.fixed==="right"),s=e?"z-rpt__th--fixed-left":o?"z-rpt__th--fixed-right":"",i=[];e&&t.leftOffsets.has(n.key)&&i.push(`left:${t.leftOffsets.get(n.key)}px`),o&&t.rightOffsets.has(n.key)&&i.push(`right:${t.rightOffsets.get(n.key)}px`);const l=i.length?` style="${i.join(";")}"`:"",a=["z-rpt__th","z-rpt__th--group",s].filter(Boolean).join(" "),c=yt(r),u=c?` data-group-tone="${m(c)}"`:"";return g`<th class="${a}" part="header-group"${u}
                 colspan="${r.cols.length}" scope="colgroup"${l} title="${m(r.title)}"><span class="z-rpt__th-content">${m(r.title)}</span></th>`}function Me(r){var y;const{vis:t,ctx:n,selectable:e,tools:o}=r,s=Oe(t),i=s.some(x=>x.kind==="group"),l=((y=t.find(x=>x.sortable))==null?void 0:y.key)??"",a=(x,z,v={})=>Ee(x,n,x.key===l,z,v),c=i?2:1,u=o?g`<th class="z-rpt__th z-rpt__th--tools" part="toolbar"${c>1?g` rowspan="${c}"`:""}>${o}</th>`:"",p=e?Ae(c):"";if(!i)return g`<tr>${p}${s.map(x=>x.kind==="single"?a(x.col,0,{name:x.col.groupTone}):"").join("")}${u}</tr>`;const b=s.map(x=>x.kind==="single"?a(x.col,2,{name:x.col.groupTone}):Re(x,n)).join(""),_=s.filter(x=>x.kind==="group").flatMap(x=>{const z=yt(x);return x.cols.map((v,C)=>a(v,0,{name:z,groupStart:C===0}))}).join("");return g`<tr class="z-rpt__headrow z-rpt__headrow--group">${p}${b}${u}</tr>`+g`<tr class="z-rpt__headrow z-rpt__headrow--cols">${_}</tr>`}function Ne(r,t,n,e,o){var y,x;const s=(o==null?void 0:o.kind)??"data",i=e.selectedKeys.includes(n)||(((y=e.isSelectedById)==null?void 0:y.call(e,r))??!1),l=i?"z-rpt__row--selected":"",a=e.rowClass&&e.rowClass(r,t)||"",c=s==="group"?"z-rpt__row--group":s==="total"?"z-rpt__row--total":"",u=((x=e.group)==null?void 0:x.dims[0])??"",p=e.visible.map(z=>{var F;const v=r[z.key],C=`z-rpt__cell--${z.align??"left"}`,H=z.fixed?`z-rpt__td--fixed-${z.fixed}`:"",O=[];z.fixed==="left"&&e.leftOffsets.has(z.key)&&O.push(`left:${e.leftOffsets.get(z.key)}px`),z.fixed==="right"&&e.rightOffsets.has(z.key)&&O.push(`right:${e.rightOffsets.get(z.key)}px`),o&&s==="group"&&z.key===u&&o.depth>0&&O.push(`padding-left:${10+(o.depth-1)*16}px`);const L=O.length?` style="${O.join(";")}"`:"",B=s==="group"&&!!e.group&&!!o&&e.group.dims[o.depth-1]===z.key,M=!!((F=e.group)!=null&&F.collapsed.has((o==null?void 0:o.groupKey)??"")),E=B&&(o!=null&&o.hasChildren)?`<button type="button" class="z-rpt__toggle" data-toggle="${m(o.groupKey)}" aria-expanded="${M?"false":"true"}" title="${M?"展开":"折叠"}" part="toggle">${M?"▸":"▾"}</button>`:"",I=o&&s!=="data"&&v==null?z.numeric?"—":"":z.render?z.render(v,r,t):m(v),W=!z.render&&!z.cellTag&&!(o&&s!=="data")&&(typeof v=="string"||typeof v=="number")?` title="${m(String(v))}"`:"";return z.cellTag?g`<td class="z-rpt__td ${C} ${H}"${L}${W} part="cell" data-cell-tag="${m(z.cellTag)}" data-cell-col="${m(z.key)}"><span class="z-cell-fallback">${E}${I}</span></td>`:g`<td class="z-rpt__td ${C} ${H}"${L}${W} part="cell">${E}${I}</td>`}).join(""),b=e.selectable?s==="data"?g`<td class="z-rpt__td z-rpt__td--checkbox z-rpt__td--fixed-left" part="cell">
          <input type="checkbox" class="z-rpt__row-checkbox" data-key="${m(n)}" ${i?"checked":""} part="row-checkbox" />
        </td>`:g`<td class="z-rpt__td z-rpt__td--checkbox z-rpt__td--fixed-left" part="cell"></td>`:"",_=e.tools?g`<td class="z-rpt__td z-rpt__td--tools" part="cell"></td>`:"";return g`<tr class="z-rpt__row ${l} ${c} ${a}" part="row" data-row-key="${m(n)}" data-index="${t}"${o?` data-row-kind="${s}"`:""}>${b}${p}${_}</tr>`}function lt(r,t){return r.map(n=>Ne(n.values,n.sourceIndex,n.key,t,{kind:n.kind,depth:n.depth,groupKey:n.groupKey,hasChildren:n.hasChildren})).join("")}function Le(r){const t=r.visible.map((o,s)=>{const i=`z-rpt__cell--${o.align??"left"}`;let l="";o.showFooter===!1?l="":o.footer!==void 0?l=typeof o.footer=="function"?m(o.footer(r.data)):m(o.footer):s===0&&r.footerLabel!==""&&(l=m(r.footerLabel));const a=o.fixed?`z-rpt__tf--fixed-${o.fixed}`:"",c=[];o.fixed==="left"&&r.leftOffsets.has(o.key)&&c.push(`left:${r.leftOffsets.get(o.key)}px`),o.fixed==="right"&&r.rightOffsets.has(o.key)&&c.push(`right:${r.rightOffsets.get(o.key)}px`);const u=c.length?` style="${c.join(";")}"`:"";return g`<th class="z-rpt__tf ${i} ${a}"${u} part="footer-cell">${l}</th>`}).join(""),n=r.selectable?g`<th class="z-rpt__tf z-rpt__tf--checkbox z-rpt__tf--fixed-left" part="footer-cell"></th>`:"",e=r.tools?g`<th class="z-rpt__tf z-rpt__tf--tools" part="footer-cell"></th>`:"";return g`
      <tfoot class="z-rpt__foot" part="foot">
        <tr>${n}${t}${e}</tr>
      </tfoot>
    `}const ct=new Set,pt=new WeakMap,We=120;function De(r){let t=pt.get(r);return t||(t={active:new Map,idle:new Map},pt.set(r,t)),t}function He(r,t,n){var l;const e=new Map(t.map(a=>[a.key,a])),o=De(r),s=new Set;let i=0;for(const a of Array.from(r.querySelectorAll("[data-cell-tag]"))){const c=a.dataset.cellTag??"",u=e.get(a.dataset.cellCol??"")??{key:a.dataset.cellValue??"name"};if(!c)continue;const p=n.rowElOf(a);if(!p||(l=n.skip)!=null&&l.call(n,p))continue;const b=n.rowOf(p);if(!b)continue;if(!customElements.get(c)){ct.has(c)||(ct.add(c),console.warn(`[cellTag] 列「${u.key}」的 cellTag="${c}" 没有注册，已回落为文本。 检查是否 import 了该元素的入口文件。`));continue}const y=n.keyOf?n.keyOf(p):p.dataset.rowKey??p.dataset.index??"",x=y!=="",z=`${y}\0${u.key}`;let v=x?o.active.get(z)??o.idle.get(z):void 0;v&&x&&o.idle.delete(z),(!v||v.localName!==c.toLowerCase())&&(v=document.createElement(c)),x&&(o.active.set(z,v),s.add(z));const C=v;C.value=b[u.key],C.row=b,C.index=n.indexOf?n.indexOf(p):Number(p.dataset.index??-1),C.selected=n.selectedOf?n.selectedOf(p):p.getAttribute("aria-selected")==="true",u.cellProps&&Object.assign(v,u.cellProps),C.parentElement!==a&&(a.textContent="",a.appendChild(C)),i++}for(const a of Array.from(o.active.keys())){if(s.has(a))continue;const c=o.active.get(a);o.active.delete(a),c&&o.idle.set(a,c)}for(;o.idle.size>We;){const a=o.idle.keys().next().value;if(a===void 0)break;o.idle.delete(a)}return i}function Ie(r,t,n){return He(r,t,{rowElOf:e=>e.closest("tr.z-rpt__row"),rowOf:e=>{const o=Number(e.dataset.index??-1);return o>=0?n[o]??null:null},selectedOf:e=>e.classList.contains("z-rpt__row--selected"),skip:e=>{const o=e.getAttribute("data-row-kind");return!!o&&o!=="data"}})}function xt(r){const t=r.dataset.cellui??"";return t==="switch"||t==="stepper"||t==="text"||t==="number"||t==="button"?t:r.classList.contains("zpm-switch")||r.classList.contains("zp-cellctl--switch")?"switch":r.classList.contains("zpm-stepper")||r.classList.contains("zp-cellctl--stepper")?"stepper":"button"}function vt(r,t){const{old:n}=t;if(r==="switch"){const e=n==null?"":String(n).trim().toLowerCase();return{next:e==="1"||e==="true"||e==="yes"||e==="on"||e==="y"?"0":"1",changed:!0}}if(r==="stepper"){const e=t.dir===-1?-1:1,o=t.step??1,s=t.min??Number.NEGATIVE_INFINITY,i=t.max??Number.POSITIVE_INFINITY,l=Number(n??0)||0,a=Math.min(i,Math.max(s,l+e*o));return{next:String(a),changed:a!==l}}if(r==="text"||r==="number"){if(t.typed===void 0)return null;const e=t.typed;if(r==="text")return{next:e,changed:String(n??"")!==e};const o=n==null||n===""?null:Number(n),s=e.trim();if(s==="")return{next:"",changed:o!==null};const i=Number(s);return Number.isFinite(i)?{next:String(i),changed:o===null||o!==i}:null}return{next:"1",changed:!0}}function Fe(r,t){const n=r.target.closest(".z-rpt__th--sortable");if(!n||r.target.closest(".z-rpt__resize-handle"))return;const e=n.dataset.key;if(!e)return;const o=r.shiftKey,s=t.getSortState().findIndex(i=>i.key===e);if(o){const i=[...t.getSortState()];s===-1?i.push({key:e,dir:"asc"}):i[s].dir==="asc"?i[s]={key:e,dir:"desc"}:i.splice(s,1),t.setSortState(i)}else s===-1?t.setSortState([{key:e,dir:"asc"}]):t.getSortState()[s].dir==="asc"?t.setSortState([{key:e,dir:"desc"}]):t.setSortState([]);t.emit("z-sort",{sortState:[...t.getSortState()]}),t.emitConfigChange()}function Ke(r,t){const n=r.target.closest(".z-rpt__resize-handle");if(!n)return;r.preventDefault();const e=n.dataset.key,o=n.closest("th"),s=t.visibleColumns().find(c=>c.key===e);if(!s)return;const i=o.getBoundingClientRect().width,l=j(s.minWidth)||50,a=j(s.maxWidth)||1/0;t.setResizeInfo({colKey:e,startX:r.clientX,startWidth:i,minWidth:l,maxWidth:a}),t.setResizing(!0),document.body.style.cursor="col-resize",document.body.style.userSelect="none"}function Pe(r,t){const n=t.getResizeInfo();if(!n)return;const{colKey:e,startX:o,startWidth:s,minWidth:i,maxWidth:l}=n,a=Math.max(i,Math.min(l,s+(r.clientX-o)));t.columnWidths().set(e,Math.round(a)),t.update()}function Ye(r){const t=r.getResizeInfo();if(!t)return;const n=t.colKey;r.setResizing(!1),document.body.style.cursor="",document.body.style.userSelect="",r.setResizeInfo(null),r.emit("z-column-resize",{key:n,width:r.columnWidths().get(n)}),r.emitConfigChange()}function wt(r,t,n){const e=(r==null?void 0:r.querySelectorAll("th[data-key]"))??[];for(const o of Array.from(e)){const s=o.getBoundingClientRect();if(t>=s.left&&t<s.right&&n>=s.top&&n<=s.bottom)return o}return null}function Be(r,t){if(r.button!==0)return;const n=r.target;if(!(n!=null&&n.closest)||n.closest(".z-rpt__resize-handle"))return;const e=n.closest("th[data-key]"),o=e==null?void 0:e.dataset.key;o&&t.setDragKey(o)}function Ue(r,t){const n=t.getDragKey();if(!n)return;const e=wt(t.root(),r.clientX,r.clientY);!e||e.dataset.key===n||(Q(t.root()),e.classList.add("z-rpt__th--drag-over"))}function je(r,t){Q(t.root());const n=t.getDragKey();if(t.setDragKey(null),!n)return;const e=wt(t.root(),r.clientX,r.clientY),o=e==null?void 0:e.dataset.key;if(!o||o===n)return;const s=t.getColumns(),i=s.findIndex(p=>p.key===n),l=s.findIndex(p=>p.key===o);if(i===-1||l===-1)return;const a=[...s],[c]=a.splice(i,1),u=a.findIndex(p=>p.key===o);a.splice(u,0,c),t.setColumns(a),t.emit("z-column-order-change",{keys:a.map(p=>p.key)}),t.emitConfigChange()}function dt(r){r.setDragKey(null),Q(r.root())}function qe(r,t,n){let e=null;const o=s=>{n()&&(e==null||e.abort(),Be(s,t),t.getDragKey()&&(e=new Nt({onMove:i=>{i.moved&&Ue(i.event,t)},onEnd:i=>{i.moved?je(i.event,t):dt(t),e=null},onCancel:()=>{dt(t),e=null}}),e.begin(s)))};return r.addEventListener("pointerdown",o),()=>r.removeEventListener("pointerdown",o)}function Q(r){r==null||r.querySelectorAll(".z-rpt__th--drag-over").forEach(t=>t.classList.remove("z-rpt__th--drag-over"))}function Ge(r,t){const n=r.composedPath(),e=n.find(y=>y instanceof Element&&y.hasAttribute("data-cell"));if(!e)return!1;const o=e.closest(".z-rpt__row"),s=Number((o==null?void 0:o.dataset.index)??"-1"),i=t.sortedRows()[s];if(!i)return!0;const l=xt(e),a=e.dataset.cell??"",c=i[a],u=n.find(y=>y instanceof Element&&y.hasAttribute("data-act")),p=(u==null?void 0:u.getAttribute("data-act"))==="dec"?-1:1,b=vt(l,{old:c,dir:p,step:e.dataset.step!==void 0?Number(e.dataset.step):void 0,min:e.dataset.min!==void 0?Number(e.dataset.min):void 0,max:e.dataset.max!==void 0?Number(e.dataset.max):void 0});if(!b||!b.changed)return!0;const _=b.next;return kt(e,t),t.emit("z-cell-change",{index:s,row:i,field:a,old:c,next:_,ui:l,eventName:e.dataset.onchange??"",args:e.dataset.args??"[]"}),!0}function Xe(r,t){const n=r.closest("[data-cell]");if(!n)return!1;const e=n.closest(".z-rpt__row"),o=Number((e==null?void 0:e.dataset.index)??"-1"),s=t.sortedRows()[o];if(!s)return!0;const i=n.dataset.cell??"",l=xt(n),a=vt(l,{old:s[i],typed:r.value});return!a||!a.changed||(kt(n,t),t.emit("z-cell-change",{index:o,row:s,field:i,old:s[i],next:a.next,ui:l,eventName:n.dataset.onchange??"",args:n.dataset.args??"[]"})),!0}function kt(r,t){var n,e;if(!((n=t.draftMode)!=null&&n.call(t))){r.classList.add("is-pending");return}r.classList.add("is-dirty"),(e=r.closest(".z-rpt__row"))==null||e.classList.add("is-dirty")}function Ve(r,t){if(!t.rowClickable())return!1;const n=r.composedPath(),e=n.findIndex(l=>l instanceof Element&&l.classList.contains("z-rpt__row"));if(e===-1)return!1;for(let l=0;l<e;l++){const a=n[l];if(!(a instanceof Element))continue;const c=a.tagName;if(c==="BUTTON"||c==="INPUT"||c==="SELECT"||c==="TEXTAREA"||c==="A"){const u=a.closest("[data-rowact]");if(u){const p=u.dataset.event;if(p){const b=n[e],_=Number(b.dataset.index??-1),y=_>=0?t.sortedRows()[_]:void 0;if(y!==void 0)return t.emit("z-cell-act",{index:_,row:y,event:p}),!0}continue}return!1}if(c.includes("-"))return!1}const o=n[e],s=Number(o.dataset.index??-1),i=t.sortedRows()[s];return s<0||i===void 0?!1:(t.emit("z-row-click",{index:s,row:i}),!0)}function Qe(r,t){var e,o;const n=r.target;if((e=n==null?void 0:n.matches)!=null&&e.call(n,"input.zp-cellctl--input")){Xe(n,t);return}if(n.classList.contains("z-rpt__select-all"))r.target.checked?t.selectAll():t.clearSelection();else if(n.classList.contains("z-rpt__row-checkbox")){const s=r.target,i=s.dataset.key,l=new Set(t.selectedKeys());s.checked?l.add(i):l.delete(i),t.setSelectedKeys([...l]);const a=[...t.selectedKeys()];t.emit("z-selection-change",{selectedKeys:a,rows:((o=t.rowsOfKeys)==null?void 0:o.call(t,a))??[]})}else if(n.classList.contains("z-rpt__th-config-footer")){const s=n,i=s.dataset.key,l=t.getColumns().find(a=>a.key===i);l&&(l.showFooter=s.checked,t.update(),t.emit("z-column-config-change",{key:i,align:l.align??null,showFooter:l.showFooter}),t.emitConfigChange())}}function Je(r,t,n){return r.map((o,s)=>ht(o,s,t)).filter(o=>n.includes(o)).length}var Ze=Object.defineProperty,f=(r,t,n,e)=>{for(var o=void 0,s=r.length-1,i;s>=0;s--)(i=r[s])&&(o=i(t,n,o)||o);return o&&Ze(t,n,o),o};const ut=32,tn=24,en=2e3,Z=class Z extends q{constructor(){super(...arguments),this.selectedRowId="",this.rowClass=null,this.columns=[],this.data=[],this.sortState=[],this.selectedKeys=[],this.selectable=!1,this.editable=!1,this.resizable=!1,this.showColumnSelector=!0,this.rowClickable=!0,this.sortMode="client",this.rowKey="",this.draftMode=!1,this.showFooter=!1,this.striped=!1,this.bordered=!1,this.lines=!1,this.size="md",this.loading=!1,this.maxHeight="",this.emptyText=w.empty,this.loadingText=w.loading,this.footerLabel=w.total,this.requiredColumnText=w.requiredField,this.footerToggleText=w.total,this.columnSettingsText=w.columnSettings,this.alignLeftText=w.alignLeft,this.alignCenterText=w.alignCenter,this.alignRightText=w.alignRight,this.pinNoneText=w.pinNone,this.pinLeftText=w.pinLeft,this.pinRightText=w.pinRight,this.columnsText=w.columns,this.colFormats={},this.formatTypeText="格式",this.numberText="数值",this.percentText="百分数",this.decimalPlacesText="小数位",this.thousandsText="千分位",this.autoText="自动",this.columnSelectorOpen=!1,this._configOpen=null,this.group=null,this.tree=null,this.pageSize=0,this.page=1,this.pageMode="client",this.totalRecords=0,this.pagerTotalText="共 {n} 条",this.pagerPageText="第 {p} / {c} 页",this.prevPageText=w.prevPage,this.nextPageText=w.nextPage,this.pageSizeOptions="",this.pagerSizeText="每页 {n} 行",this.pagerSizeLabel="每页行数",this._collapsed=new Set,this._cursor=null,this._refocusThKey=null,this._refocusSelector=null,this._paged={rows:[],total:null,page:1,pageCount:1,totalRows:0},this._columnWidths=new Map,this._resizeInfo=null,this._leftOffsets=new Map,this._rightOffsets=new Map,this._eventsBound=!1,this._scrollWrapper=null,this._dragKey=null,this._sortedRows=[],this._onHeadMouseDown=t=>Ke(t,this._interactionHost),this._onResizeMouseMove=t=>Pe(t,this._interactionHost),this._onResizeMouseUp=()=>Ye(this._interactionHost),this._unbindColDrag=null,this._onHeadClick=t=>Fe(t,this._interactionHost),this._onShadowKeydown=t=>{var _,y,x,z;if(t.key==="Escape"&&(this.columnSelectorOpen||this._configOpen)){this.columnSelectorOpen=!1,this._configOpen=null,this.requestUpdate();return}const n=(y=(_=t.target).closest)==null?void 0:y.call(_,".z-rpt__th--sortable");if(n){if(t.key==="Enter"||t.key===" "){t.preventDefault(),n.click();return}Et(this._sortableThs(),n,t.key,{wrap:!1,axis:"horizontal"})&&t.preventDefault();return}const e=(z=(x=t.target).closest)==null?void 0:z.call(x,".z-rpt__td");if(!e)return;const o=Ot(t.key,t);if(!o)return;const s=e.parentElement,i=this._gridRows(),l=s?i.indexOf(s):-1,a=s?Array.from(s.children).indexOf(e):-1;if(l<0||a<0)return;const c={row:l,col:a},u=this._gridBounds(i),p=Rt(c,o,u);if(t.preventDefault(),Mt(p,c))return;const b=this._cellAt(i,p);b&&(this._cursor=p,U(b,this._allCells(i)))},this._refreshScrollState=()=>{var o;const t=(o=this.shadowRoot)==null?void 0:o.querySelector(".z-rpt__wrapper");if(!t)return;const n=t.scrollLeft>0,e=t.scrollLeft+t.clientWidth<t.scrollWidth-1;t.classList.toggle("z-rpt__wrapper--scrolled-left",n),t.classList.toggle("z-rpt__wrapper--scrolled-right",e)},this._onShadowClick=t=>{var e,o,s,i;if(this._onGroupToggle(t)||this._onPagerClick(t)||Ge(t,this._interactionHost)||Ve(t,this._interactionHost)||ee(t.target,this._panelHost))return;const n=(o=(e=t.target)==null?void 0:e.closest)==null?void 0:o.call(e,".z-rpt__th--sortable");n&&!((i=(s=t.target)==null?void 0:s.closest)!=null&&i.call(s,".z-rpt__resize-handle"))&&(this._refocusThKey=n.dataset.key??null),this._onHeadClick(t)},this._onGlobalMouseDown=t=>{var e;if(!this._configOpen)return;const n=(e=this.shadowRoot)==null?void 0:e.host;n&&(t.composedPath().includes(n)||(this._configOpen=null,this.requestUpdate()))},this._onColumnSelectorOpenEvent=t=>{const n=t.target;if(!n||n.tagName!=="Z-COLUMN-SELECTOR")return;const e=t.type==="z-column-selector-open";this.columnSelectorOpen!==e&&(this.columnSelectorOpen=e)},this._onTableChange=t=>{this._onPagerSizeChange(t)||Qe(t,this._interactionHost)}}get _visible(){return this.columns.filter(t=>!t.hidden||t.required)}get shownColumns(){return this._visible}_viewRows(t){return!this.group||!this.group.dims.length?be(t,this.rowKey):ye(this.group,t,this._collapsed)}renderRows(){return this._viewRows(at(this.data,this.sortState,this.sortMode))}get pageCount(){return this._paged.pageCount}_setPage(t){const n=Math.min(Math.max(1,Math.trunc(t)||1),Math.max(1,this._paged.pageCount));n!==this._paged.page&&(this.page=n,this.emit("z-page-change",{page:n,pageSize:this.pageSize}),this.requestUpdate())}_setPageSize(t){t!==this.pageSize&&(this.pageSize=t,this.page=1,this.emit("z-page-change",{page:1,pageSize:t}),this.requestUpdate())}_sizeChoices(){const t=this.pageSizeOptions.split(",").map(n=>Math.trunc(Number(n.trim()))).filter(n=>Number.isFinite(n)&&n>0);return this.pageSize>0&&t.push(this.pageSize),[...new Set(t)].sort((n,e)=>n-e)}_renderPager(t){if(!(this.pageSize>0))return"";const n=this._sizeChoices(),e=n.length>1,o=this.pageMode!=="server"&&t.pageCount<=1;if(o&&!e||e&&t.totalRows===0&&t.rows.length===0)return"";const s=`${this.pagerTotalText.replace("{n}",String(t.totalRows))} · ${this.pagerPageText.replace("{p}",String(t.page)).replace("{c}",String(t.pageCount))}`,i=(a,c,u)=>`<button type="button" class="z-rpt__pager-btn" data-page-go="${a}"${u?" disabled":""} part="pager-button">${m(c)}</button>`,l=e?`<span class="z-rpt__pager-size"><select data-page-size part="pager-size-select"
           aria-label="${m(this.pagerSizeLabel)}">${n.map(a=>`<option value="${a}"${a===this.pageSize?" selected":""}>${m(this.pagerSizeText.replace("{n}",String(a)))}</option>`).join("")}</select></span>`:"";return g`
      <div class="z-rpt__pager" part="pager">
        <span class="z-rpt__pager-info" part="pager-info">${m(s)}</span>
        <div class="z-rpt__pager-right">
          ${l}
          ${o?"":g`<div class="z-rpt__pager-btns">
            ${i("prev",this.prevPageText,t.page<=1)}${i("next",this.nextPageText,t.page>=t.pageCount)}
          </div>`}
        </div>
      </div>
    `}_onGroupToggle(t){var s,i;const n=(i=(s=t.target)==null?void 0:s.closest)==null?void 0:i.call(s,"[data-toggle]");if(!n)return!1;const e=n.getAttribute("data-toggle")??"",o=!this._collapsed.has(e);return o?this._collapsed.add(e):this._collapsed.delete(e),this.emit("z-group-toggle",{groupKey:e,collapsed:o}),this.requestUpdate(),!0}_onPagerClick(t){var o,s;const n=(s=(o=t.target)==null?void 0:o.closest)==null?void 0:s.call(o,"[data-page-go]");if(!n||n.hasAttribute("disabled"))return!1;const e=n.getAttribute("data-page-go");return this._refocusSelector=`[data-page-go="${e}"]`,this._setPage(e==="next"?this._paged.page+1:this._paged.page-1),!0}_onPagerSizeChange(t){var o,s;const n=(s=(o=t.target)==null?void 0:o.closest)==null?void 0:s.call(o,"[data-page-size]");if(!n)return!1;const e=Math.trunc(Number(n.value));return!Number.isFinite(e)||e<=0?!1:(this._refocusSelector="[data-page-size]",this._setPageSize(e),!0)}connectedCallback(){super.connectedCallback(),document.addEventListener("mousemove",this._onResizeMouseMove),document.addEventListener("mouseup",this._onResizeMouseUp),document.addEventListener("mousedown",this._onGlobalMouseDown)}disconnectedCallback(){var t;document.removeEventListener("mousemove",this._onResizeMouseMove),document.removeEventListener("mouseup",this._onResizeMouseUp),document.removeEventListener("mousedown",this._onGlobalMouseDown),(t=this._unbindColDrag)==null||t.call(this),this._unbindColDrag=null,super.disconnectedCallback()}attributeChangedCallback(t,n,e){if(t==="variant"){e==="lines"?this.lines=!0:e==="default"&&(this.lines=!1);return}super.attributeChangedCallback(t,n,e)}get variant(){return this.lines?"lines":"default"}set variant(t){this.lines=t==="lines"}render(){const t=this._visible,n=this.showColumnSelector,e=Se(t,this.selectable,this._columnWidths,n?ut:0);this._leftOffsets=e.left,this._rightOffsets=e.right;const o=["z-rpt",this.striped?"z-rpt--striped":"",this.bordered?"z-rpt--bordered":"",this.lines?"z-rpt--lines":"",`z-rpt--${this.size}`,this.loading?"z-rpt--loading":"",this.selectable?"z-rpt--selectable":"",t.some(z=>!!z.group)?"z-rpt--grouped":""].filter(Boolean).join(" "),s=at(this.data,this.sortState,this.sortMode);this._sortedRows=s;const i=this._viewRows(s),l=xe(i,this.pageMode==="server"?0:this.pageSize,this.page);this._paged=this.pageMode==="server"&&this.pageSize>0?{...l,page:Math.max(1,this.page),pageCount:Math.max(1,Math.ceil(Math.max(0,this.totalRecords)/this.pageSize)||1),totalRows:this.totalRecords>0?this.totalRecords:l.totalRows}:l;const a=t.length+(this.selectable?1:0)+(n?1:0),c={sortState:this.sortState,editable:this.editable,resizable:this.resizable||this.editable,columnWidths:this._columnWidths,leftOffsets:this._leftOffsets,rightOffsets:this._rightOffsets,configOpen:this._configOpen,colFormats:this.colFormats,texts:this},u={selectable:this.selectable,selectedKeys:this.selectedKeys,visible:t,leftOffsets:this._leftOffsets,rightOffsets:this._rightOffsets,isSelectedById:z=>this._selectedById(z),rowClass:this.rowClass,group:this.group?{dims:this.group.dims,collapsed:this._collapsed}:null,tools:n},p={visible:t,data:this.data,footerLabel:this.footerLabel,selectable:this.selectable,leftOffsets:this._leftOffsets,rightOffsets:this._rightOffsets,tools:n},b=n?g`<z-column-selector ${this.columnSelectorOpen?"open":""}
              columnstext="${m(this.columnsText)}" requiredcolumntext="${m(this.requiredColumnText)}"></z-column-selector>`:"",_=Me({vis:t,ctx:c,selectable:this.selectable,tools:b}),x=t.some(z=>(z.group??"").trim()!=="")?g`<colgroup>
          ${this.selectable?g`<col style="width:40px">`:""}
          ${t.map(z=>{const v=this._columnWidths.get(z.key),C=v!=null?`${v}px`:z.width||"";return C?g`<col style="width:${C}">`:g`<col>`})}
          ${n?g`<col style="width:${ut}px">`:""}
        </colgroup>`:"";return g`
      ${Te(t)}
      <div class="z-rpt__wrapper" part="wrapper"
           ${this.maxHeight?`style="max-height:${this.maxHeight};overflow-y:auto"`:""}>
        <table class="${o}" part="table">
          ${x}
          <thead class="z-rpt__head" part="head">${_}</thead>
          <tbody class="z-rpt__body" part="body">
            ${this._paged.rows.length===0?$e(a,this.emptyText):lt(this._paged.rows,u)}
            ${this._paged.total?lt([this._paged.total],u):""}
          </tbody>
          ${this.showFooter&&t.length>0?Le(p):""}
        </table>
        ${this.loading?g`<div class="z-rpt__loading-overlay" part="loading">
              <span class="z-rpt__spinner" part="spinner"></span>
              <span class="z-rpt__loading-text">${m(this.loadingText)}</span>
            </div>`:""}
      </div>
      ${this._renderPager(this._paged)}
    `}updated(){var n;this._bindEvents(),this._bindWrapperScroll(),this._refreshScrollState();const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".z-rpt__foot");if(this.style.setProperty("--z-rpt-foot-h",t?`${Math.round(t.getBoundingClientRect().height)}px`:"0px"),this._applyCursor(),this._restoreFocus(),Ie(this.shadowRoot,this._visible,this._sortedRows),this.selectable){const e=this.shadowRoot.querySelector(".z-rpt__select-all");if(e){const o=this.data.length,s=Je(this.data,this.rowKey,this.selectedKeys);e.checked=o>0&&s===o,e.indeterminate=s>0&&s<o}}}getConfig(){return ne(this,this._columnWidths)}applyConfig(t){re(this,this._columnWidths,t)}setColumnWidths(t){if(!t||typeof t!="object")return;let n=!1;for(const[e,o]of Object.entries(t)){const s=Math.round(Number(o));!Number.isFinite(s)||s<tn||s>en||this._columnWidths.get(e)!==s&&(this._columnWidths.set(e,s),n=!0)}n&&this.requestUpdate()}getColumnWidths(){return Object.fromEntries(this._columnWidths)}_emitConfigChange(){this.emit("z-config-change",{config:this.getConfig()})}clearSelection(){this.selectedKeys=[],this.emit("z-selection-change",{selectedKeys:[],rows:[]})}selectAll(){this.selectedKeys=this.data.map((t,n)=>this._getRowKey(t,n)),this.emit("z-selection-change",{selectedKeys:[...this.selectedKeys],rows:[...this.data]})}rowsOfKeys(t){if(!t.length)return[];const n=new Set(t);return this.data.filter((e,o)=>n.has(this._getRowKey(e,o)))}showColumn(t){const n=this.columns.find(e=>e.key===t);n&&n.hidden&&(n.hidden=!1,this.requestUpdate(),this._emitConfigChange())}hideColumn(t){const n=this.columns.find(e=>e.key===t);n&&!n.required&&!n.hidden&&(n.hidden=!0,this.requestUpdate(),this._emitConfigChange())}toggleColumn(t){const n=this.columns.find(e=>e.key===t);n&&!n.required&&(n.hidden=!n.hidden,this.requestUpdate(),this._emitConfigChange())}get _panelHost(){return{columns:this.columns,colFormats:this.colFormats,setConfigOpen:t=>{this._configOpen=t},getConfigOpen:()=>this._configOpen,update:()=>this.requestUpdate(),emit:(t,n)=>this.emit(t,n),emitConfigChange:()=>this._emitConfigChange(),setColFormats:t=>{this.colFormats=t}}}get _interactionHost(){return{visibleColumns:()=>this._visible,columnWidths:()=>this._columnWidths,getSortState:()=>this.sortState,setSortState:t=>{this.sortState=t},getColumns:()=>this.columns,setColumns:t=>{this.columns=t},getResizeInfo:()=>this._resizeInfo,setResizeInfo:t=>{this._resizeInfo=t},getDragKey:()=>this._dragKey,setDragKey:t=>{this._dragKey=t},setResizing:t=>{this.classList.toggle("z-rpt--resizing",t)},root:()=>this.shadowRoot,rowClickable:()=>this.rowClickable,sortedRows:()=>this._sortedRows,data:()=>this.data,rowKey:()=>this.rowKey,draftMode:()=>this.draftMode,selectedKeys:()=>this.selectedKeys,setSelectedKeys:t=>{this.selectedKeys=t},rowsOfKeys:t=>this.rowsOfKeys(t),selectAll:()=>this.selectAll(),clearSelection:()=>this.clearSelection(),emit:(t,n)=>this.emit(t,n),update:()=>this.requestUpdate(),emitConfigChange:()=>this._emitConfigChange()}}_bindEvents(){if(this._eventsBound)return;const t=this.shadowRoot;t&&(t.addEventListener("mousedown",this._onHeadMouseDown),t.addEventListener("click",this._onShadowClick),t.addEventListener("change",this._onTableChange),t.addEventListener("keydown",this._onShadowKeydown),t.addEventListener("z-column-selector-open",this._onColumnSelectorOpenEvent),t.addEventListener("z-column-selector-close",this._onColumnSelectorOpenEvent),this._unbindColDrag=qe(this.shadowRoot,this._interactionHost,()=>this.editable),this._eventsBound=!0)}_gridRows(){var t;return Array.from(((t=this.shadowRoot)==null?void 0:t.querySelectorAll("tbody .z-rpt__row"))??[])}_gridBounds(t){let n=0;for(const e of t)n=Math.max(n,e.children.length);return{rows:t.length,cols:n}}_cellAt(t,n){var e;return((e=t[n.row])==null?void 0:e.children[n.col])??null}_allCells(t){return t.flatMap(n=>Array.from(n.children))}_applyCursor(){const t=this._gridRows();if(!t.length)return;const n=this._gridBounds(t),e=this._cursor,o=e&&e.row<n.rows&&e.col<n.cols?e:{row:0,col:0},s=this._cellAt(t,o);s&&U(s,this._allCells(t),{focus:!1})}_restoreFocus(){var i,l,a;const t=this._refocusThKey,n=this._refocusSelector;if(this._refocusThKey=null,this._refocusSelector=null,t){const c=(i=this.shadowRoot)==null?void 0:i.querySelector(`.z-rpt__th[data-key="${t}"]`);if(c){U(c,this._sortableThs());return}}if(!n)return;const e=(l=this.shadowRoot)==null?void 0:l.querySelector(n);if(e&&!e.disabled){e.focus();return}const o=/data-page-go="prev"/.test(n)?'[data-page-go="next"]':/data-page-go="next"/.test(n)?'[data-page-go="prev"]':null,s=o?(a=this.shadowRoot)==null?void 0:a.querySelector(o):null;s&&!s.disabled&&s.focus()}_sortableThs(){var t;return Array.from(((t=this.shadowRoot)==null?void 0:t.querySelectorAll(".z-rpt__th--sortable"))??[])}_bindWrapperScroll(){var n;const t=(n=this.shadowRoot)==null?void 0:n.querySelector(".z-rpt__wrapper");!t||t===this._scrollWrapper||(this._scrollWrapper=t,t.addEventListener("scroll",this._refreshScrollState,{passive:!0}))}_getRowKey(t,n){return ht(t,n,this.rowKey)}_selectedById(t){const n=this.selectedRowId.trim();if(!n)return!1;for(const e of n.split(",")){const o=e.indexOf(":");if(o<0)continue;const s=e.slice(0,o).trim(),i=e.slice(o+1).trim();if(!(!s||!i)&&String(t[s]??"")===i)return!0}return!1}};Z.styles=Ft+Kt+Yt+Bt+Pt;let h=Z;f([d({type:String,attribute:"selected-row-id"})],h.prototype,"selectedRowId");f([d({attribute:!1})],h.prototype,"rowClass");f([d({type:Array,attribute:!1})],h.prototype,"columns");f([d({type:Array,attribute:!1})],h.prototype,"data");f([d({type:Array,attribute:!1})],h.prototype,"sortState");f([d({type:Array,attribute:!1})],h.prototype,"selectedKeys");f([d({type:Boolean})],h.prototype,"selectable");f([d({type:Boolean})],h.prototype,"editable");f([d({type:Boolean})],h.prototype,"resizable");f([d({type:Boolean})],h.prototype,"showColumnSelector");f([d({type:Boolean})],h.prototype,"rowClickable");f([d({type:String})],h.prototype,"sortMode");f([d({type:String})],h.prototype,"rowKey");f([d({type:Boolean})],h.prototype,"draftMode");f([d({type:Boolean})],h.prototype,"showFooter");f([d({type:Boolean})],h.prototype,"striped");f([d({type:Boolean})],h.prototype,"bordered");f([d({type:Boolean})],h.prototype,"lines");f([d({type:String})],h.prototype,"size");f([d({type:Boolean})],h.prototype,"loading");f([d({type:String})],h.prototype,"maxHeight");f([d({type:String})],h.prototype,"emptyText");f([d({type:String})],h.prototype,"loadingText");f([d({type:String})],h.prototype,"footerLabel");f([d({type:String})],h.prototype,"requiredColumnText");f([d({type:String})],h.prototype,"footerToggleText");f([d({type:String})],h.prototype,"columnSettingsText");f([d({type:String})],h.prototype,"alignLeftText");f([d({type:String})],h.prototype,"alignCenterText");f([d({type:String})],h.prototype,"alignRightText");f([d({type:String})],h.prototype,"pinNoneText");f([d({type:String})],h.prototype,"pinLeftText");f([d({type:String})],h.prototype,"pinRightText");f([d({type:String})],h.prototype,"columnsText");f([d({type:Object,attribute:!1})],h.prototype,"colFormats");f([d({type:String})],h.prototype,"formatTypeText");f([d({type:String})],h.prototype,"numberText");f([d({type:String})],h.prototype,"percentText");f([d({type:String})],h.prototype,"decimalPlacesText");f([d({type:String})],h.prototype,"thousandsText");f([d({type:String})],h.prototype,"autoText");f([d({type:Boolean})],h.prototype,"columnSelectorOpen");f([d({type:Object,attribute:!1})],h.prototype,"group");f([d({type:Boolean,attribute:"tree"})],h.prototype,"tree");f([d({type:Number,attribute:"page-size"})],h.prototype,"pageSize");f([d({type:Number})],h.prototype,"page");f([d({type:String,attribute:"page-mode"})],h.prototype,"pageMode");f([d({type:Number,attribute:"total-records"})],h.prototype,"totalRecords");f([d({type:String,attribute:"pager-total-text"})],h.prototype,"pagerTotalText");f([d({type:String,attribute:"pager-page-text"})],h.prototype,"pagerPageText");f([d({type:String,attribute:"prev-page-text"})],h.prototype,"prevPageText");f([d({type:String,attribute:"next-page-text"})],h.prototype,"nextPageText");f([d({type:String,attribute:"page-size-options"})],h.prototype,"pageSizeOptions");f([d({type:String,attribute:"pager-size-text"})],h.prototype,"pagerSizeText");f([d({type:String,attribute:"pager-size-label"})],h.prototype,"pagerSizeLabel");$t(h,"variant");customElements.define("z-report-table",h);const nn=`:host {
  display: inline-flex;
}

.z-pagination {
  display: flex;
  align-items: center;
  gap: 2px;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
}

.z-pagination__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* [WHY] 紧凑商务风分页按钮（REQ-010）：32 → 28 */
  min-width: 28px;
  height: var(--_h, var(--z-control-h-sm));
  padding: 0 var(--z-space-2);
  border: 1px solid var(--z-color-border-control);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  color: var(--z-color-text);
  font-family: inherit;
  font-size: inherit;
  cursor: pointer;
  transition: all var(--z-transition-fast);
  line-height: 1;
}

.z-pagination__btn:active:not(:disabled) {
  transform: scale(0.95);
}

.z-pagination__btn:hover:not(:disabled) {
  background: var(--z-color-hover);
  border-color: var(--z-color-border-control-hover);
}

.z-pagination__btn:disabled {
  color: var(--z-color-text-disabled);
  cursor: not-allowed;
  opacity: 0.6;
}

.z-pagination__item--active {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

.z-pagination__item--active:active:not(:disabled) {
  transform: scale(0.95);
}

.z-pagination__item--active:hover:not(:disabled) {
  background: var(--z-color-primary-solid-hover);
  border-color: var(--z-color-primary-solid-hover);
}

.z-pagination__ellipsis {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: var(--_h, var(--z-control-h-sm));
  color: var(--z-color-text-secondary);
  user-select: none;
}

.z-pagination__prev svg,
.z-pagination__next svg {
  width: 14px;
  height: 14px;
}

/* ── Info（总记录数 / 本页范围） ── */

.z-pagination__info {
  color: var(--z-color-text-secondary);
  margin-right: var(--z-space-3);
  white-space: nowrap;
}

/* ── Page size selector ── */

.z-pagination__sizes {
  display: inline-flex;
  align-items: center;
  margin-left: var(--z-space-3);
}

.z-pagination__sizes select {
  /* [WHY] 紧凑商务风页容量选择器（REQ-010）：32 → 28 */
  height: var(--_h, var(--z-control-h-sm));
  padding: 0 var(--z-space-2);
  font-family: inherit;
  font-size: inherit;
  color: var(--z-color-text);
  background: var(--z-color-bg);
  border: 1px solid var(--z-color-border-control);
  border-radius: var(--z-radius-md);
  cursor: pointer;
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
}

.z-pagination__sizes select:hover {
  border-color: var(--z-color-border-control-hover);
}

.z-pagination__sizes select:focus-visible {
  outline: none;
  border-color: var(--z-color-primary);
  /* [WHY] 聚焦光环对齐主色 #2563eb（REQ-010） */
  box-shadow: var(--z-focus-ring);
}
`;var rn=Object.defineProperty,T=(r,t,n,e)=>{for(var o=void 0,s=r.length-1,i;s>=0;s--)(i=r[s])&&(o=i(t,n,o)||o);return o&&rn(t,n,o),o};const on='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4l-4 4 4 4"/></svg>',sn='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>',tt=class tt extends q{constructor(){super(...arguments),this.current=1,this.total=1,this.pageSize=10,this.siblings=1,this.totalRecords=0,this.showInfo=!1,this.infoTemplate="Total {total} items",this.showPageSize=!1,this.pageSizes=[10,20,50,100],this.sizeLabel=w.pageSizeSuffix,this.navLabel=w.pagination,this.prevLabel=w.prevPage,this.nextLabel=w.nextPage,this.size="sm",this._onClick=t=>{const n=t.target.closest("[data-page], [data-action]");if(!n)return;let e=this.current;const o=n.dataset.action;o==="prev"?e=Math.max(1,this.current-1):o==="next"?e=Math.min(this.pageCount,this.current+1):n.dataset.page&&(e=Number(n.dataset.page)),e!==this.current&&e>=1&&e<=this.pageCount&&(this.current=e,this.emit("z-change",{page:e,pageSize:this.pageSize,total:this.pageCount,totalRecords:this.totalRecords}))},this._onChange=t=>{const n=t.target.closest(".z-pagination__sizes select");if(!n)return;const e=Number(n.value);if(!Number.isFinite(e)||e<=0||e===this.pageSize)return;this.pageSize=e;const o=Math.min(this.current,this.pageCount);o!==this.current&&(this.current=o),this.emit("z-size-change",{pageSize:e}),this.emit("z-change",{page:o,pageSize:e,total:this.pageCount,totalRecords:this.totalRecords})}}willUpdate(){this.style.setProperty("--_h",Lt(this.size))}get pageCount(){return this.totalRecords>0?Math.max(1,Math.ceil(this.totalRecords/this.pageSize)):Math.max(1,this.total)}render(){const t=this._getPages(),n=this.showInfo?g`<span class="z-pagination__info" part="info">${this._renderInfo()}</span>`:"",e=this.showPageSize?g`
          <label class="z-pagination__sizes" part="sizes">
            <select aria-label="${m(this.sizeLabel)}">
              ${this._getSizeOptions().map(o=>g`<option value="${o}" ${o===this.pageSize?"selected":""}>${o}${this.sizeLabel}</option>`).join("")}
            </select>
          </label>
        `:"";return g`
      <nav class="z-pagination" part="root" role="navigation" aria-label="${m(this.navLabel)}">
        ${n}
        <button type="button" class="z-pagination__btn z-pagination__prev" part="prev"
                ${this.current<=1?"disabled":""} aria-label="${m(this.prevLabel)}"
                data-action="prev">
          ${on}
        </button>
        ${t.map(o=>{if(o==="...")return g`<span class="z-pagination__ellipsis" part="ellipsis">...</span>`;const s=o===this.current?"z-pagination__item--active":"";return g`
            <button type="button"
                    class="z-pagination__btn z-pagination__item ${s}"
                    part="item"
                    data-page="${o}"
                    aria-current="${o===this.current?"page":"false"}">
              ${o}
            </button>
          `}).join("")}
        <button type="button" class="z-pagination__btn z-pagination__next" part="next"
                ${this.current>=this.pageCount?"disabled":""} aria-label="${m(this.nextLabel)}"
                data-action="next">
          ${sn}
        </button>
        ${e}
      </nav>
    `}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("change",this._onChange)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("change",this._onChange),super.disconnectedCallback()}updated(){const t=this.pageCount;this.current<1?this.current=1:this.current>t&&(this.current=t)}_getPages(){const{current:t,siblings:n}=this,e=this.pageCount;if(e<=7)return Array.from({length:e},(l,a)=>a+1);const o=Math.max(2,t-n),s=Math.min(e-1,t+n),i=[1];o>2&&i.push("...");for(let l=o;l<=s;l++)i.push(l);return s<e-1&&i.push("..."),e>1&&i.push(e),i}_getSizeOptions(){const t=this.pageSizes.filter(n=>typeof n=="number"&&n>0);return t.includes(this.pageSize)?t:[...t,this.pageSize]}_renderInfo(){const t=this.totalRecords>0?(this.current-1)*this.pageSize+1:0,n=this.totalRecords>0?Math.min(this.current*this.pageSize,this.totalRecords):0,e={total:String(this.totalRecords),current:String(this.current),pageSize:String(this.pageSize),start:String(t),end:String(n)};return this.infoTemplate.replace(/\{(total|current|pageSize|start|end)\}/g,(o,s)=>e[s]??o)}};tt.styles=nn;let S=tt;T([d({type:Number})],S.prototype,"current");T([d({type:Number})],S.prototype,"total");T([d({type:Number,attribute:"page-size"})],S.prototype,"pageSize");T([d({type:Number})],S.prototype,"siblings");T([d({type:Number,attribute:"total-records"})],S.prototype,"totalRecords");T([d({type:Boolean,attribute:"show-info"})],S.prototype,"showInfo");T([d({type:String,attribute:"info-template"})],S.prototype,"infoTemplate");T([d({type:Boolean,attribute:"show-page-size"})],S.prototype,"showPageSize");T([d({type:Array,attribute:!1})],S.prototype,"pageSizes");T([d({type:String,attribute:"size-label"})],S.prototype,"sizeLabel");T([d({type:String})],S.prototype,"navLabel");T([d({type:String})],S.prototype,"prevLabel");T([d({type:String})],S.prototype,"nextLabel");T([d({type:String})],S.prototype,"size");customElements.define("z-pagination",S);
