// H5 组件套件：移动端组件的连排演示 + 实时事件日志。
//
// 页面结构是「5 个手机场景」：组件清单 / 列表与卡片 / 底部导航 / 底部操作与浮层 / 页面骨架。
// 每个组件块带 `data-tag`，同一个页面既能整页看，也能用 `?only=m-xxx` 单件切片。
// 右侧日志记录每一次事件。

import "../src/theme/index.js";
import "../src/components/button/index.js";
import "../src/components/m-navbar/index.js";
import "../src/components/m-notice-bar/index.js";
import "../src/components/m-search/index.js";
import "../src/components/m-grid/index.js";
import "../src/components/m-grid-item/index.js";
import "../src/components/m-cell/index.js";
import "../src/components/m-cell-group/index.js";
import "../src/components/m-chip/index.js";
import "../src/components/m-card/index.js";
import "../src/components/m-collapse/index.js";
import "../src/components/m-empty/index.js";
import "../src/components/m-list/index.js";
import "../src/components/m-tabbar/index.js";
import "../src/components/m-floating-button/index.js";
import "../src/components/m-action-bar/index.js";
import "../src/components/m-action-sheet/index.js";
import "../src/components/m-pull-refresh/index.js";
import "../src/components/m-stepper/index.js";
import "../src/components/m-picker/index.js";
import "../src/components/m-uploader/index.js";
import "../src/components/m-swipe-cell/index.js";
import "../src/components/m-index-bar/index.js";
import "../src/components/m-number-keyboard/index.js";
import "../src/components/m-price/index.js";
import "../src/components/m-checkbox/index.js";
import "../src/components/m-radio/index.js";
import "../src/components/m-tabs/index.js";
import "../src/components/m-goods-card/index.js";
import "../src/components/m-checkout-bar/index.js";
import "../src/components/m-swiper/index.js";
import "../src/components/m-sku-picker/index.js";
import "../src/components/m-image-preview/index.js";
import "../src/components/m-countdown/index.js";
import "../src/components/m-coupon/index.js";

import { initShell } from "./shell.js";

import type { MNavbar } from "../src/components/m-navbar/index.js";
import type { MNoticeBar } from "../src/components/m-notice-bar/index.js";
import type { MSearch } from "../src/components/m-search/index.js";
import type { MGridItem } from "../src/components/m-grid-item/index.js";
import type { MCell } from "../src/components/m-cell/index.js";
import type { MStepper } from "../src/components/m-stepper/index.js";
import type { MPicker } from "../src/components/m-picker/index.js";
import type { MUploader, MUploadFile } from "../src/components/m-uploader/index.js";
import type { MTabbar, TabbarItem } from "../src/components/m-tabbar/index.js";
import type { MActionSheet, MActionSheetAction } from "../src/components/m-action-sheet/index.js";
import type { MCheckbox } from "../src/components/m-checkbox/index.js";
import type { MRadioGroup } from "../src/components/m-radio/index.js";
import type { MTabs } from "../src/components/m-tabs/index.js";
import type { MCheckoutBar } from "../src/components/m-checkout-bar/index.js";
import type { MSkuPicker } from "../src/components/m-sku-picker/index.js";
import type { MSwiper } from "../src/components/m-swiper/index.js";
import type { MImagePreview } from "../src/components/m-image-preview/index.js";
import type { MCountdown } from "../src/components/m-countdown/index.js";
import type { MCoupon } from "../src/components/m-coupon/index.js";
import type { MCell } from "../src/components/m-cell/index.js";

// ── 单件模式：只留一个手机、一个组件 ─────────────────────────
// 隐藏后布局就变了（宫格宽度、fixed 底栏位置），先收敛再量；
// 反过来的话前几个组件的接线会对着已经不可见的节点白跑一遍。
// `view=screen`：整块内容就是一屏手机（文档页右侧的常驻模拟器用这个）。
// 隐藏日志与页面留白，壳撑满 iframe —— 外壳的圆角与边框由文档页那层画，这里只管内容。
const params = new URLSearchParams(location.search);
if (params.get("view") === "screen") document.documentElement.setAttribute("data-screen", "");

