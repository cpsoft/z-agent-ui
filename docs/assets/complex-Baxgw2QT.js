import{B as z,e as c,h as m,p as a,a as j,b as C,f as ae,g as Re,c as Gt,t as Ke,i as qe,d as ke}from"./presets-CdaBrvJF.js";/* empty css             */import{t as M,i as gn}from"./shell-DwQ7nMfw.js";import{C as O}from"./copy-DoHMT7Ic.js";import{x as Dt}from"./marked.esm-CfNX39EO.js";import{a as Le,s as zn,b as bn,c as Jt,d as yn}from"./a11y-DJ6wHu5s.js";import"./Login-D4uXnzW9.js";import{c as xn}from"./Input-wCelPXsT.js";import"./Position-D6zl9ryN.js";import{P as wn}from"./PointerDragSession-D3R9IvJB.js";import"./Checkbox-PuEiz19l.js";import{g as je,r as Qt}from"./DataList-DaJ2JPjN.js";import{i as Zt}from"./styleInjection-peqqYNO6.js";import{F as en}from"./floatingPanel-BYE_1ufg.js";import{F as tn}from"./Select-Dm4kbGWW.js";import{o as kn}from"./afterAnimation-DHK-FZ_K.js";import{p as Qe,l as Ze,r as me,u as fe}from"./overlayManager-BcmTS8Jm.js";import{l as Sn,c as Ln,r as $n}from"./roving-DMg3clv6.js";import"./Button-6M0Me5pu.js";import"./Pagination-D9yYEaKb.js";const jt=new Set(["script","style","iframe","frame","frameset","object","embed","applet","link","meta","base","form","template"]),Rt=new Set(["srcdoc","formaction","xlink:href","action","background","poster","srcset"]),Cn=new Set(["href","src","cite","data","longdesc","usemap"]),En=new Set(["values","to","from","by"]),nn=/^data:image\/(?:png|jpe?g|gif|webp|bmp);/i,et=/^(?:javascript|vbscript|data|file|blob|filesystem):/i;function tt(s){return s.replace(/[\u0000-\u0020\u007f]/g,"")}function Pn(s,e){const t=tt(s).toLowerCase();return!et.test(t)||e&&t.startsWith("data:")&&nn.test(t)?s:"#"}const Mn=/url\s*\(\s*(?:'([^']*)'|"([^"]*)"|([^'")]*))\s*\)/gi;function On(s,e){return s.replace(Mn,(t,r,n,i)=>{const l=tt(r??n??i??"").toLowerCase();return!et.test(l)||e&&nn.test(l)?t:"url(#)"})}function rn(s,e={}){var l,h;if(!s)return"";const t=(l=e.extraDropTags)!=null&&l.length?new Set([...jt,...e.extraDropTags.map(p=>p.toLowerCase())]):jt,r=(h=e.extraDropAttrs)!=null&&h.length?new Set([...Rt,...e.extraDropAttrs.map(p=>p.toLowerCase())]):Rt,n=e.allowDataImage!==!1,o=new DOMParser().parseFromString(`<body>${s}</body>`,"text/html").body;for(const p of Array.from(o.querySelectorAll("*"))){if(t.has(p.tagName.toLowerCase())){p.remove();continue}for(const _ of Array.from(p.attributes)){const f=_.name.toLowerCase();if(f.startsWith("on")||r.has(f)){p.removeAttribute(_.name);continue}if(Cn.has(f)){const v=Pn(_.value,n);v!==_.value&&p.setAttribute(_.name,v);continue}if(f==="style"&&_.value&&/url\s*\(/i.test(_.value)){const v=On(_.value,n);v!==_.value&&p.setAttribute(_.name,v);continue}En.has(f)&&_.value&&et.test(tt(_.value))&&p.removeAttribute(_.name)}}return o.innerHTML}class An{constructor(e,t){this._wasOpen=!1,this._closing=!1,this._portalSaved=null,this._focusTrap=null,this._closeToken=0,this.owned=!1,this.onCloseComplete=null,this._host=e,this._opts=t}get closing(){return this._closing}afterUpdate(){var r;const e=this._host,t=this._wasOpen;if(this._wasOpen=e.open,e.open&&!t){if(!e.isConnected)return;this._closing&&(this._closing=!1,e.requestUpdate()),e.portal&&e.parentElement!==document.body&&!this._portalSaved&&(this._portalSaved={parent:e.parentNode,next:e.nextSibling},document.body.appendChild(e));const n=Qe(e);e.style.setProperty(this._opts.stackIndexVar,String(n)),Ze();const i=e.shadowRoot.querySelector(this._opts.panelSelector);i&&(this._focusTrap=new tn({container:i})),e.emit("z-open")}else!e.open&&t&&(e.emit("z-close"),me(e),fe(),(r=this._focusTrap)==null||r.destroy(),this._focusTrap=null,this._portalSaved&&(this._portalSaved.parent.insertBefore(e,this._portalSaved.next),this._portalSaved=null),this._closing=!0,e.requestUpdate());if(this._closing){const n=e.shadowRoot.querySelector(this._opts.panelSelector);if(n){const i=++this._closeToken;kn(n,()=>{if(i===this._closeToken)if(this._closing=!1,this.owned){const o=this.onCloseComplete;e.remove(),o==null||o()}else e.requestUpdate()},{kind:"animation"})}}}handleDisconnect(){var e;this._wasOpen&&(me(this._host),fe()),(e=this._focusTrap)==null||e.destroy(),this._focusTrap=null}}const Tn=`/* ===== z-markdown: Markdown rendering styles ===== */

:host {
  display: block;
  color: var(--z-color-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-md);
  line-height: var(--z-line-height);
  word-wrap: break-word;
}

/* ── Headings ── */
.z-markdown h1,
.z-markdown h2,
.z-markdown h3,
.z-markdown h4,
.z-markdown h5,
.z-markdown h6 {
  margin-top: var(--z-space-6);
  margin-bottom: var(--z-space-4);
  font-weight: var(--z-font-weight-semibold);
  line-height: 1.25;
  color: var(--z-color-text);
}

.z-markdown h1 { font-size: 2em; border-bottom: 1px solid var(--z-color-border); padding-bottom: 0.3em; }
.z-markdown h2 { font-size: 1.5em; border-bottom: 1px solid var(--z-color-border); padding-bottom: 0.3em; }
.z-markdown h3 { font-size: 1.25em; }
.z-markdown h4 { font-size: 1em; }
.z-markdown h5 { font-size: 0.875em; }
.z-markdown h6 { font-size: 0.85em; color: var(--z-color-text-secondary); }

.z-markdown h1:first-child,
.z-markdown h2:first-child,
.z-markdown h3:first-child,
.z-markdown h4:first-child,
.z-markdown h5:first-child,
.z-markdown h6:first-child {
  margin-top: 0;
}

/* ── Paragraphs ── */
.z-markdown p {
  margin-top: 0;
  margin-bottom: var(--z-space-4);
}

/* ── Links ── */
.z-markdown a {
  color: var(--z-color-primary);
  text-decoration: none;
}

.z-markdown a:hover {
  text-decoration: underline;
}

/* ── Lists ── */
.z-markdown ul,
.z-markdown ol {
  margin-top: 0;
  margin-bottom: var(--z-space-4);
  padding-left: 2em;
}

.z-markdown li + li {
  margin-top: 0.25em;
}

.z-markdown li > ul,
.z-markdown li > ol {
  margin-bottom: 0;
}

/* ── Task lists ── */
.z-markdown input[type="checkbox"] {
  margin-right: 0.5em;
  accent-color: var(--z-color-primary);
}

.z-markdown li:has(input[type="checkbox"]) {
  list-style: none;
  margin-left: -1.5em;
}

/* ── Blockquotes ── */
.z-markdown blockquote {
  margin: 0 0 var(--z-space-4);
  padding: 0 var(--z-space-4);
  color: var(--z-color-text-secondary);
  border-left: 4px solid var(--z-color-border);
}

.z-markdown blockquote > :last-child {
  margin-bottom: 0;
}

/* ── Inline code ── */
.z-markdown code {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  font-family: var(--z-font-mono);
  background-color: var(--z-color-bg-secondary);
  border-radius: var(--z-radius-sm);
  color: var(--z-color-primary);
}

/* ── Code blocks ── */
.z-markdown pre {
  margin-top: 0;
  margin-bottom: var(--z-space-4);
  padding: var(--z-space-4);
  overflow-x: auto;
  font-size: 85%;
  font-family: var(--z-font-mono);
  line-height: 1.45;
  background-color: #1e1e2e;
  color: #cdd6f4;
  border-radius: var(--z-radius-md);
}

.z-markdown pre code {
  padding: 0;
  margin: 0;
  font-size: 100%;
  font-family: inherit;
  background: none;
  color: inherit;
  border-radius: 0;
}

/* ── Tables ── */
.z-markdown__table {
  overflow-x: auto;
  margin-bottom: var(--z-space-4);
  border-radius: var(--z-radius-md);
  border: 1px solid var(--z-color-border);
}

/* 键盘焦点必须看得见：这个容器现在是 Tab 停靠点（横向溢出时靠方向键滚），
   没有可见焦点的话，用户 Tab 进来只看到「什么都没发生」。
   offset 用负值 —— 容器边框贴着表格线，正的偏移会画到正文上。 */
.z-markdown__table:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: -2px;
}

.z-markdown__table table {
  margin-bottom: 0;
  border: none;
}

.z-markdown table {
  width: 100%;
  border-collapse: collapse;
  border-spacing: 0;
  font-size: var(--z-font-size-sm);
}

.z-markdown th,
.z-markdown td {
  padding: var(--z-space-2) var(--z-space-3);
  text-align: left;
  border: 1px solid var(--z-color-border);
}

.z-markdown th {
  font-weight: var(--z-font-weight-semibold);
  background-color: var(--z-color-bg-secondary);
}

.z-markdown th[align="center"],
.z-markdown td[align="center"] {
  text-align: center;
}

.z-markdown th[align="right"],
.z-markdown td[align="right"] {
  text-align: right;
}

.z-markdown tr:nth-child(even) {
  background-color: var(--z-color-bg-secondary);
}

/* ── Horizontal rules ── */
.z-markdown hr {
  height: 1px;
  padding: 0;
  margin: var(--z-space-6) 0;
  border: 0;
  background-color: var(--z-color-border);
}

/* ── Images ── */
.z-markdown img {
  max-width: 100%;
  height: auto;
  border-radius: var(--z-radius-md);
}

/* ── Strong / Emphasis ── */
.z-markdown strong { font-weight: var(--z-font-weight-semibold); }
.z-markdown em { font-style: italic; }

/* ── Strikethrough ── */
.z-markdown del { color: var(--z-color-text-secondary); }
`;var In=Object.defineProperty,nt=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&In(e,t,n),n};function Dn(s,e){const t=`class="z-markdown__table" role="region" tabindex="0" aria-label="${c(e)}"`;return s.replace(/<table>/g,`<div ${t}><table>`).replace(/<\/table>/g,"</table></div>")}const pt=class pt extends z{constructor(){super(...arguments),this.content="",this.tableLabel=O.tableRegion,this.highlight=null}_getRenderer(){const e=this.highlight,t=new Dt.Renderer;return t.code=function(r){const n=r.lang||"",i=r.text,o=n?` class="language-${n}"`:"";if(e)try{const h=e(i,n);return`<pre><code${o}>${h}</code></pre>
`}catch{}const l=c(i);return`<pre><code${o}>${l}</code></pre>
`},t}render(){if(!this.content)return"";const e=this._getRenderer();let t;try{t=Dt.parse(this.content,{gfm:!0,breaks:!1,renderer:e})}catch{return m`<div class="z-markdown"><p>Invalid markdown content</p></div>`}const r=Dn(rn(t),this.tableLabel||O.tableRegion);return queueMicrotask(()=>{this.emit("z-render",{html:r})}),m`<div class="z-markdown">${r}</div>`}};pt.styles=Tn;let ve=pt;nt([a({type:String})],ve.prototype,"content");nt([a({type:String})],ve.prototype,"tableLabel");nt([a({type:Object,attribute:!1})],ve.prototype,"highlight");customElements.define("z-markdown",ve);const jn=`/* ===== z-code-editor ===== */
/* [WHY] 双层对齐硬约束：textarea 与 pre 必须逐像素同字体/字号/行高/内边距/
   换行策略，否则高亮层与光标错位（REQ-017 验收 2） */

:host {
  display: block;
  height: 240px;
}

.z-ce {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background-color: var(--z-color-bg);
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
  box-sizing: border-box;
}

.z-ce:focus-within {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-ce--readonly {
  background-color: var(--z-color-bg-secondary);
}

/* ── Gutter（行号） ── */

.z-ce__gutter {
  flex: none;
  min-width: 40px;
  padding: 10px 0 10px 6px;
  overflow: hidden;
  text-align: right;
  user-select: none;
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-sm);
  line-height: 1.6;
  color: var(--z-color-text-disabled);
  border-right: 1px solid var(--z-color-border);
  background-color: var(--z-color-bg-secondary);
}

.z-ce__gutter span {
  display: block;
  padding-right: 8px;
}

/* [WHY] wrap 模式下软换行导致视觉行 != 逻辑行，行号失去对应关系 → 隐藏（REQ-017） */
.z-ce--wrap .z-ce__gutter {
  display: none;
}

/* ── Body + 双层 ── */

.z-ce__body {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.z-ce__highlight {
  position: absolute;
  inset: 0;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
}

.z-ce__highlight code {
  display: block;
  min-height: 100%;
  padding: 10px 12px;
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-sm);
  line-height: 1.6;
  color: var(--z-color-text);
  white-space: pre;
  tab-size: 4;
  box-sizing: border-box;
}

.z-ce--wrap .z-ce__highlight code {
  white-space: pre-wrap;
  word-break: break-word;
}

.z-ce__textarea {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  border: none;
  outline: none;
  resize: none;
  padding: 10px 12px;
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-sm);
  line-height: 1.6;
  /* [WHY] 文字透明让下层高亮透出，仅保留光标与选区底色 */
  color: transparent;
  caret-color: var(--z-color-text);
  background: transparent;
  white-space: pre;
  overflow: auto;
  tab-size: 4;
  box-sizing: border-box;
}

.z-ce--wrap .z-ce__textarea {
  white-space: pre-wrap;
  word-break: break-word;
}

.z-ce__textarea::placeholder {
  color: var(--z-color-text-disabled);
}

.z-ce__textarea::selection {
  background: rgba(37, 99, 235, 0.25);
}

.z-ce--readonly .z-ce__textarea {
  cursor: default;
}

/* ── Token 配色（语义 token 派生，明暗自动跟随） ── */

.tok-comment {
  color: var(--z-color-text-secondary);
  font-style: italic;
}
.tok-string {
  color: var(--z-color-success);
}
.tok-number {
  color: var(--z-color-warning);
}
.tok-keyword {
  color: var(--z-color-primary);
  font-weight: 600;
}
.tok-literal {
  color: var(--z-color-danger);
}
.tok-tag {
  color: color-mix(in srgb, var(--z-color-primary) 55%, var(--z-color-text));
}
.tok-attr {
  color: color-mix(in srgb, var(--z-color-success) 55%, var(--z-color-text));
}
.tok-func {
  color: color-mix(in srgb, var(--z-color-warning) 60%, var(--z-color-text));
}
.tok-punct {
  color: var(--z-color-text-secondary);
}

/* ── 自动补全 / 参数提示浮层 ── */

.z-ce__popup {
  position: absolute;
  z-index: 20;
  display: none;
  min-width: 160px;
  max-width: 300px;
  max-height: 160px;
  overflow: auto;
  background-color: var(--z-color-bg);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-sm);
  box-shadow: var(--z-shadow-md);
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-xs);
  line-height: 1.5;
  box-sizing: border-box;
}

.z-ce__item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 8px;
  cursor: pointer;
  color: var(--z-color-text);
  white-space: nowrap;
}

.z-ce__item--active {
  background: color-mix(in srgb, var(--z-color-primary) 15%, transparent);
}

.z-ce__item-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.z-ce__item-detail {
  margin-left: auto;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--z-color-text-secondary);
}

.z-ce__item-kind {
  flex: none;
  color: var(--z-color-text-disabled);
}

.z-ce__sig {
  padding: 6px 10px;
  white-space: nowrap;
  color: var(--z-color-text);
}

.z-ce__sig-name {
  color: var(--z-color-primary);
  font-weight: 600;
}

.z-ce__sig-param--active {
  color: var(--z-color-primary);
  font-weight: 600;
  text-decoration: underline;
}

