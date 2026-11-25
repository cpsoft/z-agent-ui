import"./presets-CdaBrvJF.js";/* empty css             */import{d as x,i as z,f as E,e as b,s as $,c as L}from"./shell-DwQ7nMfw.js";import"./MNumberKeyboard-CypyDMeS.js";import"./MList-i4dayCk_.js";import"./a11y-DJ6wHu5s.js";import"./Button-6M0Me5pu.js";import"./copy-DoHMT7Ic.js";import"./vocabulary-DLBU9tdh.js";import"./Position-D6zl9ryN.js";import"./afterAnimation-DHK-FZ_K.js";const S=new Map(x().map(e=>[e.tag,e])),A=[{title:"列表与卡片",tags:["m-cell-group","m-cell","m-list","m-card","m-collapse","m-chip","m-empty","m-notice-bar"]},{title:"导航与入口",tags:["m-navbar","m-tabbar","m-action-bar","m-floating-button","m-grid","m-grid-item"]},{title:"手势与浮层",tags:["m-swipe-cell","m-index-bar","m-pull-refresh","m-action-sheet","m-picker","m-number-keyboard"]},{title:"输入与上传",tags:["m-search","m-stepper","m-uploader"]}],y={"m-grid-item":"m-grid","m-cell":"m-cell-group"},B={"m-cell-group":`<m-cell-group heading="门店设置" desc="修改后立即生效">
  <m-cell label="门店名称" value="西湖店" arrow clickable></m-cell>
  <m-cell label="门店编码" value="S1" divider></m-cell>
</m-cell-group>`,"m-cell":`<m-cell label="门店名称" value="西湖店" arrow clickable></m-cell>
<m-cell label="说明" desc="仅总店可改"></m-cell>

<!-- 点击发 z-click；arrow 只是视觉提示，clickable 才决定能不能点 -->`,"m-list":`<m-list loading>
  <m-cell label="待发货 12 单" desc="其中 3 单已超 24 小时"></m-cell>
  <m-cell label="待审核 4 单"></m-cell>
</m-list>

<!-- 滚到底发 z-loadmore；数据取完写 finished，出错写 error -->`,"m-card":`<m-card clickable padding="md">
  <div>上海静安嘉里中心</div>
  <div>今日 128 单 · ¥12,580.50</div>
</m-card>

<!-- 点击 z-click，长按 z-longpress（两个事件，滚动不会误判成点击） -->`,"m-collapse":`<m-collapse title="筛选条件" summary="华东 · 今日">
  区域 华东 · 门店 全部 · 日期 今日
</m-collapse>`,"m-chip":`<m-chip label="全部" selected></m-chip>
<m-chip label="已通过" tone="success"></m-chip>
<m-chip label="异常" tone="danger"></m-chip>

<!-- 选中态由宿主写回：点一个就把其余的 selected 去掉 -->`,"m-empty":`<m-empty type="empty" title="还没有数据" description="换个筛选条件，或新建一条"></m-empty>

<!-- type: empty / error / no-access，三套图标一套版式 -->`,"m-notice-bar":`<m-notice-bar text="今日盘点截止 18:00，请提前提交" closable></m-notice-bar>

<!-- 关闭发 z-close；要不要真的移除由宿主决定 -->`,"m-navbar":`<m-navbar title="门店" showback back-label="返回"></m-navbar>

<!-- 右侧放操作直接写子元素；点返回发 z-back -->`,"m-tabbar":`<m-tabbar active="home"></m-tabbar>

<script>
  tabbar.items = [
    { key: "home", label: "首页" },
    { key: "order", label: "订单", badge: 12 },
  ];
  tabbar.addEventListener("z-change", (e) => (tabbar.active = e.detail.key));
<\/script>`,"m-action-bar":`<m-action-bar align="between">
  <span slot="left">合计 ¥12,580</span>
  <z-button size="sm">提交</z-button>
</m-action-bar>

<!-- 默认 fixed 钉在壳底；加 inline 变成文档流里的一行，borderless 去掉上边框 -->`,"m-floating-button":`<m-floating-button icon="+" position="br"></m-floating-button>

<!-- position: br / bl，钉在壳的右下角或左下角；点击发 z-click -->`,"m-grid":`<m-grid columns="4" framed>
  <m-grid-item label="今日任务" badge="3"></m-grid-item>
  <m-grid-item label="盘点"></m-grid-item>
  <m-grid-item label="报损" disabled></m-grid-item>
</m-grid>`,"m-grid-item":`<m-grid-item label="今日任务" badge="3">
  <svg slot="icon" width="20" height="20">…</svg>
</m-grid-item>

<!-- 只能放在 m-grid 里；badge 显示角标，disabled 置灰且不发事件 -->`,"m-swipe-cell":`<m-swipe-cell>
  <m-cell label="望江店" value="营业中"></m-cell>
  <button slot="actions">删除</button>
  <button slot="actions">置顶</button>
</m-swipe-cell>

<!-- 关前可拦：z-before-close 里 preventDefault() 就保持展开 -->`,"m-index-bar":`<m-index-bar style="max-height: 320px; overflow-y: auto;">
  <div data-index="A">A</div>
  <m-cell label="安吉店" value="12 单"></m-cell>
  <div data-index="B">B</div>
  <m-cell label="滨江店" value="31 单"></m-cell>
</m-index-bar>

<!-- data-index 标分组，滚动定位发 z-index-change -->`,"m-pull-refresh":`<m-pull-refresh>
  <div style="min-height: 320px">…列表…</div>
</m-pull-refresh>

<script>
  refresh.addEventListener("z-refresh", async () => {
    refresh.refreshing = true;
    await fetchPage();
    refresh.refreshing = false;   // 何时收起由宿主决定
  });
<\/script>`,"m-action-sheet":`<m-action-sheet title="选择操作"></m-action-sheet>

<script>
  sheet.actions = [
    { label: "修改数量", value: "qty" },
    { label: "删除门店", value: "remove", danger: true },
  ];
  sheet.visible = true;
  sheet.addEventListener("z-select", (e) => console.log(e.detail.value));
<\/script>`,"m-picker":`<m-picker heading="选择城市"></m-picker>

<script>
  picker.options = [
    { value: "hz", label: "杭州" },
    { value: "nb", label: "宁波" },
  ];
  picker.open = true;
  picker.addEventListener("z-confirm", (e) => (picker.value = e.detail.value));
<\/script>`,"m-number-keyboard":`<m-number-keyboard title="退款金额" extra-key extra-key-text="确定"></m-number-keyboard>

<script>
  cell.addEventListener("z-click", () => (keyboard.open = true));
  keyboard.addEventListener("z-extra", (e) => submit(e.detail.value));
<\/script>`,"m-search":`<m-search placeholder="搜索门店 / 编码" debounce="200"></m-search>

<script>
  search.addEventListener("z-input", (e) => query(e.detail.value));   // 防抖后
  search.addEventListener("z-search", (e) => query(e.detail.value));  // 回车立即
<\/script>`,"m-stepper":`<m-stepper value="3" min="0" max="9" step="1"></m-stepper>
<m-stepper value="0.1" min="0" max="1" step="0.1"></m-stepper>

<!-- 到边界按钮置灰且不发 z-change；小数步长不会出现 0.30000000000000004 -->`,"m-uploader":`<m-uploader max="3" multiple accept="image/*" add-label="加照片"></m-uploader>

<!-- 拍照：capture 一开就多出一个「拍照」入口（点一下直开相机），max-edge 在上报前把长边缩到 1600 -->
<m-uploader capture="environment" max="4" multiple max-edge="1600"></m-uploader>

<!-- 视频：accept=video/* 时入口变「录像」，max-size 超限发 z-reject（max-edge 对视频不生效） -->
<m-uploader accept="video/*" capture="environment" max-size="41943040"></m-uploader>

<!-- 选择发 z-select（带 source: camera / album）、删除发 z-remove；files 由宿主回写，超过 max 截断；
     视频条目要回写 type: "video"，缩略图才会渲染成 <video> 而不是空白 <img> -->`},i=e=>e.replace(/[&<>"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[t]),h=e=>e.length?e.map(t=>`<code class="h5-chip">${i(t)}</code>`).join(""):'<span class="h5-muted">无</span>';function q(e){const t=e.properties.map(l=>`<tr><th scope="row"><code>${i(l.name)}</code></th><td>${i(l.type)}</td>
        <td><code>${i(E(l.default))}</code></td>
        <td>${l.values?i(l.values.join(" / ")):'<span class="h5-muted">—</span>'}</td></tr>`).join(""),a=`code-${e.tag}`;return`<article class="h5-api" id="api-${i(e.tag)}" data-tag="${i(e.tag)}">
  <h3><code>${i(e.tag)}</code></h3>
  <p class="h5-api__sum">${i((e.summary||"").replace(/^<[^>]+>\s*/,""))}</p>
  <div class="h5-code">
    <button class="h5-copy" type="button" data-copy="${a}">复制</button>
    <pre id="${a}"><code>${i(B[e.tag]??"")}</code></pre>
  </div>
  <details class="h5-more">
    <summary>完整参数 · ${e.properties.length} 个属性 · ${b(e).length} 个事件</summary>
    <table class="h5-props">
      <thead><tr><th scope="col">属性</th><th scope="col">类型</th><th scope="col">默认</th><th scope="col">可选值</th></tr></thead>
      <tbody>${t}</tbody>
    </table>
    <p>事件：${h(b(e))}</p>
    <p>插槽：${h($(e))}</p>
    <p><a href="${L(e.tag)}">完整说明与更多示例 ↗</a></p>
  </details>
</article>`}function I(){const e=document.getElementById("h5-docs");e&&(e.innerHTML=A.map(t=>{const a=t.tags.map(l=>S.get(l)).filter(l=>!!l);return`<h2 class="h5-group">${i(t.title)}<span>${a.length}</span></h2>${a.map(q).join("")}`}).join(""))}const r=document.getElementById("h5-screen"),g=document.getElementById("h5-now"),v=document.getElementById("h5-open");let m=null;function w(e){const t=e?y[e]??e:"",a=new URLSearchParams({embed:"1",view:"screen"});return t&&a.set("only",t),`./h5-kit.html?${a.toString()}`}let f=0;function k(e){window.clearTimeout(f),f=window.setTimeout(()=>{var a;const t=e?y[e]??e:"";(a=r==null?void 0:r.contentWindow)==null||a.postMessage({type:"h5-show",tag:t},location.origin)},90)}function o(e){if(!(!r||e===m)){m=e,k(e),g&&(g.textContent=e||"整页"),v&&(v.href=e?w(e):"./h5-kit.html");for(const t of document.querySelectorAll(".h5-api"))t.toggleAttribute("data-active",t.dataset.tag===e)}}function C(){const e=Array.from(document.querySelectorAll(".h5-api"));if(!e.length)return;let t=!1;const a=()=>{var d;t=!1;const l=document.documentElement;if(window.scrollY+window.innerHeight>=l.scrollHeight-2){o(((d=e[e.length-1])==null?void 0:d.dataset.tag)??"");return}const c=window.innerHeight/2;let n=null;for(const p of e){const s=p.getBoundingClientRect();if(s.bottom<0||s.top>window.innerHeight)continue;const u=Math.abs((s.top+s.bottom)/2-c);(!n||u<n.d)&&(n={el:p,d:u})}n&&o(n.el.dataset.tag??"")};window.addEventListener("scroll",()=>{t||(t=!0,requestAnimationFrame(a))},{passive:!0}),a()}function T(){var e;(e=document.getElementById("h5-docs"))==null||e.addEventListener("click",t=>{const a=t.target;if(a.closest(".h5-copy")||a.closest("a")||a.closest("details"))return;const l=a.closest(".h5-api");l&&o(l.dataset.tag??"")})}function H(){for(const e of document.querySelectorAll("[data-w]"))e.addEventListener("click",()=>{var a;const t=e.dataset.w??"375";(a=document.getElementById("h5-device"))==null||a.style.setProperty("--h5-w",`${t}px`);for(const l of document.querySelectorAll("[data-w]"))l.setAttribute("aria-pressed",String(l===e))})}function j(){var e;(e=document.getElementById("h5-full"))==null||e.addEventListener("click",t=>{const a=t.currentTarget,l=a.getAttribute("aria-pressed")!=="true";if(a.setAttribute("aria-pressed",String(l)),l)o("");else{const c=document.querySelector(".h5-api[data-active]");c&&o(c.dataset.tag??"")}})}function P(){document.addEventListener("click",async e=>{const t=e.target.closest(".h5-copy");if(!t)return;const a=document.getElementById(t.dataset.copy??"");if(a){try{await navigator.clipboard.writeText(a.textContent??""),t.textContent="已复制"}catch{t.textContent="复制失败"}window.setTimeout(()=>t.textContent="复制",1200)}})}I();r==null||r.setAttribute("src",w(""));r==null||r.addEventListener("load",()=>k(m??""));C();T();H();j();P();o("");z();
