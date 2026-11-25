// [WHY] 2026-10-25 系统审计：从 report-card.ts（853 行）按职责拆出
// 职责：卡壳（头部/状态条/错误态/按钮）与各卡种卡体（指标/文本/图片）的 HTML 生成，纯函数。

import { escapeAttr, escapeHtml, html } from "../../core/index.js";
import type { CardAction } from "../core/report-card.js";
import { formatKpi, kpiColorMode, kpiDelta, kpiRaw, kpiTone } from "../core/report-kpi.js";
import { imageFit, imagePlaceholder, isUsableImageUrl } from "../core/report-image.js";
import { parseRichLines, type TextSpan } from "../core/report-text.js";
import type { ChartQueryData } from "../core/data-source.js";
import type { CardKind, ReportChart } from "../core/types.js";

/** 各动作的按钮文案。 */
export const ACTION_LABEL: Record<CardAction, string> = {
  export: "导出",
  expand: "放大",
  refresh: "刷新",
  detail: "查看明细",
  edit: "编辑",
};

function spanHtml(sp: TextSpan): string {
  const t = escapeHtml(sp.text);
  switch (sp.kind) {
    case "bold":
      return `<strong>${t}</strong>`;
    case "italic":
      return `<em>${t}</em>`;
    case "code":
      return `<code>${t}</code>`;
    default:
      return t;
  }
}

/** 渲染一帧所需的全部输入（元素侧从自身属性/内部状态快照出来）。 */
export interface CardRenderCtx {
  showTitle: boolean;
  datasetName: string;
  actions: CardAction[];
  expanded: boolean;
  loading: boolean;
  error: string;
  data: ChartQueryData | null;
  kpiPrev: number | null;
  updatedAt: string;
  // 状态条 / 按钮文案（全部可覆盖，便于宿主统一 i18n）
  collapseText: string;
  waitingText: string;
  updatingText: string;
  doneText: string;
  failedText: string;
  errorText: string;
  retryText: string;
  loadingText: string;
  emptyText: string;
  /** 导出/明细按钮的禁用判定用（与卡面同源的导出行，惰性求值） */
  exportRows: () => Record<string, unknown>[];
}

export function headHtml(ctx: CardRenderCtx, chart: ReportChart, hasData: boolean): string {
  const title =
    ctx.showTitle && chart.title
      ? `<span class="hd__title" title="${escapeAttr(chart.title)}">${escapeHtml(chart.title)}</span>`
      : "";
  const tag =
    hasData && ctx.datasetName
      ? `<span class="hd__tag" part="dataset">${escapeHtml(ctx.datasetName)}</span>`
      : "";
  const acts = visibleActions(ctx.actions, hasData);
  if (!title && !tag && !acts.length) return "";
  const btns = acts.map((a) => btnHtml(ctx, a)).join("");
  return html`<header class="hd">${title}${tag}<span class="hd__spacer"></span>${btns}</header>`;
}

/** 本次实际渲染的按钮：先按 `actions` 顺序，再去掉当前卡不该有的。
 *  文本/图片卡没有任何数据动作（导出/刷新/明细都不成立），只留放大。
 *
 *  [为什么明细卡也保留「查看明细」] 它的表和探索器看起来重复，但探索器多了加条件、
 *  分页、独立导出。React 版（ChartCard）一直是这样，元素版在这里"优化"掉会造成
 *  两种渲染器行为不一致 —— 迁移期最不该出现的就是这种差异。 */
export function visibleActions(actions: CardAction[] | null, hasData: boolean): CardAction[] {
  const seen = new Set<string>();
  return (actions ?? []).filter((a) => {
    if (seen.has(a)) return false; // 宿主传重复项不该渲染两个按钮
    seen.add(a);
    if (!hasData && a !== "expand") return false;
    return true;
  });
}

function btnHtml(ctx: CardRenderCtx, a: CardAction): string {
  const label = a === "expand" && ctx.expanded ? ctx.collapseText : ACTION_LABEL[a];
  const disabled = btnDisabled(ctx, a) ? " disabled" : "";
  return `<button type="button" class="btn" data-act="${a}"${disabled}>${escapeHtml(label)}</button>`;
}

function btnDisabled(ctx: CardRenderCtx, a: CardAction): boolean {
  if (a === "expand") return false;
  if (ctx.loading) return true;
  if (a === "refresh") return false;
  // 导出 / 明细都需要数据
  return ctx.exportRows().length === 0;
}

export function statusHtml(ctx: CardRenderCtx): string {
  let text: string;
  let cls = "status";
  if (ctx.error) {
    // 有旧数据时卡体仍显示旧值，文案要说清楚「你看到的是上一次的」
    text = ctx.data ? ctx.failedText : ctx.errorText;
    cls += " status--warn";
  } else if (ctx.loading) {
    text = ctx.updatingText;
  } else if (ctx.updatedAt) {
    text = `${ctx.doneText} ${ctx.updatedAt}`;
  } else {
    text = ctx.waitingText;
  }
  return `<div class="${cls}" role="status" part="status">${escapeHtml(text)}</div>`;
}