const only = params.get("only");
if (only) {
  document.documentElement.setAttribute("data-solo", only);
  const phones = Array.from(document.querySelectorAll<HTMLElement>(".h5kit-phone"));
  const target = phones.find((p) => p.dataset.tag === only || p.querySelector(`[data-tag="${only}"]`));
  for (const phone of phones) {
    const keep = phone === target;
    phone.hidden = !keep;
    if (!keep) continue;
    if (phone.dataset.tag === only) {
      // 这一个手机本身就是演示对象（m-navbar）：标题写它自己的名字，比写「页面骨架」清楚
      phone.querySelector("m-navbar")?.setAttribute("title", only);
      const cap = phone.querySelector<HTMLElement>(".h5kit-sec__t");
      if (cap) cap.textContent = cap.textContent?.replace(/^m-[a-z0-9-]+\s*·\s*/, "").trim() ?? "";
      continue;
    }
    for (const sec of phone.querySelectorAll<HTMLElement>(".h5kit-sec")) {
      sec.hidden = sec.dataset.tag !== only;
      if (sec.hidden) continue;
      // 单件模式下顶栏已经写了 m-xxx，这行再写一遍就是重复；
      // 留下的那半句才是它存在的理由（例如「inline 与默认 fixed 的差别」）。
      const t = sec.querySelector<HTMLElement>(".h5kit-sec__t");
      if (t) {
        const rest = t.textContent?.replace(/^m-[a-z0-9-]+\s*·\s*/, "").trim() ?? "";
        t.textContent = rest;
        t.hidden = rest.length === 0;
      }
    }
    // 顶栏标题跟着切片走：显示「组件清单」而内容是 m-picker，会让人以为进错了页
    phone.querySelector("m-navbar")?.setAttribute("title", only);
  }
}

// ── 被文档页驱动：切到某一段 ────────────────────────────────
// H5 页右上的手机是常驻的：换 src 会整页重载，
// 每滑过一段闪一次。这里只切手机 + 滚一次位置，加载只有一次。
const screenMode = document.documentElement.hasAttribute("data-screen");

/**
 * 屏幕模式（`view=screen`，H5 页右侧那部手机）：只留目标所在的手机，滚它的内部滚动区。
 *
 * 不是滚 document：5 个手机各自是一屏页面（有自己的 navbar / tabbar / 操作条），
 * 滚文档会让壳在框里上下跑，手机内部再滚一层，出现两条滚动条。
 */