.z-ce__sig-desc {
  padding: 0 10px 6px;
  font-family: var(--z-font-sans);
  color: var(--z-color-text-secondary);
}
`,u=(s,e,t="")=>({re:new RegExp(s,t+"y"),cls:e}),Ve=[u("/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/|//[^\\n]*","tok-comment"),u("(?:'(?:\\\\.|[^'\\\\\\n])*'|\"(?:\\\\.|[^\"\\\\\\n])*\"|`(?:\\\\.|[^`\\\\])*`)","tok-string"),u("</?[A-Za-z][\\w.:-]*|/?>","tok-tag"),u("\\b0[xXbBoO][\\da-fA-F_]+n?\\b|\\b\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?\\d+)?n?\\b","tok-number"),u("\\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|new|class|extends|super|this|import|export|from|default|try|catch|finally|throw|typeof|instanceof|in|of|async|await|yield|static|get|set|delete|void|debugger|with|as|implements|interface|type|enum|namespace|declare|readonly|public|private|protected|abstract|satisfies|keyof|infer|is)\\b","tok-keyword"),u("\\b(?:true|false|null|undefined|NaN|Infinity)\\b","tok-literal"),u("\\b[A-Za-z_$][\\w$]*(?=\\s*\\()","tok-func"),u("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~]+","tok-punct")],sn={js:Ve,ts:Ve,jsx:Ve,css:[u("/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/","tok-comment"),u(`(?:'(?:\\\\.|[^'\\\\\\n])*'|"(?:\\\\.|[^"\\\\\\n])*")`,"tok-string"),u("@[\\w-]+|!important\\b","tok-keyword"),u("#[0-9a-fA-F]{3,8}\\b|-?\\b\\d[\\d_]*(?:\\.\\d+)?(?:px|em|rem|vh|vw|vmin|vmax|s|ms|deg|fr|pt|ch|ex|%)?\\b","tok-number"),u("\\.[-\\w]+|#[-\\w]+|::?[a-zA-Z-]+","tok-tag"),u("[-a-zA-Z_]+(?=\\s*:)","tok-attr"),u("[{}();:,>~+*]","tok-punct")],html:[u("<!--[\\s\\S]*?-->","tok-comment"),u("<!DOCTYPE[^>]*>","tok-keyword"),u("</?[a-zA-Z][\\w.:-]*","tok-tag"),u("/?>","tok-punct"),u(`(?:'(?:[^'\\n])*'|"(?:[^"\\n])*")`,"tok-string"),u("[a-zA-Z_:@\\[\\)\\]][\\w:.@\\-\\(\\)]*(?=\\s*=)","tok-attr")],json:[u('"(?:\\\\.|[^"\\\\])*"(?=\\s*:)',"tok-attr"),u('"(?:\\\\.|[^"\\\\])*"',"tok-string"),u("-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b","tok-number"),u("\\b(?:true|false|null)\\b","tok-literal"),u("[{}\\[\\],:]","tok-punct")],markdown:[u("```[\\s\\S]*?```|~~~[\\s\\S]*?~~~","tok-string"),u("^#{1,6}[^\\n]*","tok-keyword","m"),u("^>[^\\n]*","tok-comment","m"),u("\\*\\*[^*\\n]+\\*\\*|__[^_\\n]+__|\\*[^*\\n]+\\*|_[^_\\n]+_|`[^`\\n]+`","tok-tag"),u("\\[[^\\]\\n]*\\]\\([^)\\n]*\\)","tok-attr"),u("^[ \\t]*(?:[-*+]|\\d+\\.)\\s","tok-punct","m")],python:[u("#[^\\n]*","tok-comment"),u(`(?:'''[\\s\\S]*?'''|"""[\\s\\S]*?""")`,"tok-string"),u(`(?:'(?:\\\\.|[^'\\\\\\n])*'|"(?:\\\\.|[^"\\\\\\n])*")`,"tok-string"),u("@[\\w.]+","tok-keyword"),u("\\b(?:def|class|return|if|elif|else|for|while|import|from|as|with|try|except|finally|raise|lambda|pass|break|continue|global|nonlocal|assert|yield|del|in|is|not|and|or|async|await|match|case)\\b","tok-keyword"),u("\\b(?:True|False|None|self|cls)\\b","tok-literal"),u("\\b0[xXbBoO][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?j?\\b","tok-number"),u("\\b[A-Za-z_][\\w]*(?=\\s*\\()","tok-func"),u("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~@]+","tok-punct")],lua:[u("--\\[(=*)\\[[\\s\\S]*?\\]\\1\\]","tok-comment"),u("--[^\\n]*","tok-comment"),u("\\[(=*)\\[[\\s\\S]*?\\]\\1\\]","tok-string"),u(`(?:'(?:\\\\.|[^'\\\\\\n])*'|"(?:\\\\.|[^"\\\\\\n])*")`,"tok-string"),u("\\b0[xX][\\da-fA-F_]+\\b|\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b","tok-number"),u("\\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\\b","tok-keyword"),u("\\b[A-Za-z_]\\w*(?=\\s*\\()","tok-func"),u("[{}()\\[\\];,.:?!=+\\-*/%<>&|^~#]+","tok-punct")]};function Rn(s,e){const t=e==="auto"||e==="plain"?void 0:sn[e];if(!t)return j(s);let r="",n="",i=0;const o=()=>{n&&(r+=j(n),n="")};for(;i<s.length;){let l=!1;for(const h of t){h.re.lastIndex=i;const p=h.re.exec(s);if(p&&p[0].length>0){o(),r+=`<span class="${h.cls}">${j(p[0])}</span>`,i+=p[0].length,l=!0;break}}l||(n+=s[i],i++)}return o(),r}function qn(s){const e=s==="auto"||s==="plain"?void 0:sn[s];if(!e)return[];const t=[];for(const r of e){if(r.cls!=="tok-keyword"&&r.cls!=="tok-literal")continue;const n=/\\b\(\?:([^)]+)\)/.exec(r.re.source);if(n)for(const i of n[1].split("|"))i&&t.push(i)}return t}function Bn(s){const e=s.trimStart();if(!e)return"plain";if(/^#![^\n]*python/.test(e))return"python";if(/^#![^\n]*lua\b/.test(e))return"lua";if(/^#![^\n]*(?:bash|sh)\b/.test(e))return"plain";if(/^<!DOCTYPE\s+html/i.test(e)||/^<html[\s>]/i.test(e))return"html";if((e.startsWith("{")||e.startsWith("["))&&/^[\s\S]*[\]}]\s*$/.test(e))try{return JSON.parse(e),"json"}catch{}const t=e.slice(0,4e3);return/^\s*(```|#{1,6}\s|>\s|\s*[-*+]\s)/m.test(s)?"markdown":/\blocal\s/m.test(t)||/\belseif\b/.test(t)||/\bthen\s*$/.test(t)||/\brepeat\b[\s\S]*\buntil\b/.test(t)||/\bfunction\s+[\w.]+\s*:\s*[\w_]+\s*\(/.test(t)?"lua":/\b(?:def |elif |self\b|import \w+\nfrom )/.test(t)||/^\s*@\w+/m.test(t)?"python":/\b(?:interface |type \w+ =|enum |implements |: (?:string|number|boolean|any|void|unknown)\b|<[A-Z]\w*(?:,|>))/.test(t)?"ts":/(?:=>|\bconst |\blet |\bvar |\bfunction |\breturn |\bimport |\bexport default |\bclass |\bdocument\.|\bconsole\.)/.test(t)?"js":/(?:^\s*[.#][\w-]+\s*\{|\s[a-z-]+\s*:\s*[^;{}]+;)/m.test(t)&&!/=>/.test(t)?"css":/<\/?[a-zA-Z][\s\S]*>/.test(t)?"html":"plain"}function Fn(s,e=300){const t=new Set,r=[];for(const n of s.matchAll(/[A-Za-z_$][\w$]*/g))if(!t.has(n[0])&&(t.add(n[0]),r.push(n[0]),r.length>=e))break;return r}function Hn(s,e){let t=e;for(;t>0&&/[\w$]/.test(s[t-1]);)t--;return s.slice(t,e)}function Nn(s,e,t=50){const r=e.toLowerCase(),n=[],i=[],o=new Set;for(const l of s){if(!(l!=null&&l.label)||o.has(l.label))continue;const h=l.label.toLowerCase();if(!(r&&h===r)&&!(r&&!h.includes(r))&&(o.add(l.label),(h.startsWith(r)?n:i).push(l),n.length+i.length>=t))break}return[...n,...i]}function Un(s,e,t){var h;let r=e;for(;r>0&&/[\w$]/.test(s[r-1]);)r--;const n=t.insert??t.label,i=(h=t.params)!=null&&h.length?"()":"",o=s.slice(0,r)+n+i+s.slice(e),l=r+n.length+(i?1:0);return{text:o,selStart:l,selEnd:l}}function Yn(s,e){let t=0,r=0,n=null,i=-1,o=e-1;for(;o>=0;){const f=s[o];if(n){f===n&&(n=null),o--;continue}if(f==='"'||f==="'"||f==="`"){n=f,o--;continue}if(f===")"){t++,o--;continue}if(f==="("){if(t===0){i=o;break}t--,o--;continue}t===0&&f===","&&r++,o--}if(i<0)return null;let l=i-1;for(;l>=0&&/\s/.test(s[l]);)l--;const h=l+1;for(;l>=0&&/[\w$.:]/.test(s[l]);)l--;const p=s.slice(l+1,h),_=/[A-Za-z_$][\w$]*$/.exec(p);return _?{name:_[0],paramIndex:r}:null}function Vn(s,e){const r=qn(e).map(n=>({label:n,kind:"keyword"}));for(const n of Fn(s))r.push({label:n,kind:"variable"});return r}var Wn=Object.defineProperty,ee=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Wn(e,t,n),n};const Se={"(":")","[":"]","{":"}",'"':'"',"'":"'","`":"`"},qt=new Set([")","]","}"]),Kn=new Set(["()","[]","{}",'""',"''","``"]),oe="  ";function Xn(s,e,t,r){var v;if(e===t){if(r){const b=s.lastIndexOf(`
`,e-1)+1,P=((v=/^[ \t]{1,2}/.exec(s.slice(b)))==null?void 0:v[0].length)??0;return P===0?null:{text:s.slice(0,b)+s.slice(b+P),selStart:Math.max(b,e-P),selEnd:Math.max(b,t-P)}}return{text:s.slice(0,e)+oe+s.slice(t),selStart:e+oe.length,selEnd:e+oe.length}}const n=s.lastIndexOf(`
`,e-1)+1;let i=s.indexOf(`
`,t);i===-1&&(i=s.length),t>e&&s[t-1]===`
`&&(i=t-1);const o=s.slice(0,n),l=s.slice(i),h=s.slice(n,i).split(`
`);let p=0,_=0;const f=h.map((b,P)=>{var _e;if(r){const se=((_e=/^[ \t]{1,2}/.exec(b))==null?void 0:_e[0].length)??0;return P===0&&(p=-se),_-=se,b.slice(se)}return P===0&&(p=oe.length),_+=oe.length,oe+b}).join(`
`);return{text:o+f+l,selStart:Math.max(n,e+p),selEnd:Math.max(n,t+_)}}function Gn(s,e,t,r){const n=s[t]??"";if(Se[r]){const i=Se[r];return e!==t?{text:s.slice(0,e)+r+s.slice(e,t)+i+s.slice(t),selStart:e+1,selEnd:t+1}:n===""||/\s/.test(n)||qt.has(n)||Se[n]?{text:s.slice(0,e)+r+i+s.slice(t),selStart:e+1,selEnd:e+1}:null}return(qt.has(r)||r==='"'||r==="'"||r==="`")&&e===t&&n===r?{text:s,selStart:t+1,selEnd:t+1}:null}function Jn(s,e,t){if(e!==t||e===0)return null;const r=s[e-1],n=s[e]??"";return Kn.has(r+n)?{text:s.slice(0,e-1)+s.slice(e+1),selStart:e-1,selEnd:e-1}:null}function Qn(s,e,t){if(e!==t)return null;const r=s.lastIndexOf(`
`,e-1)+1,n=/^[ \t]*/.exec(s.slice(r,e))[0],i=s[e-1]??"",o=s[e]??"";if(Se[i]&&o===Se[i]){const h=n+oe,p=`
`+h+`
`+n;return{text:s.slice(0,e)+p+s.slice(e),selStart:e+1+h.length,selEnd:e+1+h.length}}const l=`
`+n;return{text:s.slice(0,e)+l+s.slice(e),selStart:e+l.length,selEnd:e+l.length}}let Zn=0;const ut=class ut extends z{constructor(){super(...arguments),this.value="",this.language="auto",this.readonly=!1,this.placeholder="",this.wrap=!1,this.highlight=null,this.functions=[],this.completions=null,this._textarea=null,this._popup=null,this._acListId=`z-ce-ac-${++Zn}`,this._acItems=[],this._acIndex=0,this._acVisible=!1,this._sigVisible=!1,this._sig=null,this._charWidth=0,this._dirty=!1,this._composing=!1,this._refreshPending=!1,this._rafId=0,this._onInput=()=>{const e=this._textarea;e&&(this.__zui_prop_value=e.value,this._dirty=!0,this.emit("z-input",{value:e.value}),this._scheduleRefresh(),this._composing||this._updateAutocomplete())},this._onScroll=()=>{const e=this._textarea;if(!e)return;this._hidePopup();const t=this.shadowRoot,r=t.querySelector(".z-ce__highlight");r&&(r.scrollTop=e.scrollTop,r.scrollLeft=e.scrollLeft);const n=t.querySelector(".z-ce__gutter");n&&(n.scrollTop=e.scrollTop)},this._onBlur=()=>{var e;this.emit("z-blur"),this._hidePopup(),this._dirty&&(this._dirty=!1,this.emit("z-change",{value:((e=this._textarea)==null?void 0:e.value)??this.value}))},this._onKeydown=e=>{const t=this._textarea;if(!t||this.readonly||e.isComposing)return;if(e.key==="Escape"&&(this._acVisible||this._sigVisible)){e.preventDefault(),this._hidePopup();return}if(this._acVisible){if(e.key==="ArrowDown"){e.preventDefault(),this._navigateAc(1);return}if(e.key==="ArrowUp"){e.preventDefault(),this._navigateAc(-1);return}if(e.key==="Enter"||e.key==="Tab"){e.preventDefault(),this._acceptCompletion();return}}if(e.ctrlKey&&!e.metaKey&&!e.altKey&&(e.key===" "||e.code==="Space")){e.preventDefault(),this._showCompletions(!0);return}const r=t.selectionStart??0,n=t.selectionEnd??0;let i=null;e.key==="Tab"&&!e.ctrlKey&&!e.metaKey&&!e.altKey?i=Xn(t.value,r,n,e.shiftKey):e.key==="Enter"&&!e.shiftKey&&!e.ctrlKey&&!e.metaKey&&!e.altKey?i=Qn(t.value,r,n):e.key==="Backspace"&&!e.ctrlKey&&!e.metaKey&&!e.altKey?i=Jn(t.value,r,n):e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(i=Gn(t.value,r,n,e.key)),i&&(e.preventDefault(),t.value=i.text,t.selectionStart=i.selStart,t.selectionEnd=i.selEnd,this._onInput())}}render(){const e=["z-ce"];return this.readonly&&e.push("z-ce--readonly"),this.wrap&&e.push("z-ce--wrap"),m`<div class="${e.join(" ")}" part="root"><div class="z-ce__gutter" part="gutter" aria-hidden="true"></div><div class="z-ce__body"><pre class="z-ce__highlight" part="highlight" aria-hidden="true"><code></code></pre></div></div>`}firstUpdated(){const e=this.shadowRoot.querySelector(".z-ce__body");if(!e)return;const t=document.createElement("textarea");t.className="z-ce__textarea",t.setAttribute("part","textarea field"),t.setAttribute("aria-autocomplete","list"),t.setAttribute("aria-controls",this._acListId),t.spellcheck=!1,t.setAttribute("autocapitalize","off"),t.setAttribute("autocomplete","off"),t.setAttribute("autocorrect","off"),t.value=this.value,e.appendChild(t),this._textarea=t,t.addEventListener("input",this._onInput),t.addEventListener("keydown",this._onKeydown),t.addEventListener("scroll",this._onScroll),t.addEventListener("focus",()=>this.emit("z-focus")),t.addEventListener("blur",this._onBlur),t.addEventListener("compositionstart",()=>{this._composing=!0}),t.addEventListener("compositionend",()=>{this._composing=!1,this._refreshPending&&(this._refreshPending=!1,this._scheduleRefresh()),this._updateAutocomplete()});const r=document.createElement("div");r.className="z-ce__popup",r.setAttribute("part","popup"),r.id=this._acListId,r.addEventListener("mousedown",n=>{n.preventDefault();const i=n.target.closest(".z-ce__item");i&&this._acceptCompletion(Number(i.dataset.idx))}),e.appendChild(r),this._popup=r}updated(){const e=this._textarea;if(!e)return;const t=this.shadowRoot.querySelector(".z-ce__body");t&&e.parentElement!==t&&t.appendChild(e),this._popup&&t&&this._popup.parentElement!==t&&t.appendChild(this._popup),e.readOnly=this.readonly,e.placeholder=this.placeholder,e.setAttribute("wrap",this.wrap?"soft":"off"),e.value!==this.value&&(e.value=this.value),this._refresh()}_resolveLang(e){return this.language==="auto"?Bn(e):this.language}_refresh(){const e=this._textarea;if(!e)return;const t=this.shadowRoot,r=t.querySelector(".z-ce__highlight code");if(r){const o=this.highlight??Rn;r.innerHTML=o(this.value,this._resolveLang(this.value))+`
`}const n=t.querySelector(".z-ce__gutter");if(n){const o=this.value.split(`
`).length;if(n.childElementCount!==o){let h="";for(let p=1;p<=o;p++)h+=`<span>${p}</span>`;n.innerHTML=h}n.scrollTop=e.scrollTop}const i=t.querySelector(".z-ce__highlight");i&&(i.scrollTop=e.scrollTop,i.scrollLeft=e.scrollLeft)}_scheduleRefresh(){if(this._composing){this._refreshPending=!0;return}cancelAnimationFrame(this._rafId),this._rafId=requestAnimationFrame(()=>{this._rafId=0,this._refresh()})}_updateAutocomplete(){this._updateSignature(),this._sigVisible||this._showCompletions(!1)}_resolveItems(){const e=this._textarea;return this.completions?this.completions(e.value,e.selectionStart??0)??[]:[...this.functions,...Vn(e.value,this._resolveLang(e.value))]}_showCompletions(e){const t=this._textarea;if(!t||this.readonly){this._hidePopup();return}const r=t.selectionStart??0,n=Hn(t.value,r),i=Nn(this._resolveItems(),n);if(!e&&(i.length===0||!n)){this._hidePopup();return}this._acItems=i,this._acIndex=0,this._acVisible=!0,this._sigVisible=!1;const o=this._popup;o.className="z-ce__popup",o.setAttribute("role","listbox"),o.setAttribute("aria-label",O.suggestions),o.innerHTML=i.map((l,h)=>`<div class="z-ce__item${h===0?" z-ce__item--active":""}" role="option" id="${this._acOptionId(h)}" aria-selected="${Le(h===0)}" data-idx="${h}"><span class="z-ce__item-label">${l.label}</span>${l.detail?`<span class="z-ce__item-detail">${l.detail}</span>`:""}${l.kind?`<span class="z-ce__item-kind">${l.kind}</span>`:""}</div>`).join(""),this._placePopup(),this._syncActiveDescendant()}_acOptionId(e){return`${this._acListId}-opt-${e}`}_syncActiveDescendant(){const e=this._textarea;e&&(this._acVisible&&this._acItems.length>0?e.setAttribute("aria-activedescendant",this._acOptionId(this._acIndex)):e.removeAttribute("aria-activedescendant"))}_updateSignature(){const e=this._textarea;if(!e)return;const t=Yn(e.value,e.selectionStart??0),r=t?this._resolveItems().find(o=>{var l;return o.label===t.name&&((l=o.params)==null?void 0:l.length)}):void 0;if(!t||!r){this._sig=null,this._sigVisible&&this._hidePopup();return}this._sig={item:r,paramIndex:Math.min(t.paramIndex,Math.max(0,r.params.length-1))},this._sigVisible=!0,this._acVisible=!1;const n=this._popup;n.className="z-ce__popup z-ce__popup--sig",n.setAttribute("role","tooltip"),n.removeAttribute("aria-label");const i=r.params.map((o,l)=>`<span class="z-ce__sig-param${l===this._sig.paramIndex?" z-ce__sig-param--active":""}">${o}</span>`);n.innerHTML=`<div class="z-ce__sig"><span class="z-ce__sig-name">${r.label}</span>(${i.join('<span class="z-ce__sig-sep">, </span>')})</div>${r.desc?`<div class="z-ce__sig-desc">${r.desc}</div>`:""}`,this._placePopup(),this._syncActiveDescendant()}_navigateAc(e){const t=this._acItems.length;if(!t)return;this._acIndex=Math.min(t-1,Math.max(0,this._acIndex+e));const r=this._popup;r.querySelectorAll(".z-ce__item").forEach((n,i)=>{const o=i===this._acIndex;if(n.classList.toggle("z-ce__item--active",o),n.setAttribute("aria-selected",Le(o)),o){const l=n;l.offsetTop<r.scrollTop?r.scrollTop=l.offsetTop:l.offsetTop+l.offsetHeight>r.scrollTop+r.clientHeight&&(r.scrollTop=l.offsetTop+l.offsetHeight-r.clientHeight)}}),this._syncActiveDescendant()}_acceptCompletion(e=this._acIndex){const t=this._textarea,r=this._acItems[e];if(!t||!r)return;const n=Un(t.value,t.selectionStart??0,r);t.value=n.text,t.selectionStart=n.selStart,t.selectionEnd=n.selEnd,this._hidePopup(),this._onInput()}_hidePopup(){this._acVisible=!1,this._sigVisible=!1,this._acItems=[],this._popup&&(this._popup.style.display="none"),this._syncActiveDescendant()}_placePopup(){var f;const e=this._textarea,t=this._popup,r=(f=this.shadowRoot)==null?void 0:f.querySelector(".z-ce__body");if(!e||!t||!r)return;if(!this._charWidth){getComputedStyle(e);const v=document.createElement("canvas").getContext("2d");this._charWidth=v?v.measureText("0".repeat(100)).width/100:8,(!this._charWidth||Number.isNaN(this._charWidth))&&(this._charWidth=8)}const n=e.value.slice(0,e.selectionStart??0),i=(n.match(/\n/g)||[]).length,o=n.length-(n.lastIndexOf(`
`)+1),l=parseFloat(getComputedStyle(e).lineHeight)||21,h=10+i*l-e.scrollTop;let p=h+l+2;p+t.offsetHeight>r.clientHeight&&h-t.offsetHeight-2>0&&(p=h-t.offsetHeight-2);const _=Math.min(12+Math.max(0,o)*this._charWidth-e.scrollLeft,Math.max(4,r.clientWidth-t.offsetWidth-4));t.style.display="block",t.style.left=`${Math.max(4,_)}px`,t.style.top=`${Math.max(2,p)}px`}disconnectedCallback(){cancelAnimationFrame(this._rafId),super.disconnectedCallback()}};ut.styles=jn;let q=ut;ee([a({attribute:!1})],q.prototype,"value");ee([a()],q.prototype,"language");ee([a({type:Boolean})],q.prototype,"readonly");ee([a()],q.prototype,"placeholder");ee([a({type:Boolean})],q.prototype,"wrap");ee([a({attribute:!1})],q.prototype,"highlight");ee([a({attribute:!1})],q.prototype,"functions");ee([a({attribute:!1})],q.prototype,"completions");customElements.define("z-code-editor",q);const er=`/* ===== z-textarea ===== */

:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  width: 100%;
  max-width: 320px;
}

/* ── Label ── */

.z-textarea__label {
  display: block;
  margin-bottom: var(--z-input-label-gap);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  font-weight: var(--z-font-weight-medium);
  color: var(--z-color-text);
  user-select: none;
}

/* ── Wrapper ── */

.z-textarea__wrapper {
  display: flex;
  border: var(--z-input-border-width) solid var(--z-color-border-control);
  border-radius: var(--z-input-radius);
  background-color: var(--z-color-bg);
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
}

.z-textarea__wrapper:hover:not(.z-textarea--disabled):not(.z-textarea--focused) {
  border-color: var(--z-color-border-control-hover);
}

.z-textarea--focused .z-textarea__wrapper {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-textarea--error .z-textarea__wrapper {
  border-color: var(--z-color-danger);
}

/* [WHY] z-form-item 校验钩子：同 input.css，\`invalid\` 属性同时驱动视觉与
   aria-invalid，且不新增 DOM 行（防 blur 校验布局推移丢 click） */
:host([invalid]) .z-textarea__wrapper {
  border-color: var(--z-color-danger);
}

.z-textarea--error.z-textarea--focused .z-textarea__wrapper {
  box-shadow: var(--z-focus-ring-error);
}

.z-textarea--disabled .z-textarea__wrapper {
  opacity: 0.5;
  background-color: var(--z-color-bg-secondary);
  cursor: not-allowed;
}

.z-textarea--readonly .z-textarea__wrapper {
  background-color: var(--z-color-bg-secondary);
}

/* ── Field ── */

.z-textarea__field {
  flex: 1;
  width: 100%;
  min-height: 80px;
  border: none;
  outline: none;
  padding: var(--z-input-padding-y) var(--z-input-padding-x);
  font-family: var(--z-font-sans);
  font-size: var(--z-input-font-size);
  line-height: var(--z-line-height);
  color: var(--z-color-text);
  background: transparent;
  box-sizing: border-box;
}

.z-textarea__field::placeholder {
  color: var(--z-color-text-placeholder);
}

.z-textarea__field:disabled {
  cursor: not-allowed;
  color: var(--z-color-text-disabled);
}

.z-textarea__field--resize-none {
  resize: none;
}

.z-textarea__field--resize-vertical {
  resize: vertical;
}

/* ── Messages / Counter ── */

.z-textarea__messages {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: var(--z-input-message-gap);
}

.z-textarea__hint,
.z-textarea__error {
  font-family: var(--z-font-sans);
  font-size: var(--z-input-message-font-size);
  line-height: var(--z-line-height);
}

.z-textarea__hint {
  color: var(--z-color-text-secondary);
}

.z-textarea__error {
  color: var(--z-color-danger);
}

.z-textarea__counter {
  margin-left: auto;
  font-family: var(--z-font-sans);
  font-size: var(--z-input-message-font-size);
  color: var(--z-color-text-secondary);
}
`;var tr=Object.defineProperty,E=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&tr(e,t,n),n};const _t=class _t extends z{constructor(){super(...arguments),this.value="",this.placeholder="",this.label="",this.error="",this.hint="",this.rows=3,this.autosize=!1,this.counter=!1,this.resize="vertical",this.disabled=!1,this.readonly=!1,this.invalid=!1,this._focused=!1,this._onInput=()=>{const e=this._getField();e&&(this.__zui_prop_value=e.value,this._updateCounter(),this._resize(),this.emit("z-input",{value:e.value}))},this._onChange=()=>{const e=this._getField();e&&(this.__zui_prop_value=e.value,this._updateCounter(),this.emit("z-change",{value:e.value}))},this._onFocusIn=()=>{var e;this._focused=!0,(e=this.shadowRoot.querySelector(".z-textarea__wrapper"))==null||e.classList.add("z-textarea--focused"),this.emit("z-focus")},this._onFocusOut=()=>{var e;this._focused=!1,(e=this.shadowRoot.querySelector(".z-textarea__wrapper"))==null||e.classList.remove("z-textarea--focused"),this.emit("z-blur")}}render(){const{value:e,placeholder:t,label:r,error:n,hint:i,disabled:o,readonly:l,rows:h}=this,p=!!n,_=p||this.invalid,f=this.autosize||this.resize==="auto",v=[this._focused?"z-textarea--focused":"",o?"z-textarea--disabled":"",p?"z-textarea--error":"",l?"z-textarea--readonly":""].filter(Boolean).join(" "),b=f?"z-textarea__field--resize-none":`z-textarea__field--resize-${this.resize}`,P=[p?"z-textarea-error":i?"z-textarea-hint":""].filter(Boolean),_e=['id="z-textarea-field"',`name="${c(this.getAttribute("name")??"")}"`,t?`placeholder="${c(t)}"`:"",o?"disabled":"",l?"readonly":"",this.maxlength!=null?`maxlength="${this.maxlength}"`:"",`rows="${h}"`,P.length?`aria-describedby="${P.join(" ")}"`:"",`aria-invalid="${_?"true":"false"}"`].filter(Boolean).join(" ");return m`
      ${r?m`<label class="z-textarea__label" for="z-textarea-field" part="label">${j(r)}</label>`:""}
      <div class="z-textarea__wrapper ${v}" part="wrapper">
        <textarea class="z-textarea__field ${b}" ${_e} part="field">${j(e)}</textarea>
      </div>
      <div class="z-textarea__messages">
        ${i&&!p?m`<span class="z-textarea__hint" id="z-textarea-hint" part="hint">${j(i)}</span>`:""}
        ${n?m`<span class="z-textarea__error" id="z-textarea-error" part="error" role="alert">${j(n)}</span>`:""}
        ${this.counter&&this.maxlength!=null?m`<span class="z-textarea__counter" part="counter">${(e==null?void 0:e.length)??0}/${this.maxlength}</span>`:""}
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("focusout",this._onFocusOut),this.shadowRoot.addEventListener("input",this._onInput),this.shadowRoot.addEventListener("change",this._onChange)}disconnectedCallback(){this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("focusout",this._onFocusOut),this.shadowRoot.removeEventListener("input",this._onInput),this.shadowRoot.removeEventListener("change",this._onChange),super.disconnectedCallback()}firstUpdated(){this._syncFieldValue(),this._resize()}updated(){this._syncFieldValue(),this._updateCounter(),this._resize()}focus(){var e;(e=this._getField())==null||e.focus()}blur(){var e;(e=this._getField())==null||e.blur()}select(){var e;(e=this._getField())==null||e.select()}clear(){this.value="",this.emit("z-input",{value:""}),this.emit("z-change",{value:""})}_getField(){return this.shadowRoot.querySelector(".z-textarea__field")}_syncFieldValue(){const e=this._getField();e&&e.value!==this.value&&(e.value=this.value)}_updateCounter(){var t;const e=this.shadowRoot.querySelector(".z-textarea__counter");e&&(e.textContent=`${((t=this.value)==null?void 0:t.length)??0}/${this.maxlength}`)}_resize(){const e=this._getField();!e||!(this.autosize||this.resize==="auto")||(e.style.height="auto",e.scrollHeight>0&&(e.style.height=`${e.scrollHeight}px`))}};_t.styles=er;let y=_t;E([a({type:String})],y.prototype,"value");E([a({type:String})],y.prototype,"placeholder");E([a({type:String})],y.prototype,"label");E([a({type:String})],y.prototype,"error");E([a({type:String})],y.prototype,"hint");E([a({type:Number})],y.prototype,"rows");E([a({type:Boolean})],y.prototype,"autosize");E([a({type:Number})],y.prototype,"maxlength");E([a({type:Boolean})],y.prototype,"counter");E([a({type:String})],y.prototype,"resize");E([a({type:Boolean})],y.prototype,"disabled");E([a({type:Boolean})],y.prototype,"readonly");E([a({type:Boolean})],y.prototype,"invalid");customElements.define("z-textarea",y);const nr=`/* ===== z-number-input ===== */

:host {
  display: inline-flex;
  vertical-align: middle;
}

.z-number-input {
  display: inline-flex;
  align-items: stretch;
  height: var(--_h, var(--z-input-height));
  /* 同 input：默认 content-box 会让 28 的 height 实际渲染 30（多算上下边框） */
  box-sizing: border-box;
  border: var(--z-input-border-width) solid var(--z-color-border-control);
  border-radius: var(--z-input-radius);
  background-color: var(--z-color-bg);
  transition: border-color var(--z-transition-fast), box-shadow var(--z-transition-fast);
  overflow: hidden;
}

.z-number-input:hover:not(.z-number-input--disabled) {
  border-color: var(--z-color-border-control-hover);
}

.z-number-input--focused {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-number-input--disabled {
  opacity: 0.5;
  background-color: var(--z-color-bg-secondary);
  cursor: not-allowed;
}

/* ── Field ── */

.z-number-input__field {
  flex: 1;
  width: 72px;
  border: none;
  outline: none;
  padding: 0 var(--z-input-padding-x);
  font-family: var(--z-font-sans);
  font-size: var(--z-input-font-size);
  color: var(--z-color-text);
  background: transparent;
  -moz-appearance: textfield;
  appearance: textfield;
}

.z-number-input__field::placeholder {
  color: var(--z-color-text-placeholder);
}

.z-number-input__field:disabled {
  cursor: not-allowed;
  color: var(--z-color-text-disabled);
}

/* ── Controls ── */

.z-number-input__controls {
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--z-color-border-control);
  flex-shrink: 0;
}

.z-number-input__step {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 24px;
  border: none;
  padding: 0;
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-number-input__step:hover:not(:disabled) {
  background: var(--z-color-hover);
  color: var(--z-color-text);
}

.z-number-input__step--up {
  border-bottom: 1px solid var(--z-color-border-control);
}

.z-number-input__step:disabled {
  cursor: not-allowed;
  color: var(--z-color-text-disabled);
}
`;var rr=Object.defineProperty,N=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&rr(e,t,n),n};const mt=class mt extends z{constructor(){super(...arguments),this.size="sm",this.value=0,this.step=1,this.placeholder="",this.disabled=!1,this.invalid=!1,this.incrementLabel=O.increment,this.decrementLabel=O.decrement,this._focused=!1,this._onInput=()=>{const e=this._getField();e&&this.emit("z-input",{value:e.value})},this._onChange=()=>{const e=this._getField();e&&this._commit(e.value)},this._onClick=e=>{if(this.disabled)return;const t=e.target.closest(".z-number-input__step");t&&(t.classList.contains("z-number-input__step--up")?(this.stepUp(),this.emit("z-input",{value:this._format(this.value)})):t.classList.contains("z-number-input__step--down")&&(this.stepDown(),this.emit("z-input",{value:this._format(this.value)})))},this._onKeyDown=e=>{this.disabled||(e.key==="ArrowUp"?(e.preventDefault(),this.stepUp()):e.key==="ArrowDown"&&(e.preventDefault(),this.stepDown()))},this._onFocusIn=()=>{var e;this._focused=!0,(e=this.shadowRoot.querySelector(".z-number-input"))==null||e.classList.add("z-number-input--focused"),this.emit("z-focus")},this._onFocusOut=()=>{var e;this._focused=!1,(e=this.shadowRoot.querySelector(".z-number-input"))==null||e.classList.remove("z-number-input--focused"),this.emit("z-blur")}}willUpdate(){this.style.setProperty("--_h",xn(this.size))}render(){const{value:e,placeholder:t,disabled:r}=this,n=[this._focused?"z-number-input--focused":"",r?"z-number-input--disabled":""].filter(Boolean).join(" ");return m`
      <div class="z-number-input ${n}" part="root">
        <input
          class="z-number-input__field"
          part="field"
          type="text"
          inputmode="decimal"
          value="${c(this._format(e))}"
          ${t?`placeholder="${c(t)}"`:""}
          ${r?"disabled":""}
          ${r?"":'aria-valuenow="'+e+'"'}
          ${this.invalid?'aria-invalid="true"':""}
        />
        <span class="z-number-input__controls" part="controls">
          <button type="button" class="z-number-input__step z-number-input__step--up" part="step-up" tabindex="-1" aria-label="${c(this.incrementLabel)}" ${r?"disabled":""}>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l5-5 5 5"/></svg>
          </button>
          <button type="button" class="z-number-input__step z-number-input__step--down" part="step-down" tabindex="-1" aria-label="${c(this.decrementLabel)}" ${r?"disabled":""}>
            <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6l5 5 5-5"/></svg>
          </button>
        </span>
      </div>
    `}connectedCallback(){super.connectedCallback(),this.addEventListener("focusin",this._onFocusIn),this.addEventListener("focusout",this._onFocusOut);const e=this.shadowRoot;e.addEventListener("input",this._onInput),e.addEventListener("change",this._onChange),e.addEventListener("click",this._onClick),e.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){this.removeEventListener("focusin",this._onFocusIn),this.removeEventListener("focusout",this._onFocusOut);const e=this.shadowRoot;e.removeEventListener("input",this._onInput),e.removeEventListener("change",this._onChange),e.removeEventListener("click",this._onClick),e.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}focus(){var e;(e=this._getField())==null||e.focus()}blur(){var e;(e=this._getField())==null||e.blur()}stepUp(){this._commit(this.value+this.step)}stepDown(){this._commit(this.value-this.step)}_getField(){return this.shadowRoot.querySelector(".z-number-input__field")}_format(e){const t=this._decimals();return t>0?e.toFixed(t):String(e)}_decimals(){if(this.precision!=null)return this.precision;const e=String(this.step),t=e.indexOf(".");return t>=0?e.length-t-1:0}_clamp(e){this.min!=null&&e<this.min&&(e=this.min),this.max!=null&&e>this.max&&(e=this.max);const t=this._decimals();if(t>0){const r=10**t;e=Math.round(e*r)/r}return e}_commit(e){let t=typeof e=="number"?e:Number(e);if(Number.isNaN(t)){this._syncFieldValue();return}t=this._clamp(t),this.value=t,this._syncFieldValue(),this.emit("z-change",{value:t})}_syncFieldValue(){const e=this._getField();e&&(e.value=this._format(this.value))}};mt.styles=nr;let L=mt;N([a({type:String})],L.prototype,"size");N([a({type:Number})],L.prototype,"value");N([a({type:Number})],L.prototype,"min");N([a({type:Number})],L.prototype,"max");N([a({type:Number})],L.prototype,"step");N([a({type:Number})],L.prototype,"precision");N([a({type:String})],L.prototype,"placeholder");N([a({type:Boolean})],L.prototype,"disabled");N([a({type:Boolean})],L.prototype,"invalid");N([a({type:String})],L.prototype,"incrementLabel");N([a({type:String})],L.prototype,"decrementLabel");customElements.define("z-number-input",L);const ir=`/* ===== z-slider ===== */

:host {
  display: inline-block;
  vertical-align: middle;
  width: 100%;
  max-width: 320px;
}

.z-slider {
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
  touch-action: none;
}

/* ── Track / Fill ── */

.z-slider__track {
  position: absolute;
  left: 0;
  right: 0;
  height: 4px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-border-control);
}

.z-slider__fill {
  position: absolute;
  left: 0;
  height: 4px;
  border-radius: var(--z-radius-full);
  background: var(--z-color-primary);
  transition: width var(--z-transition-fast), height var(--z-transition-fast);
}

/* ── Thumb ── */

.z-slider__thumb {
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--z-color-white);
  border: 2px solid var(--z-color-primary);
  transform: translate(-50%, -50%);
  top: 50%;
  cursor: grab;
  box-shadow: var(--z-shadow-sm);
  outline: none;
  box-sizing: border-box;
  transition: box-shadow var(--z-transition-fast), border-color var(--z-transition-fast);
}

.z-slider__thumb:hover,
.z-slider__thumb:focus-visible {
  box-shadow: var(--z-focus-ring);
}

.z-slider__thumb:active,
.z-slider--dragging .z-slider__thumb {
  cursor: grabbing;
}

/* ── Tooltip ── */

.z-slider__tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: var(--z-radius-sm);
  background: var(--z-color-inverse);
  /* 与 m-chip--selected 同一对：底反色则字也要反色，否则暗色里白压近白 */
  color: var(--z-color-inverse-text);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--z-transition-fast);
}

.z-slider__thumb:hover .z-slider__tooltip,
.z-slider__thumb:focus-visible .z-slider__tooltip,
.z-slider--dragging .z-slider__tooltip {
  opacity: 1;
}

/* ── Vertical ── */

.z-slider--vertical {
  width: 20px;
  height: 100%;
  min-height: 120px;
  align-items: center;
  justify-content: center;
}

.z-slider--vertical .z-slider__track {
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  height: auto;
  transform: translateX(-50%);
}

.z-slider--vertical .z-slider__fill {
  left: 50%;
  bottom: 0;
  width: 4px;
  transform: translateX(-50%);
  transition: height var(--z-transition-fast);
}

.z-slider--vertical .z-slider__thumb {
  left: 50%;
  top: auto;
  transform: translate(-50%, 50%);
}

.z-slider--vertical .z-slider__tooltip {
  bottom: 50%;
  left: calc(100% + 8px);
  transform: translateY(50%);
}

/* ── Marks ── */

.z-slider__marks {
  position: absolute;
  left: 0;
  right: 0;
  top: 12px;
  pointer-events: none;
}

.z-slider--vertical .z-slider__marks {
  left: 14px;
  top: 0;
  bottom: 0;
  right: auto;
}

.z-slider__mark {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.z-slider--vertical .z-slider__mark {
  transform: translateY(50%);
}

.z-slider__mark-tick {
  width: 1px;
  height: 6px;
  background: var(--z-color-fill-disabled);
}

.z-slider__mark-label {
  margin-top: 4px;
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  white-space: nowrap;
}

/* ── Disabled ── */

.z-slider--disabled {
  opacity: 0.5;
}

.z-slider--disabled .z-slider__thumb {
  cursor: not-allowed;
  border-color: var(--z-color-fill-disabled);
}

.z-slider--disabled .z-slider__fill {
  background: var(--z-color-fill-disabled);
}
`;var sr=Object.defineProperty,te=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&sr(e,t,n),n};const ft=class ft extends z{constructor(){super(...arguments),this.value=0,this.min=0,this.max=100,this.step=1,this.disabled=!1,this.vertical=!1,this.showTooltip=!1,this.marks=null,this._dragging=!1,this._session=null,this._focused=!1,this._thumb=null,this._onPointerDown=e=>{var r;if(this.disabled)return;const t=e.target;t.closest(".z-slider__thumb")&&(e.preventDefault(),this._setDragging(!0),(r=this._session)==null||r.dispose(),this._session=new wn({onMove:n=>this._applyValue(this._valueFromPointer(n.x,n.y),!1),onEnd:()=>{this._setDragging(!1),this.emit("z-change",{value:this.value})},onCancel:()=>this._setDragging(!1)},{threshold:0,captureTarget:t}),this._session.begin(e),this._applyValue(this._valueFromPointer(e.clientX,e.clientY),!1))},this._onKeyDown=e=>{if(this.disabled||!e.target.classList.contains("z-slider__thumb"))return;const r=(this.vertical?{ArrowUp:1,ArrowDown:-1}:{ArrowRight:1,ArrowLeft:-1})[e.key];let n=null;r?n=this._clampToStep(this.value+r*this.step):e.key==="Home"?n=this.min:e.key==="End"?n=this.max:e.key==="PageUp"?n=this._clampToStep(this.value+this.step*10):e.key==="PageDown"&&(n=this._clampToStep(this.value-this.step*10)),n!==null&&(e.preventDefault(),this.value=n,this.emit("z-change",{value:n}))},this._onFocusIn=e=>{e.target.classList.contains("z-slider__thumb")&&(this._focused=!0)},this._onFocusOut=()=>{this._focused=!1}}render(){var n;const e=this._percent(this.value),t=[this.vertical?"z-slider--vertical":"",this.disabled?"z-slider--disabled":"",this._dragging?"z-slider--dragging":""].filter(Boolean).join(" "),r=(n=this.marks)!=null&&n.length?m`<div class="z-slider__marks" part="marks">
          ${this.marks.map(i=>{const o=this._percent(i.value),l=this.vertical?`bottom:${o}%`:`left:${o}%`;return m`<span class="z-slider__mark" style="${l}" part="mark">
              <span class="z-slider__mark-tick"></span>
              ${i.label?m`<span class="z-slider__mark-label">${j(i.label)}</span>`:""}
            </span>`})}
        </div>`:"";return m`
      <div class="z-slider ${t}" part="root">
        <div class="z-slider__track" part="track"></div>
        <div class="z-slider__fill" part="fill" style="${this.vertical?`height:${e}%`:`width:${e}%`}"></div>
        <div
          class="z-slider__thumb"
          part="thumb"
          role="slider"
          tabindex="${this.disabled?"-1":"0"}"
          aria-valuemin="${this.min}"
          aria-valuemax="${this.max}"
          aria-valuenow="${this.value}"
          aria-orientation="${this.vertical?"vertical":"horizontal"}"
          style="${this.vertical?`bottom:${e}%`:`left:${e}%`}"
        >
          ${this.showTooltip?m`<span class="z-slider__tooltip" part="tooltip">${this.value}</span>`:""}
        </div>
        ${r}
      </div>
    `}connectedCallback(){super.connectedCallback();const e=this.shadowRoot;e.addEventListener("pointerdown",this._onPointerDown),e.addEventListener("keydown",this._onKeyDown),e.addEventListener("focusin",this._onFocusIn),e.addEventListener("focusout",this._onFocusOut)}disconnectedCallback(){var t;const e=this.shadowRoot;e.removeEventListener("pointerdown",this._onPointerDown),e.removeEventListener("keydown",this._onKeyDown),e.removeEventListener("focusin",this._onFocusIn),e.removeEventListener("focusout",this._onFocusOut),(t=this._session)==null||t.dispose(),this._session=null,super.disconnectedCallback()}updated(){const e=this.shadowRoot.querySelector(".z-slider__thumb");this._focused&&e&&e!==this._thumb&&!this.disabled&&e.focus(),this._thumb=e}focus(){var e;(e=this.shadowRoot.querySelector(".z-slider__thumb"))==null||e.focus()}_percent(e){const t=this.max-this.min;return t<=0?0:Math.min(100,Math.max(0,(e-this.min)/t*100))}_valueFromPointer(e,t){const r=this.shadowRoot.querySelector(".z-slider");if(!r)return this.value;const n=r.getBoundingClientRect();let i;this.vertical?i=1-(t-n.top)/n.height:i=(e-n.left)/n.width,i=Math.min(1,Math.max(0,i));const o=this.min+i*(this.max-this.min),l=Math.round((o-this.min)/this.step);return Math.min(this.max,Math.max(this.min,this.min+l*this.step))}_applyValue(e,t){const r=e!==this.value;this.__zui_prop_value=e;const n=this._percent(e),i=this.shadowRoot.querySelector(".z-slider__fill");i&&(i.style[this.vertical?"height":"width"]=`${n}%`);const o=this.shadowRoot.querySelector(".z-slider__thumb");if(o){o.style[this.vertical?"bottom":"left"]=`${n}%`,o.setAttribute("aria-valuenow",String(e));const l=o.querySelector(".z-slider__tooltip");l&&(l.textContent=String(e))}r&&this.emit("z-input",{value:e}),t&&this.emit("z-change",{value:e})}_setDragging(e){var r;this._dragging=e;const t=(r=this.shadowRoot)==null?void 0:r.querySelector(".z-slider");e?t==null||t.classList.add("z-slider--dragging"):t==null||t.classList.remove("z-slider--dragging")}_clampToStep(e){return Math.min(this.max,Math.max(this.min,e))}};ft.styles=ir;let B=ft;te([a({type:Number})],B.prototype,"value");te([a({type:Number})],B.prototype,"min");te([a({type:Number})],B.prototype,"max");te([a({type:Number})],B.prototype,"step");te([a({type:Boolean})],B.prototype,"disabled");te([a({type:Boolean})],B.prototype,"vertical");te([a({type:Boolean,attribute:"show-tooltip"})],B.prototype,"showTooltip");te([a({attribute:!1})],B.prototype,"marks");customElements.define("z-slider",B);const or=`/* ===== z-rate ===== */

:host {
  display: inline-block;
  vertical-align: middle;
}

.z-rate {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  outline: none;
}

/* ── Star ── */

.z-rate__star {
  position: relative;
  display: inline-block;
  width: 18px;
  height: 18px;
  cursor: pointer;
  color: var(--z-color-gray-300);
  transition: color var(--z-transition-fast), transform var(--z-transition-fast);
}

.z-rate__star-bg,
.z-rate__star-fg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.z-rate__star-fg {
  color: var(--z-rate-color, #f59e0b);
}

.z-rate__star:hover,
.z-rate--hovering .z-rate__star {
  transform: scale(1.1);
}

.z-rate--hovering .z-rate__star-fg {
  color: var(--z-rate-color, #f59e0b);
}

/* ── States ── */

.z-rate--disabled {
  opacity: 0.5;
}

.z-rate--disabled .z-rate__star,
.z-rate--readonly .z-rate__star {
  cursor: default;
  transform: none;
}

.z-rate--readonly .z-rate__star:hover {
  transform: none;
}
`;var ar=Object.defineProperty,de=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&ar(e,t,n),n};const Bt="M8 1.5l1.95 4.13 4.55.55-3.34 3.12.87 4.5L8 11.6 4 13.8l.87-4.5L1.55 6.18l4.55-.55z",vt=class vt extends z{constructor(){super(...arguments),this.value=0,this.count=5,this.allowHalf=!1,this.disabled=!1,this.readonly=!1,this.clearable=!1,this.label="",this._hover=-1,this._onMouseOver=e=>{if(this.disabled||this.readonly)return;const t=e.target.closest(".z-rate__star");if(!t)return;const r=Number(t.dataset.index),n=this._hoverValue(r,e);this._setHover(n),this.emit("z-hover",{value:n})},this._onMouseOut=e=>{e.target.closest(".z-rate__star")&&(this._setHover(-1),this.emit("z-hover",{value:-1}))},this._onClick=e=>{if(this.disabled||this.readonly)return;const t=e.target.closest(".z-rate__star");if(!t)return;const r=Number(t.dataset.index),n=this._hoverValue(r,e),i=this.clearable&&n===this.value?0:n;this.value=i,this.emit("z-change",{value:i})},this._onKeyDown=e=>{if(this.disabled||this.readonly)return;const t=Math.max(1,this.count),r=this._step();let n=null;e.key==="ArrowRight"||e.key==="ArrowUp"?n=Math.min(t,this.value+r):e.key==="ArrowLeft"||e.key==="ArrowDown"?n=Math.max(0,this.value-r):e.key==="Home"?n=0:e.key==="End"&&(n=t),n!==null&&(e.preventDefault(),this.value=n,this.emit("z-change",{value:n}))}}render(){const e=Math.max(1,this.count),t=[];for(let n=0;n<e;n++){const i=this._hover>=0?this._hover:this.value,o=i>=n+1?100:i>n?Math.round((i-n)*100):0;t.push(m`
        <span class="z-rate__star" part="star" role="radio" aria-checked="${Le(i>=n+1||i>n&&i<n+1)}" data-index="${n}">
          <span class="z-rate__star-bg">
            <svg viewBox="0 0 16 16" width="18" height="18"><path d="${Bt}" fill="currentColor"/></svg>
          </span>
          <span class="z-rate__star-fg" style="width:${o}%" data-index="${n}">
            <svg viewBox="0 0 16 16" width="18" height="18"><path d="${Bt}" fill="currentColor"/></svg>
          </span>
        </span>
      `)}const r=[this.disabled?"z-rate--disabled":"",this.readonly?"z-rate--readonly":"",this._hover>=0?"z-rate--hovering":""].filter(Boolean).join(" ");return m`
      <div class="z-rate ${r}" part="root"
        role="slider" tabindex="${this.disabled||this.readonly?"-1":"0"}"
        aria-label="${c(this.label||"Rating")}"
        aria-valuemin="0" aria-valuemax="${e}"
        aria-valuenow="${this.value}" aria-valuetext="${this.value} out of ${e}">
        ${t.join("")}
      </div>
    `}connectedCallback(){super.connectedCallback();const e=this.shadowRoot;e.addEventListener("mouseover",this._onMouseOver),e.addEventListener("mouseout",this._onMouseOut),e.addEventListener("click",this._onClick),e.addEventListener("keydown",this._onKeyDown)}disconnectedCallback(){const e=this.shadowRoot;e.removeEventListener("mouseover",this._onMouseOver),e.removeEventListener("mouseout",this._onMouseOut),e.removeEventListener("click",this._onClick),e.removeEventListener("keydown",this._onKeyDown),super.disconnectedCallback()}focus(){var e;(e=this.shadowRoot.querySelector(".z-rate"))==null||e.focus()}_step(){return this.allowHalf?.5:1}_setHover(e){this._hover!==e&&(this._hover=e,this.requestUpdate())}_hoverValue(e,t){if(!this.allowHalf)return e+1;const r=this.shadowRoot.querySelectorAll(".z-rate__star")[e],n=r==null?void 0:r.getBoundingClientRect();return n&&t.clientX-n.left<=n.width/2?e+.5:e+1}};vt.styles=or;let V=vt;de([a({type:Number})],V.prototype,"value");de([a({type:Number})],V.prototype,"count");de([a({type:Boolean,attribute:"allow-half"})],V.prototype,"allowHalf");de([a({type:Boolean})],V.prototype,"disabled");de([a({type:Boolean})],V.prototype,"readonly");de([a({type:Boolean})],V.prototype,"clearable");de([a({type:String})],V.prototype,"label");customElements.define("z-rate",V);const lr=`/* ===== z-form-item ===== */
/* [WHY] 2026-10-25 系统审计：消除旧 token 别名 (--z-text-color / --z-text-secondary /
   --z-font-size) 与裸 hex fallback；表单标签/错误的字号统一走 typography token。
   See: wiki/reference/component-style-standard.md */

:host {
  display: block;
}

.z-form-item {
  display: flex;
  flex-direction: column;
  gap: var(--z-input-label-gap);
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-form-item__label {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  user-select: none;
}

.z-form-item__required {
  color: var(--z-color-danger);
  margin-left: 2px;
}

.z-form-item__control {
  min-width: 0;
}

.z-form-item__error {
  color: var(--z-color-danger);
  font-size: var(--z-font-size-xs);
  line-height: 14px;
  min-height: 14px;
}

.z-form-item__error--hidden {
  visibility: hidden;
}
`;var cr=Object.defineProperty,T=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&cr(e,t,n),n};const gt=class gt extends z{constructor(){super(...arguments),this.name="",this.label="",this.required=!1,this.pattern="",this.message="This field is invalid",this.requiredMessage="This field is required",this.trigger="change",this.rules=[],this._error="",this._initialValue=void 0,this._fieldName=null,this._onControlChange=e=>{e.target!==this&&(e.stopPropagation(),(this.trigger==="change"||this.trigger==="blur")&&this.validate(),this.emit("z-change",{name:this.name,value:this.getValue(),item:this}))},this._onControlBlur=()=>{this.trigger==="blur"&&this.validate()}}get error(){return this._error}get control(){var e;return zn((e=this.shadowRoot)==null?void 0:e.querySelector("slot"))}connectedCallback(){super.connectedCallback(),this.addEventListener("z-change",this._onControlChange),this.addEventListener("z-blur",this._onControlBlur),this._fieldName=bn(()=>this.control,()=>this.label)}disconnectedCallback(){var e;this.removeEventListener("z-change",this._onControlChange),this.removeEventListener("z-blur",this._onControlBlur),(e=this._fieldName)==null||e.dispose(),this._fieldName=null,super.disconnectedCallback()}updated(){var e;if(this._initialValue===void 0){const t=this.control;this._initialValue=t?this._readControlValue(t):""}(e=this._fieldName)==null||e.sync()}render(){const e=this.label?m`
          <span class="z-form-item__label" part="label"
            >${c(this.label)}${this.required?'<span class="z-form-item__required" part="required" aria-hidden="true">*</span>':""}</span
          >
        `:"",t=m`
      <div
        class="z-form-item__error ${this._error?"":"z-form-item__error--hidden"}"
        part="error"
        role="alert"
        id="z-form-item-error"
        aria-hidden="${this._error?"false":"true"}"
        >${c(this._error)}</div
      >
    `;return m`
      <div class="z-form-item" part="root">
        ${e}
        <div class="z-form-item__control" part="control"><slot></slot></div>
        ${t}
      </div>
    `}getValue(){const e=this.control;return e?this._readControlValue(e):""}setValue(e){const t=this.control;if(!t)return;const r=t.tagName.toLowerCase();r==="z-switch"||r==="z-checkbox"?t.checked=!!e:t.value=e,this.validate()}reset(){const e=this.control;if(e){const t=this._initialValue!==void 0?this._initialValue:"",r=e.tagName.toLowerCase();r==="z-switch"||r==="z-checkbox"?e.checked=!!t:e.value=t}this._clearError(),this.emit("z-reset",{name:this.name})}validate(){const e=this.getValue(),t=this._checkBuiltin(e);if(t!==!0)return this._setError(t);if(this.rules.length===0)return this._clearError();const r=this.rules.map(i=>i(e));if(r.some(i=>i instanceof Promise))return Promise.all(r).then(i=>{const o=i.find(l=>l!==!0);return o===void 0?this._clearError():this._setError(o)});const n=r.filter(i=>!(i instanceof Promise)).find(i=>i!==!0);return n===void 0?this._clearError():this._setError(n)}_checkBuiltin(e){const t=e===""||e===null||e===void 0||this.required&&e===!1;if(this.required&&t)return this.requiredMessage;if(t)return!0;const r=Number(e);if(this.min!==void 0&&!Number.isNaN(r)&&r<this.min)return this.message;if(this.max!==void 0&&!Number.isNaN(r)&&r>this.max)return this.message;const n=String(e).length;if(this.minlength!==void 0&&n<this.minlength)return this.message;if(this.maxlength!==void 0&&n>this.maxlength)return this.message;if(this.pattern)try{if(!new RegExp(this.pattern).test(String(e)))return this.message}catch{}return!0}_setError(e){this._error=e;const t=this.control;return t&&("invalid"in t?t.invalid=!0:t.setAttribute("data-invalid","")),this.requestUpdate(),!1}_clearError(){if(!this._error)return!0;this._error="";const e=this.control;return e&&("invalid"in e?e.invalid=!1:e.removeAttribute("data-invalid")),this.requestUpdate(),!0}_readControlValue(e){const t=e.tagName.toLowerCase();return t==="z-switch"||t==="z-checkbox"?e.checked:e.value}};gt.styles=lr;let w=gt;T([a({type:String})],w.prototype,"name");T([a({type:String})],w.prototype,"label");T([a({type:Boolean})],w.prototype,"required");T([a({type:Number})],w.prototype,"min");T([a({type:Number})],w.prototype,"max");T([a({type:Number})],w.prototype,"minlength");T([a({type:Number})],w.prototype,"maxlength");T([a({type:String})],w.prototype,"pattern");T([a({type:String})],w.prototype,"message");T([a({type:String,attribute:"required-message"})],w.prototype,"requiredMessage");T([a({type:String})],w.prototype,"trigger");T([a({type:Array,attribute:!1})],w.prototype,"rules");customElements.define("z-form-item",w);const dr=`:host {
  display: block;
}

.z-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin: 0;
  padding: 0;
}
`;var hr=Object.defineProperty,rt=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&hr(e,t,n),n};const zt=class zt extends z{constructor(){super(...arguments),this.values={},this.validateOnChange=!1,this.validateOnSubmit=!0,this._onSubmit=e=>{e.preventDefault(),this.submit()},this._onFieldChange=e=>{const t=e.detail;if(!t||!t.item)return;const r=String(t.name??"");e.stopPropagation(),this.validateOnChange&&this.validate(),this.emit("z-change",{values:this.getValues(),field:r,value:t.value})},this._onFieldReset=e=>{e.target!==this&&e.stopPropagation()}}connectedCallback(){super.connectedCallback(),this.addEventListener("z-change",this._onFieldChange),this.addEventListener("z-reset",this._onFieldReset),this.shadowRoot.addEventListener("submit",this._onSubmit)}disconnectedCallback(){this.removeEventListener("z-change",this._onFieldChange),this.removeEventListener("z-reset",this._onFieldReset),this.shadowRoot.removeEventListener("submit",this._onSubmit),super.disconnectedCallback()}render(){return m`
      <form class="z-form" part="root" novalidate>
        <slot></slot>
      </form>
    `}getValues(){const e={};for(const t of this._items)t.name&&(e[t.name]=t.getValue());return e}setValues(e){for(const t of this._items)t.name&&Object.prototype.hasOwnProperty.call(e,t.name)&&t.setValue(e[t.name])}validate(){const e=this._items.map(t=>t.validate());return e.some(t=>t instanceof Promise)?Promise.all(e).then(t=>t.every(Boolean)):e.every(Boolean)}get errors(){const e={};for(const t of this._items)t.error&&(e[t.name]=t.error);return e}submit(){const e=this.validate(),t=r=>{const n=this.getValues();r?this.emit("z-submit",{valid:!0,values:n}):this.emit("z-invalid",{valid:!1,values:n,errors:this.errors})};e instanceof Promise?e.then(t):t(e)}reset(){for(const e of this._items)e.reset();this.emit("z-reset")}get _items(){return Array.from(this.querySelectorAll("z-form-item"))}};zt.styles=dr;let ge=zt;rt([a({type:Object,attribute:!1})],ge.prototype,"values");rt([a({type:Boolean,attribute:"validate-on-change"})],ge.prototype,"validateOnChange");rt([a({type:Boolean,attribute:"validate-on-submit"})],ge.prototype,"validateOnSubmit");customElements.define("z-form",ge);const pr=`/* ===== z-calendar ===== */

:host {
  display: inline-block;
}

.z-calendar {
  display: inline-block;
  padding: var(--z-space-3);
  background: var(--z-color-bg);
  border: 1px solid var(--z-color-border-control);
  border-radius: var(--z-radius-md);
  font-family: var(--z-font-sans);
  font-size: var(--z-font-size-sm);
  line-height: var(--z-line-height);
  color: var(--z-color-text);
  user-select: none;
}

.z-calendar__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--z-space-2);
}

.z-calendar__nav {
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

.z-calendar__nav:hover {
  background: var(--z-color-bg-secondary);
}

.z-calendar__label {
  font-weight: var(--z-font-weight-medium);
}

.z-calendar__grid {
  border-collapse: collapse;
  table-layout: fixed;
}

.z-calendar__weekday {
  padding: var(--z-space-1) 0;
  width: 32px;
  text-align: center;
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  font-weight: var(--z-font-weight-medium);
}

.z-calendar__cell {
  width: 32px;
  height: var(--z-control-h);
  text-align: center;
  vertical-align: middle;
  border-radius: var(--z-radius-sm);
  cursor: pointer;
  font-size: var(--z-font-size-sm);
  transition: background var(--z-transition-fast), color var(--z-transition-fast);
}

.z-calendar__cell:hover {
  background: var(--z-color-bg-secondary);
}

/* [WHY] 非当月格两种呈现：show-outside=true 半透明可见，false 隐藏占位
   （42 格布局恒定，键盘焦点按格移动） */
.z-calendar__cell--out {
  opacity: 0.4;
}

.z-calendar__cell--hidden {
  visibility: hidden;
}

.z-calendar__cell--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.z-calendar__cell--today {
  box-shadow: inset 0 0 0 1px var(--z-color-primary);
}

.z-calendar__cell--selected {
  background: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
}

.z-calendar__cell--focus {
  outline: var(--z-focus-ring-outline);
  outline-offset: -2px;
}
`;var ur=Object.defineProperty,ne=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&ur(e,t,n),n};const bt=class bt extends z{constructor(){super(...arguments),this.value="",this.min="",this.max="",this.locale="",this.showOutside=!1,this.disabledDates=[],this.prevMonthLabel=O.prevMonth,this.nextMonthLabel=O.nextMonth,this._viewYear=0,this._viewMonth=0,this._focusISO=null,this._onClick=e=>{const t=e.target,r=t.closest("[data-nav]");if(r){e.preventDefault(),this._navMonth(r.dataset.nav==="next"?1:-1,!1);return}const n=t.closest("[data-iso]");if(!n)return;const i=n.dataset.iso;n.classList.contains("z-calendar__cell--disabled")||n.classList.contains("z-calendar__cell--out")||n.classList.contains("z-calendar__cell--hidden")||this._selectISO(i)},this._onKey=e=>{const t=e,r=this._focusISO;switch(t.key){case"ArrowLeft":e.preventDefault(),this._moveFocus(r,-1);break;case"ArrowRight":e.preventDefault(),this._moveFocus(r,1);break;case"ArrowUp":e.preventDefault(),this._moveFocus(r,-7);break;case"ArrowDown":e.preventDefault(),this._moveFocus(r,7);break;case"Home":e.preventDefault(),this._moveFocusToWeekBoundary(r,!1);break;case"End":e.preventDefault(),this._moveFocusToWeekBoundary(r,!0);break;case"PageUp":e.preventDefault(),t.shiftKey?this._navYear(-1):this._navMonth(-1,!0);break;case"PageDown":e.preventDefault(),t.shiftKey?this._navYear(1):this._navMonth(1,!0);break;case"Enter":case" ":e.preventDefault(),r&&this._isSelectable(r)&&this._selectISO(r);break}}}get _locale(){return this.locale||navigator.language||"en-US"}connectedCallback(){super.connectedCallback();const e=C(this.value)??new Date;this._viewYear=e.getFullYear(),this._viewMonth=e.getMonth(),this._focusISO=this.value&&C(this.value)?this.value:ae(e),this.shadowRoot.addEventListener("click",this._onClick),this.shadowRoot.addEventListener("keydown",this._onKey)}disconnectedCallback(){this.shadowRoot.removeEventListener("click",this._onClick),this.shadowRoot.removeEventListener("keydown",this._onKey),super.disconnectedCallback()}render(){const e=this._locale,t=Re(e),r=Gt(this._viewYear,this._viewMonth,t),n=Ke(),i=je(e,this._viewYear,this._viewMonth);return m`
      <div class="z-calendar" part="root">
        <div class="z-calendar__header" part="header">
          <button type="button" class="z-calendar__nav" data-nav="prev" part="nav-prev" aria-label="${c(this.prevMonthLabel)}">‹</button>
          <div class="z-calendar__label" part="label">${i}</div>
          <button type="button" class="z-calendar__nav" data-nav="next" part="nav-next" aria-label="${c(this.nextMonthLabel)}">›</button>
        </div>
        ${Qt({prefix:"z-calendar",locale:e,weekStart:t,cells:r,today:n,ariaLabel:i,cellHTML:(o,l)=>this._cellHTML(o,l)})}
      </div>
    `}_cellHTML(e,t){const{iso:r,day:n,inMonth:i}=e,o=["z-calendar__cell"];let l=!1;i?(!qe(r,this.min,this.max)||this.disabledDates.includes(r))&&(o.push("z-calendar__cell--disabled"),l=!0):(o.push(this.showOutside?"z-calendar__cell--out":"z-calendar__cell--hidden"),l=!0),r===t&&o.push("z-calendar__cell--today");const h=!!(this.value&&r===this.value);return h&&o.push("z-calendar__cell--selected"),r===this._focusISO&&o.push("z-calendar__cell--focus"),m`<td
      class="${o.join(" ")}"
      role="gridcell"
      data-iso="${r}"
      tabindex="${r===this._focusISO?0:-1}"
      aria-selected="${Le(h)}"
      aria-disabled="${l?"true":"false"}"
      ${r===t?'aria-current="date"':""}
      part="cell"
    >${n}</td>`}_selectISO(e){this._focusISO=e,this.value!==e&&(this.value=e,this.emit("z-change",{value:e})),this._sync(),this._focusCell()}_navMonth(e,t){var i;let r=this._viewMonth+e,n=this._viewYear;if(r<0&&(r=11,n-=1),r>11&&(r=0,n+=1),t){const o=C(this._focusISO??Ke());if(o){const l=Math.min(o.getDate(),new Date(n,r+1,0).getDate());this._focusISO=ae(new Date(n,r,l))}}if(this._setView(n,r),t)this._focusCell();else{const o=e===1?'[data-nav="next"]':'[data-nav="prev"]';(i=this.shadowRoot.querySelector(o))==null||i.focus()}}_navYear(e){this._setView(this._viewYear+e,this._viewMonth),this._focusCell()}_setView(e,t){e===this._viewYear&&t===this._viewMonth||(this._viewYear=e,this._viewMonth=t,this._sync(),this.emit("z-month-change",{year:e,month:t}))}_isSelectable(e){return C(e)!==null&&qe(e,this.min,this.max)&&!this.disabledDates.includes(e)}_moveFocus(e,t){if(!e)return;const r=C(e);if(!r)return;const n=new Date(r);n.setDate(n.getDate()+t);const i=ae(n);C(i)!==null&&(this._focusISO=i,n.getFullYear()!==this._viewYear||n.getMonth()!==this._viewMonth?this._setView(n.getFullYear(),n.getMonth()):this._sync(),this._focusCell())}_moveFocusToWeekBoundary(e,t){if(!e)return;const r=C(e);if(!r)return;const n=Re(this._locale),i=(r.getDay()-n+7)%7;this._moveFocus(e,t?6-i:-i)}_sync(){this.performUpdate()}_focusCell(){var e,t;(t=(e=this.shadowRoot)==null?void 0:e.querySelector(".z-calendar__cell--focus"))==null||t.focus()}};bt.styles=pr;let F=bt;ne([a({type:String})],F.prototype,"value");ne([a({type:String})],F.prototype,"min");ne([a({type:String})],F.prototype,"max");ne([a({type:String})],F.prototype,"locale");ne([a({type:Boolean,attribute:"show-outside"})],F.prototype,"showOutside");ne([a({type:Array,attribute:!1})],F.prototype,"disabledDates");ne([a({type:String})],F.prototype,"prevMonthLabel");ne([a({type:String})],F.prototype,"nextMonthLabel");customElements.define("z-calendar",F);const _r=`/* Shadow styles: host + trigger wrapper. Panel styles are injected globally (see DateRange.ts). */
:host {
  display: inline-flex;
}

.z-date-range__trigger {
  display: inline-flex;
}
`;var mr=Object.defineProperty,U=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&mr(e,t,n),n};function Ft(){Zt("z-date-range",`
    .z-date-range__panel {
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
      animation: z-date-range-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-date-range__panel--hiding {
      animation: z-date-range-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-date-range-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-date-range-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-date-range__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--z-space-2);
    }
    .z-date-range__nav {
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
    .z-date-range__nav:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-date-range__label {
      font-weight: var(--z-font-weight-medium);
    }
    .z-date-range__panels {
      display: flex;
      gap: var(--z-space-4);
    }
    .z-date-range__grid {
      border-collapse: collapse;
      table-layout: fixed;
    }
    .z-date-range__weekday {
      padding: var(--z-space-1) 0;
      width: 32px;
      text-align: center;
      font-size: var(--z-font-size-xs);
      color: var(--z-color-text-secondary);
      font-weight: var(--z-font-weight-medium);
    }
    .z-date-range__cell {
      width: 32px;
      height: var(--z-control-h);
      text-align: center;
      vertical-align: middle;
      border-radius: var(--z-radius-sm);
      cursor: pointer;
      font-size: var(--z-font-size-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-date-range__cell:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-date-range__cell--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .z-date-range__cell--today {
      box-shadow: inset 0 0 0 1px var(--z-color-primary);
    }
    /* ── 区间带（先声明，端点在后覆盖）──
       [WHY] 2026-10-25：原先直接引用原始色板 blue-50（亮色几乎看不出、暗色是亮白块，
       白字压白底直接隐形）。改走 tint 语义层，明暗各一套。 */
    .z-date-range__cell--range-in {
      background: var(--z-color-primary-tint);
      border-radius: 0;
    }
    .z-date-range__cell--range-in:first-child {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-date-range__cell--range-in:last-child {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* hover：同特异性覆盖 .z-date-range__cell:hover，避免选区闪断 */
    .z-date-range__cell--range-in:hover {
      background: var(--z-color-primary-tint-hover);
    }
    /* ── 端点（实心，压在区间带之上）── */
    .z-date-range__cell--selected,
    .z-date-range__cell--range-start,
    .z-date-range__cell--range-end {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-date-range__cell--range-start {
      border-radius: var(--z-radius-sm) 0 0 var(--z-radius-sm);
    }
    .z-date-range__cell--range-end {
      border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
    }
    /* 端点跨行断开时恢复四角圆（同 Datepicker 的说明） */
    .z-date-range__cell--range-start:last-child,
    .z-date-range__cell--range-end:first-child {
      border-radius: var(--z-radius-sm);
    }
    .z-date-range__cell--selected:hover,
    .z-date-range__cell--range-start:hover,
    .z-date-range__cell--range-end:hover {
      background: var(--z-color-primary-solid-hover);
    }
    .z-date-range__cell--focus {
      outline: 2px solid var(--z-color-primary);
      outline-offset: -2px;
    }
  `)}const yt=class yt extends z{constructor(){super(...arguments),this.start="",this.end="",this.min="",this.max="",this.locale="",this.separator="~",this.open=!1,this.prevMonthLabel=O.prevMonth,this.nextMonthLabel=O.nextMonth,this.clearLabel=O.clear,this.ariaLabel="日期范围选择器",this._floating=new en(this),this._viewYear=0,this._viewMonth=0,this._focusISO=null,this._hoverISO=null,this._pendingStart=null,this._lastPanelProps="",this._triggerAria=Jt(()=>{var e;return((e=this.shadowRoot)==null?void 0:e.querySelector('slot[name="trigger"]'))??null},()=>({hasPopup:"dialog",expanded:this.open})),this._onTriggerClick=()=>{this.toggle()},this._onPanelClick=e=>{const t=e.target,r=t.closest("[data-nav]");if(r){e.preventDefault(),this._navMonth(r.dataset.nav==="next"?1:-1);return}const n=t.closest("[data-iso]");if(!n)return;const i=n.dataset.iso;n.classList.contains("z-date-range__cell--disabled")||this._selectISO(i)},this._onPanelMouseOver=e=>{if(!this._pendingStart)return;const t=e.target.closest("[data-iso]");if(!t)return;const r=t.dataset.iso;r!==this._hoverISO&&(this._hoverISO=r,this._renderPanelTo(this._floating.panel))},this._onPanelMouseLeave=()=>{this._hoverISO&&(this._hoverISO=null,this._renderPanelTo(this._floating.panel))},this._onPanelKey=e=>{const t=e,r=this._focusISO;switch(t.key){case"ArrowLeft":e.preventDefault(),this._moveFocus(r,-1);break;case"ArrowRight":e.preventDefault(),this._moveFocus(r,1);break;case"ArrowUp":e.preventDefault(),this._moveFocus(r,-7);break;case"ArrowDown":e.preventDefault(),this._moveFocus(r,7);break;case"Home":e.preventDefault(),this._moveFocusToWeekBoundary(r,!1);break;case"End":e.preventDefault(),this._moveFocusToWeekBoundary(r,!0);break;case"PageUp":e.preventDefault(),t.shiftKey?this._navYear(-1):this._navMonth(-1);break;case"PageDown":e.preventDefault(),t.shiftKey?this._navYear(1):this._navMonth(1);break;case"Enter":case" ":e.preventDefault(),r&&this._isSelectable(r)&&this._selectISO(r);break;case"Escape":e.preventDefault(),this._closePanel();break;case"Tab":this._closePanel();break}}}get _locale(){return this.locale||navigator.language||"en-US"}render(){return m`
      <span
        class="z-date-range__trigger ${this.open?"z-date-range__trigger--open":""}"
        part="trigger"
      >
        <slot name="trigger"></slot>
      </span>
    `}connectedCallback(){super.connectedCallback(),Ft(),this.addEventListener("click",this._onTriggerClick)}disconnectedCallback(){this._closePanel(),this._triggerAria.dispose(),this.removeEventListener("click",this._onTriggerClick),super.disconnectedCallback()}updated(){this._triggerAria.sync(),this.open&&this._floating.panel&&!this._panelPropsCurrent()&&(this._renderPanelTo(this._floating.panel),this._focusCell())}show(){this._openPanel()}close(){this._closePanel()}toggle(){this.open?this._closePanel():this._openPanel()}_getTriggerEl(){const e=this.shadowRoot.querySelector('slot[name="trigger"]'),t=e==null?void 0:e.assignedElements();return t&&t[0]||null}_openPanel(){if(this.open)return;Ft();const e=C(this.start)??C(this.end)??new Date;this._viewYear=e.getFullYear(),this._viewMonth=e.getMonth(),this._focusISO=ae(e),this._pendingStart=this.start&&!this.end?this.start:null,this._hoverISO=null;const t=this._floating.open({panelClass:"z-date-range__panel",hidingClass:"z-date-range__panel--hiding",ariaLabel:this.ariaLabel,anchor:()=>this.shadowRoot.querySelector(".z-date-range__trigger"),onOutsideClose:()=>this._closePanel()},r=>this._renderPanelTo(r));t.addEventListener("click",this._onPanelClick),t.addEventListener("mouseover",this._onPanelMouseOver),t.addEventListener("mouseleave",this._onPanelMouseLeave),t.addEventListener("keydown",this._onPanelKey),this.open=!0,this._focusCell(),this.emit("z-date-range-open")}_closePanel(){var t;if(!this.open)return;const e=this._floating.panel;e==null||e.removeEventListener("click",this._onPanelClick),e==null||e.removeEventListener("mouseover",this._onPanelMouseOver),e==null||e.removeEventListener("mouseleave",this._onPanelMouseLeave),e==null||e.removeEventListener("keydown",this._onPanelKey),this._floating.close(),this.open=!1,this._hoverISO=null,this._pendingStart=null,this._focusISO=null,(t=this._getTriggerEl())==null||t.focus(),this.emit("z-date-range-close")}_panelPropsSnapshot(){return[this.start,this.end,this.min,this.max,this._locale].join("|")}_panelPropsCurrent(){return this._panelPropsSnapshot()===this._lastPanelProps}_renderPanelTo(e){e.innerHTML=this._renderPanel(),this._lastPanelProps=this._panelPropsSnapshot()}_focusCell(){var e,t;(t=(e=this._floating.panel)==null?void 0:e.querySelector(".z-date-range__cell--focus"))==null||t.focus()}_renderPanel(){const e=this._locale,t=Re(e),r=Ke(),n=this._viewMonth===11?this._viewYear+1:this._viewYear,i=(this._viewMonth+1)%12,o=je(e,this._viewYear,this._viewMonth),l=je(e,n,i);return m`
      <div class="z-date-range__header" part="header">
        <button type="button" class="z-date-range__nav" data-nav="prev" part="nav-prev" aria-label="${c(this.prevMonthLabel)}">‹</button>
        <div class="z-date-range__label" part="label">${o} ${this.separator} ${l}</div>
        <button type="button" class="z-date-range__nav" data-nav="next" part="nav-next" aria-label="${c(this.nextMonthLabel)}">›</button>
      </div>
      <div class="z-date-range__panels" part="panels">
        ${this._gridHTML(this._viewYear,this._viewMonth,t,r)}
        ${this._gridHTML(n,i,t,r)}
      </div>
    `}_gridHTML(e,t,r,n){return Qt({prefix:"z-date-range",locale:this._locale,weekStart:r,cells:Gt(e,t,r),today:n,ariaLabel:je(this._locale,e,t),cellHTML:(i,o)=>this._cellHTML(i,o)})}_cellHTML(e,t){const{iso:r,day:n}=e,i=["z-date-range__cell"],o=!qe(r,this.min,this.max);o&&i.push("z-date-range__cell--disabled"),r===t&&i.push("z-date-range__cell--today");let l="false";this.start&&r===this.start&&(i.push("z-date-range__cell--range-start"),l="true"),this.end&&r===this.end&&(i.push("z-date-range__cell--range-end"),l="true");const h=!!(this.start&&this.end&&ke(r,this.start)>0&&ke(r,this.end)<0),p=!!(this._pendingStart&&this._hoverISO&&ke(r,this._pendingStart)>=0&&ke(r,this._hoverISO)<=0);(h||p)&&i.push("z-date-range__cell--range-in");const _=r===this._focusISO;return _&&i.push("z-date-range__cell--focus"),m`<td
      class="${i.join(" ")}"
      role="gridcell"
      data-iso="${r}"
      tabindex="${_?0:-1}"
      aria-selected="${l}"
      aria-disabled="${o?"true":"false"}"
      ${r===t?'aria-current="date"':""}
      part="cell"
    >${n}</td>`}_selectISO(e){this._focusISO=e,!this.start||this.end?(this.start=e,this.end="",this._pendingStart=e,this._renderPanelTo(this._floating.panel)):ke(e,this.start)>=0?(this.end=e,this._pendingStart=null,this.emit("z-change",{start:this.start,end:e}),this._renderPanelTo(this._floating.panel)):(this.start=e,this._pendingStart=e,this._renderPanelTo(this._floating.panel)),this._focusCell()}_isSelectable(e){return C(e)!==null&&qe(e,this.min,this.max)}_moveFocus(e,t){if(!e)return;const r=C(e);if(!r)return;const n=new Date(r);n.setDate(n.getDate()+t);const i=ae(n);if(C(i)===null)return;const o=new Date(this._viewYear,this._viewMonth,1),l=new Date(this._viewYear,this._viewMonth+2,0);n<o?this._shiftView(-1):n>l&&this._shiftView(1),this._focusISO=i,this._renderPanelTo(this._floating.panel),this._focusCell()}_moveFocusToWeekBoundary(e,t){if(!e)return;const r=C(e);if(!r)return;const n=Re(this._locale),i=(r.getDay()-n+7)%7;this._moveFocus(e,t?6-i:-i)}_shiftView(e){let t=this._viewMonth+e,r=this._viewYear;t<0&&(t=11,r-=1),t>11&&(t=0,r+=1),this._viewMonth=t,this._viewYear=r}_navMonth(e){let t=this._viewMonth+e,r=this._viewYear;t<0&&(t=11,r-=1),t>11&&(t=0,r+=1),this._viewMonth=t,this._viewYear=r,this._focusISO=ae(new Date(this._viewYear,this._viewMonth,1)),this._renderPanelTo(this._floating.panel),this._focusCell()}_navYear(e){this._viewYear+=e,this._focusISO=ae(new Date(this._viewYear,this._viewMonth,1)),this._renderPanelTo(this._floating.panel),this._focusCell()}};yt.styles=_r;let $=yt;U([a({type:String})],$.prototype,"start");U([a({type:String})],$.prototype,"end");U([a({type:String})],$.prototype,"min");U([a({type:String})],$.prototype,"max");U([a({type:String})],$.prototype,"locale");U([a({type:String})],$.prototype,"separator");U([a({type:Boolean})],$.prototype,"open");U([a({type:String})],$.prototype,"prevMonthLabel");U([a({type:String})],$.prototype,"nextMonthLabel");U([a({type:String})],$.prototype,"clearLabel");U([a({type:String})],$.prototype,"ariaLabel");customElements.define("z-date-range",$);const fr=`/* Shadow styles: host + trigger wrapper. Panel styles are injected globally (see TimePicker.ts). */
:host {
  display: inline-flex;
}

.z-time-picker__trigger {
  display: inline-flex;
}

:host([disabled]) .z-time-picker__trigger {
  opacity: 0.5;
  cursor: not-allowed;
}
`;var vr=Object.defineProperty,re=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&vr(e,t,n),n};const We=28;function Ht(){Zt("z-time-picker",`
    .z-time-picker__panel {
      position: fixed;
      z-index: var(--z-z-dropdown);
      padding: var(--z-space-2) 0;
      background: var(--z-color-bg);
      border: 1px solid var(--z-color-border);
      border-radius: var(--z-radius-md);
      box-shadow: var(--z-shadow-lg);
      font-family: var(--z-font-sans);
      font-size: var(--z-font-size-sm);
      color: var(--z-color-text);
      outline: none;
      user-select: none;
      animation: z-time-picker-in var(--z-duration-fast) var(--z-ease-enter);
    }
    .z-time-picker__panel--hiding {
      animation: z-time-picker-out var(--z-duration-micro) var(--z-ease-exit) forwards;
    }
    @keyframes z-time-picker-in {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes z-time-picker-out {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.95); }
    }
    .z-time-picker__cols {
      display: flex;
    }
    .z-time-picker__col {
      width: 48px;
      height: 140px;
      overflow-y: auto;
      scrollbar-width: none;
      scroll-snap-type: y mandatory;
      outline: none;
    }
    .z-time-picker__col::-webkit-scrollbar {
      display: none;
    }
    .z-time-picker__col:focus {
      /* [WHY] blue-50 暗色不翻转，焦点列会变亮白；改语义 soft */
      background: var(--z-color-primary-soft);
    }
    .z-time-picker__item {
      height: var(--z-control-h-sm);
      line-height: var(--z-control-h-sm);
      text-align: center;
      cursor: pointer;
      scroll-snap-align: center;
      border-radius: var(--z-radius-sm);
      transition: background var(--z-transition-fast), color var(--z-transition-fast);
    }
    .z-time-picker__item:hover {
      background: var(--z-color-bg-secondary);
    }
    .z-time-picker__item--selected {
      background: var(--z-color-primary-solid);
      color: var(--z-color-primary-text);
    }
    .z-time-picker__item--selected:hover {
      background: var(--z-color-primary-solid-hover);
    }
  `)}const xt=class xt extends z{constructor(){super(...arguments),this.value="",this.format="24",this.step=1,this.second=!1,this.disabled=!1,this.open=!1,this.amLabel="AM",this.pmLabel="PM",this._floating=new en(this),this._h=0,this._m=0,this._s=0,this._lastPanelProps="",this._triggerAria=Jt(()=>{var e;return((e=this.shadowRoot)==null?void 0:e.querySelector('slot[name="trigger"]'))??null},()=>({hasPopup:"dialog",expanded:this.open,disabled:this.disabled})),this._onTriggerClick=()=>{this.disabled||this.toggle()},this._onPanelClick=e=>{const r=e.target.closest(".z-time-picker__item");if(!r)return;const n=r.closest("[data-col]");if(!n)return;const i=Number(r.dataset.index);this._applySelection(n.dataset.col,i,!0)},this._onPanelScroll=e=>{const t=e.target,r=t.dataset.col;if(!r||r==="ampm")return;const n=Math.round(t.scrollTop/We);this._applySelection(r,n,!1)},this._onPanelKey=e=>{const t=e,r=e.target.closest("[data-col]");switch(t.key){case"ArrowUp":case"ArrowDown":{if(!r)return;e.preventDefault();const n=t.key==="ArrowUp"?-1:1,o=Math.round(r.scrollTop/We);this._applySelection(r.dataset.col,o+n,!0);break}case"Enter":e.preventDefault(),this._closePanel();break;case"Escape":e.preventDefault(),this._closePanel();break;case"Tab":this._closePanel();break}}}render(){return m`
      <span
        class="z-time-picker__trigger ${this.open?"z-time-picker__trigger--open":""}"
        part="trigger"
      >
        <slot name="trigger"></slot>
      </span>
    `}connectedCallback(){super.connectedCallback(),Ht(),this.addEventListener("click",this._onTriggerClick)}disconnectedCallback(){this._closePanel(),this._triggerAria.dispose(),this.removeEventListener("click",this._onTriggerClick),super.disconnectedCallback()}updated(){this._triggerAria.sync(),this.open&&this._floating.panel&&!this._panelPropsCurrent()&&(this._renderPanelTo(this._floating.panel),this._scrollColumns())}show(){this._openPanel()}close(){this._closePanel()}toggle(){this.open?this._closePanel():this._openPanel()}_getTriggerEl(){const e=this.shadowRoot.querySelector('slot[name="trigger"]'),t=e==null?void 0:e.assignedElements();return t&&t[0]||null}_parseValue(e){const t=/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/.exec(e);if(!t)return null;const r=Number(t[1]),n=Number(t[2]),i=t[3]!==void 0?Number(t[3]):0;return r>23||n>59||i>59?null:{h:r,m:n,s:i}}_formatValue(e){const t=r=>String(r).padStart(2,"0");return`${t(e.h)}:${t(e.m)}${this.second?`:${t(e.s)}`:""}`}_openPanel(){var r;if(this.open||this.disabled)return;Ht();const e=this._parseValue(this.value)??{h:0,m:0,s:0};this._h=e.h,this._m=e.m,this._s=e.s;const t=this._floating.open({panelClass:"z-time-picker__panel",hidingClass:"z-time-picker__panel--hiding",ariaLabel:"Time picker",anchor:this.shadowRoot.querySelector(".z-time-picker__trigger"),onOutsideClose:()=>this._closePanel()},n=>this._renderPanelTo(n));t.addEventListener("click",this._onPanelClick),t.addEventListener("keydown",this._onPanelKey),t.addEventListener("scroll",this._onPanelScroll,!0),this.open=!0,this._scrollColumns(),(r=t.querySelector(".z-time-picker__col"))==null||r.focus(),this.emit("z-time-picker-open")}_closePanel(){var t;if(!this.open)return;const e=this._floating.panel;e==null||e.removeEventListener("click",this._onPanelClick),e==null||e.removeEventListener("keydown",this._onPanelKey),e==null||e.removeEventListener("scroll",this._onPanelScroll,!0),this._floating.close(),this.open=!1,(t=this._getTriggerEl())==null||t.focus(),this.emit("z-time-picker-close")}_panelPropsSnapshot(){return[this.format,this.second?"s":"",this.step,this.amLabel,this.pmLabel].join("|")}_panelPropsCurrent(){return this._panelPropsSnapshot()===this._lastPanelProps}_renderPanelTo(e){e.innerHTML=this._renderPanel(),this._lastPanelProps=this._panelPropsSnapshot()}_renderPanel(){const e=[],t=this.format==="12"?12:24;let r="";for(let o=0;o<t;o++){const l=this.format==="12"?String(o+1):String(o).padStart(2,"0");r+=`<div class="z-time-picker__item" data-index="${o}" part="item">${l}</div>`}e.push(`<div class="z-time-picker__col" data-col="hour" tabindex="0" part="col" aria-label="Hour">${r}</div>`);const n=Math.ceil(60/this.step);let i="";for(let o=0;o<n;o++){const l=o*this.step;i+=`<div class="z-time-picker__item" data-index="${o}" part="item">${String(l).padStart(2,"0")}</div>`}if(e.push(`<div class="z-time-picker__col" data-col="minute" tabindex="0" part="col" aria-label="Minute">${i}</div>`),this.second){let o="";for(let l=0;l<60;l++)o+=`<div class="z-time-picker__item" data-index="${l}" part="item">${String(l).padStart(2,"0")}</div>`;e.push(`<div class="z-time-picker__col" data-col="second" tabindex="0" part="col" aria-label="Second">${o}</div>`)}return this.format==="12"&&e.push(`<div class="z-time-picker__col z-time-picker__col--ampm" data-col="ampm" tabindex="0" part="col" aria-label="Period"><div class="z-time-picker__item" data-index="0" part="item">${c(this.amLabel)}</div><div class="z-time-picker__item" data-index="1" part="item">${c(this.pmLabel)}</div></div>`),`<div class="z-time-picker__cols" part="cols">${e.join("")}</div>`}_scrollColumns(){if(!this._floating.panel)return;const e=this.format==="12"?(this._h%12||12)-1:this._h,t=this._m/this.step;this._setColIndex("hour",e,!0),this._setColIndex("minute",t,!0),this.second&&this._setColIndex("second",this._s,!0),this.format==="12"&&this._setColIndex("ampm",this._h>=12?1:0,!1)}_setColIndex(e,t,r){var h;const n=(h=this._floating.panel)==null?void 0:h.querySelector(`[data-col="${e}"]`);if(!n)return;const i=n.querySelectorAll(".z-time-picker__item").length,o=Math.min(Math.max(0,Math.round(t)),i-1);n.querySelectorAll(".z-time-picker__item").forEach((p,_)=>p.classList.toggle("z-time-picker__item--selected",_===o)),r&&(n.scrollTop=o*We)}_applySelection(e,t,r){let n=this._h,i=this._m,o=this._s;switch(e){case"hour":{if(this.format==="12"){const l=t+1;n=(this._h>=12?12:0)+l%12}else n=t;break}case"minute":i=t*this.step;break;case"second":o=t;break;case"ampm":t===0&&n>=12?n-=12:t===1&&n<12&&(n+=12);break}this._h=n,this._m=i,this._s=o,this.__zui_prop_value=this._formatValue({h:n,m:i,s:o}),this._setColIndex(e,t,r),this.emit("z-change",{value:this._formatValue({h:n,m:i,s:o})})}};xt.styles=fr;let H=xt;re([a({type:String})],H.prototype,"value");re([a({type:String})],H.prototype,"format");re([a({type:Number})],H.prototype,"step");re([a({type:Boolean})],H.prototype,"second");re([a({type:Boolean})],H.prototype,"disabled");re([a({type:Boolean})],H.prototype,"open");re([a({type:String})],H.prototype,"amLabel");re([a({type:String})],H.prototype,"pmLabel");customElements.define("z-time-picker",H);const gr=`/* ===== z-drawer =====
   [WHY] 抽屉布局与动画：placement 决定主轴/滑入方向与尺寸预设。
   退场动画机制与 Modal 相同（_closing → animationend 后隐藏）。 */

:host {
  display: contents;
  /* [WHY] 堆叠 z-index: 与 Modal 同栈（overlayManager 统一管理），同层序 */
  --z-drawer-stack-index: 0;
}

/* ── Overlay ── */

.z-drawer__overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-z-modal) + var(--z-drawer-stack-index, 0) * 10);
  background: rgba(0, 0, 0, 0.5);
  animation: z-drawer-fade-in var(--z-duration-normal) var(--z-ease-enter);
}

@keyframes z-drawer-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.z-drawer__overlay--closing {
  animation: z-drawer-fade-out var(--z-duration-normal) var(--z-ease-exit) forwards;
  pointer-events: none;
}

@keyframes z-drawer-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* ── Panel 基础 ── */

.z-drawer__panel {
  position: absolute;
  display: flex;
  flex-direction: column;
  background: var(--z-color-popover);
  box-shadow: var(--z-shadow-xl);
  outline: none;
}

/* [WHY] placement 布局用 :host([placement]) 属性选择器（见下），
   JS 内联的 --z-drawer-placement 变量仅供调试/主题覆盖 */

/* ── 四向布局 ── */

.z-drawer__panel {
  --z-drawer-width: 400px;
  --z-drawer-height: 400px;
}

/* 主轴尺寸：left/right 占满高度、宽按变量；top/bottom 占满宽度、高按变量 */
.z-drawer__panel {
  top: 0;
  bottom: 0;
  width: var(--z-drawer-width);
  max-width: 100vw;
  height: 100%;
}

/* [WHY 这里必须显式写 right: 0] 横向只有 \`left\` / \`right\` 两种 placement，而
   \`.z-drawer__panel\` 早先只给了 top/bottom + 宽度，**没有任何 left/right 规则**：
   \`position:absolute\` 在没有横向锚点时会停在「静态位置」（左侧、宽度 400 贴着视口左缘），
   而 \`placement\` 的默认值恰恰是 \`right\`（属性缺省，\`:host([placement])\` 选择器也就匹配不上）。
   于是**不写 placement 的调用方拿到的是一个贴着左边的面板** —— 看起来像「抽屉样式没加载」。
   缺省即右侧：这条保证「什么都不写」是对的，left 再覆盖回去。 */
.z-drawer__panel {
  right: 0;
}

:host([placement="left"]) .z-drawer__panel {
  left: 0;
  right: auto;
}

:host([placement="top"]) .z-drawer__panel,
:host([placement="bottom"]) .z-drawer__panel {
  left: 0;
  right: 0;
  top: auto;
  bottom: auto;
  width: 100%;
  max-width: 100vw;
  height: var(--z-drawer-height);
  max-height: 100vh;
}

:host([placement="top"]) .z-drawer__panel {
  top: 0;
}

:host([placement="bottom"]) .z-drawer__panel {
  bottom: 0;
}

/* ── 滑入动画（按 placement 方向）── */

.z-drawer__panel {
  animation: z-drawer-slide-in-right var(--z-duration-normal) var(--z-ease-enter);
}

:host([placement="left"]) .z-drawer__panel {
  animation-name: z-drawer-slide-in-left;
}

:host([placement="top"]) .z-drawer__panel {
  animation-name: z-drawer-slide-in-top;
}

:host([placement="bottom"]) .z-drawer__panel {
  animation-name: z-drawer-slide-in-bottom;
}

@keyframes z-drawer-slide-in-left {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}

@keyframes z-drawer-slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes z-drawer-slide-in-top {
  from { transform: translateY(-100%); }
  to { transform: translateY(0); }
}

@keyframes z-drawer-slide-in-bottom {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* ── 退场动画 ── */

.z-drawer__panel--closing {
  animation: z-drawer-slide-out-right var(--z-duration-normal) var(--z-ease-exit) forwards;
}

:host([placement="left"]) .z-drawer__panel--closing {
  animation-name: z-drawer-slide-out-left;
}

:host([placement="top"]) .z-drawer__panel--closing {
  animation-name: z-drawer-slide-out-top;
}

:host([placement="bottom"]) .z-drawer__panel--closing {
  animation-name: z-drawer-slide-out-bottom;
}

@keyframes z-drawer-slide-out-left {
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
}

@keyframes z-drawer-slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes z-drawer-slide-out-top {
  from { transform: translateY(0); }
  to { transform: translateY(-100%); }
}

@keyframes z-drawer-slide-out-bottom {
  from { transform: translateY(0); }
  to { transform: translateY(100%); }
}

/* ── Sizes ── */

:host([size="sm"]) .z-drawer__panel {
  --z-drawer-width: 320px;
  --z-drawer-height: 320px;
}

:host([size="lg"]) .z-drawer__panel {
  --z-drawer-width: 560px;
  --z-drawer-height: 560px;
}

:host([full]) .z-drawer__panel {
  --z-drawer-width: 100vw;
  --z-drawer-height: 100vh;
}

/* ── 结构与 Modal 相同 ── */

.z-drawer__title {
  margin: 0;
  font-size: inherit;
  font-weight: 600;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--z-space-4) var(--z-space-5);
  border-bottom: 1px solid var(--z-color-border);
  font-weight: 600;
  font-size: var(--z-font-size-base);
  flex-shrink: 0;
  gap: var(--z-space-3);
}

.z-drawer__header:empty {
  display: none;
}

.z-drawer__header:has(.z-drawer__close:only-child) {
  padding: var(--z-space-2) var(--z-space-2) 0 var(--z-space-5);
  border-bottom: none;
  justify-content: flex-end;
}

.z-drawer__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: var(--z-control-h-sm);
  border: none;
  border-radius: var(--z-radius-sm);
  background: transparent;
  color: var(--z-color-text-secondary);
  cursor: pointer;
  flex-shrink: 0;
  transition: background var(--z-transition-fast);
}

.z-drawer__close:hover {
  background: var(--z-color-hover);
  color: var(--z-color-text);
}

.z-drawer__body {
  padding: var(--z-space-5);
  overflow-y: auto;
  flex: 1;
}

.z-drawer__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--z-space-3);
  padding: var(--z-space-3) var(--z-space-5);
  border-top: 1px solid var(--z-color-border);
  flex-shrink: 0;
}

.z-drawer__footer:empty {
  display: none;
}
`;var zr=Object.defineProperty,I=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&zr(e,t,n),n};let br=0;const wt=class wt extends z{constructor(){super(...arguments),this.open=!1,this.closeOnOverlay=!0,this.closeOnEscape=!0,this.placement="right",this.width="",this.height="",this.size="md",this.full=!1,this.closeLabel=O.close,this.portal=!1,this._titleId=`z-drawer-title-${++br}`,this._dialog=new An(this,{overlaySelector:".z-drawer__overlay",panelSelector:".z-drawer__panel",stackIndexVar:"--z-drawer-stack-index"}),this._onOverlayClick=e=>{!this.open||!this.closeOnOverlay||e.target===e.currentTarget&&this.close()}}attributeChangedCallback(e,t,r){if(e==="size"&&r==="full"){this.full=!0;return}e==="size"&&r&&r!=="full"&&(this.full=!1),super.attributeChangedCallback(e,t,r)}render(){if(!this.open&&!this._dialog.closing)return m`<div style="display:none" part="hidden"></div>`;const e=this._dialog.closing?" z-drawer__overlay--closing":"",t=this._dialog.closing?" z-drawer__panel--closing":"",r=` z-drawer__panel--${this.size}`;return m`
      <div class="z-drawer__overlay${e}" part="overlay">
        <div
          class="z-drawer__panel${t}${r}"
          part="panel"
          role="dialog"
          aria-modal="true"
          style="--z-drawer-placement:${this.placement};${this.width?`--z-drawer-width:${this.width};`:""}${this.height?`--z-drawer-height:${this.height};`:""}"
          ${this.title?`aria-labelledby="${this._titleId}"`:""}
        >
          <div class="z-drawer__header" part="header">
            ${this.title?`<h2 id="${this._titleId}" class="z-drawer__title" part="title">${c(this.title)}</h2>`:""}
            <slot name="header"></slot>
            <button type="button" class="z-drawer__close" part="close" aria-label="${c(this.closeLabel)}">
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
          <div class="z-drawer__body" part="body">
            <slot></slot>
          </div>
          <div class="z-drawer__footer" part="footer">
            <slot name="footer"></slot>
          </div>
        </div>
      </div>
    `}updated(){const e=this.shadowRoot.querySelector(".z-drawer__overlay");e&&e.addEventListener("click",this._onOverlayClick);const t=this.shadowRoot.querySelector(".z-drawer__close");t&&t.addEventListener("click",()=>this.close()),this._dialog.afterUpdate()}disconnectedCallback(){this._dialog.handleDisconnect(),super.disconnectedCallback()}show(){this.open||(this.open=!0)}close(){if(this.open){if(this.beforeClose){const e=this.beforeClose();if(e===!1)return;if(e instanceof Promise){e.then(t=>{t&&this.open&&(this.open=!1)});return}}this.open=!1}}toggle(){this.open?this.close():this.show()}static open(e={}){const t=document.createElement("z-drawer");return t._dialog.owned=!0,e.title!==void 0&&(t.title=e.title),e.placement!==void 0&&(t.placement=e.placement),e.width!==void 0&&(t.width=e.width),e.height!==void 0&&(t.height=e.height),e.size!==void 0&&(t.size=e.size),e.closeOnOverlay!==void 0&&(t.closeOnOverlay=e.closeOnOverlay),e.closeOnEscape!==void 0&&(t.closeOnEscape=e.closeOnEscape),e.closeLabel!==void 0&&(t.closeLabel=e.closeLabel),e.portal!==void 0&&(t.portal=e.portal),e.beforeClose!==void 0&&(t.beforeClose=e.beforeClose),document.body.appendChild(t),t.show(),{close:()=>t.close(),element:t}}};wt.styles=gr;let x=wt;I([a({type:Boolean})],x.prototype,"open");I([a({type:Boolean})],x.prototype,"closeOnOverlay");I([a({type:Boolean})],x.prototype,"closeOnEscape");I([a({type:String})],x.prototype,"placement");I([a({type:String})],x.prototype,"width");I([a({type:String})],x.prototype,"height");I([a({type:String})],x.prototype,"size");I([a({type:Boolean})],x.prototype,"full");I([a({type:String,attribute:"close-label"})],x.prototype,"closeLabel");I([a({type:Boolean})],x.prototype,"portal");I([a({type:String})],x.prototype,"title");I([a({attribute:!1})],x.prototype,"beforeClose");customElements.define("z-drawer",x);const yr=`/* ===== z-steps ===== */

:host {
  display: block;
}

.z-steps {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
}

/* ── 横向: 连接线经 ::after 铺满 marker 之后 ── */

.z-steps--horizontal .z-steps__item {
  position: relative;
  flex: 1;
  display: flex;
  gap: var(--z-space-3);
  align-items: flex-start;
  padding: 0;
}

.z-steps--horizontal .z-steps__item:not(:last-child)::after {
  content: "";
  position: absolute;
  top: 14px;
  left: calc(var(--z-steps-marker-size, 28px) + var(--z-space-3) + 2px);
  right: calc(var(--z-steps-marker-size, 28px) + var(--z-space-3) + 2px);
  height: 2px;
  background: var(--z-color-border);
  /* [WHY] 连接线在内容上方,内容区留出 padding 避免文字压线 */
  z-index: 0;
}

.z-steps--horizontal .z-steps__content {
  padding-top: 3px;
  min-width: 0;
  position: relative;
  z-index: 1;
}

/* ── 竖向: 连接线经 ::after 纵向延伸 ── */

.z-steps--vertical {
  flex-direction: column;
  gap: 0;
}

.z-steps--vertical .z-steps__item {
  position: relative;
  display: flex;
  gap: var(--z-space-3);
  align-items: flex-start;
  padding-bottom: var(--z-space-5);
}

.z-steps--vertical .z-steps__item:not(:last-child)::after {
  content: "";
  position: absolute;
  top: calc(var(--z-steps-marker-size, 28px) + 2px);
  left: calc(var(--z-steps-marker-size, 28px) / 2 - 1px);
  bottom: 0;
  width: 2px;
  background: var(--z-color-border);
}

/* ── Marker ── */

.z-steps__marker {
  width: var(--z-steps-marker-size, 28px);
  height: var(--z-steps-marker-size, 28px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--z-color-bg-tertiary);
  border: 2px solid var(--z-color-border);
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  font-weight: 600;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  transition: background var(--z-transition-fast), border-color var(--z-transition-fast), color var(--z-transition-fast);
}

.z-steps__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.z-steps__item--finish .z-steps__marker {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-white);
}

.z-steps__item--process .z-steps__marker {
  background: var(--z-color-primary-solid);
  border-color: var(--z-color-primary-solid);
  color: var(--z-color-primary-text);
  /* [WHY] audit 2026-10-25: 此前用 --z-color-primary-soft 当光晕，与「浅色底」语义冲突。
     装饰环统一由自身色 color-mix 派生，暗色自动可见。 */
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--z-color-primary) 20%, transparent);
}

.z-steps__item--error .z-steps__marker {
  background: var(--z-color-danger-solid);
  border-color: var(--z-color-danger-solid);
  color: var(--z-color-white);
}

.z-steps__item--wait .z-steps__marker {
  color: var(--z-color-text-secondary);
}

/* ── 内容 ── */

.z-steps__title {
  font-size: var(--z-font-size-base);
  font-weight: 500;
  color: var(--z-color-text);
}

.z-steps__item--wait .z-steps__title {
  color: var(--z-color-text-secondary);
}

.z-steps__desc {
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  margin-top: 2px;
}

/* ── clickable ── */

.z-steps__item[role="button"] {
  cursor: pointer;
}

.z-steps__item[role="button"]:hover .z-steps__title {
  color: var(--z-color-primary);
}

.z-steps__item[role="button"]:focus-visible {
  outline: var(--z-focus-ring-outline);
  outline-offset: 2px;
  border-radius: var(--z-radius-sm);
}
`;var xr=Object.defineProperty,Ce=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&xr(e,t,n),n};function wr(s,e,t,r){return s!=null&&s.status?s.status:e<t?"finish":e===t?r==="error"?"error":"process":"wait"}const Nt={finish:'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>',error:'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l6 6M11 5l-6 6"/></svg>',process:'<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="3.5"/></svg>',wait:""},kt=class kt extends z{constructor(){super(...arguments),this.items=[],this.current=0,this.status="process",this.direction="horizontal",this.clickable=!1,this._listEl=null,this._onClick=e=>{if(!this.clickable)return;const t=e.target.closest(".z-steps__item");t&&this._select(Number(t.dataset.index))},this._onKeydown=e=>{if(!this.clickable||e.key!=="Enter"&&e.key!==" ")return;const t=e.target.closest(".z-steps__item");t&&(e.preventDefault(),this._select(Number(t.dataset.index)))}}render(){const e=this.items.map((t,r)=>{const n=wr(t,r,this.current,this.status),i=r===this.current,o=r<this.current;let l;t.icon!==void 0&&t.icon!==""?l=`<span class="z-steps__icon" part="icon" aria-hidden="true">${c(t.icon)}</span>`:Nt[n]?l=`<span class="z-steps__icon z-steps__icon--${n}" part="icon" aria-hidden="true">${Nt[n]}</span>`:l=`<span class="z-steps__num" part="num">${r+1}</span>`;const h=t.description?`<div class="z-steps__desc" part="description">${c(t.description)}</div>`:"",p=this.clickable?' tabindex="0" role="button"':"";return`
        <li class="z-steps__item z-steps__item--${n}${o?" z-steps__item--finished":""}${i?" z-steps__item--current":""}" part="item" data-index="${r}"${p}${i?' aria-current="step"':""}>
          <div class="z-steps__marker" part="marker">${l}</div>
          <div class="z-steps__content" part="content">
            <div class="z-steps__title" part="step-title">${c(t.title)}</div>
            ${h}
          </div>
        </li>`});return m`
      <ol class="z-steps z-steps--${this.direction}" part="root">
        ${e.join("")}
      </ol>
    `}updated(){const e=this.shadowRoot.querySelector(".z-steps");!e||e===this._listEl||(this._listEl=e,e.addEventListener("click",this._onClick),e.addEventListener("keydown",this._onKeydown))}_select(e){if(e===this.current)return;const t=this.items[e];t&&this.emit("z-change",{index:e,item:t})}};kt.styles=yr;let Q=kt;Ce([a({type:Array,attribute:!1})],Q.prototype,"items");Ce([a({type:Number})],Q.prototype,"current");Ce([a({type:String})],Q.prototype,"status");Ce([a({type:String})],Q.prototype,"direction");Ce([a({type:Boolean})],Q.prototype,"clickable");customElements.define("z-steps",Q);const kr=`/* ===== z-anchor ===== */

:host {
  display: block;
}

.z-anchor__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  border-left: 2px solid var(--z-color-border);
  padding-left: 0;
}

.z-anchor__link {
  display: block;
  padding: 6px 12px;
  border-left: 2px solid transparent;
  margin-left: -2px;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  text-decoration: none;
  border-radius: 0 var(--z-radius-sm) var(--z-radius-sm) 0;
  transition: color var(--z-transition-fast), background var(--z-transition-fast), border-color var(--z-transition-fast);
}

.z-anchor__link:hover {
  color: var(--z-color-text);
  background: var(--z-color-hover-subtle);
}

.z-anchor__link--active {
  color: var(--z-color-primary);
  border-left-color: var(--z-color-primary);
  background: var(--z-color-primary-soft);
  font-weight: 500;
}
`;var Sr=Object.defineProperty,He=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Sr(e,t,n),n};const St=class St extends z{constructor(){super(...arguments),this.items=[],this.offset=0,this.container="",this.smooth=!1,this._active="",this._navEl=null,this._io=null,this._onClick=e=>{var i,o;const t=e.target.closest("a[part='link']");if(!t)return;const r=t.dataset.href??"",n=this._getTarget(r);if(n){e.preventDefault();const l=this._getScroller(),h=l===window?window.scrollY:l.scrollTop??0,p=n.getBoundingClientRect().top+h-this.offset;try{this.smooth?(i=l.scrollTo)==null||i.call(l,{top:p,behavior:"smooth"}):l===window?window.scrollTo(0,p):l.scrollTop=p}catch{(o=n.scrollIntoView)==null||o.call(n,this.smooth?{behavior:"smooth"}:void 0)}}this._setActive(r)}}_getTarget(e){return e.startsWith("#")?document.getElementById(e.slice(1)):null}_getScrollRoot(){if(this.container){const e=document.querySelector(this.container);if(e)return e}return document}_getScroller(){if(this.container){const e=document.querySelector(this.container);if(e)return e}return window}render(){const e=this.items.map((t,r)=>{const n=this._active===t.href?" z-anchor__link--active":"";return`<li part="item" data-index="${r}"><a class="z-anchor__link${n}" part="link" href="${c(t.href)}" data-href="${c(t.href)}">${c(t.label)}</a></li>`});return m`<nav class="z-anchor" part="root" aria-label="Anchor navigation"><ul class="z-anchor__list" part="list">${e.join("")}</ul></nav>`}updated(){const e=this.shadowRoot.querySelector(".z-anchor");!e||e===this._navEl||(this._navEl=e,e.addEventListener("click",this._onClick),this._setupScrollspy())}_setupScrollspy(){var r;if((r=this._io)==null||r.disconnect(),this._io=null,typeof IntersectionObserver>"u")return;const e=[];for(const n of this.items){const i=this._getTarget(n.href);i&&e.push({el:i,href:n.href})}if(!e.length)return;const t=this._getScrollRoot();this._io=new IntersectionObserver(n=>{for(const i of n){if(!i.isIntersecting)continue;const o=e.find(l=>l.el===i.target);o&&this._active!==o.href&&this._setActive(o.href)}},{root:t===document?null:t,rootMargin:`-${this.offset}px 0px -75% 0px`,threshold:0});for(const n of e)this._io.observe(n.el)}_setActive(e){this._active=e;const t=this.shadowRoot.querySelector(".z-anchor");t==null||t.querySelectorAll("a[part='link']").forEach(r=>{const n=r.dataset.href===e;r.classList.toggle("z-anchor__link--active",n),n?r.setAttribute("aria-current","true"):r.removeAttribute("aria-current")}),this.emit("z-change",{active:e})}disconnectedCallback(){var e;(e=this._io)==null||e.disconnect(),this._io=null,super.disconnectedCallback()}};St.styles=kr;let le=St;He([a({type:Array,attribute:!1})],le.prototype,"items");He([a({type:Number})],le.prototype,"offset");He([a({type:String})],le.prototype,"container");He([a({type:Boolean})],le.prototype,"smooth");customElements.define("z-anchor",le);const Lr=`/* ===== z-timeline ===== */

:host {
  display: block;
}

.z-timeline {
  list-style: none;
  margin: 0;
  padding: 0;
}

.z-timeline__item {
  position: relative;
  display: flex;
  gap: var(--z-space-3);
  padding-bottom: var(--z-space-5);
}

/* [WHY] 竖线经 ::before 贯穿: 从 dot 中心到下项 dot 中心 */
.z-timeline__item:not(:last-child)::before {
  content: "";
  position: absolute;
  top: 22px;
  left: 6px;
  bottom: -2px;
  width: 2px;
  background: var(--z-color-border);
}

.z-timeline__item:last-child::before {
  display: none;
}

/* ── Dot ── */

.z-timeline__dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  /* [WHY] audit 2026-10-25: color 与 background 同源，装饰环由 currentColor 派生 →
     各状态只需改色值即可同时决定「点色 + 环色」，替代 5 处 rgba 散写。 */
  color: var(--z-color-primary);
  background: currentColor;
  border: 2px solid var(--z-color-bg);
  box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 20%, transparent);
  flex-shrink: 0;
  margin-top: 4px;
  z-index: 1;
}

.z-timeline__dot-custom {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--z-font-size-sm);
  margin-top: 4px;
  flex-shrink: 0;
  z-index: 1;
}

/* status 着色（覆盖默认主色） */
.z-timeline__item--success .z-timeline__dot {
  color: var(--z-color-success);
}

.z-timeline__item--error .z-timeline__dot {
  color: var(--z-color-danger);
}

.z-timeline__item--warning .z-timeline__dot {
  color: var(--z-color-warning);
}

.z-timeline__item--info .z-timeline__dot {
  color: var(--z-color-info);
}

.z-timeline__item--pending .z-timeline__dot,
.z-timeline__dot--pending {
  color: var(--z-color-gray-400);
  /* motion-check-ignore: 1.6s 与 loop-slow(1500) 差 6%，属可接受范围但仍是变更；
     本轮硬约束是零视觉回归，故保留字面量，待视觉评审后归位（REQ-039 D4）。 */
  animation: z-timeline-pulse 1.6s ease-in-out infinite;
}

@keyframes z-timeline-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 自定义 color 覆盖 status 色 */
/* [WHY] audit 2026-10-25: 改为只设 color，background 与装饰环都由 currentColor 派生，
   避免自定义色时环色与点色不同步（原实现重复写了两处 var(--z-timeline-dot-color)） */
.z-timeline__item[style*="--z-timeline-dot-color"] .z-timeline__dot {
  color: var(--z-timeline-dot-color);
}

/* ── Body ── */

.z-timeline__title {
  font-size: var(--z-font-size-base);
  font-weight: 500;
  color: var(--z-color-text);
  display: flex;
  align-items: baseline;
  gap: var(--z-space-3);
}

.z-timeline__time {
  font-size: var(--z-font-size-xs);
  font-weight: 400;
  color: var(--z-color-text-secondary);
}

.z-timeline__content {
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  margin-top: 4px;
  line-height: 1.6;
}
`;var $r=Object.defineProperty,it=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&$r(e,t,n),n};const Lt=class Lt extends z{constructor(){super(...arguments),this.items=[],this.reverse=!1,this.pending=""}render(){let e=this.items.slice();this.reverse&&(e=e.reverse());const t=e.map(r=>{const n=r.status?` z-timeline__item--${r.status}`:"",i=r.color?` style="--z-timeline-dot-color:${r.color}"`:"",o=r.dot?`<span class="z-timeline__dot-custom" part="dot">${c(r.dot)}</span>`:'<span class="z-timeline__dot" part="dot"></span>',l=r.time?`<div class="z-timeline__time" part="time">${c(r.time)}</div>`:"",h=r.content?`<div class="z-timeline__content" part="content">${c(r.content)}</div>`:"";return`
        <li class="z-timeline__item${n}" part="item"${i}>
          ${o}
          <div class="z-timeline__body" part="body">
            <div class="z-timeline__title" part="title">${c(r.title)}${l}</div>
            ${h}
          </div>
        </li>`});return this.pending&&t.push(`
        <li class="z-timeline__item z-timeline__item--pending" part="item">
          <span class="z-timeline__dot z-timeline__dot--pending" part="dot"></span>
          <div class="z-timeline__body" part="body">
            <div class="z-timeline__title" part="title">${c(this.pending)}</div>
          </div>
        </li>`),m`<ul class="z-timeline" part="root">${t.join("")}</ul>`}};Lt.styles=Lr;let ze=Lt;it([a({type:Array,attribute:!1})],ze.prototype,"items");it([a({type:Boolean})],ze.prototype,"reverse");it([a({type:String})],ze.prototype,"pending");customElements.define("z-timeline",ze);const Cr=`/* ===== z-statistic ===== */

:host {
  display: inline-block;
}

.z-statistic {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.z-statistic__prefix,
.z-statistic__suffix {
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
}

.z-statistic__value {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--z-color-text);
}
`;var Er=Object.defineProperty,he=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Er(e,t,n),n};const $t=class $t extends z{constructor(){super(...arguments),this.value=0,this.precision=0,this.prefix="",this.suffix="",this.separator=!1,this.countUp=!1,this.duration=2e3,this._display=0,this._raf=0,this._lastTarget=0}_format(e){const t={minimumFractionDigits:this.precision,maximumFractionDigits:this.precision};return this.separator?t.useGrouping=!0:t.useGrouping=!1,new Intl.NumberFormat(void 0,t).format(e)}render(){const e=this._format(this.countUp?this._display:this.value);return m`
      <div class="z-statistic" part="root">
        ${this.prefix?`<span class="z-statistic__prefix" part="prefix">${c(this.prefix)}</span>`:""}
        <span class="z-statistic__value" part="value">${e}</span>
        ${this.suffix?`<span class="z-statistic__suffix" part="suffix">${c(this.suffix)}</span>`:""}
      </div>
    `}updated(){!this.countUp||this.value===this._lastTarget||this._startCountUp()}_startCountUp(){cancelAnimationFrame(this._raf);const e=this._display,t=this.value;this._lastTarget=t;const r=performance.now(),n=o=>1-Math.pow(1-o,3),i=o=>{const l=Math.min(1,(o-r)/this.duration);this._display=e+(t-e)*n(l),this.requestUpdate(),l<1?this._raf=requestAnimationFrame(i):(this._display=t,this._lastTarget=t,this.emit("z-change",{value:t}),this.requestUpdate())};this._raf=requestAnimationFrame(i)}disconnectedCallback(){cancelAnimationFrame(this._raf),super.disconnectedCallback()}};$t.styles=Cr;let W=$t;he([a({type:Number})],W.prototype,"value");he([a({type:Number})],W.prototype,"precision");he([a({type:String})],W.prototype,"prefix");he([a({type:String})],W.prototype,"suffix");he([a({type:Boolean})],W.prototype,"separator");he([a({type:Boolean,attribute:"count-up"})],W.prototype,"countUp");he([a({type:Number})],W.prototype,"duration");customElements.define("z-statistic",W);const Pr=`/* ===== z-empty ===== */

:host {
  display: block;
}

.z-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-3);
  padding: var(--z-space-8) var(--z-space-5);
  color: var(--z-color-text-secondary);
}

.z-empty__image {
  color: var(--z-color-gray-300);
  display: flex;
}

.z-empty__image ::slotted(*) {
  /* [WHY] 槽位图片优先: 用户自定义图覆盖内置插图 */
  max-width: 120px;
  max-height: 120px;
}

/* [WHY 2026-11-23] 与 z-m-empty 对齐：标题 + 语义态配色。
   错误态只染插图，不染标题与描述 —— 整块变红等于把空态做成告警条，
   而它的主任务仍是「告诉用户这里为什么没内容、下一步做什么」。 */
.z-empty__title {
  font-size: var(--z-font-size-lg);
  font-weight: var(--z-font-weight-semibold);
  color: var(--z-color-text);
  line-height: 1.5;
}

.z-empty--error .z-empty__image {
  color: var(--z-color-danger);
}

.z-empty__description {
  font-size: var(--z-font-size-base);
  line-height: 1.6;
}

.z-empty__actions {
  margin-top: var(--z-space-2);
}
`;var Mr=Object.defineProperty,Ne=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Mr(e,t,n),n};const Ut={default:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 8h40v29H4z"/><path d="M4 16h40" opacity=".4"/><path d="M12 30h12" opacity=".4"/><circle cx="52" cy="10" r="6" opacity=".5"/></svg>',search:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="26" cy="18" r="10"/><path d="M34 26l10 10"/><path d="M44 8h16v29H44" opacity=".4"/></svg>',data:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 12h48M8 20h32M8 28h20M8 36h12" opacity=".4"/><circle cx="48" cy="30" r="7"/></svg>',network:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="14" r="6"/><path d="M26 26l-6 9M38 26l6 9" opacity=".5"/><path d="M12 34h40" opacity=".4"/></svg>',error:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="32" cy="20" r="12"/><path d="M32 13v9"/><circle cx="32" cy="27" r="1.4" fill="currentColor" stroke="none"/></svg>',forbidden:'<svg viewBox="0 0 64 41" width="64" height="41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="20" y="19" width="24" height="16" rx="2"/><path d="M25 19v-4a7 7 0 0 1 14 0v4"/><circle cx="32" cy="27" r="1.6" fill="currentColor" stroke="none"/></svg>'},Or={empty:"default",error:"error",forbidden:"forbidden"},Ct=class Ct extends z{constructor(){super(...arguments),this.type="empty",this.title="",this.description="",this.image=""}render(){const e=this.image||Or[this.type]||"default",t=Ut[e]??Ut.default,r=this.title?`<div class="z-empty__title" part="title">${c(this.title)}</div>`:"",n=this.description?`<div class="z-empty__description" part="description">${c(this.description)}</div>`:"";return m`
      <div class="z-empty z-empty--${c(this.type)}" part="root">
        <div class="z-empty__image" part="image" data-preset="${c(e)}">
          ${t}
          <slot name="image"></slot>
        </div>
        ${r}
        ${n}
        <div class="z-empty__actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `}};Ct.styles=Pr;let ce=Ct;Ne([a({type:String})],ce.prototype,"type");Ne([a({type:String})],ce.prototype,"title");Ne([a({type:String})],ce.prototype,"description");Ne([a({type:String})],ce.prototype,"image");customElements.define("z-empty",ce);const Ar=`/* ===== z-result ===== */

:host {
  display: block;
}

.z-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--z-space-2);
  padding: var(--z-space-10) var(--z-space-5);
  text-align: center;
}

.z-result__icon {
  width: 72px;
  height: 72px;
  color: var(--z-color-info);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--z-space-2);
}

.z-result--success .z-result__icon {
  color: var(--z-color-success);
}

.z-result--error .z-result__icon {
  color: var(--z-color-danger);
}

.z-result--warning .z-result__icon {
  color: var(--z-color-warning);
}

.z-result__title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--z-color-text);
}

.z-result__subtitle {
  font-size: var(--z-font-size-base);
  color: var(--z-color-text-secondary);
  line-height: 1.6;
  max-width: 420px;
}

.z-result__actions {
  margin-top: var(--z-space-4);
  display: flex;
  gap: var(--z-space-3);
}
`;var Tr=Object.defineProperty,st=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Tr(e,t,n),n};const Ir={success:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M14 25l7 7 13-14"/></svg>',error:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M17 17l14 14M31 17L17 31"/></svg>',info:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="20" opacity=".2"/><path d="M24 22v10M24 16v.5"/></svg>',warning:'<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l20 36H4z" opacity=".2"/><path d="M24 20v10M24 34v.5"/></svg>'},Et=class Et extends z{constructor(){super(...arguments),this.status="info",this.title="",this.subtitle=""}render(){const e=this.title?`<div class="z-result__title" part="title">${c(this.title)}</div>`:"",t=this.subtitle?`<div class="z-result__subtitle" part="subtitle">${c(this.subtitle)}</div>`:"";return m`
      <div class="z-result z-result--${this.status}" part="root">
        <div class="z-result__icon" part="icon">
          ${Ir[this.status]}
          <slot name="icon"></slot>
        </div>
        ${e}
        ${t}
        <div class="z-result__actions" part="actions">
          <slot name="actions"></slot>
        </div>
      </div>
    `}};Et.styles=Ar;let be=Et;st([a({type:String})],be.prototype,"status");st([a({type:String})],be.prototype,"title");st([a({type:String})],be.prototype,"subtitle");customElements.define("z-result",be);const Dr=`/* ===== z-image ===== */

:host {
  display: inline-block;
  position: relative;
  overflow: hidden;
}

.z-image {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.z-image__img {
  width: 100%;
  height: 100%;
  display: block;
}

.z-image__placeholder,
.z-image__fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 60px;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text-secondary);
  background: var(--z-color-bg-secondary);
}

/* [WHY] img 渲染期间的占位遮罩: 与 img 同层叠加而非并列（flex 容器内会被挤开） */
.z-image__placeholder--overlay {
  position: absolute;
  inset: 0;
}

.z-image__preview-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--z-radius-sm);
  background: rgba(15, 23, 42, 0.55);
  color: var(--z-color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--z-transition-fast);
}

.z-image:hover .z-image__preview-btn {
  opacity: 1;
}

/* ── 灯箱 ── */

.z-image__box {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-z-modal) + 100);
  background: rgba(2, 6, 23, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.z-image__box-imgwrap {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 90vw;
  max-height: 85vh;
  overflow: auto;
}

.z-image__box-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  transition: transform var(--z-transition-normal) ease;
  transform-origin: center;
  cursor: zoom-in;
}

.z-image__box-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--z-radius-sm);
  background: rgba(255, 255, 255, 0.12);
  color: var(--z-color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.z-image__box-close:hover {
  background: rgba(255, 255, 255, 0.22);
}
`;var jr=Object.defineProperty,G=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&jr(e,t,n),n};const Pt=class Pt extends z{constructor(){super(...arguments),this.src="",this.alt="",this.fit="cover",this.lazy=!1,this.preview=!1,this.zoom=!1,this.fallback="",this.placeholder="",this.lightboxWidth="",this._loaded=!1,this._failed=!1,this._shouldLoad=!1,this._io=null,this._boxOpen=!1,this._zoomLevel=1,this._onLoad=()=>{this._loaded||(this._loaded=!0,this._failed=!1,this.emit("z-load",{src:this.src}),this.requestUpdate())},this._onError=()=>{this._failed||(this._failed=!0,this.emit("z-error",{src:this.src}),this.requestUpdate())},this._onPreviewClick=e=>{e.stopPropagation(),this._openBox()},this._onBoxClick=()=>{if(this._zoomLevel>1){this._zoomLevel=1,this.requestUpdate();return}this._closeBox()},this._onKeydown=e=>{this._boxOpen&&(e.key==="+"||e.key==="="?(this._zoomLevel=Math.min(4,this._zoomLevel+.5),this.requestUpdate()):e.key==="-"?(this._zoomLevel=Math.max(.5,this._zoomLevel-.5),this.requestUpdate()):e.key==="0"&&(this._zoomLevel=1,this.requestUpdate()))}}render(){const e=this.lazy&&!this._shouldLoad;let t;if(e)t=`<div class="z-image__placeholder" part="placeholder">${this.placeholder?c(this.placeholder):""}</div>`;else if(this._failed&&this.fallback)t=`<div class="z-image__fallback" part="fallback">${c(this.fallback)}</div>`;else{const i=!this._loaded&&this.placeholder?`<div class="z-image__placeholder z-image__placeholder--overlay" part="placeholder">${c(this.placeholder)}</div>`:"";t=`<img class="z-image__img" part="img" src="${c(this.src)}" alt="${c(this.alt)}" style="object-fit:${this.fit}" ${this.preview?"data-preview":""} />${i}`}const r=this.preview&&this._loaded?`<button type="button" class="z-image__preview-btn" part="preview-btn" aria-label="Preview">${Rr}</button>`:"",n=this._boxOpen?`<div class="z-image__box" part="lightbox" role="dialog" aria-modal="true">
          <div class="z-image__box-imgwrap" part="lightbox-imgwrap">
            <img class="z-image__box-img" part="lightbox-img" src="${c(this.src)}" alt="${c(this.alt)}" style="transform:scale(${this._zoomLevel})" />
          </div>
          <button type="button" class="z-image__box-close" part="lightbox-close" aria-label="Close"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        </div>`:"";return m`<div class="z-image" part="root">${t}${r}${n}</div>`}updated(){var n;const e=this.shadowRoot.querySelector(".z-image__img");e&&(e.addEventListener("load",this._onLoad),e.addEventListener("error",this._onError));const t=this.shadowRoot.querySelector(".z-image__box");if(t&&!t.dataset.bound){t.dataset.bound="",t.addEventListener("click",this._onBoxClick);const i=t.querySelector(".z-image__box-close");i==null||i.addEventListener("click",o=>{o.stopPropagation(),this._closeBox()})}const r=this.shadowRoot.querySelector(".z-image__preview-btn");if(r&&!r.dataset.bound&&(r.dataset.bound="",r.addEventListener("click",this._onPreviewClick)),!(!this.lazy||this._shouldLoad)){if(typeof IntersectionObserver>"u"){this._shouldLoad=!0,this.requestUpdate();return}(n=this._io)==null||n.disconnect(),this._io=new IntersectionObserver(i=>{var o;i.some(l=>l.isIntersecting)&&((o=this._io)==null||o.disconnect(),this._io=null,this._shouldLoad=!0,this.requestUpdate())},{rootMargin:"200px"}),this._io.observe(this)}}_openBox(){this._boxOpen||(this._boxOpen=!0,this._zoomLevel=1,Qe(this),Ze(),document.addEventListener("keydown",this._onKeydown),this.requestUpdate(),this.emit("z-click",{src:this.src}))}_closeBox(){this._boxOpen&&(this._boxOpen=!1,me(this),fe(),document.removeEventListener("keydown",this._onKeydown),this.requestUpdate())}close(){this._closeBox()}get closeOnEscape(){return this._boxOpen}disconnectedCallback(){var e;(e=this._io)==null||e.disconnect(),this._io=null,this._boxOpen&&(me(this),fe(),this._boxOpen=!1),super.disconnectedCallback()}};Pt.styles=Dr;let A=Pt;G([a({type:String})],A.prototype,"src");G([a({type:String})],A.prototype,"alt");G([a({type:String})],A.prototype,"fit");G([a({type:Boolean})],A.prototype,"lazy");G([a({type:Boolean})],A.prototype,"preview");G([a({type:Boolean})],A.prototype,"zoom");G([a({type:String})],A.prototype,"fallback");G([a({type:String})],A.prototype,"placeholder");G([a({type:String})],A.prototype,"lightboxWidth");const Rr='<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="3"/><path d="M13.5 13.5L10 10"/></svg>';customElements.define("z-image",A);const qr=`/* ===== z-watermark ===== */

:host {
  display: block;
  position: relative;
}

.z-watermark {
  position: absolute;
  inset: 0;
  background-repeat: repeat;
  pointer-events: none; /* [WHY] 水印永不拦截点击 */
}
`;var Br=Object.defineProperty,we=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Br(e,t,n),n};const Mt=class Mt extends z{constructor(){super(...arguments),this.content="",this.color="rgba(0, 0, 0, 0.08)",this.fontSize=16,this.rotate=-22,this.gap=100,this.zIndex=0,this._dataUrl="",this._tileW=0,this._tileH=0,this._lastKey="",this._mo=null}_keyOf(){return`${this.content}|${this.color}|${this.fontSize}|${this.rotate}|${this.gap}`}render(){const e=this._dataUrl?`background-image:url('${this._dataUrl}');background-size:${this._tileW}px ${this._tileH}px;`:"";return m`<div class="z-watermark" part="root" style="${e}z-index:${this.zIndex}"></div>`}updated(){const e=this._keyOf();this._dataUrl&&e===this._lastKey||(this._lastKey=e,this._draw()&&this.requestUpdate(),!this._mo&&typeof MutationObserver<"u"&&(this._mo=new MutationObserver(()=>{this.shadowRoot&&!this.shadowRoot.querySelector(".z-watermark")&&this.requestUpdate()}),this._mo.observe(this.shadowRoot,{childList:!0})))}_draw(){if(typeof document>"u")return!1;try{const e=document.createElement("canvas"),t=e.getContext("2d");if(!t)return!1;t.font=`${this.fontSize}px sans-serif`;const r=t.measureText(this.content||" ").width;return this._tileW=Math.ceil(r+this.gap),this._tileH=Math.ceil(this.fontSize+this.gap),e.width=this._tileW,e.height=this._tileH,t.translate(this._tileW/2,this._tileH/2),t.rotate(this.rotate*Math.PI/180),t.fillStyle=this.color,t.font=`${this.fontSize}px sans-serif`,t.textAlign="center",t.textBaseline="middle",t.fillText(this.content,0,0),this._dataUrl=e.toDataURL(),!0}catch{return!1}}disconnectedCallback(){var e;(e=this._mo)==null||e.disconnect(),this._mo=null,super.disconnectedCallback()}};Mt.styles=qr;let X=Mt;we([a({type:String})],X.prototype,"content");we([a({type:String})],X.prototype,"color");we([a({type:Number})],X.prototype,"fontSize");we([a({type:Number})],X.prototype,"rotate");we([a({type:Number})],X.prototype,"gap");we([a({type:Number})],X.prototype,"zIndex");customElements.define("z-watermark",X);const Fr=`/* ===== z-command ===== */

:host {
  display: contents;
}

.z-command__overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--z-z-modal) + 200);
  background: rgba(2, 6, 23, 0.45);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 18vh;
}

.z-command__panel {
  width: min(560px, 90vw);
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  background: var(--z-color-bg);
  border-radius: var(--z-radius-lg);
  box-shadow: 0 20px 60px rgba(2, 6, 23, 0.25);
  overflow: hidden;
}

.z-command__input {
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  border: none;
  border-bottom: 1px solid var(--z-color-border-control);
  background: transparent;
  color: var(--z-color-text);
  font-size: var(--z-font-size-sm);
  outline: none;
}

.z-command__input::placeholder {
  color: var(--z-color-text-secondary);
}

.z-command__input:focus {
  border-bottom-color: var(--z-color-primary);
}

.z-command__list {
  overflow-y: auto;
  padding: 6px;
}

.z-command__group {
  padding: 8px 12px 4px;
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  user-select: none;
}

.z-command__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--z-radius-sm);
  cursor: pointer;
  color: var(--z-color-text);
  font-size: var(--z-font-size-sm);
}

.z-command__item[data-disabled="1"] {
  cursor: not-allowed;
  opacity: 0.45;
}

.z-command__item--active {
  background: var(--z-color-primary-soft);
}

.z-command__icon {
  display: inline-flex;
  width: 18px;
  justify-content: center;
  color: var(--z-color-text-secondary);
}

.z-command__label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-command__shortcut {
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-xs);
  color: var(--z-color-text-secondary);
  border: 1px solid var(--z-color-border);
  border-radius: 4px;
  padding: 1px 6px;
}

.z-command__empty {
  padding: 24px;
  text-align: center;
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
}
`;var Hr=Object.defineProperty,ot=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Hr(e,t,n),n};let Nr=0;const Ot=class Ot extends z{constructor(){super(...arguments),this.items=[],this.placeholder="输入命令…",this.open=!1,this._query="",this._activeId=null,this._trap=null,this._input=null,this._uid="",this._onInput=e=>{this._query=e.target.value,this._activeId=null,this._syncList()},this._onInputKeydown=e=>{const t=e.key,r=Sn(t);if(r){e.preventDefault();const n=this._filtered().filter(l=>!l.disabled);if(n.length===0)return;const i=n.findIndex(l=>l.id===this._activeId),o=Ln(n.length,i,r);if(o<0)return;this._activeId=n[o].id,this._syncList();return}if(t==="Enter"){e.preventDefault();const n=this._filtered().find(i=>i.id===this._activeId&&!i.disabled);n&&this._select(n)}else t==="Escape"&&e.preventDefault()},this._onOverlayClick=e=>{if(e.target===e.currentTarget){this.close();return}const t=e.target.closest(".z-command__item");if(t&&t.dataset.disabled!=="1"){const r=this.items.find(n=>n.id===t.dataset.id);r&&this._select(r)}}}render(){return this.open?(this._uid||(this._uid=`z-command-${++Nr}`),m`<div class="z-command__overlay" part="overlay">
      <div class="z-command__panel" part="panel" role="dialog" aria-label="命令面板">
        <input class="z-command__input" part="input" placeholder="${c(this.placeholder)}" value="${c(this._query)}"
          aria-label="搜索命令" role="combobox" aria-expanded="true" aria-autocomplete="list"
          aria-controls="${this._uid}-list" />
        <div class="z-command__list" part="list" id="${this._uid}-list" role="listbox" aria-label="命令结果"></div>
      </div>
    </div>`):""}updated(){if(!this.open)return;const e=this.shadowRoot.querySelector(".z-command__overlay"),t=this.shadowRoot.querySelector(".z-command__input");if(e&&!e.dataset.bound&&(e.dataset.bound="",e.addEventListener("click",this._onOverlayClick)),t&&t!==this._input&&(this._input=t,t.addEventListener("input",this._onInput),t.addEventListener("keydown",this._onInputKeydown)),!this._trap){const r=this.shadowRoot.querySelector(".z-command__panel");r&&(this._trap=new tn({container:r}))}this._syncList()}_filtered(){const e=this._query.trim().toLowerCase();return e?this.items.filter(t=>t.label.toLowerCase().includes(e)||(t.keywords??[]).some(r=>r.toLowerCase().includes(e))):this.items}_syncList(){var h,p;const e=this.shadowRoot.querySelector(".z-command__list");if(!e)return;const t=this._filtered();t.length>0&&!t.some(_=>_.id===this._activeId)&&(this._activeId=((h=t.find(_=>!_.disabled))==null?void 0:h.id)??null);const r=[];for(const _ of t){const f=_.group??"",v=r[r.length-1];!v||v.name!==f?r.push({name:f,items:[_]}):v.items.push(_)}const n=[];let i=0,o=null;for(const _ of r){_.name&&n.push(`<div class="z-command__group" role="presentation">${c(_.name)}</div>`);for(const f of _.items){const v=`${this._uid}-opt-${i++}`,b=f.id===this._activeId;b&&(o=v),n.push(`<div class="z-command__item${b?" z-command__item--active":""}" id="${v}" role="option" aria-selected="${b?"true":"false"}" data-id="${c(f.id)}" data-disabled="${f.disabled?"1":""}"${f.disabled?' aria-disabled="true"':""}>`+(f.icon?`<span class="z-command__icon">${f.icon}</span>`:"")+`<span class="z-command__label">${c(f.label)}</span>`+(f.shortcut?`<span class="z-command__shortcut">${c(f.shortcut)}</span>`:"")+"</div>")}}e.innerHTML=n.join("")||'<div class="z-command__empty" role="presentation">无匹配结果</div>',(p=e.querySelector(".z-command__item--active"))==null||p.scrollIntoView({block:"nearest"});const l=this.shadowRoot.querySelector(".z-command__input");l&&(o?l.setAttribute("aria-activedescendant",o):l.removeAttribute("aria-activedescendant"))}_select(e){this.emit("z-select",{item:e}),this.close()}show(){this.open||(this.open=!0,this._query="",this._activeId=null,Qe(this),Ze(),this.requestUpdate())}close(){var e;this.open&&(this.open=!1,this._activeId=null,(e=this._trap)==null||e.destroy(),this._trap=null,this._input=null,me(this),fe(),this.requestUpdate())}toggle(){this.open?this.close():this.show()}get closeOnEscape(){return this.open}disconnectedCallback(){var e;this.open&&(this.open=!1,(e=this._trap)==null||e.destroy(),this._trap=null,me(this),fe()),super.disconnectedCallback()}};Ot.styles=Fr;let ye=Ot;ot([a({attribute:!1})],ye.prototype,"items");ot([a({type:String})],ye.prototype,"placeholder");ot([a({type:Boolean})],ye.prototype,"open");customElements.define("z-command",ye);const Ur=`/* ===== z-json-viewer ===== */

:host {
  display: block;
}

.z-jv {
  font-family: var(--z-font-mono);
  font-size: var(--z-font-size-sm);
  line-height: 1.7;
  background: var(--z-color-bg-secondary);
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  padding: 8px 12px;
  overflow: auto;
  max-height: 480px;
}

.z-jv__row {
  white-space: pre;
  position: relative;
}

.z-jv__row:hover {
  background: var(--z-color-hover);
}

/* [WHY] 行号列与内容等宽截断区分离: 行号固定左对齐,内容不缩进 */
.z-jv__line-no {
  display: inline-block;
  width: 2.2em;
  margin-right: 0.8em;
  color: var(--z-color-gray-400);
  text-align: right;
  user-select: none;
}

.z-jv__toggle {
  display: inline-block;
  width: 1em;
  /* [WHY 要重置原生 button 外观] 它原来是个 <span role="button">，换成原生 <button>
     之后默认会带来 border / background / padding / 字体与行高，把这行的行高撑高、
     把括号挤开 —— 视觉上像是"折叠按钮变大了"。这四条是让 button 看起来还是原来那个符号。 */
  border: 0;
  padding: 0;
  background: transparent;
  font: inherit;
  line-height: inherit;
  color: var(--z-color-gray-500);
  cursor: pointer;
  user-select: none;
}

.z-jv__toggle:hover {
  color: var(--z-color-primary);
}

/* 键盘焦点必须看得见 —— 这个开关现在唯一的键盘入口就是 Tab + Enter */
.z-jv__toggle:focus-visible {
  outline: 2px solid var(--z-color-primary);
  outline-offset: 1px;
  border-radius: 2px;
}

.z-jv__brace {
  color: var(--z-color-gray-600);
}

.z-jv__count {
  color: var(--z-color-gray-400);
  font-style: italic;
}

.z-jv__key {
  color: var(--z-color-blue-600);
}

.z-jv__index {
  color: var(--z-color-blue-600);
}

.z-jv__colon {
  color: var(--z-color-gray-500);
}

.z-jv__string {
  color: var(--z-color-success);
}

.z-jv__number {
  color: var(--z-color-warning);
}

.z-jv__boolean {
  color: var(--z-color-purple-500);
}

.z-jv__null {
  color: var(--z-color-gray-400);
  font-style: italic;
}

.z-jv__copy {
  visibility: hidden;
  margin-left: 6px;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--z-color-gray-400);
  cursor: pointer;
  vertical-align: middle;
}

.z-jv__row:hover .z-jv__copy {
  visibility: visible;
}

.z-jv__copy:hover {
  color: var(--z-color-primary);
}

/* [WHY] 缩进由每行行首 pad span 提供（--pad: 深度）,行号宽度不受缩进影响 */
.z-jv__pad {
  display: inline-block;
  width: calc(var(--pad, 0) * 16px);
}

.z-jv__empty {
  color: var(--z-color-gray-400);
}
`;var Yr=Object.defineProperty,Ee=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Yr(e,t,n),n};const At=class At extends z{constructor(){super(...arguments),this.data=null,this.collapsed=0,this.maxDepth=10,this.copyable=!1,this.showLineNumbers=!1,this._collapsedSet=new Set,this._values=new Map,this._row=0,this._lines=[],this._onClick=e=>{const t=e.target,r=t.closest(".z-jv__toggle");if(r){const n=r.dataset.path??"";this._collapsedSet.has(n)?this._collapsedSet.delete(n):this._collapsedSet.add(n),this.requestUpdate();return}if(this.copyable){const n=t.closest(".z-jv__copy");if(n){const i=n.dataset.copy??"";this.emit("z-copy",{path:i,value:this._values.get(i)})}}}}render(){this._row=0,this._lines=[],this._renderValue(this.data,"",0);const e=this._lines.map(t=>`<div class="z-jv__row">${this.showLineNumbers?`<span class="z-jv__line-no" aria-hidden="true">${this._lineNo()}</span>`:""}${t}</div>`).join("");return m`<div class="z-jv" part="root">${e||'<div class="z-jv__empty">null</div>'}</div>`}_toggleHtml(e,t){const n=`${t?"折叠":"展开"} ${e||"根"}`;return`<button type="button" class="z-jv__toggle" data-path="${c(e)}" data-focus-key="jv-toggle:${c(e)}" aria-expanded="${t?"true":"false"}" aria-label="${c(n)}">${t?"▾":"▸"}</button>`}_lineNo(){return this._row++,String(this._row)}_rowLine(e){this._lines.push(e)}_renderValue(e,t,r){if(e===null){this._rowLine(this._leaf('<span class="z-jv__null">null</span>',t,"null"));return}if(typeof e=="string"){this._rowLine(this._leaf(`<span class="z-jv__string">"${c(e)}"</span>`,t,e));return}if(typeof e=="number"){this._rowLine(this._leaf(`<span class="z-jv__number">${String(e)}</span>`,t,e));return}if(typeof e=="boolean"){this._rowLine(this._leaf(`<span class="z-jv__boolean">${String(e)}</span>`,t,e));return}if(Array.isArray(e)){this._renderContainer(e,t,r,"[","]");return}if(typeof e=="object"){this._renderContainer(Object.keys(e),t,r,"{","}",e);return}this._rowLine(this._leaf(`<span class="z-jv__null">${c(String(e))}</span>`,t,e))}_renderContainer(e,t,r,n,i,o){const l=n==="[",h=e.length,p=this._collapsedSet.has(t)||r>=this.maxDepth||this.collapsed>0&&r>=this.collapsed,_=r+1;if(h===0){this._rowLine(`<span class="z-jv__brace">${n}${i}</span>`);return}if(p){this._rowLine(this._toggleHtml(t,!1)+`<span class="z-jv__brace">${n}</span><span class="z-jv__count">${h} 项</span><span class="z-jv__brace">${i}</span>`);return}this._rowLine(this._toggleHtml(t,!0)+`<span class="z-jv__brace">${n}</span>`);for(let f=0;f<h;f++){const v=l?String(f):e[f],b=t?`${t}.${v}`:v,P=l?`<span class="z-jv__index">${v}</span><span class="z-jv__colon">: </span>`:`<span class="z-jv__key">"${c(v)}"</span><span class="z-jv__colon">: </span>`,_e=o?o[v]:e[f],se=this._collect(_e,b,_);se[0]=P+se[0];for(const vn of se)this._rowLine(vn)}this._rowLine(`<span class="z-jv__brace">${i}</span>`)}_collect(e,t,r){const n=this._lines;this._lines=[],this._renderValue(e,t,r);const i=this._lines;return this._lines=n,i.map(o=>`<span class="z-jv__pad" style="--pad:${r}"></span>${o}`)}_leaf(e,t,r){this.copyable&&this._values.set(t,r);const n=this.copyable?`<button type="button" class="z-jv__copy" data-copy="${t}" aria-label="复制 ${t}"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="5" width="8" height="8" rx="1"/><path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"/></svg></button>`:"";return e+n}updated(){const e=this.shadowRoot.querySelector(".z-jv");e&&e.addEventListener("click",this._onClick)}_collectPaths(e,t,r){if(!(e===null||typeof e!="object"))if(r.push(t),Array.isArray(e))e.forEach((n,i)=>this._collectPaths(n,t?`${t}[${i}]`:`[${i}]`,r));else for(const n of Object.keys(e))this._collectPaths(e[n],t?`${t}.${n}`:n,r)}expandAll(){this._collapsedSet.clear(),this.requestUpdate()}collapseAll(){const e=[];this._collectPaths(this.data,"",e),this._collapsedSet=new Set(e),this.requestUpdate()}};At.styles=Ur;let Z=At;Ee([a({attribute:!1})],Z.prototype,"data");Ee([a({type:Number})],Z.prototype,"collapsed");Ee([a({type:Number})],Z.prototype,"maxDepth");Ee([a({type:Boolean})],Z.prototype,"copyable");Ee([a({type:Boolean,attribute:"show-line-numbers"})],Z.prototype,"showLineNumbers");customElements.define("z-json-viewer",Z);const Vr=`/* ===== z-rich-text ===== */

:host {
  display: block;
}

.z-rt {
  border: 1px solid var(--z-color-border);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg);
  overflow: hidden;
}

.z-rt:focus-within {
  border-color: var(--z-color-primary);
  box-shadow: var(--z-focus-ring);
}

.z-rt__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  padding: 6px 8px;
  border-bottom: 1px solid var(--z-color-border);
  background: var(--z-color-bg-secondary);
}

.z-rt__btn {
  min-width: 28px;
  padding: 3px 8px;
  border: 1px solid transparent;
  border-radius: var(--z-radius-sm);
  background: transparent;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
  cursor: pointer;
}

.z-rt__btn:hover:not(:disabled) {
  background: var(--z-color-hover);
  border-color: var(--z-color-border);
}

.z-rt__btn:active:not(:disabled) {
  background: var(--z-color-hover-strong);
}

.z-rt__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/*
 * [WHY 用 [aria-pressed] 做视觉态，而不是再加一个 class] 加粗/斜体有没有生效原本
 * **完全没有**视觉反馈 —— 用户只能盯着字形粗细猜。把样式挂在语义属性上，读屏听到的
 * 「已按下」和眼睛看到的浅蓝底就是同一份状态，不会出现「看起来是按下的、读屏说没按」
 * 这种两套真相。
 */
.z-rt__btn[aria-pressed="true"] {
  background: var(--z-color-primary-soft);
  border-color: var(--z-color-primary);
  color: var(--z-color-primary-strong);
}

.z-rt__btn[aria-pressed="true"]:hover:not(:disabled) {
  background: var(--z-color-primary-tint-hover);
}

.z-rt__content {
  padding: 10px 12px;
}

.z-rt__editor {
  min-height: 140px;
  outline: none;
  font-size: var(--z-font-size-md);
  line-height: 1.7;
  color: var(--z-color-text);
}

.z-rt__editor blockquote {
  margin: 6px 0;
  padding-left: 12px;
  border-left: 3px solid var(--z-color-gray-300);
  color: var(--z-color-text-secondary);
}

.z-rt__editor a {
  color: var(--z-color-primary);
}

/* [WHY] 占位符: :empty 才生效,清空归一在 input 处理器（浏览器会留 <br>） */
.z-rt__editor:empty::before {
  content: attr(data-placeholder);
  color: var(--z-color-gray-400);
  pointer-events: none;
}

.z-rt--disabled {
  opacity: 0.6;
}
`;var Wr=Object.defineProperty,pe=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Wr(e,t,n),n};const Yt=new Set(["bold","italic","underline","insertUnorderedList","insertOrderedList"]),Kr=[{id:"bold",label:"B",command:"bold",title:"粗体"},{id:"italic",label:"I",command:"italic",title:"斜体"},{id:"underline",label:"U",command:"underline",title:"下划线"},{id:"ul",label:"• 列表",command:"insertUnorderedList",title:"无序列表"},{id:"ol",label:"1. 列表",command:"insertOrderedList",title:"有序列表"},{id:"quote",label:"❝ 引用",command:"formatBlock",value:"blockquote",title:"引用块"},{id:"clear",label:"清除格式",command:"removeFormat",title:"清除格式"}],Tt=class Tt extends z{constructor(){super(...arguments),this.value="",this.placeholder="输入内容...",this.readonly=!1,this.disabled=!1,this.toolbar=null,this.toolbarLabel=O.formatToolbar,this.sanitize=rn,this._editor=null,this._lastRange=null,this._debounce=null,this._rovingIndex=0,this._onToolbarKeydown=e=>{const t=e.currentTarget,r=Array.from(t.querySelectorAll(".z-rt__btn")).filter(l=>!l.disabled);if(r.length===0)return;const n=yn(),i=n?r.indexOf(n):-1,o=$n(r,i>=0?r[i]:null,e.key,{axis:"horizontal"});o&&(e.preventDefault(),this._rovingIndex=r.indexOf(o))},this._onInput=()=>{const e=this._editor;e&&((e.textContent??"").trim()===""&&(e.innerHTML=""),this._syncValue())},this._onSelectionChange=()=>{const e=this._editor;if(!e)return;const t=document.getSelection();!t||t.rangeCount===0||e.contains(t.anchorNode)&&(this._lastRange=t.getRangeAt(0).cloneRange(),this._syncPressed())},this._onToolbarClick=e=>{const t=e.target.closest(".z-rt__btn");if(!t||t.hasAttribute("disabled"))return;const r=t.dataset.command;r?this.exec(r,t.dataset.value||void 0):this.emit("z-command",{id:t.dataset.id})}}_toolbarItems(){return this.toolbar??Kr}render(){const e=this._toolbarItems(),t=e.length?`<div class="z-rt__toolbar" part="toolbar" role="toolbar" aria-label="${c(this.toolbarLabel)}">${e.map((r,n)=>{const i=r.title??r.label,o=n===Math.min(this._rovingIndex,e.length-1)?"0":"-1",l=r.command&&Yt.has(r.command)?' aria-pressed="false"':"";return`<button type="button" class="z-rt__btn" data-id="${c(r.id)}" data-command="${c(r.command??"")}" data-value="${c(r.value??"")}" title="${c(i)}" aria-label="${c(i)}" tabindex="${o}"${l}${this.disabled?" disabled":""}>${c(r.label)}</button>`}).join("")}</div>`:"";return m`<div class="z-rt${this.disabled?" z-rt--disabled":""}" part="root">${t}<div class="z-rt__content" part="content"></div></div>`}firstUpdated(){const e=this.shadowRoot.querySelector(".z-rt__content");if(!e)return;const t=document.createElement("div");t.className="z-rt__editor",t.setAttribute("part","editor field"),t.setAttribute("contenteditable","true"),t.setAttribute("role","textbox"),t.setAttribute("aria-multiline","true"),t.dataset.placeholder=this.placeholder,this._syncPlaceholderAttr(t),t.contentEditable=this.readonly||this.disabled?"false":"true",e.appendChild(t),this._editor=t,t.addEventListener("input",this._onInput),t.addEventListener("focus",()=>this.emit("z-focus")),t.addEventListener("blur",()=>this.emit("z-blur")),document.addEventListener("selectionchange",this._onSelectionChange)}updated(){const e=this._editor;if(!e)return;const t=this.shadowRoot.querySelector(".z-rt__content");if(t&&e.parentElement!==t&&t.appendChild(e),e.contentEditable=this.readonly||this.disabled?"false":"true",e.dataset.placeholder=this.placeholder,this._syncPlaceholderAttr(e),e.innerHTML!==this.value){const n=this.sanitize?this.sanitize(this.value):this.value;n!==e.innerHTML&&(e.innerHTML=n)}const r=this.shadowRoot.querySelector(".z-rt__toolbar");r&&(r.addEventListener("mousedown",n=>n.preventDefault()),r.addEventListener("click",this._onToolbarClick),r.addEventListener("keydown",this._onToolbarKeydown),this._syncPressed())}_syncPlaceholderAttr(e){this.placeholder?e.setAttribute("aria-placeholder",this.placeholder):e.removeAttribute("aria-placeholder")}_syncPressed(){var r;const e=(r=this.shadowRoot)==null?void 0:r.querySelector(".z-rt__toolbar");if(!e)return;const t=typeof document.queryCommandState=="function";for(const n of Array.from(e.querySelectorAll(".z-rt__btn"))){const i=n.dataset.command??"";if(!Yt.has(i)||!t)continue;let o;try{o=!!document.queryCommandState(i)}catch{continue}n.setAttribute("aria-pressed",Le(o))}}_syncValue(e=!1){const t=this._editor,r=t?t.innerHTML:"";if(this.__zui_prop_value=r,e){this._debounce&&clearTimeout(this._debounce),this._debounce=null,this.emit("z-change",{value:r});return}this._debounce&&clearTimeout(this._debounce),this._debounce=setTimeout(()=>{this._debounce=null,this.emit("z-change",{value:r})},150)}exec(e,t){const r=this._editor;if(!(!r||this.readonly||this.disabled)){if(r.focus(),this._lastRange){const n=document.getSelection();n&&(n.removeAllRanges(),n.addRange(this._lastRange))}if(typeof document.execCommand=="function")try{document.execCommand(e,!1,t)}catch{}this._syncPressed(),this._syncValue(!0)}}getHTML(){var e;return((e=this._editor)==null?void 0:e.innerHTML)??this.value}getText(){var e;return((e=this._editor)==null?void 0:e.innerText)??""}focus(){var e;if((e=this._editor)==null||e.focus(),this._lastRange){const t=document.getSelection();t&&(t.removeAllRanges(),t.addRange(this._lastRange))}}disconnectedCallback(){this._debounce&&clearTimeout(this._debounce),document.removeEventListener("selectionchange",this._onSelectionChange),super.disconnectedCallback()}};Tt.styles=Vr;let K=Tt;pe([a({attribute:!1})],K.prototype,"value");pe([a({attribute:!1})],K.prototype,"placeholder");pe([a({type:Boolean,attribute:!1})],K.prototype,"readonly");pe([a({type:Boolean,attribute:!1})],K.prototype,"disabled");pe([a({attribute:!1})],K.prototype,"toolbar");pe([a({type:String,attribute:"toolbar-label"})],K.prototype,"toolbarLabel");pe([a({attribute:!1})],K.prototype,"sanitize");customElements.define("z-rich-text",K);const Xr=`/* ===== z-upload ===== */
/* [WHY] 2026-10-25 系统审计：本文件是旧色板/旧 token 残留最重的一处
   (--z-text-color / --z-bg-subtle / --z-border-color / --z-radius / --z-font-size 全部
   依赖裸 hex fallback 生效，暗色主题下不跟随)。按 component-style-standard 全量归位：
   fallback 一律删除，间距/字号/圆角全部走 token。
   See: wiki/reference/component-style-standard.md */

:host {
  display: block;
  font-size: var(--z-font-size-sm);
  color: var(--z-color-text);
}

.z-upload {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-2);
}

.z-upload--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.z-upload__dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--z-space-6) var(--z-space-4);
  border: 1px dashed var(--z-color-border-hover);
  border-radius: var(--z-radius-md);
  background: var(--z-color-bg-secondary);
  cursor: pointer;
  transition: border-color var(--z-transition-fast), background var(--z-transition-fast);
  min-height: 64px;
  box-sizing: border-box;
}

.z-upload__dropzone:hover {
  border-color: var(--z-color-primary);
}

.z-upload__dropzone--drag {
  border-color: var(--z-color-primary);
  background: var(--z-color-primary-soft);
}

.z-upload__hint {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-sm);
  pointer-events: none;
}

.z-upload__input {
  /* [WHY] 不能用 display:none：部分浏览器拒绝触发 click()；用视觉隐藏保留可点性 */
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
  overflow: hidden;
}

.z-upload__list {
  display: flex;
  flex-direction: column;
  gap: var(--z-space-1);
}

.z-upload__item {
  display: flex;
  align-items: center;
  gap: var(--z-space-2);
  padding: 6px var(--z-space-2);
  border-radius: var(--z-radius-sm);
  background: var(--z-color-bg-secondary);
  font-size: var(--z-font-size-sm);
}

.z-upload__item--error {
  color: var(--z-color-danger);
}

.z-upload__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.z-upload__meta {
  color: var(--z-color-text-disabled);
  font-size: var(--z-font-size-xs);
}

.z-upload__status {
  color: var(--z-color-text-secondary);
  font-size: var(--z-font-size-xs);
  min-width: 3em;
  text-align: right;
}

.z-upload__item--success .z-upload__status {
  color: var(--z-color-success);
}

.z-upload__item--error .z-upload__status {
  color: var(--z-color-danger);
}

.z-upload__remove {
  border: none;
  background: none;
  color: var(--z-color-text-disabled);
  font-size: var(--z-font-size-md);
  line-height: 1;
  padding: 2px var(--z-space-1);
  cursor: pointer;
  border-radius: var(--z-radius-sm);
}

.z-upload__remove:hover {
  color: var(--z-color-danger);
  background: var(--z-color-danger-soft);
}
`;var Gr=Object.defineProperty,D=(s,e,t,r)=>{for(var n=void 0,i=s.length-1,o;i>=0;i--)(o=s[i])&&(n=o(e,t,n)||n);return n&&Gr(e,t,n),n};const It=class It extends z{constructor(){super(...arguments),this.accept="",this.multiple=!1,this.drag=!0,this.action="",this.method="POST",this.headers={},this.name="file",this.auto=!0,this.showList=!0,this.disabled=!1,this.label="Click or drag files to upload",this._files=[],this._xhrs=new Map,this._idCounter=0,this._dragOver=!1,this._onInputChange=e=>{var r;const t=e.target;!t.classList.contains("z-upload__input")||!((r=t.files)!=null&&r.length)||(this._addFiles(t.files),t.value="")},this._onListClick=e=>{const t=e.target.closest(".z-upload__item");if(t){if(e.target.closest(".z-upload__remove")){this.removeFile(t.getAttribute("data-id")??"");return}this.disabled||this._pick()}},this._onDragOver=e=>{!this.drag||this.disabled||(e.preventDefault(),this._setDragOver(!0))},this._onDragLeave=e=>{e.target.classList.contains("z-upload__dropzone")&&this._setDragOver(!1)},this._onDrop=e=>{var r;if(!this.drag||this.disabled)return;e.preventDefault(),this._setDragOver(!1);const t=(r=e.dataTransfer)==null?void 0:r.files;t!=null&&t.length&&this._addFiles(t)}}get files(){return this._files.slice()}connectedCallback(){super.connectedCallback(),this.shadowRoot.addEventListener("change",this._onInputChange),this.shadowRoot.addEventListener("click",this._onListClick),this.shadowRoot.addEventListener("dragover",this._onDragOver),this.shadowRoot.addEventListener("dragleave",this._onDragLeave),this.shadowRoot.addEventListener("drop",this._onDrop)}disconnectedCallback(){this.shadowRoot.removeEventListener("change",this._onInputChange),this.shadowRoot.removeEventListener("click",this._onListClick),this.shadowRoot.removeEventListener("dragover",this._onDragOver),this.shadowRoot.removeEventListener("dragleave",this._onDragLeave),this.shadowRoot.removeEventListener("drop",this._onDrop),super.disconnectedCallback()}updated(){this._renderList()}render(){const e=this.disabled?"z-upload--disabled":"";return m`
      <div class="z-upload ${e}" part="root">
        <div class="z-upload__dropzone" part="dropzone">
          <input type="file" class="z-upload__input" part="input"
            ${this.accept?`accept="${c(this.accept)}"`:""}
            ${this.multiple?"multiple":""}
            ${this.disabled?"disabled":""} />
          <div class="z-upload__hint" part="hint">${j(this.label)}</div>
        </div>
        <div class="z-upload__list" part="list" ${this.showList?"":"hidden"}></div>
      </div>
    `}upload(){for(const e of this._files)e.status==="idle"&&this._uploadFile(e)}removeFile(e){var n;const t=this._files.findIndex(i=>i.id===e);if(t===-1)return;const[r]=this._files.splice(t,1);(n=this._xhrs.get(r.id))==null||n.abort(),this._xhrs.delete(r.id),this._renderList(),this.emit("z-remove",{id:e})}clear(){var e;for(const t of this._files)(e=this._xhrs.get(t.id))==null||e.abort();this._xhrs.clear(),this._files=[],this._renderList()}abort(){var e;for(const t of this._files)t.status==="uploading"&&((e=this._xhrs.get(t.id))==null||e.abort(),this._xhrs.delete(t.id),t.status="idle",t.progress=0);this._renderList()}_nextId(){return"z-upload-"+ ++this._idCounter}_addFiles(e){for(const t of Array.from(e)){const r={id:this._nextId(),file:t,name:t.name,size:t.size,status:"idle",progress:0};this.maxSize!==void 0&&t.size>this.maxSize&&(r.status="error",r.error=`File exceeds max size (${this._formatSize(this.maxSize)})`),this._files.push(r)}this._renderList(),this.emit("z-change",{files:this._files.slice()}),this.auto&&this.upload()}_uploadFile(e){if(!this.action||!e.file)return;const t=new XMLHttpRequest;this._xhrs.set(e.id,t),e.status="uploading",e.progress=0,this._renderList(),t.open(this.method.toUpperCase(),this.action);for(const[n,i]of Object.entries(this.headers))t.setRequestHeader(n,i);t.upload.onprogress=n=>{n.lengthComputable&&(e.progress=Math.round(n.loaded/n.total*100),this._renderList(),this.emit("z-progress",{id:e.id,progress:e.progress}))},t.onload=()=>{this._xhrs.delete(e.id),t.status>=200&&t.status<300?(e.status="success",e.progress=100,e.url=t.responseText||"",this._renderList(),this.emit("z-success",{id:e.id,url:e.url})):(e.status="error",e.error=`HTTP ${t.status}`,this._renderList(),this.emit("z-error",{id:e.id,error:e.error}))},t.onerror=()=>{this._xhrs.delete(e.id),e.status="error",e.error="Network error",this._renderList(),this.emit("z-error",{id:e.id,error:e.error})};const r=new FormData;r.append(this.name,e.file),t.send(r)}_renderList(){var t;const e=(t=this.shadowRoot)==null?void 0:t.querySelector(".z-upload__list");e&&(e.innerHTML=this._files.map(r=>this._rowHtml(r)).join(""))}_rowHtml(e){const r=`${e.status==="uploading"?`${e.progress}%`:e.status==="success"?"✓":e.status==="error"?"✕":""}${e.error?" "+j(e.error):""}`;return m`
      <div class="z-upload__item z-upload__item--${e.status}" part="item" data-id="${e.id}">
        <span class="z-upload__name" part="name">${j(e.name)}</span>
        <span class="z-upload__meta">${this._formatSize(e.size)}</span>
        <span class="z-upload__status" part="status">${r}</span>
        <button type="button" class="z-upload__remove" part="remove"
          aria-label="Remove ${c(e.name)}">×</button>
      </div>
    `}_pick(){const e=this.shadowRoot.querySelector(".z-upload__input");e==null||e.click()}_setDragOver(e){if(this._dragOver===e)return;this._dragOver=e;const t=this.shadowRoot.querySelector(".z-upload__dropzone");t==null||t.classList.toggle("z-upload__dropzone--drag",e)}_formatSize(e){return e<1024?`${e} B`:e<1024*1024?`${(e/1024).toFixed(1)} KB`:`${(e/(1024*1024)).toFixed(1)} MB`}};It.styles=Xr;let k=It;D([a({type:String})],k.prototype,"accept");D([a({type:Boolean})],k.prototype,"multiple");D([a({type:Boolean})],k.prototype,"drag");D([a({type:String})],k.prototype,"action");D([a({type:String})],k.prototype,"method");D([a({type:Object,attribute:!1})],k.prototype,"headers");D([a({type:String})],k.prototype,"name");D([a({type:Number,attribute:"max-size"})],k.prototype,"maxSize");D([a({type:Boolean})],k.prototype,"auto");D([a({type:Boolean,attribute:"show-list"})],k.prototype,"showList");D([a({type:Boolean})],k.prototype,"disabled");D([a({type:String})],k.prototype,"label");customElements.define("z-upload",k);const d=s=>document.getElementById(s),ie=s=>{const e=d(s);return t=>{e.textContent=e.textContent==="—"?t:e.textContent+`
`+t}},at=d("md-input"),Jr=d("md-output");at.value=["# Welcome to z-markdown","","## A Web Component Markdown Renderer","","Type **Markdown** on this side and see the *rendered* HTML on the other.","","### Features","","- GFM tables","- Task lists","- Code blocks with syntax highlighting","- Safe by default (XSS sanitized)","","### Code Example","","```ts",'import { ZMarkdown } from "z-agent-ui/components/markdown";',"",'const md = document.querySelector("z-markdown");','md.content = "## Hello World";',"```","","### Table","","| Feature    | Status   | Notes          |","|------------|----------|----------------|","| Headings   | Done     | h1 -- h6       |","| Lists      | Done     | ul, ol, tasks  |","| Tables     | Done     | GFM style      |","| Code       | Done     | inline & block |","| Images     | Done     | responsive     |","> **Tip**: Click the theme toggle in the header to see Dark Mode support.","","- [x] Markdown parsing","- [x] GFM support","- [x] Sanitization","- [ ] Custom containers","- [ ] Mermaid diagrams"].join(`
`);const lt=document.createElement("z-markdown");Jr.appendChild(lt);lt.content=at.value;at.addEventListener("z-input",s=>{lt.content=s.detail.value});const S=d("login-demo"),Vt=d("login-result");function on(){S.title=M("complexPage.loginTitle"),S.subtitle=M("complexPage.loginSubtitle"),S.usernameLabel=M("complexPage.loginUsernameLabel"),S.usernamePlaceholder=M("complexPage.loginUsernamePlaceholder"),S.passwordLabel=M("complexPage.loginPasswordLabel"),S.passwordPlaceholder=M("complexPage.loginPasswordPlaceholder"),S.rememberLabel=M("complexPage.loginRememberLabel"),S.forgotLabel=M("complexPage.loginForgotLabel"),S.submitLabel=M("complexPage.loginSubmitLabel"),S.signUpPrompt=M("complexPage.loginSignUpPrompt"),S.signUpLabel=M("complexPage.loginSignUpLabel")}on();S.addEventListener("z-login",s=>{const{username:e,password:t,remember:r}=s.detail;console.log("[z-login]",{username:e,password:t,remember:r}),Vt.textContent=M("complexPage.loginSuccess"),setTimeout(()=>{Vt.textContent=""},3e3),S.loading=!0,setTimeout(()=>{S.loading=!1},1500)});const Qr=ie("fb-log"),xe=(s,e)=>Qr(`${s}: ${JSON.stringify(e)}`);document.querySelectorAll("#form-basics z-textarea").forEach(s=>{s.addEventListener("z-input",e=>xe("textarea z-input",e.detail)),s.addEventListener("z-change",e=>xe("textarea z-change",e.detail))});document.querySelectorAll("#form-basics z-number-input").forEach(s=>{s.addEventListener("z-change",e=>xe("number-input z-change",e.detail))});document.querySelectorAll("#form-basics z-slider").forEach(s=>{s.addEventListener("z-input",e=>xe("slider z-input",e.detail)),s.addEventListener("z-change",e=>xe("slider z-change",e.detail))});document.querySelectorAll("#form-basics z-rate").forEach(s=>{s.addEventListener("z-change",e=>xe("rate z-change",e.detail))});const ct=ie("form-log"),Pe=d("f1");d("btn-submit").addEventListener("z-click",()=>Pe.submit());d("btn-reset").addEventListener("z-click",()=>Pe.reset());Pe.addEventListener("z-submit",s=>ct("z-submit valid=true values="+JSON.stringify(s.detail.values)));Pe.addEventListener("z-invalid",s=>ct("z-invalid errors="+JSON.stringify(s.detail.errors)));Pe.addEventListener("z-change",s=>{s.detail.values&&ct("z-change field="+s.detail.field+" values="+JSON.stringify(s.detail.values))});const Me=ie("date-log"),an=d("cal");an.addEventListener("z-change",s=>Me("calendar z-change value="+s.detail.value));an.addEventListener("z-month-change",s=>Me("calendar z-month-change "+s.detail.year+"-"+(s.detail.month+1)));const Zr=d("range");Zr.addEventListener("z-change",s=>Me("range z-change start="+s.detail.start+" end="+s.detail.end));d("tp24").addEventListener("z-change",s=>Me("time24 z-change value="+s.detail.value));d("tp12").addEventListener("z-change",s=>Me("time12 z-change value="+s.detail.value));const $e=ie("nav-log"),dt=d("dr-left"),Ue=d("dr-right"),ln=d("dr-top"),cn=d("dr-bottom");d("btn-left").addEventListener("click",()=>dt.show());d("btn-right").addEventListener("click",()=>Ue.show());d("btn-top").addEventListener("click",()=>ln.show());d("btn-bottom").addEventListener("click",()=>cn.show());d("dr-left-close").addEventListener("click",()=>dt.close());d("dr-right-cancel").addEventListener("click",()=>Ue.close());d("dr-right-ok").addEventListener("click",()=>Ue.close());[dt,Ue,ln,cn].forEach(s=>{s.addEventListener("z-open",()=>$e("drawer z-open "+s.placement)),s.addEventListener("z-close",()=>$e("drawer z-close "+s.placement))});d("btn-prog").addEventListener("click",()=>{const{close:s,element:e}=x.open({title:"编程式抽屉",placement:"left",width:"420px",closeLabel:"关闭"});e.addEventListener("z-close",()=>$e("programmatic drawer closed")),setTimeout(()=>s(),1200)});const R=d("steps");R.items=[{title:"需求分析",description:"输入输出与边界"},{title:"方案设计",description:"组件 API 与交互"},{title:"编码实现",description:"实现 + 单测"},{title:"验收发布",description:"回归 + 冒烟 + 收口"}];R.addEventListener("z-change",s=>{R.current=s.detail.index,$e("steps z-change index="+s.detail.index)});d("prev").addEventListener("click",()=>{R.current>0&&R.current--});d("next").addEventListener("click",()=>{R.current<R.items.length-1&&R.current++});d("set-err").addEventListener("click",()=>{R.status="error"});d("reset-steps").addEventListener("click",()=>{R.current=0,R.status="process"});const dn=d("anchor");dn.items=[{href:"#sec-a",label:"项目概览"},{href:"#sec-b",label:"技术方案"},{href:"#sec-c",label:"里程碑"},{href:"#sec-d",label:"风险清单"}];dn.addEventListener("z-change",s=>$e("anchor z-change active="+s.detail.active));const hn=ie("data-log");d("timeline").items=[{title:"需求评审",time:"08-01 10:00",content:"确认范围与验收标准",status:"success"},{title:"方案设计",time:"08-05 14:30",content:"组件 API 冻结",status:"success"},{title:"编码实现",time:"08-09 09:00",content:"W13-W16 完成",status:"success"},{title:"验收发布",time:"08-11 18:00",content:"全量回归 + 冒烟",status:"process"}];d("stat2").addEventListener("z-change",s=>hn("statistic count-up done value="+s.detail.value));d("img1").addEventListener("z-click",s=>hn("image z-click "+s.detail.src));const pn=ie("ent-log"),Oe=d("wm1");Oe.content="机密 · zAgentUI";Oe.fontSize=18;d("wm-rotate").addEventListener("z-click",()=>{Oe.rotate=45});d("wm-gap").addEventListener("z-click",()=>{Oe.gap=160});d("wm-color").addEventListener("z-click",()=>{Oe.color="rgba(239, 68, 68, 0.12)"});const ht=d("cmd");ht.items=[{id:"home",label:"回到首页",keywords:["home","首页"],group:"导航",icon:"🏠",shortcut:"G H"},{id:"search",label:"全局搜索",keywords:["search","搜索"],group:"导航",icon:"🔍",shortcut:"G S"},{id:"settings",label:"打开设置",keywords:["settings","设置"],group:"操作",icon:"⚙️",shortcut:"G ,"},{id:"new-doc",label:"新建文档",keywords:["new","新建","doc"],group:"操作",icon:"📄",shortcut:"N"},{id:"export",label:"导出报表",keywords:["export","导出"],group:"操作",icon:"📤"},{id:"admin",label:"管理员模式",keywords:["admin"],group:"系统",icon:"🔒",disabled:!0},{id:"dark",label:"切换暗色模式",keywords:["dark","theme","暗色"],group:"视图",icon:"🌙"}];ht.addEventListener("z-select",s=>pn("command select "+s.detail.item.id));const un=()=>ht.show();d("cmd-open").addEventListener("z-click",un);document.addEventListener("keydown",s=>{(s.ctrlKey||s.metaKey)&&s.key.toLowerCase()==="k"&&(s.preventDefault(),un())});const Ye=d("vl1");Ye.items=Array.from({length:1e4},(s,e)=>({id:e,name:"记录-"+e,note:e%3===0?"已审核":""}));Ye.renderItem=s=>`<div class="vlist-row"><span class="idx">${s.id}</span><span>${s.name}</span><span style="margin-left:12px;color:var(--z-color-text-secondary);font-size:12px;">${s.note}</span></div>`;d("vl-top").addEventListener("z-click",()=>Ye.scrollToIndex(0));d("vl-5000").addEventListener("z-click",()=>Ye.scrollToIndex(5e3));const Ae=d("jv1");Ae.data={name:"zAgentUI",version:"1.2.0",license:"MIT",stats:{stars:1284,issues:{open:3,closed:47},contributors:["alice","bob","carol"]},flags:{stable:!0,archived:!1,deprecated:null},nested:{deep:{deeper:{deepest:[1,2,3,{leaf:"end"}]}}}};Ae.addEventListener("z-copy",s=>pn("json copy "+s.detail.path+" = "+JSON.stringify(s.detail.value)));d("jv-expand").addEventListener("z-click",()=>Ae.expandAll());d("jv-collapse").addEventListener("z-click",()=>Ae.collapseAll());d("jv-lines").addEventListener("z-change",s=>{Ae.showLineNumbers=s.detail.checked});const ue=ie("rt-log"),J=d("rt1");J.value="<p>这是 <b>富文本</b> 初始内容,选中文字后点击工具栏按钮试试。</p>";J.addEventListener("z-change",s=>ue("rt1 z-change: "+String(s.detail.value).slice(0,60)+"..."));J.addEventListener("z-focus",()=>ue("rt1 z-focus"));J.addEventListener("z-blur",()=>ue("rt1 z-blur"));d("rt-set").addEventListener("z-click",()=>{J.value="<h3>外部赋值</h3><p>通过 <code>value</code> 属性整体覆盖内容。</p>"});d("rt-html").addEventListener("z-click",()=>ue("getHTML(): "+J.getHTML()));d("rt-text").addEventListener("z-click",()=>ue("getText(): "+J.getText()));d("rt-readonly").addEventListener("z-change",s=>{J.readonly=s.detail.checked});d("rt-disabled").addEventListener("z-change",s=>{J.disabled=s.detail.checked});const Be=d("rt2");Be.toolbar=[{id:"bold",label:"B",command:"bold",title:"粗体"},{id:"h2",label:"H2",command:"formatBlock",value:"h2",title:"二级标题"},{id:"date",label:"插入日期",title:"触发 z-command,由应用插入日期"}];Be.addEventListener("z-command",s=>{if(s.detail.id==="date"){const e=new Date().toLocaleDateString("zh-CN");Be.exec("insertText",e),ue("rt2 z-command date → exec insertText "+e)}});Be.addEventListener("z-change",s=>ue("rt2 z-change: "+String(s.detail.value).slice(0,60)+"..."));const Y=s=>{const e=d("dl-log"),t=e.textContent==="—"?[]:e.textContent.split(`
`);t.push(s),t.length>60&&t.shift(),e.textContent=t.join(`
`)},Wt=["Alice","Bob","Charlie","David","Eve","Frank","Grace","Heidi"],Kt=["admin","user","editor"],Xe=["前端组","后端组","设计组","测试组"],Te=Array.from({length:80},(s,e)=>{const t=Wt[e%Wt.length]+"-"+String(e+1).padStart(2,"0");return{id:"u"+(e+1),name:t,email:t.toLowerCase()+"@example.com",role:Kt[e%Kt.length],status:e%2===0,department:Xe[e%Xe.length],age:20+e%40,createdAt:"2026-0"+(1+e%9)+"-"+String(1+e*3%27).padStart(2,"0")+"T08:30:00.000Z"}}),_n=[{key:"name",label:"姓名",type:"text",sortable:!0},{key:"email",label:"邮箱",type:"text",filterable:!1},{key:"role",label:"角色",type:"select",options:[{value:"admin",label:"管理员"},{value:"user",label:"普通用户"},{value:"editor",label:"编辑"}],sortable:!0},{key:"status",label:"状态",type:"boolean"},{key:"department",label:"部门",type:"select",options:Xe.map(s=>({value:s,label:s}))},{key:"age",label:"年龄",type:"number",sortable:!0},{key:"createdAt",label:"创建时间",type:"date",sortable:!0}],g=d("dl");g.fields=_n;g.items=Te;g.totalRecords=Te.length;g.addEventListener("z-filter-change",s=>Y("z-filter-change: "+JSON.stringify(s.detail.filters)));g.addEventListener("z-page-change",s=>Y("z-page-change: page="+s.detail.page+" pageSize="+s.detail.pageSize+" totalRecords="+s.detail.totalRecords));g.addEventListener("z-sort",s=>Y("z-sort: "+JSON.stringify(s.detail.sortState)));g.addEventListener("z-selection-change",s=>Y("z-selection-change: "+s.detail.selectedKeys.length+" 行"));g.addEventListener("z-config-change",s=>{try{localStorage.setItem("z-data-list-config",JSON.stringify(s.detail.config))}catch{}Y("z-config-change: 已保存列配置")});const Xt=(()=>{try{return JSON.parse(localStorage.getItem("z-data-list-config")||"")}catch{return null}})();Xt&&(g.applyConfig(Xt),Y("已从 localStorage 恢复列配置"));const Ge=d("mode-client"),Je=d("mode-server"),mn=s=>{g.mode=s,Ge.tone=s==="client"?"primary":"default",Ge.appearance=s==="client"?"solid":"outline",Je.tone=s==="server"?"primary":"default",Je.appearance=s==="server"?"solid":"outline",Y("mode → "+s)};Ge.addEventListener("z-click",()=>mn("client"));Je.addEventListener("z-click",()=>mn("server"));let Fe=0;const fn=(s,e)=>{for(const t of Object.keys(e)){const r=e[t];if(r===""||r==null)continue;const n=_n.find(o=>o.key===t);if(!n)continue;const i=s[t];if(n.type==="text"){if(!String(i??"").toLowerCase().includes(String(r).toLowerCase()))return!1}else if(n.type==="select"){if(i!==r)return!1}else if(n.type==="boolean"){const o=i===!0||i==="true"||i===1||i==="1";if(r==="true"&&!o||r==="false"&&o)return!1}else if(n.type==="number"){if(r.min!==""&&r.min!=null&&Number(i)<Number(r.min)||r.max!==""&&r.max!=null&&Number(i)>Number(r.max))return!1}else if(n.type==="date"){const o=String(i).slice(0,10);if(r.start&&o<r.start||r.end&&o>r.end)return!1}}return!0};g.addEventListener("z-filter-change",s=>{g.mode==="server"&&(clearTimeout(Fe),Fe=setTimeout(()=>{const e=Te.filter(t=>fn(t,s.detail.filters));g.items=e.slice((g.page-1)*g.pageSize,g.page*g.pageSize),g.totalRecords=e.length,Y("server 取数: "+e.length+" 条命中")},300))});g.addEventListener("z-page-change",s=>{g.mode==="server"&&(clearTimeout(Fe),Fe=setTimeout(()=>{const e=Te.filter(t=>fn(t,g.filters));g.items=e.slice((s.detail.page-1)*s.detail.pageSize,s.detail.page*s.detail.pageSize),g.totalRecords=e.length,Y("server 翻页: page="+s.detail.page)},300))});d("dl-reset").addEventListener("z-click",()=>{g.resetFilters(),Y("resetFilters()")});d("dl-clear-cfg").addEventListener("z-click",()=>{try{localStorage.removeItem("z-data-list-config")}catch{}location.reload()});Y("初始化: "+Te.length+" 条 · client 模式");const Ie=ie("up-log"),De=d("up1");De.addEventListener("z-change",s=>Ie("z-change files="+s.detail.files.map(e=>e.name+"("+e.size+"B)").join(", ")));De.addEventListener("z-progress",s=>Ie("z-progress "+s.detail.id+" "+s.detail.progress+"%"));De.addEventListener("z-success",s=>Ie("z-success "+s.detail.id+" url="+s.detail.url));De.addEventListener("z-error",s=>Ie("z-error "+s.detail.id+" "+s.detail.error));De.addEventListener("z-remove",s=>Ie("z-remove "+s.detail.id));gn();d("lang-toggle").addEventListener("z-click",()=>{setTimeout(on,0)});
