// <z-embed> —— 在页面里展示一份完整的 HTML 文档（外部 URL，或内联的 HTML 字符串）。
//
// [WHY 用 iframe 而不是 innerHTML] 内联渲染等于把对方的样式与脚本放进本页 DOM：一份带
// `<style>` 的报告会改掉整页排版，一段脚本能直接读宿主的 localStorage 与 DOM。
// iframe 给的是「独立文档 + 独立解析环境」，这是唯一能同时保住样式与安全的边界。
// 需要展示 HTML 的场合几乎都是「别人的文档」（导出的报告、模型生成的页面），
// 所以这里不是可选的实现细节，是组件存在的理由。
//
// [WHY 默认 sandbox="allow-same-origin" 而不是空] 空 sandbox 会把文档降成 opaque origin，
// 父页面读不到 contentDocument ⇒ `auto-height` 永远测不到高度，只能写死像素。
// allow-same-origin 但**不给 allow-scripts**：静态报告页照常排版、也能被量高，
// 而它一行脚本都跑不起来（没有脚本就没有外发通道）。要跑脚本的页面由宿主显式加
// `sandbox="allow-scripts allow-same-origin"` —— 这个决定属于宿主，不属于组件默认值。
//
// [WHY 内联 html 会剥掉 allow-same-origin] `srcdoc` 文档与父页面**同源**。一旦同时给了
// allow-scripts，"沙箱"就形同虚设：脚本可以 `parent.document` 直接改宿主页面、读宿主存储。
// 这条不交给宿主记 —— 配错了不报错、界面上也看不出来，只能由组件挡。
//
// [WHY 没有 error 态] iframe 的 `error` 事件对 HTTP 4xx/5xx **不触发**（浏览器照样发 load），
// 靠它做「加载失败」只会得到一个永假的判据。所以这里只有三种真实状态：
// 未加载 / 加载中 / 已加载；以及一个诚实的 `timeout`（超时后置 `_stalled` 并 emit `z-timeout`，
// 不谎称「失败」）。宁可少一个状态，也不要给宿主一个看起来能用、实际上永远不亮的开关。
import { BaseElement, html, property, escapeAttr, escapeHtml, t, defineElement } from "../../core/index.js";
import embedCSS from "./embed.css?raw";

/** 未测高时的默认高度（CSS 长度） */
const DEFAULT_HEIGHT = "480px";
/** 等待 load 的兜底时长（ms）。0 = 不设超时。 */
const DEFAULT_TIMEOUT = 15000;
/** lazy 提前量：进入视口前这么多像素就开始加载 */
const LAZY_MARGIN = "200px";

export class ZEmbed extends BaseElement {
  static styles = embedCSS;

  /** 要展示的页面地址。与 `html` 二选一，`html` 优先。 */
  @property({ type: String }) src = "";
  /** 内联文档（完整 HTML 字符串，走 `srcdoc`）。适合展示**已生成**的 HTML。 */
  @property({ type: String }) html = "";
  // [WHY 不写初始化器] `title` 是 HTMLElement 原生属性：字段初始化器会在构造期经原生
  // setter 覆盖 HTML 上解析到的值（[[bug-20260810-title-ctor-attr]]）。用 `!` 断言代替赋值。
  /** iframe 的可访问名称（读屏靠它区分多个嵌入区）。空则退回「嵌入页面」。 */
  @property({ type: String }) title!: string;
  /** 固定高度（CSS 长度）。启用 `auto-height` 后仅在测不到时作为兜底。 */
  @property({ type: String }) height = DEFAULT_HEIGHT;
  /**
   * iframe 的 sandbox 值，空格分隔。默认 `allow-same-origin`（无脚本）。
   * 内联 `html` 模式且带 `allow-scripts` 时，组件会强制去掉 `allow-same-origin`。
   */
  @property({ type: String }) sandbox = "allow-same-origin";
  /** 进入视口才加载（省掉首屏之外的开销）。 */
  @property({ type: Boolean }) lazy = false;
  /** 按文档实际高度伸展宿主（需要能读到 contentDocument，见文件头）。 */
  @property({ type: Boolean, attribute: "auto-height" }) autoHeight = false;
  /** load 兜底时长（ms），0 关闭。 */
  @property({ type: Number }) timeout = DEFAULT_TIMEOUT;

