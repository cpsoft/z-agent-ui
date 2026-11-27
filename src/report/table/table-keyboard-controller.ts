import type { ReactiveController } from "../../core/index.js";
import {
  gridIntent,
  resolveCell,
  roveByKey,
  roveTo,
  sameCell,
  type CellPos,
  type GridBounds,
} from "../../primitives/index.js";

export interface TableKeyboardHost {
  readonly shadowRoot: ShadowRoot | null;
  hasOpenPopover(): boolean;
  closePopovers(): void;
}

/**
 * `<z-report-table>` 键盘网格导航与重渲染焦点恢复控制器（ReactiveController）。
 *
 * 托管单元格游标、可排序表头水平 roving、重渲染后的焦点回位（排序表头 / 分页控件），
 * 在 `hostUpdated()` 自动恢复停靠点与焦点。
 */
export class TableKeyboardController implements ReactiveController {
  private readonly _host: TableKeyboardHost;
  private _cursor: CellPos | null = null;
  private _refocusThKey: string | null = null;
  private _refocusSelector: string | null = null;

  constructor(host: TableKeyboardHost) {
    this._host = host;
  }

  scheduleRefocusTh(key: string | null): void {
    this._refocusThKey = key;
  }

  scheduleRefocusSelector(selector: string | null): void {
    this._refocusSelector = selector;
  }

  hostUpdated(): void {
    this.applyCursor();
    this.restoreFocus();
  }

  handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Escape" && this._host.hasOpenPopover()) {
      this._host.closePopovers();
      return;
    }

    const th = (e.target as HTMLElement).closest?.(".z-rpt__th--sortable") as HTMLElement | null;
    if (th) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        th.click();
        return;
      }
      if (roveByKey(this._sortableThs(), th, e.key, { wrap: false, axis: "horizontal" })) {
        e.preventDefault();
      }
      return;
    }

    const td = (e.target as HTMLElement).closest?.(".z-rpt__td") as HTMLElement | null;
    if (!td) return;
    const intent = gridIntent(e.key, e);
    if (!intent) return;
    const rowEl = td.parentElement as HTMLElement | null;
    const rows = this._gridRows();
    const row = rowEl ? rows.indexOf(rowEl) : -1;
    const col = rowEl ? Array.from(rowEl.children).indexOf(td) : -1;
    if (row < 0 || col < 0) return;

    const from = { row, col };
    const bounds = this._gridBounds(rows);
    const next = resolveCell(from, intent, bounds);
    e.preventDefault();
    if (sameCell(next, from)) return;

    const target = this._cellAt(rows, next);
    if (!target) return;
    this._cursor = next;
    roveTo(target, this._allCells(rows));
  }

  applyCursor(): void {
    const rows = this._gridRows();
    if (!rows.length) return;
    const bounds = this._gridBounds(rows);
    const cursor = this._cursor;
    const want =
      cursor && cursor.row < bounds.rows && cursor.col < bounds.cols ? cursor : { row: 0, col: 0 };
    const target = this._cellAt(rows, want);
    if (target) roveTo(target, this._allCells(rows), { focus: false });
  }

  restoreFocus(): void {
    const thKey = this._refocusThKey;
    const selector = this._refocusSelector;
    this._refocusThKey = null;
    this._refocusSelector = null;

    if (thKey) {
      const th = this._host.shadowRoot?.querySelector<HTMLElement>(
        `.z-rpt__th[data-key="${thKey}"]`,
      );
      if (th) {
        roveTo(th, this._sortableThs());
        return;
      }
    }
    if (!selector) return;
    const el = this._host.shadowRoot?.querySelector<HTMLElement>(selector);
    if (el && !(el as HTMLButtonElement).disabled) {
      el.focus();
      return;
    }
    const other = /data-page-go="prev"/.test(selector)
      ? '[data-page-go="next"]'
      : /data-page-go="next"/.test(selector)
        ? '[data-page-go="prev"]'
        : null;
    const fallback = other ? this._host.shadowRoot?.querySelector<HTMLElement>(other) : null;
    if (fallback && !(fallback as HTMLButtonElement).disabled) fallback.focus();
  }

  private _gridRows(): HTMLElement[] {
    return Array.from(this._host.shadowRoot?.querySelectorAll<HTMLElement>("tbody .z-rpt__row") ?? []);
  }

  private _gridBounds(rows: HTMLElement[]): GridBounds {
    let cols = 0;
    for (const r of rows) cols = Math.max(cols, r.children.length);
    return { rows: rows.length, cols };
  }

  private _cellAt(rows: HTMLElement[], pos: CellPos): HTMLElement | null {
    return (rows[pos.row]?.children[pos.col] as HTMLElement | undefined) ?? null;
  }

  private _allCells(rows: HTMLElement[]): HTMLElement[] {
    return rows.flatMap((r) => Array.from(r.children) as HTMLElement[]);
  }

  private _sortableThs(): HTMLElement[] {
    return Array.from(
      this._host.shadowRoot?.querySelectorAll<HTMLElement>(".z-rpt__th--sortable") ?? [],
    );
  }
}
