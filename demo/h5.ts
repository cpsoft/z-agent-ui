// 移动端 H5 文档页：左列是用法，右侧一部常驻手机演示当前这一段。
//
// Vant（vant-cli 的 `Simulator.vue`）与 antd-mobile（dumi-theme-mobile）都是
// 「文档列 + 粘性手机容器」：手机只有一个、内容是换的，示例的单位是**用法**而不是属性表。
// 一屏摆一堆画框会让人在框与框之间跳，而真机上从来只有一块屏。
//
// 组件标记只写在 `h5-kit.html` 一处，这里只换 `src`。
// 重画一份的结果是两处会分叉，而分叉没人发现。
//
// 属性表是查的，不是读的；摊在主视觉里会把用法挤走。

import { componentHref } from "./nav.js";
import { initShell } from "./shell.js";
import { eventNames, formatDefault, mobileComponents, slotNames } from "./manifest.js";
import type { ComponentDef } from "./manifest.js";

// 下面 23 段用法是**文本**（复制走），不是 DOM，但标签仍需真注册：`demo-imports-guard`
// 只认源码里出现的 `<m-*>` 标签，分不出模板字符串进了 <pre> 还是 innerHTML。
import "../src/components/m-cell-group/index.js";
import "../src/components/m-cell/index.js";
import "../src/components/m-list/index.js";
import "../src/components/m-card/index.js";
import "../src/components/m-collapse/index.js";
import "../src/components/m-chip/index.js";
import "../src/components/m-empty/index.js";
import "../src/components/m-notice-bar/index.js";
import "../src/components/m-navbar/index.js";
import "../src/components/m-tabbar/index.js";
import "../src/components/m-action-bar/index.js";
import "../src/components/m-floating-button/index.js";
import "../src/components/m-grid/index.js";
import "../src/components/m-grid-item/index.js";
import "../src/components/m-swipe-cell/index.js";
import "../src/components/m-index-bar/index.js";
import "../src/components/m-pull-refresh/index.js";
import "../src/components/m-action-sheet/index.js";
import "../src/components/m-picker/index.js";
import "../src/components/m-number-keyboard/index.js";
import "../src/components/m-search/index.js";
import "../src/components/m-stepper/index.js";
import "../src/components/m-uploader/index.js";

const byTag = new Map(mobileComponents().map((c) => [c.tag, c]));

/** 分组按「一个 H5 页从上到下」走：列表与卡片 → 导航 → 手势与浮层 → 输入。 */
const GROUPS: { title: string; tags: string[] }[] = [
  {
    title: "列表与卡片",
    tags: ["m-cell-group", "m-cell", "m-list", "m-card", "m-collapse", "m-chip", "m-empty", "m-notice-bar"],
  },
  {
    title: "导航与入口",
    tags: ["m-navbar", "m-tabbar", "m-action-bar", "m-floating-button", "m-grid", "m-grid-item"],
  },
  {
    title: "手势与浮层",
    tags: ["m-swipe-cell", "m-index-bar", "m-pull-refresh", "m-action-sheet", "m-picker", "m-number-keyboard"],
  },
  { title: "输入与上传", tags: ["m-search", "m-stepper", "m-uploader"] },
];

/** 只能在父级里演示的组件：单件切片指向父级。 */
const SLICE_INTO: Record<string, string> = { "m-grid-item": "m-grid", "m-cell": "m-cell-group" };

/**
 * 每个组件一段最小可用代码。
 *
 * 属性名能生成，**用法**不能：属性表给不出「哪几个一起写才成立」。
 * 这段代码是这一页最该被抄走的东西，所以逐条对着组件实现写。
 */