  private _shouldLoad = false;
  private _ready = false;
  private _stalled = false;
  /** 量到的高度（px）。null = 还没量到或不启用 auto-height。 */
  private _measured: number | null = null;
  private _io: IntersectionObserver | null = null;
  private _ro: ResizeObserver | null = null;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  /** 同一实例只警告一次，避免每帧刷屏 */
  private _warned = false;

  render(): string {
    // [WHY 不是只看 _shouldLoad] 非 lazy 时不需要等任何信号，一渲染就该有 iframe。
    // 早先只在 IO 回调里置 _shouldLoad，于是「不 lazy」的组件永远停在占位态 ——
    // 界面上是一块灰框，不报错（被测试里「iframe 不存在」这一条抓住）。
    // 另外两个来源都空时不能落到「渲染一个 src 为空的 iframe」：那等于加载 about:blank，
    // 界面上是一块白框，作者会以为地址写错了。
    const hasSource = !!(this.html || this.src);
    const load = hasSource && (this._shouldLoad || !this.lazy);
    const frame = load ? this._renderFrame() : "";
    const placeholder = load ? "" : this._renderState(t("embedLazy"));
    const overlay = load && !this._ready ? this._renderLoading() : "";
    return html`<div class="z-embed" part="root" style="height:${escapeAttr(this._heightOf())}">
      ${frame}${placeholder}${overlay}
    </div>`;
  }

  private _renderFrame(): string {
    // [WHY 不落 `src`/`srcdoc` 空属性] 两个都空时 attribute 存在会让 iframe 加载 about:blank，
    // 而空属性又躲不过 a11y 检查 —— 这一支在 _renderState 里已经拦掉了。
    const attr = this.html
      ? `srcdoc="${escapeAttr(this.html)}"`
      : `src="${escapeAttr(this.src)}"`;
    return `<iframe class="z-embed__frame" part="frame"
      title="${escapeAttr(this.title || t("embedTitle"))}"
      sandbox="${escapeAttr(this._effectiveSandbox())}"
      referrerpolicy="no-referrer"
      ${attr}></iframe>`;
  }

  private _renderLoading(): string {
    const text = this._stalled ? t("embedTimeout") : t("embedLoading");
    const retry = this._stalled
      ? `<button type="button" class="z-embed__retry" part="retry">${escapeHtml(t("retry"))}</button>`
      : "";
    return `<div class="z-embed__state z-embed__state--overlay" part="state">${escapeHtml(text)}${retry}</div>`;
  }

  private _renderState(text: string): string {
    const hint = this.html || this.src ? text : t("embedNoSource");
    return `<div class="z-embed__state" part="state">${escapeHtml(hint)}</div>`;
  }

  /** 宿主高度：测量值优先，否则用 `height`。 */
  private _heightOf(): string {
    if (this.autoHeight && this._measured !== null) return `${this._measured}px`;
    return this.height;
  }

  /**
   * 生效的 sandbox。
   *
   * 内联文档与父页面同源：允许脚本时再给 `allow-same-origin`，脚本就能越过沙箱操作宿主，
   * 所以这一项被强制去掉。外部 URL 不做处理 —— 那是对方自己的源，去掉它反而会让
   * 「带本地存储的第三方页面」整体失效。
   */
  private _effectiveSandbox(): string {
    const tokens = this.sandbox.split(/\s+/).filter(Boolean);
    if (!this.html || !tokens.includes("allow-scripts")) return tokens.join(" ");
    return tokens.filter((t) => t !== "allow-same-origin").join(" ");
  }

