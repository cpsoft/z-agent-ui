// 内容槽示例元素：**一份定义，两个宿主共用** —— 表格 `columns[].cellTag` 与甘特
// `columns[].cellTag` 指向的是同两个元素。这就是 cell 契约要买到的东西：内容与容器解耦。
//
// 继承 `BaseCell` 后只需要写 `render()`。四个上下文（value / row / index / selected）
// 由容器注入且自带「赋值即重绘」；**不要**在这里重复声明成普通字段 ——
// 那会退回「只在挂载时画一次」，排序或翻页后停在旧值，而且没有任何报错。
import "../../src/components/badge/index.js";
import { BaseCell } from "../../src/report/cell/index.js";
import { html } from "../../src/index.js";

export class DemoStatusCell extends BaseCell {
  render(): string {
    const tone = this.value === "已完成" ? "success" : this.value === "进行中" ? "warning" : "info";
    return html`<z-badge variant="${tone}" size="sm">${String(this.value ?? "")}</z-badge>`;
  }
}

export class DemoProgressCell extends BaseCell {
  render(): string {
    // 没有值就不画：甘特的分组任务没有 progress，画一根 0% 的空条会被读成「做完了 0」
    if (this.value == null || this.value === "") return "";
    const p = Math.max(0, Math.min(100, Number(this.value) || 0));
    return html`<span role="progressbar" aria-valuenow="${p}"
      aria-valuemin="0" aria-valuemax="100"
      style="display:inline-flex;align-items:center;gap:8px;width:100%"
      ><span style="flex:1;height:6px;border-radius:3px;background:var(--z-color-fill-secondary)"
        ><span style="display:block;height:100%;width:${p}%;border-radius:3px;background:var(--z-color-primary)"
        ></span></span
      ><span style="font-variant-numeric:tabular-nums;color:var(--z-color-text-secondary)">${p}%</span></span
    >`;
  }
}

// 本模块被两个页面入口 import（表格段、甘特段），ESM 只会求值一次；
// 但热更新与「同一页挂两份 demo」会二次求值，重复 define 会抛 NotSupportedError。
if (!customElements.get("demo-status-cell")) customElements.define("demo-status-cell", DemoStatusCell);
if (!customElements.get("demo-progress-cell")) customElements.define("demo-progress-cell", DemoProgressCell);
