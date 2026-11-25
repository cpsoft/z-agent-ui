import { FloatingPosition } from "../../../primitives/index.js";
import { injectGlobalStyles } from "../../../core/index.js";

const POPUP_CSS = `
.z-chart__tooltip {
  position: fixed;
  z-index: var(--z-z-tooltip);
  pointer-events: none;
  max-width: 240px;
  padding: 8px 10px;
  font-size: 12px;
  font-family: var(--z-chart-font-family);
  color: var(--z-chart-tooltip-color);
  background: var(--z-chart-tooltip-bg);
  border-radius: var(--z-chart-tooltip-radius);
  box-shadow: var(--z-chart-tooltip-shadow);
}
.z-chart__tooltip-title {
  font-weight: 600;
  margin-bottom: 4px;
}
.z-chart__tooltip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.6;
}
.z-chart__tooltip-swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex: none;
}
.z-chart__tooltip-label {
  opacity: 0.75;
}
.z-chart__tooltip-value {
  font-weight: 600;
  margin-left: auto;
}
`;

// [WHY] 2026-10-25 系统审计：样式注入统一走 injectGlobalStyles（幂等），
// 不再各文件自持 stylesInjected 开关。
export function injectChartPopupStyles(): void {
  injectGlobalStyles("z-chart-popup", POPUP_CSS);
}

// popup 挂 document.body，锚点用 overlay ghost 元素（FloatingPosition 接受任何有 getBoundingClientRect 的元素）
export class TooltipManager {
  private popup: HTMLDivElement | null = null;
  private position: FloatingPosition | null = null;

  constructor() {
    injectChartPopupStyles();
  }

  show(anchor: Element, content: string): void {
    if (!this.popup) {
      this.popup = document.createElement("div");
      this.popup.className = "z-chart__tooltip";
      document.body.appendChild(this.popup);
    }
    this.popup.style.display = "";
    this.popup.innerHTML = content;
    this.position?.destroy();
    this.position = new FloatingPosition({
      anchor: anchor as HTMLElement,
      floating: this.popup,
      placement: "top",
      offset: 8,
      flip: true,
    });
  }

  hide(): void {
    this.position?.destroy();
    this.position = null;
    if (this.popup) this.popup.style.display = "none";
  }

  destroy(): void {
    this.hide();
    this.popup?.remove();
    this.popup = null;
  }
}
