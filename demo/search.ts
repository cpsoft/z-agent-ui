// 站内搜索（命令面板）—— 索引在每次打开与语言切换时从 `nav.ts` 与组件清单重建。
// 判据见 tests/unit/demo-search.test.ts：索引与两份事实双向相等，href 目标真实存在。

import { PAGES, FAMILIES } from "./nav.js";
import type { PageDef } from "./nav.js";
import { COMPONENTS } from "./manifest.js";
import { getLang, t } from "./i18n.js";

export type HitKind = "component" | "page" | "family";

export interface Hit {
  kind: HitKind;
  /** 主文本：组件的 tag / 页名 / 家族名 */
  label: string;
  /** 次行说明：一句话摘要，或「页面 · 分组」 */
  hint: string;
  /** 点开去哪 */
  href: string;
  /** 排序分（越大越靠前）。导出是为了让守卫能直接断言「精确命中排第一」 */
  score: number;
  /**
   * 额外关键词（不显示，只参与匹配）：组件是属性名，页面是文件名。
   *
   * 只搜 tag + 摘要时，「记得有个 clearable 但忘了在哪个组件」这种情况
   * 完全搜不到 —— 而那是查文档时最常见的处境。属性名进索引后，`clearable` 能直接命中。
   */
  kw: string;
}

/** 语言变了标题就变了；索引必须重建，否则搜到的还是上一个语言的名字。 */
function lang(): "zh" | "en" {
  return getLang() === "en" ? "en" : "zh";
}

function pageName(p: PageDef): string {
  return lang() === "en" ? (p.titleEn ?? p.title) : p.title;
}

let cache: Hit[] | null = null;

/** 丢掉索引（语言切换后调用）。公开是为了让 UI 侧能显式触发，而不是靠 getter 的副作用。 */
export function resetIndex(): void {
  cache = null;
}

/** 站内可搜索的全部条目。 */
export function indexEntries(): Hit[] {
  if (cache) return cache;
  const out: Hit[] = [];

  // ① 组件：跳详情页。摘要进 hint，于是「搜功能描述」也能命中 —— 记不住 tag 的人比
  //    记得住的人多得多（`z-input` 好记，`z-report-group-table` 谁记得？）
  for (const c of COMPONENTS) {
    out.push({
      kind: "component",
      label: c.tag,
      hint: c.summary,
      href: `./component.html?tag=${encodeURIComponent(c.tag)}`,
      score: 0,
      kw: c.properties.map((p2) => p2.name).join(" "),
    });
  }

  // ② 页面：只收 live（planned 的没有文件，收进来就是死链）
  for (const p of PAGES) {
    if (p.status !== "live") continue;
    out.push({
      kind: "page",
      label: pageName(p),
      hint: p.file,
      href: `./${p.file}`,
      score: 0,
      kw: `${p.file} ${p.id} ${p.group}`,
    });
  }

  // ③ 家族：跳到它所在页的那一节（家族名是使用者的词汇，不是 tag）
  //    [注] 家族只有中文名（`FamilyDef` 没给 titleEn）—— 英文界面下也照用中文，
  //    宁可混排也不杜撰一个没人认的英文名。
  for (const f of FAMILIES) {
    out.push({
      kind: "family",
      label: f.title,
      hint: `${f.page}#${f.section} · ${f.members.length} 个`,
      href: `./${f.page}#${f.section}`,
      score: 0,
      kw: `${f.id} ${f.members.join(" ")}`,
    });
  }

  cache = out;
  return out;
}

/** 同一分数时，组件优先（这是个组件库，人多数时候在找组件）。 */
const KIND_WEIGHT: Record<HitKind, number> = { component: 0, family: 1, page: 2 };

/**
 * 打分：精确 > 前缀 > 包含 > 仅说明文字命中。
 *
 * 分层的结果是可解释的：搜 `z-input` 时它必须排第一，
 * 而不是「因为摘要里也出现了 input，某个表格组件排到前面去了」。
 * 守卫直接断言这两条（精确命中排第一、大小写不敏感）。
 */
