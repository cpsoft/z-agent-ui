// <m-list> 列表容器：滚到底自动取下一页并发 z-loadmore；loading / finished / error 三态由宿主给。
// [WHY] 移动端列表容器：IntersectionObserver 监听底部哨兵元素触发无限滚动
// X5 等老内核无 IO 时降级为 scroll 事件 + 防抖 200ms（任务要求）
// 参考 BaseElement 生命周期：connectedCallback 绑定 / disconnectedCallback 解绑
// [2026-09-15] night-hawk: 创建移动端交互组件
import { BaseElement, html, property, t, escapeHtml, defineElement } from "../../core/index.js";
import mListCSS from "./m-list.css?raw";

export class MList extends BaseElement {
  static styles = mListCSS;

  @property({ type: Boolean }) loading = false;
  @property({ type: Boolean }) finished = false;
  @property({ type: String }) error = "";

  private _observer: IntersectionObserver | null = null;
  private _scrollHandler: (() => void) | null = null;
  private _scrollTarget: Element | null = null;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] IO 优先：现代浏览器内核支持，性能优于 scroll 监听
    if ("IntersectionObserver" in window) {
      this._initObserver();
    } else {
      // [WHY] X5 降级 scroll + 防抖 200ms：避免高频滚动卡顿
      this._setupScrollFallback();
    }
  }

  disconnectedCallback(): void {
    this._cleanup();
    super.disconnectedCallback();
  }

  updated(): void {
    // [WHY] render 重建 DOM，重试按钮是新实例，每次都需重绑事件
    const retryBtn = this.shadowRoot!.querySelector(".m-list__retry");
    if (retryBtn) {
      retryBtn.addEventListener("click", this._onRetryClick);
    }

    // [WHY] loading/finished/error 变化时切换哨兵观察状态
    // loading 中停止观察防止重复触发 z-loadmore
    if (this._observer) {
      const sentinel = this.shadowRoot!.querySelector(".m-list__sentinel");
      if (sentinel) {
        this._observer.disconnect();
        if (!this.loading && !this.finished && !this.error) {
          this._observer.observe(sentinel);
        }
      }
    }
  }

  private _initObserver(): void {
    this._observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && !this.loading && !this.finished && !this.error) {
          this.emit("z-loadmore");
        }
      },
      { root: null, rootMargin: "20px", threshold: 0 },
    );
  }

  private _setupScrollFallback(): void {
    const sc = this._findScrollParent();
    if (!sc) {
      // [WHY] 无可滚动父级时降级监听 window
      this._scrollTarget = document.scrollingElement || document.documentElement;
    } else {
      this._scrollTarget = sc;
    }
    this._scrollHandler = () => {
      if (this._debounceTimer) clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        if (this.loading || this.finished || this.error) return;
        const sentinel = this.shadowRoot!.querySelector(".m-list__sentinel");
        if (!sentinel) return;
        const rect = sentinel.getBoundingClientRect();
        if (rect.top <= (window.innerHeight || document.documentElement.clientHeight) + 20) {
          this.emit("z-loadmore");
        }
      }, 200);
    };
    this._scrollTarget.addEventListener("scroll", this._scrollHandler, { passive: true });
  }

  private _findScrollParent(): Element | null {
    let parent: Element | null = this.parentElement;
    while (parent) {
      const style = getComputedStyle(parent);
      if (/(auto|scroll|overlay)/.test(style.overflowY)) return parent;
      parent = parent.parentElement;
    }
    return null;
  }

  private _cleanup(): void {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._scrollHandler && this._scrollTarget) {
      this._scrollTarget.removeEventListener("scroll", this._scrollHandler);
      this._scrollHandler = null;
      this._scrollTarget = null;
    }
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }

  private _onRetryClick = (): void => {
    this.emit("z-loadmore");
  };


  render(): string {
    let footer = "";
    if (this.error) {
      footer = html`
        <div class="m-list__footer m-list__footer--error" part="footer">
          <span class="m-list__text">${escapeHtml(this.error)}</span>
          <button type="button" class="m-list__retry" part="retry">${escapeHtml(t("retryLoad"))}</button>
        </div>
      `;
    } else if (this.loading) {
      footer = html`
        <div class="m-list__footer" part="footer">
          <span class="m-list__spinner" aria-hidden="true"></span>
          <span class="m-list__text">${escapeHtml(t("loadingDots"))}</span>
        </div>
      `;
    } else if (this.finished) {
      footer = html`
        <div class="m-list__footer" part="footer">
          <span class="m-list__text">${escapeHtml(t("noMore"))}</span>
        </div>
      `;
    }

    return html`
      <div class="m-list" part="root">
        <slot></slot>
        <div class="m-list__sentinel" part="sentinel" aria-hidden="true"></div>
        ${footer}
      </div>
    `;
  }
}

defineElement("m-list", MList);