  updated(): void {
    const frame = this.shadowRoot?.querySelector<HTMLIFrameElement>(".z-embed__frame");
    if (frame && !frame.dataset.bound) {
      frame.dataset.bound = "";
      frame.addEventListener("load", this._onLoad);
    }
    const retry = this.shadowRoot?.querySelector<HTMLElement>(".z-embed__retry");
    if (retry && !retry.dataset.bound) {
      retry.dataset.bound = "";
      retry.addEventListener("click", this._onRetry);
    }

    if (!this.src && !this.html) return;
    if (!this.lazy || this._shouldLoad) {
      this._armTimer();
    } else {
      this._observeVisibility();
    }
  }

  /** 重新加载当前内容（重建 iframe）。 */
  refresh(): void {
    this._ready = false;
    this._stalled = false;
    this._clearTimer();
    this._teardownMeasure();
    this.requestUpdate();
  }

  private _onLoad = (): void => {
    if (this._ready) return;
    this._ready = true;
    this._stalled = false;
    this._clearTimer();
    this.emit("z-load", { src: this.src, inline: !!this.html });
    this._measure();
    this.requestUpdate();
  };

  private _onRetry = (): void => {
    this.refresh();
  };

  private _armTimer(): void {
    // [WHY 要判 _stalled] 超时后 requestUpdate 会再走一遍 updated()，若不拦住就会装上
    // 第二个定时器，于是每渲染一次 emit 一次 z-timeout（实测 14 次）。
    if (this._ready || this._stalled || this._timer || !this.timeout) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      if (this._ready) return;
      this._stalled = true;
      this.emit("z-timeout", { src: this.src, timeout: this.timeout });
      this.requestUpdate();
    }, this.timeout);
  }

  private _clearTimer(): void {
    if (this._timer === null) return;
    clearTimeout(this._timer);
    this._timer = null;
  }

  private _observeVisibility(): void {
    if (this._io) return;
    if (typeof IntersectionObserver === "undefined") {
      // 没有 IO 就退化成立即加载：宁可多加载一次，也不要让内容永远不出现
      this._shouldLoad = true;
      this.requestUpdate();
      return;
    }
    this._io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        this._io?.disconnect();
        this._io = null;
        this._shouldLoad = true;
        this.requestUpdate();
      },
      { rootMargin: LAZY_MARGIN },
    );
    this._io.observe(this);
  }

  /**
   * 量文档高度（`auto-height`）。
   *
   * 读不到 `contentDocument` 只有两种原因：跨源，或 sandbox 没给 `allow-same-origin`。
   * 两者都不是错误 —— 只是这项能力不可用，所以降级到固定高度并**只警告一次**，
   * 不 emit 事件（宿主没做错什么，弹个事件只会让人以为是故障）。
   */
  private _measure(): void {
    if (!this.autoHeight) return;
    const frame = this.shadowRoot?.querySelector<HTMLIFrameElement>(".z-embed__frame");
    let h = 0;
    try {
      const doc = frame?.contentDocument;
      h = doc?.documentElement?.scrollHeight ?? doc?.body?.scrollHeight ?? 0;
    } catch {
      h = 0;
    }
    if (!h) {
      if (!this._warned) {
        this._warned = true;
        console.warn(
          "[z-embed] auto-height 无效：读不到 contentDocument（跨源，或 sandbox 未含 allow-same-origin）。已退回固定 height。",
        );
      }
      return;
    }
    if (this._measured === null || Math.abs(h - this._measured) > 1) {
      this._measured = Math.round(h);
      this.requestUpdate();
    }
    this._watchMeasure(frame?.contentDocument ?? null);
  }

  /** 文档内部尺寸变化（图片加载、字体回流）时重新量。读不到就跳过。 */
  private _watchMeasure(doc: Document | null): void {
    if (this._ro || !doc || typeof ResizeObserver === "undefined") return;
    const target = doc.documentElement;
    if (!target) return;
    this._ro = new ResizeObserver(() => this._measure());
    this._ro.observe(target);
  }

  private _teardownMeasure(): void {
    this._ro?.disconnect();
    this._ro = null;
    this._measured = null;
  }

  disconnectedCallback(): void {
    this._io?.disconnect();
    this._io = null;
    this._teardownMeasure();
    this._clearTimer();
    super.disconnectedCallback();
  }
}

defineElement("z-embed", ZEmbed);
