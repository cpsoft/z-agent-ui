// 栅格子项：跨列 + 偏移 + 响应式断点。
//
// `span` 两种写法都支持：
//   · `"6"`                       —— 固定跨 6 列
//   · `"xs:12 sm:6 md:4 lg:3"`    —— 小屏整行、sm 起半行、md 起三分之一、lg 起四分之一
// 断点：xs <640 / sm ≥640 / md ≥768 / lg ≥1024 / xl ≥1280（与 grid.css 的字面量一致）。
import { BaseElement, html, property } from "../../core/index.js";
import colCSS from "./grid-col.css?raw";

const BREAKPOINTS = ["sm", "md", "lg", "xl"] as const;

/** 把 `"xs:12 sm:6"` 拆成 { base, sm, md, … }。不认识的分片静默忽略（不抛 —— 一个写错的 class 不该炸掉整页）。 */
export function parseSpan(raw: string): { base: number; bp: Record<string, number> } {
  const bp: Record<string, number> = {};
  let base = 12;
  for (const part of (raw ?? "").split(/[\s,]+/).filter(Boolean)) {
    const m = /^(?:(xs|sm|md|lg|xl):)?(\d+)$/.exec(part);
    if (!m) continue;
    const n = Math.max(1, Number(m[2]));
    // xs 就是基准值：`xs:12` 与 `12` 等价，不需要单独一个断点变量
    if (!m[1] || m[1] === "xs") base = n;
    else bp[m[1]] = n;
  }
  return { base, bp };
}

export class ZGridCol extends BaseElement {
  static styles = colCSS;

  @property({ type: String }) span = "12";
  /** 左侧空几列（1 起算的偏移量，非响应式）。0/空 = 不偏移。 */
  @property({ type: Number }) offset = 0;

  protected willUpdate(): void {
    const s = this.style;
    const { base, bp } = parseSpan(this.span);
    s.setProperty("--_span", String(base));
    for (const name of BREAKPOINTS) {
      if (bp[name] !== undefined) s.setProperty(`--_span-${name}`, String(bp[name]));
      else s.removeProperty(`--_span-${name}`);
    }
    const off = Math.floor(Number(this.offset));
    if (Number.isFinite(off) && off > 0) s.setProperty("--_start", String(off + 1));
    else s.removeProperty("--_start");
  }

  render(): string {
    return html`<slot></slot>`;
  }
}

customElements.define("z-grid-col", ZGridCol);
