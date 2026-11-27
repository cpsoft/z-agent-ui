// <z-anchor> 锚点导航：items 给锚点列表，滚动时高亮当前项，切换发 z-change。
// [WHY] 锚点导航 [[2026-08-11-W16-nav]] [2026-08-11] night-hawk:
// items 驱动 + IntersectionObserver scrollspy（viewer 滚动高亮当前锚点）+
// 点击平滑滚动。happy-dom 无 IO → 运行守卫（无 IO 时退化为纯点击模式）。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import anchorCSS from "./anchor.css?raw";

export interface AnchorItem {
  href: string;
  label: string;
}


export class ZAnchor extends BaseElement {
  static styles = anchorCSS;

  @property({ type: Array, attribute: false }) items: AnchorItem[] = [];
  // [WHY] 滚动吸附偏移量（px）: 固定表头/工具栏场景让激活区避开遮挡
  @property({ type: Number }) offset = 0;
  // [WHY] container: 选择器字符串，命中时以该元素为滚动容器（非 window 滚动）
  @property({ type: String }) container = "";
  @property({ type: Boolean }) smooth = false;

  private _active = "";
  private _navEl: HTMLElement | null = null;
  private _io: IntersectionObserver | null = null;

  private _getTarget(href: string): HTMLElement | null {
    if (!href.startsWith("#")) return null;
    return document.getElementById(href.slice(1));
  }

  private _getScrollRoot(): Element | Document {
    if (this.container) {
      const root = document.querySelector(this.container);
      if (root) return root;
    }
    return document;
  }

  private _getScroller(): Element | Window {
    if (this.container) {
      const root = document.querySelector(this.container);
      if (root) return root;
    }
    return window;
  }

  render(): string {
    const links = this.items.map((item, i) => {
      const active = this._active === item.href ? " z-anchor__link--active" : "";
      return `<li part="item" data-index="${i}"><a class="z-anchor__link${active}" part="link" href="${escapeAttr(item.href)}" data-href="${escapeAttr(item.href)}">${escapeAttr(item.label)}</a></li>`;
    });
    return html`<nav class="z-anchor" part="root" aria-label="Anchor navigation"><ul class="z-anchor__list" part="list">${links.join("")}</ul></nav>`;
  }

  updated(): void {
    // [WHY] 监听器绑 shadow 内 nav 节点：渲染整体替换 innerHTML,须按节点引用比较重绑
    // （[[web-components-render-pitfalls]] 陷阱 2）
    const nav = this.shadowRoot!.querySelector<HTMLElement>(".z-anchor");
    if (!nav || nav === this._navEl) return;
    this._navEl = nav;
    nav.addEventListener("click", this._onClick);
    this._setupScrollspy();
  }

  // [WHY] 渲染后重建 IO: items 变化时旧观察者全部断开重建
  private _setupScrollspy(): void {
    this._io?.disconnect();
    this._io = null;
    // [WHY] happy-dom 无 IntersectionObserver → 守卫退化为纯点击模式
    // （chart.test.ts IO mock 同款先例）
    if (typeof IntersectionObserver === "undefined") return;

    const targets: { el: HTMLElement; href: string }[] = [];
    for (const item of this.items) {
      const el = this._getTarget(item.href);
      if (el) targets.push({ el, href: item.href });
    }
    if (!targets.length) return;

    // [WHY] rootMargin 实现 scrollspy 带: 观察窗顶部 offset 之下的 25% 高度带,
    // 章节顶边进入该带即激活（顶部遮挡场景用 offset 下移）
    const root = this._getScrollRoot();
    this._io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const match = targets.find((t) => t.el === entry.target);
          if (match && this._active !== match.href) {
            this._setActive(match.href);
          }
        }
      },
      {
        root: root === document ? null : (root as Element),
        rootMargin: `-${this.offset}px 0px -75% 0px`,
        threshold: 0,
      }
    );
    for (const t of targets) this._io.observe(t.el);
  }

  private _onClick = (e: Event): void => {
    const link = (e.target as HTMLElement).closest<HTMLElement>("a[part='link']");
    if (!link) return;
    const href = link.dataset.href ?? "";
    const target = this._getTarget(href);
    if (target) {
      e.preventDefault();
      // [WHY] 平滑滚动: 目标绝对位置 = 视口内 top + 当前滚动位移 - offset;
      // window 用 scrollY（scrollTop 不存在），元素容器用 scrollTop
      const scroller = this._getScroller();
      const current = scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop ?? 0;
      const top = target.getBoundingClientRect().top + current - this.offset;
      try {
        if (this.smooth) scroller.scrollTo?.({ top, behavior: "smooth" });
        else if (scroller === window) window.scrollTo(0, top);
        else (scroller as HTMLElement).scrollTop = top;
      } catch {
        // [WHY] happy-dom 无 scrollTo 时静默降级
        target.scrollIntoView?.(this.smooth ? { behavior: "smooth" } : undefined);
      }
    }
    this._setActive(href);
  };

  private _setActive(href: string): void {
    this._active = href;
    // [WHY] 纯 class 切换走 DOM 直写（非注册状态）: 不触发重渲染,
    // 避免 IO 回调循环（重渲染 → IO 重新设置 → 回调 → ...）
    const nav = this.shadowRoot!.querySelector(".z-anchor");
    nav?.querySelectorAll<HTMLElement>("a[part='link']").forEach((a) => {
      const on = a.dataset.href === href;
      a.classList.toggle("z-anchor__link--active", on);
      if (on) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    this.emit("z-change", { active: href });
  }

  disconnectedCallback(): void {
    this._io?.disconnect();
    this._io = null;
    super.disconnectedCallback();
  }
}

defineElement("z-anchor", ZAnchor);