export function errorBarHtml(ctx: CardRenderCtx): string {
  return html`<div class="err" role="alert" part="error">
      <span class="err__msg">${escapeHtml(ctx.error)}</span>
      <button type="button" class="btn btn--link" data-act="retry">${escapeHtml(ctx.retryText)}</button>
    </div>`;
}

export function errorPlaceholderHtml(ctx: CardRenderCtx): string {
  return html`<div class="state state--error" role="alert" part="error">
      <span class="err__msg">${escapeHtml(ctx.error)}</span>
      <button type="button" class="btn" data-act="retry">${escapeHtml(ctx.retryText)}</button>
    </div>`;
}

export function bodyHtml(ctx: CardRenderCtx, chart: ReportChart, kind: CardKind): string {
  if (kind === "text") return textHtml(ctx, chart);
  if (kind === "image") return imageHtml(chart);
  // [WHY 有上次结果时不显示「加载中」] 自动刷新、点列头排序都会重新取数。把旧内容
  // 整块换成「加载中」再换回来，观感上是每次刷新整块闪一下；放大中的卡还会被拆开
  // 重建（图表动画重播）。状态条已经写了「正在更新…」，卡体保留旧值更稳。
  if (ctx.data) {
    if (kind === "kpi") return kpiHtml(ctx, chart);
    // chart / table / detail：子树由 updated() 命令式挂载
    return `<div class="mount" data-mount></div>`;
  }
  if (ctx.error) return errorPlaceholderHtml(ctx);
  if (ctx.loading) return `<div class="state">${escapeHtml(ctx.loadingText)}</div>`;
  return `<div class="state">${escapeHtml(ctx.emptyText)}</div>`;
}

// ---- 指标卡 ----

export function kpiHtml(ctx: CardRenderCtx, chart: ReportChart): string {
  const cfg = chart.kpi;
  const cur = kpiRaw(chart, ctx.data?.result ?? null);
  const mode = kpiColorMode(cfg);

  let toneClass = "";
  if (mode === "thresholds") {
    const tone = kpiTone(cur, cfg?.thresholds);
    if (tone !== "normal") toneClass = ` kpi--${tone}`;
  }

  const valueText = escapeHtml(formatKpi(cur, cfg?.format));

  let deltaHtml = "";
  if (mode === "compare") {
    const d = kpiDelta(cur, ctx.kpiPrev);
    deltaHtml = `<span class="kpi__delta kpi__delta--${d.kind}" part="delta">${escapeHtml(d.text)}</span>`;
  }

  const label = chart.measures?.[0]
    ? escapeHtml(chart.measures[0].alias || chart.measures[0].field)
    : "";

  return html`
      <div class="kpi${toneClass}" part="kpi">
        <span class="kpi__value" part="value">${valueText}</span>
        ${deltaHtml}
        ${label ? `<span class="kpi__label">${label}</span>` : ""}
      </div>
    `;
}

// ---- 文本卡（全程不产生 innerHTML 原文：解析结果逐片转义后再拼） ----

export function textHtml(ctx: CardRenderCtx, chart: ReportChart): string {
  const cfg = chart.text;
  const lines = parseRichLines(cfg?.content ?? "");
  if (!lines.length) return `<div class="state">${escapeHtml(ctx.emptyText)}</div>`;

  const cls = [
    "text",
    cfg?.align === "center" ? "text--center" : "",
    cfg?.align === "right" ? "text--right" : "",
    cfg?.size === "sm" ? "text--sm" : "",
    cfg?.size === "lg" ? "text--lg" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = lines
    .map((spans) => `<div class="text__line">${spans.map(spanHtml).join("")}</div>`)
    .join("");
  return `<div class="${cls}" part="text">${body}</div>`;
}

// ---- 图片卡 ----

export function imageHtml(chart: ReportChart): string {
  const cfg = chart.image;
  const url = cfg?.url;
  const caption = cfg?.caption
    ? `<div class="image__caption">${escapeHtml(cfg.caption)}</div>`
    : "";
  if (!isUsableImageUrl(url)) {
    return html`<div class="image" part="image"><div class="image__ph">${escapeHtml(imagePlaceholder(url))}</div>${caption}</div>`;
  }
  const fit = imageFit(cfg?.fit);
  // alt 缺省用 caption：读屏用户至少能听到这是什么图
  const alt = escapeAttr(cfg?.alt ?? cfg?.caption ?? "");
  return html`
      <div class="image" part="image">
        <img class="image__img" src="${escapeAttr(url!)}" alt="${alt}" style="object-fit:${fit}" part="img" />
        ${caption}
      </div>
    `;
}
