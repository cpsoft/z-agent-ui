// <z-detail-form> 详情表单：fields 定义字段、value 回填数据，mode 切查看与编辑，变更发 z-change。
// [WHY] 通用列表条目详情页：schema 驱动的表单/详情组件，create/edit/view 三模式，
// 上下文无关（可嵌 z-modal，也可独立置页）。值同步核心：字段变化绝不 requestUpdate
// （BaseElement 每次更新清空重建 shadow，控件输入/焦点随之丢失），只更新内部
// _data + _touched 并聚合发 z-change；重渲染仅发生在 fields/value/mode 等属性变化。
// 布局复用 property-panel 三件套（columns 透传/group 分组/row 标签+控件）。
// See: wiki/requirements/REQ-009-detail-form.md
// [2026-08-11] night-hawk: 创建

// [WHY] 组合组件依赖注册：生成 markup 引用以下兄弟组件，导入即注册
// （customElements.define 副作用），使用方只需 import detail-form 入口
import "../../property/panel/PropertyPanel.js";
import "../../property/group/PropertyGroup.js";
import "../../property/row/PropertyRow.js";
import "../../components/input/index.js";
import "../../components/select/index.js";
import "../../components/option/index.js";
import "../../components/switch/index.js";
import "../../components/datepicker/index.js";

import { BaseElement, html, property, escapeAttr } from "../../core/index.js";
import detailFormCSS from "./detail-form.css?raw";

export type ZDetailFormFieldType =
  | "text"
  | "number"
  | "password"
  | "email"
  | "textarea"
  | "select"
  | "boolean"
  | "date";

export type ZDetailFormMode = "create" | "edit" | "view";

export interface ZDetailFormOption {
  value: string;
  label: string;
}

export interface ZDetailFormField {
  /** 字段名；小写 [a-z0-9-]（作为 field-<name> slot 名） */
  name: string;
  label?: string;
  type?: ZDetailFormFieldType;
  /** select 专用 */
  options?: ZDetailFormOption[];
  placeholder?: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  /** 分组标题；无则渲染为裸行 */
  group?: string;
  /** 透传 z-property-row，跨整行 */
  span?: boolean;
  disabled?: boolean;
  /** select 专用 → z-select searchable */
  searchable?: boolean;
}

export class ZDetailForm extends BaseElement {
  static styles = detailFormCSS;

