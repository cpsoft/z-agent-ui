// [WHY] 图片 [[2026-08-11-W17-data]] [2026-08-11] night-hawk:
// lazy(IO)/fit/fallback/placeholder + preview 灯箱（overlayManager 栈 + Esc + 滚动锁 + 缩放）。
// happy-dom 无 IO/自然尺寸 → 守卫退化（chart.test.ts IO mock 先例）。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import { pushOverlay, removeOverlay, lockScroll, unlockScroll } from "../../primitives/index.js";
import imageCSS from "./image.css?raw";


export class ZImage extends BaseElement {
  static styles = imageCSS;

  @property({ type: String }) src = "";
  @property({ type: String }) alt = "";
  @property({ type: String }) fit: "fill" | "contain" | "cover" | "none" = "cover";
  @property({ type: Boolean }) lazy = false;
  @property({ type: Boolean }) preview = false;
  @property({ type: Boolean }) zoom = false;
  @property({ type: String }) fallback = "";
  @property({ type: String }) placeholder = "";
  // [WHY] 灯箱尺寸: 默认按原图（自然尺寸上限 90vw/80vh）
  @property({ type: String }) lightboxWidth = "";

  private _loaded = false;
  private _failed = false;
  private _shouldLoad = false; // lazy 待加载
  private _io: IntersectionObserver | null = null;
  private _boxOpen = false;
  private _zoomLevel = 1;

  render(): string {
    // [WHY] lazy 未触发前不渲染真实 img（渲染即加载）: 占位兜底保持尺寸
    const pendingLazy = this.lazy && !this._shouldLoad;
    let inner: string;
    if (pendingLazy) {
      inner = `<div class="z-image__placeholder" part="placeholder">${this.placeholder ? escapeAttr(this.placeholder) : ""}</div>`;
    } else if (this._failed && this.fallback) {
      inner = `<div class="z-image__fallback" part="fallback">${escapeAttr(this.fallback)}</div>`;
    } else {
      // [WHY] img 必须始终渲染（渲染即加载），否则 lazy 触发/非 lazy 带 placeholder
      // 时永远停在占位态、img 永不创建（冒烟 count=0 根因）; 未 loaded 时叠加
      // 占位遮罩，loaded 后重渲染移除
      const overlay = !this._loaded && this.placeholder
        ? `<div class="z-image__placeholder z-image__placeholder--overlay" part="placeholder">${escapeAttr(this.placeholder)}</div>`
        : "";
      inner = `<img class="z-image__img" part="img" src="${escapeAttr(this.src)}" alt="${escapeAttr(this.alt)}" style="object-fit:${this.fit}" ${this.preview ? `data-preview` : ""} />${overlay}`;
    }
    const previewBtn = this.preview && this._loaded
      ? `<button type="button" class="z-image__preview-btn" part="preview-btn" aria-label="Preview">${PREVIEW_ICON}</button>`
      : "";
    // [WHY] 灯箱在组件 shadow 内渲染（fixed 定位对 viewport 生效,shadow 无碍）
    const box = this._boxOpen
      ? `<div class="z-image__box" part="lightbox" role="dialog" aria-modal="true">
          <div class="z-image__box-imgwrap" part="lightbox-imgwrap">
            <img class="z-image__box-img" part="lightbox-img" src="${escapeAttr(this.src)}" alt="${escapeAttr(this.alt)}" style="transform:scale(${this._zoomLevel})" />
          </div>
          <button type="button" class="z-image__box-close" part="lightbox-close" aria-label="Close"><svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4l8 8M12 4l-8 8"/></svg></button>
        </div>`
      : "";
    return html`<div class="z-image" part="root">${inner}${previewBtn}${box}</div>`;
  }

