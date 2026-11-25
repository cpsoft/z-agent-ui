// 所有壳页面的唯一实现：侧边栏、主题/语言切换、Show Code 折叠、锚点滚动高亮。
// 分类子页各自按需注册组件并接线。
import "../src/theme/index.js";
import { themeController } from "../src/theme/index.js";
// 壳头部有 z-button（语言/主题切换），提前注册
import "../src/components/button/index.js";
import { getLang, setLang, updatePage, t } from "./i18n.js";
import { mountSearch } from "./search.js";

import {
  PAGES,
  FAMILIES,
  GROUP_TITLES,
  GROUP_TITLES_EN,
  LEGACY_PAGES,
  MERGING,
} from "./nav.js";
import type { PageDef, PageGroup } from "./nav.js";

// 侧栏只做一件事：把 `nav.ts` 按组渲染出来。导航事实只此一份。

/** 当前页文件名，如 "basics.html"（本地 file:// 与 vite 下均取 pathname 末段） */
function currentPage(): string {
  return location.pathname.split("/").pop() || "index.html";
}

/** 页面标题：中文用 title，英文用 titleEn（没有就回落中文，宁可混排也不留空） */
function pageLabel(p: PageDef): string {
  return getLang() === "en" ? (p.titleEn ?? p.title) : p.title;
}

function groupLabel(g: PageGroup): string {
  return getLang() === "en" ? GROUP_TITLES_EN[g] : GROUP_TITLES[g];
}

/** 组内计数：只对「能算准」的页给数字 —— 算不准就不显示，不写死。 */
function pageCount(p: PageDef): number | null {
  if (p.id === "components") return FAMILIES.reduce((n, f) => n + f.members.length, 0);
  return null;
}

const GROUP_ORDER: PageGroup[] = ["overview", "start", "layer", "internal"];

function pageLink(p: PageDef, cur: string): string {
  const active = p.file.split("/").pop() === cur ? " demo-sidebar__link--active" : "";
  const n = pageCount(p);
  const count = n === null ? "" : ` <span class="demo-sidebar__count">${n}</span>`;
  return `<a class="demo-sidebar__link demo-sidebar__link--page${active}" href="./${p.file}">${pageLabel(p)}${count}</a>`;
}

/**
 * 搬迁期入口（临时）。
 *
 * 新导航指向的 14 页里有一半还没搬完内容，而旧页仍在磁盘上。
 * 如果侧栏只列新页，那 25 个旧页就「谁也不知道怎么进」——正是这次要修的病。
 * 列出旧页并标出去向，D2 删完文件后 LEGACY_PAGES / MERGING 清空，这一组自动消失。
 */
function migrationHtml(cur: string): string {
  if (LEGACY_PAGES.length === 0 && MERGING.length === 0) return "";
  const rows = [
    ...LEGACY_PAGES.map((f) => ({ file: f, into: "" })),
    ...MERGING.map((m) => ({ file: m.file, into: m.into })),
  ].map(({ file, into }) => {
    const active = file === cur ? " demo-sidebar__link--active" : "";
    const tail = into
      ? `<span class="demo-sidebar__to">→ ${into}</span>`
      : `<span class="demo-sidebar__to">旧分类</span>`;
    return `<a class="demo-sidebar__link demo-sidebar__link--sub${active}" href="./${file}"><span>${file.replace(/\.html$/, "")}</span>${tail}</a>`;
  });
  return `<div class="demo-sidebar__title demo-sidebar__title--temp">搬迁期入口（临时）</div>\n${rows.join("\n")}`;
}

function buildSidebarHtml(): string {
  const cur = currentPage();
  const parts: string[] = [];
  for (const g of GROUP_ORDER) {
    // 只列 live：planned 的页文件还不存在，列出来就是死链
    const pages = PAGES.filter((p) => p.group === g && p.inNav !== false && p.status === "live");
    if (pages.length === 0) continue;
    parts.push(`<div class="demo-sidebar__title">${groupLabel(g)}</div>`);
    for (const p of pages) parts.push(pageLink(p, cur));
  }
  parts.push(migrationHtml(cur));
  return parts.filter(Boolean).join("\n");
}