const USAGE: Record<string, string> = {
  "m-cell-group": `<m-cell-group heading="门店设置" desc="修改后立即生效">
  <m-cell label="门店名称" value="西湖店" arrow clickable></m-cell>
  <m-cell label="门店编码" value="S1" divider></m-cell>
</m-cell-group>`,
  "m-cell": `<m-cell label="门店名称" value="西湖店" arrow clickable></m-cell>
<m-cell label="说明" desc="仅总店可改"></m-cell>

<!-- 点击发 z-click；arrow 只是视觉提示，clickable 才决定能不能点 -->`,
  "m-list": `<m-list loading>
  <m-cell label="待发货 12 单" desc="其中 3 单已超 24 小时"></m-cell>
  <m-cell label="待审核 4 单"></m-cell>
</m-list>

<!-- 滚到底发 z-loadmore；数据取完写 finished，出错写 error -->`,
  "m-card": `<m-card clickable padding="md">
  <div>上海静安嘉里中心</div>
  <div>今日 128 单 · ¥12,580.50</div>
</m-card>

<!-- 点击 z-click，长按 z-longpress（两个事件，滚动不会误判成点击） -->`,
  "m-collapse": `<m-collapse title="筛选条件" summary="华东 · 今日">
  区域 华东 · 门店 全部 · 日期 今日
</m-collapse>`,
  "m-chip": `<m-chip label="全部" selected></m-chip>
<m-chip label="已通过" tone="success"></m-chip>
<m-chip label="异常" tone="danger"></m-chip>

<!-- 选中态由宿主写回：点一个就把其余的 selected 去掉 -->`,
  "m-empty": `<m-empty type="empty" title="还没有数据" description="换个筛选条件，或新建一条"></m-empty>

<!-- type: empty / error / no-access，三套图标一套版式 -->`,
  "m-notice-bar": `<m-notice-bar text="今日盘点截止 18:00，请提前提交" closable></m-notice-bar>

<!-- 关闭发 z-close；要不要真的移除由宿主决定 -->`,
  "m-navbar": `<m-navbar title="门店" showback back-label="返回"></m-navbar>

<!-- 右侧放操作直接写子元素；点返回发 z-back -->`,
  "m-tabbar": `<m-tabbar active="home"></m-tabbar>

<script>
  tabbar.items = [
    { key: "home", label: "首页" },
    { key: "order", label: "订单", badge: 12 },
  ];
  tabbar.addEventListener("z-change", (e) => (tabbar.active = e.detail.key));
</script>`,
  "m-action-bar": `<m-action-bar align="between">
  <span slot="left">合计 ¥12,580</span>
  <z-button size="sm">提交</z-button>
</m-action-bar>

<!-- 默认 fixed 钉在壳底；加 inline 变成文档流里的一行，borderless 去掉上边框 -->`,
  "m-floating-button": `<m-floating-button icon="+" position="br"></m-floating-button>

<!-- position: br / bl，钉在壳的右下角或左下角；点击发 z-click -->`,
  "m-grid": `<m-grid columns="4" framed>
  <m-grid-item label="今日任务" badge="3"></m-grid-item>
  <m-grid-item label="盘点"></m-grid-item>
  <m-grid-item label="报损" disabled></m-grid-item>
</m-grid>`,
  "m-grid-item": `<m-grid-item label="今日任务" badge="3">
  <svg slot="icon" width="20" height="20">…</svg>
</m-grid-item>

<!-- 只能放在 m-grid 里；badge 显示角标，disabled 置灰且不发事件 -->`,
  "m-swipe-cell": `<m-swipe-cell>
  <m-cell label="望江店" value="营业中"></m-cell>
  <button slot="actions">删除</button>
  <button slot="actions">置顶</button>
</m-swipe-cell>

<!-- 关前可拦：z-before-close 里 preventDefault() 就保持展开 -->`,
  "m-index-bar": `<m-index-bar style="max-height: 320px; overflow-y: auto;">
  <div data-index="A">A</div>
  <m-cell label="安吉店" value="12 单"></m-cell>
  <div data-index="B">B</div>
  <m-cell label="滨江店" value="31 单"></m-cell>
</m-index-bar>

<!-- data-index 标分组，滚动定位发 z-index-change -->`,
  "m-pull-refresh": `<m-pull-refresh>
  <div style="min-height: 320px">…列表…</div>
</m-pull-refresh>

<script>
  refresh.addEventListener("z-refresh", async () => {
    refresh.refreshing = true;
    await fetchPage();
    refresh.refreshing = false;   // 何时收起由宿主决定
  });
</script>`,
  "m-action-sheet": `<m-action-sheet title="选择操作"></m-action-sheet>

<script>
  sheet.actions = [
    { label: "修改数量", value: "qty" },
    { label: "删除门店", value: "remove", danger: true },
  ];
  sheet.visible = true;
  sheet.addEventListener("z-select", (e) => console.log(e.detail.value));
</script>`,
  "m-picker": `<m-picker heading="选择城市"></m-picker>

<script>
  picker.options = [
    { value: "hz", label: "杭州" },
    { value: "nb", label: "宁波" },
  ];
  picker.open = true;
  picker.addEventListener("z-confirm", (e) => (picker.value = e.detail.value));
</script>`,
  "m-number-keyboard": `<m-number-keyboard title="退款金额" extra-key extra-key-text="确定"></m-number-keyboard>

<script>
  cell.addEventListener("z-click", () => (keyboard.open = true));
  keyboard.addEventListener("z-extra", (e) => submit(e.detail.value));
</script>`,
  "m-search": `<m-search placeholder="搜索门店 / 编码" debounce="200"></m-search>

<script>
  search.addEventListener("z-input", (e) => query(e.detail.value));   // 防抖后
  search.addEventListener("z-search", (e) => query(e.detail.value));  // 回车立即
</script>`,
  "m-stepper": `<m-stepper value="3" min="0" max="9" step="1"></m-stepper>
<m-stepper value="0.1" min="0" max="1" step="0.1"></m-stepper>

<!-- 到边界按钮置灰且不发 z-change；小数步长不会出现 0.30000000000000004 -->`,
  "m-uploader": `<m-uploader max="3" multiple accept="image/*" add-label="加照片"></m-uploader>

<!-- 拍照：capture 一开就多出一个「拍照」入口（点一下直开相机），max-edge 在上报前把长边缩到 1600 -->
<m-uploader capture="environment" max="4" multiple max-edge="1600"></m-uploader>

<!-- 视频：accept=video/* 时入口变「录像」，max-size 超限发 z-reject（max-edge 对视频不生效） -->
<m-uploader accept="video/*" capture="environment" max-size="41943040"></m-uploader>

<!-- 选择发 z-select（带 source: camera / album）、删除发 z-remove；files 由宿主回写，超过 max 截断；
     视频条目要回写 type: "video"，缩略图才会渲染成 <video> 而不是空白 <img> -->`,
};

