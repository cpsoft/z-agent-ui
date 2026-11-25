// 画框预览：把「整页 demo」嵌进文档页。
//
// iframe 是独立文档，不继承外壳的 data-theme / data-density；改用 MutationObserver
// 盯 <html> 上的属性变化同步。

const ATTRS = ["data-theme", "data-density"] as const;

/**
 * 让画框高度跟着内容走（`data-fit`）。
 *
 * 固定高度只有两种结局：框比内容高 → 底下一条大空白；框比内容矮 → 框里再滚一次。
 * 内容高度在 `embed` 模式下可测（同源），所以直接量。
 *
 * 量之前必须先把高度置 0：`scrollHeight` 不会小于视口高度，而 iframe 的视口就是它当前的
 * height。直接量会形成正反馈（永远缩不回去）。置 0 顺带把依赖视口的样式也归零。
 */
const FIT_MAX = 2200;
const FIT_MIN = 240;

function fitOne(frame: HTMLIFrameElement): void {
  if (frame.dataset.fit !== "1") return;
  const doc = frame.contentDocument;
  if (!doc?.documentElement) return;
  const measure = (): void => {
    frame.style.height = "0px";
    const h = doc.documentElement.scrollHeight;
    if (!h) {
      frame.style.height = `${FIT_MIN}px`;
      return;
    }
    frame.style.height = `${Math.min(FIT_MAX, Math.max(FIT_MIN, h))}px`;
  };
  measure();
  // 第一遍改高度会让内容重排（换行位置、flex 分配都变了），下一帧再取稳的那次
  requestAnimationFrame(measure);
}

function syncOne(frame: HTMLIFrameElement): void {
  const doc = frame.contentDocument;
  if (!doc) return;
  const root = document.documentElement;
  for (const attr of ATTRS) {
    const value = root.getAttribute(attr);
    if (value) doc.documentElement.setAttribute(attr, value);
    else doc.documentElement.removeAttribute(attr);
  }
  // 换主题/密度会改行高与字号，量过的高度就不再是内容高度
  fitOne(frame);
}

/** 给页面上所有 `.demo-frame` 接上「跟随外壳主题/密度」。 */
export function wireFrames(): void {
  const frames = Array.from(document.querySelectorAll<HTMLIFrameElement>("iframe.demo-frame"));
  if (frames.length === 0) return;

  for (const frame of frames) {
    if (frame.dataset.frameWired) continue;
    frame.dataset.frameWired = "1";
    // 已经加载完的（缓存命中时 load 不会再触发）先同步一次
    if (frame.contentDocument?.readyState === "complete") syncOne(frame);
    frame.addEventListener("load", () => syncOne(frame));
  }

  const observer = new MutationObserver(() => frames.forEach(syncOne));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: [...ATTRS] });
}

import { FRAMED_DEMOS } from "./nav.js";

/** 把某一页该画框的整页 demo 全渲染出去（一次调用搞定，页面脚本不必自己过滤）。 */
export function mountFrames(host: HTMLElement | null, pageId: string): void {
  if (!host) return;
  const list = FRAMED_DEMOS.filter((d) => d.framedBy === pageId);
  host.innerHTML = list
    .map((d) => frameHtml({ src: "./" + d.file, height: d.height, label: d.title, fit: d.fit }))
    .join("");
  wireFrames();
}

/**
 * 画框里的 src：一律带上 `?embed=1`。
 *
 * `embed=1` 让被画的页去掉页头/侧栏（见 shell.ts `isEmbedded`）。
 * 如果由每个调用点自己拼，9 个画框里迟早有几个漏掉 —— 而漏掉的表现是「这个画框特别挤」，
 * 没人会把它当成 bug 报上来。
 *
 * 单独打开那个链接时不带 embed：那时它是一整页，需要导航。
 */
function frameSrc(src: string, query?: string): string {
  const [beforeHash, hash = ""] = src.split("#");
  const [path, bareQuery = ""] = beforeHash.split("?");
  const qs = new URLSearchParams(bareQuery);
  qs.set("embed", "1");
  if (query) new URLSearchParams(query).forEach((v, k) => qs.set(k, v));
  return `${path}?${qs.toString()}${hash ? "#" + hash : ""}`;
}

/**
 * 画框里的地址：补上 `?embed=1` 与切片参数。
 * 页面自己换 `src`（如组件浏览器切换单件）时用它，别在调用点重拼一遍 query。
 */
export function frameUrl(src: string, query?: string): string {
  return frameSrc(src, query);
}

/**
 * 生成一段画框标记：高度可调，标题标明「这是另一个真实页面」。
 *
 * `query` 给切片用（如 `only=m-picker` 只画那一个组件）；
 * `fit` 让高度跟着内容走（见 `fitOne`），此时 `height` 只作未加载时的占位。
 */
export function frameHtml(opts: {
  src: string;
  height: number;
  label: string;
  note?: string;
  query?: string;
  fit?: boolean;
}): string {
  const note = opts.note ? `<p class="demo-frame__note">${opts.note}</p>` : "";
  return `<div class="demo-frame-wrap">
  <div class="demo-frame__bar"><b>${opts.label}</b><a href="${opts.src}" target="_blank" rel="noopener">单独打开 ↗</a></div>
  ${note}
  <iframe class="demo-frame" src="${frameSrc(opts.src, opts.query)}" style="height:${opts.height}px"${opts.fit ? ' data-fit="1"' : ""} loading="lazy" title="${opts.label}"></iframe>
</div>`;
}