/** 语言切换后整条侧栏要重画（标题是我们渲染的，不是 data-i18n 注入的） */
function renderSidebar(): void {
  const el = document.querySelector<HTMLElement>("[data-shell-sidebar]");
  if (el) el.innerHTML = buildSidebarHtml();
}

// ── Header wiring ─────────────────────────────────────

function updateDynamicTexts(): void {
  updatePage();
  // Sync datepicker locale with the demo language（仅 overlays 页存在这些元素）
  const dpSingle = document.getElementById("datepicker-single") as any;
  const dpRange = document.getElementById("datepicker-range") as any;
  if (dpSingle && dpRange) {
    const locale = getLang() === "zh" ? "zh-CN" : "en-US";
    dpSingle.locale = locale;
    dpRange.locale = locale;
  }
}

function wireHeader(): void {
  const langToggle = document.getElementById("lang-toggle");
  if (langToggle) {
    langToggle.textContent = getLang() === "en" ? "中" : "EN";
    langToggle.addEventListener("z-click", () => {
      const next = getLang() === "en" ? "zh" : "en";
      setLang(next);
      langToggle.textContent = next === "en" ? "中" : "EN";
      updateDynamicTexts();
      // 侧栏标题与页面名是我们渲染的（不是 data-i18n 注入），必须重画一次
      renderSidebar();
      // 页面自己渲染的内容（首页地图 / 目录）也要重画 —— 用一个事件通知，别让每页都去改切语言按钮
      document.dispatchEvent(new CustomEvent("z-demo-lang", { detail: { lang: next } }));
    });
  }

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    // 2026-09-26: 文案统一走 i18n(common.dark/common.light), 与 makeThemeToggle 一致
    const sync = () => { themeToggle.textContent = themeController.theme === "dark" ? t("common.light") : t("common.dark"); };
    sync();
    themeToggle.addEventListener("z-click", () => {
      themeController.toggle();
      sync();
    });
  }
}

// ── Show Code toggles（各分类页共用的 demo-preview 折叠） ──

function wireCodeToggles(): void {
  document.querySelectorAll(".js-code-toggle").forEach((btn) => {
    btn.addEventListener("z-click", () => {
      const codeBlock = (btn as HTMLElement).closest(".demo-preview")?.querySelector(".demo-preview__code");
      if (!codeBlock) return;
      const visible = codeBlock.classList.toggle("demo-preview__code--visible");
      (btn as HTMLElement).textContent = visible ? t("button.hideCode") : t("button.showCode");
      (btn as HTMLElement).setAttribute("data-i18n", visible ? "button.hideCode" : "button.showCode");
    });
  });
}

// ── 移动端导航（off-canvas 抽屉） ─────────────────────
// 窄屏导航走 off-canvas 抽屉：顶栏汉堡开合 + 遮罩 + Esc + 点击链接自动收起，
// 打开期间锁 body 滚动。

const MOBILE_BREAKPOINT = 768;

function navToggleSvg(): string {
  return `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"/></svg>`;
}

function wireMobileNav(sidebar: HTMLElement | null): void {
  if (!sidebar) return;
  const header = document.querySelector<HTMLElement>(".demo-header");
  if (!header) return;

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "demo-nav-toggle";
  toggle.setAttribute("aria-label", t("common.menu"));
  toggle.setAttribute("data-i18n-attr", "aria-label,common.menu");
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "demo-sidebar");
  toggle.innerHTML = navToggleSvg();
  header.prepend(toggle);
  sidebar.id = "demo-sidebar";

  const mask = document.createElement("button");
  mask.type = "button";
  mask.className = "demo-sidebar-mask";
  mask.setAttribute("aria-label", t("common.closeMenu"));
  mask.setAttribute("data-i18n-attr", "aria-label,common.closeMenu");
  mask.tabIndex = -1;
  document.body.appendChild(mask);

  const setOpen = (open: boolean): void => {
    sidebar.classList.toggle("demo-sidebar--open", open);
    mask.classList.toggle("demo-sidebar-mask--visible", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () => {
    setOpen(!sidebar.classList.contains("demo-sidebar--open"));
  });
  mask.addEventListener("click", () => setOpen(false));

  // 同页锚点点击后收起抽屉（跨页链接会直接跳走，无需处理）
  sidebar.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sidebar.classList.contains("demo-sidebar--open")) setOpen(false);
  });

  // 抽屉打开时窗口被拉宽，若无条件保留 overflow:hidden 会让桌面端无法滚动
  window.addEventListener("resize", () => {
    if (window.innerWidth > MOBILE_BREAKPOINT) setOpen(false);
  });
}