  // [WHY] attribute: false — decorators.toAttribute 对对象/数组返回
  // "[object Object]"（见 src/core/decorators.ts:95-101），先例 Table/Chart
  @property({ type: Array, attribute: false }) fields: ZDetailFormField[] = [];
  @property({ type: Object, attribute: false }) value: Record<string, unknown> = {};
  @property({ type: String }) mode: ZDetailFormMode = "create";
  @property({ type: String }) columns = "1";
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) labelWidth = "";
  @property({ type: String }) locale = "";
  @property({ type: String }) requiredMessage = "This field is required";

  /** 当前值源（字段变化后为真值来源，优先于 value 属性） */
  private _data: Record<string, unknown> = {};
  /** 用户触碰过的字段：外部重设 value/fields 时保留其输入 */
  private _touched = new Set<string>();

  connectedCallback(): void {
    super.connectedCallback();
    // [WHY] 绑定在 shadowRoot 而非 host：render 只重建子节点，shadowRoot 本体
    // 稳定（AccordionItem 先例），无需重绑。两点收益：
    // 1. 本组件 emit 的 z-change（dispatch 在 host 上）不会回流到该监听，无重发叠加
    // 2. light DOM 中的 field-<name> 覆盖控件/footer 内容的事件不进入 shadow 树，天然排除
    // e.target.closest() 跨 shadow 边界失效，仍须走 composedPath 找 data-field
    this.shadowRoot!.addEventListener("z-change", this._onFieldChange);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener("z-change", this._onFieldChange);
    super.disconnectedCallback();
  }

  updated(): void {
    if (this.labelWidth) {
      this.style.setProperty("--z-property-label-width", this.labelWidth);
    }
  }

  private get _effectiveMode(): ZDetailFormMode {
    // [WHY] 非法 mode 回退 create；不写回属性避免 requestUpdate 循环
    return this.mode === "edit" || this.mode === "view" ? this.mode : "create";
  }

  render(): string {
    const view = this._effectiveMode === "view";
    return html`
      <div class="z-detail-form" part="root">
        <z-property-panel columns="${this._escAttr(this.columns)}" ${this.disabled ? "disabled" : ""}>
          ${this._renderGroups(view)}
        </z-property-panel>
        <div class="z-detail-form__extra" part="extra"><slot></slot></div>
        <div class="z-detail-form__footer" part="footer"><slot name="footer"></slot></div>
      </div>
    `;
  }

  // ── 值 API ──

  /** 当前值映射（类型强转：number 数字化、空 number 保持 ""、boolean 布尔化） */
  getValues(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const f of this.fields) {
      const v = this._resolveValue(f);
      if (f.type === "number") {
        result[f.name] = v === "" || v === null || v === undefined ? "" : Number(v);
      } else if (f.type === "boolean") {
        result[f.name] = Boolean(v);
      } else {
        result[f.name] = v;
      }
    }
    return result;
  }

  /** 校验 required；错误写入控件 error 属性（不重渲染、不丢焦点） */
  validate(): { valid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    for (const f of this.fields) {
      if (!f.required || f.type === "boolean") continue;
      const control = this._controlEl(f.name);
      const v = control ? this._readControlValue(control) : this._resolveValue(f);
      if (v === "" || v === null || v === undefined) {
        errors[f.name] = this.requiredMessage;
        control?.setAttribute("error", this.requiredMessage);
      }
    }
    return { valid: Object.keys(errors).length === 0, errors };
  }

  /** 清空用户编辑，回到 value/defaultValue */
  reset(): void {
    this._data = {};
    this._touched.clear();
    this.requestUpdate();
  }

  /** 程序化设值（标记触碰、重渲染控件、发 z-change） */
  setFieldValue(name: string, value: unknown): void {
    this._data[name] = value;
    this._touched.add(name);
    this.requestUpdate();
    this.emit("z-change", { values: this.getValues(), field: name, value });
  }

  // ── 值同步 ──

  private _onFieldChange = (e: Event): void => {
    // [WHY] 控件值从元素自身读（z-input/z-select/z-datepicker → .value，
    // z-switch → .checked），不依赖各控件 z-change detail 的不同形状
    const control = e
      .composedPath()
      .find((n): n is Element => n instanceof Element && n.hasAttribute("data-field"));
    if (!control) return;
    const name = control.getAttribute("data-field")!;
    const value = this._readControlValue(control);
    this._data[name] = value;
    this._touched.add(name);
    control.removeAttribute("error");
    // [WHY] 拦截原始控件事件继续冒泡：否则消费方在 host 上会同时收到
    // 控件原始 z-change 与本组件重发的聚合 z-change，造成双发
    e.stopPropagation();
    this.emit("z-change", { values: this.getValues(), field: name, value });
  };

  private _readControlValue(control: Element): unknown {
    const tag = control.tagName.toLowerCase();
    if (tag === "z-switch" || tag === "z-checkbox") {
      return (control as any).checked;
    }
    return (control as any).value;
  }

  // ── 渲染 ──

  /** 取值解析顺序：_data（含用户编辑）→ value（非 create 且 hasOwnProperty）→ defaultValue → 类型默认 */
  private _resolveValue(f: ZDetailFormField): unknown {
    const name = f.name;
    if (Object.prototype.hasOwnProperty.call(this._data, name)) return this._data[name];
    if (
      this._effectiveMode !== "create" &&
      Object.prototype.hasOwnProperty.call(this.value, name)
    ) {
      return this.value[name];
    }
    if (f.defaultValue !== undefined) return f.defaultValue;
    return f.type === "boolean" ? false : "";
  }

  private _renderGroups(view: boolean): string {
    // [WHY] 按首次出现顺序分组；无 group 的字段渲染为裸行（独立 entry）
    const groups: Array<{ name: string | null; fields: ZDetailFormField[] }> = [];
    const byName = new Map<string, { name: string; fields: ZDetailFormField[] }>();
    for (const f of this.fields) {
      const g = f.group ? f.group : null;
      if (g === null) {
        groups.push({ name: null, fields: [f] });
        continue;
      }
      let entry = byName.get(g);
      if (!entry) {
        entry = { name: g, fields: [] };
        byName.set(g, entry);
        groups.push(entry);
      }
      entry.fields.push(f);
    }
    return groups
      .map((g) => {
        const rows = g.fields.map((f) => this._renderField(f, view)).join("");
        return g.name === null
          ? rows
          : html`
              <z-property-group title="${this._escAttr(g.name)}">
                ${rows}
              </z-property-group>
            `;
      })
      .join("");
  }

  private _renderField(f: ZDetailFormField, view: boolean): string {
    const name = f.name.toLowerCase();
    const label = f.label ?? f.name;
    const requiredMark = f.required
      ? `<span class="z-detail-form__required" part="required" aria-hidden="true">*</span>`
      : "";
    const labelSlot = `<span slot="label">${escapeAttr(label)}${requiredMark}</span>`;
    const control = view
      ? `<span class="z-detail-form__static" part="static">${this._formatView(f)}</span>`
      : `<slot name="field-${this._escAttr(name)}"></slot>${this._controlHtml(f, name)}`;
    return html`
      <z-property-row label="${this._escAttr(label)}" ${f.span ? "span" : ""}>
        ${labelSlot}
        ${control}
      </z-property-row>
    `;
  }

  private _controlHtml(f: ZDetailFormField, name: string): string {
    // [WHY] 条件属性必须独立片段三元（?attr= 是字面属性，见
    // bug-20260810-q-attr-literal-disabled）；disabled 在生成时直接带上，
    // 与 panel 级联幂等叠加（panel 快照语义保证原先 disabled 保留）
    const disabled = this.disabled || f.disabled ? "disabled" : "";
    const dataField = `data-field="${this._escAttr(name)}"`;
    const value = String(this._resolveValue(f) ?? "");
    const common = ` value="${this._escAttr(value)}" ${dataField} ${disabled}`;

    switch (f.type) {
      case "number":
      case "password":
      case "email":
      case "text":
        return html`
          <z-input type="${f.type}"${common}
            placeholder="${this._escAttr(f.placeholder ?? "")}"
            ${f.hint ? `hint="${this._escAttr(f.hint)}"` : ""}
            ${f.required ? "required" : ""}></z-input>
        `;
      case "textarea":
        return html`
          <z-input multiline${common}
            placeholder="${this._escAttr(f.placeholder ?? "")}"
            ${f.hint ? `hint="${this._escAttr(f.hint)}"` : ""}
            ${f.required ? "required" : ""}></z-input>
        `;
      case "select": {
        const options = (f.options ?? [])
          .map((o) => `<z-option value="${this._escAttr(o.value)}">${escapeAttr(o.label)}</z-option>`)
          .join("");
        return html`
          <z-select${common}
            placeholder="${this._escAttr(f.placeholder ?? "Select...")}"
            ${f.searchable ? "searchable" : ""}>${options}</z-select>
        `;
      }
      case "boolean":
        return html`
          <z-switch ${this._resolveValue(f) ? "checked" : ""} ${dataField} ${disabled}></z-switch>
        `;
      case "date":
        return html`
          <z-datepicker mode="single"${common}
            ${this.locale ? `locale="${this._escAttr(this.locale)}"` : ""}></z-datepicker>
        `;
      default:
        return html`<z-input${common}></z-input>`;
    }
  }

  private _formatView(f: ZDetailFormField): string {
    const v = this._resolveValue(f);
    if (v === "" || v === null || v === undefined) return "—";
    switch (f.type) {
      case "boolean":
        return v ? "Yes" : "No";
      case "select": {
        const opt = (f.options ?? []).find((o) => o.value === String(v));
        return escapeAttr(opt ? opt.label : String(v));
      }
      case "date": {
        // [WHY] 日期型 ISO 解析为 UTC，补 T00:00:00 避免本地时区偏移一天
        const d = new Date(String(v) + "T00:00:00");
        if (Number.isNaN(d.getTime())) return escapeAttr(String(v));
        return escapeAttr(d.toLocaleDateString(this.locale || undefined));
      }
      default:
        return escapeAttr(String(v));
    }
  }

  private _controlEl(name: string): Element | null {
    return this.shadowRoot!.querySelector(`[data-field="${name}"]`);
  }

  private _escAttr(s: string): string {
    return escapeAttr(s).replace(/"/g, "&quot;");
  }
}

customElements.define("z-detail-form", ZDetailForm);
