// <z-skeleton> 骨架屏：shape 切行、块、圆，width / height 定尺寸，animated 给呼吸动画。
import {
  BaseElement,
  html,
  property,
  observeLegacyAttribute,
  syncAlias,
 defineElement } from "../../core/index.js";
import skeletonCSS from "./skeleton.css?raw";

/** 形状（组件局部维度：行 / 圆 / 块，与语义色无关）。 */
export type SkeletonShape = "text" | "circle" | "rect";
/** @deprecated 2026-11-15 起用 `shape`；旧名仍可读，下一主版本删除。 */
export type SkeletonVariant = SkeletonShape;
const SHAPES: readonly SkeletonShape[] = ["text", "circle", "rect"];

export class ZSkeleton extends BaseElement {
  static styles = skeletonCSS;

  @property({ type: String }) shape: SkeletonShape = "text";
  @property({ type: String }) width = "100%";
  @property({ type: String }) height = "auto";
  @property({ type: Boolean }) animated = true;

  /** 兼容读：旧名 `variant` 的取值域与 `shape` 完全相同，直接搬运。 */
  attributeChangedCallback(name: string, oldValue: string | null, value: string | null): void {
    if (name === "variant") {
      if (value && (SHAPES as readonly string[]).includes(value)) syncAlias(this, "shape", "shape", value);
      return;
    }
    super.attributeChangedCallback(name, oldValue, value);
  }


  /**
   * @deprecated 旧名 `variant` 的 **JS 属性**兼容层。
   *
   * [WHY 属性也要兼容，不能只管 attribute] 兼容读只挂 `attributeChangedCallback` 时，
   * `el.variant = "danger"` 会变成给实例加一个普通字段 —— 读得回自己写的值，界面上毫无变化，
   * 且**零报错**。这正是收口期最危险的一种「看起来生效」。这里把它转成 setAttribute，
   * 复用同一条映射，保证 attribute 与 property 两条入口行为一致。
   */
  get variant(): SkeletonShape | "" {
    return (this.getAttribute("variant") as SkeletonShape | null) ?? "";
  }
  set variant(value: SkeletonShape | "") {
    if (value) this.setAttribute("variant", value);
    else this.removeAttribute("variant");
  }

  render(): string {
    const cls = [
      "z-skeleton",
      `z-skeleton--${this.shape}`,
      this.animated ? "z-skeleton--animated" : "",
    ].filter(Boolean).join(" ");

    return html`<div class="${cls}" part="root" aria-hidden="true"></div>`;
  }

  updated(): void {
    this.style.setProperty("--_sk-w", this.width);
    this.style.setProperty("--_sk-h", this.height);
  }
}

observeLegacyAttribute(ZSkeleton, "variant");

defineElement("z-skeleton", ZSkeleton);
