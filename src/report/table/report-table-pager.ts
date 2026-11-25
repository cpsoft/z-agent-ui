// [WHY 2026-11-25] 从 table-render.ts 拆出：分页器与表头/表体无关，且它自带
// 一套"什么时候不画"的判据（只有一页 / 空表 / server 模式），混在渲染层里
// 会让那个文件同时承担两套互相看不见的规则。

import { html } from "../../core/index.js";
import { esc } from "./report-table-types.js";

// ═══════════════════════════════════════════════════════════
// Pager
// ═══════════════════════════════════════════════════════════

/** 分页器渲染需要从组件读的状态（结构化满足，避免渲染层反向依赖元素类）。 */
export interface PagerHost {
  pageSize: number;
  pageSizeOptions: string;
  pageMode: "client" | "server";
  pagerTotalText: string;
  pagerPageText: string;
  pagerSizeText: string;
  pagerSizeLabel: string;
  prevPageText: string;
  nextPageText: string;
}

/** 分页器上的候选档位：去重、升序，并保证含当前行数（脚本写的 30 也要能选回来）。 */
export function pagerSizeChoices(host: PagerHost): number[] {
  const list = host.pageSizeOptions
    .split(",")
    .map((s) => Math.trunc(Number(s.trim())))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (host.pageSize > 0) list.push(host.pageSize);
  return [...new Set(list)].sort((a, b) => a - b);
}

export function renderPager(p: PagedViewLike, host: PagerHost): string {
  if (!(host.pageSize > 0)) return "";
  const sizes = pagerSizeChoices(host);
  const picker = sizes.length > 1;
  // [WHY 只有一页就不画] 「共 4 条 · 第 1 / 1 页」加两个禁用按钮，占一行高度却没有任何
  // 可执行动作 —— 短表卡（KPI 级数据）本来就不高，这一行纯属噪音。
  // server 模式例外：页数由宿主决定，组件手里恒为 1，画出来才有的点。
  const noNav = host.pageMode !== "server" && p.pageCount <= 1;
  if (noNav && !picker) return "";
  // [WHY 有下拉时「一页」也要画] 30 行数据按每页 50 行只有 1 页 —— 而用户恰恰要
  // 把它改成 10 行。按老规则整条分页栏会消失，「改行数」的入口就只在数据已经
  // 比一页多时才存在。真正该省的是**空表**上的那一行。
  if (picker && p.totalRows === 0 && p.rows.length === 0) return "";
  const info = `${host.pagerTotalText.replace("{n}", String(p.totalRows))} · ${host.pagerPageText
    .replace("{p}", String(p.page))
    .replace("{c}", String(p.pageCount))}`;
  const btn = (go: "prev" | "next", text: string, disabled: boolean): string =>
    `<button type="button" class="z-rpt__pager-btn" data-page-go="${go}"${
      disabled ? " disabled" : ""
    } part="pager-button">${esc(text)}</button>`;
  // 档位下拉：`<select>` 原生实现即可 —— 键盘、触屏、无障碍语义都是浏览器给的，
  // 自绘一个「点开才出选项」的浮层只会在表格底部被裁切（卡片有 overflow）。
  const sizeSel = picker
    ? `<span class="z-rpt__pager-size"><select data-page-size part="pager-size-select"
         aria-label="${esc(host.pagerSizeLabel)}">${sizes
        .map(
          (n) =>
            `<option value="${n}"${n === host.pageSize ? " selected" : ""}>${esc(
              host.pagerSizeText.replace("{n}", String(n)),
            )}</option>`,
        )
        .join("")}</select></span>`
    : "";
  return html`
      <div class="z-rpt__pager" part="pager">
        <span class="z-rpt__pager-info" part="pager-info">${esc(info)}</span>
        <div class="z-rpt__pager-right">
          ${sizeSel}
          ${noNav ? "" : html`<div class="z-rpt__pager-btns">
            ${btn("prev", host.prevPageText, p.page <= 1)}${btn("next", host.nextPageText, p.page >= p.pageCount)}
          </div>`}
        </div>
      </div>
    `;
}

/** 只用到四个字段，避免渲染层 import 分页模块的完整类型。 */
interface PagedViewLike {
  page: number;
  pageCount: number;
  totalRows: number;
  rows: unknown[];
}
