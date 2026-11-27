import type { ReactiveController } from "../../core/index.js";
import type { ZOption } from "../option/Option.js";

export interface ZSelectOptionSpec {
  value: string;
  label: string;
  disabled?: boolean;
}

export type ZSelectSearchMode = "frontend" | "backend";

export type RemoteSearchMethod = (
  query: string,
) => void | ZSelectOptionSpec[] | Promise<ZSelectOptionSpec[]>;

export interface SearchInputContext {
  searchMode: ZSelectSearchMode;
  remoteMethod: RemoteSearchMethod | null;
  isOpen: () => boolean;
  setLoading: (loading: boolean) => void;
  applySpecs: (specs: ZSelectOptionSpec[]) => void;
  onLocalFilter: () => void;
  onSearchEmit: (query: string) => void;
}

const REMOTE_SEARCH_DELAY = 300;

/**
 * `<z-select>` 搜索与选项变更观察控制器（ReactiveController）。
 *
 * 托管查询词、远程防抖定时器与子节点 MutationObserver，宿主断开时自动清理，
 * 避免定时器泄漏或悬空观察者。
 */
export class OptionSearchController implements ReactiveController {
  private _query = "";
  private _timer: number | null = null;
  private _observer: MutationObserver | null = null;

  get query(): string {
    return this._query;
  }

  hostDisconnected(): void {
    this.clearTimer();
    this.stopObserving();
  }

  reset(): void {
    this._query = "";
    this.clearTimer();
  }

  clearTimer(): void {
    if (this._timer !== null) {
      window.clearTimeout(this._timer);
      this._timer = null;
    }
  }

  filter(options: ZOption[], searchable: boolean): ZOption[] {
    if (!searchable || !this._query) return options;
    const q = this._query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    );
  }

  handleInput(value: string, ctx: SearchInputContext): void {
    this._query = value;
    if (ctx.searchMode === "backend") {
      this.clearTimer();
      this._timer = window.setTimeout(() => {
        this._timer = null;
        this._runRemoteSearch(ctx);
      }, REMOTE_SEARCH_DELAY);
    } else {
      ctx.onLocalFilter();
    }
  }

  observeHost(host: HTMLElement, onChange: () => void): void {
    if (this._observer) return;
    this._observer = new MutationObserver(() => onChange());
    this._observer.observe(host, { childList: true });
  }

  stopObserving(): void {
    this._observer?.disconnect();
    this._observer = null;
  }

  private _runRemoteSearch(ctx: SearchInputContext): void {
    const query = this._query;
    const result = ctx.remoteMethod ? ctx.remoteMethod(query) : undefined;

    if (result && typeof (result as Promise<unknown>).then === "function") {
      ctx.setLoading(true);
      (result as Promise<ZSelectOptionSpec[]>)
        .then((specs) => {
          // 防竞态：下拉已关闭或查询词已变时丢弃过期结果
          if (!ctx.isOpen() || this._query !== query || !Array.isArray(specs)) return;
          ctx.applySpecs(specs);
        })
        .catch(() => {
          // 远程搜索失败时保留现有选项
        })
        .finally(() => {
          if (ctx.isOpen() && this._query === query) ctx.setLoading(false);
        });
    }

    ctx.onSearchEmit(query);
  }
}
