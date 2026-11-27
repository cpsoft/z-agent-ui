// [WHY] 时间线 [[2026-08-11-W17-data]] [2026-08-11] night-hawk:
// array-prop 驱动（breadcrumb 先例），CSS ::before 竖线，reverse 倒序 + pending 尾巴。
import { BaseElement, html, property, escapeAttr, defineElement } from "../../core/index.js";
import timelineCSS from "./timeline.css?raw";

export interface TimelineItem {
  title: string;
  content?: string;
  time?: string;
  dot?: string;
  color?: string;
  status?: "success" | "error" | "info" | "warning" | "pending";
}


export class ZTimeline extends BaseElement {
  static styles = timelineCSS;

  @property({ type: Array, attribute: false }) items: TimelineItem[] = [];
  @property({ type: Boolean }) reverse = false;
  // [WHY] pending 尾巴: 列表末尾追加"待定"节点（时间线最后一项为进行中语义）
  @property({ type: String }) pending = "";

  render(): string {
    let list = this.items.slice();
    if (this.reverse) list = list.reverse();
    const parts = list.map((item) => {
      const status = item.status ? ` z-timeline__item--${item.status}` : "";
      const color = item.color ? ` style="--z-timeline-dot-color:${item.color}"` : "";
      const dot = item.dot
        ? `<span class="z-timeline__dot-custom" part="dot">${escapeAttr(item.dot)}</span>`
        : `<span class="z-timeline__dot" part="dot"></span>`;
      const time = item.time ? `<div class="z-timeline__time" part="time">${escapeAttr(item.time)}</div>` : "";
      const content = item.content ? `<div class="z-timeline__content" part="content">${escapeAttr(item.content)}</div>` : "";
      return `
        <li class="z-timeline__item${status}" part="item"${color}>
          ${dot}
          <div class="z-timeline__body" part="body">
            <div class="z-timeline__title" part="title">${escapeAttr(item.title)}${time}</div>
            ${content}
          </div>
        </li>`;
    });
    // [WHY] pending 尾巴: 默认 status 色 + 脉冲动画,空文案时只显示标题
    if (this.pending) {
      parts.push(`
        <li class="z-timeline__item z-timeline__item--pending" part="item">
          <span class="z-timeline__dot z-timeline__dot--pending" part="dot"></span>
          <div class="z-timeline__body" part="body">
            <div class="z-timeline__title" part="title">${escapeAttr(this.pending)}</div>
          </div>
        </li>`);
    }
    return html`<ul class="z-timeline" part="root">${parts.join("")}</ul>`;
  }
}

defineElement("z-timeline", ZTimeline);
