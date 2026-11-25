import{c as t}from"./shell-DwQ7nMfw.js";const c={foundation:"L0",base:"L1",composite:"L2",page:"L3"};function n(a){return a.replace(/[&<>"]/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[e])}function m(a,e=3){return[...a.properties].sort((s,o)=>{const p=s.values?1:0;return(o.values?1:0)-p}).slice(0,e).map(s=>s.name)}function l(a,e){if(a){if(e.length===0){a.innerHTML='<p class="demo-empty">这一域暂时没有组件 —— 清单里 source 前缀对不上？</p>';return}a.innerHTML=e.map(r=>`<a class="comp-card" href="${t(r.tag)}">
  <span class="comp-card__head"><b>${n(r.tag)}</b><em>${c[r.layer]??r.layer}</em></span>
  <span class="comp-card__sum">${n(r.summary||"未写摘要")}</span>
  <span class="comp-card__props">${m(r).map(s=>`<i>${n(s)}</i>`).join("")}</span>
</a>`).join("")}}export{l as r};
