// <z-pagination> 分页：current / total / pageSize 算页码，可挂「共 N 条」与每页条数，翻页发 z-change、换条数发 z-size-change。
import { COPY, BaseElement, html, property, escapeAttr, controlHeight, type ControlSize } from "../../core/index.js";
import paginationCSS from "./pagination.css?raw";

const PREV_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4l-4 4 4 4"/></svg>`;
const NEXT_SVG = `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>`;

export class ZPagination extends BaseElement {
  static styles = paginationCSS;

  @property({ type: Number }) current = 1;
  // [WHY] 向后兼容：total 保持「总页数」语义；totalRecords>0 时页数由记录数推导
  // See: wiki/planning/TASKS/2026-08-10-pagination-info/task_plan.md
  @property({ type: Number }) total = 1;
  @property({ type: Number, attribute: "page-size" }) pageSize = 10;
  @property({ type: Number }) siblings = 1;
  @property({ type: Number, attribute: "total-records" }) totalRecords = 0;
  @property({ type: Boolean, attribute: "show-info" }) showInfo = false;
  @property({ type: String, attribute: "info-template" }) infoTemplate = "Total {total} items";
  @property({ type: Boolean, attribute: "show-page-size" }) showPageSize = false;
  @property({ type: Array, attribute: false }) pageSizes: number[] = [10, 20, 50, 100];
  @property({ type: String, attribute: "size-label" }) sizeLabel = COPY.pageSizeSuffix;
  // [WHY] i18n: 文案可配置,见 [[REQ-001]]
  @property({ type: String }) navLabel = COPY.pagination;
  @property({ type: String }) prevLabel = COPY.prevPage;
  @property({ type: String }) nextLabel = COPY.nextPage;
  // 控件高度档位（xs 24 / sm 28 / md 32 / lg 36，随密度缩放）。默认 sm = 既有高度。
  // [WHY 分页按钮也要 size] 它常与表格工具栏的输入框/按钮并排；只有它能切档，
  // 才能让「工具栏一整行同高」成立 —— 这正是 B3b 要解决的症状。
  @property({ type: String }) size: ControlSize = "sm";

  protected willUpdate(): void {
    this.style.setProperty("--_h", controlHeight(this.size));
  }

  get pageCount(): number {
    if (this.totalRecords > 0) {
      return Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
    }
    return Math.max(1, this.total);
  }

  render(): string {
    const pages = this._getPages();
    const info = this.showInfo
      ? html`<span class="z-pagination__info" part="info">${this._renderInfo()}</span>`
      : "";
    const sizes = this.showPageSize
      ? html`
          <label class="z-pagination__sizes" part="sizes">
            <select aria-label="${escapeAttr(this.sizeLabel)}">
              ${this._getSizeOptions()
                .map(s =>
                  html`<option value="${s}" ${s === this.pageSize ? "selected" : ""}>${s}${this.sizeLabel}</option>`,
                )
                .join("")}
            </select>
          </label>
        `
      : "";

    return html`
      <nav class="z-pagination" part="root" role="navigation" aria-label="${escapeAttr(this.navLabel)}">
        ${info}
        <button type="button" class="z-pagination__btn z-pagination__prev" part="prev"
                ${this.current <= 1 ? "disabled" : ""} aria-label="${escapeAttr(this.prevLabel)}"
                data-action="prev">
          ${PREV_SVG}
        </button>
        ${pages.map((p) => {
          if (p === "...") {
            return html`<span class="z-pagination__ellipsis" part="ellipsis">...</span>`;
          }
          const activeCls = p === this.current ? "z-pagination__item--active" : "";
          return html`
            <button type="button"
                    class="z-pagination__btn z-pagination__item ${activeCls}"
                    part="item"
                    data-page="${p}"
                    aria-current="${p === this.current ? "page" : "false"}">
              ${p}
            </button>
          `;
        }).join("")}
        <button type="button" class="z-pagination__btn z-pagination__next" part="next"
                ${this.current >= this.pageCount ? "disabled" : ""} aria-label="${escapeAttr(this.nextLabel)}"
                data-action="next">
          ${NEXT_SVG}
        </button>
        ${sizes}
      </nav>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.shadowRoot!.addEventListener("click", this._onClick);
    this.shadowRoot!.addEventListener("change", this._onChange);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("click", this._onClick);
    this.shadowRoot!.removeEventListener("change", this._onChange);
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] totalRecords/pageSize 变化后 current 可能越界，钳制但不自动 emit
    const max = this.pageCount;
    if (this.current < 1) {
      this.current = 1;
    } else if (this.current > max) {
      this.current = max;
    }
  }

  private _getPages(): (number | "...")[] {
    const { current, siblings } = this;
    const total = this.pageCount;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const rangeStart = Math.max(2, current - siblings);
    const rangeEnd = Math.min(total - 1, current + siblings);

    const pages: (number | "...")[] = [1];
    if (rangeStart > 2) pages.push("...");
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < total - 1) pages.push("...");
    if (total > 1) pages.push(total);

    return pages;
  }

  private _getSizeOptions(): number[] {
    const list = this.pageSizes.filter(s => typeof s === "number" && s > 0);
    return list.includes(this.pageSize) ? list : [...list, this.pageSize];
  }

  private _renderInfo(): string {
    const start = this.totalRecords > 0 ? (this.current - 1) * this.pageSize + 1 : 0;
    const end = this.totalRecords > 0 ? Math.min(this.current * this.pageSize, this.totalRecords) : 0;
    const values: Record<string, string> = {
      total: String(this.totalRecords),
      current: String(this.current),
      pageSize: String(this.pageSize),
      start: String(start),
      end: String(end),
    };
    return this.infoTemplate.replace(
      /\{(total|current|pageSize|start|end)\}/g,
      (match, key: string) => values[key] ?? match,
    );
  }

  private _onClick = (e: Event): void => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-page], [data-action]");
    if (!btn) return;

    let page = this.current;
    const action = btn.dataset.action;
    if (action === "prev") {
      page = Math.max(1, this.current - 1);
    } else if (action === "next") {
      page = Math.min(this.pageCount, this.current + 1);
    } else if (btn.dataset.page) {
      page = Number(btn.dataset.page);
    }

    if (page !== this.current && page >= 1 && page <= this.pageCount) {
      this.current = page;
      this.emit("z-change", {
        page,
        pageSize: this.pageSize,
        total: this.pageCount,
        totalRecords: this.totalRecords,
      });
    }
  };

  private _onChange = (e: Event): void => {
    const select = (e.target as HTMLElement).closest<HTMLSelectElement>(".z-pagination__sizes select");
    if (!select) return;
    const size = Number(select.value);
    if (!Number.isFinite(size) || size <= 0 || size === this.pageSize) return;

    this.pageSize = size;
    const page = Math.min(this.current, this.pageCount);
    if (page !== this.current) this.current = page;

    this.emit("z-size-change", { pageSize: size });
    this.emit("z-change", {
      page,
      pageSize: size,
      total: this.pageCount,
      totalRecords: this.totalRecords,
    });
  };
}

customElements.define("z-pagination", ZPagination);