const esc = (s: string): string =>
  s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[m]!);

const chips = (items: readonly string[]): string =>
  items.length ? items.map((i) => `<code class="h5-chip">${esc(i)}</code>`).join("") : `<span class="h5-muted">无</span>`;

function sectionHtml(c: ComponentDef): string {
  const props = c.properties
    .map(
      (p) => `<tr><th scope="row"><code>${esc(p.name)}</code></th><td>${esc(p.type)}</td>
        <td><code>${esc(formatDefault(p.default))}</code></td>
        <td>${p.values ? esc(p.values.join(" / ")) : '<span class="h5-muted">—</span>'}</td></tr>`,
    )
    .join("");
  const id = `code-${c.tag}`;
  return `<article class="h5-api" id="api-${esc(c.tag)}" data-tag="${esc(c.tag)}">
  <h3><code>${esc(c.tag)}</code></h3>
  <p class="h5-api__sum">${esc((c.summary || "").replace(/^<[^>]+>\s*/, ""))}</p>
  <div class="h5-code">
    <button class="h5-copy" type="button" data-copy="${id}">复制</button>
    <pre id="${id}"><code>${esc(USAGE[c.tag] ?? "")}</code></pre>
  </div>
  <details class="h5-more">
    <summary>完整参数 · ${c.properties.length} 个属性 · ${eventNames(c).length} 个事件</summary>
    <table class="h5-props">
      <thead><tr><th scope="col">属性</th><th scope="col">类型</th><th scope="col">默认</th><th scope="col">可选值</th></tr></thead>
      <tbody>${props}</tbody>
    </table>
    <p>事件：${chips(eventNames(c))}</p>
    <p>插槽：${chips(slotNames(c))}</p>
    <p><a href="${componentHref(c.tag)}">完整说明与更多示例 ↗</a></p>
  </details>
</article>`;
}

function renderDocs(): void {
  const host = document.getElementById("h5-docs");
  if (!host) return;
  host.innerHTML = GROUPS.map((g) => {
    const rows = g.tags.map((t) => byTag.get(t)).filter((c): c is ComponentDef => Boolean(c));
    return `<h2 class="h5-group">${esc(g.title)}<span>${rows.length}</span></h2>${rows.map(sectionHtml).join("")}`;
  }).join("");
}

// ── 右侧手机：跟着当前这一段换 src ───────────────────────────
const frame = document.getElementById("h5-screen") as HTMLIFrameElement | null;
const nowEl = document.getElementById("h5-now");
const openLink = document.getElementById("h5-open") as HTMLAnchorElement | null;
let current: string | null = null;

function kitUrl(tag: string): string {
  const slice = tag ? (SLICE_INTO[tag] ?? tag) : "";
  const qs = new URLSearchParams({ embed: "1", view: "screen" });
  if (slice) qs.set("only", slice);
  return `./h5-kit.html?${qs.toString()}`;
}

/**
 * 手机里的内容：整页 + 滚到当前这一段。
 *
 * 只放一个组件时，一屏手机里往往只有一个 cell（大片空白），
 * 而且看不到「它在页面里的位置」。Vant 的模拟器跑的就是整页 mobile 版，滚到对应位置。
 * 换 `src` 会整页重载 —— 每滑过一段闪一次。这里加载一次，之后只滚位置。
 */
