// <z-property-row> 属性面板的一行：label 列加默认槽内容，span 控制占几列。
import { BaseElement, html, property, escapeAttr, bindFieldName, slottedControl, type FieldNameBinder, defineElement } from "../../core/index.js";
import propertyRowCSS from "./property-row.css?raw";

// [WHY] label 与控件分列（label 槽位 + 默认槽位），见 REQ-008
// See: wiki/requirements/REQ-008-property-panel.md
//
// [WHY 这一行还要管「名字」] 属性面板的典型写法是
//   `<z-property-row label="门店名"><z-input></z-input></z-property-row>`
// 而 `label` 只是本组件 shadow 里的一个 `<span>`，与槽里的控件**零关联** ——
// 既不是 `<label for>` 也不是 `aria-labelledby`（IDREF 跨 shadow 不解析）。
// 于是整个属性面板的输入框在读屏里全都没有名称，只会念「编辑框」。
// 2026-11-16 与 `z-form-item` 同一个根因、同一个修法：由容器把文字送进控件的
// 内部可聚焦件（`part="field|native|trigger"`），机制见 core/a11y.ts 的 bindFieldName。
export class ZPropertyRow extends BaseElement {
  static styles = propertyRowCSS;

  @property({ type: String }) label = "";
  @property({ type: Boolean }) span = false;

  private _fieldName: FieldNameBinder | null = null;

  render(): string {
    return html`
      <div class="z-property-row" part="root">
        <span class="z-property-row__label" part="label">
          <slot name="label">${escapeAttr(this.label)}</slot>
        </span>
        <span class="z-property-row__control" part="control">
          <slot></slot>
        </span>
      </div>
    `;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._fieldName = bindFieldName(() => this._control(), () => this.label);
  }

  disconnectedCallback(): void {
    this._fieldName?.dispose();
    this._fieldName = null;
    super.disconnectedCallback();
  }

  updated(): void {
    this._fieldName?.sync();
  }

  /**
   * 默认槽里的控件 —— 这一行右侧那个。
   *
   * 两个坑，都在真机上暴露过，读代码都看不出来：
   *
   * ① [WHY 用 `slot:not([name])` 而不是 `querySelector("slot")`] 本组件有两个 slot，
   *    具名的 `label` slot 在 DOM 里排在前面，直接取 `slot` 会拿到标签那一个 ——
   *    名字永远送不进控件，而代码看起来「找到 slot 了」。
   * ② [WHY 还要穿透一层 `<slot>`] 调用方（`z-detail-form`）为了让单字段可覆盖，
   *    在默认槽里先放了一个 `<slot name="field-xxx">` 占位，再放真正的控件。
   *    于是「槽里第一个元素」是个空占位符，`fieldOf(<slot>)` 恒为 null ——
   *    名字静默地送不进去。2026-11-16 CDP 实测：detail-form 三个字段 AX `name=""`。
   *    穿透逻辑见 core/a11y.ts 的 slottedControl。
   */
  private _control(): Element | null {
    return slottedControl(this.shadowRoot?.querySelector<HTMLSlotElement>("slot:not([name])"));
  }

}

defineElement("z-property-row", ZPropertyRow);
