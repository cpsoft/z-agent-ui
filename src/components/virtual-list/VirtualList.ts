// <z-virtual-list> 虚拟列表：items 全量数据加固定 itemHeight，只渲染可视区，renderItem 自定义行。
// [WHY] 虚拟列表 [[2026-08-11-W18-enterprise]] [2026-08-11] night-hawk:
// 固定高度 windowing（spacer + translateY 切片 + overscan）; 滚动时直写 slice
// innerHTML 不走 requestUpdate（[[web-components-render-pitfalls]] 陷阱 2 规避:
// 重渲染会整体替换滚动容器,破坏 scrollTop）。变高项 v1 不支持。
import { COPY, BaseElement, html, property, escapeAttr } from "../../core/index.js";
import virtualListCSS from "./virtual-list.css?raw";


export interface ZVirtualListRenderContext {
  index: number;
  item: unknown;
}

export class ZVirtualList extends BaseElement {
  static styles = virtualListCSS;

  @property({ attribute: false }) items: unknown[] = [];
  @property({ type: Number }) itemHeight = 40;
  @property({ type: Number }) height = 400;
  @property({ type: Number }) overscan = 5;
  // [WHY] renderItem 回调返回 HTML（Table render 先例,调用方负责转义）。
  // 命名不可用 render: 会与 BaseElement.render() 方法冲突（属性访问器覆盖方法）
  @property({ attribute: false }) renderItem: ((item: unknown, index: number) => string) | null = null;
  // [WHY] 多词属性显式 kebab（[[multiword-attribute-kebab]]）
  @property({ type: String, attribute: "empty-text" }) emptyText = COPY.empty;

  private _scroller: HTMLElement | null = null;
  private _lastSyncKey = "";

  render(): string {
    const total = this.items.length;
    if (total === 0) {
      return html`<div class="z-vlist z-vlist--empty" part="root" style="height:${this.height}px">${escapeAttr(this.emptyText)}</div>`;
    }
    return html`<div class="z-vlist" part="root" style="height:${this.height}px">
      <div class="z-vlist__space" style="height:${total * this.itemHeight}px">
        <div class="z-vlist__slice"></div>
      </div>
    </div>`;
  }

  updated(): void {
    // [WHY] 节点引用重绑滚动监听（每次重渲染 scroller 都是新节点）;
    // 仅绑当前节点,旧节点随 innerHTML 销毁无需解绑
    const scroller = this.shadowRoot!.querySelector<HTMLElement>(".z-vlist");
    if (scroller && scroller !== this._scroller) {
      this._scroller = scroller;
      scroller.addEventListener("scroll", this._onScroll);
    }
    // [WHY] items/高度变化后重同步切片（_lastSyncKey 防止重复写入）
    this._syncSlice();
  }

  private _onScroll = (): void => {
    // [WHY] 滚动直写切片,不走 requestUpdate: 重渲染会重建容器并复位 scrollTop
    this._syncSlice();
  };

  private _syncSlice(): void {
    const scroller = this._scroller;
    const slice = scroller?.querySelector<HTMLElement>(".z-vlist__slice");
    if (!scroller || !slice) return;
    const total = this.items.length;
    const itemH = this.itemHeight || 1;
    const scrollTop = scroller.scrollTop;
    const viewH = this.height || scroller.clientHeight || 0;
    const viewRows = Math.max(1, Math.ceil(viewH / itemH));
    const first = Math.floor(scrollTop / itemH);
    let start = Math.max(0, first - this.overscan);
    let end = Math.min(total, first + viewRows + this.overscan);
    // [WHY] 底部钳制: scrollTop 超界（含 overscan 挤压）时 start 可能越过 end,
    // 切片为空 → 保底 viewRows 行整体内移（冒烟/单测 scrollTop 超大值暴露）
    if (end - start < viewRows) start = Math.max(0, end - viewRows);
    const key = `${scrollTop}|${start}|${end}`;
    if (key === this._lastSyncKey) return;
    this._lastSyncKey = key;
    slice.style.transform = `translateY(${start * itemH}px)`;
    let htmlStr = "";
    for (let i = start; i < end; i++) {
      const item = this.items[i];
      htmlStr += this.renderItem
        ? this.renderItem(item, i)
        : `<div class="z-vlist__row" style="height:${itemH}px">${escapeAttr(String(item))}</div>`;
    }
    slice.innerHTML = htmlStr;
  }

  scrollToIndex(index: number): void {
    const scroller = this._scroller;
    if (!scroller) return;
    scroller.scrollTop = index * (this.itemHeight || 1);
    this._syncSlice();
  }

  scrollToOffset(offset: number): void {
    const scroller = this._scroller;
    if (!scroller) return;
    scroller.scrollTop = offset;
    this._syncSlice();
  }
}

customElements.define("z-virtual-list", ZVirtualList);