let showTimer = 0;
function showInPhone(tag: string): void {
  // 滚动时会连续划过好几段，逐段发消息会让手机里连着起几次平滑滚动，
  // 表现为「抖一下又抖回去」。停顿 90ms 再发，只落到真正停住的那一段。
  window.clearTimeout(showTimer);
  showTimer = window.setTimeout(() => {
    const slice = tag ? (SLICE_INTO[tag] ?? tag) : "";
    frame?.contentWindow?.postMessage({ type: "h5-show", tag: slice }, location.origin);
  }, 90);
}

function setActive(tag: string): void {
  if (!frame || tag === current) return;
  current = tag;
  showInPhone(tag);
  if (nowEl) nowEl.textContent = tag || "整页";
  if (openLink) openLink.href = tag ? kitUrl(tag) : "./h5-kit.html";
  for (const el of document.querySelectorAll<HTMLElement>(".h5-api")) {
    el.toggleAttribute("data-active", el.dataset.tag === tag);
  }
}

// 滚动驱动：哪一段离视口中线最近，手机就演哪一段。
// 试过 rootMargin 收成中间一条窄带，但**最后一段永远进不去**
// —— 页面滚到底时它在视口下半部，高亮会停在前一段（实测：滚到 m-uploader，手机演的是
// m-pull-refresh）。改成每次滚动取「中心离中线最近」的可见段，末尾自然收敛到最后一段。
function wireScrollSpy(): void {
  const sections = Array.from(document.querySelectorAll<HTMLElement>(".h5-api"));
  if (!sections.length) return;
  let ticking = false;

  const pick = (): void => {
    ticking = false;
    // 触底 = 最后一段（它可能高到中心永远不在中线附近：实测滚到底时手机演的是前一段）
    const doc = document.documentElement;
    if (window.scrollY + window.innerHeight >= doc.scrollHeight - 2) {
      setActive(sections[sections.length - 1]?.dataset.tag ?? "");
      return;
    }
    const mid = window.innerHeight / 2;
    let best: { el: HTMLElement; d: number } | null = null;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      const d = Math.abs((r.top + r.bottom) / 2 - mid);
      if (!best || d < best.d) best = { el, d };
    }
    if (best) setActive(best.el.dataset.tag ?? "");
  };

  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(pick);
    },
    { passive: true },
  );
  pick();
}

/** 点段落也能钉住某一段（键盘操作与「跳着看」走这条）。 */
function wireClickToPin(): void {
  document.getElementById("h5-docs")?.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    if (t.closest(".h5-copy") || t.closest("a") || t.closest("details")) return;
    const article = t.closest<HTMLElement>(".h5-api");
    if (article) setActive(article.dataset.tag ?? "");
  });
}

function wireDeviceWidth(): void {
  for (const btn of document.querySelectorAll<HTMLElement>("[data-w]")) {
    btn.addEventListener("click", () => {
      const w = btn.dataset.w ?? "375";
      document.getElementById("h5-device")?.style.setProperty("--h5-w", `${w}px`);
      for (const b of document.querySelectorAll<HTMLElement>("[data-w]")) {
        b.setAttribute("aria-pressed", String(b === btn));
      }
    });
  }
}

function wireFullMode(): void {
  document.getElementById("h5-full")?.addEventListener("click", (ev) => {
    const btn = ev.currentTarget as HTMLElement;
    const on = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", String(on));
    if (on) setActive("");
    else {
      const active = document.querySelector<HTMLElement>(".h5-api[data-active]");
      if (active) setActive(active.dataset.tag ?? "");
    }
  });
}

/** 复制代码（代码块是这个页面最该被抄走的东西）。 */
function wireCopy(): void {
  document.addEventListener("click", async (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>(".h5-copy");
    if (!btn) return;
    const pre = document.getElementById(btn.dataset.copy ?? "");
    if (!pre) return;
    try {
      await navigator.clipboard.writeText(pre.textContent ?? "");
      btn.textContent = "已复制";
    } catch {
      btn.textContent = "复制失败";
    }
    window.setTimeout(() => (btn.textContent = "复制"), 1200);
  });
}

renderDocs();
// 手机只加载一次：整页（`view=screen`）。之后靠 postMessage 滚到当前段落。
frame?.setAttribute("src", kitUrl(""));
frame?.addEventListener("load", () => showInPhone(current ?? ""));
wireScrollSpy();
wireClickToPin();
wireDeviceWidth();
wireFullMode();
wireCopy();
setActive("");
// 本页自己的渲染先就绪，壳后挂 —— 渲染抛错不连累导航。
initShell();
