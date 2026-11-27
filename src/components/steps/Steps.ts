// <z-steps> 步骤条：items 定义步骤，current 定当前步，direction 定方向，clickable 时点击发 z-change。
// [WHY] 步骤条 [[2026-08-11-W16-nav]] [2026-08-11] night-hawk:
// array-prop 驱动（breadcrumb 先例），current 高亮 + status 单步覆盖，
// direction 横竖切换，clickable 点击发 z-change {index}。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import stepsCSS from "./steps.css?raw";

export interface StepItem {
  title: string;
  description?: string;
  icon?: string;
  status?: "wait" | "process" | "finish" | "error";
}

export type StepStatus = "wait" | "process" | "finish" | "error";


// [WHY] 单步状态解析: 单步 status 覆盖全局 status（error 优先,process 次之）;
// 已走过的步（index < current）默认 finish,当前步默认 process
function resolveStatus(item: StepItem | undefined, index: number, current: number, status: StepStatus): StepStatus {
  if (item?.status) return item.status;
  if (index < current) return "finish";
  if (index === current) return status === "error" ? "error" : "process";
  return "wait";
}

// [WHY] 状态图标映射（inline SVG,零依赖）; 自定义 icon 优先于状态图标
const STATUS_ICON: Record<StepStatus, string> = {
  finish: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 8.5l3.5 3.5L13 4.5"/></svg>',
  error: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 5l6 6M11 5l-6 6"/></svg>',
  process: '<svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="3.5"/></svg>',
  wait: "",
};

export class ZSteps extends BaseElement {
  static styles = stepsCSS;

  @property({ type: Array, attribute: false }) items: StepItem[] = [];
  @property({ type: Number }) current = 0;
  @property({ type: String }) status: StepStatus = "process";
  @property({ type: String }) direction: "horizontal" | "vertical" = "horizontal";
  @property({ type: Boolean }) clickable = false;

  private _listEl: HTMLElement | null = null;

  render(): string {
    const parts = this.items.map((item, i) => {
      const st = resolveStatus(item, i, this.current, this.status);
      const isCurrent = i === this.current;
      const finished = i < this.current;
      // [WHY] 标记内容三选一: 自定义 icon > 状态 SVG 图标 > 序号（等待步）
      let markerContent: string;
      if (item.icon !== undefined && item.icon !== "") {
        markerContent = `<span class="z-steps__icon" part="icon" aria-hidden="true">${escapeAttr(item.icon)}</span>`;
      } else if (STATUS_ICON[st]) {
        markerContent = `<span class="z-steps__icon z-steps__icon--${st}" part="icon" aria-hidden="true">${STATUS_ICON[st]}</span>`;
      } else {
        markerContent = `<span class="z-steps__num" part="num">${i + 1}</span>`;
      }
      const desc = item.description
        ? `<div class="z-steps__desc" part="description">${escapeAttr(item.description)}</div>`
        : "";
      // [WHY] data-index 恒渲染（序号标记 + 点击委托共用），clickable 才加 tabindex/role
      const clickable = this.clickable ? ` tabindex="0" role="button"` : "";
      const title = isCurrent ? ` aria-current="step"` : "";
      return `
        <li class="z-steps__item z-steps__item--${st}${finished ? " z-steps__item--finished" : ""}${isCurrent ? " z-steps__item--current" : ""}" part="item" data-index="${i}"${clickable}${title}>
          <div class="z-steps__marker" part="marker">${markerContent}</div>
          <div class="z-steps__content" part="content">
            <div class="z-steps__title" part="step-title">${escapeAttr(item.title)}</div>
            ${desc}
          </div>
        </li>`;
    });
    return html`
      <ol class="z-steps z-steps--${this.direction}" part="root">
        ${parts.join("")}
      </ol>
    `;
  }

  updated(): void {
    // [WHY] 委托点击: 渲染整体替换 innerHTML,按节点引用比较重绑
    // （[[web-components-render-pitfalls]] 陷阱 2）
    const list = this.shadowRoot!.querySelector<HTMLElement>(".z-steps");
    if (!list || list === this._listEl) return;
    this._listEl = list;
    list.addEventListener("click", this._onClick);
    list.addEventListener("keydown", this._onKeydown);
  }

  private _onClick = (e: Event): void => {
    if (!this.clickable) return;
    const item = (e.target as HTMLElement).closest<HTMLElement>(".z-steps__item");
    if (!item) return;
    this._select(Number(item.dataset.index));
  };

  private _onKeydown = (e: KeyboardEvent): void => {
    if (!this.clickable) return;
    // [WHY] Enter/Space 视为点击（role=button 的键盘契约）
    if (e.key !== "Enter" && e.key !== " ") return;
    const item = (e.target as HTMLElement).closest<HTMLElement>(".z-steps__item");
    if (!item) return;
    e.preventDefault();
    this._select(Number(item.dataset.index));
  };

  private _select(index: number): void {
    if (index === this.current) return;
    const item = this.items[index];
    if (!item) return;
    // [WHY] clickable 语义: 不自动推进 current（父组件控制）,仅通知
    this.emit("z-change", { index, item });
  }
}

defineElement("z-steps", ZSteps);