// ── Sidebar：滚动高亮 + 平滑滚动 ─────────────────────

function wireScrollSpy(): void {
  const sidebarLinks = document.querySelectorAll<HTMLAnchorElement>(".demo-sidebar__link");
  const sections = new Map<string, HTMLElement>();
  sidebarLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    if (!href.startsWith("#") || href === "#top") return;
    const el = document.getElementById(href.slice(1));
    if (el) sections.set(href.slice(1), el);
  });
  if (sections.size === 0) return; // index 目录页无本页锚点，跳过

  let sidebarActive: string | null = null;
  function updateSidebar(): void {
    let current: string | null = null;
    const scrollY = window.scrollY + 100;
    sections.forEach((el, id) => {
      if (el.offsetTop <= scrollY) current = id;
    });
    if (current !== sidebarActive) {
      sidebarActive = current;
      sidebarLinks.forEach((link) => {
        const href = link.getAttribute("href")?.slice(1);
        link.style.color = href === current ? "var(--z-color-primary)" : "";
        link.style.fontWeight = href === current ? "500" : "";
      });
    }
  }
  window.addEventListener("scroll", updateSidebar, { passive: true });
  updateSidebar();

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href") || "";
      if (!href.startsWith("#")) return; // 跨页链接正常导航
      e.preventDefault();
      const id = href.slice(1);
      if (id === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    });
  });
}

export interface ShellOptions {
  /** 传入 false 跳过侧边栏渲染（如极简页） */
  sidebar?: boolean;
  /** 传入 false 跳过头部"返回主页"按钮（如 charts 分类页，侧边栏已含 Overview 入口，按钮冗余） */
  backHome?: boolean;
  /** 传入 false 跳过右下角"回到顶部"（画框页不需要，框内自己滚） */
  backToTop?: boolean;
}

/**
 * 画框模式：`?embed=1`。整页 demo 被 `<iframe>` 嵌进文档页时只留内容。
 *
 * 判断放在壳里，不让被画的页面各自读 query：「要不要页头与侧栏」是壳的职责，
 * 各页自己读会漂成多种写法。
 *
 * 去壳：画框里再带一份页头与侧栏，框里就会出现两个侧栏，内容被挤窄。
 */
export function isEmbedded(): boolean {
  return new URLSearchParams(location.search).get("embed") === "1";
}

// ── 页面顶部公共按钮组（返回主页 + 主题切换） ─────────────────────
// 返回主页与主题切换作为子页面公共组件置于页面顶部。
// mountBackHome() 沿用既有调用点(20 个非 shell 子页 + 分类页 initShell), 挂载策略:
//   .demo-header__right → 返回按钮插最前(这些页头部已自带主题切换, 不重复挂)
//   .demo-shell-header  → 插 spacer 之后的右侧组最左; flow-editor 已有 .demo-back 则跳过
//   其余 demo-content 页 → main 右上挂按钮组: 返回主页 + 主题切换(页面未提供 #theme-toggle 时)
//   无 main 兜底 → body 固定悬浮同组
// shell 顶层 Button.js import 顺带注册 z-button; 主页 index.html 不挂。
function makeBackBtn(): HTMLElement {
  const btn = document.createElement("z-button");
  btn.setAttribute("appearance", "outline");
  btn.setAttribute("size", "sm");
  // 移动端顶栏放不下「☰ + brand + 返回 + 版本 + 语言 + 主题」，
  // 由 demo.css 按 .demo-back-btn 在窄屏隐藏（侧边栏抽屉已提供导航入口）
  btn.classList.add("demo-back-btn");
  btn.setAttribute("data-i18n", "common.backHome");
  btn.textContent = t("common.backHome");
  btn.addEventListener("z-click", () => { location.href = "./index.html"; });
  return btn;
}