function showSegment(tag: string): void {
  const hit = tag
    ? document.querySelector<HTMLElement>(`#k-${CSS.escape(tag)}, [data-tag="${CSS.escape(tag)}"]`)
    : null;

  if (!screenMode) {
    if (hit) hit.scrollIntoView({ block: "start", behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  const phones = Array.from(document.querySelectorAll<HTMLElement>(".h5kit-phone"));
  const phone = hit?.closest<HTMLElement>(".h5kit-phone") ?? phones[0];
  for (const p of phones) p.toggleAttribute("data-current", p === phone);

  // 整页模式（tag 为空）= 这一屏从顶部看起
  const scroller = phone?.querySelector<HTMLElement>(".h5kit-phone__scroll");
  if (!scroller) return;
  if (!hit) {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  // 相对位置而不是 offsetTop：transform 与嵌套定位都不影响 rect 之差
  const top = hit.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
  scroller.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

if (screenMode) document.querySelector<HTMLElement>(".h5kit-phone")?.setAttribute("data-current", "");

window.addEventListener("message", (ev) => {
  if (ev.origin !== location.origin) return;
  const data = ev.data as { type?: string; tag?: string } | null;
  if (data?.type !== "h5-show") return;
  showSegment(data.tag ?? "");
});

const logEl = document.getElementById("log")!;

function printEvent(name: string, detail: unknown): void {
  const empty = logEl.querySelector(".h5kit-log__empty");
  if (empty) empty.remove();
  const row = document.createElement("div");
  row.className = "h5kit-log__item";
  row.innerHTML = `<b>${name}</b> ${JSON.stringify(detail)}`;
  logEl.prepend(row);
  // 日志只留最近 40 条：这是演示页，不是审计台
  while (logEl.children.length > 40) logEl.lastElementChild!.remove();
}

document.getElementById("clear")!.addEventListener("click", () => {
  logEl.innerHTML = '<span class="h5kit-log__empty">点一下左边任意控件…</span>';
});

/** 往上找最近的、带这个标签的元素（事件是 `composed: true` 的，能从 shadow 里冒出来）。 */
function host<T extends HTMLElement>(ev: Event, tag: string): T | null {
  for (const n of ev.composedPath()) {
    if (n instanceof HTMLElement && n.tagName.toLowerCase() === tag) return n as T;
  }
  return null;
}

// ── 导航与提示 ───────────────────────────────────────────────
document.querySelectorAll<MNavbar>("m-navbar").forEach((nav) => {
  nav.addEventListener("z-back", () => printEvent("m-navbar z-back", {}));
});

const notice = document.getElementById("notice") as MNoticeBar;
notice.addEventListener("z-close", (ev) => {
  printEvent("m-notice-bar z-close", (ev as CustomEvent).detail);
  // 组件只负责「我要求关闭」，由宿主决定是否真的移除
  notice.remove();
});

// ── 搜索：防抖 + 回车结算 ────────────────────────────────────
const search = document.getElementById("search") as MSearch;
search.addEventListener("z-input", (ev) => {
  const { value } = (ev as CustomEvent<{ value: string }>).detail;
  printEvent("m-search z-input", { value });
  if (search.value !== value) search.value = value;
});
search.addEventListener("z-search", (ev) => printEvent("m-search z-search", (ev as CustomEvent).detail));
search.addEventListener("z-clear", () => printEvent("m-search z-clear", {}));

// ── 宫格 ────────────────────────────────────────────────────
document.querySelectorAll<MGridItem>("m-grid-item").forEach((item) => {
  item.addEventListener("z-click", (ev) => {
    // 禁用项不该发事件 —— 如果这里打出一条，说明 disabled 没拦住
    printEvent("m-grid-item z-click", { label: host<MGridItem>(ev, "m-grid-item")?.label });
  });
});

// ── 单元格 ──────────────────────────────────────────────────
document.querySelectorAll<MCell>("m-cell").forEach((cell) => {
  cell.addEventListener("z-click", (ev) => {
    printEvent("m-cell z-click", (ev as CustomEvent).detail);
    if (cell.id === "pickCell") picker.open = true;
    if (cell.id === "amountCell") kb.open = true;
  });
});

// ── 标签（受控：选中态由宿主写回） ──────────────────────────
const chips = document.getElementById("chips");
chips?.addEventListener("z-click", (ev) => {
  const target = (ev.target as HTMLElement).closest("m-chip");
  if (!target) return;
  printEvent("m-chip z-click", { label: target.getAttribute("label") });
  for (const c of chips.querySelectorAll("m-chip")) c.removeAttribute("selected");
  target.setAttribute("selected", "");
});

// ── 卡片：点击与长按是两个事件 ──────────────────────────────
for (const card of document.querySelectorAll("m-card")) {
  for (const name of ["z-click", "z-longpress"]) {
    card.addEventListener(name, () => {
      const title = card.querySelector(".ex-card-hd")?.textContent ?? "卡片";
      printEvent(`m-card ${name}`, { title, ...(name === "z-longpress" ? { hold: "800ms" } : {}) });
    });
  }
}

// ── 折叠面板 / 列表 / 空状态 ────────────────────────────────
document.querySelector("m-collapse")?.addEventListener("z-toggle", (ev) => {
  printEvent("m-collapse z-toggle", (ev as CustomEvent).detail);
});
document.querySelector("m-list")?.addEventListener("z-loadmore", () => {
  printEvent("m-list z-loadmore", {});
});

// ── 底部导航（受控）：只会发 z-change，高亮要宿主写回 ────────
const TABBAR: TabbarItem[] = [
  { key: "home", label: "首页" },
  { key: "order", label: "订单", badge: 12 },
  { key: "stock", label: "库存" },
  { key: "me", label: "我的" },
];

const tabbar = document.getElementById("tabbar") as MTabbar | null;
if (tabbar) {
  // 本仓属性是**反射**的：给 `items`（Array）
  // 赋值会顺手把 attribute 写成 `[object Object]`，随后的 parse 失败让 items 变成字符串，
  // 整个 TabBar 渲染成 0 高。
  tabbar.setAttribute("items", JSON.stringify(TABBAR));
  tabbar.setAttribute("active", "home");
  tabbar.addEventListener("z-change", (ev) => {
    const key = (ev as CustomEvent<{ key: string }>).detail.key;
    printEvent("m-tabbar z-change", { key });
    tabbar.setAttribute("active", key);
  });
}

document.getElementById("fab")?.addEventListener("z-click", () => {
  printEvent("m-floating-button z-click", {});
});

// ── 操作条无需接线 ──────────────────────────────────────────
// inline / fixed 是纯属性，写上去就生效 —— 这一格没有 JS 才是对的。

// ── 下拉刷新（受控）：什么时候收起转圈由宿主决定 ────────────
const refreshEl = document.getElementById("refresh");
if (refreshEl) {
  refreshEl.addEventListener("z-refresh", () => {
    printEvent("m-pull-refresh z-refresh", {});
    refreshEl.setAttribute("refreshing", "");
    window.setTimeout(() => refreshEl.removeAttribute("refreshing"), 900);
  });
}

// ── 底部动作面板 ────────────────────────────────────────────
const sheet = document.getElementById("sheet") as MActionSheet | null;
document.getElementById("sheetOpen")?.addEventListener("click", () => {
  if (!sheet) return;
  const actions: MActionSheetAction[] = [
    { label: "修改数量", value: "qty" },
    { label: "复制门店", value: "copy" },
    { label: "删除门店", value: "remove", danger: true },
  ];
  sheet.actions = actions;
  sheet.setAttribute("visible", "");
  printEvent("m-action-sheet open", { actions: actions.length });
});
sheet?.addEventListener("z-select", (ev) => {
  printEvent("m-action-sheet z-select", (ev as CustomEvent<{ value: string | number }>).detail);
});
sheet?.addEventListener("z-action-sheet-close", () => {
  sheet.removeAttribute("visible");
});

// ── 步进器 ──────────────────────────────────────────────────
const steppers = [document.getElementById("step1"), document.getElementById("step2")] as MStepper[];
steppers.forEach((s) => {
  s.addEventListener("z-change", (ev) => {
    const d = (ev as CustomEvent<{ value: number; prev: number }>).detail;
    printEvent(`m-stepper z-change #${s.id}`, d);
    // 小数步长不该出现 0.30000000000000004 —— 出现就是浮点噪声漏到宿主了
    if (!Number.isInteger(d.value) && String(d.value).length > 6) {
      printEvent("⚠️ 浮点噪声", { raw: String(d.value) });
    }
  });
});

// ── 选择器（受控） ──────────────────────────────────────────
const picker = document.getElementById("picker") as MPicker;
picker.options = [
  { value: "hz", label: "杭州" },
  { value: "nb", label: "宁波" },
  { value: "wz", label: "温州" },
];
picker.value = "";
picker.addEventListener("z-confirm", (ev) => {
  const d = (ev as CustomEvent<{ value: string; label: string }>).detail;
  printEvent("m-picker z-confirm", d);
  picker.value = d.value; // 受控：宿主回写
  (document.getElementById("pickCell") as MCell).value = d.label;
});
picker.addEventListener("z-cancel", (ev) => printEvent("m-picker z-cancel", (ev as CustomEvent).detail));

// ── 左滑单元格 ──────────────────────────────────────────────
document.querySelectorAll<HTMLElement>("m-swipe-cell").forEach((el) => {
  // 拦截是**宿主的选择**，不是组件的默认行为。
  // 给三行都绑拦截，会让「滑开新行时上一行自动收起」也被拦住 —— 看的人会以为组件坏了。
  const demosVeto = el.id === "sw1";

  for (const name of ["z-swipe-open", "z-swipe-close", "z-before-close"]) {
    el.addEventListener(name, (e) => {
      if (name === "z-before-close" && demosVeto) {
        (e as CustomEvent).preventDefault();
        if (!el.hasAttribute("data-confirmed")) {
          el.setAttribute("data-confirmed", "");
          printEvent("m-swipe-cell z-before-close 已拦截", { willCloseIn: "1s" });
          setTimeout(() => {
            el.removeAttribute("data-confirmed");
            (el as HTMLElement & { close(): void }).close();
          }, 1000);
          return;
        }
      }
      printEvent(`m-swipe-cell ${name}`, {});
    });
  }
  el.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest<HTMLElement>("[slot='actions']");
    if (btn) printEvent("m-swipe-cell 操作", { label: btn.textContent?.trim(), row: btn.dataset.tag });
  });
});

// ── 索引条 ──────────────────────────────────────────────────
document.getElementById("ib")?.addEventListener("z-index-change", (ev) => {
  printEvent("m-index-bar z-index-change", (ev as CustomEvent).detail);
});

// ── 数字键盘 ────────────────────────────────────────────────
const kb = document.getElementById("kb") as
  | (HTMLElement & { open: boolean; value: string })
  | null;
const amountCell = document.getElementById("amountCell") as MCell | null;
kb?.addEventListener("z-input", (ev) => {
  const d = (ev as CustomEvent<{ value: string }>).detail;
  if (amountCell) amountCell.value = d.value;
  printEvent("m-number-keyboard z-input", d);
});
kb?.addEventListener("z-delete", (ev) => {
  const d = (ev as CustomEvent<{ value: string }>).detail;
  if (amountCell) amountCell.value = d.value || "0.00";
  printEvent("m-number-keyboard z-delete", d);
});
kb?.addEventListener("z-extra", (ev) => {
  printEvent("m-number-keyboard z-extra（确定）", (ev as CustomEvent).detail);
  if (kb) kb.open = false;
});

// ── 上传（受控） ────────────────────────────────────────────
const up = document.getElementById("up") as MUploader;
up.addEventListener("z-select", (ev) => {
  const { files } = (ev as CustomEvent<{ files: MUploadFile[] }>).detail;
  printEvent("m-uploader z-select", { count: files.length, names: files.map((f) => f.name) });
  // `File.name` / `.size` 是原型上的 getter（不可枚举），
  // 展开运算符拿不到 —— 列表里会是一串 `{url: ""}`。
  up.files = [...up.files, ...files.map((f) => ({ name: f.name, url: f.url ?? "" }))].slice(0, up.max);
});
up.addEventListener("z-remove", (ev) => {
  const { index } = (ev as CustomEvent<{ index: number }>).detail;
  printEvent("m-uploader z-remove", { index });
  up.files = up.files.filter((_, i) => i !== index);
});

// ── 拍摄入口（受控 + 预览） ─────────────────────────────────
// 组件只管「选/拍 + 压缩 + 上报」，缩略图要宿主自己造 URL 再回写 `files`：
// 这样「传上去之后换成服务端地址」也只有一处要改。
const upShot = document.getElementById("up-shot") as MUploader;
const shotUrls = new Map<string, string>();
upShot.addEventListener("z-select", (ev) => {
  const { files, source } = (ev as CustomEvent<{ files: File[]; source: string }>).detail;
  printEvent("m-uploader z-select（拍摄）", {
    source,
    count: files.length,
    names: files.map((f) => f.name),
    kb: files.reduce((n, f) => n + f.size, 0) / 1024,
  });
  const next = files.map((f) => {
    const url = URL.createObjectURL(f);
    shotUrls.set(url, url);
    return { name: f.name, url };
  });
  upShot.files = [...upShot.files, ...next].slice(0, upShot.max);
});
upShot.addEventListener("z-remove", (ev) => {
  const { index } = (ev as CustomEvent<{ index: number }>).detail;
  const gone = upShot.files[index];
  // blob URL 不 revoke 会一直占着内存直到刷新；连拍十几张时是真问题
  if (gone?.url && shotUrls.has(gone.url)) {
    URL.revokeObjectURL(gone.url);
    shotUrls.delete(gone.url);
  }
  upShot.files = upShot.files.filter((_, i) => i !== index);
});

// ── 录像（同一套受控口径，回写时多一个 type: "video"） ──────────
const upVideo = document.getElementById("up-video") as MUploader;
upVideo.addEventListener("z-select", (ev) => {
  const { files, source } = (ev as CustomEvent<{ files: File[]; source: string }>).detail;
  printEvent("m-uploader z-select（录像）", {
    source,
    sizeMB: +(files.reduce((n, f) => n + f.size, 0) / 1048576).toFixed(1),
  });
  upVideo.files = [
    ...upVideo.files,
    ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f), type: "video" as const })),
  ].slice(0, upVideo.max);
});
// 超限的文件不会进列表，只在这里出现一次；不监听它就等于
// 「用户点了录像、什么都没发生」—— 这正是组件要当场说清的那类失败。
upVideo.addEventListener("z-reject", (ev) => {
  const { files, limit } = (ev as CustomEvent<{ files: File[]; limit: number }>).detail;
  printEvent("m-uploader z-reject（超限）", {
    names: files.map((f) => f.name),
    limitMB: +(limit / 1048576).toFixed(0),
  });
});