function scoreOf(hit: Hit, tokens: string[]): number {
  const label = hit.label.toLowerCase();
  const hint = hit.hint.toLowerCase();
  const kw = hit.kw.toLowerCase();
  let total = 0;
  for (const token of tokens) {
    if (label === token) total += 100;
    else if (label.startsWith(token)) total += 70;
    else if (label.includes(token)) total += 50;
    else if (hint.includes(token)) total += 20;
    // 属性名/文件名命中：排最后。搜 `clearable` 时 z-input 要出现，但不该压过真正叫
    // `z-clearable` 的条目（真有的话，精确命中 100 分自然在前面）。
    else if (kw.includes(token)) total += 10;
    else return 0; // 有一个词没命中就不是候选（多词查询按 AND 处理）
  }
  return total;
}

/**
 * 搜。空查询返回一屏页面（面板刚打开时不应该是一片空白）。
 *
 * 多词按 AND：`input 输` 只留下两者都命中的条目 —— 这比按 OR 更接近人的意图，
 * 也不会因为一个词太常见而把结果淹掉。
 */
export function searchAll(query: string, limit = 12): Hit[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return indexEntries()
      .filter((h) => h.kind === "page")
      .slice(0, limit)
      .map((h) => ({ ...h, score: 0 }));
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: Hit[] = [];
  for (const hit of indexEntries()) {
    const score = scoreOf(hit, tokens);
    if (score > 0) scored.push({ ...hit, score });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_WEIGHT[a.kind] - KIND_WEIGHT[b.kind] ||
      a.label.localeCompare(b.label),
  );
  return scored.slice(0, limit);
}

// ── UI ────────────────────────────────────────────────────────

const TRIGGER_ID = "demo-search-trigger";

function kindLabel(kind: HitKind): string {
  if (kind === "component") return t("search.groupComponents");
  if (kind === "family") return t("search.groupFamilies");
  return t("search.groupPages");
}

/** 组件图标用「标签」字符，视觉上把 tag 与页面名分开（不是装饰：两类条目点击后行为不同）。 */
function kindGlyph(kind: HitKind): string {
  return kind === "component" ? "◇" : kind === "family" ? "▤" : "▸";
}

/**
 * 挂载搜索入口与面板。幂等：`initShell` 可能被调用多次，也可能有页面自己调。
 *
 * 有 8 个整页 demo（admin-layout /
 * flow-editor / h5-editor / pc-form …）只调 `mountBackHome()`、不调 `initShell()`。
 * 「站内搜索」属于页面外壳职责，不该因为入口不同就有的页有、有的页没有。
 */