// 主题切换文案随主题互换(Dark↔Light), 不走 data-i18n — 与分类页头部 theme-toggle 行为一致
function makeThemeToggle(): HTMLElement {
  const btn = document.createElement("z-button");
  btn.setAttribute("appearance", "outline");
  btn.setAttribute("size", "sm");
  btn.classList.add("demo-theme-toggle");
  const sync = () => { btn.textContent = themeController.theme === "dark" ? t("common.light") : t("common.dark"); };
  sync();
  btn.addEventListener("z-click", () => { themeController.toggle(); sync(); });
  return btn;
}

function buildTopActions(): HTMLElement {
  const group = document.createElement("div");
  group.className = "demo-top-actions";
  group.appendChild(makeBackBtn());
  if (!document.getElementById("theme-toggle")) group.appendChild(makeThemeToggle());
  return group;
}

export function mountBackHome(): void {
  // 这个函数是**所有页**都会走到的外壳入口
  // （initShell 调它，8 个整页 demo 直接调它），但它在首页会早退 —— 而首页恰恰最需要搜索：
  // 一站的 118 个组件在首页只摊成一张目录，找一个具体的 tag 比翻侧栏还慢。
  // 「返回主页」在首页当然不该有，搜索不该跟着一起没有。
  mountSearch();
  if (currentPage() === "index.html") return;

  // 被嵌进文档页时，外层已经有导航；框里再来一个返回按钮，
  // 读者会以为那是「从 demo 里退出」。只有 4 个整页 demo 走这条路径（它们不调 initShell，
  // 所以拿不到 initShell 里的 embed 早退），必须在入口这里自己判。
  // 主题 init 不能省：这几页靠它应用 data-theme（幂等，重复调用无害）。
  if (isEmbedded()) {
    themeController.init();
    return;
  }

  // 必须在函数最前面：下面有 `if (shellHeader) { … return; }` 早退分支（带
  // `.demo-shell-header` 的整页 demo 走那条），写在末尾则那几页永远走不到，且不报错。
  // 放在这里而不是只在 initShell：这 8 个整页 demo 只调 mountBackHome()。幂等，重复调用无害。
  mountBackToTop();
  // 兜底 init：独立页(flow-editor 等)未自行调用时, 主题按钮文案与
  // data-theme 会因内部状态未应用而错位(如 light 主题却显示「亮色」); init 已幂等
  themeController.init();
  const right = document.querySelector(".demo-header__right");
  if (right) {
    right.prepend(makeBackBtn());
    return;
  }
  const shellHeader = document.querySelector<HTMLElement>(".demo-shell-header");
  if (shellHeader) {
    if (!shellHeader.querySelector(".demo-back")) {
      const btn = makeBackBtn();
      const spacer = shellHeader.querySelector(".demo-shell-spacer");
      if (spacer) spacer.after(btn);
      else shellHeader.appendChild(btn);
    }
    // 页头无自带主题切换时补挂, 独立页(flow-editor/admin-layout)删除各自
    // 硬编码 Dark 按钮后由此统一提供, 返回/主题行为与分类页 __right 页头一致
    if (!shellHeader.querySelector("#theme-toggle") && !document.getElementById("theme-toggle")) {
      shellHeader.appendChild(makeThemeToggle());
    }
    return;
  }
  const main = document.querySelector("main");
  if (main) {
    if (getComputedStyle(main).position === "static") main.style.position = "relative";
    main.appendChild(buildTopActions());
  } else {
    const group = buildTopActions();
    group.classList.add("demo-top-actions--fixed");
    document.body.appendChild(group);
  }
}