// ── 商城件（2026-11-24）──────────────────────────────────────
const ck1 = document.getElementById("ck1") as MCheckbox;
ck1?.addEventListener("z-change", (ev) => printEvent("m-checkbox z-change", (ev as CustomEvent).detail));

const pay = document.getElementById("pay") as MRadioGroup;
pay?.addEventListener("z-change", (ev) => printEvent("m-radio-group z-change", (ev as CustomEvent).detail));

const otabs = document.getElementById("otabs") as MTabs;
otabs?.addEventListener("z-change", (ev) => printEvent("m-tabs z-change", (ev as CustomEvent).detail));

document.querySelectorAll("m-goods-card").forEach((el) => {
  el.addEventListener("z-click", (ev) => printEvent("m-goods-card z-click", (ev as CustomEvent).detail));
  el.addEventListener("z-add", (ev) => printEvent("m-goods-card z-add", (ev as CustomEvent).detail));
});

const cbar = document.getElementById("cbar") as MCheckoutBar;
cbar?.addEventListener("z-check-all", (ev) => printEvent("m-checkout-bar z-check-all", (ev as CustomEvent).detail));
cbar?.addEventListener("z-submit", (ev) => printEvent("m-checkout-bar z-submit", (ev as CustomEvent).detail));

// ── 轮播与规格弹层（2026-11-24）──────────────────────────────
const bnr = document.getElementById("bnr") as MSwiper;
bnr?.addEventListener("z-change", (ev) => printEvent("m-swiper z-change", (ev as CustomEvent).detail));