  updated(): void {
    // [WHY] 按节点引用重绑（[[web-components-render-pitfalls]] 陷阱 2）
    const img = this.shadowRoot!.querySelector<HTMLImageElement>(".z-image__img");
    if (img) {
      img.addEventListener("load", this._onLoad);
      img.addEventListener("error", this._onError);
    }
    const box = this.shadowRoot!.querySelector<HTMLElement>(".z-image__box");
    if (box && !box.dataset.bound) {
      box.dataset.bound = "";
      box.addEventListener("click", this._onBoxClick);
      const closeBtn = box.querySelector<HTMLElement>(".z-image__box-close");
      closeBtn?.addEventListener("click", (e) => {
        e.stopPropagation();
        this._closeBox();
      });
    }
    const btn = this.shadowRoot!.querySelector<HTMLElement>(".z-image__preview-btn");
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "";
      btn.addEventListener("click", this._onPreviewClick);
    }

    // [WHY] lazy 策略: 注册 IO 观察宿主（进入视口才换真实 src）;
    // IO 不可用或未 lazy 时立即加载（无 IO 分支须补一次渲染把占位换成 img）
    if (!this.lazy || this._shouldLoad) return;
    if (typeof IntersectionObserver === "undefined") {
      this._shouldLoad = true;
      this.requestUpdate();
      return;
    }
    this._io?.disconnect();
    this._io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          this._io?.disconnect();
          this._io = null;
          this._shouldLoad = true;
          this.requestUpdate();
        }
      },
      { rootMargin: "200px" }
    );
    this._io.observe(this);
  }

  // [WHY] load/error 状态不入响应式属性（防宿主重渲染销毁 img）:
  // 直接 _loaded/_failed 翻转 + requestUpdate,img 重建后事件重绑。
  // 已加载守卫: 重建 img 会再次触发 load → 无限重渲染循环（冒烟实测按钮反复 detach）
  private _onLoad = (): void => {
    if (this._loaded) return;
    this._loaded = true;
    this._failed = false;
    this.emit("z-load", { src: this.src });
    this.requestUpdate();
  };

  private _onError = (): void => {
    if (this._failed) return;
    this._failed = true;
    this.emit("z-error", { src: this.src });
    this.requestUpdate();
  };

  private _onPreviewClick = (e: Event): void => {
    e.stopPropagation();
    this._openBox();
  };

  private _openBox(): void {
    if (this._boxOpen) return;
    this._boxOpen = true;
    this._zoomLevel = 1;
    pushOverlay(this);
    lockScroll();
    document.addEventListener("keydown", this._onKeydown);
    this.requestUpdate();
    this.emit("z-click", { src: this.src });
  }

  private _closeBox(): void {
    if (!this._boxOpen) return;
    this._boxOpen = false;
    removeOverlay(this);
    unlockScroll();
    document.removeEventListener("keydown", this._onKeydown);
    this.requestUpdate();
  }

  private _onBoxClick = (): void => {
    // [WHY] 缩放态点击不关闭（拖移式缩放窗口交互）; 点击遮罩/图片本体关闭
    if (this._zoomLevel > 1) {
      this._zoomLevel = 1;
      this.requestUpdate();
      return;
    }
    this._closeBox();
  };

  // [WHY] 灯箱 Esc: 由 overlayManager 文档级 handler 调 close(); 缩放键另行监听
  close(): void {
    this._closeBox();
  }

  get closeOnEscape(): boolean {
    return this._boxOpen;
  }

  private _onKeydown = (e: KeyboardEvent): void => {
    if (!this._boxOpen) return;
    if (e.key === "+" || e.key === "=") {
      this._zoomLevel = Math.min(4, this._zoomLevel + 0.5);
      this.requestUpdate();
    } else if (e.key === "-") {
      this._zoomLevel = Math.max(0.5, this._zoomLevel - 0.5);
      this.requestUpdate();
    } else if (e.key === "0") {
      this._zoomLevel = 1;
      this.requestUpdate();
    }
  };

  disconnectedCallback(): void {
    this._io?.disconnect();
    this._io = null;
    if (this._boxOpen) {
      removeOverlay(this);
      unlockScroll();
      this._boxOpen = false;
    }
    super.disconnectedCallback();
  }
}

const PREVIEW_ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="3"/><path d="M13.5 13.5L10 10"/></svg>';

defineElement("z-image", ZImage);