export function mountSearch(): void {
  if (document.getElementById(TRIGGER_ID)) return;
  const right = document.querySelector<HTMLElement>(".demo-header__right");
  const shellHeader = document.querySelector<HTMLElement>(".demo-shell-header");
  if (!right && !shellHeader) return;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.id = TRIGGER_ID;
  trigger.className = "demo-search-trigger";
  trigger.setAttribute("data-i18n-attr", "aria-label,search.trigger");
  trigger.setAttribute("aria-label", t("search.trigger"));
  trigger.innerHTML =
    `<span class="demo-search-trigger__icon" aria-hidden="true">⌕</span>` +
    `<span class="demo-search-trigger__text" data-i18n="search.trigger">${t("search.trigger")}</span>` +
    `<kbd class="demo-search-trigger__kbd" aria-hidden="true">⌘K</kbd>`;
  if (right) right.prepend(trigger);
  else shellHeader!.appendChild(trigger);

  // 面板挂在 body：放 header 里会被 overflow/z-index 牵连
  const root = document.createElement("div");
  root.className = "demo-search";
  root.hidden = true;
  root.innerHTML = `
    <div class="demo-search__backdrop" data-search-close></div>
    <div class="demo-search__panel" role="dialog" aria-modal="true"
         aria-label="${t("search.trigger")}" data-i18n-attr="aria-label,search.trigger">
      <input class="demo-search__input" type="text" role="combobox" aria-expanded="true"
             aria-autocomplete="list" aria-controls="demo-search-list" autocomplete="off" spellcheck="false"
             placeholder="${t("search.placeholder")}" data-i18n-attr="placeholder,search.placeholder" />
      <div class="demo-search__hint" aria-hidden="true" data-i18n="search.keyhint">${t("search.keyhint")}</div>
      <ul class="demo-search__list" id="demo-search-list" role="listbox"
          aria-label="${t("search.trigger")}" data-i18n-attr="aria-label,search.trigger"></ul>
      <p class="demo-search__empty" hidden data-i18n="search.empty">${t("search.empty")}</p>
      <p class="demo-search__status" role="status" aria-live="polite"></p>
    </div>`;
  document.body.appendChild(root);

  const input = root.querySelector<HTMLInputElement>(".demo-search__input")!;
  const list = root.querySelector<HTMLUListElement>(".demo-search__list")!;
  const emptyEl = root.querySelector<HTMLElement>(".demo-search__empty")!;
  const statusEl = root.querySelector<HTMLElement>(".demo-search__status")!;

  let hits: Hit[] = [];
  let active = 0;

  const render = (): void => {
    const q = input.value;
    hits = searchAll(q);
    active = 0;
    list.innerHTML = hits
      .map((h, i) => {
        const selected = i === 0 ? "true" : "false";
        return (
          `<li class="demo-search__item" role="option" id="demo-search-opt-${i}" aria-selected="${selected}" data-href="${h.href}">` +
          `<span class="demo-search__glyph" aria-hidden="true">${kindGlyph(h.kind)}</span>` +
          `<span class="demo-search__label">${escapeHtml(h.label)}</span>` +
          `<span class="demo-search__kind">${escapeHtml(kindLabel(h.kind))}</span>` +
          (h.hint ? `<span class="demo-search__sub">${escapeHtml(h.hint)}</span>` : "") +
          `</li>`
        );
      })
      .join("");

    emptyEl.hidden = hits.length > 0;
    // 结果数量变化必须能被读屏听到，否则用户敲了字却不知道有没有结果
    statusEl.textContent = hits.length ? t("search.results").replace("{n}", String(hits.length)) : "";
    input.setAttribute("aria-activedescendant", hits.length ? "demo-search-opt-0" : "");
  };

  const setActive = (i: number): void => {
    if (hits.length === 0) return;
    active = (i + hits.length) % hits.length;
    [...list.children].forEach((el, idx) => {
      el.setAttribute("aria-selected", idx === active ? "true" : "false");
    });
    input.setAttribute("aria-activedescendant", `demo-search-opt-${active}`);
    (list.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  };

  const open = (): void => {
    root.hidden = false;
    input.value = "";
    render();
    input.focus();
    document.body.style.overflow = "hidden";
  };

  const close = (): void => {
    if (root.hidden) return;
    root.hidden = true;
    document.body.style.overflow = "";
    trigger.focus();
  };

  const go = (hit: Hit | undefined): void => {
    if (!hit) return;
    location.href = hit.href;
  };

  trigger.addEventListener("click", open);

  input.addEventListener("input", render);

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Enter") { e.preventDefault(); go(hits[active]); }
    else if (e.key === "Escape") { e.preventDefault(); close(); }
    // 面板里唯一的可聚焦件就是输入框；不拦 Tab 的话焦点会跑到
    // 背后的页面上（视觉上还在面板里），读屏用户会「找不到刚才那个列表」。
    else if (e.key === "Tab") { e.preventDefault(); }
  });

  list.addEventListener("click", (e) => {
    const li = (e.target as HTMLElement).closest<HTMLElement>(".demo-search__item");
    if (li) go({ href: li.dataset.href! } as Hit);
  });

  root.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).hasAttribute("data-search-close")) close();
  });

  // ⌘K / Ctrl+K 随时开；`/` 只在没聚焦输入框时开（否则打不出斜杠）
  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      root.hidden ? open() : close();
    } else if (e.key === "/" && !typing && root.hidden) {
      e.preventDefault();
      open();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !root.hidden) close();
  });

  // 语言切换后索引要重建：页面名与家族名分中英，hint 里的「个」也要跟着变
  document.addEventListener("z-demo-lang", () => {
    resetIndex();
    if (!root.hidden) render();
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
