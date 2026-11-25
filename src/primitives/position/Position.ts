// <z-position> 浮层定位：anchor 指定锚点、placement 定方位，空间不足时按 flip 翻转。
// [WHY 引 core/index 而非包门面] 门面是给外界的；L0 内部经由它取符号会导致「门面改一行、L0 跟着抖」，且 core 单独打包时这行指向包外。
import { BaseElement, property } from "../../core/index.js";
import { resolveDomRef } from "../domRef.js";
import { FloatingPosition, type Placement } from "./FloatingPosition.js";

/**
 * `<z-position>` positions its slotted children relative to an anchor element.
 * Must be used inside a `<z-portal>` or similar for proper z-index stacking.
 */
export class ZPosition extends BaseElement {
  @property({ type: String }) anchor = "";
  @property({ type: String }) placement: Placement = "bottom-start";
  @property({ type: Number }) offset = 4;
  @property({ type: Boolean }) flip = true;

  private _position: FloatingPosition | null = null;

  /**
   * 必须渲染一个 slot。
   *
   * [WHY 不能 return null] 基类对 `null` 的处理是「不动 shadow」，而基类在构造时就
   * attach 了 shadowRoot —— 一个**空的** shadow root 不会把 light DOM 显示出来。
   * 于是 `<z-position><div>浮层</div></z-position>` 里的浮层宽度恒为 0，
   * 元素自己算出的坐标是对的，但看不到任何东西（2026-11-15 在 demo 里实测：
   * 宿主 0×0、子元素 `getComputedStyle().display === ""`，控制台无错）。
   * `z-portal` 没有这个问题：它把子节点搬走了，不依赖 slot。
   */
  render(): string {
    return "<slot></slot>";
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.style.display = "block";
    this.style.position = "fixed";
    this.style.top = "0";
    this.style.left = "0";
    this.style.width = "max-content";
    // [WHY 走令牌而不是 1000] 原实现写死 1000，绕过了 tokens.css 的五档层级：
    // 宿主把 --z-z-dropdown 调到 900 时，只有这个原语不跟随。它是最底一档浮层
    // （上面还有 modal / popover / tooltip / toast），取 dropdown 档语义上也对。
    this.style.zIndex = "var(--z-z-dropdown)";

    this._connect();
  }

  disconnectedCallback(): void {
    this._position?.destroy();
    this._position = null;
    super.disconnectedCallback();
  }

  updated(): void {
    this._position?.destroy();
    this._connect();
  }

  private _connect(): void {
    if (!this.anchor) return;
    // [WHY 走 resolveDomRef] anchor 是宿主写的字符串：`anchor="门店 A"` 这类值不是合法
    // 选择器，`querySelector` 会抛异常，而这里是 connectedCallback 内部 ⇒ 元素升级失败。
    // D-L0-5 的判据：非法 anchor 不抛，退化成「不定位」。
    const anchorEl = resolveDomRef(this.anchor);
    if (!anchorEl) return;

    this._position = new FloatingPosition({
      anchor: anchorEl as HTMLElement,
      floating: this,
      placement: this.placement,
      offset: this.offset,
      flip: this.flip,
    });
  }

  /** Recalculate position (call after content size changes). */
  reposition(): void {
    this._position?.update();
  }
}

customElements.define("z-position", ZPosition);
