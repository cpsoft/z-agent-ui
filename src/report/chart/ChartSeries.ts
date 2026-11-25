// <z-chart-series> 图表数据系列：name / type / data 定义一个系列，visible 控制显隐，颜色由 color 定。
import { BaseElement, property } from "../../core/index.js";

// 数据系列子元素：render null，数据变更经 z-series-change 通知容器重绘
export class ZChartSeries extends BaseElement {
  @property({ type: String }) name = "";
  @property({ type: String }) type = "auto";
  @property({ type: Array, attribute: false }) data: unknown[] = [];
  @property({ type: String }) color = "";
  @property({ type: String, attribute: "y-axis" }) yAxis = "left";
  @property({ type: String }) format = "";
  /**
   * 气泡第三维的标题（`data[].r` 代表什么，如「订单量」）。
   *
   * [WHY 是一个属性而不是自动推断] 组件拿不到「这一列在原表里叫什么」——`r` 只是
   * 一个数。tooltip 里必须写明「圆的大小 = 订单量」，否则读者只能猜。
   */
  @property({ type: String, attribute: "size-title" }) sizeTitle = "";
  @property({ type: Boolean, attribute: false }) visible = true;

  render(): string | null {
    return null;
  }

  updated(): void {
    this.emit("z-series-change", {});
  }
}

customElements.define("z-chart-series", ZChartSeries);
