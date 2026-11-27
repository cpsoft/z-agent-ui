import { BaseElement, property, defineElement } from "../../core/index.js";

// 轴配置子元素：render null，按 position 取首个（bottom=x、left/right=y）
export class ZChartAxis extends BaseElement {
  @property({ type: String }) position = "bottom";
  @property({ type: String }) type = "auto";
  // [WHY] title 是 HTMLElement 反射属性：`= ""` 字段初始化器在构造期触发原生
  // setter → setAttribute("title") → 违反 CE 构造约束，createElement 抛
  // "The result must not have attributes"。用 `!` 声明不初始化，
  // 默认 "" 由 applyPropertyMeta 读取原生 getter（无属性时返回 ""）取得
  // See: wiki/bugs/bug-20260810-title-ctor-attr.md
  // [2026-08-10] night-hawk: 修复构造期属性污染
  @property({ type: String }) title!: string;
  @property({ type: String }) format = "";
  @property({ type: Number }) min = 0;
  @property({ type: Number }) max = 0;
  @property({ type: Number, attribute: "tick-count" }) tickCount = 0;
  @property({ type: Boolean }) grid = true;
  /** 值轴分布：`log` 为对数轴（只对左值轴生效，见 AxisConfig.scale）。 */
  @property({ type: String }) scale = "linear";

  render(): string | null {
    return null;
  }

  // Number 属性缺失时为 0，需用 hasAttribute 区分"未设置"
  get minValue(): number | undefined {
    return this.hasAttribute("min") ? this.min : undefined;
  }

  get maxValue(): number | undefined {
    return this.hasAttribute("max") ? this.max : undefined;
  }

  // grid 仅在显式设置属性时覆盖 chart show-grid；
  // [WHY] Boolean 反射无法表达 grid="false"（HTML 布尔语义下属性存在即 true），需直接解析字符串
  get gridOverride(): boolean | undefined {
    if (!this.hasAttribute("grid")) return undefined;
    return this.getAttribute("grid") === "false" ? false : true;
  }
}

defineElement("z-chart-axis", ZChartAxis);