/**
 * 右下角「回到顶部」。
 *
 * 控件页把 8 个家族、20 多个示例排在一页里，长到 3000+ 像素；看完最底下的
 * 移动端示例要回到顶部换一页，只能一路滚回去。这不是「好看一点」的问题 ——
 * 长页面上没有回程，读者就会改用浏览器的后退键，然后离开站点。
 *
 * 三条实现约束，都是为了避免「加了个按钮，反而添乱」：
 *   1. **只在滚动后出现**（>600px）。一进页面就浮着一个按钮，会挡住右下角的内容。
 *   2. **隐藏用 `visibility`，不用 `display:none`** —— 两者都不在 tab 序列里，但 `visibility`
 *      能参与过渡动画；用 `display` 会让按钮每次出现都是「跳」出来的。
 *   3. **尊重 `prefers-reduced-motion`** —— 平滑滚动对前庭敏感的人是眩晕源，直接跳。
 */
export function mountBackToTop(): void {
  if (document.querySelector(".demo-to-top")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "demo-to-top";
  btn.setAttribute("data-i18n-attr", "aria-label,common.toTop");
  btn.setAttribute("aria-label", t("common.toTop"));
  btn.title = t("common.toTop");
  btn.innerHTML =
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 12.5v-9M4 7.5 8 3.5l4 4"/></svg>';
  document.body.appendChild(btn);

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const sync = (): void => btn.classList.toggle("is-visible", window.scrollY > 600);

  btn.addEventListener("click", () => {
    // 平滑滚动是浏览器按像素距离自己定速度的：控件页 15000px 高，
    // 实测从页尾回顶要**约 1.9 秒**（200ms→14233、600ms→3464、1200ms→705、2000ms→10）。
    // 点「回到顶部」却要盯着屏幕等两秒，比直接跳更让人怀疑「是不是没点上」。
    // 阈值：超过三屏就跳，短页仍保留平滑（那里平滑是有用信息，不是拖沓）。
    const far = window.scrollY > window.innerHeight * 3;
    window.scrollTo({ top: 0, behavior: reduce.matches || far ? "auto" : "smooth" });

    // 焦点也回顶部：否则键盘用户按 Tab 会从「按钮所在位置」继续，回到的还是页尾。
    // `preventScroll` 很关键 —— 不带它，focus 会把刚发出的滚动目标再改一次（实测停在 705px）。
    const heading = document.querySelector<HTMLElement>(".demo-main h1, main h1, h1");
    if (heading) {
      if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    }
  });

  let queued = false;
  window.addEventListener(
    "scroll",
    () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        sync();
      });
    },
    { passive: true },
  );

  document.addEventListener("z-demo-lang", () => {
    btn.setAttribute("aria-label", t("common.toTop"));
    btn.title = t("common.toTop");
  });

  sync();
}

/** 初始化共享壳：主题 → 侧边栏 → i18n → 头部按钮 → Show Code → 滚动高亮。页面脚本在 DOM 就绪后调用一次。 */
export function initShell(opts: ShellOptions = {}): void {
  themeController.init();
  const embedded = isEmbedded();
  // 标记放在 <html> 上：CSS 用它整片隐藏页头/侧栏，不需要每个被画的页面自己加类
  if (embedded) document.documentElement.setAttribute("data-embed", "");
  const sidebar = document.querySelector<HTMLElement>("[data-shell-sidebar]");
  renderSidebar();
  updatePage();
  wireHeader();
  if (!embedded && opts.sidebar !== false) wireMobileNav(sidebar);
  // 画框里没有页头，返回主页 / 回到顶部 / 站内搜索都无处安放，一并跳过
  if (!embedded && opts.backHome !== false) mountBackHome();
  if (!embedded && opts.backToTop !== false) mountBackToTop();
  wireCodeToggles();
  wireScrollSpy();
}