const sku = document.getElementById("sku") as MSkuPicker;
const skuCell = document.getElementById("skuCell") as MCell;
if (sku) {
  sku.groups = "颜色:米白,岩灰|尺码:250ml,500ml";
  // 米白 500ml 那一行库存 0：选中米白后 500ml 会置灰
  sku.skus = [
    { specs: { 颜色: "米白", 尺码: "250ml" }, price: 128, stock: 6 },
    { specs: { 颜色: "米白", 尺码: "500ml" }, price: 198, stock: 0 },
    { specs: { 颜色: "岩灰", 尺码: "250ml" }, price: 138, stock: 2 },
    { specs: { 颜色: "岩灰", 尺码: "500ml" }, price: 208, stock: 1 },
  ];
  skuCell?.addEventListener("z-click", () => sku.open());
  sku.addEventListener("z-change", (ev) => printEvent("m-sku-picker z-change", (ev as CustomEvent).detail));
  sku.addEventListener("z-confirm", (ev) => printEvent("m-sku-picker z-confirm", (ev as CustomEvent).detail));
}

// ── 大图查看与倒计时（2026-11-24）──────────────────────────────
const mpv = document.getElementById("mpv") as MImagePreview;
if (mpv) {
  document.querySelectorAll<HTMLElement>(".mpv-thumb").forEach((thumb) => {
    thumb.addEventListener("click", () => mpv.open(Number(thumb.dataset.idx ?? 0)));
  });
  mpv.addEventListener("z-change", (ev) => printEvent("m-image-preview z-change", (ev as CustomEvent).detail));
  mpv.addEventListener("z-close", (ev) => printEvent("m-image-preview z-close", (ev as CustomEvent).detail));
}

const cdEnd = document.getElementById("cdEnd") as MCountdown;
cdEnd?.addEventListener("z-end", () => printEvent("m-countdown z-end", { id: "cdEnd" }));

// ── 优惠券（2026-11-24）──────────────────────────────────────
const cp1 = document.getElementById("cp1") as MCoupon;
cp1?.addEventListener("z-action", (ev) => printEvent("m-coupon z-action", (ev as CustomEvent).detail));
cp1?.addEventListener("z-click", (ev) => printEvent("m-coupon z-click", (ev as CustomEvent).detail));
const cp3 = document.getElementById("cp3") as MCoupon;
cp3?.addEventListener("z-click", (ev) => printEvent("m-coupon z-click", (ev as CustomEvent).detail));

// 本页自己的接线先就绪，壳后挂 —— 任何一条接线抛错都不连累导航。
// 被画框时（`?embed=1`）壳会自己去掉页头与侧栏，本页不需要知道自己在不在画框里。
initShell();
