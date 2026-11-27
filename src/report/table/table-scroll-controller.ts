import type { ReactiveController } from "../../core/index.js";
import { handleVirtualScroll, type VirtualState } from "./table-virtual.js";

export interface TableScrollHost {
  readonly shadowRoot: ShadowRoot | null;
  readonly virtual: boolean;
  readonly rowHeight: number;
  readonly maxHeight: string;
  getPagedRowCount(): number;
  requestUpdate(): void;
}

/**
 * `<z-report-table>` 滚动感知阴影与行虚拟滚动控制器（ReactiveController）。
 *
 * 在 `hostUpdated()` 自动重新绑定重建后的 `.z-rpt__wrapper`，同步左右冻结列滚动阴影与虚拟窗口。
 */
export class TableScrollController implements ReactiveController {
  private readonly _host: TableScrollHost;
  private _wrapper: HTMLElement | null = null;
  readonly virtualState: VirtualState = { scrollTop: 0, viewportH: 0, start: 0, end: 0 };

  constructor(host: TableScrollHost) {
    this._host = host;
  }

  hostUpdated(): void {
    this._bindWrapper();
    this.refresh();
  }

  hostDisconnected(): void {
    if (this._wrapper) {
      this._wrapper.removeEventListener("scroll", this.refresh);
      this._wrapper = null;
    }
  }

  private _bindWrapper(): void {
    const wrapper = this._host.shadowRoot?.querySelector(".z-rpt__wrapper") as HTMLElement | null;
    if (!wrapper || wrapper === this._wrapper) return;
    if (this._wrapper) {
      this._wrapper.removeEventListener("scroll", this.refresh);
    }
    this._wrapper = wrapper;
    if (this._host.virtual && this.virtualState.scrollTop > 0) {
      wrapper.scrollTop = this.virtualState.scrollTop;
    }
    wrapper.addEventListener("scroll", this.refresh, { passive: true });
  }

  refresh = (): void => {
    const wrapper = this._host.shadowRoot?.querySelector(".z-rpt__wrapper") as HTMLElement | null;
    if (!wrapper) return;
    const scrolledLeft = wrapper.scrollLeft > 0;
    const scrolledRight = wrapper.scrollLeft + wrapper.clientWidth < wrapper.scrollWidth - 1;
    wrapper.classList.toggle("z-rpt__wrapper--scrolled-left", scrolledLeft);
    wrapper.classList.toggle("z-rpt__wrapper--scrolled-right", scrolledRight);
    if (
      this._host.virtual &&
      handleVirtualScroll(
        wrapper,
        this._host.getPagedRowCount(),
        this._host.rowHeight,
        this._host.maxHeight,
        this.virtualState,
      )
    ) {
      this._host.requestUpdate();
    }
  };
}
